/**
 * CONSTRUCTION NEUVE — du questionnaire au chiffrage.
 *
 * Comme `presetRapide` pour la rénovation : une description de maison devient `ctx + sel`, envoyés
 * au MÊME moteur (`buildDevis(catalogueDe(ctx), ctx, sel)`). Le mode rapide (5 questions) et le
 * mode détaillé passent par les mêmes règles : une maison décrite pareil coûte pareil.
 */
import { key, type Ctx, type Selection, type Finition, type Tache } from "./core";
import { POSTE_NEUF } from "./catalogue-neuf";
import { maisonComplete, geometrieNeuf, decisionsNeuf, exclusifsDe, type MaisonNeuve, type DecisionNeuf } from "./neuf";
import type { QuiRealise } from "./presets";

/** Lots qu'un particulier fait couramment lui-même sur une maison neuve (« une partie »). */
export const DIY_PARTIE_NEUF = new Set(["Peinture", "Carrelage / Revetements", "Cloisons / Platrerie", "Isolation"]);
/** Lots qu'on ne fait jamais soi-même : démarches, études, assurances, taxes, branchements, contrôles. */
const JAMAIS_SOI_MEME = new Set(["Etudes / Conception", "Assurance & ouverture du chantier", "Taxes & participations", "Raccordements aux réseaux", "Contrôles & réception", "Location de matériel"]);

/** Contexte moteur d'une construction neuve. */
export function ctxNeuf(maison: Partial<MaisonNeuve>, opts: { finition?: Finition; codePostal?: string; aleas?: number } = {}): Ctx {
  const cp = opts.codePostal ?? maison.codePostal ?? "";
  const h = maisonComplete({ ...maison, codePostal: cp });
  const g = geometrieNeuf(h);
  return {
    surface: Math.round(h.surface), surfaceSol: Math.round(g.E), surfaceSolManual: true,
    niveaux: h.niveaux === "pp" ? 1 : 2, type: "Maison", hauteur: 2.5,
    pieces: g.piecesEff, fenetres: g.nFen + g.nPF + g.nBaie, sdb: h.sdb, wc: h.wc,
    sejour: 1, cuisine: 1, chambres: h.chambres, suites: 0, couloir: 1, buanderie: 0,
    budget: 0, aleas: opts.aleas ?? 7, finition: opts.finition ?? "standard", fiscal: "pro", codePostal: cp,
    nature: "neuf", neuf: h,
  };
}

/* « Le maximum » en neuf n'est pas « tout » : la structure, le clos-couvert, les branchements et la
   pompe à chaleur restent aux artisans (garanties décennales, assurance dommages-ouvrage, matériel).
   C'est ce qui ramène l'auto-construction dans les prix constatés (1 200 à 1 600 €/m²). */
const PRO_TOUJOURS = new Set(["Terrassement", "Fondations & soubassement", "Maçonnerie", "Charpente, couverture & structure bois",
  "Couverture & zinguerie", "Menuiseries exterieures"]);
/* Une pompe à chaleur, air/eau ou air/air, manipule des fluides frigorigènes : réservé à un
   professionnel qui a l'attestation de capacité. */
const PAC = new Set(["cha-pompe-a-chaleur-air-eau", "cha-climatisation-gainable-reversible", "cha-climatisation-reversible-split"]);

/** « Je le fais » sur un poste du neuf, selon qui réalise. Une prestation pure (pas de prix de
 *  fourniture : échafaudage, étude, contrôle) ou une location (le prix est le même qu'on la
 *  « fasse » ou non : WC de chantier) ne se fait jamais soi-même. */
export function soiMemeNeuf(lot: string, qui: QuiRealise, id?: string, t?: Tache): boolean {
  if (JAMAIS_SOI_MEME.has(lot)) return false;
  if (t && (t.sm == null || t.frais || t.u === "pct" || t.sm >= (t.fp ?? 0))) return false;
  if (qui === "max") return !PRO_TOUJOURS.has(lot) && !(id && PAC.has(id));
  return qui === "partie" && DIY_PARTIE_NEUF.has(lot);
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
      ...(nouveau && qui ? { self: soiMemeNeuf(p.c, qui, id, p.t) } : {}),
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
  base[k] = { ...(sel[k] ?? {}), on, ...(on && !sel[k] && qui ? { self: soiMemeNeuf(p.c, qui, id, p.t) } : {}) };
  return base;
}

export type RapideNeufInput = {
  surface: number; niveaux: "pp" | "etage"; codePostal: string; finition: Finition; qui: QuiRealise;
  garage?: boolean; assainissement?: "collectif" | "fosse";
};

/** Mode rapide du neuf : 5 questions (+ garage, assainissement), le reste par défaut. */
export function presetNeuf(input: RapideNeufInput): { ctx: Ctx; sel: Selection } {
  const surface = Math.max(30, input.surface || 0);
  const maison = maisonComplete({
    surface, niveaux: input.niveaux, garage: input.garage ? 20 : 0,
    assainissement: input.assainissement ?? "collectif", codePostal: input.codePostal,
  });
  return presetMaison(maison, { finition: input.finition, qui: input.qui, codePostal: input.codePostal });
}

/** Mode détaillé : une description complète de la maison → ctx + sel (quantités automatiques). */
export function presetMaison(maison: Partial<MaisonNeuve>, opts: { finition?: Finition; qui?: QuiRealise; codePostal?: string; aleas?: number } = {}): { ctx: Ctx; sel: Selection } {
  const ctx = ctxNeuf(maison, opts);
  const sel = appliquerMaison(ctx.neuf as MaisonNeuve, {}, opts.qui ?? "pros");
  return { ctx, sel };
}
