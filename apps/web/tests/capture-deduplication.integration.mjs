import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "concurrent capture retries save one article per owner without charging usage",
  { timeout: 120_000 },
  async (t) => {
    const url = process.env.CAPTURE_TEST_SUPABASE_URL;
    const secret = process.env.CAPTURE_TEST_SUPABASE_SECRET;
    const publishableKey = process.env.CAPTURE_TEST_SUPABASE_PUBLIC;
    assert(
      url && secret && publishableKey,
      "Set credentials for the disposable Supabase test project.",
    );
    const endpoint = new URL(
      "/api/captures",
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(
      endpoint.hostname,
      "127.0.0.1",
      "Run this test against the local Capture web app.",
    );

    const options = {
      auth: { autoRefreshToken: false, persistSession: false },
    };
    const admin = createClient(url, secret, options);

    async function createFixture() {
      const email = `capture-dedup-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa7!`;
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert(
        created.data.user && !created.error,
        "Could not create disposable account.",
      );
      const owner = created.data.user.id;
      t.after(async () => {
        const { error } = await admin.auth.admin.deleteUser(owner);
        assert(!error, "Could not clean disposable account.");
      });

      const client = createClient(url, publishableKey, options);
      const login = await client.auth.signInWithPassword({ email, password });
      assert(
        login.data.session && !login.error,
        "Could not sign in disposable account.",
      );
      return { owner, token: login.data.session.access_token };
    }

    async function save(token, body) {
      const response = await globalThis.fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: globalThis.AbortSignal.timeout(30_000),
      });
      assert(
        response.status === 200 || response.status === 201,
        `Save returned HTTP ${response.status}.`,
      );
      return { status: response.status, body: await response.json() };
    }

    const first = await createFixture();
    const second = await createFixture();
    const canonical = "https://example.com/concurrent-capture?chapter=4";
    const requestId = randomUUID();
    const requests = Array.from({ length: 10 }, (_, index) => ({
      request_id: index < 5 ? requestId : randomUUID(),
      url: `${canonical}&utm_source=${index}`,
      source: "manual_url",
    }));

    const results = await Promise.all(
      requests.map((request) => save(first.token, request)),
    );
    const ids = new Set(results.map(({ body }) => body.article_id));
    assert.equal(ids.size, 1);
    assert.equal(
      results.filter(({ status, body }) => status === 201 && !body.duplicate)
        .length,
      1,
    );
    assert.equal(
      results.filter(({ status, body }) => status === 200 && body.duplicate)
        .length,
      9,
    );
    assert(
      results.every(
        ({ body }) =>
          body.capture_status === "saved" && body.processing_status === "saved",
      ),
    );

    const other = await save(second.token, requests[0]);
    assert.equal(other.status, 201);
    assert(
      !ids.has(other.body.article_id),
      "Another account must get its own article.",
    );

    const [articles, requestKeys, usage] = await Promise.all([
      admin
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", first.owner)
        .eq("canonical_url", canonical),
      admin
        .from("capture_requests")
        .select("article_id", { count: "exact", head: true })
        .eq("user_id", first.owner),
      admin
        .from("usage_events")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", first.owner),
    ]);
    assert(
      !articles.error && !requestKeys.error && !usage.error,
      "Could not verify database results.",
    );
    assert.equal(articles.count, 1);
    assert.equal(requestKeys.count, 6);
    assert.equal(usage.count, 0);
  },
);
