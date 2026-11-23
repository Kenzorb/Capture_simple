import "server-only";
import { articleParamsSchema } from "@capture/shared";
import { Inngest } from "inngest";

export const inngestDev =
  process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1";

export const localQueueOwner = inngestDev
  ? articleParamsSchema.safeParse({ id: process.env.INNGEST_DEV_OWNER_ID }).data
      ?.id
  : undefined;

export const inngest = new Inngest({ id: "capture", isDev: inngestDev });
