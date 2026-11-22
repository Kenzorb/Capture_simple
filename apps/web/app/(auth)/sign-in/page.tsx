import type { Metadata } from "next";
import {
  getExtensionConfig,
  parseAuthorizationId,
} from "../../../lib/extension-config";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    authorization_id?: string | string[];
    manage_extension?: string | string[];
  }>;
}) {
  const { error, notice, authorization_id, manage_extension } =
    await searchParams;
  const configured = Boolean(getExtensionConfig());
  return (
    <AuthForm
      mode="sign-in"
      error={error}
      notice={notice}
      authorizationId={
        configured ? parseAuthorizationId(authorization_id) : null
      }
      manageExtension={configured && manage_extension === "1"}
    />
  );
}
