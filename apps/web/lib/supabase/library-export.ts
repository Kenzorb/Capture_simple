import "server-only";

import { structuredNoteSchema } from "@capture/shared";
import type { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;
type Format = "json" | "markdown";
const pageSize = 50;

function markdownText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#+\-.!|]/g, "\\$&");
}

function articlePage(
  { supabase, user }: Session,
  at: string,
  signal: AbortSignal,
  cursor?: { captured_at: string; id: string },
) {
  const query = supabase
    .from("articles")
    .select(
      "id, url, title, domain, author, published_at, captured_at, archived_at, updated_at, status, article_ai_notes(payload), personal_notes(body), article_topics(is_primary, assignment_source, topics(id, name))",
    )
    .eq("user_id", user.id)
    .lte("captured_at", at)
    .order("captured_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize)
    .abortSignal(signal);
  if (cursor)
    query.or(
      `captured_at.lt.${cursor.captured_at},and(captured_at.eq.${cursor.captured_at},id.lt.${cursor.id})`,
    );
  return query;
}

function topicPage(
  { supabase, user }: Session,
  at: string,
  signal: AbortSignal,
  cursor?: { id: string },
) {
  const query = supabase
    .from("topics")
    .select("id, parent_id, name, description, created_at")
    .eq("user_id", user.id)
    .lte("created_at", at)
    .order("id")
    .limit(pageSize)
    .abortSignal(signal);
  if (cursor) query.gt("id", cursor.id);
  return query;
}

async function* exportRows<Row>(
  first: Row[],
  load: (cursor: Row) => PromiseLike<{ data: Row[] | null; error: unknown }>,
) {
  let page = first;
  while (page.length) {
    yield* page;
    if (page.length < pageSize) return;
    const { data, error } = await load(page[page.length - 1]);
    if (error || !data) throw new Error("Could not finish library export.");
    page = data;
  }
}

type ArticleRow = NonNullable<
  Awaited<ReturnType<typeof articlePage>>["data"]
>[number];

function portableArticle({
  article_ai_notes,
  personal_notes,
  article_topics,
  ...article
}: ArticleRow) {
  return {
    ...article,
    topics: article_topics.flatMap(
      ({ topics, is_primary, assignment_source }) =>
        topics ? [{ ...topics, is_primary, assignment_source }] : [],
    ),
    personal_note: personal_notes[0]?.body ?? null,
    ai_note:
      structuredNoteSchema.safeParse(article_ai_notes[0]?.payload).data ?? null,
  };
}

function renderArticle(article: ReturnType<typeof portableArticle>) {
  const escape = markdownText;
  const original = URL.parse(article.url);
  const link =
    original &&
    (original.protocol === "https:" || original.protocol === "http:")
      ? `[Open original](<${original.href}>)`
      : escape(article.url);
  const lines = [
    `## ${escape(article.title)}`,
    "",
    link,
    "",
    `- Captured ${article.captured_at}`,
    `- Status ${escape(article.status)}`,
  ];
  if (article.author) lines.push(`- Author ${escape(article.author)}`);
  if (article.published_at) lines.push(`- Published ${article.published_at}`);
  if (article.archived_at) lines.push(`- Archived ${article.archived_at}`);
  for (const topic of article.topics)
    lines.push(
      `- ${topic.is_primary ? "Primary topic" : "Topic"} ${escape(topic.name)}`,
    );
  if (article.personal_note !== null)
    lines.push("", "### Personal note", "", escape(article.personal_note));
  const note = article.ai_note;
  if (note) {
    lines.push("", "### AI notes", "", escape(note.summary));
    for (const takeaway of note.key_takeaways)
      lines.push(`- ${escape(takeaway)}`);
    for (const section of note.sections) {
      lines.push("", `#### ${escape(section.heading)}`, "");
      for (const point of section.points) lines.push(`- ${escape(point)}`);
    }
    if (note.concepts.length) {
      lines.push("", "#### Concepts", "");
      for (const { name, definition } of note.concepts)
        lines.push(`- ${escape(name)} — ${escape(definition)}`);
    }
    if (note.tags.length)
      lines.push("", `Tags ${note.tags.map(escape).join(", ")}`);
  }
  return lines.join("\n") + "\n\n";
}

export async function prepareLibraryExport(
  session: Session,
  format: Format,
  signal: AbortSignal,
) {
  const at = new Date().toISOString();
  const [articles, topics] = await Promise.all([
    articlePage(session, at, signal),
    topicPage(session, at, signal),
  ]);
  if (articles.error || !articles.data || topics.error || !topics.data)
    return null;
  const articleRows = exportRows(articles.data, (cursor) =>
    articlePage(session, at, signal, cursor),
  );
  const topicRows = exportRows(topics.data, (cursor) =>
    topicPage(session, at, signal, cursor),
  );

  async function* chunks() {
    if (format === "json") {
      yield `{"schema_version":1,"exported_at":${JSON.stringify(at)},"topics":[`;
      let separator = "";
      for await (const topic of topicRows) {
        yield separator + JSON.stringify(topic);
        separator = ",\n";
      }
      yield '],"articles":[';
      separator = "";
      for await (const article of articleRows) {
        yield separator + JSON.stringify(portableArticle(article));
        separator = ",\n";
      }
      yield "]}\n";
      return;
    }
    yield `# Capture library\n\nExported ${at}\n\n## Topics\n\n`;
    for await (const topic of topicRows) {
      yield `- ${markdownText(topic.name)} (${topic.id})${topic.parent_id ? ` under ${topic.parent_id}` : ""}${topic.description ? ` — ${markdownText(topic.description.replace(/\s+/g, " "))}` : ""}\n`;
    }
    yield "\n# Captures\n\n";
    for await (const article of articleRows)
      yield renderArticle(portableArticle(article));
  }

  return { at, chunks: chunks() };
}
