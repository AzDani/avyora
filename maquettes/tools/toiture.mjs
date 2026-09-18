/**
 * Contrôle : la toiture suit l'emprise RÉELLE des murs.
 *
 * Elle était calculée sur le rectangle enveloppe : un plan en L payait la couverture de son
 * creux. Deux exigences opposées se croisent ici — sur un rectangle, les chiffres ne doivent pas
 * bouger d'un centimètre (sinon c'est une régression de prix silencieuse) ; sur tout le reste,
 * ils doivent enfin coller au plan.
 *
 *   node maquettes/tools/toiture.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/toiture.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

const res = await p.evaluate(() => {
  closeWelcome("blank");
  const t = {};
  const pres = (x, y, tol) => Math.abs(x - y) <= (tol ?? 0.15);
  const scene = (pts) => { state = blankState(); const lv = L(); lv.height = 2.5;
    for (let i = 0; i < pts.length; i++) lv.walls.push({ id: uid(), a: v(...pts[i]), b: v(...pts[(i + 1) % pts.length]), type: "mur" });
    afterChange(); setToiture("init", ""); return lv; };

  /* ── un rectangle 6×4, murs de 20 cm : RIEN ne doit bouger ───────────────── */
  scene([[0,0],[6,0],[6,4],[0,4]]);
  let g = toitureGeo();
  t["rectangle · emprise 26,0 m² (hors tout 6,20 × 4,20)"] = pres(g.emprise, 26.0);
  t["rectangle · surface 37,7 m² (débord 30 cm, pente 30°)"] = pres(g.surface, 37.7);
  t["rectangle · égouts 13,6 ml (les deux longs pans)"] = pres(g.egouts, 13.6);
  t["rectangle · périmètre 20,8 ml"] = pres(g.perim, 20.8);
  t["rectangle · aucun avertissement de forme"] = g.compose === false;

  /* ── le même bâti amputé d'un coin : un L ────────────────────────────────── */
  /* hors tout 6,20 × 4,20 = 26,04 m², moins le creux qui, lui, se RÉTRÉCIT de 10 cm par côté
     (les faces du L rentrent dans l'angle) : 3,00 × 2,00 = 6,00 → 20,04 m². Six mètres carrés de
     couverture que le rectangle enveloppe facturait sans qu'ils existent. */
  scene([[0,0],[6,0],[6,2],[3,2],[3,4],[0,4]]);
  g = toitureGeo();
  t["L · emprise 20,0 m² et non 26,0"] = pres(g.emprise, 20.0, 0.1);
  t["L · surface 30,8 m² et non 37,7"] = pres(g.surface, 30.8, 0.1);
  t["L · égouts 13,6 ml, pris arête par arête"] = pres(g.egouts, 13.6, 0.1);
  t["L · périmètre 20,8 ml"] = pres(g.perim, 20.8, 0.1);
  t["L · la forme est signalée comme simplifiée"] = g.compose === true;

  /* ── toit plat : la surface EST l'emprise + débord, sans pente ───────────── */
  scene([[0,0],[6,0],[6,4],[0,4]]); setToiture("forme", "plat");
  g = toitureGeo();
  t["toit plat · surface = emprise + débord (32,6 m²)"] = pres(g.surface, 32.6, 0.2);
  t["toit plat · égouts = tout le pourtour (23,2 ml)"] = pres(g.egouts, 23.2, 0.2);

  /* ── l'emprise suit les murs qu'on retire ────────────────────────────────── */
  const lv = scene([[0,0],[6,0],[6,4],[0,4]]);
  const av = toitureGeo().emprise;
  const loin = { id: uid(), a: v(12, 12), b: v(15, 12), type: "mur" }; lv.walls.push(loin); afterChange();
  const pend = toitureGeo().emprise;
  sel = { kind: "wall", id: loin.id }; deleteSel();
  t["un mur isolé n'agrandit pas l'emprise"] = pres(pend, av);
  t["l'emprise revient après suppression"] = pres(toitureGeo().emprise, av);

  /* ── plus aucun mur : tout retombe à zéro, sans planter ──────────────────── */
  L().walls.length = 0; afterChange();
  g = toitureGeo();
  t["sans mur, l'emprise est nulle"] = g.emprise === 0 && g.surface === 0;
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ la toiture suit l'emprise réelle");
process.exit(echecs.length || errs.length ? 1 : 0);
