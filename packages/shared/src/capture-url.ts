export const maxCaptureUrlLength = 4096;

const trackingKeys = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "gclid",
  "dclid",
  "fbclid",
  "msclkid",
]);

export function canonicalizeCaptureUrl(input: string) {
  const candidate = input.trim();
  if (
    candidate.length > maxCaptureUrlLength ||
    !/^https?:\/\/[^/]/i.test(candidate) ||
    /[\\\s]/.test(candidate) ||
    !URL.canParse(candidate)
  ) {
    return null;
  }

  const target = new URL(candidate);
  const url = target.href;
  if (target.username || target.password || url.length > maxCaptureUrlLength) {
    return null;
  }

  const queryParts = target.search.slice(1).split("&");
  const retainedQuery = queryParts.filter((part) => {
    const key = new URLSearchParams(part).keys().next().value;
    return key === undefined || !trackingKeys.has(key);
  });
  // Keep original order, duplicates, and encoding for content-affecting parameters.
  if (retainedQuery.length !== queryParts.length) {
    target.search = retainedQuery.join("&");
  }
  if (!/^#(?:\/|!|\?)/.test(target.hash)) target.hash = "";

  return { url, canonicalUrl: target.href, domain: target.hostname };
}

export function canonicalizeManualUrl(input: string) {
  const target = canonicalizeCaptureUrl(input);
  if (!target) return null;

  const hostname = target.domain.replace(/\.$/, "");
  const labels = hostname.split(".");
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    ) ||
    !/[a-z]/.test(labels.at(-1) ?? "") ||
    /(?:^|\.)(?:localhost|local|lan|internal|home|home\.arpa|onion|test|invalid|example)$/.test(
      hostname,
    )
  ) {
    return null;
  }
  return target;
}
