import { getExtensionConfig } from "./extension-config";

export function isExtensionOrigin(request: Request) {
  return request.headers.get("origin") === getExtensionConfig()?.origin;
}

export function rejectUnapprovedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (isExtensionOrigin(request)) return false;
  return (
    origin !== URL.parse(process.env.NEXT_PUBLIC_APP_URL ?? request.url)?.origin
  );
}

export function extensionCors(request: Request, method: "GET" | "POST") {
  const config = getExtensionConfig();
  const headers = new Headers({ Vary: "Origin" });
  if (config && request.headers.get("origin") === config.origin) {
    headers.set("Access-Control-Allow-Origin", config.origin);
    headers.set("Access-Control-Allow-Methods", method);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  return headers;
}

export function extensionPreflight(request: Request, method: "GET" | "POST") {
  const headers = extensionCors(request, method);
  const allowed =
    headers.has("Access-Control-Allow-Origin") &&
    request.headers.get("access-control-request-method") === method;
  return new Response(null, { status: allowed ? 204 : 403, headers });
}
