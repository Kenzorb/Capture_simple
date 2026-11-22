import { expect, test } from "@playwright/test";

test("visitors can reach sign-in and the dashboard requires it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  for (const route of ["/dashboard", "/dashboard/captures?q=example"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  }
});

test("an expired confirmation link redirects to sign-in with recovery guidance", async ({
  page,
}) => {
  await page.goto(
    "/auth/confirm?error=access_denied&error_code=otp_expired#error=access_denied",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "If you already confirmed your email, sign in.",
  );
  const url = new URL(page.url());
  expect(url.pathname).toBe("/sign-in");
  expect(url.searchParams.get("error")).toBe("confirmation-expired");
  expect(url.hash).toBe("");
});

test("the account API rejects direct signed-out requests", async ({
  request,
}) => {
  const response = await request.get("/api/me");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ error: "unauthorized" });
});

test("the capture API rejects a signed-out save", async ({ request }) => {
  const response = await request.post("/api/captures", { data: {} });
  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({
    error: { code: "unauthenticated" },
  });
});

test("password recovery is discoverable and requires a session to set a password", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("button", { name: "Send reset email" }),
  ).toBeVisible();

  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=session$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Open the link in a new password reset email",
  );
});

test("an expired recovery link returns to the reset request form", async ({
  page,
}) => {
  await page.goto(
    "/auth/recovery?error=access_denied&error_code=otp_expired#error=access_denied",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Request a new reset email below",
  );
  const url = new URL(page.url());
  expect(url.pathname).toBe("/forgot-password");
  expect(url.searchParams.get("error")).toBe("callback");
  expect(url.hash).toBe("");
  await page
    .getByRole("link", { name: "Use a code or copied link instead" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your reset email" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email code or link")).toBeVisible();
});

test("signup provides an email verification form", async ({ page }) => {
  await page.goto("/sign-in?notice=confirm-email");
  await page
    .getByRole("link", { name: "verify your confirmation email" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirm your email" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email code or link")).toBeVisible();
});

test("reset email confirmation directs users to their inbox without an extra step", async ({
  page,
}) => {
  await page.goto("/forgot-password?notice=sent");
  await expect(page.getByRole("status")).toContainText(
    "Check your inbox and open the reset link in this browser.",
  );
  await expect(
    page.locator('main a[href="/verify-email?flow=recovery"]'),
  ).toHaveCount(0);
});
