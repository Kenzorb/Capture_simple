import {
  articleDeleteSchema,
  articleEditSchema,
  articleParamsSchema,
  type ArticleDetailResponse,
} from "@capture/shared";
import { readOwnArticle } from "../../../../lib/supabase/articles";
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

  const { title, personal_note, archived } = edit.data;
  return mutationResponse(
    await target.session.supabase.rpc("capture_edit_article", {
      p_article_id: target.id,
      p_title: title,
      p_personal_note: personal_note ?? undefined,
      p_update_note: personal_note !== undefined,
      p_archived: archived,
    }),
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

  return mutationResponse(
    await target.session.supabase.rpc("capture_delete_article", {
      p_article_id: target.id,
      p_confirmed: true,
    }),
  );
}
