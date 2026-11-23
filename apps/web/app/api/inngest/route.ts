import { serve } from "inngest/next";
import {
  inngest,
  inngestDev,
  localQueueOwner,
} from "../../../lib/inngest/client";
import {
  dispatchCaptureJobs,
  dispatchLocalCaptureJobs,
} from "../../../lib/inngest/dispatch";
import { processCaptureJob } from "../../../lib/inngest/process-capture";
import { smokeJob } from "../../../lib/inngest/smoke";

export const runtime = "nodejs";
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dispatchCaptureJobs,
    processCaptureJob,
    ...(inngestDev ? [smokeJob] : []),
    ...(localQueueOwner ? [dispatchLocalCaptureJobs] : []),
  ],
});
