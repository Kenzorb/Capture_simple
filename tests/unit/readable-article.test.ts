// @vitest-environment jsdom

import { maxExtractedTextBytes } from "@capture/shared";
import { expect, it } from "vitest";
import { parseReadableArticle } from "../../apps/extension/capture/readable-article";

it("preserves title, author, and paragraph breaks in plain text", () => {
  const paragraph =
    "A useful article paragraph about the selected topic. ".repeat(12);
  const result = parseReadableArticle({
    html: `<title>Fixture article</title><article><p>${paragraph}</p><p>Next paragraph. ${paragraph}</p></article>`,
    author: "Fixture Author",
  });
  expect(result?.title).toBe("Fixture article");
  expect(result?.byline).toBe("Fixture Author");
  expect(result?.extractedText).toContain("\n\nNext paragraph.");
  expect(result?.extractedText).not.toContain("<p>");
});

it("cuts long articles at a UTF-8 character boundary within the capture budget", () => {
  const result = parseReadableArticle({
    html: `<title>Long fixture</title><article><p>A${"🌱".repeat(30_000)}</p></article>`,
  });
  expect(result).not.toBeNull();
  const text = result?.extractedText ?? "";
  expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
    maxExtractedTextBytes,
  );
  expect(text.endsWith("🌱")).toBe(true);
  expect(text).not.toContain("\ufffd");
});

it("falls back for a page without article content", () => {
  expect(
    parseReadableArticle({
      html: "<title>Sign in</title><p>Enter your email.</p>",
    }),
  ).toBeNull();
});
