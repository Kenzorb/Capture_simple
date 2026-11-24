import { serve } from "inngest/next";
import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

test("hosted Inngest requires a signed callback even with the development flag set", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("INNGEST_DEV", "1");
  vi.stubEnv("INNGEST_SIGNING_KEY", "signkey-prod-fixture");
  const { inngest, inngestDev } = await import("../lib/inngest/client");
  expect(inngestDev).toBe(false);

  const { POST } = serve({ client: inngest, functions: [] });
  const response = await POST(
    new NextRequest("https://capture.example/api/inngest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    undefined,
  );
  expect(response.status).toBe(401);
});
