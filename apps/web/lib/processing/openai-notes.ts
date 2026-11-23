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
const maxAttempts = 3;

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
  const body = JSON.stringify({
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
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await send(endpoint, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(12_000),
      });
      if (response.ok) {
        const json: unknown = await response.json().catch((error: unknown) => {
          if (error instanceof SyntaxError) return null;
          throw error;
        });
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
        return { status: "invalid_response" } as const;
    } catch {
      // Network details can contain credentials or payloads. Retry without logging them.
    }
    if (attempt + 1 < maxAttempts) await delay(250 * 2 ** attempt);
  }
  return { status: "unavailable" } as const;
}
