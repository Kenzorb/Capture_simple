import { browser } from "wxt/browser";
import { extensionAuthConfig } from "../auth/config";
import type { ExtensionStatus } from "../auth/message";
import { extensionSession } from "../auth/session";

export default defineBackground(() => {
  const config = extensionAuthConfig();
  const handle =
    config &&
    browser.runtime.id === config.extensionId &&
    browser.identity.getRedirectURL("capture-auth") === config.redirectUri
      ? extensionSession(config)
      : null;
  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      if (
        sender.id !== browser.runtime.id ||
        sender.url !== browser.runtime.getURL("/popup.html") ||
        (message !== "status" &&
          message !== "connect" &&
          message !== "disconnect")
      )
        return;
      if (!handle) {
        sendResponse({ state: "unconfigured" } satisfies ExtensionStatus);
        return;
      }
      void handle(message).then(sendResponse, () =>
        sendResponse({
          state: "unavailable",
        } satisfies ExtensionStatus),
      );
      return true;
    },
  );
});
