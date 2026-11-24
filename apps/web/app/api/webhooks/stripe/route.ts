import { getStripeSandboxConfig } from "../../../../lib/billing/stripe";
import { readStripeSubscription } from "../../../../lib/billing/stripe-subscriptions";
import { readStripeEvent } from "../../../../lib/billing/stripe-webhook";
import { createPrivilegedSupabaseClient } from "../../../../lib/supabase/admin";
import { articleError, articleResponseHeaders } from "../../articles/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const config = getStripeSandboxConfig();
  if (!secret?.startsWith("whsec_") || !config) return unavailable();
  const event = await readStripeEvent(request, secret);
  if (!event)
    return articleError(400, "invalid_input", "Invalid Stripe webhook.");
  if (event.kind === "ignored") return acknowledged();

  try {
    const db = createPrivilegedSupabaseClient();
    const recorded = await db
      .from("billing_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (recorded.error) return unavailable();
    if (recorded.data) return acknowledged();

    for (let attempt = 0; attempt < 3; attempt++) {
      const owner = await db
        .from("subscriptions")
        .select("user_id,stripe_revision")
        .eq("stripe_customer_id", event.customer)
        .maybeSingle();
      if (owner.error) return unavailable();
      if (!owner.data) return acknowledged();

      const subscription = await readStripeSubscription(
        config.key,
        Object.values(config.prices),
        event.customer,
        owner.data.user_id,
      );
      const { data, error } = await db.rpc("capture_apply_stripe_event", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_customer_id: event.customer,
        p_revision: owner.data.stripe_revision,
        p_subscription_id: subscription?.id ?? null,
        p_price_id: subscription?.price ?? null,
        p_status: subscription?.status ?? null,
        p_period_end: subscription
          ? new Date(subscription.periodEnd * 1000).toISOString()
          : null,
        p_cancel_at_period_end: subscription?.cancelAtPeriodEnd ?? false,
      });
      if (error) return unavailable();
      if (data === "applied" || data === "duplicate" || data === "unmapped")
        return acknowledged();
      if (data !== "retry") return unavailable();
      // A different delivery committed while this snapshot was in flight.
    }
  } catch {
    return unavailable();
  }
  return unavailable();
}

function acknowledged() {
  return Response.json({ received: true }, { headers: articleResponseHeaders });
}

function unavailable() {
  return articleError(
    503,
    "unavailable",
    "Stripe webhook processing is unavailable.",
  );
}
