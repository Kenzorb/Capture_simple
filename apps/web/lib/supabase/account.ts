import "server-only";

import { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;

export function readOwnProfile({ supabase, user }: Session) {
  return supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
}

export function readOwnUsage({ supabase }: Session) {
  return supabase.rpc("capture_current_usage").maybeSingle();
}

export function readOwnBillingStatus({ supabase, user }: Session) {
  return supabase
    .from("subscriptions")
    .select("status,period_end,cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
}

export async function readOwnAccount() {
  const session = await getAuthenticatedSession();
  if (!session) return { status: "unauthorized" } as const;

  const { user } = session;
  const [profile, usage] = await Promise.all([
    readOwnProfile(session),
    readOwnUsage(session),
  ]);
  if (profile.error || usage.error || !usage.data) {
    return { status: "account_unavailable" } as const;
  }

  return {
    status: "ok",
    account: {
      id: user.id,
      email: user.email ?? null,
      displayName: profile.data?.display_name ?? null,
      plan: usage.data.plan,
    },
  } as const;
}
