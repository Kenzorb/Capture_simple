import { randomUUID } from "node:crypto";
import { maxCaptureUrlLength } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOwnOverview } from "../../../lib/supabase/overview";
import { getAuthenticatedSession } from "../../../lib/supabase/server";
import { SubmitButton } from "../../(auth)/submit-button";
import { saveManualUrl } from "./actions";
import { CaptureSourceTitle, CaptureStatus } from "./capture-presentation";

export const metadata: Metadata = { title: "Dashboard" };

const captureMessages = new Map([
  ["saved", "Link saved to your library."],
  ["duplicate", "This link is already in your library."],
  ["invalid", "Enter an HTTP or HTTPS URL with a public domain."],
  ["too-large", "This URL is too long to save."],
  [
    "rate-limited",
    "You’ve saved links too quickly. Wait a minute and try again.",
  ],
  ["conflict", "This form was already submitted. Try saving again."],
  ["unavailable", "Could not save this link. Try again."],
]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; capture?: string }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const [{ error, capture }, { recent, counts }] = await Promise.all([
    searchParams,
    readOwnOverview(session),
  ]);
  const message = capture && captureMessages.get(capture);
  const saved = capture === "saved" || capture === "duplicate";
  const empty =
    recent?.length === 0 && counts.every(({ count }) => count === 0);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Your library
      </h1>
      {error === "sign-out" && (
        <p role="alert" className="mt-4 text-red-800">
          Sign-out failed. Try again.
        </p>
      )}
      {!empty && (
        <dl
          aria-label="Capture status counts"
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {counts.map(({ label, count }) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-[#dde5dd] bg-white px-3 py-3 sm:px-4"
            >
              <dt className="text-sm text-[#506458]">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {count ?? <span aria-label="Unavailable">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <section
        id="save-link"
        className="mt-8 max-w-2xl rounded-xl border border-emerald-950/15 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-semibold">Save a link</h2>
        {empty && (
          <p className="mt-2 text-sm text-[#506458]">
            Save your first article to start your library.
          </p>
        )}
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
      <section aria-labelledby="recent-captures" className="mt-8 max-w-3xl">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="recent-captures" className="text-xl font-semibold">
            Recent captures
          </h2>
          {recent && recent.length > 0 && (
            <Link
              href="/dashboard/captures"
              className="text-sm font-semibold text-emerald-950 underline"
            >
              View all captures
            </Link>
          )}
        </header>
        {recent === null ? (
          <p role="alert" className="mt-3 text-red-800">
            Could not load recent captures. Refresh to try again.
          </p>
        ) : recent.length === 0 ? (
          <p className="mt-3 text-[#506458]">No active captures yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#dde5dd] rounded-xl border border-[#dde5dd] bg-white">
            {recent.map((article) => (
              <li
                key={article.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1 break-words">
                  <CaptureSourceTitle url={article.url} title={article.title} />
                  <p className="mt-1 text-sm text-[#506458]">
                    {article.domain}
                  </p>
                </div>
                <CaptureStatus status={article.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
