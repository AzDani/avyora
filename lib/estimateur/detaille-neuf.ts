/**
 * CONSTRUCTION NEUVE — le mode détaillé (« Affiner ma maison », réservé au Pro), en fonctions pures.
 *
 * L'écran (`components/neuf/EstimateurNeuf.tsx`) ne garde que l'état et l'affichage ; tout ce qui
 * décide d'un chiffre est ici, testé sans rendu (`tests/neuf-detaille.test.ts`) :
 *
 * - l'état est la DESCRIPTION de la maison (+ finition, qui réalise, aléas, budget) et la sélection
 *   poste par poste. Le contexte du moteur s'en DÉDUIT (`ctxDetailNeuf`) ; on ne le stocke pas ;
 * - changer une réponse ne touche que les postes dont la décision change (`appliquerMaison` avec
 *   l'ancienne maison) : un parquet choisi à la main survit à un changement de toit ;
 * - « qui réalise » (`qui`) ne vaut que pour les postes cochés ENSUITE (réglage « Nouveaux postes
 *   cochés », N3) ; seule l'action « Tout passer en… », confirmée, réécrit les lignes déjà cochées ;
 * - les reprises : projet rouvert, « Affiner » depuis le rapide, graine du rapide, brouillon.
 *
 * Mécanique recopiée de la maquette validée (`maquettes/neuf/app.js`, `changerMaison`,
 * `changerQui`, `puLigne`), sur le MÊME moteur que le rapide : une maison décrite pareil coûte pareil.
 */
import { key, isAuto, isLoc, lineHT, type Ctx, type Selection, type Finition, type Lot, type Tache, type CustomLine } from "./core";
import { CATALOG_NEUF, PHASES_NEUF } from "./catalogue-neuf";
import { maisonComplete, maisonParDefaut, reponseDuPoste, type MaisonNeuve } from "./neuf";
import { ctxNeuf, appliquerMaison, cocherPosteNeuf, soiMemeNeuf, peutFaireNeuf, LOTS_DECENNALE_NEUF, presetMaison, presetNeuf, type RapideNeufInput } from "./presets-neuf";
import type { QuiRealise } from "./presets";
import type { CleQuestionNeuf, ValeurQuestionNeuf } from "./questions-neuf";
import { estJalon } from "./projet";
import { corpsProjetNeuf, lignesPersoValides, selValide, type BrouillonNeuf, type OrigineNeuf } from "./brouillon-neuf";
import type { Locale } from "../i18n/config";

/** Brouillon du détaillé neuf (travail en cours, rechargement de la page). Séparé de la rénovation. */
export const CLE_BROUILLON_DETAIL_NEUF = "avyora-neuf-detail-v1";

/** Ce que l'utilisateur décrit et règle. Le contexte du moteur s'en déduit. */
export interface EtatNeuf {
  maison: MaisonNeuve;
  finition: Finition;
  qui: QuiRealise;
  aleas: number;
  budget: number;
  sel: Selection;
  /** La façade suit les murs (ossature → bardage bois, sinon enduit) tant qu'on ne l'a pas choisie. */
  facadeAuto: boolean;
}

/** Contexte moteur de l'état. `ctxNeuf` remet le budget à 0 : on le repose. */
export function ctxDetailNeuf(e: EtatNeuf): Ctx {
  return { ...ctxNeuf(e.maison, { finition: e.finition, codePostal: e.maison.codePostal ?? "", aleas: e.aleas }), budget: e.budget || 0 };
}

/** La façade est-elle celle que les murs donneraient d'office ? (reprise d'une maison déjà décrite) */
export const facadeAutoDe = (m: MaisonNeuve): boolean => m.facade === (m.murs === "ossature" ? "bardage-bois" : "enduit");

/** Un état à partir d'un chiffrage déjà fait (`presetNeuf`, `presetMaison`, projet enregistré). */
export function etatDepuisPreset(p: { ctx: Ctx; sel: Selection }, qui: QuiRealise, budget = 0): EtatNeuf {
  const maison = maisonComplete(p.ctx.neuf);
  return {
    maison, finition: p.ctx.finition ?? "standard", qui, aleas: p.ctx.aleas, budget: budget || 0,
    sel: p.sel ?? {}, facadeAuto: facadeAutoDe(maison),
  };
}

/** Page vierge (et « Tout réinitialiser ») : la maison la plus courante, tout fait faire. */
export function etatParDefaut(): EtatNeuf {
  return etatDepuisPreset(presetMaison(maisonParDefaut(), { qui: "pros" }), "pros");
}

/** Chaque poste coché reprend le « Je le fais » que `qui` lui donne par défaut : les choix faits
 *  ligne par ligne sont remplacés. N'est plus appelé que par « Tout passer en… » (`toutPasserNeuf`). */
export function changerQuiNeuf(sel: Selection, qui: QuiRealise): Selection {
  const out: Selection = { ...sel };
  for (const [k, s] of Object.entries(sel)) {
    const p = PAR_CLE.get(k);
    if (!s?.on || !p) continue;
    out[k] = { ...s, self: soiMemeNeuf(p.l.c, qui, p.t) };
  }
  return out;
}

/**
 * Réglage « Nouveaux postes cochés : Fait faire / Je le fais » (N3, au-dessus des lots). Il ne vaut
 * que pour les postes cochés ENSUITE, à la main (`cocherNeufEtat`) ou par une réponse
 * (`appliquerMaison`) : aucune ligne déjà cochée ne change, la sélection est rendue telle quelle.
 * « Je le fais » = `max` : le défaut du mode « Je fais le maximum », qui laisse la structure, le toit,
 * les menuiseries extérieures et les branchements aux pros (`PRO_PAR_DEFAUT_MAX`). Un `partie` (repris
 * du rapide ou d'un projet enregistré) reste tel quel tant qu'on ne choisit pas.
 */
export function reglerNouveauxNeuf(e: EtatNeuf, qui: QuiRealise): EtatNeuf {
  return { ...e, qui };
}

/** « Tout passer en… », après confirmation : le réglage des nouveaux postes ET toutes les lignes
 *  cochées passent à `qui` (l'ancien comportement de la question « Qui réalise »). */
export function toutPasserNeuf(e: EtatNeuf, qui: QuiRealise): EtatNeuf {
  return { ...e, qui, sel: changerQuiNeuf(e.sel, qui) };
}

/** Nombre de lignes cochées dont « Tout passer en `qui` » changerait le mode (texte de confirmation). */
export function postesQuiChangent(sel: Selection, qui: QuiRealise): number {
  let n = 0;
  for (const [k, s] of Object.entries(sel)) {
    const p = PAR_CLE.get(k);
    if (s?.on && p && !!s.self !== soiMemeNeuf(p.l.c, qui, p.t)) n++;
  }
  return n;
}

/**
 * Une réponse du questionnaire change. `$finition` règle le chiffrage ; toute autre clé décrit la
 * maison : seuls les postes dont la décision change bougent, le reste de la sélection (choix faits
 * à la main, quantités, prix, notes) est gardé.
 */
export function changerReponseNeuf(e: EtatNeuf, k: CleQuestionNeuf, v: ValeurQuestionNeuf): EtatNeuf {
  if (k === "$finition") return { ...e, finition: v as Finition };
  const ancienne = ctxDetailNeuf(e).neuf as MaisonNeuve;
  const brute = { ...e.maison, [k]: v } as MaisonNeuve;
  let facadeAuto = e.facadeAuto;
  if (k === "murs" && facadeAuto) brute.facade = v === "ossature" ? "bardage-bois" : "enduit";
  if (k === "facade") facadeAuto = false;
  // La maison gardée est celle que le moteur chiffre (bornes, toit plat → pas de combles…).
  const maison = ctxDetailNeuf({ ...e, maison: brute }).neuf as MaisonNeuve;
  return { ...e, maison, facadeAuto, sel: appliquerMaison(maison, e.sel, e.qui, ancienne) };
}

/**
 * Coche un poste à la main depuis l'état du détaillé. Si ce poste correspond à une réponse de la
 * maison (couverture en ardoise, gouttière PVC, bardage…), la réponse suit : la question affiche
 * le choix réel, et un « Modifier » qui repart de la maison chiffre la même chose. Décocher ne
 * change pas la réponse (aucun autre choix n'est alors désigné).
 */
export function cocherNeufEtat(e: EtatNeuf, l: Lot, t: Tache): EtatNeuf {
  const sel = cocherNeuf(ctxDetailNeuf(e), e.sel, l, t, e.qui);
  const on = !!sel[key(l.c, t.n)]?.on;
  const r = on && t.id ? reponseDuPoste(t.id) : null;
  if (!r || (e.maison as unknown as Record<string, unknown>)[r.k] === r.v) return { ...e, sel };
  return { ...e, sel, maison: { ...e.maison, [r.k]: r.v } as MaisonNeuve, facadeAuto: r.k === "facade" ? false : e.facadeAuto };
}

/** Coche ou décoche un poste à la main : décoche les postes exclusifs (deux couvertures ne
 *  coexistent pas) et, comme en rénovation, met 1 à un poste coché sans quantité automatique. */
export function cocherNeuf(ctx: Ctx, sel: Selection, l: Lot, t: Tache, qui: QuiRealise): Selection {
  const k = key(l.c, t.n);
  const on = !sel[k]?.on;
  const out: Selection = { ...cocherPosteNeuf(sel, t.id, on, qui) };
  if (on && out[k] && out[k].qty == null && (isLoc(l.c) || !isAuto(ctx, l.c, t.n))) out[k] = { ...out[k], qty: 1 };
  return out;
}

/** Prix unitaire « Fait faire » réel : ce que le moteur compte pour une quantité de 1 (région,
 *  finition, frais, pourcentage compris). Pour un poste en `pct`, c'est son montant. */
export function puReelNeuf(ctx: Ctx, sel: Selection, l: Lot, t: Tache): number {
  const k = key(l.c, t.n);
  return lineHT(ctx, { ...sel, [k]: { ...(sel[k] ?? {}), on: true, manual: true, qty: 1, self: false } }, l, t);
}

/** Badge d'une ligne : `pct` (un pourcentage, sans quantité) ; `jalon` (une démarche gratuite),
 *  seulement tant que son montant est nul — un prix perso en fait une ligne comme une autre. */
export function badgeNeuf(ctx: Ctx, sel: Selection, l: Lot, t: Tache): "pct" | "jalon" | undefined {
  if (t.u === "pct") return "pct";
  if (estJalon(t) && lineHT(ctx, sel, l, t) === 0) return "jalon";
  return undefined;
}

/** Nombre de démarches d'une phase, affiché à côté de son jalon : les lignes cochées dont le badge
 *  est « jalon » (montant nul). Une démarche à laquelle on a donné un prix n'en est plus une. */
export function demarchesPhase(ctx: Ctx, sel: Selection, phase: string): number {
  let n = 0;
  for (const l of CATALOG_NEUF) {
    if (l.p !== phase) continue;
    for (const t of l.t) if (sel[key(l.c, t.n)]?.on && badgeNeuf(ctx, sel, l, t) === "jalon") n++;
  }
  return n;
}

/** « Je le fais » proposé sur ce poste ? La règle par poste (`peutFaireNeuf`), quel que soit le
 *  mode : maçonnerie, charpente ou menuiseries se prennent à la main, ligne par ligne. Nom gardé
 *  (des tests l'importent). */
export const diyNeuf = (l: Lot, t: Tache): boolean => peutFaireNeuf(l, t);

/** Structure et clos-couvert : passée en « Je le fais », la ligne avertit qu'elle sort de la
 *  garantie décennale (à vérifier avec l'assureur dommages-ouvrage). */
export const horsDecennaleNeuf = (l: Lot): boolean => LOTS_DECENNALE_NEUF.has(l.c);

// ── Blocs : un lot du catalogue neuf, à sa place dans une phase ─────────────────────────────────
/* Un même lot revient dans plusieurs phases, et parfois deux fois dans la même (« Isolation » ×2
   en second œuvre) : un bloc s'identifie donc par son INDEX dans le catalogue, pas par son nom. */
export interface BlocNeuf { l: Lot; i: number }
export const BLOCS_NEUF: BlocNeuf[] = CATALOG_NEUF.map((l, i) => ({ l, i }));

const PAR_CLE = new Map<string, { l: Lot; t: Tache }>();
for (const l of CATALOG_NEUF) for (const t of l.t) PAR_CLE.set(key(l.c, t.n), { l, t });

/** Le premier bloc de ce lot dans cette phase (sans phase : le premier bloc du lot). */
function premierBloc(lot: string, phase?: string): number {
  const b = BLOCS_NEUF.find((x) => x.l.c === lot && (phase == null || x.l.p === phase));
  return b ? b.i : -1;
}

/** Lignes perso affichées sous ce bloc : celles de son lot et de sa phase, sous le PREMIER bloc
 *  de ce lot dans cette phase (une ligne ne s'affiche qu'une fois, même si le lot y revient).
 *  Une ligne sans phase (ou d'une phase inconnue) va sous le premier bloc de son lot. */
export function lignesPersoDuBloc(custom: CustomLine[], b: BlocNeuf): CustomLine[] {
  return custom.filter((x) => {
    if (x.lot !== b.l.c) return false;
    const cible = x.phase != null && premierBloc(x.lot, x.phase) >= 0 ? premierBloc(x.lot, x.phase) : premierBloc(x.lot);
    return cible === b.i;
  });
}

/** Nouvelle ligne perso d'un bloc : TVA 20 % (construction neuve), rangée dans sa phase. */
export function lignePersoNeuf(lot: string, phase: string, id: string): CustomLine {
  return { id, lot, phase, nom: "", prix: 0, unite: "u", qte: 1, note: "", tva: 20, on: true, draft: true };
}

// ── Reprises ─────────────────────────────────────────────────────────────────────────────────
type Rep = { v?: string; mode?: string; ctx?: Partial<Ctx>; sel?: Selection; qui?: QuiRealise; codePostal?: string; custom?: CustomLine[]; statuts?: Record<string, number>; origine?: OrigineNeuf };

export interface RepriseNeuf { etat: EtatNeuf; custom: CustomLine[]; statuts?: Record<string, number>; origine?: OrigineNeuf }

/** Un projet neuf enregistré (rapide ou détaillé) rouvert dans le détaillé. `null` si ce n'en est pas un. */
export function repriseDepuisReponses(reponses: unknown): RepriseNeuf | null {
  const r = reponses as Rep | null;
  if (!r || r.v !== "estimateur" || !r.ctx || r.ctx.nature !== "neuf" || !r.ctx.neuf) return null;
  const cp = r.ctx.neuf.codePostal || r.ctx.codePostal || r.codePostal || "";
  const maison = maisonComplete({ ...r.ctx.neuf, codePostal: cp });
  const etat: EtatNeuf = {
    maison, finition: r.ctx.finition ?? "standard", qui: r.qui ?? "pros",
    aleas: typeof r.ctx.aleas === "number" ? r.ctx.aleas : ctxNeuf(maison).aleas,
    budget: typeof r.ctx.budget === "number" ? r.ctx.budget : 0,
    sel: selValide(r.sel), facadeAuto: facadeAutoDe(maison),
  };
  return {
    etat, custom: lignesPersoValides(r.custom),
    ...(r.statuts ? { statuts: r.statuts } : {}),
    ...(r.origine ? { origine: r.origine } : {}),
  };
}

const NIVEAUX = new Set(["pp", "etage", "combles"]);
const FINITIONS = new Set(["eco", "standard", "premium"]);
const QUIS = new Set(["pros", "partie", "max"]);

/** « Affiner » depuis le rapide (`sessionStorage`) : `{ R, base }` → la MÊME maison, le même total. */
export function repriseDepuisAffiner(raw: string | null | undefined): EtatNeuf | null {
  if (!raw) return null;
  let d: { R?: Partial<RapideNeufInput>; base?: Record<string, unknown> } | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  const R = d?.R;
  if (!R || !(Number(R.surface) > 0) || !NIVEAUX.has(String(R.niveaux)) || !FINITIONS.has(String(R.finition)) || !QUIS.has(String(R.qui))) return null;
  const input: RapideNeufInput = {
    surface: Number(R.surface), niveaux: R.niveaux as RapideNeufInput["niveaux"], codePostal: String(R.codePostal ?? ""),
    finition: R.finition as Finition, qui: R.qui as QuiRealise, garage: !!R.garage,
    ...(R.assainissement === "collectif" || R.assainissement === "fosse" ? { assainissement: R.assainissement } : {}),
  };
  const base = d?.base && typeof d.base === "object" ? (d.base as Partial<MaisonNeuve>) : undefined;
  return etatDepuisPreset(presetNeuf(input, base), input.qui);
}

/** La graine du rapide (`avyora-neuf-v1`) : sa maison et ses postes tels que chiffrés. */
export function repriseDepuisGraine(raw: string | null | undefined): RepriseNeuf | null {
  if (!raw) return null;
  let d: Rep | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  return repriseDepuisReponses(d);
}

/**
 * À l'ouverture du détaillé (hors projet rouvert) : repartir à neuf, et de quelle maison, ou reprendre le
 * brouillon du détaillé (`frais: false`). N2 : `?new=1` part de la maison PAR DÉFAUT, page vierge comme en
 * rénovation (la graine du rapide n'est plus ressemée) ; la graine `avyora-neuf-v1` n'est relue que sur
 * `?reprise=1`, le retour du paiement (`/bienvenue-pro`, bandeau « déjà Pro » de `/tarifs`). « Affiner »
 * (`sessionStorage`) passe avant tout : la maison du rapide, et l'origine « plan » reprise de la graine,
 * qu'« Affiner » range juste avant.
 */
export type OuvertureNeuf = { frais: true; reprise: RepriseNeuf | null } | { frais: false };

export function ouvertureDetailNeuf(o: { nouveau: boolean; reprise: boolean; affiner: string | null; graine: string | null }): OuvertureNeuf {
  if (!o.nouveau && !o.reprise && !o.affiner) return { frais: false };
  const etat = repriseDepuisAffiner(o.affiner);
  if (etat) {
    const origine = repriseDepuisGraine(o.graine)?.origine;
    return { frais: true, reprise: { etat, custom: [], ...(origine ? { origine } : {}) } };
  }
  return { frais: true, reprise: o.reprise ? repriseDepuisGraine(o.graine) : null };
}

/** Brouillon du détaillé (rechargement de la page). `open` : les blocs ouverts, par index de bloc ;
 *  `ouvertes` : les phases ouvertes, par nom (N3 : toutes fermées sur une page vierge). */
export interface BrouillonDetailNeuf {
  v: "neuf-detail";
  etat: EtatNeuf;
  custom: CustomLine[];
  open: Record<string, boolean>;
  ouvertes: Record<string, boolean>;
  origine?: OrigineNeuf;
}

/** Les phases qui contiennent un bloc ouvert : un brouillon d'avant N3 (sans `ouvertes`, phases
 *  toujours dépliées) rouvre ainsi les blocs qu'on y regardait. */
export function phasesDesBlocsOuverts(open: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const b of BLOCS_NEUF) if (open[b.i]) out[b.l.p] = true;
  return out;
}

const PHASES = new Set<string>(PHASES_NEUF);

export function lireBrouillonDetailNeuf(raw: string | null | undefined): BrouillonDetailNeuf | null {
  if (!raw) return null;
  let d: Partial<BrouillonDetailNeuf> | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || d.v !== "neuf-detail" || !d.etat || !d.etat.maison) return null;
  const maison = maisonComplete(d.etat.maison);
  const open = d.open && typeof d.open === "object" ? d.open : {};
  return {
    v: "neuf-detail",
    etat: {
      maison, finition: FINITIONS.has(String(d.etat.finition)) ? d.etat.finition : "standard",
      qui: QUIS.has(String(d.etat.qui)) ? d.etat.qui : "pros",
      aleas: typeof d.etat.aleas === "number" ? d.etat.aleas : ctxNeuf(maison).aleas,
      budget: typeof d.etat.budget === "number" ? d.etat.budget : 0,
      sel: selValide(d.etat.sel), facadeAuto: typeof d.etat.facadeAuto === "boolean" ? d.etat.facadeAuto : facadeAutoDe(maison),
    },
    custom: lignesPersoValides(d.custom),
    open,
    ouvertes: d.ouvertes && typeof d.ouvertes === "object" && !Array.isArray(d.ouvertes)
      ? Object.fromEntries(Object.entries(d.ouvertes).filter(([p, v]) => PHASES.has(p) && v === true))
      : phasesDesBlocsOuverts(open),
    ...(d.origine ? { origine: d.origine } : {}),
  };
}

// ── Enregistrement ───────────────────────────────────────────────────────────────────────────
/**
 * Le brouillon (pour la réclamation après inscription) et le corps du POST / PATCH d'un projet
 * neuf détaillé. Le suivi de chantier (`statuts`) et l'origine (plan) d'un projet rouvert sont
 * gardés : un PATCH remplace toutes les réponses.
 */
export function enregistrementDetailNeuf(e: EtatNeuf, opts: { custom?: CustomLine[]; statuts?: Record<string, number>; origine?: OrigineNeuf; locale?: Locale } = {}) {
  const ctx = ctxDetailNeuf(e);
  const brouillon: BrouillonNeuf = {
    v: "estimateur", mode: "detaille", qui: e.qui, ctx, sel: e.sel, codePostal: ctx.codePostal ?? "",
    ...(opts.custom?.length ? { custom: opts.custom } : {}),
    ...(opts.origine ? { origine: opts.origine } : {}),
  };
  const corps = corpsProjetNeuf(brouillon, opts.locale ?? "fr");
  return {
    brouillon,
    corps: opts.statuts ? { ...corps, reponses: { ...corps.reponses, statuts: opts.statuts } } : corps,
  };
}
