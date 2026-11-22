import {
  apiErrorSchema,
  articleParamsSchema,
  captureRequestSchema,
  captureResponseSchema,
  type ApiError,
  type CaptureRequest,
  type CaptureResponse,
} from "@capture/shared";
import { browser } from "wxt/browser";
import type { extensionSession } from "../auth/session";

export type CaptureDraft = Omit<CaptureRequest, "request_id">;
export type CaptureResult = CaptureResponse | ApiError;

const captureDraftSchema = captureRequestSchema.omit({ request_id: true });
const registryKey = "capture.requestIds";

export function errorResult(
  code: ApiError["error"]["code"],
  message: string,
): ApiError {
  return { error: { code, message } };
}

export function submittedCapture(message: unknown) {
  if (
    typeof message !== "object" ||
    !message ||
    !("kind" in message) ||
    message.kind !== "capture" ||
    !("draft" in message) ||
    !("accountId" in message)
  )
    return null;
  const account = articleParamsSchema.safeParse({ id: message.accountId });
  const draft = captureDraftSchema.safeParse(message.draft);
  if (
    !account.success ||
    !draft.success ||
    draft.data.source !== "chrome_extension"
  )
    return null;
  return { accountId: account.data.id, draft: draft.data };
}

type RequestEntry = { fingerprint: string; id: string };

export function captureSubmission(
  webOrigin: string,
  authorize: ReturnType<typeof extensionSession>["authorize"],
) {
  const endpoint = new URL("/api/captures", webOrigin);
  const inFlight = new Map<string, Promise<CaptureResult>>();
  let writes = Promise.resolve();

  function requestId(fingerprint: string) {
    const write = writes.then(async () => {
      const stored = (await browser.storage.session.get(registryKey))[
        registryKey
      ];
      const entries = Array.isArray(stored) ? (stored as RequestEntry[]) : [];
      const id =
        entries.find((entry) => entry.fingerprint === fingerprint)?.id ??
        crypto.randomUUID();
      // Keep only IDs and draft fingerprints. No page text or note is persisted.
      await browser.storage.session.set({
        [registryKey]: [
          { fingerprint, id },
          ...entries
            .filter((entry) => entry.fingerprint !== fingerprint)
            .slice(0, 31),
        ],
      });
      return id;
    });
    writes = write.then(
      () => undefined,
      () => undefined,
    );
    return write;
  }

  async function save(
    accountId: string,
    draft: CaptureDraft,
    fingerprint: string,
  ) {
    try {
      const id = await requestId(fingerprint);
      const body = JSON.stringify({ request_id: id, ...draft });
      const response = await authorize(
        accountId,
        (accessToken, sessionSignal) =>
          fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body,
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
            signal: AbortSignal.any([
              sessionSignal,
              AbortSignal.timeout(12000),
            ]),
          }),
      );
      if (response === "reconnect")
        return errorResult("unauthenticated", "Reconnect Capture.");
      if (response !== "unavailable") {
        const body: unknown = await response.json();
        const parsed = response.ok
          ? captureResponseSchema.safeParse(body)
          : apiErrorSchema.safeParse(body);
        if (parsed.success) return parsed.data;
      }
    } catch {
      // A lost response does not tell us whether the article was already saved.
    }
    return errorResult(
      "unavailable",
      "Capture could not confirm the save. Try again.",
    );
  }

  return async function submit(accountId: string, draft: CaptureDraft) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify([webOrigin, accountId, draft])),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const existing = inFlight.get(fingerprint);
    if (existing) return existing;
    const pending = save(accountId, draft, fingerprint);
    inFlight.set(fingerprint, pending);
    try {
      return await pending;
    } finally {
      inFlight.delete(fingerprint);
    }
  };
}
