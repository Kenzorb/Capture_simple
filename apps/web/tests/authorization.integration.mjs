import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

test(
  "Capture APIs enforce authentication and account ownership for Free and Pro",
  { timeout: 120_000 },
  async (t) => {
    const {
      CAPTURE_TEST_SUPABASE_URL: url,
      CAPTURE_TEST_SUPABASE_PUBLIC: publicKey,
      CAPTURE_TEST_SUPABASE_SECRET: secret,
    } = process.env;
    assert(url && publicKey && secret, "Configure the development database.");
    const origin = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(origin.hostname, "127.0.0.1");
    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    function checked({ data, error }) {
      assert(!error, error?.code);
      return data;
    }

    async function member(plan) {
      const email = `capture-authz-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa7!`;
      const { user } = checked(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      t.after(async () => checked(await admin.auth.admin.deleteUser(user.id)));
      const jar = new Map();
      const client = createServerClient(url, publicKey, {
        cookies: {
          getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
          setAll(cookies) {
            for (const { name, value, options } of cookies) {
              if (options?.maxAge === 0) jar.delete(name);
              else jar.set(name, value);
            }
          },
        },
      });
      checked(await client.auth.signInWithPassword({ email, password }));
      const id = randomUUID().replaceAll("-", "");
      if (plan === "pro") {
        checked(
          await admin.from("subscriptions").insert({
            user_id: user.id,
            plan,
            stripe_customer_id: `cus_${id}`,
            stripe_subscription_id: `sub_${id}`,
            stripe_price_id: `price_${id}`,
            status: "active",
            period_end: new Date(Date.now() + 86_400_000).toISOString(),
          }),
        );
      }
      return {
        id: user.id,
        client,
        plan,
        cookie: () =>
          Array.from(
            jar,
            ([name, value]) => `${name}=${encodeURIComponent(value)}`,
          ).join("; "),
      };
    }

    async function request(method, path, cookie, expected, body) {
      const response = await globalThis.fetch(new URL(path, origin), {
        method,
        redirect: "manual",
        headers: {
          ...(cookie && { Cookie: cookie }),
          ...(body !== undefined && { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: globalThis.AbortSignal.timeout(30_000),
      });
      assert.equal(
        response.status,
        expected,
        `${method} ${path.split("?")[0]}`,
      );
      if (expected === 204) return null;
      return response.json();
    }

    const privateRoutes = [
      ["GET", "/api/me"],
      ["GET", "/api/usage"],
      ["GET", "/api/export"],
      ["GET", "/api/articles"],
      ["GET", "/api/search?q=fixture"],
      ["GET", `/api/articles/${randomUUID()}`],
      ["PATCH", `/api/articles/${randomUUID()}`],
      ["DELETE", `/api/articles/${randomUUID()}`],
      ["POST", "/api/captures"],
      ["GET", "/api/topics"],
      ["POST", "/api/topics"],
      ["PATCH", `/api/topics/${randomUUID()}`],
      ["DELETE", `/api/topics/${randomUUID()}`],
      ["POST", "/api/billing/checkout"],
      ["POST", "/api/billing/portal"],
    ];
    for (const [method, path] of privateRoutes)
      await request(method, path, null, 401);

    const [free, pro] = await Promise.all([member("free"), member("pro")]);
    for (const user of [free, pro]) {
      const cookie = user.cookie();
      const account = await request("GET", "/api/me", cookie, 200);
      assert.equal(account.id, user.id);
      assert.equal(account.plan, user.plan);
      const usage = await request("GET", "/api/usage", cookie, 200);
      assert.equal(usage.article_limit, user.plan === "pro" ? 300 : 20);
      const unique = randomUUID();
      const saved = await request("POST", "/api/captures", cookie, 201, {
        request_id: randomUUID(),
        url: `https://example.com/authorization-${unique}`,
        title: `Capture authorization ${user.plan}`,
        source: "manual_url",
      });
      const topic = await request("POST", "/api/topics", cookie, 201, {
        name: `Authorization ${user.plan}`,
      });
      user.article = saved.article_id;
      user.topic = topic.topic.id;
    }

    for (const [owner, other] of [
      [free, pro],
      [pro, free],
    ]) {
      const cookie = owner.cookie();
      const articlePath = `/api/articles/${owner.article}`;
      const foreignArticle = `/api/articles/${other.article}`;
      const foreignTopic = `/api/topics/${other.topic}`;
      const title = `Updated ${owner.plan} fixture`;
      await request("PATCH", articlePath, cookie, 204, { title });
      assert.equal(
        (await request("GET", articlePath, cookie, 200)).article.title,
        title,
      );
      await request("PATCH", `/api/topics/${owner.topic}`, cookie, 200, {
        name: title,
      });
      for (const path of [
        "/api/articles",
        `/api/search?q=${encodeURIComponent(title)}`,
        "/api/export",
      ]) {
        const data = JSON.stringify(await request("GET", path, cookie, 200));
        assert(
          data.includes(owner.article),
          `${path} lost the owner's capture`,
        );
        assert(
          !data.includes(other.article),
          `${path} returned the other account's capture`,
        );
      }
      const topics = JSON.stringify(
        await request("GET", "/api/topics", cookie, 200),
      );
      assert(topics.includes(owner.topic) && !topics.includes(other.topic));
      await request("GET", foreignArticle, cookie, 404);
      await request("PATCH", foreignArticle, cookie, 404, {
        title: "Wrong account",
      });
      await request("DELETE", foreignArticle, cookie, 404, { confirmed: true });
      await request("PATCH", foreignTopic, cookie, 404, {
        name: "Wrong account",
      });
      await request("DELETE", foreignTopic, cookie, 404);
    }
    await request("POST", "/api/billing/checkout", pro.cookie(), 409, {
      interval: "monthly",
    });
    await request("POST", "/api/billing/portal", free.cookie(), 409);

    for (const user of [free, pro]) {
      await request("DELETE", `/api/topics/${user.topic}`, user.cookie(), 204);
      await request(
        "DELETE",
        `/api/articles/${user.article}`,
        user.cookie(),
        204,
        { confirmed: true },
      );
      checked(await user.client.auth.signOut());
      for (const [method, path] of privateRoutes) {
        await request(method, path, user.cookie(), 401);
      }
    }
  },
);
