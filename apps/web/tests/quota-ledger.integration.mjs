import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "Free and Pro quota counters reconcile under concurrent capture and deletion",
  { timeout: 120_000 },
  async (t) => {
    const url = process.env.CAPTURE_TEST_SUPABASE_URL;
    const publicKey = process.env.CAPTURE_TEST_SUPABASE_PUBLIC;
    const secret = process.env.CAPTURE_TEST_SUPABASE_SECRET;
    assert(
      url && publicKey && secret,
      "Set credentials for Capture development.",
    );
    const origin = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(origin.hostname, "127.0.0.1");
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const admin = createClient(url, secret, options);
    const checked = ({ data, error }) => {
      assert(!error, error?.code);
      return data;
    };
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    for (const [plan, limit] of [
      ["free", 20],
      ["pro", 300],
    ]) {
      await t.test(plan, async (scenario) => {
        const email = "capture-ledger-" + randomUUID() + "@example.test";
        const password = randomUUID() + "Aa7!";
        const { user } = checked(
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          }),
        );
        scenario.after(async () =>
          checked(await admin.auth.admin.deleteUser(user.id)),
        );
        const client = createClient(url, publicKey, options);
        const { session } = checked(
          await client.auth.signInWithPassword({ email, password }),
        );
        if (plan === "pro") {
          checked(
            await admin.from("subscriptions").insert({
              user_id: user.id,
              plan,
              status: "active",
              period_end: end.toISOString(),
              stripe_customer_id: "cus_" + user.id,
              stripe_subscription_id: "sub_" + user.id,
              stripe_price_id: "test_pro",
            }),
          );
        }
        checked(
          await admin.from("usage_periods").insert({
            user_id: user.id,
            period_start: start.toISOString(),
            period_end: end.toISOString(),
            article_limit: limit,
            used: limit - 1,
            prior_deleted_usage: limit - 1,
          }),
        );

        const request = (path, method, body) =>
          globalThis.fetch(new URL(path, origin), {
            method,
            headers: {
              Authorization: "Bearer " + session.access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: globalThis.AbortSignal.timeout(25000),
          });
        async function save(name) {
          const result = await request("/api/captures", "POST", {
            request_id: randomUUID(),
            url: "https://example.test/" + name,
            title: name,
            source: "chrome_extension",
            extracted_text: "Synthetic article content for quota accounting.",
          });
          const outcome = await result.json();
          assert.equal(result.status, 201, outcome.error?.message);
          return outcome;
        }
        async function remove(id) {
          assert.equal(
            (
              await request("/api/articles/" + id, "DELETE", {
                confirmed: true,
              })
            ).status,
            204,
          );
        }
        async function audit(used, reserved) {
          const [row] = checked(
            await admin.rpc("capture_usage_audit", { p_owner_id: user.id }),
          );
          assert.equal(row.used, used);
          assert.equal(row.reserved, reserved);
          assert.equal(row.ledger_used, used);
          assert.equal(row.ledger_reserved, reserved);
        }
        async function jobFor(articleId) {
          return checked(
            await admin
              .from("processing_jobs")
              .select("id")
              .eq("article_id", articleId)
              .eq("status", "queued")
              .single(),
          ).id;
        }
        async function finish(job, ready) {
          const run = randomUUID();
          assert.equal(
            checked(
              await admin.rpc("capture_start_job", {
                p_job_id: job,
                p_execution_id: run,
              }),
            ),
            true,
          );
          const outcome = {
            p_job_id: job,
            p_execution_id: run,
            p_status: ready ? "ready" : "failed",
            ...(!ready && { p_error_code: "model_unavailable" }),
          };
          assert.equal(
            checked(await admin.rpc("capture_finish_job", outcome)),
            true,
          );
          assert.equal(
            checked(await admin.rpc("capture_finish_job", outcome)),
            true,
          );
        }

        const concurrent = await Promise.all(
          Array.from({ length: 6 }, (_, i) => save("capture-" + i)),
        );
        const accepted = concurrent.filter(
          ({ processing_status }) => processing_status === "queued",
        );
        assert.equal(accepted.length, 1);
        assert.equal(
          concurrent.filter(
            ({ processing_status }) => processing_status === "quota_limited",
          ).length,
          5,
        );
        await audit(limit - 1, 1);
        const article = accepted[0].article_id;
        const waiting = concurrent.find(
          ({ processing_status }) => processing_status === "quota_limited",
        ).article_id;
        const requestAnalysis = () =>
          client.rpc("capture_retry_article", { p_article_id: waiting });
        assert.equal(checked(await requestAnalysis()), "quota_limited");
        assert.deepEqual(
          checked(
            await admin
              .from("processing_jobs")
              .select("id")
              .eq("article_id", waiting),
          ),
          [],
        );
        await finish(await jobFor(article), false);
        await audit(limit - 1, 0);
        assert.equal(
          checked(
            await client.rpc("capture_retry_article", {
              p_article_id: article,
            }),
          ),
          "queued",
        );
        await audit(limit - 1, 1);
        await remove(article);
        await audit(limit - 1, 0);

        assert.deepEqual(
          checked(
            await admin
              .from("processing_jobs")
              .select("id")
              .eq("article_id", waiting),
          ),
          [],
        );
        assert.equal(checked(await requestAnalysis()), "queued");
        await finish(await jobFor(waiting), true);
        await audit(limit, 0);
        await remove(waiting);
        await audit(limit, 0);
        const events = checked(
          await admin
            .from("usage_events")
            .select("state,job_id")
            .eq("user_id", user.id),
        );
        assert.deepEqual(events.map(({ state }) => state).sort(), [
          "consumed",
          "released",
          "released",
        ]);
        assert(events.every(({ job_id }) => job_id === null));
        assert.equal(
          (await save("after-delete")).processing_status,
          "quota_limited",
        );
        assert(
          (await client.rpc("capture_usage_audit", { p_owner_id: user.id }))
            .error,
        );
      });
    }
  },
);
