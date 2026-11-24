import { articleParamsSchema } from "@capture/shared";
import { RetryAfterError } from "inngest";
import { generateOpenAiNote } from "../processing/openai-notes";
import { prepareSource } from "../processing/prepare-source";
import { segmentSource } from "../processing/segment-source";
import {
  modelCostEstimate,
  reportCaptureTelemetry,
} from "../processing/telemetry";
import { createPrivilegedSupabaseClient } from "../supabase/admin";
import { inngest } from "./client";

const sourceRetries = 2;

export const processCaptureJob = inngest.createFunction(
  {
    id: "process-capture-job",
    triggers: [{ event: "capture/job.requested" }],
    concurrency: { limit: 2 },
    retries: sourceRetries,
    timeouts: { start: "5m", finish: "2m" },
  },
  async ({ event, runId, step, attempt }) => {
    const target = articleParamsSchema.safeParse({ id: event.data?.jobId });
    const generation = event.data?.generation ?? 1;
    if (
      !target.success ||
      typeof generation !== "number" ||
      !Number.isInteger(generation) ||
      generation < 1 ||
      generation > 3
    )
      return { status: "ignored" };
    const jobId = target.data.id;
    const execution = { p_job_id: jobId, p_execution_id: runId };
    async function infrastructureFailure(code: string) {
      await reportCaptureTelemetry({
        event: "capture_system_failure",
        jobId,
        code,
        attempt,
        generation,
      });
      return new Error(code);
    }

    const started = await step.run("start-capture-job", async () => {
      const { data, error } = await createPrivilegedSupabaseClient().rpc(
        "capture_start_delivery",
        { ...execution, p_generation: generation },
      );
      if (error) throw await infrastructureFailure("job_start_failed");
      return data;
    });
    if (!started) return { status: "ignored" };

    // Keep article text and notes out of the job provider's recorded step outputs.
    return step.run("prepare-and-publish-note", async () => {
      const supabase = createPrivilegedSupabaseClient();
      async function finish(status: "failed" | "unsupported", code: string) {
        const { data, error } = await supabase.rpc("capture_finish_job", {
          ...execution,
          p_status: status,
          p_error_code: code,
        });
        if (error) throw await infrastructureFailure("job_finalize_failed");
        if (data)
          await reportCaptureTelemetry({
            event: "capture_job_finished",
            jobId,
            code,
            attempt,
            generation,
          });
        return { status: data ? status : "ignored" };
      }
      const job = await supabase
        .from("processing_jobs")
        .select("article_id,user_id,created_at")
        .eq("id", jobId)
        .eq("execution_id", runId)
        .eq("status", "processing")
        .maybeSingle();
      if (job.error) throw await infrastructureFailure("job_read_failed");
      if (!job.data) return { status: "ignored" };
      if (attempt === 0)
        await reportCaptureTelemetry({
          event: "capture_job_started",
          jobId,
          generation,
          attempt,
          queueLagMs: Math.max(0, Date.now() - Date.parse(job.data.created_at)),
        });
      const { article_id: id, user_id: owner } = job.data;
      const [article, content] = await Promise.all([
        supabase
          .from("articles")
          .select("url")
          .eq("id", id)
          .eq("user_id", owner)
          .maybeSingle(),
        supabase
          .from("article_contents")
          .select("cleaned_text,extraction_method")
          .eq("article_id", id)
          .eq("user_id", owner)
          .maybeSingle(),
      ]);
      if (article.error || content.error)
        throw await infrastructureFailure("job_source_read_failed");
      if (!article.data) return { status: "ignored" };

      const source = await prepareSource({
        url: article.data.url,
        capturedText: content.data?.cleaned_text ?? null,
      });
      if (source.status === "unsupported")
        return finish("unsupported", "source_unsupported");
      if (source.status === "unavailable") {
        if (attempt < sourceRetries) {
          await reportCaptureTelemetry({
            event: "capture_source_retry",
            jobId,
            code: source.code,
            attempt,
            generation,
          });
          throw new RetryAfterError(source.code, `${2 ** (attempt + 1)}s`);
        }
        return finish("failed", source.code);
      }
      const { text, hash, chunks } = segmentSource(source.text);
      if (!chunks.length) return finish("unsupported", "source_empty");

      const stored = await supabase.rpc("capture_store_source", {
        ...execution,
        p_text: text,
        p_hash: hash,
        p_method:
          content.data?.extraction_method === "http" ? "http" : source.method,
        p_chunks: chunks,
      });
      if (stored.error)
        throw await infrastructureFailure("job_evidence_write_failed");
      if (!stored.data) return { status: "ignored" };
      const result = await generateOpenAiNote(chunks);
      if (result.status !== "ready")
        return finish(
          "failed",
          result.status === "unavailable" ? result.code : result.status,
        );
      const { inputTokens, outputTokens } = result.usage;
      await reportCaptureTelemetry({
        event: "capture_model_usage",
        jobId,
        inputTokens,
        outputTokens,
        estimatedUsd: modelCostEstimate(
          result.note.model,
          inputTokens,
          outputTokens,
        ),
      });

      const references = new Set(chunks.map(({ chunk_id }) => chunk_id));
      if (
        [...result.note.sections, ...result.note.concepts].some(
          ({ evidence_chunk_ids }) =>
            evidence_chunk_ids.some((id) => !references.has(id)),
        )
      )
        return finish("failed", "unverified_evidence");

      const published = await supabase.rpc("capture_publish_note", {
        ...execution,
        p_note: result.note,
      });
      if (published.error)
        throw await infrastructureFailure("job_note_write_failed");
      if (published.data)
        await reportCaptureTelemetry({
          event: "capture_job_finished",
          jobId,
          code: "ready",
          attempt,
          generation,
        });
      return { status: published.data ? "ready" : "ignored" };
    });
  },
);
