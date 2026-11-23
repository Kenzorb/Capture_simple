"use client";

import {
  topicTreeResponseSchema,
  type TopicTreeResponse,
} from "@capture/shared";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const refreshInterval = 10_000;
const libraryPath = "/dashboard/captures";
type Topic = TopicTreeResponse["topics"][number];

export function TopicNavigation({
  owner,
  initialTree,
}: {
  owner: string;
  initialTree: TopicTreeResponse | null;
}) {
  const [updatedTree, setUpdatedTree] = useState<TopicTreeResponse>();
  const [expanded, setExpanded] = useState<string[]>([]);
  const storageKey = `capture.topic-navigation.${owner}`;
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = pathname === libraryPath ? search?.get("topic") : null;

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(
          localStorage.getItem(storageKey) ?? "[]",
        );
        if (Array.isArray(saved)) {
          setExpanded(
            saved.filter((id): id is string => typeof id === "string"),
          );
        }
      } catch {
        // Topics remain navigable when storage is unavailable.
      }
    }, 0);
    const controller = new AbortController();
    let timer: number;
    async function refresh() {
      try {
        if (document.visibilityState === "visible") {
          const response = await fetch("/api/topics", {
            signal: controller.signal,
          });
          if (response.status === 401) {
            setUpdatedTree({ topics: [] });
            return;
          }
          if (response.ok) {
            const tree = topicTreeResponseSchema.safeParse(
              await response.json(),
            );
            if (tree.success) setUpdatedTree(tree.data);
          }
        }
      } catch {
        // Keep the last successful hierarchy and retry on the next interval.
      }
      if (!controller.signal.aborted)
        timer = window.setTimeout(refresh, refreshInterval);
    }
    timer = window.setTimeout(refresh, refreshInterval);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(restore);
    };
  }, [storageKey]);

  function toggle(id: string) {
    const next = expanded.includes(id)
      ? expanded.filter((entry) => entry !== id)
      : [...expanded, id];
    setExpanded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The current view still reflects the user's choice.
    }
  }

  const tree = updatedTree ?? initialTree;
  const childrenByParent = new Map<string | null, Topic[]>();
  for (const topic of tree?.topics ?? []) {
    const siblings = childrenByParent.get(topic.parent_id);
    if (siblings) siblings.push(topic);
    else childrenByParent.set(topic.parent_id, [topic]);
  }

  function renderTopics(parent: string | null) {
    return (
      <ul className={parent ? "ml-2.5 border-l border-white/20 pl-1.5" : ""}>
        {childrenByParent.get(parent)?.map((topic) => {
          const hasChildren = childrenByParent.has(topic.id);
          const open = expanded.includes(topic.id);
          return (
            <li key={topic.id}>
              <div className="flex min-w-0 items-start gap-1">
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={`${open ? "Collapse" : "Expand"} ${topic.name}`}
                    aria-expanded={open}
                    onClick={() => toggle(topic.id)}
                    className="w-6 shrink-0 rounded py-1.5 text-[#dcecdf] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#bce3ca]"
                  >
                    <span aria-hidden="true">{open ? "−" : "+"}</span>
                  </button>
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                <Link
                  href={`${libraryPath}?topic=${topic.id}`}
                  prefetch={false}
                  aria-current={selected === topic.id ? "page" : undefined}
                  className="flex min-w-0 flex-1 items-start justify-between gap-1 rounded-md px-1.5 py-1.5 text-sm text-[#e2eee5] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#bce3ca] aria-[current=page]:bg-[#dcecdf] aria-[current=page]:font-semibold aria-[current=page]:text-[#172e24]"
                >
                  <span className="min-w-0 break-words">{topic.name}</span>
                  <span
                    aria-label={`${topic.article_count} active captures`}
                    className="shrink-0 tabular-nums"
                  >
                    {topic.article_count}
                  </span>
                </Link>
              </div>
              {hasChildren && open && renderTopics(topic.id)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav aria-label="Topics" className="mt-5 border-t border-white/20 pt-3">
      <h2 className="mb-1 px-3 text-sm font-semibold text-white">Topics</h2>
      {!tree ? (
        <p role="status" className="px-3 text-sm text-[#dcecdf]">
          Could not load topics. Retrying…
        </p>
      ) : tree.topics.length === 0 ? (
        <p className="px-3 text-sm text-[#dcecdf]">No topics yet.</p>
      ) : (
        renderTopics(null)
      )}
    </nav>
  );
}
