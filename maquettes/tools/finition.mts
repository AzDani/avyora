/**
 * La finition du compteur du plan = celle de l'estimateur.
 *
 * Décision de Dani (QCM du 26/09/2026) : le compteur applique la finition choisie dans « Le chantier »
 * (Éco / Standard / Premium), avec les MÊMES coefficients que l'estimateur. L'estimateur ne touche qu'aux
 * matériaux : ligne = part matériaux × coefficient + main-d'œuvre (core.ts, lineHT), et le coefficient
 * d'une tâche vient de finCoefTask (lot, exceptions par tâche, 1 pour un prix fixe ou piloté par variante).
 *
 * La maquette est un fichier autonome : elle ne peut pas importer core.ts. Elle porte donc une table
 * FINITION_PRIX — pour chaque prix recopié du catalogue (la correspondance de coherence.mjs) : sa part
 * matériaux et ses coefficients Éco / Standard. Ce contrôle la recalcule depuis le moteur et exige
 * qu'elle soit identique ; `--ecrire` la régénère dans la maquette.
 *
 *   npx tsx maquettes/tools/finition.mts "$PWD/maquettes"            (contrôle)
 *   npx tsx maquettes/tools/finition.mts "$PWD/maquettes" --ecrire   (régénère la table)
 */
import fs from "node:fs";
import { finCoefTask, defaultCtx, type Lot, type Tache } from "../../lib/estimateur/core";

const SP = process.argv[2];
if (!SP) { console.error("usage : npx tsx maquettes/tools/finition.mts <dossier maquettes> [--ecrire]"); process.exit(2); }
const ECRIRE = process.argv.includes("--ecrire");
const FICHIER = SP + "/plan-editor.html";
const lots = JSON.parse(fs.readFileSync("lib/estimateur/catalog.json", "utf8")) as Lot[];
const postes = new Map<string, { t: Tache; l: Lot }>();
for (const l of lots) for (const t of l.t) postes.set(t.n, { t, l });

/* La correspondance prix ↔ poste vit dans coherence.mjs : on la relit, on ne la recopie pas. */
const coh = fs.readFileSync(SP + "/tools/coherence.mjs", "utf8");
const i0 = coh.indexOf("const PRIX_MAP = ["), i1 = coh.indexOf("\n];", i0);
const PRIX_MAP = new Function(`return ${coh.slice(coh.indexOf("[", i0), i1 + 2)}`)() as [string, string, string, number?][];

const ctx = (finition: "eco" | "standard" | "premium") => ({ ...defaultCtx(), finition });
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const attendu: Record<string, [number, number, number]> = {};
for (const [tbl, cle, nom, coef] of PRIX_MAP) {
  const p = postes.get(nom);
  if (!p) continue;                                   /* coherence.mjs signale déjà un poste absent */
  const sm = p.t.sm;
  if (sm == null || sm <= 0) continue;                /* prestation pure : main-d'œuvre seule, aucune finition */
  const eco = finCoefTask(ctx("eco"), p.l, p.t), std = finCoefTask(ctx("standard"), p.l, p.t), pre = finCoefTask(ctx("premium"), p.l, p.t);
  if (pre !== 1) throw new Error(`« ${nom} » : la finition Premium n'est plus le prix de base (${pre})`);
  if (eco === 1 && std === 1) continue;               /* prix fixe, piloté par variante ou lot sans écart */
  attendu[`${tbl}.${cle}`] = [r4(sm * (coef ?? 1)), eco, std];
}

const html = fs.readFileSync(FICHIER, "utf8");
const debut = "const FINITION_PRIX=", j0 = html.indexOf(debut), j1 = html.indexOf(";", j0);
if (j0 < 0) { console.error("✗ table FINITION_PRIX introuvable dans la maquette"); process.exit(1); }
const ligne = `${debut}${JSON.stringify(attendu)};`;
if (ECRIRE) {
  fs.writeFileSync(FICHIER, html.slice(0, j0) + ligne + html.slice(j1 + 1));
  console.log(`✓ FINITION_PRIX réécrite : ${Object.keys(attendu).length} prix suivent la finition`);
  process.exit(0);
}
const actuel = JSON.parse(html.slice(j0 + debut.length, j1)) as Record<string, [number, number, number]>;
let ko = 0;
for (const k of new Set([...Object.keys(attendu), ...Object.keys(actuel)])) {
  const a = attendu[k], m = actuel[k];
  if (!a) { ko++; console.log(`  ✗ ${k} : dans la maquette, plus dans le moteur`); continue; }
  if (!m) { ko++; console.log(`  ✗ ${k} : manque dans la maquette (part matériaux ${a[0]} €, coefficients ${a[1]} / ${a[2]})`); continue; }
  if (a.some((x, i) => Math.abs(x - m[i]) > 1e-6)) { ko++; console.log(`  ✗ ${k} : maquette ${JSON.stringify(m)} · moteur ${JSON.stringify(a)}`); }
}
console.log(`  ${Object.keys(attendu).length} prix suivent la finition (part matériaux × coefficient du lot, comme lineHT)`);
console.log(ko ? `\n✗ ${ko} écart(s) — régénère avec --ecrire` : "\n✓ le compteur applique la finition comme l'estimateur");
process.exit(ko ? 1 : 0);
