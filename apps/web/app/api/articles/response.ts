import type { ApiError } from "@capture/shared";

export const articleResponseHeaders = { "Cache-Control": "private, no-store" };

export function articleError(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
) {
  return Response.json({ error: { code, message } } satisfies ApiError, {
    status,
    headers: articleResponseHeaders,
  });
}
