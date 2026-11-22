import Link from "next/link";
import { signIn, signUp } from "./actions";
import { SubmitButton } from "./submit-button";

const messages = new Map([
  ["invalid", "Enter a valid email and password."],
  ["unavailable", "Account access is temporarily unavailable."],
  [
    "credentials",
    "Sign-in failed. Check your credentials and email confirmation.",
  ],
  ["failed", "We couldn’t create your account. Try again later."],
  [
    "confirmation",
    "The confirmation link could not be used. Try signing in or requesting a new account confirmation.",
  ],
  [
    "confirmation-expired",
    "This confirmation link has expired or was already used. If you already confirmed your email, sign in.",
  ],
]);

export function AuthForm({
  mode,
  error,
  notice,
}: {
  mode: "sign-in" | "sign-up";
  error?: string;
  notice?: string;
}) {
  const isSignUp = mode === "sign-up";
  const label = isSignUp ? "Create account" : "Sign in";
  const errorMessage = error ? messages.get(error) : undefined;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link className="font-semibold hover:underline" href="/">
        Capture home
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">{label}</h1>

      {errorMessage && (
        <p role="alert" className="mt-4 text-red-800">
          {errorMessage}
        </p>
      )}
      {notice === "confirm-email" && (
        <p role="status" className="mt-4 text-emerald-950/80">
          Open the confirmation link from your email in this same browser on
          this device.
        </p>
      )}

      <form action={isSignUp ? signUp : signIn} className="mt-8 space-y-4">
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
        <div>
          <label className="block font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-emerald-950/30 bg-white px-3 py-2"
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={isSignUp ? 8 : undefined}
            maxLength={72}
            required
          />
          {isSignUp && (
            <p className="mt-1 text-sm">Use at least 8 characters.</p>
          )}
        </div>
        <SubmitButton label={label} />
      </form>

      <p className="mt-6">
        <Link
          className="font-semibold underline"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in to your account" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
