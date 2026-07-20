"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjetActions({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const router = useRouter();

  async function archiver() {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    router.refresh();
  }

  async function supprimer() {
    if (!confirm("Supprimer définitivement ce projet et tout son contenu (devis, dépenses, métré) ?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href={`/projets/${id}/modifier`} className="btn btn-outline py-2 text-[13px]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L6 12l-2.7.7L4 10l7.5-7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        Modifier
      </Link>
      <button onClick={archiver} className="btn btn-ghost py-2 text-[13px]" title={archived ? "Désarchiver" : "Archiver"}>
        {archived ? "Désarchiver" : "Archiver"}
      </button>
      <button
        onClick={supprimer}
        className="btn btn-ghost py-2 text-[13px] text-faint hover:!bg-danger-soft hover:!text-danger"
        title="Supprimer le projet"
        aria-label="Supprimer le projet"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 4.5h10M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M5 4.5l.5 8c0 .5.4.8.8.8h3.4c.4 0 .8-.3.8-.8l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
