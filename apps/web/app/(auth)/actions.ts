"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

function readEmail(formData: FormData) {
  const submittedEmail = formData.get("email");
  if (typeof submittedEmail !== "string") return null;
  const email = submittedEmail.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function readPassword(formData: FormData, minimumLength = 1) {
  const password = formData.get("password");
  return typeof password === "string" &&
    password.length >= minimumLength &&
    new TextEncoder().encode(password).length <= 72
    ? password
    : null;
}

function confirmationUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl && URL.canParse("/auth/confirm", appUrl)
    ? new URL("/auth/confirm", appUrl).href
    : null;
}

export async function signIn(formData: FormData) {
  const email = readEmail(formData);
  const password = readPassword(formData);
  if (!email || !password) redirect("/sign-in?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=unavailable");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/sign-in?error=credentials");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = readEmail(formData);
  const password = readPassword(formData, 8);
  if (!email || !password) redirect("/sign-up?error=invalid");

  const supabase = await createServerSupabaseClient();
  const redirectTo = confirmationUrl();
  if (!supabase || !redirectTo) redirect("/sign-up?error=unavailable");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) redirect("/sign-up?error=failed");
  if (data.session) redirect("/dashboard");
  redirect("/sign-in?notice=confirm-email");
}

export async function requestPasswordReset(formData: FormData) {
  const email = readEmail(formData);
  if (!email) redirect("/forgot-password?error=invalid");

  const supabase = await createServerSupabaseClient();
  const redirectTo = confirmationUrl();
  if (!supabase || !redirectTo) redirect("/forgot-password?error=unavailable");

  // Keep the same response for known and unknown email addresses.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  redirect("/forgot-password?notice=sent");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase || !(await supabase.auth.getUser()).data.user) {
    redirect("/forgot-password?error=session");
  }

  const password = readPassword(formData, 8);
  if (!password) redirect("/reset-password?error=invalid");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=failed");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) redirect("/dashboard?error=sign-out");
  }
  redirect("/sign-in");
}
