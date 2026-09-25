/**
 * Contrôle : la toiture suit l'emprise RÉELLE des murs.
 *
 * Elle était calculée sur le rectangle enveloppe : un plan en L payait la couverture de son
 * creux. Deux exigences opposées se croisent ici — sur un rectangle, les chiffres ne doivent pas
 * bouger d'un centimètre (sinon c'est une régression de prix silencieuse) ; sur tout le reste,
 * ils doivent enfin coller au plan.
 *
 * D47 : l'état décrit de la toiture est un constat — il conseille, il ne commande aucun travaux.
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
  /* D50 (cj-pro08) : une cloison qui touche deux façades ajoute des sommets ALIGNÉS au contour — toujours un rectangle */
  { const lv = L(); lv.walls.push({ id: uid(), a: v(3, 0), b: v(3, 4), type: "cloison" }); lv.walls.push({ id: uid(), a: v(0, 2), b: v(3, 2), type: "cloison" }); afterChange();
    const R = toitureRect(); t["rectangle recoupé de cloisons en façade · aucun avertissement « plan non rectangulaire »"] = R.compose === false && R.poly.length > 4 && toitureGeo().compose === false; }

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
  /* ── un étage qui ne couvre pas tout : deux parties de toiture ───────────── */
  {
    state = blankState(); const bas = L(); bas.height = 2.5;
    const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const P = [[0, 0], [12, 0], [12, 7.5], [0, 7.5]];          /* 90 m² au sol */
    for (let i = 0; i < P.length; i++) W(bas, P[i], P[(i + 1) % P.length]);
    afterChange(); addLevel("empty"); const haut = L(); haut.height = 2.5;
    const Q = [[0, 0], [8, 0], [8, 7.5], [0, 7.5]];            /* 60 m² à l'étage */
    for (let i = 0; i < Q.length; i++) W(haut, Q[i], Q[(i + 1) % Q.length]);
    afterChange(); setToiture("init", "");
    const g = toitureGeo();
    t["deux niveaux · deux parties de toiture"] = g.parties.length === 2;
    t["deux niveaux · l'emprise couvre TOUT le sol (93,9 m²)"] = pres(g.emprise, 93.9, 0.2);
    t["la partie basse existe et vaut ~30,8 m² d'emprise"] = pres(g.parties[1].emprise, 30.8, 0.2) && !g.parties[1].principale;
    t["la surface totale additionne les deux (122,6 m²)"] = pres(g.surface, 122.6, 0.3);
    t["sans elle, il manquait 38 m² de couverture"] = g.surface - g.parties[0].surface > 36;
    /* garde-fou d'ordre de grandeur : le débord et la pente majorent l'emprise, jamais au-delà
       de moitié. Le double comptage se voyait d'abord là — 207 m² pour 94 m² d'emprise. */
    t["la surface reste plausible face à l'emprise"] = g.surface < g.emprise * 1.5;
    t["la partie basse est en appentis par défaut"] = g.parties[1].forme === "mono";
    /* elle a sa propre forme et sa propre pente */
    setToitPartie(0, "forme", "plat");
    const g2 = toitureGeo();
    t["partie basse en toit plat · plus de coefficient de pente"] = pres(g2.parties[1].surface, 33.2, 0.3) && g2.parties[1].pente === 0;
    setToitPartie(0, "forme", "mono"); setToitPartie(0, "pente", 10);
    t["partie basse à 10° · surface recalculée"] = pres(toitureGeo().parties[1].surface, 33.2 / Math.cos(10 * Math.PI / 180), 0.3);
    /* et le plan le signale au niveau concerné */
    setLevel(0);
    t["le plan signale la toiture basse sur son niveau"] = planChecks(L()).some((c) => /toiture plus basse/.test(c.msg));
    setLevel(1);
    t["il ne le signale pas sur le niveau du haut"] = !planChecks(L()).some((c) => /toiture plus basse/.test(c.msg));
  }
  {
    /* un étage qui couvre TOUT : une seule partie, rien ne change */
    state = blankState(); const bas = L(); bas.height = 2.5;
    const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const P = [[0, 0], [6, 0], [6, 4], [0, 4]];
    for (let i = 0; i < P.length; i++) W(bas, P[i], P[(i + 1) % P.length]);
    afterChange(); addLevel("copy"); afterChange(); setToiture("init", "");
    const g = toitureGeo();
    t["étage de même emprise · une seule partie"] = g.parties.length === 1;
    t["étage de même emprise · surface inchangée (37,7 m²)"] = pres(g.surface, 37.7);
  }
  /* ── les deux pièges qui faisaient compter la toiture deux fois ─────────── */
  const deuxNiveaux = (avant) => {
    state = blankState(); const bas = L(); bas.height = 2.5;
    const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const bo = (l, x, y) => { const P = [[0, 0], [x, 0], [x, y], [0, y]]; for (let i = 0; i < P.length; i++) W(l, P[i], P[(i + 1) % P.length]); };
    bo(bas, 12, 7.5); afterChange();
    avant(addLevel, bo, W);
    afterChange(); setToiture("init", "");
    return toitureGeo();
  };
  { /* un niveau intermédiaire vide ne couvre rien : le niveau du dessous ne doit PAS se croire
       entièrement à découvert, sinon la toiture sort au double de l'emprise */
    const g = deuxNiveaux((add, bo) => { add("empty"); add("empty"); bo(L(), 8, 7.5); });
    t["niveau vide au milieu · emprise juste (93,9 m²)"] = pres(g.emprise, 93.9, 0.3);
    t["niveau vide au milieu · surface juste (122,6 m²)"] = pres(g.surface, 122.6, 0.3);
    t["niveau vide au milieu · pas de double comptage"] = g.surface < g.emprise * 1.5; }
  { /* un étage dont les murs ne se ferment pas : même piège, l'emprise retombe sur le rectangle
       enveloppe au lieu de valoir zéro */
    const g = deuxNiveaux((add, bo, W) => { add("empty"); W(L(), [0, 0], [8, 0]); W(L(), [8, 0], [8, 7.5]); });
    t["étage non fermé · emprise juste (~94 m²)"] = pres(g.emprise, 94, 1);
    t["étage non fermé · pas de double comptage"] = g.surface < g.emprise * 1.5; }
  /* ── ce qui est surligné EST ce qui est compté ───────────────────────────
     Le contrôle le plus utile du lot : une surface calculée par soustraction d'aires ne se
     vérifie pas en la lisant. On compare donc l'aire du polygone effectivement tracé — contour
     extérieur moins trou — à celle que le chiffrage retient. Un écart, et le surlignage
     montrerait autre chose que la facture. */
  {
    const aireDessinee = (pa) => Math.abs(polyArea(pa.poly)) - (pa.couvrePoly ? Math.abs(polyArea(pa.couvrePoly)) : 0);
    const verifie = (nom, monter) => {
      state = blankState(); const bas = L(); bas.height = 2.5;
      const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
      const bo = (l, pts) => { for (let i = 0; i < pts.length; i++) W(l, pts[i], pts[(i + 1) % pts.length]); };
      monter(bo, W);
      afterChange(); setToiture("init", "");
      const P = partiesToiture();
      const ok = P.length > 0 && P.every((pa) => {
        const dessine = aireDessinee(pa);
        const compte = pa.surface * Math.cos(pa.pente * Math.PI / 180);
        return Math.abs(dessine - compte) < 0.12;
      });
      t[`ce qui est surligné est ce qui est compté · ${nom}`] = ok;
    };
    verifie("étage plus petit", (bo) => { bo(L(), [[0, 0], [12, 0], [12, 7.5], [0, 7.5]]); afterChange(); addLevel("empty"); bo(L(), [[0, 0], [8, 0], [8, 7.5], [0, 7.5]]); });
    verifie("niveau unique", (bo) => { bo(L(), [[0, 0], [6, 0], [6, 4], [0, 4]]); });
    verifie("rez en L", (bo) => { bo(L(), [[0, 0], [12, 0], [12, 4], [6, 4], [6, 7.5], [0, 7.5]]); afterChange(); addLevel("empty"); bo(L(), [[0, 0], [6, 0], [6, 7.5], [0, 7.5]]); });
    verifie("trois niveaux en retrait", (bo) => { bo(L(), [[0, 0], [12, 0], [12, 7.5], [0, 7.5]]); afterChange(); addLevel("empty"); bo(L(), [[0, 0], [9, 0], [9, 7.5], [0, 7.5]]); afterChange(); addLevel("empty"); bo(L(), [[0, 0], [5, 0], [5, 7.5], [0, 7.5]]); });
  }
  /* ── le bouton « voir » existe dans TOUTES les vues ──────────────────────
     Il n'était écrit que dans le formulaire Existant déplié : replié, en Projet ou en Final, la
     partie haute n'avait aucun bouton alors que les parties basses en avaient un partout. Un
     panneau se rend dans quatre états, et un bloc ajouté dans un seul n'existe que là. */
  {
    state = blankState(); const bas = L(); bas.height = 2.5;
    const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const bo = (l, pts) => { for (let i = 0; i < pts.length; i++) W(l, pts[i], pts[(i + 1) % pts.length]); };
    bo(bas, [[0, 0], [12, 0], [12, 7.5], [0, 7.5]]); afterChange();
    addLevel("empty"); bo(L(), [[0, 0], [8, 0], [8, 7.5], [0, 7.5]]); afterChange(); setToiture("init", "");
    const rendu = (niv, md, open) => { setLevel(niv); setMode(md); closeModal(); toitOpen = !!open; return renderToiture(L()); };
    const boutons = (h) => (h.match(/setToitVu\(/g) || []).length;
    const vues = [["existant replié", 1, "existant", false], ["existant déplié", 1, "existant", true],
                  ["projet", 1, "projet", false], ["final", 1, "final", false]];
    for (const [nom, niv, md, open] of vues) {
      const h = rendu(niv, md, open);
      t[`dernier niveau · les deux parties sont inspectables en vue ${nom}`] = boutons(h) === 2 && /Partie haute/.test(h);
    }
    t["niveau bas · sa partie est inspectable"] = boutons(rendu(0, "existant", false)) === 1;
    setMode("existant");
  }
  /* ── l'étiquette se pose DANS la zone qu'elle désigne ────────────────────
     Elle était ancrée sur la moyenne des sommets du contour extérieur : dès que la zone comptée
     est un anneau ou un L, ce point tombe dans le trou, et « toiture basse · 44 m² » s'affichait
     à côté de sa zone, dans la pièce voisine. Une étiquette qui désigne autre chose qu'elle-même
     est pire qu'une absence d'étiquette. */
  {
    const W = (l, a, c) => l.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const bo = (l, pts) => { for (let i = 0; i < pts.length; i++) W(l, pts[i], pts[(i + 1) % pts.length]); };
    const pose = (nom, bas, haut) => {
      state = blankState(); L().height = 2.5; bo(L(), bas); afterChange();
      if (haut) { addLevel("empty"); bo(L(), haut); afterChange(); }
      setToiture("init", "");
      const P = partiesToiture();
      const ok = P.length > 0 && P.every((pa) => {
        const a = ancrePartie(pa);
        const trou = pa.couvrePoly && pa.couvrePoly.length >= 3 ? pa.couvrePoly : null;
        return pointIn(a, pa.poly) && !(trou && pointIn(a, trou));
      });
      t[`l'étiquette se pose dans sa zone · ${nom}`] = ok;
    };
    pose("bande sur un côté", [[0, 0], [12, 0], [12, 7.5], [0, 7.5]], [[0, 0], [8, 0], [8, 7.5], [0, 7.5]]);
    pose("anneau (étage au milieu)", [[0, 0], [12, 0], [12, 9], [0, 9]], [[2, 2], [10, 2], [10, 7], [2, 7]]);
    pose("rez en L", [[0, 0], [12, 0], [12, 4], [6, 4], [6, 7.5], [0, 7.5]], [[0, 0], [6, 0], [6, 7.5], [0, 7.5]]);
    pose("niveau unique", [[0, 0], [6, 0], [6, 4], [0, 4]], null);
  }

  /* ── D47 (cj-pro04, cj-qa07) : l'état décrit ne commande aucun travaux ───────────────────
     Un constat (« couverture à refaire ») devenait une réfection chiffrée, jusqu'à 37 000 €, sans
     décision. Il reste un conseil : à décider, adoptable d'un clic en vue Travaux. */
  {
    state = blankState(); L().height = 2.5; chantier().bien = "maison";
    [[0, 0, 8, 0], [8, 0, 8, 6], [8, 6, 0, 6], [0, 6, 0, 0]].forEach(([a, b2, c, d]) => L().walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
    afterChange(); setTool("select"); setToiture("init", "");
    const toit = () => chantierTasks().filter((x) => x.id.startsWith("toit:")).map((x) => x.id);
    const adec = () => elementsATrancher().filter((a) => a.kind === "toit");
    let ok = true;
    for (const [k, val] of [["etatCouv", "mousse"], ["etatCouv", "refaire"], ["etatCharp", "traiter"], ["etatCharp", "refaire"]]) {
      setToiture(k, val); ok = ok && chantierPrix().total === 0 && !toit().length && state.toiture.projet.action === "rien" && !state.toiture.projet.traiterCharpente;
    }
    t["état décrit (mousse, à refaire, à traiter) : 0 €, aucune tâche, action « rien »"] = ok;
    t["… la toiture est « à décider », avec le conseil"] = adec().length === 1 && /toiture complète/i.test(adec()[0].aide);
    t["… le contrat n'émet aucune action"] = contratPlan().toiture.projet.action === "rien";
    setMode("projet"); closeModal(); sel = null; state.cur = 0; renderPanel();
    const btns = [...document.querySelectorAll("#pbody button")].map((x) => x.textContent);
    t["vue Travaux : le conseil se retient d'un bouton, ou se refuse"] = btns.some((x) => /Retenir : toiture complète/.test(x)) && btns.some((x) => /Je n'y touche pas/.test(x)) && !document.querySelector("#pbody .seg button.on[onclick*=\"p.action\"]");
    setToiture("p.action", "complete");
    t["retenu : la toiture complète est comptée, plus rien à décider"] = toit().includes("toit:complete") && !adec().length && state.toiture.projet.manuel === true;
    setToiture("p.action", "rien"); setToiture("etatCharp", "bon"); setToiture("etatCouv", "mousse");
    t["« Rien » choisi : décidé, même si l'état change ensuite"] = !toit().length && !adec().length;
    /* un plan d'avant D47 dont l'action venait de l'état (manuel faux) repart sur « Rien » */
    const leg = { levels: [], toiture: { etatCouv: "refaire", etatCharp: "traiter", projet: { action: "refection", traiterCharpente: true, manuel: false } } };
    migrerEtat(leg);
    const choisi = { levels: [], toiture: { etatCouv: "refaire", etatCharp: "bon", projet: { action: "refection", manuel: true } } };
    migrerEtat(choisi);
    t["plan d'avant : l'action déduite de l'état repart sur « Rien », un choix fait reste"] = leg.toiture.projet.action === "rien" && !leg.toiture.projet.traiterCharpente && choisi.toiture.projet.action === "refection";
  }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ la toiture suit l'emprise réelle");
process.exit(echecs.length || errs.length ? 1 : 0);
