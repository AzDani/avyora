/**
 * Calculs niveau PROJET pour le moteur estimateur — la seule source pour les pages
 * (liste, mon-espace, fiche). Tout part de `reponses = { v:"estimateur", ctx, sel }`.
 * Aucune dépendance à l'ancien moteur.
 */
import { buildDevis, statutLigne, key, PHASES, customTotals, type Ctx, type Selection, type DevisLot, type Tache, type Totaux, type CustomLine } from "./core";
import { catalogueDe, PHASES_NEUF } from "./catalogue-neuf";
import { normaliserCles } from "./identite";

export type ProjetEstim = {
  ttc: number;
  ht: number;
  tva: number;
  aleas: number;
  surface: number;
  eurM2: number;
  /** Frais hors TVA et hors aléas (taxes, assurance dommages-ouvrage) : `bilan.frais`, 0 en rénovation. */
  frais: number;
  nature: "reno" | "neuf";
};

type Rep = { v?: string; ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; custom?: unknown };

/**
 * Construction neuve : totaux du devis + lignes personnalisées validées (leur HT, leur TVA, et les
 * aléas sur leur HT), le même calcul que la vue devis et le PDF. Un projet neuf a ainsi le même
 * total partout (barre live, fiche, liste, devis, PDF). La rénovation ne l'appelle pas : sa fiche
 * et sa liste gardent leur calcul (décision à prendre à part, elle changerait un écran réno).
 */
export function totauxAvecPerso(t: Totaux, custom: unknown, aleasPct: number | undefined): Totaux {
  const lignes = Array.isArray(custom) ? (custom as CustomLine[]).filter((x) => !!x && typeof x === "object") : [];
  const cu = customTotals(lignes);
  if (!cu.ht && !cu.tva) return t;
  const ht = t.ht + cu.ht, tva = t.tva + cu.tva, aleas = t.aleas + cu.ht * ((aleasPct || 0) / 100);
  return { ht, tva, aleas, ttc: ht + tva + aleas };
}

export type StatutChantier = "estimation" | "en_cours" | "termine";
export type Avancement = { total: number; done: number; prog: number; pct: number; statut: StatutChantier };

/** Avancement du chantier d'un projet : nombre de postes terminés/en cours + statut global. */
export function avancementProjet(reponses: unknown): Avancement {
  const vide: Avancement = { total: 0, done: 0, prog: 0, pct: 0, statut: "estimation" };
  const r = reponses as Rep;
  if (!estFormatEstimateur(r)) return vide;
  const dv = buildDevis(catalogueDe(r.ctx), r.ctx as Ctx, normaliserCles(r.sel));
  const statuts = normaliserCles(r.statuts);
  const total = dv.lignes.length;
  let done = 0, prog = 0;
  for (const li of dv.lignes) {
    const s = statutLigne(statuts, li);
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
  const dv = buildDevis(catalogueDe(ctx), ctx, r.sel || {});
  const surface = ctx.surface || 0;
  // Rénovation : `dv.totaux` tel quel (inchangé). Neuf : + lignes personnalisées.
  const t = estNeuf(ctx) ? totauxAvecPerso(dv.totaux, r.custom, ctx.aleas) : dv.totaux;
  return {
    ttc: t.ttc,
    ht: t.ht,
    tva: t.tva,
    aleas: t.aleas,
    surface,
    eurM2: surface > 0 ? t.ttc / surface : 0,
    frais: dv.bilan.frais,
    nature: estNeuf(ctx) ? "neuf" : "reno",
  };
}

// ── Construction neuve : ce que les pages lisent pour afficher un projet ──────────────────────
/* Ces fonctions vivent ici et pas dans `catalogue-neuf.ts` : ce module-là n'importe de `core` que
   des types, exprès. Y importer `PHASES` (une valeur) créerait un cycle à l'exécution
   (core → catalogue-neuf → core). En rénovation, chacune rend exactement ce que les pages
   utilisaient avant : même liste, même ordre (vérifié par `tests/estimateur-neuf-affichage.test.ts`). */

/** true pour une construction neuve. Absent ou « reno » : rénovation (tous les anciens projets). */
export const estNeuf = (ctx?: Pick<Ctx, "nature"> | null): boolean => ctx?.nature === "neuf";

/** Nature d'un projet enregistré, depuis ses réponses (format inattendu : rénovation). */
export function natureProjet(reponses: unknown): "reno" | "neuf" {
  return estNeuf((reponses as Rep | null)?.ctx) ? "neuf" : "reno";
}

/** Phases d'affichage. Rénovation : exactement `PHASES` (même référence, même ordre). */
export function phasesDe(ctx?: Pick<Ctx, "nature"> | null): readonly string[] {
  return estNeuf(ctx) ? PHASES_NEUF : PHASES;
}

/**
 * Un lot par corps d'état. En neuf, un même lot revient dans plusieurs phases (la maçonnerie
 * coule les fondations, monte les murs puis tire les chapes), parfois deux fois dans la même
 * phase : on additionne et on garde la liste de ses phases. Rénovation : un corps n'apparaît
 * qu'une fois, la fonction rend donc la même liste, dans le même ordre, avec les mêmes montants.
 */
export function lotsParCorps(lots: DevisLot[]): (DevisLot & { phases: string[] })[] {
  const m = new Map<string, DevisLot & { phases: string[] }>();
  for (const l of lots) {
    const e = m.get(l.corps);
    if (e) { e.ttc += l.ttc; if (!e.phases.includes(l.phase)) e.phases.push(l.phase); }
    else m.set(l.corps, { ...l, phases: [l.phase] });
  }
  return [...m.values()];
}

/** Clé d'une ligne (`key(lot, nom)`) → poste du catalogue du projet : pour reconnaître un jalon
 *  ou un frais depuis une `DevisLigne`. */
export function tachesParCle(ctx: Pick<Ctx, "nature"> | null | undefined): Map<string, Tache> {
  const m = new Map<string, Tache>();
  for (const l of catalogueDe(ctx)) for (const t of l.t) m.set(key(l.c, t.n), t);
  return m;
}

/** Jalon = démarche à 0 € (permis, DOC, DT, PV de réception, DAACT…) : un frais sans prix ni
 *  fourniture. La rénovation n'en a aucun (aucun frais au catalogue). */
export const estJalon = (t?: Tache | null): boolean => !!t?.frais && (t.fp ?? 0) === 0 && !t.sm;

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
  const cat = catalogueDe(r.ctx);
  const has = (c: string, sub: string) => cat.some((l) => l.c === c && l.t.some((t) => t.n.includes(sub) && sel[key(l.c, t.n)]?.on));
  if (has("Maçonnerie", "mur porteur")) conseils.push("Ouverture de mur porteur : une étude de structure (bureau d'études) est obligatoire avant travaux.");
  if (has("Raccordements aux réseaux", "Assainissement")) conseils.push("Assainissement individuel : faites valider la filière (fosse / micro-station) par le SPANC selon le nombre d'occupants.");
  if (Object.values(sel).some((x) => x?.on && x?.self)) conseils.push("Vous réalisez certains postes vous-même : les matériaux achetés en magasin sont à 20 % de TVA (déjà pris en compte), le taux réduit ne s'applique qu'aux factures d'artisan.");
  conseils.push("Estimation au métré, prix moyens du marché 2026 — demandez 2-3 devis pour confirmer avant de vous engager.");
  return conseils;
}
