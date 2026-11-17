import { LIBELLES_MER, labelDelai } from "@/lib/reseau/demande";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { afficherPortable } from "@/lib/telephone";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";
import { lienAppel, lienWhatsApp } from "@/lib/admin/outils";
import type { DemandeRecue } from "@/lib/data/reseau";
import BoutonsReponse from "@/components/reseau/BoutonsReponse";

/**
 * Les demandes de devis reçues par un artisan validé (son espace). Avant sa réponse : la demande sans les coordonnées
 * du client ; après « Accepter » : le prénom, le portable et l'e-mail du client, avec les gestes pour le joindre.
 */
const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
const TON = { envoyee: "bg-brand-600 text-white", acceptee: "bg-[#e3f5ed] text-[#0b5e40]", refusee: "bg-surface-2 text-muted border border-line" } as const;

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
        <span className="flex flex-col items-end gap-1">
          <span className={"rounded-full px-2.5 py-0.5 text-[12px] font-semibold " + TON[r.statut]}>{r.statut === "envoyee" ? "À répondre" : LIBELLES_MER[r.statut]}</span>
          <span className="num text-[12px] text-faint">Reçue le {dateCourte(r.envoyeeLe)}</span>
        </span>
      </div>

      {(d.description || d.quantites) && (
        <dl className="mt-3 space-y-2 text-[14px]">
          {d.description && <div><dt className="text-[12px] text-faint">Description</dt><dd className="whitespace-pre-line text-ink">{d.description}</dd></div>}
          {d.quantites && <div><dt className="text-[12px] text-faint">Surfaces et quantités</dt><dd className="whitespace-pre-line text-ink">{d.quantites}</dd></div>}
        </dl>
      )}
      {!d.description && !d.quantites && (
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
        </div>
      )}
    </article>
  );
}

export default function DemandesRecues({ demandes }: { demandes: DemandeRecue[] }) {
  const aRepondre = demandes.filter((d) => d.statut === "envoyee");
  const autres = demandes.filter((d) => d.statut !== "envoyee");
  return (
    <section id="demandes" aria-labelledby="demandes-titre" className="scroll-mt-28 space-y-3">
      <h2 id="demandes-titre" className="text-[18px] font-semibold text-ink">
        Tes demandes de devis{aRepondre.length > 0 && <span className="num ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[12px] font-bold text-white">{aRepondre.length} à répondre</span>}
      </h2>
      {demandes.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface-2 p-5 text-[14px] text-muted">
          Pas encore de demande. Quand un client de ta zone te choisit, tu reçois un e-mail et la demande apparaît ici.
        </p>
      ) : (
        <div className="space-y-3">{[...aRepondre, ...autres].map((r) => <Carte key={r.miseId} r={r} />)}</div>
      )}
    </section>
  );
}
