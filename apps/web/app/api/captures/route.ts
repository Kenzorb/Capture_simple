import {
  captureRequestSchema,
  type ApiError,
  type CaptureResponse,
} from "@capture/shared";
import {
  exceedsCaptureFieldBudget,
  logCaptureRejection,
  readCaptureJson,
} from "../../../lib/capture-request";
import {
  getCaptureTarget,
  saveOwnCapture,
} from "../../../lib/supabase/captures";
import { getRequestSession } from "../../../lib/supabase/request-session";

function captureError(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
  requestId?: string,
  headers?: HeadersInit,
) {
  return Response.json(
    { error: { code, message, request_id: requestId } } satisfies ApiError,
    { status, headers },
  );
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return captureError(401, "unauthenticated", "Sign in to save a capture.");

  const body = await readCaptureJson(request);
  if (body.status === "invalid") {
    return captureError(
      400,
      "invalid_input",
      "Send the capture as uncompressed JSON.",
    );
  }
  if (body.status === "too_large" || exceedsCaptureFieldBudget(body.data)) {
    logCaptureRejection("payload_too_large");
    return captureError(
      413,
      "payload_too_large",
      "Capture details exceed the size limit.",
    );
  }

  const parsed = captureRequestSchema.safeParse(body.data);
  if (!parsed.success)
    return captureError(400, "invalid_input", "Enter valid capture details.");
  const capture = parsed.data;
  const target = getCaptureTarget(capture);
  if (!target) {
    return captureError(
      400,
      "invalid_input",
      capture.source === "manual_url"
        ? "Enter an HTTP or HTTPS URL with a public domain."
        : "Enter a valid HTTP or HTTPS URL.",
      capture.request_id,
    );
  }

  const { data, error } = await saveOwnCapture(session, capture, target);
  if (error?.code === "PT429") {
    logCaptureRejection("rate_limited");
    const seconds = Number(error.details);
    const retryAfter =
      Number.isInteger(seconds) && seconds >= 1 && seconds <= 60 ? seconds : 60;
    return captureError(
      429,
      "rate_limited",
      "Too many captures. Try again shortly.",
      capture.request_id,
      {
        "Retry-After": String(retryAfter),
      },
    );
  }
  if (error?.code === "PT413") {
    logCaptureRejection("payload_too_large");
    return captureError(
      413,
      "payload_too_large",
      "Capture details exceed the size limit.",
      capture.request_id,
    );
  }
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
