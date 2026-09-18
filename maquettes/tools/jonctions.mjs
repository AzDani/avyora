/**
 * Contrôle : une cloison ne rentre jamais dans le doublage d'un mur.
 *
 * Six gestes peuvent poser ou déplacer l'extrémité d'un mur, et chacun a son propre code : tracer
 * au clic, tracer en tapant la longueur, glisser le bout, glisser le mur entier, les flèches du
 * clavier, retaper une longueur après coup. Trois d'entre eux ont été corrigés séparément après
 * un signalement — d'où ce contrôle, qui les vérifie tous d'un coup.
 *
 *   node maquettes/tools/jonctions.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/jonctions.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));

const res = await p.evaluate(() => {
  closeWelcome("blank");
  /* mur de 20 cm doublé de 12 cm + 2 cm de finition : la face de la plaque est à 0,24 m du trait */
  const FACE = 0.24, colle = (y) => Math.abs(y - FACE) < 2e-3;
  const scene = (pourDessiner) => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, t) => { const x = { id: uid(), a: v(...a), b: v(...c), type: t }; lv.walls.push(x); return x; };
    const haut = W([0, 0], [6, 0], "mur"); W([6, 0], [6, 4], "mur"); W([6, 4], [0, 4], "mur"); W([0, 4], [0, 0], "mur");
    haut.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 };
    afterChange();
    if (pourDessiner) { setTool("mur"); chain = []; chainWallIds = []; lenBuf = ""; return lv; }
    const s = snapPoint(v(3, 0.27), null);
    const cl = { id: uid(), a: { ...s.p }, b: v(3, 2.5), type: "cloison" };
    lv.walls.push(cl); afterChange(); sel = { kind: "wall", id: cl.id };
    return { lv, cl };
  };
  const bouge = (S, d) => { const dd = deplacementBorne(S.cl, d); const oa = { ...S.cl.a }, ob = { ...S.cl.b }; moveNode(oa, add(oa, dd)); moveNode(ob, add(ob, dd)); return S.cl.a.y; };
  const t = {};
  { const lv = scene(true); let s = snapPoint(v(3, 3.9), null); chain.push(s.p); s = snapPoint(v(3, 0.28), chain[0]); t["tracer au clic"] = colle(s.p.y); }
  { const lv = scene(true); chain.push(v(3, 3.9)); hover = v(3, 0.5); lenBuf = "3.90"; commitTypedLength();
    const cl = lv.walls[lv.walls.length - 1]; t["tracer en tapant la longueur"] = colle(Math.min(cl.a.y, cl.b.y)); }
  { const S = scene(); const { p: np } = snapPoint(v(3, 0.14), null, S.cl.a); moveNode(S.cl.a, np); t["glisser le bout"] = colle(S.cl.a.y); }
  { t["glisser le mur entier"] = colle(bouge(scene(), v(0, -0.12))); }
  { t["flèches du clavier"] = colle(bouge(scene(), v(0, -0.05))); }
  { const S = scene(); setWallLength(S.cl, 2.5); t["retaper une longueur"] = colle(S.cl.a.y); }
  /* et ce qui doit rester libre */
  { const S = scene(); const y = bouge(S, v(0.4, 0)); t["glisser LE LONG du mur reste libre"] = Math.abs(S.cl.a.x - 3.4) < 1e-6 && colle(y); }
  { const S = scene(); t["s'éloigner du doublage reste libre"] = Math.abs(bouge(S, v(0, 0.3)) - 0.54) < 1e-6; }
  { state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, ty) => { lv.walls.push({ id: uid(), a: v(...a), b: v(...c), type: ty }); };
    W([0, 0], [6, 0], "mur"); W([6, 0], [6, 4], "mur"); W([6, 4], [0, 4], "mur"); W([0, 4], [0, 0], "mur"); afterChange();
    setTool("mur"); chain = [v(3, 3.9)]; chainWallIds = []; hover = v(3, 0.5); lenBuf = "3.80"; commitTypedLength();
    const cl = lv.walls[lv.walls.length - 1]; t["sans doublage, la longueur tapée reste exacte"] = Math.abs(wallLen(cl) - 3.8) < 1e-6; }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(res)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ une cloison ne rentre dans aucun doublage");
process.exit(echecs.length || errs.length ? 1 : 0);
