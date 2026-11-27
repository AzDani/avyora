#!/usr/bin/env node
/**
 * Contrôle : le barème de prix n'est PAS dans le JavaScript public (27/11/2026, option A validée par Dani).
 *
 *   node scripts/controle-bareme.mjs                  → fouille `.next/static` (après `next build`)
 *   node scripts/controle-bareme.mjs --url https://getavyora.fr
 *                                                     → télécharge le JavaScript des pages publiques du site et le fouille
 *
 * Échec (code 1) si un fichier contient :
 *   A. une ligne de barème : un prix fourni-posé suivi de son prix fourniture (`fp: 400, sm: null`), la forme exacte
 *      du catalogue, quel que soit l'outil qui l'a mise en paquet (JSON, objet minifié, chaîne) ;
 *   B. un poste du catalogue (son identifiant) accompagné de SON prix à moins de 400 caractères ;
 *   C. (pages publiques, mode --url) un seul identifiant de poste : une page qu'un visiteur sans compte ouvre ne charge
 *      ni le catalogue ni le moteur.
 * Le rapport compte aussi, pour information, les identifiants et libellés de postes présents dans les fichiers servis
 * aux comptes (le code du moteur, qui calcule dans le navigateur, nomme certains postes : sans prix).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lire = (f) => JSON.parse(fs.readFileSync(path.join(RACINE, f), "utf8"));
const reno = lire("lib/estimateur/catalog.json");
const neuf = lire("lib/estimateur/catalog-neuf.json");

/** Les postes du barème : identifiant, libellé, prix. */
const POSTES = [];
for (const l of [...reno, ...neuf]) for (const t of l.t) if (t.id && typeof t.fp === "number") POSTES.push({ id: t.id, n: t.n, fp: t.fp });
const IDS = [...new Set(POSTES.map((p) => p.id))];
const NOMS = [...new Set(POSTES.map((p) => p.n).filter((n) => n.length > 6))];

const LIGNE = /["'\\]*fp["'\\]*\s*:\s*-?\d[\d.]*\s*,\s*["'\\]*sm["'\\]*\s*:/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Les fautes d'un fichier (A, B, et C si `strict`) et ce qu'il nomme. */
export function fouiller(texte, { strict = false } = {}) {
  const fautes = [];
  const m = LIGNE.exec(texte);
  if (m) fautes.push(`A ligne de barème : « ${texte.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, " ")} »`);
  const ids = IDS.filter((id) => texte.includes(id));
  for (const p of POSTES) {
    let i = texte.indexOf(p.id);
    while (i >= 0) {
      const fenetre = texte.slice(i, i + 400);
      if (new RegExp(`fp["'\\\\]*\\s*:\\s*${esc(String(p.fp))}(?![\\d.])`).test(fenetre)) { fautes.push(`B ${p.id} avec son prix (${p.fp})`); break; }
      i = texte.indexOf(p.id, i + 1);
    }
  }
  if (strict && ids.length) fautes.push(`C ${ids.length} identifiant(s) de poste : ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? "…" : ""}`);
  return { fautes, ids, noms: NOMS.filter((n) => texte.includes(n)) };
}

function fichiersJs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? fichiersJs(p) : /\.(m?js|json|txt|html)$/.test(e.name) ? [p] : [];
  });
}

/** Pages ouvertes sans compte (et celles qui y mènent) : leur JavaScript ne doit nommer aucun poste. */
const PAGES_PUBLIQUES = [
  "/", "/estimation-travaux", "/estimation-construction-maison", "/projets/nouveau", "/projets/nouveau?nature=reno",
  "/inscription", "/connexion", "/tarifs", "/prix-travaux", "/prix-renovation", "/prix-poste", "/methodologie",
];

async function enLigne(base) {
  const vus = new Map();
  const pages = [];
  for (const chemin of PAGES_PUBLIQUES) {
    const r = await fetch(new URL(chemin, base), { redirect: "follow", headers: { "user-agent": "controle-bareme" } });
    const html = await r.text();
    const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)]+?\.js/g)].map((x) => x[0]))];
    pages.push({ chemin, statut: r.status, scripts });
    for (const s of scripts) if (!vus.has(s)) vus.set(s, null);
    // Le HTML lui-même (rendu serveur et données de la page) : pas de ligne de barème non plus.
    const f = fouiller(html);
    if (f.fautes.length) vus.set(`${chemin} (HTML)`, f);
  }
  for (const s of vus.keys()) {
    if (vus.get(s)) continue;
    const r = await fetch(new URL(s, base));
    vus.set(s, fouiller(await r.text(), { strict: true }));
  }
  return { pages, resultats: vus };
}

async function principal() {
  const iu = process.argv.indexOf("--url");
  let resultats;
  if (iu > 0) {
    const base = process.argv[iu + 1];
    const { pages, resultats: r } = await enLigne(base);
    for (const p of pages) console.log(`page ${p.chemin} → ${p.statut}, ${p.scripts.length} fichier(s) JavaScript`);
    resultats = r;
  } else {
    const dir = path.join(RACINE, ".next", "static");
    const fichiers = fichiersJs(dir);
    if (!fichiers.length) { console.error("Aucun fichier dans .next/static : lancer `next build` d'abord."); process.exit(2); }
    resultats = new Map(fichiers.map((f) => [path.relative(RACINE, f), fouiller(fs.readFileSync(f, "utf8"))]));
  }
  const fautes = [...resultats].filter(([, r]) => r.fautes.length);
  const ids = new Set([...resultats.values()].flatMap((r) => r.ids));
  const noms = new Set([...resultats.values()].flatMap((r) => r.noms));
  console.log(`${resultats.size} fichier(s) fouillé(s). Barème : ${POSTES.length} postes, ${IDS.length} identifiants.`);
  console.log(`Pour information : ${ids.size} identifiant(s) et ${noms.size} libellé(s) de postes nommés par du code (sans prix).`);
  for (const [f, r] of resultats) if (r.ids.length || r.noms.length) console.log(`  · ${f} : ${r.ids.length} id, ${r.noms.length} libellé(s)`);
  if (fautes.length) {
    console.error(`\n✗ BARÈME TROUVÉ dans ${fautes.length} fichier(s) :`);
    for (const [f, r] of fautes) for (const x of r.fautes.slice(0, 5)) console.error(`  ${f} : ${x}`);
    process.exit(1);
  }
  console.log("\n✓ Aucun prix du barème dans le JavaScript public.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
