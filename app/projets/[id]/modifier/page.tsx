import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import NouveauProjetForm from "@/components/NouveauProjetForm";
import { getFormConfig } from "@/lib/customq-db";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: number;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  reponses_json: string;
};

export default async function ModifierProjet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projet = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | ProjectRow
    | undefined;
  if (!projet) notFound();

  return (
    <div>
      <Link href={`/projets/${projet.id}`} className="text-sm text-slate-500 hover:underline">
        ← Retour au projet
      </Link>
      <h1 className="text-xl font-semibold mt-3 mb-4">Modifier l&apos;estimation</h1>
      <NouveauProjetForm
        formConfig={getFormConfig()}
        edit={{
          id: projet.id,
          nom: projet.nom,
          typeBien: projet.type_bien,
          surface: projet.surface,
          codePostal: projet.code_postal,
          reponses: JSON.parse(projet.reponses_json),
        }}
      />
    </div>
  );
}
