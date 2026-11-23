"use server";

import { topicEditSchema, topicParamsSchema } from "@capture/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "../../../../../lib/supabase/server";

export async function saveTopic(id: string, form: FormData) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const target = topicParamsSchema.safeParse({ id });
  if (!target.success) redirect("/dashboard/knowledge-tree");
  const path = `/dashboard/topics/${target.data.id}`;
  const parent = form.get("parent");
  const fields = topicEditSchema.safeParse({
    name: form.get("name"),
    parent_id: parent === "" ? null : parent,
  });
  if (!fields.success) redirect(`${path}?change=invalid-topic`);
  const { data, error } = await session.supabase.rpc("capture_mutate_topic", {
    p_operation: "edit",
    p_topic_id: target.data.id,
    p_fields: fields.data,
  });
  if (error?.code === "42501") redirect("/sign-in");
  if (error?.code === "23505") redirect(`${path}?change=duplicate`);
  if (
    error &&
    ["23514", "23503", "22023", "22P02", "22P05"].includes(error.code)
  )
    redirect(`${path}?change=invalid-topic`);
  if (error || !data) redirect(`${path}?change=failed`);
  revalidatePath("/dashboard", "layout");
  redirect(`${path}?change=saved`);
}
