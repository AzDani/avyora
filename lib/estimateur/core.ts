/**
 * AVYORA — cœur de l'estimateur (métré saisi), TypeScript PUR.
 *
 * Portage 1:1 de la logique de la maquette (avyora-estimateur), sans DOM ni state global :
 * toutes les fonctions prennent le catalogue, le contexte (infos de départ) et la sélection
 * en paramètres → réutilisable côté UI (composant client) ET côté serveur (ré-estimation).
 *
 * Convention prix : `fp` = fourni-posé HT (artisan), `sm` = sans main-d'œuvre HT (fourniture
 * seule, achat par le particulier ; null = prestation non « faisable soi-même »).
 * TVA : réduit (10 / 5,5 %) uniquement sur facture d'artisan fourni-posé ; « Je le fais » = 20 %
 * (matériaux achetés en magasin). Aléas : provision hors Études.
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type Finition = "eco" | "standard" | "premium";
export type TypeBien = "Studio" | "T2" | "T3" | "T4" | "Maison";

export interface Tache {
  n: string;            // nom
  u: string;            // unité : m2 | ml | u | point | forfait | jour | pct
  fp: number | null;    // fourni-posé HT
  sm: number | null;    // sans MO (fourniture) HT ; null = prestation
  tva?: number;         // TVA spécifique à la tâche (sinon celle du lot)
  note?: string;
}
export interface Lot {
  c: string;            // corps d'état
  p: string;            // phase de chantier
  tva: number;          // TVA par défaut du lot
  t: Tache[];
  note?: string;
}

export interface Ctx {
  surface: number;            // surface habitable totale (m²)
  surfaceSol: number;         // emprise au sol (m²)
  surfaceSolManual: boolean;  // l'utilisateur a saisi la surface au sol à la main
  niveaux: number;            // nb de niveaux (RDC = 1)
  type: TypeBien;
  hauteur: number;            // hauteur sous plafond (m)
  pieces: number;             // nb de pièces (toutes) — legacy / mode rapide ; sinon dérivé du détail ci-dessous
  fenetres: number;
  sdb: number;                // salles de bain HORS suite parentale
  wc: number;
  budget: number;
  aleas: number;              // % provision aléas
  finition: Finition;
  codePostal?: string;        // sert au coefficient régional (main-d'œuvre)
  // Détail des pièces (estimateur détaillé). Si renseigné, pilote le nb de pièces effectif + les SDB.
  sejour?: number; cuisine?: number; chambres?: number; suites?: number; couloir?: number; buanderie?: number;
}

export interface LigneSel {
  on?: boolean;
  self?: boolean;             // « Je le fais »
  qty?: number | null;        // quantité saisie (si manuel / non-auto)
  manual?: boolean;           // override manuel d'une quantité auto
}
export type Selection = Record<string, LigneSel>;

export interface Totaux { ht: number; tva: number; aleas: number; ttc: number; }
export interface Bilan { paye: number; matA: number; moA: number; achat: number; eco: number; }
export type Mode = "fait-faire" | "je-fais" | "location";
export interface DevisLigne {
  corps: string; phase: string; nom: string; unite: string;
  qty: number; mode: Mode; ht: number; tva: number; ttc: number;
}
export interface DevisLot { corps: string; phase: string; ttc: number; }
export interface Devis { totaux: Totaux; bilan: Bilan; lots: DevisLot[]; lignes: DevisLigne[]; }

// ── Constantes ────────────────────────────────────────────────────────────────
export const PHASES = ["Préparation", "Gros œuvre & clos-couvert", "Second œuvre", "Équipements"] as const;

// Niveau de finition = coefficient PAR LOT (premium = prix de base = 1,00 partout).
// Barème par défaut (= groupe « écart fort ») pour tout lot non listé dans LOT_FIN.
export const FINCO: Record<Finition, number> = { eco: 0.67, standard: 0.78, premium: 1 };
const G0: Record<Finition, number> = { eco: 1, standard: 1, premium: 1 };        // aucun écart
const G1: Record<Finition, number> = { eco: 0.83, standard: 0.88, premium: 1 };  // faible (écart +7 pts)
const G2: Record<Finition, number> = { eco: 0.75, standard: 0.83, premium: 1 };  // moyen (écart +7 pts)
const G3: Record<Finition, number> = { eco: 0.67, standard: 0.78, premium: 1 };  // fort (écart +7 pts)
export const LOT_FIN: Record<string, Record<Finition, number>> = {
  "Etudes / Conception": G0, "Annexes de chantier": G0, "Location de matériel": G0, "Raccordements aux réseaux": G0, "Démolition": G0,
  "Maçonnerie": G1, "Charpente & structure bois": G1, "Isolation": G1, "Electricite": G1, "Chauffage / VMC": G1,
  "Toiture": G2, "Façade": G2, "Cloisons / Platrerie": G2, "Plomberie": G2, "Menuiseries exterieures": G2, "Menuiseries interieures": G2,
  "Carrelage / Revetements": G3, "Peinture": G3, "Cuisine": G3,
};
/** Coefficient de finition pour un lot donné (selon le niveau choisi dans ctx). */
export function finCoef(ctx: Ctx, corps: string): number {
  return (LOT_FIN[corps] ?? FINCO)[ctx.finition];
}
// ── Coefficient régional (main-d'œuvre) ───────────────────────────────────────
// La MO varie fortement selon la région ; les matériaux sont ~nationaux (sauf outre-mer,
// logistique îles). Barème modéré par département (2 premiers chiffres du code postal).
export interface RegionCoef { mo: number; mat: number; zone: string; }
const REG_TIERS: { c: number; z: string; dep: string[] }[] = [
  { c: 1.20, z: "Paris & petite couronne", dep: ["75", "92", "93", "94"] },
  { c: 1.10, z: "Zone tendue", dep: ["77", "78", "91", "95", "06", "83", "13", "69", "74", "73"] },
  { c: 1.04, z: "Grande agglomération", dep: ["33", "31", "44", "35", "59", "67", "34", "38", "21", "54", "68", "64", "63", "76"] },
  { c: 0.90, z: "Zone rurale", dep: ["23", "15", "58", "55", "52", "08", "36", "48", "32", "46", "09", "88", "70", "03", "43", "12", "19", "89", "05", "53", "61"] },
];
const REG_DEP: Record<string, { c: number; z: string }> = {};
for (const t of REG_TIERS) for (const d of t.dep) REG_DEP[d] = { c: t.c, z: t.z };
const REG_DOM: Record<string, string> = { "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte" };

/** Coefficient régional depuis un code postal : { mo, mat, zone }. Défaut = moyenne nationale. */
export function regionCoef(cp?: string): RegionCoef {
  const d = (cp || "").replace(/\D/g, "");
  if (d.length < 2) return { mo: 1, mat: 1, zone: "Moyenne nationale" };
  const dom = REG_DOM[d.slice(0, 3)];
  if (dom) return { mo: 1.05, mat: 1.15, zone: dom + " (outre-mer)" };
  if (d.slice(0, 2) === "20") return { mo: 1.08, mat: 1.05, zone: "Corse" };
  const hit = REG_DEP[d.slice(0, 2)];
  return hit ? { mo: hit.c, mat: 1, zone: hit.z } : { mo: 1, mat: 1, zone: "Moyenne nationale" };
}
const regCoef = (ctx: Ctx): RegionCoef => regionCoef(ctx.codePostal);

export const FINI = "Finitions plâtrerie (bandes, enduit)";
export const LOC = "Location de matériel";
const HIDE_APPART = ["Toiture"];

export const ICON: Record<string, string> = {
  "Etudes / Conception": "📐", "Annexes de chantier": "🚧", "Location de matériel": "🛠️",
  "Raccordements aux réseaux": "🔌", "Démolition": "🧱", "Maçonnerie": "🧱",
  "Charpente & structure bois": "🪵", "Toiture": "🏠", "Façade": "🎨",
  "Menuiseries exterieures": "🪟", "Isolation": "🧊", "Cloisons / Platrerie": "🧱",
  "Electricite": "⚡", "Plomberie": "🚿", "Chauffage / VMC": "🔥",
  "Carrelage / Revetements": "🎨", "Peinture": "🖌️", "Menuiseries interieures": "🚪", "Cuisine": "🍳",
};

export function defaultCtx(): Ctx {
  return {
    surface: 80, surfaceSol: 80, surfaceSolManual: false, niveaux: 1, type: "T3",
    hauteur: 2.5, pieces: 6, fenetres: 7, sdb: 1, wc: 1, budget: 60000, aleas: 7, finition: "standard",
    sejour: 1, cuisine: 1, chambres: 3, suites: 0, couloir: 1, buanderie: 0,
  };
}

export const key = (c: string, n: string): string => c + "|" + n;
export const isLoc = (c: string): boolean => c === LOC;
export const isAppart = (ctx: Ctx): boolean => ctx.type !== "Maison";
export const visible = (ctx: Ctx, l: Lot): boolean => !(isAppart(ctx) && HIDE_APPART.indexOf(l.c) >= 0);

export function nbFen(type: TypeBien): number {
  return ({ Studio: 3, T2: 5, T3: 7, T4: 9, Maison: 12 } as Record<TypeBien, number>)[type] ?? 6;
}
export function nbPieces(type: TypeBien): number {
  return ({ Studio: 2, T2: 4, T3: 6, T4: 7, Maison: 8 } as Record<TypeBien, number>)[type] ?? 5;
}

/** Emprise au sol dérivée (habitable ÷ niveaux) tant que l'utilisateur ne l'a pas saisie. */
export function deriveSol(ctx: Ctx): number {
  return ctx.surfaceSolManual ? ctx.surfaceSol : Math.max(1, Math.round(ctx.surface / (ctx.niveaux || 1)));
}

/** Nb de pièces effectif : somme du détail (séjour+cuisine+chambres+suites+couloir+buanderie) si renseigné,
 *  sinon le champ `pieces` (mode rapide / anciens projets). */
export function piecesEff(ctx: Ctx): number {
  const parts = [ctx.sejour, ctx.cuisine, ctx.chambres, ctx.suites, ctx.couloir, ctx.buanderie];
  if (!parts.some((v) => v != null)) return ctx.pieces;
  return parts.reduce<number>((s, v) => s + (v ?? 0), 0);
}
/** Salles de bain effectives : SDB classiques + suites parentales (chacune a sa propre SDB). */
export function sdbEff(ctx: Ctx): number {
  return ctx.sdb + (ctx.suites ?? 0);
}

// ── Quantités automatiques (dérivées des infos de départ) ─────────────────────
/** Surface de placo posé (finitions plâtrerie) = cloison ×2 faces + doublage + faux plafond.
 *  Utilise la quantité EFFECTIVE (auto ou manuelle) des postes parents, pas seulement `qty`
 *  — sinon un poste laissé en « auto » (qty non saisie) compte pour 0. */
export function derivedFinitions(ctx: Ctx, sel: Selection): number {
  const eff = (n: string): number => {
    const s = sel[key("Cloisons / Platrerie", n)];
    if (!s || !s.on) return 0;
    if (!s.manual) return autoQty(ctx, "Cloisons / Platrerie", n, sel) ?? 0;
    return s.qty ?? 0;
  };
  return Math.round(eff("Monter une cloison") * 2 + eff("Doubler un mur") + eff("Faux plafond"));
}

/** Renvoie la quantité auto d'une tâche, ou null si elle n'est pas calculable de façon fiable. */
export function autoQty(ctx: Ctx, c: string, n: string, sel: Selection): number | null {
  const S = ctx.surface || 0;
  const SS = ctx.surfaceSol || S;
  const roof = SS * 1.4;
  const facade = 4 * Math.sqrt(SS) * ctx.hauteur * (ctx.niveaux || 1) * 1.25;
  const P = piecesEff(ctx), SDB = sdbEff(ctx), BUA = ctx.buanderie ?? 0;
  if (c === "Cloisons / Platrerie" && n === FINI) return derivedFinitions(ctx, sel);
  const A: Record<string, number> = {
    "Peinture des murs": S * ctx.hauteur, "Peinture des plafonds": S, "Préparation des surfaces": S * ctx.hauteur,
    "Rénovation électrique complète": S, "Refaire toute la plomberie (réseau, hors appareils)": S,
    "Enlever les vieux réseaux": S, "Enlever un revêtement de sol": S, "Nettoyage de fin de chantier": S,
    "Isolation des combles perdus (soufflage)": SS, "Isolation des combles aménagés (rampants)": SS,
    "Isolation du sol / plancher bas": SS, "Isolation des murs par l'intérieur": facade,
    "Faux plafond": S, "Préparation du sol (ragréage)": S,
    "Faïence / carrelage mural": SDB * 12, "Cloison pièce humide (hydrofuge)": SDB * 12,
    "Portes intérieures": P, "Radiateurs électriques": P,
    "Ajouter un point lumineux": P, "Ajouter / déplacer une prise": Math.round(S / 5),
    "Installer un WC": ctx.wc, "Installer une douche (hors carrelage)": SDB, "Meuble-vasque simple": SDB,
    "Raccorder lave-linge / lave-vaisselle": BUA,
    "Ventilation (VMC)": 1, "Sèche-serviette": SDB,
    "Monter une cloison": S * 0.35, "Doubler un mur": facade,
    "Créer un plancher bois": Math.max(0, S - SS), "Plancher béton (étage créé)": Math.max(0, S - SS),
    "Carrelage au sol": S * 0.6, "Sol stratifié (imitation bois)": S * 0.4, "Parquet bois (contrecollé)": S * 0.4,
    "Sol souple (PVC, lino)": S * 0.4, "Moquette": S * 0.4, "Béton ciré / résine": S * 0.6,
    "Plinthes": 4 * Math.sqrt(S * P), "Seuils / barres de seuil": P, "Peinture des boiseries": P,
    "Traiter la charpente": roof, "Charpente neuve ou refaite": roof, "Charpente en fermettes": roof,
    "Toiture tuile — réfection complète (m²)": roof, "Toiture ardoise — réfection complète (m²)": roof,
    "Toiture en tuiles": roof, "Toiture en ardoise": roof, "Toiture en zinc / bac acier": roof,
    "Sous-toiture (écran + liteaux)": roof, "Nettoyer / démousser la toiture": roof, "Toit plat (étanchéité)": SS,
    "Gouttières & descentes": 4 * Math.sqrt(SS) + 4 * ctx.hauteur * (ctx.niveaux || 1),
    "Nettoyer la façade": facade, "Réparer la façade (fissures, trous)": facade, "Refaire les joints (pierre, brique)": facade,
    "Refaire l'enduit / le crépi": facade, "Enduit à la chaux (maison ancienne)": facade, "Peindre la façade": facade,
    "Traitement imperméabilisant": facade, "Isolation par l'extérieur (ITE)": facade, "Bardage": facade,
    "Ravalement façade pierre (tout compris)": facade,
  };
  return A[n] != null ? Math.max(0, Math.round(A[n])) : null;
}

/** Une tâche est-elle pré-remplissable automatiquement ? (indépendant de la sélection) */
export function isAuto(ctx: Ctx, c: string, n: string): boolean {
  if (c === "Cloisons / Platrerie" && n === FINI) return true;
  return autoQty(ctx, c, n, {}) != null;
}

/** Quantité effective d'une tâche (auto non-modifiée, ou saisie). */
export function qtyOf(ctx: Ctx, sel: Selection, c: string, t: Tache): number {
  if (t.u === "forfait") return 1;
  const s = sel[key(c, t.n)];
  if (isAuto(ctx, c, t.n) && !(s && s.manual)) return autoQty(ctx, c, t.n, sel) ?? 0;
  return s && s.qty != null ? s.qty : 0;
}

// ── TVA / montants ────────────────────────────────────────────────────────────
export const rate = (l: Lot, t: Tache): number => (t.tva != null ? t.tva : l.tva != null ? l.tva : 10);

/** TVA effective : « Je le fais » = 20 % (matériaux achetés par le particulier), sinon taux réduit. */
export function effRate(l: Lot, t: Tache, sel: Selection): number {
  const s = sel[key(l.c, t.n)];
  if (s && s.self && !isLoc(l.c)) return 20;
  return rate(l, t);
}

export function lineHT(ctx: Ctx, sel: Selection, l: Lot, t: Tache): number {
  const s = sel[key(l.c, t.n)];
  if (!s || !s.on) return 0;
  const R = regCoef(ctx);
  const base = qtyOf(ctx, sel, l.c, t) * finCoef(ctx, l.c);
  // Location : équipement, pas de coef régional MO.
  if (isLoc(l.c)) return t.fp != null ? t.fp * base : 0;
  // « Je le fais » : matériaux achetés par le particulier → coef matériaux uniquement.
  if (s.self) {
    const pu = t.sm != null ? t.sm : t.fp;
    return pu != null ? pu * R.mat * base : 0;
  }
  // Fait-faire : matériaux (×mat) + main-d'œuvre (×mo régional). sm null = prestation pure → MO.
  if (t.fp == null) return 0;
  if (t.sm != null) return (t.sm * R.mat + (t.fp - t.sm) * R.mo) * base;
  return t.fp * R.mo * base;
}
export function lotHT(ctx: Ctx, sel: Selection, l: Lot): number {
  return l.t.reduce((s, t) => s + lineHT(ctx, sel, l, t), 0);
}
export function lotTTC(ctx: Ctx, sel: Selection, l: Lot): number {
  return l.t.reduce((s, t) => s + lineHT(ctx, sel, l, t) * (1 + effRate(l, t, sel) / 100), 0);
}

export function totals(catalog: Lot[], ctx: Ctx, sel: Selection): Totaux {
  let ht = 0, tva = 0, aleasBase = 0;
  catalog.filter((l) => visible(ctx, l)).forEach((l) => {
    l.t.forEach((t) => {
      const h = lineHT(ctx, sel, l, t);
      if (!h) return;
      ht += h;
      tva += (h * effRate(l, t, sel)) / 100;
      if (l.c !== "Etudes / Conception") aleasBase += h;
    });
  });
  const aleas = aleasBase * ((ctx.aleas || 0) / 100);
  return { ht, tva, aleas, ttc: ht + tva + aleas };
}

/** Bilan HT : payé aux artisans (dont matériaux/pose), acheté/loué par vous, économie DIY. */
export function bilan(catalog: Lot[], ctx: Ctx, sel: Selection): Bilan {
  let paye = 0, matA = 0, moA = 0, achat = 0, eco = 0;
  const R = regCoef(ctx);
  catalog.filter((l) => visible(ctx, l)).forEach((l) => {
    const fc = finCoef(ctx, l.c);
    l.t.forEach((t) => {
      const s = sel[key(l.c, t.n)];
      if (!s || !s.on || t.fp == null) return;
      const q = qtyOf(ctx, sel, l.c, t) * fc;
      const fpU = t.fp, smU = t.sm != null ? t.sm : null;
      if (isLoc(l.c)) { achat += fpU * q; return; }
      if (s.self) {                                    // matériaux (part particulier) au coef matériaux
        achat += (smU != null ? smU : fpU) * R.mat * q;
        if (smU != null) eco += (fpU - smU) * R.mo * q; // MO évitée, au coût régional
      } else if (smU != null) {                        // fait-faire : matériaux + MO régionale
        matA += smU * R.mat * q;
        moA += (fpU - smU) * R.mo * q;
        paye += (smU * R.mat + (fpU - smU) * R.mo) * q;
      } else {                                         // prestation pure → MO
        moA += fpU * R.mo * q;
        paye += fpU * R.mo * q;
      }
    });
  });
  return { paye, matA, moA, achat, eco };
}

/** Devis complet : totaux + bilan + répartition par lot + détail ligne par ligne. */
export function buildDevis(catalog: Lot[], ctx: Ctx, sel: Selection): Devis {
  const vis = catalog.filter((l) => visible(ctx, l));
  const lots: DevisLot[] = vis
    .map((l) => ({ corps: l.c, phase: l.p, ttc: lotTTC(ctx, sel, l) }))
    .filter((x) => x.ttc > 0);
  const lignes: DevisLigne[] = [];
  vis.forEach((l) => {
    l.t.forEach((t) => {
      const s = sel[key(l.c, t.n)];
      if (!s || !s.on) return;
      const ht = lineHT(ctx, sel, l, t);
      const r = effRate(l, t, sel);
      const mode: Mode = isLoc(l.c) ? "location" : s.self ? "je-fais" : "fait-faire";
      lignes.push({
        corps: l.c, phase: l.p, nom: t.n, unite: t.u,
        qty: qtyOf(ctx, sel, l.c, t), mode, ht, tva: (ht * r) / 100, ttc: ht * (1 + r / 100),
      });
    });
  });
  return { totaux: totals(catalog, ctx, sel), bilan: bilan(catalog, ctx, sel), lots, lignes };
}
