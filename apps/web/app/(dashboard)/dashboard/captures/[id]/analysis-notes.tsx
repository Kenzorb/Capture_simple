import type { ProcessingStatus, StructuredNote } from "@capture/shared";

const pendingCopy: Record<ProcessingStatus, string> = {
  saved: "The link is saved in your library.",
  queued: "Waiting for analysis to start.",
  processing: "Analyzing this article.",
  ready: "The analysis finished, but its notes could not be loaded.",
  failed:
    "Analysis failed. The article and your personal note are still saved.",
  quota_limited:
    "You’ve used this month’s analysis allowance. The link is still saved.",
  unsupported: "This page could only be saved as a link.",
};

export function AnalysisNotes({
  note,
  status,
}: {
  note?: StructuredNote;
  status: ProcessingStatus;
}) {
  if (!note)
    return <p className="mt-1 text-sm text-[#506458]">{pendingCopy[status]}</p>;

  return (
    <div className="mt-3 space-y-4 text-sm leading-relaxed break-words">
      <p>{note.summary}</p>
      <section>
        <h3 className="font-semibold">Key takeaways</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {note.key_takeaways.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </section>
      {note.sections.map((section, index) => (
        <section key={index}>
          <h3 className="font-semibold">{section.heading}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {section.points.map((point, position) => (
              <li key={position}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
      {note.concepts.length > 0 && (
        <section>
          <h3 className="font-semibold">Concepts</h3>
          <dl className="mt-1 space-y-2">
            {note.concepts.map(({ name, definition }, index) => (
              <div key={index}>
                <dt className="font-medium">{name}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
