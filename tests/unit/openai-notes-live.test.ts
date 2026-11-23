import { expect, it, vi } from "vitest";
import {
  defaultNoteModel,
  generateOpenAiNote,
} from "../../apps/web/lib/processing/openai-notes";
import { prepareSource } from "../../apps/web/lib/processing/prepare-source";
import { segmentSource } from "../../apps/web/lib/processing/segment-source";

vi.mock("../../apps/web/node_modules/server-only/index.js", () => ({}));

const articles = [
  ["Robots Exclusion Protocol", "https://www.rfc-editor.org/rfc/rfc9309.txt"],
  [
    "Normal distribution",
    "https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm",
  ],
  ["What is a black hole?", "https://science.nasa.gov/universe/black-holes/"],
] as const;

it.skipIf(process.env.CAPTURE_TEST_AI_LIVE !== "1").each(articles)(
  "generates validated notes with measured usage for %s",
  async (title, url) => {
    expect(
      Boolean(process.env.OPENAI_API_KEY?.trim()),
      "Configure a development OpenAI API key",
    ).toBe(true);
    const source = await prepareSource({ url, capturedText: null });
    expect(source.status).toBe("ready");
    if (source.status !== "ready") return;

    const { chunks } = segmentSource(source.text);
    const result = await generateOpenAiNote(chunks);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    const ids = new Set(chunks.map(({ chunk_id }) => chunk_id));
    for (const item of [...result.note.sections, ...result.note.concepts])
      expect(item.evidence_chunk_ids.every((id) => ids.has(id))).toBe(true);
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
    const usage = result.usage;
    const estimatedUsd = result.note.model.startsWith(defaultNoteModel)
      ? (
          (0.2 * usage.inputTokens + 1.2 * usage.outputTokens) /
          1_000_000
        ).toFixed(6)
      : "use the configured model’s standard rates";
    console.log(title, result.note.model, usage, estimatedUsd);
  },
  60_000,
);
