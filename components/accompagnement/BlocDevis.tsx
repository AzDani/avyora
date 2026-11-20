import Link from "next/link";

/**
 * L'encart « tu as un devis ? » des pages de prix (référencement du 20/11/2026). Celui qui cherche « prix rénovation
 * salle de bain » a souvent un devis en main, ou va en demander : on lui propose les deux suites, au moment où il lit
 * le prix. Liens vers les URL canoniques (pages indexables), sans paramètre. Ni prix ni emoji.
 */
export default function BlocDevis({ nom }: { nom: string }) {
  return (
    <aside aria-label="Tes devis" className="not-prose my-8 grid gap-3 sm:grid-cols-2" data-bloc-devis="">
      <Link href="/relecture-devis-travaux" className="group block rounded-2xl border border-line bg-surface p-5 no-underline transition-colors hover:border-brand-600">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-700">Tu as déjà un devis ?</span>
        <span className="mt-1.5 block text-[16px] font-semibold text-ink">Fais-le vérifier par un ancien chef de chantier</span>
        <span className="mt-1 block text-[14px] leading-relaxed text-muted">Oublis, postes flous, prix hors marché pour {nom} : tu sais quoi corriger avant de signer. Premier appel gratuit.</span>
        <span className="mt-2 block text-[14px] font-semibold text-brand-700 group-hover:underline">Faire vérifier mon devis →</span>
      </Link>
      <Link href="/trouver-un-artisan" className="group block rounded-2xl border border-line bg-surface p-5 no-underline transition-colors hover:border-brand-600">
        <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-700">Pas encore de devis ?</span>
        <span className="mt-1.5 block text-[16px] font-semibold text-ink">Demande-les à des artisans vérifiés</span>
        <span className="mt-1 block text-[14px] leading-relaxed text-muted">Jusqu&apos;à 3 artisans de ton département : SIRET, assurance décennale et chantiers vérifiés.</span>
        <span className="mt-2 block text-[14px] font-semibold text-brand-700 group-hover:underline">Trouver un artisan vérifié →</span>
      </Link>
    </aside>
  );
}
