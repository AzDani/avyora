import Link from "next/link";
import EstimateurRapide from "@/components/EstimateurRapide";

export const dynamic = "force-dynamic";

// Estimation rapide (< 3 min), gratuite. « Affiner » ouvre le détaillé (/detaille).
export default function NouveauProjetRapide() {
  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="mb-1 text-[13px]">
          <Link href="/projets/nouveau" className="text-muted hover:text-brand-700">← Choisir le type d&apos;estimation</Link>
        </p>
        <p className="eyebrow">Estimation rapide</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Estimer une rénovation</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          4 questions, une fourchette immédiate. Tu affineras poste par poste juste après.
        </p>
      </header>
      <EstimateurRapide />
    </div>
  );
}
