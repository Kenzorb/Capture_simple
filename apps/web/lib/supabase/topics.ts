import "server-only";

import { topicTreeResponseSchema } from "@capture/shared";
import type { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;

export async function readOwnTopicTree({ supabase }: Session) {
  const { data, error } = await supabase.rpc("capture_topic_tree");
  if (error) return null;
  const result = topicTreeResponseSchema.safeParse({ topics: data });
  return result.success ? result.data : null;
}
