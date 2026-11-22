import { Buffer } from "node:buffer";
import { maxCaptureUrlLength } from "@capture/shared";

const maxBodyBytes = 128 * 1024;
const maxExtractedTextBytes = 100_000;

export function exceedsCaptureFieldBudget(input: unknown) {
  if (!input || typeof input !== "object") return false;
  return (
    ("url" in input &&
      typeof input.url === "string" &&
      Buffer.byteLength(input.url) > maxCaptureUrlLength) ||
    ("extracted_text" in input &&
      typeof input.extracted_text === "string" &&
      Buffer.byteLength(input.extracted_text) > maxExtractedTextBytes)
  );
}

export async function readCaptureJson(request: Request) {
  const encoding = request.headers
    .get("content-encoding")
    ?.trim()
    .toLowerCase();
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0];
  if (
    !request.body ||
    mediaType?.trim().toLowerCase() !== "application/json" ||
    (encoding && encoding !== "identity")
  ) {
    return { status: "invalid" } as const;
  }
  if (Number(request.headers.get("content-length")) > maxBodyBytes) {
    return { status: "too_large" } as const;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        return { status: "too_large" } as const;
      }
      chunks.push(value);
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks, bytes),
    );
    return { status: "ok", data: JSON.parse(text) as unknown } as const;
  } catch {
    return { status: "invalid" } as const;
  } finally {
    reader.releaseLock();
  }
}

export function logCaptureRejection(
  code: "payload_too_large" | "rate_limited",
) {
  console.warn("capture_request_rejected", { code });
}
