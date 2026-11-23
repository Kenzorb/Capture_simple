import { topicEditSchema, topicParamsSchema } from "@capture/shared";
import { getRequestSession } from "../../../../lib/supabase/request-session";
import { topicBody, topicError, topicMutation } from "../response";

type Context = { params: Promise<{ id: string }> };

async function topicTarget(request: Request, { params }: Context) {
  const session = await getRequestSession(request);
  if (!session)
    return topicError(401, "unauthenticated", "Sign in to manage topics.");
  const target = topicParamsSchema.safeParse(await params);
  if (!target.success)
    return topicError(400, "invalid_input", "Enter a valid topic ID.");
  return { supabase: session.supabase, id: target.data.id };
}

export async function PATCH(request: Request, context: Context) {
  const target = await topicTarget(request, context);
  if (target instanceof Response) return target;
  const body = await topicBody(request);
  if (body instanceof Response) return body;
  const fields = topicEditSchema.safeParse(body);
  if (!fields.success)
    return topicError(400, "invalid_input", "Enter valid topic changes.");
  return topicMutation(
    await target.supabase.rpc("capture_mutate_topic", {
      p_operation: "edit",
      p_topic_id: target.id,
      p_fields: fields.data,
    }),
    200,
  );
}

export async function DELETE(request: Request, context: Context) {
  const target = await topicTarget(request, context);
  if (target instanceof Response) return target;
  return topicMutation(
    await target.supabase.rpc("capture_mutate_topic", {
      p_operation: "delete",
      p_topic_id: target.id,
      p_fields: {},
    }),
    204,
  );
}
