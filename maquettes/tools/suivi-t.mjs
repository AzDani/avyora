/**
 * Contrôle : une cloison qui arrive en T sur un mur SUIT ce mur quand il bouge.
 *
 * Elle doit s'allonger ou se raccourcir — son autre bout ne bouge pas — et garder son angle.
 * Le piège est que le bout n'est plus posé sur l'AXE du mur depuis que l'aimant le pose sur sa
 * FACE : tout test d'attache écrit sur l'axe ne voit plus aucun T.
 *
 *   node maquettes/tools/suivi-t.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/suivi-t.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

/* ── 1. le chemin clavier (translateWall), mesuré directement ──────────────── */
const clavier = await p.evaluate(() => {
  closeWelcome("blank");
  const t = {};
  const pres = (x, y, tol) => Math.abs(x - y) < (tol ?? 2e-3);
  /* boîte 6 × 4 en murs de 20 cm, cloison tracée à l'aimant : ses bouts se posent sur les FACES */
  const scene = (isoHaut) => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
    const haut = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]);
    if (isoHaut) haut.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 };
    afterChange();
    const s1 = snapPoint(v(3, 0.05), null), s2 = snapPoint(v(3, 3.95), null);
    const cl = { id: uid(), a: { ...s1.p }, b: { ...s2.p }, type: "cloison" };
    lv.walls.push(cl); afterChange();
    return { lv, haut, cl };
  };

  { const S = scene(false);
    t["au départ, le bout est posé sur la FACE du mur (0,10 m de l'axe)"] = pres(S.cl.a.y, 0.10);
    t["le mur du haut voit bien la cloison en T"] = tsSurMur(S.haut).length === 1;
    const basAvant = S.cl.b.y;
    translateWall(S.haut, v(0, 0.5));                       /* on descend le mur de 50 cm */
    t["mur descendu de 50 cm · le bout suit à 0,60"] = pres(S.cl.a.y, 0.60);
    t["mur descendu · l'autre bout n'a pas bougé"] = pres(S.cl.b.y, basAvant);
    t["mur descendu · la cloison a donc RACCOURCI"] = pres(wallLen(S.cl), basAvant - 0.60); }

  { const S = scene(false); const basAvant = S.cl.b.y;
    translateWall(S.haut, v(0, -0.7));                      /* et on le remonte */
    t["mur remonté de 70 cm · le bout suit à -0,60"] = pres(S.cl.a.y, -0.60);
    t["mur remonté · la cloison s'est ALLONGÉE"] = pres(wallLen(S.cl), basAvant + 0.60); }

  { const S = scene(true);                                   /* mur doublé 12 + 2 cm */
    t["mur doublé · le bout part de la face de la plaque (0,24)"] = pres(S.cl.a.y, 0.24);
    translateWall(S.haut, v(0, 0.3));
    t["mur doublé · le bout reste contre la plaque (0,54)"] = pres(S.cl.a.y, 0.54); }

  { /* T oblique : la cloison ne doit pas pivoter en suivant */
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
    const haut = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]);
    afterChange();
    const s = snapPoint(v(3, 0.05), null);
    const cl = { id: uid(), a: { ...s.p }, b: v(1.5, 3), type: "cloison" };
    lv.walls.push(cl); afterChange();
    const angle = (w) => Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
    const a0 = angle(cl), bas = { ...cl.b };
    translateWall(haut, v(0, 0.4));
    t["T oblique · l'angle de la cloison est conservé"] = Math.abs(angle(cl) - a0) < 1e-6;
    t["T oblique · le bout libre n'a pas bougé"] = pres(cl.b.x, bas.x) && pres(cl.b.y, bas.y);
    t["T oblique · le bout posé reste contre la face"] = pres(cl.a.y, 0.50, 1e-2); }

  { /* un mur DÉJÀ relié par un nœud partagé continue de suivre comme avant */
    const S = scene(false);
    const ouest = S.lv.walls[3];
    const avant = { ...ouest.b };
    translateWall(S.haut, v(0, 0.25));
    t["les coins partagés suivent toujours (régression)"] = pres(ouest.b.y, avant.y + 0.25); }
  return t;
});

/* ── 2. le vrai glissé à la souris, événements compris ─────────────────────── */
const coords = await p.evaluate(() => {
  closeWelcome("blank");
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
  const haut = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]);
  afterChange();
  const s1 = snapPoint(v(3, 0.05), null), s2 = snapPoint(v(3, 3.95), null);
  lv.walls.push({ id: uid(), a: { ...s1.p }, b: { ...s2.p }, type: "cloison" });
  afterChange(); fitView(); setTool("select"); draw();
  const r = document.getElementById("cv").getBoundingClientRect();
  const P = (x, y) => { const s = S(v(x, y)); return { x: r.left + s.x, y: r.top + s.y }; };
  return { depart: P(1.5, 0), arrivee: P(1.5, 0.5), murHautId: haut.id };
});
await p.mouse.move(coords.depart.x, coords.depart.y);
await p.mouse.down();
for (let i = 1; i <= 6; i++) {           /* plusieurs images, comme une vraie souris */
  await p.mouse.move(coords.depart.x + (coords.arrivee.x - coords.depart.x) * i / 6,
                     coords.depart.y + (coords.arrivee.y - coords.depart.y) * i / 6);
}
await p.mouse.up();
const souris = await p.evaluate(() => {
  const lv = L(), cl = lv.walls[4], haut = lv.walls[0];
  const pres = (x, y, tol) => Math.abs(x - y) < (tol ?? 1e-2);
  return {
    "à la souris · le mur est bien descendu de 50 cm": pres(haut.a.y, 0.5),
    "à la souris · le bout de la cloison a suivi": pres(cl.a.y, 0.6),
    "à la souris · l'autre bout n'a pas bougé": pres(cl.b.y, 3.9),
  };
});
await b.close();

const res = { ...clavier, ...souris };
const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ les T suivent le mur qui bouge");
process.exit(echecs.length || errs.length ? 1 : 0);
