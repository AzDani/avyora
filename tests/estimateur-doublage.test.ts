import { describe, it, expect } from "vitest";
import { CATALOG, buildDevis, presetRapide, derivedFinitions, isAuto, defaultCtx, key, type Selection } from "@/lib/estimateur";

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

/** D9 : les trois postes créés le 19/09/2026, prix validés par Dani sur relevé de marché. */
describe("D9 : mur porteur et mur en pierre", () => {
  const trouve = (lot: string, nom: string) => CATALOG.find((l) => l.c === lot)?.t.find((t) => t.n === nom);

  it("les trois postes existent, avec leur unité et leur prix", () => {
    expect(trouve("Démolition", "Abattre un mur porteur")).toMatchObject({ u: "m2", fp: 110, sm: 25 });
    expect(trouve("Maçonnerie", "Poutre de reprise de charge (IPN / HEA)")).toMatchObject({ u: "ml", fp: 480, sm: 180 });
    expect(trouve("Maçonnerie", "Monter un mur en pierre")).toMatchObject({ u: "m2", fp: 250, sm: 100 });
  });

  it("aucun des trois n'a de quantité automatique : le plan les alimente, ou personne", () => {
    for (const [lot, nom] of [["Démolition", "Abattre un mur porteur"], ["Maçonnerie", "Poutre de reprise de charge (IPN / HEA)"], ["Maçonnerie", "Monter un mur en pierre"]] as const) {
      expect(isAuto(defaultCtx(), lot, nom), nom).toBe(false);
    }
  });

  it("ils n'apparaissent dans aucune estimation existante : rien ne change pour personne", () => {
    const { ctx, sel } = presetRapide(base);
    const noms = buildDevis(CATALOG, ctx, sel).lignes.map((l) => l.nom);
    expect(noms.some((n) => n.startsWith("Abattre un mur porteur") || n.startsWith("Poutre de reprise") || n.startsWith("Monter un mur en pierre"))).toBe(false);
  });
});
