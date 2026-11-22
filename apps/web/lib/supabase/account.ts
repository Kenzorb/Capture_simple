import "server-only";

import { getAuthenticatedSession } from "./server";

export async function readOwnAccount() {
  const session = await getAuthenticatedSession();
  if (!session) return { status: "unauthorized" } as const;

  const { supabase, user } = session;
  const [profile, subscription] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (profile.error || subscription.error) {
    return { status: "account_unavailable" } as const;
  }

  return {
    status: "ok",
    account: {
      id: user.id,
      email: user.email ?? null,
      displayName: profile.data?.display_name ?? null,
      plan: subscription.data?.plan ?? "free",
    },
  } as const;
}
