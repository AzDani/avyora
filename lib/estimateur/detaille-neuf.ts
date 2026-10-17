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
import { key, isAuto, isLoc, lineHT, puReel, tauxPerso, type Ctx, type Selection, type Finition, type Lot, type Tache, type CustomLine } from "./core";
import { CATALOG_NEUF, POSTE_NEUF } from "./catalogue-neuf";
import { exclusifsDe, geometrieNeuf, maisonComplete, maisonParDefaut, reponseDuPoste, selAvantN8, type MaisonNeuve } from "./neuf";
import { BORNES_NEUF, minSdbNeuf } from "./bornes-neuf";
import { ctxNeuf, appliquerMaison, cocherPosteNeuf, soiMemeNeuf, peutFaireNeuf, LOTS_DECENNALE_NEUF, presetMaison, presetNeuf, type RapideNeufInput } from "./presets-neuf";
import type { QuiRealise } from "./presets";
import type { CleQuestionNeuf, ValeurQuestionNeuf } from "./questions-neuf";
import { estJalon } from "./projet";
import { ouvertsDepuisBrouillon } from "./liste-neuf";
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
  // Une emprise mesurée sur un plan ne vaut que pour la maison mesurée : une autre surface ou d'autres
  // niveaux l'oublient, l'emprise se déduit alors de la surface.
  if ((k === "surface" || k === "niveaux") && v !== e.maison[k]) delete brute.emprise;
  // Menuiseries ramenées au nombre que la surface donne : plus de saisie, le nombre suit de nouveau la
  // maison (la formule d'avant N8, `geometrieNeuf`).
  if (k === "menuiseries") {
    const sans = { ...brute };
    delete sans.menuiseries;
    if (v === menuiseriesNeuf(maisonComplete(sans))) delete brute.menuiseries;
  }
  let facadeAuto = e.facadeAuto;
  if (k === "murs" && facadeAuto) brute.facade = v === "ossature" ? "bardage-bois" : "enduit";
  if (k === "facade") facadeAuto = false;
  // La maison gardée est celle que le moteur chiffre (bornes, toit plat → pas de combles…).
  const maison = ctxDetailNeuf({ ...e, maison: brute }).neuf as MaisonNeuve;
  return { ...e, maison, facadeAuto, sel: appliquerMaison(maison, e.sel, e.qui, ancienne) };
}

/** Menuiseries extérieures de la maison (fenêtres + portes-fenêtres + baies) : le nombre saisi, sinon
 *  celui que la surface donne. C'est la valeur du compteur « Menuiseries ext. » (N9). */
export function menuiseriesNeuf(m: MaisonNeuve): number {
  const g = geometrieNeuf(m);
  return g.nFen + g.nPF + g.nBaie;
}

/** Les compteurs de la grille « Pièces et configuration » (ceux de la rénovation) et leur réponse. */
export type CompteurNeuf = "sejour" | "cuisines" | "chambres" | "suites" | "sdb" | "wc" | "couloir" | "buanderie" | "menuiseries";

/** Valeur affichée d'un compteur. */
export function valeurCompteurNeuf(m: MaisonNeuve, k: CompteurNeuf): number {
  return k === "menuiseries" ? menuiseriesNeuf(m) : m[k];
}

/**
 * Un « − » ou un « + » d'un compteur (N9) : borné par `BORNES_NEUF`, au moins une salle de bain en
 * comptant les suites, au moins un WC ; puis la réponse change comme les autres (`changerReponseNeuf`).
 * Un pas qui sort des bornes ne change rien.
 */
export function pasCompteurNeuf(e: EtatNeuf, k: CompteurNeuf, delta: number): EtatNeuf {
  const m = e.maison;
  const actuel = valeurCompteurNeuf(m, k);
  const min = k === "sdb" ? minSdbNeuf(m) : BORNES_NEUF[k].min;
  const v = Math.min(BORNES_NEUF[k].max, Math.max(min, actuel + delta));
  return v === actuel ? e : changerReponseNeuf(e, k, v);
}

/**
 * Coche ou décoche un poste à la main depuis l'état du détaillé (la case d'une ligne). Cocher, c'est
 * CHOISIR ce poste (`choisirNeuf`) : s'il correspond à une réponse de la maison, la réponse suit. Décocher
 * ne change pas la réponse (aucun autre choix n'est alors désigné).
 */
export function cocherNeufEtat(e: EtatNeuf, l: Lot, t: Tache): EtatNeuf {
  if (!e.sel[key(l.c, t.n)]?.on) return choisirNeuf(e, l, t);
  return { ...e, sel: cocherNeuf(ctxDetailNeuf(e), e.sel, l, t, e.qui) };
}

const FACADES_GROUPE = new Set(exclusifsDe("fac-enduit-monocouche-machine").concat("fac-enduit-monocouche-machine"));

/**
 * Choisit un poste (N10) : un clic sur une alternative d'une ligne de choix, ou la case d'une ligne.
 * 1. S'il correspond à une réponse de la maison (couverture en ardoise, fosse toutes eaux, vide
 *    sanitaire, murs en brique…), la réponse change comme dans le questionnaire (`changerReponseNeuf`) :
 *    les postes qu'elle gouverne suivent (l'étude SPANC avec la fosse…), le reste est gardé. La question
 *    affiche le choix réel, et un « Modifier » qui repart de la maison chiffre la même chose.
 * 2. Puis le poste est coché et les autres postes de son groupe exclusif décochés : il est le seul choix,
 *    même là où la réponse ne le coche pas (une couverture sur un toit plat) ou n'existe pas (le radier).
 *    Un ancien projet qui avait deux alternatives cochées n'en garde qu'une.
 * Choisir une façade (ITE comprise) arrête le « la façade suit les murs ».
 */
export function choisirNeuf(e: EtatNeuf, l: Lot, t: Tache): EtatNeuf {
  let x = e;
  const r = t.id ? reponseDuPoste(t.id) : null;
  if (r && (x.maison as unknown as Record<string, unknown>)[r.k] !== r.v) x = changerReponseNeuf(x, r.k, r.v);
  const k = key(l.c, t.n);
  let sel: Selection;
  if (!x.sel[k]?.on) sel = cocherNeuf(ctxDetailNeuf(x), x.sel, l, t, x.qui);
  else {
    sel = { ...x.sel };
    for (const id of t.id ? exclusifsDe(t.id) : []) {
      const p = POSTE_NEUF.get(id);
      const ka = p ? key(p.c, p.n) : "";
      if (sel[ka]?.on) sel[ka] = { ...sel[ka], on: false };
    }
  }
  return { ...x, sel, facadeAuto: t.id && FACADES_GROUPE.has(t.id) ? false : x.facadeAuto };
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
 *  finition, frais, pourcentage compris). Pour un poste en `pct`, c'est son montant. Alias de
 *  `puReel` (core), que la ligne de l'estimateur appelle désormais pour les deux natures (N7) ;
 *  nom gardé, des tests l'importent. */
export function puReelNeuf(ctx: Ctx, sel: Selection, l: Lot, t: Tache): number {
  return puReel(ctx, sel, l, t, false);
}

/** Badge d'une ligne : `pct` (un pourcentage, sans quantité) ; `jalon` (une démarche gratuite),
 *  seulement tant que son montant est nul — un prix perso en fait une ligne comme une autre. */
export function badgeNeuf(ctx: Ctx, sel: Selection, l: Lot, t: Tache): "pct" | "jalon" | undefined {
  if (t.u === "pct") return "pct";
  if (estJalon(t) && lineHT(ctx, sel, l, t) === 0) return "jalon";
  return undefined;
}

/** « Je le fais » proposé sur ce poste ? La règle par poste (`peutFaireNeuf`), quel que soit le
 *  mode : maçonnerie, charpente, menuiseries ou pompe à chaleur se prennent à la main, ligne par
 *  ligne. La ligne (`Row`) applique la même règle d'elle-même (`peutFaireSoiMeme` hors raison
 *  « pro ») ; nom gardé, des tests l'importent. */
export const diyNeuf = (l: Lot, t: Tache): boolean => peutFaireNeuf(l, t);

/** Structure et clos-couvert : passée en « Je le fais », la ligne avertit qu'elle sort de la
 *  garantie décennale (à vérifier avec l'assureur dommages-ouvrage). `Row` le décide d'elle-même
 *  pour les deux natures (`horsDecennaleSoiMeme`) ; nom gardé, des tests l'importent. */
export const horsDecennaleNeuf = (l: Lot): boolean => LOTS_DECENNALE_NEUF.has(l.c);

// ── Lignes perso ────────────────────────────────────────────────────────────────────────────────
const PAR_CLE = new Map<string, { l: Lot; t: Tache }>();
for (const l of CATALOG_NEUF) for (const t of l.t) PAR_CLE.set(key(l.c, t.n), { l, t });

/** Lignes perso affichées sous un lot (N10 : chaque lot n'apparaît qu'une fois) : toutes celles de ce
 *  lot, quelle que soit leur étape du chantier. */
export function lignesPersoDuLot(custom: CustomLine[], lot: string): CustomLine[] {
  return custom.filter((x) => x.lot === lot);
}

/** Nouvelle ligne perso d'un lot : TVA de la construction neuve (`tauxPerso` : 20 %), rangée à une étape
 *  du chantier (la première du lot : `premiereEtapeNeuf`). */
export function lignePersoNeuf(lot: string, phase: string, id: string): CustomLine {
  return { id, lot, phase, nom: "", prix: 0, unite: "u", qte: 1, note: "", tva: tauxPerso({ nature: "neuf" }), on: true, draft: true };
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
    sel: selAvantN8(selValide(r.sel)), facadeAuto: facadeAutoDe(maison),
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

/** Brouillon du détaillé (rechargement de la page). `open` : les lots ouverts, par nom de lot, et les
 *  deux cartes (`$frais`, `$demarches`) ; tout est fermé sur une page vierge. N10 : un brouillon d'avant
 *  (blocs ouverts par index, phases ouvertes de N3) rouvre les lots de ses blocs (`ouvertsDepuisBrouillon`). */
export interface BrouillonDetailNeuf {
  v: "neuf-detail";
  etat: EtatNeuf;
  custom: CustomLine[];
  open: Record<string, boolean>;
  origine?: OrigineNeuf;
}

export function lireBrouillonDetailNeuf(raw: string | null | undefined): BrouillonDetailNeuf | null {
  if (!raw) return null;
  let d: Partial<BrouillonDetailNeuf> | null = null;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || d.v !== "neuf-detail" || !d.etat || !d.etat.maison) return null;
  const maison = maisonComplete(d.etat.maison);
  return {
    v: "neuf-detail",
    etat: {
      maison, finition: FINITIONS.has(String(d.etat.finition)) ? d.etat.finition : "standard",
      qui: QUIS.has(String(d.etat.qui)) ? d.etat.qui : "pros",
      aleas: typeof d.etat.aleas === "number" ? d.etat.aleas : ctxNeuf(maison).aleas,
      budget: typeof d.etat.budget === "number" ? d.etat.budget : 0,
      sel: selAvantN8(selValide(d.etat.sel)), facadeAuto: typeof d.etat.facadeAuto === "boolean" ? d.etat.facadeAuto : facadeAutoDe(maison),
    },
    custom: lignesPersoValides(d.custom),
    open: ouvertsDepuisBrouillon(d.open),
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
