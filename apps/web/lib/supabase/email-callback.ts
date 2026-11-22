import { createServerSupabaseClient } from "./server";

export async function handleEmailCallback(
  request: Request,
  flow: "signup" | "recovery" = "signup",
) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const flowId = params.get("sb_flow_id");
  const errorCode = params.get("error_code");
  const supabase =
    code && !errorCode ? await createServerSupabaseClient() : null;
  if (supabase && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) {
      // Older reset emails use the signup callback and rely on the SDK's PKCE flow type.
      const legacyRecovery =
        "redirectType" in data && data.redirectType === "recovery";
      return new Response(null, {
        status: 303,
        headers: {
          Location:
            flow === "recovery" || legacyRecovery
              ? "/reset-password"
              : "/dashboard",
        },
      });
    }
  }

  const location =
    flow === "recovery"
      ? "/forgot-password?error=callback"
      : errorCode === "otp_expired"
        ? "/sign-in?error=confirmation-expired"
        : "/sign-in?error=confirmation";

  return new Response(null, {
    status: 303,
    headers: { Location: `${location}#` },
  });
}
