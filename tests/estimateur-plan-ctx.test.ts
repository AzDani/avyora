/**
 * « Mes plans », C7 : le ctx d'une estimation détaillée de rénovation née d'un plan (`ctxDepuisPlan`).
 *
 * Contrat de référence : `tests/fixtures/plan-contrat.json` (plan de rénovation réel de l'éditeur, 2 niveaux,
 * 50,6 m² après travaux, sans code postal). Règles du plan § C7 : les huit compteurs toujours écrits
 * (zéros compris, D4), surface = aire après travaux, périmètre logement entier (D3), emprise du RDC.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { defaultCtx, piecesEff, sdbEff } from "@/lib/estimateur/core";
import { codePostalDuContrat, ctxDepuisPlan, PLAN_CTX_SURFACE_MAX } from "@/lib/estimateur/plan-ctx";

const CONTRAT = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as Record<string, unknown>;
const copie = () => JSON.parse(JSON.stringify(CONTRAT)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const COMPTEURS = ["sejour", "cuisine", "chambres", "suites", "couloir", "buanderie", "sdb", "wc"] as const;

describe("ctxDepuisPlan · le contrat de référence", () => {
  const ctx = ctxDepuisPlan(CONTRAT);

  it("les huit compteurs sont écrits, zéros compris : aucun défaut de defaultCtx ne survit", () => {
    for (const k of COMPTEURS) expect(typeof ctx[k], k).toBe("number");
    /* Le plan : une salle de bain (douche, baignoire, WC posés), deux chambres, rien d'autre. */
    expect({ sejour: ctx.sejour, cuisine: ctx.cuisine, chambres: ctx.chambres, suites: ctx.suites, couloir: ctx.couloir, buanderie: ctx.buanderie, sdb: ctx.sdb, wc: ctx.wc })
      .toEqual({ sejour: 0, cuisine: 0, chambres: 2, suites: 0, couloir: 0, buanderie: 0, sdb: 1, wc: 1 });
    /* defaultCtx() a séjour 1, cuisine 1, chambres 3, couloir 1 : tous remplacés. */
    const d = defaultCtx();
    expect(d.sejour).toBe(1);
    expect(ctx.sejour).toBe(0);
    expect(piecesEff(ctx)).toBe(2);
    expect(sdbEff(ctx)).toBe(1);
  });

  it("surface = aire après travaux arrondie, périmètre logement entier, emprise du RDC saisie", () => {
    expect(ctx.surface).toBe(Math.round(CONTRAT.area as number));
    expect(ctx.surface).toBe(51);
    expect(ctx.perimetre).toBe("entier");
    expect(ctx.surfaceSol).toBe(43); /* RDC : 42,6 m² */
    expect(ctx.surfaceSolManual).toBe(true);
    expect(ctx.niveaux).toBe(2);
    expect(ctx.hauteur).toBe(2.5);
    expect(ctx.type).toBe("Maison"); /* typeBien absent : Maison par défaut */
    expect(ctx.finition).toBe("standard");
  });

  it("fenêtres : celles qui existent après travaux (une à boucher ne compte plus)", () => {
    /* remplacer, créer, garder → 3 ; boucher → 0 ; une porte n'est pas une fenêtre. */
    expect(ctx.fenetres).toBe(3);
  });

  it("sans code postal valide dans le contrat : aucun codePostal (l'écran le demandera)", () => {
    expect(codePostalDuContrat(CONTRAT)).toBeNull();
    expect("codePostal" in ctx).toBe(false);
    const c = copie();
    c.contexte.codePostal = "33620";
    expect(codePostalDuContrat(c)).toBe("33620");
    expect(ctxDepuisPlan(c).codePostal).toBe("33620");
    for (const faux of ["3362", "336200", "33 620", 33620, "abcde"]) {
      c.contexte.codePostal = faux;
      expect(codePostalDuContrat(c), String(faux)).toBeNull();
    }
  });

  it("le contrat reçu n'est pas modifié", () => {
    const avant = JSON.stringify(CONTRAT);
    ctxDepuisPlan(CONTRAT);
    expect(JSON.stringify(CONTRAT)).toBe(avant);
  });
});

describe("ctxDepuisPlan · règles", () => {
  it("un appareil à démolir ne fait plus une pièce d'eau", () => {
    const c = copie();
    for (const e of c.detailNiveaux[0].equipements) if (e.type === "douche" || e.type === "baignoire") e.etat = "demolir";
    const ctx = ctxDepuisPlan(c);
    /* La pièce reste typée « sdb » : comptée par son type (plan meublé ou non, règle D4). */
    expect(ctx.sdb).toBe(1);
    c.detailNiveaux[0].rooms[0].type = "dressing";
    expect(ctxDepuisPlan(c).sdb).toBe(0);
  });

  it("appartement : le type proposé par l'intake détaillé (Studio, T2, T3, T4), jamais « Appartement »", () => {
    const c = copie();
    c.contexte.typeBien = "appartement";
    expect(ctxDepuisPlan(c).type).toBe("T3"); /* deux chambres */
    c.detailNiveaux[1].rooms = [];
    expect(ctxDepuisPlan(c).type).toBe("T2");
    c.detailNiveaux[0].rooms[1].type = "sejour";
    expect(ctxDepuisPlan(c).type).toBe("Studio");
    c.contexte.typeBien = "maison";
    expect(ctxDepuisPlan(c).type).toBe("Maison");
  });

  it("logement de moins de deux ans → régime fiscal « pro » (TVA 20 %) ; sinon le défaut", () => {
    const c = copie();
    expect(ctxDepuisPlan(c).fiscal).toBe("habitation");
    c.contexte.logementPlus2Ans = false;
    expect(ctxDepuisPlan(c).fiscal).toBe("pro");
  });

  it("valeurs hors bornes ou d'un autre type : ramenées ou ignorées, jamais recopiées", () => {
    const c = copie();
    c.area = 1e9;
    c.bien.niveaux = 40;
    c.detailNiveaux[0].hauteur = 99;
    c.detailNiveaux[0].emprise = "42";
    c.bien.emprise = -3;
    c.contexte.finition = "luxe";
    c.contexte.typeBien = { x: 1 };
    c.detailNiveaux[0].rooms.push({ id: "z", type: "__proto__" }, { id: "y", type: "constructor" }, { id: "w", type: 42 });
    const ctx = ctxDepuisPlan(c);
    expect(ctx.surface).toBe(PLAN_CTX_SURFACE_MAX);
    expect(ctx.niveaux).toBe(6);
    expect(ctx.hauteur).toBe(6);
    expect(ctx.surfaceSol).toBe(Math.round(PLAN_CTX_SURFACE_MAX / 6));
    expect(ctx.finition).toBe("standard");
    expect(ctx.type).toBe("Maison");
    expect(ctx.chambres).toBe(2);
  });

  it("contrat vide ou absurde : le ctx par défaut, avec des compteurs à zéro", () => {
    for (const x of [null, undefined, 42, "texte", [], {}]) {
      const ctx = ctxDepuisPlan(x);
      expect(ctx.surface).toBe(defaultCtx().surface);
      for (const k of COMPTEURS) expect(ctx[k], `${String(x)} ${k}`).toBe(0);
      expect(ctx.perimetre).toBe("entier");
    }
  });
});
