import { articleParamsSchema, structuredNoteSchema } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listOwnRelatedArticles,
  readOwnArticle,
} from "../../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";
import { readOwnTopicTree } from "../../../../../lib/supabase/topics";
import { SubmitButton } from "../../../../(auth)/submit-button";
import { DashboardHeading } from "../../../dashboard-focus";
import { TopicOptions } from "../../../topic-options";
import {
  CaptureOriginalLink,
  CaptureStatus,
  CaptureTime,
  CaptureTitle,
} from "../../capture-presentation";
import {
  deleteCapture,
  moveCaptureToTopic,
  retryCapture,
  setCaptureArchived,
} from "./actions";
import { AnalysisNotes } from "./analysis-notes";
import { CapturePolling } from "./capture-polling";
import { CaptureTextForm } from "./capture-text-form";
import { PersonalNoteField } from "./personal-note-field";

export const metadata: Metadata = { title: "Capture details" };

const resetDateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "UTC",
});

const feedback = new Map<string, { text: string; error?: boolean }>([
  ["topic", { text: "Primary topic saved." }],
  ["invalid-topic", { text: "Choose an available topic.", error: true }],
  ["archived", { text: "Capture archived." }],
  ["restored", { text: "Capture restored to active captures." }],
  ["retried", { text: "Analysis queued." }],
  [
    "retry_limit",
    { text: "This capture has reached its analysis retry limit.", error: true },
  ],
  [
    "quota_limited",
    { text: "No analysis quota is available this month.", error: true },
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
  const [tree, related] = article
    ? await Promise.all([
        readOwnTopicTree(session),
        listOwnRelatedArticles(session, article.id),
      ])
    : [null, null];
  const primaryTopic = article?.article_topics.find(
    (topic) => topic.is_primary,
  )?.topics;
  const { change } = await searchParams;
  const message = typeof change === "string" ? feedback.get(change) : undefined;
  const limited =
    article?.status === "quota_limited" || change === "quota_limited";
  const now = new Date();
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const archived = Boolean(article?.archived_at);
  const note = article?.personal_notes[0]?.body ?? null;
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
            <h2 className="text-lg font-semibold">Topics</h2>
            {primaryTopic && (
              <p className="mt-2 text-sm">
                Primary topic{" "}
                <Link
                  href={`/dashboard/topics/${primaryTopic.id}`}
                  className="font-semibold underline"
                >
                  {primaryTopic.name}
                </Link>
              </p>
            )}
            {tree?.topics.length ? (
              <form
                action={moveCaptureToTopic.bind(null, article.id)}
                className="mt-3 grid max-w-lg gap-2"
              >
                <label htmlFor="capture-topic" className="text-sm font-medium">
                  Move to topic
                </label>
                <select
                  id="capture-topic"
                  name="topic"
                  required
                  defaultValue={primaryTopic?.id ?? ""}
                  className="w-full rounded-lg border border-[#b8c8bd] bg-white px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Choose a topic
                  </option>
                  <TopicOptions topics={tree.topics} />
                </select>
                <div className="mt-1">
                  <SubmitButton label="Save primary topic" />
                </div>
              </form>
            ) : (
              <p
                role={tree ? undefined : "status"}
                className="mt-2 text-sm text-[#506458]"
              >
                {tree
                  ? "No topics available yet."
                  : "Could not load topic choices."}
              </p>
            )}
          </section>
          <section className="mt-6 border-t border-[#dde5dd] pt-5">
            <h2 className="text-lg font-semibold">AI notes</h2>
            <AnalysisNotes note={aiNote} status={article.status} />
            {(article.status === "failed" ||
              article.status === "unsupported") && (
              <CaptureTextForm articleId={article.id} />
            )}
            {limited && (
              <p className="mt-2 text-sm text-[#506458]">
                Monthly allowance resets{" "}
                <time dateTime={reset.toISOString()}>
                  {resetDateFormat.format(reset)} at 00:00 UTC
                </time>
                .{" "}
                <Link
                  href="/dashboard/settings#usage"
                  className="font-semibold underline underline-offset-2"
                >
                  View usage
                </Link>
              </p>
            )}
            {(article.status === "failed" ||
              article.status === "quota_limited") && (
              <form
                action={retryCapture.bind(null, article.id)}
                className="mt-3"
              >
                <SubmitButton
                  label={
                    article.status === "failed"
                      ? "Retry analysis"
                      : "Analyze capture"
                  }
                />
              </form>
            )}
          </section>
          {related?.data?.length ? (
            <section
              className="mt-6 border-t border-[#dde5dd] pt-5"
              aria-labelledby="related-captures"
            >
              <h2 id="related-captures" className="text-lg font-semibold">
                Related captures
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                {related.data.map((connection) => (
                  <li key={connection.id} className="min-w-0">
                    <CaptureTitle id={connection.id} title={connection.title} />
                    <p className="break-words text-[#506458]">
                      {connection.domain}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="mt-6 border-t border-[#dde5dd] pt-5">
            <h2 className="text-lg font-semibold">Personal notes</h2>
            <PersonalNoteField
              key={article.id}
              articleId={article.id}
              savedNote={note}
            />
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
