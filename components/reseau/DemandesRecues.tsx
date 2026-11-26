import { LIBELLES_MER, labelDelai } from "@/lib/reseau/demande";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { afficherPortable } from "@/lib/telephone";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";
import { lienAppel, lienWhatsApp } from "@/lib/admin/outils";
import type { DemandeRecue } from "@/lib/data/reseau";
import BoutonsReponse from "@/components/reseau/BoutonsReponse";
import BoutonDevisEnvoye from "@/components/reseau/BoutonDevisEnvoye";
import Link from "next/link";
import { EXPIRATION_JOURS } from "@/lib/reseau/demande";

/**
 * Les demandes de devis reçues par un artisan validé (son espace). Avant sa réponse : la demande sans les coordonnées
 * du client ; après « Accepter » : le prénom, le portable et l'e-mail du client, avec les gestes pour le joindre.
 */
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
const limite = (iso: string) => new Date(Date.parse(iso) + EXPIRATION_JOURS * 86_400_000).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
const TON = { envoyee: "bg-brand-600 text-white", acceptee: "bg-[#e3f5ed] text-[#0b5e40]", refusee: "bg-surface-2 text-muted border border-line", expiree: "bg-surface-2 text-muted border border-line" } as const;

function Carte({ r }: { r: DemandeRecue }) {
  const d = r.demande;
  const lieu = `${d.ville ? `${d.ville} · ` : ""}${nomDepartement(d.departement)} (${d.code_postal})`;
  return (
    <article className={"rounded-3xl border bg-surface p-5 sm:p-6 " + (r.statut === "envoyee" ? "border-brand-600" : "border-line")} data-demande-recue={r.miseId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[16.5px] font-semibold text-ink">{d.metiers.map(labelMetier).join(", ")}</h3>
          <p className="text-[13px] text-muted">{lieu} · {labelDelai(d.delai)}</p>
        </div>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-col sm:items-end">
          <span className={"rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + (r.signe ? TON.acceptee : r.nonRetenu ? TON.refusee : TON[r.statut])}>{r.statut === "envoyee" ? "À répondre" : r.statut === "expiree" ? "Expirée" : r.signe ? "Signé avec toi ✓" : r.nonRetenu ? "Pas retenu" : r.statut === "acceptee" && !r.devisEnvoyeLe ? "Devis à envoyer" : r.statut === "acceptee" ? "Devis envoyé" : LIBELLES_MER[r.statut]}</span>
          <span className="num text-[12px] text-faint">Reçue le {dateCourte(r.envoyeeLe)}</span>
        </span>
      </div>

      {(d.description || d.quantites) && (
        <dl className="mt-3 space-y-2 text-[14px]">
          {d.description && <div><dt className="text-[12px] text-faint">Description</dt><dd className="whitespace-pre-line text-ink">{d.description}</dd></div>}
          {d.quantites && <div><dt className="text-[12px] text-faint">Surfaces et quantités</dt><dd className="whitespace-pre-line text-ink">{d.quantites}</dd></div>}
        </dl>
      )}
      {!d.description && !d.quantites && (r.statut === "envoyee" || r.statut === "acceptee") && (
        <p className="mt-3 text-[13.5px] text-muted">
          {r.statut === "acceptee" ? "Le client n'a pas donné de détails : appelle-le pour préciser son besoin." : "Le client n'a pas donné de détails : si tu acceptes, appelle-le pour préciser son besoin."}
        </p>
      )}

      {d.photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {d.photos.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${i + 1} des travaux`} loading="lazy" className="aspect-square w-full rounded-lg border border-line object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {d.estimation && (
        <details className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-2.5">
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">
            Estimation AVYORA jointe : <span className="num">{euros(d.estimation.ttc)}</span> TTC{d.estimation.surface ? ` · ${d.estimation.surface} m²` : ""}
          </summary>
          <ul className="mt-2 divide-y divide-line text-[13.5px]">
            {d.estimation.lots.map((l) => (
              <li key={l.lot} className="flex justify-between gap-3 py-1.5"><span className="text-ink">{catT("fr", "corps", l.lot)}</span><span className="num text-muted">{euros(l.ttc)}</span></li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-faint">Une estimation indicative, pas un devis : elle sert de base de comparaison.</p>
        </details>
      )}

      {r.statut === "envoyee" && <BoutonsReponse miseId={r.miseId} />}
      {r.statut === "envoyee" && (
        <p className="mt-3 rounded-xl bg-[#fdf1e1] px-3 py-2 text-[13px] text-[#8a5208]">
          Réponds avant le <b>{limite(r.envoyeeLe)}</b> : sans réponse, la demande part à un autre artisan.
        </p>
      )}
      {r.statut === "acceptee" && !r.nonRetenu && (
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Avancement">
          {([
            ["Acceptée", true],
            ["Devis envoyé", !!r.devisEnvoyeLe],
            ["Devis reçu par le client", r.issue === "devis_recu" || r.signe],
            ["Signé", r.signe],
          ] as const).map(([l, fait], i, t) => {
            const enCours = !fait && (i === 0 || t[i - 1][1]);
            return (
              <li key={l} className={"text-[11.5px] leading-tight " + (fait ? "font-semibold text-ink" : enCours ? "font-semibold text-brand-700" : "text-faint")}>
                <span aria-hidden="true" className={"mb-1.5 block h-1.5 rounded-full " + (fait ? "bg-[#0b7a53]" : enCours ? "bg-brand-600" : "bg-line-strong")} />
                {l}<span className="sr-only">{fait ? " : fait" : " : à venir"}</span>
              </li>
            );
          })}
        </ol>
      )}
      {r.statut === "acceptee" && r.client && (
        <div className="mt-4 rounded-2xl bg-[#e3f5ed] p-4">
          <p className="text-[14px] font-semibold text-[#0b5e40]">Ton client : {r.client.prenom}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lienAppel(r.client.telephone) && <a href={lienAppel(r.client.telephone)!} className="btn btn-primary min-h-10 px-4 text-[13.5px]">Appeler</a>}
            {lienWhatsApp(r.client.telephone, `Bonjour ${r.client.prenom}, je suis l'artisan du Réseau AVYORA qui a accepté ta demande de devis.`) && (
              <a href={lienWhatsApp(r.client.telephone, `Bonjour ${r.client.prenom}, je suis l'artisan du Réseau AVYORA qui a accepté ta demande de devis.`)!} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-10 px-4 text-[13.5px]">WhatsApp</a>
            )}
            <a href={`mailto:${r.client.email}?subject=${encodeURIComponent("Ta demande de devis sur AVYORA")}`} className="btn btn-outline min-h-10 px-4 text-[13.5px]">E-mail</a>
          </div>
          <p className="num mt-2 text-[12.5px] text-[#0b5e40]">{afficherPortable(r.client.telephone)} · {r.client.email}</p>
          {r.client.adresse && <p className="mt-1 text-[13px] text-[#0b5e40]">Adresse du chantier : {r.client.adresse}</p>}
        </div>
      )}
      {r.statut === "acceptee" && (r.devisEnvoyeLe
        ? <p className="mt-3 text-[13px] font-semibold text-muted">Devis envoyé le {dateCourte(r.devisEnvoyeLe)}{r.signe ? " · le client a signé avec toi" : r.nonRetenu ? " · le client a choisi un autre artisan" : r.issue === "devis_recu" ? " · le client a indiqué l'avoir reçu" : ""}</p>
        : r.nonRetenu ? <p className="mt-3 text-[13px] font-semibold text-muted">Le client a choisi un autre artisan.</p> : <BoutonDevisEnvoye miseId={r.miseId} />)}
      {r.statut === "expiree" && <p className="mt-3 text-[13px] text-muted">Pas de réponse dans les 5 jours : la demande a été proposée à un autre artisan.</p>}
    </article>
  );
}

export type Onglet = "rep" | "cours" | "fin";
/** Dans quel onglet range-t-on une demande ? À répondre ; En cours (acceptée, ni signée ni perdue) ; Terminées. */
export function ongletDe(r: DemandeRecue): Onglet {
  if (r.statut === "envoyee") return "rep";
  if (r.statut === "acceptee" && !r.signe && !r.nonRetenu) return "cours";
  return "fin";
}
const ONGLETS: [Onglet, string][] = [["rep", "À répondre"], ["cours", "En cours"], ["fin", "Terminées"]];
const VIDE: Record<Onglet, string> = {
  rep: "Rien à répondre pour l'instant. Quand un client de ta zone te choisit, tu reçois un e-mail et la demande apparaît ici.",
  cours: "Aucune demande en cours.",
  fin: "Rien de terminé pour l'instant.",
};

/** Les demandes reçues, rangées en trois onglets (espace artisan, 25/11/2026). Les onglets sont des liens (?onglet=). */
export default function DemandesRecues({ demandes, onglet, masque = false }: { demandes: DemandeRecue[]; onglet: Onglet; masque?: boolean }) {
  const liste = demandes.filter((d) => ongletDe(d) === onglet);
  return (
    <section id="demandes" aria-label="Tes demandes de devis" className="space-y-3">
      <div className="flex gap-1 overflow-x-auto border-b border-line-strong">
        {ONGLETS.map(([k, l]) => {
          const n = demandes.filter((d) => ongletDe(d) === k).length;
          const on = k === onglet;
          return (
            <Link key={k} href={k === "rep" ? "/espace-artisan/demandes" : `/espace-artisan/demandes?onglet=${k}`} aria-current={on ? "page" : undefined}
              className={"-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-semibold " + (on ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:text-ink")}>
              {l}
              <span className={"num rounded-full px-2 text-[11.5px] leading-5 " + (on ? "bg-brand-600 text-white" : "border border-line bg-surface-2 text-muted")}>{n}</span>
            </Link>
          );
        })}
      </div>
      {liste.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">{masque && onglet === "rep" ? "Rien à répondre. Ta fiche est masquée du réseau : tu ne reçois pas de nouvelles demandes." : VIDE[onglet]}</p>
      ) : (
        <div className="space-y-3">{liste.map((r) => <Carte key={r.miseId} r={r} />)}</div>
      )}
    </section>
  );
}
