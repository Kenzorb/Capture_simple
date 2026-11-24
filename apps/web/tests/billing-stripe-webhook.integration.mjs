import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { createClient } from "@supabase/supabase-js";

test(
  "verified deliveries reconcile current Stripe state exactly once",
  { timeout: 90_000 },
  async (t) => {
    const {
      CAPTURE_TEST_SUPABASE_URL,
      CAPTURE_TEST_SUPABASE_SECRET,
      STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET,
      STRIPE_PRO_MONTHLY_PRICE_ID,
    } = process.env;
    assert(CAPTURE_TEST_SUPABASE_URL && CAPTURE_TEST_SUPABASE_SECRET);
    assert(STRIPE_SECRET_KEY?.startsWith("sk_test_"));
    assert(
      STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") &&
        STRIPE_PRO_MONTHLY_PRICE_ID,
    );
    const endpoint = new URL(
      "/api/webhooks/stripe",
      process.env.CAPTURE_TEST_APP_URL ?? "http://127.0.0.1:3000",
    );
    assert.equal(endpoint.hostname, "127.0.0.1");
    const db = createClient(
      CAPTURE_TEST_SUPABASE_URL,
      CAPTURE_TEST_SUPABASE_SECRET,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const ids = [];
    let customer;
    let owner;

    async function stripe(path, method, fields) {
      const response = await globalThis.fetch(
        `https://api.stripe.com/v1${path}`,
        {
          method,
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
          body: fields && new URLSearchParams(fields),
          signal: globalThis.AbortSignal.timeout(15_000),
        },
      );
      assert(response.ok, `Stripe ${method} returned HTTP ${response.status}.`);
      return response.json();
    }

    t.after(async () => {
      const cleanup = await Promise.allSettled([
        ...(customer ? [stripe(`/customers/${customer}`, "DELETE")] : []),
        ...(owner ? [db.auth.admin.deleteUser(owner)] : []),
        ...(ids.length
          ? [db.from("billing_events").delete().in("stripe_event_id", ids)]
          : []),
      ]);
      for (const result of cleanup) {
        assert.equal(result.status, "fulfilled");
        assert(!result.value?.error, "Could not clean a disposable fixture.");
      }
    });

    const account = await db.auth.admin.createUser({
      email: `capture-webhook-${randomUUID()}@example.test`,
      email_confirm: true,
    });
    assert(!account.error && account.data.user);
    owner = account.data.user.id;
    const createdCustomer = await stripe("/customers", "POST", {
      description: "Capture webhook fixture",
    });
    assert.equal(createdCustomer.livemode, false);
    customer = createdCustomer.id;
    const mapped = await db
      .from("subscriptions")
      .insert({ user_id: owner, stripe_customer_id: customer });
    assert(!mapped.error);

    function event(type, data, created = Math.trunc(Date.now() / 1000)) {
      const id = `evt_${randomUUID().replaceAll("-", "")}`;
      ids.push(id);
      return {
        id,
        object: "event",
        created,
        type,
        livemode: false,
        data: { object: data },
      };
    }

    async function deliver(
      payload,
      { forged = false, modified = false, age = 0 } = {},
    ) {
      const body = JSON.stringify(payload, null, 2);
      const timestamp = Math.trunc(Date.now() / 1000) - age;
      const signature = createHmac(
        "sha256",
        forged ? "wrong-secret" : STRIPE_WEBHOOK_SECRET,
      )
        .update(`${timestamp}.${body}`)
        .digest("hex");
      const response = await globalThis.fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": `t=${timestamp},v1=${"0".repeat(64)},v1=${signature}`,
        },
        body: modified ? `${body} ` : body,
        signal: globalThis.AbortSignal.timeout(35_000),
      });
      return response.status;
    }

    async function billing() {
      const result = await db
        .from("subscriptions")
        .select(
          "stripe_revision,stripe_subscription_id,status,plan,cancel_at_period_end",
        )
        .eq("user_id", owner)
        .single();
      assert(!result.error, "Could not read webhook fixture.");
      return result.data;
    }

    function trial(userId) {
      return stripe("/subscriptions", "POST", {
        customer,
        "items[0][price]": STRIPE_PRO_MONTHLY_PRICE_ID,
        "metadata[capture_user_id]": userId,
        trial_period_days: "7",
      });
    }

    const otherAccount = await trial(randomUUID());
    const otherEvent = event("customer.subscription.created", otherAccount);
    assert.equal(await deliver(otherEvent, { forged: true }), 400);
    assert.equal(await deliver(otherEvent, { modified: true }), 400);
    assert.equal(await deliver(otherEvent, { age: 360 }), 400);
    assert.equal(await deliver({ ...otherEvent, livemode: true }), 400);
    assert.equal((await billing()).stripe_revision, 0);
    assert.equal(await deliver(otherEvent), 200);
    assert.equal((await billing()).stripe_subscription_id, null);

    const ownSubscription = await trial(owner);
    const original = event("customer.subscription.created", ownSubscription);
    assert.deepEqual(
      await Promise.all([deliver(original), deliver(original)]),
      [200, 200],
    );
    assert.deepEqual(await billing(), {
      stripe_revision: 2,
      stripe_subscription_id: ownSubscription.id,
      status: "trialing",
      plan: "free",
      cancel_at_period_end: false,
    });

    const cancelled = await stripe(
      `/subscriptions/${ownSubscription.id}`,
      "DELETE",
    );
    const latest = event(
      "customer.subscription.deleted",
      cancelled,
      original.created + 1,
    );
    const stale = event(
      "customer.subscription.updated",
      ownSubscription,
      original.created - 1,
    );
    assert.equal(await deliver(latest), 200);
    assert.equal(await deliver(stale), 200);
    assert.equal(await deliver(original), 200);
    const final = await billing();
    assert.equal(final.status, "canceled");
    assert.equal(final.plan, "free");
    assert.equal(final.stripe_subscription_id, ownSubscription.id);
    assert.equal(final.stripe_revision, 4);

    const recorded = await db
      .from("billing_events")
      .select("stripe_event_id")
      .in("stripe_event_id", ids);
    assert(!recorded.error);
    assert.equal(recorded.data.length, 4);
  },
);
