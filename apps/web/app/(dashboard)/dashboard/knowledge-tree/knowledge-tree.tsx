"use client";

import {
  articleListResponseSchema,
  type ArticleListResponse,
  type TopicTreeResponse,
} from "@capture/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CaptureTitle } from "../capture-presentation";

type Topic = TopicTreeResponse["topics"][number];
const topicPageSize = 12;
const articlePreviewSize = 8;
const control =
  "rounded-md px-2 py-1 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800";

export function KnowledgeTree({ topics }: { topics: Topic[] }) {
  const childrenByParent = new Map<string | null, Topic[]>();
  for (const topic of topics) {
    const siblings = childrenByParent.get(topic.parent_id);
    if (siblings) siblings.push(topic);
    else childrenByParent.set(topic.parent_id, [topic]);
  }

  return <TopicList parent={null} childrenByParent={childrenByParent} />;
}

type Hierarchy = Map<string | null, Topic[]>;

function TopicList({
  parent,
  childrenByParent,
}: {
  parent: string | null;
  childrenByParent: Hierarchy;
}) {
  const [limit, setLimit] = useState(topicPageSize);
  const topics = childrenByParent.get(parent);
  if (!topics?.length) return null;

  return (
    <ul className="space-y-1">
      {topics.slice(0, limit).map((topic) => (
        <TopicBranch
          key={topic.id}
          topic={topic}
          childrenByParent={childrenByParent}
        />
      ))}
      {topics.length > limit && (
        <li>
          <button
            type="button"
            className={control}
            onClick={() => {
              // Move focus to the first newly displayed topic.
              setLimit(limit + topicPageSize);
              requestAnimationFrame(() =>
                document
                  .getElementById(`tree-toggle-${topics[limit].id}`)
                  ?.focus(),
              );
            }}
          >
            Show more topics
          </button>
        </li>
      )}
    </ul>
  );
}

function TopicBranch({
  topic,
  childrenByParent,
}: {
  topic: Topic;
  childrenByParent: Hierarchy;
}) {
  const [open, setOpen] = useState(false);
  const group = `tree-branch-${topic.id}`;
  const expandable = childrenByParent.has(topic.id) || topic.article_count > 0;
  const href = `/dashboard/topics/${topic.id}`;

  return (
    <li className="min-w-0">
      <div className="flex items-start gap-2 py-1">
        {expandable && (
          <button
            id={`tree-toggle-${topic.id}`}
            type="button"
            aria-label={`${open ? "Collapse" : "Expand"} ${topic.name}`}
            aria-expanded={open}
            aria-controls={group}
            className={`${control} w-7 shrink-0`}
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </button>
        )}
        <Link
          id={expandable ? undefined : `tree-toggle-${topic.id}`}
          href={href}
          prefetch={false}
          className="min-w-0 break-words rounded py-1 font-semibold text-emerald-950 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          {topic.name}
        </Link>
        <span
          className="ml-auto shrink-0 py-1 text-sm tabular-nums text-[#506458]"
          aria-label={`${topic.article_count} active captures`}
        >
          {topic.article_count}
        </span>
      </div>
      {expandable && (
        <div
          id={group}
          hidden={!open}
          className="mb-2 ml-2 border-l border-[#d5e3d9] pl-2 sm:ml-3 sm:pl-4"
        >
          {open && (
            <>
              <TopicList
                parent={topic.id}
                childrenByParent={childrenByParent}
              />
              {topic.article_count > 0 && (
                <ArticleLeaves topic={topic} href={href} />
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ArticleLeaves({ topic, href }: { topic: Topic; href: string }) {
  const [result, setResult] = useState<ArticleListResponse | null>();

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      topic: topic.id,
      limit: String(articlePreviewSize),
    });
    void (async () => {
      try {
        const response = await fetch(`/api/articles?${query}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load articles");
        setResult(articleListResponseSchema.parse(await response.json()));
      } catch {
        if (!controller.signal.aborted) setResult(null);
      }
    })();
    return () => controller.abort();
  }, [topic.id]);

  if (result === undefined)
    return (
      <p role="status" className="py-2 text-sm text-[#506458]">
        Loading articles…
      </p>
    );
  if (!result)
    return (
      <p role="status" className="py-2 text-sm text-[#506458]">
        Could not load articles.{" "}
        <Link href={href} className="underline">
          Open {topic.name}
        </Link>
      </p>
    );
  if (!result.articles.length)
    return <p className="py-2 text-sm text-[#506458]">No active captures.</p>;

  return (
    <ul
      aria-label={`Articles in ${topic.name}`}
      className="space-y-2 py-2 pl-2 text-sm"
    >
      {result.articles.map((article) => (
        <li key={article.id}>
          <CaptureTitle id={article.id} title={article.title} />
        </li>
      ))}
      {result.next_cursor && (
        <li>
          <Link href={href} className={control}>
            View all captures in {topic.name}
          </Link>
        </li>
      )}
    </ul>
  );
}
