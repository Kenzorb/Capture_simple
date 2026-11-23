import { prepareLibraryExport } from "../../../lib/supabase/library-export";
import { getRequestSession } from "../../../lib/supabase/request-session";
import { articleError, articleResponseHeaders } from "../articles/response";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return articleError(
      401,
      "unauthenticated",
      "Sign in to export your library.",
    );

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "markdown")
    return articleError(400, "invalid_input", "Choose JSON or Markdown.");

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const library = await prepareLibraryExport(session, format, signal);
  if (!library)
    return articleError(
      503,
      "unavailable",
      "Could not export your library. Try again.",
    );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const part = await library.chunks.next();
        if (part.done) controller.close();
        else controller.enqueue(encoder.encode(part.value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      abort.abort();
      await library.chunks.return(undefined);
    },
  });
  const extension = format === "json" ? "json" : "md";
  return new Response(stream, {
    headers: {
      ...articleResponseHeaders,
      "Content-Type":
        format === "json"
          ? "application/json; charset=utf-8"
          : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="capture-${library.at.slice(0, 10)}.${extension}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
