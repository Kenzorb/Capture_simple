"use client";

import { processingStatusSchema, type ProcessingStatus } from "@capture/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitButton } from "../../../../(auth)/submit-button";

const pollInterval = 2_500;
const savedPollLimit = 2 * 60_000;

export function StalledCaptureRecovery({
  eligibleAt,
  action,
}: {
  eligibleAt: number;
  action: () => Promise<void>;
}) {
  const [visibleFor, setVisibleFor] = useState<number>();
  useEffect(() => {
    const timer = setTimeout(
      () => setVisibleFor(eligibleAt),
      Math.max(0, eligibleAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [eligibleAt]);
  if (visibleFor !== eligibleAt) return null;

  return (
    <form action={action} className="mt-3">
      <p className="mb-2 text-sm text-[#506458]">
        Analysis is taking longer than expected. You can try again.
      </p>
      <SubmitButton label="Retry analysis" />
    </form>
  );
}

export function CapturePolling({
  articleId,
  status,
}: {
  articleId: string;
  status: ProcessingStatus;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState<
    "offline" | "unavailable" | "deleted" | "sign-in" | null
  >(null);
  const [checks, setChecks] = useState(0);
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
          if (!navigator.onLine) throw new Error("Offline");
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
          if (result.status === 404) {
            setIssue("deleted");
            return;
          }
          if (result.status === 401 || result.status === 403) {
            setIssue("sign-in");
            return;
          }
          if (result.ok) {
            const body = await result.json();
            const next = processingStatusSchema.safeParse(
              body?.article?.status,
            );
            if (!stop.signal.aborted && next.success) {
              setIssue(null);
              if (next.data !== status) router.refresh();
            }
          } else if (!stop.signal.aborted) {
            setIssue("unavailable");
          }
        } catch {
          if (!stop.signal.aborted)
            setIssue(navigator.onLine ? "unavailable" : "offline");
        }
      }
      if (!stop.signal.aborted) timer = setTimeout(poll, pollInterval);
    }
    timer = setTimeout(poll, checks ? 0 : pollInterval);
    return () => {
      stop.abort();
      clearTimeout(timer);
    };
  }, [articleId, checks, router, status]);
  if (!issue || !["saved", "queued", "processing"].includes(status))
    return null;
  return (
    <p role="status" className="basis-full text-sm text-[#506458]">
      {issue === "deleted" ? (
        <>
          This capture is no longer available.{" "}
          <Link href="/dashboard/captures" className="underline">
            Back to all captures
          </Link>
        </>
      ) : issue === "sign-in" ? (
        <>
          Sign in again to check this capture.{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </>
      ) : (
        <>
          {issue === "offline"
            ? "You’re offline. Reconnect to check analysis progress."
            : "Could not check analysis progress. Your capture is saved."}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setChecks((count) => count + 1)}
          >
            Check again
          </button>
        </>
      )}
    </p>
  );
}
