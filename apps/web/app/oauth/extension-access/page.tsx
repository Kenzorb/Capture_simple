import type { Metadata } from "next";
import Link from "next/link";
import { getExtensionConfig } from "../../../lib/extension-config";
import { getAuthenticatedSession } from "../../../lib/supabase/server";

export const metadata: Metadata = { title: "Manage extension access" };

export default async function ExtensionAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const { result } = await searchParams;
  const session = await getAuthenticatedSession();
  const configured = getExtensionConfig();
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-3xl font-semibold">Manage extension access</h1>
      {!configured ? (
        <p className="mt-4">
          Extension access is unavailable in this environment.
        </p>
      ) : session ? (
        <>
          {session.user.email && (
            <p className="mt-4 break-all text-sm">
              Signed in as {session.user.email}
            </p>
          )}
          {result === "revoked" ? (
            <p role="status" className="mt-4">
              Capture extension access was revoked.
            </p>
          ) : (
            <>
              <p className="mt-4">
                Revoke access to disconnect every Capture extension connected to
                this account.
              </p>
              {result === "failed" && (
                <p role="alert" className="mt-3 text-red-800">
                  Could not revoke access. Try again.
                </p>
              )}
              <form
                action="/oauth/extension-access/revoke"
                method="post"
                className="mt-6"
              >
                <button className="rounded-lg bg-emerald-950 px-4 py-2 font-semibold text-white">
                  Revoke extension access
                </button>
              </form>
            </>
          )}
        </>
      ) : (
        <p className="mt-4">
          <Link href="/sign-in?manage_extension=1" className="underline">
            Sign in to revoke extension access
          </Link>
        </p>
      )}
      <Link href="/dashboard" className="mt-4 inline-block underline">
        Back to your library
      </Link>
    </main>
  );
}
