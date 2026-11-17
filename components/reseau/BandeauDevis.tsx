import Link from "next/link";

/**
 * L'entrée vers les demandes de devis du Réseau AVYORA (phase 2) : sur la fiche d'un projet (`projetId` : la demande
 * est pré-remplie depuis ses lots et son code postal) ou dans « Mes projets » (vers la liste des demandes). En français
 * seulement : le réseau est en France.
 */
export default function BandeauDevis({ projetId, compact = false }: { projetId?: string; compact?: boolean }) {
  const href = projetId ? `/demandes-devis/nouvelle?projet=${projetId}` : "/demandes-devis";
  if (compact) {
    return (
      <p className="text-[13.5px] text-muted" lang="fr">
        Des devis d&apos;artisans vérifiés pour tes travaux ?{" "}
        <Link href={href} className="py-3 font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700">Mes demandes de devis</Link>
      </p>
    );
  }
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
