import type { Article } from "@capture/shared";
import Link from "next/link";
import { SubmitButton } from "../../(auth)/submit-button";
import { dismissOnboarding } from "./actions";

const link =
  "w-fit rounded font-semibold text-emerald-950 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800";

export function FirstCaptureGuide({
  article,
  failed,
}: {
  article: Pick<Article, "id" | "status"> | undefined;
  failed: boolean;
}) {
  const ready = article?.status === "ready";
  return (
    <section
      aria-labelledby="first-capture-guide"
      className="mt-6 max-w-2xl rounded-xl border border-[#b8c8bd] bg-white p-5"
    >
      <h2 id="first-capture-guide" className="text-lg font-semibold">
        {ready ? "Your first capture is ready" : "Get started with Capture"}
      </h2>
      {ready ? (
        <p className="mt-2 text-sm text-[#506458]">
          Open your Knowledge Tree to find the topic created during analysis.
        </p>
      ) : article ? (
        <p className="mt-2 text-sm text-[#506458]">
          Your first link is saved. Open it to see its analysis status.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-[#506458]">
            Save an article you want to revisit. Capture will generate notes and
            assign a topic after analysis.
          </p>
          <details className="mt-3 text-sm">
            <summary className={"cursor-pointer " + link}>
              Set up the Chrome extension
            </summary>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[#506458]">
              <li>
                In Chrome, open <strong>Manage Extensions</strong>. Enable{" "}
                <strong>Developer mode</strong>, choose{" "}
                <strong>Load unpacked</strong>, and select your Capture
                extension folder.
              </li>
              <li>
                Open Capture from Chrome’s Extensions menu. Choose{" "}
                <strong>Connect Capture</strong> and approve the connection.
              </li>
              <li>Open an article and use the Capture popup to save it.</li>
            </ol>
          </details>
        </>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          Could not hide the guide. Try again.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {ready ? (
          <Link href="/dashboard/knowledge-tree" className={link}>
            Open Knowledge Tree
          </Link>
        ) : article ? (
          <Link href={`/dashboard/captures/${article.id}`} className={link}>
            View first capture
          </Link>
        ) : (
          <Link href="#save-link" className={link}>
            Save a link instead
          </Link>
        )}
        <form action={dismissOnboarding}>
          <SubmitButton label={ready ? "Done" : "Skip guide"} />
        </form>
      </div>
    </section>
  );
}
