import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attemptLifetimeMs,
  callbackCode,
  exchange,
  makeAttempt,
  type ExtensionAuthConfig,
} from "../../apps/extension/auth/oauth";

const extensionId = "abcdefghijklmnopabcdefghijklmnop";
const config: ExtensionAuthConfig = {
  web: "https://capture.example",
  auth: "https://auth.example",
  clientId: "12345678-1234-4234-8234-123456789abc",
  extensionId,
  redirectUri: `https://${extensionId}.chromiumapp.org/capture-auth`,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("extension OAuth exchange", () => {
  it("keeps the verifier out of the authorize URL and accepts only the exact pending callback", async () => {
    const { url, pending } = await makeAttempt(config);
    const { searchParams } = new URL(url);
    expect(searchParams.get("code_challenge_method")).toBe("S256");
    expect(searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(searchParams.get("state")).toBe(pending.state);
    expect(pending.state).not.toBe(pending.verifier);
    expect(url).not.toContain(pending.verifier);
    const response = `${config.redirectUri}?code=temporary&state=${pending.state}`;
    expect(callbackCode(response, pending)).toBe("temporary");
    expect(
      callbackCode(`${response}&state=${pending.state}`, pending),
    ).toBeNull();
    expect(
      callbackCode(response.replace("capture-auth", "other"), pending),
    ).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(pending.createdAt + attemptLifetimeMs);
    expect(callbackCode(response, pending)).toBeNull();
  });

  it("sends refresh credentials only to the pinned endpoint and accepts rotation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "bearer",
        expires_in: 600,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await exchange(config, { refreshToken: "old-refresh" });
    expect(result).toMatchObject({
      tokens: { accessToken: "new-access", refreshToken: "new-refresh" },
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://auth.example/auth/v1/oauth/token");
    expect(options).toMatchObject({
      method: "POST",
      credentials: "omit",
      redirect: "error",
    });
    expect(options.body.get("grant_type")).toBe("refresh_token");
    expect(options.body.get("refresh_token")).toBe("old-refresh");
    expect(options.body.get("client_id")).toBe(config.clientId);
  });
});
