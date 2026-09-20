import { describe, it, expect } from "vitest";
import { autoQty, defaultCtx, effPrices, finCoefTask, key, type Selection } from "@/lib/estimateur/core";
import { CATALOG } from "@/lib/estimateur/catalog";

/**
 * Le caisson à galandage se DÉDUIT de la menuiserie.
 *
 * Il vivait dans le lot plâtrerie, décoché, sans quantité automatique et sans qu'aucun préréglage
 * ne le coche : personne n'allait le chercher, et 800 € manquaient à chaque baie à galandage. Le
 * choix appartient désormais à la menuiserie — là où l'utilisateur le fait vraiment — et la poche
 * en découle. Ces tests tiennent les deux bouts : la déduction, et le fait qu'ajouter ce choix
 * n'a déplacé AUCUN prix existant.
 */
const CAISSON = "Caisson à galandage (châssis + habillage)";
const BAIE = key("Menuiseries exterieures", "Baie vitrée");
const PORTE = key("Menuiseries interieures", "Porte intérieure coulissante");
const ctx = defaultCtx();
const poches = (sel: Selection) => autoQty(ctx, "Cloisons / Platrerie", CAISSON, sel);
const ligne = (k: string, qty: number, pose: string): Selection =>
  ({ [k]: { on: true, manual: true, qty, vsel: { pose } } }) as Selection;

describe("caisson à galandage · déduit de la menuiserie", () => {
  it("aucune menuiserie à galandage : aucune poche", () => {
    expect(poches({})).toBe(0);
    expect(poches(ligne(BAIE, 2, "coulissante"))).toBe(0);
    expect(poches(ligne(PORTE, 3, "applique"))).toBe(0);
  });
  it("une baie à galandage donne sa poche, une par baie", () => {
    expect(poches(ligne(BAIE, 2, "galandage"))).toBe(2);
  });
  it("les baies et les portes coulissantes s'additionnent", () => {
    expect(poches({ ...ligne(BAIE, 2, "galandage"), ...ligne(PORTE, 3, "galandage") })).toBe(5);
  });
  it("une menuiserie décochée n'appelle pas de poche", () => {
    const sel = ligne(BAIE, 2, "galandage");
    (sel[BAIE] as { on: boolean }).on = false;
    expect(poches(sel)).toBe(0);
  });
});

describe("le choix de pose ne déplace aucun prix", () => {
  /* Une variante dont toutes les options valent 1 ne « pilote » pas le prix : elle ne doit donc
     pas désactiver le coefficient de finition, sinon ajouter un simple choix à un poste en
     changerait le prix pour tous les utilisateurs. */
  it("la baie et la porte coulissante gardent leur prix", () => {
    for (const [lot, nom, attendu] of [["Menuiseries exterieures", "Baie vitrée", 2200], ["Menuiseries interieures", "Porte intérieure coulissante", 700]] as const) {
      const t = (CATALOG as unknown as Array<{ c: string; t: Array<{ n: string }> }>).find((l) => l.c === lot)!.t.find((x) => x.n === nom)!;
      for (const pose of ["galandage", "coulissante", "applique", undefined]) {
        const { fp } = effPrices(t as never, { on: true, vsel: pose ? { pose } : undefined } as never, ctx);
        expect(fp, `${nom} · pose ${pose}`).toBe(attendu);
      }
    }
  });
  it("la porte coulissante garde son coefficient de finition", () => {
    const lot = (CATALOG as unknown as Array<{ c: string; t: Array<{ n: string }> }>).find((l) => l.c === "Menuiseries interieures")!;
    const t = lot.t.find((x) => x.n === "Porte intérieure coulissante")!;
    const eco = finCoefTask({ ...ctx, finition: "eco" }, lot as never, t as never);
    const prem = finCoefTask({ ...ctx, finition: "premium" }, lot as never, t as never);
    expect(eco).not.toBe(prem);          // elle SCALE encore : la variante neutre ne l'a pas figée
  });
});
