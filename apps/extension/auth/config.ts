import type { ExtensionAuthConfig } from "./oauth";

function readOrigin(value: string | undefined, allowLoopback: boolean) {
  const url = value && URL.parse(value);
  if (
    !url ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    return null;
  return url.protocol === "https:" ||
    (allowLoopback && url.protocol === "http:" && url.hostname === "127.0.0.1")
    ? url.origin
    : null;
}

export function extensionAuthConfig(): ExtensionAuthConfig | null {
  const web = readOrigin(import.meta.env.WXT_CAPTURE_WEB_ORIGIN, true);
  const auth = readOrigin(import.meta.env.WXT_CAPTURE_SUPABASE_ORIGIN, false);
  const clientId = import.meta.env.WXT_CAPTURE_CLIENT_ID;
  const extensionId = import.meta.env.WXT_CAPTURE_EXTENSION_ID;
  if (
    !web ||
    !auth ||
    !clientId ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientId) ||
    !extensionId ||
    !/^[a-p]{32}$/.test(extensionId)
  )
    return null;
  const redirectUri = `https://${extensionId}.chromiumapp.org/capture-auth`;
  return { web, auth, clientId, extensionId, redirectUri };
}
