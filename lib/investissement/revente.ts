/**
 * Simulateur d'achat-revente (module M3, étape 2) : un même achat, des mêmes travaux et un même crédit, revendus
 * au bout de N mois, selon trois cadres : particulier (plus-value immobilière), résidence principale (exonérée)
 * et marchand de biens en société à l'IS. Fonctions pures. Règles : docs/investissement/regles-fiscales-2026.md
 * (section 4, formules F45 à F58 et G59 à G64). Hypothèses affichées : un seul exercice fiscal pour la société,
 * pas d'option pour la TVA sur la marge, crédit amortissable remboursé à la vente.
 */
import { emolumentsHT, fraisNotaire, mensualite, tauxDepartement } from "./impot";
import { FRAIS_ACHAT, IS, PFU, PS } from "./regles";

export const PV = {
  tauxIR: 0.19,
  forfaitFraisAchat: 0.075,
  forfaitTravaux: 0.15,
  seuilExoneration: 15_000,
} as const;
/** Droits réduits du marchand de biens (art. 1115) et intérêt de retard en cas de non-revente sous 5 ans (art. 1840 G ter, 1727). */
export const MDB = { taux: 0.00715, delaiMois: 60, interetMois: 0.002 } as const;

export type CadreRevente = "particulier" | "residence_principale" | "marchand_biens";
export const CADRES: CadreRevente[] = ["particulier", "residence_principale", "marchand_biens"];

export type EntreeRevente = {
  prix: number;
  neuf: boolean;
  dept: string;
  /** Frais de notaire saisis ; null = calculés selon le cadre (droits pleins, primo-accédant, 0,715 % du marchand). */
  fraisNotaire: number | null;
  fraisAgence: number;
  travaux: number;
  /** Part des travaux faite par des entreprises et retenue dans la plus-value (amélioration, agrandissement), en %. */
  travauxEntreprisePct: number;
  /** Travaux lourds qui rendent l'immeuble neuf au sens de la TVA (art. 257 I 2 2°). */
  etatNeuf: boolean;
  apport: number;
  taux: number;
  dureeAns: number;
  assurancePct: number;
  fraisDossier: number;
  sansIra: boolean;
  taxeFonciere: number;
  /** Copropriété, assurance, abonnements pendant le portage, par an. */
  chargesAnnuelles: number;
  dureeMois: number;
  prixRevente: number;
  fraisAgenceVente: number;
  diagnostics: number;
  /** Mainlevée d'hypothèque ; null = 0,3 % du capital emprunté. */
  mainlevee: number | null;
  /** L'acheteur habite le bien jusqu'à la vente (résidence principale). */
  habite: boolean;
  primo: boolean;
  nbVendeurs: 1 | 2;
  comptableIs: number;
  creationSociete: number;
};

export type LigneDetail = { cle: string; montant: number };
export type AlerteRevente = "rp_courte" | "rp_requalification" | "particulier_requalification" | "mdb_conditions" | "mdb_sanction" | "mdb_tva_neuf" | "moins_value";

export type ResultatCadre = {
  cadre: CadreRevente;
  eligible: boolean;
  raison?: "rp_pas_habite" | "particulier_habite" | "mdb_habite";
  /** Gain avant impôts (et avant TVA de revente pour le marchand). */
  gainAvant: number;
  impots: number;
  gainNet: number;
  /** Argent sorti de ta poche : apport + mensualités et charges payées pendant l'opération. */
  mise: number;
  rendementAnnuel: number;
  prixMinimum: number;
  detail: LigneDetail[];
  /** Plus-value du particulier : brute, années de détention, abattements. */
  pv?: { brute: number; annees: number; abattIR: number; abattPS: number; surtaxe: number };
  alertes: AlerteRevente[];
};

export type ResultatRevente = { cadres: ResultatCadre[]; meilleur: CadreRevente | null; coutOperation: number };

const pos = (x: number): number => (Number.isFinite(x) && x > 0 ? x : 0);
const pct = (x: number): number => (Number.isFinite(x) ? x / 100 : 0);
const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Abattements pour durée de détention (art. 150 VC), en années pleines. */
export function abattementIR(n: number): number {
  if (n <= 5) return 0;
  if (n <= 21) return 0.06 * (n - 5);
  return 1;
}
export function abattementPS(n: number): number {
  if (n <= 5) return 0;
  if (n <= 21) return 0.0165 * (n - 5);
  if (n === 22) return 0.28;
  if (n <= 29) return Math.min(1, 0.28 + 0.09 * (n - 22));
  return 1;
}

/** Surtaxe sur les plus-values imposables de plus de 50 000 € (art. 1609 nonies G), par vendeur. */
export function surtaxe(pv: number): number {
  if (pv <= 50_000) return 0;
  if (pv <= 60_000) return 0.02 * pv - (60_000 - pv) / 20;
  if (pv <= 100_000) return 0.02 * pv;
  if (pv <= 110_000) return 0.03 * pv - (110_000 - pv) / 10;
  if (pv <= 150_000) return 0.03 * pv;
  if (pv <= 160_000) return 0.04 * pv - 0.15 * (160_000 - pv);
  if (pv <= 200_000) return 0.04 * pv;
  if (pv <= 210_000) return 0.05 * pv - 0.2 * (210_000 - pv);
  if (pv <= 250_000) return 0.05 * pv;
  if (pv <= 260_000) return 0.06 * pv - 0.25 * (260_000 - pv);
  return 0.06 * pv;
}

/** Taux départemental pour un primo-accédant qui achète sa résidence principale (art. 1594 D). */
export function tauxPrimo(dept: string): number {
  if (dept === "36") return 0.038;
  if (dept === "73") return 0.04;
  return 0.045;
}

function fraisAchatCadre(e: EntreeRevente, cadre: CadreRevente): number {
  if (e.fraisNotaire != null && e.fraisNotaire >= 0 && cadre !== "marchand_biens") return e.fraisNotaire;
  const prix = pos(e.prix);
  if (!(prix > 0)) return 0;
  const csi = Math.max(FRAIS_ACHAT.csi.min, prix * FRAIS_ACHAT.csi.taux);
  const tva = FRAIS_ACHAT.tvaEmoluments[e.dept] ?? FRAIS_ACHAT.tvaEmoluments.defaut;
  const emol = emolumentsHT(prix) * (1 + tva);
  if (cadre === "marchand_biens") return Math.round(prix * MDB.taux + csi + emol + FRAIS_ACHAT.debours);
  if (cadre === "residence_principale" && e.primo && !e.neuf) {
    return Math.round(prix * (tauxPrimo(e.dept) * FRAIS_ACHAT.coefDept + FRAIS_ACHAT.taxeCommunale) + csi + emol + FRAIS_ACHAT.debours);
  }
  return fraisNotaire(prix, e.dept, e.neuf);
}

/** Intérêts et capital remboursés sur les `mois` premiers mois d'un prêt amortissable, et capital restant dû. */
function credit(capital: number, tauxAnnuel: number, dureeAns: number, mois: number): { interets: number; capital: number; crd: number } {
  const m = mensualite(capital, tauxAnnuel, dureeAns);
  const t = tauxAnnuel / 12, n = Math.round(dureeAns * 12);
  let crd = capital, interets = 0, cap = 0;
  for (let k = 0; k < mois && k < n && crd > 0.005; k++) {
    const i = crd * t, c = Math.min(crd, m - i);
    interets += i; cap += c; crd -= c;
  }
  return { interets, capital: cap, crd: Math.max(0, crd) };
}

function calculCadre(e: EntreeRevente, cadre: CadreRevente, prixRevente: number): ResultatCadre {
  const prix = pos(e.prix), travaux = pos(e.travaux);
  const mois = Number.isFinite(e.dureeMois) ? Math.max(1, Math.round(e.dureeMois)) : 12;
  const duree = Number.isFinite(e.dureeAns) ? Math.min(30, Math.max(1, e.dureeAns)) : 20;
  const societe = cadre === "marchand_biens";
  const notaire = fraisAchatCadre(e, cadre);
  const agence = pos(e.fraisAgence), dossier = pos(e.fraisDossier);
  const creation = societe ? pos(e.creationSociete) : 0;
  const besoin = prix + notaire + agence + travaux + dossier + creation;
  const emprunt = Math.max(0, besoin - pos(e.apport));
  const c = credit(emprunt, pct(e.taux), duree, mois);
  const assurance = emprunt * pct(e.assurancePct) * Math.min(mois, duree * 12) / 12;
  // Indemnités de remboursement anticipé : 6 mois d'intérêts sur le capital remboursé, 3 % du capital au plus.
  const ira = e.sansIra ? 0 : Math.min(c.crd * pct(e.taux) / 2, 0.03 * c.crd);
  const mainlevee = e.mainlevee != null && e.mainlevee >= 0 ? e.mainlevee : 0.003 * emprunt;
  const portage = (pos(e.taxeFonciere) + pos(e.chargesAnnuelles)) * mois / 12;
  const comptable = societe ? pos(e.comptableIs) * Math.ceil(mois / 12) : 0;
  const fraisVente = pos(e.fraisAgenceVente) + pos(e.diagnostics);
  // Marchand de biens : pas revendu sous 5 ans → droits de droit commun + intérêt de retard depuis l'achat.
  // Rien à rappeler pour un achat neuf : son droit commun est déjà la taxe réduite.
  const sanction = societe && !e.neuf && mois > MDB.delaiMois
    ? (() => { const droits = prix * (tauxDepartement(e.dept) * FRAIS_ACHAT.coefDept + FRAIS_ACHAT.taxeCommunale); return droits + droits * MDB.interetMois * (mois - 1); })()
    : 0;
  // TVA de revente du marchand : 20 % du prix total si l'immeuble est rendu neuf par les travaux, ou acheté neuf et
  // revendu dans les 5 ans (achat supposé à l'achèvement). La revente étant taxable, la TVA payée en amont se récupère :
  // achat neuf, travaux, agences et comptable.
  const neufTva = societe && (e.etatNeuf || (e.neuf && mois <= MDB.delaiMois));
  const tvaRevente = neufTva ? prixRevente - prixRevente / 1.2 : 0;
  const sixieme = (x: number): number => x - x / 1.2;
  const tvaAchatRecup = neufTva && e.neuf ? sixieme(prix) : 0;
  const tvaTravauxRecup = neufTva ? sixieme(travaux) : 0;
  const tvaFraisRecup = neufTva ? sixieme(pos(e.fraisAgence) + pos(e.fraisAgenceVente) + (societe ? pos(e.comptableIs) * Math.ceil(mois / 12) : 0)) : 0;

  const gainAvant = prixRevente - fraisVente - mainlevee - ira - besoin - c.interets - assurance - portage - comptable - sanction - tvaRevente + tvaAchatRecup + tvaTravauxRecup + tvaFraisRecup;
  const mise = Math.min(pos(e.apport), besoin) + c.interets + c.capital + assurance + portage + comptable;
  const alertes: AlerteRevente[] = [];
  let impots = 0;
  let pv: ResultatCadre["pv"];

  if (cadre === "particulier") {
    const annees = Math.floor(mois / 12);
    const venteNette = prixRevente - pos(e.fraisAgenceVente) - pos(e.diagnostics) - mainlevee;
    const fraisAchatPV = Math.max(notaire + agence, PV.forfaitFraisAchat * prix);
    const travauxReels = travaux * Math.min(1, Math.max(0, pct(e.travauxEntreprisePct)));
    // Forfait de 15 % dès que le bien est détenu depuis plus de 5 ans (en mois, pas en années pleines).
    const travauxPV = mois > 60 ? Math.max(travauxReels, PV.forfaitTravaux * prix) : travauxReels;
    const brute = Math.max(0, venteNette - (prix + fraisAchatPV + travauxPV));
    const n = e.nbVendeurs === 2 ? 2 : 1;
    // Seuil de 15 000 € apprécié par quote-part (art. 150 U II 6°).
    const exonere = prixRevente / n <= PV.seuilExoneration;
    const aIR = abattementIR(annees), aPS = abattementPS(annees);
    const baseIR = exonere ? 0 : brute * (1 - aIR), basePS = exonere ? 0 : brute * (1 - aPS);
    const st = n * surtaxe(baseIR / n);
    impots = PV.tauxIR * baseIR + PS.foncier * basePS + st;
    pv = { brute: r2(brute), annees, abattIR: aIR, abattPS: aPS, surtaxe: r2(st) };
    if (venteNette - (prix + fraisAchatPV + travauxPV) < 0) alertes.push("moins_value");
    alertes.push("particulier_requalification");
  } else if (cadre === "residence_principale") {
    if (mois < 12) alertes.push("rp_courte");
    alertes.push("rp_requalification");
  } else {
    const isAn = (b: number): number => IS.tauxReduit * Math.min(b, IS.seuilReduit) + IS.tauxNormal * Math.max(0, b - IS.seuilReduit);
    const is = gainAvant > 0 ? isAn(gainAvant) : 0;
    const pfu = gainAvant > 0 ? PFU * (gainAvant - is) : 0;
    impots = is + pfu;
    alertes.push("mdb_conditions");
    if (sanction > 0) alertes.push("mdb_sanction");
    if (neufTva) alertes.push("mdb_tva_neuf");
  }

  const gainNet = gainAvant - impots;
  // Rendement ramené à l'année : simple sous 12 mois (capitaliser un gain de quelques mois donnerait des chiffres absurdes).
  const annuel = !(mise > 0) || gainNet <= -mise ? -1 : mois < 12 ? (gainNet / mise) * (12 / mois) : Math.pow(1 + gainNet / mise, 12 / mois) - 1;
  const detail: LigneDetail[] = [
    { cle: "prixRevente", montant: prixRevente },
    { cle: "fraisVente", montant: -(fraisVente + mainlevee - (neufTva ? sixieme(pos(e.fraisAgenceVente)) : 0)) },
    { cle: "achat", montant: -(prix + notaire + agence - tvaAchatRecup - (neufTva ? sixieme(agence) : 0)) },
    { cle: "travaux", montant: -(travaux - tvaTravauxRecup) },
    { cle: "credit", montant: -(c.interets + assurance + dossier + ira) },
    { cle: "portage", montant: -(portage + comptable + creation - (neufTva && societe ? sixieme(comptable) : 0)) },
    ...(sanction > 0 ? [{ cle: "sanction", montant: -sanction }] : []),
    ...(tvaRevente > 0 ? [{ cle: "tva", montant: -tvaRevente }] : []),
    { cle: "gainAvant", montant: gainAvant },
    { cle: cadre === "marchand_biens" ? "isPfu" : "impotPV", montant: -impots },
    { cle: "gainNet", montant: gainNet },
  ].map((l) => ({ cle: l.cle, montant: r2(l.montant) }));

  return {
    cadre, eligible: true, gainAvant: r2(gainAvant), impots: r2(impots), gainNet: r2(gainNet), mise: r2(mise),
    rendementAnnuel: annuel, prixMinimum: 0, detail, pv, alertes,
  };
}

/** Le plus petit prix de revente qui donne un gain net positif ou nul, à 100 € près. Le gain n'est pas monotone
 *  partout (saut de la surtaxe à 50 000 €, perte de l'exonération à 15 000 €) : on cherche une borne haute, on balaie
 *  par pas réguliers pour trouver le premier prix gagnant, puis on affine par dichotomie dans ce pas. */
function prixMinimum(e: EntreeRevente, cadre: CadreRevente): number {
  const gagne = (p: number): boolean => calculCadre(e, cadre, p).gainNet >= 0;
  let haut = Math.max(1, pos(e.prix) + pos(e.travaux)) * 3;
  while (!gagne(haut) && haut < 1e9) haut *= 2;
  const pas = Math.max(100, haut / 1_500);
  let premier = haut;
  for (let p = pas; p < haut; p += pas) if (gagne(p)) { premier = p; break; }
  let bas = Math.max(0, premier - pas), h = premier;
  for (let i = 0; i < 40; i++) {
    const m = (bas + h) / 2;
    if (gagne(m)) h = m; else bas = m;
  }
  return Math.ceil(h / 100) * 100;
}

export function simulerRevente(e: EntreeRevente): ResultatRevente {
  const cadres = CADRES.map((cadre) => {
    const r = calculCadre(e, cadre, pos(e.prixRevente));
    r.prixMinimum = prixMinimum(e, cadre);
    if (cadre === "residence_principale" && !e.habite) { r.eligible = false; r.raison = "rp_pas_habite"; }
    if (cadre === "particulier" && e.habite) { r.eligible = false; r.raison = "particulier_habite"; }
    if (cadre === "marchand_biens" && e.habite) { r.eligible = false; r.raison = "mdb_habite"; }
    return r;
  });
  const eligibles = cadres.filter((r) => r.eligible);
  const meilleur = eligibles.length ? eligibles.reduce((a, b) => (b.gainNet > a.gainNet ? b : a)).cadre : null;
  const prix = pos(e.prix);
  return { cadres, meilleur, coutOperation: r2(prix + fraisAchatCadre(e, "particulier") + pos(e.fraisAgence) + pos(e.travaux)) };
}
