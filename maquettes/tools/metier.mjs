/**
 * Justesse métier (D37) : ce qu'un pro du bâtiment corrigerait en relisant le plan.
 *
 * Chaque contrôle rejoue un constat du jury : un parquet qu'on arrachait ET qu'on ponçait, un sol
 * gardé qui demandait encore une chape, un étage « béton » chiffré en bois, un doublage intérieur
 * posé dehors, un appartement à qui l'on réclamait sa toiture, un WC fondu dans un cellier, six
 * finitions de façade empilées, une cloison tracée en parpaing « porteur », une fenêtre posée sur
 * une cloison qui éclairait la pièce, une peinture introuvable.
 *
 *   node maquettes/tools/metier.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 au premier invariant rompu.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/metier.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};

/* ── 1. Le sol : ponçage, parquet neuf, sol gardé, conseils, rehausse ─────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  closeWelcome("blank"); setTool("select");
  const boite = (sol) => { state = blankState(); const lv = L(); lv.height = 2.5;
    [[0, 0, 5, 0], [5, 0, 5, 4], [5, 4, 0, 4], [0, 4, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
    afterChange(); const f = facesCache[lv.id][0]; f.room.type = "sejour"; f.room.floor = sol; setMode("projet"); closeModal(); afterChange();
    sel = { kind: "room", id: f.room.id }; renderPanel(); return f.room; };
  const ids = () => chantierTasks().map((x) => x.id.split(":")[0]);
  const panneau = () => document.getElementById("pbody").innerHTML;
  const solC = () => contratPlan().sols[0];

  /* le choix se fait DANS la ligne « Revêtement », plus dans une liste au-dessus */
  let room = boite("Parquet");
  r["fiche · plus de liste « Revêtement de sol souhaité »"] = !/Revêtement de sol souhaité/.test(panneau());
  r["fiche · le choix est dans la ligne Revêtement de l'ordre de réalisation"] = !!document.querySelector("#pbody .solstep.s-rev select");
  const opts = () => [...document.querySelectorAll("#pbody .solstep.s-rev select option")].map((o) => o.value);
  r["fiche · « Garder le sol actuel » et « Poncer » proposés sur un parquet"] = opts().includes("__garde") && opts().includes(PONCAGE);
  r["rien choisi : 0 €, 0 tâche, rien au contrat"] = chantierPrix().total === 0 && contratPlan().sols.length === 0;
  r["rien choisi : pas de chape « à choisir » dans la pile"] = !solPlan(room).steps.some((s) => s.k === "chape");

  /* pro02 : poncer n'est pas arracher */
  setRoomRevetement(PONCAGE);
  r["ponçage : une seule tâche, sans dépose ni plinthes"] = JSON.stringify(ids()) === JSON.stringify(["sol-rev"]) && /Poncer et vitrifier/.test(chantierTasks()[0].label);
  r["ponçage : au prix du ponçage"] = Math.abs(chantierTasks()[0].prix - areaNet(L(), facesCache[L().id][0]) * PRIX.poncageParquet) < 0.01;
  r["ponçage : le contrat dit poncage, sans dépose"] = solC().poncage === true && solC().depose === false && solC().revetement === "Parquet";
  room.sol = { chape: "tradi", ragreage: true }; afterChange();
  r["ponçage : une chape restée cochée ne se compte pas"] = !ids().includes("sol-chape") && !ids().includes("sol-rag") && solC().chape === null;
  setRoomRevetement("Parquet");
  r["« Parquet » sur un parquet : dépose + parquet neuf + plinthes"] = ids().includes("sol-depose") && ids().includes("sol-rev") && ids().includes("plinthes") && /parquet neuf/.test(chantierTasks().find((x) => x.id.startsWith("sol-rev")).label);
  r["parquet neuf : le contrat dit dépose, sans ponçage"] = solC().poncage === false && solC().depose === true;
  room = boite("Carrelage");
  r["pas de ponçage proposé sur un carrelage"] = !opts().includes(PONCAGE);

  /* pro15 : garder est une décision */
  room.sol = { chape: "tradi" }; afterChange();
  setRoomRevetement("__garde");
  const sp = solPlan(room);
  r["sol gardé : la pile dit « conservé », sans rien à choisir"] = sp.garde && !sp.steps.some((s) => s.state === "choice" || s.k === "chape") && sp.steps.some((s) => s.state === "garde");
  r["sol gardé : 0 tâche, rien au contrat, la chape oubliée est effacée"] = chantierTasks().length === 0 && contratPlan().sols.length === 0 && !room.sol;
  r["sol gardé : Estimer ne réclame plus le sol"] = !couvertureManquante(quantities()).some((a) => a[0] === "Sol");
  setRoomRevetement("");
  r["repassé à « À choisir » : Estimer le réclame"] = couvertureManquante(quantities()).some((a) => a[0] === "Sol");

  /* conseils honnêtes : « sur dalle » seulement sur une dalle, ragréage après une dépose */
  setRoomRevetement("Carrelage");
  const s2 = solPlan(room);
  r["carrelage sur carrelage : pas de « conseillée sur une dalle »"] = !s2.steps.some((s) => /dalle/.test(s.detail || ""));
  r["après une dépose : ragréage conseillé, pas compté"] = s2.steps.some((s) => s.k === "rag" && s.state === "conseil") && !ids().includes("sol-rag");
  room = boite("Dalle béton brute"); setRoomRevetement("Carrelage");
  r["sur dalle brute : chape conseillée"] = solPlan(room).steps.some((s) => s.k === "chape" && s.state === "conseil");

  /* pro22 : la rehausse se dit, et se contrôle */
  setRoomSol("chape", "tradi"); setRoomSol("iso", "on"); setRoomSol("isoe", 80);
  r["rehausse : isolant 8 + chape 5 = 13 cm"] = Math.abs(solRehausse(room) - 0.13) < 1e-9 && /Le sol monte d'environ <b>13 cm/.test(panneau());
  setRoomSol("chapee", 7);
  r["rehausse : l'épaisseur de chape se règle"] = Math.abs(solRehausse(room) - 0.15) < 1e-9;
  L().height = 2.3; afterChange();
  r["rehausse : sous 2,20 m, le plan alerte"] = planChecks(L()).some((c) => /le sol monte/.test(c.msg));
  L().height = 2.5; afterChange();
  r["rehausse : à 2,35 m, pas d'alerte"] = !planChecks(L()).some((c) => /le sol monte/.test(c.msg));

  /* migration : un ancien « Parquet » sur parquet voulait dire « poncer » (D8) */
  { const st = blankState(); st.levels[0].rooms = [{ id: "x", type: "sejour", name: "", floor: "Parquet ancien", floorNew: "Parquet", sol: { chape: "tradi" }, anchor: v(0, 0) }];
    migrerSols(st); const x = st.levels[0].rooms[0];
    r["migration : l'ancien « Parquet » sur parquet devient le ponçage, sans chape"] = x.floorNew === PONCAGE && !x.sol; }
  return r;
}));

/* ── 2. pro03 : le plancher d'un étage créé ─────────────────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  state = blankState(); const lv = L(); lv.height = 2.5;
  [[0, 0, 6, 0], [6, 0, 6, 5], [6, 5, 0, 5], [0, 5, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
  afterChange(); setMode("projet"); closeModal(); addLevel("plancher");
  const haut = L(), room = facesFor(haut, "projet")[0].room;
  setLevelProp("plancher", "beton");
  const pl = () => chantierTasks().find((x) => x.id.startsWith("sol-plancher"));
  r["niveau « Béton » : ses pièces passent en plancher béton"] = room.plancherNeuf === "beton" && /plancher béton/i.test(pl().label) && pl().lot === "Maçonnerie";
  r["niveau « Béton » : le contrat dit béton"] = contratPlan().detailNiveaux[1].rooms[0].plancherACreer === "beton";
  setLevelProp("plancher", "bois");
  r["niveau « Bois » : plancher bois"] = room.plancherNeuf === "bois" && /plancher bois/i.test(pl().label);
  room.floorNew = "Carrelage"; room.sol = { chape: "tradi", iso: { mat: "pu", e: 0.08 } }; afterChange();
  const sp = solPlan(room);
  r["plancher bois : ni chape ciment ni isolant sous chape"] = !sp.steps.some((s) => s.k === "chape" || s.k === "iso") && !chantierTasks().some((x) => /^sol-(chape|iso):/.test(x.id));
  setTool("select"); sel = { kind: "room", id: room.id }; renderPanel();
  r["plancher bois : la fiche le dit"] = /pas de chape ciment/.test(document.getElementById("pbody").innerHTML);
  return r;
}));

/* ── 3. pro04 : la bonne isolation sur la bonne face ────────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal();
  const w = L().walls[0], si = interiorSideN(w);
  DBL_CFG.mode = "iti"; poserDoublage(w, -si, 0, 1);
  r["ITI glissée côté dehors : refusée"] = isoLayers(w).length === 0;
  DBL_CFG.mode = "ite"; poserDoublage(w, si, 0, 1);
  r["ITE glissée côté pièce : refusée"] = isoLayers(w).length === 0;
  poserDoublage(w, -si, 0, 1);
  r["ITE côté dehors : posée"] = isoLayers(w).length === 1 && isoLayers(w)[0].mode === "ite";
  DBL_CFG.mode = "iti"; poserDoublage(w, si, 0, 1);
  r["ITI côté pièce : posée"] = isoLayers(w).length === 2;
  /* un plan déjà enregistré avec le défaut : le contrôle le signale */
  w.isos.push({ id: uid(), e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: -si, t0: 0, t1: 1, st: "creer" }); afterChange();
  r["plan ancien avec un doublage intérieur dehors : le contrôle le signale"] = planChecks(L()).some((c) => /posé côté dehors/.test(c.msg));
  return r;
}));

/* ── 4. pro05 / qa12 / retention10 : « Appartement » est entendu ────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal();
  const manque = () => couvertureManquante(quantities()).map((a) => a[0]);
  /* D42 : l'exemple est un appartement (vitrine sans alerte) ; on efface la réponse pour tester le cas « non dit » */
  chantier().bien = null; afterChange();
  r["bien non dit : Estimer le demande"] = manque().includes("Type de bien");
  setChantier("bien", "appartement");
  r["appartement : plus de « Toiture non décrite »"] = !planChecks(L()).some((c) => /Toiture/.test(c.msg));
  r["appartement : Estimer ne réclame ni toiture ni façade"] = !manque().includes("Charpente et couverture") && !manque().includes("Façade") && !manque().includes("Type de bien");
  sel = null; renderPanel();
  r["appartement : la fiche du niveau ne propose plus la toiture"] = !/Toiture &amp; charpente|Toiture & charpente|Décrire la toiture/.test(document.getElementById("pbody").innerHTML);
  state.toiture = { forme: "deuxpans", pente: 30, couverture: "tuile", etatCouv: "refaire", etatCharp: "bon", combles: "perdus", debord: 0.3, projet: { action: "refection" } }; afterChange();
  r["appartement : une toiture déjà saisie n'est ni comptée ni émise"] = !chantierTasks().some((x) => x.lot === "Charpente et couverture") && contratPlan().toiture === null;
  setChantier("bien", "maison");
  r["maison : la toiture revient"] = chantierTasks().some((x) => x.lot === "Charpente et couverture") && contratPlan().toiture !== null;
  return r;
}));

/* ── 5. pro13 : une démolition qui réunit WC et cellier garde le WC ─────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample();
  const types = (m) => facesFor(L(), m).map((f) => f.room.type).sort().join(",");
  const avant = types("existant");
  r["exemple · vue Travaux : la pièce fusionnée est le WC (elle contient la cuvette)"] = types("projet").includes("wc") && !types("projet").includes("cellier");
  setMode("projet"); closeModal(); setMode("existant"); setMode("projet"); closeModal(); setMode("existant");
  r["aller-retour entre les vues : l'existant garde WC et cellier"] = types("existant") === avant && avant.includes("wc") && avant.includes("cellier");
  /* des WC laissés dans une pièce « cellier » : le contrôle le dit */
  const f = facesFor(L(), "existant").find((g) => g.room.type === "cellier");
  L().items.push({ id: uid(), type: "wc", x: f.label.x, y: f.label.y, w: 0.4, h: 0.65, rot: 0 }); afterChange();
  r["des WC dans un « cellier » : le contrôle le signale"] = planChecks(L()).some((c) => /contient des WC/.test(c.msg));
  L().items.pop(); afterChange();
  return r;
}));

/* ── 6. pro11 : la façade ne s'empile pas ──────────────────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal();
  const w = L().walls[0]; sel = { kind: "wall", id: w.id };
  const fac = () => chantierTasks().filter((x) => x.id.startsWith("fac:" + w.id)).map((x) => x.id.split(":")[2]).sort().join(",");
  setWallFacade("fin", "enduit"); setWallFacade("fin", "bardage");
  r["un seul parement : le bardage remplace l'enduit"] = facadeFins(w).join(",") === "bardage" && fac() === "bardage";
  renderPanel();
  const chips = [...document.querySelectorAll("#pbody .chip2")].map((c) => c.textContent);
  r["parpaing : ni joints, ni ravalement pierre, ni enduit à la chaux proposés"] = !chips.some((c) => /Joints|Ravalement|chaux/.test(c));
  /* un plan ancien qui les empilait : seules les finitions compatibles se comptent */
  w.facade.fins = ["nettoyage", "enduit", "enduit_chaux", "peinture", "joints", "ravalement", "bardage", "hydrofuge"]; afterChange();
  r["parpaing, six finitions empilées : un parement + nettoyage, peinture, hydrofuge"] = fac() === "enduit,hydrofuge,nettoyage,peinture";
  r["le contrôle dit ce qui n'est pas compté"] = planChecks(L()).some((c) => /Façade/.test(c.msg) && /pas comptée/.test(c.msg));
  w.type = "porteur"; w.facade.fins = ["nettoyage", "joints"]; afterChange(); sel = { kind: "wall", id: w.id };
  setWallFacade("fin", "ravalement");
  r["pierre : le ravalement « tout compris » retire nettoyage et joints"] = facadeFins(w).join(",") === "ravalement" && fac() === "ravalement";
  w.type = "mur"; w.facade.fins = ["enduit", "peinture"]; afterChange();
  DBL_CFG.mode = "ite"; poserDoublage(w, -interiorSideN(w), 0, 1); DBL_CFG.mode = "iti";
  r["ITE à créer : son enduit est compris, la peinture reste"] = fac() === "peinture" && contratPlan().provenance.facades.filter((x) => x.etat === "creer").map((x) => x.label).join(",") === "Peinture";
  return r;
}));

/* ── 7. novice02 : un mur tracé après le contour est une cloison ; « porteur ? » se demande ─ */
await p.evaluate(() => { state = blankState(); afterChange(); fitView(); wallType = "mur"; customT = null; setTool("mur"); });
const P = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
for (const [x, y] of [[0, 0], [5, 0], [5, 4], [0, 4], [0, 0]]) { const q = await P(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(120); }
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["premier contour fermé : l'outil passe en cloison 7 cm"] = wallType === "cloison" && customT === null && L().walls.every((w) => w.type === "mur");
  setTool("select");
  /* un mur de 20 cm à démolir, jamais dit porteur : la question est posée */
  const lv = L(); const w = { id: uid(), a: v(2.5, 0), b: v(2.5, 4), type: "mur" }; lv.walls.push(w); afterChange();
  setMode("projet"); closeModal(); sel = { kind: "wall", id: w.id }; setWallProp("st", "demolir"); renderPanel();
  const h = () => document.getElementById("pbody").innerHTML;
  r["démolir un mur épais sans réponse : la question est posée"] = /Ce mur porte-t-il un plancher ou le toit/.test(h());
  r["… et le contrôle du plan la pose aussi"] = planChecks(L()).some((c) => /porte-t-il/.test(c.msg));
  r["… en attendant, chiffrage prudent (étude + poutre)"] = chantierTasks().some((x) => x.id === "etude:structure") && contratPlan().provenance.murs.find((m) => m.id === w.pid).porteurAVerifier === true;
  setWallProp("porteur", "nsp"); renderPanel();
  const d = chantierTasks().find((x) => x.id === "w:" + w.id + ":demolir");
  r["« Je ne sais pas » : compté porteur, « à faire vérifier par un pro »"] = isPorteur(w) && /vérifier par un pro/.test(d.detail) && !/Ce mur porte-t-il/.test(h()) && /vérifier par un pro/.test(h());
  r["« Je ne sais pas » : le contrat le dit"] = contratPlan().provenance.murs.find((m) => m.id === w.pid).porteurAVerifier === true;
  setWallProp("porteur", "non");
  r["« Non » : ni étude ni poutre, plus rien à vérifier"] = !chantierTasks().some((x) => x.id === "etude:structure" || x.id === "w:" + w.id + ":poutre") && contratPlan().provenance.murs.find((m) => m.id === w.pid).porteurAVerifier === false;
  return r;
}));

/* ── 8. novice20 : une fenêtre sur une cloison n'éclaire pas la pièce ──────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
  const sud = W([0, 0], [8, 0]); W([8, 0], [8, 4]); W([8, 4], [0, 4]); W([0, 4], [0, 0]); const clo = W([4, 0], [4, 4], "cloison");
  afterChange(); facesCache[lv.id].forEach((f) => { f.room.type = "chambre"; });
  lv.openings.push({ id: uid(), wallId: clo.id, t: 0.3, type: "porte", w: 0.83, h: 2.04, hinge: 1, side: 1 });
  lv.openings.push({ id: uid(), wallId: sud.id, t: 0.1, type: "porte", w: 0.83, h: 2.04, hinge: 1, side: 1 });
  lv.openings.push({ id: uid(), wallId: sud.id, t: 0.8, type: "porte", w: 0.83, h: 2.04, hinge: 1, side: 1 });
  afterChange();
  const sansFenetre = () => planChecks(lv).filter((c) => /pas de fenêtre/.test(c.msg)).length;
  const n0 = sansFenetre();
  lv.openings.push({ id: uid(), wallId: clo.id, t: 0.75, type: "fenetre", w: 1.2, h: 1.25, hinge: 1, side: 1 }); afterChange();
  r["fenêtre sur la cloison : les deux chambres restent « sans fenêtre »"] = n0 === 2 && sansFenetre() === 2;
  r["… et le contrôle demande si c'était une porte"] = planChecks(lv).some((c) => /Fenêtre sur un mur intérieur/.test(c.msg));
  lv.openings.push({ id: uid(), wallId: sud.id, t: 0.3, type: "fenetre", w: 1.2, h: 1.25, hinge: 1, side: 1 }); afterChange();
  r["une vraie fenêtre sur la façade éclaire sa pièce"] = sansFenetre() === 1;
  return r;
}));

/* ── 9. pro06 : la peinture se décide, pièce par pièce ─────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal();
  const f = facesFor(L(), "projet").find((g) => g.room.type === "chambre"), room = f.room;
  const px = () => chantierTasks().filter((x) => x.lot === "Peinture");
  r["peinture : rien par défaut"] = px().length === 0 && contratPlan().detailNiveaux[0].rooms.every((x) => x.peinture === null);
  sel = { kind: "room", id: room.id }; setRoomProp("peinture", "tout");
  const murs = wallPaintArea(L(), f, "projet"), plaf = f.areaInt - tremieArea(L(), f);
  r["murs + plafond : deux tâches au lot Peinture, au prix du catalogue"] = px().length === 2 &&
    Math.abs(px().find((x) => /murs/.test(x.label)).prix - murs * PRIX.peintureMurs) < 0.01 && Math.abs(px().find((x) => /plafond/.test(x.label)).prix - plaf * PRIX.peinturePlafond) < 0.01;
  const c = contratPlan().detailNiveaux[0].rooms.find((x) => x.id === room.pid);
  r["le contrat émet les m² de SA pièce"] = Math.abs(c.peinture.murs - murs) < 0.01 && Math.abs(c.peinture.plafond - plaf) < 0.01;
  setRoomProp("peinture", "plafond");
  r["plafond seul : une tâche"] = px().length === 1 && /plafond/.test(px()[0].label);
  /* la faïence décidée se retire des murs à peindre */
  const fs = facesFor(L(), "projet").find((g) => g.room.type === "sdb"); sel = { kind: "room", id: fs.room.id };
  setRoomProp("faience", ""); /* D42 : l'exemple décide déjà la faïence de la baignoire ; on part de « aucune » */
  setRoomProp("peinture", "murs"); const m0 = peintureDe(L(), fs).murs;
  setRoomProp("faience", "mi"); const m1 = peintureDe(L(), fs).murs;
  r["faïence décidée : déduite des murs à peindre"] = Math.abs(m0 - m1 - faienceDe(L(), fs).m2) < 0.01;
  setRoomProp("faience", "pleine");
  r["faïence pleine hauteur : plus de murs à peindre"] = !chantierTasks().some((x) => x.id === "peint-murs:" + fs.room.id);
  return r;
}));

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
Object.entries(t).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le plan parle comme un pro du bâtiment");
process.exit(echecs.length || errs.length ? 1 : 0);
