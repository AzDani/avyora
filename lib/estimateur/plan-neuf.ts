/**
 * CONSTRUCTION NEUVE — le lien « Plan final → estimation de la construction » (chantier C7).
 *
 * L'éditeur de plan (`maquettes/plan-editor.html`, décision D75) ouvre
 * `/estimation-construction-maison?source=editeur-plan#plan=<base64url>`. Le fragment porte un
 * EXTRAIT de `contratPlan()` (≈ 2,6 Ko pour 94 m²) : le navigateur ne l'envoie jamais au serveur,
 * ni dans le `Referer`, ni dans les journaux. Aucune base de données, aucune table de plans.
 *
 * Ce fichier fait trois choses, toutes pures (testées dans `tests/estimateur-plan-neuf.test.ts`
 * contre de vrais contrats Plan final produits par l'éditeur) :
 * 1. `decoderFragmentPlan` : borne PUIS décode (longueur, alphabet, base64url, UTF-8, JSON) ;
 * 2. `planNeufSchema` : valide l'extrait (types fermés, bornes, tableaux plafonnés, clés en trop
 *    retirées : le nom du plan ou une note n'entrent jamais) ;
 * 3. `maisonDepuisPlan` : traduit le plan en description de maison (`Partial<MaisonNeuve>`) : les
 *    compteurs de pièces de la rénovation (suites à part), les menuiseries, l'emprise mesurée, et la
 *    finition choisie dans le plan (chantier N8). Murs, toiture, chauffage… ne sont PAS dans le
 *    contrat : ils restent les défauts du moteur.
 *
 * Aucun texte ne vient du fragment : les avertissements et les refus sont des CLÉS, traduites à
 * l'affichage. Ce module importe zod : il n'est PAS réexporté par `lib/estimateur/index.ts`, pour
 * ne pas l'ajouter au bundle des pages de la rénovation. La rénovation n'est pas touchée :
 * `contributionsDuPlan` rend toujours `[]` pour un Plan final.
 */
import { z } from "zod";
import { compteursDepuisPlan, type PiecePlan, type TypePiecePlan } from "./plan-mapping";
import { BORNES_NEUF, GARAGE_MAX, type MaisonNeuve, type Niveaux } from "./neuf";
import type { Finition } from "./core";

/** Les 22 types de pièces de l'éditeur (ROOM_TYPES), identiques à `TypePiecePlan`. */
const TYPES_PIECE = [
  "sejour", "cuisine", "chambre", "suite", "sdb", "wc", "entree", "couloir", "buanderie", "sde", "dressing",
  "bureau", "cellier", "palier", "mezzanine", "garage", "cave", "combles", "grange", "atelier", "exterieur", "autre",
] as const satisfies readonly TypePiecePlan[];

/** Les 11 types d'ouvertures de l'éditeur (OPENINGS). */
const TYPES_OUVERTURE = [
  "porte", "porte_pleine", "porte_double", "coulissante", "passage", "porte_entree", "garage",
  "fenetre", "fenetre_p", "porte_fenetre", "baie",
] as const;

/** Longueur maximale du fragment (caractères base64url) : l'éditeur coupe à 20 000. */
export const FRAGMENT_PLAN_MAX = 24_000;
/** Bornes de la surface reprise : celles de toutes les réponses du neuf (`BORNES_NEUF`). */
export const SURFACE_PLAN_MIN = BORNES_NEUF.surface.min;
export const SURFACE_PLAN_MAX = BORNES_NEUF.surface.max;
/** Version minimale du contrat : `workflow` existe à partir de 1.18. */
const VERSION_MIN = 18;

const m2 = z.number().min(0).max(2000);
const id = z.string().max(24);

/** L'extrait de `contratPlan()` que le site sait lire. Les clés inconnues sont retirées (`strip`). */
export const planNeufSchema = z.object({
  contrat: z.string().max(16).regex(/^1\.(1[89]|[2-9]\d)\.\d{1,4}$/),
  workflow: z.literal("final_plan"),
  bien: z.object({
    niveaux: z.number().int().min(1).max(6),
    emprise: m2.nullable(),
    empriseRectangle: m2.nullable(),
    empriseApprochee: z.boolean().nullable().optional(),
  }),
  area: m2,
  contexte: z.object({
    codePostal: z.string().max(10).nullable(),
    typeBien: z.enum(["maison", "appartement"]).nullable(),
    finition: z.enum(["eco", "standard", "premium"]).nullable(),
  }).partial().optional(),
  detailNiveaux: z.array(z.object({
    id,
    hauteur: z.number().min(1.5).max(12).nullable().optional(),
    emprise: m2.nullable().optional(),
    rooms: z.array(z.object({
      id,
      type: z.enum(TYPES_PIECE),
      area: m2,
      horsHabitable: z.boolean().optional(),
      exterieur: z.boolean().optional(),
      sousPentePct: z.number().min(0).max(100).nullable().optional(),
    })).max(150),
    equipements: z.array(z.object({
      type: z.string().max(30),
      piece: id.nullable().optional(),
      materiau: z.string().max(20).nullable().optional(),
    })).max(300),
    menuiseries: z.array(z.object({
      type: z.enum(TYPES_OUVERTURE),
      l: z.number().min(0).max(20),
      h: z.number().min(0).max(10),
    })).max(200),
  })).min(1).max(6),
});

export type PlanNeuf = z.infer<typeof planNeufSchema>;

/* ── 1. Le fragment ─────────────────────────────────────────────────────────────────────────── */

/**
 * Décode le fragment `#plan=<base64url>` (sans le `#plan=`). Rend la valeur JSON, ou `null` si le
 * fragment est trop long, contient un caractère hors de l'alphabet base64url, n'est pas de l'UTF-8
 * valide ou n'est pas du JSON. Les bornes passent AVANT tout décodage.
 */
export function decoderFragmentPlan(fragment: string): unknown | null {
  try {
    if (typeof fragment !== "string" || !fragment || fragment.length > FRAGMENT_PLAN_MAX) return null;
    if (!/^[A-Za-z0-9_-]+={0,2}$/.test(fragment)) return null;
    const b64 = fragment.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const octets = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(octets));
  } catch {
    return null;
  }
}

/** L'inverse (base64url des octets UTF-8, sans `=`). Sert aux tests ; l'éditeur a le sien (D75). */
export function encoderFragmentPlan(valeur: unknown): string {
  const octets = new TextEncoder().encode(JSON.stringify(valeur));
  let bin = "";
  for (let i = 0; i < octets.length; i++) bin += String.fromCharCode(octets[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * L'extrait que l'éditeur met dans le lien (carte du plan § 3) : seulement ce que
 * `maisonDepuisPlan` lit. Ni `plan.nom`, ni note, ni annotation, ni produit. Référence pour
 * `extraitConstruction()` de l'éditeur (C9) et pour les tests.
 */
export function extraitPlanNeuf(c: Record<string, unknown>): Record<string, unknown> {
  const o = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const t = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const bien = o(c.bien), ctx = o(c.contexte);
  const EQUIP = new Set(["wc", "douche", "baignoire", "lavabo", "vasque2", "escalier"]);
  return {
    contrat: c.contrat, workflow: c.workflow,
    bien: { niveaux: bien.niveaux, emprise: bien.emprise, empriseRectangle: bien.empriseRectangle, empriseApprochee: bien.empriseApprochee },
    area: c.area,
    contexte: { codePostal: ctx.codePostal ?? null, typeBien: ctx.typeBien ?? null, finition: ctx.finition ?? null },
    detailNiveaux: t(c.detailNiveaux).map((n) => ({
      id: n.id, hauteur: n.hauteur, emprise: n.emprise,
      rooms: t(n.rooms).map((r) => ({ id: r.id, type: r.type, area: r.area, horsHabitable: r.horsHabitable, exterieur: r.exterieur, sousPentePct: r.sousPentePct })),
      equipements: t(n.equipements).filter((e) => EQUIP.has(String(e.type))).map((e) => ({ type: e.type, piece: e.piece ?? null, materiau: e.materiau ?? null })),
      menuiseries: t(n.menuiseries).filter((m) => m.etat !== "boucher").map((m) => ({ type: m.type, l: m.l, h: m.h })),
    })),
  };
}

/* ── 2. Du plan à la maison ─────────────────────────────────────────────────────────────────── */

/** Pourquoi un plan n'est pas chiffré (clé traduite à l'affichage, jamais un texte du plan). */
export type RefusPlan = "illisible" | "renovation" | "version" | "appartement";
/** Ce que le plan contient et que le chiffrage ne sait pas reprendre (clé traduite à l'affichage). */
export type CleAvertissement = "petiteSurface" | "grandeSurface" | "grandGarage" | "sanitaires" | "cave" | "nonChiffre" | "troisNiveaux";

export interface MaisonDuPlan {
  refus?: undefined;
  /** La description reprise. Les champs absents gardent les défauts du moteur, « à vérifier ». */
  maison: Partial<MaisonNeuve>;
  /** Les champs qui viennent du plan (badge « repris de ton plan »). */
  repris: (keyof MaisonNeuve)[];
  /** La finition choisie dans le plan (elle règle le chiffrage, pas la maison). Absente : celle du formulaire. */
  finition?: Finition;
  avertissements: CleAvertissement[];
  /** Version du contrat lu (gardée dans `reponses.origine`). */
  contrat: string;
}

const EAU = new Set(["douche", "baignoire"]);
/** Ouvertures comptées dans les menuiseries extérieures : fenêtres, portes-fenêtres et baies, comme le
 *  compteur « Menuiseries ext. » de la rénovation (`plan-ctx.ts`) ; ni la porte d'entrée ni celle du garage. */
const MENUISERIES = new Set(["fenetre", "fenetre_p", "porte_fenetre", "baie"]);
const NON_CHIFFRES = new Set(["grange", "atelier", "exterieur"]);
const habitable = (r: PlanNeuf["detailNiveaux"][number]["rooms"][number]) => !r.horsHabitable && !r.exterieur;

/**
 * Traduit un Plan final validé en description de maison (règles de la carte du plan § 2) :
 * surface = aire habitable arrondie, ramenée dans les bornes du neuf (30-400 m²) ; niveaux selon l'habitable au-dessus du rez-de-chaussée
 * (moins de 5 m² → plain-pied, sous pente → combles, sinon étage) ; forme selon emprise /
 * rectangle ; les huit compteurs de la rénovation, zéros compris (`compteursDepuisPlan`, règle de
 * l'appareil : une suite reste une suite, sa salle de bain est comptée par le moteur) ; garage = somme
 * des aires `garage` ; menuiseries = fenêtres, portes-fenêtres et baies dessinées ; emprise = celle du
 * rez-de-chaussée moins le garage (1,1 × son aire, comme la géométrie du neuf) ; escalier s'il est
 * choisi ; code postal s'il est valide ; finition du plan. Un appartement est refusé : le neuf chiffre
 * une maison. Le schéma garantit déjà un Plan final (`workflow: "final_plan"`, contrat 1.18 ou plus).
 */
export function maisonDepuisPlan(c: PlanNeuf): MaisonDuPlan | { refus: RefusPlan } {
  if (c.contexte?.typeBien === "appartement") return { refus: "appartement" };
  const N = c.detailNiveaux;

  const pieces: PiecePlan[] = [];
  let garage = 0, menuiseries = 0;
  for (const n of N) {
    for (const r of n.rooms) {
      const eq = n.equipements.filter((e) => e.piece === r.id);
      pieces.push({ type: r.type, doucheOuBaignoire: eq.some((e) => EAU.has(e.type)), cuvettes: eq.filter((e) => e.type === "wc").length });
      if (r.type === "garage") garage += r.area;
    }
    menuiseries += n.menuiseries.filter((m) => MENUISERIES.has(m.type)).length;
  }
  const k = compteursDepuisPlan(pieces);

  const habitableDe = (n: PlanNeuf["detailNiveaux"][number]) => n.rooms.filter(habitable).reduce((s, r) => s + r.area, 0);
  const hautHabitable = N.slice(1).reduce((s, n) => s + habitableDe(n), 0);
  const sousPente = N.slice(1).some((n) => n.rooms.some((r) => habitable(r) && (r.sousPentePct ?? 0) > 0));
  const niveaux: Niveaux = hautHabitable < 5 ? "pp" : sousPente ? "combles" : "etage";

  const { emprise, empriseRectangle } = c.bien;
  const ratio = emprise && empriseRectangle ? emprise / empriseRectangle : 1;
  const forme: MaisonNeuve["forme"] = ratio >= 0.95 ? "rect" : ratio >= 0.7 ? "L" : "complexe";

  /* Les compteurs sont TOUS écrits, zéros compris (règle 3 de D4, `plan-mapping.ts`) : sinon les
     défauts du moteur (un séjour, une cuisine, un couloir) chiffreraient des pièces que le plan n'a pas. */
  const maison: Partial<MaisonNeuve> = {
    surface: Math.min(SURFACE_PLAN_MAX, Math.max(SURFACE_PLAN_MIN, Math.round(c.area))), niveaux, forme, garage: Math.min(GARAGE_MAX, Math.round(garage)),
    sejour: k.sejour, cuisines: k.cuisine, chambres: k.chambres, suites: k.suites, sdb: k.sdb, wc: k.wc, couloir: k.couloir, buanderie: k.buanderie,
  };
  const repris: (keyof MaisonNeuve)[] = ["surface", "niveaux", "forme", "garage", "sejour", "cuisines", "chambres", "suites", "sdb", "wc", "couloir", "buanderie"];
  // Un plan sans aucune fenêtre dessinée ne dit rien des menuiseries : elles se déduisent de la surface.
  if (menuiseries > 0) { maison.menuiseries = menuiseries; repris.push("menuiseries"); }
  // L'emprise mesurée du rez-de-chaussée, garage retiré (la géométrie du neuf le compte à part).
  const rdc = N[0];
  const garageRdc = rdc.rooms.filter((r) => r.type === "garage").reduce((s, r) => s + r.area, 0);
  const empriseRdc = rdc.emprise ?? c.bien.emprise;
  const empriseMaison = empriseRdc != null ? Math.round((empriseRdc - 1.1 * garageRdc) * 10) / 10 : 0;
  if (empriseMaison > 0) { maison.emprise = empriseMaison; repris.push("emprise"); }

  if (niveaux !== "pp") {
    const materiaux = N.flatMap((n) => n.equipements.filter((e) => e.type === "escalier").map((e) => e.materiau));
    const escalier = materiaux.includes("beton") ? "beton" : materiaux.some((m) => m === "bois" || m === "metal") ? "bois" : undefined;
    if (escalier) { maison.escalier = escalier; repris.push("escalier"); }
  }
  const cp = c.contexte?.codePostal;
  if (typeof cp === "string" && /^\d{5}$/.test(cp)) { maison.codePostal = cp; repris.push("codePostal"); }

  const avertissements: CleAvertissement[] = [];
  const toutes = N.flatMap((n) => n.rooms);
  if (c.area < SURFACE_PLAN_MIN) avertissements.push("petiteSurface");
  if (Math.round(c.area) > SURFACE_PLAN_MAX) avertissements.push("grandeSurface");
  if (Math.round(garage) > GARAGE_MAX) avertissements.push("grandGarage");
  // Le moteur chiffre toujours au moins une salle de bain (suites comprises) et un WC (`maisonComplete`).
  if (k.sdb + k.suites === 0 || k.wc === 0) avertissements.push("sanitaires");
  if (toutes.some((r) => r.type === "cave")) avertissements.push("cave");
  if (toutes.some((r) => NON_CHIFFRES.has(r.type) || r.exterieur)) avertissements.push("nonChiffre");
  if (N.filter((n) => habitableDe(n) >= 5).length >= 3) avertissements.push("troisNiveaux");

  const finition = c.contexte?.finition ?? undefined;
  return { maison, repris, ...(finition ? { finition } : {}), avertissements, contrat: c.contrat };
}

/**
 * Tout le chemin, du fragment à la maison : décodage borné, refus explicites (rénovation, contrat
 * trop ancien), schéma strict, traduction. C'est ce qu'appelle la page publique.
 */
export function lirePlanNeuf(fragment: string): MaisonDuPlan | { refus: RefusPlan } {
  const brut = decoderFragmentPlan(fragment);
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return { refus: "illisible" };
  const b = brut as { workflow?: unknown; contrat?: unknown };
  if (typeof b.workflow === "string" && b.workflow !== "final_plan") return { refus: "renovation" };
  const v = typeof b.contrat === "string" && b.contrat.length <= 16 ? /^(\d{1,4})\.(\d{1,4})\.\d{1,4}$/.exec(b.contrat) : null;
  if (v && (Number(v[1]) < 1 || (Number(v[1]) === 1 && Number(v[2]) < VERSION_MIN) || b.workflow === undefined)) return { refus: "version" };
  const ok = planNeufSchema.safeParse(brut);
  if (!ok.success) return { refus: "illisible" };
  return maisonDepuisPlan(ok.data);
}

/** Tranche de surface pour la mesure (jamais la surface exacte, jamais le plan). */
export function trancheSurface(s: number): string {
  return s < 80 ? "<80" : s < 120 ? "80-119" : s < 160 ? "120-159" : s < 200 ? "160-199" : "200+";
}
