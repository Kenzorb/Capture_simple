import { canonicalizeManualUrl } from "@capture/shared";
import { readableHtml } from "./source-html";
import {
  publicAddress,
  sourceNetwork,
  type SourceNetwork,
  type SourceResponse,
} from "./source-network";

const maxSourceBytes = 512 * 1024;
const maxRedirects = 3;
const redirectCodes = new Set([301, 302, 303, 307, 308]);

type SourceResult =
  | { status: "ready"; text: string; method: "capture" | "http" }
  | { status: "unsupported" | "unavailable" };

function publicUrl(value: string) {
  const parsed = canonicalizeManualUrl(value);
  if (!parsed) return null;
  const url = new URL(parsed.url);
  // URL strips explicitly supplied default ports.
  if (url.port) return null;
  url.hash = "";
  return url;
}

function header(response: SourceResponse, name: string) {
  const value = response.headers[name];
  return typeof value === "string" ? value : undefined;
}

async function readText(response: SourceResponse) {
  const type = header(response, "content-type") ?? "";
  const mediaType = type.split(";", 1)[0].trim().toLowerCase();
  const encoding = header(response, "content-encoding");
  const length = header(response, "content-length");
  if (
    !["text/html", "application/xhtml+xml", "text/plain"].includes(mediaType) ||
    (encoding && encoding.trim().toLowerCase() !== "identity") ||
    (length !== undefined &&
      (!/^\d+$/.test(length) || +length > maxSourceBytes))
  )
    return null;

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > maxSourceBytes) return null;
    chunks.push(chunk);
  }
  const charset = /;\s*charset\s*=\s*["']?([\w-]+)/i.exec(type)?.[1] ?? "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    return null;
  }
  const decoded = decoder.decode(Buffer.concat(chunks, bytes));
  return mediaType === "text/plain" ? decoded : readableHtml(decoded);
}

async function withinDeadline<T>(operation: Promise<T>, signal: AbortSignal) {
  signal.throwIfAborted();
  let abort: () => void = () => {};
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export async function prepareSource(
  { url, capturedText }: { url: string; capturedText: string | null },
  network: SourceNetwork = sourceNetwork,
  signal = AbortSignal.timeout(12_000),
): Promise<SourceResult> {
  if (capturedText?.trim())
    return { status: "ready", text: capturedText, method: "capture" };

  let target = publicUrl(url);
  try {
    for (let hop = 0; target && hop <= maxRedirects; hop++) {
      signal.throwIfAborted();
      const addresses = await withinDeadline(
        network.resolve(target.hostname),
        signal,
      );
      if (!addresses.length || !addresses.every(publicAddress)) break;
      const response = await network.request(target, addresses[0], signal);
      try {
        if (redirectCodes.has(response.status)) {
          const location = header(response, "location");
          const next = location && URL.parse(location, target);
          target = next ? publicUrl(next.href) : null;
          continue;
        }
        if (response.status === 429 || response.status >= 500)
          return { status: "unavailable" };
        if (response.status !== 200) break;
        const text = await readText(response);
        if (text?.trim()) return { status: "ready", text, method: "http" };
        break;
      } finally {
        response.close();
      }
    }
    return { status: "unsupported" };
  } catch {
    return { status: "unavailable" };
  }
}
