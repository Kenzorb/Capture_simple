import { z } from "zod";
import { maxCaptureUrlLength } from "./capture-url";

export {
  canonicalizeCaptureUrl,
  canonicalizeManualUrl,
  maxCaptureUrlLength,
} from "./capture-url";

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
export const maxExtractedTextBytes = 100_000;
export const maxPersonalNoteLength = 4_000;

const idSchema = z.uuid();
const webUrlSchema = z.url({ protocol: /^https?$/ }).max(maxCaptureUrlLength);
const dateTimeSchema = z.iso.datetime({ offset: true });
const titleSchema = z.string().trim().min(1).max(500);
const counterSchema = z.number().int().nonnegative();

export const captureRequestSchema = z.strictObject({
  request_id: idSchema,
  url: webUrlSchema,
  title: titleSchema.optional(),
  extracted_text: z.string().max(maxExtractedTextBytes).optional(),
  source: z.enum(["chrome_extension", "manual_url"]),
  personal_note: z.string().max(maxPersonalNoteLength).optional(),
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

const articleCursorSchema = z.string().min(1).max(512);

export const articleListQuerySchema = z.strictObject({
  cursor: articleCursorSchema.optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d{0,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(20),
  status: processingStatusSchema.optional(),
  domain: z.string().trim().min(1).max(253).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(["captured_desc", "captured_asc"]).default("captured_desc"),
  archived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const articleListResponseSchema = z.object({
  articles: z.array(articleSchema),
  next_cursor: articleCursorSchema.nullable(),
});

export const articleParamsSchema = z.strictObject({ id: idSchema });
export const articleEditSchema = z
  .strictObject({
    title: titleSchema.optional(),
    personal_note: z.string().max(maxPersonalNoteLength).nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    ({ title, personal_note, archived }) =>
      title !== undefined ||
      personal_note !== undefined ||
      archived !== undefined,
  );

export const articleDeleteSchema = z.strictObject({
  confirmed: z.literal(true),
});
export const articleCursorPayloadSchema = articleSchema.pick({
  id: true,
  captured_at: true,
});

export const articleDetailResponseSchema = z.object({
  article: articleSchema,
  personal_note: z.string().nullable(),
  topics: z.array(topicSchema),
});

export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type Plan = z.infer<typeof planSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type CaptureResponse = z.infer<typeof captureResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Article = z.infer<typeof articleSchema>;
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;
export type ArticleEdit = z.infer<typeof articleEditSchema>;
export type ArticleListResponse = z.infer<typeof articleListResponseSchema>;
export type ArticleDetailResponse = z.infer<typeof articleDetailResponseSchema>;
export type Topic = z.infer<typeof topicSchema>;
