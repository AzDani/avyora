/**
 * L'Agent SEO (28/11/2026) : les règles PURES, en JavaScript pour être lues À LA FOIS par le site (page /admin/marketing,
 * salle Marketing des bureaux 3D) et par le script du Mac (scripts/seo.mjs, lancé par la tâche planifiée « seo-matin »).
 * Une seule copie : rien à garder synchronisé. Rien ici ne lit la base ni le réseau.
 *
 * Aucun chiffre « du marché » : les seuils comparent le site À LUI-MÊME (le taux de clic d'une requête face à celui des
 * autres requêtes du site à la même place dans Google), jamais à une courbe de taux de clic inventée.
 */

/** Combien de jours compte une période (Search Console : les 28 derniers jours complets, comme son tableau de bord). */
export const PERIODE_JOURS = 28;
/** Page 2 de Google : à cette place, un petit effort fait gagner beaucoup (le haut de la page 2 et le bas de la page 1). */
export const PAGE2 = { min: 8, max: 20, impressionsMin: 30 };
/** Taux de clic faible : moins de la moitié de celui du site à la même place, sur assez d'impressions pour en juger. */
export const CTR_FAIBLE = { impressionsMin: 100, ratio: 0.5, echantillonMin: 20 };
/** Deux pages du site sur la même requête (cannibalisation) : chacune au moins ce nombre d'impressions. */
export const CANNIBALE_IMPRESSIONS = 10;
/** Une page qui recule : au moins 5 places perdues, sur assez d'impressions. */
export const RECUL = { places: 5, impressionsMin: 30 };
/** Un titre qui dépasse cette longueur est coupé dans Google. */
export const TITRE_MAX = 60;

/** La tranche de position (1-3, 4-7, 8-10, 11-20, 21+), pour comparer une requête aux autres requêtes du site à la même place. */
export function tranche(position) {
  return position <= 3 ? "1-3" : position <= 7 ? "4-7" : position <= 10 ? "8-10" : position <= 20 ? "11-20" : "21+";
}

const mediane = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Les totaux d'une liste de jours [{ date, clics, impressions, ctr, position }] : clics et impressions additionnés, taux de clic
 * recalculé, position moyenne PONDÉRÉE par les impressions (celle de Search Console).
 */
export function totaux(jours) {
  let clics = 0, impressions = 0, posPond = 0;
  for (const j of jours) { clics += j.clics || 0; impressions += j.impressions || 0; posPond += (j.position || 0) * (j.impressions || 0); }
  return { clics, impressions, ctr: impressions ? clics / impressions : 0, position: impressions ? posPond / impressions : 0 };
}

/** Les 28 derniers jours et les 28 d'avant, à partir des jours triés (les plus récents à la fin). */
export function periodes(jours, n = PERIODE_JOURS) {
  const tries = [...jours].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { actuelle: totaux(tries.slice(-n)), precedente: totaux(tries.slice(-2 * n, -n)) };
}

/**
 * Les points d'amélioration, triés par ce qu'ils peuvent rapporter. `lignes` : [{ requete, page, clics, impressions, ctr, position }]
 * des 28 derniers jours ; `avant` (facultatif) : les mêmes lignes sur les 28 jours d'avant, pour repérer les reculs.
 */
export function opportunites(lignes, avant = []) {
  const page2 = lignes
    .filter((l) => l.position >= PAGE2.min && l.position <= PAGE2.max && l.impressions >= PAGE2.impressionsMin)
    .sort((a, b) => b.impressions - a.impressions);

  const parTranche = new Map();
  for (const l of lignes) if (l.impressions >= CTR_FAIBLE.echantillonMin) {
    const t = tranche(l.position); if (!parTranche.has(t)) parTranche.set(t, []); parTranche.get(t).push(l.ctr);
  }
  const reference = new Map([...parTranche].map(([t, xs]) => [t, mediane(xs)]));
  const ctrFaible = lignes
    .filter((l) => l.impressions >= CTR_FAIBLE.impressionsMin && (parTranche.get(tranche(l.position))?.length ?? 0) >= 3)
    .map((l) => ({ ...l, ctrReference: reference.get(tranche(l.position)) }))
    .filter((l) => l.ctrReference > 0 && l.ctr < l.ctrReference * CTR_FAIBLE.ratio)
    .sort((a, b) => b.impressions - a.impressions);

  const parRequete = new Map();
  for (const l of lignes) if (l.impressions >= CANNIBALE_IMPRESSIONS) {
    if (!parRequete.has(l.requete)) parRequete.set(l.requete, []); parRequete.get(l.requete).push(l);
  }
  const cannibales = [...parRequete]
    .filter(([, ls]) => new Set(ls.map((l) => l.page)).size >= 2)
    .map(([requete, ls]) => ({ requete, impressions: ls.reduce((s, l) => s + l.impressions, 0), pages: ls.sort((a, b) => b.impressions - a.impressions).map((l) => ({ page: l.page, impressions: l.impressions, position: l.position })) }))
    .sort((a, b) => b.impressions - a.impressions);

  const posAvant = new Map(avant.map((l) => [l.requete + "\u0000" + l.page, l.position]));
  const reculs = lignes
    .filter((l) => l.impressions >= RECUL.impressionsMin && posAvant.has(l.requete + "\u0000" + l.page))
    .map((l) => ({ ...l, positionAvant: posAvant.get(l.requete + "\u0000" + l.page) }))
    .filter((l) => l.position - l.positionAvant >= RECUL.places)
    .sort((a, b) => b.impressions - a.impressions);

  return { page2, ctrFaible, cannibales, reculs };
}

/* ── La santé technique d'une page (fouille du sitemap) ── */

const attribut = (balise, nom) => {
  const m = new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(balise);
  return m ? (m[2] ?? m[3] ?? "") : null;
};
const decoder = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/**
 * Les problèmes d'une page déclarée dans le sitemap. `r` : { url, statut, enTetes: { "x-robots-tag"?, location? }, html }.
 * Rend une liste de { code, detail } (vide : la page va bien). Codes : erreur, redirection, noindex, canonique, titre-absent,
 * titre-long, description-absente.
 */
export function problemesPage(r) {
  const p = [];
  if (r.statut >= 400 || !r.statut) return [{ code: "erreur", detail: `réponse ${r.statut || "aucune"}` }];
  if (r.statut >= 300) return [{ code: "redirection", detail: `${r.statut} vers ${r.enTetes?.location ?? "?"} : une page du sitemap ne doit pas rediriger` }];
  const html = r.html || "";
  const robotsMeta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((b) => /name\s*=\s*["']robots["']/i.test(b));
  if (/noindex/i.test(r.enTetes?.["x-robots-tag"] ?? "") || (robotsMeta && /noindex/i.test(attribut(robotsMeta, "content") ?? ""))) {
    p.push({ code: "noindex", detail: "la page est dans le sitemap mais demande à ne pas être indexée" });
  }
  const lien = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((b) => /rel\s*=\s*["']canonical["']/i.test(b));
  const canon = lien ? attribut(lien, "href") : null;
  if (canon) {
    const norm = (u) => { try { const x = new URL(decoder(u), r.url); return (x.origin + x.pathname).replace(/\/$/, ""); } catch { return u; } };
    if (norm(canon) !== norm(r.url)) p.push({ code: "canonique", detail: `se déclare copie de ${canon}` });
  }
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const titre = t ? decoder(t[1]).trim() : "";
  if (!titre) p.push({ code: "titre-absent", detail: "pas de balise title" });
  else if ([...titre].length > TITRE_MAX) p.push({ code: "titre-long", detail: `${[...titre].length} caractères (coupé au-delà de ${TITRE_MAX}) : « ${titre} »` });
  const desc = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((b) => /name\s*=\s*["']description["']/i.test(b));
  if (!desc || !(attribut(desc, "content") ?? "").trim()) p.push({ code: "description-absente", detail: "pas de meta description" });
  return p;
}

/** Les adresses d'un sitemap XML. */
export function urlsDuSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decoder(m[1]));
}

/** Les problèmes GRAVES (une page qui sort de Google) passent avant les finitions (titre trop long…). */
export const GRAVES = ["erreur", "redirection", "noindex", "canonique"];

/** Le bilan d'une fouille : { verifiees, graves, finitions, parCode, pages: [{ url, problemes }] (seulement celles qui en ont) }. */
export function bilanSante(resultats) {
  const pages = resultats.map((r) => ({ url: r.url, problemes: problemesPage(r) })).filter((x) => x.problemes.length);
  const parCode = {};
  for (const x of pages) for (const p of x.problemes) parCode[p.code] = (parCode[p.code] ?? 0) + 1;
  const graves = pages.filter((x) => x.problemes.some((p) => GRAVES.includes(p.code))).length;
  return { verifiees: resultats.length, graves, finitions: pages.length - graves, parCode, pages };
}
