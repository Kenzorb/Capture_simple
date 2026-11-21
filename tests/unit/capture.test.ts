import { captureRequestSchema, captureResponseSchema } from "@capture/shared";
import { expect, test } from "vitest";
import { sampleCapture } from "../fixtures/capture";

test("accepts a valid link-only capture", () => {
  expect(captureRequestSchema.parse(sampleCapture)).toEqual(sampleCapture);
});

test("rejects caller-supplied ownership and unsupported URL schemes", () => {
  expect(
    captureRequestSchema.safeParse({
      ...sampleCapture,
      user_id: sampleCapture.request_id,
    }).success,
  ).toBe(false);
  expect(
    captureRequestSchema.safeParse({
      ...sampleCapture,
      url: "file:///garden-guide.html",
    }).success,
  ).toBe(false);
});

test("accepts a durable save when the AI quota is exhausted", () => {
  expect(
    captureResponseSchema.safeParse({
      article_id: sampleCapture.request_id,
      capture_status: "saved",
      processing_status: "quota_limited",
      duplicate: false,
      usage: { used: 20, reserved: 0, limit: 20 },
    }).success,
  ).toBe(true);
});
