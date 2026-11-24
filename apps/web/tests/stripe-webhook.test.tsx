import { createHmac } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { readStripeSubscription } from "../lib/billing/stripe-subscriptions";
import { readStripeEvent } from "../lib/billing/stripe-webhook";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllGlobals());

test("webhook verification uses exact bytes, v1 signatures and a fresh delivery time", async () => {
  const secret = "whsec_test_fixture";
  const body = JSON.stringify(
    {
      id: "evt_fixture",
      object: "event",
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          object: "invoice",
          customer: "cus_fixture",
          description: "Café",
        },
      },
    },
    null,
    2,
  );
  const now = Math.floor(Date.now() / 1000);
  function signed(
    timestamp: number,
    options?: { unchanged?: boolean; scheme?: string },
  ) {
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    return new Request("http://127.0.0.1/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "Stripe-Signature": `t=${timestamp},v1=${"0".repeat(64)},${options?.scheme ?? "v1"}=${digest}`,
      },
      body: options?.unchanged === false ? body.trimEnd() + "\n" : body,
    });
  }
  await expect(readStripeEvent(signed(now), secret)).resolves.toEqual({
    kind: "billing",
    id: "evt_fixture",
    type: "invoice.paid",
    customer: "cus_fixture",
  });
  await expect(
    readStripeEvent(signed(now, { unchanged: false }), secret),
  ).resolves.toBeNull();
  await expect(
    readStripeEvent(signed(now, { scheme: "v0" }), secret),
  ).resolves.toBeNull();
  await expect(readStripeEvent(signed(now - 301), secret)).resolves.toBeNull();
  await expect(readStripeEvent(signed(now + 301), secret)).resolves.toBeNull();
});

test("subscription reconciliation ignores other owners and prices across Stripe pages", async () => {
  function subscription(
    id: string,
    status: string,
    owner = "capture-owner",
    price = "price_pro",
  ) {
    return {
      id,
      status,
      customer: "cus_owner",
      livemode: false,
      created: 100,
      cancel_at_period_end: false,
      metadata: { capture_user_id: owner },
      items: {
        has_more: false,
        data: [{ price: { id: price }, current_period_end: 200 }],
      },
    };
  }
  const stripe = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        data: [
          subscription("sub_other", "active", "other-owner"),
          subscription(
            "sub_wrongPrice",
            "active",
            "capture-owner",
            "price_other",
          ),
          subscription("sub_canceled", "canceled"),
        ],
        has_more: true,
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        data: [subscription("sub_current", "trialing")],
        has_more: false,
      }),
    );
  vi.stubGlobal("fetch", stripe);
  await expect(
    readStripeSubscription(
      "sk_test_fixture",
      ["price_pro"],
      "cus_owner",
      "capture-owner",
    ),
  ).resolves.toMatchObject({
    id: "sub_current",
    status: "trialing",
    periodEnd: 200,
  });
  expect(
    new URL(stripe.mock.calls[1][0]).searchParams.get("starting_after"),
  ).toBe("sub_canceled");
});
