import "server-only";

import { randomUUID } from "node:crypto";
import { articleParamsSchema } from "@capture/shared";

type Telemetry = {
  event:
    | "capture_job_started"
    | "capture_source_retry"
    | "capture_job_finished"
    | "capture_model_usage"
    | "capture_dispatch_deferred"
    | "capture_system_failure"
    | "capture_monitor_test";
  jobId?: string;
  code?: string;
  generation?: number;
  attempt?: number;
  queueLagMs?: number;
  count?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedUsd?: number;
};

export function modelCostEstimate(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  if (!/^gpt-5\.6-luna(?:-\d{4}-\d{2}-\d{2})?$/.test(model)) return undefined;
  return Number(
    ((inputTokens * 0.2 + outputTokens * 1.2) / 1_000_000).toFixed(8),
  );
}

export async function reportCaptureTelemetry(fields: Telemetry, send = fetch) {
  const job = articleParamsSchema.safeParse({ id: fields.jobId });
  const code =
    fields.code && /^[a-z][a-z0-9_]{0,39}$/.test(fields.code)
      ? fields.code
      : undefined;
  const data = {
    event: fields.event,
    jobId: job.success ? job.data.id : undefined,
    code,
    generation: fields.generation,
    attempt: fields.attempt,
    queueLagMs: fields.queueLagMs,
    count: fields.count,
    inputTokens: fields.inputTokens,
    outputTokens: fields.outputTokens,
    estimatedUsd: fields.estimatedUsd,
  };
  const alert =
    fields.event === "capture_system_failure" ||
    fields.event === "capture_monitor_test" ||
    fields.event === "capture_dispatch_deferred" ||
    (fields.event === "capture_job_finished" &&
      (code === "not_configured" || code?.startsWith("provider_")));
  if (alert) console.warn(JSON.stringify(data));
  else console.info(JSON.stringify(data));

  const dsn = URL.parse(process.env.SENTRY_DSN ?? "");
  if (!alert || !dsn) return;
  const project = /^\/(\d+)\/?$/.exec(dsn.pathname)?.[1];
  if (
    dsn.protocol !== "https:" ||
    !/^o\d+\.ingest\.(?:(?:us|eu)\.)?sentry\.io$/.test(dsn.hostname) ||
    !/^[a-f0-9]{32}$/i.test(dsn.username) ||
    dsn.password ||
    dsn.port ||
    !project
  )
    return;

  const id = randomUUID().replaceAll("-", "");
  const environment = process.env.CAPTURE_MONITOR_ENVIRONMENT;
  const timestamp = new Date().toISOString();
  const body =
    [
      JSON.stringify({ event_id: id, sent_at: timestamp }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: id,
        timestamp,
        platform: "node",
        level: "error",
        environment:
          environment === "staging" || environment === "production"
            ? environment
            : "development",
        message: code ?? fields.event,
        fingerprint: [fields.event, code ?? "unknown"],
        tags: { capture_event: fields.event, capture_code: code ?? "unknown" },
        extra: data,
      }),
    ].join("\n") + "\n";
  try {
    const response = await send(`${dsn.origin}/api/${project}/envelope/`, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=capture/0.1, sentry_key=${dsn.username}`,
      },
      body,
      signal: AbortSignal.timeout(1_500),
    });
    await response.body?.cancel();
    if (!response.ok)
      console.warn(
        JSON.stringify({
          event: "capture_monitor_unavailable",
          status: response.status,
        }),
      );
    else return id;
  } catch {
    console.warn(JSON.stringify({ event: "capture_monitor_unavailable" }));
  }
}
