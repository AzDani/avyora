/**
 * Les CHIFFRES du bilan d'une estimation rapide de construction neuve (fourchette, repères, aléas, répartition par
 * phase, surcoût argile), calculés par le moteur. `BilanRapideNeuf` ne fait que les afficher : il ne voit ni le
 * moteur ni le barème (27/11/2026), qu'il soit rendu par la fiche projet (serveur) ou par l'estimation rapide
 * publique (chiffres reçus de `POST /api/estimateur/rapide`).
 *
 * La répartition par phase n'est calculée que pour un compte qui a les droits (`reel`) : sinon `phases` est nul, ni
 * le nom ni le montant d'une phase ne quittent le serveur (D9).
 */
import { buildDevis, type Ctx, type Selection } from "./core";
import { catalogueDe, PHASES_NEUF } from "./catalogue-neuf";
import { geometrieNeuf, maisonComplete, piecesNeuf } from "./neuf";
import { decoupe, parPhase, surcoutArgile, EXTERIEURS_HORS_PERIMETRE } from "./etapes-neuf";
import { catT } from "./catalog-i18n";
import type { QuiRealise } from "./presets";
import type { Locale } from "../i18n/config";

export type ChiffresBilanNeuf = {
  lo: number; hi: number; ttc: number;
  /** Surface chiffrée (m²) : le €/m² se calcule à l'affichage. */
  surface: number;
  constr: number; annexes: number; aleas: number;
  /** Provision pour aléas du contexte (%). */
  aleasPct: number;
  chambres: number; mois: number;
  /** Répartition par phase, libellés dans la langue demandée ; nulle sans les droits. */
  phases: { lbl: string; v: number }[] | null;
  argile: number;
  ext: { min: number; max: number; terrainMin: number; terrainMax: number };
};

export function chiffresBilanNeuf(ctx: Ctx, sel: Selection, qui: QuiRealise | undefined, reel: boolean, locale: Locale): ChiffresBilanNeuf {
  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const ttc = dv.totaux.ttc;
  const maison = maisonComplete(ctx.neuf);
  const cut = decoupe(dv);
  const ph = reel ? parPhase(dv) : null;
  const ext = EXTERIEURS_HORS_PERIMETRE;
  return {
    lo: Math.round((ttc * 0.85) / 100) * 100,
    hi: Math.round((ttc * 1.15) / 100) * 100,
    ttc,
    surface: ctx.surface || 0,
    constr: cut.constr, annexes: cut.annexes, aleas: cut.aleas,
    aleasPct: ctx.aleas,
    chambres: piecesNeuf(maison).chambres,   // suites parentales comprises
    mois: geometrieNeuf(maison).moisChantier,
    phases: ph ? PHASES_NEUF.map((p) => ({ lbl: catT(locale, "phases", p), v: ph[p] ?? 0 })) : null,
    // Avertissement « sans étude de sol » : la même maison sur un sol argileux, chiffrée par le moteur.
    argile: surcoutArgile(maison, { finition: ctx.finition, qui, codePostal: ctx.codePostal, aleas: ctx.aleas }),
    ext: { min: ext.min, max: ext.max, terrainMin: ext.terrainMin, terrainMax: ext.terrainMax },
  };
}
