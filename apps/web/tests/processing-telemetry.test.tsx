import { afterEach, expect, test, vi } from "vitest";
import {
  modelCostEstimate,
  reportCaptureTelemetry,
} from "../lib/processing/telemetry";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("sends a grouped alert containing only approved telemetry fields", async () => {
  const jobId = "1b50b744-94b1-4733-b225-e379685c5410";
  vi.stubEnv(
    "SENTRY_DSN",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.us.sentry.io/456",
  );
  vi.stubEnv("CAPTURE_MONITOR_ENVIRONMENT", "staging");
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  const send = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 204 }));
  const fields = {
    event: "capture_system_failure" as const,
    code: "job_source_read_failed",
    jobId,
    capturedText: "private fixture that must not be sent",
    url: "https://example.test/private",
  };
  const eventId = await reportCaptureTelemetry(fields, send);
  expect(eventId).toMatch(/^[a-f0-9]{32}$/);
  expect(send).toHaveBeenCalledOnce();
  const [url, options] = send.mock.calls[0];
  expect(url).toBe("https://o123.ingest.us.sentry.io/api/456/envelope/");
  expect(options?.redirect).toBe("error");
  const [header, item, payload] = String(options?.body)
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(header.event_id).toBe(eventId);
  expect(item).toEqual({ type: "event" });
  expect(payload).toMatchObject({
    environment: "staging",
    fingerprint: ["capture_system_failure", "job_source_read_failed"],
    extra: {
      event: "capture_system_failure",
      code: "job_source_read_failed",
      jobId,
    },
  });
  expect(Object.keys(payload.extra)).toHaveLength(3);
  expect(log).toHaveBeenCalledExactlyOnceWith(JSON.stringify(payload.extra));
});

test("records queue and model cost without sending routine job telemetry", async () => {
  vi.stubEnv(
    "SENTRY_DSN",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/456",
  );
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const send = vi.fn<typeof fetch>();
  const estimatedUsd = modelCostEstimate("gpt-5.6-luna", 1_000_000, 1_000_000);
  expect(estimatedUsd).toBe(1.4);
  expect(modelCostEstimate("another-model", 100, 100)).toBeUndefined();
  await reportCaptureTelemetry(
    { event: "capture_job_started", queueLagMs: 5_000 },
    send,
  );
  await reportCaptureTelemetry(
    {
      event: "capture_model_usage",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      estimatedUsd,
    },
    send,
  );
  expect(log).toHaveBeenCalledTimes(2);
  expect(send).not.toHaveBeenCalled();
});

test.skipIf(process.env.CAPTURE_TEST_MONITOR_LIVE !== "1")(
  "Sentry accepts a synthetic failure",
  async () => {
    const environment =
      process.env.CAPTURE_MONITOR_ENVIRONMENT === "staging"
        ? "staging"
        : "development";
    vi.stubEnv("CAPTURE_MONITOR_ENVIRONMENT", environment);
    const eventId = await reportCaptureTelemetry({
      event: "capture_monitor_test",
      code: "synthetic_monitor_failure",
    });
    expect(eventId).toMatch(/^[a-f0-9]{32}$/);
    console.info("Capture synthetic Sentry event ID", environment, eventId);
  },
);
