import { describe, expect, it } from "vitest";
import { champDebut, encaissements, heureParis, jourDepuisLundi, lireDebut, lireMontant, lundiParis, montant, parMois, totalMensuel, totalTexte, type Charge } from "@/lib/admin/gestion";

/** Compta et planning de l'admin (27/11/2026) : les règles pures. */
describe("compta : montants et charges", () => {
  it("lit un montant écrit à la française ou à l'anglaise, refuse le reste", () => {
    expect(lireMontant("19,99")).toBe(1999);
    expect(lireMontant("19.99")).toBe(1999);
    expect(lireMontant("1 200")).toBe(120000);
    expect(lireMontant(" 12 € ")).toBe(1200);
    for (const x of ["", "abc", "12,999", "-5", "1e5", null]) expect(lireMontant(x)).toBeNull();
  });
  it("affiche, ramène au mois et totalise devise par devise, sans conversion", () => {
    expect(montant(1999)).toBe("19,99 €");
    expect(montant(120000, "USD")).toMatch(/^1\s200 \$$/);
    const c = (o: Partial<Charge>): Charge => ({ id: "x", nom: "C", montantCentimes: 1000, devise: "EUR", frequence: "mois", echeance: null, actif: true, ...o });
    expect(parMois(c({ montantCentimes: 1200, frequence: "an" }))).toBe(100);
    const t = totalMensuel([c({}), c({ montantCentimes: 2400, frequence: "an" }), c({ devise: "USD", montantCentimes: 20000 }), c({ actif: false })]);
    expect(t).toEqual({ EUR: 1200, USD: 20000 });
    expect(totalTexte(t)).toBe("12 € + 200 $");
    expect(totalTexte({})).toBe("0 €");
  });
  it("les entrées Stripe : paiements en euros, frais et remboursements à part", () => {
    const e = encaissements([
      { type: "charge", amount: 9900, fee: 160, currency: "eur" },
      { type: "payment", amount: 9900, fee: 160, currency: "eur" },
      { type: "refund", amount: -9900, fee: 0, currency: "eur" },
      { type: "payout", amount: -5000, fee: 0, currency: "eur" },
      { type: "charge", amount: 1000, fee: 50, currency: "usd" },
    ]);
    expect(e).toEqual({ brut: 19800, frais: 320, rembourse: 9900, net: 9580, nb: 2 });
  });
});

describe("planning : l'heure de France", () => {
  it("un champ date et heure se lit en heure de France, été comme hiver", () => {
    expect(lireDebut("2026-12-03T14:30")?.toISOString()).toBe("2026-12-03T13:30:00.000Z");
    expect(lireDebut("2026-07-03T14:30")?.toISOString()).toBe("2026-07-03T12:30:00.000Z");
    for (const x of ["2026-02-30T10:00", "2026-13-01T10:00", "03/12/2026 14:30", "", "2026-12-03T25:00"]) expect(lireDebut(x)).toBeNull();
  });
  it("aller-retour champ ↔ instant, heure affichée et jour de la semaine", () => {
    const t = lireDebut("2026-12-03T09:05")!;
    expect(champDebut(t)).toBe("2026-12-03T09:05");
    expect(heureParis(t)).toBe("09:05");
    const lundi = lundiParis(t);
    expect(new Date(lundi).toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(jourDepuisLundi(t, lundi)).toBe(3);
    // 23 h 30 à Paris le dimanche reste le dimanche de la même semaine (c'est déjà lundi en UTC+… mais pas à Paris)
    expect(jourDepuisLundi(lireDebut("2026-12-06T23:30")!, lundi)).toBe(6);
  });
});
