import { browser } from "wxt/browser";
import type { Account, ExtensionCommand, ExtensionStatus } from "./message";
import {
  callbackCode,
  exchange,
  makeAttempt,
  type ExtensionAuthConfig,
  type PendingAttempt,
  type Tokens,
} from "./oauth";

const sessionKey = "capture.session";
const attemptKey = "capture.pending";

function validTokens(value: unknown): value is Tokens {
  return (
    typeof value === "object" &&
    value !== null &&
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    !!value.accessToken &&
    "refreshToken" in value &&
    typeof value.refreshToken === "string" &&
    !!value.refreshToken &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number" &&
    Number.isSafeInteger(value.expiresAt)
  );
}

async function readAccount(config: ExtensionAuthConfig, tokens: Tokens) {
  try {
    const response = await fetch(new URL("/api/me", config.web), {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 401) return "reconnect";
    if (!response.ok) return "unavailable";
    const value = await response.json();
    if (
      typeof value?.id !== "string" ||
      (value.email !== null && typeof value.email !== "string") ||
      (value.displayName !== null && typeof value.displayName !== "string")
    )
      return "unavailable";
    const account: Account = {
      id: value.id,
      email: value.email,
      displayName: value.displayName,
    };
    return account;
  } catch {
    return "unavailable";
  }
}

export function extensionSession(config: ExtensionAuthConfig) {
  const environment = [
    config.web,
    config.auth,
    config.clientId,
    config.extensionId,
  ].join("|");
  let generation = 0;
  let sessionAbort = new AbortController();
  let connecting = false;
  let disconnected = false;
  let outcome: ExtensionStatus = { state: "ready" };
  let statusRequest: Promise<ExtensionStatus> | undefined;
  let refreshRequest:
    { attempt: number; result: ReturnType<typeof exchange> } | undefined;

  function advanceSession() {
    generation++;
    sessionAbort.abort();
    sessionAbort = new AbortController();
  }

  async function readTokens(attempt: number) {
    const stored = (await browser.storage.local.get(sessionKey))[sessionKey] as
      { environment?: string; tokens?: unknown } | undefined;
    if (generation !== attempt) return null;
    if (stored?.environment === environment && validTokens(stored.tokens))
      return stored.tokens;
    if (stored) await browser.storage.local.remove(sessionKey);
    return null;
  }

  async function invalidate(attempt: number) {
    if (generation !== attempt) return;
    advanceSession();
    outcome = { state: "reconnect" };
    await browser.storage.local.remove(sessionKey);
  }

  async function write(tokens: Tokens, attempt: number) {
    if (generation !== attempt) return false;
    await browser.storage.local.set({ [sessionKey]: { environment, tokens } });
    return generation === attempt;
  }

  async function refresh(tokens: Tokens, attempt: number) {
    const current = await readTokens(attempt);
    if (!current) return { error: "reconnect" as const };
    if (
      current.refreshToken !== tokens.refreshToken ||
      current.accessToken !== tokens.accessToken
    )
      return { tokens: current };
    if (refreshRequest?.attempt === attempt) return refreshRequest.result;
    const result = (async () => {
      const updated = await exchange(config, {
        refreshToken: tokens.refreshToken,
      });
      if ("error" in updated) return updated;
      return (await write(updated.tokens, attempt))
        ? updated
        : { error: "reconnect" as const };
    })();
    const pending = { attempt, result };
    refreshRequest = pending;
    try {
      return await result;
    } finally {
      if (refreshRequest === pending) refreshRequest = undefined;
    }
  }

  async function connect(attempt: number): Promise<ExtensionStatus> {
    try {
      const { pending, url } = await makeAttempt(config);
      if (generation !== attempt) return { state: "disconnected" };
      await browser.storage.session.set({ [attemptKey]: pending });
      const callback = await browser.identity.launchWebAuthFlow({
        url,
        interactive: true,
      });
      if (generation !== attempt) return { state: "disconnected" };
      const saved = (await browser.storage.session.get(attemptKey))[
        attemptKey
      ] as PendingAttempt | undefined;
      await browser.storage.session.remove(attemptKey);
      if (generation !== attempt) return { state: "disconnected" };
      const code =
        saved?.state === pending.state && callback
          ? callbackCode(callback, pending)
          : null;
      if (!code) return { state: "reconnect" };
      const result = await exchange(config, {
        code,
        verifier: pending.verifier,
      });
      if ("error" in result) return { state: result.error };
      if (generation !== attempt) return { state: "disconnected" };
      const account = await readAccount(config, result.tokens);
      if (typeof account === "string") return { state: account };
      return (await write(result.tokens, attempt))
        ? { state: "connected", account }
        : { state: "disconnected" };
    } catch {
      return { state: "reconnect" };
    } finally {
      if (generation === attempt)
        await browser.storage.session.remove(attemptKey).catch(() => {});
    }
  }

  async function status(attempt: number): Promise<ExtensionStatus> {
    const tokens = await readTokens(attempt);
    if (generation !== attempt) return { state: "disconnected" };
    if (!tokens) {
      return outcome.state === "connected" ? { state: "reconnect" } : outcome;
    }
    const initial =
      tokens.expiresAt - Date.now() > 60000
        ? await readAccount(config, tokens)
        : "reconnect";
    if (generation !== attempt) return { state: "disconnected" };
    if (initial !== "reconnect")
      return typeof initial === "string"
        ? { state: initial }
        : { state: "connected", account: initial };
    const result = await refresh(tokens, attempt);
    if (generation !== attempt) return { state: "disconnected" };
    if ("tokens" in result) {
      const account = await readAccount(config, result.tokens);
      if (generation !== attempt) return { state: "disconnected" };
      if (typeof account !== "string") return { state: "connected", account };
      if (account === "unavailable") return { state: account };
    } else if (result.error === "unavailable") return { state: result.error };
    await invalidate(attempt);
    return outcome;
  }

  async function handle(command: ExtensionCommand): Promise<ExtensionStatus> {
    await browser.storage.local.setAccessLevel({
      accessLevel: "TRUSTED_CONTEXTS",
    });
    if (command === "disconnect") {
      advanceSession();
      connecting = false;
      disconnected = true;
      outcome = { state: "disconnected" };
      await Promise.all([
        browser.storage.local.remove(sessionKey),
        browser.storage.session.remove(attemptKey),
      ]);
      await browser.tabs.create({
        url: new URL("/oauth/extension-access", config.web).href,
      });
      return outcome;
    }
    if (connecting) return { state: "connecting" };
    if (command === "connect") {
      advanceSession();
      const attempt = generation;
      connecting = true;
      disconnected = false;
      try {
        await browser.storage.local.remove(sessionKey);
      } catch {
        connecting = false;
        return { state: "connect-unavailable" };
      }
      void connect(attempt).then((result) => {
        if (generation !== attempt) return;
        outcome =
          result.state === "unavailable"
            ? { state: "connect-unavailable" }
            : result;
        connecting = false;
      });
      return { state: "connecting" };
    }
    if (disconnected) return outcome;
    if (statusRequest) return statusRequest;
    const request = status(generation);
    statusRequest = request;
    try {
      return await request;
    } finally {
      if (statusRequest === request) statusRequest = undefined;
    }
  }

  async function authorize(
    accountId: string,
    send: (accessToken: string, signal: AbortSignal) => Promise<Response>,
  ): Promise<Response | "reconnect" | "unavailable"> {
    const attempt = generation;
    const signal = sessionAbort.signal;
    const account = await handle("status");
    if (signal.aborted) return "reconnect";
    if (account.state !== "connected")
      return account.state === "unavailable" ? "unavailable" : "reconnect";
    if (account.account.id !== accountId) return "reconnect";
    const tokens = await readTokens(attempt);
    if (!tokens || signal.aborted) return "reconnect";
    let response = await send(tokens.accessToken, signal);
    if (signal.aborted) return "reconnect";
    if (response.status !== 401) return response;

    const refreshed = await refresh(tokens, attempt);
    if (signal.aborted) return "reconnect";
    if ("error" in refreshed) {
      if (refreshed.error === "reconnect") await invalidate(attempt);
      return refreshed.error;
    }
    response = await send(refreshed.tokens.accessToken, signal);
    if (signal.aborted) return "reconnect";
    if (response.status !== 401) return response;
    await invalidate(attempt);
    return "reconnect";
  }

  return { handle, authorize };
}
