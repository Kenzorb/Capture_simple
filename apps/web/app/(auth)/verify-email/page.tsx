import Link from "next/link";
import { verifyEmail } from "../actions";
import { SubmitButton } from "../submit-button";

const messages = new Map([
  [
    "invalid",
    "Enter your email address and code, or paste the full link from your newest email.",
  ],
  ["unavailable", "Email verification is temporarily unavailable."],
  [
    "code",
    "That code or link is invalid, expired, or already used. Check your newest email.",
  ],
]);

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; error?: string }>;
}) {
  const { flow, error } = await searchParams;
  const recovery = flow === "recovery";
  const verify = verifyEmail.bind(null, recovery ? "recovery" : "signup");
  const message = error && messages.get(error);
  const inputStyle =
    "mt-1 w-full rounded-lg border border-emerald-950/30 bg-white px-3 py-2";

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link className="font-semibold hover:underline" href="/sign-in">
        Back to sign-in
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">
        {recovery ? "Verify your reset email" : "Confirm your email"}
      </h1>
      {message && (
        <p role="alert" className="mt-4 text-red-800">
          {message}
        </p>
      )}
      <p className="mt-4" id="verification-help">
        Enter your email address and code. If your email contains a link, copy
        the link address without opening it and paste it here.
      </p>
      <form action={verify} className="mt-8 space-y-4">
        <div>
          <label className="block font-medium" htmlFor="email">
            Email
          </label>
          <input
            className={inputStyle}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
        </div>
        <div>
          <label className="block font-medium" htmlFor="verification">
            Email code or link
          </label>
          <input
            className={inputStyle}
            id="verification"
            name="verification"
            autoComplete="one-time-code"
            maxLength={2048}
            aria-describedby="verification-help"
            required
          />
        </div>
        <SubmitButton label="Continue" />
      </form>
      {recovery && (
        <Link className="mt-6 inline-block underline" href="/forgot-password">
          Request a new reset email
        </Link>
      )}
    </main>
  );
}
