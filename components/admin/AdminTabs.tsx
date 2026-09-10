"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string][] = [
  ["/admin", "Vue d'ensemble"],
  ["/admin/inscrits", "Inscrits"],
  ["/admin/projets", "Projets"],
];

export default function AdminTabs() {
  const p = usePathname();
  const active = (href: string) => (href === "/admin" ? p === "/admin" : p.startsWith(href));
  return (
    <nav className="inline-flex gap-1 rounded-full border border-line bg-surface p-1 shadow-[0_1px_3px_rgba(30,27,75,.05)]">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
            (active(href) ? "bg-brand text-white" : "text-muted hover:text-ink")
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
