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

it("stops reading an oversized provider response before JSON parsing", async () => {
  vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(128 * 1024));
      controller.enqueue(new Uint8Array(1));
    },
    cancel,
  });
  const send = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(body, { headers: { "Content-Type": "application/json" } }),
    );
  expect(await generateOpenAiNote([chunk], send)).toEqual({
    status: "invalid_response",
  });
  expect(cancel).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledOnce();
});

it.each([
  [429, "provider_rate_limited"],
  [504, "provider_timeout"],
  [503, "provider_unavailable"],
])(
  "backs off and stops after three attempts for provider status %s",
  async (status, code) => {
    vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
    const send = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({}, { status }));
    expect(await generateOpenAiNote([chunk], send)).toEqual({
      status: "unavailable",
      code,
    });
    expect(send).toHaveBeenCalledTimes(3);
  },
);

it.each([
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

it("tries a shorter note once when the response reaches the output ceiling", async () => {
  vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
  const truncated = {
    ...response,
    status: "incomplete",
    incomplete_details: { reason: "max_output_tokens" },
  };
  const send = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(truncated))
    .mockResolvedValueOnce(Response.json(response));
  expect((await generateOpenAiNote([chunk], send)).status).toBe("ready");
  expect(send).toHaveBeenCalledTimes(2);
  const first = JSON.parse(String(send.mock.calls[0][1]?.body));
  const second = JSON.parse(String(send.mock.calls[1][1]?.body));
  expect(second.input[0].content).toContain("Keep the output concise");
  expect(second.input[1]).toEqual(first.input[1]);
  expect(second.max_output_tokens).toBe(first.max_output_tokens);

  const alwaysTruncated = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json(truncated));
  expect(await generateOpenAiNote([chunk], alwaysTruncated)).toEqual({
    status: "provider_output_limit",
  });
  expect(alwaysTruncated).toHaveBeenCalledTimes(2);
});

it.each([
  [{ ...response, status: "incomplete" }, 200, "provider_incomplete"],
  [
    {
      ...response,
      status: "incomplete",
      incomplete_details: { reason: "content_filter" },
    },
    200,
    "provider_refused",
  ],
  [
    {
      ...response,
      output: [
        { type: "message", role: "assistant", content: [{ type: "refusal" }] },
      ],
    },
    200,
    "provider_refused",
  ],
  [
    { error: { message: "Provider-specific details" } },
    400,
    "provider_rejected",
  ],
])(
  "distinguishes provider failures without sending another request",
  async (body, status, expected) => {
    vi.stubEnv("OPENAI_API_KEY", "fixture-api-key");
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(body, { status }));
    expect(await generateOpenAiNote([chunk], send)).toEqual({
      status: expected,
    });
    expect(send).toHaveBeenCalledOnce();
  },
);
