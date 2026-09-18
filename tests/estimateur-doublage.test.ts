import { describe, it, expect } from "vitest";
import { CATALOG, buildDevis, presetRapide, derivedFinitions, key, type Selection } from "@/lib/estimateur";

const base = { type: "T3" as const, surface: 70, codePostal: "33620", ampleur: "complete" as const, finition: "standard" as const, qui: "pros" as const };
const ITI = key("Isolation", "Isolation des murs par l'intérieur");
const DOUBLAGE = key("Cloisons / Platrerie", "Doubler un mur");

/** Décision du 18/09/2026 : c'est l'ITI qui porte le doublage de la façade, pas « Doubler un mur ». */
describe("doublage : une seule paroi, un seul poste", () => {
  it("une rénovation complète ne coche plus les deux postes", () => {
    const { sel } = presetRapide(base);
    expect(sel[ITI]?.on).toBe(true);
    expect(sel[DOUBLAGE]?.on).toBeFalsy();
  });

  it("les finitions plâtrerie survivent au retrait du doublon", () => {
    const { ctx, sel } = presetRapide(base);
    const avant: Selection = { ...sel, [DOUBLAGE]: { on: true } };
    expect(derivedFinitions(ctx, sel)).toBe(derivedFinitions(ctx, avant)); // l'ITI a pris le relais
    expect(derivedFinitions(ctx, sel)).toBeGreaterThan(0);
  });

  it("cocher les deux ne compte la paroi qu'une fois dans les finitions", () => {
    const { ctx, sel } = presetRapide(base);
    const seulDoublage: Selection = { ...sel, [ITI]: { on: false }, [DOUBLAGE]: { on: true } };
    const lesDeux: Selection = { ...sel, [DOUBLAGE]: { on: true } };
    expect(derivedFinitions(ctx, lesDeux)).toBe(derivedFinitions(ctx, seulDoublage));
  });

  it("le devis d'une rénovation complète baisse du prix de la paroi en double", () => {
    const { ctx, sel } = presetRapide(base);
    const avant: Selection = { ...sel, [DOUBLAGE]: { on: true } };
    const ecart = buildDevis(CATALOG, ctx, avant).totaux.ttc - buildDevis(CATALOG, ctx, sel).totaux.ttc;
    expect(ecart).toBeGreaterThan(4000); // ~4 646 € TTC mesurés sur ce cas
  });
});
