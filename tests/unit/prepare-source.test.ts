import { expect, it, vi } from "vitest";
import { prepareSource } from "../../apps/web/lib/processing/prepare-source";
import type {
  SourceNetwork,
  SourceResponse,
} from "../../apps/web/lib/processing/source-network";

const url = "https://www.example.com/article";
const target = { url, capturedText: null };
const publicIp = { address: "93.184.215.14", family: 4 };
const bytes = (value: string) => new TextEncoder().encode(value);

function response(
  status: number,
  headers: SourceResponse["headers"] = {},
  chunks: Uint8Array[] = [],
): SourceResponse {
  return {
    status,
    headers,
    body: (async function* () {
      yield* chunks;
    })(),
    close: vi.fn(),
  };
}

function network(reply = response(403)) {
  return {
    resolve: vi.fn<SourceNetwork["resolve"]>().mockResolvedValue([publicIp]),
    request: vi.fn<SourceNetwork["request"]>().mockResolvedValue(reply),
  };
}

it("prefers captured text without opening a connection", async () => {
  const io = network();
  expect(
    await prepareSource({ url, capturedText: "User-captured text" }, io),
  ).toEqual({ status: "ready", text: "User-captured text", method: "capture" });
  expect(io.resolve).not.toHaveBeenCalled();
});

it.each([
  "http://localhost/",
  "http://127.0.0.1/",
  "http://169.254.169.254/",
  "http://[fd00:ec2::254]/",
  "https://example.com:8443/",
  "https://sender:password@example.com/",
  "file:///tmp/test",
])("rejects disallowed destination %s before DNS", async (url) => {
  const io = network();
  expect(await prepareSource({ url, capturedText: null }, io)).toEqual({
    status: "unsupported",
  });
  expect(io.resolve).not.toHaveBeenCalled();
  expect(io.request).not.toHaveBeenCalled();
});

it.each([
  ["10.10.10.10", 4],
  ["100.100.100.200", 4],
  ["169.254.169.254", 4],
  ["168.63.129.16", 4],
  ["192.168.1.1", 4],
  ["::1", 6],
  ["::ffff:127.0.0.1", 6],
  ["fc00::123", 6],
  ["2002::1", 6],
])(
  "blocks DNS answers containing private or special address %s",
  async (address, family) => {
    const io = network();
    io.resolve.mockResolvedValue([publicIp, { address, family }]);
    expect(await prepareSource(target, io)).toEqual({ status: "unsupported" });
    expect(io.request).not.toHaveBeenCalled();
  },
);

it("pins the approved address and rechecks the next DNS answer before following a redirect", async () => {
  const redirect = response(302, { location: "/moved" });
  const io = network(redirect);
  io.resolve
    .mockResolvedValueOnce([publicIp])
    .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
  expect(await prepareSource(target, io)).toEqual({ status: "unsupported" });
  expect(io.resolve).toHaveBeenCalledTimes(2);
  expect(io.request).toHaveBeenCalledExactlyOnceWith(
    new URL(url),
    publicIp,
    expect.any(AbortSignal),
  );
  expect(redirect.close).toHaveBeenCalledOnce();
});

it("bounds redirect loops", async () => {
  const io = network(response(302, { location: url }));
  expect(await prepareSource(target, io)).toEqual({ status: "unsupported" });
  expect(io.request).toHaveBeenCalledTimes(4);
});

it("extracts text and block boundaries without including inactive HTML", async () => {
  const reply = response(200, { "content-type": "text/html; charset=utf-8" }, [
    bytes(
      "<h1>Heading</h1><p>Read &amp; revise.</p><script>hidden()</script>" +
        "<nav>Private navigation</nav><p hidden>Hidden paragraph</p>",
    ),
  ]);
  const io = network(reply);
  const result = await prepareSource(target, io);
  expect(result).toEqual({
    status: "ready",
    method: "http",
    text: "\nHeading\n\nRead & revise.\n",
  });
  expect(reply.close).toHaveBeenCalledOnce();
});

it.each([
  response(401, { "content-type": "text/html" }),
  response(403, { "content-type": "text/html" }),
  response(200, { "content-type": "application/pdf" }),
  response(200, { "content-type": "text/html", "content-encoding": "gzip" }),
  response(200, { "content-type": "text/plain", "content-length": "524289" }),
  response(200, { "content-type": "text/plain" }, [
    new Uint8Array(512 * 1024),
    new Uint8Array(1),
  ]),
])(
  "closes unsupported, access-restricted, or oversized responses",
  async (reply) => {
    expect(await prepareSource(target, network(reply))).toEqual({
      status: "unsupported",
    });
    expect(reply.close).toHaveBeenCalledOnce();
  },
);

it("marks temporary service failures as unavailable", async () => {
  expect(await prepareSource(target, network(response(503)))).toEqual({
    status: "unavailable",
  });
});

it("bounds a stalled DNS lookup and aborts an in-flight HTTP request", async () => {
  const dns = network();
  dns.resolve.mockImplementation(() => new Promise(() => {}));
  const dnsAbort = new AbortController();
  const dnsResult = prepareSource(target, dns, dnsAbort.signal);
  dnsAbort.abort();
  expect(await dnsResult).toEqual({ status: "unavailable" });
  expect(dns.request).not.toHaveBeenCalled();

  const io = network();
  const abort = new AbortController();
  io.request.mockImplementation(
    (_url, _address, signal) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
        abort.abort();
      }),
  );
  expect(await prepareSource(target, io, abort.signal)).toEqual({
    status: "unavailable",
  });
});
