import { z } from "zod";

export const processingStatusSchema = z.enum([
  "saved",
  "queued",
  "processing",
  "ready",
  "failed",
  "quota_limited",
  "unsupported",
]);

export const planSchema = z.enum(["free", "pro"]);

const idSchema = z.uuid();
const webUrlSchema = z.url({ protocol: /^https?$/ }).max(4096);
const dateTimeSchema = z.iso.datetime({ offset: true });
const titleSchema = z.string().trim().min(1).max(500);
const counterSchema = z.number().int().nonnegative();

export const captureRequestSchema = z.strictObject({
  request_id: idSchema,
  url: webUrlSchema,
  title: titleSchema.optional(),
  extracted_text: z.string().max(100_000).optional(),
  source: z.enum(["chrome_extension", "manual_url"]),
  personal_note: z.string().max(4000).optional(),
});

export const captureResponseSchema = z.object({
  article_id: idSchema,
  capture_status: z.literal("saved"),
  processing_status: processingStatusSchema,
  duplicate: z.boolean(),
  usage: z
    .object({
      used: counterSchema,
      reserved: counterSchema,
      limit: counterSchema,
    })
    .optional(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "invalid_input",
      "unauthenticated",
      "forbidden",
      "not_found",
      "conflict",
      "payload_too_large",
      "rate_limited",
      "unavailable",
      "internal_error",
    ]),
    message: z.string(),
    request_id: idSchema.optional(),
  }),
});

export const articleSchema = z.object({
  id: idSchema,
  url: webUrlSchema,
  title: titleSchema,
  domain: z.string().min(1),
  author: z.string().nullable(),
  published_at: dateTimeSchema.nullable(),
  captured_at: dateTimeSchema,
  archived_at: dateTimeSchema.nullable(),
  status: processingStatusSchema,
});

export const topicSchema = z.object({
  id: idSchema,
  parent_id: idSchema.nullable(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).nullable(),
  created_at: dateTimeSchema,
});

export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type Plan = z.infer<typeof planSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type CaptureResponse = z.infer<typeof captureResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Topic = z.infer<typeof topicSchema>;
