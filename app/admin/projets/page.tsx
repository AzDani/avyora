import Link from "next/link";
import { listInscrits } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fdate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const STATUT_LABEL: Record<string, string> = { estimation: "Estimé", en_cours: "En cours", termine: "Terminé" };
const STATUT_DOT: Record<string, string> = { estimation: "#4f46e5", en_cours: "#e0a325", termine: "#0f9d6b" };

export default async function AdminProjets() {
  const inscrits = await listInscrits();
  const projets = inscrits
    .flatMap((i) => i.projets.map((p) => ({ ...p, email: i.email })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <div className="border-b border-line px-4 py-3 text-[13px] text-muted">
        <span className="num font-semibold text-ink">{projets.length}</span> projets enregistrés, tous comptes confondus
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.05em] text-faint">
              {["Projet", "Propriétaire", "Bien", "Surface", "CP", "Budget estimé", "Avancement", "Créé le"].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projets.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Aucun projet enregistré.</td></tr>
            ) : projets.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3"><Link href={`/admin/projets/${p.id}`} className="font-semibold text-ink hover:text-brand-700">{p.nom}</Link></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  <Link href={`/admin/inscrits/${p.ownerId}`} className="hover:text-brand-700">{p.email}</Link>
                </td>
                <td className="px-4 py-3 capitalize">{p.typeBien}</td>
                <td className="num whitespace-nowrap px-4 py-3">{p.surface} m²</td>
                <td className="num px-4 py-3">{p.codePostal}</td>
                <td className="num whitespace-nowrap px-4 py-3 font-semibold text-brand-700">{p.ttc != null ? euros(p.ttc) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUT_DOT[p.statut] }} />
                    {STATUT_LABEL[p.statut]}{p.statut === "en_cours" ? ` · ${p.pct} %` : ""}
                  </span>
                </td>
                <td className="num whitespace-nowrap px-4 py-3 text-faint">{fdate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
