import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorCode = request.nextUrl.searchParams.get("error_code");
  const supabase =
    code && !errorCode ? await createServerSupabaseClient() : null;
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/dashboard" },
      });
    }
  }
  const reason =
    errorCode === "otp_expired" ? "confirmation-expired" : "confirmation";
  return new Response(null, {
    status: 303,
    headers: { Location: `/sign-in?error=${reason}#` },
  });
}
