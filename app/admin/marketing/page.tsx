import Link from "next/link";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import ChangerStatut from "@/components/admin/marketing/ChangerStatut";
import { ErreurProspection, lireProspection } from "@/lib/data/prospection";
import { ErreurSeo, lireSeo } from "@/lib/data/seo";
import SectionSeo from "@/components/admin/marketing/SectionSeo";
import type { ResumeSeo } from "@/lib/seo/resume";
import { CIBLES, NOMS_CIBLES, NOMS_STATUTS, STATUTS, estCible, estStatut, nomLot, type Prospect, type ResumeProspection } from "@/lib/prospection/statuts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing · Admin" };

/**
 * Le suivi de l'Agent Prospection (28/11/2026). Les e-mails partent du Mac de Daniel (scripts/prospection.mjs), jamais du
 * site : cette page lit les prospects et permet seulement de changer leur statut et leur note. La salle Marketing des
 * bureaux 3D lit les mêmes chiffres.
 */
export default async function AdminMarketing({ searchParams }: { searchParams: Promise<{ statut?: string | string[]; cible?: string | string[] }> }) {
  const q = await searchParams;
  const statut = estStatut(q.statut) ? q.statut : null, cible = estCible(q.cible) ? q.cible : null;
  let resume: ResumeProspection | null = null, migrationAbsente = false;
  let seo: ResumeSeo | null = null, seoSansTable = false;
  await Promise.all([
    lireProspection().then((x) => { resume = x; }).catch((e) => { migrationAbsente = e instanceof ErreurProspection && e.migrationAbsente; }),
    lireSeo().then((x) => { seo = x; }).catch((e) => { seoSansTable = e instanceof ErreurSeo && e.migrationAbsente; }),
  ]);

  return (
    <>
      <EnTeteAdmin titre="Marketing" texte="L'Agent Prospection écrit aux pros du bâtiment depuis contact@getavyora.fr ; l'Agent SEO suit le classement Google et les points d'amélioration. Ici, tu suis leur travail. Rien ne part d'ici et rien ne change sur le site sans ton go." />
      {!resume ? (
        <p className="mb-6 rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">
          {migrationAbsente ? "La table des prospects n'existe pas encore : applique la migration 0019 dans Supabase." : "La lecture des prospects a échoué. Recharge la page dans une minute."}
        </p>
      ) : (
        <Contenu r={resume} statut={statut} cible={cible} />
      )}
      <SectionSeo r={seo} migrationAbsente={seoSansTable} />
    </>
  );
}

function Contenu({ r, statut, cible }: { r: ResumeProspection; statut: string | null; cible: string | null }) {
  const liste = r.prospects.filter((p) => (!statut || p.statut === statut) && (!cible || p.cible === cible));
  const lien = (s: string | null, c: string | null) => {
    const u = new URLSearchParams();
    if (s) u.set("statut", s);
    if (c) u.set("cible", c);
    const t = u.toString();
    return t ? `/admin/marketing?${t}` : "/admin/marketing";
  };
  return (
    <>
      <section aria-label="Les chiffres" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tuile titre="Envoyés" valeur={r.envoyes} detail={`${r.envoyes7} ces 7 jours`} />
        <Tuile titre="Réponses" valeur={r.reponses} detail="STOP compris" />
        <Tuile titre="Intéressés" valeur={r.parStatut.interesse} detail={`${r.parStatut.repondu} autre${r.parStatut.repondu > 1 ? "s" : ""} à lire`} ton={r.aTraiter ? "attention" : undefined} />
        <Tuile titre="Rendez-vous" valeur={r.parStatut.rdv} detail={`${r.parStatut.inscrit} inscrit${r.parStatut.inscrit > 1 ? "s" : ""}`} />
        <Tuile titre="STOP" valeur={r.parStatut.stop} detail="Plus jamais d'e-mail" />
        <Tuile titre="À relancer" valeur={r.aRelancer} detail="Après 7 jours, une seule fois" ton={r.aRelancer ? "attention" : undefined} />
      </section>
      {r.dernierLot && <p className="mb-4 text-[13px] text-muted">Dernier lot : {nomLot(r.dernierLot.lot)} · {r.dernierLot.nb} prospect{r.dernierLot.nb > 1 ? "s" : ""}.</p>}

      <nav aria-label="Filtrer par statut" className="mb-2 flex flex-wrap gap-1.5">
        <Filtre href={lien(null, cible)} actif={!statut}>Tous · {r.total}</Filtre>
        {STATUTS.filter((k) => r.parStatut[k] > 0).map((k) => <Filtre key={k} href={lien(k, cible)} actif={statut === k}>{NOMS_STATUTS[k]} · {r.parStatut[k]}</Filtre>)}
      </nav>
      <nav aria-label="Filtrer par cible" className="mb-4 flex flex-wrap gap-1.5">
        <Filtre href={lien(statut, null)} actif={!cible}>Toutes les cibles</Filtre>
        {CIBLES.filter((k) => r.parCible[k] > 0).map((k) => <Filtre key={k} href={lien(statut, k)} actif={cible === k}>{NOMS_CIBLES[k]} · {r.parCible[k]}</Filtre>)}
      </nav>

      {liste.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-[14px] text-muted">{r.total ? "Aucun prospect avec ces filtres." : "Aucun prospect pour l'instant : l'agent les ajoute à chaque envoi."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[900px] text-left text-[13.5px]">
            <thead className="border-b border-line text-[12px] font-semibold text-muted">
              <tr>
                <th scope="col" className="px-3 py-2.5">Entreprise</th>
                <th scope="col" className="px-3 py-2.5">Contact</th>
                <th scope="col" className="px-3 py-2.5">Cible</th>
                <th scope="col" className="px-3 py-2.5">Métier</th>
                <th scope="col" className="px-3 py-2.5">Commune</th>
                <th scope="col" className="px-3 py-2.5">Envoyé le</th>
                <th scope="col" className="px-3 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">{liste.map((p) => <LigneProspect key={p.id} p={p} />)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—");

function LigneProspect({ p }: { p: Prospect }) {
  return (
    <tr className={"align-top " + (p.statut === "stop" ? "opacity-70" : "")}>
      <td className="px-3 py-2.5">
        <p className="font-semibold text-ink">{p.entreprise}</p>
        <p className="text-[12px] text-faint">{p.email}</p>
      </td>
      <td className="px-3 py-2.5 text-muted">{p.contact || "—"}</td>
      <td className="px-3 py-2.5 text-muted">{NOMS_CIBLES[p.cible]}</td>
      <td className="px-3 py-2.5 text-muted">{p.metier || "—"}</td>
      <td className="px-3 py-2.5 text-muted">{p.commune || p.ville || "—"}</td>
      <td className="num px-3 py-2.5 text-muted">
        {date(p.envoyeLe)}
        {p.relanceLe && <span className="block text-[12px] text-faint">relancé le {date(p.relanceLe)}</span>}
      </td>
      <td className="px-3 py-2.5"><ChangerStatut key={`${p.statut}-${p.majLe}`} id={p.id} statut={p.statut} note={p.note} /></td>
    </tr>
  );
}

function Filtre({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={actif ? "page" : undefined} className={"inline-flex min-h-8 items-center rounded-full border px-3 text-[12.5px] font-semibold " + (actif ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-muted hover:text-ink")}>
      {children}
    </Link>
  );
}

function Tuile({ titre, valeur, detail, ton }: { titre: string; valeur: number; detail: string; ton?: "attention" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[12.5px] font-semibold text-muted">{titre}</p>
      <p className={"num mt-1 text-[24px] font-semibold " + (ton === "attention" ? "text-[#b54708]" : "text-ink")}>{valeur}</p>
      <p className="mt-1 text-[12.5px] text-muted">{detail}</p>
    </div>
  );
}
