import "server-only";

import { bearerToken, verifyBearer } from "./bearer";
import { getAuthenticatedSession } from "./server";

export async function getRequestSession(request: Request) {
  if (!request.headers.has("authorization")) return getAuthenticatedSession();
  const token = bearerToken(request);
  if (!token) return null;
  const verified = await verifyBearer(token);
  return verified && verified.claims.client_id === undefined
    ? getAuthenticatedSession(token)
    : null;
}
