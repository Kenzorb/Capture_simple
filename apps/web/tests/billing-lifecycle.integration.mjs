import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { URL, URLSearchParams } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "Stripe sandbox billing lifecycle preserves Capture knowledge",
  { timeout: 360_000 },
  async (t) => {
    const env = process.env;
    const origin = new URL(env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000");
    assert.equal(origin.hostname, "127.0.0.1");
    assert(
      env.CAPTURE_TEST_SUPABASE_URL &&
        env.CAPTURE_TEST_SUPABASE_PUBLIC &&
        env.CAPTURE_TEST_SUPABASE_SECRET,
    );
    assert(
      env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
        env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"),
    );
    const admin = client(env.CAPTURE_TEST_SUPABASE_SECRET);
    const owners = [];
    const clocks = [];
    const customers = new Set();
    const replayIds = [];
    const floor = Math.floor(Date.now() / 1000) - 5;

    function client(key) {
      return createClient(env.CAPTURE_TEST_SUPABASE_URL, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    function checked({ data, error }) {
      assert(!error, error?.code);
      return data;
    }

    async function stripe(path, method = "GET", fields) {
      const response = await globalThis.fetch(
        `https://api.stripe.com/v1${path}`,
        {
          method,
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
          body: fields && new URLSearchParams(fields),
          signal: globalThis.AbortSignal.timeout(15_000),
        },
      );
      const data = await response.json();
      assert(
        response.ok,
        `Stripe ${method} ${path.split("?")[0]} HTTP ${response.status} ${data.error?.code ?? ""} ${data.error?.param ?? ""}`,
      );
      return data;
    }

    async function waitFor(label, probe) {
      const deadline = Date.now() + 75_000;
      do {
        const value = await probe();
        if (value) return value;
        await delay(1_250);
      } while (Date.now() < deadline);
      assert.fail(`Timed out waiting for ${label}`);
    }

    async function providerEvents() {
      const ids = new Set();
      const params = new URLSearchParams({
        limit: "100",
        "created[gte]": String(floor),
      });
      for (;;) {
        const page = await stripe(`/events?${params}`);
        for (const event of page.data) {
          if (customers.has(event.data.object.customer)) ids.add(event.id);
        }
        if (!page.has_more) return [...ids];
        params.set("starting_after", page.data.at(-1).id);
      }
    }

    t.after(async () => {
      // Remove the DB mappings before deleting clocks, which themselves emit events.
      const removed = await Promise.allSettled(
        owners.map(async (owner) =>
          checked(await admin.auth.admin.deleteUser(owner)),
        ),
      );
      const eventIds = await providerEvents();
      const cleanup = await Promise.allSettled([
        ...clocks.map((clock) =>
          stripe(`/test_helpers/test_clocks/${clock}`, "DELETE"),
        ),
        ...(eventIds.length || replayIds.length
          ? [
              admin
                .from("billing_events")
                .delete()
                .in("stripe_event_id", [...eventIds, ...replayIds])
                .then(checked),
            ]
          : []),
      ]);
      for (const result of [...removed, ...cleanup]) {
        if (result.status === "rejected") throw result.reason;
      }
    });

    async function fixture(interval, price) {
      assert(price?.startsWith("price_"));
      const email = `capture-lifecycle-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa7!`;
      const { user } = checked(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      owners.push(user.id);
      const { session } = checked(
        await client(env.CAPTURE_TEST_SUPABASE_PUBLIC).auth.signInWithPassword({
          email,
          password,
        }),
      );
      const clock = await stripe("/test_helpers/test_clocks", "POST", {
        frozen_time: String(Math.floor(Date.now() / 1000)),
        name: `Capture ${interval} lifecycle`,
      });
      clocks.push(clock.id);
      const customer = await stripe("/customers", "POST", {
        test_clock: clock.id,
        payment_method: "pm_card_visa",
        "invoice_settings[default_payment_method]": "pm_card_visa",
      });
      assert.equal(customer.livemode, false);
      customers.add(customer.id);
      checked(
        await admin
          .from("subscriptions")
          .insert({ user_id: user.id, stripe_customer_id: customer.id }),
      );
      const subscription = await stripe("/subscriptions", "POST", {
        customer: customer.id,
        "items[0][price]": price,
        "metadata[capture_user_id]": user.id,
        payment_behavior: "error_if_incomplete",
      });
      assert.equal(subscription.status, "active");
      assert.equal(
        subscription.items.data[0].price.recurring.interval,
        interval,
      );
      return {
        clock: clock.id,
        customer: customer.id,
        token: session.access_token,
        user: user.id,
        subscription,
      };
    }

    function termEnd(subscription) {
      const seconds =
        subscription.items.data[0].current_period_end ??
        subscription.current_period_end;
      assert(Number.isInteger(seconds));
      return seconds;
    }

    async function billing(fixture) {
      return checked(
        await admin
          .from("subscriptions")
          .select(
            "plan,status,period_end,stripe_revision,stripe_subscription_id,cancel_at_period_end",
          )
          .eq("user_id", fixture.user)
          .single(),
      );
    }

    async function request(fixture, path) {
      const response = await globalThis.fetch(new URL(path, origin), {
        headers: { Authorization: `Bearer ${fixture.token}` },
        signal: globalThis.AbortSignal.timeout(25_000),
      });
      assert.equal(
        response.status,
        200,
        `Capture GET ${path} returned ${response.status}.`,
      );
      return response.json();
    }

    async function advance(fixture, seconds) {
      const path = `/test_helpers/test_clocks/${fixture.clock}`;
      await stripe(`${path}/advance`, "POST", { frozen_time: String(seconds) });
      return waitFor("Stripe test clock", async () => {
        const clock = await stripe(path);
        assert.notEqual(clock.status, "internal_failure");
        return clock.status === "ready";
      });
    }

    async function eventFor(fixture, type) {
      const params = new URLSearchParams({
        limit: "100",
        type,
        "created[gte]": String(floor),
      });
      return waitFor(type, async () =>
        (await stripe(`/events?${params}`)).data.find(
          (event) => event.data.object.customer === fixture.customer,
        ),
      );
    }

    async function eventRecorded(id) {
      return waitFor("provider webhook delivery", async () =>
        checked(
          await admin
            .from("billing_events")
            .select("stripe_event_id")
            .eq("stripe_event_id", id)
            .maybeSingle(),
        ),
      );
    }

    async function replay(event, id = event.id) {
      const body = JSON.stringify({ ...event, id });
      const time = Math.floor(Date.now() / 1000);
      const digest = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
        .update(`${time}.${body}`)
        .digest("hex");
      const response = await globalThis.fetch(
        new URL("/api/webhooks/stripe", origin),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Stripe-Signature": `t=${time},v1=${digest}`,
          },
          body,
          signal: globalThis.AbortSignal.timeout(25_000),
        },
      );
      assert.equal(response.status, 200);
    }

    const monthly = await fixture("month", env.STRIPE_PRO_MONTHLY_PRICE_ID);
    const annual = await fixture("year", env.STRIPE_PRO_ANNUAL_PRICE_ID);
    for (const account of [monthly, annual]) {
      await waitFor(
        "active Pro entitlement",
        async () => (await billing(account)).plan === "pro",
      );
      const usage = await request(account, "/api/usage");
      assert.equal(usage.article_limit, 300);
      assert.equal(usage.used, 0);
    }
    const original = await eventFor(monthly, "customer.subscription.created");
    await eventRecorded(original.id);
    await replay(original);
    const repeated = await admin
      .from("billing_events")
      .select("stripe_event_id", { count: "exact" })
      .eq("stripe_event_id", original.id);
    assert(!repeated.error && repeated.count === 1);

    const article = randomUUID();
    const topic = randomUUID();
    const note = "My notes remain after downgrading.";
    const articleUrl = `https://example.test/${article}`;
    checked(
      await admin.from("articles").insert({
        id: article,
        user_id: monthly.user,
        title: "Saved billing fixture",
        url: articleUrl,
        canonical_url: articleUrl,
        domain: "example.test",
        status: "saved",
      }),
    );
    checked(
      await admin
        .from("personal_notes")
        .insert({ article_id: article, user_id: monthly.user, body: note }),
    );
    checked(
      await admin.from("topics").insert({
        id: topic,
        user_id: monthly.user,
        name: "Billing fixture topic",
      }),
    );
    checked(
      await admin.from("article_topics").insert({
        article_id: article,
        user_id: monthly.user,
        topic_id: topic,
        assignment_source: "manual",
      }),
    );

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const priorMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    ).toISOString();
    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString();
    checked(
      await admin.from("usage_periods").insert([
        {
          user_id: annual.user,
          period_start: priorMonth,
          period_end: monthStart,
          used: 32,
          article_limit: 300,
          prior_deleted_usage: 32,
        },
        {
          user_id: monthly.user,
          period_start: monthStart,
          period_end: nextMonth,
          used: 6,
          article_limit: 300,
          prior_deleted_usage: 6,
        },
      ]),
    );
    const reset = await request(annual, "/api/usage");
    assert.equal(reset.used, 0);
    assert.equal(reset.article_limit, 300);
    assert.equal(new Date(reset.next_reset).toISOString(), nextMonth);

    const renewAt = termEnd(monthly.subscription);
    await advance(monthly, renewAt + 7_200);
    const renewed = await waitFor("paid Stripe renewal", async () => {
      const current = await stripe(
        `/subscriptions/${monthly.subscription.id}?expand[]=latest_invoice`,
      );
      return current.status === "active" &&
        termEnd(current) > renewAt &&
        current.latest_invoice?.status === "paid"
        ? current
        : null;
    });
    await waitFor("Capture renewal", async () => {
      const state = await billing(monthly);
      return (
        Date.parse(state.period_end) === termEnd(renewed) * 1000 &&
        state.plan === "pro"
      );
    });
    assert.equal((await request(monthly, "/api/usage")).used, 6);

    const failing = await stripe(
      "/payment_methods/pm_card_chargeCustomerFail/attach",
      "POST",
      { customer: monthly.customer },
    );
    await stripe(`/subscriptions/${monthly.subscription.id}`, "POST", {
      default_payment_method: failing.id,
    });
    await advance(monthly, termEnd(renewed) + 7_200);
    await eventRecorded((await eventFor(monthly, "invoice.payment_failed")).id);
    await waitFor("past-due downgrade", async () => {
      const state = await billing(monthly);
      return state.status === "past_due" && state.plan === "free";
    });
    const staleId = `evt_${randomUUID().replaceAll("-", "")}`;
    replayIds.push(staleId);
    await replay(original, staleId);
    assert.equal((await billing(monthly)).status, "past_due");
    assert.equal((await request(monthly, "/api/usage")).article_limit, 20);
    assert.equal((await request(monthly, "/api/usage")).used, 6);
    const detail = await request(monthly, `/api/articles/${article}`);
    assert.equal(detail.article.title, "Saved billing fixture");
    assert.equal(detail.personal_note, note);
    assert(detail.topics.some((entry) => entry.id === topic));

    await stripe(`/subscriptions/${annual.subscription.id}`, "POST", {
      cancel_at_period_end: "true",
    });
    await waitFor("scheduled annual cancellation", async () => {
      const state = await billing(annual);
      return state.cancel_at_period_end && state.plan === "pro";
    });
    await advance(annual, termEnd(annual.subscription) + 7_200);
    await eventRecorded(
      (await eventFor(annual, "customer.subscription.deleted")).id,
    );
    await waitFor("annual period-end downgrade", async () => {
      const state = await billing(annual);
      return state.status === "canceled" && state.plan === "free";
    });
    assert.equal((await request(annual, "/api/usage")).article_limit, 20);
  },
);
