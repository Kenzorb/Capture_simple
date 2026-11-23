import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "hosted article reads and lifecycle mutations are scoped to the authenticated owner",
  { timeout: 120_000 },
  async (t) => {
    const url = process.env.CAPTURE_TEST_SUPABASE_URL;
    const publicKey = process.env.CAPTURE_TEST_SUPABASE_PUBLIC;
    const secret = process.env.CAPTURE_TEST_SUPABASE_SECRET;
    assert(
      url && publicKey && secret,
      "Set credentials for the disposable Supabase test project.",
    );
    const appUrl = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(
      appUrl.hostname,
      "127.0.0.1",
      "Run this test against the local Capture web app.",
    );
    const origin = appUrl.origin;
    const options = {
      auth: { autoRefreshToken: false, persistSession: false },
    };
    const admin = createClient(url, secret, options);
    const users = [];
    async function fixture() {
      const email = "capture-read-check-" + randomUUID() + "@example.test";
      const password = randomUUID() + "Aa7!";
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert(created.data.user && !created.error, "Could not create user");
      const owner = created.data.user.id;
      users.push(owner);
      const client = createClient(url, publicKey, options);
      const login = await client.auth.signInWithPassword({ email, password });
      assert(login.data.session && !login.error, "Could not sign in");
      const session = login.data.session;
      const cookie =
        "sb-" +
        new URL(url).hostname.split(".")[0] +
        "-auth-token=base64-" +
        Buffer.from(JSON.stringify(session)).toString("base64url");
      return {
        owner,
        header: { Authorization: "Bearer " + session.access_token },
        cookie: { Cookie: cookie },
      };
    }
    const read = (path, headers = {}, endpoint = "/api/articles") =>
      globalThis.fetch(origin + endpoint + path, {
        headers,
        signal: globalThis.AbortSignal.timeout(25000),
      });
    async function json(
      path,
      headers,
      status = 200,
      endpoint = "/api/articles",
    ) {
      const response = await read(path, headers, endpoint);
      assert.equal(
        response.status,
        status,
        path.split("?")[0] + " returned an unexpected status",
      );
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      return response.json();
    }
    try {
      const one = await fixture();
      const two = await fixture();
      const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
      const titled = [
        "Lunar atlas",
        "Ocean currents",
        "Old archive",
        "Private second owner",
      ];
      const same = "2026-11-20T02:00:00.123456Z";
      const rows = ids.map((id, i) => ({
        id,
        user_id: i === 3 ? two.owner : one.owner,
        title: titled[i],
        url: "https://example.test/" + id,
        canonical_url: "https://example.test/" + id,
        domain: i === 1 ? "ocean.example.test" : "example.test",
        status: i === 0 ? "ready" : "saved",
        captured_at: i === 2 ? "2026-11-19T02:00:00Z" : same,
      }));
      assert(
        !(await admin.from("articles").insert(rows)).error,
        "Could not seed articles",
      );
      const topic = randomUUID();
      assert(
        !(
          await admin.from("personal_notes").insert({
            article_id: ids[0],
            user_id: one.owner,
            body: "Owner note",
          })
        ).error,
        "Could not seed note",
      );
      assert(
        !(
          await admin
            .from("topics")
            .insert({ id: topic, user_id: one.owner, name: "Astronomy" })
        ).error,
        "Could not seed topic",
      );
      assert(
        !(
          await admin.from("article_topics").insert({
            article_id: ids[0],
            user_id: one.owner,
            topic_id: topic,
            assignment_source: "manual",
          })
        ).error,
        "Could not seed assignment",
      );

      assert.equal((await json("", {}, 401)).error.code, "unauthenticated");
      assert.equal(
        (await json("/" + ids[0], {}, 401)).error.code,
        "unauthenticated",
      );
      const all = await json("", one.header);
      assert.equal(all.articles.length, 3);
      assert(
        all.articles.every(
          (row) =>
            !Object.hasOwn(row, "user_id") &&
            !Object.hasOwn(row, "canonical_url"),
        ),
      );
      const other = await json("", two.header);
      assert.deepEqual(
        other.articles.map((row) => row.id),
        [ids[3]],
      );
      assert.equal(
        (await json("/" + ids[0], two.header, 404)).error.code,
        "not_found",
      );
      assert.equal(
        (await json("/" + ids[3], one.header, 404)).error.code,
        "not_found",
      );
      const detail = await json("/" + ids[0], one.cookie);
      assert.equal(detail.article.id, ids[0]);
      assert.equal(detail.personal_note, "Owner note");
      assert.deepEqual(
        detail.topics.map((row) => row.id),
        [topic],
      );
      assert(!Object.hasOwn(detail.article, "user_id"));
      const without = await json("/" + ids[1], one.header);
      assert.equal(without.personal_note, null);
      assert.deepEqual(without.topics, []);
      const filtered = await json(
        "?status=ready&domain=EXAMPLE.TEST&q=lunar",
        one.header,
      );
      assert.deepEqual(
        filtered.articles.map((row) => row.id),
        [ids[0]],
      );
      assert.deepEqual((await json("?status=failed", one.header)).articles, []);
      for (const sort of ["captured_asc", "captured_desc"]) {
        const expected =
          sort === "captured_asc"
            ? [ids[2], ...ids.slice(0, 2).sort()]
            : [...ids.slice(0, 2).sort().reverse(), ids[2]];
        const found = [];
        let pageCursor;
        for (let i = 0; i < 3; i++) {
          const query =
            "?limit=1&sort=" +
            sort +
            (pageCursor ? "&cursor=" + encodeURIComponent(pageCursor) : "");
          const page = await json(query, one.header);
          assert.equal(page.articles.length, 1);
          found.push(page.articles[0].id);
          pageCursor = page.next_cursor;
          assert.equal(typeof pageCursor, i < 2 ? "string" : "object");
        }
        assert.deepEqual(found, expected);
        assert.equal(pageCursor, null);
      }
      assert.equal(
        (await json("?cursor=bad", one.header, 400)).error.code,
        "invalid_input",
      );
      assert.equal(
        (await json("/not-a-uuid", one.header, 400)).error.code,
        "invalid_input",
      );

      async function mutate(method, path, headers, body, expected) {
        const response = await globalThis.fetch(origin + path, {
          method,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: globalThis.AbortSignal.timeout(25000),
        });
        assert.equal(
          response.status,
          expected,
          `${method} returned an unexpected status`,
        );
        return response;
      }

      const saved = await mutate(
        "POST",
        "/api/captures",
        one.header,
        {
          request_id: randomUUID(),
          url: "https://example.test/lifecycle",
          title: "First title",
          source: "chrome_extension",
          extracted_text: "Disposable article content",
          personal_note: "First note",
        },
        201,
      );
      const { article_id: id } = await saved.json();
      const path = "/api/articles/" + id;
      const detailPath = "/" + id;
      assert(
        !(
          await admin.from("article_topics").insert({
            article_id: id,
            user_id: one.owner,
            topic_id: topic,
            assignment_source: "manual",
          })
        ).error,
        "Could not seed a topic assignment",
      );

      await mutate("PATCH", path, {}, { title: "Anonymous edit" }, 401);
      await mutate(
        "PATCH",
        path,
        two.header,
        { title: "Cross-owner edit" },
        404,
      );
      await mutate("DELETE", path, two.header, { confirmed: true }, 404);
      await mutate("PATCH", path, one.header, { status: "ready" }, 400);
      await mutate("DELETE", path, one.header, { confirmed: false }, 400);
      assert.equal(
        (await json(detailPath, one.header)).article.title,
        "First title",
      );

      await mutate(
        "PATCH",
        path,
        one.cookie,
        { title: "Edited title", personal_note: "Edited note" },
        204,
      );
      let changed = await json(detailPath, one.header);
      assert.equal(changed.article.title, "Edited title");
      assert.equal(changed.personal_note, "Edited note");
      await mutate("PATCH", path, one.header, { personal_note: null }, 204);
      assert.equal((await json(detailPath, one.header)).personal_note, null);
      await mutate(
        "PATCH",
        path,
        one.header,
        { personal_note: "Note to cascade", archived: true },
        204,
      );
      changed = await json(detailPath, one.header);
      assert(changed.article.archived_at);
      await mutate("PATCH", path, one.header, { archived: true }, 204);
      assert.equal(
        (await json(detailPath, one.header)).article.archived_at,
        changed.article.archived_at,
      );
      assert(
        !(await json("", one.header)).articles.some(
          (article) => article.id === id,
        ),
      );
      assert.deepEqual(
        (await json("?archived=true", one.header)).articles.map(
          (article) => article.id,
        ),
        [id],
      );

      await mutate("PATCH", path, one.header, { archived: false }, 204);
      assert.equal(
        (await json(detailPath, one.header)).article.archived_at,
        null,
      );
      assert(
        (await json("", one.header)).articles.some(
          (article) => article.id === id,
        ),
      );
      await mutate("DELETE", path, one.header, { confirmed: true }, 204);
      assert.equal(
        (await json(detailPath, one.header, 404)).error.code,
        "not_found",
      );

      const related = await Promise.all(
        [
          "article_contents",
          "personal_notes",
          "article_topics",
          "capture_requests",
        ].map((table) =>
          admin
            .from(table)
            .select("article_id", { count: "exact", head: true })
            .eq("article_id", id),
        ),
      );
      assert(
        related.every(({ error, count }) => !error && count === 0),
        "Delete left related rows behind",
      );
      assert.equal((await json("/" + ids[0], one.header)).topics[0].id, topic);
      assert.equal(
        (await json("/" + ids[3], two.header)).article.title,
        "Private second owner",
      );

      function search(params, headers = one.header, status = 200) {
        const query = new URLSearchParams(params);
        return json("?" + query, headers, status, "/api/search");
      }
      const hitIds = (result) => result.articles.map((article) => article.id);
      assert.equal(
        (await search({ q: "lunar" }, {}, 401)).error.code,
        "unauthenticated",
      );
      assert.equal(
        (await search({}, one.header, 400)).error.code,
        "invalid_input",
      );
      assert.equal(
        (await search({ q: "bad\u0000input" }, one.header, 400)).error.code,
        "invalid_input",
      );
      const seededNotes = await admin.from("article_ai_notes").insert({
        user_id: one.owner,
        article_id: ids[1],
        schema_version: 1,
        model: "fixture",
        payload: {
          schema_version: 1,
          model: "fixture",
          summary: "Thermohaline circulation transports heat.",
          concepts: [{ name: "Pycnocline" }],
        },
      });
      assert(!seededNotes.error, seededNotes.error?.code);
      const library = await admin.from("articles").insert(
        Array.from({ length: 1250 }, (_, index) => {
          const address = "https://example.test/search/" + index;
          return {
            user_id: one.owner,
            url: address,
            canonical_url: address,
            title: "Unrelated capture " + index,
            domain: "example.test",
          };
        }),
      );
      assert(!library.error, library.error?.code);
      const verification = [
        [{ q: '"lunar atlas"' }, [ids[0]]],
        [{ q: "thermohaline" }, [ids[1]]],
        [{ q: "PYCNOCLINE" }, [ids[1]]],
        [{ q: '"owner note"' }, [ids[0]]],
        [{ q: "astronomy", status: "ready", topic }, [ids[0]]],
        [{ q: "astronomy", topic: randomUUID() }, []],
        [{ q: "private" }, []],
        [{ q: "-lunar" }, []],
        [{ q: "..." }, []],
      ];
      for (const [query, expected] of verification)
        assert.deepEqual(hitIds(await search(query)), expected, query.q);
      assert.deepEqual(
        hitIds(await search({ q: "astronomy" }, two.header)),
        [],
      );
      assert.deepEqual(hitIds(await search({ q: "private" }, two.header)), [
        ids[3],
      ]);
      const searchStart = globalThis.performance.now();
      const first = await search({
        q: "lunar OR ocean",
        limit: "1",
        sort: "captured_asc",
      });
      const firstMs = globalThis.performance.now() - searchStart;
      assert(first.next_cursor);
      const second = await search({
        q: "lunar OR ocean",
        limit: "1",
        sort: "captured_asc",
        cursor: first.next_cursor,
      });
      assert.deepEqual(
        [...hitIds(first), ...hitIds(second)],
        ids.slice(0, 2).sort(),
      );
      assert.equal(second.next_cursor, null);
      await mutate(
        "PATCH",
        "/api/articles/" + ids[0],
        one.header,
        { personal_note: "Coronal loop", archived: true },
        204,
      );
      assert.deepEqual(
        hitIds(await search({ q: "owner note", archived: "true" })),
        [],
      );
      assert.deepEqual(hitIds(await search({ q: "coronal" })), []);
      assert.deepEqual(
        hitIds(await search({ q: "coronal", archived: "true" })),
        [ids[0]],
      );
      t.diagnostic(
        "Keyword search on a library of 1,253 captures returned the first HTTP page in " +
          Math.round(firstMs) +
          " ms.",
      );
      const noteClient = (headers) =>
        createClient(url, publicKey, { ...options, global: { headers } });
      const ownerEditor = noteClient(one.header);
      const writes = await Promise.all(
        ["First draft", "Second draft"].map((draft) =>
          ownerEditor.rpc("capture_save_personal_note", {
            p_article_id: ids[0],
            p_expected_body: "Coronal loop",
            p_body: draft,
          }),
        ),
      );
      assert(writes.every(({ error }) => !error));
      const results = writes.map(({ data }) => data[0]);
      assert.deepEqual(results.map(({ result }) => result).sort(), [
        "conflict",
        "saved",
      ]);
      const winningNote = results.find(({ result }) => result === "saved").body;
      assert.equal(
        results.find(({ result }) => result === "conflict").body,
        winningNote,
      );
      assert.equal(
        (await json("/" + ids[0], one.header)).personal_note,
        winningNote,
      );
      const foreignEdit = await noteClient(two.header).rpc(
        "capture_save_personal_note",
        {
          p_article_id: ids[0],
          p_expected_body: winningNote,
          p_body: "Foreign edit",
        },
      );
      assert(!foreignEdit.error);
      assert.deepEqual(foreignEdit.data, []);
    } finally {
      for (const id of users)
        assert(
          !(await admin.auth.admin.deleteUser(id)).error,
          "Could not clean fixture",
        );
    }
  },
);
