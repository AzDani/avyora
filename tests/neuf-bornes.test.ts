/**
 * Bornes et validation des données du neuf relues hors des formulaires (lien de plan, brouillon,
 * réponses renvoyées par l'API) : constats du jury « sécurité ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildDevis, catalogueDe, presetMaison, maisonComplete, maisonParDefaut, GARAGE_MAX, DISTANCE_RESEAUX_MAX, BORNES_NEUF } from "@/lib/estimateur";
import { encoderFragmentPlan, extraitPlanNeuf, lirePlanNeuf, planNeufSchema, SURFACE_PLAN_MIN, SURFACE_PLAN_MAX } from "@/lib/estimateur/plan-neuf";
import { lireBrouillonNeuf, nomProjetNeuf, lignesPersoValides, lireReponsesRapideNeuf } from "@/lib/estimateur/brouillon-neuf";
import { QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { contexteNeuf } from "@/lib/neuf-contexte";
import { lireBrouillonDetailNeuf, repriseDepuisReponses } from "@/lib/estimateur/detaille-neuf";

const MAISON94 = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "plan-final-contrat.json"), "utf8"));
const copie = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const ttc = (m: Parameters<typeof maisonComplete>[0]) => {
  const { ctx, sel } = presetMaison(maisonComplete(m), { codePostal: "45000" });
  return buildDevis(catalogueDe(ctx), ctx, sel).totaux.ttc;
};

describe("Neuf · garage d'un plan borné", () => {
  function avecGarage(aire: number, n = 1) {
    const c = copie(MAISON94);
    const pieces = c.detailNiveaux[0].rooms;
    for (let i = 0; i < n; i++) pieces.push({ ...pieces[0], id: "g" + i, name: "Garage", type: "garage", area: aire });
    return lirePlanNeuf(encoderFragmentPlan(extraitPlanNeuf(c)));
  }
  it("un garage de 2 000 m² (ou six) est ramené à 80 m², avec un avertissement", () => {
    for (const r of [avecGarage(2000), avecGarage(2000, 6)]) {
      if ("refus" in r) throw new Error(String(r.refus));
      expect(r.maison.garage).toBe(GARAGE_MAX);
      expect(r.avertissements).toContain("grandGarage");
    }
  });
  it("un garage normal reste tel quel, sans avertissement", () => {
    const r = avecGarage(30);
    if ("refus" in r) throw new Error(String(r.refus));
    expect(r.maison.garage).toBe(30);
    expect(r.avertissements).not.toContain("grandGarage");
  });
});

describe("Neuf · maisonComplete ramène les réponses dans les bornes et les choix", () => {
  it("garage et distance aux réseaux bornés", () => {
    expect(maisonComplete({ garage: 1e6 }).garage).toBe(GARAGE_MAX);
    expect(maisonComplete({ distanceReseaux: 1e6 }).distanceReseaux).toBe(DISTANCE_RESEAUX_MAX);
    expect(ttc({ garage: 1e6 })).toBe(ttc({ garage: GARAGE_MAX }));
  });
  it("une valeur hors des choix ou d'un autre type garde le défaut (même prix que sans elle)", () => {
    const ref = ttc({});
    expect(ttc({ forme: "zz" as never })).toBe(ref);
    expect(ttc({ surface: "abc" as never })).toBe(ref);
    expect(ttc({ niveaux: "__proto__" as never })).toBe(ref);
    expect(maisonComplete({ murs: 3 as never }).murs).toBe(maisonParDefaut().murs);
    expect(Object.keys(maisonComplete({ inconnue: 1 } as never))).not.toContain("inconnue");
  });
  it("une saisie normale ne change pas", () => {
    const m = { surface: 140, niveaux: "etage", garage: 25, murs: "brique", distanceReseaux: 40, codePostal: "69003" } as const;
    expect(maisonComplete(m)).toMatchObject(m);
  });
});

describe("N8 · une seule table de bornes (BORNES_NEUF)", () => {
  const q = (k: string) => QUESTIONS_NEUF.flatMap((g) => g.qs).find((x) => x.k === k)!;
  it("les questions du détaillé, le plan, le rapide relu et le lien public lisent la même table", () => {
    for (const k of ["surface", "chambres", "sdb", "wc", "distanceReseaux"] as const) {
      expect([q(k).min, q(k).max], k).toEqual([BORNES_NEUF[k].min, BORNES_NEUF[k].max]);
    }
    expect([SURFACE_PLAN_MIN, SURFACE_PLAN_MAX]).toEqual([BORNES_NEUF.surface.min, BORNES_NEUF.surface.max]);
    expect([GARAGE_MAX, DISTANCE_RESEAUX_MAX]).toEqual([BORNES_NEUF.garage.max, BORNES_NEUF.distanceReseaux.max]);
    const R = { surface: 400, niveaux: "pp", finition: "standard", qui: "pros", codePostal: "45000" };
    expect(lireReponsesRapideNeuf(R)?.surface).toBe(400);
    expect(lireReponsesRapideNeuf({ ...R, surface: 401 })).toBeNull();
    expect(contexteNeuf({ surface: "400" }).surface).toBe(400);
    expect(contexteNeuf({ surface: "401" }).surface).toBeUndefined();
  });
  it("maisonComplete ramène chaque compteur dans sa borne, la surface comprise (400 m², comme le formulaire)", () => {
    const m = maisonComplete({ surface: 1e6, sejour: 99, cuisines: 99, chambres: 99, suites: -3, sdb: 99, wc: 0, couloir: 99, buanderie: 99, menuiseries: 1e6 });
    expect(m).toMatchObject({ surface: 400, sejour: 5, cuisines: 3, chambres: 10, suites: 0, sdb: 6, wc: 1, couloir: 10, buanderie: 4, menuiseries: 80 });
    expect(maisonComplete({ menuiseries: 2.6 }).menuiseries).toBe(3);
    expect(maisonComplete({ menuiseries: "12" as never })).not.toHaveProperty("menuiseries");
    expect(maisonComplete({ suites: "1" as never }).suites).toBe(0);
  });
  it("au moins une salle de bain, suites comprises ; au moins un WC", () => {
    expect(maisonComplete({ sdb: 0 }).sdb).toBe(1);
    expect(maisonComplete({ sdb: 0, suites: 1 })).toMatchObject({ sdb: 0, suites: 1 });
    expect(maisonComplete({ wc: 0 }).wc).toBe(1);
  });
});

describe("Neuf · contrat du plan borné", () => {
  it("une version de 15 000 chiffres est refusée", () => {
    const c = copie(MAISON94);
    c.contrat = "1.18." + "9".repeat(15000);
    expect(planNeufSchema.safeParse(extraitPlanNeuf(c)).success).toBe(false);
    const r = lirePlanNeuf(encoderFragmentPlan(extraitPlanNeuf(c)));
    expect("refus" in r).toBe(true);
  });
});

describe("Neuf · brouillons relus sans planter", () => {
  const maison = maisonParDefaut(100);
  it("une ligne perso null est écartée (détaillé, reprise, brouillon rapide)", () => {
    expect(lignesPersoValides([null, "x", { lot: "Maçonnerie", nom: "a", prix: 1, qte: 1, tva: 20 }])).toHaveLength(1);
    const det = lireBrouillonDetailNeuf(JSON.stringify({ v: "neuf-detail", etat: { maison, sel: { a: null } }, custom: [null] }));
    expect(det?.custom).toEqual([]);
    expect(det?.etat.sel).toEqual({});
    const rep = repriseDepuisReponses({ v: "estimateur", ctx: { nature: "neuf", neuf: maison, surface: 100 }, sel: { a: 3 }, custom: [null] });
    expect(rep?.custom).toEqual([]);
    expect(rep?.etat.sel).toEqual({});
    const br = lireBrouillonNeuf(JSON.stringify({ v: "estimateur", ctx: { nature: "neuf", neuf: maison, surface: 100, codePostal: "45000" }, codePostal: "45000", custom: [null], sel: "x" }));
    expect(br?.custom).toBeUndefined();
    expect(br?.sel).toEqual({});
  });
  it("le nom du projet ne montre jamais [object Object] ni NaN", () => {
    const nom = nomProjetNeuf({ niveaux: "__proto__" as never, surface: "abc" as never });
    expect(nom).not.toMatch(/object|NaN/);
    expect(nomProjetNeuf({ niveaux: "etage", surface: 120 })).toBe("Construction neuve — Maison à étage 120 m²");
  });
});
