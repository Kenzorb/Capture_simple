import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consentPath,
  getExtensionConfig,
  isSameOriginSubmission,
  parseAuthorizationId,
  validOAuthRedirect,
} from "../../apps/web/lib/extension-config";
import {
  extensionPreflight,
  rejectUnapprovedOrigin,
} from "../../apps/web/lib/extension-cors";

const extensionId = "abcdefghijklmnopabcdefghijklmnop";
const clientId = "12345678-1234-4234-8234-123456789abc";
const origin = `chrome-extension://${extensionId}`;
const callback = `https://${extensionId}.chromiumapp.org/capture-auth`;
const endpoint = "https://capture.example/api/me";

function configure() {
  vi.stubEnv("CAPTURE_EXTENSION_ID", extensionId);
  vi.stubEnv("CAPTURE_EXTENSION_CLIENT_ID", clientId);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://capture.example");
}

afterEach(() => vi.unstubAllEnvs());

describe("extension auth configuration", () => {
  it("pins the Chrome origin and exact callback from the deployment ID", () => {
    configure();
    expect(getExtensionConfig()).toMatchObject({
      clientId,
      origin,
      redirectUri: callback,
    });
    expect(
      validOAuthRedirect(`${callback}?code=temporary&state=example`, callback),
    ).toBe(true);
    expect(validOAuthRedirect(`${callback}/?code=temporary`, callback)).toBe(
      false,
    );
    expect(
      validOAuthRedirect(`${callback}?code=temporary#fragment`, callback),
    ).toBe(false);
  });

  it("accepts only one bounded consent ID for the fixed sign-in return", () => {
    const authorizationId = "abcdefghijklmnopqrstuvwxyz012345";
    expect(parseAuthorizationId(authorizationId)).toBe(authorizationId);
    expect(consentPath(authorizationId)).toBe(
      `/oauth/consent?authorization_id=${authorizationId}`,
    );
    expect(parseAuthorizationId([authorizationId, authorizationId])).toBeNull();
    expect(parseAuthorizationId("/dashboard")).toBeNull();
  });

  it("allows only the registered extension and intended method in preflight", () => {
    configure();
    const request = (sender: string, method = "GET") =>
      new Request(endpoint, {
        method: "OPTIONS",
        headers: { Origin: sender, "Access-Control-Request-Method": method },
      });
    const approved = extensionPreflight(request(origin), "GET");
    expect(approved.status).toBe(204);
    expect(approved.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(approved.headers.has("Access-Control-Allow-Credentials")).toBe(
      false,
    );
    expect(approved.headers.get("Vary")).toBe("Origin");
    expect(extensionPreflight(request(origin, "DELETE"), "GET").status).toBe(
      403,
    );
    expect(
      extensionPreflight(request("https://other.example"), "GET").status,
    ).toBe(403);
    expect(rejectUnapprovedOrigin(request("https://other.example"))).toBe(true);
  });

  it("allows a same-origin no-referrer form while declining cross-origin consent", () => {
    const request = (origin: string, site: string) =>
      new Request("https://capture.example/oauth/consent/decision", {
        method: "POST",
        headers: { origin, "sec-fetch-site": site },
      });
    expect(
      isSameOriginSubmission(
        request("null", "same-origin"),
        "https://capture.example",
      ),
    ).toBe(true);
    expect(
      isSameOriginSubmission(
        request("null", "cross-site"),
        "https://capture.example",
      ),
    ).toBe(false);
    expect(
      isSameOriginSubmission(
        request("https://other.example", "same-origin"),
        "https://capture.example",
      ),
    ).toBe(false);
  });
});
