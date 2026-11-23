"use client";

import { maxPersonalNoteLength } from "@capture/shared";
import { useState } from "react";

export function PersonalNoteField({ savedNote }: { savedNote: string }) {
  const [note, setNote] = useState(savedNote);
  return (
    <textarea
      id="capture-note"
      name="note"
      value={note}
      onChange={(event) => setNote(event.target.value)}
      maxLength={maxPersonalNoteLength}
      rows={6}
      className="mt-1 block w-full rounded-lg border border-emerald-950/30 px-3 py-2"
    />
  );
}
