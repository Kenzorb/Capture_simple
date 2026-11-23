import "server-only";

import { structuredNoteSchema } from "@capture/shared";
import type { getAuthenticatedSession } from "./server";

type Session = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSession>>>;
type Preview = { label: string; text: string };
const previewLength = 180;

export async function readOwnSearchPreviews(
  { supabase, user }: Session,
  articleIds: string[],
  query: string,
) {
  const previews = new Map<string, Preview>();
  if (!articleIds.length) return previews;
  const { data } = await supabase
    .from("articles")
    .select(
      "id, article_ai_notes(payload), personal_notes(body), article_topics(topics(name))",
    )
    .eq("user_id", user.id)
    .in("id", articleIds);
  const words = [
    ...new Set(
      query
        .match(/"[^"]+"|[^\s"]+/g)
        ?.filter((term) => !term.startsWith("-") && term.toUpperCase() !== "OR")
        .flatMap((term) => term.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
    ),
  ];

  for (const article of data ?? []) {
    const note = structuredNoteSchema.safeParse(
      article.article_ai_notes[0]?.payload,
    ).data;
    const summary = { label: "AI summary", text: note?.summary };
    const options = [
      summary,
      { label: "Personal note", text: article.personal_notes[0]?.body },
      ...(note?.concepts.map(({ name, definition }) => ({
        label: "Concept",
        text: `${name} · ${definition}`,
      })) ?? []),
      ...article.article_topics.map(({ topics }) => ({
        label: "Topic",
        text: topics?.name,
      })),
    ];
    let best = 0;
    for (const { label, text: raw } of options) {
      const text = raw?.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const lower = text.toLowerCase();
      const hits = words
        .map((word) => lower.indexOf(word))
        .filter((index) => index >= 0);
      if (previews.has(article.id) && hits.length <= best) continue;
      best = hits.length;
      const start = hits.length ? Math.max(0, Math.min(...hits) - 45) : 0;
      const end = start + previewLength;
      previews.set(article.id, {
        label,
        text: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`,
      });
    }
  }
  return previews;
}
