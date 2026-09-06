/**
 * Calculs niveau PROJET pour le moteur estimateur — la seule source pour les pages
 * (liste, mon-espace, fiche). Tout part de `reponses = { v:"estimateur", ctx, sel }`.
 * Aucune dépendance à l'ancien moteur.
 */
import { buildDevis, key, type Ctx, type Selection } from "./core";
import { CATALOG } from "./catalog";

export type ProjetEstim = {
  ttc: number;
  ht: number;
  tva: number;
  aleas: number;
  surface: number;
  eurM2: number;
};

type Rep = { v?: string; ctx?: Ctx; sel?: Selection; statuts?: Record<string, number> };

export type StatutChantier = "estimation" | "en_cours" | "termine";
export type Avancement = { total: number; done: number; prog: number; pct: number; statut: StatutChantier };

/** Avancement du chantier d'un projet : nombre de postes terminés/en cours + statut global. */
export function avancementProjet(reponses: unknown): Avancement {
  const vide: Avancement = { total: 0, done: 0, prog: 0, pct: 0, statut: "estimation" };
  const r = reponses as Rep;
  if (!estFormatEstimateur(r)) return vide;
  const dv = buildDevis(CATALOG, r.ctx as Ctx, r.sel || {});
  const statuts = r.statuts || {};
  const total = dv.lignes.length;
  let done = 0, prog = 0;
  for (const li of dv.lignes) {
    const s = statuts[key(li.corps, li.nom)];
    if (s === 2) done++;
    else if (s === 1) prog++;
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const statut: StatutChantier = total > 0 && done === total ? "termine" : done + prog > 0 ? "en_cours" : "estimation";
  return { total, done, prog, pct, statut };
}

/** true si les réponses sont au format estimateur (le seul format supporté). */
export function estFormatEstimateur(reponses: unknown): boolean {
  return (reponses as Rep)?.v === "estimateur" && !!(reponses as Rep).ctx;
}

/** Totaux d'un projet depuis ses réponses, ou null si format inattendu. */
export function estimationProjet(reponses: unknown): ProjetEstim | null {
  const r = reponses as Rep;
  if (!estFormatEstimateur(r)) return null;
  const ctx = r.ctx as Ctx;
  const dv = buildDevis(CATALOG, ctx, r.sel || {});
  const surface = ctx.surface || 0;
  return {
    ttc: dv.totaux.ttc,
    ht: dv.totaux.ht,
    tva: dv.totaux.tva,
    aleas: dv.totaux.aleas,
    surface,
    eurM2: surface > 0 ? dv.totaux.ttc / surface : 0,
  };
}

// Label régional (informatif — les prix du catalogue sont nationaux, pas de coef régional).
const IDF = ["75", "77", "78", "91", "92", "93", "94", "95"];
const METROPOLES = ["69", "13", "33", "31", "59", "44", "67", "34", "06", "35", "38", "21", "76", "37", "51", "63", "86", "25", "54", "57", "68", "30", "84", "83", "64", "49", "42", "29", "56", "14"];
export function regionLabel(codePostal?: string): string {
  const d = (codePostal || "").slice(0, 2);
  if (IDF.includes(d)) return "Île-de-France";
  if (METROPOLES.includes(d)) return "Grande métropole";
  return "France";
}

/** Conseils / accompagnement technique dérivés de la sélection. */
export function conseilsProjet(reponses: unknown): string[] {
  const r = reponses as Rep;
  if (!estFormatEstimateur(r)) return [];
  const sel = (r.sel || {}) as Selection;
  const conseils: string[] = [];
  const has = (c: string, sub: string) => CATALOG.some((l) => l.c === c && l.t.some((t) => t.n.includes(sub) && sel[key(l.c, t.n)]?.on));
  if (has("Maçonnerie", "mur porteur")) conseils.push("Ouverture de mur porteur : une étude de structure (bureau d'études) est obligatoire avant travaux.");
  if (has("Raccordements aux réseaux", "Assainissement")) conseils.push("Assainissement individuel : faites valider la filière (fosse / micro-station) par le SPANC selon le nombre d'occupants.");
  if (Object.values(sel).some((x) => x?.on && x?.self)) conseils.push("Vous réalisez certains postes vous-même : les matériaux achetés en magasin sont à 20 % de TVA (déjà pris en compte), le taux réduit ne s'applique qu'aux factures d'artisan.");
  conseils.push("Estimation au métré, prix moyens du marché 2026 — demandez 2-3 devis pour confirmer avant de vous engager.");
  return conseils;
}
