import { articleParamsSchema } from "@capture/shared";
import { createPrivilegedSupabaseClient } from "../supabase/admin";
import { inngest, inngestDev } from "./client";

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
    const scope = { p_job_id: inngestDev ? target.data?.id : undefined };

    await step.run("reconcile-abandoned-jobs", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_reconcile_jobs",
        scope,
      );
      if (error) throw new Error("Could not reconcile capture jobs.");
      return data;
    });

    const rows = await step.run("claim-due-jobs", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_claim_dispatch",
        scope,
      );
      if (error) throw new Error("Could not claim pending capture jobs.");
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
      if (error) throw new Error("Could not finalize capture job dispatch.");
      return data;
    });
    return {
      dispatched: accepted ? finalized : 0,
      deferred: accepted ? 0 : finalized,
    };
  },
);
