import "server-only";

import {
  articleCursorPayloadSchema,
  type Article,
  type ArticleEdit,
  type ArticleListQuery,
} from "@capture/shared";
import type { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;
type Cursor = Pick<Article, "id" | "captured_at">;
const columns =
  "id, url, title, domain, author, published_at, captured_at, archived_at, status";

export function decodeArticleCursor(encoded: string): Cursor | null {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    const cursor = articleCursorPayloadSchema.safeParse(decoded);
    return cursor.success ? cursor.data : null;
  } catch {
    return null;
  }
}

export function encodeArticleCursor({ captured_at, id }: Cursor) {
  return Buffer.from(JSON.stringify({ captured_at, id })).toString("base64url");
}

export function listOwnArticles(
  { supabase, user }: Session,
  { limit, status, domain, q, sort, archived }: ArticleListQuery,
  cursor: Cursor | null,
) {
  const ascending = sort === "captured_asc";
  const query = supabase
    .from("articles")
    .select(columns)
    .eq("user_id", user.id)
    .order("captured_at", { ascending })
    .order("id", { ascending })
    .limit(limit + 1);

  if (status) query.eq("status", status);
  if (archived) query.not("archived_at", "is", null);
  else query.is("archived_at", null);
  if (domain) query.eq("domain", domain.toLowerCase());
  if (q) query.textSearch("title", q, { config: "simple", type: "websearch" });
  if (cursor) {
    const op = ascending ? "gt" : "lt";
    // Values come from the UUID and ISO timestamp validators before interpolation.
    query.or(
      `captured_at.${op}.${cursor.captured_at},and(captured_at.eq.${cursor.captured_at},id.${op}.${cursor.id})`,
    );
  }
  return query;
}

export function readOwnArticle({ supabase, user }: Session, id: string) {
  return supabase
    .from("articles")
    .select(
      `${columns}, article_ai_notes(payload), personal_notes(body), article_topics(topics(id, parent_id, name, description, created_at))`,
    )
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
}

export function editOwnArticle(
  { supabase }: Session,
  id: string,
  { title, personal_note, archived }: ArticleEdit,
) {
  return supabase.rpc("capture_edit_article", {
    p_article_id: id,
    p_title: title,
    p_personal_note: personal_note ?? undefined,
    p_update_note: personal_note !== undefined,
    p_archived: archived,
  });
}

export function deleteOwnArticle({ supabase }: Session, id: string) {
  return supabase.rpc("capture_delete_article", {
    p_article_id: id,
    p_confirmed: true,
  });
}
