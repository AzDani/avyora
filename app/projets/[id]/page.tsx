import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { estimer, corpsLabel, type Reponses } from "@/lib/estimation";
import Rentabilite from "@/components/Rentabilite";
import UploadDevis from "@/components/UploadDevis";
import ProjetActions from "@/components/ProjetActions";
import ChantierBudget from "@/components/ChantierBudget";
import MetrePieces from "@/components/MetrePieces";
import DocumentsProjet from "@/components/DocumentsProjet";
import {
  construireBudget,
  avancementChantier,
  type ExpenseRow,
  type TaskRow,
} from "@/lib/budget";
import { calculerMetre, type PieceRow } from "@/lib/metre";
import { iaDisponible } from "@/lib/vision";
import { getFormConfig } from "@/lib/customq-db";
import { listeMateriaux } from "@/lib/materiaux";
import MateriauxListe from "@/components/MateriauxListe";
import ApresTravaux from "@/components/ApresTravaux";
import EstimationTable from "@/components/EstimationTable";

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

type QuoteRow = { id: number; nom: string; note: number | null; created_at: string };
type ScenarioRow = { params_json: string };

export default async function ProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projet = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as ProjectRow | undefined;
  if (!projet) notFound();

  const pieces = db
    .prepare("SELECT * FROM rooms WHERE project_id = ? ORDER BY id")
    .all(id) as PieceRow[];
  const metre = pieces.length > 0 ? calculerMetre(pieces) : null;
  const reponses = JSON.parse(projet.reponses_json) as Reponses;
  const est = estimer(projet.surface, projet.code_postal, reponses, metre, getFormConfig());
  const documents = db
    .prepare("SELECT id, type, nom, note_ia, created_at FROM documents WHERE project_id = ? ORDER BY created_at DESC")
    .all(id) as { id: number; type: string; nom: string; note_ia: string | null; created_at: string }[];
  const devis = db
    .prepare("SELECT id, nom, note, created_at FROM quotes WHERE project_id = ? ORDER BY created_at DESC")
    .all(id) as QuoteRow[];
  const dernierScenario = db
    .prepare("SELECT params_json FROM scenarios WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(id) as ScenarioRow | undefined;

  const depenses = db
    .prepare("SELECT * FROM expenses WHERE project_id = ? ORDER BY created_at DESC")
    .all(id) as ExpenseRow[];
  const taches = db
    .prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY ordre, id")
    .all(id) as TaskRow[];
  const budget = construireBudget(est, depenses);
  const avancement = avancementChantier(taches);
  const corpsOptions = [
    ...new Set(est.lignes.map((l) => l.corpsEtat).filter((c) => c !== "divers")),
  ].map((c) => ({ value: c, label: corpsLabel(c) }));
  if (corpsOptions.length === 0)
    corpsOptions.push({ value: "divers", label: corpsLabel("divers") });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{projet.nom}</h1>
          <p className="text-sm text-slate-500">
            {projet.type_bien} · {projet.surface} m² · {projet.code_postal} ·{" "}
            {est.region}
          </p>
        </div>
        <ProjetActions id={projet.id} archived={!!projet.archived} />
      </div>

      {/* Estimation (MO / fournitures) */}
      <EstimationTable est={est} />

      {/* Accompagnement technique : l'expertise BTP encodée */}
      {est.conseils.length > 0 && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="font-medium text-sky-900 mb-2">
            Accompagnement technique — ce qu&apos;il faut savoir
          </h2>
          <ul className="space-y-2.5 text-sm text-sky-900 leading-relaxed">
            {est.conseils.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0">💡</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Métré (rénovation comme neuf) */}
      <MetrePieces projectId={projet.id} pieces={pieces} metre={metre} />

      {/* Plans & photos */}
      <DocumentsProjet
        projectId={projet.id}
        documents={documents}
        iaDisponible={iaDisponible()}
      />

      {/* Chantier & budget (modules 5 + 7) */}
      <ChantierBudget
        projectId={projet.id}
        budget={budget}
        taches={taches}
        avancement={avancement}
        corpsOptions={corpsOptions}
        depenses={depenses}
      />

      {/* Matériaux (module 9) */}
      <MateriauxListe groupes={listeMateriaux(est, metre)} />

      {/* Après travaux (module 10) */}
      <ApresTravaux
        surface={projet.surface}
        typeBien={projet.type_bien}
        codePostal={projet.code_postal}
        nbChambres={
          metre
            ? pieces.filter((p) => p.type_piece === "chambre").length
            : (reponses.nbChambres ?? 0)
        }
        nbSdb={metre ? Math.max(1, metre.nbSallesDeBain) : Math.max(1, reponses.nbSdb ?? 1)}
        travaux={[
          ...new Set(
            est.lignes
              .filter((l) => l.corpsEtat !== "divers")
              .map((l) => corpsLabel(l.corpsEtat))
          ),
        ]}
      />

      {/* Rentabilité */}
      <Rentabilite
        projectId={projet.id}
        travauxDefaut={est.totalMedian}
        paramsInitiaux={dernierScenario ? JSON.parse(dernierScenario.params_json) : null}
      />

      {/* Devis */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-medium">Devis reçus</h2>
        {devis.length > 0 && (
          <ul className="space-y-2">
            {devis.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/projets/${projet.id}/devis/${d.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-400"
                >
                  <span className="font-medium text-sm">{d.nom}</span>
                  {d.note != null && (
                    <span
                      className={`text-sm font-semibold ${
                        d.note >= 70
                          ? "text-emerald-600"
                          : d.note >= 45
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {d.note}/100
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <UploadDevis projectId={projet.id} />
      </section>
    </div>
  );
}
