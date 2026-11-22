import {
  getExtensionConfig,
  isSameOriginSubmission,
  parseAuthorizationId,
  validOAuthRedirect,
} from "../../../../lib/extension-config";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";

function reply(location: string) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

export async function POST(request: Request) {
  const config = getExtensionConfig();
  const unavailable = "/oauth/consent?error=unavailable";
  if (!config || !isSameOriginSubmission(request, config.webOrigin))
    return reply(unavailable);

  const form = await request.formData().catch(() => null);
  const id = parseAuthorizationId(form?.get("authorization_id"));
  const decision = form?.get("decision");
  if (!id || (decision !== "approve" && decision !== "deny"))
    return reply(unavailable);

  const session = await getAuthenticatedSession();
  if (!session) return reply(`/sign-in?authorization_id=${id}`);
  const { oauth } = session.supabase.auth;
  const { data } = await oauth.getAuthorizationDetails(id);
  if (
    !data ||
    !("client" in data) ||
    data.client.id !== config.clientId ||
    data.redirect_uri !== config.redirectUri ||
    data.scope !== "email"
  )
    return reply(unavailable);

  const result =
    decision === "approve"
      ? await oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : await oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  return reply(
    result.data &&
      !result.error &&
      validOAuthRedirect(result.data.redirect_url, config.redirectUri)
      ? result.data.redirect_url
      : unavailable,
  );
}
