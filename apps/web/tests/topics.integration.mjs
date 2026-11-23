import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "topic mutations and reads preserve owner, sibling, depth, and cycle rules",
  { timeout: 120_000 },
  async (t) => {
    const {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
      SUPABASE_SERVICE_ROLE_KEY: secret,
    } = process.env;
    assert(
      url && publicKey && secret,
      "Configure the disposable development database.",
    );
    const origin = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(origin.hostname, "127.0.0.1");
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const admin = createClient(url, secret, options);
    function data(result) {
      assert(!result.error, result.error?.code);
      return result.data;
    }

    async function account() {
      const email = `cap062-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa7!`;
      const { user } = data(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      t.after(async () => data(await admin.auth.admin.deleteUser(user.id)));
      const client = createClient(url, publicKey, options);
      const { session } = data(
        await client.auth.signInWithPassword({ email, password }),
      );
      return { owner: user.id, token: session.access_token };
    }

    async function request(member, method = "GET", id = "", body) {
      const response = await globalThis.fetch(
        new URL(`/api/topics${id ? `/${id}` : ""}`, origin),
        {
          method,
          headers: {
            ...(member && { Authorization: `Bearer ${member.token}` }),
            ...(body !== undefined && { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: globalThis.AbortSignal.timeout(35_000),
        },
      );
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      return {
        status: response.status,
        body: response.status === 204 ? null : await response.json(),
      };
    }

    async function topic(member, name, parent_id) {
      const result = await request(member, "POST", "", { name, parent_id });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      return result.body.topic.id;
    }

    const first = await account();
    const other = await account();
    assert.equal((await request(null)).status, 401);
    const root = await topic(first, " Science ");
    const child = await topic(first, "Biology", root);
    const third = await topic(first, "Plants", child);
    const fourth = await topic(first, "Leaves", third);
    const branch = await topic(first, "Field notes");
    const secondBiology = await topic(first, "Biology", branch);
    const foreign = await topic(other, "Science");
    assert.equal(
      (await request(first, "POST", "", { name: "science" })).status,
      409,
    );
    assert.equal(
      (await request(first, "POST", "", { name: "biology", parent_id: root }))
        .status,
      409,
    );
    assert.equal(
      (
        await request(first, "POST", "", {
          name: "Overflow",
          parent_id: fourth,
        })
      ).status,
      400,
    );
    assert.equal(
      (await request(first, "PATCH", branch, { parent_id: third })).status,
      400,
    );
    assert.equal(
      (await request(first, "PATCH", root, { parent_id: fourth })).status,
      400,
    );
    assert.equal(
      (await request(first, "PATCH", root, { parent_id: root })).status,
      400,
    );
    assert.equal(
      (await request(first, "PATCH", root, { parent_id: foreign })).status,
      404,
    );
    assert.equal(
      (await request(first, "PATCH", foreign, { name: "Changed" })).status,
      404,
    );
    assert.equal((await request(first, "DELETE", foreign)).status, 404);
    assert.equal((await request(first, "DELETE", root)).status, 409);

    const moved = await request(first, "PATCH", fourth, {
      name: "Foliage",
      parent_id: null,
    });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.topic.parent_id, null);
    assert.equal(moved.body.topic.name, "Foliage");
    const beforeDelete = await request(first);
    assert.equal(beforeDelete.status, 200);
    assert.deepEqual(
      new Set(beforeDelete.body.topics.map(({ id }) => id)),
      new Set([root, child, third, fourth, branch, secondBiology]),
    );
    assert.deepEqual(
      (await request(other)).body.topics.map(({ id }) => id),
      [foreign],
    );

    const saved = data(
      await admin
        .from("articles")
        .insert({
          user_id: first.owner,
          url: "https://example.test/topic",
          canonical_url: "https://example.test/topic",
          title: "Saved article",
          domain: "example.test",
        })
        .select("id")
        .single(),
    );
    data(
      await admin.from("article_topics").insert({
        user_id: first.owner,
        article_id: saved.id,
        topic_id: fourth,
        assignment_source: "manual",
      }),
    );
    assert.equal((await request(first, "DELETE", fourth)).status, 204);
    assert.equal(
      data(
        await admin.from("articles").select("id").eq("id", saved.id).single(),
      ).id,
      saved.id,
    );
    assert.deepEqual(
      data(
        await admin
          .from("article_topics")
          .select("topic_id")
          .eq("article_id", saved.id),
      ),
      [],
    );

    const left = await topic(first, "Left");
    const right = await topic(first, "Right");
    const concurrent = await Promise.all([
      request(first, "PATCH", left, { parent_id: right }),
      request(first, "PATCH", right, { parent_id: left }),
    ]);
    assert.deepEqual(concurrent.map(({ status }) => status).sort(), [200, 400]);
  },
);
