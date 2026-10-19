/**
 * Simulateur de location après impôts (module M3) : 7 régimes calculés année par année sur l'horizon choisi,
 * puis comparés. Fonctions pures, sans accès réseau. Règles et formules : docs/investissement/regles-fiscales-2026.md
 * (formules A à E). Hypothèses de modélisation, affichées à l'utilisateur :
 * - mise en location au 1er janvier de l'année 1, achat et travaux payés juste avant (frais d'achat et travaux
 *   déductibles retenus sur l'année 1) ; l'impôt d'une année est compté la même année, sauf l'IS (payé en n+1) ;
 * - le foyer n'a pas d'autres revenus fonciers ni d'autres meublés ; ses revenus évoluent comme indiqué ;
 * - pas de revente dans cette simulation (l'impôt de sortie, lourd à l'IS et en LMNP réel, n'est pas compté).
 */
import { irFoyer, echeancier, mensualite, fraisNotaire, type AnneeCredit } from "./impot";
import { BAILLEUR_PRIVE, CFE_SEUIL_RECETTES, CRL, DEFAUTS, DEFICIT_FONCIER, DEFICIT_LMNP_REPORT_ANS, FORFAIT_GESTION_LOCAL, IS, MICRO_BIC, MICRO_FONCIER, PFU, PS, SEUIL_LMP } from "./regles";

export type NiveauLoyer = "intermediaire" | "social" | "tres_social";

export type EntreeLocation = {
  // Achat
  prix: number;
  neuf: boolean;
  dept: string;
  /** Frais de notaire saisis à la main ; null = calculés (droits du département, émoluments, débours). */
  fraisNotaire: number | null;
  fraisAgence: number;
  travaux: number;
  /** Part des travaux déductible en location nue (entretien, réparation, amélioration), en %. */
  travauxDeductiblesPct: number;
  mobilier: number;
  collectif: boolean;
  /** Immeuble achevé depuis au moins 15 ans (CRL des sociétés à l'IS). */
  immeuble15ans: boolean;
  // Crédit
  apport: number;
  /** Taux nominal annuel en %. */
  taux: number;
  dureeAns: number;
  /** Assurance emprunteur en % du capital emprunté, par an. */
  assurancePct: number;
  fraisDossier: number;
  // Loyers (mensuels, hors charges)
  loyerNu: number;
  loyerMeuble: number;
  /** Loyer plafonné du statut du bailleur privé (mensuel, hors charges). */
  loyerBailleurPrive: number;
  vacanceMois: number;
  // Charges annuelles du propriétaire
  taxeFonciere: number;
  coproNonRecup: number;
  pno: number;
  /** Gestion locative en % des loyers encaissés. */
  gestionPct: number;
  entretien: number;
  cfe: number;
  // Foyer fiscal
  revenu: number;
  parts: number;
  couple: boolean;
  // Hypothèses
  horizon: number;
  /** Revalorisations annuelles en %. */
  indexLoyers: number;
  indexCharges: number;
  indexRevenu: number;
  terrainPct: number;
  renoEnergetique: boolean;
  niveauBailleurPrive: NiveauLoyer;
  comptableLmnp: number;
  comptableSciIr: number;
  comptableIs: number;
  creationSociete: number;
};

export type Regime = "nu_micro" | "nu_reel" | "bailleur_prive" | "sci_ir" | "is_nu" | "lmnp_micro" | "lmnp_reel" | "is_meuble";
export const REGIMES: Regime[] = ["nu_micro", "nu_reel", "bailleur_prive", "sci_ir", "is_nu", "lmnp_micro", "lmnp_reel", "is_meuble"];

export type AnneeSim = {
  annee: number;
  loyers: number;
  /** Charges payées hors crédit (taxe foncière, copropriété, assurance, gestion, entretien, CFE, comptable…). */
  charges: number;
  interets: number;
  assurance: number;
  capital: number;
  cfAvantImpot: number;
  /** Supplément d'IR du foyer (location en direct) ou IS payé dans l'année (société). */
  impot: number;
  /** Prélèvements sociaux (direct) ou PFU sur les dividendes (société). */
  ps: number;
  cfApresImpot: number;
  /** Base imposable de l'année (revenu foncier net, bénéfice LMNP, bénéfice IS) après reports. */
  base: number;
  /** Déficit imputé sur le revenu global (location nue au réel). */
  deficitGlobal: number;
};

export type Alerte = "lmp" | "micro_foncier_depasse" | "micro_bic_depasse" | "bailleur_prive_conditions" | "deficit_3ans" | "is_sans_revente" | "sci_ir_comptable";

export type ResultatRegime = {
  regime: Regime;
  eligible: boolean;
  /** Raison de non-éligibilité (clé de dictionnaire). */
  raison?: "micro_foncier_plafond" | "micro_bic_plafond" | "bailleur_prive_maison" | "bailleur_prive_travaux" | "lmp";
  meuble: boolean;
  emprunt: number;
  mensualite: number;
  annees: AnneeSim[];
  cumulApresImpot: number;
  impotsCumules: number;
  /** Société à l'IS : trésorerie restant dans la société à la fin, valorisée après PFU (incluse dans le cumul). */
  tresorerieFinale?: number;
  cfMensuelAn1: number;
  cfMensuelMoyen: number;
  alertes: Alerte[];
};

export type ResultatLocation = {
  coutTotal: number;
  notaire: number;
  rendementBrut: number;
  rendementBrutMeuble: number;
  rendementNet: number;
  regimes: ResultatRegime[];
  meilleur: Regime | null;
};

const pct = (x: number): number => (Number.isFinite(x) ? x / 100 : 0);
const pos = (x: number): number => (Number.isFinite(x) && x > 0 ? x : 0);
const r2 = (x: number): number => Math.round(x * 100) / 100;

type Stock = { annee: number; montant: number }[];
/** Impute un stock de déficits (du plus ancien au plus récent, non expirés) sur un résultat positif. */
function imputer(stock: Stock, resultat: number, annee: number, dureeReport: number | null): number {
  let reste = resultat;
  for (const s of stock) {
    if (reste <= 0) break;
    if (dureeReport !== null && annee > s.annee + dureeReport) continue;
    const u = Math.min(s.montant, reste);
    s.montant -= u; reste -= u;
  }
  return reste;
}

/** Amortissement annuel du bâti par composants (année y, 1 = première), hors terrain. */
function amortBati(bati: number, y: number, grosOeuvreAns: number): number {
  let a = 0;
  for (const c of DEFAUTS.composants) {
    const duree = c.nom === "gros_oeuvre" ? grosOeuvreAns : c.duree;
    if (y <= duree) a += (bati * c.quote) / duree;
  }
  return a;
}
const lineaire = (montant: number, duree: number, y: number): number => (duree > 0 && y <= duree ? montant / duree : 0);

export function simulerLocation(e: EntreeLocation): ResultatLocation {
  const H = Number.isFinite(e.horizon) ? Math.min(30, Math.max(1, Math.round(e.horizon))) : 20;
  const duree = Number.isFinite(e.dureeAns) ? Math.min(30, Math.max(1, e.dureeAns)) : 20;
  const borne = (x: number, max: number): number => Math.min(max, Math.max(0, Number.isFinite(x) ? x : 0));
  const terrain = borne(e.terrainPct, 90) / 100, partDeductible = borne(e.travauxDeductiblesPct, 100) / 100;
  const niveau: NiveauLoyer = e.niveauBailleurPrive in BAILLEUR_PRIVE.plafond ? e.niveauBailleurPrive : "intermediaire";
  const prix = pos(e.prix), travaux = pos(e.travaux), mobilier = pos(e.mobilier);
  const notaire = e.fraisNotaire != null && e.fraisNotaire >= 0 ? e.fraisNotaire : fraisNotaire(prix, e.dept, e.neuf);
  const agence = pos(e.fraisAgence), dossier = pos(e.fraisDossier);
  const coutNu = prix + notaire + agence + travaux + dossier;

  const fl = (y: number): number => Math.pow(1 + pct(e.indexLoyers), y - 1);
  const fc = (y: number): number => Math.pow(1 + pct(e.indexCharges), y - 1);
  const fr = (y: number): number => Math.pow(1 + pct(e.indexRevenu), y - 1);
  const moisLoues = Math.max(0, 12 - Math.max(0, e.vacanceMois || 0));
  const loyers = (meuble: boolean, y: number): number => (meuble ? pos(e.loyerMeuble) : pos(e.loyerNu)) * moisLoues * fl(y);
  /** Charges courantes du propriétaire, communes à tous les régimes. */
  const chargesBien = (y: number, loy: number): number =>
    (pos(e.taxeFonciere) + pos(e.coproNonRecup) + pos(e.pno) + pos(e.entretien)) * fc(y) + pct(e.gestionPct) * loy;
  // CFE : rien l'année de création, moitié l'année suivante, exonérée si les recettes de N−2 ne dépassent pas 5 000 €.
  const cfeAnnee = (y: number): number => (y === 1 || loyers(true, Math.max(1, y - 2)) <= CFE_SEUIL_RECETTES ? 0 : pos(e.cfe) * fc(y) * (y === 2 ? 0.5 : 1));
  /** IR du foyer pour un revenu global donné. Le barème est indexé comme les revenus (sinon l'impôt « dérive »
   *  d'une tranche à l'autre au fil des ans, ce qui pénaliserait à tort la détention en direct face à l'IS). */
  const irAn = (y: number, revenuGlobal: number): number => {
    const k = fr(y);
    return k * irFoyer({ revenu: Math.max(0, revenuGlobal) / k, parts: e.parts, couple: e.couple });
  };
  const revenuBase = (y: number): number => pos(e.revenu) * fr(y);
  const sansProjet = (y: number): number => irAn(y, revenuBase(y));
  /** Revenu global de l'année, avec report sur 6 ans de la part qui deviendrait négative (art. 156 I). */
  const revenuGlobal = (y: number, delta: number, report: Stock): number => {
    const brut = revenuBase(y) + delta;
    if (brut < 0) { report.push({ annee: y, montant: -brut }); return 0; }
    return imputer(report, brut, y, 6);
  };

  type Financement = { besoin: number; emprunt: number; ech: AnneeCredit[]; assurance: number; m: number };
  function financement(meuble: boolean, societe: boolean): Financement {
    const besoin = coutNu + (meuble ? mobilier : 0) + (societe ? pos(e.creationSociete) : 0);
    const emprunt = Math.max(0, besoin - pos(e.apport));
    const ech = echeancier(emprunt, pct(e.taux), duree, H);
    return { besoin, emprunt, ech, assurance: emprunt * pct(e.assurancePct), m: mensualite(emprunt, pct(e.taux), duree) };
  }
  /** Assurance emprunteur de l'année : due tant que le prêt court. */
  const assuranceAn = (f: Financement, y: number): number => (f.ech[y - 1].interets > 0.005 || f.ech[y - 1].capital > 0.005 ? f.assurance : 0);
  // Référence commune : la location nue en direct (même apport, même prêt). Ce qu'un régime coûte de plus
  // (mobilier, création de société) se paie soit par l'apport, soit par un capital restant dû plus élevé à la fin :
  // les deux sont retirés de son cumul, sinon un gros apport rendrait le mobilier gratuit.
  const ref = financement(false, false);
  const surcout = (f: Financement): number =>
    Math.max(0, Math.min(pos(e.apport), f.besoin) - Math.min(pos(e.apport), ref.besoin)) + Math.max(0, f.ech[H - 1].crd - ref.ech[H - 1].crd);

  const resultat = (regime: Regime, meuble: boolean, f: Financement, annees: AnneeSim[], alertes: Alerte[], extra: Partial<ResultatRegime> = {}, impotFinal = 0): ResultatRegime => {
    const cumul = annees.reduce((s, a) => s + a.cfApresImpot, 0) + (extra.tresorerieFinale ?? 0) - surcout(f);
    const impots = annees.reduce((s, a) => s + a.impot + a.ps, 0) + impotFinal;
    return {
      regime, eligible: true, meuble, emprunt: r2(f.emprunt), mensualite: r2(f.m), annees,
      cumulApresImpot: r2(cumul), impotsCumules: r2(impots),
      cfMensuelAn1: r2((annees[0]?.cfApresImpot ?? 0) / 12), cfMensuelMoyen: r2(cumul / (H * 12)),
      alertes, ...extra,
    };
  };

  // ── Location nue et SCI à l'IR : revenus fonciers (formules B6 à B14) ──
  function foncier(regime: "nu_micro" | "nu_reel" | "bailleur_prive" | "sci_ir"): ResultatRegime {
    const f = financement(false, regime === "sci_ir");
    const { ech } = f;
    const stock: Stock = [], reportGlobal: Stock = [];
    const alertes: Alerte[] = [];
    const annees: AnneeSim[] = [];
    const bp = regime === "bailleur_prive";
    const baseBP = BAILLEUR_PRIVE.baseQuotePrix * prix + (e.neuf ? 0 : travaux);
    const tauxBP = BAILLEUR_PRIVE.taux[e.neuf ? "neuf" : "ancien"][niveau];
    const plafondBP = BAILLEUR_PRIVE.plafond[niveau];
    let cumulBP = 0, csgPrec = 0;
    for (let y = 1; y <= H; y++) {
      const c = ech[y - 1];
      // Le statut du bailleur privé impose un loyer plafonné : il a sa propre saisie.
      const R = bp ? pos(e.loyerBailleurPrive) * moisLoues * fl(y) : loyers(false, y);
      const assu = assuranceAn(f, y);
      const I = c.interets + assu + (y === 1 ? dossier : 0);
      const comptable = regime === "sci_ir" ? pos(e.comptableSciIr) * fc(y) : 0;
      const cb = chargesBien(y, R);
      let amortBP = 0;
      if (bp) { amortBP = Math.min(tauxBP * baseBP, plafondBP, baseBP - cumulBP); cumulBP += amortBP; }
      // Bailleur privé dans l'ancien : les travaux sont dans la base amortie, donc pas déduits une seconde fois.
      const travauxDed = y === 1 && !(bp && !e.neuf) ? travaux * partDeductible : 0;
      const C = cb + (R > 0 ? FORFAIT_GESTION_LOCAL : 0) + comptable + travauxDed + amortBP;
      let rfNet = 0, imputable = 0;
      if (regime === "nu_micro") {
        rfNet = R * (1 - MICRO_FONCIER.abattement);
      } else {
        const res = R - I - C;
        if (res >= 0) {
          rfNet = imputer(stock, res, y, DEFICIT_FONCIER.reportAns);
        } else {
          const P = e.renoEnergetique && y === 1 ? Math.min(DEFICIT_FONCIER.plafondRenoEnergetique, DEFICIT_FONCIER.plafond + travauxDed) : DEFICIT_FONCIER.plafond;
          if (R >= I) {
            const d = I + C - R;
            imputable = Math.min(d, P);
            stock.push({ annee: y, montant: d - imputable });
          } else {
            stock.push({ annee: y, montant: I - R });
            imputable = Math.min(C, P);
            stock.push({ annee: y, montant: C - imputable });
          }
        }
      }
      const ir = irAn(y, revenuGlobal(y, rfNet - imputable - csgPrec, reportGlobal)) - sansProjet(y);
      const ps = PS.foncier * rfNet;
      csgPrec = PS.csgDeductible * rfNet;
      const charges = cb + comptable;
      const cfAvant = R - charges - c.interets - assu - c.capital;
      annees.push({
        annee: y, loyers: r2(R), charges: r2(charges), interets: r2(c.interets), assurance: r2(assu), capital: r2(c.capital),
        cfAvantImpot: r2(cfAvant), impot: r2(ir), ps: r2(ps), cfApresImpot: r2(cfAvant - ir - ps), base: r2(rfNet), deficitGlobal: r2(imputable),
      });
    }
    const out = resultat(regime, false, f, annees, [...new Set(alertes)]);
    if (annees.some((a) => a.deficitGlobal > 0)) out.alertes.push("deficit_3ans");
    if (regime === "sci_ir") out.alertes.push("sci_ir_comptable");
    if (regime === "nu_micro") {
      if (loyers(false, 1) > MICRO_FONCIER.plafond) { out.eligible = false; out.raison = "micro_foncier_plafond"; }
      else if (loyers(false, H) > MICRO_FONCIER.plafond) out.alertes.push("micro_foncier_depasse");
    }
    if (bp) {
      if (!e.collectif) { out.eligible = false; out.raison = "bailleur_prive_maison"; }
      else if (!e.neuf && travaux < BAILLEUR_PRIVE.seuilTravauxAncien * prix) { out.eligible = false; out.raison = "bailleur_prive_travaux"; }
      out.alertes.push("bailleur_prive_conditions");
    }
    return out;
  }

  // ── Location meublée en direct : LMNP (formules D19 à D28) ──
  function lmnp(regime: "lmnp_micro" | "lmnp_reel"): ResultatRegime {
    const f = financement(true, false);
    const { ech } = f;
    const deficits: Stock = [], reportGlobal: Stock = [];
    let stockARD = 0, csgPrec = 0;
    const bati = prix * (1 - terrain);
    const annees: AnneeSim[] = [];
    const alertes: Alerte[] = [];
    for (let y = 1; y <= H; y++) {
      const c = ech[y - 1];
      const R = loyers(true, y);
      const assu = assuranceAn(f, y);
      const cb = chargesBien(y, R);
      const cfe = cfeAnnee(y);
      const comptable = regime === "lmnp_reel" ? pos(e.comptableLmnp) * fc(y) : 0;
      let base = 0;
      if (regime === "lmnp_micro") {
        base = R - Math.min(R, Math.max(MICRO_BIC.abattement * R, MICRO_BIC.abattementMin));
      } else {
        const Cb = c.interets + assu + (y === 1 ? dossier + notaire + agence : 0) + cb + cfe;
        const A = amortBati(bati, y, DEFAUTS.composants[0].duree) + lineaire(travaux, DEFAUTS.dureeTravauxAns, y) + lineaire(mobilier, DEFAUTS.dureeMobilierAns, y);
        const plafond = Math.max(0, R - Cb);
        const deduit = Math.min(A + stockARD, plafond);
        stockARD += A - deduit;
        const res = R - Cb - comptable - deduit;
        if (res < 0) deficits.push({ annee: y, montant: -res });
        else base = imputer(deficits, res, y, DEFICIT_LMNP_REPORT_ANS);
      }
      const ir = irAn(y, revenuGlobal(y, base - csgPrec, reportGlobal)) - sansProjet(y);
      const ps = PS.patrimoine * base;
      csgPrec = PS.csgDeductible * base;
      if (R > SEUIL_LMP && R > pos(e.revenu) * fr(y)) alertes.push("lmp");
      const charges = cb + cfe + comptable;
      const cfAvant = R - charges - c.interets - assu - c.capital;
      annees.push({
        annee: y, loyers: r2(R), charges: r2(charges), interets: r2(c.interets), assurance: r2(assu), capital: r2(c.capital),
        cfAvantImpot: r2(cfAvant), impot: r2(ir), ps: r2(ps), cfApresImpot: r2(cfAvant - ir - ps), base: r2(base), deficitGlobal: 0,
      });
    }
    const out = resultat(regime, true, f, annees, [...new Set(alertes)]);
    // Loueur professionnel : cotisations sociales des indépendants au lieu des 18,6 %, non calculées ici (formule D19).
    if (out.alertes.includes("lmp")) { out.eligible = false; out.raison = "lmp"; }
    if (regime === "lmnp_micro") {
      if (loyers(true, 1) > MICRO_BIC.plafond) { out.eligible = false; out.raison = out.raison ?? "micro_bic_plafond"; }
      else if (loyers(true, H) > MICRO_BIC.plafond) out.alertes.push("micro_bic_depasse");
    }
    return out;
  }

  // ── Société à l'IS, location nue ou meublée (formules E30 à E38) ──
  function societeIS(meuble: boolean): ResultatRegime {
    const regime: Regime = meuble ? "is_meuble" : "is_nu";
    const f = financement(meuble, true);
    const { ech } = f;
    const bati = prix * (1 - terrain);
    let stockDef = 0, isDu = 0, tresor = 0, cca = Math.min(pos(e.apport), coutNu + (meuble ? mobilier : 0) + pos(e.creationSociete));
    let reserves = 0;
    const annees: AnneeSim[] = [];
    const impotSur = (b: number): number => IS.tauxReduit * Math.min(b, IS.seuilReduit) + IS.tauxNormal * Math.max(0, b - IS.seuilReduit);
    for (let y = 1; y <= H; y++) {
      const c = ech[y - 1];
      const R = loyers(meuble, y);
      const assu = assuranceAn(f, y);
      const cb = chargesBien(y, R);
      const crl = e.immeuble15ans && R > CRL.seuilRecettes ? CRL.taux * R : 0;
      const cfe = meuble ? cfeAnnee(y) : 0;
      const frais = (pos(e.comptableIs) + DEFAUTS.fraisBancairesSociete) * fc(y);
      const unique = y === 1 ? dossier + notaire + agence + pos(e.creationSociete) : 0;
      const A = amortBati(bati, y, DEFAUTS.grosOeuvreIsAns) + lineaire(travaux, DEFAUTS.dureeTravauxAns, y) + (meuble ? lineaire(mobilier, DEFAUTS.dureeMobilierAns, y) : 0);
      const res = R - cb - crl - cfe - frais - c.interets - assu - unique - A;
      let b = 0;
      if (res < 0) stockDef += -res;
      else { const u = Math.min(stockDef, res); stockDef -= u; b = res - u; }
      const isAnnee = impotSur(b);
      const charges = cb + crl + cfe + frais;
      const cfAvant = R - charges - c.interets - assu - c.capital;
      // L'IS de l'exercice précédent est payé cette année ; la trésorerie paie d'abord le compte courant, puis des dividendes.
      tresor += cfAvant - isDu;
      const isPaye = isDu;
      isDu = isAnnee;
      reserves += res - isAnnee;
      let poche = 0, pfu = 0;
      if (tresor < 0) { cca += -tresor; poche = tresor; tresor = 0; }
      else {
        // L'IS de l'exercice, payé l'an prochain, reste en trésorerie : seul le surplus sort.
        const dispo = Math.max(0, tresor - isDu);
        const remb = Math.min(dispo, cca);
        cca -= remb; tresor -= remb; poche += remb;
        const div = Math.min(dispo - remb, Math.max(0, reserves));
        tresor -= div; reserves -= div;
        pfu = PFU * div; poche += div - pfu;
      }
      annees.push({
        annee: y, loyers: r2(R), charges: r2(charges), interets: r2(c.interets), assurance: r2(assu), capital: r2(c.capital),
        cfAvantImpot: r2(cfAvant), impot: r2(isPaye), ps: r2(pfu), cfApresImpot: r2(poche), base: r2(b), deficitGlobal: 0,
      });
    }
    // Reste dans la société : la trésorerie moins l'IS encore dû, sortie au PFU (prudent : pas de compte courant restant).
    const reste = tresor - isDu;
    const tresorerieFinale = r2(reste > 0 ? reste * (1 - PFU) : reste);
    return resultat(regime, meuble, f, annees, ["is_sans_revente"], { tresorerieFinale }, isDu);
  }

  const regimes: ResultatRegime[] = [
    foncier("nu_micro"), foncier("nu_reel"), foncier("bailleur_prive"), foncier("sci_ir"), societeIS(false),
    lmnp("lmnp_micro"), lmnp("lmnp_reel"), societeIS(true),
  ];
  const eligibles = regimes.filter((r) => r.eligible);
  const meilleur = eligibles.length ? eligibles.reduce((a, b) => (b.cumulApresImpot > a.cumulApresImpot ? b : a)).regime : null;

  const loyersNuAn1 = loyers(false, 1);
  return {
    coutTotal: r2(coutNu),
    notaire: r2(notaire),
    rendementBrut: coutNu > 0 ? pos(e.loyerNu) * 12 / coutNu : 0,
    rendementBrutMeuble: coutNu + mobilier > 0 ? pos(e.loyerMeuble) * 12 / (coutNu + mobilier) : 0,
    rendementNet: coutNu > 0 ? (loyersNuAn1 - chargesBien(1, loyersNuAn1)) / coutNu : 0,
    regimes,
    meilleur,
  };
}
