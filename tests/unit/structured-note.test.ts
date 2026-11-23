import {
  structuredNoteOutputSchema,
  structuredNoteSchema,
} from "@capture/shared";
import { expect, it } from "vitest";

const evidence = "ch_0123456789abcdef_1";
const output = {
  language: "en",
  summary: "Light supports leaf growth.",
  key_takeaways: ["Leaves collect light."],
  sections: [
    {
      heading: "Leaves",
      points: ["Leaves collect light."],
      evidence_chunk_ids: [evidence],
    },
  ],
  concepts: [],
  tags: ["Plants"],
  suggested_topic_paths: [["Science", "Botany"]],
};

it("accepts bounded grounded model output with separate server-assigned metadata", () => {
  expect(structuredNoteOutputSchema.safeParse(output).success).toBe(true);
  expect(
    structuredNoteSchema.safeParse({
      ...output,
      model: "fixture-model",
      schema_version: 1,
    }).success,
  ).toBe(true);
});

it.each([
  { ...output, summary: "    " },
  { ...output, summary: "x".repeat(1_201) },
  { ...output, summary: undefined },
  { ...output, tags: Array.from({ length: 13 }, () => "tag") },
  { ...output, sections: [{ ...output.sections[0], evidence_chunk_ids: [] }] },
  {
    ...output,
    sections: [{ ...output.sections[0], evidence_chunk_ids: ["wrong"] }],
  },
  { ...output, personal_note: "a model cannot write this field" },
  { ...output, model: "invented-provider-model" },
])("rejects malformed or unexpected output", (candidate) => {
  expect(structuredNoteOutputSchema.safeParse(candidate).success).toBe(false);
});

it("requires supported version metadata on stored notes", () => {
  expect(structuredNoteSchema.safeParse(output).success).toBe(false);
  expect(
    structuredNoteSchema.safeParse({
      ...output,
      model: "fixture-model",
      schema_version: 2,
    }).success,
  ).toBe(false);
});
