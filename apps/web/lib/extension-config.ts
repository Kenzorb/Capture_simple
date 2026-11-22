export function parseUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function parseAuthorizationId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value)
    ? value
    : null;
}

export function getExtensionConfig() {
  const clientId = parseUuid(process.env.CAPTURE_EXTENSION_CLIENT_ID);
  const id = process.env.CAPTURE_EXTENSION_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !id || !/^[a-p]{32}$/.test(id) || !appUrl) return null;

  const url = URL.parse(appUrl);
  if (
    !url ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && url.hostname === "127.0.0.1"))
  )
    return null;
  return {
    clientId,
    origin: `chrome-extension://${id}`,
    redirectUri: `https://${id}.chromiumapp.org/capture-auth`,
    webOrigin: url.origin,
  };
}

export function consentPath(id: string) {
  return `/oauth/consent?${new URLSearchParams({ authorization_id: id })}`;
}

export function validOAuthRedirect(value: string, expected: string) {
  return !value.includes("#") && value.split("?", 1)[0] === expected;
}

export function isSameOriginSubmission(request: Request, expected: string) {
  const origin = request.headers.get("origin");
  if (origin === expected) return true;
  // Browsers may send a null Origin for a form under the no-referrer policy.
  const destination = new URL(expected);
  const url = new URL(request.url);
  const protocol =
    request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  return (
    (origin === null || origin === "null") &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    `${protocol}:` === destination.protocol &&
    (request.headers.get("host") === destination.host ||
      url.host === destination.host)
  );
}
