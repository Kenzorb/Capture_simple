import { articleParamsSchema } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOwnArticle } from "../../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";
import { CaptureSourceTitle, CaptureStatus } from "../../capture-presentation";

export const metadata: Metadata = { title: "Capture details" };

export default async function CaptureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const parsed = articleParamsSchema.safeParse(await params);
  const { data: article, error } = parsed.success
    ? await readOwnArticle(session, parsed.data.id)
    : { data: null, error: null };

  return (
    <>
      <Link
        href="/dashboard/captures"
        className="text-sm font-semibold text-emerald-950 underline underline-offset-2"
      >
        Back to all captures
      </Link>
      {article ? (
        <article className="mt-4 max-w-3xl rounded-xl border border-[#dde5dd] bg-white p-5 sm:p-6">
          <h1 className="text-3xl font-semibold break-words tracking-tight">
            {article.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#506458]">
            <span>{article.domain}</span>
            <CaptureStatus status={article.status} />
          </div>
          <p className="mt-4">
            <CaptureSourceTitle
              url={article.url}
              title="Open original article"
            />
          </p>
        </article>
      ) : (
        <div className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {error ? "Capture details" : "Capture not found"}
          </h1>
          {error && (
            <p role="alert" className="mt-3 text-red-800">
              Could not load this capture. Refresh to try again.
            </p>
          )}
        </div>
      )}
    </>
  );
}
