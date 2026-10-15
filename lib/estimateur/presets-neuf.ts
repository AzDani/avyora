/**
 * CONSTRUCTION NEUVE — du questionnaire au chiffrage.
 *
 * Comme `presetRapide` pour la rénovation : une description de maison devient `ctx + sel`, envoyés
 * au MÊME moteur (`buildDevis(catalogueDe(ctx), ctx, sel)`). Le mode rapide (5 questions) et le
 * mode détaillé passent par les mêmes règles : une maison décrite pareil coûte pareil.
 */
import { key, peutFaireSoiMeme, ALEAS_NEUF, type Ctx, type Selection, type Finition, type Tache, type Lot, type RaisonPro } from "./core";
import { POSTE_NEUF } from "./catalogue-neuf";
import { maisonComplete, geometrieNeuf, decisionsNeuf, exclusifsDe, type MaisonNeuve, type DecisionNeuf, type Niveaux } from "./neuf";
import { DIY_PARTIE, type QuiRealise } from "./presets";

/** Contexte moteur d'une construction neuve. Aléas : `ALEAS_NEUF` (7 %) sauf réglage contraire. */
export function ctxNeuf(maison: Partial<MaisonNeuve>, opts: { finition?: Finition; codePostal?: string; aleas?: number } = {}): Ctx {
  const cp = opts.codePostal ?? maison.codePostal ?? "";
  const h = maisonComplete({ ...maison, codePostal: cp });
  const g = geometrieNeuf(h);
  return {
    surface: Math.round(h.surface), surfaceSol: Math.round(g.E), surfaceSolManual: true,
    niveaux: h.niveaux === "pp" ? 1 : 2, type: "Maison", hauteur: 2.5,
    pieces: g.piecesEff, fenetres: g.nFen + g.nPF + g.nBaie, sdb: h.sdb, wc: h.wc,
    sejour: 1, cuisine: 1, chambres: h.chambres, suites: 0, couloir: 1, buanderie: 0,
    budget: 0, aleas: opts.aleas ?? ALEAS_NEUF, finition: opts.finition ?? "standard", fiscal: "pro", codePostal: cp,
    nature: "neuf", neuf: h,
  };
}

/* « Je le fais » en neuf : deux questions séparées (revue rénovation / neuf, §3).
   1. Est-ce POSSIBLE ? Une règle par poste, la même qu'en rénovation (`peutFaireSoiMeme`) : la
      maçonnerie, les fondations, la charpente, la couverture et les menuiseries extérieures se
      font soi-même ligne par ligne, comme en rénovation. Restent aux pros les postes qui portent
      une raison (`pro` : études, concessionnaires, contrôles, fluides frigorigènes, IRVE, procédé).
   2. Que prend le mode « Je fais le maximum » PAR DÉFAUT ? Pas « tout » : voir `PRO_PAR_DEFAUT_MAX`. */

/** Structure et clos-couvert : ce que couvre la garantie décennale de l'artisan. Passé en « Je le
 *  fais », un de ces postes sort de cette garantie : la ligne le rappelle. */
export const LOTS_DECENNALE_NEUF = new Set(["Terrassement", "Fondations & soubassement", "Maçonnerie", "Charpente, couverture & structure bois",
  "Couverture & zinguerie", "Menuiseries exterieures"]);

/* « Le maximum » en neuf n'est pas « tout » : la structure, le clos-couvert et les branchements
   restent aux artisans PAR DÉFAUT (garanties décennales, assurance dommages-ouvrage, matériel), et
   la pompe à chaleur n'est jamais faisable soi-même (`PRO_PARTAGES_NEUF`). C'est ce qui ramène
   l'auto-construction dans les prix constatés (1 200 à 1 600 €/m²). Dans le détaillé, chacun de ces
   postes se reprend à la main. « Raccordements aux réseaux » garde la fosse et la micro-station aux
   pros par défaut (décision 4, option A, `docs/construction-neuve/decisions.md`) : aucun total par
   défaut ne bouge. */
export const PRO_PAR_DEFAUT_MAX = new Set([...LOTS_DECENNALE_NEUF, "Raccordements aux réseaux"]);

/**
 * Postes REPRIS de la rénovation (le même objet que `catalog.json`, qu'on ne modifie pas ici) que le
 * neuf réserve aux pros, avec leur raison. TEMPORAIRE : le chantier N5 porte ce champ `pro` dans
 * `catalog.json`, pour les deux natures, et supprime cette table.
 * - La règle seule les ouvrirait (ils ont un prix de fourniture) : PAC et climatisations (fluides
 *   frigorigènes, attestation de capacité, C. env. art. R543-99 et suivants), branchement au
 *   tout-à-l'égout (côté réseau public ; la partie privée est `vrd-canalisation-pvc-enterree`), borne
 *   de recharge (installateur qualifié IRVE au-delà de 3,7 kW, décret 2017-26).
 * - Déjà sans prix de fourniture : la table ne leur donne que la raison affichée.
 */
export const PRO_PARTAGES_NEUF = new Map<string, RaisonPro>([
  ["cha-pompe-a-chaleur-air-eau", "fluides"], ["cha-climatisation-reversible-split", "fluides"], ["cha-climatisation-gainable-reversible", "fluides"],
  ["rac-raccordement-au-tout-a-l-egout", "concessionnaire"], ["ele-borne-de-recharge-voiture", "reglementaire"],
  ["rac-raccordement-electrique-enedis", "concessionnaire"], ["rac-mise-en-service-provisoire-enedis", "concessionnaire"],
  ["rac-raccordement-eau-potable", "concessionnaire"], ["ele-consuel-attestation-de-conformite", "controle"],
  ["etu-etude-assainissement-individuel-spanc", "etude"],
]);

/** Raison qui réserve ce poste du neuf aux pros (étiquette « Pro obligatoire · … »), ou `null`. */
export function raisonProNeuf(t: Tache): RaisonPro | null {
  return t.pro ?? PRO_PARTAGES_NEUF.get(t.id) ?? null;
}

/** « Je le fais » est-il POSSIBLE sur ce poste du neuf ? La règle commune, plus la table temporaire. */
export function peutFaireNeuf(l: Pick<Lot, "c">, t: Tache): boolean {
  return peutFaireSoiMeme(l, t) && !PRO_PARTAGES_NEUF.has(t.id);
}

/** « Je le fais » PAR DÉFAUT sur un poste du neuf, selon qui réalise : jamais là où ce n'est pas
 *  possible ; en « le maximum », tout sauf `PRO_PAR_DEFAUT_MAX` ; en « une partie », les lots de
 *  finition (`DIY_PARTIE`, le même choix qu'en rénovation). */
export function soiMemeNeuf(lot: string, qui: QuiRealise, t: Tache): boolean {
  if (!peutFaireNeuf({ c: lot }, t)) return false;
  if (qui === "max") return !PRO_PAR_DEFAUT_MAX.has(lot);
  return qui === "partie" && DIY_PARTIE.has(lot);
}

/**
 * Applique la description de la maison à une sélection.
 *
 * Sans `ancienne` (premier remplissage) : chaque poste que la description gouverne est coché ou
 * décoché. Avec `ancienne` (une réponse vient de changer) : SEULS les postes dont la décision a
 * changé entre les deux descriptions sont touchés. Ce que l'utilisateur a choisi ailleurs — un
 * parquet à la place du stratifié, un drain qu'il a ajouté, un chauffe-eau plus grand — survit
 * donc au changement d'une autre réponse. Un poste coché par la description décoche les autres
 * postes de son groupe exclusif (deux couvertures ne coexistent pas).
 *
 * Sur un poste qui reste coché, ce que l'utilisateur avait réglé (qui le fait, sa note, une
 * quantité corrigée, un prix) est gardé. Les options qu'aucune réponse ne gouverne (spots,
 * placards…) ne bougent jamais.
 */
export function appliquerMaison(maison: MaisonNeuve, sel: Selection, qui?: QuiRealise, ancienne?: MaisonNeuve): Selection {
  let out: Selection = { ...sel };
  const dec: Record<string, DecisionNeuf> = decisionsNeuf(maison);
  const avantDec: Record<string, DecisionNeuf> | null = ancienne ? decisionsNeuf(ancienne) : null;
  for (const [id, d] of Object.entries(dec)) {
    if (avantDec && JSON.stringify(avantDec[id] ?? null) === JSON.stringify(d)) continue; // décision inchangée
    const p = POSTE_NEUF.get(id);
    if (!p) continue;                                   // la garde de test signale un identifiant inconnu
    const k = key(p.c, p.n);
    const avant = out[k];
    if (!d.on) { if (avant?.on) out[k] = { ...avant, on: false }; continue; }
    const nouveau = !avant?.on;
    out = decocherExclusifs(out, id);
    out[k] = {
      ...(avant ?? {}), on: true,
      ...(nouveau && qui ? { self: soiMemeNeuf(p.c, qui, p.t) } : {}),
      ...(d.vsel ? { vsel: { ...(avant?.vsel ?? {}), ...d.vsel } } : {}),
      ...(d.tai ? { tai: d.tai } : {}),
    };
  }
  return out;
}

function decocherExclusifs(sel: Selection, id: string): Selection {
  const out: Selection = { ...sel };
  for (const autre of exclusifsDe(id)) {
    const q = POSTE_NEUF.get(autre);
    if (!q) continue;
    const ka = key(q.c, q.n);
    if (out[ka]?.on) out[ka] = { ...out[ka], on: false };
  }
  return out;
}

/** Coche (ou décoche) un poste du neuf à la main ; le cocher décoche les autres postes de son groupe exclusif. */
export function cocherPosteNeuf(sel: Selection, id: string, on: boolean, qui?: QuiRealise): Selection {
  const p = POSTE_NEUF.get(id);
  if (!p) return sel;
  const k = key(p.c, p.n);
  const base = on ? decocherExclusifs(sel, id) : { ...sel };
  base[k] = { ...(sel[k] ?? {}), on, ...(on && !sel[k] && qui ? { self: soiMemeNeuf(p.c, qui, p.t) } : {}) };
  return base;
}

export type RapideNeufInput = {
  surface: number; niveaux: Niveaux; codePostal: string; finition: Finition; qui: QuiRealise;
  garage?: boolean; assainissement?: "collectif" | "fosse";
};

/**
 * Mode rapide du neuf : 5 questions (+ garage, assainissement), le reste par défaut.
 *
 * `base` (facultatif) : une maison déjà décrite (plan importé, projet détaillé qu'on rouvre en
 * édition gratuite). Ses réponses servent de défauts ; les questions du rapide passent par-dessus.
 * Un garage déjà décrit garde sa surface quand la réponse reste « avec garage », un assainissement
 * déjà décrit (micro-station) reste tant que le rapide ne répond pas. Sans `base`, la sortie est
 * exactement celle d'avant (vérifié par test).
 */
export function presetNeuf(input: RapideNeufInput, base?: Partial<MaisonNeuve>): { ctx: Ctx; sel: Selection } {
  const surface = Math.max(30, input.surface || 0);
  const maison = maisonComplete({
    ...(base ?? {}),
    surface, niveaux: input.niveaux, garage: input.garage ? (base?.garage || 20) : 0,
    assainissement: input.assainissement ?? base?.assainissement ?? "collectif", codePostal: input.codePostal,
  });
  return presetMaison(maison, { finition: input.finition, qui: input.qui, codePostal: input.codePostal });
}

/** Mode détaillé : une description complète de la maison → ctx + sel (quantités automatiques). */
export function presetMaison(maison: Partial<MaisonNeuve>, opts: { finition?: Finition; qui?: QuiRealise; codePostal?: string; aleas?: number } = {}): { ctx: Ctx; sel: Selection } {
  const ctx = ctxNeuf(maison, opts);
  const sel = appliquerMaison(ctx.neuf as MaisonNeuve, {}, opts.qui ?? "pros");
  return { ctx, sel };
}
