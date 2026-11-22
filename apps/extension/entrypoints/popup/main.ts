import { browser } from "wxt/browser";
import { extensionAuthConfig } from "../../auth/config";
import type { ExtensionCommand, ExtensionStatus } from "../../auth/message";
import { captureLinks } from "../../capture/links";
import { readActivePage } from "../../capture/readable-page";
import { bindCaptureForm } from "./capture-form";

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const connect = document.querySelector<HTMLButtonElement>("#connect")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;
const disconnect = document.querySelector<HTMLButtonElement>("#disconnect")!;
const capture = document.querySelector<HTMLButtonElement>("#capture")!;
const captureStatus =
  document.querySelector<HTMLParagraphElement>("#capture-status")!;
const details = document.querySelector<HTMLDListElement>("#page-details")!;
const pageTitle = document.querySelector<HTMLElement>("#page-title")!;
const pageDomain = document.querySelector<HTMLElement>("#page-domain")!;
const pageUrl = document.querySelector<HTMLElement>("#page-url")!;
const pageAuthor = document.querySelector<HTMLElement>("#page-author")!;
const authorLabel = document.querySelector<HTMLElement>("#page-author-label")!;
const articlePreview =
  document.querySelector<HTMLDetailsElement>("#article-preview")!;
const excerpt =
  document.querySelector<HTMLParagraphElement>("#article-excerpt")!;
const config = extensionAuthConfig();
const links = config && captureLinks(config.web);
const libraryLink = document.querySelector<HTMLAnchorElement>("#open-library")!;
if (links) {
  libraryLink.href = links.library;
  libraryLink.hidden = false;
}
let accountId: string | undefined;
const setCapturePage = bindCaptureForm(
  document.querySelector<HTMLFormElement>("#capture-form")!,
  document.querySelector<HTMLElement>("#save-status")!,
  config
    ? async (draft) => {
        if (!accountId)
          return {
            error: { code: "unauthenticated", message: "Connect Capture." },
          };
        return browser.runtime.sendMessage({
          kind: "capture",
          accountId,
          draft,
        });
      }
    : undefined,
  links?.article,
);
let timer: ReturnType<typeof setTimeout> | undefined;

function clearPreview() {
  setCapturePage(null);
  details.hidden = true;
  captureStatus.textContent = "";
  pageTitle.textContent = "";
  pageDomain.textContent = "";
  pageUrl.textContent = "";
  pageAuthor.textContent = "";
  pageAuthor.hidden = authorLabel.hidden = true;
  articlePreview.open = false;
  articlePreview.hidden = true;
  excerpt.textContent = "";
}

function render(result: ExtensionStatus) {
  const { state } = result;
  accountId = state === "connected" ? result.account.id : undefined;
  const message = {
    ready: "Connect your Capture account to continue.",
    unconfigured: "Extension connection is unavailable in this build.",
    connecting: "Finish connecting in the Capture window.",
    "connect-unavailable":
      "Could not finish connecting. Try Connect Capture again.",
    reconnect: "Connection ended. Connect Capture to continue.",
    unavailable: "Could not check your connection. Try again.",
    disconnected: "Disconnected from this extension.",
  };
  status.textContent =
    state === "connected"
      ? `Connected as ${result.account.email ?? result.account.displayName ?? "your Capture account"}.`
      : message[state];
  connect.hidden =
    state !== "ready" &&
    state !== "reconnect" &&
    state !== "disconnected" &&
    state !== "connect-unavailable";
  retry.hidden = state !== "unavailable";
  disconnect.hidden = state !== "connected" && state !== "unavailable";
  capture.hidden = state !== "connected";
  if (capture.hidden) clearPreview();
  if (state === "connecting")
    timer = setTimeout(() => void send("status"), 1200);
}

async function send(command: ExtensionCommand) {
  clearTimeout(timer);
  for (const button of [connect, retry, disconnect]) button.disabled = true;
  try {
    render((await browser.runtime.sendMessage(command)) as ExtensionStatus);
  } catch {
    render({ state: "unavailable" });
  } finally {
    for (const button of [connect, retry, disconnect]) button.disabled = false;
  }
}

async function previewActiveTab() {
  if (capture.hidden || capture.disabled) return;
  const returnFocus = document.activeElement === capture;
  clearPreview();
  capture.disabled = true;
  try {
    captureStatus.textContent = "Reading page…";
    const page = await readActivePage();
    if (capture.hidden) return;
    if (!page) {
      captureStatus.textContent =
        "Capture can’t read this page. Open a regular website and try again.";
      return;
    }
    pageTitle.textContent = page.title;
    pageDomain.textContent = page.domain;
    pageUrl.textContent = page.url;
    details.hidden = false;
    setCapturePage(page);
    if (page.byline) {
      pageAuthor.textContent = page.byline;
      pageAuthor.hidden = authorLabel.hidden = false;
    }
    if (page.extractedText) {
      const previewLimit = 600;
      excerpt.textContent =
        page.extractedText.length > previewLimit
          ? `${page.extractedText.slice(0, previewLimit).trimEnd().toWellFormed()}…`
          : page.extractedText;
      articlePreview.hidden = false;
      captureStatus.textContent = "Readable text found.";
    } else {
      captureStatus.textContent =
        "Only the page link is available. Capture couldn’t find readable text.";
    }
  } catch {
    if (!capture.hidden)
      captureStatus.textContent = "Could not read the active tab. Try again.";
  } finally {
    capture.disabled = false;
    if (
      returnFocus &&
      (document.activeElement === document.body ||
        document.activeElement === capture)
    ) {
      if (details.hidden) capture.focus();
      else pageTitle.focus();
    }
  }
}

connect.addEventListener("click", () => void send("connect"));
retry.addEventListener("click", () => void send("status"));
disconnect.addEventListener("click", () => void send("disconnect"));
capture.addEventListener("click", () => void previewActiveTab());
void send("status");
