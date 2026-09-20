/**
 * Contrôle : un doublage peut ne couvrir qu'une PARTIE de son mur.
 *
 * Il couvrait toujours le mur entier. Or un doublage s'arrête contre une cloison, un conduit,
 * un décroché — et quand il s'arrête, trois choses doivent s'arrêter avec lui : la surface de
 * la pièce qui rétrécit, la quantité chiffrée, et la butée des cloisons.
 *
 * L'étendue se cale sur les JONCTIONS du mur, parce que detectFaces y découpe déjà les arêtes :
 * une arête est alors soit entièrement doublée, soit pas du tout, et les trois restent exacts.
 *
 *   node maquettes/tools/doublage.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/doublage.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1300, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));

const res = await p.evaluate(() => {
  closeWelcome("blank");
  const t = {};
  const pres = (x, y, tol) => Math.abs(x - y) < (tol ?? 0.02);
  /* 6 × 4, une cloison au milieu coupe le mur du haut en deux ; doublage 12 + 2 côté pièce */
  const scene = (ext) => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
    const haut = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]);
    W([3, 0], [3, 4], "cloison");
    haut.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1, ...(ext || {}) };
    afterChange(); return { lv, haut };
  };
  const aires = (lv) => facesFor(lv, "projet").map((f) => +f.areaInt.toFixed(2)).sort((a, c) => a - c);

  /* ── sans étendue, rien ne change : non-régression ───────────────────────── */
  { const { lv, haut } = scene(null); const q = quantities();
    t["par défaut, le doublage couvre tout le mur"] = isoEntier(haut.iso);
    t["par défaut · 15 m² doublés"] = pres(q.doublage.iti, 15);
    t["par défaut · 0,84 m² de surface perdue"] = pres(q.doublage.surfacePerdue, 0.84);
    t["par défaut · les deux pièces perdent autant"] = pres(aires(lv)[0], aires(lv)[1]); }

  /* ── les arrêts proposés sont les jonctions du mur ───────────────────────── */
  { const { lv, haut } = scene(null); const A = arretsDoublage(lv, haut);
    t["les arrêts sont les bouts et la cloison (0 · 0,5 · 1)"] = A.length === 3 && pres(A[1], 0.5, 1e-3); }

  /* ── doubler la moitié : tout suit ───────────────────────────────────────── */
  { const { lv } = scene({ t0: 0, t1: 0.5 }); const q = quantities(); const a = aires(lv);
    t["moitié doublée · 7,5 m² au lieu de 15"] = pres(q.doublage.iti, 7.5);
    t["moitié doublée · 0,42 m² de surface perdue"] = pres(q.doublage.surfacePerdue, 0.42);
    t["moitié doublée · une seule pièce rétrécit"] = !pres(a[0], a[1]) && pres(a[1] - a[0], 2.9 * 0.14, 0.03); }
  { const { lv } = scene({ t0: 0.5, t1: 1 }); const a = aires(lv);
    t["l'autre moitié · c'est l'autre pièce qui rétrécit"] = pres(a[1] - a[0], 2.9 * 0.14, 0.03); }

  /* ── la butée des cloisons suit l'étendue ────────────────────────────────── */
  { const { lv, haut } = scene({ t0: 0, t1: 0.5 });
    /* côté doublé (x = 1,5) : la cloison s'arrête à la plaque, 0,24 de l'axe */
    const g = snapPoint(v(1.5, 0.05), null);
    t["côté doublé · le bout se pose sur la plaque (0,24)"] = pres(g.p.y, 0.24);
    /* côté nu (x = 4,5) : elle atteint la face du mur, 0,10 */
    const d = snapPoint(v(4.5, 0.05), null);
    t["côté non doublé · le bout se pose sur la face (0,10)"] = pres(d.p.y, 0.10); }

  /* ── et l'inverse, pour qu'aucun des deux ne soit un hasard ──────────────── */
  { const { lv } = scene({ t0: 0.5, t1: 1 });
    t["étendue inversée · côté nu à gauche"] = pres(snapPoint(v(1.5, 0.05), null).p.y, 0.10);
    t["étendue inversée · côté doublé à droite"] = pres(snapPoint(v(4.5, 0.05), null).p.y, 0.24); }

  /* ── ce qui sort dans le contrat ─────────────────────────────────────────── */
  { const { lv } = scene({ t0: 0, t1: 0.5 }); garantirPids();
    const c = contratPlan();
    t["le contrat chiffre la moitié doublée"] = pres(c.doublage.iti, 7.5); }
  /* ── une étendue LIBRE, pas seulement aux jonctions ──────────────────────
     Le mur est coupé à ses croisements ET aux bornes du doublage : un doublage peut donc
     s'arrêter contre un conduit, au milieu d'un pan, sans que la surface de la pièce mente. */
  { const nu = (() => { const { lv } = scene(null); delete lv.walls[0].iso; afterChange();
      return facesFor(lv, "projet").reduce((a, f) => a + f.areaInt, 0); })();
    const perte = (ext) => { const { lv } = scene(ext); afterChange();
      return +(nu - facesFor(lv, "projet").reduce((a, f) => a + f.areaInt, 0)).toFixed(3); };
    /* Mur du haut de 6 m, coupé en deux par une cloison de 7 cm. Ce que les PIÈCES perdent
       n'est pas la bande entière : la cloison et les murs de retour en occupent une part, et
       le polygone intérieur le sait. L'attendu tient donc compte de ces largeurs — sinon on
       vérifierait une approximation contre une autre. */
    t["étendue libre au milieu · surface exacte (bande moins la cloison)"] =
      pres(perte({ t0: 0.25, t1: 0.75 }), (3 - 0.07) * 0.14, 0.004);
    t["étendue libre courte, dans une seule pièce · surface exacte"] =
      pres(perte({ t0: 0.30, t1: 0.45 }), 0.9 * 0.14, 0.004);
    t["du coin à la cloison · surface exacte (moins l'angle et la demi-cloison)"] =
      pres(perte({ t0: 0, t1: 0.5 }), (3 - 0.10 - 0.035) * 0.14, 0.004);
    t["mur entier · surface exacte (moins les deux angles et la cloison)"] =
      pres(perte(null), (6 - 0.10 - 0.10 - 0.07) * 0.14, 0.004);
    t["le polygone de la pièce se décroche"] = (() => { const { lv } = scene({ t0: 0.3, t1: 0.45 });
      return facesFor(lv, "projet").some((f) => f.polyInt.length > 4); })(); }

  /* ── les groupes ne posent plus, ils retirent (D28 bis) ─────────────────── */
  { const { lv, haut } = scene({ t0: 0, t1: 0.5 });
    retirerIsoDesMurs([haut.id]);
    t["groupe · retirer le doublage retire tout, étendue comprise"] = isoLayers(lv.walls[0]).length === 0; }

  /* ── le geste : on étire le doublage par ses poignées ────────────────────
     Les champs « de … m / à … m » ont été retirés : on n'étend pas un doublage en tapant des
     abscisses, on le tire jusqu'à ce qu'il s'arrête au bon endroit. Le panneau ne garde qu'une
     ligne de lecture. Ce contrôle vérifie la mécanique du geste ; le glissé souris lui-même est
     vérifié à part, à la souris. */
  { const { lv, haut } = scene(null);
    sel = { kind: "wall", id: haut.id }; setTool("select");
    const G = poigneesDoublage(haut);
    t["deux poignées, une par bout"] = G.length === 2 && G[0].k === "t0" && G[1].k === "t1";
    t["les poignées sont posées sur la bande de doublage"] = (() => {
      const n = perp(norm(sub(haut.b, haut.a)));
      const d = (haut.iso.side || 1) * (faceDist(haut, haut.iso.side || 1) + doublageOf(haut.iso) / 2);
      return G.every((g) => Math.abs(((g.p.x - haut.a.x) * n.x + (g.p.y - haut.a.y) * n.y) - d) < 1e-6);
    })();
    t["sans doublage, aucune poignée"] = (() => { delete haut.iso; afterChange(); return poigneesDoublage(haut).length === 0; })(); }
  { const { lv, haut } = scene({ mode: "ite" });
    t["un ITE ne se tire pas : il est dehors, pas dans la pièce"] = poigneesDoublage(haut).length === 0; }
  { const { lv, haut } = scene(null);
    /* le bout gauche tiré jusqu'à la cloison : l'accroche doit le poser pile dessus */
    sel = { kind: "wall", id: haut.id };
    const Lw = wallLen(haut);
    const poser = (bout, t0) => { const io = haut.iso;
      const A = arretsDoublage(L(), haut); let acc = null, best = 12 / 100 / Lw;
      A.forEach((a) => { const d = Math.abs(a - t0); if (d < best) { best = d; acc = a; } });
      const tt = acc != null ? acc : t0;
      if (bout === "t0") io.t0 = tt; else io.t1 = tt; afterChange(); };
    poser("t0", 0.49);
    t["tiré près d'une jonction, le bout s'y accroche"] = pres(isoT0(haut.iso), 0.5, 1e-6); }
  /* ── un mur, plusieurs pièces, plusieurs doublages (D28 ter) ─────────────
     Un long mur longe souvent trois pièces. Une jonction avec un autre mur marque le passage
     d'une pièce à l'autre : doubler l'une ne doit rien dire des deux autres, et surtout ne pas
     effacer ce qui a été posé ailleurs sur le même mur. */
  { state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
    const nord = W([0, 0], [12, 0]); W([12, 0], [12, 4]); W([12, 4], [0, 4]); W([0, 4], [0, 0]);
    W([4, 0], [4, 4], "cloison"); W([8, 0], [8, 4], "cloison");
    setMode("projet"); afterChange();
    const m2 = () => +contratPlan().doublage.iti.toFixed(1);
    const A = arretsDoublage(lv, nord);
    t["trois pièces · quatre arrêts (0 · ⅓ · ⅔ · 1)"] = A.length === 4 && pres(A[1], 1 / 3, 1e-3) && pres(A[2], 2 / 3, 1e-3);
    const p1 = tronconDeLaPiece(nord, 0.1), p3 = tronconDeLaPiece(nord, 0.9);
    t["un clic dans la 1re pièce ne prend que son tronçon"] = pres(p1[0], 0) && pres(p1[1], 1 / 3, 1e-3);
    t["un clic dans la 3e pièce ne prend que le sien"] = pres(p3[0], 2 / 3, 1e-3) && pres(p3[1], 1);
    poserDoublage(nord, 1, p1[0], p1[1]);
    t["1re pièce doublée · 10 m² (4 m × 2,5)"] = pres(m2(), 10, 0.1);
    poserDoublage(nord, 1, p3[0], p3[1]);
    t["3e pièce doublée · 20 m², la 1re n'a pas été effacée"] = pres(m2(), 20, 0.1);
    t["deux doublages cohabitent sur la même face"] = isoLayers(nord).filter((io) => (io.side || 1) === 1).length === 2;
    t["la pièce du milieu reste nue"] = !isoOnSideAt(nord, 1, v(6, 0.05));
    poserDoublage(nord, 1, p1[0], p1[1]);
    t["repasser sur un tronçon le refait, ne l'empile pas"] = pres(m2(), 20, 0.1) && isoLayers(nord).length === 2;
    /* un mur sans jonction : le tronçon EST le mur, le clic simple garde son sens */
    const seul = lv.walls[1];
    t["mur sans jonction · le tronçon est le mur entier"] = (() => { const x = tronconDeLaPiece(seul, 0.5); return pres(x[0], 0) && pres(x[1], 1); })(); }

  /* ── la bande ne se referme pas en pointe ────────────────────────────────
     Là où un doublage s'arrête AU MILIEU d'un pan, son sommet est partagé avec une arête
     alignée et non doublée. Le bord intérieur était lu sur le polygone de la pièce, qui ne
     porte qu'un décalage par sommet : il tombait sur la face du mur et la bande finissait en
     triangle. On mesure donc l'épaisseur de la bande à ses DEUX bouts — elle doit être
     constante. */
  { state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
    const nord = W([0, 0], [12, 0]); W([12, 0], [12, 4]); W([12, 4], [0, 4]); W([0, 4], [0, 0]);
    W([4, 0], [4, 4], "cloison"); W([8, 0], [8, 4], "cloison");
    setMode("projet"); afterChange();
    poserDoublage(nord, 1, 0.20, 0.30);            /* deux bouts au milieu d'un pan */
    afterChange();
    /* On mesure la BANDE RÉELLEMENT DESSINÉE, pas le polygone de la pièce : c'est justement la
       grandeur que le correctif n'utilise plus. Le quadrilatère a quatre sommets — face/face
       puis int/int — donc ses deux bouts sont [0]-[3] et [1]-[2]. */
    const ep = (() => {
      let mini = 1e9, maxi = 0, n = 0;
      (facesCache[lv.id] || []).forEach((f) => { const N = f.poly.length;
        for (let i = 0; i < N; i++) { const B = bandeDoublage(f, i); if (!B) continue; n++;
          [dist(B.quad[0], B.quad[3]), dist(B.quad[1], B.quad[2])].forEach((d) => {
            mini = Math.min(mini, d); maxi = Math.max(maxi, d); }); } });
      return { mini, maxi, n };
    })();
    t["une bande est bien dessinée"] = ep.n > 0;
    t["la bande garde son épaisseur d'un bout à l'autre"] = pres(ep.maxi - ep.mini, 0, 0.002);
    t["l'épaisseur dessinée est celle du doublage (12 cm)"] = pres(ep.maxi, 0.12, 0.002); }

  /* ── retirer : Alt + clic enlève LE tronçon visé ─────────────────────────
     Le même outil pose et dépose — on ne change pas d'outil pour défaire ce qu'on vient de
     faire — et il enlève le tronçon sous le curseur, pas toute la face : sur un mur qui longe
     trois pièces, on en refait rarement trois. */
  { state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
    const nord = W([0, 0], [12, 0]); W([12, 0], [12, 4]); W([12, 4], [0, 4]); W([0, 4], [0, 0]);
    W([4, 0], [4, 4], "cloison"); W([8, 0], [8, 4], "cloison");
    setMode("projet"); afterChange();
    const m2 = () => +contratPlan().doublage.iti.toFixed(1);
    poserDoublage(nord, 1, 0, 1 / 3); poserDoublage(nord, 1, 2 / 3, 1);
    t["deux tronçons posés · 20 m²"] = pres(m2(), 20, 0.1);
    t["retirer vise le tronçon sous le curseur"] = retirerDoublageAu(nord, 1, 0.1) && pres(m2(), 10, 0.1);
    t["les autres tronçons sont intacts"] = isoLayers(nord).length === 1 && !!isoOnSideAt(nord, 1, v(10, 0.05));
    t["là où il n'y a rien, on ne retire rien"] = retirerDoublageAu(nord, 1, 0.5) === false;
    t["retirer le dernier vide le mur"] = retirerDoublageAu(nord, 1, 0.9) && pres(m2(), 0, 0.01) && isoLayers(nord).length === 0; }

  return t;
});
/* ── et le vrai geste, à la souris ───────────────────────────────────────────
   Le reste vérifie la mécanique ; ici on tire réellement la poignée, parce que c'est ce que
   fait l'utilisateur et que c'est là que se cachent les surprises (cible manquée, accroche qui
   ne prend pas, tracé qui ne suit pas). */
/* Page rechargée : les blocs précédents ont changé de vue, de niveau et de panneau, et la
   transformation écran n'est plus celle d'un démarrage. Un test qui vise des pixels doit partir
   d'un écran propre — sinon il rate la poignée de vingt pixels et accuse le produit. */
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));
await p.evaluate(() => {
  closeWelcome("blank");
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
  const h = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]); W([3, 0], [3, 4], "cloison");
  h.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 };
  /* On repart de la vue Existant : le bloc précédent laisse la scène en Projet, et une poignée
     ne se tire pas dans la même vue selon l'état du doublage. */
  afterChange(); setTool("select"); sel = { kind: "wall", id: h.id };
  settings.grid = false; settings.cotes = false; fitView(); renderPanel(); draw();
});
/* Les coordonnées écran sont relues DANS UN SECOND TEMPS : `renderPanel()` change la largeur du
   volet selon ce qu'il affiche, donc la taille du canevas et la transformation écran. Les lire
   dans le même tour que le rendu donnait des points périmés d'une vingtaine de pixels — le clic
   tombait à côté de la poignée, et le contrôle accusait le produit d'un défaut qui était le sien. */
await new Promise((r) => setTimeout(r, 120));
const co = await p.evaluate(() => {
  const h = L().walls[0];
  draw();
  const G = poigneesDoublage(h); const r = document.getElementById("cv").getBoundingClientRect();
  const P = (x, y) => { const s = S(v(x, y)); return { x: r.left + s.x, y: r.top + s.y }; };
  return { droite: { x: r.left + G[1].s.x, y: r.top + G[1].s.y }, cible: P(3, 0), loin: P(1.8, 0) };
});
await p.mouse.move(co.droite.x, co.droite.y);
await p.mouse.down();
for (let i = 1; i <= 6; i++) await p.mouse.move(co.droite.x + (co.cible.x - co.droite.x) * i / 6, co.droite.y);
await p.mouse.up();
const souris = await p.evaluate(() => {
  const w = L().walls[0], q = quantities();
  const pr = (x, y) => Math.abs(x - y) < 0.02;
  return {

    "à la souris · la poignée tirée sur la cloison s'y accroche": pr(isoT1(w.iso), 0.5),
    "à la souris · la quantité tombe à 7,5 m²": pr(q.doublage.iti, 7.5),
    "à la souris · une seule pièce a rétréci": (() => {
      const a = facesFor(L(), "projet").map((f) => f.areaInt).sort((x, y) => x - y);
      return a.length === 2 && a[1] - a[0] > 0.3;
    })(),
  };
});
await b.close();

Object.assign(res, souris);

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un doublage peut ne couvrir qu'une partie de son mur");
process.exit(echecs.length || errs.length ? 1 : 0);
