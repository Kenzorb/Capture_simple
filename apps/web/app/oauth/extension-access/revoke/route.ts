import {
  getExtensionConfig,
  isSameOriginSubmission,
} from "../../../../lib/extension-config";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const config = getExtensionConfig();
  let location = "/oauth/extension-access?result=failed";
  if (config && isSameOriginSubmission(request, config.webOrigin)) {
    const session = await getAuthenticatedSession();
    if (!session) location = "/sign-in?manage_extension=1";
    else {
      const { error } = await session.supabase.auth.oauth.revokeGrant({
        clientId: config.clientId,
      });
      if (!error) location = "/oauth/extension-access?result=revoked";
    }
  }
  return new Response(null, { status: 303, headers: { Location: location } });
}
