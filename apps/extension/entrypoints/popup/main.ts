import { browser } from "wxt/browser";
import type { ExtensionCommand, ExtensionStatus } from "../../auth/message";

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const connect = document.querySelector<HTMLButtonElement>("#connect")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;
const disconnect = document.querySelector<HTMLButtonElement>("#disconnect")!;
let timer: ReturnType<typeof setTimeout> | undefined;

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

connect.addEventListener("click", () => void send("connect"));
retry.addEventListener("click", () => void send("status"));
disconnect.addEventListener("click", () => void send("disconnect"));
void send("status");
