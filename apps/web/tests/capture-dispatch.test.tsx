import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { resumeCapture } from "../app/(dashboard)/dashboard/captures/[id]/actions";
import { dispatchCaptureJobs } from "../lib/inngest/dispatch";
import { inngest } from "../lib/inngest/client";
import { readActiveCaptureDispatch } from "../lib/inngest/wake";
import { reportCaptureTelemetry } from "../lib/processing/telemetry";
import { getCaptureTarget, saveOwnCapture } from "../lib/supabase/captures";

const { scheduled, lookup } = vi.hoisted(() => {
  const scheduled: (() => Promise<void>)[] = [];
  const lookup = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  return { scheduled, lookup };
});

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => scheduled.push(task),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("../lib/supabase/server", () => ({
  getAuthenticatedSession: async () => ({ user: { id: owner } }),
}));
vi.mock("../lib/supabase/admin", () => ({
  createPrivilegedSupabaseClient: () => ({ from: () => lookup }),
}));
vi.mock("../lib/processing/telemetry", () => ({
  reportCaptureTelemetry: vi.fn(),
}));
vi.mock("../lib/inngest/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/inngest/client")>();
  vi.spyOn(actual.inngest, "send").mockResolvedValue({ ids: ["event"] });
  return actual;
});

const jobId = "01ca0000-0000-4000-8000-000000000001";
const articleId = "01ca0000-0000-4000-8000-000000000002";
const owner = "01ca0000-0000-4000-8000-000000000003";
const updated = "2026-11-25T01:00:00.000Z";

function job({
  status = "queued",
  dispatchedAt = null,
  nextAttempt = updated,
}: {
  status?: string;
  dispatchedAt?: string | null;
  nextAttempt?: string;
} = {}) {
  return {
    data: {
      id: jobId,
      status,
      updated_at: updated,
      job_outbox: { dispatched_at: dispatchedAt, next_attempt_at: nextAttempt },
    },
    error: null,
  };
}

function save(
  source: "manual_url" | "chrome_extension",
  processingStatus = "queued",
  duplicate = false,
) {
  const data = {
    article_id: articleId,
    duplicate,
    processing_status: processingStatus,
  };
  const session = {
    user: { id: owner },
    supabase: { rpc: () => ({ single: async () => ({ data, error: null }) }) },
  } as unknown as Parameters<typeof saveOwnCapture>[0];
  const capture = {
    url: "https://example.com/article",
    source,
    request_id: jobId,
  };
  return saveOwnCapture(session, capture, getCaptureTarget(capture)!);
}

beforeEach(() => {
  scheduled.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("INNGEST_EVENT_KEY", "capture-test-event-key");
  lookup.maybeSingle.mockResolvedValue(job());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

test("hosted dispatch has only an event trigger and retries delivery failures", () => {
  expect(dispatchCaptureJobs.opts.triggers).toEqual([
    { event: "capture/job.queued" },
  ]);
  expect(dispatchCaptureJobs.opts.retries).toBeGreaterThan(0);
});

test("a queued save schedules an owner-scoped wake after the response", async () => {
  await expect(save("manual_url")).resolves.toMatchObject({
    data: { article_id: articleId },
  });
  await save("chrome_extension", "quota_limited");
  await save("chrome_extension", "queued", true);
  expect(scheduled).toHaveLength(1);
  expect(inngest.send).not.toHaveBeenCalled();
  await scheduled[0]();
  expect(lookup.eq).toHaveBeenCalledWith("user_id", owner);
  expect(lookup.eq).toHaveBeenCalledWith("article_id", articleId);
  expect(inngest.send).toHaveBeenCalledWith({
    name: "capture/job.queued",
    data: { jobId },
  });
});

test("a rejected wake preserves the successful extension save and reports the failure", async () => {
  vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Unavailable"));
  await expect(save("chrome_extension")).resolves.toMatchObject({
    error: null,
  });
  await expect(scheduled[0]()).resolves.toBeUndefined();
  expect(reportCaptureTelemetry).toHaveBeenCalledWith({
    event: "capture_dispatch_deferred",
    jobId,
    code: "dispatch_wake_failed",
  });
});

test("manual recovery waits for pending leases and stale workers", async () => {
  await expect(readActiveCaptureDispatch(owner, articleId)).resolves.toEqual({
    jobId,
    eligibleAt: Date.parse("2026-11-25T01:02:00.000Z"),
  });
  lookup.maybeSingle.mockResolvedValueOnce(
    job({ nextAttempt: "2026-11-25T01:04:00.000Z" }),
  );
  await expect(
    readActiveCaptureDispatch(owner, articleId),
  ).resolves.toMatchObject({
    eligibleAt: Date.parse("2026-11-25T01:04:00.000Z"),
  });
  lookup.maybeSingle.mockResolvedValueOnce(
    job({ dispatchedAt: "2026-11-25T01:01:00.000Z" }),
  );
  await expect(
    readActiveCaptureDispatch(owner, articleId),
  ).resolves.toMatchObject({
    eligibleAt: Date.parse("2026-11-25T01:16:00.000Z"),
  });
  lookup.maybeSingle.mockResolvedValueOnce(job({ status: "processing" }));
  await expect(
    readActiveCaptureDispatch(owner, articleId),
  ).resolves.toMatchObject({
    eligibleAt: Date.parse("2026-11-25T01:15:00.000Z"),
  });
});

test("retrying a stalled capture wakes its existing job and refuses an active or missing job", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T01:03:00.000Z"));
  const path = `/dashboard/captures/${articleId}`;
  const active = new Date(Date.now() + 60_000).toISOString();
  lookup.maybeSingle.mockResolvedValueOnce(job({ nextAttempt: active }));
  await expect(resumeCapture(articleId)).rejects.toThrow(
    `${path}?change=analysis-active`,
  );
  lookup.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await expect(resumeCapture(articleId)).rejects.toThrow(path);
  expect(scheduled).toHaveLength(0);

  await expect(resumeCapture(articleId)).rejects.toThrow(
    `${path}?change=resuming`,
  );
  expect(scheduled).toHaveLength(1);
  await scheduled[0]();
  expect(inngest.send).toHaveBeenCalledWith({
    name: "capture/job.queued",
    data: { jobId },
  });
});
