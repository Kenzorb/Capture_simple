import {
  extensionCors,
  extensionPreflight,
  isExtensionOrigin,
  rejectUnapprovedOrigin,
} from "../../../lib/extension-cors";
import { readOwnAccount } from "../../../lib/supabase/account";
import { getExtensionBearer } from "../../../lib/supabase/bearer";

export function OPTIONS(request: Request) {
  return extensionPreflight(request, "GET");
}

export async function GET(request: Request) {
  const headers = extensionCors(request, "GET");
  headers.set("Cache-Control", "private, no-store");
  if (rejectUnapprovedOrigin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403, headers });
  }
  if (request.headers.has("authorization") || isExtensionOrigin(request)) {
    const session = await getExtensionBearer(request);
    const result = session
      ? await session.supabase.rpc("capture_extension_account").maybeSingle()
      : null;
    if (!result?.data) {
      const failed = result?.error && result.error.code !== "42501";
      return Response.json(
        { error: failed ? "account_unavailable" : "unauthorized" },
        { status: failed ? 503 : 401, headers },
      );
    }
    const { id, email, display_name, plan } = result.data;
    return Response.json(
      { id, email, displayName: display_name, plan },
      { headers },
    );
  }
  const result = await readOwnAccount();
  if (result.status !== "ok") {
    return Response.json(
      { error: result.status },
      { status: result.status === "unauthorized" ? 401 : 503, headers },
    );
  }

  return Response.json(result.account, { headers });
}
