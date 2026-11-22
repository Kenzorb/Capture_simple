import { browser } from "wxt/browser";
import { extensionAuthConfig } from "../auth/config";
import type { ExtensionStatus } from "../auth/message";
import { extensionSession } from "../auth/session";
import {
  captureSubmission,
  errorResult,
  submittedCapture,
} from "../capture/submission";

export default defineBackground(() => {
  const config = extensionAuthConfig();
  const session =
    config &&
    browser.runtime.id === config.extensionId &&
    browser.identity.getRedirectURL("capture-auth") === config.redirectUri
      ? extensionSession(config)
      : null;
  const submit =
    session && config ? captureSubmission(config.web, session.authorize) : null;
  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      if (
        sender.id !== browser.runtime.id ||
        sender.url !== browser.runtime.getURL("/popup.html")
      )
        return;
      if (
        typeof message === "object" &&
        message &&
        "kind" in message &&
        message.kind === "capture"
      ) {
        const request = submittedCapture(message);
        if (!request || !submit) {
          sendResponse(
            request
              ? errorResult("unauthenticated", "Connect Capture.")
              : errorResult("invalid_input", "Capture the page again."),
          );
          return;
        }
        void submit(request.accountId, request.draft).then(sendResponse, () =>
          sendResponse(
            errorResult("unavailable", "Capture could not confirm the save."),
          ),
        );
        return true;
      }
      if (
        message !== "status" &&
        message !== "connect" &&
        message !== "disconnect"
      )
        return;
      if (!session) {
        sendResponse({ state: "unconfigured" } satisfies ExtensionStatus);
        return;
      }
      void session.handle(message).then(sendResponse, () =>
        sendResponse({
          state: "unavailable",
        } satisfies ExtensionStatus),
      );
      return true;
    },
  );
});
