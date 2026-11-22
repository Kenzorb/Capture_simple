import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getExtensionConfig, parseUuid } from "../extension-config";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function bearerToken(request: Request) {
  return request.headers
    .get("authorization")
    ?.match(/^Bearer ([^\s,]+)$/i)?.[1];
}

export async function verifyBearer(token: string) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const supabase = createClient<Database>(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data) return null;
  const { claims } = data;
  if (
    claims.iss !== new URL("/auth/v1", config.url).href ||
    claims.aud !== "authenticated" ||
    claims.role !== "authenticated" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= Date.now() / 1000 ||
    !parseUuid(claims.sub) ||
    !parseUuid(claims.session_id)
  )
    return null;
  return { supabase, claims };
}

export async function getExtensionBearer(request: Request) {
  const token = bearerToken(request);
  const config = getExtensionConfig();
  if (!token || !config) return null;
  const verified = await verifyBearer(token);
  return verified?.claims.client_id === config.clientId ? verified : null;
}
