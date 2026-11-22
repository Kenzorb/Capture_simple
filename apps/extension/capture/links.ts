import { articleParamsSchema } from "@capture/shared";

export function captureLinks(webOrigin: string) {
  const library = new URL("/dashboard/captures", webOrigin);
  return {
    library: library.href,
    article(id: string) {
      const article = articleParamsSchema.safeParse({ id });
      if (!article.success) return null;
      return new URL(`${library.pathname}/${article.data.id}`, library).href;
    },
  };
}
