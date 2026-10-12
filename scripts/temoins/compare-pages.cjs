/* Témoin T2 : compare deux pages.json de photo-pages.cjs (titre, main, pied), page par page.
   node scripts/temoins/compare-pages.cjs <avant>/pages.json <après>/pages.json
   Chaque écart est montré avec 60 caractères avant et 120 après le premier caractère différent. */
const fs = require("fs");
if (process.argv.length < 4) { console.log("usage : node scripts/temoins/compare-pages.cjs <avant.json> <après.json>"); process.exit(2); }
const a = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), b = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
let n = 0;
for (const u of new Set([...Object.keys(a), ...Object.keys(b)])) {
  for (const k of ["titre", "main", "pied"]) {
    const x = a[u]?.[k], y = b[u]?.[k];
    if (x !== y) {
      n++;
      let i = 0; while (x && y && x[i] === y[i]) i++;
      console.log(`ÉCART ${u} · ${k} @${i}\n  avant: ${JSON.stringify((x ?? "").slice(Math.max(0, i - 60), i + 120))}\n  après: ${JSON.stringify((y ?? "").slice(Math.max(0, i - 60), i + 120))}`);
    }
  }
}
console.log(`${Object.keys(b).length} pages comparées · ${n} écart(s)`);
process.exit(n ? 1 : 0);
