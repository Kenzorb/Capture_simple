import { afterEach, expect, it, vi } from "vitest";
import { generateOpenAiNote } from "../../apps/web/lib/processing/openai-notes";

vi.mock("../../apps/web/node_modules/server-only/index.js", () => ({}));

const chunk = {
  chunk_id: "ch_0123456789abcdef_1",
  text: "Leaves collect light.",
};
const output = {
  language: "en",
  summary: "Leaves collect light.",
  key_takeaways: ["Plants grow using light."],
  sections: [
    {
      heading: "Leaves",
      points: ["Leaves collect light."],
      evidence_chunk_ids: [chunk.chunk_id],
    },
  ],
  concepts: [],
  tags: [],
  suggested_topic_paths: [],
};
const response = {
  status: "completed",
  model: "gpt-5.6-luna",
  output: [
    {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: JSON.stringify(output),
        },
      ],
    },
  ],
  usage: { input_tokens: 512, output_tokens: 78 },
};

afterEach(() => vi.unstubAllEnvs());

it("sends bounded JSON to the fixed provider, retries a transient failure, and validates usage", async () => {
  vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
  vi.stubEnv("OPENAI_MODEL", "");
  const send = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({}, { status: 503 }))
    .mockResolvedValueOnce(Response.json(response));
  const result = await generateOpenAiNote([chunk], send);
  expect(send).toHaveBeenCalledTimes(2);
  const [url, options] = send.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/responses");
  expect(options?.redirect).toBe("error");
  expect(options?.signal).toBeInstanceOf(AbortSignal);
  expect(JSON.parse(String(options?.body))).toMatchObject({
    model: "gpt-5.6-luna",
    store: false,
    max_output_tokens: 1800,
    tools: [],
    text: {
      format: {
        strict: true,
        type: "json_schema",
        schema: { additionalProperties: false },
      },
    },
  });
  expect(result).toEqual({
    status: "ready",
    note: { ...output, model: "gpt-5.6-luna", schema_version: 1 },
    usage: { inputTokens: 512, outputTokens: 78 },
  });
});

it("does not send a request when the credential is absent", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const send = vi.fn<typeof fetch>();
  expect(await generateOpenAiNote([chunk], send)).toEqual({
    status: "not_configured",
  });
  expect(send).not.toHaveBeenCalled();
});

it.each([
  { ...response, status: "incomplete" },
  {
    ...response,
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "refusal", refusal: "Refused" }],
      },
    ],
  },
  { ...response, output: [{ type: "function_call" }] },
  { ...response, usage: undefined },
])("rejects unvalidated provider responses", async (value) => {
  vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json(value));
  expect(await generateOpenAiNote([chunk], send)).toEqual({
    status: "invalid_response",
  });
  expect(send).toHaveBeenCalledOnce();
});
