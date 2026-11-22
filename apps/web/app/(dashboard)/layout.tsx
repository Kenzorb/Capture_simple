import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthenticatedUser } from "../../lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await getAuthenticatedUser())) redirect("/sign-in");
  return children;
}
