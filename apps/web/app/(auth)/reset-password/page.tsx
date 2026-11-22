import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "../../../lib/supabase/server";
import { updatePassword } from "../actions";
import { SubmitButton } from "../submit-button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await getAuthenticatedUser()))
    redirect("/forgot-password?error=session");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      {error === "invalid" && (
        <p role="alert" className="mt-4 text-red-800">
          Use at least 8 characters and at most 72 bytes.
        </p>
      )}
      {error === "failed" && (
        <p role="alert" className="mt-4 text-red-800">
          The password could not be saved. Try a different password.
        </p>
      )}
      <form action={updatePassword} className="mt-8 space-y-4">
        <div>
          <label className="block font-medium" htmlFor="password">
            New password
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-emerald-950/30 bg-white px-3 py-2"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>
        <SubmitButton label="Save password" />
      </form>
    </main>
  );
}
