import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOwnProfile, readOwnUsage } from "../../../../lib/supabase/account";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";
import { SubmitButton } from "../../../(auth)/submit-button";
import { DashboardHeading } from "../../dashboard-focus";
import { saveDisplayName } from "./actions";

export const metadata: Metadata = { title: "Settings" };
const card = "mt-6 rounded-xl border border-[#dde5dd] bg-white p-4 sm:p-5";
const link =
  "w-fit rounded font-semibold text-emerald-950 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800";
const date = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "UTC",
});
const profileMessages = new Map([
  ["saved", "Profile saved."],
  ["invalid", "Enter a display name of up to 80 characters."],
  ["failed", "Could not save your profile. Try again."],
]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string | string[] }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const [{ data: usage }, { data: profile }, params] = await Promise.all([
    readOwnUsage(session),
    readOwnProfile(session),
    searchParams,
  ]);
  const status = typeof params.profile === "string" ? params.profile : "";
  const feedback = profileMessages.get(status);
  const stats = usage
    ? [
        ["Plan", usage.plan === "pro" ? "Pro" : "Free"],
        ["Used", usage.used],
        ["Reserved", usage.reserved],
        ["Monthly limit", usage.article_limit],
      ]
    : [];

  return (
    <div className="max-w-3xl">
      <DashboardHeading
        view="/dashboard/settings"
        className="text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Settings
      </DashboardHeading>
      <section id="usage" aria-labelledby="usage-heading" className={card}>
        <h2 id="usage-heading" className="text-lg font-semibold">
          Analysis usage
        </h2>
        {usage ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([name, value]) => (
                <div key={name} className="rounded-lg bg-[#f7f9f5] p-3">
                  <dt className="text-sm text-[#506458]">{name}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-[#506458]">
              Next reset{" "}
              <time dateTime={usage.next_reset}>
                {date.format(new Date(usage.next_reset))} at 00:00 UTC
              </time>
            </p>
            <p className="mt-2 text-sm text-[#506458]">
              Up to {usage.manual_retry_limit} manual retries per failed
              capture.
            </p>
          </>
        ) : (
          <p role="alert" className="mt-2 text-sm text-red-800">
            Could not load usage. Refresh to try again.
          </p>
        )}
      </section>
      <section aria-labelledby="profile-heading" className={card}>
        <h2 id="profile-heading" className="text-lg font-semibold">
          Profile
        </h2>
        {session.user.email && (
          <p className="mt-2 break-all text-sm text-[#506458]">
            {session.user.email}
          </p>
        )}
        {feedback && (
          <p
            role={status === "saved" ? "status" : "alert"}
            className={
              status === "saved"
                ? "mt-2 text-sm text-emerald-900"
                : "mt-2 text-sm text-red-800"
            }
          >
            {feedback}
          </p>
        )}
        {profile ? (
          <form action={saveDisplayName} className="mt-3 grid max-w-md gap-2">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="display-name"
              name="display_name"
              autoComplete="nickname"
              defaultValue={profile.display_name ?? ""}
              maxLength={80}
              className="rounded-lg border border-[#b8c8bd] px-3 py-2 text-sm"
            />
            <div className="mt-1">
              <SubmitButton label="Save profile" />
            </div>
          </form>
        ) : (
          <p role="alert" className="mt-2 text-sm text-red-800">
            Could not load the profile. Refresh to try again.
          </p>
        )}
      </section>
      <section aria-labelledby="privacy-heading" className={card}>
        <h2 id="privacy-heading" className="text-lg font-semibold">
          Privacy and data
        </h2>
        <ul className="mt-3 grid gap-3 text-sm">
          <li>
            <Link href="/oauth/extension-access" className={link}>
              Manage extension access
            </Link>
          </li>
          <li>
            <Link href="/dashboard/captures" className={link}>
              Review or delete saved captures
            </Link>
          </li>
          <li>
            <a href="/api/export?format=json" className={link}>
              Download library (JSON)
            </a>
          </li>
          <li>
            <a href="/api/export?format=markdown" className={link}>
              Download library (Markdown)
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
