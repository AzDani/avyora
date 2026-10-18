/**
 * Décision D5 de Dani : en construction neuve, les bandes et l'enduit des plaques de plâtre sont une
 * ligne à part, comme en rénovation (« dans la rénovation on a une ligne à part ; fais la même logique »).
 *
 * - Le neuf reprend LE poste de la rénovation (`ref`, même objet, même prix : 15 € HT/m², 5 € de fourniture).
 * - La ligne est cochée avec les plaques, et sa quantité suit les plaques COCHÉES à leur quantité effective,
 *   comme `derivedFinitions` en rénovation. Toutes les plaques du neuf comptent : faux plafonds, cloisons et
 *   cloisons hydrofuges (deux faces), « Doubler un mur », doublage collé ou sur ossature.
 * - « Je le fais » y est possible, comme en rénovation.
 * - Seule cette ligne change le devis (et ce qui en dépend : dommages-ouvrage, aléas, TVA). La rénovation
 *   ne bouge pas (T1), un projet neuf enregistré avant D5 non plus (sa sélection n'a pas la ligne).
 */
import { describe, it, expect } from "vitest";
import {
  CATALOG, CATALOG_NEUF, FINI, ID_BANDES_PLATRE, IDS_NEUF, LOT_FIN, POSTE_NEUF, buildDevis, catalogueDe, key, presetMaison, quantitesNeuf,
  soiMemeNeuf, type Ctx, type MaisonNeuve, type Selection,
} from "@/lib/estimateur";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { diyNeuf } from "@/lib/estimateur/detaille-neuf";

const BASE: Partial<MaisonNeuve> = {
  forme: "rect", murs: "parpaing", plancherBas: "terre-plein", toiture: "2pans", couverture: "terre-cuite", chauffage: "pac-eau", vmc: "simple",
  assainissement: "collectif", eauxPluviales: "infiltration", distanceReseaux: 15, terrain: "plat", argile: "non", sismique: 1, codePostal: "45000",
  escalier: "bois", lotissement: false, borne: true, pilotage: "moi", gouttiere: "zinc",
};
/* Les maisons de calage (`docs/construction-neuve/decisions.md`). */
const A: Partial<MaisonNeuve> = { ...BASE, surface: 100, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0 };
const B: Partial<MaisonNeuve> = { ...BASE, surface: 120, niveaux: "etage", chambres: 4, sdb: 2, wc: 2, garage: 20 };
const C: Partial<MaisonNeuve> = { ...BASE, surface: 90, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0, murs: "ossature" };

const LOT = "Cloisons / Platrerie";
const BANDES = key(LOT, FINI);
const cle = (id: string) => { const p = POSTE_NEUF.get(id)!; return key(p.c, p.n); };
const devis = (p: { ctx: Ctx; sel: Selection }) => buildDevis(catalogueDe(p.ctx), p.ctx, p.sel);
const ligne = (p: { ctx: Ctx; sel: Selection }) => devis(p).lignes.find((x) => x.cle === BANDES);
const r2 = (x: number) => Math.round(x * 100) / 100;
/** m² de plaques cochées : chaque poste à sa quantité de maison, une cloison sur ses deux faces. */
function plaques(p: { ctx: Ctx; sel: Selection }): number {
  const Q = quantitesNeuf(p.ctx.neuf as MaisonNeuve);
  const faces: Record<string, number> = {
    "clo-faux-plafond": 1, "clo-monter-une-cloison": 2, "clo-cloison-piece-humide-hydrofuge": 2, "clo-doubler-un-mur": 1,
    "iso-doublage-isolant-colle": 1, "iso-isolation-des-murs-par-l-interieur": 1,
  };
  return r2(Object.entries(faces).reduce((s, [id, f]) => s + (p.sel[cle(id)]?.on ? f * Q[id] : 0), 0));
}
const sans = (sel: Selection, id: string): Selection => ({ ...sel, [cle(id)]: { ...sel[cle(id)], on: false } });

describe("D5 · le poste de la rénovation, repris tel quel", () => {
  it("même objet que la rénovation (même prix), dans le lot Cloisons / Plâtrerie du neuf, une seule fois", () => {
    const reno = CATALOG.find((l) => l.c === LOT)!.t.find((t) => t.n === FINI)!;
    expect(reno).toMatchObject({ id: ID_BANDES_PLATRE, u: "m2", fp: 15, sm: 5 });
    expect(POSTE_NEUF.get(ID_BANDES_PLATRE)).toMatchObject({ c: LOT, n: FINI });
    expect(POSTE_NEUF.get(ID_BANDES_PLATRE)!.t).toBe(reno);
    expect(CATALOG_NEUF.flatMap((l) => l.t).filter((t) => t.id === ID_BANDES_PLATRE)).toHaveLength(1);
    expect(IDS_NEUF).not.toContain(ID_BANDES_PLATRE);              // un poste repris, pas un poste propre au neuf
  });

  it("« Je le fais » possible, comme en rénovation ; « une partie » et « le maximum » la prennent, comme le reste de la plâtrerie", () => {
    const l = CATALOG_NEUF.find((x) => x.t.some((t) => t.id === ID_BANDES_PLATRE))!;
    const t = POSTE_NEUF.get(ID_BANDES_PLATRE)!.t;
    expect(diyNeuf(l, t)).toBe(true);
    expect(soiMemeNeuf(LOT, "pros", t)).toBe(false);
    expect(soiMemeNeuf(LOT, "partie", t)).toBe(true);
    expect(soiMemeNeuf(LOT, "max", t)).toBe(true);
    expect(ligne(presetMaison(A, { qui: "partie" }))?.mode).toBe("je-fais");
  });
});

describe("D5 · cochée avec les plaques, quantité = m² de plaques cochées", () => {
  it("maison A (plain-pied, parpaing) : plafonds + 2 × cloisons + 2 × cloisons hydrofuges + doublage collé = 347,16 m²", () => {
    const p = presetMaison(A, { codePostal: "45000" });
    const Q = quantitesNeuf(p.ctx.neuf as MaisonNeuve);
    expect(p.sel[BANDES]?.on).toBe(true);
    const attendu = r2(Q["clo-faux-plafond"] + 2 * Q["clo-monter-une-cloison"] + 2 * Q["clo-cloison-piece-humide-hydrofuge"] + Q["iso-doublage-isolant-colle"]);
    expect(attendu).toBe(347.16);
    expect(ligne(p)?.qty).toBe(attendu);
  });

  it("maison B (à étage) : les deux faces du refend (« Doubler un mur ») s'ajoutent au doublage collé des murs extérieurs", () => {
    const p = presetMaison(B, { codePostal: "45000" });
    const Q = quantitesNeuf(p.ctx.neuf as MaisonNeuve);
    expect(p.sel[cle("clo-doubler-un-mur")]?.on).toBe(true);
    expect(p.sel[cle("iso-doublage-isolant-colle")]?.on).toBe(true);
    expect(ligne(p)?.qty).toBe(plaques(p));
    expect(ligne(p)!.qty).toBeCloseTo(Q["clo-faux-plafond"] + 2 * (Q["clo-monter-une-cloison"] + Q["clo-cloison-piece-humide-hydrofuge"]) + Q["clo-doubler-un-mur"] + Q["iso-doublage-isolant-colle"], 1);
  });

  it("maison C (ossature bois) : le parement intérieur (« Doubler un mur ») a ses bandes, sans doublage collé", () => {
    const p = presetMaison(C, { codePostal: "45000" });
    expect(p.sel[cle("iso-doublage-isolant-colle")]?.on).toBeFalsy();
    expect(p.sel[cle("clo-doubler-un-mur")]?.on).toBe(true);
    expect(ligne(p)?.qty).toBe(plaques(p));
  });

  it("chaque maison du questionnaire : la ligne est cochée et compte exactement ses plaques cochées", () => {
    const variantes: Partial<MaisonNeuve>[] = [
      {}, B, C, { surface: 160, niveaux: "combles", forme: "L", murs: "brique", plancherBas: "vide-sanitaire" },
      { surface: 140, niveaux: "etage", murs: "monomur", toiture: "plat" }, { surface: 30, chambres: 0, sdb: 0, wc: 0 },
      { surface: 400, niveaux: "etage", chambres: 10, sdb: 6, wc: 6, garage: 60 },
    ];
    for (const v of variantes) {
      const p = presetMaison(v);
      expect(p.sel[BANDES]?.on, JSON.stringify(v)).toBe(true);
      expect(ligne(p)?.qty, JSON.stringify(v)).toBe(plaques(p));
      expect(ligne(p)!.qty, JSON.stringify(v)).toBeGreaterThan(0);
    }
  });
});

describe("D5 · la quantité suit la sélection, comme en rénovation", () => {
  const p = presetMaison(A, { codePostal: "45000" });
  const Q = quantitesNeuf(p.ctx.neuf as MaisonNeuve);
  const qte = (sel: Selection) => ligne({ ctx: p.ctx, sel })?.qty;

  it("décocher les faux plafonds retire leurs bandes", () => {
    expect(qte(sans(p.sel, "clo-faux-plafond"))).toBe(r2(347.16 - Q["clo-faux-plafond"]));
  });

  it("une surface de cloison corrigée à la main corrige ses bandes, sur les deux faces", () => {
    const sel: Selection = { ...p.sel, [cle("clo-monter-une-cloison")]: { ...p.sel[cle("clo-monter-une-cloison")], manual: true, qty: 50 } };
    expect(qte(sel)).toBe(r2(347.16 - 2 * Q["clo-monter-une-cloison"] + 2 * 50));
  });

  it("le doublage sur ossature à la place du doublage collé : la même paroi, les mêmes bandes", () => {
    const sel: Selection = { ...sans(p.sel, "iso-doublage-isolant-colle"), [cle("iso-isolation-des-murs-par-l-interieur")]: { on: true } };
    expect(qte(sel)).toBe(347.16);
  });

  it("une quantité tapée sur la ligne des bandes reste celle de l'utilisateur", () => {
    expect(qte({ ...p.sel, [BANDES]: { ...p.sel[BANDES], manual: true, qty: 12 } })).toBe(12);
  });
});

describe("D5 · seule cette ligne change le devis", () => {
  it("maison A : 246 762 € sans la ligne (le devis d'avant D5), 253 172 € avec ; l'écart = la ligne + dommages-ouvrage + aléas + TVA", () => {
    const p = presetMaison(A, { codePostal: "45000" });
    const avec = devis(p), avant = devis({ ctx: p.ctx, sel: sans(p.sel, ID_BANDES_PLATRE) });
    expect(Math.round(avant.totaux.ttc)).toBe(246762);
    expect(Math.round(avec.totaux.ttc)).toBe(253172);
    // toutes les autres lignes, hors pourcentages, sont identiques
    const autres = (d: typeof avec) => d.lignes.filter((x) => x.cle !== BANDES && x.unite !== "pct").map((x) => [x.cle, x.qty, x.ht, x.tva, x.mode]);
    expect(autres(avec)).toEqual(autres(avant));
    const b = avec.lignes.find((x) => x.cle === BANDES)!;
    expect(b.qty).toBe(347.16);
    expect(b.ht).toBeCloseTo(347.16 * (5 * LOT_FIN[LOT].standard + 10), 6); // fourniture × finition standard + main-d'œuvre, moyenne nationale
    const taux = POSTE_NEUF.get("ass-assurance-dommages-ouvrage")!.t.fp! / 100;
    expect(avec.totaux.ht - avant.totaux.ht).toBeCloseTo(b.ht * (1 + taux), 6);     // la DO (3,5 % du projet) suit
    expect(avec.totaux.tva - avant.totaux.tva).toBeCloseTo(b.ht * 0.2, 6);            // la DO est un frais : pas de TVA
    expect(avec.totaux.aleas - avant.totaux.aleas).toBeCloseTo(b.ht * 0.07, 6);       // les frais n'ont pas d'aléas
  });

  it("un projet neuf enregistré avant D5 garde son total : sa sélection n'a pas la ligne", () => {
    const p = presetMaison(A, { codePostal: "45000" });
    const ancien: Selection = Object.fromEntries(Object.entries(p.sel).filter(([k]) => k !== BANDES));
    expect(ligne({ ctx: p.ctx, sel: ancien })).toBeUndefined();
    expect(Math.round(devis({ ctx: p.ctx, sel: ancien }).totaux.ttc)).toBe(246762);
  });
});

describe("D5 · les notes ne disent plus que les bandes sont comprises", () => {
  const notes = () => {
    const out: string[] = [];
    for (const l of CATALOG_NEUF) {
      if (l.note) out.push(l.note);
      for (const t of l.t) if (t.note) out.push(t.note);
    }
    return out;
  };

  it("aucune note du neuf ne dit les bandes comprises dans les plaques, les doublages ou la peinture", () => {
    for (const n of notes()) expect(n, n).not.toMatch(/bandes à joints|bandes? (?:sont )?compris|comprennent les bandes/i);
  });

  it("le lot Plâtrerie, le lot Isolation, le doublage collé et la peinture renvoient à la ligne des bandes, en français et en anglais", () => {
    const lotNote = (c: string, p: string) => CATALOG_NEUF.find((l) => l.c === c && l.p === p && l.note)!.note!;
    const platrerie = lotNote(LOT, "Second œuvre");
    expect(platrerie).toContain("« Finitions plâtrerie »");
    expect(catT("en", "notes", platrerie)).toContain("\"Plaster finishing\"");
    const renvois = [
      CATALOG_NEUF.find((l) => l.c === "Isolation" && l.t.some((t) => t.id === "iso-doublage-isolant-colle"))!.note!,
      POSTE_NEUF.get("iso-doublage-isolant-colle")!.t.note!,
      POSTE_NEUF.get("pei-peinture-murs-plaques-neuves")!.t.note!,
      POSTE_NEUF.get("pei-peinture-plafonds-plaques-neuves")!.t.note!,
    ];
    for (const n of renvois) {
      expect(n).toContain(`voir ${catT("fr", "corps", LOT)}`);
      expect(catT("en", "notes", n), n).toContain(`see ${catT("en", "corps", LOT)}`);
    }
  });
});
