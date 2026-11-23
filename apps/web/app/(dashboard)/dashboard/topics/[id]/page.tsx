import { structuredNoteSchema, topicParamsSchema } from "@capture/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  decodeArticleCursor,
  encodeArticleCursor,
  listOwnTopicArticles,
} from "../../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";
import { readOwnTopicTree } from "../../../../../lib/supabase/topics";
import { SubmitButton } from "../../../../(auth)/submit-button";
import { DashboardHeading } from "../../../dashboard-focus";
import { TopicOptions } from "../../../topic-options";
import { CaptureTime, CaptureTitle } from "../../capture-presentation";
import { saveTopic } from "./actions";

export const metadata: Metadata = { title: "Topic" };
const pageSize = 20;
const conceptLimit = 12;
const link =
  "rounded font-semibold text-emerald-950 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-emerald-800";
const input =
  "w-full rounded-lg border border-[#b8c8bd] bg-white px-3 py-2 text-sm";
const topicFeedback = new Map([
  ["saved", "Topic saved."],
  ["duplicate", "That parent already has a topic with this name."],
  [
    "invalid-topic",
    "Choose a valid name and parent. Topics can be up to four levels deep.",
  ],
  ["failed", "Could not save this topic. Try again."],
]);

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    cursor?: string | string[];
    change?: string | string[];
  }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const target = topicParamsSchema.safeParse(await params);
  if (!target.success) notFound();
  const id = target.data.id;
  const path = `/dashboard/topics/${id}`;
  const { cursor: encoded, change } = await searchParams;
  const feedback =
    typeof change === "string" ? topicFeedback.get(change) : undefined;
  const cursor =
    typeof encoded === "string" ? decodeArticleCursor(encoded) : null;
  if (encoded !== undefined && !cursor) redirect(path);

  const [tree, sources] = await Promise.all([
    readOwnTopicTree(session),
    listOwnTopicArticles(session, id, pageSize, cursor),
  ]);
  const topic = tree?.topics.find((item) => item.id === id);
  if (tree && !topic) notFound();

  const articles = sources.data?.slice(0, pageSize) ?? [];
  const nextCursor =
    sources.data && sources.data.length > pageSize
      ? encodeArticleCursor(articles[articles.length - 1])
      : null;
  const parent = tree?.topics.find((item) => item.id === topic?.parent_id);
  const children = topic
    ? tree?.topics.filter((item) => item.parent_id === topic.id)
    : undefined;
  const concepts = new Map<string, { name: string; count: number }>();
  for (const article of articles) {
    const note = structuredNoteSchema.safeParse(
      article.article_ai_notes[0]?.payload,
    );
    if (!note.success) continue;
    const seen = new Set<string>();
    for (const concept of note.data.concepts) {
      const name = concept.name.trim();
      const key = name.normalize("NFKC").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = concepts.get(key);
      if (entry) entry.count++;
      else concepts.set(key, { name, count: 1 });
    }
  }
  const labels = [...concepts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, conceptLimit);

  return (
    <>
      <nav
        aria-label="Topic location"
        className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#506458]"
      >
        <Link href="/dashboard/knowledge-tree" className={link}>
          Knowledge Tree
        </Link>
        {parent && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/dashboard/topics/${parent.id}`} className={link}>
              {parent.name}
            </Link>
          </>
        )}
      </nav>
      <DashboardHeading
        view={`${path}|${encoded ?? ""}`}
        className="break-words text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {topic?.name ?? "Topic"}
      </DashboardHeading>
      {feedback && (
        <p
          role={change === "saved" ? "status" : "alert"}
          className={
            change === "saved" ? "mt-3 text-emerald-900" : "mt-3 text-red-800"
          }
        >
          {feedback}
        </p>
      )}
      {!topic || !tree ? (
        <p role="status" className="mt-5 text-[#506458]">
          Could not load this topic. Refresh this page to try again.
        </p>
      ) : (
        <>
          {topic.description && (
            <p className="mt-3 max-w-2xl break-words whitespace-pre-wrap text-[#506458]">
              {topic.description}
            </p>
          )}
          <details
            className="mt-4"
            open={Boolean(feedback && change !== "saved")}
          >
            <summary className="w-fit cursor-pointer rounded font-semibold text-emerald-950">
              Edit topic
            </summary>
            <form
              action={saveTopic.bind(null, topic.id)}
              className="mt-3 grid max-w-lg gap-2"
            >
              <label htmlFor="topic-name" className="text-sm font-medium">
                Topic name
              </label>
              <input
                id="topic-name"
                name="name"
                className={input}
                required
                maxLength={120}
                defaultValue={topic.name}
              />
              <label htmlFor="topic-parent" className="text-sm font-medium">
                Parent topic
              </label>
              <select
                id="topic-parent"
                name="parent"
                className={input}
                defaultValue={topic.parent_id ?? ""}
              >
                <option value="">Top level</option>
                <TopicOptions topics={tree.topics} exclude={topic.id} />
              </select>
              <div className="mt-1">
                <SubmitButton label="Save topic" />
              </div>
            </form>
          </details>
          {children && children.length > 0 && (
            <section aria-labelledby="subtopics" className="mt-7">
              <h2 id="subtopics" className="text-lg font-semibold">
                Subtopics
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="min-w-0 max-w-full rounded-lg border border-[#dde5dd] bg-white px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/dashboard/topics/${child.id}`}
                      className={`${link} break-words`}
                    >
                      {child.name}
                    </Link>
                    <span
                      className="ml-2 text-[#506458]"
                      aria-label={`${child.article_count} active captures`}
                    >
                      {child.article_count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {labels.length > 0 && (
            <section aria-labelledby="concepts" className="mt-7">
              <h2 id="concepts" className="text-lg font-semibold">
                Concepts in these captures
              </h2>
              <ul
                aria-label="Concept labels"
                className="mt-2 flex flex-wrap gap-2"
              >
                {labels.map(({ name }) => (
                  <li
                    key={name}
                    className="max-w-full rounded-md bg-[#e8efe9] px-2 py-1 text-sm break-words text-[#284535]"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="topic-captures" className="mt-7">
            <h2 id="topic-captures" className="text-lg font-semibold">
              Captures in {topic.name}
            </h2>
            {sources.error ? (
              <p role="status" className="mt-2 text-[#506458]">
                Could not load captures. Refresh this page to try again.
              </p>
            ) : articles.length ? (
              <ul className="mt-2 divide-y divide-[#dde5dd] rounded-xl border border-[#dde5dd] bg-white">
                {articles.map((article) => (
                  <li
                    key={article.id}
                    className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <CaptureTitle id={article.id} title={article.title} />
                      <p className="mt-1 text-sm break-words text-[#506458]">
                        {article.domain} <span aria-hidden="true">·</span>{" "}
                        <CaptureTime value={article.captured_at} dateOnly />
                      </p>
                    </div>
                    <span className="rounded-md bg-[#e8efe9] px-2 py-1 text-xs font-semibold text-[#284535]">
                      {article.article_topics[0].is_primary
                        ? "Primary topic"
                        : "Secondary topic"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[#506458]">
                {cursor
                  ? "No more captures in this topic."
                  : "No active captures are assigned directly to this topic."}
              </p>
            )}
            {(cursor || nextCursor) && (
              <nav
                aria-label="Topic capture pages"
                className="mt-4 flex gap-4 text-sm"
              >
                {cursor && (
                  <Link href={path} className={link}>
                    First page
                  </Link>
                )}
                {nextCursor && (
                  <Link href={`${path}?cursor=${nextCursor}`} className={link}>
                    Next page
                  </Link>
                )}
              </nav>
            )}
          </section>
        </>
      )}
    </>
  );
}
