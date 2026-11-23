"use client";

import { processingStatusSchema, type ProcessingStatus } from "@capture/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const pollInterval = 2_500;
const savedPollLimit = 2 * 60_000;

export function CapturePolling({
  articleId,
  status,
}: {
  articleId: string;
  status: ProcessingStatus;
}) {
  const router = useRouter();
  useEffect(() => {
    if (status !== "saved" && status !== "queued" && status !== "processing")
      return;

    const stop = new AbortController();
    const began = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (
        stop.signal.aborted ||
        (status === "saved" && Date.now() - began >= savedPollLimit)
      )
        return;
      if (document.visibilityState === "visible") {
        try {
          const result = await fetch(
            `/api/articles/${encodeURIComponent(articleId)}`,
            {
              cache: "no-store",
              signal: AbortSignal.any([
                stop.signal,
                AbortSignal.timeout(5_000),
              ]),
            },
          );
          if ([401, 403, 404].includes(result.status)) return;
          if (result.ok) {
            const body = await result.json();
            const next = processingStatusSchema.safeParse(
              body?.article?.status,
            );
            if (!stop.signal.aborted && next.success && next.data !== status)
              router.refresh();
          }
        } catch {
          // A temporary network error leaves the current status visible.
        }
      }
      if (!stop.signal.aborted) timer = setTimeout(poll, pollInterval);
    }
    timer = setTimeout(poll, pollInterval);
    return () => {
      stop.abort();
      clearTimeout(timer);
    };
  }, [articleId, router, status]);
  return null;
}
