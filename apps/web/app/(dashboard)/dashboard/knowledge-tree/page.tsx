import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "../../../../lib/supabase/server";
import { readOwnTopicTree } from "../../../../lib/supabase/topics";
import { DashboardHeading } from "../../dashboard-focus";
import { KnowledgeTree } from "./knowledge-tree";

const path = "/dashboard/knowledge-tree";
export const metadata: Metadata = { title: "Knowledge Tree" };

export default async function KnowledgeTreePage() {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/sign-in");
  const tree = await readOwnTopicTree(session);

  return (
    <>
      <DashboardHeading
        view={path}
        className="text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Knowledge Tree
      </DashboardHeading>
      <div className="mt-6 max-w-3xl rounded-xl border border-[#dde5dd] bg-white p-4 sm:p-5">
        {!tree ? (
          <p role="status">
            Could not load topics. Refresh this page to try again.
          </p>
        ) : tree.topics.length ? (
          <KnowledgeTree topics={tree.topics} />
        ) : (
          <p>
            No topics yet. Topics appear as Capture processes new articles.{" "}
            <Link
              href="/dashboard"
              className="font-semibold text-emerald-950 underline"
            >
              Save a link
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
