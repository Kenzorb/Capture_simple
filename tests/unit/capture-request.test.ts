import { expect, test } from "vitest";
import {
  exceedsCaptureFieldBudget,
  readCaptureJson,
} from "../../apps/web/lib/capture-request";

test("capture fields use UTF-8 byte limits", () => {
  expect(
    exceedsCaptureFieldBudget({ extracted_text: "😀".repeat(25_000) }),
  ).toBe(false);
  expect(
    exceedsCaptureFieldBudget({ extracted_text: "😀".repeat(25_001) }),
  ).toBe(true);
  expect(exceedsCaptureFieldBudget({ url: "é".repeat(2048) })).toBe(false);
  expect(exceedsCaptureFieldBudget({ url: "é".repeat(2049) })).toBe(true);
});

test("capture JSON accepts the byte limit and rejects an additional byte", async () => {
  const url = "http://127.0.0.1/api/captures";
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  const value = "x".repeat(128 * 1024 - 2);
  const body = JSON.stringify(value);
  expect(
    await readCaptureJson(new Request(url, { method: "POST", headers, body })),
  ).toEqual({
    status: "ok",
    data: value,
  });
  expect(
    await readCaptureJson(
      new Request(url, { method: "POST", headers, body: body + " " }),
    ),
  ).toEqual({
    status: "too_large",
  });
});

test("capture JSON enforces the streamed byte limit without a length header", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(70_000));
      controller.enqueue(new Uint8Array(70_000));
      controller.close();
    },
  });
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
  };
  expect(
    await readCaptureJson(new Request("http://127.0.0.1/api/captures", init)),
  ).toEqual({ status: "too_large" });
});

test("capture JSON rejects malformed payloads and unsupported encodings", async () => {
  const url = "http://127.0.0.1/api/captures";
  const cases: { headers: HeadersInit; body: string }[] = [
    { headers: { "Content-Type": "text/plain" }, body: "{}" },
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
      body: "{}",
    },
    { headers: { "Content-Type": "application/json" }, body: "invalid JSON" },
  ];
  for (const { headers, body } of cases) {
    expect(
      await readCaptureJson(
        new Request(url, { method: "POST", headers, body }),
      ),
    ).toEqual({ status: "invalid" });
  }
});
