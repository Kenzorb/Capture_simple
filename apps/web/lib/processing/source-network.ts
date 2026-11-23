import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { BlockList, isIP } from "node:net";

const blockedV4 = new BlockList();
const reservedV4 = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
  ["168.63.129.16", 32],
] as const;
for (const [address, prefix] of reservedV4)
  blockedV4.addSubnet(address, prefix, "ipv4");

const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const blockedV6 = new BlockList();
for (const [address, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3ffe::", 16],
  ["3fff::", 20],
] as const)
  blockedV6.addSubnet(address, prefix, "ipv6");

export function publicAddress({ address, family }: LookupAddress) {
  if (
    (family !== 4 && family !== 6) ||
    address.includes("%") ||
    isIP(address) !== family
  )
    return false;
  if (family === 4) return !blockedV4.check(address, "ipv4");
  return globalV6.check(address, "ipv6") && !blockedV6.check(address, "ipv6");
}

export type SourceResponse = {
  status: number;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  body: AsyncIterable<Uint8Array>;
  close(): void;
};

export type SourceNetwork = {
  resolve(host: string): Promise<LookupAddress[]>;
  request(
    url: URL,
    address: LookupAddress,
    signal: AbortSignal,
  ): Promise<SourceResponse>;
};

export const sourceNetwork: SourceNetwork = {
  resolve: (host) => lookup(host, { all: true }),
  request: (url, address, signal) =>
    new Promise((resolve, reject) => {
      const send = url.protocol === "https:" ? requestHttps : requestHttp;
      const request = send(
        url,
        {
          agent: false,
          family: address.family,
          lookup: (_host, _options, callback) =>
            callback(null, address.address, address.family),
          signal,
          headers: {
            Accept: "text/html, text/plain, application/xhtml+xml",
            "Accept-Encoding": "identity",
            "User-Agent": "Capture/0.1",
          },
        },
        (response) =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: response,
            close: () => response.destroy(),
          }),
      );
      request.once("error", reject);
      request.end();
    }),
};
