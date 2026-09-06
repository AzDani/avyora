import Link from "next/link";
import { notFound } from "next/navigation";
import Estimateur from "@/components/Estimateur";
import { getProjet } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

// Édition = le même parcours v2 que la création, pré-rempli avec les réponses enregistrées.
// On enregistre par-dessus le projet existant (PATCH) au lieu d'en créer un nouveau.
export default async function ModifierProjet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projet = await getProjet(id);
  if (!projet) notFound();

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <Link
          href={`/projets/${projet.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour au projet
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Modifier l&apos;estimation</h1>
        <p className="mt-1.5 text-[15px] text-muted">{projet.nom} — ajuste ta saisie, tes choix sont déjà là.</p>
      </header>
      <Estimateur initialState={(projet.reponses as Record<string, unknown>) ?? {}} projectId={projet.id} />
    </div>
  );
}
