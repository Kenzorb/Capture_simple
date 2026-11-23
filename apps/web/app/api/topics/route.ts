import { topicCreateSchema } from "@capture/shared";
import { getRequestSession } from "../../../lib/supabase/request-session";
import { readOwnTopicTree } from "../../../lib/supabase/topics";
import { topicBody, topicError, topicHeaders, topicMutation } from "./response";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return topicError(401, "unauthenticated", "Sign in to view topics.");
  const tree = await readOwnTopicTree(session);
  if (!tree)
    return topicError(503, "unavailable", "Could not load topics. Try again.");
  return Response.json(tree, { headers: topicHeaders });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return topicError(401, "unauthenticated", "Sign in to manage topics.");
  const body = await topicBody(request);
  if (body instanceof Response) return body;
  const topic = topicCreateSchema.safeParse(body);
  if (!topic.success)
    return topicError(400, "invalid_input", "Enter valid topic details.");
  return topicMutation(
    await session.supabase.rpc("capture_mutate_topic", {
      p_operation: "create",
      p_fields: topic.data,
    }),
    201,
  );
}
