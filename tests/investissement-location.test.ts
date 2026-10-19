/**
 * Module M3 · simulateur de location après impôts (lib/investissement). Les valeurs attendues sont calculées à la
 * main à partir de docs/investissement/regles-fiscales-2026.md (barème des revenus 2025, PS 2026, frais de 2026).
 */
import { describe, it, expect } from "vitest";
import { irBareme, irFoyer, mensualite, echeancier, fraisNotaire, departement, emolumentsHT } from "@/lib/investissement/impot";
import { simulerLocation, type EntreeLocation, type Regime } from "@/lib/investissement/location";

/** Un cas « nu » : pas de crédit, pas de charges, pas de revalorisation, célibataire à 30 000 €. */
const base = (p: Partial<EntreeLocation> = {}): EntreeLocation => ({
  prix: 100_000, neuf: false, dept: "45", fraisNotaire: 0, fraisAgence: 0, travaux: 0, travauxDeductiblesPct: 100, mobilier: 0,
  collectif: true, immeuble15ans: true,
  apport: 1_000_000, taux: 0, dureeAns: 20, assurancePct: 0, fraisDossier: 0,
  loyerNu: 500, loyerMeuble: 500, loyerBailleurPrive: 500, vacanceMois: 0,
  taxeFonciere: 0, coproNonRecup: 0, pno: 0, gestionPct: 0, entretien: 0, cfe: 0,
  revenu: 30_000, parts: 1, couple: false,
  horizon: 20, indexLoyers: 0, indexCharges: 0, indexRevenu: 0, terrainPct: 15, renoEnergetique: false, niveauBailleurPrive: "intermediaire",
  comptableLmnp: 0, comptableSciIr: 0, comptableIs: 0, creationSociete: 0,
  ...p,
});
const regime = (e: EntreeLocation, r: Regime) => simulerLocation(e).regimes.find((x) => x.regime === r)!;

describe("impôt sur le revenu du foyer (barème des revenus 2025)", () => {
  it("barème progressif par part", () => {
    expect(irBareme(11_600, 1)).toBe(0);
    expect(irBareme(30_000, 1)).toBeCloseTo(2_103.99, 2);
    expect(irBareme(60_000, 2)).toBeCloseTo(4_207.98, 2);
  });
  it("décote, seuil de 61 € et arrondi", () => {
    expect(irFoyer({ revenu: 30_000, parts: 1, couple: false })).toBe(2_104);
    // 924 € brut < 1 982 € : décote 897 − 45,25 % × 924 = 478,89.
    expect(irFoyer({ revenu: 20_000, parts: 1, couple: false })).toBe(445);
    expect(irFoyer({ revenu: 13_000, parts: 1, couple: false })).toBe(0);
  });
  it("plafonnement du quotient familial : 1 807 € par demi-part au-delà de 2", () => {
    // Couple + 2 enfants, 150 000 € : 3 parts donneraient 24 312 €, plafonné à 31 207,98 − 2 × 1 807.
    expect(irFoyer({ revenu: 150_000, parts: 3, couple: true })).toBe(27_594);
  });
});

describe("crédit et frais d'achat", () => {
  it("mensualité et échéancier", () => {
    expect(mensualite(200_000, 0.04, 25)).toBeCloseTo(1_055.67, 2);
    const ech = echeancier(200_000, 0.04, 25, 30);
    expect(ech.reduce((s, a) => s + a.capital, 0)).toBeCloseTo(200_000, 2);
    expect(ech[24].crd).toBeCloseTo(0, 2);
    expect(ech[29].interets).toBe(0);
    expect(mensualite(120_000, 0, 10)).toBe(1_000);
  });
  it("frais de notaire dans l'ancien (droits à 5 %, 4,50 %, 3,80 %) et dans le neuf", () => {
    expect(emolumentsHT(200_000)).toBeCloseTo(1_995.25, 2);
    // 12 637 (6,3185 %) + 200 (CSI) + 2 394,30 (émoluments TTC) + 1 000 (débours).
    expect(fraisNotaire(200_000, "75", false)).toBe(16_231);
    expect(fraisNotaire(200_000, "06", false)).toBe(Math.round(200_000 * (0.045 * 1.0237 + 0.012) + 200 + 2_394.3 + 1_000));
    expect(fraisNotaire(200_000, "36", false)).toBe(Math.round(200_000 * (0.038 * 1.0237 + 0.012) + 200 + 2_394.3 + 1_000));
    expect(fraisNotaire(200_000, "75", true)).toBe(Math.round(200_000 * 0.007 * 1.0214 + 200 + 2_394.3 + 1_000));
    // Émoluments sans TVA à Mayotte.
    expect(fraisNotaire(200_000, "976", false)).toBe(Math.round(200_000 * (0.045 * 1.0237 + 0.012) + 200 + 1_995.25 + 1_000));
  });
  it("département d'un code postal", () => {
    expect(departement("45000")).toBe("45");
    expect(departement("20100")).toBe("2A");
    expect(departement("20200")).toBe("2B");
    expect(departement("97200")).toBe("972");
    expect(departement("abc")).toBe("");
  });
});

describe("location nue", () => {
  it("micro-foncier : 30 % d'abattement, impôt par différence, CSG déductible l'année suivante", () => {
    const r = regime(base(), "nu_micro");
    expect(r.eligible).toBe(true);
    const [a1, a2] = r.annees;
    expect(a1.base).toBe(4_200);
    expect(a1.impot).toBe(1_260); // 3 364 − 2 104
    expect(a1.ps).toBeCloseTo(722.4, 2);
    expect(a1.cfApresImpot).toBeCloseTo(6_000 - 1_260 - 722.4, 2);
    expect(a2.impot).toBe(1_174); // revenu 34 200 − 285,60 de CSG déductible
  });
  it("micro-foncier inéligible au-delà de 15 000 € de loyers", () => {
    expect(regime(base({ loyerNu: 1_300 }), "nu_micro").eligible).toBe(false);
  });
  it("réel : déficit imputé sur le revenu global dans la limite de 10 700 €, reste reporté sur les loyers", () => {
    const r = regime(base({ travaux: 30_000 }), "nu_reel");
    const a = r.annees;
    // Année 1 : 6 000 − 20 − 30 000 = −24 020 → 10 700 sur le revenu global, 13 320 en stock.
    expect(a[0].deficitGlobal).toBe(10_700);
    expect(a[0].impot).toBe(333 - 2_104);
    // Stock consommé par 5 980 €/an : années 2 et 3 entières, 1 360 € l'année 4, puis imposition l'année 5.
    expect(a[1].base).toBe(0);
    expect(a[3].base).toBeCloseTo(5_980 - 1_360, 2);
    expect(a[4].base).toBeCloseTo(5_980, 2);
    expect(r.alertes).toContain("deficit_3ans");
  });
  it("réel : la part du déficit due aux intérêts ne va jamais sur le revenu global", () => {
    // Loyers 6 000 < intérêts : le déficit d'intérêts part en stock, seules les autres charges s'imputent.
    const r = regime(base({ apport: 0, taux: 10, dureeAns: 20, prix: 200_000, travaux: 5_000 }), "nu_reel");
    const a1 = r.annees[0];
    expect(a1.interets).toBeGreaterThan(6_000);
    expect(a1.deficitGlobal).toBeCloseTo(5_000 + 20, 2);
  });
  it("rénovation énergétique : plafond porté à 10 700 € + dépenses, 21 400 € au plus", () => {
    const r = regime(base({ travaux: 40_000, renoEnergetique: true }), "nu_reel");
    expect(r.annees[0].deficitGlobal).toBe(21_400);
  });
  it("statut du bailleur privé : immeuble collectif seulement, travaux ≥ 30 % du prix dans l'ancien", () => {
    expect(regime(base({ collectif: false, travaux: 40_000 }), "bailleur_prive").raison).toBe("bailleur_prive_maison");
    expect(regime(base({ travaux: 20_000 }), "bailleur_prive").raison).toBe("bailleur_prive_travaux");
    const ok = regime(base({ travaux: 40_000 }), "bailleur_prive");
    expect(ok.eligible).toBe(true);
    // Base 80 000 + 40 000 = 120 000 × 3 % = 3 600 €/an (sous le plafond de 8 000 €) ; travaux non déduits à part.
    // Revenu foncier : 6 000 − 20 − 3 600 = 2 380.
    expect(ok.annees[0].base).toBeCloseTo(2_380, 2);
  });
  it("SCI à l'IR : jamais de micro, frais de comptable en plus", () => {
    const sci = regime(base({ comptableSciIr: 400 }), "sci_ir");
    const nu = regime(base(), "nu_reel");
    expect(sci.annees[0].base).toBeCloseTo(nu.annees[0].base - 400, 2);
    expect(sci.alertes).toContain("sci_ir_comptable");
  });
});

describe("location meublée (LMNP)", () => {
  it("micro-BIC : 50 % d'abattement, prélèvements sociaux à 18,6 %", () => {
    const r = regime(base(), "lmnp_micro");
    expect(r.annees[0].base).toBe(3_000);
    expect(r.annees[0].ps).toBeCloseTo(558, 2);
  });
  it("réel : l'amortissement ne crée jamais de déficit, l'excédent est reporté", () => {
    // Bâti 85 000 × (0,5/50 + 0,15/25 + 0,2/20 + 0,15/12) = 3 272,50 €/an.
    const r = regime(base(), "lmnp_reel");
    expect(r.annees[0].base).toBeCloseTo(6_000 - 3_272.5, 2);
    const petit = regime(base({ loyerMeuble: 200 }), "lmnp_reel");
    expect(petit.annees[0].base).toBe(0);
    expect(petit.annees[0].impot).toBe(0);
  });
  it("réel : les frais d'achat passés en charges créent un déficit reportable sur 10 ans", () => {
    const r = regime(base({ fraisNotaire: 8_000 }), "lmnp_reel");
    // Année 1 : 6 000 − 8 000 = −2 000 de déficit, amortissement de 3 272,50 reporté. Année 2 : l'amortissement
    // (année + report = 6 545) absorbe les 6 000 de loyers. Année 3 : 6 000 − (3 272,50 + 545) − 2 000 de déficit.
    expect(r.annees[0].base).toBe(0);
    expect(r.annees[1].base).toBe(0);
    expect(r.annees[2].base).toBeCloseTo(182.5, 2);
  });
  it("alerte LMP au-delà de 23 000 € de recettes supérieures aux revenus du foyer", () => {
    expect(regime(base({ loyerMeuble: 2_500, revenu: 20_000 }), "lmnp_reel").alertes).toContain("lmp");
    expect(regime(base({ loyerMeuble: 2_500, revenu: 60_000 }), "lmnp_reel").alertes).not.toContain("lmp");
  });
  it("micro-BIC inéligible au-delà de 83 600 € de recettes", () => {
    expect(regime(base({ loyerMeuble: 7_000 }), "lmnp_micro").eligible).toBe(false);
  });
});

describe("société à l'IS", () => {
  it("IS à 15 % jusqu'à 42 500 € puis 25 %, payé l'année suivante", () => {
    // Bénéfice année 1 = 72 000 − amortissement (bâti 85 000, gros œuvre sur 80 ans) − 80 € de frais bancaires.
    const e = base({ loyerNu: 6_000, immeuble15ans: false });
    const r = regime(e, "is_nu");
    const amort = 85_000 * (0.5 / 80 + 0.15 / 25 + 0.2 / 20 + 0.15 / 12);
    const b = 72_000 - amort - 80;
    expect(r.annees[0].impot).toBe(0);
    expect(r.annees[1].impot).toBeCloseTo(0.15 * 42_500 + 0.25 * (b - 42_500), 1);
  });
  it("le compte courant sort sans impôt, puis les dividendes au PFU de 31,4 %", () => {
    // Apport 100 000 en compte courant : les premières années remboursent le compte courant, sans PFU.
    const r = regime(base({ apport: 100_000, loyerNu: 2_000 }), "is_nu");
    expect(r.annees[0].ps).toBe(0);
    // 24 000 de loyers − 600 de CRL (immeuble de plus de 15 ans) − 80 de frais bancaires, moins l'IS de l'année
    // gardé en trésorerie pour l'an prochain : 15 % × (23 320 − 2 953,75 d'amortissement).
    expect(r.annees[0].cfApresImpot).toBeCloseTo(23_320 - 0.15 * (23_320 - 85_000 * 0.03475), 2);
    expect(r.alertes).toContain("is_sans_revente");
  });
  it("CRL de 2,5 % des loyers pour un immeuble de plus de 15 ans", () => {
    const vieux = regime(base({ loyerNu: 1_000 }), "is_nu");
    const recent = regime(base({ loyerNu: 1_000, immeuble15ans: false }), "is_nu");
    expect(vieux.annees[0].charges - recent.annees[0].charges).toBeCloseTo(300, 2);
  });
});

describe("comparaison", () => {
  it("le meilleur régime est éligible et a le plus gros cumul après impôts", () => {
    const res = simulerLocation(base({ loyerNu: 1_300, loyerMeuble: 1_450 }));
    const m = res.regimes.find((r) => r.regime === res.meilleur)!;
    expect(m.eligible).toBe(true);
    for (const r of res.regimes.filter((x) => x.eligible)) expect(m.cumulApresImpot).toBeGreaterThanOrEqual(r.cumulApresImpot);
  });
  it("rendements et coût total", () => {
    const res = simulerLocation(base({ prix: 150_000, fraisNotaire: null, dept: "75", travaux: 30_000, loyerNu: 900 }));
    expect(res.notaire).toBe(fraisNotaire(150_000, "75", false));
    expect(res.coutTotal).toBe(150_000 + res.notaire + 30_000);
    expect(res.rendementBrut).toBeCloseTo(10_800 / res.coutTotal, 6);
  });
});

describe("corrections de l'audit indépendant", () => {
  it("un gros apport ne rend pas le mobilier gratuit : le meublé paie son mobilier", () => {
    const sans = regime(base({ taux: 4 }), "lmnp_reel").cumulApresImpot;
    const avec = regime(base({ taux: 4, mobilier: 10_000 }), "lmnp_reel").cumulApresImpot;
    expect(avec).toBeLessThan(sans);
    // Même chose quand le mobilier est emprunté (apport nul) : le surcoût reste à la charge du régime.
    const sansE = regime(base({ apport: 0, taux: 4 }), "lmnp_reel").cumulApresImpot;
    const avecE = regime(base({ apport: 0, taux: 4, mobilier: 10_000 }), "lmnp_reel").cumulApresImpot;
    expect(avecE).toBeLessThan(sansE);
  });
  it("barème revalorisé comme les revenus : l'impôt du projet suit l'inflation, sans dériver de tranche", () => {
    const r = regime(base({ revenu: 27_000, indexRevenu: 2, indexLoyers: 2, indexCharges: 2 }), "nu_micro");
    expect(r.annees[19].impot).toBeCloseTo(r.annees[1].impot * Math.pow(1.02, 18), -1);
  });
  it("bailleur privé : calculé avec son loyer plafonné", () => {
    const r = regime(base({ travaux: 40_000, loyerBailleurPrive: 400 }), "bailleur_prive");
    // 4 800 − 20 − 3 600 d'amortissement.
    expect(r.annees[0].base).toBeCloseTo(1_180, 2);
    expect(r.annees[0].loyers).toBe(4_800);
  });
  it("bailleur privé dans le neuf : les travaux déductibles le restent", () => {
    const r = regime(base({ neuf: true, travaux: 10_000 }), "bailleur_prive");
    expect(r.annees[0].deficitGlobal).toBeGreaterThan(0);
  });
  it("au-delà du seuil LMP, le LMNP n'est plus candidat", () => {
    const res = simulerLocation(base({ loyerMeuble: 2_500, revenu: 20_000 }));
    for (const reg of ["lmnp_micro", "lmnp_reel"] as const) {
      const r = res.regimes.find((x) => x.regime === reg)!;
      expect(r.eligible).toBe(false);
      expect(r.raison).toBe("lmp");
    }
    expect(res.meilleur).not.toMatch(/^lmnp/);
  });
  it("société à l'IS : la trésorerie qui paiera l'IS n'est pas distribuée", () => {
    const r = regime(base({ prix: 200_000, apport: 0, taux: 4, dureeAns: 15, loyerNu: 2_000 }), "is_nu");
    expect(r.tresorerieFinale!).toBeGreaterThanOrEqual(0);
  });
  it("CFE exonérée si les recettes de N−2 ne dépassent pas 5 000 €", () => {
    const sans = regime(base({ loyerMeuble: 400 }), "lmnp_micro");
    const avec = regime(base({ loyerMeuble: 400, cfe: 500 }), "lmnp_micro");
    expect(avec.annees[4].charges).toBe(sans.annees[4].charges);
    const gros = regime(base({ loyerMeuble: 800, cfe: 500 }), "lmnp_micro");
    expect(gros.annees[1].charges - regime(base({ loyerMeuble: 800 }), "lmnp_micro").annees[1].charges).toBe(250);
  });
  it("garde-fous : durée de prêt ou niveau de loyer invalides, pourcentages hors bornes", () => {
    const r = simulerLocation(base({ apport: 0, taux: 4, dureeAns: NaN, terrainPct: 120, niveauBailleurPrive: "x" as never }));
    for (const x of r.regimes) expect(Number.isFinite(x.cumulApresImpot)).toBe(true);
    expect(r.regimes.find((x) => x.regime === "nu_reel")!.annees[0].interets).toBeGreaterThan(0);
  });
  it("IS : l'impôt de la dernière année compte dans les impôts cumulés", () => {
    const r = regime(base({ loyerNu: 3_000, immeuble15ans: false, horizon: 3 }), "is_nu");
    const payes = r.annees.reduce((s, a) => s + a.impot + a.ps, 0);
    expect(r.impotsCumules).toBeGreaterThan(payes);
  });
});
