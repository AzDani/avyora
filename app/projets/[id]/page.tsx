import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProjet, getPieces, listDocuments, listDevis, dernierScenarioParams, listDepenses, listTaches,
} from "@/lib/data/projects";
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
import ProjetWorkspace from "@/components/ProjetWorkspace";
import type { DashboardMetrics } from "@/components/ProjetDashboard";

export const dynamic = "force-dynamic";

export default async function ProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projet = await getProjet(id);
  if (!projet) notFound();

  const [pieces, documents, devis, dernierScenarioParamsRaw, depenses, taches, formConfig] =
    await Promise.all([
      getPieces(id),
      listDocuments(id),
      listDevis(id),
      dernierScenarioParams(id),
      listDepenses(id),
      listTaches(id),
      getFormConfig(),
    ]);
  const metre = pieces.length > 0 ? calculerMetre(pieces) : null;
  const reponses = projet.reponses as Reponses;
  const est = estimer(projet.surface, projet.code_postal, reponses, metre, formConfig);
  const dernierScenario = dernierScenarioParamsRaw
    ? { params_json: JSON.stringify(dernierScenarioParamsRaw) }
    : undefined;
  const budget = construireBudget(est, depenses);
  const avancement = avancementChantier(taches);
  const corpsOptions = [
    ...new Set(est.lignes.map((l) => l.corpsEtat).filter((c) => c !== "divers")),
  ].map((c) => ({ value: c, label: corpsLabel(c) }));
  if (corpsOptions.length === 0)
    corpsOptions.push({ value: "divers", label: corpsLabel("divers") });

  // ── Métriques du tableau de bord (calculées depuis les données existantes) ──
  const tot = taches.length;
  const faites = taches.filter((t) => t.statut === "fait").length;
  const enCours = taches.filter((t) => t.statut === "en_cours").length;

  const alertes: DashboardMetrics["alertes"] = [];
  for (const a of budget.alertes) alertes.push({ niveau: "danger", texte: a });
  if (reponses.dpe === "F" || reponses.dpe === "G")
    alertes.push({
      niveau: "warning",
      texte: `Passoire thermique (DPE ${reponses.dpe}) — location interdite ${reponses.dpe === "G" ? "depuis 2025" : "en 2028"}. Profite du chantier pour améliorer l'isolation.`,
    });
  if (reponses.fissuresStructure === "evolutives")
    alertes.push({ niveau: "danger", texte: "Fissures évolutives signalées — fais réaliser un diagnostic structure avant d'engager les travaux." });
  if (["avant_1949", "1949_1974", "1975_1997"].includes(reponses.anneeConstruction ?? ""))
    alertes.push({ niveau: "info", texte: "Bien antérieur à 1997 — repérage amiante obligatoire avant travaux (RAT)." });

  const prochainesEtapes: DashboardMetrics["prochainesEtapes"] = [
    { label: "Ajouter le métré des pièces (estimation plus précise)", tab: "estimation", fait: pieces.length > 0 },
    { label: "Générer le plan de chantier", tab: "chantier", fait: taches.length > 0 },
    { label: "Analyser un premier devis", tab: "devis", fait: devis.length > 0 },
    { label: "Calculer la rentabilité locative", tab: "rentabilite", fait: !!dernierScenario },
    { label: "Ajouter plans & photos", tab: "documents", fait: documents.length > 0 },
  ];

  const infosManquantes: string[] = [];
  if (!reponses.dpe || reponses.dpe === "inconnu") infosManquantes.push("DPE non renseigné — utile pour anticiper l'isolation et la location.");
  if (!reponses.anneeConstruction || reponses.anneeConstruction === "inconnue") infosManquantes.push("Année de construction inconnue — elle ajuste la provision imprévus.");
  if (pieces.length === 0) infosManquantes.push("Aucun métré — les quantités sont estimées depuis la surface.");
  if (reponses.modeEstimation !== "detaille") infosManquantes.push("Estimation en mode rapide — passe en détaillé pour resserrer la fourchette.");

  const metrics: DashboardMetrics = {
    estimation: {
      bas: est.totalBas,
      haut: est.totalHaut,
      median: est.totalMedian,
      mode: est.mode,
      duree: est.dureeSemaines,
      precision: est.metreUtilise ? "métré réel" : est.mode === "detaille" ? "±15 %" : "±25 %",
    },
    avancement: { planGenere: tot > 0, pct: avancement, faites, enCours, total: tot },
    budget: {
      aDepenses: depenses.length > 0,
      prevu: budget.totalPrevu,
      depense: budget.totalReel,
      prevision: budget.previsionFinale,
      depassement: budget.previsionFinale > budget.totalPrevu,
    },
    prochainesEtapes,
    infosManquantes,
    recommandations: est.conseils,
    alertes,
  };

  return (
    <div className="space-y-6">
      {/* En-tête projet (toujours visible, au-dessus des onglets) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Projets
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{projet.nom}</h1>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="chip capitalize">{projet.type_bien}</span>
            <span className="chip num">{projet.surface} m²</span>
            <span className="chip num">{projet.code_postal}</span>
            <span className="chip">{est.region}</span>
          </div>
        </div>
        <ProjetActions id={projet.id} archived={!!projet.archived} />
      </div>

      <ProjetWorkspace
        metrics={metrics}
        modifierHref={`/projets/${projet.id}/modifier`}
        badges={{ devis: devis.length }}
        sections={{
          estimation: (
            <div className="space-y-6">
              <EstimationTable est={est} />
              {est.conseils.length > 0 && (
                <section className="card border-brand-100 bg-brand-50/40 p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M10 2.5a5 5 0 0 0-3 9v1.5h6V11.5a5 5 0 0 0-3-9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        <path d="M8 16h4M8.5 18h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="eyebrow">Accompagnement technique</p>
                      <h2 className="text-[15px] font-semibold text-ink">Ce qu&apos;il faut savoir</h2>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-muted">
                    {est.conseils.map((c, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <MetrePieces projectId={projet.id} pieces={pieces} metre={metre} />
              <MateriauxListe groupes={listeMateriaux(est, metre)} />
            </div>
          ),
          chantier: (
            <ChantierBudget
              projectId={projet.id}
              budget={budget}
              taches={taches}
              avancement={avancement}
              corpsOptions={corpsOptions}
              depenses={depenses}
            />
          ),
          documents: (
            <DocumentsProjet projectId={projet.id} documents={documents} iaDisponible={iaDisponible()} />
          ),
          rentabilite: (
            <div className="space-y-6">
              <Rentabilite
                projectId={projet.id}
                travauxDefaut={est.totalMedian}
                paramsInitiaux={dernierScenario ? JSON.parse(dernierScenario.params_json) : null}
              />
              <ApresTravaux
                surface={projet.surface}
                typeBien={projet.type_bien}
                codePostal={projet.code_postal}
                nbChambres={metre ? pieces.filter((p) => p.type_piece === "chambre").length : (reponses.nbChambres ?? 0)}
                nbSdb={metre ? Math.max(1, metre.nbSallesDeBain) : Math.max(1, reponses.nbSdb ?? 1)}
                travaux={[...new Set(est.lignes.filter((l) => l.corpsEtat !== "divers").map((l) => corpsLabel(l.corpsEtat)))]}
              />
            </div>
          ),
          devis: (
            <section className="card space-y-4 p-5">
              <h2 className="font-semibold text-ink">Devis reçus</h2>
              {devis.length > 0 && (
                <ul className="space-y-2">
                  {devis.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/projets/${projet.id}/devis/${d.id}`}
                        className="group flex items-center justify-between gap-3 rounded-field border border-line px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <span className="text-sm font-medium text-ink">{d.nom}</span>
                        <span className="flex items-center gap-2">
                          {d.note != null && (
                            <span
                              className={`data rounded-full px-2 py-0.5 text-xs font-semibold ${
                                d.note >= 70 ? "bg-positive-soft text-positive" : d.note >= 45 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"
                              }`}
                            >
                              {d.note}/100
                            </span>
                          )}
                          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true">
                            <path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <UploadDevis projectId={projet.id} />
            </section>
          ),
        }}
      />
    </div>
  );
}
