import "server-only";

export function getStripeSandboxConfig() {
  const key = process.env.STRIPE_SECRET_KEY;
  const monthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const annual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const appUrl = URL.parse(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (
    !key?.startsWith("sk_test_") ||
    !monthly?.startsWith("price_") ||
    !annual?.startsWith("price_") ||
    monthly === annual ||
    !appUrl ||
    appUrl.username ||
    appUrl.password ||
    (appUrl.protocol !== "https:" &&
      !(
        appUrl.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(appUrl.hostname)
      ))
  ) {
    return null;
  }
  return { key, prices: { monthly, annual }, origin: appUrl.origin };
}

export function getStripePortalConfigurationId() {
  const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  return configuration && /^bpc_[A-Za-z0-9]+$/.test(configuration)
    ? configuration
    : null;
}

export async function readSandboxPrices(
  config: NonNullable<ReturnType<typeof getStripeSandboxConfig>>,
) {
  const signal = AbortSignal.timeout(5_000);
  try {
    const [monthly, annual] = await Promise.all([
      readSandboxPrice(config.key, config.prices.monthly, "month", signal),
      readSandboxPrice(config.key, config.prices.annual, "year", signal),
    ]);
    return monthly && annual ? { monthly, annual } : null;
  } catch {
    return null;
  }
}

async function readSandboxPrice(
  key: string,
  id: string,
  interval: "month" | "year",
  signal: AbortSignal,
) {
  const response = await fetch(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) return null;
  const price = await response.json();
  if (
    price.id !== id ||
    price.livemode !== false ||
    price.active !== true ||
    price.currency !== "usd" ||
    price.billing_scheme !== "per_unit" ||
    typeof price.unit_amount !== "number" ||
    !Number.isSafeInteger(price.unit_amount) ||
    price.unit_amount <= 0 ||
    price.recurring?.interval !== interval ||
    price.recurring.interval_count !== 1
  )
    return null;
  return price.unit_amount;
}

export async function stripePost(
  key: string,
  path: "/customers" | "/checkout/sessions" | "/billing_portal/sessions",
  fields: Record<string, string>,
  idempotencyKey?: string,
) {
  const headers = new Headers({ Authorization: `Bearer ${key}` });
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Stripe rejected ${path}: ${response.status}`);
  const result: {
    id?: string;
    url?: string;
    livemode?: boolean;
    customer?: string;
    configuration?: string;
    return_url?: string;
  } = await response.json();
  if (result.livemode !== false)
    throw new Error("Expected a Stripe sandbox object");
  return result;
}
