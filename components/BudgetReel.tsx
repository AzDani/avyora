"use client";

/**
 * Le budget réel sur la fiche projet (module M5, refait le 25/11/2026 à la demande de Dani : « clair et pratique »).
 *
 * En haut, le résumé : budget prévu, déjà payé (et sa part), reste à payer, le verdict face à l'estimation, la jauge
 * et les alertes. Puis UNE CARTE PAR CORPS D'ÉTAT : son budget, ce qui est payé, la part consommée en %, ce qu'il
 * reste (ou le dépassement), une barre, et ce qui a été payé selon sa nature (fourni-posé, main-d'œuvre seule,
 * matériaux seuls). Le prévu y est partagé entre artisans et « je fais moi-même » quand l'estimation le dit. Un clic
 * ouvre les dépenses du corps. « Matériel et outillage » est une carte à part, toujours là : un budget que
 * l'utilisateur fixe lui-même (acheter ou louer ses outils dépend de son équipement).
 *
 * Calculs : lib/estimateur/budget-reel.ts ; écriture : /api/projects/[id]/depenses et /budget-materiel.
 * Rendu dans EstimationResultat (classe .card) ; le reste est scopé .av-bud.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import {
  bilanBudget, corpsDuProjet, CORPS_AUTRE, CORPS_MATERIEL, NATURES,
  type Depense, type Alerte, type LigneBudget, type NatureDepense,
} from "@/lib/estimateur/budget-reel";
import { euros, pourcent, lireMontant } from "@/lib/i18n/nombres";
import { messageErreurApi } from "@/lib/i18n/erreurs-api";

const TR = {
  fr: {
    titre: "Budget réel",
    sub: "Note ce que tu paies au fil du chantier : pour chaque corps d'état, tu vois ton budget, ce qui est payé et ce qu'il reste. AVYORA te prévient avant que ça dérape.",
    bPrevu: "Budget prévu", bPrevuS: "estimation, aléas compris",
    bPaye: "Déjà payé", bPayeS: (p: string) => `${p} du budget`,
    bReste: "Reste à payer", bResteS: "d'après le rythme actuel",
    prevFinale: "Fin de chantier prévue",
    verdictSur: (m: string, p: string) => `${m} au-dessus du budget (${p})`,
    verdictSous: (m: string, p: string) => `${m} sous le budget (${p})`,
    verdictPile: "Pile dans le budget",
    budgetMax: "Ton budget max",
    parCorps: "Par corps d'état",
    nbDep: (n: number) => `${n} dépense${n > 1 ? "s" : ""}`,
    budget: "Budget", paye: "Payé", reste: "Reste", depasseDe: "Dépassé de", sansBudget: "Sans budget prévu",
    utilise: "utilisé",
    stFait: "Terminé", stCours: "En cours", stAttente: "À démarrer", stHors: "Hors estimation",
    prevuPartage: (a: string, b: string) => `Prévu : ${a} par les artisans · ${b} de matériaux (tu fais toi-même)`,
    voirDep: (n: number) => `Voir les dépenses (${n})`, masquerDep: "Masquer les dépenses",
    ajouterIci: "Ajouter une dépense ici",
    ajouter: "Ajouter une dépense", fermer: "Fermer",
    natures: { fp: "Fourni-posé", mo: "Main-d'œuvre", mat: "Matériaux" } as Record<NatureDepense, string>,
    naturesAide: { fp: "matériaux + main-d'œuvre", mo: "main-d'œuvre seule", mat: "matériaux seuls" } as Record<NatureDepense, string>,
    libNature: "Ce que couvre la dépense",
    libCorps: "Corps d'état", libelle: "Libellé", libellePh: "ex. facture du maçon, acompte 30 %",
    libellePhMat: "ex. location d'échafaudage, perceuse",
    montant: "Montant TTC (€)", valider: "Ajouter", enCours: "…",
    autre: "Autre (hors estimation)",
    materiel: "Matériel et outillage",
    materielSub: "Un budget à part : acheter ou louer tes outils (échafaudage, bétonnière, perceuse…), selon ce que tu as déjà.",
    materielFixer: "Fixer mon budget matériel", materielModifier: "Modifier", materielEnregistrer: "Enregistrer",
    materielEstimation: "Revenir à l'estimation", materielLib: "Budget matériel (€)",
    materielAucun: "Pas encore de budget matériel : fixe-le pour suivre tes achats et tes locations d'outils.",
    erreurMateriel: "Le budget matériel n'a pas pu être enregistré. Réessaie.",
    supprimer: "Supprimer", confirmer: "Supprimer cette dépense ?", annuler: "Annuler",
    vide: "Aucune dépense pour l'instant. Ajoute la première facture ou le premier acompte : chaque corps d'état se met à jour tout de suite.",
    erreur: "Enregistrement impossible. Vérifie le libellé et le montant, puis réessaie.",
    erreurServeur: "Enregistrement impossible. Réessaie dans un instant.",
    limite: "Limite de 500 dépenses atteinte pour ce projet.",
    session: "Ta session a expiré. Reconnecte-toi puis réessaie.",
    erreurSuppr: "La dépense n'a pas pu être supprimée.",
    alerte: {
      depasse: (c: string, m: string) => `${c} : ${m} au-dessus du budget.`,
      attention: (c: string, p: string) => `${c} : ${p} du budget déjà dépensés, alors que le lot n'est pas terminé.`,
      hors: (c: string, m: string) => `${c} : ${m} dépensés sans budget prévu.`,
      prevBudget: (m: string) => `Au rythme actuel, le chantier dépasserait ton budget max de ${m}.`,
    },
  },
  en: {
    titre: "Actual budget",
    sub: "Log what you pay as the work goes: for each trade you see your budget, what's paid and what's left. AVYORA warns you before it slips.",
    bPrevu: "Planned budget", bPrevuS: "estimate, contingency included",
    bPaye: "Paid so far", bPayeS: (p: string) => `${p} of the budget`,
    bReste: "Still to pay", bResteS: "at the current pace",
    prevFinale: "Forecast at completion",
    verdictSur: (m: string, p: string) => `${m} over budget (${p})`,
    verdictSous: (m: string, p: string) => `${m} under budget (${p})`,
    verdictPile: "Right on budget",
    budgetMax: "Your max budget",
    parCorps: "By trade",
    nbDep: (n: number) => `${n} expense${n === 1 ? "" : "s"}`,
    budget: "Budget", paye: "Paid", reste: "Left", depasseDe: "Over by", sansBudget: "No planned budget",
    utilise: "used",
    stFait: "Done", stCours: "In progress", stAttente: "Not started", stHors: "Not in estimate",
    prevuPartage: (a: string, b: string) => `Planned: ${a} by contractors · ${b} of materials (you do it yourself)`,
    voirDep: (n: number) => `Show expenses (${n})`, masquerDep: "Hide expenses",
    ajouterIci: "Add an expense here",
    ajouter: "Add an expense", fermer: "Close",
    natures: { fp: "Supply & fit", mo: "Labour", mat: "Materials" } as Record<NatureDepense, string>,
    naturesAide: { fp: "materials + labour", mo: "labour only", mat: "materials only" } as Record<NatureDepense, string>,
    libNature: "What the expense covers",
    libCorps: "Trade", libelle: "Label", libellePh: "e.g. bricklayer invoice, 30% deposit",
    libellePhMat: "e.g. scaffolding hire, drill",
    montant: "Amount incl. VAT (€)", valider: "Add", enCours: "…",
    autre: "Other (not in estimate)",
    materiel: "Tools and equipment",
    materielSub: "A separate budget: buying or hiring your tools (scaffolding, cement mixer, drill…), depending on what you already own.",
    materielFixer: "Set my tools budget", materielModifier: "Edit", materielEnregistrer: "Save",
    materielEstimation: "Back to the estimate", materielLib: "Tools budget (€)",
    materielAucun: "No tools budget yet: set one to track what you buy and hire.",
    erreurMateriel: "The tools budget couldn't be saved. Try again.",
    supprimer: "Delete", confirmer: "Delete this expense?", annuler: "Cancel",
    vide: "No expenses yet. Add your first invoice or deposit: each trade updates right away.",
    erreur: "Could not save. Check the label and the amount, then try again.",
    erreurServeur: "Could not save. Try again in a moment.",
    limite: "This project has reached the limit of 500 expenses.",
    session: "Your session has expired. Sign in again, then retry.",
    erreurSuppr: "The expense couldn't be deleted.",
    alerte: {
      depasse: (c: string, m: string) => `${c}: ${m} over budget.`,
      attention: (c: string, p: string) => `${c}: ${p} of the budget already spent, and the trade isn't finished.`,
      hors: (c: string, m: string) => `${c}: ${m} spent with no planned budget.`,
      prevBudget: (m: string) => `At this pace, the project would exceed your max budget by ${m}.`,
    },
  },
} as const;

const CSS = `
.av-bud{--b-ink:var(--color-ink,#15172b);--b-muted:var(--color-muted,#565a75);--b-faint:var(--color-faint,#6a6f88);--b-line:var(--color-line,#e9eaf3);--b-line2:var(--color-line-strong,#dcdeec);--b-brand:var(--color-brand-600,#4f46e5);--b-brand7:var(--color-brand-700,#4338ca);--b-weak:var(--color-brand-50,#eef1ff);--b-200:var(--color-brand-200,#c7ccfe);--b-nuit:var(--color-brand-900,#1e1b4b);--b-vert:#0f9d6b;--b-vertf:#e6f7f0;--b-ambre:#b06d10;--b-ambref:#fdf1e1;--b-rouge:#b42318;--b-rougef:#fdecec}
.av-bud .num{font-variant-numeric:tabular-nums}
.av-bud .resume{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
.av-bud .tuile{border:1px solid var(--b-line);border-radius:16px;padding:14px 16px;background:#fff}
.av-bud .tuile.fonce{background:var(--b-nuit);border-color:var(--b-nuit);color:#fff}
.av-bud .tuile .k{font-size:12px;font-weight:600;color:var(--b-faint)}
.av-bud .tuile.fonce .k{color:#c7ccfe}
.av-bud .tuile .v{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-top:4px;color:var(--b-nuit)}
.av-bud .tuile.fonce .v{color:#fff}
.av-bud .tuile .s{font-size:12px;color:var(--b-muted);margin-top:2px}
.av-bud .tuile.fonce .s{color:#c7ccfe}
.av-bud .ligne-v{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:12px;font-size:13px;color:var(--b-muted)}
.av-bud .verdict{display:inline-flex;align-items:center;font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px}
.av-bud .verdict.r{background:var(--b-rougef);color:var(--b-rouge)}
.av-bud .verdict.g{background:var(--b-vertf);color:var(--b-vert)}
.av-bud .verdict.n{background:#fff;color:var(--b-muted);border:1px solid var(--b-line)}
.av-bud .gtrack{position:relative;margin-top:12px;height:12px;border-radius:999px;background:var(--b-line)}
.av-bud .gtrack i,.av-bud .barre i{position:absolute;top:0;bottom:0;transition:width .4s cubic-bezier(.22,.72,.2,1),left .4s cubic-bezier(.22,.72,.2,1)}
.av-bud .gtrack .paye{left:0;background:var(--b-brand);border-radius:999px 0 0 999px}
.av-bud .gtrack .reste{background:var(--b-200)}
.av-bud .over{background:repeating-linear-gradient(135deg,#e0434b 0 5px,#ef7a80 5px 9px)}
.av-bud .gtrack .over{border-radius:0 999px 999px 0}
.av-bud .mark{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--b-ink);border-radius:2px}
.av-bud .alerts{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.av-bud .al{border-radius:12px;padding:9px 12px;font-size:13px;line-height:1.45;border:1px solid}
.av-bud .al.r{background:var(--b-rougef);color:#912018;border-color:#f8c9cb}
.av-bud .al.o{background:var(--b-ambref);color:#8a530b;border-color:#f0c98a}
.av-bud .tete-c{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:24px 0 10px}
.av-bud .tete-c h3{font-size:16px;font-weight:700;color:var(--b-nuit);margin:0}
.av-bud .tete-c span{font-size:12.5px;color:var(--b-faint)}
.av-bud .cartes{display:grid;gap:10px}
.av-bud .cc{border:1px solid var(--b-line);border-radius:16px;background:#fff;padding:14px 16px;transition:border-color .2s,box-shadow .2s}
.av-bud .cc:hover{border-color:var(--b-200);box-shadow:0 10px 26px -16px rgba(30,27,75,.3)}
.av-bud .cc.r{border-color:#f3b9bd}
.av-bud .cc.o{border-color:#f0c98a}
.av-bud .cc.mat{background:linear-gradient(180deg,#fff,#faf9ff)}
.av-bud .cc-h{display:flex;align-items:center;gap:10px}
.av-bud .cc-n{flex:1;min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.av-bud .cc-n b{font-size:15px;color:var(--b-nuit)}
.av-bud .pastille{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--b-line2);color:var(--b-muted);background:#fff}
.av-bud .pastille.st1{background:var(--b-ambref);border-color:#f0c98a;color:var(--b-ambre)}
.av-bud .pastille.st2{background:var(--b-vertf);border-color:transparent;color:var(--b-vert)}
.av-bud .pastille.hors{background:var(--b-rougef);border-color:transparent;color:var(--b-rouge)}
.av-bud .pct{flex:none;text-align:right;line-height:1.1}
.av-bud .pct b{display:block;font-size:22px;font-weight:700;color:var(--b-brand)}
.av-bud .pct small{font-size:11px;color:var(--b-faint)}
.av-bud .pct.r b{color:var(--b-rouge)}.av-bud .pct.o b{color:var(--b-ambre)}.av-bud .pct.g b{color:var(--b-vert)}.av-bud .pct.z b{color:var(--b-faint)}
.av-bud .barre{position:relative;display:block;margin-top:10px;height:10px;border-radius:999px;background:var(--b-weak)}
.av-bud .barre .f{left:0;border-radius:999px;background:linear-gradient(90deg,var(--b-brand),#8b6cf3)}
.av-bud .barre .f.g{background:var(--b-vert)}.av-bud .barre .f.o{background:#efb44d}
.av-bud .barre .f.cut{border-radius:999px 0 0 999px}
.av-bud .barre .over{border-radius:0 999px 999px 0}
.av-bud .chiffres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.av-bud .chiffres div{font-size:12px;color:var(--b-faint)}
.av-bud .chiffres b{display:block;font-size:15px;font-weight:700;color:var(--b-ink);margin-top:1px}
.av-bud .chiffres .r b{color:var(--b-rouge)}
.av-bud .natures{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.av-bud .nat{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--b-muted);background:var(--b-weak);border-radius:999px;padding:4px 10px}
.av-bud .nat i{width:8px;height:8px;border-radius:50%}
.av-bud .nat-fp i{background:var(--b-brand)}.av-bud .nat-mo i{background:#8b6cf3}.av-bud .nat-mat i{background:#e3923a}
.av-bud .nat b{color:var(--b-ink)}
.av-bud .partage{font-size:12px;color:var(--b-faint);margin-top:8px}
.av-bud .cc-pied{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}
.av-bud .lien{border:0;background:none;color:var(--b-brand7);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:8px 0;min-height:40px;text-align:left}
.av-bud .lien:hover{text-decoration:underline;text-underline-offset:3px}
.av-bud .det{margin-top:6px;border-top:1px dashed var(--b-line)}
.av-bud .hl{display:grid;grid-template-columns:58px minmax(0,1fr) auto auto 40px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--b-line);font-size:13px}
.av-bud .hl .d{color:var(--b-faint);font-size:12px}
.av-bud .hl .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-bud .hl .m{font-weight:600}
.av-bud .hl .tag{font-size:11px;font-weight:600;border-radius:999px;padding:2px 8px;white-space:nowrap}
.av-bud .tag.fp{background:var(--b-weak);color:var(--b-brand7)}.av-bud .tag.mo{background:#f1edfe;color:#6a4fd8}.av-bud .tag.mat{background:var(--b-ambref);color:#a15c13}
.av-bud .hl button{width:40px;height:40px;border:0;background:none;color:var(--b-faint);cursor:pointer;border-radius:10px;font-size:15px}
.av-bud .hl button:hover{background:var(--b-rougef);color:var(--b-rouge)}
.av-bud .hl-conf{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;padding:6px 0;border-bottom:1px dashed var(--b-line);font-size:13px;color:var(--b-rouge);font-weight:500}
.av-bud .hl-conf button{height:36px;border-radius:10px;padding:0 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--b-line2);background:#fff;color:var(--b-muted)}
.av-bud .hl-conf button.oui{background:var(--b-rouge);border-color:var(--b-rouge);color:#fff}
.av-bud .mat-sub{font-size:12.5px;color:var(--b-muted);margin-top:4px;line-height:1.45}
.av-bud .mat-form{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;margin-top:10px}
.av-bud .mat-form label{flex:0 1 200px}
.av-bud button.add{height:44px;border-radius:12px;padding:0 18px;font:inherit;font-size:14px;font-weight:600;background:var(--b-brand);color:#fff;border:0;cursor:pointer;box-shadow:0 10px 22px -12px rgba(79,70,229,.6);transition:transform .2s,background-color .2s}
.av-bud button.add:hover{background:var(--b-brand7);transform:translateY(-1px)}
.av-bud button.add:disabled{opacity:.6;cursor:default;transform:none}
.av-bud button.sec{height:44px;border-radius:12px;padding:0 16px;font:inherit;font-size:13.5px;font-weight:600;background:#fff;color:var(--b-muted);border:1px solid var(--b-line2);cursor:pointer}
.av-bud form.saisie{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.5fr) minmax(0,.8fr);gap:10px;margin-top:12px;padding:16px;border:1px solid var(--b-200);border-radius:16px;background:#fbfbff}
.av-bud form.saisie .natrow{grid-column:1/-1}
.av-bud form.saisie .envoi{grid-column:1/-1;display:flex;justify-content:flex-end}
.av-bud label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--b-muted);min-width:0}
.av-bud input,.av-bud select{height:44px;border:1px solid var(--b-line2);border-radius:12px;padding:0 10px;font:inherit;font-size:14px;background:#fff;color:var(--b-ink);min-width:0}
.av-bud input:focus,.av-bud select:focus{outline:none;border-color:var(--b-brand);box-shadow:0 0 0 3px var(--color-brand-100,#e0e4ff)}
.av-bud fieldset{border:0;margin:0;padding:0;min-width:0}
.av-bud legend{font-size:12.5px;color:var(--b-muted);margin-bottom:4px;padding:0}
.av-bud .seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.av-bud .seg label{position:relative;cursor:pointer}
.av-bud .seg input{position:absolute;opacity:0;width:1px;height:1px}
.av-bud .seg span{display:flex;flex-direction:column;justify-content:center;min-height:52px;padding:6px 12px;border:1px solid var(--b-line2);border-radius:12px;background:#fff;color:var(--b-ink);font-weight:600;font-size:13.5px;transition:border-color .15s,background-color .15s}
.av-bud .seg span small{font-weight:400;font-size:11.5px;color:var(--b-faint);margin-top:1px}
.av-bud .seg input:checked+span{border-color:var(--b-brand);background:var(--b-weak);color:var(--b-brand7);box-shadow:0 0 0 1px var(--b-brand)}
.av-bud .seg input:focus-visible+span{outline:2px solid var(--b-brand);outline-offset:2px}
.av-bud .err{color:var(--b-rouge);font-size:13px;margin-top:8px}
.av-bud .vide-msg{color:var(--b-muted);font-size:13.5px;margin:14px 0 0;padding:12px 14px;border:1px dashed var(--b-line2);border-radius:12px;background:#fbfbff}
.av-bud .pied{display:flex;justify-content:flex-end;margin-top:12px}
@media (max-width:640px){
  .av-bud .resume{grid-template-columns:1fr 1fr}
  .av-bud .resume .tuile:first-child{grid-column:1/-1}
  .av-bud .chiffres b{font-size:14px}
  .av-bud form.saisie{grid-template-columns:1fr 1fr}
  .av-bud form.saisie label.lib,.av-bud form.saisie label.corps{grid-column:1/-1}
  .av-bud .seg span{min-height:48px;padding:6px 8px;font-size:12.5px}
  .av-bud .seg span small{display:none}
  .av-bud .hl{grid-template-columns:48px minmax(0,1fr) auto 40px}
  .av-bud .hl .tag{display:none}
}
@media (prefers-reduced-motion:reduce){.av-bud .gtrack i,.av-bud .barre i,.av-bud button.add{transition:none}.av-bud button.add:hover{transform:none}}
`;

type Props = { reponses: unknown; projectId: string; depenses: Depense[]; onChange?: (depenses: Depense[]) => void };

/** Ordre des cartes : ce qui dépasse, puis ce qui approche du budget, puis le reste du plus gros au plus petit ; le matériel à la fin. */
const rang = (l: LigneBudget): number =>
  l.materiel ? 9 : l.etat === "depasse" || l.etat === "hors_estimation" ? 0 : l.etat === "attention" ? 1 : 2;

export default function BudgetReel({ reponses, projectId, depenses: initiales, onChange }: Props) {
  const locale = useLocale();
  const t = TR[locale];
  const fmt = (v: number): string => euros(locale, v);
  const pct = (v: number): string => pourcent(locale, v, 0);
  const pctEcart = (v: number): string => pourcent(locale, v, 1);
  const nomCorps = (c: string): string => (c === CORPS_AUTRE ? t.autre : c === CORPS_MATERIEL ? t.materiel : catT(locale, "corps", c));
  const dateCourte = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" });
  };

  const [depenses, setDepenses] = useState<Depense[]>(initiales);
  // Le budget matériel fixé ici est relu tout de suite (sans recharger la fiche).
  const [budgetMat, setBudgetMat] = useState<number | null | undefined>(undefined);
  const rep = useMemo(
    () => (budgetMat === undefined ? reponses : { ...(reponses as object), budgetMateriel: budgetMat ?? "estimation" }),
    [reponses, budgetMat],
  );
  // Le tableau de bord du projet (tuile Budget) et l'investissement suivent les dépenses à jour.
  useEffect(() => { onChange?.(depenses); }, [depenses, onChange]);
  const corps = useMemo(() => corpsDuProjet(rep), [rep]);
  const bilan = useMemo(() => bilanBudget(rep, depenses), [rep, depenses]);
  const [choix, setChoix] = useState<string>(corps[0] ?? CORPS_AUTRE);
  const [nature, setNature] = useState<NatureDepense>("fp");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; champs: boolean } | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [saisie, setSaisie] = useState(initiales.length === 0);
  const [matEdit, setMatEdit] = useState(false);
  const [matVal, setMatVal] = useState("");
  const [matBusy, setMatBusy] = useState(false);
  const [matErr, setMatErr] = useState(false);
  const refLibelle = useRef<HTMLInputElement>(null);
  const refForm = useRef<HTMLFormElement>(null);

  if (!bilan) return null;
  const estMateriel = choix === CORPS_MATERIEL;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const m = lireMontant(montant);
    if (!libelle.trim() || !(m > 0)) { setErr({ msg: t.erreur, champs: true }); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/depenses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corpsEtat: choix, libelle: libelle.trim(), montant: m, nature: estMateriel ? "mat" : nature }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.depense) { setErr(erreurAjout(r.status)); return; }
      setDepenses((l) => [j.depense as Depense, ...l]);
      // Le corps concerné s'ouvre : la dépense ajoutée se voit tout de suite.
      setOuvert(choix);
      setLibelle(""); setMontant("");
    } catch { setErr({ msg: messageErreurApi(locale, 0, t.erreurServeur), champs: false }); } finally { setBusy(false); }
  }

  function erreurAjout(statut: number): { msg: string; champs: boolean } {
    if (statut === 400) return { msg: t.erreur, champs: true };
    if (statut === 409) return { msg: t.limite, champs: false };
    if (statut === 401 || statut === 403) return { msg: t.session, champs: false };
    return { msg: messageErreurApi(locale, statut, t.erreurServeur), champs: false };
  }

  // Suppression : confirmation EN LIGNE (deux clics) ; un échec remet la ligne ET le dit.
  async function supprimer(d: Depense) {
    setASupprimer(null);
    setErr(null);
    const avant = depenses;
    setDepenses((l) => l.filter((x) => x.id !== d.id));
    const r = await fetch(`/api/projects/${projectId}/depenses/${d.id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) {
      setDepenses(avant);
      const cause = r && (r.status === 401 || r.status === 403) ? t.session : messageErreurApi(locale, r?.status ?? 0, "");
      setErr({ msg: (t.erreurSuppr + " " + cause).trim(), champs: false });
    }
  }

  async function enregistrerMateriel(valeur: number | null) {
    setMatBusy(true); setMatErr(false);
    try {
      const r = await fetch(`/api/projects/${projectId}/budget-materiel`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ montant: valeur }),
      });
      if (!r.ok) { setMatErr(true); return; }
      setBudgetMat(valeur);
      setMatEdit(false);
    } catch { setMatErr(true); } finally { setMatBusy(false); }
  }

  function saisirIci(c: string) {
    setChoix(c);
    if (c === CORPS_MATERIEL) setNature("mat");
    setSaisie(true);
    setTimeout(() => { refForm.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); refLibelle.current?.focus({ preventScroll: true }); }, 0);
  }

  const texteAlerte = (a: Alerte): { cls: string; txt: string } | null => {
    switch (a.type) {
      case "depasse": return { cls: "r", txt: t.alerte.depasse(nomCorps(a.corps), fmt(a.montant)) };
      case "attention": return { cls: "o", txt: t.alerte.attention(nomCorps(a.corps), pct(a.part * 100)) };
      case "hors_estimation": return { cls: "o", txt: t.alerte.hors(nomCorps(a.corps), fmt(a.montant)) };
      case "prevision_estimation": return null; // déjà dit par le verdict
      case "prevision_budget": return { cls: "r", txt: t.alerte.prevBudget(fmt(a.montant)) };
    }
  };

  const aDesDepenses = depenses.length > 0;
  const echelle = Math.max(bilan.prevision, bilan.estimation, 1);
  const w = (v: number): string => `${Math.max(0, Math.min(100, (v / echelle) * 100))}%`;
  const ecart = bilan.ecartPrevision;
  const ecartPct = bilan.estimation > 0 ? (ecart / bilan.estimation) * 100 : 0;
  const verdict = ecart > 0.5
    ? { cls: "r", txt: t.verdictSur("+" + fmt(ecart), "+" + pctEcart(ecartPct)) }
    : ecart < -0.5
      ? { cls: "g", txt: t.verdictSous(fmt(Math.abs(ecart)), "−" + pctEcart(Math.abs(ecartPct))) }
      : { cls: "n", txt: t.verdictPile };
  const alertes = bilan.alertes.map(texteAlerte).filter((x): x is { cls: string; txt: string } => !!x);
  const reste = Math.max(0, bilan.prevision - bilan.reel);
  const partPayee = bilan.estimation > 0 ? (bilan.reel / bilan.estimation) * 100 : 0;

  const lignes = bilan.lignes
    .filter((l) => l.prevu > 0 || l.reel > 0 || l.materiel)
    .sort((a, b) => rang(a) - rang(b) || b.prevu - a.prevu);

  const statut = (l: LigneBudget) =>
    l.etat === "hors_estimation" ? <span className="pastille hors">{t.stHors}</span>
      : l.termine ? <span className="pastille st2">{"✓ " + t.stFait}</span>
        : l.demarre || l.reel > 0 ? <span className="pastille st1">{t.stCours}</span>
          : <span className="pastille">{t.stAttente}</span>;

  const ton = (l: LigneBudget): string =>
    l.etat === "depasse" || l.etat === "hors_estimation" ? "r" : l.etat === "attention" ? "o" : l.termine && l.reel > 0 ? "g" : l.reel > 0 ? "" : "z";

  const barre = (l: LigneBudget) => {
    const ech = Math.max(l.prevu, l.reel, 1);
    const p = (v: number): string => `${Math.max(0, Math.min(100, (v / ech) * 100))}%`;
    const dedans = Math.min(l.reel, l.prevu), dehors = Math.max(0, l.reel - l.prevu);
    const coul = l.termine && l.etat === "ok" ? " g" : l.etat === "attention" ? " o" : "";
    return (
      <span className="barre" aria-hidden="true">
        {dedans > 0 && <i className={"f" + coul + (dehors > 0 ? " cut" : "")} style={{ width: p(dedans) }} />}
        {dehors > 0 && <i className="over" style={{ left: p(l.prevu), width: p(dehors) }} />}
        {l.prevu > 0 && dehors > 0 && <span className="mark" style={{ left: p(l.prevu) }} />}
      </span>
    );
  };

  const carte = (l: LigneBudget) => {
    const ouv = ouvert === l.corps;
    const siennes = depenses.filter((d) => d.corps === l.corps);
    const tn = ton(l);
    const depasse = l.reel > l.prevu + 0.005 && l.prevu > 0;
    return (
      <div key={l.corps} className={"cc" + (tn === "r" ? " r" : tn === "o" ? " o" : "") + (l.materiel ? " mat" : "")}>
        <div className="cc-h">
          <div className="cc-n"><b>{nomCorps(l.corps)}</b>{!l.materiel && statut(l)}</div>
          <div className={"pct num " + tn}>
            <b>{l.prevu > 0 ? pct(l.part * 100) : l.reel > 0 ? "—" : pct(0)}</b>
            <small>{t.utilise}</small>
          </div>
        </div>
        {l.materiel && <p className="mat-sub">{t.materielSub}</p>}
        {barre(l)}
        <div className="chiffres num">
          <div>{t.budget}<b>{l.prevu > 0 ? fmt(l.prevu) : "—"}</b></div>
          <div>{t.paye}<b>{fmt(l.reel)}</b></div>
          {depasse || l.etat === "hors_estimation"
            ? <div className="r">{l.prevu > 0 ? t.depasseDe : t.sansBudget}<b>{l.prevu > 0 ? fmt(l.reel - l.prevu) : fmt(l.reel)}</b></div>
            : <div>{t.reste}<b>{fmt(l.reste)}</b></div>}
        </div>
        {l.reel > 0 && !l.materiel && (
          <div className="natures num">
            {NATURES.filter((n) => l.parNature[n] > 0).map((n) => (
              <span key={n} className={"nat nat-" + n}><i />{t.natures[n]}<b>{fmt(l.parNature[n])}</b></span>
            ))}
          </div>
        )}
        {l.prevuToi > 0 && l.prevuArtisan > 0 && <p className="partage num">{t.prevuPartage(fmt(l.prevuArtisan), fmt(l.prevuToi))}</p>}

        {l.materiel && (
          matEdit ? (
            <form className="mat-form" onSubmit={(e) => { e.preventDefault(); const v = lireMontant(matVal); if (v >= 0 && matVal.trim()) enregistrerMateriel(v); else setMatErr(true); }}>
              <label><span>{t.materielLib}</span><input value={matVal} onChange={(e) => setMatVal(e.target.value)} inputMode="decimal" placeholder="0" autoFocus /></label>
              <button type="submit" className="add" disabled={matBusy}>{matBusy ? t.enCours : t.materielEnregistrer}</button>
              <button type="button" className="sec" onClick={() => { setMatEdit(false); setMatErr(false); }}>{t.annuler}</button>
              {bilan.budgetMateriel != null && <button type="button" className="lien" onClick={() => enregistrerMateriel(null)}>{t.materielEstimation}</button>}
            </form>
          ) : (
            <div className="cc-pied">
              {l.prevu <= 0 && <p className="mat-sub" style={{ width: "100%" }}>{t.materielAucun}</p>}
              <button type="button" className="lien" onClick={() => { setMatVal(l.prevu > 0 ? String(l.prevu) : ""); setMatEdit(true); setMatErr(false); }}>
                {l.prevu > 0 ? t.materielModifier + " " + t.budget.toLowerCase() : t.materielFixer}
              </button>
              <button type="button" className="lien" onClick={() => saisirIci(l.corps)}>{"+ " + t.ajouterIci}</button>
              {siennes.length > 0 && (
                <button type="button" className="lien" aria-expanded={ouv} onClick={() => setOuvert(ouv ? null : l.corps)}>
                  {ouv ? t.masquerDep : t.voirDep(siennes.length)}
                </button>
              )}
            </div>
          )
        )}
        {l.materiel && matErr && <div className="err" role="alert">{t.erreurMateriel}</div>}

        {!l.materiel && (
          <div className="cc-pied">
            {siennes.length > 0 && (
              <button type="button" className="lien" aria-expanded={ouv} onClick={() => setOuvert(ouv ? null : l.corps)}>
                {ouv ? t.masquerDep : t.voirDep(siennes.length)}
              </button>
            )}
            {!l.materiel && <button type="button" className="lien" onClick={() => saisirIci(l.corps)}>{"+ " + t.ajouterIci}</button>}
          </div>
        )}
        {ouv && siennes.length > 0 && (
          <div className="det">
            {siennes.map((d) => {
              const n: NatureDepense = d.nature ?? "fp";
              return (
                <div key={d.id}>
                  <div className="hl">
                    <span className="d num">{dateCourte(d.date)}</span>
                    <span className="tx" title={d.libelle}>{d.libelle}</span>
                    <span className={"tag " + n}>{t.natures[n]}</span>
                    <span className="m num">{fmt(d.montant)}</span>
                    <button type="button" onClick={() => setASupprimer(aSupprimer === d.id ? null : d.id)} aria-expanded={aSupprimer === d.id} aria-label={`${t.supprimer} ${d.libelle}`}>✕</button>
                  </div>
                  {aSupprimer === d.id && (
                    <div className="hl-conf">
                      <span>{t.confirmer}</span>
                      <button type="button" className="oui" onClick={() => supprimer(d)}>{t.supprimer}</button>
                      <button type="button" onClick={() => setASupprimer(null)}>{t.annuler}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card av-bud">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>{t.titre}</h2>
      <div className="sub">{t.sub}</div>

      <div className="resume num">
        <div className="tuile fonce"><div className="k">{t.bPrevu}</div><div className="v">{fmt(bilan.estimation)}</div><div className="s">{t.bPrevuS}</div></div>
        <div className="tuile"><div className="k">{t.bPaye}</div><div className="v">{fmt(bilan.reel)}</div><div className="s">{t.bPayeS(pct(partPayee))}</div></div>
        <div className="tuile"><div className="k">{t.bReste}</div><div className="v">{fmt(reste)}</div><div className="s">{t.bResteS}</div></div>
      </div>
      {aDesDepenses && (
        <>
          <div className="gtrack" aria-hidden="true">
            <i className="paye" style={{ width: w(bilan.reel) }} />
            <i className="reste" style={{ left: w(bilan.reel), width: w(reste) }} />
            {ecart > 0.5 && <i className="over" style={{ left: w(bilan.estimation), width: w(ecart) }} />}
            <span className="mark" style={{ left: w(bilan.estimation) }} />
          </div>
          <div className="ligne-v num">
            <span className={"verdict " + verdict.cls}>{verdict.txt}</span>
            <span>{t.prevFinale + " : "}<b>{fmt(bilan.prevision)}</b></span>
            {bilan.budgetMax > 0 && <span>{t.budgetMax + " : "}<b>{fmt(bilan.budgetMax)}</b></span>}
          </div>
          {alertes.length > 0 && (
            <div className="alerts" role="status" aria-live="polite">
              {alertes.map((a, i) => <div key={i} className={`al ${a.cls}`}>{a.txt}</div>)}
            </div>
          )}
        </>
      )}
      {!aDesDepenses && <p className="vide-msg">{t.vide}</p>}

      <div className="tete-c">
        <h3>{t.parCorps}</h3>
        <span>{t.nbDep(depenses.length)}</span>
      </div>
      <div className="cartes">{lignes.map(carte)}</div>

      <div className="pied">
        <button type="button" className={saisie ? "sec" : "add"} onClick={() => setSaisie((v) => !v)} aria-expanded={saisie}>
          {saisie ? t.fermer : "+ " + t.ajouter}
        </button>
      </div>

      {saisie && (
        <form ref={refForm} className="saisie" onSubmit={ajouter} aria-label={t.ajouter}>
          <label className="corps"><span>{t.libCorps}</span>
            <select value={choix} onChange={(e) => { setChoix(e.target.value); if (e.target.value === CORPS_MATERIEL) setNature("mat"); }}>
              {corps.map((c) => <option key={c} value={c}>{nomCorps(c)}</option>)}
              <option value={CORPS_AUTRE}>{t.autre}</option>
            </select>
          </label>
          <label className="lib"><span>{t.libelle}</span>
            <input ref={refLibelle} value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={estMateriel ? t.libellePhMat : t.libellePh} maxLength={200} aria-invalid={!!err?.champs && !libelle.trim()} />
          </label>
          <label><span>{t.montant}</span>
            <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="decimal" placeholder="0" aria-invalid={!!err?.champs && !(lireMontant(montant) > 0)} />
          </label>
          {!estMateriel && (
            <fieldset className="natrow">
              <legend>{t.libNature}</legend>
              <div className="seg">
                {NATURES.map((n) => (
                  <label key={n}>
                    <input type="radio" name="nature-depense" value={n} checked={nature === n} onChange={() => setNature(n)} />
                    <span>{t.natures[n]}<small>{t.naturesAide[n]}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="envoi"><button type="submit" className="add" disabled={busy}>{busy ? t.enCours : t.valider}</button></div>
        </form>
      )}
      {err && <div className="err" role="alert">{err.msg}</div>}
    </div>
  );
}
