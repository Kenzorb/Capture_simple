"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canStartCheckout } from "../../../../lib/billing/plans";
import { readOwnBillingStatus } from "../../../../lib/supabase/account";
import { createPrivilegedSupabaseClient } from "../../../../lib/supabase/admin";
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

export async function deleteOwnAccount(form: FormData) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const password = form.get("password");
  const { id, email } = session.user;
  if (
    form.get("confirmation") !== "DELETE" ||
    typeof password !== "string" ||
    !password ||
    password.length > 1_024 ||
    !email
  )
    redirect(`${path}?deletion=confirmation#privacy`);

  const reauthenticated = await session.supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (reauthenticated.error || reauthenticated.data.user?.id !== id)
    redirect(`${path}?deletion=password#privacy`);
  const billing = await readOwnBillingStatus(session);
  if (billing.error) redirect(`${path}?deletion=unavailable#privacy`);
  if (!canStartCheckout(billing.data?.status ?? null))
    redirect(`${path}?deletion=billing#privacy`);

  let deleted = false;
  try {
    const { error } =
      await createPrivilegedSupabaseClient().auth.admin.deleteUser(id);
    deleted = !error;
  } catch {
    // Report failure without including provider or account details.
  }
  if (!deleted) redirect(`${path}?deletion=unavailable#privacy`);
  await session.supabase.auth.signOut({ scope: "local" });
  revalidatePath("/dashboard", "layout");
  redirect("/sign-in?notice=account-deleted");
}
