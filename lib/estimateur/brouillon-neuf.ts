/**
 * CONSTRUCTION NEUVE — brouillon anonyme, réclamation après inscription, corps de la requête.
 *
 * Ce module n'importe AUCUN code du moteur à l'exécution (seulement des types, et le dictionnaire
 * pour le nom du projet) : `ClaimDraft` (monté sur /projets) et `EstimationRappel` le lisent sans
 * embarquer le catalogue du neuf dans leur bundle.
 *
 * Clés SÉPARÉES de la rénovation (`avyora-estim-v2`, drapeau `"1"`) : un ctx neuf rangé sous la
 * clé réno serait relu par « Affiner » réno, `ClaimDraft` et `EstimationRappel`, puis chiffré sur
 * le catalogue de la rénovation, sans erreur visible. Le drapeau de réclamation du neuf a aussi
 * sa propre clé (`avyora-neuf-claim`) : un anonyme qui enregistre une rénovation PUIS une maison
 * (ou l'inverse) retrouve les deux projets après l'inscription. `avyora-estim-claim = "1"` reste
 * celui de la rénovation, inchangé.
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
/** `sessionStorage` : un gratuit a cliqué « Détail phase par phase — Pro » et part vers /tarifs.
 *  Au retour (bouton Précédent), le rapide reprend ses réponses au lieu d'un formulaire vide. */
export const CLE_RETOUR_NEUF = "avyora-neuf-retour";
/** Drapeau de réclamation du neuf (valeur « 1 »), distinct de celui de la rénovation. */
export const CLE_RECLAMATION_NEUF = "avyora-neuf-claim";
/** Drapeau de la rénovation. Une première version du neuf y écrivait « neuf » : relu, jamais réécrit. */
export const CLE_RECLAMATION = "avyora-estim-claim";
export const RECLAMATION_NEUF = "neuf";

/** Un enregistrement neuf anonyme attend-il d'être réclamé ? (lecteur du `localStorage` en paramètre) */
export function reclamationNeufPosee(lire: (cle: string) => string | null): boolean {
  return lire(CLE_RECLAMATION_NEUF) === "1" || lire(CLE_RECLAMATION) === RECLAMATION_NEUF;
}
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
  /** Suivi de chantier d'un projet rouvert : recopié tel quel au PATCH (les clés disparues sont ignorées). */
  statuts?: Record<string, number>;
  origine?: OrigineNeuf;
};

/** Nom par défaut d'un projet neuf : « Construction neuve — Maison plain-pied 100 m² ». */
export function nomProjetNeuf(maison: Pick<MaisonNeuve, "niveaux" | "surface">, locale: Locale = "fr"): string {
  const t = dictNeufCommun(locale);
  // Valeurs relues d'un brouillon ou de l'API : une clé héritée (« __proto__ ») ou une surface en
  // texte ne doivent pas produire « [object Object] NaN m² ».
  const maisonTxt = Object.hasOwn(t.maisonNiveaux, String(maison.niveaux)) ? t.maisonNiveaux[maison.niveaux] : t.maisonNiveaux.pp;
  const s = Math.round(Number(maison.surface));
  return `${t.projetNom} — ${maisonTxt}${Number.isFinite(s) && s > 0 ? ` ${s} m²` : ""}`;
}

/** Le brouillon du rapide neuf, à partir du chiffrage courant (`presetNeuf(R, base)`). */
export function brouillonRapideNeuf(p: {
  R: ReponsesRapideNeuf; ctx: Ctx; sel: Selection; base?: Partial<MaisonNeuve>; origine?: OrigineNeuf; statuts?: Record<string, number>;
}): BrouillonNeuf {
  return {
    v: "estimateur", mode: "rapide", qui: p.R.qui, ctx: p.ctx, sel: p.sel, codePostal: p.R.codePostal, R: p.R,
    ...(p.base ? { base: p.base } : {}),
    ...(p.origine ? { origine: p.origine } : {}),
    ...(p.statuts && Object.keys(p.statuts).length ? { statuts: p.statuts } : {}),
  };
}

/** Lignes perso relues (brouillon, API) : seulement des objets avec un lot. Une entrée `null`
 *  ferait planter le rendu du détaillé à chaque visite. */
export function lignesPersoValides(x: unknown): CustomLine[] {
  return Array.isArray(x) ? x.filter((c): c is CustomLine => !!c && typeof c === "object" && typeof (c as CustomLine).lot === "string") : [];
}
/** Sélection relue : seulement des postes décrits par un objet. */
export function selValide(x: unknown): Selection {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  return Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, v]) => !!v && typeof v === "object" && !Array.isArray(v))) as Selection;
}

const CP = /^\d{5}$/;
const NIVEAUX: readonly string[] = ["pp", "etage", "combles"];
const FINITIONS: readonly string[] = ["eco", "standard", "premium"];
const QUIS: readonly string[] = ["pros", "partie", "max"];

/** Relit les 5 réponses du rapide (stockage du navigateur) : `null` si une seule est hors des choix du formulaire. */
export function lireReponsesRapideNeuf(x: unknown): ReponsesRapideNeuf | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const surface = Number(r.surface);
  if (!Number.isFinite(surface) || surface < 30 || surface > 400) return null;
  if (typeof r.niveaux !== "string" || !NIVEAUX.includes(r.niveaux)) return null;
  if (typeof r.finition !== "string" || !FINITIONS.includes(r.finition)) return null;
  if (typeof r.qui !== "string" || !QUIS.includes(r.qui)) return null;
  const codePostal = typeof r.codePostal === "string" ? r.codePostal.replace(/\D/g, "").slice(0, 5) : "";
  const assainissement = r.assainissement === "collectif" || r.assainissement === "fosse" ? r.assainissement : undefined;
  return {
    surface, niveaux: r.niveaux as Niveaux, codePostal, finition: r.finition as Finition, qui: r.qui as QuiRealise,
    garage: r.garage === true, assainissement,
  };
}

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
  const custom = lignesPersoValides(d.custom);
  return {
    ...(d as BrouillonNeuf), codePostal, mode: d.mode === "detaille" ? "detaille" : "rapide",
    qui: d.qui === "partie" || d.qui === "max" ? d.qui : "pros", sel: selValide(d.sel),
    ...(custom.length ? { custom } : { custom: undefined }),
  };
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
      ...(d.statuts && Object.keys(d.statuts).length ? { statuts: d.statuts } : {}),
      ...(d.origine ? { origine: d.origine } : {}),
    },
  };
}
