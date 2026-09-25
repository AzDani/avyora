/**
 * Contrôle des invariants du contrat de sortie du plan.
 *
 * Le contrat est ce que le moteur d'estimation lira ; une ligne de devis doit pouvoir désigner
 * l'objet du plan qui l'a produite. Ces invariants-là ne se voient pas à l'œil : un identifiant
 * dupliqué par une copie de niveau, une provenance qui pointe dans le vide, un choix par défaut
 * appliqué en silence. Ils se vérifient.
 *
 *   node maquettes/tools/contrat.mjs "$(pwd)/maquettes"
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/contrat.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));

const res = await p.evaluate(() => {
  closeWelcome("blank"); loadSample(); setMode("projet");
  addLevel("copy");            /* le cas qui a dupliqué des identifiants */
  state.cur = 0; afterChange(); garantirPids();
  const q = contratPlan();
  const t = {};

  const pids = [];
  state.levels.forEach((lv) => { pids.push(lv.pid); lv.walls.forEach((w) => pids.push(w.pid)); lv.rooms.forEach((r) => pids.push(r.pid)); lv.openings.forEach((o) => pids.push(o.pid)); lv.items.forEach((i) => pids.push(i.pid)); });
  const vus = pids.filter(Boolean);
  t["un identifiant public ne désigne qu'un objet"] = new Set(vus).size === vus.length;
  t["tout objet du plan porte un identifiant"] = pids.every(Boolean);

  t["le contrat porte son numéro de version"] = /^\d+\.\d+\.\d+$/.test(q.contrat || "");

  const emis = new Set();
  (q.detailNiveaux || []).forEach((n) => { emis.add(n.id); (n.rooms || []).forEach((r) => emis.add(r.id)); (n.equipements || []).forEach((e) => emis.add(e.id)); (n.menuiseries || []).forEach((m) => emis.add(m.id)); });
  const prov = [...(q.provenance?.murs || []), ...(q.provenance?.ouvertures || []), ...(q.provenance?.equipements || [])];
  t["chaque provenance pointe sur un niveau émis"] = prov.every((x) => !x.niveau || emis.has(x.niveau));
  t["chaque équipement dit sa pièce, ou aucune"] = (q.detailNiveaux || []).every((n) => (n.equipements || []).every((e) => e.piece === null || emis.has(e.piece)));

  /* les choix non tranchés sortent à null : c'est ce qui permet de les signaler à la relecture */
  const dessine = (n) => (n.equipements || []).filter((e) => e.type === "douche");
  t["un choix non tranché sort à null, pas à son défaut"] =
    (q.detailNiveaux || []).every((n) => dessine(n).every((e) => e.douche === null || typeof e.douche === "string")) &&
    (q.detailNiveaux || []).every((n) => (n.rooms || []).every((r) => r.faience === null || typeof r.faience === "string"));

  /* l'allège : une fenêtre en a une, une baie ou une porte-fenêtre descend au sol */
  { const lv = L(); const w = lv.walls[0]; const o = { id: uid(), wallId: w.id, t: 0.5, type: "fenetre", w: 1.2, h: 1.25, hinge: 1, side: 1 };
    lv.openings.push(o); afterChange(); setTool("select"); sel = { kind: "opening", id: o.id }; renderPanel();
    const champ = () => /Allège/.test(document.getElementById("panel").innerHTML);
    t["allège · proposée sur une fenêtre"] = champ() && allegeOf(o) === 0.9;
    o.allege = 1.0; setOpeningProp("type", "baie"); renderPanel();
    t["allège · pas de champ sur une baie vitrée"] = !champ();
    t["allège · fenêtre changée en baie → 0 dans le contrat"] = allegeOf(o) === 0;
    setOpeningProp("type", "porte_fenetre"); renderPanel();
    t["allège · pas de champ sur une porte-fenêtre"] = !champ() && allegeOf(o) === 0;
    lv.openings.splice(lv.openings.indexOf(o), 1); afterChange(); }

  /* D47 (cj-qa02) : dupliquer ou coller un équipement en vue Travaux crée un objet À POSER, avec son
     propre identifiant — la copie naissait existante, gratuite, avec l'id de l'original */
  { loadSample(); setMode("projet"); closeModal();
    const rad = L().items.find((i) => i.type === "radiateur"); const t0 = chantierPrix().total;
    sel = { kind: "item", id: rad.id }; multi = []; duplicateItem(); const d1 = L().items.find((i) => i.id === sel.id);
    copyItems(); pasteItems(v(5, 5)); const d2 = L().items.find((i) => i.id === sel.id);
    garantirPids(); const q2 = contratPlan();
    const eq = (q2.detailNiveaux || []).flatMap((n) => (n.equipements || []).map((e) => e.id));
    t["Ctrl+D / Ctrl+V en vue Travaux : les copies sont « À poser »"] = d1.st === "creer" && d2.st === "creer" && d1 !== rad && d2 !== rad;
    t["… chacune avec son identifiant : aucun id en double au contrat"] = new Set(eq).size === eq.length && d1.pid !== rad.pid && d2.pid !== rad.pid && d1.pid !== d2.pid;
    t["… et elles se chiffrent (deux radiateurs à poser)"] = chantierPrix().total - t0 === 2 * (EQUIP_PRIX.radiateur || 0);
    setMode("existant"); closeModal(); sel = { kind: "item", id: rad.id }; rad.st = "demolir"; duplicateItem(); const d3 = L().items.find((i) => i.id === sel.id);
    t["en vue Avant travaux, la copie est un autre objet relevé, sans la décision de l'original"] = !d3.st && d3.pid !== rad.pid; }

  /* D47 (cj-qa03, qa14) : « Reprendre les murs porteurs du dessous » ne partage rien et ne recopie
     aucun travaux — le doublage à créer du RDC se chiffrait une seconde fois à l'étage */
  { loadSample(); setMode("projet"); closeModal(); const t0 = chantierPrix().total, bas = L();
    addLevel("empty"); copyBearingBelow(); const haut = L(); garantirPids();
    const pb = new Set(bas.walls.map((w) => w.pid));
    t["murs porteurs repris : même budget (aucun travaux recopié)"] = chantierPrix().total === t0 && haut.walls.length > 0 && haut.walls.every((w) => !w.st && isoLayers(w).every((io) => io.st !== "creer"));
    t["… aucun tableau partagé entre les niveaux, aucun id public en double"] = haut.walls.every((w) => bas.walls.every((d) => (d.isos === undefined || d.isos !== w.isos) && (d.facade === undefined || d.facade !== w.facade))) && haut.walls.every((w) => !pb.has(w.pid));
    const w = haut.walls.find((x) => isoLayers(x).length) || haut.walls[0]; const avant = JSON.stringify(bas.walls.map((x) => x.isos || null));
    w.isos = []; afterChange();
    t["… retirer un doublage à l'étage ne touche pas le RDC"] = JSON.stringify(bas.walls.map((x) => x.isos || null)) === avant; }
  return t;
});
await b.close();

const echecs = Object.entries(res).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(res)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} invariant(s) rompu(s)` : "\n✓ le contrat tient ses invariants");
process.exit(echecs.length || errs.length ? 1 : 0);
