import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtisanAdmin, statsMisesEnRelation } from "@/lib/data/reseau";
import { aujourdhuiParis, DOCS } from "@/lib/reseau/candidature";
import { bloquantsValidation } from "@/lib/reseau/artisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { DEPARTEMENTS, nomDepartement } from "@/lib/reseau/departements";
import { afficherPortable } from "@/lib/telephone";
import { dateCourte } from "@/lib/admin/outils";
import ContactRapide from "@/components/admin/ContactRapide";
import PanneauDecision, { BoutonReverifierSiret } from "@/components/admin/reseau/PanneauDecision";
import { PastilleDecennale, PastilleSiret, PastilleStatut } from "@/components/admin/reseau/Pastilles";

export const dynamic = "force-dynamic";

const taille = (o: number) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

function Bloc({ titre, children, action }: { titre: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-faint">{k}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{children}</dd>
    </div>
  );
}

/** Un lien tapé par l'artisan (validé http(s) à l'envoi) : nouvel onglet, sans transmettre l'origine ni le crédit SEO. */
const LienExterne = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand-700 underline">{href}</a>
);

/** La fiche d'une candidature au Réseau AVYORA : le dossier à gauche, les décisions à droite. */
export default async function FicheArtisan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getArtisanAdmin(id).catch(() => null);
  if (!r) notFound();
  const { artisan: a, documents } = r;
  const jour = aujourdhuiParis();
  const nbDec = documents.filter((d) => d.type === "decennale").length;
  const photos = documents.filter((d) => d.type === "photo");
  const attestations = documents.filter((d) => d.type !== "photo");
  const v = a.siretVerif;
  const stats = await statsMisesEnRelation(a.id).catch(() => null);
  const toute = a.departements.length >= DEPARTEMENTS.length;

  return (
    <div className="space-y-5">
      <Link href="/admin/artisans" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Artisans
      </Link>

      <header className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">{a.raisonSociale}</h1>
            <p className="mt-0.5 text-[13.5px] text-muted">
              {a.nomCommercial ? `${a.nomCommercial} · ` : ""}{a.contactNom} · {afficherPortable(a.telephone)} · {a.email}
            </p>
            <p className="num mt-0.5 text-[12.5px] text-faint">Envoyée le {dateCourte(a.soumiseLe)}{a.valideLe ? ` · validée le ${dateCourte(a.valideLe)}` : ""}</p>
            {stats && stats.recues > 0 && (
              <p className="num mt-0.5 text-[12.5px] text-muted">Demandes de devis : {stats.recues} reçue{stats.recues > 1 ? "s" : ""} · {stats.acceptees} acceptée{stats.acceptees > 1 ? "s" : ""} · {stats.refusees} refusée{stats.refusees > 1 ? "s" : ""}</p>
            )}
          </div>
          <PastilleStatut statut={a.statut} />
        </div>
        <div className="mt-3">
          <ContactRapide tel={a.telephone} email={a.email} sujet="Ta candidature au Réseau AVYORA"
            whatsapp={`Bonjour ${a.contactNom}, c'est Daniel d'AVYORA. Je reviens vers toi pour ta candidature au Réseau AVYORA : as-tu un moment pour qu'on s'appelle ?`} />
        </div>
        {a.messageAdmin && (
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted"><b className="text-ink">Ton dernier message à l&apos;artisan :</b> {a.messageAdmin}</p>
        )}
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Bloc titre="Entreprise" action={<BoutonReverifierSiret id={a.id} />}>
            <div className="mb-3 flex flex-wrap gap-1.5"><PastilleSiret v={v} />{a.rge && <span className="inline-flex rounded-full bg-[#e3f5ed] px-2.5 py-0.5 text-[12px] font-semibold text-[#0b5e40]">RGE</span>}</div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <KV k="SIRET"><span className="num">{a.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</span> · <a href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${a.siret}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">fiche officielle</a></KV>
              <KV k="Nom au répertoire">{v?.nom ?? "—"}</KV>
              <KV k="Activité (NAF)">{v?.naf ? `${v.naf}${v.batiment === false ? " · hors bâtiment, à vérifier" : ""}` : "—"}</KV>
              <KV k="Adresse">{v?.adresse ?? "—"}</KV>
              <KV k="Créée le">{v?.dateCreation ? new Date(`${v.dateCreation}T12:00:00Z`).toLocaleDateString("fr-FR") : "—"}</KV>
              <KV k="Vérifié le">{v?.verifieLe ? dateCourte(v.verifieLe) : "—"}</KV>
            </dl>
          </Bloc>

          <Bloc titre="Activité">
            <dl className="space-y-3">
              <KV k="Métiers">
                <span className="flex flex-wrap gap-1.5">{a.metiers.map((m) => <span key={m} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-700">{labelMetier(m)}</span>)}</span>
              </KV>
              <KV k={`Départements (${toute ? "France entière" : a.departements.length})`}>
                {toute ? "Toute la France" : a.departements.map((c) => `${nomDepartement(c)} (${c})`).join(", ")}
              </KV>
              {a.presentation && <KV k="Présentation"><span className="whitespace-pre-line">{a.presentation}</span></KV>}
              {a.siteWeb && <KV k="Site web"><LienExterne href={a.siteWeb} /></KV>}
              {a.lienAvis && <KV k="Avis clients"><LienExterne href={a.lienAvis} /></KV>}
            </dl>
          </Bloc>

          <Bloc titre="Assurance">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <KV k="Assureur">{a.decennaleAssureur}</KV>
              <KV k="Contrat">{a.decennalePolice}</KV>
              <KV k="Fin de validité"><PastilleDecennale fin={a.decennaleFin} aujourdhui={jour} /></KV>
            </dl>
            <ul className="mt-4 space-y-1.5">
              {attestations.length === 0 && <li className="text-[13px] text-[#b42318]">Aucune attestation déposée.</li>}
              {attestations.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13.5px]">
                  <span className="min-w-0 truncate"><b className="font-semibold text-ink">{DOCS[d.type].label}</b> · {d.nom} · {taille(d.taille)}</span>
                  {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-brand-700 underline">Ouvrir</a> : <span className="text-faint">indisponible</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-faint">Les liens d&apos;ouverture valent 10 minutes : recharge la page s&apos;ils ont expiré.</p>
          </Bloc>

          <Bloc titre={`Photos de chantiers (${photos.length})`}>
            {photos.length === 0 ? <p className="text-[13px] text-[#b42318]">Aucune photo.</p> : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((d) => (
                  <li key={d.id} className="overflow-hidden rounded-xl border border-line bg-surface-2">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.url} alt={`Photo de chantier de ${a.raisonSociale} : ${d.nom}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      </a>
                    ) : <span className="flex aspect-[4/3] items-center justify-center text-[12px] text-faint">indisponible</span>}
                  </li>
                ))}
              </ul>
            )}
          </Bloc>
        </div>

        <div className="xl:sticky xl:top-24">
          <PanneauDecision id={a.id} statut={a.statut} appelLe={a.appelLe} bloquants={bloquantsValidation(a, nbDec, jour)} notes={a.notesAdmin ?? ""} />
        </div>
      </div>
    </div>
  );
}
