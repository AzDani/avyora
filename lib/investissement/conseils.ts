/**
 * Conseils d'optimisation (module M3) : l'écart entre le régime (ou le cadre) que l'utilisateur envisage et le
 * meilleur, puis des leviers légaux pour payer moins d'impôts. Chaque levier chiffrable est mesuré en relançant le
 * moteur avec une seule entrée changée (« et si… ») : le gain affiché est celui du simulateur, pas une règle
 * générale. Un levier qui ne rapporte rien sur ce projet n'est pas affiché. Fonctions pures.
 */
import { simulerLocation, type EntreeLocation, type Regime, type ResultatLocation } from "./location";
import { calculCadre, type CadreRevente, type EntreeRevente, type ResultatRevente } from "./revente";

/** En dessous de ce gain (en €, cumulé), un levier n'est pas montré : il ne vaut pas la complexité. */
export const GAIN_MIN = 150;

export type CleConseilLocation =
  | "deficit_reno" | "etaler_travaux" | "terrain_ventilation" | "is_compte_courant" | "lmnp_revente" | "sci_ir_transmission";
export type CleConseilRevente =
  | "rv_residence" | "rv_factures" | "rv_deux_vendeurs" | "rv_ira" | "rv_mdb_5ans" | "rv_mdb_reinvestir" | "rv_detention_5ans";

/** Un conseil : `gain` chiffré par le moteur (en €, sur la durée simulée), ou null pour un conseil « à savoir ». */
export type Conseil<C extends string> = { cle: C; gain: number | null; valeur?: number };

/** Le choix de l'utilisateur face au meilleur. `perte` > 0 : ce que le choix coûte (cumul ou gain net). */
export type EcartChoix<R extends string> = {
  choix: R;
  meilleur: R;
  bon: boolean;
  eligible: boolean;
  raison?: string;
  perte: number;
  /** Impôts payés en plus avec le choix (négatif : en moins, l'écart vient alors des frais ou des loyers). */
  impotsEnPlus: number;
};

const r0 = (x: number): number => Math.round(x);

// ── Location ────────────────────────────────────────────────────────────────────────────────────────────────

export function ecartLocation(res: ResultatLocation, choix: Regime | null | undefined): EcartChoix<Regime> | null {
  if (!choix || !res.meilleur) return null;
  const c = res.regimes.find((r) => r.regime === choix), b = res.regimes.find((r) => r.regime === res.meilleur);
  if (!c || !b) return null;
  return {
    choix, meilleur: b.regime, bon: c.regime === b.regime, eligible: c.eligible, raison: c.raison,
    perte: r0(b.cumulApresImpot - c.cumulApresImpot), impotsEnPlus: r0(c.impotsCumules - b.impotsCumules),
  };
}

/** Le régime sur lequel mesurer les leviers : le choix s'il est possible, sinon le meilleur. */
function refLocation(res: ResultatLocation, choix: Regime | null | undefined): Regime | null {
  const c = choix ? res.regimes.find((r) => r.regime === choix) : null;
  return c?.eligible ? c.regime : res.meilleur;
}

export function conseilsLocation(e: EntreeLocation, res: ResultatLocation, choix?: Regime | null): Conseil<CleConseilLocation>[] {
  const ref = refLocation(res, choix);
  if (!ref) return [];
  const cumul = (r: ResultatLocation): number => r.regimes.find((x) => x.regime === ref)?.cumulApresImpot ?? 0;
  const base = cumul(res);
  const etSi = (patch: Partial<EntreeLocation>): number => r0(cumul(simulerLocation({ ...e, ...patch })) - base);
  const out: Conseil<CleConseilLocation>[] = [];
  const garder = (c: Conseil<CleConseilLocation>) => { if (c.gain == null || c.gain >= GAIN_MIN) out.push(c); };
  const foncierReel = ref === "nu_reel" || ref === "sci_ir";
  const deductibles = (e.travaux * Math.min(100, Math.max(0, e.travauxDeductiblesPct))) / 100;

  // Déficit foncier : plafond doublé (21 400 €) si les travaux font passer le logement de E, F ou G à A à D.
  if (foncierReel && !e.renoEnergetique && !e.neuf && deductibles > 0) garder({ cle: "deficit_reno", gain: etSi({ renoEnergetique: true }) });

  // Déficit foncier : payer les travaux sur deux ou trois années civiles ouvre deux ou trois plafonds de 10 700 €.
  if (foncierReel && deductibles > 0 && !(e.travauxSurAnnees && e.travauxSurAnnees > 1)) {
    const g2 = etSi({ travauxSurAnnees: 2 }), g3 = etSi({ travauxSurAnnees: 3 });
    garder(g3 > g2 + GAIN_MIN ? { cle: "etaler_travaux", gain: g3, valeur: 3 } : { cle: "etaler_travaux", gain: g2, valeur: 2 });
  }

  // Amortissement : chaque point de terrain en moins est du bâti amortissable en plus, si la ventilation est justifiée.
  if ((ref === "lmnp_reel" || ref === "is_nu" || ref === "is_meuble") && !e.terrainABatir && e.terrainPct >= 10) {
    garder({ cle: "terrain_ventilation", gain: etSi({ terrainPct: e.terrainPct - 5 }), valeur: e.terrainPct });
  }

  if (ref === "is_nu" || ref === "is_meuble") garder({ cle: "is_compte_courant", gain: null });
  if (ref === "lmnp_reel") garder({ cle: "lmnp_revente", gain: null });
  if (ref === "sci_ir") garder({ cle: "sci_ir_transmission", gain: null });
  return out;
}

// ── Achat-revente ───────────────────────────────────────────────────────────────────────────────────────────

export function ecartRevente(res: ResultatRevente, choix: CadreRevente | null | undefined): EcartChoix<CadreRevente> | null {
  if (!choix || !res.meilleur) return null;
  const c = res.cadres.find((r) => r.cadre === choix), b = res.cadres.find((r) => r.cadre === res.meilleur);
  if (!c || !b) return null;
  return {
    choix, meilleur: b.cadre, bon: c.cadre === b.cadre, eligible: c.eligible, raison: c.raison,
    perte: r0(b.gainNet - c.gainNet), impotsEnPlus: r0(c.impots - b.impots),
  };
}

export function conseilsRevente(e: EntreeRevente, res: ResultatRevente, choix?: CadreRevente | null): Conseil<CleConseilRevente>[] {
  const c = choix ? res.cadres.find((r) => r.cadre === choix) : null;
  const ref = c?.eligible ? c.cadre : res.meilleur;
  if (!ref) return [];
  const cur = res.cadres.find((r) => r.cadre === ref)!;
  const etSi = (patch: Partial<EntreeRevente>): number =>
    r0(calculCadre({ ...e, ...patch }, ref, e.prixRevente).gainNet - cur.gainNet);
  const out: Conseil<CleConseilRevente>[] = [];
  const garder = (x: Conseil<CleConseilRevente>) => { if (x.gain == null || x.gain >= GAIN_MIN) out.push(x); };
  const mois = Math.max(1, Math.round(e.dureeMois || 12));

  // Résidence principale : exonérée, si tu y vis vraiment jusqu'à la vente.
  if (!e.habite && ref !== "residence_principale") {
    const rp = res.cadres.find((r) => r.cadre === "residence_principale");
    if (rp) garder({ cle: "rv_residence", gain: r0(rp.gainNet - cur.gainNet) });
  }

  if (ref === "particulier") {
    // Seuls les travaux facturés par des entreprises entrent dans le prix d'acquisition.
    if (e.travaux > 0 && e.travauxEntreprisePct < 100) garder({ cle: "rv_factures", gain: etSi({ travauxEntreprisePct: 100 }) });
    // Surtaxe : seuil de 50 000 € par vendeur.
    if (e.nbVendeurs !== 2 && (cur.pv?.surtaxe ?? 0) > 0) garder({ cle: "rv_deux_vendeurs", gain: etSi({ nbVendeurs: 2 }) });
    // Au-delà de 5 ans : forfait de 15 % pour travaux et premiers abattements pour durée de détention.
    if (mois >= 48 && mois <= 60) garder({ cle: "rv_detention_5ans", gain: etSi({ dureeMois: 61 }) });
  }

  // Indemnités de remboursement anticipé : à faire supprimer dans l'offre de prêt.
  if (!e.sansIra) garder({ cle: "rv_ira", gain: etSi({ sansIra: true }) });

  if (ref === "marchand_biens") {
    if (mois > 60 && !e.neuf && !e.terrainABatir) garder({ cle: "rv_mdb_5ans", gain: etSi({ dureeMois: 60 }) });
    // Le PFU n'est dû que si tu te verses le gain : laissé dans la société, il finance l'opération suivante.
    const pfu = cur.impots - (cur.isSociete ?? cur.impots);
    if (pfu > 0) garder({ cle: "rv_mdb_reinvestir", gain: r0(pfu) });
  }
  return out;
}
