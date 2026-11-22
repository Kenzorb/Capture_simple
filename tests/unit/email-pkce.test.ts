import { createHash } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { handleEmailCallback } from "../../apps/web/lib/supabase/email-callback";
import { createServerSupabaseClient } from "../../apps/web/lib/supabase/server";

const { browserCookies } = vi.hoisted(() => ({
  browserCookies: new Map<string, string>(),
}));

vi.mock("../../apps/web/node_modules/server-only/index.js", () => ({}));
vi.mock("../../apps/web/node_modules/next/headers.js", () => ({
  cookies: async () => ({
    getAll: () =>
      Array.from(browserCookies, ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options: { maxAge?: number }) => {
      if (options.maxAge === 0) browserCookies.delete(name);
      else browserCookies.set(name, value);
    },
  }),
}));

afterEach(() => {
  browserCookies.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("recovery exchanges its own verifier after a later signup in the same browser", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://capture-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-key");
  const challenges = new Map<string, string>();
  const callbacks = new Map<string, URL>();
  let exchangedVerifier: string | undefined;

  vi.stubGlobal("fetch", async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const body = JSON.parse(String(init.body));
    if (url.pathname.endsWith("/token")) {
      exchangedVerifier = body.code_verifier;
      // The test exercises the outgoing exchange, without minting a session.
      return Response.json({ code: "fixture_stop" }, { status: 400 });
    }
    callbacks.set(url.pathname, new URL(url.searchParams.get("redirect_to")!));
    challenges.set(url.pathname, body.code_challenge);
    return Response.json({});
  });

  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Missing test Supabase configuration");
  await client.auth.resetPasswordForEmail("first@example.test", {
    redirectTo: "http://127.0.0.1:3000/auth/recovery",
  });
  await client.auth.signUp({
    email: "second@example.test",
    password: "fixture-password",
    options: { emailRedirectTo: "http://127.0.0.1:3000/auth/confirm" },
  });

  const recovery = callbacks.get("/auth/v1/recover")!;
  const signup = callbacks.get("/auth/v1/signup")!;
  expect(recovery.searchParams.get("sb_flow_id")).toBeTruthy();
  expect(recovery.searchParams.get("sb_flow_id")).not.toBe(
    signup.searchParams.get("sb_flow_id"),
  );

  const savedCookies = new Map(browserCookies);
  await client.auth.exchangeCodeForSession("fixture-recovery-code");
  expect(
    createHash("sha256").update(exchangedVerifier!).digest("base64url"),
  ).toBe(challenges.get("/auth/v1/signup"));
  browserCookies.clear();
  for (const [name, value] of savedCookies) browserCookies.set(name, value);

  recovery.searchParams.set("code", "fixture-recovery-code");
  await handleEmailCallback(new Request(recovery), "recovery");

  expect(exchangedVerifier).toBeTruthy();
  const challenge = createHash("sha256")
    .update(exchangedVerifier!)
    .digest("base64url");
  expect(challenge).toBe(challenges.get("/auth/v1/recover"));
  expect(challenge).not.toBe(challenges.get("/auth/v1/signup"));
});
