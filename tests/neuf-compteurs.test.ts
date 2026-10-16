/**
 * Chantier N8 (revue rénovation / neuf, §5 et §6) : le moteur neuf reçoit les mêmes réponses que la
 * rénovation — séjour, cuisines, chambres, suites, salles de bain, WC, couloir, buanderie, menuiseries —
 * et chacune a un effet sur le chiffrage. Avec les valeurs par défaut, rien ne bouge (témoin T5).
 */
import { describe, it, expect } from "vitest";
import {
  buildDevis, catalogueDe, ctxNeuf, defaultCtx, geometrieNeuf, key, maisonComplete, maisonParDefaut, piecesEff, piecesNeuf,
  presetMaison, quantitesNeuf, sdbEff, POSTE_NEUF, type MaisonNeuve,
} from "@/lib/estimateur";
import { QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { changerReponseNeuf, etatDepuisPreset } from "@/lib/estimateur/detaille-neuf";

/** La maison A de calage (plain-pied 100 m², 3 chambres, 1 SDB, 1 WC). */
const A: Partial<MaisonNeuve> = { surface: 100, niveaux: "pp", chambres: 3, sdb: 1, wc: 1, garage: 0, codePostal: "45000" };
const ttc = (m: Partial<MaisonNeuve>) => { const p = presetMaison(m, { codePostal: "45000" }); return buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc; };
const cle = (id: string) => { const p = POSTE_NEUF.get(id)!; return key(p.c, p.n); };

describe("N8 · les compteurs par défaut chiffrent comme avant", () => {
  it("séjour 1, cuisine 1, couloir 1, ni suite ni buanderie : 3 + chambres pièces, 6 comme defaultCtx() en rénovation", () => {
    const m = maisonParDefaut(100);
    expect(m).toMatchObject({ sejour: 1, cuisines: 1, couloir: 1, suites: 0, buanderie: 0, cuisine: true });
    expect(m).not.toHaveProperty("menuiseries");
    expect(m).not.toHaveProperty("emprise");
    expect(piecesNeuf(m).pieces).toBe(3 + m.chambres);
    expect(geometrieNeuf(m).piecesEff).toBe(6);
    expect(piecesEff(defaultCtx())).toBe(6);
  });

  it("le contexte moteur porte les compteurs sous les noms de la rénovation : piecesEff et sdbEff disent la même chose que la géométrie", () => {
    for (const m of [maisonComplete(A), maisonComplete({ ...A, chambres: 2, suites: 1, sdb: 0, buanderie: 1, couloir: 2 })]) {
      const ctx = ctxNeuf(m);
      expect(piecesEff(ctx)).toBe(geometrieNeuf(m).piecesEff);
      expect(sdbEff(ctx)).toBe(piecesNeuf(m).sdb);
      expect([ctx.sejour, ctx.cuisine, ctx.chambres, ctx.suites, ctx.couloir, ctx.buanderie]).toEqual([m.sejour, m.cuisines, m.chambres, m.suites, m.couloir, m.buanderie]);
    }
  });
});

describe("N8 · chaque compteur de la rénovation a un effet sur le chiffrage neuf", () => {
  const ref = ttc(A);
  for (const [k, v] of [["sejour", 2], ["cuisines", 2], ["couloir", 2], ["buanderie", 1], ["menuiseries", 12], ["suites", 1]] as const) {
    it(`${k} = ${v}`, () => expect(ttc({ ...A, [k]: v })).not.toBe(ref));
  }

  it("une suite parentale est une chambre ET une salle de bain : 2 chambres + 1 suite chiffrent comme 3 chambres + 1 SDB", () => {
    const suite = maisonComplete({ ...A, chambres: 2, suites: 1, sdb: 0 });
    expect(piecesNeuf(suite)).toMatchObject({ chambres: 3, sdb: 1 });
    expect(quantitesNeuf(suite)).toEqual(quantitesNeuf(maisonComplete(A)));
    expect(ttc(suite)).toBe(ref);
  });

  it("une suite ajoutée compte dans les chambres, les salles de bain, les portes et les pièces", () => {
    const g0 = geometrieNeuf(maisonComplete(A)), g1 = geometrieNeuf(maisonComplete({ ...A, suites: 1 }));
    expect(g1.nPortesInt).toBe(g0.nPortesInt + 2);           // la chambre et sa salle de bain
    expect(g1.piecesEff).toBe(g0.piecesEff + 1);
    expect(g1.faience).toBe(g0.faience + 12);
    const q = quantitesNeuf(maisonComplete({ ...A, suites: 1 }));
    expect(q["cha-seche-serviette"]).toBe(2);
    expect(q["cha-radiateurs-electriques"]).toBe(4);
  });

  it("une buanderie ajoute une porte et une pièce ; un couloir, un séjour ou une cuisine de plus, une pièce (plinthes)", () => {
    const g0 = geometrieNeuf(maisonComplete(A));
    const b = geometrieNeuf(maisonComplete({ ...A, buanderie: 1 }));
    expect([b.nPortesInt, b.piecesEff]).toEqual([g0.nPortesInt + 1, g0.piecesEff + 1]);
    for (const k of ["sejour", "cuisines", "couloir"] as const) {
      const g = geometrieNeuf(maisonComplete({ ...A, [k]: 2 }));
      expect([g.nPortesInt, g.piecesEff], k).toEqual([g0.nPortesInt, g0.piecesEff + 1]);
    }
  });

  it("la cuisine équipée reste le booléen : une cuisine ouverte sur le séjour (cuisines = 0) s'équipe aussi", () => {
    const k = cle("cui-cuisine-complete-neuve-tout-compris");
    expect(presetMaison({ ...A, cuisines: 0 }).sel[k]?.on).toBe(true);
    expect(presetMaison({ ...A, cuisine: false }).sel[k]?.on).toBeFalsy();
  });
});

describe("N8 · le compteur Menuiseries (§5 de la revue)", () => {
  const deduit = geometrieNeuf(maisonComplete(A));
  const n0 = deduit.nFen + deduit.nPF + deduit.nBaie;

  it("égal au nombre déduit (le compteur prérempli) : exactement la formule d'avant", () => {
    expect(quantitesNeuf(maisonComplete({ ...A, menuiseries: n0 }))).toEqual(quantitesNeuf(maisonComplete(A)));
  });

  it("modifié : portes-fenêtres et baies déduites gardées, les fenêtres font le reste ; surface vitrée recalculée sur les nombres", () => {
    const g = geometrieNeuf(maisonComplete({ ...A, menuiseries: 12 }));
    expect([g.nBaie, g.nPF]).toEqual([deduit.nBaie, deduit.nPF]);
    expect(g.nFen + g.nPF + g.nBaie).toBe(12);
    expect(g.aOuv).toBeCloseTo(2.2 + 5.16 * g.nBaie + 2.58 * g.nPF + 1.25 * g.nFen, 9);
    expect(g.mursExtNet).toBeLessThan(deduit.mursExtNet);
    expect(quantitesNeuf(maisonComplete({ ...A, menuiseries: 12 }))["mex-fenetres"]).toBe(g.nFen);
  });

  it("plus petit que les baies et portes-fenêtres déduites : le nombre est tenu, rien de négatif", () => {
    for (const n of [0, 1, 2]) {
      const g = geometrieNeuf(maisonComplete({ ...A, menuiseries: n }));
      expect(g.nFen + g.nPF + g.nBaie).toBe(n);
      expect(Math.min(g.nFen, g.nPF, g.nBaie)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("N8 · l'emprise mesurée sur un plan", () => {
  it("remplace l'emprise déduite, et n'est gardée que pour la maison mesurée", () => {
    expect(geometrieNeuf(maisonComplete({ ...A, emprise: 110 })).E).toBe(110);
    expect(maisonComplete({ ...A, emprise: 300 })).not.toHaveProperty("emprise");     // hors de 0,7 à 1,5 fois l'emprise déduite
    expect(maisonComplete({ ...A, emprise: -5 })).not.toHaveProperty("emprise");
    const e = etatDepuisPreset(presetMaison({ ...A, emprise: 110 }), "pros");
    expect(e.maison.emprise).toBe(110);
    expect(changerReponseNeuf(e, "vmc", "double").maison.emprise).toBe(110);
    expect(changerReponseNeuf(e, "surface", 140).maison).not.toHaveProperty("emprise");
    expect(changerReponseNeuf(e, "niveaux", "etage").maison).not.toHaveProperty("emprise");
  });
});

describe("N8 · le questionnaire du détaillé dit les suites venues d'un plan", () => {
  const q = (k: string) => QUESTIONS_NEUF.flatMap((g) => g.qs).find((x) => x.k === k)!;
  it("chambres et salles d'eau : une aide « + 1 suite » ; aucune sans suite", () => {
    const m = maisonComplete({ ...A, chambres: 2, suites: 1, sdb: 0 });
    expect(q("chambres").hintDe?.(m)).toEqual({ fr: "+ 1 suite parentale", en: "+ 1 master suite" });
    expect(q("sdb").hintDe?.(m)).toEqual({ fr: "+ 1 dans la suite", en: "+ 1 in the suite" });
    expect(q("sdb").hintDe?.(maisonComplete({ ...A, suites: 2, sdb: 0 }))?.fr).toBe("+ 2 dans les suites");
    expect(q("chambres").hintDe?.(maisonComplete(A))).toBeNull();
  });
  it("le minimum des salles d'eau tombe à 0 quand une suite a la sienne", () => {
    expect(q("sdb").minDe?.(maisonComplete(A))).toBe(1);
    expect(q("sdb").minDe?.(maisonComplete({ ...A, suites: 1 }))).toBe(0);
  });
});
