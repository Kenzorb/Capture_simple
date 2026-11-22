import { RetryAfterError } from "inngest";
import { inngest } from "./client";

export const smokeJob = inngest.createFunction(
  {
    id: "durability-smoke",
    triggers: [{ event: "capture/dev.durability-smoke" }],
    concurrency: { limit: 1 },
    retries: 1,
    timeouts: { start: "30s", finish: "1m" },
  },
  async ({ attempt, step }) => {
    await step.sleep("pause-after-acknowledgement", "2s");
    return step.run("retry-once", () => {
      if (attempt === 0) {
        throw new RetryAfterError("Intentional smoke-test failure", "2s");
      }
      return { status: "completed", attempt };
    });
  },
);
