import "server-only";
import { Inngest } from "inngest";

export const inngestDev =
  process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1";

export const inngest = new Inngest({ id: "capture", isDev: inngestDev });
