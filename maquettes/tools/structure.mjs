/**
 * Contrôle : poteaux et poutres dessinés, et jamais comptés deux fois.
 *
 * Une poutre n'existait que comme ligne induite par la démolition d'un mur porteur. Maintenant
 * qu'on peut en dessiner une, le vrai risque est là : une poutre tracée le long du mur qu'elle
 * reprend ne doit PAS s'ajouter à la ligne induite — c'est la même poutre.
 *
 *   node maquettes/tools/structure.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/structure.mjs <dossier maquettes>"); process.exit(2); }

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
  const boite = () => { state = blankState(); setMode("projet"); const lv = L(); lv.height = 2.5;
    const P = [[0,0],[6,0],[6,4],[0,4]];
    for (let i = 0; i < P.length; i++) lv.walls.push({ id: uid(), a: v(...P[i]), b: v(...P[(i+1)%P.length]), type: "mur" });
    return lv; };
  const pose = (lv, type, x, y, w, rot, mat) => { const d = ITEMS[type];
    const it = { id: uid(), type, x, y, w: w ?? d.w, h: d.h, rot: rot || 0, st: "creer" };
    if (mat) it.materiau = mat; lv.items.push(it); afterChange(); return it; };
  const ligne = (id) => chantierTasks().find((x) => x.id === id);
  const prix = (id) => { const l = ligne(id); return l ? Math.round(l.prix) : null; };

  /* ── la poutre se chiffre au mètre de portée, selon son matériau ────────── */
  { const lv = boite(); const it = pose(lv, "poutre", 3, 2, 4, 0);
    t["poutre acier 4 m → 1 920 € (4 × 480)"] = prix("i:" + it.id + ":poutre") === 1920;
    t["la poutre va au lot Maçonnerie"] = ligne("i:" + it.id + ":poutre").lot === "Maçonnerie";
    setItemChoix; sel = { kind: "item", id: it.id }; multi = [it.id]; it.materiau = "bois"; afterChange();
    t["poutre lamellé-collé 4 m → 760 € (4 × 190)"] = prix("i:" + it.id + ":poutre") === 760;
    it.materiau = "beton"; afterChange();
    t["poutre béton 4 m → 1 040 € (4 × 260)"] = prix("i:" + it.id + ":poutre") === 1040; }

  /* ── le poteau se chiffre à l'unité, quelle que soit sa hauteur ─────────── */
  { const lv = boite(); const it = pose(lv, "poteau", 3, 2);
    t["poteau acier → 550 € l'unité"] = prix("i:" + it.id + ":poteau") === 550;
    it.materiau = "bois"; afterChange();
    t["poteau bois → 350 € l'unité"] = prix("i:" + it.id + ":poteau") === 350; }

  /* ── le cœur : pas deux fois la même poutre ─────────────────────────────── */
  { const lv = boite();
    const refend = { id: uid(), a: v(3, 0), b: v(3, 4), type: "mur", st: "demolir" };
    lv.walls.push(refend); afterChange();
    const induite = "w:" + refend.id + ":poutre";
    t["mur porteur démoli seul → poutre de reprise induite"] = prix(induite) === Math.round(4 * PRIX.poutreReprise);
    t["et l'étude de structure est exigée"] = !!ligne("etude:structure");
    /* on dessine la poutre pile sur ce mur : même ouvrage */
    const it = pose(lv, "poutre", 3, 2, 4, Math.PI / 2);
    t["poutre dessinée dessus → la ligne induite disparaît"] = prix(induite) === null;
    t["seule la poutre dessinée est chiffrée"] = prix("i:" + it.id + ":poutre") === 1920;
    t["l'étude de structure reste exigée"] = !!ligne("etude:structure");
    /* déplacée à l'écart, elle ne reprend plus rien : les deux lignes coexistent */
    it.x = 1; it.rot = 0; afterChange();
    t["poutre éloignée → la ligne induite revient"] = prix(induite) === Math.round(4 * PRIX.poutreReprise);
    t["et la poutre dessinée reste chiffrée à part"] = prix("i:" + it.id + ":poutre") === 1920; }

  /* ── ce qui sort dans le contrat ────────────────────────────────────────── */
  { const lv = boite();
    const refend = { id: uid(), a: v(3, 0), b: v(3, 4), type: "mur", st: "demolir" };
    lv.walls.push(refend); afterChange();
    pose(lv, "poutre", 3, 2, 4, Math.PI / 2, "acier");
    pose(lv, "poutre", 1, 1, 2, 0, "bois");
    pose(lv, "poteau", 5, 3, null, 0, "beton");
    const c = contratPlan();
    /* pas le numéro exact — il bouge à chaque ajout — mais le minimum sous lequel l'ossature
       ne doit pas partir : c'est en 1.5 qu'elle est entrée au contrat. */
    { const [maj, min] = c.contrat.split(".").map(Number);
      t["l'ossature ne part pas sous un contrat antérieur à 1.5"] = maj === 1 && min >= 5; }
    const o = c.ossature;
    t["ossature · 2 poutres, 1 poteau"] = o.poteaux === 1 && o.poutres === 2;
    t["ossature · 6,00 ml de poutre"] = Math.abs(o.mlPoutres - 6) < 1e-6;
    t["ossature · 1 seule poutre de reprise"] = o.poutresDeReprise === 1;
    const eqs = c.detailNiveaux[0].equipements.filter((e) => e.ossature);
    t["chaque élément dit son rôle et son matériau"] = eqs.length === 3 && eqs.every((e) => e.ossature.role && e.materiau);
    const rep = eqs.filter((e) => !!e.ossature.reprendMurPorteur);
    t["celui qui reprend le mur porteur est signalé"] = rep.length === 1 && rep[0].ossature.portee === 4 && typeof rep[0].ossature.reprendMurPorteur === "string"; }

  /* ── le reste du plan n'a pas bougé ─────────────────────────────────────── */
  { const lv = boite(); afterChange();
    const avant = chantierPrix().total;
    pose(lv, "poutre", 3, 2, 4, 0);
    const apres = chantierPrix().total;
    t["une poutre n'ajoute QUE sa propre ligne"] = apres - avant === 1920; }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
Object.entries(res).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ poteaux et poutres : dessinés, chiffrés, jamais deux fois");
process.exit(echecs.length || errs.length ? 1 : 0);
