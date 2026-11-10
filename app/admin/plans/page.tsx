import Link from "next/link";
import { listPlansAdmin } from "@/lib/data/admin";
import ApercuPlan from "@/components/plans/ApercuPlan";

export const dynamic = "force-dynamic";

const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fdate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const nb = (n: number, d = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);
const TYPE_PLAN: Record<"final_plan" | "renovation", string> = { final_plan: "Plan final", renovation: "Projet rénovation" };

/** Les plans dessinés dans l'éditeur, tous comptes confondus : comme la liste des projets, chaque ligne ouvre la vue admin. */
export default async function AdminPlans() {
  const plans = await listPlansAdmin();

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_3px_rgba(30,27,75,.04)]">
      <div className="border-b border-line px-4 py-3 text-[13px] text-muted">
        <span className="num font-semibold text-ink">{plans.length}</span> plans enregistrés, tous comptes confondus
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.05em] text-faint">
              {["", "Plan", "Propriétaire", "Type", "Surface", "Pièces", "Budget indicatif", "Estimations", "Modifié le"].map((h, i) => (
                <th key={i} className="whitespace-nowrap border-b border-line px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted">Aucun plan enregistré.</td></tr>
            ) : plans.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2">
                  <Link href={`/admin/plans/${p.id}`} aria-label={`Ouvrir ${p.nom}`} className="block h-12 w-16 rounded-lg border border-line bg-surface-2 p-1 text-ink">
                    <ApercuPlan murs={p.apercu} className="h-full w-full" />
                  </Link>
                </td>
                <td className="px-4 py-3"><Link href={`/admin/plans/${p.id}`} className="font-semibold text-ink hover:text-brand-700">{p.nom}</Link></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  <Link href={`/admin/inscrits/${p.ownerId}`} className="hover:text-brand-700">{p.email}</Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3" data-workflow={p.workflow}>{TYPE_PLAN[p.workflow]}</td>
                <td className="num whitespace-nowrap px-4 py-3">{p.m2 ? `${nb(p.m2, 1)} m²` : "—"}</td>
                <td className="num px-4 py-3">{p.pieces ?? "—"}</td>
                <td className="num whitespace-nowrap px-4 py-3 font-semibold text-brand-700">{p.budget ? euros(p.budget) : "—"}</td>
                <td className="num px-4 py-3">{p.estimations.length || "—"}</td>
                <td className="num whitespace-nowrap px-4 py-3 text-faint">{fdate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
