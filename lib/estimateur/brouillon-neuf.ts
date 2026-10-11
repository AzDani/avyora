/**
 * CONSTRUCTION NEUVE — brouillon anonyme, réclamation après inscription, corps de la requête.
 *
 * Ce module n'importe AUCUN code du moteur à l'exécution (seulement des types, et le dictionnaire
 * pour le nom du projet) : `ClaimDraft` (monté sur /projets) et `EstimationRappel` le lisent sans
 * embarquer le catalogue du neuf dans leur bundle.
 *
 * Clés SÉPARÉES de la rénovation (`avyora-estim-v2`, drapeau `"1"`) : un ctx neuf rangé sous la
 * clé réno serait relu par « Affiner » réno, `ClaimDraft` et `EstimationRappel`, puis chiffré sur
 * le catalogue de la rénovation, sans erreur visible. Le drapeau de réclamation est typé :
 * `avyora-estim-claim = "neuf"` ; la valeur `"1"` reste celle de la rénovation.
 */
import type { Ctx, Selection, Finition, CustomLine } from "./core";
import type { MaisonNeuve, Niveaux } from "./neuf";
import type { QuiRealise } from "./presets";
import { dictNeufCommun } from "../i18n/neuf-commun";
import type { Locale } from "../i18n/config";

/** Brouillon du rapide neuf (et graine de l'« Affiner » du neuf). */
export const CLE_BROUILLON_NEUF = "avyora-neuf-v1";
/** `sessionStorage` : « Affiner » vient d'être cliqué dans le rapide neuf. */
export const CLE_AFFINER_NEUF = "avyora-affiner-neuf";
/** Drapeau de réclamation, partagé avec la rénovation ; sa VALEUR dit de quel brouillon il s'agit. */
export const CLE_RECLAMATION = "avyora-estim-claim";
export const RECLAMATION_NEUF = "neuf";
/** `typeBien` d'un projet neuf (sans lui, le serveur met « appartement » par défaut). */
export const TYPE_BIEN_NEUF = "Maison neuve";

/** Les réponses du rapide neuf (forme de `RapideNeufInput`, sans dépendre du moteur). */
export type ReponsesRapideNeuf = {
  surface: number; niveaux: Niveaux; codePostal: string; finition: Finition; qui: QuiRealise;
  garage?: boolean; assainissement?: "collectif" | "fosse";
};

/** Origine d'une maison venue d'ailleurs que la saisie (le plan, chantier C7). */
export type OrigineNeuf = { source: "plan"; contrat?: string };

export type BrouillonNeuf = {
  v: "estimateur";
  mode: "rapide" | "detaille";
  qui: QuiRealise;
  ctx: Ctx;
  sel: Selection;
  codePostal: string;
  /** Les 5 réponses du rapide, pour rouvrir le formulaire tel quel. */
  R?: ReponsesRapideNeuf;
  /** Une maison déjà décrite (plan, détaillé rouvert) : défauts du rapide. */
  base?: Partial<MaisonNeuve>;
  custom?: CustomLine[];
  origine?: OrigineNeuf;
};

/** Nom par défaut d'un projet neuf : « Construction neuve — Maison plain-pied 100 m² ». */
export function nomProjetNeuf(maison: Pick<MaisonNeuve, "niveaux" | "surface">, locale: Locale = "fr"): string {
  const t = dictNeufCommun(locale);
  const maisonTxt = t.maisonNiveaux[maison.niveaux] ?? t.maisonNiveaux.pp;
  return `${t.projetNom} — ${maisonTxt} ${Math.round(maison.surface)} m²`;
}

/** Le brouillon du rapide neuf, à partir du chiffrage courant (`presetNeuf(R, base)`). */
export function brouillonRapideNeuf(p: {
  R: ReponsesRapideNeuf; ctx: Ctx; sel: Selection; base?: Partial<MaisonNeuve>; origine?: OrigineNeuf;
}): BrouillonNeuf {
  return {
    v: "estimateur", mode: "rapide", qui: p.R.qui, ctx: p.ctx, sel: p.sel, codePostal: p.R.codePostal, R: p.R,
    ...(p.base ? { base: p.base } : {}),
    ...(p.origine ? { origine: p.origine } : {}),
  };
}

const CP = /^\d{5}$/;

/**
 * Relit un brouillon neuf (texte du `localStorage`). `null` si ce n'est pas un brouillon neuf
 * réclamable : JSON illisible, pas `ctx.nature === "neuf"`, code postal absent, surface nulle.
 */
export function lireBrouillonNeuf(raw: string | null | undefined): BrouillonNeuf | null {
  if (!raw) return null;
  let d: Partial<BrouillonNeuf> | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || typeof d !== "object" || d.v !== "estimateur" || !d.ctx || d.ctx.nature !== "neuf" || !d.ctx.neuf) return null;
  const codePostal = String(d.codePostal || d.ctx.codePostal || "");
  if (!CP.test(codePostal)) return null;
  if (!(Number(d.ctx.surface) > 0)) return null;
  return { ...(d as BrouillonNeuf), codePostal, mode: d.mode === "detaille" ? "detaille" : "rapide", qui: d.qui ?? "pros", sel: d.sel ?? {} };
}

/** Corps du POST / PATCH `/api/projects` d'un projet neuf (création, réclamation, édition). */
export function corpsProjetNeuf(d: BrouillonNeuf, locale: Locale = "fr") {
  const maison = d.ctx.neuf as MaisonNeuve;
  return {
    nom: nomProjetNeuf(maison, locale).slice(0, 110),
    typeBien: TYPE_BIEN_NEUF,
    surface: d.ctx.surface,
    codePostal: d.codePostal,
    reponses: {
      v: "estimateur", mode: d.mode, qui: d.qui, ctx: d.ctx, sel: d.sel, codePostal: d.codePostal,
      ...(d.custom?.length ? { custom: d.custom } : {}),
      ...(d.origine ? { origine: d.origine } : {}),
    },
  };
}
