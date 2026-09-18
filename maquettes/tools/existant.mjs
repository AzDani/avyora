/**
 * Contrôle : décrire l'existant reste possible quand le projet le transforme.
 *
 * Deux cas que le plan ne savait pas dire, tous deux signalés sur un vrai plan :
 *   — un garage sans communication intérieure mais avec sa propre porte extérieure ;
 *   — un volume de grande hauteur dans lequel le projet crée un plancher : la pièce ne fait pas
 *     la même hauteur avant et après, et une seule valeur ne peut pas dire les deux.
 *
 *   node maquettes/tools/existant.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/existant.mjs <dossier maquettes>"); process.exit(2); }

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
  const texte = (lv) => planChecks(lv).map((c) => c.msg.replace(/<[^>]+>/g, ""));

  /* ── le garage sans communication intérieure ────────────────────────────── */
  const maison = () => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
    const nord = W([0, 0], [8, 0]); const est = W([8, 0], [8, 5]); W([8, 5], [0, 5]); W([0, 5], [0, 0]);
    W([5, 0], [5, 5]);                                   /* refend plein : aucune communication */
    afterChange();
    lv.openings.push({ id: uid(), wallId: nord.id, type: "porte_entree", t: 0.25, w: 0.9, h: 2.15, side: 1 });
    const gar = facesFor(lv, "existant").map((f) => f.room).find((r) => r && r.anchor.x > 5);
    if (gar) gar.type = "garage";
    afterChange();
    return { lv, est };
  };
  { const { lv } = maison();
    t["sans aucune porte, le garage est signalé inaccessible"] = texte(lv).some((m) => /inaccessible/.test(m)); }
  { const { lv } = maison();
    t["le message dit qu'une porte extérieure compte"] = texte(lv).some((m) => /inaccessible/.test(m) && /mur extérieur compte/.test(m)); }
  { const { lv, est } = maison();
    lv.openings.push({ id: uid(), wallId: est.id, type: "porte_entree", t: 0.5, w: 0.9, h: 2.15, side: 1 });
    afterChange();
    t["une porte de service extérieure lève l'alerte"] = !texte(lv).some((m) => /inaccessible/.test(m)); }

  /* ── le volume de grande hauteur coupé par un plancher neuf ─────────────── */
  const volume = () => {
    state = blankState(); const lv = L(); lv.height = 2.5;
    const W = (a, c) => lv.walls.push({ id: uid(), a: v(...a), b: v(...c), type: "mur" });
    const P = [[0, 0], [6, 0], [6, 5], [0, 5]];
    for (let i = 0; i < P.length; i++) W(P[i], P[(i + 1) % P.length]);
    afterChange();
    const r = lv.rooms[0]; r.type = "sejour";
    addLevel("empty"); const haut = L(); haut.neuf = true; haut.plancher = "bois";
    setLevel(0); afterChange();
    return { lv, haut, r };
  };
  { const { lv } = volume();
    t["le plan rappelle d'indiquer la hauteur d'origine"] = texte(lv).some((m) => /hauteur avant travaux/.test(m)); }
  { const { lv, r } = volume();
    r.hAvant = 5.5; afterChange();
    t["une fois indiquée, le rappel disparaît"] = !texte(lv).some((m) => /hauteur avant travaux/.test(m));
    setMode("existant"); afterChange();
    t["en Existant, la pièce fait sa hauteur d'origine"] = Math.abs(roomHeight(lv, r) - 5.5) < 1e-9;
    setMode("projet"); afterChange();
    t["en Projet, elle fait sa hauteur d'après travaux"] = Math.abs(roomHeight(lv, r) - 2.5) < 1e-9;
    t["sans hauteur d'origine, rien ne change (non-régression)"] = (() => { const q = { ...r }; delete q.hAvant; return roomHeight(lv, q, "existant") === 2.5; })(); }

  /* ── ce que le contrat en dit ───────────────────────────────────────────── */
  { const { lv, r } = volume(); r.hAvant = 5.5; afterChange(); garantirPids();
    const c = contratPlan();
    t["contrat en 1.6.0"] = c.contrat === "1.6.0";
    const piece = c.detailNiveaux[0].rooms.find((x) => x.hauteurAvant);
    t["le contrat porte les deux hauteurs"] = !!piece && piece.hauteurAvant === 5.5 && piece.hauteur === 2.5;
    t["l'étage créé est signalé, avec son plancher"] = c.detailNiveaux[1].neuf === true && c.detailNiveaux[1].plancher === "bois"; }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ l'existant reste descriptible");
process.exit(echecs.length || errs.length ? 1 : 0);
