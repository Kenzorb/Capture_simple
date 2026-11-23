import {
  articleListQuerySchema,
  articleListResponseSchema,
} from "@capture/shared";
import {
  decodeArticleCursor,
  encodeArticleCursor,
  listOwnArticles,
} from "../../../lib/supabase/articles";
import { getRequestSession } from "../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "./response";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(401, "unauthenticated", "Sign in to list articles.");

  const parsed = articleListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return articleError(400, "invalid_input", "Enter valid article filters.");
  const query = parsed.data;
  const cursor = query.cursor ? decodeArticleCursor(query.cursor) : null;
  if (query.cursor && !cursor)
    return articleError(400, "invalid_input", "Enter a valid page cursor.");

  const { data, error } = await listOwnArticles(session, query, cursor);
  if (error || !data)
    return articleError(
      503,
      "unavailable",
      "Could not load articles. Try again.",
    );
  const articles = data.slice(0, query.limit);

  return Response.json(
    articleListResponseSchema.parse({
      articles,
      next_cursor:
        data.length > query.limit
          ? encodeArticleCursor(articles[query.limit - 1])
          : null,
    }),
    { headers: articleResponseHeaders },
  );
}
