export type ExtensionAuthConfig = {
  web: string;
  auth: string;
  clientId: string;
  extensionId: string;
  redirectUri: string;
};

export const attemptLifetimeMs = 10 * 60 * 1000;

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function makeAttempt(config: ExtensionAuthConfig) {
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const url = new URL("/auth/v1/oauth/authorize", config.auth);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "email",
  }).toString();
  return {
    url: url.href,
    pending: {
      state,
      verifier,
      redirectUri: config.redirectUri,
      createdAt: Date.now(),
    },
  };
}

export type PendingAttempt = Awaited<ReturnType<typeof makeAttempt>>["pending"];

export function callbackCode(value: string, pending: PendingAttempt) {
  const url = URL.parse(value);
  if (
    !url ||
    url.username ||
    url.password ||
    value.includes("#") ||
    Date.now() - pending.createdAt >= attemptLifetimeMs
  )
    return null;
  const params = url.searchParams;
  const code = params.get("code");
  return value.split("?", 1)[0] === pending.redirectUri &&
    [...params].length === 2 &&
    params.get("state") === pending.state &&
    code &&
    code.length <= 2048
    ? code
    : null;
}

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function exchange(
  config: ExtensionAuthConfig,
  grant: { code: string; verifier: string } | { refreshToken: string },
): Promise<{ tokens: Tokens } | { error: "unavailable" | "reconnect" }> {
  const parameters: Record<string, string> =
    "code" in grant
      ? {
          grant_type: "authorization_code",
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          code: grant.code,
          code_verifier: grant.verifier,
        }
      : {
          grant_type: "refresh_token",
          client_id: config.clientId,
          refresh_token: grant.refreshToken,
        };
  try {
    const response = await fetch(new URL("/auth/v1/oauth/token", config.auth), {
      method: "POST",
      body: new URLSearchParams(parameters),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429 || response.status >= 500)
      return { error: "unavailable" };
    if (!response.ok) return { error: "reconnect" };
    const body = await response.json();
    const refreshToken =
      body?.refresh_token ??
      ("refreshToken" in grant ? grant.refreshToken : null);
    if (
      typeof body?.token_type !== "string" ||
      body.token_type.toLowerCase() !== "bearer" ||
      typeof body.access_token !== "string" ||
      !body.access_token ||
      typeof refreshToken !== "string" ||
      !refreshToken ||
      !Number.isSafeInteger(body.expires_in) ||
      body.expires_in <= 0 ||
      body.expires_in > 7 * 86400
    )
      return { error: "reconnect" };
    return {
      tokens: {
        accessToken: body.access_token,
        refreshToken,
        expiresAt: Date.now() + body.expires_in * 1000,
      },
    };
  } catch {
    return { error: "unavailable" };
  }
}
