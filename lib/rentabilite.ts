export type ParamsRentabilite = {
  prixAchat: number;
  travaux: number;
  loyerMensuel: number;
  chargesAnnuelles: number; // copro non récupérable + taxe foncière + assurances
  apport: number;
  tauxCredit: number; // % annuel
  dureeCredit: number; // années
  valeurApresTravaux?: number; // valeur estimée du bien rénové
};

export type ResultatsRentabilite = {
  fraisNotaire: number;
  coutTotal: number;
  montantEmprunte: number;
  mensualite: number;
  rendementBrut: number;
  rendementNet: number;
  cashflowMensuel: number;
  plusValueLatente: number | null; // valeur après travaux − coût total
  roiApport: number | null; // cash-flow annuel / apport (cash-on-cash), en %
};

/** Frais de notaire ancien ≈ 8 % du prix d'achat. */
export function calculerRentabilite(p: ParamsRentabilite): ResultatsRentabilite {
  const fraisNotaire = Math.round(p.prixAchat * 0.08);
  const coutTotal = p.prixAchat + fraisNotaire + p.travaux;
  const montantEmprunte = Math.max(0, coutTotal - p.apport);

  const tauxMensuel = p.tauxCredit / 100 / 12;
  const n = p.dureeCredit * 12;
  const mensualite =
    montantEmprunte === 0
      ? 0
      : tauxMensuel === 0
        ? montantEmprunte / n
        : (montantEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -n));

  const loyerAnnuel = p.loyerMensuel * 12;
  const rendementBrut = coutTotal > 0 ? (loyerAnnuel / coutTotal) * 100 : 0;
  const rendementNet =
    coutTotal > 0 ? ((loyerAnnuel - p.chargesAnnuelles) / coutTotal) * 100 : 0;
  const cashflowMensuel =
    p.loyerMensuel - mensualite - p.chargesAnnuelles / 12;

  const plusValueLatente =
    p.valeurApresTravaux && p.valeurApresTravaux > 0
      ? Math.round(p.valeurApresTravaux - coutTotal)
      : null;
  const roiApport =
    p.apport > 0
      ? Math.round(((cashflowMensuel * 12) / p.apport) * 10000) / 100
      : null;

  return {
    fraisNotaire,
    coutTotal,
    montantEmprunte,
    mensualite: Math.round(mensualite),
    rendementBrut: Math.round(rendementBrut * 100) / 100,
    rendementNet: Math.round(rendementNet * 100) / 100,
    cashflowMensuel: Math.round(cashflowMensuel),
    plusValueLatente,
    roiApport,
  };
}
