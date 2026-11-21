import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Your library</h1>
    </main>
  );
}
