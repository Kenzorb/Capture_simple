"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/captures", label: "All captures" },
  { href: "/dashboard/knowledge-tree", label: "Knowledge Tree" },
];

export function DashboardNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Library"
      className="mt-4 flex flex-wrap gap-1 sm:mt-0 lg:mt-8 lg:flex-col"
    >
      {links.map(({ href, label }) => {
        const active =
          href === "/dashboard"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bce3ca] ${active ? "bg-[#dcecdf] font-semibold text-[#172e24]" : "text-[#e2eee5] hover:bg-white/10 hover:text-white"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
