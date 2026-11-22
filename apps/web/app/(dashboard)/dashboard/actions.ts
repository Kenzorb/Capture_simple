"use server";

import { captureRequestSchema } from "@capture/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCaptureTarget,
  saveOwnCapture,
} from "../../../lib/supabase/captures";
import { getAuthenticatedSession } from "../../../lib/supabase/server";

export async function saveManualUrl(formData: FormData) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");

  const value = formData.get("url");
  const parsed = captureRequestSchema.safeParse({
    request_id: formData.get("request_id"),
    url: typeof value === "string" ? value.trim() : value,
    source: "manual_url",
  });
  if (!parsed.success) redirect("/dashboard?capture=invalid");
  const target = getCaptureTarget(parsed.data);
  if (!target) redirect("/dashboard?capture=invalid");

  const { data, error } = await saveOwnCapture(session, parsed.data, target);
  if (error?.code === "42501") redirect("/sign-in");
  if (error?.code === "22023") redirect("/dashboard?capture=invalid");
  if (error?.code === "23505") redirect("/dashboard?capture=conflict");
  if (error || !data) redirect("/dashboard?capture=unavailable");
  revalidatePath("/dashboard");
  redirect(
    data.duplicate
      ? "/dashboard?capture=duplicate"
      : "/dashboard?capture=saved",
  );
}
