import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  maxEvidenceBytes,
  segmentSource,
} from "../../apps/web/lib/processing/segment-source";

it("keeps headings, normalizes whitespace, and removes exact navigation noise", () => {
  const source =
    "Skip to content\r\n##  Seed care\r\n\r\n Plant   carefully.\r\nAccept cookies\r\n";
  const result = segmentSource(source);
  expect(result.text).toBe("## Seed care\n\nPlant carefully.");
  expect(result.hash).toBe(
    createHash("sha256").update(result.text).digest("hex"),
  );
  expect(result.chunks.map((chunk) => chunk.text)).toEqual([result.text]);
  expect(segmentSource(result.text)).toEqual(result);
  expect(segmentSource("Accept cookies").chunks).toEqual([]);
});

it("bounds the model evidence and traces every chunk to a valid UTF-8 byte range", () => {
  const result = segmentSource(
    "## Plant growth\n\n" + "Leaves 🌿 and raíces.\n\n".repeat(800),
  );
  const source = Buffer.from(result.text);
  expect(source.length).toBeGreaterThan(maxEvidenceBytes);
  let next = 0;
  for (const chunk of result.chunks) {
    expect(chunk.start_byte).toBe(next);
    expect(chunk.end_byte - chunk.start_byte).toBeLessThanOrEqual(1800);
    expect(
      source.subarray(chunk.start_byte, chunk.end_byte).toString("utf8"),
    ).toBe(chunk.text);
    expect(chunk.text).not.toContain("�");
    next = chunk.end_byte;
  }
  expect(next).toBeGreaterThanOrEqual(maxEvidenceBytes - 3);
  expect(next).toBeLessThanOrEqual(maxEvidenceBytes);
  expect(new Set(result.chunks.map((chunk) => chunk.chunk_id)).size).toBe(
    result.chunks.length,
  );
  expect(segmentSource("changed " + result.text).chunks[0].chunk_id).not.toBe(
    result.chunks[0].chunk_id,
  );
});
