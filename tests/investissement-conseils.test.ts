/**
 * Module M3 · construction neuve (terrain à bâtir) et conseils d'optimisation (lib/investissement/conseils) :
 * l'écart entre le choix de l'utilisateur et le meilleur régime, et les leviers chiffrés par le moteur.
 */
import { describe, it, expect } from "vitest";
import { fraisNotaire, emolumentsHT } from "@/lib/investissement/impot";
import { FRAIS_ACHAT, PFU } from "@/lib/investissement/regles";
import { simulerLocation, type EntreeLocation, type Regime } from "@/lib/investissement/location";
import { simulerRevente, type EntreeRevente, type CadreRevente } from "@/lib/investissement/revente";
import { conseilsLocation, conseilsRevente, ecartLocation, ecartRevente, GAIN_MIN } from "@/lib/investissement/conseils";
import { completer, investSchema } from "@/lib/investissement/saisie";

const loc = (p: Partial<EntreeLocation> = {}): EntreeLocation => ({
  prix: 100_000, neuf: false, dept: "45", fraisNotaire: 0, fraisAgence: 0, travaux: 0, travauxDeductiblesPct: 100, mobilier: 0,
  collectif: true, immeuble15ans: false,
  apport: 1_000_000, taux: 0, dureeAns: 20, assurancePct: 0, fraisDossier: 0,
  loyerNu: 500, loyerMeuble: 500, loyerBailleurPrive: 500, vacanceMois: 0,
  taxeFonciere: 0, coproNonRecup: 0, pno: 0, gestionPct: 0, entretien: 0, cfe: 0,
  revenu: 30_000, parts: 1, couple: false,
  horizon: 20, indexLoyers: 0, indexCharges: 0, indexRevenu: 0, terrainPct: 15, renoEnergetique: false, niveauBailleurPrive: "intermediaire",
  comptableLmnp: 0, comptableSciIr: 0, comptableIs: 0, creationSociete: 0,
  ...p,
});
const rv = (p: Partial<EntreeRevente> = {}): EntreeRevente => ({
  prix: 100_000, neuf: false, dept: "45", fraisNotaire: null, fraisAgence: 0, travaux: 50_000, travauxEntreprisePct: 100, etatNeuf: false,
  apport: 1_000_000, taux: 0, dureeAns: 20, assurancePct: 0, fraisDossier: 0, sansIra: false,
  taxeFonciere: 0, chargesAnnuelles: 0, dureeMois: 12, prixRevente: 200_000, fraisAgenceVente: 0, diagnostics: 0, mainlevee: null,
  habite: false, primo: false, nbVendeurs: 1, comptableIs: 1_440, creationSociete: 1_000,
  ...p,
});
const regime = (e: EntreeLocation, r: Regime) => simulerLocation(e).regimes.find((x) => x.regime === r)!;
const cadre = (e: EntreeRevente, c: CadreRevente) => simulerRevente(e).cadres.find((x) => x.cadre === c)!;

describe("construction neuve : le prix d'achat est celui d'un terrain", () => {
  const terrain = { prix: 80_000, travaux: 200_000, neuf: true, terrainABatir: true, travauxDeductiblesPct: 0 };

  it("frais de notaire : droits pleins sur le terrain, pas la taxe réduite du neuf", () => {
    const r = simulerLocation(loc({ ...terrain, fraisNotaire: null }));
    expect(r.notaire).toBeCloseTo(fraisNotaire(80_000, "45", false), 2);
    expect(r.notaire).toBeGreaterThan(fraisNotaire(80_000, "45", true) + 3_000);
  });

  it("LMNP réel : la maison s'amortit par composants, le terrain jamais", () => {
    // 200 000 € : 2 000 (gros œuvre, 50 ans) + 1 200 + 2 000 + 2 500 = 7 700 € la première année.
    const a = regime(loc({ ...terrain, loyerMeuble: 3_000 }), "lmnp_reel").annees[0];
    expect(a.base).toBeCloseTo(36_000 - 7_700, 2);
    // Même projet lu comme une rénovation : bâti à 85 % du prix et travaux sur 15 ans.
    const b = regime(loc({ ...terrain, terrainABatir: false, loyerMeuble: 3_000 }), "lmnp_reel").annees[0];
    expect(b.base).toBeCloseTo(36_000 - 68_000 * (0.5 / 50 + 0.15 / 25 + 0.2 / 20 + 0.15 / 12) - 200_000 / 15, 2);
  });

  it("société à l'IS : gros œuvre de la maison sur 80 ans", () => {
    const a = regime(loc({ ...terrain, loyerMeuble: 3_000 }), "is_meuble").annees[0];
    expect(a.base).toBeCloseTo(36_000 - 80 - (1_250 + 1_200 + 2_000 + 2_500), 2);
  });

  it("marchand de biens : droit fixe de 125 € (engagement de construire), pas de TVA à récupérer sur le terrain", () => {
    const e = rv({ ...terrain, travaux: 240_000, prixRevente: 420_000 });
    const tva = FRAIS_ACHAT.tvaEmoluments.defaut;
    const notaire = Math.round(125 + Math.max(FRAIS_ACHAT.csi.min, 80_000 * FRAIS_ACHAT.csi.taux) + emolumentsHT(80_000) * (1 + tva) + FRAIS_ACHAT.debours);
    const m = cadre(e, "marchand_biens");
    expect(m.detail.find((l) => l.cle === "achat")!.montant).toBeCloseTo(-(80_000 + notaire), 2);
    expect(m.detail.find((l) => l.cle === "travaux")!.montant).toBeCloseTo(-200_000, 2);
    expect(m.detail.find((l) => l.cle === "tva")!.montant).toBeCloseTo(-70_000, 2);
    expect(m.alertes).not.toContain("mdb_sanction");
  });

  it("particulier : droits pleins sur le terrain", () => {
    const p = cadre(rv({ ...terrain, prixRevente: 420_000 }), "particulier");
    expect(p.detail.find((l) => l.cle === "achat")!.montant).toBeCloseTo(-(80_000 + fraisNotaire(80_000, "45", false)), 2);
  });

  it("saisie : déduit de la nature du projet, modifiable", () => {
    expect(completer({}, { nature: "neuf", travauxEstimes: 0 }).terrainABatir).toBe(true);
    expect(completer({ terrain: false }, { nature: "neuf", travauxEstimes: 0 }).terrainABatir).toBe(false);
    expect(completer({}, { nature: "reno", travauxEstimes: 0 }).terrainABatir).toBe(false);
  });
});

describe("location : le choix face au meilleur régime", () => {
  const e = loc({ loyerNu: 900, loyerMeuble: 1_100, revenu: 60_000, prix: 150_000 });
  const res = simulerLocation(e);

  it("un choix moins bon est chiffré, impôts en plus compris", () => {
    const ec = ecartLocation(res, "nu_micro")!;
    const best = res.regimes.find((r) => r.regime === res.meilleur)!, micro = res.regimes.find((r) => r.regime === "nu_micro")!;
    expect(res.meilleur).not.toBe("nu_micro");
    expect(ec.bon).toBe(false);
    expect(ec.perte).toBe(Math.round(best.cumulApresImpot - micro.cumulApresImpot));
    expect(ec.impotsEnPlus).toBe(Math.round(micro.impotsCumules - best.impotsCumules));
    expect(ec.perte).toBeGreaterThan(0);
  });
  it("le meilleur choix est confirmé", () => {
    const ec = ecartLocation(res, res.meilleur)!;
    expect(ec.bon).toBe(true);
    expect(ec.perte).toBe(0);
  });
  it("un régime impossible est signalé avec sa raison", () => {
    const r = simulerLocation(loc({ collectif: false }));
    const ec = ecartLocation(r, "bailleur_prive")!;
    expect(ec.eligible).toBe(false);
    expect(ec.raison).toBe("bailleur_prive_maison");
  });
  it("pas de choix, pas de bandeau", () => {
    expect(ecartLocation(res, null)).toBeNull();
  });
});

describe("location : leviers chiffrés", () => {
  // Gros travaux déductibles et petit loyer : le déficit reporté ne s'éteindrait pas en 10 ans sur les loyers, donc
  // l'imputer sur le revenu global rapporte. (Avec un loyer qui l'absorbe, c'est l'inverse : le report économise aussi
  // les 17,2 % de prélèvements sociaux, et le moteur ne propose rien.)
  const e = loc({ travaux: 60_000, revenu: 60_000, loyerNu: 200 });

  it("étaler les travaux sur plusieurs années civiles : gain égal à la simulation « et si »", () => {
    const res = simulerLocation(e);
    const c = conseilsLocation(e, res, "nu_reel").find((x) => x.cle === "etaler_travaux")!;
    expect(c.gain).toBeGreaterThan(GAIN_MIN);
    const apres = regime({ ...e, travauxSurAnnees: c.valeur }, "nu_reel").cumulApresImpot;
    expect(c.gain).toBe(Math.round(apres - regime(e, "nu_reel").cumulApresImpot));
  });
  it("pas proposé quand le loyer absorbe le déficit reporté", () => {
    const g = loc({ travaux: 60_000, revenu: 60_000 });
    const cs = conseilsLocation(g, simulerLocation(g), "nu_reel").map((x) => x.cle);
    expect(cs).not.toContain("etaler_travaux");
    expect(cs).not.toContain("deficit_reno");
  });
  it("moteur : deux années de travaux ouvrent deux plafonds de 10 700 €", () => {
    const a = regime({ ...e, travauxSurAnnees: 2 }, "nu_reel").annees;
    expect(a[0].deficitGlobal).toBeCloseTo(10_700, 2);
    expect(a[1].deficitGlobal).toBeCloseTo(10_700, 2);
    expect(regime(e, "nu_reel").annees[1].deficitGlobal).toBe(0);
  });
  it("rénovation énergétique : plafond de 21 400 €", () => {
    const c = conseilsLocation(e, simulerLocation(e), "nu_reel").find((x) => x.cle === "deficit_reno")!;
    expect(c.gain).toBeGreaterThan(GAIN_MIN);
  });
  it("pas de levier foncier quand le régime retenu est meublé", () => {
    const cs = conseilsLocation(e, simulerLocation(e), "lmnp_reel").map((x) => x.cle);
    expect(cs).not.toContain("etaler_travaux");
    expect(cs).not.toContain("deficit_reno");
  });
  it("part du terrain : 5 points de moins chiffrés en LMNP réel, jamais pour un terrain à bâtir", () => {
    const m = loc({ loyerMeuble: 1_200 });
    const c = conseilsLocation(m, simulerLocation(m), "lmnp_reel").find((x) => x.cle === "terrain_ventilation")!;
    expect(c.valeur).toBe(15);
    expect(c.gain).toBe(Math.round(regime({ ...m, terrainPct: 10 }, "lmnp_reel").cumulApresImpot - regime(m, "lmnp_reel").cumulApresImpot));
    const t = loc({ loyerMeuble: 1_200, terrainABatir: true, travaux: 150_000, neuf: true });
    expect(conseilsLocation(t, simulerLocation(t), "lmnp_reel").map((x) => x.cle)).not.toContain("terrain_ventilation");
  });
  it("conseils « à savoir » sans gain chiffré", () => {
    const m = loc({ loyerMeuble: 1_200 });
    expect(conseilsLocation(m, simulerLocation(m), "is_meuble").find((x) => x.cle === "is_compte_courant")!.gain).toBeNull();
  });
});

describe("achat-revente : le choix et les leviers", () => {
  it("résidence principale choisie sans y habiter : impossible, avec la raison", () => {
    const ec = ecartRevente(simulerRevente(rv()), "residence_principale")!;
    expect(ec.eligible).toBe(false);
    expect(ec.raison).toBe("rp_pas_habite");
  });
  it("marchand de biens moins bon que le particulier : la perte est chiffrée", () => {
    const res = simulerRevente(rv());
    const ec = ecartRevente(res, "marchand_biens")!;
    expect(res.meilleur).toBe("particulier");
    expect(ec.perte).toBe(Math.round(cadre(rv(), "particulier").gainNet - cadre(rv(), "marchand_biens").gainNet));
  });
  it("travaux facturés par des entreprises", () => {
    const e = rv({ travauxEntreprisePct: 50 });
    const c = conseilsRevente(e, simulerRevente(e), "particulier").find((x) => x.cle === "rv_factures")!;
    expect(c.gain).toBe(Math.round(cadre(rv(), "particulier").gainNet - cadre(e, "particulier").gainNet));
  });
  it("deux vendeurs : seulement quand il y a une surtaxe", () => {
    const gros = rv({ prixRevente: 400_000 });
    expect(conseilsRevente(gros, simulerRevente(gros), "particulier").find((x) => x.cle === "rv_deux_vendeurs")!.gain).toBeGreaterThan(GAIN_MIN);
    expect(conseilsRevente(rv(), simulerRevente(rv()), "particulier").map((x) => x.cle)).not.toContain("rv_deux_vendeurs");
  });
  it("indemnités de remboursement anticipé", () => {
    const e = rv({ apport: 0, taux: 4 });
    const c = conseilsRevente(e, simulerRevente(e), "particulier").find((x) => x.cle === "rv_ira")!;
    expect(c.gain).toBe(Math.round(cadre({ ...e, sansIra: true }, "particulier").gainNet - cadre(e, "particulier").gainNet));
  });
  it("résidence principale : ce que l'exonération rapporterait", () => {
    const res = simulerRevente(rv());
    const c = conseilsRevente(rv(), res, "particulier").find((x) => x.cle === "rv_residence")!;
    expect(c.gain).toBe(Math.round(cadre(rv(), "residence_principale").gainNet - cadre(rv(), "particulier").gainNet));
  });
  it("marchand de biens : le PFU économisé en laissant le gain dans la société", () => {
    const m = cadre(rv(), "marchand_biens");
    const c = conseilsRevente(rv(), simulerRevente(rv()), "marchand_biens").find((x) => x.cle === "rv_mdb_reinvestir")!;
    expect(c.gain).toBe(Math.round(PFU * (m.gainAvant - m.isSociete!)));
  });
});

describe("saisie : choix et terrain enregistrés", () => {
  it("accepte un régime et un cadre connus, refuse le reste", () => {
    const ok = { actif: true, strategie: "location", location: { choix: "lmnp_reel", terrain: true }, revente: { choix: "marchand_biens" } };
    expect(investSchema.safeParse(ok).success).toBe(true);
    expect(investSchema.safeParse({ ...ok, location: { choix: "pinel" } }).success).toBe(false);
    expect(investSchema.safeParse({ ...ok, revente: { choix: null } }).success).toBe(true);
  });
});
