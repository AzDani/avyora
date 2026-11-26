import Link from "next/link";
import type { ResumeDevisClient } from "@/lib/reseau/demande";

/**
 * L'entrée vers les demandes de devis du Réseau AVYORA. En français seulement : le réseau est en France.
 * - Sur « Mes projets » (`compact`) : une carte « Mes demandes de devis » qui dit où en est le client (artisans qui ont
 *   accepté, avis à donner ou à corriger, artisan à remplacer) dès qu'il a une demande ; sinon un lien pour en faire une.
 *   Avant le 26/11/2026, ce n'était qu'une ligne de texte grise : le client ne retrouvait pas ses demandes.
 * - Sur la fiche d'un projet (`projetId`) : « Demander des devis » (pré-rempli depuis le projet), ou « Voir ma demande »
 *   si ce projet a déjà été envoyé aux artisans (pas de doublon).
 */
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export default function BandeauDevis({ projetId, compact = false, resume = null }: { projetId?: string; compact?: boolean; resume?: ResumeDevisClient | null }) {
  if (compact) return <CarteMesDevis resume={resume} />;
  const dejaEnvoyee = projetId && resume ? resume.projets[projetId] : undefined;
  if (dejaEnvoyee) {
    return (
      <section lang="fr" aria-labelledby="bandeau-devis" className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6" data-bandeau-devis="envoyee">
        <div className="min-w-0 max-w-[60ch]">
          <p className="eyebrow">Réseau AVYORA</p>
          <h2 id="bandeau-devis" className="mt-1 text-[17px] font-semibold text-ink">Ce projet est déjà envoyé aux artisans</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Retrouve leurs réponses, leurs coordonnées s&apos;ils ont accepté, et donne ton avis une fois le devis reçu.
          </p>
        </div>
        <Link href={`/demandes-devis#demande-${dejaEnvoyee}`} className="btn btn-primary min-h-11 shrink-0 px-5">Voir ma demande</Link>
      </section>
    );
  }
  const href = projetId ? `/demandes-devis/nouvelle?projet=${projetId}` : "/demandes-devis/nouvelle";
  return (
    <section lang="fr" aria-labelledby="bandeau-devis" className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6" data-bandeau-devis="">
      <div className="min-w-0 max-w-[60ch]">
        <p className="eyebrow">Réseau AVYORA</p>
        <h2 id="bandeau-devis" className="mt-1 text-[17px] font-semibold text-ink">Prêt à passer aux devis ?</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          Envoie ce projet à 3 artisans vérifiés de ton département au plus (SIRET, assurance décennale, chantiers, entretien avec Daniel). Ton estimation leur sert de base : tes devis seront comparables.
        </p>
      </div>
      <Link href={href} className="btn btn-primary min-h-11 shrink-0 px-5">Demander des devis</Link>
    </section>
  );
}

/** La carte de « Mes projets ». */
function CarteMesDevis({ resume }: { resume: ResumeDevisClient | null }) {
  if (!resume) {
    return (
      <p className="text-[13.5px] text-muted" lang="fr" data-mes-devis="vide">
        Des devis d&apos;artisans vérifiés pour tes travaux ?{" "}
        <Link href="/demandes-devis/nouvelle" className="py-3 font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700">Demander des devis</Link>
      </p>
    );
  }
  const taches: [string, string][] = [];
  if (resume.avisARevoir) taches.push([pluriel(resume.avisARevoir, "avis à corriger", "avis à corriger"), "bg-[#fdf0ef] text-[#8a1f15]"]);
  if (resume.avisADonner) taches.push([pluriel(resume.avisADonner, "avis à donner", "avis à donner"), "bg-[#fff4dc] text-[#8a5300]"]);
  if (resume.aRemplacer) taches.push([pluriel(resume.aRemplacer, "artisan à remplacer", "artisans à remplacer"), "bg-surface-2 text-muted border border-line"]);
  const urgent = resume.aFaire > 0;
  return (
    <section lang="fr" aria-labelledby="mes-devis" data-mes-devis="" className={"flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 sm:p-6 " + (urgent ? "border-[#f5d48a] bg-[#fffaf0]" : "border-line bg-surface")}>
      <div className="min-w-0">
        <p className="eyebrow">Réseau AVYORA</p>
        <h2 id="mes-devis" className="mt-1 text-[17px] font-semibold text-ink">Mes demandes de devis</h2>
        <p className="mt-1 text-[14px] text-muted">
          {pluriel(resume.demandes, "demande envoyée", "demandes envoyées")}
          {" · "}
          {resume.acceptes ? `${pluriel(resume.acceptes, "artisan a accepté", "artisans ont accepté")}` : "en attente des artisans"}
        </p>
        {taches.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {taches.map(([texte, ton]) => <li key={texte} className={"rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold " + ton}>{texte}</li>)}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link href="/demandes-devis/nouvelle" className="btn btn-ghost min-h-11 px-4 text-[14px]">Nouvelle demande</Link>
        <Link href="/demandes-devis" className={"btn min-h-11 px-5 " + (urgent ? "btn-primary" : "btn-outline")}>Voir mes demandes</Link>
      </div>
    </section>
  );
}
