import type { Metadata } from "next";
import { artisanValideOuRetour, dateLongue } from "@/lib/reseau/espace";
import { documentsDe, majDemandeeDe, urlsSignees } from "@/lib/data/reseau";
import { aujourdhuiParis, DOCS } from "@/lib/reseau/candidature";
import { ALERTE_DECENNALE_JOURS, joursAvant } from "@/lib/reseau/avis";
import { afficherPortable } from "@/lib/telephone";
import { Recap } from "@/components/reseau/espace/RecapDossier";
import { ChangerPortable, DemandeModification, NouvelleDecennale } from "@/components/reseau/espace/ActionsDossier";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon dossier · Espace artisan", robots: { index: false, follow: false } };

/** Le dossier vérifié par Daniel, les documents déposés, et ce que l'artisan peut changer. */
export default async function PageDossier() {
  const { user, artisan: a } = await artisanValideOuRetour();
  const [docs, maj] = await Promise.all([documentsDe(user.id), majDemandeeDe(a.id).catch(() => null)]);
  const urls = await urlsSignees(docs.filter((d) => d.type !== "photo").map((d) => d.chemin));
  const jours = joursAvant(a.decennaleFin, aujourdhuiParis());
  const attestations = docs.filter((d) => d.type === "decennale" || d.type === "rc_pro").reverse();
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Mon dossier</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">Ce que Daniel a vérifié pour te faire entrer dans le réseau.</p>
      </div>

      {maj && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-[13.5px] text-brand-900">
          {maj.type === "decennale"
            ? `Ta nouvelle décennale (${maj.assureur}, jusqu'au ${dateLongue(maj.fin)}) est en cours de vérification par Daniel.`
            : "Ta demande de modification est entre les mains de Daniel : il revient vers toi."}
        </p>
      )}
      {jours <= ALERTE_DECENNALE_JOURS && maj?.type !== "decennale" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-[#f3d9b1] bg-surface p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">{jours < 0 ? `Ta décennale a expiré le ${dateLongue(a.decennaleFin)}` : `Ta décennale est valable jusqu'au ${dateLongue(a.decennaleFin)}`}</p>
            <p className="mt-0.5 text-[13px] text-muted">{jours < 0 ? "Tu ne reçois plus de demandes : envoie ta nouvelle attestation." : "Envoie ta nouvelle attestation dès que ton assureur te la donne."}</p>
          </div>
          <NouvelleDecennale />
        </div>
      )}

      <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="entreprise">
        <h2 id="entreprise" className="mb-4 text-[16px] font-semibold text-ink">Ton entreprise</h2>
        <Recap a={a} />
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="docs">
        <h2 id="docs" className="mb-3 text-[16px] font-semibold text-ink">Tes attestations</h2>
        {attestations.length === 0 ? <p className="text-[14px] text-muted">Aucune attestation.</p> : (
          <ul className="space-y-2">
            {attestations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{DOCS[d.type].label}</span>
                  <span className="block truncate text-[12.5px] text-muted">{d.nom} · déposée le {dateLongue(d.createdAt)}</span>
                </span>
                {urls.get(d.chemin) && <a href={urls.get(d.chemin)} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-9 px-3 text-[13px]">Ouvrir</a>}
              </li>
            ))}
          </ul>
        )}
        {jours > ALERTE_DECENNALE_JOURS && maj?.type !== "decennale" && <div className="mt-3"><NouvelleDecennale /></div>}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="changer">
        <h2 id="changer" className="mb-3 text-[16px] font-semibold text-ink">Changer une information</h2>
        <div className="flex flex-wrap gap-2">
          <ChangerPortable actuel={afficherPortable(a.telephone)} />
          <DemandeModification />
        </div>
        <p className="mt-3 text-[13px] text-muted">Le portable change tout de suite. Les métiers, la zone et la décennale repassent par Daniel avant d&apos;être en ligne.</p>
      </section>
    </div>
  );
}
