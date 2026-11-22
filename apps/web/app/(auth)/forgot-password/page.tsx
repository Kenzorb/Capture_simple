import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { SubmitButton } from "../submit-button";

const messages = new Map([
  ["invalid", "Enter a valid email address."],
  ["unavailable", "Password reset is temporarily unavailable."],
  ["session", "Verify a new password reset email to continue."],
  [
    "callback",
    "The reset link could not finish signing you in. Request a new reset email and verify it in Capture.",
  ],
]);

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const message = error && messages.get(error);
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link className="font-semibold hover:underline" href="/sign-in">
        Back to sign-in
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">
        Reset password
      </h1>
      {message && (
        <p role="alert" className="mt-4 text-red-800">
          {message}
        </p>
      )}
      {notice === "sent" ? (
        <div className="mt-4 space-y-4">
          <p role="status">
            Check your inbox for a reset email. If it has a link, copy it
            without opening it. If no email arrives, check spam and wait before
            trying again.
          </p>
          <Link
            className="font-semibold underline"
            href="/verify-email?flow=recovery"
          >
            Verify your reset email
          </Link>
        </div>
      ) : (
        <form action={requestPasswordReset} className="mt-8 space-y-4">
          <div>
            <label className="block font-medium" htmlFor="email">
              Email
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-emerald-950/30 bg-white px-3 py-2"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>
          <SubmitButton label="Send reset email" />
        </form>
      )}
    </main>
  );
}
