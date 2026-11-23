"use client";

import { maxPersonalNoteLength } from "@capture/shared";
import { useActionState, useState } from "react";
import { SubmitButton } from "../../../../(auth)/submit-button";
import { savePersonalNote, type NoteSaveResult } from "./actions";

export function PersonalNoteField({
  articleId,
  savedNote,
}: {
  articleId: string;
  savedNote: string | null;
}) {
  const [base, setBase] = useState(savedNote);
  const [note, setNote] = useState(savedNote ?? "");
  const [result, submit, pending] = useActionState(
    async (
      _previous: NoteSaveResult | null,
      fields: FormData,
    ): Promise<NoteSaveResult> => {
      try {
        const result = await savePersonalNote(
          articleId,
          base,
          fields.get("note"),
        );
        if (result.status === "saved") {
          setBase(result.note);
          setNote(result.note ?? "");
        }
        return result;
      } catch {
        return {
          status: "error",
          message: "Could not save your note. Your draft is still here.",
        };
      }
    },
    null,
  );
  const conflict = result?.status === "conflict" && base !== result.note;

  return (
    <form action={submit} className="mt-3">
      <label htmlFor="capture-note" className="block text-sm font-medium">
        Personal note
      </label>
      <textarea
        id="capture-note"
        name="note"
        value={note}
        readOnly={pending}
        onChange={(event) => setNote(event.target.value)}
        maxLength={maxPersonalNoteLength}
        rows={6}
        className="mt-1 block w-full rounded-lg border border-emerald-950/30 px-3 py-2"
      />
      {conflict && (
        <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm">
          <p role="alert">
            This note changed elsewhere. Your draft is still in the editor.
          </p>
          <p className="mt-2 font-semibold">Latest saved note</p>
          <p className="break-words whitespace-pre-wrap">
            {result.note || "The saved note was cleared."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setBase(result.note);
                setNote(result.note ?? "");
              }}
            >
              Use latest note
            </button>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setBase(result.note)}
            >
              Keep my draft
            </button>
          </div>
        </div>
      )}
      {result?.status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {result.message}
        </p>
      )}
      {result?.status === "saved" && note === (base ?? "") && (
        <p role="status" className="mt-2 text-sm text-emerald-900">
          Personal note saved.
        </p>
      )}
      <div className="mt-3">
        {conflict ? (
          <p className="text-sm text-[#506458]">
            Choose which version to edit before saving.
          </p>
        ) : (
          <SubmitButton label="Save note" />
        )}
      </div>
    </form>
  );
}
