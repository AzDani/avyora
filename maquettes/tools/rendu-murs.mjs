/**
 * Contrôle : le rendu des murs se raccorde proprement aux jonctions.
 *
 * Trois choses se mesurent ici, sur les pixels du canevas :
 *   — rien ne s'échappe hors des murs (les hachures appellent beginPath : tout tracé posé avant
 *     elles est perdu, et le liseré suivant repassait sur la dernière ligne de hachure) ;
 *   — aucun trait ne barre une jonction en T ou un angle ;
 *   — une extrémité LIBRE garde son trait, elle.
 *
 *   node maquettes/tools/rendu-murs.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/rendu-murs.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1300, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

const res = await p.evaluate(() => {
  closeWelcome("blank");
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty, st) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; if (st) x.st = st; lv.walls.push(x); return x; };
  const P = [[0, 0], [6, 0], [6, 4], [0, 4]];
  for (let i = 0; i < P.length; i++) W(P[i], P[(i + 1) % P.length]);
  afterChange();
  const s1 = snapPoint(v(2, 0.05), null);
  W([2, s1.p.y], [2, 2.5], "cloison", "creer");        /* T sur le mur du haut, puis angle en bas */
  W([2, 2.5], [5, 2.5], "cloison", "creer");
  W([4, 2.5], [4, 3.9], "cloison", "creer");           /* T sur la cloison précédente */
  W([0.6, 1.2], [0.6, 1.9], "cloison", "creer");       /* deux bouts LIBRES */
  afterChange(); setMode("projet"); closeModal();
  settings.grid = false; settings.cotes = false;
  tool = "export";                     /* masque les pastilles de bout libre, qui couvriraient
                                          justement les traits d'extrémité qu'on veut mesurer */
  fitView(); draw();

  const lire = (x, y) => { const s = S(v(x, y)); const d = ctx.getImageData(Math.round(s.x * (cv.width / cv.clientWidth)), Math.round(s.y * (cv.height / cv.clientHeight)), 1, 1).data; return [d[0], d[1], d[2]]; };
  /* Un trait, c'est nettement plus sombre que ce qu'il traverse : le liseré bleu nuit donne
     [114,34,58] sur le rouge « à créer » et [130,138,164] sur le fond, là où le remplissage seul
     donne [194,58,58] et une hachure [217,130,130]. Le canal rouge sépare les trois sans ambiguïté. */
  const trait = (x, y) => lire(x, y)[0] < 160;
  const hachure = (x, y) => { const c = lire(x, y); return c[0] > 200 && c[1] > 90; };
  const sombre = (c) => c[0] < 110 && c[1] < 110 && c[2] < 150;
  /* les étiquettes de pièce sont écrites en sombre : on les contourne */
  const etiquettes = (facesCache[lv.id] || []).filter((f) => f.room).map((f) => f.label);
  const surEtiquette = (x, y) => etiquettes.some((e) => Math.abs(x - e.x) < 1.2 && Math.abs(y - e.y) < 0.5);
  const t = {};

  /* 1. rien ne s'échappe hors des murs — la garde contre le tracé perdu par beginPath */
  let fuites = 0, vus = 0;
  const balayer = (x0, x1, y0, y1) => { for (let x = x0; x < x1; x += 0.04) for (let y = y0; y < y1; y += 0.04) { if (surEtiquette(x, y)) continue; vus++; if (sombre(lire(x, y))) fuites++; } };
  balayer(2.3, 4.8, 0.3, 2.2); balayer(0.3, 1.7, 0.3, 3.7); balayer(2.3, 3.6, 2.8, 3.6);
  t["aucun trait parasite à l'intérieur des pièces"] = vus > 2000 && fuites === 0;

  /* 2. un trait BARRE-t-il la jonction ? on compte, en travers de la cloison, la part de pixels
     de liseré — franche à une extrémité libre, nulle à une jonction. */
  /* ±1,5 cm seulement : une cloison ne fait que 7 cm, et à ±2,5 cm la sonde mordrait déjà sur
     ses deux liserés latéraux, qui eux doivent exister. */
  const enTravers = (x, y) => { let n = 0, tot = 0;
    for (let d = -0.015; d <= 0.0151; d += 0.003) { tot++; if (trait(x + d, y)) n++; }
    return n / tot; };
  /* au ras d'un bout, le trait tombe à un pixel près : on regarde aussi juste en deçà */
  const auBout = (x, y, vers) => Math.max(enTravers(x, y), enTravers(x, y + vers * 0.005), enTravers(x, y + vers * 0.01));
  t["extrémité LIBRE haute · le trait est bien là"] = auBout(0.6, 1.2, +1) > 0.9;
  t["extrémité LIBRE basse · le trait est bien là"] = auBout(0.6, 1.9, -1) > 0.9;
  t["angle entre deux cloisons · aucun trait en travers"] = enTravers(2, 2.5) === 0;
  t["T entre deux cloisons · aucun trait en travers"] = enTravers(4, 2.5) === 0;
  t["T sur le mur du haut · aucun trait en travers"] = auBout(2, 0.1, +1) === 0;

  /* 3. la hachure vit bien dans la cloison (sinon le point 2 serait vrai pour une mauvaise raison) */
  let h = 0; for (let y = 0.4; y < 2.3; y += 0.01) if (hachure(2, y)) h++;
  t["la cloison est bien hachurée"] = h > 20;

  /* 4. UNE seule famille de droites pour tout le plan. On intercepte les tracés de hachure sur
     deux boîtes éloignées et on vérifie que toutes les droites appartiennent au même réseau :
     c'est la propriété elle-même, pas une approximation au pixel près. */
  const capter = (x0, y0, x1, y1) => { const qs = [];
    const mo = ctx.moveTo, li = ctx.lineTo, st = ctx.stroke, bp = ctx.beginPath;
    ctx.moveTo = function (x, y) { qs.push((x + y) / Math.SQRT2); };
    ctx.lineTo = function () {}; ctx.stroke = function () {}; ctx.beginPath = function () {};
    try { hachurer(x0, y0, x1, y1, 0.45, 7); } finally { ctx.moveTo = mo; ctx.lineTo = li; ctx.stroke = st; ctx.beginPath = bp; }
    return qs; };
  const A = capter(100, 100, 200, 300), B = capter(700, 520, 900, 560);
  const reste = (q) => { const r = ((q % 7) + 7) % 7; return Math.min(r, 7 - r); };
  const ref = ((A[0] % 7) + 7) % 7;
  const memeReseau = (qs) => qs.every((q) => reste(q - ref) < 1e-6);
  t["deux zones éloignées hachurent sur le même réseau"] = A.length > 5 && B.length > 5 && memeReseau(A) && memeReseau(B);
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le rendu se raccorde aux jonctions");
process.exit(echecs.length || errs.length ? 1 : 0);
