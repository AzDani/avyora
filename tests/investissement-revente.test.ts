/**
 * Module M3 · achat-revente (lib/investissement/revente) : plus-value du particulier, résidence principale,
 * marchand de biens à l'IS. Valeurs calculées à la main depuis docs/investissement/regles-fiscales-2026.md.
 */
import { describe, it, expect } from "vitest";
import { simulerRevente, abattementIR, abattementPS, surtaxe, tauxPrimo, type EntreeRevente, type CadreRevente } from "@/lib/investissement/revente";
import { completerRevente, entreeRevente, investSchema } from "@/lib/investissement/saisie";

/** Achat 100 000 € dans le Loiret, 50 000 € de travaux, sans crédit ni charges, revendu 200 000 € au bout de 12 mois. */
const base = (p: Partial<EntreeRevente> = {}): EntreeRevente => ({
  prix: 100_000, neuf: false, dept: "45", fraisNotaire: null, fraisAgence: 0, travaux: 50_000, travauxEntreprisePct: 100, etatNeuf: false,
  apport: 1_000_000, taux: 0, dureeAns: 20, assurancePct: 0, fraisDossier: 0, sansIra: false,
  taxeFonciere: 0, chargesAnnuelles: 0, dureeMois: 12, prixRevente: 200_000, fraisAgenceVente: 0, diagnostics: 0, mainlevee: null,
  habite: false, primo: false, nbVendeurs: 1, comptableIs: 1_440, creationSociete: 1_000,
  ...p,
});
const cadre = (e: EntreeRevente, c: CadreRevente) => simulerRevente(e).cadres.find((x) => x.cadre === c)!;
// Frais de notaire à 100 000 € dans le Loiret : 6 318,50 + 100 (CSI) + 1 435,50 (émoluments TTC) + 1 000 (débours).
const NOTAIRE = 8_854;

describe("barèmes de la plus-value", () => {
  it("abattements pour durée de détention", () => {
    expect(abattementIR(5)).toBe(0);
    expect(abattementIR(10)).toBeCloseTo(0.3, 6);
    expect(abattementIR(21)).toBeCloseTo(0.96, 6);
    expect(abattementIR(22)).toBe(1);
    expect(abattementPS(10)).toBeCloseTo(0.0825, 6);
    expect(abattementPS(22)).toBeCloseTo(0.28, 6);
    expect(abattementPS(25)).toBeCloseTo(0.55, 6);
    expect(abattementPS(30)).toBe(1);
  });
  it("surtaxe au-delà de 50 000 €, avec lissage", () => {
    expect(surtaxe(50_000)).toBe(0);
    expect(surtaxe(55_000)).toBeCloseTo(850, 6);
    expect(surtaxe(100_000)).toBeCloseTo(2_000, 6);
    expect(surtaxe(300_000)).toBeCloseTo(18_000, 6);
  });
  it("taux des droits du primo-accédant", () => {
    expect(tauxPrimo("75")).toBe(0.045);
    expect(tauxPrimo("36")).toBe(0.038);
    expect(tauxPrimo("73")).toBe(0.04);
  });
});

describe("particulier", () => {
  it("plus-value à 19 % + 17,2 %, sans abattement avant 6 ans", () => {
    const r = cadre(base(), "particulier");
    expect(r.gainAvant).toBeCloseTo(200_000 - 100_000 - NOTAIRE - 50_000, 2);
    expect(r.pv!.brute).toBeCloseTo(41_146, 2);
    expect(r.impots).toBeCloseTo(41_146 * (0.19 + 0.172), 1);
    expect(r.gainNet).toBeCloseTo(41_146 * (1 - 0.362), 1);
    expect(r.rendementAnnuel).toBeCloseTo(r.gainNet / r.mise, 6);
  });
  it("forfaits : 7,5 % de frais d'achat au minimum, 15 % de travaux après 5 ans", () => {
    const r = cadre(base({ fraisNotaire: 1_000, travaux: 0, dureeMois: 72 }), "particulier");
    // 200 000 − (100 000 + 7 500 + 15 000) = 77 500, abattement IR 6 %, PS 1,65 %.
    expect(r.pv!.brute).toBeCloseTo(77_500, 2);
    expect(r.pv!.abattIR).toBeCloseTo(0.06, 6);
    expect(r.impots).toBeCloseTo(0.19 * 77_500 * 0.94 + 0.172 * 77_500 * (1 - 0.0165) + surtaxe(77_500 * 0.94), 1);
  });
  it("surtaxe partagée entre deux vendeurs", () => {
    const seul = cadre(base({ prixRevente: 300_000 }), "particulier");
    const deux = cadre(base({ prixRevente: 300_000, nbVendeurs: 2 }), "particulier");
    expect(seul.pv!.surtaxe).toBeGreaterThan(0);
    expect(deux.pv!.surtaxe).toBeLessThan(seul.pv!.surtaxe);
  });
  it("moins-value : aucun impôt, alerte", () => {
    const r = cadre(base({ prixRevente: 150_000 }), "particulier");
    expect(r.impots).toBe(0);
    expect(r.alertes).toContain("moins_value");
    expect(r.gainNet).toBeLessThan(0);
  });
});

describe("résidence principale", () => {
  it("aucun impôt sur la plus-value, frais réduits du primo-accédant, avertissements", () => {
    const e = base({ habite: true, primo: true, dureeMois: 8 });
    const r = cadre(e, "residence_principale");
    expect(r.eligible).toBe(true);
    expect(r.impots).toBe(0);
    // Droits à 4,50 % au lieu de 5 % : 100 000 × 0,5 % × 1,0237 de moins.
    expect(r.gainAvant).toBeCloseTo(200_000 - 100_000 - (NOTAIRE - 512) - 50_000, 0);
    expect(r.alertes).toEqual(expect.arrayContaining(["rp_courte", "rp_requalification"]));
  });
  it("qui habite le bien ne peut pas être particulier investisseur ni marchand de biens, et inversement", () => {
    const habite = simulerRevente(base({ habite: true }));
    expect(habite.meilleur).toBe("residence_principale");
    expect(habite.cadres.find((c) => c.cadre === "particulier")!.raison).toBe("particulier_habite");
    const investit = simulerRevente(base());
    expect(investit.cadres.find((c) => c.cadre === "residence_principale")!.raison).toBe("rp_pas_habite");
  });
});

describe("marchand de biens en société à l'IS", () => {
  it("droits réduits de 0,715 %, IS 15 % puis 25 %, PFU à la distribution", () => {
    const r = cadre(base(), "marchand_biens");
    // Frais : 715 + 100 + 1 435,50 + 1 000 = 3 250,50 → 3 251. Gain : 200 000 − 154 251 − 1 000 (création) − 1 440 (comptable).
    const gain = 200_000 - 100_000 - 3_251 - 50_000 - 1_000 - 1_440;
    expect(r.gainAvant).toBeCloseTo(gain, 2);
    const is = 0.15 * 42_500 + 0.25 * (gain - 42_500);
    expect(r.impots).toBeCloseTo(is + 0.314 * (gain - is), 1);
    expect(r.alertes).toContain("mdb_conditions");
  });
  it("rénovation qui rend le bien neuf : TVA de 20 % sur le prix total, TVA des travaux récupérée", () => {
    const normal = cadre(base(), "marchand_biens");
    const neuf = cadre(base({ etatNeuf: true }), "marchand_biens");
    // TVA due sur le prix, moins celle des travaux et du comptable (1 440 € TTC), récupérées.
    expect(normal.gainAvant - neuf.gainAvant).toBeCloseTo(200_000 / 6 - 50_000 / 6 - 1_440 / 6, 1);
    expect(neuf.alertes).toContain("mdb_tva_neuf");
  });
  it("pas revendu sous 5 ans : droits de droit commun et intérêt de retard", () => {
    const r = cadre(base({ dureeMois: 61 }), "marchand_biens");
    expect(r.alertes).toContain("mdb_sanction");
    const droits = 100_000 * 0.063185;
    const sans = cadre(base({ dureeMois: 60 }), "marchand_biens");
    // Plus un 6e exercice de comptable (1 440 €).
    expect(sans.gainAvant - r.gainAvant).toBeCloseTo(droits * (1 + 0.002 * 60) + 1_440, 0);
  });
});

describe("crédit, prix minimum, saisie", () => {
  it("crédit : intérêts et assurance pendant le portage, IRA plafonnées, mainlevée de 0,3 %", () => {
    const sans = cadre(base(), "particulier");
    const avec = cadre(base({ apport: 0, taux: 4, assurancePct: 0.3 }), "particulier");
    expect(avec.gainAvant).toBeLessThan(sans.gainAvant);
    expect(avec.detail.find((d) => d.cle === "credit")!.montant).toBeLessThan(0);
    const sansIra = cadre(base({ apport: 0, taux: 4, sansIra: true }), "particulier");
    expect(sansIra.gainAvant).toBeGreaterThan(cadre(base({ apport: 0, taux: 4 }), "particulier").gainAvant);
  });
  it("prix de revente minimum : gain net nul à 100 € près", () => {
    for (const c of ["particulier", "marchand_biens"] as const) {
      const r = cadre(base(), c);
      expect(cadre(base({ prixRevente: r.prixMinimum }), c).gainNet).toBeGreaterThanOrEqual(0);
      expect(cadre(base({ prixRevente: r.prixMinimum - 100 }), c).gainNet).toBeLessThan(0);
    }
  });
  it("saisie : rien sans prix d'achat et de revente ; achat et crédit partagés avec la location", () => {
    const P = { codePostal: "45000", typeBien: "T2", nature: "reno" as const, travauxEstimes: 30_000 };
    const s = { actif: true, strategie: "revente" as const, location: { prix: 120_000, taux: 4 }, revente: {} };
    expect(entreeRevente(s, P)).toBeNull();
    const e = completerRevente({ ...s, revente: { prixRevente: 210_000 } }, P);
    expect(e.prix).toBe(120_000);
    expect(e.taux).toBe(4);
    expect(e.travaux).toBe(30_000);
    expect(e.dureeMois).toBe(12);
    expect(investSchema.safeParse({ ...s, revente: { prixRevente: 210_000, nbVendeurs: 2, habite: true } }).success).toBe(true);
    expect(investSchema.safeParse({ ...s, revente: { nbVendeurs: 3 } }).success).toBe(false);
  });
});

describe("corrections de l'audit indépendant (achat-revente)", () => {
  it("marchand de biens qui achète neuf : la TVA de l'achat se récupère, pas de rappel de droits", () => {
    const r = cadre(base({ neuf: true, prix: 200_000, travaux: 0, prixRevente: 240_000 }), "marchand_biens");
    // TVA nette = 40 000 − 33 333 de l'achat ≈ 6 667 € : le gain reste positif.
    expect(r.gainAvant).toBeGreaterThan(20_000);
    expect(r.gainNet).toBeGreaterThan(0);
    const tard = cadre(base({ neuf: true, prix: 200_000, travaux: 0, prixRevente: 240_000, dureeMois: 72 }), "marchand_biens");
    expect(tard.alertes).not.toContain("mdb_sanction");
    expect(tard.alertes).not.toContain("mdb_tva_neuf");
  });
  it("forfait de 15 % pour travaux dès plus de 5 ans de détention, même sans 6 années pleines", () => {
    const r = cadre(base({ fraisNotaire: 7_500, travaux: 0, dureeMois: 66 }), "particulier");
    expect(r.pv!.brute).toBeCloseTo(200_000 - 100_000 - 7_500 - 15_000, 2);
  });
  it("rendement simple sous 12 mois, sans capitalisation", () => {
    const r = cadre(base({ dureeMois: 6 }), "particulier");
    expect(r.rendementAnnuel).toBeCloseTo((r.gainNet / r.mise) * 2, 6);
  });
  it("exonération des ventes de 15 000 € au plus appréciée par vendeur", () => {
    const r = cadre(base({ prix: 10_000, fraisNotaire: 0, travaux: 0, prixRevente: 25_000, nbVendeurs: 2 }), "particulier");
    expect(r.impots).toBe(0);
    expect(cadre(base({ prix: 10_000, fraisNotaire: 0, travaux: 0, prixRevente: 25_000 }), "particulier").impots).toBeGreaterThan(0);
  });
  it("prix minimum : le plus petit prix gagnant, malgré le saut de la surtaxe", () => {
    // Plus-value proche de 50 000 € : on vérifie qu'aucun prix 100 € plus bas n'est gagnant sur une plage de 3 000 €.
    const e = base({ fraisNotaire: 7_500, travaux: 0, taxeFonciere: 31_800 });
    const r = cadre(e, "particulier");
    expect(cadre(base({ ...e, prixRevente: r.prixMinimum }), "particulier").gainNet).toBeGreaterThanOrEqual(0);
    for (let p = r.prixMinimum - 100; p > r.prixMinimum - 3_000; p -= 100) {
      expect(cadre(base({ ...e, prixRevente: p }), "particulier").gainNet).toBeLessThan(0);
    }
  });
  it("garde-fous : durée nulle → 1 mois, part de travaux négative ramenée à 0", () => {
    expect(cadre(base({ dureeMois: 0 }), "particulier").detail.length).toBeGreaterThan(0);
    const neg = cadre(base({ travauxEntreprisePct: -50 }), "particulier");
    expect(neg.pv!.brute).toBeCloseTo(200_000 - 100_000 - NOTAIRE, 2);
  });
});
