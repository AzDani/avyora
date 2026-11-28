/**
 * L'Agent SEO (28/11/2026) : ce que le site affiche (page /admin/marketing, salle Marketing des bureaux 3D), tiré des
 * relevés que la tâche « seo-matin » du Mac range en base. Pur : rien ici ne lit la base (voir lib/data/seo.ts).
 */
import { opportunites, periodes, type BilanSante, type JourSeo, type LigneSeo, type Opportunites, type Totaux } from "./regles.mjs";

export type PointSeo = { titre: string; detail: string; gain: string; page?: string };
export type ReleveGsc = { propriete: string; jours: JourSeo[]; lignes: LigneSeo[]; avant: LigneSeo[] };
export type ReleveSante = BilanSante & { base?: string };

export type ResumeSeo = {
  gsc: null | {
    jour: string; propriete: string; actuelle: Totaux; precedente: Totaux;
    meilleures: LigneSeo[]; opportunites: Opportunites;
  };
  sante: null | (ReleveSante & { jour: string });
  rapport: null | { id: string; jour: string; resume: string; points: PointSeo[]; statut: "nouveau" | "lu" };
};

/** Une liste bornée (les écrans n'en montrent qu'une poignée). */
const haut = <T,>(xs: T[], n: number) => xs.slice(0, n);

export function resumerSeo(
  gsc: { jour: string; donnees: ReleveGsc } | null,
  sante: { jour: string; donnees: ReleveSante } | null,
  rapport: { id: string; jour: string; resume: string; points: unknown; statut: string } | null,
): ResumeSeo {
  let g: ResumeSeo["gsc"] = null;
  if (gsc && Array.isArray(gsc.donnees?.jours) && Array.isArray(gsc.donnees?.lignes)) {
    const { actuelle, precedente } = periodes(gsc.donnees.jours);
    const o = opportunites(gsc.donnees.lignes, Array.isArray(gsc.donnees.avant) ? gsc.donnees.avant : []);
    g = {
      jour: gsc.jour, propriete: String(gsc.donnees.propriete ?? ""), actuelle, precedente,
      meilleures: haut([...gsc.donnees.lignes].sort((a, b) => b.clics - a.clics || b.impressions - a.impressions), 10),
      opportunites: { page2: haut(o.page2, 10), ctrFaible: haut(o.ctrFaible, 10), cannibales: haut(o.cannibales, 5), reculs: haut(o.reculs, 10) },
    };
  }
  const s: ResumeSeo["sante"] = sante && typeof sante.donnees?.verifiees === "number" ? { jour: sante.jour, ...sante.donnees, pages: haut(sante.donnees.pages ?? [], 30) } : null;
  const points: PointSeo[] = rapport && Array.isArray(rapport.points)
    ? (rapport.points as PointSeo[]).filter((p) => p && typeof p.titre === "string").map((p) => ({ titre: p.titre, detail: String(p.detail ?? ""), gain: String(p.gain ?? ""), ...(p.page ? { page: String(p.page) } : {}) }))
    : [];
  return {
    gsc: g,
    sante: s,
    rapport: rapport ? { id: rapport.id, jour: rapport.jour, resume: rapport.resume, points, statut: rapport.statut === "lu" ? "lu" : "nouveau" } : null,
  };
}

/** L'agent est-il en service (au moins un relevé rangé) ? Son robot devient alors plein dans les bureaux. */
export const seoEnService = (r: ResumeSeo | null): boolean => !!r && (!!r.gsc || !!r.sante);

/** Position moyenne écrite comme Search Console (une décimale, virgule). */
export const position = (p: number) => (p > 0 ? p.toFixed(1).replace(".", ",") : "—");
