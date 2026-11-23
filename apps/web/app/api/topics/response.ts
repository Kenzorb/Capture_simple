import { topicSchema, type ApiError } from "@capture/shared";
import { readCaptureJson } from "../../../lib/capture-request";

export const topicHeaders = { "Cache-Control": "private, no-store" };

export function topicError(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
) {
  return Response.json({ error: { code, message } } satisfies ApiError, {
    status,
    headers: topicHeaders,
  });
}

export async function topicBody(request: Request) {
  const input = await readCaptureJson(request);
  if (input.status === "too_large")
    return topicError(
      413,
      "payload_too_large",
      "Topic details exceed the size limit.",
    );
  if (input.status !== "ok")
    return topicError(400, "invalid_input", "Send the topic details as JSON.");
  return input.data;
}

export function topicMutation(
  { data, error }: { data: unknown; error: { code: string } | null },
  status: number,
) {
  switch (error?.code) {
    case "42501":
      return topicError(401, "unauthenticated", "Sign in to manage topics.");
    case "23503":
      return topicError(404, "not_found", "Parent topic not found.");
    case "23505":
      return topicError(
        409,
        "conflict",
        "A topic with this name already exists under the selected parent.",
      );
    case "PT409":
      return topicError(
        409,
        "conflict",
        "Move child topics before deleting their parent.",
      );
    case "22023":
    case "22P02":
    case "22P05":
    case "23514":
      return topicError(
        400,
        "invalid_input",
        "Invalid topic name, fields, or hierarchy.",
      );
  }
  if (error)
    return topicError(
      503,
      "unavailable",
      "Could not update this topic. Try again.",
    );
  if (data === null) return topicError(404, "not_found", "Topic not found.");
  if (status === 204)
    return new Response(null, { status, headers: topicHeaders });
  const topic = topicSchema.safeParse(data);
  if (!topic.success)
    return topicError(503, "unavailable", "Could not load the updated topic.");
  return Response.json(
    { topic: topic.data },
    { status, headers: topicHeaders },
  );
}
