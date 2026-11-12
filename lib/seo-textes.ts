/**
 * Phrases des pages de prix par ville (/prix-renovation/[ville] et la matrice
 * /prix-travaux/[projet]/[ville]) — SOURCE UNIQUE, pure et testée (tests/seo-contenu.test.ts).
 *
 * POURQUOI ICI. Les deux gabarits rédigeaient chacun leurs phrases et ont divergé :
 * - la matrice affirmait « la main-d'œuvre y est environ 10 % plus chère que la moyenne nationale »,
 *   la page ville « le tarif horaire des artisans y est supérieur à la moyenne française », alors
 *   que ce coefficient est un indice INTERNE AVYORA sans source publique (cf. /methodologie) ;
 * - toutes deux disaient « les fournitures sont à un prix national » en outre-mer et en Corse, où le
 *   moteur majore pourtant les matériaux (regionCoef : mat 1,15 et 1,05) ;
 * - les libellés de zone contiennent déjà « Zone » (« Zone tendue ») et étaient collés derrière
 *   « zone « … » » ; la région d'un DOM répétait son département (« en Guyane (Outre-mer)
 *   (département Guyane, 973) »).
 * Ces phrases décrivent ce que l'outil APPLIQUE, jamais un fait de marché.
 */
import type { RegionCoef } from "./estimateur/core";
import type { DeptInfo } from "./geo";

const pct = (coef: number) => Math.round((coef - 1) * 100);
/** « +10 % », « −10 % » (vrai signe moins), espace insécable avant « % ». */
const signe = (p: number) => `${p > 0 ? "+" : "−"}${Math.abs(p)} %`;

const estOutreMer = (reg: RegionCoef) => /outre-mer/i.test(reg.zone);

/** Ce que le barème AVYORA applique : « AVYORA applique un coefficient de +10 % sur la main-d'œuvre ». */
export function phraseCoef(reg: RegionCoef): string {
  const mo = pct(reg.mo), mat = pct(reg.mat);
  const fournitures = mat !== 0 ? ` et de ${signe(mat)} sur les fournitures` : "";
  if (mo === 0 && mat === 0) return "AVYORA n'applique aucun ajustement régional";
  if (mo === 0) return `AVYORA applique un coefficient de ${signe(mat)} sur les fournitures`;
  return `AVYORA applique un coefficient de ${signe(mo)} sur la main-d'œuvre${fournitures}`;
}

/** Version courte, après une phrase qui nomme déjà AVYORA : « +10 % sur la main-d'œuvre ». */
export function coefCourt(reg: RegionCoef): string {
  const mo = pct(reg.mo), mat = pct(reg.mat);
  const parts = [
    ...(mo !== 0 ? [`${signe(mo)} sur la main-d'œuvre`] : []),
    ...(mat !== 0 ? [`${signe(mat)} sur les fournitures`] : []),
  ];
  return parts.length ? parts.join(" et ") : "aucun ajustement";
}

/** Pourquoi les fournitures coûtent plus cher là où le moteur les majore. */
export function raisonFournitures(reg: RegionCoef): string {
  return estOutreMer(reg) ? "acheminement, octroi de mer" : "acheminement sur l'île";
}

/** Les fournitures : prix national, sauf là où le moteur les majore (outre-mer, Corse). */
export function phraseFournitures(reg: RegionCoef): string {
  const mat = pct(reg.mat);
  if (mat === 0) return "Les fournitures sont à un prix national ; c'est la main-d'œuvre qui varie.";
  return `Les fournitures y coûtent environ ${Math.abs(mat)} % ${mat > 0 ? "de plus" : "de moins"} qu'en métropole continentale (${raisonFournitures(reg)}), et la main-d'œuvre varie aussi.`;
}

/** Département d'outre-mer : sa « région » est son propre nom suivi de « (Outre-mer) ». */
const estDom = (dep: DeptInfo) => dep.region.startsWith(`${dep.nom} (`);
/** Région sans répétition du département : « Guyane » et non « Guyane (Outre-mer) ». */
const regionNette = (dep: DeptInfo) => (estDom(dep) ? dep.nom : dep.region);

/** « en Bretagne », « dans le Grand Est », « à La Réunion ». */
export function dansRegion(region: string): string {
  if (region === "Grand Est") return "dans le Grand Est";
  if (region === "Hauts-de-France" || region === "Pays de la Loire") return `dans les ${region}`;
  if (region.startsWith("La ") || region === "Mayotte") return `à ${region}`;
  return `en ${region}`;
}

/**
 * Où se situe la ville, en tête de phrase : « Lyon (69 · Rhône), en Auvergne-Rhône-Alpes »,
 * « Cayenne (973 · Guyane) », « Ajaccio (20 · Corse) » — la région n'est citée que si elle dit autre
 * chose que le département.
 */
export function lieuVille(nom: string, dep: DeptInfo): string {
  if (!dep.nom) return nom;
  // « Saint-Denis de La Réunion (974) » et non « … (974 · La Réunion) » : le nom porte déjà le département.
  const base = nom.includes(dep.nom) ? `${nom} (${dep.num})` : `${nom} (${dep.num} · ${dep.nom})`;
  const region = regionNette(dep);
  return region && region !== dep.nom ? `${base}, ${dansRegion(region)}` : base;
}

/** Région entre parenthèses pour une meta description : « (Guyane) », « (Île-de-France) ». */
export function regionParenthese(dep: DeptInfo): string {
  const r = regionNette(dep);
  return r ? ` (${r})` : "";
}

/**
 * La phrase « situation » d'une page ville, sans répétition : « Lyon se situe en
 * Auvergne-Rhône-Alpes (Rhône, 69). », « Cayenne se situe en Guyane, département
 * d'outre-mer (973). », « Ajaccio se situe en Corse. »
 */
export function situationVille(nom: string, dep: DeptInfo): string {
  if (!dep.nom) return "";
  if (estDom(dep)) return `${nom} se situe ${dansRegion(dep.nom)}, département d'outre-mer (${dep.num}).`;
  if (dep.region === dep.nom) return `${nom} se situe ${dansRegion(dep.nom)}.`;
  return `${nom} se situe ${dansRegion(dep.region)} (${dep.nom}, ${dep.num}).`;
}
