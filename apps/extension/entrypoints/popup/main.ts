import { browser } from "wxt/browser";
import type { ExtensionCommand, ExtensionStatus } from "../../auth/message";
import { tabMetadata } from "../../capture/tab-metadata";

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
let timer: ReturnType<typeof setTimeout> | undefined;

function clearPreview() {
  details.hidden = true;
  captureStatus.textContent = "";
  pageTitle.textContent = "";
  pageDomain.textContent = "";
  pageUrl.textContent = "";
}

function render(result: ExtensionStatus) {
  const { state } = result;
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
  clearPreview();
  capture.disabled = true;
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (capture.hidden) return;
    const page = tabMetadata(tab);
    if (!page) {
      captureStatus.textContent =
        "Capture can’t read this page. Open a regular website and try again.";
      return;
    }
    pageTitle.textContent = page.title;
    pageDomain.textContent = page.domain;
    pageUrl.textContent = page.url;
    details.hidden = false;
    captureStatus.textContent = "Page details read.";
  } catch {
    if (!capture.hidden)
      captureStatus.textContent = "Could not read the active tab. Try again.";
  } finally {
    capture.disabled = false;
  }
}

connect.addEventListener("click", () => void send("connect"));
retry.addEventListener("click", () => void send("status"));
disconnect.addEventListener("click", () => void send("disconnect"));
capture.addEventListener("click", () => void previewActiveTab());
void send("status");
