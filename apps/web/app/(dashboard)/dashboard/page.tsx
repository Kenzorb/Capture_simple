import type { Metadata } from "next";
import { signOut } from "../../(auth)/actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
    </main>
  );
}
