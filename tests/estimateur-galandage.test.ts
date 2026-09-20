import { describe, it, expect } from "vitest";
import { autoQty, defaultCtx, effPrices, finCoefTask, key, lineHT, posteParId, prixInduit, qtyOf, type Selection } from "@/lib/estimateur/core";
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

describe("le prix de l'option est lu, jamais recopié", () => {
  const ID = "clo-caisson-a-galandage-chassis-habillage";
  it("l'option « à galandage » déclare le poste qu'elle déclenche", () => {
    const opts = (CATALOG as unknown as Array<{ t: Array<{ n: string; vars?: Array<{ k: string; opts: Array<{ k: string; induit?: string }> }> }> }>)
      .flatMap((l) => l.t).flatMap((t) => t.vars ?? []).flatMap((g) => g.opts).filter((o) => o.induit);
    expect(opts.length).toBe(2);                       // la baie et la porte coulissante
    for (const o of opts) expect(o.induit).toBe(ID);
    for (const o of opts) expect(posteParId(o.induit!), `poste ${o.induit} absent`).toBeTruthy();
  });
  it("le prix affiché est celui que le devis facturera, finition comprise", () => {
    const p = (f: "eco" | "standard" | "premium") => prixInduit(ID, { ...ctx, finition: f });
    expect(p("premium")).toBe(800);                    // prix catalogue, finition haute
    expect(p("eco")).toBeLessThan(p("premium")!);      // il SUIT la finition, il n'est pas figé
    expect(p("standard")).toBeGreaterThan(p("eco")!);
  });
  it("un identifiant inconnu ne casse rien", () => {
    expect(prixInduit("poste-qui-n-existe-pas", ctx)).toBeNull();
    expect(posteParId("poste-qui-n-existe-pas")).toBeNull();
  });
});

/**
 * Le parcours complet, tel que l'utilisateur le vit : cocher la baie, la passer à galandage, en
 * mettre trois, revenir en arrière. C'est ce test qui manquait — les précédents vérifiaient la
 * déduction sur des sélections fabriquées à la main, jamais l'enchaînement réel. La poche restait
 * à 0 € parce que `quantiteInduite` refaisait le calcul de quantité au lieu de demander `qtyOf`.
 */
describe("parcours : cocher une baie et la passer à galandage", () => {
  const lot = (c: string) => (CATALOG as unknown as Array<{ c: string; t: Array<{ n: string }> }>).find((l) => l.c === c)!;
  const LB = "Menuiseries exterieures", NB = "Baie vitrée";
  const LC = "Cloisons / Platrerie", NC = "Caisson à galandage (châssis + habillage)";
  const tB = lot(LB).t.find((t) => t.n === NB)!, tC = lot(LC).t.find((t) => t.n === NC)!;
  const poche = (sel: Selection) => lineHT(ctx, sel, lot(LC) as never, tC as never);
  const baie = (sel: Selection) => lineHT(ctx, sel, lot(LB) as never, tB as never);

  it("cocher la baie la fait coûter quelque chose", () => {
    // Le lot menuiseries extérieures n'a aucune quantité automatique : cocher posait 0 €.
    const sel = { [key(LB, NB)]: { on: true, qty: 1 } } as Selection;
    expect(baie(sel)).toBe(2200);
  });
  it("la poche suit la baie, en quantité et en prix", () => {
    const sel = {
      [key(LB, NB)]: { on: true, qty: 1, vsel: { pose: "galandage" } },
      [key(LC, NC)]: { on: true, qty: 1 },
    } as Selection;
    expect(qtyOf(ctx, sel, LC, tC as never)).toBe(1);
    expect(poche(sel)).toBeGreaterThan(0);
    (sel[key(LB, NB)] as { qty: number }).qty = 3;
    expect(qtyOf(ctx, sel, LC, tC as never)).toBe(3);
  });
  it("revenir en « coulissante » ou décocher la baie remet la poche à zéro", () => {
    const sel = {
      [key(LB, NB)]: { on: true, qty: 3, vsel: { pose: "coulissante" } },
      [key(LC, NC)]: { on: true, qty: 3 },
    } as Selection;
    expect(poche(sel)).toBe(0);
    (sel[key(LB, NB)] as { vsel: Record<string, string>; on: boolean }).vsel = { pose: "galandage" };
    expect(poche(sel)).toBeGreaterThan(0);
    (sel[key(LB, NB)] as { on: boolean }).on = false;
    expect(poche(sel)).toBe(0);
  });
});
