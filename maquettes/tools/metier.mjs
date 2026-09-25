/**
 * Justesse métier (D37) : ce qu'un pro du bâtiment corrigerait en relisant le plan.
 *
 * Chaque contrôle rejoue un constat du jury : un parquet qu'on arrachait ET qu'on ponçait, un sol
 * gardé qui demandait encore une chape, un étage « béton » chiffré en bois, un doublage intérieur
 * posé dehors, un appartement à qui l'on réclamait sa toiture, un WC fondu dans un cellier, six
 * finitions de façade empilées, une cloison tracée en parpaing « porteur », une fenêtre posée sur
 * une cloison qui éclairait la pièce, une peinture introuvable.
 * D46 : plinthes, peinture et faïence au pied des murs (plus à l'axe), doublage hors ouvertures,
 * hydrofuge des seules cloisons à créer, mur non porteur démoli au poste de la traduction,
 * rampants sans le débord de toit.
 * D47 : les décisions tiennent au rechargement, poser sur l'ancien sol, la faïence d'une pièce d'eau
 * refaite à décider, une fusion qui n'étend aucune décision, un passage sans menuiserie, « Couper en 2 ».
 * D48 : le type de mur se lit au tracé (cloison dans une pièce, mur de façade aligné dehors), à la
 * souris, pièce par pièce le long de la façade, et après un rechargement ; une cloison de 7 cm en
 * façade est signalée ; deux pièces du même nom sont numérotées dans le Suivi, Estimer et le dossier.
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
  r["sol gardé : la pile dit « je garde », sans rien à choisir"] = sp.garde && !sp.steps.some((s) => s.state === "choice" || s.k === "chape") && sp.steps.some((s) => s.state === "garde");
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
  /* D48 : l'outil passe en « Automatique » — un mur tracé dans une pièce sera une cloison de 7 cm */
  r["premier contour fermé : l'outil passe en type au tracé (cloison dans une pièce)"] = wallType === "auto" && customT === null && L().walls.every((w) => w.type === "mur") && typeAuTrace(L(), v(2.5, 0), v(2.5, 4)).type === "cloison";
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

/* ── 10. D46 : les quantités d'un pro — au pied des murs, hors ouvertures, sur ce qui est neuf ── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  closeWelcome("blank"); closeModal(); setTool("select");
  const boite = (type) => { state = blankState(); const lv = L(); lv.height = 2.5;
    const ws = [[0, 0, 5, 0], [5, 0, 5, 4], [5, 4, 0, 4], [0, 4, 0, 0]].map(([a, b2, c, d]) => { const w = { id: uid(), a: v(a, b2), b: v(c, d), type }; lv.walls.push(w); return w; });
    afterChange(); setMode("projet"); closeModal(); afterChange();
    const f = () => facesFor(lv, "projet").find((g) => g.room && pointIn(v(4.5, 3.5), g.poly));
    f().room.type = "chambre"; sel = { kind: "room", id: f().room.id }; return { lv, ws, f }; };
  const tache = (re) => chantierTasks().find((x) => re.test(x.id));
  const piece = (id) => contratPlan().detailNiveaux[0].rooms.find((x) => !id || x.id === id);
  const proche = (a, b2, e = 0.01) => Math.abs(a - b2) < e;

  /* cj-pro00 : plinthes, peinture, faïence au pied des murs, plus à l'axe */
  let B = boite("mur");   /* 5 × 4 à l'axe, murs de 20 cm centrés : 4,80 × 3,80 dedans */
  B.lv.openings.push({ id: uid(), wallId: B.ws[2].id, t: 0.5, type: "porte", w: 0.83, h: 2.04, hinge: 1, side: 1 }); afterChange();
  let f = B.f(); renderPanel();
  r["périmètre au pied des murs : 2 × (4,80 + 3,80) = 17,20 m (18 m à l'axe)"] = proche(f.perimInt, 17.2) && proche(f.perimReal, 18);
  r["la fiche de la pièce dit ce périmètre-là"] = /Périmètre[\s\S]{0,80}17,20 m/.test(document.getElementById("pbody").innerText);
  f.room.floor = "Parquet ancien"; setRoomRevetement("Parquet");
  r["plinthes = 2(a + b) − porte = 16,37 ml, au compteur et au contrat"] = /16,37 ml/.test(tache(/^plinthes:/)?.detail || "") && proche(piece().plinthes, 16.37) && proche(piece().perimeter, 17.2);
  setRoomProp("peinture", "murs"); f = B.f();
  const murs = 17.2 * 2.5 - 0.83 * 2.04;
  r["murs à peindre = périmètre intérieur × hauteur − ouvertures, compteur = contrat"] = proche(peintureDe(B.lv, f).murs, murs) && proche(piece().peinture.murs, murs) && proche(tache(/^peint-murs:/).prix, murs * PRIX.peintureMurs);
  B = boite("porteur");  /* murs de pierre de 60 cm : 4,40 × 3,40 dedans */
  r["murs de 60 cm : périmètre 15,60 m au pied des murs (18 m à l'axe)"] = proche(B.f().perimInt, 15.6);
  B.ws[0].iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1, st: "creer" }; afterChange();
  r["doublé : le périmètre se prend sur le doublage"] = proche(B.f().perimInt, 15.6 - 2 * doublageOf(B.ws[0].iso), 0.02);

  /* cj-pro01 : on ne pose pas d'isolant sur une fenêtre */
  B = boite("mur");
  B.lv.openings.push({ id: uid(), wallId: B.ws[0].id, t: 0.5, type: "fenetre", w: 1.2, h: 1.25, hinge: 1, side: 1 });
  B.ws[0].iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1, st: "creer" }; afterChange();
  const iso = () => chantierTasks().find((x) => x.id.startsWith("iso:")), dbl = () => contratPlan().provenance.doublages[0];
  r["doublage du mur à la fenêtre : 5 × 2,5 − 1,20 × 1,25 = 11,0 m², au Suivi et au contrat"] = /11,0 m² hors ouvertures/.test(iso().detail) && proche(iso().prix, 11 * PRIX.isoITI) && proche(dbl().m2, 11) && proche(quantities().doublage.iti, 11, 0.06);
  B.ws[0].iso.t0 = 0; B.ws[0].iso.t1 = 0.5; afterChange();
  r["doublage partiel : seule la part de la fenêtre dans le tronçon est déduite (2,5 × 2,5 − 0,60 × 1,25)"] = proche(dbl().m2, 5.5) && proche(iso().prix, 5.5 * PRIX.isoITI);
  sel = { kind: "wall", id: B.ws[0].id }; renderPanel();

  /* cj-pro02 : hydrofuge seulement pour les cloisons À CRÉER de la pièce humide */
  B = boite("mur");
  const clo = { id: uid(), a: v(2, 0), b: v(2, 4), type: "cloison" }; B.lv.walls.push(clo); afterChange();
  const sdb = () => facesFor(B.lv, "projet").find((g) => g.room && pointIn(v(1, 2), g.poly));
  sdb().room.type = "sdb"; sel = { kind: "room", id: sdb().room.id };
  B.lv.items.push({ id: uid(), type: "douche", x: 0.6, y: 0.6, w: 0.9, h: 0.9, rot: 0, st: "creer", douche: "bac" }); afterChange();
  setRoomProp("faience", "mi");
  const hyd = () => chantierTasks().filter((x) => /hydrofuge/.test(x.label));
  r["faïence refaite, cloison existante : aucune tâche hydrofuge, rien au contrat"] = !!tache(/^faience:/) && !hyd().length && contratPlan().provenance.murs.every((m) => m.hydrofuge === false);
  r["… et la fiche ne promet plus de passer les cloisons en hydrofuge"] = !/passent en plaques hydrofuges/.test(document.getElementById("pbody").innerText);
  clo.st = "creer"; afterChange();
  const tc = () => chantierTasks().find((x) => x.id === "w:" + clo.id + ":creer"), m2c = wallLen(clo) * 2.5;
  r["cloison À CRÉER qui borde la salle de bain : montée en plaques hydrofuges, au prix de ce poste, une seule fois"] = /plaques hydrofuges/.test(tc().label) && proche(tc().prix, m2c * PRIX.cloisonHumide) && hyd().length === 1;
  r["… le contrat le dit sur le mur (hydrofuge)"] = contratPlan().provenance.murs.find((m) => m.id === clo.pid).hydrofuge === true;
  setRoomProp("faience", "");
  r["sans faïence : une cloison ordinaire"] = !/hydrofuge/.test(tc().label) && proche(tc().prix, m2c * PRIX.cloisonNeuve) && contratPlan().provenance.murs.every((m) => m.hydrofuge === false);
  B.lv.items = []; afterChange(); sel = { kind: "room", id: sdb().room.id }; renderPanel();
  const zd = [...document.querySelectorAll("#pbody .seg button")].find((x) => /Zone douche/.test(x.textContent));
  r["« Zone douche » grisé tant qu'aucune douche n'est dessinée"] = !!zd && zd.disabled;
  setRoomProp("faience", "douche");
  r["« zone de douche » sans douche : ni faïence ni hydrofuge"] = !tache(/^faience:/) && !hyd().length;

  /* integ-15 : un mur maçonné non porteur démoli = « Abattre un mur non porteur » (le poste de la traduction) */
  B = boite("mur");
  const stub = { id: uid(), a: v(3, 1), b: v(3, 3), type: "mur", porteur: false, st: "demolir" }; B.lv.walls.push(stub); afterChange();
  const td = chantierTasks().find((x) => x.id === "w:" + stub.id + ":demolir"), cm = contratPlan().provenance.murs.find((m) => m.id === stub.pid);
  r["mur de 20 cm non porteur démoli : « Démolir le mur », au prix « Abattre un mur non porteur »"] = /^Démolir le mur /.test(td.label) && !/porteur ·|cloison/.test(td.label) && proche(td.prix, 2 * 2.5 * PRIX.demolMur);
  r["… et le contrat l'envoie en mur non porteur (type mur, porteur faux)"] = cm.type === "mur" && cm.porteur === false && cm.etat === "demolir";
  stub.type = "cloison"; afterChange();
  r["une cloison démolie reste « Démolir la cloison », au prix de la cloison"] = proche(chantierTasks().find((x) => x.id === "w:" + stub.id + ":demolir").prix, 2 * 2.5 * PRIX.demolCloison);

  /* pro16 : les rampants sans l'avancée de toit */
  B = boite("mur");
  state.toiture = { forme: "deuxpans", pente: 30, couverture: "tuile", combles: "amenages", debord: 0.3, projet: { action: "rien", isoCombles: "rampants" } }; afterChange();
  const g = toitureGeo(), ti = chantierTasks().find((x) => x.id === "toit:iso"), ct = contratPlan().toiture;
  r["rampants : l'emprise sous la pente, sans le débord (5,20 × 4,20 / cos 30°)"] = proche(g.surfaceRampants, 5.2 * 4.2 / Math.cos(Math.PI / 6), 0.06) && g.surfaceRampants < g.surface;
  r["… au compteur et au contrat"] = proche(ti.prix, g.surfaceRampants * PRIX_TOIT.isoRampants) && proche(ct.surfaceRampants, g.surfaceRampants) && proche(ct.surface, g.surface);
  return r;
}));

/* ── 11. D47 · décisions et états ─────────────────────────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  const proche = (a, b2, e = 0.01) => Math.abs(a - b2) < e;
  const ids = () => chantierTasks().map((x) => x.id.split(":")[0]);
  const boite = (sol, type) => { state = blankState(); const lv = L(); lv.height = 2.5;
    [[0, 0, 5, 0], [5, 0, 5, 4], [5, 4, 0, 4], [0, 4, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
    afterChange(); const f = facesCache[lv.id][0]; f.room.type = type || "sejour"; f.room.floor = sol; setMode("projet"); closeModal(); afterChange();
    sel = { kind: "room", id: f.room.id }; renderPanel(); return f.room; };
  const solC = () => contratPlan().sols[0];
  const depSel = () => document.querySelector('#pbody select[aria-label="Ancien sol"]');

  /* cj-novice01 : une migration ne passe qu'une fois */
  r["plan neuf : né au dernier schéma (pas de migration à rejouer)"] = blankState().schema === SCHEMA;
  const leg = { levels: [{ rooms: [{ floor: "Parquet", floorNew: "Parquet" }] }] }; migrerEtat(leg);
  r["plan d'avant D37 : « Parquet » sur un parquet migré une fois en ponçage, puis marqué"] = leg.levels[0].rooms[0].floorNew === PONCAGE && leg.schema === SCHEMA;
  const neuf = { schema: SCHEMA, levels: [{ rooms: [{ floor: "Parquet", floorNew: "Parquet" }] }] }; migrerEtat(neuf); migrerEtat(neuf);
  r["plan marqué : « Parquet neuf » reste un parquet neuf, migré ou non"] = neuf.levels[0].rooms[0].floorNew === "Parquet";

  /* cj-pro05 : poser sur l'ancien sol quand c'est compatible */
  let room = boite("Carrelage"); setRoomRevetement("Stratifié");
  r["stratifié sur carrelage : la dépose est un choix de sa ligne, « Déposer » par défaut"] = !!depSel() && depSel().value === "0" && ids().includes("sol-depose") && solC().depose === true;
  const px0 = chantierPrix().total; setRoomProp("surExistant", true);
  r["poser sur l'ancien sol : plus de dépose, au Suivi et au contrat"] = !ids().includes("sol-depose") && ids().includes("sol-rev") && solC().depose === false && solC().surExistant === true;
  r["… le compteur baisse du prix de la dépose, rien d'autre"] = proche(px0 - chantierPrix().total, areaNet(L(), facesCache[L().id][0]) * PRIX.deposeSol, 1);
  r["… et la ligne du revêtement le dit"] = /posé sur l'ancien sol/.test(chantierTasks().find((x) => x.id.startsWith("sol-rev")).detail);
  setRoomRevetement("Moquette");
  r["moquette : pas de choix, la dépose est obligatoire"] = !depSel() && ids().includes("sol-depose") && room.surExistant === undefined;
  room = boite("Moquette"); setRoomRevetement("Stratifié");
  r["sur une moquette : pas de pose sur l'ancien sol"] = !depSel() && !poseSurExistantOK(room);
  room = boite("Parquet"); setRoomRevetement("Carrelage");
  r["carrelage sur parquet : dépose obligatoire ; stratifié sur parquet : au choix"] = !poseSurExistantOK(room) && (setRoomRevetement("Stratifié"), poseSurExistantOK(room));

  /* cj-pro06 : une pièce d'eau refaite sans hauteur de faïence est à décider */
  room = boite("Carrelage", "sdb");
  const fai = () => elementsATrancher().some((a) => /^Faïence/.test(a.label));
  r["salle de bain décrite, rien de refait : pas de faïence à décider"] = !fai();
  setRoomRevetement("Carrelage");
  const onF = () => [...document.querySelectorAll("#pbody .seg button.on")].some((x) => /^Aucune/.test(x.textContent) && /existant/.test(x.textContent));
  r["sol refait, faïence jamais choisie : « Encore à décider », rien de présélectionné"] = fai() && !onF();
  setRoomProp("faience", "");
  r["« Aucune » choisie : décidé, et sélectionné"] = !fai() && onF() && !chantierTasks().some((x) => x.id.startsWith("faience:"));
  room = boite("Carrelage", "sde"); L().items.push({ id: uid(), type: "douche", x: 1, y: 1, w: 0.9, h: 0.9, rot: 0, st: "creer", douche: "bac" }); afterChange();
  r["douche à poser, faïence jamais choisie : à décider"] = fai();

  /* cj-novice09, cj-retention03 : une fusion n'étend aucune décision en silence */
  loadSample(); closeModal(); setMode("projet"); closeModal();
  const c1 = L().walls.find((w) => w.type === "cloison" && Math.abs(w.a.x - 3.5) < 1e-6 && Math.abs(w.a.y) < 1e-6 && Math.abs(w.b.y - 4) < 1e-6);
  sel = { kind: "wall", id: c1.id }; render(); setWallProp("st", "demolir");
  const fus = facesFor(L(), "projet").find((g) => g.room && pointIn(v(3.5, 2), g.poly));
  r["chambre (je garde) + séjour (poncé) réunis : aucun ponçage sur 35 m²"] = !chantierTasks().some((x) => /Poncer/.test(x.label));
  r["… le sol de la pièce réunie repasse « à décider », et c'est dit"] = !solDecide(fus.room) && !solGarde(fus.room) && elementsATrancher().some((a) => /^Sol · Séjour/.test(a.label) && /pas le même sol/.test(a.msg)) && /pas le même sol/.test(document.getElementById("toast").textContent);
  sel = { kind: "room", id: fus.room.id }; renderPanel(); setRoomRevetement("__garde");
  r["… décider dans la pièce réunie efface l'avis"] = !fus.room.fusion && !elementsATrancher().some((a) => /pas le même sol/.test(a.msg));
  undo(); undo();
  /* deux pièces aux sols différents (parquet / carrelage), même décision « Je garde » : elle reste */
  const deux = (dA, dB) => { state = blankState(); const lv = L(); lv.height = 2.5;
    [[0, 0, 8, 0], [8, 0, 8, 4], [8, 4, 0, 4], [0, 4, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
    const cl = { id: uid(), a: v(4, 0), b: v(4, 4), type: "cloison" }; lv.walls.push(cl); afterChange();
    const fa = facesCache[lv.id].find((g) => pointIn(v(2, 2), g.poly)), fb = facesCache[lv.id].find((g) => pointIn(v(6, 2), g.poly));
    fa.room.type = "chambre"; fa.room.floor = "Parquet"; fb.room.type = "cuisine"; fb.room.floor = "Carrelage"; Object.assign(fa.room, dA); Object.assign(fb.room, dB);
    setMode("projet"); closeModal(); afterChange(); sel = { kind: "wall", id: cl.id }; render(); setWallProp("st", "demolir");
    return facesFor(lv, "projet").find((g) => g.room && pointIn(v(4, 2), g.poly)); };
  let F = deux({ solGarde: true, peinture: "tout" }, { solGarde: true, peinture: "tout" });
  r["même décision des deux côtés (je garde, peinture) : elle reste"] = solGarde(F.room) && F.room.peinture === "tout" && !F.room.fusion;
  F = deux({ solGarde: true, peinture: "tout" }, { solGarde: true, peinture: "murs" });
  r["peintures différentes : la peinture repasse à décider, le sol reste"] = solGarde(F.room) && !F.room.peinture && elementsATrancher().some((a) => /^Peinture/.test(a.label));
  F = deux({}, {}); sel = { kind: "room", id: F.room.id }; renderPanel();
  const opts = [...document.querySelectorAll("#pbody .solstep.s-rev select option")].map((o) => o.textContent);
  r["parquet + carrelage réunis : « Garder les sols actuels (parquet et carrelage) », pas de ponçage proposé"] = opts.some((o) => /Garder les sols actuels \(parquet et carrelage\)/.test(o)) && !opts.some((o) => /Poncer/.test(o));
  setRoomRevetement("Stratifié");
  r["… la dépose nomme les deux sols, sur toute la pièce"] = /Déposer l'ancien sol \(parquet et carrelage\)/.test(chantierTasks().find((x) => x.id.startsWith("sol-depose")).label);
  r["… et on ne pose pas sur un parquet ET un carrelage sans le dire : choix proposé (les deux le permettent)"] = !!depSel();

  /* pro13 : salle de bain + WC réunis = une salle de bain */
  loadSample(); closeModal(); setMode("projet"); closeModal();
  const sdbWc = L().walls.find((w) => w.type === "cloison" && Math.abs(w.a.x - 2.2) < 1e-6 && Math.abs(w.a.y - 4) < 1e-6);
  sel = { kind: "wall", id: sdbWc.id }; render(); setWallProp("st", "demolir");
  const Fs = facesFor(L(), "projet").find((g) => g.room && pointIn(v(1, 5.5), g.poly));
  r["salle de bain + WC réunis : la pièce reste une salle de bain (baignoire dedans)"] = Fs.room.type === "sdb";

  /* cj-coherence07 : un passage sans porte ne se remplace pas */
  loadSample(); closeModal(); setMode("projet"); closeModal();
  const pa = L().openings.find((o) => o.type === "passage"); sel = { kind: "opening", id: pa.id }; renderPanel();
  r["passage : « À remplacer » n'est pas proposé"] = ![...document.querySelectorAll("#pbody .segetat button")].some((x) => /remplacer/i.test(x.textContent)) && !/À remplacer/.test(tipChiffrageOuverture(pa, L()));
  pa.st = "remplacer"; afterChange();
  r["passage marqué « remplacer » (plan d'avant) : aucune dépose, aucune tâche"] = !chantierTasks().some((x) => x.id.startsWith("o:" + pa.id));
  delete pa.st; afterChange();

  /* cj-qa01 : couper un mur en deux ne change pas le budget */
  const t0 = chantierPrix().total;
  const dbl = L().walls.find((w) => isoLayers(w).some((io) => io.st === "creer")); sel = { kind: "wall", id: dbl.id }; splitWall();
  const lg = chantierTasks().filter((x) => x.id.startsWith("iso")).reduce((s2, x) => s2 + (+(x.label.match(/Doubler (?:le mur de )?([\d,]+) m/) || [0, "0"])[1].replace(",", ".")), 0);
  r["couper en 2 un mur doublé : même budget, 4 m doublés côté Chambre"] = chantierPrix().total === t0 && proche(lg, 4, 0.02) && chantierTasks().filter((x) => x.id.startsWith("iso")).every((x) => /Chambre/.test(x.label));
  const dem = L().walls.find((w) => wst(w) === "demolir"); sel = { kind: "wall", id: dem.id }; splitWall();
  r["couper en 2 une cloison à démolir : les deux moitiés restent à démolir"] = chantierPrix().total === t0 && L().walls.filter((w) => wst(w) === "demolir").length === 2;
  return r;
}));

/* cj-novice01 : un « Parquet neuf » tient au rechargement et à la réouverture depuis « Mes plans » */
{
  const p2 = await b.newPage(); p2.on("pageerror", (e) => errs.push(e.message));
  await p2.setViewport({ width: 1400, height: 900 });
  await p2.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem("m47")) { localStorage.clear(); sessionStorage.setItem("m47", "1"); } } catch {} });
  await p2.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" }); await wait(400);
  const avant = await p2.evaluate(() => { closeWelcome("blank"); state = blankState(); const lv = L(); lv.height = 2.5;
    [[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
    afterChange(); const f = facesCache[lv.id][0]; f.room.floor = "Parquet"; setMode("projet"); closeModal(); afterChange(); sel = { kind: "room", id: f.room.id }; setRoomRevetement("Parquet");
    savePlanToLibrary(); save(); return { tot: chantierPrix().total, n: chantierTasks().length }; });
  await p2.reload({ waitUntil: "networkidle0" }); await wait(400);
  const apres = await p2.evaluate(() => { try { closeModal(); } catch {} const r0 = L().rooms.find((x) => x.floorNew); const a = { fn: r0 && r0.floorNew, tot: chantierPrix().total, n: chantierTasks().length };
    ouvrirPlanRange(state.id); try { closeModal(); } catch {} const r1 = L().rooms.find((x) => x.floorNew); return { a, b: { fn: r1 && r1.floorNew, tot: chantierPrix().total } }; });
  t["« Parquet neuf » rechargé : toujours un parquet neuf, même total, mêmes tâches"] = apres.a.fn === "Parquet" && apres.a.tot === avant.tot && apres.a.n === avant.n && avant.n === 3;
  t["… et rouvert depuis « Mes plans » : pareil"] = apres.b.fn === "Parquet" && apres.b.tot === avant.tot;
  await p2.close();
}

/* ── 12. D48 · Type de mur au tracé, à la souris, pièce par pièce le long de la façade (cj-novice02, cj-novice08) ── */
{
  const p3 = await b.newPage(); p3.on("pageerror", (e) => errs.push(e.message));
  await p3.setViewport({ width: 1400, height: 900 });
  await p3.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem("m48")) { localStorage.clear(); localStorage.setItem("avyora-plan-welcome", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); sessionStorage.setItem("m48", "1"); } } catch {} });
  await p3.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" }); await wait(400);
  const Q = (x, y) => p3.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
  const clic3 = async (x, y) => { const q = await Q(x, y); await p3.mouse.move(q.x, q.y); await wait(40); await p3.mouse.click(q.x, q.y); await wait(110); };
  await p3.evaluate(() => { newPlan(); view.zoom = 60; view.ox = 200; view.oy = 200; draw(); });
  for (const [x, y] of [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]]) await clic3(x, y);
  await wait(150);
  t["souris · pièce 1 (4 × 3,5) : murs de 20 cm, l'outil passe en « Automatique »"] = await p3.evaluate(() => L().walls.length === 4 && L().walls.every((w) => w.type === "mur") && wallType === "auto");
  for (const [x, y] of [[4, 0], [7, 0], [7, 3.5], [4, 3.5]]) await clic3(x, y);
  await p3.keyboard.press("Escape"); await wait(250);
  Object.assign(t, await p3.evaluate(() => { const r = {}, n = L().walls.slice(4);
    r["souris · pièce 2 accolée : ses 3 murs de façade sont des murs de 20 cm (pas des cloisons)"] = n.length === 3 && n.every((w) => w.type === "mur" && Math.abs(wallT(w) - 0.2) < 1e-9);
    const hauts = L().walls.filter((w) => Math.abs(w.a.y) < 1e-6 && Math.abs(w.b.y) < 1e-6).map((w) => wallOff(w).y);
    r["souris · la façade haute ne fait pas de marche : même alignement que le premier contour"] = hauts.length === 2 && Math.abs(hauts[0] - hauts[1]) < 1e-6 && hauts[0] < 0;
    r["souris · deux pièces fermées, aucune « cloison en façade »"] = (facesCache[L().id] || []).filter((f) => f.room).length === 2 && !planChecks(L()).some((c) => /en façade/.test(c.msg));
    /* R6 : le message disait la surface d'AVANT l'alignement de la façade (« 10,6 m² » pour 11,6 m²) */
    const f2 = (facesCache[L().id] || []).filter((f) => f.room).sort((a, b2) => b2.label.x - a.label.x)[0], msg = document.getElementById("toast").textContent;
    r["souris · pièce 2 : le message « Pièce fermée » dit la surface affichée sur le plan"] = /Pièce fermée/.test(msg) && msg.includes(fmtM2(areaNet(L(), f2)));
    return r; }));
  for (const [x, y] of [[5.5, 0], [5.5, 3.5]]) await clic3(x, y);
  await p3.keyboard.press("Escape"); await wait(150);
  t["souris · un mur tracé dans une pièce : cloison de 7 cm"] = await p3.evaluate(() => L().walls[L().walls.length - 1].type === "cloison");
  await p3.reload({ waitUntil: "networkidle0" }); await wait(400);
  await p3.evaluate(() => { view.zoom = 60; view.ox = 200; view.oy = 200; draw(); setTool("mur"); });
  t["rechargement : l'outil Murs reste en « Automatique » (plus de retour au mur 20 cm)"] = await p3.evaluate(() => wallType === "auto");
  for (const [x, y] of [[0, 1.5], [4, 1.5]]) await clic3(x, y);
  await p3.keyboard.press("Escape"); await wait(150);
  t["rechargement : un mur dans une pièce reste une cloison"] = await p3.evaluate(() => L().walls[L().walls.length - 1].type === "cloison");
  for (const [x, y] of [[0, 3.5], [0, 6], [4, 6], [4, 3.5]]) await clic3(x, y);
  await p3.keyboard.press("Escape"); await wait(150);
  t["rechargement : une extension dehors reste en murs de 20 cm"] = await p3.evaluate(() => L().walls.slice(-3).every((w) => w.type === "mur"));
  t["contrôle : une cloison de 7 cm en façade est signalée"] = await p3.evaluate(() => { const w = L().walls.slice(-3)[1]; w.type = "cloison"; afterChange(); return planChecks(L()).some((c) => /cloison de 7 cm en façade/i.test(c.msg)); });
  /* le vitrine reste sans alerte */
  t["contrôle : l'exemple et les plans types n'ont aucune cloison en façade"] = await p3.evaluate(() => { loadSample(); const ok = ["existant", "projet"].every((m) => { setMode(m); closeModal(); return !planChecks(L()).some((c) => /en façade/.test(c.msg)); });
    return ok && TEMPLATES.filter((x) => x.build).every((T) => { setMode("existant"); loadTemplate(T.id); closeModal(); return !planChecks(L()).some((c) => /en façade/.test(c.msg)); }); });
  /* ── 12 bis. R6 · trois pièces tracées le long de la façade : deux « Chambre » numérotées dès le tracé ── */
  { await p3.evaluate(() => { newPlan(); view.zoom = 60; view.ox = 200; view.oy = 200; draw(); });
    for (const [x, y] of [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]]) await clic3(x, y);
    for (const [x, y] of [[4, 0], [7.5, 0], [7.5, 3.5], [4, 3.5]]) await clic3(x, y);
    for (const [x, y] of [[7.5, 0], [10.5, 0], [10.5, 3.5], [7.5, 3.5]]) await clic3(x, y);
    await wait(150);
    Object.assign(t, await p3.evaluate(() => { const r = {}, F = (facesCache[L().id] || []).filter((f) => f.room).sort((a, b2) => a.label.x - b2.label.x), noms = F.map((f) => roomName(f.room)), msg = document.getElementById("toast").textContent;
      r["souris · trois pièces le long de la façade : « Chambre 1 », « Cuisine », « Chambre 2 » dès le tracé (sans autre geste)"] = JSON.stringify(noms) === JSON.stringify(["Chambre 1", "Cuisine", "Chambre 2"]);
      r["souris · pièce 3 : le message dit sa surface et son nom numéroté"] = msg.includes(fmtM2(areaNet(L(), F[2]))) && msg.includes("« Chambre 2 »");
      return r; })); }
  /* ── 13. D48 (cj-qa08) · trois « Chambre » : numérotées partout ── */
  Object.assign(t, await p3.evaluate(() => { const r = {};
    setMode("existant"); loadTemplate("maison"); closeModal(); setMode("projet"); closeModal();
    L().openings.filter((o) => OPENINGS[o.type].cat === "fenetre").forEach((o) => { o.st = "remplacer"; }); afterChange();
    const noms = (facesCache[L().id] || []).filter((f) => f.room && f.room.type === "chambre").map((f) => roomName(f.room)).sort();
    r["pièces · trois chambres : « Chambre 1 », « Chambre 2 », « Chambre 3 »"] = JSON.stringify(noms) === JSON.stringify(["Chambre 1", "Chambre 2", "Chambre 3"]);
    const ids = new Map((facesCache[L().id] || []).filter((f) => f.room && f.room.type === "chambre").map((f) => [f.room.id, roomName(f.room)]));
    setMode("existant"); closeModal();
    r["pièces · le même numéro avant et après travaux"] = (facesCache[L().id] || []).filter((f) => ids.has(f.room?.id)).every((f) => roomName(f.room) === ids.get(f.room.id));
    setMode("projet"); closeModal();
    const lab = chantierTasks().filter((x) => /Poser la fenêtre neuve/.test(x.label)).map((x) => x.label);
    r["pièces · le Suivi dit laquelle (« · Chambre 2 »)"] = lab.some((l) => /Chambre 2$/.test(l)) && new Set(lab).size === lab.length;
    const c = contratPlan(), sols = (c.detailNiveaux || []).flatMap((n) => n.rooms || []).map((x) => x.name);
    r["pièces · le contrat et le dossier portent le nom numéroté"] = sols.includes("Chambre 3");
    const f1 = (facesCache[L().id] || []).find((f) => f.room && f.room.type === "sejour"); f1.room.name = "Chambre 1"; _numPieces = null;
    r["pièces · un nom saisi en double est numéroté aussi, sans toucher au nom saisi"] = f1.room.name === "Chambre 1" && (facesCache[L().id] || []).filter((f) => f.room && /^Chambre \d$/.test(roomName(f.room))).length === 4;
    f1.room.name = ""; _numPieces = null;
    loadSample(); r["pièces · un nom unique n'a pas de numéro (l'exemple : « Chambre »)"] = (facesCache[L().id] || []).some((f) => f.room && roomName(f.room) === "Chambre");
    return r; }));
  await p3.close();
}

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
Object.entries(t).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le plan parle comme un pro du bâtiment");
process.exit(echecs.length || errs.length ? 1 : 0);
