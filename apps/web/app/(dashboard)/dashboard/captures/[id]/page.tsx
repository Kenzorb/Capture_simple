import { articleParamsSchema, structuredNoteSchema } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOwnArticle } from "../../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";
import { SubmitButton } from "../../../../(auth)/submit-button";
import { DashboardHeading } from "../../../dashboard-focus";
import {
  CaptureOriginalLink,
  CaptureStatus,
  CaptureTime,
} from "../../capture-presentation";
import {
  deleteCapture,
  retryCapture,
  savePersonalNote,
  setCaptureArchived,
} from "./actions";
import { AnalysisNotes } from "./analysis-notes";
import { CapturePolling } from "./capture-polling";
import { PersonalNoteField } from "./personal-note-field";

export const metadata: Metadata = { title: "Capture details" };

const feedback = new Map<string, { text: string; error?: boolean }>([
  ["note", { text: "Personal note saved." }],
  ["archived", { text: "Capture archived." }],
  ["restored", { text: "Capture restored to active captures." }],
  ["retried", { text: "Analysis queued for another attempt." }],
  [
    "retry_limit",
    { text: "This capture has reached its analysis retry limit.", error: true },
  ],
  [
    "quota_limited",
    { text: "No analysis quota is available this month.", error: true },
  ],
  [
    "invalid-note",
    { text: "Enter a note of up to 4,000 characters.", error: true },
  ],
  [
    "confirm-delete",
    { text: "Confirm permanent deletion first.", error: true },
  ],
  [
    "failed",
    { text: "Could not update this capture. Try again.", error: true },
  ],
]);

export default async function CaptureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ change?: string | string[] }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const parsed = articleParamsSchema.safeParse(await params);
  const { data: article, error } = parsed.success
    ? await readOwnArticle(session, parsed.data.id)
    : { data: null, error: null };
  const { change } = await searchParams;
  const message = typeof change === "string" ? feedback.get(change) : undefined;
  const archived = Boolean(article?.archived_at);
  const note = article?.personal_notes[0]?.body ?? "";
  const aiNote = structuredNoteSchema.safeParse(
    article?.article_ai_notes[0]?.payload,
  ).data;
  const view = `/dashboard/captures/${parsed.success ? parsed.data.id : "missing"}`;

  return (
    <>
      <Link
        href={
          archived ? "/dashboard/captures?archived=true" : "/dashboard/captures"
        }
        className="text-sm font-semibold text-emerald-950 underline underline-offset-2"
      >
        {archived ? "Back to archived captures" : "Back to all captures"}
      </Link>
      {article ? (
        <article className="mt-4 max-w-3xl rounded-xl border border-[#dde5dd] bg-white p-5 sm:p-6">
          <DashboardHeading
            view={view}
            className="text-3xl font-semibold break-words tracking-tight"
          >
            {article.title}
          </DashboardHeading>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span role="status">
              <CaptureStatus status={article.status} />
            </span>
            <CapturePolling articleId={article.id} status={article.status} />
            {archived && (
              <span className="rounded-md bg-[#edf0eb] px-2 py-1 text-xs font-semibold text-[#465349]">
                Archived
              </span>
            )}
          </div>
          {message && (
            <p
              role={message.error ? "alert" : "status"}
              className={
                message.error ? "mt-4 text-red-800" : "mt-4 text-emerald-900"
              }
            >
              {message.text}
            </p>
          )}
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <dt className="font-medium text-[#506458]">Original article</dt>
              <dd className="mt-1">
                <CaptureOriginalLink url={article.url} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-[#506458]">Source</dt>
              <dd className="mt-1 break-words">{article.domain}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#506458]">Captured</dt>
              <dd className="mt-1">
                <CaptureTime value={article.captured_at} />
              </dd>
            </div>
            {article.author && (
              <div className="min-w-0">
                <dt className="font-medium text-[#506458]">Author</dt>
                <dd className="mt-1 break-words">{article.author}</dd>
              </div>
            )}
            {article.published_at && (
              <div>
                <dt className="font-medium text-[#506458]">Published</dt>
                <dd className="mt-1">
                  <CaptureTime value={article.published_at} dateOnly />
                </dd>
              </div>
            )}
          </dl>
          <section className="mt-6 border-t border-[#dde5dd] pt-5">
            <h2 className="text-lg font-semibold">AI notes</h2>
            <AnalysisNotes note={aiNote} status={article.status} />
            {article.status === "failed" && (
              <form
                action={retryCapture.bind(null, article.id)}
                className="mt-3"
              >
                <SubmitButton label="Retry analysis" />
              </form>
            )}
          </section>
          <section className="mt-6 border-t border-[#dde5dd] pt-5">
            <h2 className="text-lg font-semibold">Personal notes</h2>
            <form
              action={savePersonalNote.bind(null, article.id)}
              className="mt-3"
            >
              <label
                htmlFor="capture-note"
                className="block text-sm font-medium"
              >
                Personal note
              </label>
              <PersonalNoteField key={note} savedNote={note} />
              <div className="mt-3">
                <SubmitButton label="Save note" />
              </div>
            </form>
          </section>
          <section className="mt-6 border-t border-[#dde5dd] pt-5">
            <h2 className="text-lg font-semibold">Manage capture</h2>
            <form
              action={setCaptureArchived.bind(null, article.id, !archived)}
              className="mt-3"
            >
              <SubmitButton
                label={archived ? "Restore capture" : "Archive capture"}
              />
            </form>
            <details className="mt-4">
              <summary className="w-fit cursor-pointer font-semibold text-red-800">
                Delete capture
              </summary>
              <form
                action={deleteCapture.bind(null, article.id)}
                className="mt-3"
              >
                <label className="flex items-start gap-2 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    name="confirm"
                    required
                  />
                  Permanently delete this capture and its personal note.
                </label>
                <div className="mt-3">
                  <SubmitButton label="Delete permanently" />
                </div>
              </form>
            </details>
          </section>
        </article>
      ) : (
        <div className="mt-4">
          <DashboardHeading
            view={view}
            className="text-3xl font-semibold tracking-tight"
          >
            {error ? "Capture details" : "Capture not found"}
          </DashboardHeading>
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
