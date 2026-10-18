/**
 * Gestion du budget (module M5) : le prévu de l'estimation contre les dépenses réelles saisies sur
 * le chantier, corps d'état par corps d'état, avec les alertes de dépassement et la prévision finale.
 *
 * Fonctions pures (aucune session, aucune base) : la fiche projet les appelle avec les réponses du
 * projet et les lignes de la table `expenses`. Testées dans tests/budget-reel.test.ts.
 *
 * Conventions :
 * - le PRÉVU d'un corps d'état = son TTC hors aléas dans l'estimation, lignes perso comprises
 *   (`lotsAvecPerso`, la même base que le camembert « Où part le budget ») ;
 * - les ALÉAS restent une enveloppe globale, ils ne sont pas répartis par corps d'état ;
 * - la PRÉVISION FINALE d'un corps = son réel s'il est terminé (tous ses postes « terminés » dans le
 *   suivi) et qu'il a des dépenses, sinon le plus grand du prévu et du réel (ce qui est dépensé est
 *   acquis, ce qui reste prévu reste à payer). Une dépense sur un corps absent de l'estimation
 *   compte telle quelle.
 */
import { buildDevis, statutLigne, type Ctx, type Selection } from "./core";
import { catalogueDe } from "./catalogue-neuf";
import { normaliserCles } from "./identite";
import { lotsAvecPerso, totauxAvecPerso } from "./projet";

/** Une dépense réelle, telle que lue dans la table `expenses`. */
export type Depense = { id: string; corps: string; libelle: string; montant: number; date: string };

/** Seuil d'alerte : à partir de 90 % du prévu consommé sur un corps pas encore terminé. */
export const SEUIL_ATTENTION = 0.9;

export type EtatCorps = "ok" | "attention" | "depasse" | "hors_estimation";

export type LigneBudget = {
  corps: string;
  prevu: number;
  reel: number;
  /** réel − prévu (positif = dépassement). */
  ecart: number;
  /** part du prévu consommée (0 si rien de prévu). */
  part: number;
  termine: boolean;
  prevision: number;
  etat: EtatCorps;
};

export type BilanBudget = {
  lignes: LigneBudget[];
  /** TTC hors aléas de l'estimation. */
  prevu: number;
  /** Provision pour aléas de l'estimation. */
  aleas: number;
  /** Total de l'estimation, aléas compris. */
  estimation: number;
  reel: number;
  prevision: number;
  /** prévision − estimation (aléas compris) : négatif = sous l'enveloppe. */
  ecartPrevision: number;
  /** Budget maximum saisi dans l'estimation (0 = non défini). */
  budgetMax: number;
  alertes: Alerte[];
};

export type Alerte =
  | { type: "depasse"; corps: string; montant: number }
  | { type: "attention"; corps: string; part: number }
  | { type: "hors_estimation"; corps: string; montant: number }
  | { type: "prevision_estimation"; montant: number }
  | { type: "prevision_budget"; montant: number };

type Rep = { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; custom?: unknown; codePostal?: string };

const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Le bilan budgétaire d'un projet : null si les réponses ne sont pas au format estimateur. */
export function bilanBudget(reponses: unknown, depenses: Depense[]): BilanBudget | null {
  const r = reponses as Rep;
  if (!r?.ctx) return null;
  const ctx: Ctx = { ...r.ctx, codePostal: r.ctx.codePostal ?? r.codePostal };
  const sel = normaliserCles((r.sel || {}) as Selection);
  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const statuts = normaliserCles(r.statuts || {});
  const totaux = totauxAvecPerso(dv.totaux, r.custom, ctx.aleas);

  // Un corps est terminé quand il a des postes et qu'ils sont tous « terminés » dans le suivi.
  const postes = new Map<string, { n: number; faits: number }>();
  for (const li of dv.lignes) {
    const p = postes.get(li.corps) ?? { n: 0, faits: 0 };
    p.n++;
    if (statutLigne(statuts, li) === 2) p.faits++;
    postes.set(li.corps, p);
  }
  const termine = (corps: string): boolean => {
    const p = postes.get(corps);
    return !!p && p.n > 0 && p.faits === p.n;
  };

  const reelPar = new Map<string, number>();
  for (const d of depenses) reelPar.set(d.corps, (reelPar.get(d.corps) ?? 0) + (Number(d.montant) || 0));

  const lignes: LigneBudget[] = [];
  for (const lot of lotsAvecPerso(dv.lots, r.custom)) {
    const prevu = lot.ttc, reel = reelPar.get(lot.corps) ?? 0, fini = termine(lot.corps);
    reelPar.delete(lot.corps);
    const part = prevu > 0 ? reel / prevu : 0;
    const etat: EtatCorps = reel > prevu + 0.005 ? "depasse" : !fini && prevu > 0 && part >= SEUIL_ATTENTION ? "attention" : "ok";
    // Terminé SANS aucune dépense saisie : on n'en sait rien, la prévision garde le prévu.
    const prevision = fini && reel > 0 ? reel : Math.max(prevu, reel);
    lignes.push({ corps: lot.corps, prevu: r2(prevu), reel: r2(reel), ecart: r2(reel - prevu), part, termine: fini, prevision: r2(prevision), etat });
  }
  // Dépenses sur un corps que l'estimation ne prévoyait pas (« Autre », un lot ajouté sur le chantier…).
  for (const [corps, reel] of reelPar) {
    lignes.push({ corps, prevu: 0, reel: r2(reel), ecart: r2(reel), part: 0, termine: false, prevision: r2(reel), etat: "hors_estimation" });
  }

  const prevu = r2(lignes.reduce((s, l) => s + l.prevu, 0));
  const reel = r2(lignes.reduce((s, l) => s + l.reel, 0));
  // Les aléas restent disponibles tant qu'il reste du prévu : la prévision finale les garde entiers,
  // ce qui est prudent (on ne compte pas sur des imprévus qui n'arriveront pas).
  const prevision = r2(lignes.reduce((s, l) => s + l.prevision, 0) + totaux.aleas);
  const estimation = r2(totaux.ttc);
  const budgetMax = Number(ctx.budget) > 0 ? Number(ctx.budget) : 0;

  const alertes: Alerte[] = [];
  for (const l of [...lignes].sort((a, b) => b.ecart - a.ecart)) {
    if (l.etat === "depasse") alertes.push({ type: "depasse", corps: l.corps, montant: l.ecart });
    else if (l.etat === "hors_estimation") alertes.push({ type: "hors_estimation", corps: l.corps, montant: l.reel });
  }
  for (const l of lignes) if (l.etat === "attention") alertes.push({ type: "attention", corps: l.corps, part: l.part });
  if (prevision > estimation + 0.5) alertes.push({ type: "prevision_estimation", montant: r2(prevision - estimation) });
  if (budgetMax > 0 && prevision > budgetMax + 0.5) alertes.push({ type: "prevision_budget", montant: r2(prevision - budgetMax) });

  return { lignes, prevu, aleas: r2(totaux.aleas), estimation, reel, prevision, ecartPrevision: r2(prevision - estimation), budgetMax, alertes };
}

/** Les corps d'état proposés à la saisie d'une dépense : ceux de l'estimation, du plus gros au plus petit. */
export function corpsDuProjet(reponses: unknown): string[] {
  const b = bilanBudget(reponses, []);
  return b ? [...b.lignes].sort((a, x) => x.prevu - a.prevu).map((l) => l.corps) : [];
}

/** Le corps d'état « libre » pour une dépense qui ne rentre dans aucun lot de l'estimation. */
export const CORPS_AUTRE = "Autre";
