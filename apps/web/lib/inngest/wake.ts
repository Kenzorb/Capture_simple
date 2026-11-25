import "server-only";

import { after } from "next/server";
import { reportCaptureTelemetry } from "../processing/telemetry";
import { createPrivilegedSupabaseClient } from "../supabase/admin";
import { inngest, inngestDev, localQueueOwner } from "./client";

export async function readActiveCaptureDispatch(
  userId: string,
  articleId: string,
) {
  const { data, error } = await createPrivilegedSupabaseClient()
    .from("processing_jobs")
    .select(
      "id, status, updated_at, job_outbox!inner(status, next_attempt_at, dispatched_at)",
    )
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .in("status", ["queued", "processing"])
    .neq("job_outbox.status", "dead")
    .maybeSingle();
  if (error) throw new Error("Could not read capture dispatch state.");
  const outbox = data?.job_outbox;
  if (!data || !outbox) return null;

  const updated = Date.parse(data.updated_at);
  if (data.status === "processing") {
    return { jobId: data.id, eligibleAt: updated + 15 * 60_000 };
  }
  const eligibleAt = outbox.dispatched_at
    ? Date.parse(outbox.dispatched_at) + 15 * 60_000
    : Math.max(updated + 2 * 60_000, Date.parse(outbox.next_attempt_at));
  return { jobId: data.id, eligibleAt };
}

export function wakeCaptureAfterResponse(userId: string, articleId: string) {
  if (
    (!inngestDev && !process.env.INNGEST_EVENT_KEY) ||
    (localQueueOwner && localQueueOwner !== userId)
  )
    return;

  after(async () => {
    let jobId: string | undefined;
    try {
      jobId = (await readActiveCaptureDispatch(userId, articleId))?.jobId;
      if (jobId)
        await inngest.send({ name: "capture/job.queued", data: { jobId } });
    } catch {
      await reportCaptureTelemetry({
        event: "capture_dispatch_deferred",
        jobId,
        code: "dispatch_wake_failed",
      });
    }
  });
}
