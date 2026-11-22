import { expect, test } from "vitest";
import { emailVerificationToken } from "../../apps/web/lib/supabase/email-verification-link";

const project = "https://capture-test.supabase.co";
const token = "pkce_" + "a".repeat(56);
const link = `${project}/auth/v1/verify?type=recovery&token=${token}`;

test("extracts the token from a verification link for the configured flow", () => {
  expect(emailVerificationToken(link, project, "recovery")).toBe(token);
});

test("rejects other projects, routes, and verification flows", () => {
  expect(
    emailVerificationToken(
      link.replace("capture-test", "other"),
      project,
      "recovery",
    ),
  ).toBeNull();
  expect(
    emailVerificationToken(
      link.replace("/verify", "/recover"),
      project,
      "recovery",
    ),
  ).toBeNull();
  expect(emailVerificationToken(link, project, "signup")).toBeNull();
});
