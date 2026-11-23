"use client";

import { maxExtractedTextBytes } from "@capture/shared";
import { useActionState, useState } from "react";
import { SubmitButton } from "../../../../(auth)/submit-button";
import { submitCaptureText } from "./actions";

export function CaptureTextForm({ articleId }: { articleId: string }) {
  const [text, setText] = useState("");
  const [error, submit, pending] = useActionState(
    submitCaptureText.bind(null, articleId),
    null,
  );
  return (
    <details className="mt-3">
      <summary className="w-fit cursor-pointer font-semibold text-emerald-950">
        Paste article text
      </summary>
      <form action={submit} className="mt-3">
        <label htmlFor="capture-source-text" className="text-sm font-medium">
          Article text
        </label>
        <textarea
          id="capture-source-text"
          name="source_text"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={pending}
          rows={6}
          maxLength={maxExtractedTextBytes}
          className="mt-1 block w-full rounded-lg border border-emerald-950/30 px-3 py-2"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-3">
          <SubmitButton label="Analyze pasted text" />
        </div>
      </form>
    </details>
  );
}
