import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "Authenticated users enter sandbox Checkout and their own billing portal",
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
    let customer;

    async function stripe(path, method = "GET") {
      const response = await globalThis.fetch(
        `https://api.stripe.com/v1${path}`,
        {
          method,
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
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
  },
);
