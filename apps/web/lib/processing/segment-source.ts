import { createHash } from "node:crypto";

// Counting UTF-8 bytes conservatively bounds text tokens for a byte-level tokenizer.
export const maxEvidenceBytes = 12_000;
const maxChunkBytes = 1_800;
const sourceNoise =
  /^(skip to (?:main )?content|accept (?:all )?cookies|all rights reserved\.?|advertisement)$/i;

export function segmentSource(source: string) {
  const normalized = source
    .replace(/\r\n?/g, "\n")
    .replace(/\p{Cc}/gu, (character) =>
      character === "\n" || character === "\t" ? character : "",
    )
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => !sourceNoise.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const bytes = Buffer.from(normalized, "utf8");
  const text = bytes.toString("utf8");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const chunks: {
    chunk_id: string;
    position: number;
    start_byte: number;
    end_byte: number;
    text: string;
  }[] = [];
  let start = 0;
  const limit = Math.min(maxEvidenceBytes, bytes.length);

  while (start < limit) {
    let end = Math.min(start + maxChunkBytes, limit);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    if (end < limit) {
      const paragraphBreak = bytes.lastIndexOf("\n", end - 1);
      const wordBreak = bytes.lastIndexOf(" ", end - 1);
      if (paragraphBreak > start + maxChunkBytes / 2) end = paragraphBreak + 1;
      else if (wordBreak > start + maxChunkBytes / 2) end = wordBreak + 1;
    }
    if (end <= start) break;
    const position = chunks.length;
    chunks.push({
      chunk_id: `ch_${hash.slice(0, 16)}_${position + 1}`,
      position,
      start_byte: start,
      end_byte: end,
      text: bytes.toString("utf8", start, end),
    });
    start = end;
  }
  return { text, hash, chunks };
}
