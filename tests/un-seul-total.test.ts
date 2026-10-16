/**
 * Un seul total, des chiffres d'écran cohérents (chantier N7 de la revue rénovation / neuf,
 * décision D8 de Dani du 13/10/2026 : les lignes perso comptent partout, pour les deux natures).
 *
 * - le total d'un projet = devis + lignes perso validées (HT, leur TVA, les aléas sur leur HT) :
 *   liste et admin (`estimationProjet`), fiche, PDF, devis, barre live (`totauxAvecPerso`) ;
 * - le camembert additionne les corps d'état ET les lignes perso, et son centre dit « TTC hors aléas » ;
 * - « Qui fait quoi » couvre tout le HT : frais et lignes perso ont leur segment ;
 * - le prix unitaire d'une ligne vient du moteur (`puReel`) : prix unitaire × quantité = montant ;
 * - une ligne perso part à la TVA du régime du projet (`tauxPerso`) ;
 * - la zone affichée est celle que le moteur applique (`regionLabel` = `regionCoef(cp).zone`).
 *
 * Le moteur ne change pas : le témoin T1 reste à 0 écart (ses scénarios n'ont pas de ligne perso).
 */
import { describe, it, expect, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CATALOG, buildDevis, catalogueDe, customTotals, defaultCtx, estimationProjet, key, lineHT, qtyOf, presetNeuf, presetRapide,
  puReel, regionCoef, regionLabel, tauxPerso, tauxPersoPossibles, totals, totauxAvecPerso, lotsAvecPerso, PHASE_PERSO,
  type Ctx, type CustomLine, type Selection,
} from "@/lib/estimateur";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimationResultat from "@/components/EstimationResultat";
import { Row } from "@/components/estimateur/Row";
import { puReelNeuf } from "@/lib/estimateur/detaille-neuf";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => "fr" }));

const rendre = (el: ReactElement, locale: "fr" | "en" = "fr") => renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
const texte = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/[\s  ]+/g, " ");
const eur = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");

/* Une rénovation et une construction de référence, chacune avec deux lignes perso : l'une dans un
   corps déjà chiffré, l'autre dans un corps où aucun poste n'est coché. */
const reno = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
const neuf = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });
const PERSO: CustomLine[] = [
  { id: "p1", lot: "Peinture", nom: "Fresque", prix: 1000, unite: "forfait", qte: 1, tva: 10, on: true },
  { id: "p2", lot: "Location de matériel", nom: "Benne perso", prix: 300, unite: "u", qte: 2, tva: 20, on: true },
  { id: "p3", lot: "Peinture", nom: "En cours", prix: 999, unite: "u", qte: 1, tva: 10, on: true, draft: true },
  { id: "p4", lot: "Peinture", nom: "Décochée", prix: 999, unite: "u", qte: 1, tva: 10, on: false },
];
const PERSO_NEUF: CustomLine[] = PERSO.map((x) => ({ ...x, tva: 20 }));
const reponses = (p: { ctx: Ctx; sel: Selection }, custom: CustomLine[]) => ({ v: "estimateur", mode: "detaille", ctx: p.ctx, sel: p.sel, codePostal: "45000", custom });

describe("Un seul total, lignes perso comprises, pour les deux natures", () => {
  for (const [nom, p, custom] of [["rénovation", reno, PERSO], ["construction neuve", neuf, PERSO_NEUF]] as const) {
    const dv = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel);
    const cu = customTotals(custom);
    const attendu = dv.totaux.ttc + cu.ht + cu.tva + cu.ht * (p.ctx.aleas / 100);

    it(`${nom} : liste et admin (estimationProjet) = devis + lignes perso validées`, () => {
      expect(cu.ht).toBe(1600); // les lignes en brouillon ou décochées ne comptent pas
      const e = estimationProjet(reponses(p, custom))!;
      expect(e.ttc).toBeCloseTo(attendu, 6);
      expect(e.ht).toBeCloseTo(dv.totaux.ht + 1600, 6);
      expect(e.aleas).toBeCloseTo(dv.totaux.aleas + 1600 * (p.ctx.aleas / 100), 6);
      expect(totauxAvecPerso(dv.totaux, custom, p.ctx.aleas).ttc).toBeCloseTo(attendu, 6);
    });

    it(`${nom} : la fiche affiche ce total ; le camembert additionne corps et lignes perso, TTC hors aléas`, () => {
      const t = texte(rendre(createElement(EstimationResultat, { reponses: reponses(p, custom) as never, projectId: "p1" })));
      expect(t).toContain(`Le plus probable ${eur(attendu)} €`);
      const horsAleas = attendu - (dv.totaux.aleas + 1600 * (p.ctx.aleas / 100));
      expect(t).toContain(`${eur(horsAleas)} € TTC hors aléas`);
      // « Qui fait quoi » : un segment pour les lignes perso, sur le même HT que le total.
      expect(t).toContain(`Lignes perso ${eur(1600)} €`);
      // Rénovation : le corps qui n'a qu'une ligne perso est une part du camembert (en neuf, il
      // tombe dans « Autres corps d'état », au-delà des 8 plus gros : voir `lotsAvecPerso` ci-dessous).
      if (p === reno) expect(t).toContain(`Location de matériel ${eur(720)} €`);
    });
  }

  it("la somme des lots (lotsAvecPerso) = TTC hors aléas, un corps sans poste coché devient un lot à part", () => {
    const dv = buildDevis(CATALOG, reno.ctx, reno.sel);
    const lots = lotsAvecPerso(dv.lots, PERSO);
    const t = totauxAvecPerso(dv.totaux, PERSO, reno.ctx.aleas);
    expect(lots.reduce((s, l) => s + l.ttc, 0)).toBeCloseTo(t.ttc - t.aleas, 6);
    expect(lots.find((l) => l.corps === "Location de matériel")).toMatchObject({ phase: PHASE_PERSO, ttc: 720 });
    expect(lots.find((l) => l.corps === "Peinture")!.ttc).toBeCloseTo(dv.lots.find((l) => l.corps === "Peinture")!.ttc + 1100, 6);
  });

  it("le PDF affiche le même total et le même centre de camembert", async () => {
    const { RapportPDF } = await import("@/components/RapportPDF");
    for (const [p, custom] of [[reno, PERSO], [neuf, PERSO_NEUF]] as const) {
      const dv = buildDevis(catalogueDe(p.ctx), p.ctx, p.sel);
      const t = totauxAvecPerso(dv.totaux, custom, p.ctx.aleas);
      const el = await RapportPDF({ reponses: reponses(p, custom) as never, nom: "Projet", refCode: "AVY-TEST" });
      const txt = texte(renderToStaticMarkup(el!));
      expect(txt).toContain(`Estimation la plus probable : ${eur(t.ttc)} €`);
      expect(txt).toContain(`${eur(t.ttc - t.aleas)} € TTC hors aléas`);
      expect(txt).toContain(`Lignes perso ${eur(1600)} €`);
    }
  });

  it("sans ligne perso, rien ne bouge : le total est celui du moteur", () => {
    const dv = buildDevis(CATALOG, reno.ctx, reno.sel);
    expect(totauxAvecPerso(dv.totaux, undefined, reno.ctx.aleas)).toBe(dv.totaux);
    expect(estimationProjet(reponses(reno, []))!.ttc).toBe(dv.totaux.ttc);
  });
});

describe("Prix unitaire affiché = celui du moteur (puReel)", () => {
  /* Paris (main-d'œuvre +20 %) : la région entre dans le prix unitaire. Corse : les matériaux aussi. */
  const ctxParis: Ctx = { ...defaultCtx(), codePostal: "75011" };
  const ctxCorse: Ctx = { ...defaultCtx(), codePostal: "20000" };

  it("pour chaque poste rénovation, prix unitaire × quantité = montant de la ligne, dans les deux modes", () => {
    for (const ctx of [ctxParis, ctxCorse]) for (const l of CATALOG) for (const t of l.t) for (const self of [false, true]) {
      const sel: Selection = { [key(l.c, t.n)]: { on: true, manual: true, qty: 3, self } };
      expect(puReel(ctx, sel, l, t, self) * qtyOf(ctx, sel, l.c, t)).toBeCloseTo(lineHT(ctx, sel, l, t), 6); // un forfait compte 1
    }
  });

  it("puReelNeuf reste l'alias « Fait faire » de puReel", () => {
    for (const l of catalogueDe(neuf.ctx)) for (const t of l.t) expect(puReelNeuf(neuf.ctx, neuf.sel, l, t)).toBe(puReel(neuf.ctx, neuf.sel, l, t, false));
  });

  const rien = () => {};
  const ligne = (ctx: Ctx, lot: string, nom: string, s: Selection[string]) => {
    const l = CATALOG.find((x) => x.c === lot)!, t = l.t.find((x) => x.n === nom)!;
    const sel: Selection = { [key(lot, nom)]: s };
    const html = rendre(createElement(Row, {
      l, t, ctx, sel, loc: false, onCheck: rien, onChoice: rien, onAuto: rien, onQty: rien, onMat: rien, onVit: rien, onMot: rien,
      onTai: rien, onVar: rien, onNote: rien, onPu: rien, onPm: rien,
    }));
    return { html, ff: puReel(ctx, sel, l, t, false), diy: puReel(ctx, sel, l, t, true), montant: lineHT(ctx, sel, l, t) };
  };
  const prix = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

  it("la ligne affiche le prix régional : Paris, peinture des murs, 10 m²", () => {
    const r = ligne(ctxParis, "Peinture", "Peinture des murs", { on: true, manual: true, qty: 10 });
    expect(r.ff * 10).toBeCloseTo(r.montant, 6);
    expect(r.html).toContain(`<span class="puval" title="Double-clique pour ajuster à ton prix">${prix(r.ff)} HT/m²</span>`);
    expect(r.html).toContain(`<b title="Double-clique pour mettre ton prix">${prix(r.diy)}</b>`);
    // Avant N7 : sm × finition + (fp − sm), sans la main-d'œuvre parisienne.
    const t = CATALOG.find((x) => x.c === "Peinture")!.t.find((x) => x.n === "Peinture des murs")!;
    expect(Math.round(r.ff)).toBeGreaterThan(Math.round(t.sm! * 0.78 + (t.fp! - t.sm!)));
  });

  it("le barème de finition PROPRE au poste : une couverture (G2) rangée dans le lot charpente (G1)", () => {
    const r = ligne(defaultCtx(), "Charpente, couverture & structure bois", "Couverture tuiles (sur support existant)", { on: true, manual: true, qty: 1 });
    expect(r.html).toContain(`${prix(r.montant)} HT/m²`);
  });

  it("une variante neutre (porte coulissante, à galandage ou non) garde le coefficient de finition", () => {
    const r = ligne(defaultCtx(), "Menuiseries interieures", "Porte intérieure coulissante", { on: true, qty: 1 });
    expect(r.html).toContain(`<span class="puval" title="Double-clique pour ajuster à ton prix">${prix(r.montant)} HT</span>`);
    expect(r.html).not.toContain(">700 € HT<"); // l'ancien affichage, sans la finition standard
  });
});

describe("TVA d'une ligne perso selon le régime du projet", () => {
  it("10 % en logement de plus de deux ans, 20 % en régime « pro » et en construction neuve", () => {
    expect(tauxPerso(defaultCtx())).toBe(10);
    expect(tauxPerso({ ...defaultCtx(), fiscal: "pro" })).toBe(20);
    expect(tauxPerso(neuf.ctx)).toBe(20);
  });
  it("le sélecteur ne propose que 20 % quand tout le projet est à 20 %, sans réécrire un taux déjà enregistré", () => {
    expect(tauxPersoPossibles(defaultCtx())).toEqual([5.5, 10, 20]);
    expect(tauxPersoPossibles(defaultCtx(), 10)).toEqual([5.5, 10, 20]);
    expect(tauxPersoPossibles(neuf.ctx, 20)).toEqual([20]);
    expect(tauxPersoPossibles({ ...defaultCtx(), fiscal: "pro" }, 10)).toEqual([10, 20]);
  });
});

describe("Une seule zone régionale", () => {
  it("regionLabel = la zone que le moteur applique à la main-d'œuvre", () => {
    for (const cp of ["75011", "59000", "33000", "45000", "23000", "97200", "20000", "", "1"]) expect(regionLabel(cp)).toBe(regionCoef(cp).zone);
    // Avant : Lille en « Grande métropole » mais chiffrée à la moyenne nationale.
    expect(regionLabel("59000")).toBe("Grande agglomération");
    expect(regionLabel("45000")).toBe("Moyenne nationale");
  });
});

describe("Ampleur « tout fait faire » : le moteur, sur le catalogue du projet", () => {
  it("rénovation en « je fais le maximum » : le repère €/m² tout fait faire est celui de totals()", () => {
    const p = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "max" });
    const selFF: Selection = Object.fromEntries(Object.entries(p.sel).map(([k, v]) => [k, { ...v, self: false }]));
    const ff = totals(CATALOG, p.ctx, selFF).ttc / 100;
    const t = texte(rendre(createElement(EstimationResultat, { reponses: reponses(p, []) as never })));
    expect(t).toContain(`≈ ${eur(ff)} €/m² tout fait faire`);
  });
});
