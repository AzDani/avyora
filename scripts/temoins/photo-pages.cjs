/* Témoin T2 des pages publiques : texte visible de <main> (et du pied de page) par page, plus une
   capture pleine page. Copie versionnée de l'outil de session (chantier N0 de la revue rénovation /
   neuf) ; seuls changent la résolution de puppeteer-core (celui du dépôt) et l'adresse, obligatoire.

   Usage, sur un build de production servi sur un port libre :
     npm run build && npx next start -p 3021
     node scripts/temoins/photo-pages.cjs <dossier de sortie> http://localhost:3021
   Photo AVANT (sur le commit de départ), photo APRÈS, puis :
     node scripts/temoins/compare-pages.cjs <avant>/pages.json <après>/pages.json
   Un écart n'est admis que s'il est listé par le chantier. Chrome : variable CHROME pour un autre chemin. */
const fs = require("fs"), path = require("path");
const puppeteer = require("puppeteer-core");
const OUT = process.argv[2], BASE = process.argv[3];
if (!OUT || !BASE) { console.log("usage : node scripts/temoins/photo-pages.cjs <dossier de sortie> <http://localhost:PORT>"); process.exit(2); }
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES = ["/estimation-construction-maison", "/projets/nouveau?nature=neuf", "/", "/projets/nouveau", "/tarifs", "/estimation-travaux", "/estimation-travaux?type=maison&surface=100&cp=45000",
  "/prix-travaux/renovation-salle-de-bain", "/prix-renovation", "/guides/prix-renovation-maison", "/methodologie", "/connexion", "/inscription"];
setTimeout(() => { console.log("délai dépassé"); process.exit(2); }, 240000);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000 });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const res = {};
  for (const u of PAGES) {
    await p.goto(BASE + u, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 1500));
    res[u] = await p.evaluate(() => ({ titre: document.title, main: (document.querySelector("main") || document.body).innerText, pied: (document.querySelector("footer") || {}).innerText || "" }));
    await p.screenshot({ path: path.join(OUT, u.replace(/[^a-z0-9]+/gi, "_") + ".png"), fullPage: true });
  }
  fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify(res, null, 1));
  console.log(Object.keys(res).length, "pages →", OUT);
  await b.close(); process.exit(0);
})();
