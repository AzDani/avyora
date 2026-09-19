import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATALOG, buildDevis, defaultCtx, key, qtyOf, type Selection, type Ctx } from "@/lib/estimateur";
import { contributionsDuPlan, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { injecterPlan, lignesAValider } from "@/lib/estimateur/plan-injection";

const plan = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as PlanPourCorrespondance;
const { contributions } = contributionsDuPlan(plan);
const vide: Selection = {};

describe("injection · ce que le plan écrit", () => {
  const r = injecterPlan(vide, contributions);

  it("chaque contribution devient une ligne cochée, marquée comme venant du plan", () => {
    expect(r.lignes.length).toBe(contributions.length);
    for (const l of r.lignes) {
      const s = r.selection[l.cle];
      expect(s?.on, l.nom).toBe(true);
      expect(s?.plan, l.nom).toBe(true);
    }
  });

  it("sur un projet vide, tout est ajouté et rien n'est épinglé", () => {
    expect(r.bilan.ajoutees).toBe(contributions.length);
    expect(r.bilan.epinglees).toBe(0);
    /* Les déductions sont les lignes où le PLAN a choisi à la place de l'utilisateur : elles
       doivent arriver jusqu'au bilan, sinon l'écran de validation ne peut pas les signaler.
       On compte ce que la correspondance a réellement déduit plutôt qu'un seuil en dur — le
       seuil « > 3 » cassait dès qu'une déduction disparaissait pour une bonne raison (D21 :
       le matériau de plancher n'est plus deviné, il est demandé). */
    const deduites = contributions.filter((c) => c.deduction).length;
    expect(deduites).toBeGreaterThan(0);
    expect(r.bilan.deductions).toBe(deduites);
  });

  it("la sélection reçue n'est pas modifiée", () => {
    expect(Object.keys(vide).length).toBe(0);
  });

  it("le moteur lit bien les quantités injectées", () => {
    const ctx: Ctx = { ...defaultCtx(), surface: 36, surfaceSol: 36, hauteur: 2.5, codePostal: "33620" };
    const dv = buildDevis(CATALOG, ctx, r.selection);
    const faience = dv.lignes.find((l) => l.nom.startsWith("Faïence"))!;
    const attendu = r.lignes.find((l) => l.poste === "rev-faience-carrelage-mural")!;
    expect(faience.qty).toBeCloseTo(attendu.quantite, 0);
    expect(dv.totaux.ttc).toBeGreaterThan(1000);
  });

  it("un poste au forfait est coché sans quantité (D11)", () => {
    const etude = r.lignes.find((l) => l.poste === "etu-etude-de-structure")!;
    expect(etude.forfait).toBe(true);
    expect(r.selection[etude.cle].qty).toBeUndefined();
    expect(r.selection[etude.cle].manual).toBeUndefined();
    const ctx: Ctx = { ...defaultCtx(), surface: 36 };
    const lot = CATALOG.find((l) => l.c === "Etudes / Conception")!;
    expect(qtyOf(ctx, r.selection, lot.c, lot.t.find((t) => t.n === "Étude de structure")!)).toBe(1);
  });

  it("une variante demandée par la table est posée (D7)", () => {
    const mv = r.lignes.find((l) => l.poste === "plo-meuble-vasque")!;
    expect(r.selection[mv.cle].vsel).toEqual({ config: "double" });
  });
});

describe("injection · D12, une quantité corrigée à la main est épinglée", () => {
  it("le plan ne réécrit pas une ligne que l'utilisateur a corrigée", () => {
    const cible = contributions.find((c) => c.poste === "rev-carrelage-au-sol")!;
    const cle = key("Carrelage / Revetements", "Carrelage au sol");
    const avant: Selection = { [cle]: { on: true, qty: 99, manual: true } };   // saisie de l'utilisateur
    const r = injecterPlan(avant, contributions);
    expect(r.selection[cle].qty).toBe(99);
    const l = r.lignes.find((x) => x.cle === cle)!;
    expect(l.etat).toBe("epinglee");
    expect(l.avant).toBe(99);
    expect(l.quantite).toBeCloseTo(cible.quantite, 1);   // l'écart est rapporté, pas appliqué
    expect(r.bilan.epinglees).toBe(1);
  });

  it("le plan réécrit en revanche une ligne qu'il avait lui-même posée", () => {
    const cle = key("Carrelage / Revetements", "Carrelage au sol");
    const r1 = injecterPlan({}, contributions);
    const r2 = injecterPlan(r1.selection, contributions);
    expect(r2.lignes.find((x) => x.cle === cle)!.etat).toBe("inchangee");
    // et si le plan change, la ligne suit
    const modifie = contributions.map((c) => (c.poste === "rev-carrelage-au-sol" ? { ...c, quantite: 20 } : c));
    const r3 = injecterPlan(r1.selection, modifie);
    expect(r3.selection[cle].qty).toBe(20);
    expect(r3.lignes.find((x) => x.cle === cle)!.etat).toBe("mise-a-jour");
  });

  it("une ligne cochée sans quantité manuelle n'est pas épinglée : le plan l'alimente", () => {
    const cle = key("Carrelage / Revetements", "Carrelage au sol");
    const r = injecterPlan({ [cle]: { on: true } }, contributions);
    expect(r.lignes.find((x) => x.cle === cle)!.etat).not.toBe("epinglee");
    expect(r.selection[cle].plan).toBe(true);
  });
});

describe("injection · l'ordre de relecture", () => {
  it("ce qui demande une décision passe devant ce qui n'en demande pas", () => {
    const cle = key("Carrelage / Revetements", "Carrelage au sol");
    const r = injecterPlan({ [cle]: { on: true, qty: 99, manual: true } }, contributions);
    const ordre = lignesAValider(r);
    expect(ordre[0].etat).toBe("epinglee");
    const premiereSansDeduction = ordre.findIndex((l) => !l.deduction && l.etat !== "epinglee");
    const derniereDeduction = ordre.map((l) => !!l.deduction).lastIndexOf(true);
    expect(derniereDeduction).toBeLessThan(premiereSansDeduction);
  });
});

describe("import · le contrat est validé comme une entrée non fiable", () => {
  it("un plan sans numéro de contrat est refusé, avec la raison", async () => {
    const { planImportSchema } = await import("@/lib/validation");
    const r = planImportSchema.safeParse({ detailNiveaux: [] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toContain("contrat");
  });
  it("un plan d'une autre version majeure est refusé en le disant", async () => {
    const { planImportSchema } = await import("@/lib/validation");
    const r = planImportSchema.safeParse({ contrat: "2.0.0" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toContain("autre version");
  });
  it("le contrat de la scène de référence passe la validation", async () => {
    const { planImportSchema } = await import("@/lib/validation");
    expect(planImportSchema.safeParse(plan).success).toBe(true);
  });
  it("une version mineure plus récente passe : on n'ajoute que des clés", async () => {
    const { planImportSchema } = await import("@/lib/validation");
    expect(planImportSchema.safeParse({ ...plan, contrat: "1.9.3" }).success).toBe(true);
  });
});
