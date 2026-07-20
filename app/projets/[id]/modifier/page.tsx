import Link from "next/link";
import { notFound } from "next/navigation";
import ParcoursForm from "@/components/ParcoursForm";
import { getParcoursComplet } from "@/lib/parcours-db";
import { getProjet } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

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
        <p className="mt-1.5 text-[15px] text-muted">{projet.nom}</p>
      </header>
      <ParcoursForm
        parcours={await getParcoursComplet()}
        edit={{
          id: projet.id,
          nom: projet.nom,
          typeBien: projet.type_bien,
          surface: projet.surface,
          codePostal: projet.code_postal,
          reponses: projet.reponses,
        }}
      />
    </div>
  );
}
