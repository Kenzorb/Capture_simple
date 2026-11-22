import { maxExtractedTextBytes } from "@capture/shared";
import { isProbablyReaderable, Readability } from "@mozilla/readability";

function boundedText(value: string) {
  const bytes = new TextEncoder().encode(
    value
      .replaceAll("\u0000", "")
      .replace(/\n(?:[\t ]*\n){2,}/g, "\n\n")
      .trim(),
  );
  let length = Math.min(bytes.length, maxExtractedTextBytes);
  // Move back to a UTF-8 character boundary before decoding a truncated buffer.
  while (((bytes[length] ?? 0) & 0xc0) === 0x80) length--;
  return new TextDecoder().decode(bytes.subarray(0, length)).trim();
}

export function parseReadableArticle(snapshot: {
  html: string;
  author?: string;
}) {
  const document = new DOMParser().parseFromString(snapshot.html, "text/html");
  if (!isProbablyReaderable(document)) return null;
  const article = new Readability(document, {
    disableJSONLD: true,
    maxElemsToParse: 8000,
    serializer: (node) => {
      // Serialize only text while preserving useful block boundaries.
      if (node instanceof Element) {
        for (const block of node.querySelectorAll(
          "p,pre,h1,h2,h3,h4,h5,h6,li,dt,dd,br,tr",
        )) {
          block.after("\n\n");
        }
      }
      return node.textContent ?? "";
    },
  }).parse();
  if (!article?.content) return null;
  const extractedText = boundedText(article.content);
  if (extractedText.length < 500) return null;
  return {
    title: article.title?.trim(),
    byline: article.byline?.trim() || snapshot.author?.trim(),
    extractedText,
  };
}
