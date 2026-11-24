import "server-only";

type Subscription = {
  id: string;
  created: number;
  customer: string;
  livemode: boolean;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  metadata: Record<string, string>;
  items: {
    has_more: boolean;
    data: { price: { id: string }; current_period_end?: number }[];
  };
};

const currentStatuses = new Set(["active", "trialing"]);

export async function readStripeSubscription(
  key: string,
  priceIds: readonly string[],
  customer: string,
  userId: string,
) {
  const query = new URLSearchParams({ customer, status: "all", limit: "100" });
  const signal = AbortSignal.timeout(10_000);
  let selected: {
    id: string;
    price: string;
    status: string;
    periodEnd: number;
    cancelAtPeriodEnd: boolean;
    created: number;
  } | null = null;

  for (;;) {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions?${query}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal,
      },
    );
    if (!response.ok) throw new Error("Stripe subscription lookup failed");
    const page: { data: Subscription[]; has_more: boolean } =
      await response.json();
    for (const subscription of page.data) {
      if (
        subscription.livemode !== false ||
        subscription.customer !== customer ||
        subscription.metadata.capture_user_id !== userId ||
        subscription.items.has_more ||
        subscription.items.data.length !== 1
      )
        continue;
      const item = subscription.items.data[0];
      if (!priceIds.includes(item.price.id)) continue;
      // Stripe's older API versions report the period on the subscription.
      const periodEnd =
        item.current_period_end ?? subscription.current_period_end;
      if (typeof periodEnd !== "number" || !Number.isSafeInteger(periodEnd))
        throw new Error("Stripe subscription period is missing");

      const candidate = {
        id: subscription.id,
        price: item.price.id,
        status: subscription.status,
        periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        created: subscription.created,
      };
      const current = currentStatuses.has(candidate.status);
      if (
        !selected ||
        (current && !currentStatuses.has(selected.status)) ||
        (current === currentStatuses.has(selected.status) &&
          (current
            ? candidate.periodEnd > selected.periodEnd
            : candidate.created > selected.created))
      )
        selected = candidate;
    }
    if (!page.has_more) return selected;
    const cursor = page.data.at(-1)?.id;
    if (!cursor || cursor === query.get("starting_after"))
      throw new Error("Stripe subscription pagination stalled");
    query.set("starting_after", cursor);
  }
}
