import {
  canonicalizeCaptureUrl,
  captureRequestSchema,
  type ApiError,
  type CaptureResponse,
} from "@capture/shared";
import { getAuthenticatedSession } from "../../../lib/supabase/server";

function captureError(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
  requestId?: string,
) {
  return Response.json(
    { error: { code, message, request_id: requestId } } satisfies ApiError,
    { status },
  );
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([^\s,]+)$/i)?.[1];
  const session =
    authorization !== null && !token
      ? null
      : await getAuthenticatedSession(token);
  if (!session)
    return captureError(401, "unauthenticated", "Sign in to save a capture.");

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0];
  if (mediaType?.trim().toLowerCase() !== "application/json") {
    return captureError(400, "invalid_input", "Send the capture as JSON.");
  }

  const parsed = captureRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return captureError(400, "invalid_input", "Enter valid capture details.");
  const capture = parsed.data;
  const target = canonicalizeCaptureUrl(capture.url);
  if (!target) {
    return captureError(
      400,
      "invalid_input",
      "Enter a valid HTTP or HTTPS URL.",
      capture.request_id,
    );
  }

  const { data, error } = await session.supabase
    .rpc("capture_save_article", {
      p_request_id: capture.request_id,
      p_url: target.url,
      p_canonical_url: target.canonicalUrl,
      p_domain: target.domain,
      p_title: capture.title ?? target.domain,
      p_source: capture.source,
      p_extracted_text: capture.extracted_text,
      p_personal_note: capture.personal_note,
    })
    .single();
  if (error?.code === "23505") {
    return captureError(
      409,
      "conflict",
      "This request ID was used for another URL.",
      capture.request_id,
    );
  }
  if (error?.code === "22023") {
    return captureError(
      400,
      "invalid_input",
      "Enter valid capture details.",
      capture.request_id,
    );
  }
  if (error?.code === "42501") {
    return captureError(401, "unauthenticated", "Sign in to save a capture.");
  }
  if (error || !data) {
    return captureError(
      503,
      "unavailable",
      "Capture could not save this article. Try again.",
      capture.request_id,
    );
  }

  return Response.json(
    {
      article_id: data.article_id,
      capture_status: "saved",
      processing_status: data.processing_status,
      duplicate: data.duplicate,
    } satisfies CaptureResponse,
    { status: data.duplicate ? 200 : 201 },
  );
}
