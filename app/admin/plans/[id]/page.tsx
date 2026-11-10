import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlanAdmin, listPlansAdmin, getProjetAdmin } from "@/lib/data/admin";
import ApercuPlan from "@/components/plans/ApercuPlan";
import { apercuDepuisEtat } from "@/lib/plans/apercu";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const nb = (n: number, d = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);
const fdate = (s: string) => new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Vue plan ADMIN : la carte du plan (vignette, surface, pièces, budget indicatif, estimations nées du plan) et
 * l'ouverture dans le VRAI éditeur, en lecture seule (`/admin/plans/editeur?id=…` : l'éditeur tourne dans un bac à
 * sable, rien n'est enregistré, ni dans le compte du propriétaire ni sur cet appareil).
 */
export default async function AdminPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const plan = await getPlanAdmin(id);
  if (!plan) notFound();
  const carte = (await listPlansAdmin()).find((p) => p.id === id);
  const niveaux = Array.isArray(plan.etat.levels) ? plan.etat.levels.length : 0;
  const estimations = (await Promise.all((carte?.estimations ?? []).map((pid) => getProjetAdmin(pid)))).filter((x) => x !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/admin/inscrits/${plan.ownerId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {plan.email}
          </Link>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">{plan.nom}</h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="chip">{plan.workflow === "final_plan" ? "Plan final" : "Projet rénovation"}</span>
            {carte?.m2 ? <span className="chip num">{nb(carte.m2, 1)} m²</span> : null}
            {carte?.pieces != null ? <span className="chip num">{carte.pieces} pièce{carte.pieces > 1 ? "s" : ""}</span> : null}
            <span className="chip num">{niveaux} niveau{niveaux > 1 ? "x" : ""}</span>
            <span className="chip">modifié le {fdate(plan.updatedAt)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f0c98a] bg-[#fdf1e1] px-3 py-1.5 text-[12px] font-semibold text-[#b06d10]">
          👁 Vue admin · lecture seule
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
          <div className="aspect-[4/3] w-full rounded-2xl border border-line bg-surface-2 p-4 text-ink">
            <ApercuPlan murs={apercuDepuisEtat(plan.etat)} className="h-full w-full" />
          </div>
          <a
            href={`/admin/plans/editeur?id=${plan.id}`}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Ouvrir dans l&apos;éditeur (lecture seule)
          </a>
          <p className="mt-2 text-[12.5px] text-muted">
            Le vrai éditeur, avec le plan tel que la personne l&apos;a laissé : 2D, 3D, vues Avant / Travaux / Après. Tu peux tout regarder ; rien de ce que tu fais n&apos;est enregistré.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Budget indicatif du plan</p>
            <p className="num mt-1 text-[24px] font-semibold text-brand-700">{carte?.budget ? euros(carte.budget) : "—"}</p>
            <p className="mt-1 text-[12.5px] text-muted">Le compteur du bas de l&apos;éditeur, au moment de la dernière sauvegarde.</p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(30,27,75,.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Estimations nées de ce plan</p>
            {estimations.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">Aucune pour l&apos;instant.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {estimations.map((e) => (
                  <li key={e.id}><Link href={`/admin/projets/${e.id}`} className="text-[13.5px] font-semibold text-ink hover:text-brand-700">{e.nom} →</Link></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
