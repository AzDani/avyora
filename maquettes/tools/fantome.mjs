/**
 * Contrôle : le filigrane du niveau du dessous se raccorde correctement.
 *
 * Il est dessiné, donc on le mesure là où il se voit — sur les pixels du canevas. Deux défauts
 * l'ont motivé : les transparences se cumulaient à chaque croisement (un carré plus sombre) et
 * le trait s'arrêtait sur l'axe (un carré manquant à chaque angle).
 *
 *   node maquettes/tools/fantome.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/fantome.mjs <dossier maquettes>"); process.exit(2); }

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
  const W = (a, c, t) => lv.walls.push({ id: uid(), a: v(...a), b: v(...c), type: t || "mur" });
  const P = [[0, 0], [6, 0], [6, 4], [0, 4]];
  for (let i = 0; i < P.length; i++) W(P[i], P[(i + 1) % P.length]);
  W([3, 0], [3, 4]);                      /* refend porteur : deux croisements en T */
  W([1, 1.5], [2, 1.5], "cloison");       /* cloison aux DEUX bouts dans le vide */
  afterChange(); addLevel("empty"); fitView();
  /* grille coupée : elle poserait ses propres traits sous les points de mesure, et un pixel pris
     sur une ligne de grille ne dit plus rien du filigrane */
  settings.grid = false; draw();

  /* couleur au point (x,y) du plan, en coordonnées monde */
  const lire = (x, y) => { const s = S(v(x, y)); const d = ctx.getImageData(Math.round(s.x * (cv.width / cv.clientWidth)), Math.round(s.y * (cv.height / cv.clientHeight)), 1, 1).data; return [d[0], d[1], d[2]]; };
  const proche = (a, c, tol) => a.every((n, i) => Math.abs(n - c[i]) <= (tol ?? 3));

  const plein = lire(1.5, 0.04);           /* dans la bande du mur du haut : la teinte de référence */
  const fond = lire(1.6, 3.1);             /* au milieu d'une pièce : rien */
  const t = {};
  t["le filigrane se voit (il n'est pas de la couleur du fond)"] = !proche(plein, fond, 6);

  /* 1. aucun cumul de transparence là où deux murs se croisent */
  t["croisement en T · même teinte qu'un mur seul"] = proche(lire(3.04, 0.04), plein);
  t["croisement en T (bas) · même teinte"] = proche(lire(3.04, 3.96), plein);
  t["angle du bâti · même teinte"] = proche(lire(5.96, 0.04), plein);

  /* 2. l'angle est bien rempli jusqu'au coin extérieur */
  t["coin extérieur haut-droit rempli"] = proche(lire(6.05, -0.05), plein);
  t["coin extérieur haut-gauche rempli"] = proche(lire(-0.05, -0.05), plein);
  t["coin extérieur bas-droit rempli"] = proche(lire(6.05, 4.05), plein);

  /* 3. un bout dans le vide ne s'allonge PAS */
  t["cloison libre · son milieu se voit"] = !proche(lire(1.5, 1.52), fond, 6);
  t["cloison libre · rien au-delà de son bout"] = proche(lire(2.06, 1.52), fond, 6);
  t["cloison libre · rien avant son autre bout"] = proche(lire(0.94, 1.52), fond, 6);

  /* 4. l'intérieur des pièces reste vide */
  t["l'intérieur d'une pièce reste vide"] = proche(lire(4.6, 2.1), fond, 6);
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le filigrane du dessous se raccorde");
process.exit(echecs.length || errs.length ? 1 : 0);
