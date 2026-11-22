import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    auth: { experimental: { appendPkceFlowIdToRedirects: true } },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components have a read-only cookie store. Proxy refreshes their session.
        }
      },
    },
  });
}

export async function getAuthenticatedSession(accessToken?: string) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const supabase = accessToken
    ? createClient<Database>(config.url, config.publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    : await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function getAuthenticatedUser() {
  return (await getAuthenticatedSession())?.user ?? null;
}
