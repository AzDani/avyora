/**
 * Témoin T5 — le moteur de la CONSTRUCTION NEUVE tel qu'il chiffre aujourd'hui (chantier N0).
 *
 * Référence : `tests/fixtures/moteur-neuf.json`, un scénario par ligne (voir `photo.ts`). Elle fige
 * l'état ACTUEL : les chantiers qui doivent changer un montant du neuf (N8, N12…) listent leurs
 * écarts dans leur compte rendu avant de la réécrire ; les autres la retrouvent au centime. N1
 * (« Je le fais » par poste) n'a changé aucun total par défaut : seuls les 18 catalogues cochés
 * `tout/…` ont bougé, parce qu'ils cochent aussi les 7 locations reprises de la rénovation.
 *
 * Grille :
 * - `rapide/…` : `presetNeuf` sur surface × niveaux × finition × qui × code postal × garage ×
 *   eaux usées (tout-à-l'égout, fosse, micro-station) — 2 592 maisons ;
 * - `maison/A|B|C/…` : les trois maisons de calage du neuf (`decisions.md`), par finition et par qui ;
 * - `tout/A|B|C/…` : tout le catalogue neuf coché, en « fait faire » puis en « je le fais » ;
 * - `n8/A|B/…` (chantier N8) : les réponses de la rénovation que le neuf chiffre désormais — une suite
 *   parentale, les autres pièces, des menuiseries saisies, une emprise mesurée, et les options à
 *   quantité automatique cochées à la main avec une double vasque et un bac 150×90.
 *
 * N8 n'a changé aucun des 2 637 scénarios d'avant : il a ajouté les 10 scénarios `n8/…`.
 *
 * Réécriture VOLONTAIRE (écarts listés dans le compte rendu du chantier) :
 *   TEMOINS_MAJ=1 CI=1 npx vitest run tests/temoins/moteur-neuf.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  CATALOG_NEUF, POSTE_NEUF, buildDevis, catalogueDe, ctxNeuf, key, presetMaison, presetNeuf,
  type Ctx, type Selection, type MaisonNeuve, type Niveaux, type QuiRealise, type Finition,
} from "@/lib/estimateur";
import { MAJ, comparer, ecartsDevis, lireReference, photoDevis, resume, verifier, type Photo } from "./photo";

const FICHIER = new URL("../fixtures/moteur-neuf.json", import.meta.url);
/** Un lot du neuf revient dans plusieurs phases : la colonne est le lot (corps d'état), toutes phases confondues. */
const LOTS = [...new Set(CATALOG_NEUF.map((l) => l.c))];

interface Scenario { cle: string; cree: () => { ctx: Ctx; sel: Selection } }

const FINITIONS: Finition[] = ["eco", "standard", "premium"];
const QUI: QuiRealise[] = ["pros", "partie", "max"];

/* Les maisons de calage (`docs/construction-neuve/decisions.md`, l.3 ; `calibre.mjs`). */
const BASE: Partial<MaisonNeuve> = {
  forme: "rect", murs: "parpaing", plancherBas: "terre-plein", toiture: "2pans", couverture: "terre-cuite", chauffage: "pac-eau", vmc: "simple",
  assainissement: "collectif", eauxPluviales: "infiltration", distanceReseaux: 15, terrain: "plat", argile: "non", sismique: 1, codePostal: "45000",
  escalier: "bois", lotissement: false, borne: true, pilotage: "moi", gouttiere: "zinc",
};
const MAISONS: Record<"A" | "B" | "C", Partial<MaisonNeuve>> = {
  A: { ...BASE, surface: 100, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0 },                  // plain-pied 100 m²
  B: { ...BASE, surface: 120, niveaux: "etage", chambres: 4, sdb: 2, wc: 2, garage: 20 },              // à étage 120 m² + garage
  C: { ...BASE, surface: 90, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0, murs: "ossature" }, // ossature bois 90 m²
};

/** Les options à quantité automatique depuis N8, cochées comme à la main (sans quantité), et les variantes de sanitaires. */
function avecOptions(p: { ctx: Ctx; sel: Selection }): { ctx: Ctx; sel: Selection } {
  const sel: Selection = { ...p.sel };
  for (const id of ["ele-spots-encastres-led", "plo-robinetterie-baignoire", "rev-moquette", "rev-beton-cire-resine"]) {
    const x = POSTE_NEUF.get(id)!;
    sel[key(x.c, x.n)] = { on: true };
  }
  sel[key("Plomberie", "Meuble-vasque")] = { ...sel[key("Plomberie", "Meuble-vasque")], on: true, vsel: { config: "double" } };
  sel[key("Plomberie", "Bac de douche")] = { ...sel[key("Plomberie", "Bac de douche")], on: true, vsel: { dim: "150x90" } };
  return { ctx: p.ctx, sel };
}

function grille(): Scenario[] {
  const out: Scenario[] = [];
  for (const surface of [80, 100, 120, 160])
    for (const niveaux of ["pp", "etage", "combles"] as Niveaux[])
      for (const finition of FINITIONS)
        for (const qui of QUI)
          for (const cp of ["33620", "75011", "23000", ""])
            for (const garage of [false, true])
              for (const eu of ["collectif", "fosse", "micro"] as const)
                out.push({
                  cle: `rapide/${surface}/${niveaux}/${finition}/${qui}/${cp}/${garage ? "garage" : "sans-garage"}/${eu}`,
                  // Le rapide ne pose que « tout-à-l'égout » ou « fosse » : la micro-station vient d'une maison déjà décrite.
                  cree: () => eu === "micro"
                    ? presetNeuf({ surface, niveaux, codePostal: cp, finition, qui, garage }, { assainissement: "micro" })
                    : presetNeuf({ surface, niveaux, codePostal: cp, finition, qui, garage, assainissement: eu }),
                });
  for (const [k, m] of Object.entries(MAISONS))
    for (const finition of FINITIONS)
      for (const qui of QUI)
        out.push({ cle: `maison/${k}/${finition}/${qui}`, cree: () => presetMaison(m, { finition, qui, codePostal: "45000" }) });
  for (const [k, m] of Object.entries(MAISONS))
    for (const self of [false, true])
      for (const finition of FINITIONS)
        out.push({
          cle: `tout/${k}/${self ? "je-le-fais" : "fait-faire"}/${finition}`,
          cree: () => {
            const sel: Selection = {};
            for (const l of CATALOG_NEUF) for (const t of l.t) sel[key(l.c, t.n)] = { on: true, self, qty: 3 };
            return { ctx: ctxNeuf(m, { finition, codePostal: "45000" }), sel };
          },
        });
  for (const k of ["A", "B"] as const) {
    const m = MAISONS[k];
    const avec = (o: Partial<MaisonNeuve>) => () => presetMaison({ ...m, ...o }, { codePostal: "45000" });
    const ch = m.chambres ?? 3, sdb = m.sdb ?? 1;
    out.push({ cle: `n8/${k}/suite`, cree: avec({ chambres: ch - 1, suites: 1, sdb: sdb - 1 }) });
    out.push({ cle: `n8/${k}/pieces`, cree: avec({ couloir: 2, buanderie: 1 }) });
    out.push({ cle: `n8/${k}/menuiseries`, cree: avec({ menuiseries: 14 }) });
    out.push({ cle: `n8/${k}/emprise`, cree: avec({ emprise: k === "A" ? 110 : 66 }) });
    out.push({ cle: `n8/${k}/options`, cree: () => avecOptions(presetMaison(m, { codePostal: "45000" })) });
  }
  return out;
}

const GRILLE = grille();
const photo = (s: Scenario): Photo => {
  const { ctx, sel } = s.cree();
  return photoDevis(buildDevis(catalogueDe(ctx), ctx, sel), LOTS);
};

describe("T5 · moteur neuf", () => {
  it("la grille compte 2 592 maisons du rapide, 27 maisons de calage, 18 catalogues cochés et 10 maisons N8", () => {
    expect(GRILLE.length).toBe(2592 + 27 + 18 + 10);
    expect(new Set(GRILLE.map((s) => s.cle)).size).toBe(GRILLE.length);
  });

  it("chaque scénario sort exactement les montants de la référence", () => {
    const scenarios = Object.fromEntries(GRILLE.map((s) => [s.cle, photo(s)]));
    const ecarts = verifier(FICHIER, { temoin: "T5 — moteur neuf (tests/temoins/moteur-neuf.test.ts)", colonnes: LOTS, scenarios }, ecartsDevis);
    expect(ecarts.length, resume(ecarts, FICHIER)).toBe(0);
  }, 180_000);

  it.skipIf(MAJ)("un prix du neuf augmenté d'un euro en mémoire fait échouer la comparaison", () => {
    const ref = lireReference(FICHIER);
    const t = POSTE_NEUF.get("fon-dalle-terre-plein-isolee")!.t;
    const cles = GRILLE.filter((s) => !s.cle.startsWith("rapide/")).map((s) => s.cle);
    const fp = t.fp;
    t.fp = (fp ?? 0) + 1;
    try {
      const scenarios = Object.fromEntries(cles.map((cle) => [cle, photo(GRILLE.find((s) => s.cle === cle)!)]));
      const ecarts = comparer({ ...ref, scenarios: Object.fromEntries(cles.map((c) => [c, ref.scenarios[c]])) }, { ...ref, scenarios }, ecartsDevis);
      expect(ecarts.some((e) => e.startsWith("maison/A/standard/pros · lot « Fondations & soubassement » HT"))).toBe(true);
    } finally {
      t.fp = fp;
    }
  }, 60_000);
});
