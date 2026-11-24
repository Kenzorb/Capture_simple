import {
  getStripeSandboxConfig,
  stripePost,
} from "../../../../lib/billing/stripe";
import { createPrivilegedSupabaseClient } from "../../../../lib/supabase/admin";
import { getRequestSession } from "../../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../../articles/response";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(401, "unauthenticated", "Sign in to manage billing.");

  const config = getStripeSandboxConfig();
  const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  if (!config || !configuration || !/^bpc_[A-Za-z0-9]+$/.test(configuration))
    return portalUnavailable();

  const origin = request.headers.get("origin");
  if (origin !== null && origin !== config.origin)
    return articleError(403, "forbidden", "Open billing from Capture.");
  if (!(await hasEmptyBody(request)))
    return articleError(
      400,
      "invalid_input",
      "Open billing without request details.",
    );

  try {
    const db = createPrivilegedSupabaseClient();
    const billing = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (billing.error) return portalUnavailable();
    const customer = billing.data?.stripe_customer_id;
    if (!customer)
      return articleError(
        409,
        "conflict",
        "This account has no billing profile yet.",
      );

    const returnUrl = `${config.origin}/dashboard/settings`;
    const portal = await stripePost(config.key, "/billing_portal/sessions", {
      customer,
      configuration,
      return_url: returnUrl,
    });
    const url = URL.parse(portal.url ?? "");
    if (
      !portal.id?.startsWith("bps_") ||
      portal.customer !== customer ||
      portal.configuration !== configuration ||
      portal.return_url !== returnUrl ||
      url?.origin !== "https://billing.stripe.com" ||
      url.username ||
      url.password
    )
      return portalUnavailable();
    return Response.json(
      { url: url.href },
      { headers: articleResponseHeaders },
    );
  } catch {
    return portalUnavailable();
  }
}

function portalUnavailable() {
  return articleError(
    503,
    "unavailable",
    "Could not open the billing portal. Try again.",
  );
}

async function hasEmptyBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return true;
  try {
    const first = await reader.read();
    if (first.done) return true;
    void reader.cancel().catch(() => {});
    return false;
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
}
