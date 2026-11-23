"use server";

import {
  articleDeleteSchema,
  articleEditSchema,
  articleParamsSchema,
  topicParamsSchema,
} from "@capture/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteOwnArticle,
  editOwnArticle,
  retryOwnArticle,
  setOwnArticlePrimaryTopic,
} from "../../../../../lib/supabase/articles";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";

const libraryPath = "/dashboard/captures";

async function captureTarget(id: string) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const parsed = articleParamsSchema.safeParse({ id });
  if (!parsed.success) redirect(libraryPath);
  return { session, capturePath: `${libraryPath}/${parsed.data.id}` };
}

function finishMutation(
  { data, error }: { data: boolean | null; error: { code: string } | null },
  capturePath: string,
  destination: string,
) {
  if (error?.code === "42501") redirect("/sign-in");
  if (error) redirect(`${capturePath}?change=failed`);
  revalidatePath(capturePath);
  revalidatePath("/dashboard");
  revalidatePath(libraryPath);
  redirect(data ? destination : capturePath);
}

export type NoteSaveResult =
  | { status: "saved" | "conflict"; note: string | null }
  | { status: "error"; message: string };

export async function savePersonalNote(
  id: string,
  expected: string | null,
  submittedNote: FormDataEntryValue | null,
): Promise<NoteSaveResult> {
  const { session, capturePath } = await captureTarget(id);
  const note =
    typeof submittedNote === "string"
      ? submittedNote.replace(/\r\n?/g, "\n")
      : undefined;
  const edit = articleEditSchema.safeParse({
    personal_note: note?.trim() ? note : note === undefined ? undefined : null,
  });
  const base = articleEditSchema.safeParse({ personal_note: expected });
  if (!edit.success || !base.success)
    return {
      status: "error",
      message: "Enter a personal note of up to 4,000 characters.",
    };
  const { data, error } = await session.supabase.rpc(
    "capture_save_personal_note",
    {
      p_article_id: id,
      p_expected_body: base.data.personal_note ?? undefined,
      p_body: edit.data.personal_note ?? undefined,
    },
  );
  if (error?.code === "42501") redirect("/sign-in");
  const entry = data?.[0];
  if (entry?.result === "conflict")
    return { status: "conflict", note: entry.body };
  if (error || entry?.result !== "saved")
    return {
      status: "error",
      message: "Could not save your note. Your draft is still here.",
    };
  revalidatePath(capturePath);
  revalidatePath(libraryPath);
  return { status: "saved", note: entry.body };
}

export async function moveCaptureToTopic(id: string, formData: FormData) {
  const { session, capturePath } = await captureTarget(id);
  const topic = topicParamsSchema.safeParse({ id: formData.get("topic") });
  if (!topic.success) redirect(`${capturePath}?change=invalid-topic`);
  const result = await setOwnArticlePrimaryTopic(session, id, topic.data.id);
  if (!result.error && !result.data)
    redirect(`${capturePath}?change=invalid-topic`);
  if (result.data) revalidatePath("/dashboard", "layout");
  finishMutation(result, capturePath, `${capturePath}?change=topic`);
}

export async function setCaptureArchived(id: string, archived: boolean) {
  const { session, capturePath } = await captureTarget(id);
  const edit = articleEditSchema.safeParse({ archived });
  if (!edit.success) redirect(`${capturePath}?change=failed`);
  finishMutation(
    await editOwnArticle(session, id, edit.data),
    capturePath,
    `${capturePath}?change=${archived ? "archived" : "restored"}`,
  );
}

export async function deleteCapture(id: string, formData: FormData) {
  const { session, capturePath } = await captureTarget(id);
  const confirm = articleDeleteSchema.safeParse({
    confirmed: formData.get("confirm") === "on",
  });
  if (!confirm.success) redirect(`${capturePath}?change=confirm-delete`);
  finishMutation(
    await deleteOwnArticle(session, id),
    capturePath,
    `${libraryPath}?capture=deleted`,
  );
}

export async function retryCapture(id: string) {
  const { session, capturePath } = await captureTarget(id);
  const { data, error } = await retryOwnArticle(session, id);
  if (data === "retry_limit" || data === "quota_limited")
    redirect(`${capturePath}?change=${data}`);
  finishMutation(
    { data: data === "queued", error },
    capturePath,
    `${capturePath}?change=retried`,
  );
}
