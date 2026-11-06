/* Unités d'affichage de l'éditeur (bouton « m / ft ») : conversions, bascule, champs de saisie en pieds-pouces,
   longueur tapée au clavier, mémorisation, et rien de changé dans le plan enregistré (toujours en mètres).
   Usage : node maquettes/tools/unites.mjs "$(pwd)/maquettes"   → sort en 1 au premier contrôle raté. */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const SP = process.argv[2], OUT = SP + "/review";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox", "--force-device-scale-factor=1"] });
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = [], ko = [];
const check = (nom, cond, detail) => { (cond ? ok : ko).push(nom + (cond ? "" : " → " + JSON.stringify(detail))); };

await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem("u-init")) { try { localStorage.clear(); } catch {} sessionStorage.setItem("u-init", "1"); } });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await wait(300);
await p.evaluate(() => closeWelcome("blank"));
await wait(150);

// 1. conversions pures
const c = await p.evaluate(() => ({
  a: ftIn(3.81), b: ftIn(0.0127), c: ftIn(PIED * 10), d: txtPouces(2.75, 4), e: ftIn(0),
  l1: lireLong("12' 6\"", "ft"), l2: lireLong("12'6", "ft"), l3: lireLong("12 ft 6 in", "ft"), l4: lireLong("6 ½\"", "ft"),
  l5: lireLong("3,5 m", "ft"), l6: lireLong("350 cm", "ft"), l7: lireLong("10", "ft"), l8: lireLong("8", "in"), l9: Number.isNaN(lireLong("abc", "ft")), l10: lireLong("6 1/2 in", "ft"),
  m2: fmtM2(20), lMetre: uL(3.81), unite: UNITE,
}));
const pres = (x, y) => Math.abs(x - y) < 1e-6;
check("12' 6\" = 3,81 m", c.a === "12' 6\"", c.a);
check("½\" et 10'", c.b === '½"' && c.c === "10'", [c.b, c.c]);
check("épaisseur au ¼ de pouce", c.d === '2 ¾"', c.d);
check("zéro", c.e === '0"', c.e);
check("lecture 12' 6\" / 12'6 / 12 ft 6 in", pres(c.l1, 3.81) && pres(c.l2, 3.81) && pres(c.l3, 3.81), [c.l1, c.l2, c.l3]);
check("lecture 6 ½\" et 6 1/2 in", pres(c.l4, 6.5 * 0.0254) && pres(c.l10, 6.5 * 0.0254), [c.l4, c.l10]);
check("lecture métrique dans un champ impérial", pres(c.l5, 3.5) && pres(c.l6, 3.5), [c.l5, c.l6]);
check("nombre seul = unité du champ", pres(c.l7, 3.048) && pres(c.l8, 0.2032), [c.l7, c.l8]);
check("saisie illisible = NaN", c.l9 === true, c.l9);
check("mètres par défaut", c.unite === "m" && c.m2 === "20,0 m²" && c.lMetre === "3,81 m", c);

// 2. une pièce de 5 × 4 m, puis la bascule
const P = async (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
for (const [x, y] of [[0, 0], [5, 0], [5, 4], [0, 4], [0, 0]]) { const q = await P(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(110); }
const avant = await p.evaluate(() => snapshot());
await p.evaluate(() => basculerUnite());
await wait(200);
const apres = await p.evaluate(() => ({ imp: imp(), grille: settings.gridStep, lbl: document.getElementById("uniteLbl").textContent, ech: document.getElementById("echelle").textContent, m2: fmtM2(20), etat: snapshot() }));
check("bascule en pieds-pouces", apres.imp && apres.lbl === "ft", apres);
check("aimantation au pas de 3\"", pres(apres.grille, 3 * 0.0254), apres.grille);
check("échelle graphique en pieds ou pouces", /['"]/.test(apres.ech), apres.ech);
check("surface en sq ft", apres.m2 === "215 sq ft", apres.m2);
check("le plan enregistré n'a pas bougé", avant === apres.etat, "état différent");
await p.screenshot({ path: `${OUT}/unites-01-pieds.png` });

// 3. champs du panneau : longueur d'un mur et épaisseur
await p.evaluate(() => { const w = L().walls[0]; setTool("select"); sel = { kind: "wall", id: w.id }; render(); });
await wait(200);
const champs = await p.evaluate(() => [...document.querySelectorAll("#pbody input[data-u-imp]")].map((el) => ({ u: el.dataset.uImp, txt: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").get.call(el), val: el.value, type: el.type })));
const lg = champs.find((x) => x.u === "m"), ep = champs.find((x) => x.u === "cm");
check("champ longueur en pieds-pouces, rendu exact tant qu'on n'y touche pas", lg && lg.txt === "16' 5\"" && pres(+lg.val, 5) && lg.type === "text", champs);
check("champ épaisseur en pouces", ep && /"$/.test(ep.txt), champs);
await p.screenshot({ path: `${OUT}/unites-02-panneau.png` });
const saisir = async (texte) => p.evaluate((t) => {
  const el = [...document.querySelectorAll("#pbody input[data-u-imp='m']")][0];
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, t);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  const w = L().walls.find((x) => x.id === sel.id);
  return +wallLen(w).toFixed(4);
}, texte);
const l20 = await saisir("20'");
check("taper 20' met le mur à 6,096 m", pres(l20, 6.096), l20);
await wait(150);
const lBad = await saisir("abc");
check("une saisie illisible ne change rien", pres(lBad, 6.096), lBad);

// 4. longueur tapée au clavier pendant le tracé
await p.evaluate(() => { sel = null; setTool("mur"); });
const q0 = await P(0, 6); await p.mouse.move(q0.x, q0.y); await p.mouse.click(q0.x, q0.y); await wait(80);
const q1 = await P(3, 6.1); await p.mouse.move(q1.x, q1.y); await wait(60);
await p.keyboard.type("10'6\"");
await p.keyboard.press("Enter");
await wait(150);
const tape = await p.evaluate(() => +wallLen(L().walls[L().walls.length - 1]).toFixed(4));
check("10'6\" tapé au clavier = 3,2004 m", pres(tape, 3.2004), tape);
await p.keyboard.press("Escape");

// 5. mémorisée au rechargement, puis retour aux mètres
await p.reload({ waitUntil: "networkidle0" });
await wait(300);
const recharge = await p.evaluate(() => ({ imp: imp(), lbl: document.getElementById("uniteLbl").textContent }));
check("l'unité est retenue au rechargement", recharge.imp && recharge.lbl === "ft", recharge);
await p.evaluate(() => basculerUnite());
await wait(150);
const retour = await p.evaluate(() => { const w = L().walls[0]; sel = { kind: "wall", id: w.id }; render(); const el = document.querySelector("#pbody input[type=number]"); return { imp: imp(), grille: settings.gridStep, champ: !!el, conv: document.querySelectorAll("input[data-u-imp]").length, m2: fmtM2(20) }; });
check("retour aux mètres : champs numériques, pas de 10 cm", !retour.imp && retour.grille === 0.1 && retour.champ && retour.conv === 0 && retour.m2 === "20,0 m²", retour);

check("aucune erreur de page", errs.length === 0, errs);
await b.close();
for (const x of ok) console.log("✓ " + x);
for (const x of ko) console.log("✗ " + x);
console.log(ko.length ? `\n✗ unités : ${ko.length} contrôle(s) raté(s)` : `\n✓ unités : ${ok.length} contrôles`);
process.exit(ko.length ? 1 : 0);
