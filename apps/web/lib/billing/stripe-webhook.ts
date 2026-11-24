import "server-only";

import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

const maxBytes = 512 * 1024;
const toleranceSeconds = 300;

const eventObjects = new Map([
  ["checkout.session.completed", "checkout.session"],
  ["customer.subscription.created", "subscription"],
  ["customer.subscription.updated", "subscription"],
  ["customer.subscription.deleted", "subscription"],
  ["customer.subscription.paused", "subscription"],
  ["customer.subscription.resumed", "subscription"],
  ["invoice.paid", "invoice"],
  ["invoice.payment_failed", "invoice"],
]);

type StripeEvent = {
  id?: string;
  object?: string;
  type?: string;
  livemode?: boolean;
  data?: { object?: { object?: string; customer?: string; mode?: string } };
};

export async function readStripeEvent(request: Request, secret: string) {
  const header = request.headers.get("stripe-signature");
  if (!header || !request.body) return null;
  const parts = header.split(",").map((value) => value.trim());
  const timestamps = parts.filter((value) => value.startsWith("t="));
  const timestamp = timestamps[0]?.slice(2);
  if (
    timestamps.length !== 1 ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds
  )
    return null;

  const hmac = createHmac("sha256", secret).update(`${timestamp}.`);
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      hmac.update(value);
      chunks.push(value);
    }
    const expected = hmac.digest();
    const valid = parts.some(
      (part) =>
        /^v1=[a-f0-9]{64}$/i.test(part) &&
        timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")),
    );
    if (!valid) return null;
    const payload = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks, size),
    );
    const event: StripeEvent | null = JSON.parse(payload);
    if (
      !event ||
      event.object !== "event" ||
      event.livemode !== false ||
      typeof event.id !== "string" ||
      !/^evt_[A-Za-z0-9]+$/.test(event.id) ||
      typeof event.type !== "string"
    )
      return null;
    const object = event.data?.object;
    const expectedObject = eventObjects.get(event.type);
    if (!expectedObject) return { kind: "ignored" } as const;
    if (object?.object !== expectedObject) return null;
    if (expectedObject === "checkout.session" && object.mode !== "subscription")
      return { kind: "ignored" } as const;
    if (
      typeof object.customer !== "string" ||
      !/^cus_[A-Za-z0-9]+$/.test(object.customer)
    )
      return null;
    return {
      kind: "billing",
      id: event.id,
      type: event.type,
      customer: object.customer,
    } as const;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
