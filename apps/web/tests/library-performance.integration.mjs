import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import process from "node:process";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "large libraries keep cursor, search and tree responses within budget",
  { timeout: 180_000 },
  async (t) => {
    const {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
      SUPABASE_SERVICE_ROLE_KEY: secret,
    } = process.env;
    assert(url && publicKey && secret);
    const origin = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(origin.hostname, "127.0.0.1");
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const admin = createClient(url, secret, options);
    const sampleCount = 8;
    const budgetMs = 2_500;
    const responseBudget = 64 * 1024;
    const sourceText =
      "Archived fixture text for the captured article. ".repeat(1_250);

    function checked({ data, error }) {
      assert(!error, error?.code);
      return data;
    }

    for (const size of [100, 1_250]) {
      await t.test(`${size} articles`, async (scenario) => {
        const email = `capture-perf-${randomUUID()}@example.test`;
        const password = `${randomUUID()}Aa7!`;
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
        const headers = { Authorization: `Bearer ${session.access_token}` };
        let leaves = Array(8).fill(null);
        for (let depth = 0; depth < 4; depth++) {
          const topics = leaves.map((parent, branch) => ({
            id: randomUUID(),
            user_id: user.id,
            name: `Branch ${branch + 1} level ${depth + 1}`,
            parent_id: parent,
          }));
          checked(await admin.from("topics").insert(topics));
          leaves = topics.map(({ id }) => id);
        }
        const articles = Array.from({ length: size }, (_, index) => {
          const address = `https://example.test/library-performance/${index}`;
          return {
            id: randomUUID(),
            user_id: user.id,
            url: address,
            canonical_url: address,
            title: `Performance article ${index}`,
            domain: "example.test",
          };
        });
        for (let start = 0; start < size; start += 250) {
          const batch = articles.slice(start, start + 250);
          checked(await admin.from("articles").insert(batch));
          checked(
            await admin.from("article_topics").insert(
              batch.map(({ id }, index) => ({
                article_id: id,
                user_id: user.id,
                topic_id: leaves[(index + start) % leaves.length],
                assignment_source: "manual",
              })),
            ),
          );
        }
        checked(
          await admin.from("article_contents").insert(
            articles.slice(-8).map(({ id }) => ({
              article_id: id,
              user_id: user.id,
              cleaned_text: sourceText,
            })),
          ),
        );

        async function sample(path) {
          const start = performance.now();
          const response = await globalThis.fetch(new URL(path, origin), {
            headers,
            signal: globalThis.AbortSignal.timeout(25_000),
          });
          assert.equal(response.status, 200, path);
          const text = await response.text();
          const ms = performance.now() - start;
          const bytes = Buffer.byteLength(text);
          assert(
            bytes < responseBudget,
            `${path} exceeded the response size budget`,
          );
          return { data: JSON.parse(text), ms, bytes };
        }
        const list = "/api/articles?limit=20";
        const search = "/api/search?q=performance&limit=20";
        const tree = "/api/topics";
        const first = await sample(list);
        const firstSearch = await sample(search);
        await sample(tree);
        assert(first.data.next_cursor && firstSearch.data.next_cursor);
        const pageTwo = (path, cursor) =>
          `${path}&${new URLSearchParams({ cursor })}`;
        const scenarios = [
          ["library page one", list, 20],
          ["library page two", pageTwo(list, first.data.next_cursor), 20],
          ["search page one", search, 20],
          [
            "search page two",
            pageTwo(search, firstSearch.data.next_cursor),
            20,
          ],
          ["topic tree", tree, 32],
        ];

        for (const [name, path, expected] of scenarios) {
          const samples = [];
          for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            const result = await sample(path);
            samples.push(result);
            if (path === tree) {
              assert.equal(result.data.topics.length, expected);
              assert.equal(
                result.data.topics.reduce(
                  (total, topic) => total + topic.article_count,
                  0,
                ),
                size,
              );
            } else {
              assert.equal(result.data.articles.length, expected);
              assert(
                result.data.articles.every(
                  (article) => !("cleaned_text" in article),
                ),
              );
            }
          }
          const times = samples.map(({ ms }) => ms).sort((a, b) => a - b);
          const p95 = Math.round(times[Math.ceil(sampleCount * 0.95) - 1]);
          const maxBytes = Math.max(...samples.map(({ bytes }) => bytes));
          scenario.diagnostic(`${name}: ${p95} ms p95, ${maxBytes} bytes max`);
          assert(p95 <= budgetMs, `${name} exceeded the ${budgetMs} ms budget`);
          if (name.endsWith("page two")) {
            const previous = name.startsWith("search")
              ? firstSearch.data.articles
              : first.data.articles;
            const ids = new Set(previous.map(({ id }) => id));
            assert(samples[0].data.articles.every(({ id }) => !ids.has(id)));
          }
        }
      });
    }
  },
);
