import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canStartCheckout } from "../../../../lib/billing/plans";
import {
  getStripePortalConfigurationId,
  getStripeSandboxConfig,
  readSandboxPrices,
} from "../../../../lib/billing/stripe";
import {
  readOwnBillingStatus,
  readOwnProfile,
  readOwnUsage,
} from "../../../../lib/supabase/account";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";
import { SubmitButton } from "../../../(auth)/submit-button";
import { DashboardHeading } from "../../dashboard-focus";
import { deleteOwnAccount, saveDisplayName } from "./actions";
import { BillingActions } from "./billing-actions";

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
const billingStatuses = new Map([
  ["active", "Active"],
  ["trialing", "Trial"],
  ["past_due", "Payment past due"],
  ["unpaid", "Payment unpaid"],
  ["paused", "Paused"],
  ["incomplete", "Payment pending"],
  ["incomplete_expired", "Payment expired"],
  ["canceled", "Canceled"],
]);
const deletionMessages = new Map([
  [
    "confirmation",
    "Enter DELETE and your password to confirm account deletion.",
  ],
  ["password", "Your password could not be verified. Try again."],
  [
    "billing",
    "End your subscription in Manage billing before deleting your account.",
  ],
  ["unavailable", "Could not delete your account. Try again."],
]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    profile?: string | string[];
    checkout?: string | string[];
    deletion?: string | string[];
  }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const [{ data: usage }, { data: profile }, billing, params] =
    await Promise.all([
      readOwnUsage(session),
      readOwnProfile(session),
      readOwnBillingStatus(session),
      searchParams,
    ]);
  const status = typeof params.profile === "string" ? params.profile : "";
  const feedback = profileMessages.get(status);
  const deletionFeedback =
    typeof params.deletion === "string"
      ? deletionMessages.get(params.deletion)
      : undefined;
  const stats = usage
    ? [
        ["Used", usage.used],
        ["Reserved", usage.reserved],
        ["Monthly limit", usage.article_limit],
      ]
    : [];
  const subscription = billing.data;
  const stripe = getStripeSandboxConfig();
  const canUpgrade =
    usage?.plan === "free" &&
    !billing.error &&
    canStartCheckout(subscription?.status ?? null);
  const prices = canUpgrade && stripe ? await readSandboxPrices(stripe) : null;
  const showPortal = Boolean(
    stripe && subscription?.status && getStripePortalConfigurationId(),
  );
  const currentTermEnd =
    usage?.plan === "pro" ? subscription?.period_end : null;

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
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      <section id="billing" aria-labelledby="billing-heading" className={card}>
        <h2 id="billing-heading" className="text-lg font-semibold">
          Billing
        </h2>
        {usage && (
          <p className="mt-2 text-sm">
            Current plan{" "}
            <strong>{usage.plan === "pro" ? "Pro" : "Free"}</strong>
          </p>
        )}
        {billing.error || !usage ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            Could not load billing. Refresh to try again.
          </p>
        ) : subscription?.status ? (
          <p className="mt-2 text-sm text-[#506458]">
            {billingStatuses.get(subscription.status) ??
              "Subscription status unavailable"}
            {currentTermEnd && subscription.cancel_at_period_end && (
              <>
                {" "}
                until{" "}
                <time dateTime={currentTermEnd}>
                  {date.format(new Date(currentTermEnd))}
                </time>
                . Cancellation scheduled.
              </>
            )}
          </p>
        ) : null}
        {params.checkout === "success" && usage?.plan !== "pro" && (
          <p role="status" className="mt-2 text-sm text-[#506458]">
            Your plan updates after Stripe confirms the subscription.
          </p>
        )}
        {params.checkout === "cancelled" && (
          <p role="status" className="mt-2 text-sm text-[#506458]">
            Checkout canceled. You can start again here.
          </p>
        )}
        {(prices || showPortal) && (
          <p className="mt-3 text-sm text-[#506458]">
            {prices && "Pro includes 300 analyses per month. "}Stripe sandbox.
          </p>
        )}
        {canUpgrade && !prices && (
          <p className="mt-2 text-sm text-[#506458]">
            Paid billing is currently unavailable.
          </p>
        )}
        {prices || showPortal ? (
          <BillingActions prices={prices} showPortal={showPortal} />
        ) : null}
        {stripe && subscription?.status && !showPortal && (
          <p className="mt-2 text-sm text-[#506458]">
            The billing portal is currently unavailable.
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
      <section id="privacy" aria-labelledby="privacy-heading" className={card}>
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
        {deletionFeedback && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {deletionFeedback}
          </p>
        )}
        <details className="mt-4">
          <summary className="w-fit cursor-pointer rounded font-semibold text-red-800 focus-visible:outline-2">
            Delete account
          </summary>
          <p className="mt-2 text-sm text-[#506458]">
            Download your library first if you want to keep a copy. Deletion
            permanently removes your account and library from Capture.
          </p>
          <form
            action={deleteOwnAccount}
            className="mt-3 grid max-w-sm justify-items-start gap-2 text-sm"
          >
            <label htmlFor="account-delete-password">Current password</label>
            <input
              id="account-delete-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#b8c8bd] px-3 py-2"
              required
            />
            <label htmlFor="account-delete-confirmation">
              Type DELETE to confirm
            </label>
            <input
              id="account-delete-confirmation"
              name="confirmation"
              autoComplete="off"
              maxLength={6}
              className="w-full rounded-lg border border-[#b8c8bd] px-3 py-2"
              required
            />
            <SubmitButton label="Delete account permanently" />
          </form>
        </details>
      </section>
    </div>
  );
}
