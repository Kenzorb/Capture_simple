"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";

const path = "/dashboard/settings";

export async function saveDisplayName(form: FormData) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const value = form.get("display_name");
  if (typeof value !== "string") redirect(`${path}?profile=invalid`);
  const name = value.trim();
  if (name.length > 80 || /\p{Cc}/u.test(name))
    redirect(`${path}?profile=invalid`);
  const { data, error } = await session.supabase
    .from("profiles")
    .update({ display_name: name || null })
    .eq("id", session.user.id)
    .select("id")
    .maybeSingle();
  if (!data || error) redirect(`${path}?profile=failed`);
  revalidatePath(path);
  redirect(`${path}?profile=saved`);
}
