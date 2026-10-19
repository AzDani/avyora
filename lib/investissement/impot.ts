/**
 * Impôt sur le revenu d'un foyer (barème des revenus 2025, art. 197 CGI) et frais d'acquisition.
 * Le simulateur calcule l'impôt d'un projet PAR DIFFÉRENCE : impôt du foyer avec le projet moins impôt
 * sans le projet, jamais « tranche marginale × revenu » (formules A1 à A4 du document des règles).
 */
import { BAREME_IR, DECOTE, FRAIS_ACHAT, IR_MIN_RECOUVRE, PLAFOND_DEMI_PART } from "./regles";

export type Foyer = { revenu: number; parts: number; couple: boolean };

/** Impôt brut pour un revenu imposable et un nombre de parts, avant plafonnement et décote. */
export function irBareme(revenu: number, parts: number): number {
  const n = parts > 0 ? parts : 1;
  const q = Math.max(0, revenu) / n;
  let impot = 0, bas = 0;
  for (const t of BAREME_IR) {
    if (q > bas) impot += (Math.min(q, t.jusqua) - bas) * t.taux;
    bas = t.jusqua;
  }
  return impot * n;
}

/** Impôt du foyer : quotient familial plafonné (1 807 € par demi-part au-delà de 1 ou 2 parts), décote,
 *  pas de recouvrement sous 61 €, arrondi à l'euro. Cas particuliers (parent isolé, invalidité) : V2. */
export function irFoyer(f: Foyer): number {
  const base = f.couple ? 2 : 1;
  const parts = Math.max(base, f.parts || base);
  const avantageMax = (parts - base) * 2 * PLAFOND_DEMI_PART;
  let impot = Math.max(irBareme(f.revenu, parts), irBareme(f.revenu, base) - avantageMax);
  const d = f.couple ? DECOTE.couple : DECOTE.seul;
  if (impot < d.seuil) impot -= Math.max(0, d.forfait - DECOTE.coef * impot);
  impot = Math.max(0, impot);
  if (impot < IR_MIN_RECOUVRE) return 0;
  return Math.round(impot);
}

/** Département d'un code postal : « 75 », « 2A »/« 2B » pour la Corse, « 971 » à « 976 » outre-mer. */
export function departement(codePostal: string | undefined): string {
  const cp = String(codePostal ?? "").trim();
  if (!/^\d{5}$/.test(cp)) return "";
  if (cp.startsWith("97")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B";
  return cp.slice(0, 2);
}

/** Émoluments proportionnels du notaire, hors taxes (art. A444-91 C. com.). */
export function emolumentsHT(prix: number): number {
  let total = 0, bas = 0;
  for (const t of FRAIS_ACHAT.emoluments) {
    if (prix > bas) total += (Math.min(prix, t.jusqua) - bas) * t.taux;
    bas = t.jusqua;
  }
  return total;
}

/** Taux départemental des droits de mutation (actes jusqu'au 31/03/2028, acheteur non primo-accédant). */
export function tauxDepartement(dept: string): number {
  if ((FRAIS_ACHAT.depts380 as readonly string[]).includes(dept)) return 0.038;
  if ((FRAIS_ACHAT.depts450 as readonly string[]).includes(dept)) return 0.045;
  return FRAIS_ACHAT.tauxDeptMajore;
}

/** « Frais de notaire » d'un achat : droits (ou taxe réduite du neuf), CSI, émoluments TTC et débours. */
export function fraisNotaire(prix: number, dept: string, neuf: boolean): number {
  if (!(prix > 0)) return 0;
  const droits = neuf ? prix * FRAIS_ACHAT.neufTaux : prix * (tauxDepartement(dept) * FRAIS_ACHAT.coefDept + FRAIS_ACHAT.taxeCommunale);
  const csi = Math.max(FRAIS_ACHAT.csi.min, prix * FRAIS_ACHAT.csi.taux);
  const tva = FRAIS_ACHAT.tvaEmoluments[dept] ?? FRAIS_ACHAT.tvaEmoluments.defaut;
  return Math.round(droits + csi + emolumentsHT(prix) * (1 + tva) + FRAIS_ACHAT.debours);
}

/** Échéancier d'un prêt amortissable, agrégé par année : intérêts, capital remboursé, capital restant dû. */
export type AnneeCredit = { interets: number; capital: number; crd: number };

export function mensualite(capital: number, tauxAnnuel: number, dureeAns: number): number {
  const n = Math.round(dureeAns * 12);
  if (!(capital > 0) || n <= 0) return 0;
  const t = tauxAnnuel / 12;
  return t === 0 ? capital / n : (capital * t) / (1 - Math.pow(1 + t, -n));
}

export function echeancier(capital: number, tauxAnnuel: number, dureeAns: number, horizon: number): AnneeCredit[] {
  const m = mensualite(capital, tauxAnnuel, dureeAns);
  const n = Math.round(dureeAns * 12), t = tauxAnnuel / 12;
  const out: AnneeCredit[] = [];
  let crd = Math.max(0, capital), mois = 0;
  for (let a = 0; a < horizon; a++) {
    let interets = 0, cap = 0;
    for (let k = 0; k < 12 && mois < n && crd > 0.005; k++, mois++) {
      const i = crd * t;
      const c = Math.min(crd, m - i);
      interets += i; cap += c; crd -= c;
    }
    out.push({ interets, capital: cap, crd: Math.max(0, crd) });
  }
  return out;
}
