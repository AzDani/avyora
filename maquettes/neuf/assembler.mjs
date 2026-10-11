/**
 * Maquette « Construction neuve » : assemble une page autonome avec le VRAI moteur.
 *
 *   node maquettes/neuf/assembler.mjs <dossier de sortie>
 *
 * Le moteur (`lib/estimateur/index.ts`) est compilé pour le navigateur par rolldown, puis inséré
 * tel quel dans `page.html` avec `app.js` (l'interface) et `sources.json` (les relevés de prix).
 * Aucune logique de calcul n'est recopiée dans la page : tout chiffre affiché vient du moteur.
 * Sortie : <dossier>/construction-neuve.html et <dossier>/moteur.js (utilisé par controle.cjs).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(ICI, "../..");
const sortie = process.argv[2];
if (!sortie) { console.error("usage : node maquettes/neuf/assembler.mjs <dossier de sortie>"); process.exit(2); }
fs.mkdirSync(sortie, { recursive: true });
const moteurJs = path.join(path.resolve(sortie), "moteur.js");
execFileSync("npx", ["rolldown", "./lib/estimateur/index.ts", "-f", "iife", "-n", "AVYORA", "-p", "browser", "-m", "-o", moteurJs], { cwd: APP, stdio: "inherit" });
const moteur = fs.readFileSync(moteurJs, "utf8");
const app = fs.readFileSync(path.join(ICI, "app.js"), "utf8");
for (const [n, s] of [["moteur", moteur], ["app", app]]) if (/<\/script/i.test(s)) throw new Error("</script dans " + n);
const json = JSON.stringify(JSON.parse(fs.readFileSync(path.join(ICI, "sources.json"), "utf8"))).replace(/</g, "\\u003c");
const page = fs.readFileSync(path.join(ICI, "page.html"), "utf8")
  .replace("/*@MOTEUR@*/", () => moteur).replace("/*@SOURCES@*/", () => json).replace("/*@APP@*/", () => app);
const out = path.join(sortie, "construction-neuve.html");
fs.writeFileSync(out, page);
console.log(out, fs.statSync(out).size, "octets");
