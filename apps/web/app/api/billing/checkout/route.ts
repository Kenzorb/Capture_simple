import {
  getStripeSandboxConfig,
  stripePost,
} from "../../../../lib/billing/stripe";
import { readCaptureJson } from "../../../../lib/capture-request";
import { createPrivilegedSupabaseClient } from "../../../../lib/supabase/admin";
import { getRequestSession } from "../../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../../articles/response";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(401, "unauthenticated", "Sign in to start Checkout.");

  const config = getStripeSandboxConfig();
  if (!config) return checkoutUnavailable();
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== config.origin) {
    return articleError(403, "forbidden", "Start Checkout from Capture.");
  }

  const body = await readCaptureJson(request);
  if (body.status === "too_large") {
    return articleError(
      413,
      "payload_too_large",
      "Checkout details exceed the size limit.",
    );
  }
  const input = body.status === "ok" ? body.data : null;
  if (
    !input ||
    typeof input !== "object" ||
    Object.keys(input).length !== 1 ||
    !("interval" in input) ||
    (input.interval !== "monthly" && input.interval !== "annual")
  ) {
    return articleError(
      400,
      "invalid_input",
      "Choose monthly or annual billing.",
    );
  }

  try {
    const db = createPrivilegedSupabaseClient();
    const userId = session.user.id;
    const readBilling = () =>
      db
        .from("subscriptions")
        .select("stripe_customer_id,plan")
        .eq("user_id", userId)
        .maybeSingle();
    const billing = await readBilling();
    if (billing.error) return checkoutUnavailable();
    if (billing.data?.plan === "pro") return alreadySubscribed();

    let customerId = billing.data?.stripe_customer_id;
    if (!customerId) {
      const { id } = await stripePost(
        config.key,
        "/customers",
        { "metadata[capture_user_id]": userId },
        `capture-customer-${userId}`,
      );
      if (!id?.startsWith("cus_")) return checkoutUnavailable();

      const saved = billing.data
        ? await db
            .from("subscriptions")
            .update({ stripe_customer_id: id })
            .eq("user_id", userId)
            .is("stripe_customer_id", null)
        : await db
            .from("subscriptions")
            .upsert(
              { user_id: userId, stripe_customer_id: id },
              { onConflict: "user_id", ignoreDuplicates: true },
            );
      if (saved.error) return checkoutUnavailable();
      const confirmed = await readBilling();
      if (confirmed.error || !confirmed.data?.stripe_customer_id)
        return checkoutUnavailable();
      if (confirmed.data.plan === "pro") return alreadySubscribed();
      customerId = confirmed.data.stripe_customer_id;
    }

    const settings = `${config.origin}/dashboard/settings`;
    const checkout = await stripePost(config.key, "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      "subscription_data[metadata][capture_user_id]": userId,
      "line_items[0][price]": config.prices[input.interval],
      "line_items[0][quantity]": "1",
      "adaptive_pricing[enabled]": "false",
      success_url: `${settings}?checkout=success`,
      cancel_url: `${settings}?checkout=cancelled`,
    });
    const url = URL.parse(checkout.url ?? "");
    if (
      !checkout.id?.startsWith("cs_test_") ||
      url?.origin !== "https://checkout.stripe.com" ||
      url.username ||
      url.password
    )
      return checkoutUnavailable();
    return Response.json(
      { url: url.href },
      { headers: articleResponseHeaders },
    );
  } catch {
    return checkoutUnavailable();
  }
}

function checkoutUnavailable() {
  return articleError(
    503,
    "unavailable",
    "Could not start Checkout. Try again.",
  );
}

function alreadySubscribed() {
  return articleError(409, "conflict", "This account already has Capture Pro.");
}
