import Link from "next/link";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import { ActionsRdv, FormulaireRdv } from "@/components/admin/gestion/Formulaires";
import PanneauAgents, { type AgentsRdv } from "@/components/admin/gestion/PanneauAgents";
import { listRendezVous } from "@/lib/data/gestion";
import { listDemandesAccompagnement } from "@/lib/data/admin";
import { COMPTES_RENDUS, MODES_RDV, TYPES_RDV, enParis, heureParis, jourDepuisLundi, libelle, lundiParis, type RendezVous } from "@/lib/admin/gestion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planning · Admin" };

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/**
 * Le planning des rendez-vous d'accompagnement (27/11/2026) : cette semaine et la suivante, en heure de France.
 * Daniel cale le rendez-vous ici (souvent depuis une demande de rappel : ?demande=…) ; la salle de réunion des
 * bureaux virtuels l'affiche ensuite. Rien n'est envoyé au client depuis cette page.
 */
export default async function AdminPlanning({ searchParams }: { searchParams: Promise<{ demande?: string | string[] }> }) {
  const brut = (await searchParams).demande, idDemande = typeof brut === "string" ? brut : "";
  const [rdvs, demandes] = await Promise.all([listRendezVous(0, 2).catch(() => null), idDemande ? listDemandesAccompagnement().catch(() => []) : Promise.resolve([])]);
  const demande = demandes.find((d) => d.id === idDemande);
  const maintenant = new Date(), lundi = lundiParis(maintenant);

  return (
    <>
      <EnTeteAdmin titre="Planning" texte="Tes rendez-vous d'accompagnement, cette semaine et la suivante, en heure de France. Ils apparaissent dans la salle de réunion des bureaux 3D." />
      {rdvs === null ? (
        <p className="mb-6 rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">La table des rendez-vous n'existe pas encore : applique la migration 0016 dans Supabase.</p>
      ) : (
        [0, 1].map((s) => {
          const semaine = rdvs.filter((r) => Math.floor(jourDepuisLundi(new Date(r.debut), lundi) / 7) === s);
          return (
            <section key={s} className="mb-6">
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-faint">{s ? "Semaine prochaine" : "Cette semaine"} · {semaine.length}</h2>
              {semaine.length === 0 ? (
                <p className="rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">Aucun rendez-vous.</p>
              ) : (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">{semaine.map((r) => <LigneRdv key={r.id} r={r} lundi={lundi} maintenant={maintenant} />)}</ul>
              )}
            </section>
          );
        })
      )}
      {rdvs !== null && (
        <section aria-label="Caler un rendez-vous">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-faint">Caler un rendez-vous</h2>
          {demande && <p className="mb-2 text-[13.5px] text-muted">Pour la demande de {demande.prenom || demande.email} · <Link href="/admin/planning" className="font-semibold text-brand-700">ne pas la lier</Link></p>}
          <FormulaireRdv key={idDemande} client={demande?.prenom ?? ""} demande={demande?.id ?? ""} sujet={demande ? [demande.typeProjet, ...demande.besoins].filter(Boolean).join(" · ").slice(0, 300) : ""} email={demande?.email ?? ""} />
        </section>
      )}
    </>
  );
}

function LigneRdv({ r, lundi, maintenant }: { r: RendezVous; lundi: number; maintenant: Date }) {
  const t = new Date(r.debut), p = enParis(t), j = jourDepuisLundi(t, lundi), passe = t < maintenant;
  return (
    <li className={"flex flex-wrap items-start gap-3 px-4 py-3 " + (r.statut === "annule" ? "opacity-55" : "")}>
      <div className="w-24 shrink-0">
        <p className="text-[12.5px] text-muted">{JOURS[((j % 7) + 7) % 7]} {p.d}</p>
        <p className="num text-[17px] font-semibold text-ink">{heureParis(t)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold text-ink">{r.client}</p>
        <p className="text-[12.5px] text-muted">{libelle(TYPES_RDV, r.type)} · {libelle(MODES_RDV, r.mode)} · {r.dureeMin} min{r.compteRendu !== "aucun" ? ` · compte rendu : ${libelle(COMPTES_RENDUS, r.compteRendu).toLowerCase()}` : ""}</p>
        {r.sujet && <p className="mt-0.5 text-[13px] text-ink">{r.sujet}</p>}
      </div>
      <ActionsRdv id={r.id} statut={r.statut} compteRendu={r.compteRendu} passe={passe} />
      {r.agents ? (
        r.statut !== "annule" && <PanneauAgents id={r.id} client={r.client} passe={passe} a={r.agents as AgentsRdv} />
      ) : (
        <p className="w-full text-[12px] text-faint">Agents Rappels et Agenda : migration 0017 à appliquer.</p>
      )}
    </li>
  );
}
