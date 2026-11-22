import { readFileSync } from "node:fs";
import {
  apiErrorSchema,
  articleDetailResponseSchema,
  articleListQuerySchema,
  articleListResponseSchema,
  articleParamsSchema,
  captureRequestSchema,
  captureResponseSchema,
} from "@capture/shared";
import { expect, test } from "vitest";
import { sampleCapture } from "../fixtures/capture";

test("the documented JSON examples match the shared API schemas", () => {
  const doc = readFileSync(
    new URL("../../docs/API.md", import.meta.url),
    "utf8",
  );
  const examples = Array.from(
    doc.matchAll(/^```json\r?\n([\s\S]*?)^```\r?$/gm),
    ([, body]) => JSON.parse(body),
  );
  const schemas = [
    captureRequestSchema,
    captureRequestSchema,
    captureResponseSchema,
    articleListResponseSchema,
    articleDetailResponseSchema,
    apiErrorSchema,
  ];

  expect(examples).toHaveLength(schemas.length);
  schemas.forEach((schema, index) => {
    expect(schema.parse(examples[index])).toEqual(examples[index]);
  });
});

test("article pagination accepts defaults and validates URL query values", () => {
  expect(articleListQuerySchema.parse({})).toEqual({
    limit: 20,
    sort: "captured_desc",
  });
  expect(
    articleListQuerySchema.parse({ limit: "100", status: "ready" }),
  ).toEqual({
    limit: 100,
    status: "ready",
    sort: "captured_desc",
  });
  for (const limit of ["0", "101", "1.5", "1e2", true]) {
    expect(articleListQuerySchema.safeParse({ limit }).success).toBe(false);
  }
  expect(articleListQuerySchema.safeParse({ cursor: "" }).success).toBe(false);
  expect(
    articleListQuerySchema.safeParse({ user_id: "someone-else" }).success,
  ).toBe(false);
  expect(articleParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
    false,
  );
});

test("rejects malformed capture and article payloads", () => {
  expect(
    captureRequestSchema.safeParse({
      request_id: "not-a-uuid",
      url: "https://example.com",
      source: "manual_url",
    }).success,
  ).toBe(false);
  expect(
    captureResponseSchema.safeParse({
      article_id: sampleCapture.request_id,
      capture_status: "saved",
      processing_status: "unknown",
      duplicate: false,
    }).success,
  ).toBe(false);
  expect(
    captureResponseSchema.safeParse({
      article_id: sampleCapture.request_id,
      capture_status: "saved",
      processing_status: "saved",
      duplicate: "false",
    }).success,
  ).toBe(false);
  expect(
    articleListResponseSchema.safeParse({ articles: [], next_cursor: 42 })
      .success,
  ).toBe(false);
  expect(
    articleDetailResponseSchema.safeParse({
      article: { id: "invalid" },
      personal_note: 12,
      topics: [],
    }).success,
  ).toBe(false);
});
