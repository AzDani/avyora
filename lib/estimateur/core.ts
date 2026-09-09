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

/** Variante générique : un groupe d'options (ex. « Type » → Classique/Suspendu). Le 1ᵉʳ opt = défaut (coef relatif à la base). */
export interface VarOpt { k: string; label: string; coef: number; tva?: number }
export interface VarGroup { k: string; label: string; opts: VarOpt[] }

export interface Tache {
  n: string;            // nom
  u: string;            // unité : m2 | ml | u | point | forfait | jour | pct
  fp: number | null;    // fourni-posé HT
  sm: number | null;    // sans MO (fourniture) HT ; null = prestation
  tva?: number;         // TVA spécifique à la tâche (sinon celle du lot)
  note?: string;
  fixe?: boolean;       // prix d'équipement FIXE : non impacté par le niveau de finition
  mat?: boolean;        // menuiserie : choix matériau PVC/Alu (base catalogue = Alu)
  matPvc?: number;      // coef PVC spécifique (défaut MAT_COEF.pvc = 0,60 ; ex. volets = 0,80)
  matDef?: "pvc" | "alu"; // matériau par défaut du poste (sinon selon finition) ; ex. portail = alu
  vitrage?: boolean;    // menuiserie vitrée : option Double/Triple vitrage
  moto?: boolean;       // portail : option Manuel / Motorisé
  taille?: boolean;     // équipement : option Petit / Grand (ex. ballon d'eau chaude)
  taillePetit?: number; // coef Petit spécifique (défaut TAILLE_COEF.petit)
  vars?: VarGroup[];    // variantes génériques (chaque groupe = un sélecteur ; base fp = options par défaut)
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
  fiscal?: "habitation" | "pro"; // régime TVA : habitation +2 ans (10/5,5 %) ou neuf/−2 ans/local pro (20 %)
  codePostal?: string;        // sert au coefficient régional (main-d'œuvre)
  // Détail des pièces (estimateur détaillé). Si renseigné, pilote le nb de pièces effectif + les SDB.
  sejour?: number; cuisine?: number; chambres?: number; suites?: number; couloir?: number; buanderie?: number;
}

export interface LigneSel {
  on?: boolean;
  self?: boolean;             // « Je le fais »
  qty?: number | null;        // quantité saisie (si manuel / non-auto)
  manual?: boolean;           // override manuel d'une quantité auto
  mat?: "pvc" | "alu";        // menuiserie : matériau choisi
  vit?: "double" | "triple";  // menuiserie : vitrage choisi
  mot?: "manuel" | "motorise"; // portail : motorisation choisie
  tai?: "petit" | "grand";     // équipement : taille choisie
  vsel?: Record<string, string>; // variantes génériques : {groupe → option choisie}
}
export type Selection = Record<string, LigneSel>;

/** Menuiseries : matériau (base catalogue = Alu) et vitrage (base = double vitrage inclus). */
export const MAT_COEF: Record<string, number> = { alu: 1, pvc: 0.60 };
export const VIT_COEF: Record<string, number> = { double: 1, triple: 1.20 };
export const DEFAULT_VIT: "double" | "triple" = "double";
export const MOT_COEF: Record<string, number> = { manuel: 1, motorise: 1.60 };
export const DEFAULT_MOT: "manuel" | "motorise" = "motorise";
export const TAILLE_COEF: Record<string, number> = { grand: 1, petit: 0.65 };
export const DEFAULT_TAILLE: "petit" | "grand" = "grand";
/** Matériau par défaut (aucun choix explicite) : alu en premium, sinon PVC. */
const defMat = (ctx?: Ctx): "pvc" | "alu" => (ctx && ctx.finition === "premium" ? "alu" : "pvc");
/** Prix effectifs (fp/sm) selon matériau/vitrage choisis. Sans variante → fp/sm bruts. */
export function effPrices(t: Tache, s?: LigneSel, ctx?: Ctx): { fp: number | null; sm: number | null } {
  if (!t.mat && !t.vitrage && !t.moto && !t.taille && !t.vars) return { fp: t.fp, sm: t.sm };
  let f = 1;
  if (t.vars) for (const g of t.vars) {
    const chosen = (s && s.vsel && s.vsel[g.k]) || g.opts[0].k;
    f *= (g.opts.find((o) => o.k === chosen) || g.opts[0]).coef;
  }
  if (t.mat) {
    const m = (s && s.mat) || t.matDef || defMat(ctx);
    f *= m === "pvc" ? (t.matPvc ?? MAT_COEF.pvc) : MAT_COEF.alu;
  }
  if (t.vitrage) f *= VIT_COEF[(s && s.vit) || DEFAULT_VIT] ?? 1;
  if (t.moto) f *= MOT_COEF[(s && s.mot) || DEFAULT_MOT] ?? 1;
  if (t.taille) {
    const z = (s && s.tai) || DEFAULT_TAILLE;
    f *= z === "petit" ? (t.taillePetit ?? TAILLE_COEF.petit) : 1;
  }
  return { fp: t.fp != null ? Math.round(t.fp * f) : null, sm: t.sm != null ? Math.round(t.sm * f) : null };
}
/** Suffixe d'étiquette variante (matériau / vitrage) pour l'affichage. */
export function variantLabel(t: Tache, s?: LigneSel, ctx?: Ctx): string {
  const p: string[] = [];
  if (t.mat) p.push(((s && s.mat) || t.matDef || defMat(ctx)) === "alu" ? "alu" : "PVC");
  if (t.vitrage) p.push(((s && s.vit) || DEFAULT_VIT) === "triple" ? "triple vitrage" : "double vitrage");
  if (t.moto) p.push(((s && s.mot) || DEFAULT_MOT) === "motorise" ? "motorisé" : "manuel");
  if (t.taille) p.push(((s && s.tai) || DEFAULT_TAILLE) === "petit" ? "petit" : "grand");
  if (t.vars) for (const g of t.vars) {
    const chosen = (s && s.vsel && s.vsel[g.k]) || g.opts[0].k;
    p.push((g.opts.find((o) => o.k === chosen) || g.opts[0]).label.toLowerCase());
  }
  return p.length ? " (" + p.join(", ") + ")" : "";
}

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
  "Maçonnerie": G1, "Charpente, couverture & structure bois": G1, "Isolation": G1, "Electricite": G1, "Chauffage / VMC": G1,
  "Façade": G2, "Cloisons / Platrerie": G2, "Plomberie": G2, "Menuiseries exterieures": G2, "Menuiseries interieures": G2,
  "Carrelage / Revetements": G3, "Peinture": G3, "Cuisine": G3,
};

/** Tâches « couverture / toiture » (fusionnées dans le lot charpente) : barème finition G2 conservé + masquées en appartement. */
const TOITURE_TASKS = [
  "Toiture complète tuile (charpente + couverture)",
  "Toiture complète ardoise (charpente + couverture)",
  "Réfection couverture tuiles (dépose + écran + liteaux)",
  "Réfection couverture ardoise (dépose + écran + liteaux)",
  "Couverture tuiles (sur support existant)",
  "Couverture ardoise (sur support existant)",
  "Couverture zinc / bac acier",
  "Sous-toiture (écran + liteaux)",
  "Gouttières & descentes",
  "Raccords (faîtage, noues, solins)",
  "Fenêtre de toit (Velux)",
  "Nettoyer / démousser la toiture",
  "Toit plat (étanchéité)",
];
const TASK_FIN: Record<string, Record<Finition, number>> = {
  ...Object.fromEntries(TOITURE_TASKS.map((n) => [n, G2])),
  "Dépose complète de toiture (couverture + charpente)": G0, // démolition : pas de scaling finition
};
/** Coefficient de finition pour un lot donné (selon le niveau choisi dans ctx). */
export function finCoef(ctx: Ctx, corps: string): number {
  return (LOT_FIN[corps] ?? FINCO)[ctx.finition];
}
/** Coef finition par tâche : 1 (fixe) pour les équipements à prix fixe, sinon le coef du lot. */
export function finCoefTask(ctx: Ctx, l: Lot, t: Tache): number {
  if (t.fixe || t.mat || t.vitrage || t.moto || t.taille || t.vars) return 1; // fixe ou piloté par variante
  const g = TASK_FIN[t.n];
  return g ? g[ctx.finition] : finCoef(ctx, l.c);
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
const HIDE_APPART: string[] = []; // (le lot Toiture est fusionné dans Charpente ; masquage désormais au niveau tâche)

export const ICON: Record<string, string> = {
  "Etudes / Conception": "📐", "Annexes de chantier": "🚧", "Location de matériel": "🛠️",
  "Raccordements aux réseaux": "🔌", "Démolition": "🧱", "Maçonnerie": "🧱",
  "Charpente, couverture & structure bois": "🪵", "Façade": "🎨",
  "Menuiseries exterieures": "🪟", "Isolation": "🧊", "Cloisons / Platrerie": "🧱",
  "Electricite": "⚡", "Plomberie": "🚿", "Chauffage / VMC": "🔥",
  "Carrelage / Revetements": "🎨", "Peinture": "🖌️", "Menuiseries interieures": "🚪", "Cuisine": "🍳",
};

export function defaultCtx(): Ctx {
  return {
    surface: 80, surfaceSol: 80, surfaceSolManual: false, niveaux: 1, type: "Maison",
    hauteur: 2.5, pieces: 6, fenetres: 7, sdb: 1, wc: 1, budget: 60000, aleas: 7, finition: "standard", fiscal: "habitation",
    sejour: 1, cuisine: 1, chambres: 3, suites: 0, couloir: 1, buanderie: 0,
  };
}

export const key = (c: string, n: string): string => c + "|" + n;
export const isLoc = (c: string): boolean => c === LOC;
export const isAppart = (ctx: Ctx): boolean => ctx.type !== "Maison";
export const visible = (ctx: Ctx, l: Lot): boolean => !(isAppart(ctx) && HIDE_APPART.indexOf(l.c) >= 0);

/** Tâches masquées en appartement : charpente/toiture de l'immeuble (on garde plancher, escalier, garde-corps, ossature). */
const HIDE_APPART_TASK = new Set<string>([
  "Charpente traditionnelle (hors couverture)",
  "Charpente en fermettes (hors couverture)",
  "Traiter la charpente",
  "Dépose complète de toiture (couverture + charpente)",
  ...TOITURE_TASKS,
]);
export const visibleTask = (ctx: Ctx, t: Tache): boolean => !(isAppart(ctx) && HIDE_APPART_TASK.has(t.n));

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
  const P = piecesEff(ctx), SDB = sdbEff(ctx);
  const placo = S * (ctx.hauteur + 1); // murs (≈ S×h) + plafond (S) — surface de placo/enduit
  const rj45 = (ctx.chambres ?? 0) + (ctx.suites ?? 0) + ((ctx.sejour ?? 0) > 0 ? 1 : 0); // 1 / chambre + suite + salon
  // Robinetterie lavabo = nb de vasques (meuble simple = 1, double = 2) × quantité du meuble-vasque
  const mv = sel[key("Plomberie", "Meuble-vasque")];
  const vasques = mv && mv.on
    ? (mv.manual ? (mv.qty ?? 0) : SDB) * (mv.vsel && mv.vsel["config"] === "double" ? 2 : 1)
    : SDB;
  if (c === "Cloisons / Platrerie" && n === FINI) return derivedFinitions(ctx, sel);
  const A: Record<string, number> = {
    "Peinture des murs": S * ctx.hauteur, "Peinture des plafonds": S, "Préparation des surfaces": S * ctx.hauteur,
    "Rénovation électrique complète": S, "Refaire toute la plomberie (réseau, hors appareils)": S,
    "Enlever les vieux réseaux": S, "Enlever un revêtement de sol": S, "Nettoyage de fin de chantier": S,
    "Isolation des combles perdus (soufflage)": SS, "Isolation des combles aménagés (rampants)": SS,
    "Isolation du sol / plancher bas": SS, "Isolation des murs par l'intérieur": facade,
    "Faux plafond": S, "Préparation du sol (ragréage)": S,
    "Chape traditionnelle": S, "Chape liquide": S, "Plancher chauffant": S,
    "Pose d'un pare-vapeur": placo, "Ratissage léger": placo, "Ratissage lourd": placo,
    "Sous-couche / primaire": S * ctx.hauteur,
    "Faïence / carrelage mural": SDB * 12, "Cloison pièce humide (hydrofuge)": SDB * 12,
    "Porte intérieure battante": P, "Radiateurs électriques": P,
    "Prise internet / TV (RJ45)": rj45,
    "Spots encastrés (LED)": Math.round(S / 2),
    "WC": ctx.wc,
    "Bac de douche": SDB, "Colonne de douche": SDB, "Douche à l'italienne": SDB,
    "Paroi de douche": SDB, "Cabine complète (parois + porte)": SDB,
    "Robinetterie baignoire": SDB, "Robinetterie lavabo": vasques,
    "Meuble-vasque": SDB, "Miroir": SDB,
    "Ventilation (VMC)": 1, "Sèche-serviette": SDB,
    "Monter une cloison": S * 0.35, "Doubler un mur": facade,
    "Créer un plancher bois": Math.max(0, S - SS), "Plancher béton (étage créé)": Math.max(0, S - SS),
    "Carrelage au sol": S * 0.6, "Sol stratifié (imitation bois)": S * 0.4, "Parquet bois": S * 0.4,
    "Ponçage + vitrification parquet": S * 0.4,
    "Sol souple (PVC, lino)": S * 0.4, "Moquette": S * 0.4, "Béton ciré / résine": S * 0.6,
    "Plinthes": 4 * Math.sqrt(S * P), "Seuils / barres de seuil": P, "Peinture des boiseries": P,
    "Traiter la charpente": roof, "Charpente traditionnelle (hors couverture)": roof, "Charpente en fermettes (hors couverture)": roof,
    "Toiture complète tuile (charpente + couverture)": roof, "Toiture complète ardoise (charpente + couverture)": roof,
    "Dépose complète de toiture (couverture + charpente)": roof,
    "Réfection couverture tuiles (dépose + écran + liteaux)": roof, "Réfection couverture ardoise (dépose + écran + liteaux)": roof,
    "Couverture tuiles (sur support existant)": roof, "Couverture ardoise (sur support existant)": roof, "Couverture zinc / bac acier": roof,
    "Sous-toiture (écran + liteaux)": roof, "Nettoyer / démousser la toiture": roof, "Toit plat (étanchéité)": SS,
    "Gouttières & descentes": 4 * Math.sqrt(SS) + 4 * ctx.hauteur * (ctx.niveaux || 1),
    "Nettoyer la façade": facade, "Refaire les joints / rejointoiement (pierre, briquette, moellon)": facade,
    "Enduit monocouche (machine)": facade, "Enduit à la chaux (maison ancienne)": facade, "Peindre la façade": facade,
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

/** TVA effective : neuf/local pro = 20 %, « Je le fais » = 20 % (matériaux achetés par le particulier), sinon taux réduit du poste. */
export function effRate(l: Lot, t: Tache, sel: Selection, ctx?: Ctx): number {
  const s = sel[key(l.c, t.n)];
  if (s && s.self && !isLoc(l.c)) return 20;
  if (ctx && ctx.fiscal === "pro") return 20; // neuf / logement −2 ans / local professionnel
  if (t.vars) for (const g of t.vars) {          // TVA portée par une option de variante (ex. plancher élec 10 % / à eau 5,5 %)
    const opt = g.opts.find((o) => o.k === ((s && s.vsel && s.vsel[g.k]) || g.opts[0].k));
    if (opt && opt.tva != null) return opt.tva;
  }
  return rate(l, t);
}

export function lineHT(ctx: Ctx, sel: Selection, l: Lot, t: Tache): number {
  const s = sel[key(l.c, t.n)];
  if (!s || !s.on) return 0;
  if (!visibleTask(ctx, t)) return 0;
  const R = regCoef(ctx);
  const q = qtyOf(ctx, sel, l.c, t);
  const fc = finCoefTask(ctx, l, t); // finition = qualité des MATÉRIAUX uniquement (la MO ne varie pas)
  const { fp, sm } = effPrices(t, s, ctx);
  // Location : équipement, pas de coef régional MO ni de finition.
  if (isLoc(l.c)) return fp != null ? fp * q : 0;
  // « Je le fais » : matériaux achetés par le particulier → coef matériaux (×mat) × finition.
  if (s.self) {
    const pu = sm != null ? sm : fp;
    return pu != null ? pu * fc * R.mat * q : 0;
  }
  // Fait-faire : matériaux (×mat × finition) + main-d'œuvre (×mo régional, FIXE). sm null = prestation pure → MO.
  if (fp == null) return 0;
  if (sm != null) return (sm * fc * R.mat + (fp - sm) * R.mo) * q;
  return fp * R.mo * q;
}
export function lotHT(ctx: Ctx, sel: Selection, l: Lot): number {
  return l.t.reduce((s, t) => s + lineHT(ctx, sel, l, t), 0);
}
export function lotTTC(ctx: Ctx, sel: Selection, l: Lot): number {
  return l.t.reduce((s, t) => s + lineHT(ctx, sel, l, t) * (1 + effRate(l, t, sel, ctx) / 100), 0);
}

export function totals(catalog: Lot[], ctx: Ctx, sel: Selection): Totaux {
  let ht = 0, tva = 0, aleasBase = 0;
  catalog.filter((l) => visible(ctx, l)).forEach((l) => {
    l.t.forEach((t) => {
      const h = lineHT(ctx, sel, l, t);
      if (!h) return;
      ht += h;
      tva += (h * effRate(l, t, sel, ctx)) / 100;
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
    l.t.forEach((t) => {
      const s = sel[key(l.c, t.n)];
      if (!s || !s.on) return;
      if (!visibleTask(ctx, t)) return;
      const { fp: fpU, sm: smU } = effPrices(t, s, ctx);
      if (fpU == null) return;
      const q = qtyOf(ctx, sel, l.c, t);
      const fc = finCoefTask(ctx, l, t); // finition = matériaux uniquement (MO fixe)
      if (isLoc(l.c)) { achat += fpU * q; return; }
      if (s.self) {                                    // matériaux (part particulier) au coef matériaux × finition
        achat += (smU != null ? smU * fc : fpU) * R.mat * q;
        if (smU != null) eco += (fpU - smU) * R.mo * q; // MO évitée, au coût régional (fixe)
      } else if (smU != null) {                        // fait-faire : matériaux (×finition) + MO régionale (fixe)
        matA += smU * fc * R.mat * q;
        moA += (fpU - smU) * R.mo * q;
        paye += (smU * fc * R.mat + (fpU - smU) * R.mo) * q;
      } else {                                         // prestation pure → MO (fixe)
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
      if (!visibleTask(ctx, t)) return;
      const ht = lineHT(ctx, sel, l, t);
      const r = effRate(l, t, sel, ctx);
      const mode: Mode = isLoc(l.c) ? "location" : s.self ? "je-fais" : "fait-faire";
      lignes.push({
        corps: l.c, phase: l.p, nom: t.n + variantLabel(t, s, ctx), unite: t.u,
        qty: qtyOf(ctx, sel, l.c, t), mode, ht, tva: (ht * r) / 100, ttc: ht * (1 + r / 100),
      });
    });
  });
  return { totaux: totals(catalog, ctx, sel), bilan: bilan(catalog, ctx, sel), lots, lignes };
}
