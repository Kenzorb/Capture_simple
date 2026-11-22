export function emailVerificationToken(
  link: string,
  supabaseUrl: string,
  type: "signup" | "recovery",
) {
  if (!URL.canParse(link) || !URL.canParse(supabaseUrl)) return null;
  const allowed = new URL("/auth/v1/verify", supabaseUrl);
  const supplied = new URL(link);
  if (
    supplied.origin !== allowed.origin ||
    supplied.pathname !== allowed.pathname ||
    supplied.username ||
    supplied.password ||
    supplied.searchParams.get("type") !== type
  ) {
    return null;
  }
  const token = supplied.searchParams.get("token");
  return token && /^(?:pkce_)?[A-Za-z0-9_-]{32,256}$/.test(token)
    ? token
    : null;
}
