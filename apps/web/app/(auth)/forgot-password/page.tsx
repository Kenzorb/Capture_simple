import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { SubmitButton } from "../submit-button";

const messages = new Map([
  ["invalid", "Enter a valid email address."],
  ["unavailable", "Password reset is temporarily unavailable."],
  ["session", "Open the link in a new password reset email to continue."],
  [
    "callback",
    "The reset link could not finish signing you in. Request a new reset email below.",
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
        <p role="status" className="mt-4">
          Check your inbox and open the reset link in this browser. If the email
          hasn’t arrived, check spam and wait before requesting another one.
        </p>
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
      {error === "callback" && (
        <Link
          className="mt-6 inline-block underline"
          href="/verify-email?flow=recovery"
        >
          Use a code or copied link instead
        </Link>
      )}
    </main>
  );
}
