import { canonicalizeCaptureUrl, canonicalizeManualUrl } from "@capture/shared";
import { expect, test } from "vitest";

test("normalizes HTTP syntax and strips known tracking from only the canonical URL", () => {
  expect(
    canonicalizeCaptureUrl(
      " HTTPS://Example.COM:443/articles/../guide?utm_source=mail&page=2&fbclid=x#heading ",
    ),
  ).toEqual({
    url: "https://example.com/guide?utm_source=mail&page=2&fbclid=x#heading",
    canonicalUrl: "https://example.com/guide?page=2",
    domain: "example.com",
  });
});

test("preserves content parameters, encodings, duplicates, and hash routes", () => {
  const url =
    "https://example.com/?ref=api&a=%20&a=~&%75tm_medium=email#/docs?q=2";
  expect(canonicalizeCaptureUrl(url)?.canonicalUrl).toBe(
    "https://example.com/?ref=api&a=%20&a=~#/docs?q=2",
  );
  expect(
    canonicalizeCaptureUrl("https://example.com/?page=1")?.canonicalUrl,
  ).not.toBe(
    canonicalizeCaptureUrl("https://example.com/?page=2")?.canonicalUrl,
  );
  expect(
    canonicalizeCaptureUrl("https://example.com/#!/chapter")?.canonicalUrl,
  ).toBe("https://example.com/#!/chapter");
});

test("normalizes international hostnames without conflating a redirect and its destination", () => {
  expect(canonicalizeCaptureUrl("https://bücher.example:8443/")?.domain).toBe(
    "xn--bcher-kva.example",
  );
  const redirect =
    "https://short.example/go?next=https%3A%2F%2Fexample.com%2Fguide";
  expect(canonicalizeCaptureUrl(redirect)?.canonicalUrl).toBe(redirect);
  expect(canonicalizeCaptureUrl(redirect)?.canonicalUrl).not.toBe(
    canonicalizeCaptureUrl("https://example.com/guide")?.canonicalUrl,
  );
});

test.each([
  "",
  "https:example.com",
  "https:///example.com",
  "//example.com/guide",
  "javascript:alert(1)",
  "file:///guide.html",
  "https://author:secret@example.com/guide",
  "https://example.com\\guide",
  "https://exa mple.com/guide",
  "https://example.com/" + "a".repeat(4096),
])("rejects an invalid or unsupported URL (%#)", (input) => {
  expect(canonicalizeCaptureUrl(input)).toBeNull();
});

test("manual capture accepts public domain names and retains the original URL", () => {
  expect(
    canonicalizeManualUrl("https://example.com:8443/unavailable")?.url,
  ).toBe("https://example.com:8443/unavailable");
  expect(
    canonicalizeManualUrl("https://bücher.example.com/article")?.domain,
  ).toBe("xn--bcher-kva.example.com");
});

test.each([
  "http://localhost.",
  "http://127.1/",
  "http://2130706433/",
  "http://169.254.169.254/",
  "http://[::ffff:127.0.0.1]/",
  "https://metadata.google.internal/",
  "https://router.home.arpa/",
  "https://localserver/",
  "https://abc..example.com/",
])("manual capture rejects a local or invalid target (%#)", (input) => {
  expect(canonicalizeManualUrl(input)).toBeNull();
});
