import { articleParamsSchema } from "@capture/shared";
import { reportCaptureTelemetry } from "../processing/telemetry";
import { createPrivilegedSupabaseClient } from "../supabase/admin";
import { inngest, inngestDev, localQueueOwner } from "./client";

export const dispatchCaptureJobs = inngest.createFunction(
  {
    id: "dispatch-capture-jobs",
    triggers: inngestDev
      ? [{ event: "capture/dev.dispatch-job" }]
      : [{ cron: "* * * * *" }],
    concurrency: { limit: 1 },
    retries: 0,
    timeouts: { start: "2m", finish: "90s" },
  },
  async ({ event, step }) => {
    const target = articleParamsSchema.safeParse({
      id: event.data && "jobId" in event.data ? event.data.jobId : undefined,
    });
    if (inngestDev && !target.success) return { dispatched: 0 };
    const jobId = inngestDev ? target.data?.id : undefined;
    const ownerId = localQueueOwner;
    if (ownerId && jobId) {
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

    let accepted = true;
    try {
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
    } catch {
      accepted = false;
    }

    const finalized = await step.run("finish-dispatch-lease", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_finish_dispatch",
        { p_lease_id: lease, p_dispatched: accepted },
      );
      if (error) throw await infrastructureFailure("dispatch_finalize_failed");
      if (!accepted && data > 0)
        await reportCaptureTelemetry({
          event: "capture_dispatch_deferred",
          jobId,
          code: "dispatch_provider_unavailable",
          count: data,
        });
      return data;
    });
    return {
      dispatched: accepted ? finalized : 0,
      deferred: accepted ? 0 : finalized,
    };
  },
);

export const dispatchLocalCaptureJobs = inngest.createFunction(
  {
    id: "dispatch-local-capture-jobs",
    triggers: [{ cron: "* * * * *" }],
    concurrency: { limit: 1 },
    retries: 0,
  },
  async ({ step }) => {
    const ownerId = localQueueOwner;
    if (!ownerId) return { scheduled: 0 };
    const jobs = await step.run("find-due-local-jobs", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_due_owner_jobs",
        { p_owner_id: ownerId },
      );
      if (error) throw new Error("Could not find pending local capture jobs.");
      return data;
    });
    if (jobs.length) {
      await step.sendEvent(
        "schedule-owned-captures",
        jobs.map(({ job_id }) => ({
          name: "capture/dev.dispatch-job",
          data: { jobId: job_id },
        })),
      );
    }
    return { scheduled: jobs.length };
  },
);
