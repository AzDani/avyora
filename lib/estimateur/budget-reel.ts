/**
 * Gestion du budget (module M5) : le prévu de l'estimation contre les dépenses réelles saisies sur
 * le chantier, corps d'état par corps d'état, avec les alertes de dépassement et la prévision finale.
 *
 * Fonctions pures (aucune session, aucune base) : la fiche projet les appelle avec les réponses du
 * projet et les lignes de la table `expenses`. Testées dans tests/budget-reel.test.ts.
 *
 * Conventions :
 * - le PRÉVU d'un corps d'état = son TTC hors aléas dans l'estimation, lignes perso comprises
 *   (`lotsAvecPerso`, la même base que le camembert « Où part le budget ») ;
 * - les ALÉAS restent une enveloppe globale, ils ne sont pas répartis par corps d'état ;
 * - la PRÉVISION FINALE d'un corps = son réel s'il est terminé (tous ses postes « terminés » dans le
 *   suivi) et qu'il a des dépenses, sinon le plus grand du prévu et du réel (ce qui est dépensé est
 *   acquis, ce qui reste prévu reste à payer). Une dépense sur un corps absent de l'estimation
 *   compte telle quelle.
 * - chaque dépense a une NATURE (25/11/2026, demande de Dani) : fourni-posé (matériaux + main-d'œuvre),
 *   main-d'œuvre seule ou matériaux seuls ; chaque corps d'état donne son réel par nature, et son prévu
 *   partagé entre ce que font les artisans (fourni-posé) et ce que l'utilisateur fait lui-même (matériaux) ;
 * - « Matériel et outillage » (le corps `Location de matériel` de l'estimation) est TOUJOURS une ligne : un
 *   budget à part (acheter ou louer les outils dépend de l'équipement de chacun). Son prévu est le budget
 *   matériel fixé par l'utilisateur (`reponses.budgetMateriel`), sinon celui de l'estimation (souvent 0).
 * - HT / TTC (25/11/2026, maquette V4) : le budget se compte dans la base de celui qui paie. Particulier (défaut) :
 *   tout en TTC, comme avant. Professionnel (`ctx.payeur = "pro"`, il récupère la TVA) : le prévu en HT et chaque
 *   dépense pour son HT (montant − sa TVA). Chaque dépense garde sa TVA (`tva`, `taux`) : le bilan additionne la
 *   TVA payée, par taux, contre la TVA prévue par l'estimation. Une dépense d'avant ce suivi n'a pas de TVA
 *   renseignée : elle ne compte pas dans la TVA payée ; pour un pro, son HT est estimé au taux moyen de son corps.
 */
import { buildDevis, statutLigne, LOC, type Ctx, type Selection } from "./core";
import { catalogueDe } from "./catalogue-neuf";
import { normaliserCles } from "./identite";
import { lotsAvecPerso, totauxAvecPerso, persoValidees } from "./projet";
import { prixHTPerso } from "./core";

/** fp fourni-posé (matériaux + main-d'œuvre), mo main-d'œuvre seule, mat matériaux seuls. */
export type NatureDepense = "fp" | "mo" | "mat";
export const NATURES: readonly NatureDepense[] = ["fp", "mo", "mat"];

/** Une dépense réelle, telle que lue dans la table `expenses` (sans nature : fourni-posé). `montant` est TTC ;
 *  `tva` le montant de TVA de la facture (null : pas renseigné, dépense d'avant ce suivi) ; `taux` « 0 », « 5.5 »,
 *  « 10 », « 20 » ou « multi » (facture à plusieurs taux, la TVA tapée telle quelle). */
export type Depense = { id: string; corps: string; libelle: string; montant: number; date: string; nature?: NatureDepense; tva?: number | null; taux?: TauxDepense | null };
export type TauxDepense = "0" | "5.5" | "10" | "20" | "multi";
export const TAUX_DEPENSE: readonly TauxDepense[] = ["5.5", "10", "20", "0", "multi"];
/** La TVA d'un montant TTC à un taux donné. */
export const tvaDeTtc = (ttc: number, taux: number): number => ttc - ttc / (1 + taux / 100);

/** Le corps « Matériel et outillage » : la clé du catalogue (`Location de matériel`), affichée autrement. */
export const CORPS_MATERIEL = LOC;

/** Seuil d'alerte : à partir de 90 % du prévu consommé sur un corps pas encore terminé. */
export const SEUIL_ATTENTION = 0.9;

export type EtatCorps = "ok" | "attention" | "depasse" | "hors_estimation";

export type LigneBudget = {
  corps: string;
  prevu: number;
  reel: number;
  /** réel − prévu (positif = dépassement). */
  ecart: number;
  /** part du prévu consommée (0 si rien de prévu). */
  part: number;
  termine: boolean;
  /** au moins un poste « en cours » ou « terminé » dans le suivi de chantier. */
  demarre: boolean;
  prevision: number;
  etat: EtatCorps;
  /** prévu − réel, jamais négatif. */
  reste: number;
  /** Le réel par nature de dépense. */
  parNature: Record<NatureDepense, number>;
  /** Le prévu des postes confiés à un artisan (fourni-posé) et de ceux que l'utilisateur fait lui-même (matériaux). */
  prevuArtisan: number;
  prevuToi: number;
  /** La ligne « Matériel et outillage ». */
  materiel?: boolean;
  /** TVA renseignée des dépenses de ce corps. */
  tva: number;
};

export type BilanBudget = {
  lignes: LigneBudget[];
  /** TTC hors aléas de l'estimation. */
  prevu: number;
  /** Provision pour aléas de l'estimation. */
  aleas: number;
  /** Total de l'estimation, aléas compris. */
  estimation: number;
  reel: number;
  prevision: number;
  /** prévision − estimation (aléas compris) : négatif = sous l'enveloppe. */
  ecartPrevision: number;
  /** Budget maximum saisi dans l'estimation (0 = non défini). */
  budgetMax: number;
  alertes: Alerte[];
  /** Le budget matériel fixé par l'utilisateur (null : celui de l'estimation) et celui de l'estimation. */
  budgetMateriel: number | null;
  materielEstime: number;
  /** Base de tous les montants du bilan : TTC (particulier) ou HT (professionnel). */
  base: "ttc" | "ht";
  /** La TVA payée (renseignée), par taux, et celle prévue par l'estimation (aléas exclus). */
  tva: { payee: number; prevue: number; ttcFactures: number; sansTva: number; parTaux: { taux: TauxDepense; ht: number; tva: number; n: number }[] };
};

export type Alerte =
  | { type: "depasse"; corps: string; montant: number }
  | { type: "attention"; corps: string; part: number }
  | { type: "hors_estimation"; corps: string; montant: number }
  | { type: "prevision_estimation"; montant: number }
  | { type: "prevision_budget"; montant: number };

type Rep = { ctx?: Ctx; sel?: Selection; statuts?: Record<string, number>; custom?: unknown; codePostal?: string; budgetMateriel?: unknown };

const natureDe = (d: Depense): NatureDepense => (d.nature === "mo" || d.nature === "mat" ? d.nature : "fp");
const zero = (): Record<NatureDepense, number> => ({ fp: 0, mo: 0, mat: 0 });

const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Le bilan budgétaire d'un projet : null si les réponses ne sont pas au format estimateur. */
export function bilanBudget(reponses: unknown, depenses: Depense[]): BilanBudget | null {
  const r = reponses as Rep;
  if (!r?.ctx) return null;
  const ctx: Ctx = { ...r.ctx, codePostal: r.ctx.codePostal ?? r.codePostal };
  const sel = normaliserCles((r.sel || {}) as Selection);
  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const statuts = normaliserCles(r.statuts || {});
  const totaux = totauxAvecPerso(dv.totaux, r.custom, ctx.aleas);
  const pro = ctx.payeur === "pro";
  // Le HT de chaque corps d'état (lignes + lignes perso) : la base d'un professionnel, et le taux moyen d'un corps.
  const htCorps = new Map<string, number>();
  for (const li of dv.lignes) htCorps.set(li.corps, (htCorps.get(li.corps) ?? 0) + li.ht);
  for (const x of persoValidees(r.custom)) htCorps.set(x.lot, (htCorps.get(x.lot) ?? 0) + prixHTPerso(x) * (x.qte || 0));

  // Un corps est terminé quand il a des postes et qu'ils sont tous « terminés » dans le suivi.
  const postes = new Map<string, { n: number; faits: number; lances: number }>();
  for (const li of dv.lignes) {
    const p = postes.get(li.corps) ?? { n: 0, faits: 0, lances: 0 };
    p.n++;
    const st = statutLigne(statuts, li);
    if (st === 2) p.faits++;
    if (st >= 1) p.lances++;
    postes.set(li.corps, p);
  }
  const termine = (corps: string): boolean => {
    const p = postes.get(corps);
    return !!p && p.n > 0 && p.faits === p.n;
  };
  const demarre = (corps: string): boolean => (postes.get(corps)?.lances ?? 0) > 0;

  const lots = lotsAvecPerso(dv.lots, r.custom);
  // Une dépense dans la base du bilan : TTC tel quel ; HT = TTC − sa TVA (sans TVA renseignée : au taux moyen de son corps).
  const ratioCorps = (corps: string): number => {
    const ttc = lots.find((l) => l.corps === corps)?.ttc ?? 0, ht = htCorps.get(corps) ?? 0;
    return ht > 0 && ttc > 0 ? ttc / ht : 1.2;
  };
  const compte = (d: Depense): number => {
    const m = Number(d.montant) || 0;
    if (!pro) return m;
    return d.tva != null && Number.isFinite(Number(d.tva)) ? m - Number(d.tva) : m / ratioCorps(d.corps);
  };
  const reelPar = new Map<string, number>();
  const tvaPar = new Map<string, number>();
  const naturePar = new Map<string, Record<NatureDepense, number>>();
  const parTaux = new Map<TauxDepense, { ht: number; tva: number; n: number }>();
  let tvaPayee = 0, ttcFactures = 0, sansTva = 0;
  for (const d of depenses) {
    const m = compte(d);
    reelPar.set(d.corps, (reelPar.get(d.corps) ?? 0) + m);
    const n = naturePar.get(d.corps) ?? zero();
    n[natureDe(d)] += m;
    naturePar.set(d.corps, n);
    if (d.tva == null || !Number.isFinite(Number(d.tva))) { sansTva++; continue; }
    const tv = Number(d.tva), ttc = Number(d.montant) || 0, tx: TauxDepense = d.taux ?? "multi";
    tvaPayee += tv; ttcFactures += ttc;
    tvaPar.set(d.corps, (tvaPar.get(d.corps) ?? 0) + tv);
    const p = parTaux.get(tx) ?? { ht: 0, tva: 0, n: 0 };
    p.ht += ttc - tv; p.tva += tv; p.n++;
    parTaux.set(tx, p);
  }
  const natures = (corps: string): Record<NatureDepense, number> => {
    const n = naturePar.get(corps) ?? zero();
    return { fp: r2(n.fp), mo: r2(n.mo), mat: r2(n.mat) };
  };
  // Le prévu partagé : ce que fait l'utilisateur lui-même (matériaux seuls) et le reste (artisans, lignes perso).
  const toiPar = new Map<string, number>();
  for (const li of dv.lignes) if (li.mode === "je-fais") toiPar.set(li.corps, (toiPar.get(li.corps) ?? 0) + (pro ? li.ht : li.ttc));

  // Le prévu d'un corps dans la base du bilan.
  const prevuDe = (l: { corps: string; ttc: number }): number => (pro ? htCorps.get(l.corps) ?? 0 : l.ttc);
  // Le budget matériel : celui fixé par l'utilisateur, sinon celui de l'estimation (le corps `Location de matériel`).
  const lotMat = lots.find((l) => l.corps === CORPS_MATERIEL);
  const materielEstime = lotMat ? prevuDe(lotMat) : 0;
  const bm = Number(r.budgetMateriel);
  const budgetMateriel = r.budgetMateriel != null && Number.isFinite(bm) && bm >= 0 ? r2(bm) : null;
  const enveloppe = budgetMateriel ?? materielEstime;
  if (!lots.some((l) => l.corps === CORPS_MATERIEL)) lots.push({ corps: CORPS_MATERIEL, phase: "", ttc: 0, phases: [] });

  const lignes: LigneBudget[] = [];
  for (const lot of lots) {
    const estMateriel = lot.corps === CORPS_MATERIEL;
    const prevu = estMateriel ? enveloppe : prevuDe(lot), reel = reelPar.get(lot.corps) ?? 0, fini = termine(lot.corps);
    reelPar.delete(lot.corps);
    const part = prevu > 0 ? reel / prevu : 0;
    // Du matériel acheté sans budget matériel fixé : il compte, mais hors de ce qui était prévu.
    const etat: EtatCorps = estMateriel && prevu <= 0 && reel > 0 ? "hors_estimation"
      : reel > prevu + 0.005 ? "depasse" : !fini && prevu > 0 && part >= SEUIL_ATTENTION ? "attention" : "ok";
    // Terminé SANS aucune dépense saisie : on n'en sait rien, la prévision garde le prévu.
    const prevision = fini && reel > 0 ? reel : Math.max(prevu, reel);
    const toi = estMateriel ? 0 : Math.min(prevu, toiPar.get(lot.corps) ?? 0);
    lignes.push({
      corps: lot.corps, prevu: r2(prevu), reel: r2(reel), ecart: r2(reel - prevu), part, termine: fini, demarre: demarre(lot.corps),
      prevision: r2(prevision), etat, reste: r2(Math.max(0, prevu - reel)), parNature: natures(lot.corps),
      prevuArtisan: r2(estMateriel ? 0 : prevu - toi), prevuToi: r2(toi), ...(estMateriel ? { materiel: true } : {}),
      tva: r2(tvaPar.get(lot.corps) ?? 0),
    });
  }
  // Dépenses sur un corps que l'estimation ne prévoyait pas (« Autre », un lot ajouté sur le chantier…).
  for (const [corps, reel] of reelPar) {
    lignes.push({
      corps, prevu: 0, reel: r2(reel), ecart: r2(reel), part: 0, termine: false, demarre: true, prevision: r2(reel), etat: "hors_estimation",
      reste: 0, parNature: natures(corps), prevuArtisan: 0, prevuToi: 0, tva: r2(tvaPar.get(corps) ?? 0),
    });
  }

  const prevu = r2(lignes.reduce((s, l) => s + l.prevu, 0));
  const reel = r2(lignes.reduce((s, l) => s + l.reel, 0));
  // Les aléas restent disponibles tant qu'il reste du prévu : la prévision finale les garde entiers,
  // ce qui est prudent (on ne compte pas sur des imprévus qui n'arriveront pas).
  const prevision = r2(lignes.reduce((s, l) => s + l.prevision, 0) + totaux.aleas);
  // L'estimation, avec le budget matériel à la place de la location de matériel estimée.
  const estimation = r2((pro ? totaux.ht + totaux.aleas : totaux.ttc) - materielEstime + enveloppe);
  const budgetMax = Number(ctx.budget) > 0 ? Number(ctx.budget) : 0;

  const alertes: Alerte[] = [];
  for (const l of [...lignes].sort((a, b) => b.ecart - a.ecart)) {
    if (l.etat === "depasse") alertes.push({ type: "depasse", corps: l.corps, montant: l.ecart });
    else if (l.etat === "hors_estimation") alertes.push({ type: "hors_estimation", corps: l.corps, montant: l.reel });
  }
  for (const l of lignes) if (l.etat === "attention") alertes.push({ type: "attention", corps: l.corps, part: l.part });
  if (prevision > estimation + 0.5) alertes.push({ type: "prevision_estimation", montant: r2(prevision - estimation) });
  if (budgetMax > 0 && prevision > budgetMax + 0.5) alertes.push({ type: "prevision_budget", montant: r2(prevision - budgetMax) });

  return {
    lignes, prevu, aleas: r2(totaux.aleas), estimation, reel, prevision, ecartPrevision: r2(prevision - estimation), budgetMax, alertes,
    budgetMateriel, materielEstime: r2(materielEstime),
    base: pro ? "ht" : "ttc",
    tva: {
      payee: r2(tvaPayee), prevue: r2(totaux.tva), ttcFactures: r2(ttcFactures), sansTva,
      parTaux: TAUX_DEPENSE.filter((t) => parTaux.has(t)).map((t) => { const p = parTaux.get(t)!; return { taux: t, ht: r2(p.ht), tva: r2(p.tva), n: p.n }; }),
    },
  };
}

/** Les corps d'état proposés à la saisie d'une dépense : ceux de l'estimation, du plus gros au plus petit,
 *  puis « Matériel et outillage », toujours là. */
export function corpsDuProjet(reponses: unknown): string[] {
  const b = bilanBudget(reponses, []);
  if (!b) return [];
  return [...b.lignes.filter((l) => !l.materiel).sort((a, x) => x.prevu - a.prevu).map((l) => l.corps), CORPS_MATERIEL];
}

/** Le corps d'état « libre » pour une dépense qui ne rentre dans aucun lot de l'estimation. */
export const CORPS_AUTRE = "Autre";

/** Le taux de TVA proposé pour une nouvelle dépense : 20 % pour du matériel, des matériaux seuls, en neuf ou en
 *  local pro ; sinon le taux des postes « Fait faire » de ce corps dans l'estimation (5,5 ou 10 %). L'utilisateur
 *  le change si sa facture dit autre chose. */
export function tauxProposeDepense(reponses: unknown, corps: string, nature: NatureDepense): { taux: TauxDepense; pourquoi: "materiel" | "mat" | "neuf" | "energie" | "reduit" } {
  if (corps === CORPS_MATERIEL) return { taux: "20", pourquoi: "materiel" };
  if (nature === "mat") return { taux: "20", pourquoi: "mat" };
  const r = reponses as Rep;
  if (!r?.ctx || r.ctx.nature === "neuf" || r.ctx.fiscal === "pro") return { taux: "20", pourquoi: "neuf" };
  const ctx: Ctx = { ...r.ctx, codePostal: r.ctx.codePostal ?? r.codePostal };
  const dv = buildDevis(catalogueDe(ctx), ctx, normaliserCles((r.sel || {}) as Selection));
  let ht = 0, tva = 0;
  for (const li of dv.lignes) if (li.corps === corps && li.mode === "fait-faire") { ht += li.ht; tva += li.tva; }
  const taux = ht > 0 ? (tva / ht) * 100 : 10;
  return taux < 7.75 ? { taux: "5.5", pourquoi: "energie" } : taux < 15 ? { taux: "10", pourquoi: "reduit" } : { taux: "20", pourquoi: "neuf" };
}

/** Nature et TVA d'une dépense saisie (ajout comme modification) : le matériel est toujours « matériaux » ; la TVA
 *  est recalculée depuis le montant TTC et le taux, ou tapée pour une facture à plusieurs taux (plus petite que le
 *  montant). null : TVA « plusieurs taux » absente ou trop grande, la saisie est refusée. */
export function natureEtTva(d: { corpsEtat: string; montant: number; nature: NatureDepense; tauxTva?: TauxDepense; tva?: number }):
  { nature: NatureDepense; taux: TauxDepense | null; tva: number | null } | null {
  const nature: NatureDepense = d.corpsEtat === CORPS_MATERIEL ? "mat" : d.nature;
  const taux = d.tauxTva ?? null;
  if (taux === "multi") {
    if (d.tva == null || d.tva >= d.montant) return null;
    return { nature, taux, tva: d.tva };
  }
  return { nature, taux, tva: taux ? tvaDeTtc(d.montant, Number(taux)) : null };
}
