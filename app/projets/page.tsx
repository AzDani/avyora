import Link from "next/link";
import { db } from "@/lib/db";
import { estimer, type Reponses } from "@/lib/estimation";
import { getFormConfig } from "@/lib/customq-db";
import ListeProjets, { type ProjetCarte } from "@/components/ListeProjets";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: number;
  nom: string;
  type_bien: string;
  surface: number;
  code_postal: string;
  reponses_json: string;
  archived: number;
};

function versCarte(p: ProjectRow, customQ: ReturnType<typeof getFormConfig>): ProjetCarte {
  const est = estimer(p.surface, p.code_postal, JSON.parse(p.reponses_json) as Reponses, null, customQ);
  const nbDevis = (
    db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE project_id = ?").get(p.id) as { n: number }
  ).n;
  return {
    id: p.id,
    nom: p.nom,
    type_bien: p.type_bien,
    surface: p.surface,
    code_postal: p.code_postal,
    nbDevis,
    totalBas: est.totalBas,
    totalHaut: est.totalHaut,
    archived: !!p.archived,
  };
}

export default function ProjetsPage() {
  const customQ = getFormConfig();
  const projets = (
    db.prepare("SELECT * FROM projects WHERE archived = 0 ORDER BY created_at DESC").all() as ProjectRow[]
  ).map((p) => versCarte(p, customQ));
  const archives = (
    db.prepare("SELECT * FROM projects WHERE archived = 1 ORDER BY created_at DESC").all() as ProjectRow[]
  ).map((p) => versCarte(p, customQ));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#1E1B4B] text-white p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Tes projets</h1>
          <p className="mt-1 text-indigo-200/80 text-sm">
            Estimation, devis, chantier, rentabilité — tout au même endroit.
          </p>
        </div>
        <Link
          href="/projets/nouveau"
          className="rounded-lg bg-[#4F46E5] px-5 py-2.5 font-medium text-white hover:bg-[#4338CA]"
        >
          + Nouveau projet
        </Link>
      </section>

      <ListeProjets projets={projets} archives={archives} />
    </div>
  );
}
