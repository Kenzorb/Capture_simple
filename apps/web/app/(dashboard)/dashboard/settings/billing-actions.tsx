"use client";

import { useState } from "react";

type BillingAction = "monthly" | "annual" | "portal";

const formatUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "code",
});

export function BillingActions({
  prices,
  showPortal,
}: {
  prices: { monthly: number; annual: number } | null;
  showPortal: boolean;
}) {
  const [pending, setPending] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(action: BillingAction) {
    const portal = action === "portal";
    setError(null);
    setPending(action);
    try {
      const response = await fetch(
        portal ? "/api/billing/portal" : "/api/billing/checkout",
        {
          method: "POST",
          ...(portal
            ? {}
            : {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interval: action }),
              }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(
          typeof data.error?.message === "string"
            ? data.error.message
            : "Billing is temporarily unavailable. Try again.",
        );
        setPending(null);
        return;
      }
      const url = new URL(data.url);
      const expectedOrigin = portal
        ? "https://billing.stripe.com"
        : "https://checkout.stripe.com";
      if (url.origin !== expectedOrigin || url.username || url.password)
        throw new Error("Unexpected Stripe origin");
      window.location.assign(url.href);
    } catch {
      setError("Billing is temporarily unavailable. Try again.");
      setPending(null);
    }
  }

  const buttonStyle =
    "rounded-lg border border-emerald-950 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-50";

  return (
    <>
      {prices && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["monthly", "annual"] as const).map((interval) => (
            <div
              key={interval}
              className="grid justify-items-start gap-2 rounded-lg bg-[#f7f9f5] p-3"
            >
              <p className="text-sm font-medium">
                {interval === "monthly" ? "Monthly" : "Annual"}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatUsd.format(prices[interval] / 100)}
                <span className="ml-1 text-sm font-normal text-[#506458]">
                  / {interval === "monthly" ? "month" : "year"}
                </span>
              </p>
              <button
                type="button"
                className={buttonStyle}
                disabled={pending !== null}
                onClick={() => void start(interval)}
              >
                {pending === interval
                  ? "Opening Stripe…"
                  : interval === "monthly"
                    ? "Choose monthly"
                    : "Choose annual"}
              </button>
            </div>
          ))}
        </div>
      )}
      {showPortal && (
        <button
          type="button"
          className={`mt-3 ${buttonStyle}`}
          disabled={pending !== null}
          onClick={() => void start("portal")}
        >
          {pending === "portal" ? "Opening Stripe…" : "Manage billing"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </>
  );
}
