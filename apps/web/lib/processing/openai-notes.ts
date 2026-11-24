import "server-only";
import {
  structuredNoteJsonSchema,
  structuredNoteSchema,
  structuredNoteVersion,
} from "@capture/shared";
import { setTimeout as delay } from "node:timers/promises";
import {
  buildGroundedNotePrompt,
  readGroundedNoteOutput,
} from "./grounded-note";

export const defaultNoteModel = "gpt-5.6-luna";
const endpoint = "https://api.openai.com/v1/responses";
const maxOutputTokens = 1_800;
const maxResponseBytes = 128 * 1024;
const maxAttempts = 3;
const requestTimeoutMs = 30_000;
const retryBudgetMs = 42_000;
const compactInstruction =
  "Keep the output concise. Use at most three takeaways, three sections with at most two points each, three concepts, and one topic path.";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tokenCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

async function readProviderJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxResponseBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks, bytes),
    );
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readResponse(value: unknown) {
  const response = record(value);
  if (response?.status !== "completed" || !Array.isArray(response.output))
    return null;

  const items = response.output.map(record);
  if (
    items.some((item) => item?.type !== "message" && item?.type !== "reasoning")
  )
    return null;
  const messages = items.filter((item) => item?.type === "message");
  const message = messages[0];
  if (
    messages.length !== 1 ||
    message?.role !== "assistant" ||
    !Array.isArray(message.content)
  )
    return null;
  const part = record(message.content[0]);
  if (
    message.content.length !== 1 ||
    part?.type !== "output_text" ||
    typeof part.text !== "string" ||
    Buffer.byteLength(part.text) > 24_000
  )
    return null;

  const output = readGroundedNoteOutput(JSON.parse(part.text));
  if (!output) return null;
  const note = structuredNoteSchema.safeParse({
    ...output,
    schema_version: structuredNoteVersion,
    model: response.model,
  });
  const usage = record(response.usage);
  const inputTokens = tokenCount(usage?.input_tokens);
  const outputTokens = tokenCount(usage?.output_tokens);
  if (!note.success || inputTokens === null || outputTokens === null)
    return null;
  return { note: note.data, usage: { inputTokens, outputTokens } };
}

export async function generateOpenAiNote(
  chunks: Parameters<typeof buildGroundedNotePrompt>[0],
  send: typeof fetch = fetch,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { status: "not_configured" } as const;
  const prompt = buildGroundedNotePrompt(chunks);
  if (!prompt) return { status: "invalid_input" } as const;

  const model = process.env.OPENAI_MODEL?.trim() || defaultNoteModel;
  const request = {
    ...prompt,
    model,
    store: false,
    max_output_tokens: maxOutputTokens,
    ...(model === defaultNoteModel ? { reasoning: { effort: "none" } } : {}),
    text: {
      format: {
        type: "json_schema",
        name: "capture_structured_note_v1",
        strict: true,
        schema: structuredNoteJsonSchema(),
      },
    },
  };

  let compact = false;
  let code:
    "provider_rate_limited" | "provider_timeout" | "provider_unavailable" =
    "provider_unavailable";
  const deadline = AbortSignal.timeout(retryBudgetMs);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (deadline.aborted) break;
    const signal = AbortSignal.any([
      deadline,
      AbortSignal.timeout(requestTimeoutMs),
    ]);
    try {
      const response = await send(endpoint, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          compact
            ? {
                ...request,
                input: [
                  {
                    ...prompt.input[0],
                    content: `${prompt.input[0].content}\n${compactInstruction}`,
                  },
                  prompt.input[1],
                ],
              }
            : request,
        ),
        signal,
      });
      if (response.ok) {
        const json = await readProviderJson(response);
        const envelope = record(json);
        const incomplete = record(envelope?.incomplete_details);
        if (envelope?.status === "incomplete") {
          if (incomplete?.reason === "max_output_tokens") {
            if (!compact && attempt + 1 < maxAttempts && !deadline.aborted) {
              compact = true;
              continue;
            }
            return { status: "provider_output_limit" } as const;
          }
          if (incomplete?.reason === "content_filter")
            return { status: "provider_refused" } as const;
          return { status: "provider_incomplete" } as const;
        }
        if (
          Array.isArray(envelope?.output) &&
          envelope.output.some((item: unknown) => {
            const message = record(item);
            return (
              message?.type === "message" &&
              Array.isArray(message.content) &&
              message.content.some(
                (part: unknown) => record(part)?.type === "refusal",
              )
            );
          })
        )
          return { status: "provider_refused" } as const;
        let data: ReturnType<typeof readResponse>;
        try {
          data = readResponse(json);
        } catch {
          data = null;
        }
        return data
          ? ({ status: "ready", ...data } as const)
          : ({ status: "invalid_response" } as const);
      }
      await response.body?.cancel().catch(() => {});
      if (response.status === 401 || response.status === 403)
        return { status: "not_configured" } as const;
      if (
        response.status !== 408 &&
        response.status !== 429 &&
        response.status < 500
      )
        return { status: "provider_rejected" } as const;
      code =
        response.status === 429
          ? "provider_rate_limited"
          : response.status === 408 || response.status === 504
            ? "provider_timeout"
            : "provider_unavailable";
    } catch {
      // Network details can contain credentials or payloads. Retry without logging them.
      code = signal.aborted ? "provider_timeout" : "provider_unavailable";
    }
    if (attempt + 1 < maxAttempts) {
      await delay(250 * 2 ** attempt, undefined, { signal: deadline }).catch(
        () => {},
      );
    }
  }
  return { status: "unavailable", code } as const;
}
