import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "capture deduplication reserves quota once per article without consuming it",
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
      return { owner, client, token: login.data.session.access_token };
    }

    function request(token, body, headers) {
      return globalThis.fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
        signal: globalThis.AbortSignal.timeout(30_000),
      });
    }

    async function save(token, body) {
      const response = await request(token, body);
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

    for (const oversized of [
      { extracted_text: "😀".repeat(25_001) },
      { url: "https://example.com/" + "é".repeat(2049) },
      { extracted_text: "\n".repeat(90_000) },
    ]) {
      const response = await request(first.token, {
        ...requests[0],
        ...oversized,
      });
      assert.equal(response.status, 413);
      assert.equal((await response.json()).error.code, "payload_too_large");
    }
    const media = await request(first.token, requests[0], {
      "Content-Type": "text/plain",
    });
    assert.equal(media.status, 400);
    const encoded = await request(first.token, requests[0], {
      "Content-Encoding": "gzip",
    });
    assert.equal(encoded.status, 400);
    const chunked = await globalThis.fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${first.token}`,
        "Content-Type": "application/json",
      },
      body: new globalThis.ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(70_000));
          controller.enqueue(new Uint8Array(70_000));
          controller.close();
        },
      }),
      duplex: "half",
      signal: globalThis.AbortSignal.timeout(30_000),
    });
    assert.equal(chunked.status, 413);
    assert.equal((await chunked.json()).error.code, "payload_too_large");

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
          body.capture_status === "saved" &&
          body.processing_status === "queued",
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
    assert.equal(usage.count, 1);

    const burst = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        request(first.token, {
          request_id: randomUUID(),
          url: `https://example.com/burst/${index}`,
          source: "manual_url",
        }),
      ),
    );
    assert.equal(
      burst.filter((response) => response.status === 201).length,
      10,
    );
    const rejected = burst.filter((response) => response.status === 429);
    assert.equal(rejected.length, 2);
    for (const response of rejected) {
      const retryAfter = Number(response.headers.get("retry-after"));
      assert(
        Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 60,
      );
      assert.equal((await response.json()).error.code, "rate_limited");
    }

    const { error: directError } = await first.client.rpc(
      "capture_save_article",
      {
        p_request_id: randomUUID(),
        p_url: canonical,
        p_canonical_url: canonical,
        p_domain: "example.com",
        p_title: "Direct fallback",
        p_source: "manual_url",
      },
    );
    assert.equal(directError?.code, "PT429");
    assert.equal(
      (await save(second.token, { ...requests[0], request_id: randomUUID() }))
        .status,
      200,
    );

    const [savedCount, billedCount] = await Promise.all([
      admin
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", first.owner),
      admin
        .from("usage_periods")
        .select("article_limit,reserved,used")
        .eq("user_id", first.owner)
        .single(),
    ]);
    assert(!savedCount.error && !billedCount.error);
    assert.equal(savedCount.count, 11);
    assert.deepEqual(billedCount.data, {
      article_limit: 20,
      reserved: 11,
      used: 0,
    });

    const reset = await admin
      .from("capture_rate_limits")
      .update({
        window_started_at: new Date(Date.now() - 70_000).toISOString(),
      })
      .eq("user_id", first.owner);
    assert(!reset.error, "Could not age disposable rate window");
    assert.equal(
      (await save(first.token, { ...requests[0], request_id: randomUUID() }))
        .status,
      200,
    );
  },
);
