"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type InscritRow = {
  id: string;
  email: string;
  createdAt: string;
  type: string;          // clé tuEs[0] : particulier | investisseur | pro | —
  typeLabel: string;
  age: string;
  region: string;
  canal: string;
  plan: "admin" | "pro" | "free";
  nbProjets: number;
};

const FILTRES: [string, string][] = [
  ["tous", "Tous"],
  ["investisseur", "Investisseurs"],
  ["particulier", "Particuliers"],
  ["pro", "Pros"],
  ["mois", "Ce mois"],
];

const fdate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    investisseur: "text-[#7c3aed] bg-[#f0ecff]",
    particulier: "text-[#0e7490] bg-[#e0f5f6]",
    pro: "text-brand-700 bg-[#eef1ff]",
    "—": "text-muted bg-surface-2 border border-line",
    proAbo: "text-white bg-brand-600",
    admin: "text-white bg-[#1E1B4B]",
    free: "text-muted bg-surface-2 border border-line",
  };
  return <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold " + (styles[tone] ?? styles["—"])}>{children}</span>;
}

export default function InscritsTable({ rows }: { rows: InscritRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [f, setF] = useState("tous");

  const filtered = useMemo(() => {
    const j30 = Date.now() - 30 * 864e5;
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (f === "mois" && +new Date(r.createdAt) < j30) return false;
      if (["investisseur", "particulier", "pro"].includes(f) && r.type !== f) return false;
      if (ql && !(`${r.email} ${r.region} ${r.canal}`.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [rows, q, f]);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (email, région, canal…)"
          className="min-w-[180px] flex-1 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-brand-600"
        />
        {FILTRES.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setF(k)}
            className={"rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors " + (f === k ? "border-[#c7ccfe] bg-[#eef1ff] text-brand-700" : "border-line bg-surface-2 text-muted hover:text-ink")}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.05em] text-faint">
              {["Inscrit", "Type", "Âge", "Région", "Canal", "Abo", "Projets", "Inscrit le"].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Aucun inscrit ne correspond.</td></tr>
            ) : filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/admin/inscrits/${r.id}`)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-3"><div className="font-semibold text-ink">{r.email}</div></td>
                <td className="px-4 py-3"><Pill tone={r.type}>{r.typeLabel}</Pill></td>
                <td className="num whitespace-nowrap px-4 py-3">{r.age || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.region || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.canal || "—"}</td>
                <td className="px-4 py-3">{r.plan === "admin" ? <Pill tone="admin">Admin</Pill> : r.plan === "pro" ? <Pill tone="proAbo">Pro</Pill> : <Pill tone="free">Free</Pill>}</td>
                <td className="num px-4 py-3">{r.nbProjets}</td>
                <td className="num whitespace-nowrap px-4 py-3 text-faint">{fdate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
