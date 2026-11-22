import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = code ? await createServerSupabaseClient() : null;
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/dashboard" },
      });
    }
  }
  return new Response(null, {
    status: 303,
    headers: { Location: "/sign-in?error=confirmation" },
  });
}
