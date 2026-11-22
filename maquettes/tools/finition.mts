/**
 * La finition du compteur du plan = celle de l'estimateur.
 *
 * Décision de Dani (QCM du 26/09/2026) : le compteur applique la finition choisie dans « Le chantier »
 * (Éco / Standard / Premium), avec les MÊMES coefficients que l'estimateur. Depuis le barème « marqué » du
 * 22/11/2026, l'estimateur règle DEUX parts d'un poste : ligne = fourniture × coefficient de fourniture
 * + main-d'œuvre × coefficient de pose (core.ts, lineHT ; finCoefTask et finCoefMO, par baremeDe). Le
 * standard est le point fixe ; les équipements à options (douche, WC, menuiseries) suivent aussi.
 *
 * La maquette est un fichier autonome : elle ne peut pas importer core.ts. Elle porte donc une table
 * FINITION_PRIX — pour chaque prix recopié du catalogue (la correspondance de coherence.mjs) : sa part
 * de fourniture et ses cinq coefficients. Ce contrôle la recalcule depuis le moteur et exige qu'elle
 * soit identique ; `--ecrire` la régénère dans la maquette.
 *
 *   npx tsx maquettes/tools/finition.mts "$PWD/maquettes"            (contrôle)
 *   npx tsx maquettes/tools/finition.mts "$PWD/maquettes" --ecrire   (régénère la table)
 *
 * Valeur d'une entrée : [fourniture €, fourniture Éco, fourniture Standard, fourniture Premium,
 * pose Éco, pose Premium] — la pose du Standard vaut toujours 1 (vérifié ici).
 */
import fs from "node:fs";
import path from "node:path";
import { DEBUT_TABLE, ecartsFinition, tableAttendue, tableMaquette } from "./finition-table";

const SP = process.argv[2];
if (!SP) { console.error("usage : npx tsx maquettes/tools/finition.mts <dossier maquettes> [--ecrire]"); process.exit(2); }
const ECRIRE = process.argv.includes("--ecrire");
const FICHIER = SP + "/plan-editor.html";
const attendu = tableAttendue(path.resolve(SP, ".."), SP);

const html = fs.readFileSync(FICHIER, "utf8");
const actuel = tableMaquette(html);
if (!actuel) { console.error("✗ table FINITION_PRIX introuvable dans la maquette"); process.exit(1); }
if (ECRIRE) {
  const j0 = html.indexOf(DEBUT_TABLE), j1 = html.indexOf(";", j0);
  fs.writeFileSync(FICHIER, html.slice(0, j0) + `${DEBUT_TABLE}${JSON.stringify(attendu)};` + html.slice(j1 + 1));
  console.log(`✓ FINITION_PRIX réécrite : ${Object.keys(attendu).length} prix suivent la finition`);
  process.exit(0);
}
const ecarts = ecartsFinition(attendu, actuel);
for (const e of ecarts) console.log(`  ✗ ${e}`);
console.log(`  ${Object.keys(attendu).length} prix suivent la finition (fourniture × coefficient + pose × coefficient, comme lineHT)`);
console.log(ecarts.length ? `\n✗ ${ecarts.length} écart(s) — régénère avec --ecrire` : "\n✓ le compteur applique la finition comme l'estimateur");
process.exit(ecarts.length ? 1 : 0);
