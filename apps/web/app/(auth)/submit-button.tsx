"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        className="rounded-lg bg-emerald-950 px-4 py-2 font-semibold text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Please wait…" : label}
      </button>
      <span className="sr-only" role="status">
        {pending ? "Submitting. Please wait." : ""}
      </span>
    </>
  );
}
