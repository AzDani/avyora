import Link from "next/link";
import { estimer, type Reponses } from "@/lib/estimation";
import { getFormConfig } from "@/lib/customq-db";
import { listProjets, countDevis, type Projet } from "@/lib/data/projects";
import ListeProjets, { type ProjetCarte } from "@/components/ListeProjets";
import ClaimDraft from "@/components/ClaimDraft";

export const dynamic = "force-dynamic";

async function versCarte(p: Projet, customQ: Awaited<ReturnType<typeof getFormConfig>>): Promise<ProjetCarte> {
  const est = estimer(p.surface, p.code_postal, p.reponses as Reponses, null, customQ);
  const nbDevis = await countDevis(p.id);
  return {
    id: p.id,
    nom: p.nom,
    type_bien: p.type_bien,
    surface: p.surface,
    code_postal: p.code_postal,
    nbDevis,
    totalBas: est.totalBas,
    totalHaut: est.totalHaut,
    archived: p.archived,
  };
}

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function ProjetsPage() {
  const customQ = await getFormConfig();
  const [actifs, archivesRows] = await Promise.all([listProjets(false), listProjets(true)]);
  const projets = await Promise.all(actifs.map((p) => versCarte(p, customQ)));
  const archives = await Promise.all(archivesRows.map((p) => versCarte(p, customQ)));

  const sumBas = projets.reduce((s, p) => s + p.totalBas, 0);
  const sumHaut = projets.reduce((s, p) => s + p.totalHaut, 0);
  const sumSurface = projets.reduce((s, p) => s + p.surface, 0);

  return (
    <div className="space-y-8">
      <ClaimDraft />
      <header className="animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Portefeuille</p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Projets</h1>
            <p className="mt-1.5 text-[15px] text-muted">
              Estimation, devis, chantier et rentabilité — réunis pour chaque bien.
            </p>
          </div>
          <Link href="/projets/nouveau" className="btn btn-primary py-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Nouveau projet
          </Link>
        </div>

        {projets.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Projets actifs" value={`${projets.length}`} />
            <StatTile label="Valeur travaux estimée" value={`${euros(sumBas)} – ${euros(sumHaut)}`} accent />
            <StatTile label="Surface cumulée" value={`${sumSurface.toLocaleString("fr-FR")} m²`} />
          </div>
        )}
      </header>

      <ListeProjets projets={projets} archives={archives} />
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-xs font-medium text-faint">{label}</div>
      <div className={`data mt-1 text-[15px] font-semibold ${accent ? "text-brand-700" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
