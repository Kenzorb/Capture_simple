import {
  articleParamsSchema,
  type ArticleDetailResponse,
} from "@capture/shared";
import { readOwnArticle } from "../../../../lib/supabase/articles";
import { getRequestSession } from "../../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(
      401,
      "unauthenticated",
      "Sign in to open this article.",
    );
  const parsed = articleParamsSchema.safeParse(await params);
  if (!parsed.success)
    return articleError(400, "invalid_input", "Enter a valid article ID.");

  const { data, error } = await readOwnArticle(session, parsed.data.id);
  if (error)
    return articleError(
      503,
      "unavailable",
      "Could not load this article. Try again.",
    );
  if (!data) return articleError(404, "not_found", "Article not found.");

  const { personal_notes, article_topics, ...article } = data;
  return Response.json(
    {
      article,
      personal_note: personal_notes[0]?.body ?? null,
      topics: article_topics.flatMap(({ topics }) => (topics ? [topics] : [])),
    } satisfies ArticleDetailResponse,
    { headers: articleResponseHeaders },
  );
}
