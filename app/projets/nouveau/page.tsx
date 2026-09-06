import EstimateurRapide from "@/components/EstimateurRapide";

export const dynamic = "force-dynamic";

// Entrée par défaut = estimation rapide (< 3 min). « Affiner » ouvre le détaillé (/detaille).
export default function NouveauProjet() {
  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="eyebrow">Nouvelle estimation</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Estimer une rénovation</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          4 questions, une fourchette immédiate. Tu affineras poste par poste juste après.
        </p>
      </header>
      <EstimateurRapide />
    </div>
  );
}
