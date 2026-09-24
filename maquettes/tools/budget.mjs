/**
 * Le chiffre est-il vrai ? (D36)
 *
 * « Aucun euro sans geste » : un logement dessiné tel qu'il est ne coûte rien, et chaque euro du
 * compteur vient d'une décision prise sur le plan. Ce contrôle construit les situations où le
 * compteur mentait — plan type chargé, pièce tracée à la souris, salle de bain typée, doublage
 * partiel, niveau copié, double-clic sur un mur — et vérifie que le budget, le Suivi et le
 * contrat disent la même chose.
 *
 *   node maquettes/tools/budget.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 au premier invariant rompu.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
/* Le plan réel de Dani : c'est sur lui que le Suivi comptait 189,6 m² de doublage contre 75,8 au contrat. */
const PLAN_REFEND = readFileSync(new URL("./fixtures/plan-refend-pierre.json", import.meta.url), "utf8");
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/budget.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: 1400, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};

/* ── 1. Une pièce tracée à la souris, sans rien décider : 0 €, 0 tâche ─────────────────── */
await p.evaluate(() => { closeWelcome("blank"); state = blankState(); afterChange(); fitView(); setTool("mur"); });
const P = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
for (const [x, y] of [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]]) { const q = await P(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(120); }
Object.assign(t, await p.evaluate(() => {
  const r = {}, px = () => chantierPrix();
  const pieces = (facesCache[L().id] || []).filter((f) => f.room);
  r["souris · la pièce est bien fermée"] = pieces.length === 1;
  r["souris · pièce existante sans décision : 0 €, 0 tâche"] = px().total === 0 && px().nb === 0;
  const pied = () => document.getElementById("pfoot").textContent;
  r["pied · rien de décidé le dit, avec 0 €"] = /Rien de décidé/.test(pied()) && /0 €/.test(pied()) && /HT/.test(pied());
  setMode("projet"); closeModal();
  r["vue Travaux sans décision : toujours 0 €, 0 tâche"] = px().total === 0 && px().nb === 0;
  const f = (facesCache[L().id] || [])[0], room = f.room;
  room.type = "sdb"; afterChange();
  r["salle de bain typée, rien décidé : pas de faïence ni de cloisons hydrofuges"] = px().nb === 0;
  room.floor = "Sol brut / terre"; afterChange();
  r["sol en terre décrit, rien décidé : pas de dalle"] = px().nb === 0 && quantities().sols.length === 0;
  const c = contratPlan(), pc = c.detailNiveaux[0].rooms[0];
  r["contrat · aucune plinthe émise sans sol neuf"] = c.plinthes === 0 && pc.plinthes === 0;
  r["contrat · faïence non choisie sort à null"] = pc.faience === null;
  /* on décide : un sol neuf → dalle, revêtement, plinthes ; une faïence → faïence et hydrofuge */
  room.floor = "Carrelage"; room.floorNew = "Carrelage"; afterChange();
  const ids = () => chantierTasks().map((x) => x.id.split(":")[0]);
  r["sol neuf décidé : plinthes comptées"] = ids().includes("plinthes") && ids().includes("sol-rev");
  room.faience = "mi"; afterChange();
  r["faïence mi-hauteur décidée : faïence comptée, plinthes retirées (la faïence descend au sol)"] = ids().includes("faience") && !ids().includes("plinthes");
  room.faience = "douche"; L().items.push({ id: uid(), type: "douche", x: f.label.x, y: f.label.y, w: 0.9, h: 0.9, rot: 0, st: "creer" }); afterChange();
  const pl = chantierTasks().find((x) => x.id.startsWith("plinthes:"));
  r["faïence zone douche : plinthes sur le reste du périmètre"] = !!pl && Math.abs(quantities().plinthes - plinthesDe(L(), facesFor(L(), "projet")[0])) < 0.01;
  room.faience = ""; afterChange();
  r["faïence repassée sur « Aucune » : plus de faïence comptée"] = !ids().includes("faience") && !ids().includes("clohum");
  return r;
}));

/* ── 2. Plans types chargés sans rien toucher : 0 €, 0 tâche, contrat muet ─────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  /* « T2 » est l'exemple : il porte volontairement un mini-projet (arbitrage G). */
  TEMPLATES.filter((T) => T.build).forEach((T) => {
    loadTemplate(T.id); setMode("existant");
    const a = chantierPrix(); setMode("projet"); closeModal(); const b2 = chantierPrix();
    const c = contratPlan();
    r[`plan type « ${T.name} » : 0 € et 0 tâche`] = a.total === 0 && a.nb === 0 && b2.total === 0 && b2.nb === 0;
    r[`plan type « ${T.name} » : le contrat n'émet ni plinthes, ni sols, ni faïence`] = c.plinthes === 0 && c.sols.length === 0 &&
      c.detailNiveaux.every((n) => n.rooms.every((x) => x.plinthes === 0 && x.faience === null));
  });
  return r;
}));

/* ── 3. Doublage : chaque couche, sa longueur tracée ; un id par couche ─────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
  const nord = W([0, 0], [9, 0]); W([9, 0], [9, 4]); W([9, 4], [0, 4]); W([0, 4], [0, 0]);
  W([3, 0], [3, 4], "cloison"); W([6, 0], [6, 4], "cloison");
  setMode("projet"); closeModal(); afterChange();
  /* trois tronçons sur la même face, un par pièce, et une ITE partielle dehors */
  poserDoublage(nord, 1, 0, 1 / 3); poserDoublage(nord, 1, 1 / 3, 2 / 3); poserDoublage(nord, 1, 2 / 3, 0.9);
  DBL_CFG.mode = "ite"; poserDoublage(nord, -1, 0.1, 0.6); DBL_CFG.mode = "iti";
  const T = chantierTasks().filter((x) => x.lot === "Isolation" && x.id.startsWith("iso:"));
  const couches = isoLayers(nord).filter((io) => io.st === "creer");
  r["doublage · une tâche par couche"] = T.length === couches.length && couches.length === 4;
  r["doublage · des identifiants tous différents"] = new Set(T.map((x) => x.id)).size === T.length;
  const prov = contratPlan().provenance.doublages;
  r["doublage · Suivi = formule = contrat, couche par couche"] = couches.every((io, i) => {
    const attendu = isoSurface(nord, io, lv), tache = T.find((x) => x.id === isoTacheId(nord, io, isoLayers(nord).indexOf(io)));
    return tache && Math.abs(tache.m2 - attendu) < 0.01 && Math.abs(prov[i].m2 - attendu) < 0.01;
  });
  const q = quantities().doublage, somme = T.reduce((s, x) => s + x.m2, 0);
  r["doublage · somme du Suivi = total du contrat"] = Math.abs(somme - (q.iti + q.ite)) < 0.2;
  r["doublage · le prix suit la surface tracée (ITI 1/3 de mur = 3 m × 2,5 × 55 €)"] = Math.abs(T[0].prix - 3 * 2.5 * PRIX.isoITI) < 1;
  r["doublage · le libellé dit la longueur doublée"] = /Doubler 3,00 m du mur de 9,00 m/.test(T[0].label);
  toggleDone(T[1].id);
  r["doublage · cocher un tronçon ne coche que lui"] = T.filter((x) => isDone(x.id)).length === 1;
  /* un plan d'avant : 'iso:<mur>' / 'iso2:<mur>' se reportent sur les deux premières couches */
  const vieux = { levels: [{ walls: [{ id: "m1", isos: [{ e: 0.1, st: "creer" }, { e: 0.1, st: "creer" }] }] }], done: { "iso:m1": 1, "iso2:m1": 2 } };
  migrerDone(vieux);
  r["doublage · les cases cochées des anciens plans sont reportées"] = vieux.done["iso:m1:0"] === 1 && vieux.done["iso:m1:1"] === 2 && !vieux.done["iso:m1"];
  return r;
}));

/* ── 3 bis. Le plan réel : Suivi et contrat comptent la même surface de doublage ──────── */
Object.assign(t, await p.evaluate((txt) => {
  const r = {};
  state = JSON.parse(txt).state; state.cur = 0; setMode("projet"); closeModal(); afterChange();
  const T = chantierTasks(), iso = T.filter((x) => x.id.startsWith("iso:"));
  const suivi = iso.reduce((s, x) => s + x.m2, 0);
  const contrat = contratPlan().provenance.doublages.filter((d) => d.etat === "creer").reduce((s, d) => s + d.m2, 0);
  r["plan réel · doublage : Suivi = contrat (m²)"] = iso.length > 0 && Math.abs(suivi - contrat) < 0.05;
  r["plan réel · identifiants de tâche uniques"] = new Set(T.map((x) => x.id)).size === T.length;
  return r;
}, PLAN_REFEND));

/* ── 4. Copier un niveau : l'existant seul, en profondeur ─────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal();
  const bas = L(), mur = bas.walls[0];
  /* D37 : un doublage par l'intérieur ne se pose plus côté dehors — la face extérieure reçoit une ITE */
  { const si = interiorSideN(mur); poserDoublage(mur, si, 0, 1); DBL_CFG.mode = "ite"; poserDoublage(mur, -si, 0, 1); DBL_CFG.mode = "iti"; }
  isoList(mur).forEach((io) => { delete io.st; });   /* doublages existants */
  const r0 = bas.rooms.find((x) => x.type === "sejour"); r0.floorNew = "Parquet"; r0.fauxPlafond = true; afterChange();
  const avant = chantierPrix(), nAvant = chantierTasks().length;
  addLevel("copy"); const haut = L();
  r["copie · le budget ne bouge pas"] = chantierPrix().total === avant.total && chantierTasks().length === nAvant;
  r["copie · aucun état de travaux recopié"] = haut.walls.every((w) => !w.st) && haut.openings.every((o) => !o.st) &&
    haut.rooms.every((x) => !x.floorNew && !x.sol && !x.fauxPlafond && !x.faience && !x.products);
  r["copie · ce qui est à créer en bas n'existe pas en haut"] = haut.openings.length === bas.openings.filter((o) => ost(o) !== "creer").length;
  const mh = haut.walls.find((w) => Math.abs(w.a.x - mur.a.x) < 1e-6 && Math.abs(w.a.y - mur.a.y) < 1e-6 && Math.abs(w.b.x - mur.b.x) < 1e-6);
  r["copie · les doublages existants suivent, sans être partagés"] = !!mh && isoLayers(mh).length === 2 && isoLayers(mh) !== isoLayers(mur);
  retirerDoublageAu(mh, 1, 0.5);
  r["copie · retirer un doublage à l'étage ne touche pas le RDC"] = isoLayers(mh).length === 1 && isoLayers(mur).length === 2;
  return r;
}));

/* ── 5. Ouvertures : ni superposées, ni rebouchées dans un mur démoli ──────────────────── */
await p.evaluate(() => { state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
  W([0, 0], [8, 0]); W([8, 0], [8, 4]); W([8, 4], [0, 4]); W([0, 4], [0, 0]); W([4, 0], [4, 4], "cloison");
  setMode("projet"); closeModal(); afterChange(); fitView(); setTool("ouverture"); openingType = "fenetre"; });
{ const q = await P(2, 0); for (let i = 0; i < 2; i++) { await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(150); } }
Object.assign(t, await p.evaluate(() => {
  const r = {}, lv = L();
  r["double clic au même endroit : une seule ouverture"] = lv.openings.length === 1;
  r["la seconde sélectionne la première"] = sel && sel.kind === "opening" && sel.id === lv.openings[0].id;
  const o = lv.openings[0];
  lv.openings.push({ ...JSON.parse(JSON.stringify(o)), id: uid() }); afterChange();
  r["deux ouvertures superposées : le contrôle du plan le signale"] = planChecks(lv).some((c) => /se chevauchent/.test(c.msg));
  lv.openings.pop(); afterChange();
  r["plus de chevauchement : plus d'alerte"] = !planChecks(lv).some((c) => /se chevauchent/.test(c.msg));
  /* une porte dans la cloison, puis la cloison démolie */
  const clo = lv.walls[4];
  lv.openings.push({ id: uid(), wallId: clo.id, t: 0.5, type: "porte", w: 0.83, h: 2.04, side: 1, hinge: 1 }); afterChange();
  const porte = lv.openings[lv.openings.length - 1];
  sel = { kind: "wall", id: clo.id }; setWallProp("st", "demolir");
  r["mur démoli : sa porte n'est pas passée « à boucher »"] = ost(porte) === "existant";
  r["mur démoli : aucune tâche sur sa porte"] = !chantierTasks().some((x) => x.id.startsWith("o:" + porte.id));
  garantirPids();
  r["mur démoli : sa porte ne sort pas au contrat"] = !contratPlan().detailNiveaux[0].menuiseries.some((m) => m.id === porte.pid);
  r["mur démoli : sa porte n'est plus dessinée après travaux"] = !opDrawn(porte, "final") && opDrawn(porte, "existant");
  /* reboucher une fenêtre : on dépose d'abord la menuiserie (sans prix, l'estimation ne la compte pas) */
  sel = { kind: "wall", id: clo.id }; setWallProp("st", "existant");
  porte.st = "boucher"; o.st = "boucher"; afterChange();
  const T = chantierTasks();
  const dep = T.find((x) => x.id === "o:" + o.id + ":depose"), bou = T.find((x) => x.id === "o:" + o.id + ":boucher");
  r["reboucher : dépose de la menuiserie d'abord, sans prix, en le disant"] = !!dep && dep.prix === 0 && /sans prix/.test(detailTache(dep));
  r["reboucher une porte dans une cloison : lot Cloisons"] = T.find((x) => x.id === "o:" + porte.id + ":boucher")?.lot === "Cloisons" && bou?.lot === "Maçonnerie";
  return r;
}));

/* ── 6. Prix : un poste, une source ───────────────────────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {}, lv = L(), c = (facesCache[lv.id] || [])[0].label;
  const pose = (type) => { const it = { id: uid(), type, x: c.x, y: c.y, w: ITEMS[type].w, h: ITEMS[type].h, rot: 0, st: "creer" }; lv.items.push(it); return it; };
  const ev = pose("evier"), vm = pose("vmc"), fr = pose("frigo"); afterChange();
  const T = chantierTasks(), px = (it) => T.find((x) => x.id === "i:" + it.id + ":creer");
  r["évier et VMC posés : chiffrés au prix du catalogue"] = px(ev)?.prix === EQUIP_PRIX.evier && EQUIP_PRIX.evier > 0 && px(vm)?.prix === EQUIP_PRIX.vmc && EQUIP_PRIX.vmc > 0;
  r["réfrigérateur : un meuble, pas une tâche"] = !px(fr);
  state.toiture = toitureDefaults(); state.toiture.projet.velux = 2; afterChange();
  const nv = () => chantierTasks().filter((x) => /velux/i.test(x.label) || x.id === "toit:velux").length;
  r["fenêtres de toit au panneau seul : comptées"] = chantierTasks().some((x) => x.id === "toit:velux");
  pose("velux"); afterChange();
  r["fenêtre de toit dessinée : elle fait foi, le panneau ne s'ajoute plus"] = !chantierTasks().some((x) => x.id === "toit:velux") &&
    chantierTasks().some((x) => x.id.endsWith(":creer") && x.label === "Poser fenêtre de toit" && x.prix === EQUIP_PRIX.velux);
  return r;
}));

/* ── 7. Aucun identifiant de tâche en double, partout ─────────────────────────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {}, uniq = () => { const ids = chantierTasks().map((x) => x.id); return new Set(ids).size === ids.length; };
  loadSample(); setMode("projet"); closeModal();
  r["exemple : identifiants de tâche uniques"] = uniq();
  addLevel("surelevation");
  r["exemple + surélévation : identifiants uniques"] = uniq();
  return r;
}));

/* ── 8. Ce que dit l'interface : HT, et qui applique finition et région ───────────────── */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample(); setMode("projet"); closeModal(); setTool("select"); sel = null; render();
  const pied = document.getElementById("pfoot").textContent, pan = document.getElementById("panel").innerHTML;
  r["pied · le budget est dit HT"] = /Budget travaux HT/.test(pied);
  r["Le chantier · dit que le compteur ne les applique pas"] = /compteur du plan/.test(pan) && /prix catalogue/.test(pan) && !/commande le prix/.test(pan);
  setChantier("finition", "eco"); const eco = chantierPrix().total; setChantier("finition", "standard"); const std = chantierPrix().total;
  r["compteur : la finition Éco ne le change pas — et l'interface le dit"] = eco === std;
  r["Le chantier · plus de chiffre non sourcé sur les régions"] = !/milliers d'euros/.test(document.getElementById("panel").innerHTML);
  /* épaisseur de doublage : 120 mm par défaut, R ≥ 3,7, une seule liste */
  r["doublage · 120 mm par défaut, et R ≥ 3,7"] = DBL_CFG.e === 0.12 && DBL_CFG.e / ISO_MAT[DBL_CFG.mat].lambda >= R_MIN_MUR;
  r["doublage · même liste d'épaisseurs dans l'outil et dans la fiche"] = EP_DOUBLAGE.includes(120) && EP_DOUBLAGE.includes(200);
  /* récap des surfaces : celui de la vue affichée */
  setMode("existant"); sel = null; render();
  const q = quantities(), rx = recapExistant();
  r["récap · en vue Avant travaux, il totalise l'existant"] = Math.abs(rx.area - q.areaBefore) < 0.01 && /avant travaux/.test(document.getElementById("panel").innerHTML);
  return r;
}));

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ chaque euro vient d'une décision, et se compte une fois");
process.exit(echecs.length || errs.length ? 1 : 0);
