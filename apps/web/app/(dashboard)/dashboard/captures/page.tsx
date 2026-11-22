import { articleListQuerySchema } from "@capture/shared";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  decodeArticleCursor,
  encodeArticleCursor,
  listOwnArticles,
} from "../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";
import {
  CaptureStatus,
  CaptureTime,
  CaptureTitle,
  statusLabels,
} from "../capture-presentation";

export const metadata: Metadata = { title: "All captures" };

const libraryPath = "/dashboard/captures";
const controlClass =
  "w-full rounded-lg border border-[#b8c8bd] bg-white px-3 py-2 font-normal";

export default async function CapturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");

  const {
    q,
    cursor: encodedCursor,
    status,
    domain,
    archived,
    sort,
    capture,
  } = await searchParams;
  const parsed = articleListQuerySchema.safeParse({
    q: typeof q === "string" ? q.trim() || undefined : q,
    cursor: encodedCursor,
    status: status === "" ? undefined : status,
    domain: typeof domain === "string" ? domain.trim() || undefined : domain,
    archived,
    sort,
  });
  if (!parsed.success) redirect(libraryPath);
  const { data: query } = parsed;
  const cursor = query.cursor ? decodeArticleCursor(query.cursor) : null;
  if (query.cursor && !cursor) redirect(libraryPath);

  const { data, error } = await listOwnArticles(session, query, cursor);
  const articles = data?.slice(0, query.limit) ?? [];
  const filters = new URLSearchParams();
  if (query.q) filters.set("q", query.q);
  if (query.status) filters.set("status", query.status);
  if (query.domain) filters.set("domain", query.domain);
  if (query.archived) filters.set("archived", "true");
  if (query.sort === "captured_asc") filters.set("sort", query.sort);
  const firstPage = filters.size ? `${libraryPath}?${filters}` : libraryPath;
  const hasNextPage = data !== null && data.length > query.limit;
  if (hasNextPage) {
    filters.set("cursor", encodeArticleCursor(articles[query.limit - 1]));
  }
  const isFiltered = Boolean(query.q || query.domain || query.status);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        All captures
      </h1>
      {capture === "deleted" && (
        <p role="status" className="mt-3 text-emerald-900">
          Capture deleted.
        </p>
      )}
      {query.q && (
        <p className="mt-2 break-words text-[#506458]">
          Results for <strong>{query.q}</strong>
        </p>
      )}
      <Form
        key={firstPage}
        action={libraryPath}
        aria-label="Capture filters"
        className="mt-6 grid max-w-3xl grid-cols-1 gap-3 rounded-xl border border-[#dde5dd] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {query.q && <input type="hidden" name="q" value={query.q} />}
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className={controlClass}
          >
            <option value="">Any status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Source domain
          <input
            name="domain"
            defaultValue={query.domain}
            maxLength={253}
            placeholder="example.com"
            className={controlClass}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Collection
          <select
            name="archived"
            defaultValue={query.archived ? "true" : "false"}
            className={controlClass}
          >
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Sort by
          <select
            name="sort"
            defaultValue={query.sort}
            className={controlClass}
          >
            <option value="captured_desc">Newest first</option>
            <option value="captured_asc">Oldest first</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            Apply filters
          </button>
          {firstPage !== libraryPath && (
            <Link
              href={libraryPath}
              className="text-sm font-semibold text-emerald-950 underline"
            >
              Reset filters
            </Link>
          )}
        </div>
      </Form>
      {error ? (
        <p role="alert" className="mt-6 text-red-800">
          Could not load your captures. Refresh to try again.
        </p>
      ) : articles.length === 0 ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-[#dde5dd] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            {cursor
              ? "No more captures"
              : isFiltered
                ? "No matching captures"
                : query.archived
                  ? "No archived captures"
                  : "No captures yet"}
          </h2>
          {!cursor && !isFiltered && !query.archived && (
            <Link
              className="mt-3 inline-block font-semibold text-emerald-950 underline"
              href="/dashboard#save-link"
            >
              Save a link
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 max-w-3xl divide-y divide-[#dde5dd] rounded-xl border border-[#dde5dd] bg-white">
          {articles.map((article) => (
            <li
              key={article.id}
              className="px-4 py-3 break-words sm:px-5 sm:py-4"
            >
              <CaptureTitle id={article.id} title={article.title} />
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#506458]">
                <span>{article.domain}</span>
                <CaptureTime value={article.captured_at} />
                <CaptureStatus status={article.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {(cursor || hasNextPage) && (
        <nav aria-label="Capture pages" className="mt-4 flex flex-wrap gap-3">
          {cursor && (
            <Link
              href={firstPage}
              className="px-4 py-2 font-semibold text-emerald-950 underline"
            >
              First page
            </Link>
          )}
          {hasNextPage && (
            <Link
              href={`${libraryPath}?${filters}`}
              className="rounded-lg border border-[#b8c8bd] bg-white px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-50"
            >
              Next page
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
