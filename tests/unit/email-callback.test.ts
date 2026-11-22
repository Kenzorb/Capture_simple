import { beforeEach, expect, test, vi } from "vitest";
import { handleEmailCallback } from "../../apps/web/lib/supabase/email-callback";

const { exchange } = vi.hoisted(() => ({ exchange: vi.fn() }));

vi.mock("../../apps/web/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { exchangeCodeForSession: exchange },
  }),
}));

const origin = "http://127.0.0.1:3000";

beforeEach(() => exchange.mockReset());

test("signup sends the verified session to the dashboard", async () => {
  exchange.mockResolvedValue({ data: {}, error: null });
  const response = await handleEmailCallback(
    new Request(origin + "/auth/confirm?code=fixture-code"),
  );
  expect(exchange).toHaveBeenCalledWith("fixture-code", undefined);
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/dashboard");
});

test("recovery sends the verified session to the password form", async () => {
  exchange.mockResolvedValue({ data: {}, error: null });
  const response = await handleEmailCallback(
    new Request(
      origin + "/auth/recovery?code=fixture-code&sb_flow_id=fixture-flow",
    ),
    "recovery",
  );
  expect(exchange).toHaveBeenCalledWith("fixture-code", {
    flowId: "fixture-flow",
  });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/reset-password");
});

test("recovery requires a successful code exchange", async () => {
  exchange.mockResolvedValue({ data: {}, error: { code: "invalid_grant" } });
  const response = await handleEmailCallback(
    new Request(origin + "/auth/recovery?code=fixture-code"),
    "recovery",
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "/forgot-password?error=callback#",
  );
});
