import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthenticatedUser } from "../../lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { DashboardNavigation } from "./dashboard-navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f9f5] lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-30 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="min-w-0 bg-[#1e342b] px-4 py-4 text-white sm:flex sm:items-center sm:justify-between lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start lg:px-5 lg:py-7">
        <Link
          href="/dashboard"
          className="inline-block rounded-sm px-3 text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bce3ca]"
        >
          Capture
        </Link>
        <DashboardNavigation />
      </aside>

      <div className="min-w-0">
        <header className="border-b border-[#dde5dd] bg-white px-4 py-3 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-6xl min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <Form
              action="/dashboard/captures"
              role="search"
              className="flex min-w-0 max-w-xl items-center gap-2"
            >
              <label htmlFor="library-search" className="sr-only">
                Search saved articles
              </label>
              <input
                id="library-search"
                type="search"
                name="q"
                maxLength={200}
                placeholder="Find articles"
                className="min-w-0 flex-1 rounded-lg border border-[#b8c8bd] bg-[#f7faf7] px-3 py-2 text-sm placeholder:text-[#506458] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-800"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-800 sm:px-3"
              >
                Search
              </button>
            </Form>
            <details className="relative shrink-0">
              <summary className="cursor-pointer list-none rounded-lg border border-[#b8c8bd] px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
                Account{" "}
                <span aria-hidden="true" className="text-xs">
                  ▾
                </span>
              </summary>
              <div className="absolute top-full right-0 z-20 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-[#dde5dd] bg-white p-3 shadow-lg">
                {user.email && (
                  <p className="px-2 py-1 text-sm break-all text-[#506458]">
                    {user.email}
                  </p>
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-md px-2 py-2 text-left text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-800"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 sm:px-8 sm:py-11 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
