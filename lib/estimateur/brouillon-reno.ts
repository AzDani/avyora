/**
 * RÉNOVATION — brouillon anonyme et réclamation après inscription (chantier N4).
 *
 * Un enregistrement refusé (401 : visiteur anonyme ou session expirée) range le travail dans
 * `avyora-estim-v2`, pose le drapeau `avyora-estim-claim = "1"`, puis mène à /inscription ;
 * `ClaimDraft` (monté sur /projets) crée ensuite le projet. Le brouillon D'ABORD, le drapeau
 * ensuite : un drapeau sans brouillon ne réclame rien (ou pire, réclame un ancien brouillon).
 *
 * Avant N4, le détaillé posait le drapeau sans rien ranger : `ClaimDraft` créait alors un projet à
 * partir de l'ancien brouillon du RAPIDE, sans les postes choisis ni les lignes perso. Il range
 * désormais son brouillon complet (mode « detaille », sélection, lignes perso, nom), sur le modèle
 * du neuf (`EstimateurNeuf.tsx`, `enregistrementDetailNeuf`).
 *
 * Aucun code du moteur à l'exécution (types seulement), ni du neuf : `ClaimDraft` et l'estimation
 * rapide le lisent sans embarquer le catalogue ni les textes du neuf dans leur bundle.
 */
import type { Ctx, Selection, CustomLine } from "./core";
import type { Ampleur, QuiRealise } from "./presets";
import type { PieceSel } from "./pieces";
import { lirePiecesRapide } from "./rapide-reno";

/** Brouillon de la rénovation : celui du rapide, graine d'« Affiner », et brouillon réclamé après un 401. */
export const CLE_BROUILLON_RENO = "avyora-estim-v2";
/** Travail en cours du détaillé (rechargement de la page). Ne sert pas à la réclamation. */
export const CLE_BROUILLON_DETAIL_RENO = "avyora-estim-detail-v1";
/** Drapeau de réclamation de la rénovation (valeur « 1 »). */
export const CLE_RECLAMATION_RENO = "avyora-estim-claim";

export type BrouillonReno = {
  v: "estimateur";
  mode: "rapide" | "detaille";
  /** Nom du projet tel que l'écran l'aurait enregistré (sinon : « Rénovation — <type> <surface> m² »). */
  nom?: string;
  ampleur?: Ampleur;
  qui?: QuiRealise;
  ctx: Partial<Ctx>;
  sel: Selection;
  codePostal: string;
  /** Lignes perso du détaillé. */
  custom?: CustomLine[];
  /** Liste des pièces du rapide (mode « pièces »). */
  pieces?: PieceSel[];
  open?: Record<string, boolean>;
};

/** Lignes perso relues : seulement des objets avec un lot (même règle que `lignesPersoValides` du neuf). */
function lignesPerso(x: unknown): CustomLine[] {
  return Array.isArray(x) ? x.filter((c): c is CustomLine => !!c && typeof c === "object" && typeof (c as CustomLine).lot === "string") : [];
}

/** Le brouillon du rapide (aussi graine de l'« Affiner » : le détaillé n'en relit que `ctx` et `codePostal`). */
export function brouillonRapideReno(p: {
  nom?: string; ampleur: Ampleur; qui: QuiRealise; ctx: Ctx; sel: Selection; codePostal: string; pieces?: PieceSel[];
}): BrouillonReno {
  return {
    v: "estimateur", mode: "rapide", ...(p.nom ? { nom: p.nom } : {}), ampleur: p.ampleur, qui: p.qui, ctx: p.ctx, sel: p.sel, open: {}, codePostal: p.codePostal,
    ...(p.pieces?.length ? { pieces: p.pieces } : {}),
  };
}

/** Le brouillon COMPLET du détaillé, rangé sur un 401 avant de poser le drapeau. */
export function brouillonDetailleReno(p: { nom?: string; ctx: Ctx; sel: Selection; codePostal: string; custom?: CustomLine[] }): BrouillonReno {
  return {
    v: "estimateur", mode: "detaille", ...(p.nom ? { nom: p.nom } : {}), ctx: p.ctx, sel: p.sel, codePostal: p.codePostal,
    ...(p.custom?.length ? { custom: p.custom } : {}),
  };
}

/**
 * Relit un brouillon rénovation (texte du `localStorage`). `null` s'il n'est pas réclamable :
 * JSON illisible, pas un brouillon de l'estimateur, surface nulle, code postal absent.
 */
export function lireBrouillonReno(raw: string | null | undefined): BrouillonReno | null {
  if (!raw) return null;
  let d: Partial<BrouillonReno> | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || typeof d !== "object" || d.v !== "estimateur" || !d.ctx || typeof d.ctx !== "object") return null;
  const codePostal = String(d.codePostal || "");
  if (!(Number(d.ctx.surface) > 0) || !/^\d{5}$/.test(codePostal)) return null;
  const custom = lignesPerso(d.custom);
  const pieces = lirePiecesRapide(d.pieces);
  return {
    v: "estimateur", mode: d.mode === "detaille" ? "detaille" : "rapide",
    ...(typeof d.nom === "string" && d.nom.trim() ? { nom: d.nom.trim() } : {}),
    ampleur: d.ampleur, qui: d.qui, ctx: d.ctx, sel: d.sel && typeof d.sel === "object" ? d.sel : {}, codePostal,
    ...(custom.length ? { custom } : {}),
    ...(pieces ? { pieces } : {}),
  };
}

/** Corps du POST `/api/projects` qui crée le projet réclamé (lignes perso et pièces comprises). */
export function corpsReclamationReno(d: BrouillonReno) {
  const surface = Number(d.ctx.surface) || 0;
  const nom = (d.nom ?? `Rénovation — ${d.ctx.type ?? "bien"} ${surface} m²`).slice(0, 110);
  return {
    nom, typeBien: d.ctx.type, surface, codePostal: d.codePostal,
    reponses: {
      v: "estimateur", mode: d.mode, ampleur: d.ampleur, qui: d.qui, ctx: d.ctx, sel: d.sel, codePostal: d.codePostal,
      ...(d.custom?.length ? { custom: d.custom } : {}),
      ...(d.pieces?.length ? { pieces: d.pieces } : {}),
    },
  };
}
