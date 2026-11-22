import { getAuthenticatedSession } from "../../../lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }

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
    return Response.json(
      { error: "account_unavailable" },
      { status: 503, headers },
    );
  }

  return Response.json(
    {
      id: user.id,
      email: user.email ?? null,
      displayName: profile.data?.display_name ?? null,
      plan: subscription.data?.plan ?? "free",
    },
    { headers },
  );
}
