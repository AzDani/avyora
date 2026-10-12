/**
 * Témoin T1 — le moteur de la RÉNOVATION ne bouge pas (chantier N0 de la revue rénovation / neuf).
 *
 * Référence : `tests/fixtures/moteur-reno.json`, un scénario par ligne (voir `photo.ts`).
 *
 * La grille reprend, clé pour clé, les 3 336 scénarios de l'outil de session `photo-reno.mts`
 * (rapide : type × ampleur × qui × finition × code postal × surface ; pièces ; tout le catalogue
 * coché). La référence a été vérifiée identique à `avant.json` (même total, même bilan, même
 * empreinte de lignes sur les 3 336). Trois familles la complètent, parce que la grille de session
 * ne voyait ni les planchers d'étage, ni les options non choisies par défaut, ni la plupart des
 * départements :
 * - `tout-etage/…` : tout le catalogue coché sur une maison à étage (80 m² sur 45 m² au sol) ;
 * - `variante/…` : chaque option de chaque poste (dimension, matériau, vitrage, motorisation,
 *   taille, case de grille), une ligne en « fait faire » ;
 * - `region/…` : un poste à fourniture et main-d'œuvre dans chaque département et outre-mer.
 *
 * La deuxième partie MUTE en mémoire (jamais `catalog.json`) chaque prix du catalogue rénovation,
 * chaque option de variante, puis les coefficients de matériau, de vitrage, de motorisation et de
 * finition, et exige qu'au moins un scénario le voie bouger : la référence couvre donc tout montant
 * de la rénovation (le barème régional, interne au moteur, est couvert par la famille `region/…`).
 * Aucun écart n'est admis sur ce témoin sans décision de Dani.
 *
 * Réécriture VOLONTAIRE (après décision, écarts listés dans le compte rendu) :
 *   TEMOINS_MAJ=1 CI=1 npx vitest run tests/temoins/moteur-reno.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  CATALOG, LOT_FIN, MAT_COEF, VIT_COEF, MOT_COEF, buildDevis, defaultCtx, key, isLoc, presetRapide, presetPieces,
  type Ctx, type Selection, type LigneSel, type Tache, type TypeBien, type Ampleur, type QuiRealise, type Finition, type PieceKey,
} from "@/lib/estimateur";
import { MAJ, comparer, ecartsDevis, lireReference, photoDevis, r2, resume, verifier, type Photo, type Reference } from "./photo";

const FICHIER = new URL("../fixtures/moteur-reno.json", import.meta.url);
const LOTS = CATALOG.map((l) => l.c);

interface Scenario { cle: string; cree: () => { ctx: Ctx; sel: Selection } }

/* ── La grille ─────────────────────────────────────────────────────────────── */

/** Les 3 336 scénarios de `photo-reno.mts`, dans le même ordre et sous les mêmes clés. */
function grilleSession(): Scenario[] {
  const out: Scenario[] = [];
  for (const type of ["Studio", "T2", "T3", "T4", "Maison"] as TypeBien[])
    for (const ampleur of ["rafraich", "partielle", "complete", "lourde"] as Ampleur[])
      for (const qui of ["pros", "partie", "max"] as QuiRealise[])
        for (const finition of ["eco", "standard", "premium"] as Finition[])
          for (const cp of ["33620", "75011", "23000", "97200", "20000", ""])
            for (const surface of [35, 80, 145])
              out.push({ cle: `rapide/${type}/${ampleur}/${qui}/${finition}/${cp}/${surface}`, cree: () => presetRapide({ type, surface, codePostal: cp, ampleur, finition, qui }) });
  for (const room of ["cuisine", "sdb", "chambre", "salon", "suite", "buanderie"] as PieceKey[])
    for (const ampleur of ["rafraich", "partielle", "complete", "lourde"] as Ampleur[])
      for (const qui of ["pros", "partie", "max"] as QuiRealise[])
        out.push({ cle: `pieces/${room}/${ampleur}/${qui}`, cree: () => presetPieces([{ room, surface: 12 }, { room: "sdb", surface: 5 }], ampleur, "standard", qui, "69001") });
  /* Tout le catalogue coché, quantités auto, fait-faire puis je-fais, deux régimes de TVA. */
  for (const type of ["Maison", "T3"] as TypeBien[])
    for (const fiscal of ["habitation", "pro"] as const)
      for (const self of [false, true])
        for (const finition of ["eco", "standard", "premium"] as Finition[])
          out.push({ cle: `tout/${type}/${fiscal}/${self}/${finition}`, cree: () => ({ ctx: { ...defaultCtx(), type, fiscal, finition, codePostal: "13001" }, sel: toutCoche(self) }) });
  return out;
}

/** Chaque choix possible d'un poste : options de variantes (toutes les cases d'une grille), matériau, vitrage, motorisation, taille. */
function choixDu(t: Tache): Array<[string, LigneSel]> {
  const out: Array<[string, LigneSel]> = [];
  const dims: string[] = t.grid ? t.grid.dims : [];
  const opts = (k: string) => t.vars?.find((g) => g.k === k)?.opts.map((o) => o.k) ?? [];
  if (t.grid) {
    const [da, db] = t.grid.dims;
    for (const a of opts(da)) for (const b of opts(db)) out.push([`${da}=${a},${db}=${b}`, { vsel: { [da]: a, [db]: b } }]);
  }
  for (const g of t.vars ?? []) if (!dims.includes(g.k)) for (const o of g.opts) out.push([`${g.k}=${o.k}`, { vsel: { [g.k]: o.k } }]);
  if (t.mat) for (const mat of ["pvc", "alu", "bois"] as const) out.push([`mat=${mat}`, { mat }]);
  if (t.vitrage) for (const vit of ["double", "triple"] as const) out.push([`vit=${vit}`, { vit }]);
  if (t.moto) for (const mot of ["manuel", "motorise"] as const) out.push([`mot=${mot}`, { mot }]);
  if (t.taille) for (const tai of ["petit", "grand"] as const) out.push([`tai=${tai}`, { tai }]);
  return out;
}

/** Tout le catalogue coché (même sélection que `tout/…`). */
function toutCoche(self: boolean): Selection {
  const sel: Selection = {};
  for (const l of CATALOG) for (const t of l.t) sel[key(l.c, t.n)] = { on: true, self, qty: 3 };
  return sel;
}

/** Compléments : une maison à étage, chaque option de chaque poste, puis chaque département. */
function grilleComplements(): Scenario[] {
  const out: Scenario[] = [];
  /* Dans `tout/…` la surface au sol égale la surface habitable : les planchers d'étage créés
     (quantité = habitable − sol) y valent 0. Une maison de 80 m² sur 45 m² au sol les chiffre. */
  for (const self of [false, true])
    out.push({ cle: `tout-etage/Maison/habitation/${self}/standard`, cree: () => ({ ctx: { ...defaultCtx(), niveaux: 2, surfaceSol: 45, surfaceSolManual: true, codePostal: "13001" }, sel: toutCoche(self) }) });
  for (const l of CATALOG) for (const t of l.t) for (const [nom, choix] of choixDu(t))
    out.push({ cle: `variante/${t.id}/${nom}`, cree: () => ({ ctx: defaultCtx(), sel: { [key(l.c, t.n)]: { on: true, qty: 3, ...choix } } }) });
  const deps = [...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, "0") + "000"), ...["971", "972", "973", "974", "975", "976"].map((d) => d + "00")];
  for (const cp of deps)
    out.push({ cle: `region/${cp}`, cree: () => ({ ctx: { ...defaultCtx(), codePostal: cp }, sel: { [key("Peinture", "Peinture des murs")]: { on: true } } }) });
  return out;
}

const SESSION = grilleSession();
const GRILLE = [...SESSION, ...grilleComplements()];
const PAR_CLE = new Map(GRILLE.map((s) => [s.cle, s]));

const photo = (s: Scenario): Photo => {
  const { ctx, sel } = s.cree();
  return photoDevis(buildDevis(CATALOG, ctx, sel), LOTS);
};

/* ── 1. La photo d'aujourd'hui est la référence ────────────────────────────── */

describe("T1 · moteur rénovation", () => {
  it("la grille de session compte toujours 3 336 scénarios, sans doublon de clé", () => {
    expect(SESSION.length).toBe(3336);
    expect(PAR_CLE.size).toBe(GRILLE.length);
  });

  it("chaque scénario sort exactement les montants de la référence", () => {
    const scenarios = Object.fromEntries(GRILLE.map((s) => [s.cle, photo(s)]));
    const ecarts = verifier(FICHIER, { temoin: "T1 — moteur rénovation (tests/temoins/moteur-reno.test.ts)", colonnes: LOTS, scenarios }, ecartsDevis);
    expect(ecarts.length, resume(ecarts, FICHIER)).toBe(0);
  }, 60_000);
});

/* ── 2. Le témoin mord : tout montant de la rénovation est vu ─────────────── */

describe("T1 · le témoin voit chaque montant de la rénovation", () => {
  // Lue au premier test et non à la collecte : avec TEMOINS_MAJ=1, la référence vient d'être réécrite.
  let lue: Reference | undefined;
  const reference = () => (lue ??= lireReference(FICHIER));
  const TOUT = ["false", "true"].flatMap((self) => [`tout/Maison/habitation/${self}/standard`, `tout-etage/Maison/habitation/${self}/standard`]);
  const TOUTES = GRILLE.map((s) => s.cle);
  /** Un des scénarios a-t-il bougé ? Les scénarios ciblés d'abord, toute la grille sinon. */
  const bouge = (cibles: string[]): boolean => {
    const ref = reference();
    const vus = (cles: string[]) => cles.some((cle) => ecartsDevis(cle, ref.scenarios[cle], photo(PAR_CLE.get(cle)!), ref.colonnes, LOTS).length > 0);
    return vus(cibles) || vus(TOUTES);
  };
  /** Change une valeur en mémoire le temps d'une vérification, puis la remet. */
  const muter = <T extends object>(o: T, k: keyof T, delta: number, cibles: string[]): boolean => {
    const avant = o[k];
    (o as Record<keyof T, unknown>)[k] = (avant as number) + delta;
    try { return bouge(cibles); } finally { (o as Record<keyof T, unknown>)[k] = avant; }
  };

  it.skipIf(MAJ)("un prix augmenté d'un euro en mémoire fait échouer la comparaison", () => {
    const ref = reference();
    const t = CATALOG.find((l) => l.c === "Peinture")!.t.find((x) => x.n === "Peinture des murs")!;
    const fp = t.fp;
    t.fp = (fp ?? 0) + 1;
    try {
      const scenarios = Object.fromEntries(GRILLE.map((s) => [s.cle, photo(s)]));
      const ecarts = comparer(ref, { ...ref, scenarios }, ecartsDevis);
      expect(ecarts.length).toBeGreaterThan(100);
      // 80 m² × 2,5 m de murs = 200 m² ; département 45 = moyenne nationale : +200 € HT sur le lot.
      const avant = (ref.scenarios["region/45000"][11] as number[])[LOTS.indexOf("Peinture")];
      expect(ecarts).toContain(`region/45000 · lot « Peinture » HT : ${avant} → ${r2(avant + 200)}`);
    } finally {
      t.fp = fp;
    }
    expect(photo(PAR_CLE.get("region/45000")!)).toEqual(ref.scenarios["region/45000"]); // rien ne fuit
  }, 60_000);

  it.skipIf(MAJ)("chaque prix et chaque option du catalogue rénovation : un euro de plus se voit", () => {
    const invisibles: string[] = [];
    for (const l of CATALOG) for (const t of l.t) {
      const cibles = [...TOUTES.filter((c) => c.startsWith(`variante/${t.id}/`)), ...TOUT];
      const voir = (quoi: string, ok: boolean) => { if (!ok) invisibles.push(`${t.id} · ${quoi}`); };
      if (t.grid) {
        // Avec une grille, ce sont ses cases qui portent le prix (fp/sm du poste ne sont pas lus).
        for (const [combo, p] of Object.entries(t.grid.prices)) {
          voir(`grille ${combo} fp`, muter(p, "fp", 1, cibles));
          voir(`grille ${combo} sm`, muter(p, "sm", 1, cibles));
        }
      } else {
        voir("fp", muter(t, "fp", 1, cibles));
        // Une location se paie au prix posé : sa fourniture `sm` n'entre dans aucun montant.
        if (t.sm != null && !isLoc(l.c)) voir("sm", muter(t, "sm", 1, cibles));
      }
      for (const g of t.vars ?? []) for (const o of g.opts) {
        if (!t.grid) voir(`option ${g.k}=${o.k} coef`, muter(o, "coef", 0.5, cibles));
        if (o.tva != null) voir(`option ${g.k}=${o.k} TVA`, muter(o, "tva", 1, cibles));
      }
      if (t.matPvc != null) voir("matPvc", muter(t, "matPvc", 0.1, cibles));
      if (t.taillePetit != null) voir("taillePetit", muter(t, "taillePetit", 0.1, cibles));
    }
    expect(invisibles).toEqual([]);
  }, 120_000);

  it.skipIf(MAJ)("chaque coefficient de matériau, de vitrage, de motorisation et de finition se voit", () => {
    const variantes = GRILLE.map((s) => s.cle).filter((c) => c.startsWith("variante/"));
    const tout = GRILLE.map((s) => s.cle).filter((c) => c.startsWith("tout/"));
    const invisibles: string[] = [];
    for (const [nom, table] of [["MAT_COEF", MAT_COEF], ["VIT_COEF", VIT_COEF], ["MOT_COEF", MOT_COEF]] as const)
      for (const k of Object.keys(table)) if (!muter(table, k, 0.1, variantes)) invisibles.push(`${nom}.${k}`);
    // Les barèmes de finition sont partagés entre lots (même objet) : on mute chaque barème une fois.
    for (const bareme of new Set(Object.values(LOT_FIN))) for (const f of ["eco", "standard", "premium"] as Finition[])
      if (!muter(bareme, f, 0.05, tout)) invisibles.push(`LOT_FIN (${Object.keys(LOT_FIN).filter((c) => LOT_FIN[c] === bareme).join(", ")}).${f}`);
    expect(invisibles).toEqual([]);
  }, 120_000);
});
