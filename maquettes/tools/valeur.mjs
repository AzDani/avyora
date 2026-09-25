/**
 * Le budget, héros du produit (D40).
 *
 * Un seul montant — la somme des tâches du Suivi, `chantierPrix()` — et il se lit partout pareil :
 * la carte du pied de panneau, « Estimer ce plan », le Suivi, le dossier exporté, les cartes de
 * « Mes plans » et le tiroir du téléphone. Le contrôle vérifie aussi :
 *   - le pied : une seule carte, qui est son seul appel, compacte (≤ 170 px), le montant bien plus
 *     gros que la surface ; plan vide : Estimer grisé en haut ET en bas, avec la même explication ;
 *     mais des tâches sans pièce fermée après travaux (façade démolie) : le montant, et Estimer (D46) ;
 *   - « Estimer ce plan » : le montant d'abord, compteur animé (direct si le système demande moins
 *     d'animation), corps d'état avec barres, chaque tâche avec son prix, « non chiffré » au lieu de
 *     « 0 € », « Encore à décider » où CHAQUE ligne sélectionne son objet et ferme la fenêtre, les
 *     actions Exporter / Enregistrer toujours à portée ;
 *   - la pastille d'écart : chaque décision qui change le montant la montre (signe, montant, tâche),
 *     annoncée (aria-live), 3 s ; jamais en ouvrant un plan ; jamais en gratuit ; elle n'efface pas le
 *     message « Annuler » ;
 *   - le Suivi : prix par tâche, « X € réalisés sur Y € », « fait le jj/mm » ;
 *   - « Mes plans » : surface, budget, avancement, date, vignette.
 *
 *   node maquettes/tools/valeur.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/valeur.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet({ larg = 1440, haut = 900, pro = true, calme = false, mobile = false } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  if (calme) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.evaluateOnNewDocument((pro) => { try { localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); } catch {} }, pro);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}
/* l'exemple, en vue Travaux, rien de sélectionné */
const EXEMPLE = () => { closeWelcome("sample"); setMode("projet"); closeModal(); setTool("select"); sel = null; render(); };

/* ═════════ 1. Pro, 1440 × 900 : une source, partout ═════════ */
let p = await onglet();
await p.evaluate(EXEMPLE); await wait(700);
Object.assign(t, await p.evaluate(() => {
  const r = {}, px = chantierPrix(), T = chantierTasks();
  r["source · chantierPrix() = somme des tâches du Suivi"] = px.total === Math.round(T.reduce((s, x) => s + (x.prix || 0), 0)) && px.nb === T.length && px.taches.length === T.length;
  r["source · corps d'état dans l'ordre du chantier, sans tâche perdue"] = px.lots.every((g, i) => i === 0 || LOTS.indexOf(px.lots[i - 1].lot) < LOTS.indexOf(g.lot)) && px.lots.reduce((s, g) => s + g.taches.length, 0) === T.length;
  r["source · « non chiffré » = les tâches sans prix"] = px.nonChiffrees.length === T.filter((x) => !x.prix && !x.inclus).length;
  const F = document.getElementById("pfoot");
  const appels = [...F.querySelectorAll("button, a")].filter((x) => x.getClientRects().length);
  r["pied · un seul appel : la carte budget"] = appels.length === 1 && appels[0].classList.contains("budgetbtn");
  r["pied · la carte dit « Voir le détail »"] = /Voir le détail/.test(F.innerText);
  r["pied · le montant affiché = chantierPrix().total"] = document.getElementById("budgetVal").textContent === eur(px.total);
  const fs = (el) => parseFloat(getComputedStyle(el).fontSize);
  r["pied · le montant est bien plus gros que la surface"] = fs(document.getElementById("budgetVal")) >= 24 && fs(document.getElementById("budgetVal")) >= 2 * fs(F.querySelector(".presume b"));
  r["pied · compact (≤ 170 px à 1440 × 900)"] = F.getBoundingClientRect().height <= 170;
  r["pied · pas de second bouton « Estimer » (un seul, en haut)"] = !F.querySelector(".estimate") && document.querySelectorAll("#estBtnTop").length === 1;
  F.querySelector(".budgetbtn").click();
  r["pied · la carte ouvre « Estimer ce plan »"] = document.getElementById("m-estimate").classList.contains("show");
  closeModal();
  return r;
}));
await p.setViewport({ width: 1280, height: 800 }); await wait(250);
t["pied · compact (≤ 170 px à 1280 × 800)"] = await p.evaluate(() => document.getElementById("pfoot").getBoundingClientRect().height <= 170);
await p.setViewport({ width: 1440, height: 900 }); await wait(250);

/* Estimer : le montant d'abord, compteur animé */
const est0 = await p.evaluate(() => { showEstimate(); return { txt: document.getElementById("estTotal").textContent, fin: eur(chantierPrix().total) }; });
t["Estimer · le montant final est dans la page dès l'ouverture"] = est0.txt === est0.fin;
await wait(90);
t["Estimer · le compteur monte (animation)"] = await p.evaluate(() => document.getElementById("estTotal").textContent !== eur(chantierPrix().total));
await wait(900);
t["Estimer · … et s'arrête sur le montant exact"] = await p.evaluate(() => document.getElementById("estTotal").textContent === eur(chantierPrix().total));
Object.assign(t, await p.evaluate(() => {
  const r = {}, B = document.getElementById("estBody"), px = chantierPrix();
  r["Estimer · le premier bloc est le montant"] = B.firstElementChild.classList.contains("esthero");
  const lv = [...B.querySelectorAll(".estlot")];
  r["Estimer · un corps d'état par ligne, avec sa barre et son montant"] = lv.length === px.lots.length && lv.every((d, i) => { const g = px.lots[i]; return d.querySelector(".lb i") && d.querySelector(".lv").textContent === (g.total ? eur(Math.round(g.total)) : "non chiffré"); });
  const prix = [...B.querySelectorAll(".estlot .tline .n")].map((x) => x.textContent);
  r["Estimer · chaque tâche a son prix (le même que le Suivi)"] = prix.length === px.nb && prix.every((x, i) => x === prixTache(px.taches[i]));
  r["Estimer · jamais « 0 € » pour une tâche : « non chiffré »"] = ![...B.querySelectorAll(".tline .n, .estlot .lv")].some((x) => x.textContent.trim() === "0 €");
  const A = elementsATrancher(), L0 = [...B.querySelectorAll(".adec")];
  r["Estimer · « Encore à décider » : toutes les lignes sont cliquables"] = L0.length === A.length && A.length > 5;
  r["Estimer · au-delà de 5, les autres se déplient (rien de perdu)"] = !!B.querySelector("details.plusadec") && B.querySelector("details.plusadec").querySelectorAll(".adec").length === A.length - 5;
  const act = B.querySelector(".estactions.colle");
  r["Estimer · actions Exporter (principal) et Enregistrer"] = !!act && /Exporter/.test(act.querySelector(".estimate").textContent) && /Enregistrer/.test(act.innerText) && B.querySelectorAll(".estimate").length === 1;
  const M = document.querySelector("#m-estimate .modal"); M.scrollTop = 0;
  const ra = act.getBoundingClientRect(), rm = M.getBoundingClientRect();
  r["Estimer · les actions restent à portée en haut de l'écran (collantes)"] = getComputedStyle(act).position === "sticky" && ra.bottom <= rm.bottom + 1 && ra.top >= rm.top;
  r["Estimer · pas de JSON, ni contrat, ni envoi (sans ?dev)"] = !B.querySelector("pre") && !/Envoyer|Contrat \d/.test(B.innerText);
  /* la dernière ligne « à décider » (dans le dépliant) : elle sélectionne son objet et ferme */
  const der = A[A.length - 1]; L0[L0.length - 1].click();
  r["Estimer · une ligne « à décider » (même repliée) sélectionne son objet et ferme"] = !modaleOuverte() && sel && sel.kind === der.kind && sel.id === der.id && mode() === "projet";
  return r;
}));

/* Suivi : prix, « réalisés sur », date */
Object.assign(t, await p.evaluate(() => {
  const r = {}; sel = null; render(); setPanelTab("suivi");
  const px0 = chantierPrix(), t0 = px0.taches.find((x) => x.prix > 0); toggleDone(t0.id);
  const px = chantierPrix(), s = document.getElementById("pbody").innerText;
  r["Suivi · « X € réalisés sur Y € » = la même source"] = s.includes(eur(px.fait) + " réalisés sur " + eur(px.total)) && px.fait === Math.round(t0.prix);
  const d = new Date(); const jm = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  r["Suivi · une tâche cochée dit « fait le jj/mm »"] = s.includes("fait le " + jm);
  r["Suivi · jamais « 0 € » pour une tâche"] = ![...document.querySelectorAll("#pbody .tpx")].some((x) => x.textContent.trim() === "0 €");
  r["Suivi · « non chiffré » dit, s'il y a lieu"] = !px.nonChiffrees.length || /non chiffré/.test(s);
  setPanelTab("details");
  return r;
}));
/* Export : Budget et Suivi lisent la même source */
Object.assign(t, await p.evaluate(() => {
  const r = {}, px = chantierPrix(); exportPlan();
  const pages = [...document.querySelectorAll("#exportGallery .xpage")];
  const bud = pages.find((x) => x.querySelector("h4").textContent === "Budget travaux HT"), sui = pages.find((x) => x.querySelector("h4").textContent === "Suivi du chantier");
  r["export · page Budget : le montant en tête = chantierPrix().total"] = !!bud && bud.querySelector(".xbig b").textContent === eur(px.total);
  r["export · page Budget : un corps d'état par ligne + le total"] = !!bud && bud.querySelectorAll("tr").length === px.lots.length + 2;
  r["export · page Suivi : « réalisés sur » = la même source"] = !!sui && sui.innerText.includes(eur(px.fait) + " réalisés sur " + eur(px.total));
  closeModal(); return r;
}));
/* Mes plans : surface, budget, avancement, date, vignette */
Object.assign(t, await p.evaluate(() => {
  const r = {}; savePlanToLibrary(); const px = chantierPrix(), q = quantities(), lib = loadPlans(), e = lib[state.id];
  r["Mes plans · le résumé part avec le plan"] = !!e.resume && e.resume.budget === px.total && e.resume.taches === px.nb && e.resume.faites === px.faites && Math.abs(e.resume.m2 - q.area) < 0.06;
  openPlansModal(); const c = document.querySelector("#plansList .plancard"), g = c.querySelector(".gres").textContent;
  r["Mes plans · la carte dit surface · budget · avancement"] = g.includes(fmtM2(q.area)) && g.includes(eur(px.total) + " HT") && g.includes("chantier " + px.faites + "/" + px.nb);
  r["Mes plans · … et la date"] = /\d{2}:\d{2}/.test(c.querySelector(".glink").innerText);
  r["Mes plans · une vignette du plan"] = c.querySelectorAll(".pmini svg line").length >= 4;
  closeModal(); return r;
}));
/* un autre plan : la carte de l'exemple garde son résumé enregistré */
await p.evaluate(() => { newPlan(); }); await wait(200);
Object.assign(t, await p.evaluate(() => {
  const r = {}; openPlansModal(); const cards = [...document.querySelectorAll("#plansList .plancard")];
  const ex = cards.find((c) => /Exemple/.test(c.innerText)), e = Object.values(loadPlans()).find((x) => /Exemple/.test(x.name));
  r["Mes plans · un plan fermé montre le budget enregistré"] = !!ex && !!e && ex.querySelector(".gres").textContent.includes(eur(e.resume.budget) + " HT");
  closeModal(); return r;
}));
await p.close();

/* ═════════ 2. La pastille d'écart ═════════ */
p = await onglet();
await p.evaluate(EXEMPLE); await wait(500);
t["écart · rien en ouvrant l'exemple"] = await p.evaluate(() => !document.getElementById("budgetDelta").classList.contains("show"));
const dec = await p.evaluate(() => {
  const avant = chantierPrix().total, lv = L(), cl = lv.walls.find((w) => w.type === "cloison" && !w.st);
  sel = { kind: "wall", id: cl.id }; render(); setWallProp("st", "demolir");
  const apres = chantierPrix().total, el = document.getElementById("budgetDelta");
  const tache = chantierTasks().find((x) => { const k = tacheCible(x.id); return k && k.kind === "wall" && k.id === cl.id; });
  return { d: apres - avant, txt: el.innerText, show: el.classList.contains("show"), live: el.getAttribute("aria-live"), role: el.getAttribute("role"), lab: tache && tache.label };
});
t["écart · une décision montre la pastille"] = dec.show && dec.d > 0;
t["écart · « +X € · la tâche décidée »"] = dec.txt.startsWith("+" + (await p.evaluate((d) => eur(d), dec.d))) && !!dec.lab && dec.txt.includes(dec.lab.slice(0, 20));
t["écart · annoncée au lecteur d'écran (role=status, aria-live=polite)"] = dec.role === "status" && dec.live === "polite";
await wait(3700);
t["écart · … puis disparaît (~3 s)"] = await p.evaluate(() => !document.getElementById("budgetDelta").classList.contains("show"));
const und = await p.evaluate(() => { const a = chantierPrix().total; undo(); const el = document.getElementById("budgetDelta"); return { d: chantierPrix().total - a, txt: el.innerText, show: el.classList.contains("show") }; });
t["écart · annuler le dit aussi (« −X € · retiré : … »)"] = und.show && und.d < 0 && und.txt.startsWith("−") && /retiré/.test(und.txt);
await wait(3700);
/* Suppr en vue Travaux : le message « Annuler » reste, la pastille s'y ajoute */
await p.evaluate(() => { const cl = L().walls.find((w) => w.type === "cloison" && !w.st); sel = { kind: "wall", id: cl.id }; render(); });
await p.keyboard.press("Delete"); await wait(120);
Object.assign(t, await p.evaluate(() => ({
  "écart · Suppr : la pastille s'affiche…": document.getElementById("budgetDelta").classList.contains("show"),
  "écart · … sans effacer « Annuler » du message": !!document.querySelector("#toast .tact"),
})));
await wait(3700);
t["écart · rien en chargeant un plan type"] = await p.evaluate(() => { loadTemplate(TEMPLATES[1].id); return !document.getElementById("budgetDelta").classList.contains("show"); });
await p.close();

/* ═════════ 3. Plan vide : Estimer grisé en haut et en bas, avec la même phrase ═════════ */
p = await onglet();
await p.evaluate(() => closeWelcome("blank")); await wait(200);
Object.assign(t, await p.evaluate(() => {
  const r = {}, eb = document.getElementById("estBtnTop"), F = document.getElementById("pfoot");
  r["vide · « Estimer » du haut grisé (aria-disabled)"] = eb.getAttribute("aria-disabled") === "true" && eb.classList.contains("attente");
  r["vide · … et il dit pourquoi (survol, lecteur d'écran)"] = eb.title === ATTENTE_PIECE;
  r["vide · la carte du bas attend, avec la même phrase"] = F.innerText.includes(ATTENTE_PIECE) && !F.querySelector("button");
  eb.click();
  r["vide · un clic en haut n'ouvre rien et redit la phrase"] = !modaleOuverte() && document.getElementById("toast").textContent.includes(ATTENTE_PIECE);
  const lv = L(); [[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0]].forEach((z) => lv.walls.push({ id: uid(), a: v(z[0], z[1]), b: v(z[2], z[3]), type: "mur" })); afterChange();
  r["vide · dès la 1re pièce, « Estimer » redevient actif en haut et en bas"] = !eb.hasAttribute("aria-disabled") && !!F.querySelector(".budgetbtn");
  r["rien de décidé · le pied reste compact (≤ 170 px)"] = F.getBoundingClientRect().height <= 170 && /Rien de décidé/.test(F.innerText);
  /* D46 (cj-integration00) : démolir la façade d'une pièce seule ouvre toutes les pièces en vue
     Travaux. La carte tombait à « 0 € · … dès ta première pièce fermée » et « Estimer » se bloquait
     pendant que le Suivi comptait les tâches : l'attente se lit sur les pièces des DEUX états et sur
     les tâches. */
  setMode("projet"); closeModal(); const haut = lv.walls[0]; sel = { kind: "wall", id: haut.id }; render(); setWallProp("porteur", "non"); setWallProp("st", "demolir"); sel = null; render();
  const px = chantierPrix(), q = quantities();
  r["façade démolie · plus aucune pièce fermée après travaux, mais des tâches"] = q.rooms === 0 && q.roomsBefore === 1 && px.nb > 0 && px.total > 0;
  r["façade démolie · la carte montre le montant du Suivi, pas l'attente"] = document.getElementById("budgetVal").textContent === eur(px.total) && !F.innerText.includes(ATTENTE_PIECE) && !!F.querySelector(".budgetbtn");
  r["façade démolie · « Estimer » reste actif et s'ouvre"] = !eb.hasAttribute("aria-disabled") && (showEstimate(), modaleOuverte()?.id === "m-estimate") && document.getElementById("estTotal")?.textContent === eur(px.total);
  closeModal();
  r["façade démolie · l'étape « Dessiner tes pièces » reste faite"] = etapesProjet().find((e) => e.k === "pieces").fait;
  setTool("select"); sel = null; render();
  r["façade démolie · la vue d'ensemble ne redemande pas de tracer les murs"] = !/Trace les murs extérieurs/.test(document.getElementById("pbody").innerText) && /Plus aucune pièce fermée après ces travaux/.test(document.getElementById("pbody").innerText);
  return r;
}));
await p.close();

/* ═════════ 4. Gratuit : pas de montant, pas de pastille, un seul appel ═════════ */
p = await onglet({ pro: false });
await p.evaluate(EXEMPLE); await wait(300);
Object.assign(t, await p.evaluate(() => {
  const r = {}, F = document.getElementById("pfoot");
  r["gratuit · le pied : un seul appel, qui reprend DROITS"] = [...F.querySelectorAll("button, a")].length === 1 && F.innerText.includes(avecPro("budget"));
  r["gratuit · aucun montant dans le pied"] = !/\d\s?\d{3} €|\d+ €/.test(F.innerText.replace(/•+ €/g, ""));
  r["gratuit · le pied reste compact (≤ 170 px)"] = F.getBoundingClientRect().height <= 170;
  const cl = L().walls.find((w) => w.type === "cloison" && !w.st); sel = { kind: "wall", id: cl.id }; render(); setWallProp("st", "demolir");
  r["gratuit · pas de pastille d'écart (le montant est Pro)"] = !document.getElementById("budgetDelta").classList.contains("show") && !document.getElementById("budgetDelta").textContent;
  savePlanToLibrary(); openPlansModal(); const g = document.querySelector("#plansList .plancard .gres").textContent;
  r["gratuit · Mes plans : surface et tâches, sans montant"] = g.includes(fmtM2(quantities().area)) && /tâche/.test(g) && !/€/.test(g);
  closeModal(); return r;
}));
await p.close();

/* ═════════ 5. Moins d'animation demandée : aucun compteur ═════════ */
p = await onglet({ calme: true });
await p.evaluate(EXEMPLE); await wait(200);
await p.evaluate(() => showEstimate()); await wait(60);
t["calme · Estimer : le montant s'affiche d'emblée"] = await p.evaluate(() => document.getElementById("estTotal").textContent === eur(chantierPrix().total));
await p.evaluate(() => { closeModal(); const cl = L().walls.find((w) => w.type === "cloison" && !w.st); sel = { kind: "wall", id: cl.id }; render(); setWallProp("st", "demolir"); }); await wait(60);
t["calme · pied : le nouveau montant s'affiche d'emblée"] = await p.evaluate(() => document.getElementById("budgetVal").textContent === eur(chantierPrix().total));
await p.close();

/* ═════════ 6. Téléphone : le budget dans le tiroir fermé, la barre de zoom ne le couvre pas ═════════ */
p = await onglet({ larg: 390, haut: 844, mobile: true });
await p.evaluate(() => { closeWelcome("sample"); closeModal(); sel = null; render(); }); await wait(250);
Object.assign(t, await p.evaluate(() => {
  const r = {}, px = chantierPrix(), lb = document.getElementById("sheetLabel").textContent;
  r["téléphone · tiroir fermé : surface et budget"] = lb.includes(eur(px.total) + " HT") && lb.includes(fmtM2(habView(quantities()).area));
  toggleSheet(true);
  r["téléphone · tiroir ouvert : la barre de zoom s'efface"] = getComputedStyle(document.querySelector(".zoomctl")).display === "none";
  toggleSheet(false);
  return r;
}));
await p.close();
p = await onglet({ larg: 390, haut: 844, mobile: true, pro: false });
await p.evaluate(() => { closeWelcome("sample"); closeModal(); sel = null; render(); }); await wait(250);
t["téléphone gratuit · tiroir : la surface, pas de montant"] = await p.evaluate(() => !/€/.test(document.getElementById("sheetLabel").textContent));
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le budget se lit partout pareil, et chaque décision le fait bouger à vue");
process.exit(echecs.length || errs.length ? 1 : 0);
