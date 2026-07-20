import { describe, it, expect } from "vitest";
import { estimer, type Reponses } from "@/lib/estimation";

/**
 * Golden test du moteur d'estimation : empreinte déterministe de scénarios témoins.
 * Toute modification qui change ces chiffres casse ce test → garde-fou contre les régressions.
 * (Valeurs de référence figées depuis le baseline vérifié.)
 */
const base: Reponses = {
  finition: "standard", curage: "complet", electricite: "totale", plomberie: "complete",
  sdb: "complete", cuisine: "complete", sols: "complet", solsType: "carrelage",
  peinture: "complete", fenetres: 8, cloisons: "quelques", chauffage: "pac", vmc: true,
} as unknown as Reponses;

type Attendu = { bas: number; haut: number; n: number };

const scenarios: [string, Reponses, string, Attendu][] = [
  ["reno-std", base, "33000", { bas: 76252, haut: 160558, n: 14 }],
  ["reno-luxe", { ...base, finition: "luxe" } as Reponses, "33000", { bas: 110567, haut: 232813, n: 14 }],
  ["reno-eco", { ...base, finition: "locatif" } as Reponses, "33000", { bas: 72441, haut: 152533, n: 14 }],
  ["reno-idf", base, "75011", { bas: 83184, haut: 175155, n: 14 }],
  ["reno-vieux", { ...base, anneeConstruction: "avant_1949", humidite: true } as Reponses, "33000", { bas: 83445, haut: 179914, n: 15 }],
  ["reno-detaille", { ...base, modeEstimation: "detaille" } as Reponses, "33000", { bas: 93866, haut: 126993, n: 19 }],
  ["neuf", { typeProjet: "neuf", finition: "standard", nbChambres: 3 } as unknown as Reponses, "33000", { bas: 213840, haut: 273240, n: 2 }],
];

describe("moteur d'estimation — scénarios golden", () => {
  for (const [nom, reponses, cp, attendu] of scenarios) {
    it(`${nom} reste déterministe`, () => {
      const e = estimer(100, cp, reponses, null, undefined);
      expect(e.totalBas, "totalBas").toBe(attendu.bas);
      expect(e.totalHaut, "totalHaut").toBe(attendu.haut);
      expect(e.lignes.length, "nombre de lignes").toBe(attendu.n);
      expect(e.totalBas).toBeLessThanOrEqual(e.totalHaut);
    });
  }

  it("l'estimation est purement fonctionnelle (même entrée → même sortie)", () => {
    const a = estimer(100, "33000", base, null, undefined);
    const b = estimer(100, "33000", base, null, undefined);
    expect(a.totalBas).toBe(b.totalBas);
    expect(a.totalHaut).toBe(b.totalHaut);
  });

  it("la fourchette s'élargit avec une plus grande surface", () => {
    const petit = estimer(50, "33000", base, null, undefined);
    const grand = estimer(150, "33000", base, null, undefined);
    expect(grand.totalHaut).toBeGreaterThan(petit.totalHaut);
  });
});
