import { describe, it, expect } from "vitest";
import { compteursDepuisPlan, MAPPAGE_PIECES, type PiecePlan, type TypePiecePlan } from "@/lib/estimateur/plan-mapping";

const p = (type: TypePiecePlan, extra: Partial<PiecePlan> = {}): PiecePlan => ({ type, ...extra });
/** Ce que le moteur chiffrera réellement en salles de bain : sdbEff = sdb + suites. */
const sdbEff = (c: { sdb: number; suites: number }) => c.sdb + c.suites;

describe("D4 · les 22 types ont tous une règle", () => {
  it("aucun type du plan n'est oublié", () => {
    const attendus: TypePiecePlan[] = ["sejour","cuisine","chambre","suite","sdb","wc","entree","couloir","buanderie","sde","dressing","bureau","cellier","palier","mezzanine","garage","cave","combles","grange","atelier","exterieur","autre"];
    expect(Object.keys(MAPPAGE_PIECES).sort()).toEqual([...attendus].sort());
  });

  it("les huit compteurs sont toujours écrits, même pour un plan vide", () => {
    expect(compteursDepuisPlan([])).toEqual({ sejour: 0, cuisine: 0, chambres: 0, suites: 0, couloir: 0, buanderie: 0, sdb: 0, wc: 0 });
  });

  it("un plan de garage seul n'écrit aucune pièce de vie", () => {
    const c = compteursDepuisPlan([p("garage"), p("cave"), p("combles"), p("exterieur")]);
    expect(Object.values(c).every((v) => v === 0)).toBe(true);
  });
});

describe("D4 · pièces d'eau : autant que le plan en dessine, jamais une de plus", () => {
  it("suite indivise + salle de bain familiale = 2 pièces d'eau", () => {
    const c = compteursDepuisPlan([p("suite", { doucheOuBaignoire: true }), p("sdb", { doucheOuBaignoire: true }), p("chambre"), p("sejour")]);
    expect(c.suites).toBe(1);
    expect(c.sdb).toBe(1);
    expect(sdbEff(c)).toBe(2);
  });

  it("suite cloisonnée : la face « suite » et SA salle de bain ne comptent qu'une pièce d'eau", () => {
    const c = compteursDepuisPlan([p("suite"), p("sdb", { doucheOuBaignoire: true }), p("sejour")]);
    expect(c.suites).toBe(0);      // la suite devient une chambre…
    expect(c.chambres).toBe(1);
    expect(sdbEff(c)).toBe(1);     // …et sa salle de bain est comptée une seule fois
  });

  it("le doublon que la règle évite vaut une salle de bain entière", () => {
    const naif = compteursDepuisPlan([p("suite"), p("sdb", { doucheOuBaignoire: true })]);
    expect(sdbEff(naif)).toBe(1);  // un mappage par type seul aurait donné 2
  });

  it("une douche dans le garage compte, le type ne le dirait jamais", () => {
    const c = compteursDepuisPlan([p("garage", { doucheOuBaignoire: true }), p("sdb", { doucheOuBaignoire: true })]);
    expect(sdbEff(c)).toBe(2);
  });

  it("un WC avec lavabo n'est pas une salle de bain", () => {
    const c = compteursDepuisPlan([p("wc", { cuvettes: 1 }), p("sdb", { doucheOuBaignoire: true })]);
    expect(sdbEff(c)).toBe(1);
    expect(c.wc).toBe(1);
  });

  it("plan dessiné sans mobilier : on retombe sur les types, la suite garde sa salle de bain", () => {
    const c = compteursDepuisPlan([p("suite"), p("sdb"), p("sde"), p("wc")]);
    expect(c.suites).toBe(1);
    expect(c.sdb).toBe(2);   // sdb + sde
    expect(c.wc).toBe(1);
  });

  it("la cuvette posée dans la salle de bain compte, sans doubler celle du WC séparé", () => {
    const c = compteursDepuisPlan([p("wc", { cuvettes: 1 }), p("sdb", { doucheOuBaignoire: true, cuvettes: 1 })]);
    expect(c.wc).toBe(2);
  });
});

describe("D4 · pièces de vie", () => {
  it("entrée, couloir et palier se rejoignent dans « Couloir / dégagement »", () => {
    expect(compteursDepuisPlan([p("entree"), p("couloir"), p("palier")]).couloir).toBe(3);
  });

  it("le bureau compte en chambre, le cellier en buanderie", () => {
    const c = compteursDepuisPlan([p("bureau"), p("cellier"), p("buanderie")]);
    expect(c.chambres).toBe(1);
    expect(c.buanderie).toBe(2);
  });

  it("dressing, mezzanine et « autre » n'entrent dans aucun compteur", () => {
    const c = compteursDepuisPlan([p("dressing"), p("mezzanine"), p("autre")]);
    expect(Object.values(c).every((v) => v === 0)).toBe(true);
  });

  it("un T3 complet se lit comme l'utilisateur le déclarerait", () => {
    const c = compteursDepuisPlan([
      p("entree"), p("sejour"), p("cuisine"), p("chambre"), p("chambre"),
      p("sdb", { doucheOuBaignoire: true }), p("wc", { cuvettes: 1 }), p("couloir"),
    ]);
    expect(c).toEqual({ sejour: 1, cuisine: 1, chambres: 2, suites: 0, couloir: 2, buanderie: 0, sdb: 1, wc: 1 });
  });
});
