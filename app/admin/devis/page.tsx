import Link from "next/link";
import { listDemandesDevisAdmin, type DemandeAdmin } from "@/lib/data/reseau";
import { LIBELLES_MER, labelDelai, labelIssue } from "@/lib/reseau/demande";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";
import { dateCourte, messageWhatsApp } from "@/lib/admin/outils";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import ContactRapide from "@/components/admin/ContactRapide";

export const dynamic = "force-dynamic";

const VUES = [
  ["sans-artisan", "Sans artisan"],
  ["en-attente", "En attente de réponse"],
  ["avis", "Avis des clients"],
  ["toutes", "Toutes"],
] as const;
type Vue = (typeof VUES)[number][0];

const FILTRE: Record<Vue, (d: DemandeAdmin) => boolean> = {
  "sans-artisan": (d) => d.reponses.length === 0,
  "en-attente": (d) => d.reponses.length > 0 && d.reponses.every((r) => r.statut !== "acceptee"),
  avis: (d) => d.reponses.some((r) => r.avisNote != null),
  toutes: () => true,
};
const TON = { envoyee: "bg-surface-2 text-muted border border-line", acceptee: "bg-[#e3f5ed] text-[#0b5e40]", refusee: "bg-[#fdf0ef] text-[#8a1f15]", expiree: "bg-[#fff4dc] text-[#8a5300]" } as const;

/**
 * Les demandes de devis des clients (phase 2). « Sans artisan » : aucune entreprise validée ne couvrait la zone, c'est
 * là que Daniel recrute (et qu'il peut rappeler le client). Lecture seule : le client choisit ses artisans lui-même.
 */
export default async function AdminDevis({ searchParams }: { searchParams: Promise<{ vue?: string | string[] }> }) {
  const brut = (await searchParams).vue;
  let toutes: DemandeAdmin[];
  try {
    toutes = await listDemandesDevisAdmin();
  } catch {
    return (
      <>
        <EnTeteAdmin titre="Demandes de devis" />
        <p role="alert" className="rounded-3xl border border-[#f1b8b2] bg-[#fdf0ef] p-5 text-[14px] text-[#8a1f15]">
          Les demandes ne se lisent pas. Si la migration <code>0008_reseau_demandes.sql</code>{" "}n&apos;est pas encore appliquée dans Supabase, c&apos;est la cause.
        </p>
      </>
    );
  }
  const vue: Vue = VUES.some(([v]) => v === brut) ? (brut as Vue) : toutes.some(FILTRE["sans-artisan"]) ? "sans-artisan" : "toutes";
  const liste = toutes.filter(FILTRE[vue]);
  // Les départements où recruter : ceux des demandes restées sans artisan.
  const zones = new Map<string, number>();
  for (const d of toutes.filter(FILTRE["sans-artisan"])) zones.set(d.departement, (zones.get(d.departement) ?? 0) + 1);

  return (
    <>
      <EnTeteAdmin titre="Demandes de devis" texte="Les demandes des clients au Réseau AVYORA. Le client choisit ses artisans ; ici, tu vois les réponses et les zones sans artisan, où recruter." />
      {zones.size > 0 && (
        <p className="mb-4 rounded-2xl bg-[#fff4dc] px-4 py-3 text-[13.5px] text-[#8a5300]">
          <b className="font-semibold">À recruter :</b>{" "}
          {[...zones.entries()].sort((a, b) => b[1] - a[1]).map(([dep, n]) => `${nomDepartement(dep)} (${dep}) : ${n} demande${n > 1 ? "s" : ""}`).join(" · ")}
        </p>
      )}
      <nav aria-label="Filtrer les demandes" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full border border-line bg-surface p-1">
          {VUES.map(([v, label]) => (
            <Link key={v} href={`/admin/devis?vue=${v}`} aria-current={vue === v ? "page" : undefined}
              className={"inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors " + (vue === v ? "bg-brand-600 text-white" : "text-muted hover:text-ink")}>
              {label}<span className={"num text-[12px] " + (vue === v ? "text-white/80" : "text-faint")}>{toutes.filter(FILTRE[v]).length}</span>
            </Link>
          ))}
        </div>
      </nav>
      {liste.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface px-4 py-10 text-center text-[14px] text-muted">Aucune demande dans cette catégorie.</p>
      ) : (
        <ul className="space-y-2.5">
          {liste.map((d) => (
            <li key={d.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{d.metiers.map(labelMetier).join(", ")}</p>
                  <p className="text-[12.5px] text-muted">{d.prenom} · {d.ville ? `${d.ville}, ` : ""}{nomDepartement(d.departement)} ({d.code_postal}) · {labelDelai(d.delai)}{d.estimation ? " · estimation jointe" : ""}{d.photos.length ? ` · ${d.photos.length} photo${d.photos.length > 1 ? "s" : ""}` : ""}</p>
                </div>
                <p className="num text-[12px] text-faint">{dateCourte(d.created_at)}</p>
              </div>
              {d.description && <p className="mt-2 line-clamp-2 text-[13.5px] text-ink">{d.description}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {d.reponses.length === 0 ? <span className="rounded-full bg-[#fff4dc] px-2.5 py-0.5 text-[12px] font-semibold text-[#8a5300]">Aucun artisan dans la zone</span>
                    : d.reponses.map((r) => (
                      <Link key={r.artisanId} href={`/admin/artisans/${r.artisanId}`} className={"rounded-full px-2.5 py-0.5 text-[12px] font-semibold hover:underline " + TON[r.statut]}>
                        {r.nom} · {LIBELLES_MER[r.statut]}{r.issue ? ` · ${labelIssue(r.issue)?.toLowerCase()}` : ""}{r.avisNote != null ? ` · ${r.avisNote}/5` : ""}
                      </Link>
                    ))}
                </div>
                {d.reponses.length === 0 && <ContactRapide tel={d.telephone} email={d.email} whatsapp={messageWhatsApp.demande(d.prenom)} sujet="Ta demande de devis sur AVYORA" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
