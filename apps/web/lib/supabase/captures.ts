import "server-only";

import {
  canonicalizeCaptureUrl,
  canonicalizeManualUrl,
  type CaptureRequest,
} from "@capture/shared";
import type { getAuthenticatedSession } from "./server";

type Session = Pick<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>,
  "supabase"
>;

export function getCaptureTarget({ url, source }: CaptureRequest) {
  return source === "manual_url"
    ? canonicalizeManualUrl(url)
    : canonicalizeCaptureUrl(url);
}

export function saveOwnCapture(
  { supabase }: Session,
  capture: CaptureRequest,
  target: NonNullable<ReturnType<typeof getCaptureTarget>>,
) {
  return supabase
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
}
