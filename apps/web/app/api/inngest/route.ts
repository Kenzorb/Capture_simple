import { serve } from "inngest/next";
import { inngest, inngestDev } from "../../../lib/inngest/client";
import { smokeJob } from "../../../lib/inngest/smoke";

export const runtime = "nodejs";
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestDev ? [smokeJob] : [],
});
