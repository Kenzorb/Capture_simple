import { randomUUID } from "node:crypto";
import { maxCaptureUrlLength } from "@capture/shared";
import type { Metadata } from "next";
import { signOut } from "../../(auth)/actions";
import { SubmitButton } from "../../(auth)/submit-button";
import { saveManualUrl } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

const captureMessages = new Map([
  ["saved", "Link saved to your library."],
  ["duplicate", "This link is already in your library."],
  ["invalid", "Enter an HTTP or HTTPS URL with a public domain."],
  ["conflict", "This form was already submitted. Try saving again."],
  ["unavailable", "Could not save this link. Try again."],
]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; capture?: string }>;
}) {
  const { error, capture } = await searchParams;
  const message = capture && captureMessages.get(capture);
  const saved = capture === "saved" || capture === "duplicate";
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Your library</h1>
        <form action={signOut}>
          <button type="submit" className="font-semibold underline">
            Sign out
          </button>
        </form>
      </header>
      {error === "sign-out" && (
        <p role="alert" className="mt-4 text-red-800">
          Sign-out failed. Try again.
        </p>
      )}
      <section className="mt-8 max-w-2xl rounded-xl border border-emerald-950/15 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Save a link</h2>
        <form action={saveManualUrl} className="mt-4">
          <input type="hidden" name="request_id" value={randomUUID()} />
          <label className="block font-medium" htmlFor="capture-url">
            Article URL
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border border-emerald-950/30 px-3 py-2"
              id="capture-url"
              name="url"
              type="url"
              placeholder="https://example.com/article"
              autoComplete="url"
              maxLength={maxCaptureUrlLength}
              required
            />
            <SubmitButton label="Save link" />
          </div>
        </form>
        {message && (
          <p
            role={saved ? "status" : "alert"}
            className={saved ? "mt-4 text-emerald-900" : "mt-4 text-red-800"}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
