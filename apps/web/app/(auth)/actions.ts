"use server";

import { redirect } from "next/navigation";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { emailVerificationToken } from "../../lib/supabase/email-verification-link";
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

function emailCallbackUrl(path: "/auth/confirm" | "/auth/recovery") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl && URL.canParse(path, appUrl)
    ? new URL(path, appUrl).href
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
  const redirectTo = emailCallbackUrl("/auth/confirm");
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
  const redirectTo = emailCallbackUrl("/auth/recovery");
  if (!supabase || !redirectTo) redirect("/forgot-password?error=unavailable");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error?.code === "over_email_send_rate_limit") {
    console.warn("Supabase has reached its Auth email sending limit.");
  }
  // Keep recipient-specific outcomes neutral so the page cannot confirm registration.
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

export async function verifyEmail(
  flow: "signup" | "recovery",
  formData: FormData,
) {
  const recovery = flow === "recovery";
  const page = recovery ? "/verify-email?flow=recovery&" : "/verify-email?";
  const email = readEmail(formData);
  const submitted = formData.get("verification");
  const value = typeof submitted === "string" ? submitted.trim() : "";
  const type = recovery ? "recovery" : "signup";
  const config = getSupabaseConfig();
  if (!config) redirect(`${page}error=unavailable`);

  const tokenHash = emailVerificationToken(value, config.url, type);
  const verification = tokenHash
    ? { token_hash: tokenHash, type }
    : email && /^\d{6,10}$/.test(value)
      ? { email, token: value, type }
      : null;
  if (!verification) redirect(`${page}error=invalid`);

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${page}error=unavailable`);
  const { data, error } = await supabase.auth.verifyOtp(verification);
  if (error || !data.session) redirect(`${page}error=code`);
  redirect(recovery ? "/reset-password" : "/dashboard");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) redirect("/dashboard?error=sign-out");
  }
  redirect("/sign-in");
}
