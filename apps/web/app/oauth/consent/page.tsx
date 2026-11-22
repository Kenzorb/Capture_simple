import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getExtensionConfig,
  parseAuthorizationId,
  validOAuthRedirect,
} from "../../../lib/extension-config";
import { getAuthenticatedSession } from "../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Connect Capture",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string | string[] }>;
}) {
  const config = getExtensionConfig();
  const id = parseAuthorizationId((await searchParams).authorization_id);
  const session = config && id ? await getAuthenticatedSession() : null;
  if (config && id && !session) redirect(`/sign-in?authorization_id=${id}`);
  const authorization =
    config && id && session
      ? (await session.supabase.auth.oauth.getAuthorizationDetails(id)).data
      : null;
  if (
    config &&
    authorization &&
    !("client" in authorization) &&
    validOAuthRedirect(authorization.redirect_url, config.redirectUri)
  ) {
    redirect(authorization.redirect_url);
  }
  const canApprove =
    config &&
    id &&
    authorization &&
    "client" in authorization &&
    authorization.client.id === config.clientId &&
    authorization.redirect_uri === config.redirectUri &&
    authorization.scope === "email";
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-3xl font-semibold">Connect Capture</h1>
      {canApprove ? (
        <>
          <p className="mt-4">
            Allow the Capture extension to identify your account and save links
            to your library.
          </p>
          {session?.user.email && (
            <p className="mt-2 break-all text-sm">
              Signed in as {session.user.email}
            </p>
          )}
          <form
            action="/oauth/consent/decision"
            method="post"
            className="mt-6 flex flex-wrap gap-3"
          >
            <input type="hidden" name="authorization_id" value={id} />
            <button
              name="decision"
              value="approve"
              className="rounded-lg bg-emerald-950 px-4 py-2 font-semibold text-white"
            >
              Connect extension
            </button>
            <button
              name="decision"
              value="deny"
              className="rounded-lg border border-emerald-950 px-4 py-2 font-semibold"
            >
              Cancel
            </button>
          </form>
        </>
      ) : (
        <>
          <p role="alert" className="mt-4">
            This connection request is unavailable. Start again from the Capture
            extension.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block underline">
            Back to your library
          </Link>
        </>
      )}
    </main>
  );
}
