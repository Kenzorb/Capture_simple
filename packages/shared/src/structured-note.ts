import { z } from "zod";

export const structuredNoteVersion = 1;

const text = (max: number) => z.string().min(1).max(max).regex(/\S/);
const label = text(100);
const evidenceIds = z
  .array(z.string().regex(/^ch_[a-f0-9]{16}_[1-9][0-9]?$/))
  .min(1)
  .max(8);

export const structuredNoteOutputSchema = z.strictObject({
  language: z
    .string()
    .max(35)
    .regex(/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/),
  summary: text(1_200),
  key_takeaways: z.array(text(320)).min(1).max(8),
  sections: z
    .array(
      z.strictObject({
        heading: label,
        points: z.array(text(320)).min(1).max(5),
        evidence_chunk_ids: evidenceIds,
      }),
    )
    .min(1)
    .max(8),
  concepts: z
    .array(
      z.strictObject({
        name: label,
        definition: text(320),
        evidence_chunk_ids: evidenceIds,
      }),
    )
    .max(12),
  tags: z.array(label).max(12),
  suggested_topic_paths: z.array(z.array(label).min(1).max(4)).max(5),
});

export const structuredNoteSchema = structuredNoteOutputSchema.extend({
  schema_version: z.literal(structuredNoteVersion),
  model: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9._:-]+$/),
});

export type StructuredNote = z.infer<typeof structuredNoteSchema>;

export function structuredNoteJsonSchema() {
  const schema = z.toJSONSchema(structuredNoteOutputSchema, {
    target: "draft-7",
  });
  delete schema.$schema;
  return schema;
}
