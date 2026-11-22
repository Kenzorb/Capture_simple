import { canonicalizeCaptureUrl, type ProcessingStatus } from "@capture/shared";
import Link from "next/link";

export const statusLabels: Record<ProcessingStatus, string> = {
  saved: "Saved",
  queued: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
  quota_limited: "Quota limited",
  unsupported: "Unsupported",
};

const captureTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const captureDate = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const linkClass =
  "break-words font-semibold text-emerald-950 underline underline-offset-2 hover:no-underline";

export function CaptureTitle({ id, title }: { id: string; title: string }) {
  return (
    <Link href={`/dashboard/captures/${id}`} className={linkClass}>
      {title}
    </Link>
  );
}

export function CaptureOriginalLink({ url }: { url: string }) {
  const source = canonicalizeCaptureUrl(url);
  return source ? (
    <a href={source.url} className={linkClass}>
      {source.url}
    </a>
  ) : (
    <span className="break-words">{url}</span>
  );
}

export function CaptureTime({
  value,
  dateOnly = false,
}: {
  value: string;
  dateOnly?: boolean;
}) {
  const date = new Date(value);
  return (
    <time dateTime={value}>
      {dateOnly ? captureDate.format(date) : `${captureTime.format(date)} UTC`}
    </time>
  );
}

export function CaptureStatus({ status }: { status: ProcessingStatus }) {
  return (
    <span className="inline-block rounded-md bg-[#e8efe9] px-2 py-1 text-xs font-semibold text-[#284535]">
      {statusLabels[status]}
    </span>
  );
}
