/**
 * C9 · Les captures de l'éditeur pour le site (accueil, vitrine /logiciel-plan-maison, image de partage).
 *
 * De VRAIES captures : l'éditeur tel que le site le sert (`/plan`, interrupteur allumé), en GRATUIT (visiteur sans
 * compte : `AVYORA_PRO=false`, posé par l'amorçage du site), sans `?dev`, sur le plan type « Maison · 94 m² » chargé par
 * le chemin de l'éditeur (`loadTemplate('maison', 'final_plan')`, un Plan final). Rien n'est retouché : surfaces,
 * cotes et 3D sont calculées par l'éditeur. Seule la bulle d'information du chargement est attendue (ou repliée).
 *
 *   node maquettes/tools/captures-site.mjs "$(pwd)/maquettes" http://localhost:3014 public/plans
 *
 * Sorties (dans le dossier donné) :
 *   maison-2d.png / maison-3d.png          1040 × 650 (repli)
 *   maison-2d-{760,1040}.webp, maison-3d-…  760 × 475 et 1040 × 650
 *   og-plan.png                            1200 × 630, les deux captures et le titre (Open Graph de la vitrine)
 * Fenêtre 1 440 × 900 à 2× (panneau ouvert), réduite par sharp.
 *
 * Sans adresse ni dossier (dans la batterie `for f in maquettes/tools/*.mjs`), l'outil ne fait rien et sort en 0 : il
 * lui faut un site qui tourne (`NEXT_PUBLIC_FEATURE_PLANS=1 npm run build && npx next start -p 3014`).
 */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [, , SP, BASE, SORTIE] = process.argv;
if (!SP) { console.error("usage : node maquettes/tools/captures-site.mjs <dossier maquettes> [adresse du site] [dossier de sortie]"); process.exit(2); }
if (!BASE || !SORTIE) { console.log("captures-site : sans adresse du site ni dossier de sortie, rien à faire (hors batterie)."); process.exit(0); }
setTimeout(() => { console.log("captures-site : délai dépassé (180 s)"); process.exit(3); }, 180000);
fs.mkdirSync(SORTIE, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const erreurs = [];
try {
  const p = await b.newPage();
  p.on("pageerror", (e) => erreurs.push(String(e)));
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await p.goto(BASE.replace(/\/$/, "") + "/plan", { waitUntil: "networkidle0" });
  await p.waitForFunction(() => typeof window.loadTemplate === "function" && typeof window.v3Ouvrir === "function", { timeout: 30000 });
  const mode = await p.evaluate(() => ({ pro: isPro(), dev: location.search.includes("dev"), site: !!window.AVYORA_SITE }));
  if (mode.pro || mode.dev) throw new Error("l'éditeur n'est pas en gratuit sans ?dev : " + JSON.stringify(mode));
  await p.evaluate(() => { closeModal(); loadTemplate("maison", "final_plan"); });
  await p.waitForFunction(() => state.levels?.[0]?.walls?.length > 0 && state.workflow === "final_plan", { timeout: 10000 });
  const resume = await p.evaluate(() => ({ nom: state.name, pieces: (facesCache[state.levels[0].id] || []).filter((f) => f.room).length }));
  /* la bulle du chargement (« … chargé — adapte les cotes ») : on attend qu'elle parte, sinon on la replie */
  await p.waitForFunction(() => !document.getElementById("toast").classList.contains("show"), { timeout: 15000 }).catch(() =>
    p.evaluate(() => document.getElementById("toast").classList.remove("show")));
  await p.evaluate(() => { closeModal(); fitView(); render(); });
  await wait(600);
  const brut2d = await p.screenshot({ type: "png" });
  await p.evaluate(() => v3Ouvrir());
  const etat = await p.waitForFunction(() => (v3Etat().pret && v3.etat !== "charge" && !v3.anim) || v3.etat === "reseau" || v3.etat === "webgl", { timeout: 60000 })
    .then(() => p.evaluate(() => v3.etat || "prête"));
  if (etat === "reseau" || etat === "webgl") throw new Error("la 3D ne s'est pas ouverte : " + etat);
  await p.waitForFunction(() => !document.getElementById("toast").classList.contains("show"), { timeout: 15000 }).catch(() =>
    p.evaluate(() => document.getElementById("toast").classList.remove("show")));
  await wait(800);
  const brut3d = await p.screenshot({ type: "png" });
  if (erreurs.length) throw new Error("erreur de page : " + erreurs.join(" | "));

  for (const [nom, brut] of [["maison-2d", brut2d], ["maison-3d", brut3d]]) {
    await sharp(brut).resize(1040, 650).png({ compressionLevel: 9 }).toFile(path.join(SORTIE, `${nom}.png`));
    await sharp(brut).resize(1040, 650).webp({ quality: 82 }).toFile(path.join(SORTIE, `${nom}-1040.webp`));
    await sharp(brut).resize(760, 475).webp({ quality: 82 }).toFile(path.join(SORTIE, `${nom}-760.webp`));
  }

  /* L'image de partage : les deux vraies captures, composées, avec le titre de la vitrine. */
  /* réduites d'abord (une capture 2× en base64 ne se charge pas dans setContent) */
  const data = async (buf) => "data:image/jpeg;base64," + (await sharp(buf).resize(1320, 825).jpeg({ quality: 90 }).toBuffer()).toString("base64");
  const [d2d, d3d] = [await data(brut2d), await data(brut3d)];
  const p2 = await b.newPage();
  await p2.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await p2.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}body{width:1200px;height:630px;overflow:hidden;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;
    background:linear-gradient(150deg,#1E1B4B,#241f5e 55%,#191640);color:#fff;position:relative}
    .t{position:absolute;left:64px;top:70px;width:430px}.e{font-size:15px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#C4B5FD}
    h1{font-size:50px;line-height:1.06;font-weight:800;letter-spacing:-.02em;margin-top:18px}p{font-size:21px;line-height:1.45;color:#d7d4f2;margin-top:22px}
    .m{position:absolute;left:64px;bottom:58px;font-size:24px;font-weight:700;letter-spacing:.14em}.m span{color:#A78BFA}
    .a{position:absolute;right:-40px;top:64px;width:660px;border-radius:16px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.18)}
    .b{position:absolute;right:40px;bottom:-30px;width:400px;border-radius:12px;overflow:hidden;border:3px solid rgba(255,255,255,.9);box-shadow:0 26px 50px -16px rgba(0,0,0,.7)}
    img{display:block;width:100%}</style></head><body>
    <div class="t"><div class="e">Éditeur de plan · Gratuit</div><h1>Dessine ton plan. Vois-le en 3D.</h1><p>Murs, pièces et surfaces calculées, vue 3D en un clic. Sans installation.</p></div>
    <div class="m">AVY<span>ORA</span></div>
    <div class="a"><img src="${d2d}"></div><div class="b"><img src="${d3d}"></div></body></html>`, { waitUntil: "load" });
  if (!(await p2.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)))) throw new Error("image de partage : une capture ne s'est pas chargée");
  await p2.screenshot({ type: "png", path: path.join(SORTIE, "og-plan.png") });

  console.log(`  ✓ ${resume.nom} · ${resume.pieces} pièces · gratuit, sans ?dev · 3D : ${etat}`);
  for (const f of fs.readdirSync(SORTIE).sort()) console.log(`    ${f}  ${(fs.statSync(path.join(SORTIE, f)).size / 1024).toFixed(0)} Ko`);
} catch (e) {
  console.log("  ✗ " + (e?.message ?? e));
  await b.close();
  process.exit(1);
}
await b.close();
process.exit(0);
