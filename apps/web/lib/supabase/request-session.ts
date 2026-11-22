import "server-only";

import { getAuthenticatedSession } from "./server";

export function getRequestSession(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([^\s,]+)$/i)?.[1];
  return authorization !== null && !token
    ? Promise.resolve(null)
    : getAuthenticatedSession(token);
}
