"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase/server";

function readCredentials(formData: FormData) {
  const submittedEmail = formData.get("email");
  const password = formData.get("password");
  if (typeof submittedEmail !== "string" || typeof password !== "string") {
    return null;
  }

  const email = submittedEmail.trim();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    new TextEncoder().encode(password).length > 72
  ) {
    return null;
  }
  return { email, password };
}

export async function signIn(formData: FormData) {
  const credentials = readCredentials(formData);
  if (!credentials) redirect("/sign-in?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sign-in?error=unavailable");

  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) redirect("/sign-in?error=credentials");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const credentials = readCredentials(formData);
  if (!credentials || credentials.password.length < 8) {
    redirect("/sign-up?error=invalid");
  }

  const supabase = await createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!supabase || !appUrl || !URL.canParse("/auth/confirm", appUrl)) {
    redirect("/sign-up?error=unavailable");
  }

  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: { emailRedirectTo: new URL("/auth/confirm", appUrl).href },
  });
  if (error) redirect("/sign-up?error=failed");
  if (data.session) redirect("/dashboard");
  redirect("/sign-in?notice=confirm-email");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) redirect("/dashboard?error=sign-out");
  }
  redirect("/sign-in");
}
