import { readOwnUsage } from "../../../lib/supabase/account";
import { getRequestSession } from "../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../articles/response";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(401, "unauthenticated", "Sign in to view usage.");
  const { data, error } = await readOwnUsage(session);
  if (!data || error)
    return articleError(503, "unavailable", "Could not load usage. Try again.");
  return Response.json(data, { headers: articleResponseHeaders });
}
