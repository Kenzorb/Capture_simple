import { canonicalizeCaptureUrl } from "@capture/shared";

export function tabMetadata(tab: { url?: string; title?: string } | undefined) {
  const page = tab?.url && canonicalizeCaptureUrl(tab.url);
  if (!page || page.domain === "chromewebstore.google.com") return null;
  if (
    page.domain === "chrome.google.com" &&
    /^\/webstore(?:\/|$)/.test(new URL(page.url).pathname)
  )
    return null;

  return {
    url: page.url,
    title: tab.title?.trim().slice(0, 500).toWellFormed() || page.domain,
    domain: page.domain,
  };
}
