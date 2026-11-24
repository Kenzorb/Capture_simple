import { expect, test, vi } from "vitest";
import { getRequestSession } from "../lib/supabase/request-session";

const { getClaims, getAuthenticatedSession } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));
vi.mock("../lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    url: "https://capture.example",
    publishableKey: "fixture",
  }),
}));
vi.mock("../lib/supabase/server", () => ({ getAuthenticatedSession }));

test("an expired authenticated bearer never becomes a Capture session", async () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: "https://capture.example/auth/v1",
    aud: "authenticated",
    role: "authenticated",
    sub: "1b50b744-94b1-4733-b225-e379685c5410",
    session_id: "9d9a5e38-741f-4b20-98ca-64792b2ba3a6",
  };
  const request = new Request("http://127.0.0.1/api/usage", {
    headers: { Authorization: "Bearer fixture" },
  });
  getClaims.mockResolvedValue({
    data: { claims: { ...claims, exp: now - 1 } },
  });
  await expect(getRequestSession(request)).resolves.toBeNull();
  expect(getAuthenticatedSession).not.toHaveBeenCalled();

  getClaims.mockResolvedValue({
    data: { claims: { ...claims, exp: now + 600 } },
  });
  getAuthenticatedSession.mockResolvedValue({ user: { id: claims.sub } });
  await expect(getRequestSession(request)).resolves.toEqual({
    user: { id: claims.sub },
  });
  expect(getAuthenticatedSession).toHaveBeenCalledExactlyOnceWith("fixture");
});
