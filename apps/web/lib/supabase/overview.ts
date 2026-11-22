import "server-only";

import type { ProcessingStatus } from "@capture/shared";
import { listOwnArticles } from "./articles";
import type { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;
const recentLimit = 5;
const groups = [
  { label: "Saved", statuses: ["saved"] },
  { label: "In progress", statuses: ["queued", "processing"] },
  { label: "Ready", statuses: ["ready"] },
  {
    label: "Needs attention",
    statuses: ["failed", "quota_limited", "unsupported"],
  },
] satisfies { label: string; statuses: ProcessingStatus[] }[];

export async function readOwnOverview(session: Session) {
  const { supabase, user } = session;
  const [recent, counts] = await Promise.all([
    listOwnArticles(
      session,
      { limit: recentLimit, sort: "captured_desc" },
      null,
    ),
    Promise.all(
      groups.map(async ({ label, statuses }) => {
        const { count, error } = await supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("archived_at", null)
          .in("status", statuses);
        return { label, count: error ? null : count };
      }),
    ),
  ]);

  return {
    recent: recent.error ? null : (recent.data?.slice(0, recentLimit) ?? null),
    counts,
  };
}
