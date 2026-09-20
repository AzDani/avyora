import { describe, it, expect } from "vitest";
import { defaultCtx, effPrices, finCoefTask, key, lineHT, posteParId, prixInduit, qtyOf, supplementVariantes, type Selection } from "@/lib/estimateur/core";
import { CATALOG } from "@/lib/estimateur/catalog";

/**
 * Le galandage est une PLUS-VALUE sur la menuiserie, pas une ligne à part.
 *
 * Première version : une ligne « Caisson à galandage » dans le lot plâtrerie, cochée
 * automatiquement. Comptablement exact — la poche est de la plâtrerie — mais choisir « à
 * galandage » ne changeait alors rien au prix de la baie, donc rien de visible là où on clique.
 * Un choix dont le prix ne bouge pas est un choix qui a l'air cassé.
 *
 * Le supplément s'AJOUTE, il ne multiplie pas : un coefficient demanderait un chiffre différent
 * par poste (1,36 sur une baie à 2 200 €, 2,14 sur une porte à 700 €) et mentirait dès qu'un des
 * deux prix bouge.
 */
const ctx = defaultCtx();
const POCHE = "clo-caisson-a-galandage-chassis-habillage";
const lot = (c: string) => (CATALOG as unknown as Array<{ c: string; t: Array<{ n: string; id: string }> }>).find((l) => l.c === c)!;
const tache = (c: string, n: string) => lot(c).t.find((t) => t.n === n)!;
const BAIE = tache("Menuiseries exterieures", "Baie vitrée");
const PORTE = tache("Menuiseries interieures", "Porte intérieure coulissante");
const pose = (p: string) => ({ on: true, vsel: { pose: p } });
const fp = (t: unknown, p?: string) => effPrices(t as never, (p ? pose(p) : { on: true }) as never, ctx).fp;

describe("galandage · plus-value sur la menuiserie", () => {
  it("le supplément vaut le prix catalogue de la poche", () => {
    const poche = posteParId(POCHE)!;
    expect(poche.t.fp).toBe(800);
    expect(prixInduit(POCHE)).toBe(800);
    expect(supplementVariantes(BAIE as never, pose("galandage") as never).fp).toBe(800);
    expect(supplementVariantes(BAIE as never, pose("coulissante") as never).fp).toBe(0);
  });
  it("la baie coûte 800 € de plus à galandage", () => {
    expect(fp(BAIE, "coulissante")).toBe(2200);
    expect(fp(BAIE, "galandage")).toBe(3000);
  });
  it("la porte coulissante aussi, du même montant", () => {
    expect(fp(PORTE, "applique")).toBe(700);
    expect(fp(PORTE, "galandage")).toBe(1500);
  });
  it("sans choix, c'est la première option qui vaut — donc pas de supplément", () => {
    expect(fp(BAIE)).toBe(2200);
    expect(fp(PORTE)).toBe(700);
  });
  /* La poche ne dépend ni du vitrage ni du matériau de la baie : elle s'ajoute APRÈS. */
  it("le supplément ne subit pas les coefficients de la menuiserie", () => {
    const triple = effPrices(BAIE as never, { ...pose("galandage"), vit: "triple" } as never, ctx).fp;
    expect(triple).toBe(Math.round(2200 * 1.2) + 800);
  });
  it("la poche n'a plus de ligne à elle : elle ne peut pas être comptée deux fois", () => {
    const sel = { [key("Menuiseries exterieures", "Baie vitrée")]: { on: true, qty: 2, vsel: { pose: "galandage" } } } as Selection;
    const tPoche = tache("Cloisons / Platrerie", "Caisson à galandage (châssis + habillage)");
    expect(qtyOf(ctx, sel, "Cloisons / Platrerie", tPoche as never)).toBe(0);
    expect(lineHT(ctx, sel, lot("Cloisons / Platrerie") as never, tPoche as never)).toBe(0);
    expect(lineHT(ctx, sel, lot("Menuiseries exterieures") as never, BAIE as never)).toBe(6000); // 2 × 3 000
  });
  it("un identifiant inconnu ne casse rien", () => {
    expect(prixInduit("poste-qui-n-existe-pas")).toBeNull();
    expect(posteParId("poste-qui-n-existe-pas")).toBeNull();
  });
});

describe("le choix de pose ne dérègle pas le reste", () => {
  it("la porte coulissante garde son coefficient de finition", () => {
    const l = lot("Menuiseries interieures");
    const eco = finCoefTask({ ...ctx, finition: "eco" }, l as never, PORTE as never);
    const prem = finCoefTask({ ...ctx, finition: "premium" }, l as never, PORTE as never);
    expect(eco).not.toBe(prem);
  });
  it("cocher une ligne sans quantité automatique en demande une", () => {
    // Tout le lot menuiseries extérieures est manuel : cocher posait 0 € avant correction.
    const sel = { [key("Menuiseries exterieures", "Baie vitrée")]: { on: true, qty: 1 } } as Selection;
    expect(lineHT(ctx, sel, lot("Menuiseries exterieures") as never, BAIE as never)).toBe(2200);
  });
});
