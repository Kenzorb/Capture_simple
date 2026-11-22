import { canonicalizeCaptureUrl, type ProcessingStatus } from "@capture/shared";

const statusLabels: Record<ProcessingStatus, string> = {
  saved: "Saved",
  queued: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
  quota_limited: "Quota limited",
  unsupported: "Unsupported",
};

export function CaptureSourceTitle({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const source = canonicalizeCaptureUrl(url);
  return source ? (
    <a
      href={source.url}
      className="break-words font-semibold text-emerald-950 underline underline-offset-2 hover:no-underline"
    >
      {title}
    </a>
  ) : (
    <span className="break-words font-semibold">{title}</span>
  );
}

export function CaptureStatus({ status }: { status: ProcessingStatus }) {
  return (
    <span className="inline-block rounded-md bg-[#e8efe9] px-2 py-1 text-xs font-semibold text-[#284535]">
      {statusLabels[status]}
    </span>
  );
}
