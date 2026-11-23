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

function articleCursorCondition(cursor: Cursor, ascending: boolean) {
  const op = ascending ? "gt" : "lt";
  // Values come from the UUID and ISO timestamp validators before interpolation.
  return `captured_at.${op}.${cursor.captured_at},and(captured_at.eq.${cursor.captured_at},id.${op}.${cursor.id})`;
}

export function listOwnArticles(
  { supabase, user }: Session,
  { limit, status, topic, domain, q, sort, archived }: ArticleListQuery,
  cursor: Cursor | null,
) {
  const ascending = sort === "captured_asc";
  const articles = supabase.from("articles");
  const query = (
    topic
      ? articles.select(`${columns}, article_topics!inner()`)
      : articles.select(columns)
  )
    .eq("user_id", user.id)
    .order("captured_at", { ascending })
    .order("id", { ascending })
    .limit(limit + 1);

  if (status) query.eq("status", status);
  if (topic) query.eq("article_topics.topic_id", topic);
  if (archived) query.not("archived_at", "is", null);
  else query.is("archived_at", null);
  if (domain) query.eq("domain", domain.toLowerCase());
  if (q) query.textSearch("title", q, { config: "simple", type: "websearch" });
  if (cursor) query.or(articleCursorCondition(cursor, ascending));
  return query;
}

export function listOwnTopicArticles(
  { supabase, user }: Session,
  topic: string,
  limit: number,
  cursor: Cursor | null,
) {
  const query = supabase
    .from("articles")
    .select(
      "id, title, domain, captured_at, article_topics!inner(is_primary), article_ai_notes(payload)",
    )
    .eq("user_id", user.id)
    .eq("article_topics.topic_id", topic)
    .is("archived_at", null)
    .order("captured_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) query.or(articleCursorCondition(cursor, false));
  return query;
}

export function readOwnArticle({ supabase, user }: Session, id: string) {
  return supabase
    .from("articles")
    .select(
      `${columns}, article_ai_notes(payload), personal_notes(body), article_topics(is_primary, topics(id, parent_id, name, description, created_at))`,
    )
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
}

export function listOwnRelatedArticles({ supabase }: Session, id: string) {
  return supabase.rpc("capture_related_articles", { p_article_id: id });
}

export function setOwnArticlePrimaryTopic(
  { supabase }: Session,
  article: string,
  topic: string,
) {
  return supabase.rpc("capture_set_primary_topic", {
    p_article_id: article,
    p_topic_id: topic,
  });
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

export function retryOwnArticle({ supabase }: Session, id: string) {
  return supabase.rpc("capture_retry_article", { p_article_id: id });
}
