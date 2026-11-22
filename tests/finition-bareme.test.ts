/**
 * Barème de finition « marqué » (décision de Dani du 22/11/2026).
 *
 * Avant : seule la fourniture variait, le premium était le prix du catalogue et les équipements à options
 * (WC, douche, fenêtres, parquet) ne bougeaient pas. Une salle de bain ne variait que de 5 % entre l'éco et
 * le premium. Depuis :
 * - le STANDARD est le point fixe : aucun prix standard n'a bougé ;
 * - la finition agit sur la fourniture ET sur la pose, fort sur les lots de finition, faible sur le technique,
 *   nulle sur le gros œuvre, les études et les démarches ;
 * - les équipements à options suivent un barème à eux ; une menuiserie à matériau passe à l'alu en premium ;
 * - la construction neuve lit le même barème (plus d'écart doublé sur son éco).
 *
 * Même jour : la rénovation électrique complète comprend le tableau (le rapide ne le compte plus en plus).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  CATALOG, CATALOG_NEUF, LOT_FIN, FINCO, FIN_EQUIPEMENT, FIN_TECHNIQUE, FIN_MATERIAU, baremeDe, finCoefTask, finCoefMO,
  buildDevis, bilan, catalogueDe, defaultCtx, key, lineHT, presetNeuf, presetRapide, presetPieces, totals,
  type Bareme, type Ctx, type Finition, type Lot, type Selection, type Tache,
} from "@/lib/estimateur";

const FS: Finition[] = ["eco", "standard", "premium"];
const lot = (c: string): Lot => CATALOG.find((l) => l.c === c)!;
const poste = (c: string, n: string): Tache => lot(c).t.find((t) => t.n === n)!;
const ctxDe = (finition: Finition): Ctx => ({ ...defaultCtx(), finition });
/** HT d'une unité du poste, « Fait faire », moyenne nationale. */
const pu = (c: string, n: string, finition: Finition, self = false): number =>
  lineHT(ctxDe(finition), { [key(c, n)]: { on: true, manual: true, qty: 1, self } } as Selection, lot(c), poste(c, n));
/** Écart relatif d'un barème au standard, en % arrondi (−35, +80…). */
const pct = (b: Bareme, part: "four" | "mo", f: Finition): number => Math.round((b[part][f] / b[part].standard - 1) * 100);

describe("le standard est le point fixe", () => {
  it("tout poste, des deux catalogues : la pose du standard vaut 1, sa fourniture garde le coefficient d'avant", () => {
    for (const cat of [CATALOG, CATALOG_NEUF]) for (const l of cat) for (const t of l.t) {
      const b = baremeDe(l, t);
      expect(b.mo.standard, t.n).toBe(1);
      expect([1, 0.88, 0.83, 0.78], t.n).toContain(b.four.standard);
      // Un poste que la finition ne touchait pas (prix fixe, variante qui fait le prix) reste à 1 en standard.
      if (t.fixe || t.mat || t.vitrage || t.moto || t.taille || t.grid) expect(b.four.standard, t.n).toBe(1);
    }
  });

  it("l'éco ne dépasse jamais le standard, le premium ne passe jamais dessous (fourniture et pose)", () => {
    for (const b of [...new Set(Object.values(LOT_FIN)), FINCO, FIN_EQUIPEMENT, FIN_TECHNIQUE, FIN_MATERIAU]) for (const part of ["four", "mo"] as const) {
      expect(b[part].eco).toBeLessThanOrEqual(b[part].standard);
      expect(b[part].premium).toBeGreaterThanOrEqual(b[part].standard);
    }
  });
});

describe("les écarts du barème marqué", () => {
  const cas: [string, Bareme, [number, number], [number, number]][] = [
    ["Maçonnerie (faible)", LOT_FIN["Maçonnerie"], [-10, 20], [-3, 8]],
    ["Plomberie (moyen)", LOT_FIN["Plomberie"], [-20, 45], [-8, 15]],
    ["Carrelage (fort)", LOT_FIN["Carrelage / Revetements"], [-35, 80], [-12, 30]],
    ["Lot inconnu = fort", FINCO, [-35, 80], [-12, 30]],
    ["Équipement visible", FIN_EQUIPEMENT, [-25, 70], [0, 15]],
    ["Équipement technique", FIN_TECHNIQUE, [-10, 20], [-3, 8]],
    ["Menuiserie à matériau", FIN_MATERIAU, [-25, 0], [0, 0]],
    ["Études (aucun)", LOT_FIN["Etudes / Conception"], [0, 0], [0, 0]],
  ];
  for (const [nom, b, four, mo] of cas) {
    it(`${nom} : fourniture ${four[0]} % / +${four[1]} %, pose ${mo[0]} % / +${mo[1]} %`, () => {
      expect([pct(b, "four", "eco"), pct(b, "four", "premium")]).toEqual(four);
      expect([pct(b, "mo", "eco"), pct(b, "mo", "premium")]).toEqual(mo);
    });
  }

  it("les mêmes lots partagent le même barème ; la couverture garde l'écart moyen dans le lot charpente", () => {
    expect(LOT_FIN["Peinture"]).toBe(LOT_FIN["Cuisine"]);
    expect(LOT_FIN["Electricite"]).toBe(LOT_FIN["Maçonnerie"]);
    const cha = lot("Charpente, couverture & structure bois");
    expect(baremeDe(cha, cha.t.find((t) => t.n === "Gouttières & descentes")!)).toBe(LOT_FIN["Façade"]);
    expect(baremeDe(cha, cha.t.find((t) => t.n === "Charpente traditionnelle (hors couverture)")!)).toBe(LOT_FIN["Maçonnerie"]);
  });
});

describe("quel barème pour quel poste", () => {
  it("un WC, une baie vitrée, un parquet : l'équipement visible", () => {
    for (const [c, n] of [["Plomberie", "WC"], ["Menuiseries exterieures", "Baie vitrée"], ["Carrelage / Revetements", "Parquet bois"], ["Cuisine", "Plan de travail seul"]])
      expect(baremeDe(lot(c), poste(c, n)), n).toBe(FIN_EQUIPEMENT);
  });
  it("un chauffe-eau, une VMC, un plancher chauffant : l'équipement technique", () => {
    for (const [c, n] of [["Plomberie", "Chauffe-eau thermodynamique"], ["Chauffage / VMC", "Ventilation (VMC)"], ["Chauffage / VMC", "Plancher chauffant"]])
      expect(baremeDe(lot(c), poste(c, n)), n).toBe(FIN_TECHNIQUE);
  });
  it("une fenêtre, une porte d'entrée, un volet : la menuiserie à matériau", () => {
    for (const n of ["Fenêtres", "Porte d'entrée", "Volets roulants"]) expect(baremeDe(lot("Menuiseries exterieures"), poste("Menuiseries exterieures", n)), n).toBe(FIN_MATERIAU);
  });
  it("un prix fixe et un lot sans écart ne bougent pas", () => {
    for (const [c, n] of [["Plomberie", "Cabine complète (parois + porte)"], ["Menuiseries exterieures", "Moustiquaires"], ["Démolition", "Abattre une cloison"]])
      for (const f of FS) {
        expect(finCoefTask(ctxDe(f), lot(c), poste(c, n)), n).toBe(1);
        expect(finCoefMO(ctxDe(f), lot(c), poste(c, n)), n).toBe(1);
      }
  });
  it("une variante neutre (porte coulissante en applique ou à galandage) garde le barème de son lot", () => {
    expect(baremeDe(lot("Menuiseries interieures"), poste("Menuiseries interieures", "Porte intérieure coulissante"))).toBe(LOT_FIN["Menuiseries interieures"]);
  });
});

describe("le prix d'un poste, niveau par niveau", () => {
  it("carrelage au sol (85 € posé dont 36 € de fourniture) : 61,37 / 77,08 / 114,24 € HT le m²", () => {
    expect(pu("Carrelage / Revetements", "Carrelage au sol", "eco")).toBeCloseTo(36 * 0.507 + 49 * 0.88, 6);
    expect(pu("Carrelage / Revetements", "Carrelage au sol", "standard")).toBeCloseTo(36 * 0.78 + 49, 6);
    expect(pu("Carrelage / Revetements", "Carrelage au sol", "premium")).toBeCloseTo(36 * 1.404 + 49 * 1.3, 6);
  });
  it("WC (410 € posé dont 280 € de fourniture) : la gamme agit enfin, 340 / 410 / 625,50 € HT", () => {
    expect(pu("Plomberie", "WC", "eco")).toBeCloseTo(280 * 0.75 + 130, 6);
    expect(pu("Plomberie", "WC", "standard")).toBe(410);
    expect(pu("Plomberie", "WC", "premium")).toBeCloseTo(280 * 1.7 + 130 * 1.15, 6);
  });
  it("fenêtre : PVC en éco et en standard, alu en premium sans rien de plus", () => {
    expect(pu("Menuiseries exterieures", "Fenêtres", "standard")).toBe(570);                      // 950 × 0,60
    expect(pu("Menuiseries exterieures", "Fenêtres", "eco")).toBeCloseTo(420 * 0.75 + 150, 6);    // fourniture PVC −25 %
    expect(pu("Menuiseries exterieures", "Fenêtres", "premium")).toBe(950);                       // l'alu du catalogue
  });
  it("une prestation sans fourniture (une étude, une dépose) ne bouge pas", () => {
    for (const f of FS) expect(pu("Etudes / Conception", "Plans du projet", f)).toBe(pu("Etudes / Conception", "Plans du projet", "standard"));
  });
  it("« Je le fais » : la fourniture au niveau choisi ; l'économie affichée est la pose de ce niveau", () => {
    expect(pu("Peinture", "Peinture des murs", "premium", true)).toBeGreaterThan(pu("Peinture", "Peinture des murs", "standard", true));
    const t = poste("Peinture", "Peinture des murs");
    const sel = { [key("Peinture", t.n)]: { on: true, manual: true, qty: 10, self: true } } as Selection;
    const eco = (f: Finition) => bilan(CATALOG, ctxDe(f), sel).eco;
    expect(eco("standard")).toBeCloseTo((t.fp! - t.sm!) * 10, 6);
    expect(eco("premium")).toBeCloseTo((t.fp! - t.sm!) * 1.3 * 10, 6);
    expect(eco("eco")).toBeCloseTo((t.fp! - t.sm!) * 0.88 * 10, 6);
  });
  it("le bilan (fourniture + pose) redonne le montant de la ligne à chaque niveau", () => {
    const c = "Carrelage / Revetements", n = "Carrelage au sol";
    const sel = { [key(c, n)]: { on: true, manual: true, qty: 20 } } as Selection;
    for (const f of FS) {
      const b = bilan(CATALOG, ctxDe(f), sel);
      expect(b.matA + b.moA).toBeCloseTo(lineHT(ctxDe(f), sel, lot(c), poste(c, n)), 6);
    }
  });
});

describe("l'effet sur un projet entier", () => {
  const ecart = (mk: (f: Finition) => { ctx: Ctx; sel: Selection }): [number, number] => {
    const [e, s, p] = FS.map((f) => { const { ctx, sel } = mk(f); return totals(catalogueDe(ctx), ctx, sel).ttc; });
    return [(e / s - 1) * 100, (p / s - 1) * 100];
  };
  it("rénovation complète d'un T3 de 65 m² : éco ≈ −13 %, premium ≈ +32 % (les chiffres de la méthodologie)", () => {
    const [e, p] = ecart((f) => presetRapide({ type: "T3", surface: 65, codePostal: "", ampleur: "complete", finition: f, qui: "pros" }));
    expect(e).toBeGreaterThan(-15); expect(e).toBeLessThan(-11);
    expect(p).toBeGreaterThan(30); expect(p).toBeLessThan(34);
  });
  it("salle de bain de 6 m² : plus de 10 % d'écart vers le bas, plus de 30 % vers le haut (5 % avant)", () => {
    const [e, p] = ecart((f) => presetPieces([{ room: "sdb", surface: 6 }], "complete", f, "pros", ""));
    expect(e).toBeLessThan(-10);
    expect(p).toBeGreaterThan(30);
  });
  it("maison neuve de 100 m² : éco ≈ −8 %, premium ≈ +22 % (les chiffres de la méthodologie)", () => {
    const [e, p] = ecart((f) => presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: f, qui: "pros" }));
    expect(e).toBeGreaterThan(-10); expect(e).toBeLessThan(-6);
    expect(p).toBeGreaterThan(20); expect(p).toBeLessThan(24);
  });
});

describe("la méthodologie publie le barème du moteur", () => {
  const fr = fs.readFileSync("app/methodologie/page.tsx", "utf8"), en = fs.readFileSync("app/methodologie/contenu-en.tsx", "utf8");
  const signe = (v: number) => (v < 0 ? "−" : "+") + Math.abs(v);
  const lignes: [string, string, Bareme][] = [
    ["Maçonnerie, charpente", "Masonry, roof framing", LOT_FIN["Maçonnerie"]],
    ["Façade, couverture", "Facade, roofing", LOT_FIN["Façade"]],
    ["Carrelage, sols, peinture, cuisine", "Tiling, flooring, painting, kitchen", LOT_FIN["Peinture"]],
    ["Sanitaires, baie vitrée", "Bathroom fixtures, patio door", FIN_EQUIPEMENT],
  ];
  for (const [debutFr, debutEn, b] of lignes) {
    it(debutFr, () => {
      const ligneFr = fr.split("\n").find((l) => l.includes(`lot: "${debutFr}`))!, ligneEn = en.split("\n").find((l) => l.includes(`libelle: "${debutEn}`))!;
      const pose = (f: Finition, mot: string, meme: string) => (pct(b, "mo", f) === 0 ? meme : `${mot} ${signe(pct(b, "mo", f))}`);
      // Dans la source française, l'espace insécable est écrit «   » ; dans l'anglaise, le caractère lui-même.
      for (const [ligne, mot, meme, nb] of [[ligneFr, "pose", "même pose", "\\u00a0"], [ligneEn, "labour", "same labour", " "]] as const) {
        expect(ligne).toContain(`eco: "${signe(pct(b, "four", "eco"))}${nb}%"`);
        expect(ligne).toContain(`prem: "${signe(pct(b, "four", "premium"))}${nb}%"`);
        expect(ligne).toContain(`ecoPose: "${pose("eco", mot, meme)}`);
        expect(ligne).toContain(`premPose: "${pose("premium", mot, meme)}`);
      }
    });
  }
  it("plus de « premium = référence », plus d'écart doublé en neuf, plus de « même pose » sur les cartes", () => {
    expect(fr).not.toMatch(/calé sur la finition|deux fois plus du standard/);
    expect(en).not.toMatch(/set at the/);
    for (const f of ["lib/i18n/dictionaries.ts", "lib/i18n/detail.ts", "lib/i18n/visite.ts"])
      expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/pose reste la même|pose est la même|Même pose|Same installation|Installation stays the same|installation stays the same/);
  });
});

describe("rénovation électrique complète : le tableau est compris", () => {
  const TABLEAU = key("Electricite", "Changer / mettre aux normes le tableau"), COMPLETE = key("Electricite", "Rénovation électrique complète");
  const sel = (ampleur: "rafraich" | "partielle" | "complete" | "lourde", type: "T3" | "Maison" = "Maison") =>
    presetRapide({ type, surface: 100, codePostal: "", ampleur, finition: "standard", qui: "pros" }).sel;
  it("réno partielle : le tableau seul ; réno complète et lourde : la rénovation complète, sans le tableau en plus", () => {
    expect(sel("rafraich")[TABLEAU]?.on ?? false).toBe(false);
    expect(sel("partielle")[TABLEAU]?.on).toBe(true);
    expect(sel("partielle")[COMPLETE]?.on ?? false).toBe(false);
    for (const a of ["complete", "lourde"] as const) for (const type of ["T3", "Maison"] as const) {
      expect(sel(a, type)[COMPLETE]?.on, a).toBe(true);
      expect(sel(a, type)[TABLEAU]?.on ?? false, a).toBe(false);
    }
  });
  it("la ligne le dit dans l'estimation détaillée", () => {
    expect(poste("Electricite", "Rénovation électrique complète").note).toContain("tableau électrique compris");
  });
  it("le devis d'une réno complète ne porte plus la ligne du tableau", () => {
    const p = presetRapide({ type: "Maison", surface: 100, codePostal: "", ampleur: "complete", finition: "standard", qui: "pros" });
    expect(buildDevis(CATALOG, p.ctx, p.sel).lignes.map((l) => l.cle)).not.toContain(TABLEAU);
  });
});
