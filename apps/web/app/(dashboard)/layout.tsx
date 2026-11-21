import { redirect } from "next/navigation";

export default function DashboardLayout(): never {
  // Require a verified session when account sign-in is implemented.
  redirect("/sign-in");
}
