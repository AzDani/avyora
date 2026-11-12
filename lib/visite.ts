/**
 * Visite guidée des estimateurs : la partie PURE (aucun React, aucun DOM obligatoire), testée dans
 * `tests/visite-guidee.test.ts`. Le composant `components/visite/VisiteGuidee.tsx` s'en sert.
 *
 * Même esprit que la visite de l'éditeur de plan (`maquettes/plan-editor.html`, D42) : des bulles ancrées
 * aux vrais éléments, un halo sur la cible, la bulle dans l'écran et JAMAIS sur sa cible, Suivant / Retour /
 * Passer, Échap, ← →, mémorisée « fait » ou « passé » (par estimateur), relançable.
 *
 * Rien ici ne touche aux réponses de l'utilisateur, aux calculs, au réseau ni à Google Ads : la mémoire est
 * une clé locale, la mesure passe par `suivre()` (événements fermés, aucune donnée personnelle).
 */
import { suivre } from "@/lib/track";

/** Les quatre estimateurs qui portent une visite (une mémoire chacun). */
export const ESTIMATEURS_VISITE = ["rapideReno", "rapideNeuf", "detailleReno", "detailleNeuf"] as const;
export type IdVisite = (typeof ESTIMATEURS_VISITE)[number];

/* ─── Mémoire (localStorage, clé versionnée) ──────────────────────────────────────────────────── */

/** Monter la version refait proposer la visite à tout le monde (ex. une visite réécrite). */
export const VERSION_VISITE = 1;
export const cleVisite = (id: IdVisite) => `avyora-visite:v${VERSION_VISITE}:${id}`;

/** `fait` : visite terminée ; `passe` : passée ou refusée ; `indisponible` : stockage illisible (navigation privée stricte…). */
export type EtatVisite = "fait" | "passe" | "indisponible";

type Stockage = Pick<Storage, "getItem" | "setItem">;
/** Le localStorage du navigateur, ou `null` (serveur, ou accès refusé). */
function stockageNavigateur(): Stockage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Ce que ce navigateur a déjà fait de la visite de cet estimateur, `null` s'il ne l'a jamais vue.
 * Stockage indisponible : `indisponible` — on ne propose pas une invitation qui reviendrait à chaque page
 * (le bouton « ? Visite guidée » reste là). Une valeur inconnue (ancienne version, bricolage) vaut « jamais vue ».
 */
export function lireVisite(id: IdVisite, s: Stockage | null = stockageNavigateur()): EtatVisite | null {
  if (!s) return "indisponible";
  try {
    const v = s.getItem(cleVisite(id));
    return v === "fait" || v === "passe" ? v : null;
  } catch {
    return "indisponible";
  }
}

/** Range « fait » ou « passé ». Stockage indisponible : rien, sans erreur. */
export function memoriserVisite(id: IdVisite, etat: "fait" | "passe", s: Stockage | null = stockageNavigateur()): void {
  if (!s) return;
  try {
    s.setItem(cleVisite(id), etat);
  } catch {
    /* stockage plein ou refusé : la visite sera reproposée, rien de grave */
  }
}

/**
 * L'invitation « Te guider en 1 minute ? » : seulement à la première visite, jamais sur un formulaire déjà
 * prérempli (page de prix, brouillon, projet rouvert), jamais par-dessus le bandeau cookies encore ouvert.
 */
export function doitInviter(o: { etat: EtatVisite | null; prerempli: boolean; cookiesOuverts: boolean }): boolean {
  return o.etat === null && !o.prerempli && !o.cookiesOuverts;
}

/* ─── Étapes ───────────────────────────────────────────────────────────────────────────────────── */

export type Cote = "bas" | "haut" | "droite" | "gauche";

/**
 * Une étape. `cible` : un nom `data-visite` (« rapide-ampleur ») ou un sélecteur CSS (commence par `.`, `#`
 * ou `[`) ; un tableau = le halo entoure tous les éléments présents. `repli` : visé si `cible` est absente ou
 * cachée. Ni l'une ni l'autre présente : l'étape est SAUTÉE (jamais de bulle vide ou mal placée).
 * `cible: null` : une bulle sans cible, au centre (à réserver aux introductions).
 */
export type EtapeVisite = {
  /** Identifiant stable (la reprise après un redimensionnement retrouve l'étape). */
  id: string;
  cible: string | string[] | null;
  repli?: string | string[];
  titre: string;
  texte: string;
  /** Côtés préférés de la bulle (ordinateur) ; au téléphone, la bulle est une feuille en bas (ou en haut). */
  place?: Cote[];
  /**
   * Au téléphone seulement, la cible à montrer À LA PLACE de `cible` (même forme, même repli) : pour une cible plus
   * haute que l'écran au-dessus de la feuille (une grille de compteurs passée sur une colonne), sa première partie.
   * Absente : `cible`, partout.
   */
  cibleMobile?: string | string[];
};
export type EtapeResolue = EtapeVisite & { cibles: string[] };

const enListe = (x: string | string[] | null | undefined): string[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** `rapide-cp` → `[data-visite="rapide-cp"]` ; un sélecteur CSS passe tel quel. */
export function selecteurCible(nom: string): string {
  return /^[.#[]/.test(nom) ? nom : `[data-visite="${nom.replace(/["\\]/g, "\\$&")}"]`;
}

/**
 * Les étapes jouables MAINTENANT : chaque cible résolue sur ce qui est présent et visible (`present`), le repli
 * sinon ; une étape sans rien à montrer est retirée. Recalculé au lancement et quand l'écran change de format.
 * `mobile` : la cible du téléphone (`cibleMobile`) remplace `cible` quand l'étape en a une.
 */
export function resoudreEtapes(etapes: EtapeVisite[], present: (nom: string) => boolean, mobile = false): EtapeResolue[] {
  const out: EtapeResolue[] = [];
  for (const e of etapes) {
    if (e.cible === null) { out.push({ ...e, cibles: [] }); continue; }
    let c = enListe(mobile && e.cibleMobile ? e.cibleMobile : e.cible).filter(present);
    if (!c.length) c = enListe(e.repli).filter(present);
    if (c.length) out.push({ ...e, cibles: c });
  }
  return out;
}

/** Suivant / Retour : l'index d'arrivée, ou `fin` après la dernière étape. Retour ne sort jamais de la 1ʳᵉ. */
export function naviguer(i: number, n: number, action: "suivant" | "retour"): number | "fin" {
  if (action === "retour") return Math.max(0, Math.min(n - 1, i - 1));
  return i + 1 >= n ? "fin" : i + 1;
}

/** Le clavier pendant la visite : Échap = passer, → = suivant, ← = retour, Tab = rester dans la bulle. */
export function actionClavier(key: string): "passer" | "suivant" | "retour" | "tab" | null {
  switch (key) {
    case "Escape": case "Esc": return "passer";
    case "ArrowRight": return "suivant";
    case "ArrowLeft": return "retour";
    case "Tab": return "tab";
    default: return null;
  }
}

/* ─── Géométrie : où défiler, où poser la bulle ──────────────────────────────────────────────── */

export type Rect = { left: number; top: number; right: number; bottom: number };
export type Vue = { w: number; h: number };

/** Le rectangle qui contient tous ceux donnés (`null` si aucun). */
export function unionRects(rs: Rect[]): Rect | null {
  if (!rs.length) return null;
  return rs.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }));
}

const se_chevauchent = (a: Rect, b: Rect) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
/** La partie visible d'un rectangle (la bulle ne doit pas couvrir ce qu'on VOIT de la cible). */
const visible = (r: Rect, v: Vue): Rect => ({ left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(v.w, r.right), bottom: Math.min(v.h, r.bottom) });
export const chevauche = (a: Rect, b: Rect, v: Vue) => se_chevauchent(a, visible(b, v));

/**
 * De combien défiler (en px, positif = vers le bas) pour montrer la cible avec la place de la bulle.
 * `entete` : la hauteur de l'en-tête collant du site. Ordinateur : cible + bulle centrées sous l'en-tête.
 * Téléphone : la cible centrée dans ce qui reste au-dessus de la feuille du bas. Trop haute : son haut sous l'en-tête.
 */
export function defilement(o: { cible: Rect; vue: Vue; mobile: boolean; bulle: { h: number }; entete?: number; marge?: number; ecart?: number }): number {
  const m = o.marge ?? 12, gap = o.ecart ?? 14, ent = o.entete ?? 0;
  const h = o.cible.bottom - o.cible.top;
  const haut = ent + m;
  const bas = o.mobile ? o.vue.h - o.bulle.h - m - gap : o.vue.h - m;
  const place = bas - haut;
  // Ordinateur : la bulle se pose au-dessus ou au-dessous ; on garde la cible et la bulle dans l'écran ensemble.
  const besoin = o.mobile ? h : h + gap + o.bulle.h;
  if (besoin > place) return Math.round(o.cible.top - haut);
  const visee = haut + (place - besoin) / 2;
  // Déjà bien visible (et la bulle a sa place) : on ne bouge pas la page pour rien.
  if (o.cible.top >= haut && o.cible.top + besoin <= bas) return 0;
  return Math.round(o.cible.top - visee);
}

/**
 * La position de la bulle (coin haut-gauche). Ordinateur : à côté de la cible (côtés préférés d'abord), dans
 * l'écran, sans la couvrir ; sinon un coin libre. Téléphone : une feuille en bas, ou en haut si la cible est
 * dessous (une barre collante en bas d'écran, par exemple). Sans cible : centrée (en bas au téléphone).
 */
export function placerBulle(o: {
  cible: Rect | null; bulle: { w: number; h: number }; vue: Vue; mobile: boolean; place?: Cote[]; marge?: number; ecart?: number; entete?: number;
}): { x: number; y: number; cote: Cote | "centre" | "coin" } {
  const m = o.marge ?? 12, gap = o.ecart ?? 14, { w: vw, h: vh } = o.vue, { w: bw, h: bh } = o.bulle;
  const cl = (x: number, a: number, z: number) => Math.max(a, Math.min(z, x));
  const rect = (x: number, y: number): Rect => ({ left: x, top: y, right: x + bw, bottom: y + bh });
  if (o.mobile) {
    const mx = 8, x = cl((vw - bw) / 2, mx, Math.max(mx, vw - mx - bw));
    const bas = { x, y: Math.max(mx, vh - mx - bh), cote: "bas" as const };
    if (!o.cible) return bas;
    const haut = { x, y: mx, cote: "haut" as const };
    if (!chevauche(rect(bas.x, bas.y), o.cible, o.vue)) return bas;
    if (!chevauche(rect(haut.x, haut.y), o.cible, o.vue)) return haut;
    // Les deux couvrent : celle qui en cache le moins.
    const v = visible(o.cible, o.vue);
    const couvreBas = Math.max(0, v.bottom - bas.y), couvreHaut = Math.max(0, haut.y + bh - v.top);
    return couvreBas <= couvreHaut ? bas : haut;
  }
  if (!o.cible) return { x: cl(vw / 2 - bw / 2, m, vw - m - bw), y: cl(vh / 2 - bh / 2, m, vh - m - bh), cote: "centre" };
  const H = visible(o.cible, o.vue);
  const cy = cl((H.top + H.bottom) / 2 - bh / 2, m, vh - m - bh), cx = cl((H.left + H.right) / 2 - bw / 2, m, vw - m - bw);
  const C: Record<Cote, { x: number; y: number }> = {
    droite: { x: H.right + gap, y: cy }, gauche: { x: H.left - gap - bw, y: cy },
    bas: { x: cx, y: H.bottom + gap }, haut: { x: cx, y: H.top - gap - bh },
  };
  const dansEcran = (p: { x: number; y: number }) => p.x >= m - 0.5 && p.y >= m - 0.5 && p.x + bw <= vw - m + 0.5 && p.y + bh <= vh - m + 0.5;
  const ordre = [...(o.place ?? []), "bas", "haut", "droite", "gauche"] as Cote[];
  for (const k of ordre) if (dansEcran(C[k]) && !chevauche(rect(C[k].x, C[k].y), o.cible, o.vue)) return { ...C[k], cote: k };
  const coins = [{ x: vw - m - bw, y: vh - m - bh }, { x: m, y: vh - m - bh }, { x: vw - m - bw, y: m }, { x: m, y: m }];
  const libre = coins.find((p) => !chevauche(rect(p.x, p.y), o.cible!, o.vue));
  return { ...(libre ?? coins[0]), cote: "coin" };
}

/* ─── Mesure ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * Les trois événements de la visite, par la fonction de suivi du site (`suivre`, no-op sans analytics).
 * Propriétés fermées : l'estimateur, l'étape atteinte, le nombre d'étapes, l'origine. Jamais une réponse.
 */
export function mesurerVisite(
  nom: "visite_debut" | "visite_fin" | "visite_passee",
  p: { estimateur: IdVisite; etape?: number; etapes?: number; origine?: "invitation" | "bouton" },
): void {
  const props: Record<string, string | number> = { estimateur: p.estimateur };
  if (p.etape != null) props.etape = p.etape;
  if (p.etapes != null) props.etapes = p.etapes;
  if (p.origine) props.origine = p.origine;
  suivre(nom, props);
}
