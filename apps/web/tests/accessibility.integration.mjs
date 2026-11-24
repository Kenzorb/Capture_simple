import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { chromium, expect as browserExpect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test(
  "Capture stays navigable by keyboard at desktop and mobile widths",
  { timeout: 180_000 },
  async (t) => {
    const expect = browserExpect.configure({ timeout: 15_000 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert(url && secret);
    const origin = new URL(
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(origin.hostname, "127.0.0.1");
    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `capture-accessibility-${randomUUID()}@example.test`;
    const password = `${randomUUID()}Aa7!`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert(!created.error && created.data.user);
    const userId = created.data.user.id;
    t.after(async () =>
      assert(!(await admin.auth.admin.deleteUser(userId)).error),
    );
    const parent = randomUUID();
    const child = randomUUID();
    const article = randomUUID();
    const title = "A keyboard-accessible capture";
    assert(
      !(
        await admin
          .from("topics")
          .insert({ id: parent, user_id: userId, name: "Accessibility" })
      ).error,
    );
    assert(
      !(
        await admin.from("topics").insert({
          id: child,
          user_id: userId,
          name: "Keyboard navigation",
          parent_id: parent,
        })
      ).error,
    );
    const articleUrl = `https://example.test/${article}`;
    assert(
      !(
        await admin.from("articles").insert({
          id: article,
          user_id: userId,
          url: articleUrl,
          canonical_url: articleUrl,
          title,
          domain: "example.test",
        })
      ).error,
    );
    assert(
      !(
        await admin.from("article_topics").insert({
          article_id: article,
          user_id: userId,
          topic_id: child,
          assignment_source: "manual",
        })
      ).error,
    );
    const browser = await chromium.launch({
      executablePath: process.env.CAPTURE_TEST_CHROMIUM_EXECUTABLE,
    });
    t.after(() => browser.close());
    const desktop = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await desktop.goto(new URL("/sign-in", origin).href);
    await desktop.getByLabel("Email").fill(email);
    await desktop.getByLabel("Password", { exact: true }).fill(password);
    await Promise.all([
      desktop.waitForURL(new URL("/dashboard", origin).href),
      desktop.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    await expect(
      desktop.getByRole("heading", { name: "Your library" }),
    ).toBeVisible();
    const page = desktop;
    for (const [layout, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 320, 820],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(new URL("/dashboard", origin).href, {
        waitUntil: "domcontentloaded",
      });
      const main = page.getByRole("main");
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(main).toBeFocused();

      const visibleAccount = page
        .locator("summary")
        .filter({ hasText: "Account" });
      await visibleAccount.focus();
      await page.keyboard.press("Enter");
      const settings = page.getByRole("link", {
        name: "Settings",
        exact: true,
      });
      await expect(settings).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(settings).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(settings).toBeHidden();
      await expect(visibleAccount).toBeFocused();

      await expect(
        page.getByRole("searchbox", { name: "Search saved articles" }),
      ).toBeVisible();
      const source = main.getByLabel("Article URL");
      await source.fill("ftp://example.com/article");
      await source.press("Enter");
      await expect(main.getByRole("alert")).toContainText(
        /HTTP or HTTPS|public/i,
      );

      const treeLink = page
        .getByRole("navigation", { name: "Library" })
        .getByRole("link", { name: "Knowledge Tree" });
      await treeLink.focus();
      await page.keyboard.press("Enter");
      await expect(
        main.getByRole("heading", { name: "Knowledge Tree" }),
      ).toBeFocused();
      const branch = main.getByRole("button", { name: "Expand Accessibility" });
      await branch.focus();
      await expect(branch).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Enter");
      await expect(
        main.getByRole("button", { name: "Collapse Accessibility" }),
      ).toHaveAttribute("aria-expanded", "true");
      const childBranch = main.getByRole("button", {
        name: "Expand Keyboard navigation",
      });
      await childBranch.focus();
      await page.keyboard.press("Space");
      const capture = main.getByRole("link", { name: title });
      await expect(capture).toBeVisible();
      const fits = await page
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
      assert(fits, `${layout} Knowledge Tree has horizontal overflow`);
      const screenshotPrefix =
        process.env.CAPTURE_ACCESSIBILITY_SCREENSHOT_PREFIX;
      if (screenshotPrefix)
        await page.screenshot({
          path: `${screenshotPrefix}-${layout}.png`,
          fullPage: true,
        });
      await capture.focus();
      await page.keyboard.press("Enter");
      await expect(main.getByRole("heading", { name: title })).toBeFocused();
      await expect(
        main.getByRole("textbox", { name: "Personal note", exact: true }),
      ).toBeVisible();
    }
  },
);
