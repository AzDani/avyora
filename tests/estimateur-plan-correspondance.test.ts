import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { contributionsDuPlan, postesCouverts, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { posteParId } from "@/lib/estimateur/identite";

/** Contrat 1.1.0 produit par l'éditeur de plan sur un scénario délibéré (voir le commit). */
const plan = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as PlanPourCorrespondance;
const { contributions, ignores } = contributionsDuPlan(plan);
const q = (id: string) => contributions.find((c) => c.poste === id)?.quantite ?? 0;

describe("table de correspondance · les postes existent et rien n'est inventé", () => {
  it("chaque poste visé par la table est au catalogue", () => {
    expect(postesCouverts().filter((id) => !posteParId(id))).toEqual([]);
  });
  it("chaque contribution produite désigne un poste réel, avec une quantité positive", () => {
    expect(contributions.length).toBeGreaterThan(10);
    for (const c of contributions) {
      expect(posteParId(c.poste), c.poste).toBeTruthy();
      expect(c.quantite, c.poste).toBeGreaterThan(0);
      expect(c.raison.length).toBeGreaterThan(5);
    }
  });
  it("un poste n'apparaît qu'une fois, ses sources regroupées", () => {
    const ids = contributions.map((c) => c.poste + JSON.stringify(c.variante ?? {}));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("table de correspondance · D1, seul le delta est facturé", () => {
  it("les 29 équipements existants du plan ne produisent rien", () => {
    const existants = (plan.detailNiveaux ?? []).flatMap((n) => n.equipements ?? []).filter((e) => e.etat === "existant");
    expect(existants.length).toBeGreaterThan(10);
    // aucune source de contribution ne vient d'un équipement existant
    const src = new Set(contributions.flatMap((c) => c.sources));
    for (const e of existants) expect(src.has(e.id), e.type).toBe(false);
  });
  it("une menuiserie conservée ne produit rien", () => {
    const gardee = (plan.detailNiveaux ?? []).flatMap((n) => n.menuiseries ?? []).find((m) => m.etat === "garder")!;
    expect(gardee).toBeTruthy();
    expect(contributions.flatMap((c) => c.sources)).not.toContain(gardee.id);
  });
});

describe("table de correspondance · ce que le scénario doit produire", () => {
  it("le mur porteur démoli donne ses trois lignes (D9)", () => {
    expect(q("dem-abattre-un-mur-porteur")).toBeCloseTo(22.5, 1);
    expect(q("mac-poutre-de-reprise-de-charge-ipn-hea")).toBeCloseTo(9, 1);
    expect(q("etu-etude-de-structure")).toBe(1);
  });
  it("cloisons : une démolie, une créée, chacune dans son poste", () => {
    expect(q("dem-abattre-une-cloison")).toBeCloseTo(3.25, 1);
    expect(q("clo-monter-une-cloison")).toBeCloseTo(17.5, 1);
  });
  it("la douche à l'italienne prend sa branche, et une seule (D6)", () => {
    expect(q("plo-douche-a-l-italienne")).toBe(1);
    expect(q("plo-bac-de-douche")).toBe(0);
    expect(q("plo-cabine-complete-parois-porte")).toBe(0);
    expect(q("plo-colonne-de-douche")).toBe(1);
    expect(q("plo-paroi-de-douche")).toBe(1);
  });
  it("la double vasque est UNE unité en variante double (D7)", () => {
    const mv = contributions.find((c) => c.poste === "plo-meuble-vasque")!;
    expect(mv.quantite).toBe(1);
    expect(mv.variante).toEqual({ config: "double" });
  });
  it("l'escalier en béton et les points lumineux suivent leur attribut (D15)", () => {
    expect(q("mac-escalier-en-beton")).toBe(1);
    expect(q("toi-escalier-en-bois")).toBe(0);
    expect(q("ele-spots-encastres-led")).toBe(1);
    expect(q("ele-ajouter-un-point-lumineux")).toBe(1);
  });
  it("une prise double compte deux prises, un plan de travail compte ses mètres", () => {
    expect(q("ele-ajouter-deplacer-une-prise")).toBe(2);
    expect(q("cui-plan-de-travail-seul")).toBeCloseTo(2.4, 2);
  });
  it("la menuiserie remplacée est déposée puis reposée", () => {
    expect(q("dem-enlever-les-anciennes-portes-fenetres")).toBe(1);
    expect(q("min-porte-interieure-battante")).toBe(1);
    expect(q("mex-fenetres")).toBe(2);
    expect(q("mex-volets-roulants")).toBe(1);
  });
  it("le percement du mur porteur et le doublage intérieur remontent", () => {
    expect(q("mac-ouvrir-un-mur-porteur-petite-porte-fenetre")).toBe(1);
    expect(q("iso-isolation-des-murs-par-l-interieur")).toBeCloseTo(22.5, 1);
    expect(q("clo-doubler-un-mur")).toBe(0); // D2 : c'est l'ITI qui porte le doublage
  });
  it("la robinetterie de lavabo n'est PAS injectée : le moteur la dérive du meuble", () => {
    expect(q("plo-robinetterie-lavabo")).toBe(0);
  });
});

describe("table de correspondance · ce qu'elle ne sait pas faire, elle le dit", () => {
  it("le rebouchage d'une ouverture part dans les ignorés, avec sa raison", () => {
    const b = ignores.find((i) => i.quoi.includes("boucher"));
    expect(b, JSON.stringify(ignores)).toBeTruthy();
    expect(b!.pourquoi).toContain("aucun poste");
  });
  it("chaque ignoré porte une raison lisible", () => {
    for (const i of ignores) expect(i.pourquoi.length).toBeGreaterThan(10);
  });
});
