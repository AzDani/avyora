"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjetActions({
  id,
  archived,
}: {
  id: number;
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
    <div className="flex items-center gap-3 shrink-0 mt-1">
      <Link
        href={`/projets/${id}/modifier`}
        className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA]"
      >
        Modifier
      </Link>
      <button onClick={archiver} className="text-xs text-slate-400 hover:text-slate-700">
        {archived ? "Désarchiver" : "Archiver"}
      </button>
      <button onClick={supprimer} className="text-xs text-slate-400 hover:text-red-600">
        Supprimer
      </button>
    </div>
  );
}
