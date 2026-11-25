import { articleParamsSchema } from "@capture/shared";
import { reportCaptureTelemetry } from "../processing/telemetry";
import { createPrivilegedSupabaseClient } from "../supabase/admin";
import { inngest, inngestDev, localQueueOwner } from "./client";

export const dispatchCaptureJobs = inngest.createFunction(
  {
    id: "dispatch-capture-jobs",
    triggers: [
      { event: "capture/job.queued" },
      ...(inngestDev ? [{ event: "capture/dev.dispatch-job" }] : []),
    ],
    concurrency: { limit: 1, key: "event.data.jobId" },
    retries: 2,
    timeouts: { start: "2m", finish: "90s" },
    onFailure: async ({ event }) => {
      const target = articleParamsSchema.safeParse({
        id: event.data.event.data?.jobId,
      });
      await reportCaptureTelemetry({
        event: "capture_dispatch_deferred",
        jobId: target.data?.id,
        code: "dispatch_delivery_failed",
      });
    },
  },
  async ({ event, step }) => {
    const target = articleParamsSchema.safeParse({
      id: event.data && "jobId" in event.data ? event.data.jobId : undefined,
    });
    if (!target.success) return { dispatched: 0 };
    const jobId = target.data.id;
    const ownerId = localQueueOwner;
    if (ownerId) {
      const owned = await step.run("check-local-job-owner", async () => {
        const { data, error } = await createPrivilegedSupabaseClient()
          .from("processing_jobs")
          .select("id")
          .eq("id", jobId)
          .eq("user_id", ownerId)
          .maybeSingle();
        if (error) throw new Error("Could not check local capture ownership.");
        return Boolean(data);
      });
      if (!owned) return { dispatched: 0 };
    }
    const scope = { p_job_id: jobId };
    async function infrastructureFailure(code: string) {
      await reportCaptureTelemetry({
        event: "capture_system_failure",
        jobId,
        code,
      });
      return new Error(code);
    }

    await step.run("reconcile-abandoned-jobs", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_reconcile_jobs",
        scope,
      );
      if (error) throw await infrastructureFailure("dispatch_reconcile_failed");
      return data;
    });

    const rows = await step.run("claim-due-jobs", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_claim_dispatch",
        scope,
      );
      if (error) throw await infrastructureFailure("dispatch_claim_failed");
      return data;
    });
    const lease = rows[0]?.lease_id;
    if (!lease) return { dispatched: 0 };

    await step.sendEvent(
      "publish-claimed-jobs",
      rows.map(({ job_id, generation }) => ({
        id:
          generation === 1
            ? `capture-job-${job_id}`
            : `capture-job-${job_id}-${generation}`,
        name: "capture/job.requested",
        data: { jobId: job_id, generation },
      })),
    );

    const finalized = await step.run("finish-dispatch-lease", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_finish_dispatch",
        { p_lease_id: lease, p_dispatched: true },
      );
      if (error) throw await infrastructureFailure("dispatch_finalize_failed");
      return data;
    });
    return { dispatched: finalized };
  },
);
