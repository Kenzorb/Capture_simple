import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center justify-between border-b border-emerald-950/15 pb-5">
        <span className="text-xl font-bold tracking-tight">Capture</span>
        <Link className="font-semibold hover:underline" href="/sign-in">
          Sign in
        </Link>
      </header>
      <section className="my-auto max-w-3xl py-20">
        <h1 className="text-5xl leading-tight font-semibold tracking-tight sm:text-7xl">
          Capture what you learn.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-emerald-950/80">
          Save useful articles from the web and revisit them through structured
          notes and a personal knowledge tree.
        </p>
      </section>
    </main>
  );
}
