/**
 * RÉNOVATION — le mode détaillé (poste par poste, réservé au Pro), en fonctions pures.
 *
 * L'écran (`components/Estimateur.tsx`) ne garde que l'état et l'affichage ; tout ce qui décide d'une
 * valeur est ici, testé sans rendu (`tests/detaille-reno.test.ts`), sur le modèle du neuf
 * (`detaille-neuf.ts`, chantier N6 de la revue rénovation / neuf) :
 *
 * - l'état est le contexte du bien (`ctx`), le code postal, la sélection poste par poste, les lots
 *   ouverts et les lignes perso. Le code postal est gardé à part : le moteur le reçoit par `ctx`
 *   au moment du calcul (`{ ...ctx, codePostal }`) ;
 * - chaque réponse du questionnaire rend un NOUVEAU contexte (surface au sol qui suit la surface et
 *   les niveaux, type de bien, périmètre « pièces ciblées », suite parentale, compteurs) ;
 * - les réglages d'une ligne (`Row`) rendent une nouvelle ligne : les mêmes pour le neuf ;
 * - les outils de la liste, « Seulement les postes cochés » et « Tout déplier », comme le neuf ;
 * - les reprises (projet rouvert, « Affiner » depuis le rapide, brouillon) et le corps de
 *   l'enregistrement.
 *
 * Extraction pure de l'écran : mêmes règles, mêmes valeurs (rendu figé par
 * `tests/detaille-rendu-temoins.test.ts`).
 */
import {
  defaultCtx, deriveSol, nbFen, nbPieces, ESPACES, espacesCompo, selectedEspaces, piecesEff, sdbEff, key, isLoc, isAuto, autoQty, visibleTask,
  type Ctx, type Selection, type LigneSel, type TypeBien, type Lot, type Tache, type CustomLine,
} from "./core";

// ── État ─────────────────────────────────────────────────────────────────────────────────────
/** Ce que le détaillé garde : le brouillon local (`avyora-estim-detail-v1`) et les réponses d'un projet. */
export interface EtatReno {
  ctx: Ctx;
  sel: Selection;
  /** Lots ouverts, par nom de lot. */
  open: Record<string, boolean>;
  codePostal: string;
  custom: CustomLine[];
}

/** Réponses d'un projet détaillé (`v: "estimateur"`) ou brouillon local, tels qu'ils sont rangés. */
export type PersistedReno = {
  v?: string; ctx?: Partial<Ctx>; sel?: Selection; open?: Record<string, boolean>; codePostal?: string;
  statuts?: Record<string, number>; custom?: CustomLine[];
};

/** Page vierge (et « Tout réinitialiser ») : le bien par défaut, rien coché. */
export function etatVierge(): EtatReno {
  return { ctx: defaultCtx(), sel: {}, open: {}, codePostal: "", custom: [] };
}

/** Un état relu : chaque champ absent garde la valeur d'une page vierge, le contexte complète le contexte par défaut. */
export function etatDepuis(d: PersistedReno | null | undefined): EtatReno | null {
  if (!d) return null;
  return {
    ctx: d.ctx ? { ...defaultCtx(), ...d.ctx } : defaultCtx(),
    sel: d.sel ?? {},
    open: d.open ?? {},
    codePostal: d.codePostal || "",
    custom: d.custom ?? [],
  };
}

/** Les réponses d'un projet rouvert (« Modifier ») si c'en est un du détaillé ou du rapide de la rénovation. */
export function projetReno(initialState: unknown): PersistedReno | null {
  const d = initialState as PersistedReno | null | undefined;
  return d && d.v === "estimateur" ? d : null;
}

/**
 * À l'ouverture (hors projet rouvert). `?new=1` (Nouveau projet) ou « Affiner » depuis le rapide :
 * on repart d'une page VIERGE et le brouillon du détaillé est effacé ; « Affiner » reprend SEULEMENT
 * les infos du bien de la graine du rapide (contexte et code postal, aucun poste coché). Sinon :
 * le brouillon du détaillé (rechargement de la page), ou rien (page vierge).
 */
export function ouvertureDetailReno(o: { nouveau: boolean; affiner: boolean; graine: string | null; brouillon: string | null }): { effacer: boolean; etat: EtatReno | null } {
  if (o.nouveau || o.affiner) {
    if (!o.affiner) return { effacer: true, etat: null };
    const seed = lire(o.graine);
    if (!seed) return { effacer: true, etat: null };
    return { effacer: true, etat: { ...etatVierge(), ...(seed.ctx ? { ctx: { ...defaultCtx(), ...seed.ctx } } : {}), codePostal: seed.codePostal || "" } };
  }
  return { effacer: false, etat: etatDepuis(lire(o.brouillon)) };
}

function lire(raw: string | null): PersistedReno | null {
  try { return JSON.parse(raw || "null") as PersistedReno | null; } catch { return null; }
}

// ── Questionnaire : chaque réponse rend un nouveau contexte ───────────────────────────────────
/** Un nombre saisi (surface, niveaux, hauteur, budget, aléas). La surface au sol suit la surface et
 *  les niveaux tant que l'utilisateur ne l'a pas saisie lui-même. */
export function majNombre(c: Ctx, champ: keyof Ctx, brut: string): Ctx {
  const val = parseFloat(brut) || 0;
  const next = { ...c, [champ]: val } as Ctx;
  if ((champ === "surface" || champ === "niveaux") && !next.surfaceSolManual) next.surfaceSol = deriveSol(next);
  return next;
}

/** Surface au sol saisie à la main : elle ne suit plus la surface habitable. */
export const majSol = (c: Ctx, brut: string): Ctx => ({ ...c, surfaceSol: parseFloat(brut) || 0, surfaceSolManual: true });

/** Type de bien : le nombre de pièces et de menuiseries d'un bien de ce type. */
export const majType = (c: Ctx, t: TypeBien): Ctx => ({ ...c, type: t, pieces: nbPieces(t), fenetres: nbFen(t) });

/** Compteur simple d'un champ du contexte (niveaux, salles de bain, WC, menuiseries), borné à `min`. */
export const pasCtx = (c: Ctx, champ: keyof Ctx, delta: number, min: number): Ctx =>
  ({ ...c, [champ]: Math.max(min, ((c[champ] as number) || 0) + delta) }) as Ctx;

/** Les pièces de la grille « Pièces & configuration » qui se comptent dans le détail du contexte. */
export const PIECES_DETAIL = ["sejour", "cuisine", "chambres", "suites", "couloir", "buanderie"] as const;
export type PieceDetail = (typeof PIECES_DETAIL)[number];
const PIECES_DEFAUT: Record<PieceDetail, number> = { sejour: 1, cuisine: 1, chambres: 3, suites: 0, couloir: 1, buanderie: 0 };

/** Valeur affichée d'un compteur de pièces (un ancien projet sans détail affiche les valeurs par défaut). */
export const compteurPiece = (c: Ctx, f: PieceDetail): number => (c[f] as number | undefined) ?? PIECES_DEFAUT[f];

/** Un compteur de pièces bouge : tout le détail est matérialisé (il pilote alors le nombre de pièces), puis le pas appliqué. */
export function pasPiece(c: Ctx, f: PieceDetail, delta: number, min: number): Ctx {
  const cur = {} as Record<PieceDetail, number>;
  for (const k of PIECES_DETAIL) cur[k] = compteurPiece(c, k);
  cur[f] = Math.max(min, cur[f] + delta);
  return { ...c, ...cur };
}

// ── Périmètre « pièces ciblées » : plusieurs pièces, chacune en un ou plusieurs exemplaires ──────
/** La carte {pièce → surfaces} courante, quel que soit le format rangé (tableaux, ancien {n, s}, ancien `espace`). */
export function espacesCourants(c: Ctx): Record<string, number[]> {
  const m: Record<string, number[]> = {};
  for (const e of selectedEspaces(c)) m[e.k] = [...e.surfaces];
  return m;
}

/** Applique une sélection de pièces : une suite parentale seule a son éditeur de zones (chambre,
 *  salle de bain, dressing) ; sinon les compteurs et la surface sont la somme des pièces. */
export function appliquerEspaces(c: Ctx, map: Record<string, number[]>): Ctx {
  const keys = Object.keys(map);
  if (!keys.length) return c;
  if (keys.length === 1 && keys[0] === "suite" && (map.suite?.length ?? 0) === 1) {
    const e = ESPACES.suite;
    return { ...c, perimetre: "piece", type: "Maison", espaces: undefined, espace: "suite", surface: e.surface, surfaceSol: e.surface, surfaceSolManual: true, ...e.ctx };
  }
  return { ...c, perimetre: "piece", type: "Maison", espace: undefined, espaces: map, ...espacesCompo(map) };
}

/** Logement entier, ou une ou plusieurs pièces (une chambre si aucune n'était choisie). */
export function choisirPerimetre(c: Ctx, m: "entier" | "piece"): Ctx {
  if (m === "entier") return { ...c, perimetre: "entier", espace: undefined, espaces: undefined };
  const cur = espacesCourants(c);
  return appliquerEspaces(c, Object.keys(cur).length ? cur : { chambre: [ESPACES.chambre.surface] });
}

/** Coche ou décoche une pièce ; il en reste toujours au moins une. */
export function basculerEspace(c: Ctx, k: string): Ctx {
  const m = espacesCourants(c);
  if (m[k]) { if (Object.keys(m).length === 1) return c; delete m[k]; }
  else m[k] = [ESPACES[k]?.surface ?? 12];
  return appliquerEspaces(c, m);
}

/** Un exemplaire de plus (une 2ᵉ salle de bain…), à sa propre surface. */
export function ajouterExemplaire(c: Ctx, k: string): Ctx {
  const m = espacesCourants(c);
  if (!ESPACES[k]) return c;
  m[k] = [...(m[k] || []), ESPACES[k].surface];
  return appliquerEspaces(c, m);
}

/** Retire l'exemplaire `i` ; la dernière pièce restante garde un exemplaire. */
export function retirerExemplaire(c: Ctx, k: string, i: number): Ctx {
  const m = espacesCourants(c);
  if (!m[k]) return c;
  m[k] = m[k].filter((_, j) => j !== i);
  if (!m[k].length) { if (Object.keys(m).length === 1) m[k] = [ESPACES[k].surface]; else delete m[k]; }
  return appliquerEspaces(c, m);
}

/** Surface de l'exemplaire `i`, arrondie, au moins 1 m². */
export function surfaceExemplaire(c: Ctx, k: string, i: number, val: number): Ctx {
  const m = espacesCourants(c);
  if (!m[k]) return c;
  m[k] = m[k].map((s, j) => (j === i ? Math.max(1, Math.round(val) || 1) : s));
  return appliquerEspaces(c, m);
}

// ── Suite parentale seule : surface = somme des zones ─────────────────────────────────────────
/** Surface totale de la suite = chambre + salle de bain + dressing éventuel (surface au sol identique). */
export function syncSuite(next: Ctx): Ctx {
  next.surface = (next.zChambre ?? 0) + (next.zSdb ?? 0) + (next.avecDressing ? (next.zDressing ?? 0) : 0);
  next.surfaceSol = next.surface; next.surfaceSolManual = true;
  return next;
}

/** Une zone de la suite bouge d'un m² (salle de bain : 2 m² au moins, les autres : 1). */
export const majZone = (c: Ctx, z: "zChambre" | "zSdb" | "zDressing", delta: number): Ctx =>
  syncSuite({ ...c, [z]: Math.max(z === "zSdb" ? 2 : 1, ((c[z] as number | undefined) ?? 0) + delta) } as Ctx);

export const basculerDressing = (c: Ctx): Ctx => syncSuite({ ...c, avecDressing: !c.avecDressing } as Ctx);

// ── Récapitulatif du bien ─────────────────────────────────────────────────────────────────────
/** Ce que le récapitulatif affiche : emprise, murs extérieurs et toiture estimés, surface à l'étage,
 *  pièces et salles de bain effectives, et en « pièces ciblées » les pièces choisies et leur surface. */
export function recapReno(c: Ctx) {
  const SS = c.surfaceSol || c.surface;
  const espaces = c.perimetre === "piece" ? selectedEspaces(c) : [];
  return {
    appart: c.type !== "Maison",
    piece: c.perimetre === "piece",
    suite: c.perimetre === "piece" && c.espace === "suite",
    emprise: SS,
    facade: Math.round(4 * Math.sqrt(SS) * c.hauteur * (c.niveaux || 1) * 1.25),
    toiture: Math.round(SS * 1.4),
    etage: Math.max(0, c.surface - SS),
    pieces: piecesEff(c),
    sdb: sdbEff(c),
    espaces,
    espacesSurface: espaces.reduce((sum, e) => sum + e.surfaces.reduce((a, b) => a + b, 0), 0),
  };
}

// ── Sélection poste par poste ─────────────────────────────────────────────────────────────────
/** Réécrit une ligne de la sélection (absente : partie d'une ligne vide). */
export function majLigne(sel: Selection, c: string, n: string, patch: (s: LigneSel) => LigneSel): Selection {
  const k = key(c, n);
  return { ...sel, [k]: patch(sel[k] || {}) };
}

/**
 * Coche ou décoche un poste. Cocher une ligne, c'est en demander au moins une : sans quantité
 * automatique (tout le lot menuiseries extérieures, une location), la ligne passe à 1, sinon elle
 * resterait à 0 € (cocher « Baie vitrée » n'ajoutait rien, la poche du galandage non plus). Une
 * ligne à quantité automatique garde la sienne, calculée.
 */
export function cocherReno(ctx: Ctx, sel: Selection, l: Lot, t: Tache): Selection {
  return majLigne(sel, l.c, t.n, (s) => {
    const on = !s.on;
    const next = { ...s, on };
    if (on && next.qty == null && (isLoc(l.c) || !isAuto(ctx, l.c, t.n))) next.qty = 1;
    return next;
  });
}

/** Interrupteur auto / manuel d'une quantité : passée en manuel, la ligne part de la quantité calculée. Les deux détaillés. */
export function basculerAuto(ctx: Ctx, sel: Selection, l: Lot, t: Tache): Selection {
  return majLigne(sel, l.c, t.n, (s) => {
    const manual = !s.manual;
    const next = { ...s, manual };
    if (manual && next.qty == null) next.qty = autoQty(ctx, l.c, t.n, sel) ?? 0;
    return next;
  });
}

/* Les réglages d'une ligne depuis `Row`, pour les deux détaillés : chacun rend la nouvelle ligne. */
/** Quantité saisie : elle épingle une ligne à quantité automatique (D12 : le plan cesse de l'alimenter). */
export const ligneQuantite = (ctx: Ctx, l: Lot, t: Tache, v: number) => (s: LigneSel): LigneSel =>
  ({ ...s, qty: v, manual: isAuto(ctx, l.c, t.n) ? true : s.manual, plan: undefined });

/** Prix unitaire « Fait faire » perso (`null` : retour au prix AVYORA). */
export const lignePrix = (v: number | null) => (s: LigneSel): LigneSel => {
  const n = { ...s };
  if (v == null) delete n.pu; else n.pu = v;
  return n;
};

/** Prix matériaux « Je le fais » perso (`null` : retour au prix AVYORA) ; il remplace un prix « Fait faire » perso. */
export const ligneMateriaux = (v: number | null) => (s: LigneSel): LigneSel => {
  const n = { ...s };
  if (v == null) delete n.pm; else { n.pm = v; delete n.pu; }
  return n;
};

// ── Liste des lots : « Seulement les postes cochés » et « Tout déplier », comme le neuf ───────
/** Les postes d'un lot que la liste montre : ceux du bien (`visibleTask`) ; avec « Seulement les postes
 *  cochés », les cochés seuls. */
export function postesAffichesReno(ctx: Ctx, sel: Selection, l: Lot, seulementCoches: boolean): Tache[] {
  return l.t.filter((t) => visibleTask(ctx, t) && (!seulementCoches || !!sel[key(l.c, t.n)]?.on));
}

/** Le compteur de l'en-tête d'un lot : ses postes cochés (ceux du bien) et ses lignes perso validées.
 *  Un lot à 0 disparaît sous « Seulement les postes cochés ». */
export function cochesDuLotReno(ctx: Ctx, sel: Selection, l: Lot, custom: CustomLine[]): number {
  return postesAffichesReno(ctx, sel, l, true).length + custom.filter((x) => x.lot === l.c && x.on !== false && !x.draft).length;
}

/** Vrai quand tous les lots montrés (`lots`, déjà filtrés pour le bien) sont ouverts : le bouton dit alors
 *  « Tout replier ». */
export const toutOuvertReno = (lots: Lot[], open: Record<string, boolean>): boolean => lots.every((l) => open[l.c]);

/** « Tout déplier » ouvre les lots montrés ; « Tout replier » revient à la vue d'ouverture, tous fermés
 *  (comme le neuf). */
export function basculerToutReno(lots: Lot[], open: Record<string, boolean>): Record<string, boolean> {
  return toutOuvertReno(lots, open) ? {} : Object.fromEntries(lots.map((l) => [l.c, true]));
}

// ── Enregistrement ───────────────────────────────────────────────────────────────────────────
/** Ce qui manque pour enregistrer : un code postal à 5 chiffres, puis une surface. */
export function manqueReno(ctx: Ctx, codePostal: string): "cp" | "surface" | null {
  if (!/^\d{5}$/.test(codePostal)) return "cp";
  if (!(ctx.surface > 0)) return "surface";
  return null;
}

/** Mots du nom de projet : la nature, le type de bien et le nom d'une pièce, dans la langue de l'écran. */
export interface MotsNomReno { projet: string; type: (t: TypeBien) => string; espace: (nom: string) => string }
const MOTS_FR: MotsNomReno = { projet: "Rénovation", type: (t) => t, espace: (nom) => nom };

/** Nom du projet (110 caractères au plus) : « Rénovation — Maison 120 m² » ou « Rénovation — 2 Chambre + Salle de bain · 28 m² ». */
export function nomProjetReno(ctx: Ctx, mots: MotsNomReno = MOTS_FR): string {
  const espLabel = ctx.perimetre === "piece"
    ? selectedEspaces(ctx).map(({ k, surfaces }) => `${surfaces.length > 1 ? surfaces.length + " " : ""}${mots.espace(ESPACES[k]?.nom ?? k)}`).join(" + ")
    : "";
  return (espLabel
    ? `${mots.projet} — ${espLabel} · ${ctx.surface} m²`
    : `${mots.projet} — ${mots.type(ctx.type)} ${ctx.surface} m²`).slice(0, 110);
}

/** Corps du POST / PATCH d'un projet détaillé. Le suivi de chantier (`statuts`) d'un projet rouvert est gardé : un PATCH remplace toutes les réponses. */
export function corpsProjetReno(p: { nom: string; ctx: Ctx; sel: Selection; codePostal: string; custom: CustomLine[]; statuts?: Record<string, number> }) {
  return {
    nom: p.nom, typeBien: p.ctx.type, surface: p.ctx.surface, codePostal: p.codePostal,
    reponses: { v: "estimateur", mode: "detaille", ctx: p.ctx, sel: p.sel, codePostal: p.codePostal, custom: p.custom, ...(p.statuts ? { statuts: p.statuts } : {}) },
  };
}
