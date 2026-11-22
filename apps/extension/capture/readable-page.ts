import { browser } from "wxt/browser";
import { snapshotPage } from "./page-snapshot";
import { parseReadableArticle } from "./readable-article";
import { tabMetadata } from "./tab-metadata";

export async function readActivePage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const page = tabMetadata(tab);
  if (!page) return null;

  const fallback = { ...page, extractedText: null, byline: null };
  if (tab?.id === undefined) return fallback;
  try {
    const [frame] = await browser.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      world: "ISOLATED",
      func: snapshotPage,
      args: [page.url],
    });
    if (!frame?.result) return fallback;
    const article = parseReadableArticle(frame.result);
    if (!article) return fallback;

    return {
      ...page,
      title: article.title?.slice(0, 500).toWellFormed() || page.title,
      byline: article.byline?.slice(0, 250).toWellFormed() || null,
      extractedText: article.extractedText,
    };
  } catch {
    return fallback;
  }
}
