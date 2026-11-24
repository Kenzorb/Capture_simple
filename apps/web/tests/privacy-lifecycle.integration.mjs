import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function settings() {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
    SUPABASE_SERVICE_ROLE_KEY: key,
  } = process.env;
  assert(url && publicKey && key);
  const origin = new URL(
    process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
  );
  assert.equal(origin.hostname, "127.0.0.1");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    admin: createClient(url, key, options),
    newClient: () => createClient(url, publicKey, options),
    origin,
  };
}

function checked({ data, error }) {
  assert(!error, error?.code);
  return data;
}

async function fixture(t, admin, status = "ready") {
  const email = `capture-privacy-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa7!`;
  const { user } = checked(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  t.after(() => admin.auth.admin.deleteUser(user.id));
  const article = randomUUID();
  const address = `https://example.test/privacy/${article}`;
  checked(
    await admin.from("articles").insert({
      id: article,
      user_id: user.id,
      url: address,
      canonical_url: address,
      title: "Privacy lifecycle fixture",
      domain: "example.test",
      status,
    }),
  );
  checked(
    await admin.from("article_contents").insert({
      article_id: article,
      user_id: user.id,
      cleaned_text: "Stored source fixture",
    }),
  );
  checked(
    await admin.from("personal_notes").insert({
      article_id: article,
      user_id: user.id,
      body: "Retained personal note",
    }),
  );
  return { email, password, owner: user.id, article };
}

test(
  "a disposable account can export and delete its own library",
  { timeout: 120_000 },
  async (t) => {
    const { admin, origin } = settings();
    const [owner, other] = await Promise.all([
      fixture(t, admin),
      fixture(t, admin),
    ]);
    const browser = await chromium.launch({
      executablePath: process.env.CAPTURE_TEST_CHROMIUM_EXECUTABLE,
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.goto(new URL("/sign-in", origin).href, {
      waitUntil: "domcontentloaded",
    });
    await page.getByLabel("Email", { exact: true }).fill(owner.email);
    await page.getByLabel("Password", { exact: true }).fill(owner.password);
    await Promise.all([
      page.waitForURL(new URL("/dashboard", origin).href),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    const exported = await page.request.get(
      new URL("/api/export", origin).href,
    );
    assert.equal(exported.status(), 200);
    const data = await exported.json();
    assert.deepEqual(
      data.articles.map(({ id }) => id),
      [owner.article],
    );

    const settingsUrl = new URL("/dashboard/settings", origin);
    await page.goto(settingsUrl.href, { waitUntil: "domcontentloaded" });
    const region = page.getByRole("region", { name: "Privacy and data" });
    async function submit(password) {
      await region
        .locator("summary")
        .filter({ hasText: "Delete account" })
        .click();
      await region.getByLabel("Current password").fill(password);
      await region.getByLabel("Type DELETE to confirm").fill("DELETE");
      await region
        .getByRole("button", { name: "Delete account permanently" })
        .click();
    }
    await submit("not the account password");
    await expect(region.getByRole("alert")).toHaveText(
      "Your password could not be verified. Try again.",
      { timeout: 20_000 },
    );
    assert(checked(await admin.auth.admin.getUserById(owner.owner)).user);
    await page.goto(settingsUrl.href, { waitUntil: "domcontentloaded" });
    await submit(owner.password);
    await page.waitForURL("**/sign-in?notice=account-deleted", {
      timeout: 25_000,
    });
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Your Capture account was deleted." }),
    ).toBeVisible();
    assert.equal(
      (await admin.auth.admin.getUserById(owner.owner)).error?.status,
      404,
    );
    const retained = checked(
      await admin
        .from("articles")
        .select("id")
        .in("id", [owner.article, other.article]),
    );
    assert.deepEqual(retained, [{ id: other.article }]);
    const related = checked(
      await admin
        .from("personal_notes")
        .select("article_id")
        .in("article_id", [owner.article, other.article]),
    );
    assert.deepEqual(related, [{ article_id: other.article }]);
    const sources = checked(
      await admin
        .from("article_contents")
        .select("article_id")
        .in("article_id", [owner.article, other.article]),
    );
    assert.deepEqual(sources, [{ article_id: other.article }]);
    assert.equal(
      (await page.request.get(new URL("/api/export", origin).href)).status(),
      401,
    );
  },
);

test("source removal is owner-scoped and preserves the saved capture", async (t) => {
  const { admin, newClient } = settings();
  const [owner, other, busy] = await Promise.all([
    fixture(t, admin),
    fixture(t, admin),
    fixture(t, admin, "queued"),
  ]);
  checked(
    await admin.from("article_source_chunks").insert({
      article_id: owner.article,
      user_id: owner.owner,
      chunk_id: "fixture",
      position: 0,
      start_byte: 0,
      end_byte: 8,
      text: "Evidence",
    }),
  );
  const member = newClient();
  checked(
    await member.auth.signInWithPassword({
      email: owner.email,
      password: owner.password,
    }),
  );
  const remove = (client, article) =>
    client.rpc("capture_remove_source_text", { p_article_id: article });
  assert.equal((await remove(newClient(), owner.article)).error?.code, "42501");
  assert.equal(checked(await remove(member, other.article)), "missing");
  const queued = newClient();
  checked(
    await queued.auth.signInWithPassword({
      email: busy.email,
      password: busy.password,
    }),
  );
  assert.equal(checked(await remove(queued, busy.article)), "busy");
  assert.equal(checked(await remove(member, owner.article)), "removed");
  assert.equal(checked(await remove(member, owner.article)), "removed");
  const sources = checked(
    await admin
      .from("article_contents")
      .select("article_id")
      .in("article_id", [owner.article, other.article, busy.article]),
  );
  assert.deepEqual(
    new Set(sources.map(({ article_id }) => article_id)),
    new Set([other.article, busy.article]),
  );
  const evidence = checked(
    await admin
      .from("article_source_chunks")
      .select("text")
      .eq("article_id", owner.article)
      .single(),
  );
  assert.equal(evidence.text, "Evidence");
  assert.equal(
    checked(
      await member
        .from("articles")
        .select("id")
        .eq("id", owner.article)
        .single(),
    ).id,
    owner.article,
  );
  assert.equal(
    checked(
      await member
        .from("personal_notes")
        .select("body")
        .eq("article_id", owner.article)
        .single(),
    ).body,
    "Retained personal note",
  );
});
