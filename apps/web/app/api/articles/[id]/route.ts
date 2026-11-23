import {
  articleDeleteSchema,
  articleEditSchema,
  articleParamsSchema,
  structuredNoteSchema,
  type ArticleDetailResponse,
} from "@capture/shared";
import {
  deleteOwnArticle,
  editOwnArticle,
  readOwnArticle,
} from "../../../../lib/supabase/articles";
import { getRequestSession } from "../../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../response";

async function articleRequest(
  request: Request,
  params: Promise<{ id: string }>,
) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(
      401,
      "unauthenticated",
      "Sign in to access this article.",
    );
  const parsed = articleParamsSchema.safeParse(await params);
  if (!parsed.success)
    return articleError(400, "invalid_input", "Enter a valid article ID.");
  return { session, id: parsed.data.id };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const target = await articleRequest(request, params);
  if (target instanceof Response) return target;

  const { data, error } = await readOwnArticle(target.session, target.id);
  if (error)
    return articleError(
      503,
      "unavailable",
      "Could not load this article. Try again.",
    );
  if (!data) return articleError(404, "not_found", "Article not found.");

  const { article_ai_notes, personal_notes, article_topics, ...article } = data;
  return Response.json(
    {
      article,
      ai_note:
        structuredNoteSchema.safeParse(article_ai_notes[0]?.payload).data ??
        null,
      personal_note: personal_notes[0]?.body ?? null,
      topics: article_topics.flatMap(({ topics }) => (topics ? [topics] : [])),
    } satisfies ArticleDetailResponse,
    { headers: articleResponseHeaders },
  );
}

async function readJson(request: Request) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0];
  if (mediaType?.trim().toLowerCase() !== "application/json") return null;
  return request.json().catch(() => null);
}

function mutationResponse({
  data,
  error,
}: {
  data: boolean | null;
  error: { code: string } | null;
}) {
  if (error?.code === "42501")
    return articleError(
      401,
      "unauthenticated",
      "Sign in to access this article.",
    );
  if (error?.code === "22023" || error?.code === "22P05")
    return articleError(400, "invalid_input", "Enter valid article changes.");
  if (error)
    return articleError(
      503,
      "unavailable",
      "Could not change this article. Try again.",
    );
  if (!data) return articleError(404, "not_found", "Article not found.");
  return new Response(null, { status: 204, headers: articleResponseHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const target = await articleRequest(request, params);
  if (target instanceof Response) return target;
  const edit = articleEditSchema.safeParse(await readJson(request));
  if (!edit.success)
    return articleError(400, "invalid_input", "Enter valid article changes.");

  return mutationResponse(
    await editOwnArticle(target.session, target.id, edit.data),
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const target = await articleRequest(request, params);
  if (target instanceof Response) return target;
  if (!articleDeleteSchema.safeParse(await readJson(request)).success)
    return articleError(
      400,
      "invalid_input",
      "Confirm permanent deletion of this article.",
    );

  return mutationResponse(await deleteOwnArticle(target.session, target.id));
}
