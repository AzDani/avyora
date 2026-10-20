/**
 * Construit lib/marche/loyers-2025.json à partir de la « Carte des loyers » 2025 (ANIL, data.gouv.fr) :
 * loyers d'annonce en €/m², CHARGES COMPRISES, logements NON MEUBLÉS, par commune (code INSEE, arrondissements
 * pour Paris-Lyon-Marseille). Source à citer : « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin ».
 * Usage : node scripts/marche/construire-loyers.mjs (à relancer chaque année quand le nouveau millésime sort, en décembre).
 *
 * Format compact (les communes d'une même maille partagent leurs valeurs) : { millesime, z, c } avec z = liste des
 * triplets [loyer, bas, haut] en €/m² à 0,1 près, et c[insee] = [indice appartement 1-2 pièces, indice appartement
 * 3 pièces et plus, indice maison, fiabilité] ; fiabilité = masque de bits (1, 2, 4 dans le même ordre), bit à 1 si
 * R² ≥ 0,5 et au moins 30 annonces dans la commune (seuils du guide d'utilisation de l'ANIL).
 */
import { writeFileSync } from "node:fs";

const BASE = "https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/";
const SERIES = [
  ["ap12", "20251211-144934/pred-app12-mef-dhup.csv"],
  ["ap3", "20251211-144951/pred-app3-mef-dhup.csv"],
  ["mai", "20251211-145039/pred-mai-mef-dhup.csv"],
];

const num = (s) => Number(String(s).replace(/"/g, "").replace(",", "."));
const r1 = (x) => Math.round(x * 10) / 10;
const zones = [], indexZone = new Map(), out = {};
const zone = (t) => { const k = t.join("|"); if (!indexZone.has(k)) { indexZone.set(k, zones.length); zones.push(t); } return indexZone.get(k); };
for (const [i, [cle, chemin]] of SERIES.entries()) {
  const r = await fetch(BASE + chemin);
  if (!r.ok) throw new Error(`${cle} : HTTP ${r.status}`);
  const texte = new TextDecoder("latin1").decode(await r.arrayBuffer());
  const lignes = texte.split(/\r?\n/).filter(Boolean);
  const tete = lignes[0].split(";").map((x) => x.replace(/"/g, ""));
  const col = (n) => { const k = tete.indexOf(n); if (k < 0) throw new Error(`${cle} : colonne ${n} absente`); return k; };
  const [cI, cL, cB, cH, cN, cR] = ["INSEE_C", "loypredm2", "lwr.IPm2", "upr.IPm2", "nbobs_com", "R2_adj"].map(col);
  let n = 0;
  for (const l of lignes.slice(1)) {
    const f = l.split(";");
    const insee = f[cI].replace(/"/g, "");
    const loyer = num(f[cL]);
    if (!/^[0-9AB]{5}$/.test(insee) || !(loyer > 0)) continue;
    const fiable = num(f[cR]) >= 0.5 && num(f[cN]) >= 30 ? 1 : 0;
    const rec = (out[insee] ??= [-1, -1, -1, 0]);
    rec[i] = zone([r1(loyer), r1(num(f[cB])), r1(num(f[cH]))]);
    rec[3] |= fiable << i;
    n++;
  }
  console.log(cle, n, "communes");
}
writeFileSync(new URL("../../lib/marche/loyers-2025.json", import.meta.url), JSON.stringify({ millesime: "2025", z: zones, c: out }));
console.log("total", Object.keys(out).length, "communes,", zones.length, "zones");
