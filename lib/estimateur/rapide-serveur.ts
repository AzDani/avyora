/**
 * L'estimation RAPIDE calculée côté SERVEUR (27/11/2026, option A validée par Dani) : le navigateur n'envoie que les
 * réponses du formulaire, et ne reçoit que ce que l'écran affiche. Le barème, les paniers et le moteur ne partent plus
 * dans le JavaScript de la page publique.
 *
 * Mêmes fonctions, mêmes montants qu'avant au centime : `presetRapide` / `presetPieces` / `presetNeuf`, puis
 * `buildDevis` — exactement ce que les composants faisaient dans le navigateur.
 *
 * Ce que reçoit le visiteur (`droits`) :
 * - toujours : le `preset` ({ ctx, sel } : postes et quantités, sans prix) que rangent le brouillon et
 *   « Enregistrer », `positif` (un total non nul : la mesure « estimation terminée ») ;
 * - sans compte : AUCUN montant (le résultat se voit avec un compte, 26/11/2026), seulement les % d'économie de
 *   « Qui réalise » que les cartes affichaient déjà ;
 * - rénovation, plusieurs types de pièces sans les droits Pro (paywall doux) : ni montant ni pourcentage ;
 * - avec un compte : les montants (total, €/m² des cartes) ; neuf : le bilan, sa répartition par phase si Pro.
 */
import { z } from "zod";
import { buildDevis, type Ctx, type Selection, type Finition, type TypeBien } from "./core";
import { CATALOG, catalogueDe } from "./catalogue-neuf";
import { presetRapide, AMPLEURS, type Ampleur, type QuiRealise } from "./presets";
import { presetPieces, type PieceSel } from "./pieces";
import { presetNeuf } from "./presets-neuf";
import { maisonComplete, piecesNeuf, type MaisonNeuve } from "./neuf";
import { BORNES_NEUF } from "./bornes-neuf";
import { CLES_PIECES, SURFACE_MAX_PIECE } from "./rapide-reno";
import { chiffresBilanNeuf, type ChiffresBilanNeuf } from "./bilan-neuf";
import type { Locale } from "../i18n/config";

const FINITIONS = ["eco", "standard", "premium"] as const;
const QUIS = ["pros", "partie", "max"] as const;
const cp = z.string().max(5).regex(/^\d{0,5}$/);

export const entreeRapideRenoSchema = z.object({
  nature: z.literal("reno"),
  mode: z.enum(["bien", "pieces"]),
  type: z.enum(["Studio", "T2", "T3", "T4", "Maison", "Appartement"]),
  surface: z.number().finite().min(0).max(100_000),
  pieces: z.array(z.object({ room: z.enum(CLES_PIECES as unknown as [string, ...string[]]), surface: z.number().finite().min(0).max(SURFACE_MAX_PIECE) })).max(40),
  cp,
  ampleur: z.enum(["rafraich", "partielle", "complete", "lourde"]),
  finition: z.enum(FINITIONS),
  qui: z.enum(QUIS),
  /** Provision pour aléas d'un projet rouvert (D7) : gardée. */
  aleas: z.number().finite().min(0).max(100).nullish(),
});
export type EntreeRapideReno = z.infer<typeof entreeRapideRenoSchema>;

const borne = (k: keyof typeof BORNES_NEUF) => z.number().finite().min(BORNES_NEUF[k].min).max(BORNES_NEUF[k].max);
/** Une maison déjà décrite (plan, détaillé rouvert, retour de /tarifs) : chaque champ borné, l'inconnu retiré. */
const baseNeufSchema = z.object({
  surface: borne("surface"), niveaux: z.enum(["pp", "etage", "combles"]), forme: z.enum(["rect", "L", "complexe"]),
  garage: borne("garage"), chambres: borne("chambres"), sdb: borne("sdb"), wc: borne("wc"),
  sejour: borne("sejour"), cuisines: borne("cuisines"), couloir: borne("couloir"), buanderie: borne("buanderie"), suites: borne("suites"),
  menuiseries: borne("menuiseries"), emprise: z.number().finite().min(0).max(2_000),
  plancherBas: z.enum(["terre-plein", "vide-sanitaire", "sous-sol"]),
  murs: z.enum(["parpaing", "brique", "monomur", "cellulaire", "ossature"]),
  toiture: z.enum(["2pans", "4pans", "plat"]), penteFaible: z.boolean(),
  couverture: z.enum(["terre-cuite", "beton", "ardoise", "ardoise-fibro", "bac-acier", "zinc"]),
  gouttiere: z.enum(["zinc", "pvc", "alu"]), facade: z.enum(["enduit", "bardage-bois", "bardage-composite"]),
  chauffage: z.enum(["pac-eau", "pac-air", "poele"]), vmc: z.enum(["simple", "double"]), escalier: z.enum(["bois", "beton"]),
  assainissement: z.enum(["collectif", "fosse", "micro"]), eauxPluviales: z.enum(["infiltration", "reseau"]),
  terrain: z.enum(["plat", "pente"]), argile: z.enum(["non", "moyen", "fort"]),
  sismique: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  viabilise: z.boolean(), distanceReseaux: borne("distanceReseaux"), lotissement: z.boolean(), borne: z.boolean(),
  evacTerreVegetale: z.boolean(), cuisine: z.boolean(), pilotage: z.enum(["moi", "moe"]), codePostal: cp,
}).partial();

export const entreeRapideNeufSchema = z.object({
  nature: z.literal("neuf"),
  R: z.object({
    surface: z.number().finite().min(0).max(100_000),
    niveaux: z.enum(["pp", "etage", "combles"]),
    codePostal: cp,
    finition: z.enum(FINITIONS),
    qui: z.enum(QUIS),
    garage: z.boolean().optional(),
    assainissement: z.enum(["collectif", "fosse"]).optional(),
  }),
  base: baseNeufSchema.optional(),
  locale: z.enum(["fr", "en"]),
});
export type EntreeRapideNeuf = z.infer<typeof entreeRapideNeufSchema>;

export const entreeRapideSchema = z.discriminatedUnion("nature", [entreeRapideRenoSchema, entreeRapideNeufSchema]);

export type DroitsRapide = { compte: boolean; pro: boolean };
type Preset = { ctx: Ctx; sel: Selection };

/** « −N % » de « Qui réalise » : même formule que les cartes (prix au m² face à « tout par des pros »). */
const economie = (prix: number, base: number) => (base > 0 && prix > 0 ? Math.round((1 - prix / base) * 100) : 0);

export type SortieRapideReno = {
  preset: Preset;
  positif: boolean;
  /** Avec un compte (et hors paywall des pièces) : le total et les €/m² des cartes. */
  montants: null | { ttc: number; m2ByAmp: Record<Ampleur, number>; m2ByFin: Record<Finition, number>; m2ByQui: Record<QuiRealise, number> };
  /** Hors paywall des pièces : « −N % » des cartes « Qui réalise », et « Je fais un max » au prix de « J'en fais une partie ». */
  economies: null | { pct: Record<QuiRealise, number>; identiqueMax: boolean };
};

export function calculRapideReno(e: EntreeRapideReno, droits: DroitsRapide): SortieRapideReno {
  const pieces = e.pieces as PieceSel[];
  const totalSurface = e.mode === "pieces" ? pieces.reduce((s, r) => s + (r.surface || 0), 0) : e.surface;
  const sel = (o: { ampleur?: Ampleur; finition?: Finition; qui?: QuiRealise } = {}): Preset => {
    const a = o.ampleur ?? e.ampleur, f = o.finition ?? e.finition, q = o.qui ?? e.qui;
    const p = e.mode === "pieces"
      ? presetPieces(pieces, a, f, q, e.cp)
      : presetRapide({ type: e.type as TypeBien, surface: e.surface, codePostal: e.cp, ampleur: a, finition: f, qui: q });
    return e.aleas != null ? { ...p, ctx: { ...p.ctx, aleas: e.aleas } } : p;
  };
  const m2 = (p: Preset) => {
    const s = totalSurface > 0 && p.ctx.surface > 0 ? p.ctx.surface : 0;
    return s > 0 ? Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc / s) : 0;
  };
  const preset = sel();
  const ttc = buildDevis(CATALOG, preset.ctx, preset.sel).totaux.ttc;
  const locked = e.mode === "pieces" && new Set(pieces.map((r) => r.room)).size >= 2 && !droits.pro;
  const m2ByQui = Object.fromEntries(QUIS.map((q) => [q, m2(sel({ qui: q }))])) as Record<QuiRealise, number>;
  return {
    preset,
    positif: ttc > 0,
    montants: droits.compte && !locked ? {
      ttc,
      m2ByAmp: Object.fromEntries(AMPLEURS.map((a) => [a.v, m2(sel({ ampleur: a.v }))])) as Record<Ampleur, number>,
      m2ByFin: Object.fromEntries(FINITIONS.map((f) => [f, m2(sel({ finition: f }))])) as Record<Finition, number>,
      m2ByQui,
    } : null,
    economies: locked ? null : {
      pct: Object.fromEntries(QUIS.map((q) => [q, economie(m2ByQui[q], m2ByQui.pros)])) as Record<QuiRealise, number>,
      identiqueMax: m2ByQui.max > 0 && m2ByQui.max === m2ByQui.partie,
    },
  };
}

export type ResumeMaisonNeuf = { surface: number; niveaux: MaisonNeuve["niveaux"]; chambres: number; sdb: number; wc: number; garage: number };

export type SortieRapideNeuf = {
  preset: Preset;
  positif: boolean;
  /** Surface du garage « oui » : celle de la maison décrite, sinon celle que le moteur met par défaut (pas un montant). */
  garageM2: number;
  /** La maison décrite (plan) telle qu'elle est CHIFFRÉE (au moins une salle de bain et un WC), pour son résumé. */
  resumeBase: ResumeMaisonNeuf | null;
  /** Avec un compte : le total et les €/m² des cartes. */
  montants: null | { ttc: number; m2ByFin: Record<Finition, number>; m2ByQui: Record<QuiRealise, number> };
  /** « −N % » des cartes « Qui réalise » (affichés avec ou sans compte, comme avant). */
  economies: Record<QuiRealise, number>;
  /** Avec un compte : le bilan replié (répartition par phase en clair si Pro). */
  bilan: ChiffresBilanNeuf | null;
};

export function calculRapideNeuf(e: EntreeRapideNeuf, droits: DroitsRapide): SortieRapideNeuf {
  const base = e.base as Partial<MaisonNeuve> | undefined;
  const R = e.R;
  const m2De = (o: Partial<typeof R>) => {
    const p = presetNeuf({ ...R, ...o }, base);
    return p.ctx.surface > 0 ? Math.round(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc / p.ctx.surface) : 0;
  };
  const preset = presetNeuf(R, base);
  const ttc = buildDevis(catalogueDe(preset.ctx), preset.ctx, preset.sel).totaux.ttc;
  const m2ByQui = Object.fromEntries(QUIS.map((q) => [q, m2De({ qui: q })])) as Record<QuiRealise, number>;
  const mb = base ? maisonComplete(base) : null;
  return {
    preset,
    positif: ttc > 0,
    garageM2: presetNeuf({ ...R, garage: true }, base).ctx.neuf?.garage ?? 0,
    resumeBase: mb ? { surface: mb.surface, niveaux: mb.niveaux, chambres: piecesNeuf(mb).chambres, sdb: piecesNeuf(mb).sdb, wc: mb.wc, garage: mb.garage } : null,
    montants: droits.compte ? {
      ttc,
      m2ByFin: Object.fromEntries(FINITIONS.map((f) => [f, m2De({ finition: f })])) as Record<Finition, number>,
      m2ByQui,
    } : null,
    economies: Object.fromEntries(QUIS.map((q) => [q, economie(m2ByQui[q], m2ByQui.pros)])) as Record<QuiRealise, number>,
    bilan: droits.compte && R.surface >= 30 ? chiffresBilanNeuf(preset.ctx, preset.sel, R.qui, droits.pro, e.locale as Locale) : null,
  };
}
