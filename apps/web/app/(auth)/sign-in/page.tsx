import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link className="font-semibold hover:underline" href="/">
        Capture home
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-4 text-lg text-emerald-950/80">
        Account sign-in is still being set up.
      </p>
    </main>
  );
}
