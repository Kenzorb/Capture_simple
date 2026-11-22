import { articleListQuerySchema } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  decodeArticleCursor,
  encodeArticleCursor,
  listOwnArticles,
} from "../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";
import { CaptureSourceTitle } from "../capture-presentation";

export const metadata: Metadata = { title: "All captures" };

export default async function CapturesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; cursor?: string | string[] }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");

  const { q, cursor: encodedCursor } = await searchParams;
  const parsed = articleListQuerySchema.safeParse({
    q: typeof q === "string" ? q.trim() || undefined : q,
    cursor: encodedCursor,
  });
  if (!parsed.success) redirect("/dashboard/captures");
  const { data: query } = parsed;
  const cursor = query.cursor ? decodeArticleCursor(query.cursor) : null;
  if (query.cursor && !cursor) redirect("/dashboard/captures");

  const { data, error } = await listOwnArticles(session, query, cursor);
  const articles = data?.slice(0, query.limit) ?? [];
  const nextParams = new URLSearchParams();
  if (query.q) nextParams.set("q", query.q);
  if (data && data.length > query.limit) {
    nextParams.set("cursor", encodeArticleCursor(articles[query.limit - 1]));
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        All captures
      </h1>
      {query.q && (
        <p className="mt-2 break-words text-[#506458]">
          Results for <strong>{query.q}</strong>{" "}
          <Link
            href="/dashboard/captures"
            className="ml-1 font-semibold text-emerald-950 underline"
          >
            Clear search
          </Link>
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-6 text-red-800">
          Could not load your captures. Refresh to try again.
        </p>
      ) : articles.length === 0 ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-[#dde5dd] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            {query.q
              ? "No matching captures"
              : cursor
                ? "No more captures"
                : "No captures yet"}
          </h2>
          <Link
            className="mt-3 inline-block font-semibold text-emerald-950 underline"
            href={
              query.q || cursor ? "/dashboard/captures" : "/dashboard#save-link"
            }
          >
            {query.q || cursor ? "Browse all captures" : "Save a link"}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 max-w-3xl divide-y divide-[#dde5dd] rounded-xl border border-[#dde5dd] bg-white">
          {articles.map((article) => (
            <li
              key={article.id}
              className="px-4 py-3 break-words sm:px-5 sm:py-4"
            >
              <CaptureSourceTitle url={article.url} title={article.title} />
              <p className="mt-1 text-sm text-[#506458]">{article.domain}</p>
            </li>
          ))}
        </ul>
      )}
      {nextParams.has("cursor") && (
        <Link
          href={`/dashboard/captures?${nextParams}`}
          className="mt-4 inline-block rounded-lg border border-[#b8c8bd] bg-white px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-50"
        >
          Next page
        </Link>
      )}
    </>
  );
}
