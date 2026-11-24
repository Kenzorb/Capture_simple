import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test(
  "Billing Settings matches Stripe sandbox prices and entitlements",
  { timeout: 90_000 },
  async (t) => {
    const {
      CAPTURE_TEST_SUPABASE_URL,
      CAPTURE_TEST_SUPABASE_PUBLIC,
      CAPTURE_TEST_SUPABASE_SECRET,
      STRIPE_SECRET_KEY,
      STRIPE_BILLING_PORTAL_CONFIGURATION_ID,
    } = process.env;
    assert(
      CAPTURE_TEST_SUPABASE_URL &&
        CAPTURE_TEST_SUPABASE_PUBLIC &&
        CAPTURE_TEST_SUPABASE_SECRET,
      "Set credentials for the disposable Supabase test project.",
    );
    assert(
      STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      "Set a Stripe sandbox key.",
    );
    assert(STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.startsWith("bpc_"));
    const endpoint = new URL(
      "/api/billing/checkout",
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(endpoint.hostname, "127.0.0.1");
    const options = {
      auth: { autoRefreshToken: false, persistSession: false },
    };
    const admin = createClient(
      CAPTURE_TEST_SUPABASE_URL,
      CAPTURE_TEST_SUPABASE_SECRET,
      options,
    );
    const client = createClient(
      CAPTURE_TEST_SUPABASE_URL,
      CAPTURE_TEST_SUPABASE_PUBLIC,
      options,
    );
    const owners = [];
    const sessions = [];
    const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
    let customer;
    let browser;

    async function stripe(path, method = "GET", fields) {
      const response = await globalThis.fetch(
        `https://api.stripe.com/v1${path}`,
        {
          method,
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
          body: fields && new URLSearchParams(fields),
          signal: globalThis.AbortSignal.timeout(15_000),
        },
      );
      assert(response.ok, `Stripe returned HTTP ${response.status}.`);
      return response.json();
    }

    t.after(async () => {
      const results = await Promise.allSettled(
        sessions.map((id) => stripe(`/checkout/sessions/${id}/expire`, "POST")),
      );
      const cleanup = await Promise.allSettled([
        ...owners.map(async (id) => {
          const { error } = await admin.auth.admin.deleteUser(id);
          assert(!error, "Could not clean disposable account.");
        }),
        ...(customer ? [stripe(`/customers/${customer}`, "DELETE")] : []),
        ...(browser ? [browser.close()] : []),
        (async () => {
          const { error } = await admin
            .from("billing_events")
            .delete()
            .eq("stripe_event_id", eventId);
          assert(!error, "Could not clean the billing fixture.");
        })(),
      ]);
      for (const result of [...results, ...cleanup])
        assert.equal(result.status, "fulfilled");
    });

    async function fixture() {
      const email = `capture-checkout-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa7!`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert(!error && data.user, "Could not create disposable account.");
      owners.push(data.user.id);
      return { id: data.user.id, email, password };
    }

    function request(body, token, origin = endpoint.origin) {
      return globalThis.fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: globalThis.AbortSignal.timeout(35_000),
      });
    }

    assert.equal((await request({ interval: "monthly" })).status, 401);
    const [free, other] = await Promise.all([fixture(), fixture()]);
    const { data, error } = await client.auth.signInWithPassword({
      email: free.email,
      password: free.password,
    });
    assert(
      !error && data.session,
      "Could not sign in to the disposable account.",
    );
    const token = data.session.access_token;
    assert.equal(
      (await request({ interval: "monthly" }, token, "https://example.test"))
        .status,
      403,
    );
    for (const input of [
      { interval: "price_browser_supplied" },
      { interval: "monthly", price_id: "price_browser_supplied" },
      { interval: "monthly", user_id: other.id },
      { interval: "monthly", success_url: "https://example.test" },
    ]) {
      assert.equal((await request(input, token)).status, 400);
    }

    for (const [interval, amount, cadence] of [
      ["monthly", 1199, "month"],
      ["annual", 10788, "year"],
    ]) {
      const response = await request({ interval }, token);
      assert.equal(
        response.status,
        200,
        `${interval} Checkout returned HTTP ${response.status}.`,
      );
      const result = await response.json();
      const url = new URL(result.url);
      assert.equal(url.origin, "https://checkout.stripe.com");
      const id = url.pathname.split("/").at(-1);
      assert.match(id, /^cs_test_/);
      sessions.push(id);

      const session = await stripe(
        `/checkout/sessions/${id}?expand[]=line_items`,
      );
      assert.match(session.customer, /^cus_/);
      customer ??= session.customer;
      assert.equal(session.customer, customer);
      assert.equal(session.livemode, false);
      assert.equal(session.mode, "subscription");
      assert.equal(session.status, "open");
      assert.equal(session.payment_status, "unpaid");
      assert.equal(session.client_reference_id, free.id);
      assert.equal(session.currency, "usd");
      assert.equal(session.amount_total, amount);
      assert.equal(
        session.success_url,
        `${endpoint.origin}/dashboard/settings?checkout=success`,
      );
      assert.equal(
        session.cancel_url,
        `${endpoint.origin}/dashboard/settings?checkout=cancelled`,
      );
      assert.equal(session.line_items.data.length, 1);
      assert.equal(
        session.line_items.data[0].price.recurring.interval,
        cadence,
      );
    }

    const subscriptions = await admin
      .from("subscriptions")
      .select("user_id,plan,stripe_customer_id")
      .in("user_id", [free.id, other.id]);
    assert(!subscriptions.error);
    assert.deepEqual(subscriptions.data, [
      { user_id: free.id, plan: "free", stripe_customer_id: customer },
    ]);

    function openPortal(accessToken, { origin = endpoint.origin, body } = {}) {
      return globalThis.fetch(new URL("/api/billing/portal", endpoint), {
        method: "POST",
        headers: {
          Origin: origin,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body,
        signal: globalThis.AbortSignal.timeout(25_000),
      });
    }

    assert.equal((await openPortal()).status, 401);
    assert.equal(
      (await openPortal(token, { origin: "https://example.test" })).status,
      403,
    );
    const otherLogin = await client.auth.signInWithPassword({
      email: other.email,
      password: other.password,
    });
    assert(!otherLogin.error && otherLogin.data.session);
    const otherToken = otherLogin.data.session.access_token;
    assert.equal((await openPortal(otherToken)).status, 409);
    assert.equal(
      (
        await openPortal(otherToken, {
          body: JSON.stringify({
            customer,
            return_url: "https://example.test",
          }),
        })
      ).status,
      400,
    );

    const config = await stripe(
      `/billing_portal/configurations/${STRIPE_BILLING_PORTAL_CONFIGURATION_ID}`,
    );
    assert.equal(config.livemode, false);
    assert.equal(config.features.payment_method_update.enabled, true);
    assert.equal(config.features.invoice_history.enabled, true);
    assert.equal(config.features.subscription_cancel.enabled, true);
    assert.equal(config.features.subscription_cancel.mode, "at_period_end");
    const portal = await openPortal(token);
    assert.equal(portal.status, 200, `Portal returned HTTP ${portal.status}.`);
    assert.equal(portal.headers.get("cache-control"), "private, no-store");
    const hostedUrl = new URL((await portal.json()).url);
    assert.equal(hostedUrl.origin, "https://billing.stripe.com");
    const hostedPage = await globalThis.fetch(hostedUrl, {
      signal: globalThis.AbortSignal.timeout(20_000),
    });
    assert.equal(
      hostedPage.status,
      200,
      "Stripe did not serve the portal page.",
    );
    await hostedPage.body?.cancel();

    const usage = await globalThis.fetch(new URL("/api/usage", endpoint), {
      headers: { Authorization: `Bearer ${token}` },
      signal: globalThis.AbortSignal.timeout(15_000),
    });
    assert.equal(usage.status, 200);
    const state = await usage.json();
    assert.equal(state.plan, "free");
    assert.equal(state.article_limit, 20);

    browser = await chromium.launch({
      executablePath: process.env.CAPTURE_TEST_CHROMIUM_EXECUTABLE,
    });
    const page = await browser.newPage();
    const settings = new URL("/dashboard/settings", endpoint);
    await page.goto(new URL("/sign-in", endpoint).href);
    await page.getByLabel("Email").fill(free.email);
    await page.getByLabel("Password", { exact: true }).fill(free.password);
    await Promise.all([
      page.waitForURL(new URL("/dashboard", endpoint).href),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    await page.goto(settings.href + "?checkout=cancelled");
    const billing = page.getByRole("region", { name: "Billing" });
    const analysis = page.getByRole("region", { name: "Analysis usage" });
    await expect(billing).toContainText("Current plan Free");
    await expect(billing).toContainText(/USD\s+11\.99/);
    await expect(billing).toContainText(/USD\s+107\.88/);
    await expect(billing.getByRole("status")).toContainText(
      "Checkout canceled",
    );
    await expect(analysis.getByText("20", { exact: true })).toBeVisible();
    await expect(
      billing.getByRole("button", { name: "Choose annual" }),
    ).toBeVisible();

    await page.route(
      "**/api/billing/checkout",
      (route) =>
        route.fulfill({
          status: 503,
          json: { error: { message: "Could not start Checkout. Try again." } },
        }),
      { times: 1 },
    );
    await billing.getByRole("button", { name: "Choose monthly" }).click();
    await expect(billing.getByRole("alert")).toHaveText(
      "Could not start Checkout. Try again.",
    );

    const checkoutResponse = page.waitForResponse(
      (res) => res.url() === endpoint.href && res.request().method() === "POST",
    );
    // The actual Stripe destination and amount are checked above without printing session URLs.
    await page.route("https://checkout.stripe.com/**", (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-1);
      if (id?.startsWith("cs_test_")) sessions.push(id);
      return route.fulfill({ body: "Sandbox Checkout destination" });
    });
    await billing.getByRole("button", { name: "Choose monthly" }).click();
    const browserCheckout = await checkoutResponse;
    assert.equal(browserCheckout.status(), 200);
    await page.waitForURL(
      (url) => url.origin === "https://checkout.stripe.com",
    );
    assert.equal(sessions.length, 3);

    const trial = await stripe("/subscriptions", "POST", {
      customer,
      "items[0][price]": process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      "metadata[capture_user_id]": free.id,
      trial_period_days: "7",
      cancel_at_period_end: "true",
    });
    assert.equal(trial.livemode, false);
    const item = trial.items.data[0];
    const verified = await admin.rpc("capture_apply_stripe_event", {
      p_event_id: eventId,
      p_event_type: "customer.subscription.created",
      p_customer_id: customer,
      p_revision: 0,
      p_subscription_id: trial.id,
      p_price_id: item.price.id,
      p_status: trial.status,
      p_period_end: new Date(
        (item.current_period_end ?? trial.current_period_end) * 1000,
      ).toISOString(),
      p_cancel_at_period_end: trial.cancel_at_period_end,
    });
    assert(!verified.error && verified.data === "applied");
    await page.goto(settings.href);
    await expect(billing).toContainText("Current plan Pro");
    await expect(billing).toContainText("Cancellation scheduled");
    await expect(analysis.getByText("300", { exact: true })).toBeVisible();
    await expect(
      billing.getByRole("button", { name: "Choose monthly" }),
    ).toHaveCount(0);

    await page.route("https://billing.stripe.com/**", (route) =>
      route.fulfill({ body: "Sandbox portal destination" }),
    );
    const portalResponse = page.waitForResponse(
      (res) =>
        new URL(res.url()).pathname === "/api/billing/portal" &&
        res.request().method() === "POST",
    );
    await billing.getByRole("button", { name: "Manage billing" }).click();
    assert.equal((await portalResponse).status(), 200);
    await page.waitForURL((url) => url.origin === "https://billing.stripe.com");
  },
);
