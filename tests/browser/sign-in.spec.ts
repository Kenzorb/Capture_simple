import { expect, test } from "@playwright/test";

test("visitors can reach sign-in and the dashboard requires it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
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
