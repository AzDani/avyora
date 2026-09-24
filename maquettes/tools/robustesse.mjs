/**
 * Robustesse et zéro perte de travail (D38).
 *
 * Chaque contrôle rejoue un constat du jury, avec de vrais gestes (clavier, souris) quand c'est le
 * geste qui était fautif :
 *   - les fenêtres : rôle de dialogue, focus dedans, Tab qui y reste, Échap qui ferme, focus rendu,
 *     et aucune touche qui atteigne le plan caché derrière ;
 *   - le clavier : Ctrl/Cmd + lettre ne change jamais d'outil, Ctrl+S enregistre, Espace active un
 *     bouton, Ctrl+Z pendant un tracé ne laisse pas de mur fantôme ;
 *   - la vue Travaux : Suppr marque ce qui existe (à démolir, à boucher, à déposer), n'efface que
 *     ce qui a été créé ; la vue finale se lit sans se modifier ;
 *   - la sélection de plusieurs équipements, dans les trois vues ;
 *   - les pertes de travail : Nouveau, plan type, exemple, ouvrir, supprimer, limite gratuite,
 *     rechargement, indicateur « Enregistré », calque trop lourd.
 *
 *   node maquettes/tools/robustesse.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/robustesse.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
/* Un onglet neuf. Le stockage n'est vidé qu'une fois par onglet : un rechargement garde ce que la
   page a écrit, comme chez l'utilisateur. */
async function onglet(largeur = 1400, hauteur = 900) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: largeur, height: hauteur });
  await p.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem("rob")) { localStorage.clear(); sessionStorage.setItem("rob", "1"); } } catch {} });
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}
const ecran = (p, x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
const clic = async (p, x, y) => { const q = await ecran(p, x, y); await p.mouse.move(q.x, q.y); await wait(30); await p.mouse.click(q.x, q.y); await wait(90); };
const ctrl = async (p, k) => { await p.keyboard.down("Control"); await p.keyboard.press(k); await p.keyboard.up("Control"); await wait(60); };
const shift = async (p, fn) => { await p.keyboard.down("Shift"); await fn(); await p.keyboard.up("Shift"); };

/* ── 1. Les fenêtres et le clavier ─────────────────────────────────────────────────────── */
let p = await onglet();
Object.assign(t, await p.evaluate(() => {
  const r = {}, m = document.querySelector("#m-welcome .modal"), ae = document.activeElement;
  r["accueil · rôle de dialogue, aria-modal, titre relié"] = m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true" && (document.getElementById(m.getAttribute("aria-labelledby"))?.textContent || "").length > 5;
  r["accueil · le focus est dans la fenêtre, sur le choix recommandé"] = m.contains(ae) && /exemple/i.test(ae.textContent);
  r["accueil · une croix de fermeture visible"] = !!m.querySelector(".mx") && m.querySelector(".mx").getClientRects().length > 0;
  r["toutes les fenêtres ont leur croix"] = [...document.querySelectorAll(".overlay .modal")].every((x) => x.querySelector(".mx"));
  return r;
}));
for (let i = 0; i < 14; i++) await p.keyboard.press("Tab");
t["Tab ×14 : le focus ne quitte pas la fenêtre"] = await p.evaluate(() => document.querySelector("#m-welcome .modal").contains(document.activeElement));
await shift(p, async () => { for (let i = 0; i < 5; i++) await p.keyboard.press("Tab"); });
t["Maj+Tab ×5 : le focus ne quitte pas la fenêtre"] = await p.evaluate(() => document.querySelector("#m-welcome .modal").contains(document.activeElement));
const outil0 = await p.evaluate(() => tool);
const nEx = await p.evaluate(() => L().walls.length); /* D42 : l'exemple a changé de forme (entrée) ; on compte ses murs au lieu de les écrire en dur */
for (const k of ["d", "m", "p", "Delete"]) await p.keyboard.press(k);
t["lettres d'outil et Suppr sous l'accueil : ni outil changé, ni plan touché"] = await p.evaluate(([o, n]) => tool === o && L().walls.length === n && n > 4, [outil0, nEx]);
await p.keyboard.press("Escape"); await wait(80);
Object.assign(t, await p.evaluate(() => ({
  "Échap ferme l'accueil": !modaleOuverte(),
  "…il ne reviendra pas (drapeau posé)": localStorage.getItem("avyora-plan-welcome") === "1",
})));
t["…et le plan n'a pas bougé (l'exemple reste)"] = await p.evaluate((n) => /Exemple/.test(state.name) && L().walls.length === n, nEx);
await p.evaluate(() => { localStorage.removeItem("avyora-plan-welcome"); openModal("welcome"); });
await p.mouse.click(10, 450); await wait(80);
t["clic à côté de l'accueil : il se ferme et ne reviendra pas"] = await p.evaluate(() => !modaleOuverte() && localStorage.getItem("avyora-plan-welcome") === "1");
/* D41 : « Mes plans » vit dans le menu Fichier — Entrée ouvre le menu, deux flèches descendent jusqu'à
   « Mes plans », Entrée l'ouvre ; Échap ferme la fenêtre et rend le focus au bouton d'origine (« Fichier »). */
await p.focus("#fichierBtn"); await p.keyboard.press("Enter"); await wait(80);
await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await wait(40);
t["menu Fichier : les flèches mènent à « Mes plans »"] = await p.evaluate(() => document.activeElement?.id === "plansBtn");
await p.keyboard.press("Enter"); await wait(80);
t["Entrée sur « Mes plans » l'ouvre"] = await p.evaluate(() => modaleOuverte()?.id === "m-plans");
await p.keyboard.press("Escape"); await wait(80);
t["Échap la ferme, et le focus revient sur le bouton d'origine"] = await p.evaluate(() => !modaleOuverte() && document.activeElement?.id === "fichierBtn");
const nMurs = await p.evaluate(() => { const w = L().walls.find((x) => x.type === "cloison"); sel = { kind: "wall", id: w.id }; render(); showEstimate(); return L().walls.length; });
await p.keyboard.press("Delete"); await p.keyboard.press("Backspace"); await ctrl(p, "z"); await wait(60);
t["Suppr et Ctrl+Z derrière « Estimer » : le plan caché ne bouge pas"] = await p.evaluate((n) => L().walls.length === n && !!findWall(sel?.id) && !history.length, nMurs);
await p.keyboard.press("Escape"); await wait(60);
t["Échap ferme « Estimer »"] = await p.evaluate(() => !modaleOuverte());
/* Espace active un bouton ; sur le plan, il reste « Espace + glisser » */
await p.evaluate(() => { localStorage.removeItem("avyora-plan-welcome"); openModal("welcome"); });
await p.keyboard.press("Space"); await wait(80);
t["Espace sur « Découvrir avec l'exemple » l'active"] = await p.evaluate(() => !modaleOuverte());
/* D42 : à la première visite, la visite guidée démarre ; elle garde le clavier, Échap la ferme */
t["…la visite guidée démarre (première visite)"] = await p.evaluate(() => !!visite);
await p.keyboard.press("Escape"); await wait(80);
t["…Échap la ferme, et le plan reprend le clavier"] = await p.evaluate(() => !visite && localStorage.getItem("avyora-plan-tuto") === "passe");
await p.evaluate(() => { clearSel(); setTool("select"); document.querySelector('#tools .tb[aria-label="Zone"]').focus(); /* D39 : l'outil B s'appelle « Zone » */ });
await p.keyboard.press("Tab"); await p.keyboard.press("Space"); await wait(60);
t["Tab jusqu'à l'outil « Murs » puis Espace : il est choisi"] = await p.evaluate(() => tool === "mur" && document.activeElement?.getAttribute("aria-label") === "Murs");
await p.evaluate(() => { setTool("select"); document.activeElement?.blur?.(); });
await p.keyboard.down("Space");
t["Espace sur le plan : « Espace + glisser » reste disponible"] = await p.evaluate(() => keys.space === true);
await p.keyboard.up("Space");
await p.click('#tools .tb[aria-label="Murs"]'); await wait(40);
await p.keyboard.down("Space");
t["outil cliqué à la souris puis Espace : on déplace la vue, l'outil n'est pas recliqué"] = await p.evaluate(() => keys.space === true && tool === "mur");
await p.keyboard.up("Space"); await p.evaluate(() => setTool("select"));
/* Ctrl / Cmd + lettre */
const idMur = await p.evaluate(() => { const w = L().walls.find((x) => x.type === "cloison"); sel = { kind: "wall", id: w.id }; render(); return w.id; });
await ctrl(p, "c");
t["Ctrl+C sur un mur : l'outil ne change pas, la sélection reste"] = await p.evaluate((id) => tool === "select" && sel?.id === id, idMur);
await p.evaluate(() => { clearSel(); render(); });
for (const k of ["d", "e", "m", "t", "b"]) await ctrl(p, k);
t["Ctrl+D/E/M/T/B : l'outil ne change jamais"] = await p.evaluate(() => tool === "select");
await ctrl(p, "s"); await wait(80);
t["Ctrl+S range le plan dans « Mes plans »"] = await p.evaluate(() => !!(state.id && loadPlans()[state.id]));
await p.evaluate(() => { sel = { kind: "wall", id: L().walls.find((x) => x.type === "cloison").id }; setWallProp("t", 0.1); });
await ctrl(p, "z");
t["Ctrl+Z annule"] = await p.evaluate((id) => !findWall(id).t || Math.abs(findWall(id).t - 0.1) > 1e-6, idMur);
await ctrl(p, "y");
t["Ctrl+Y rétablit"] = await p.evaluate((id) => Math.abs((findWall(id).t || 0) - 0.1) < 1e-6, idMur);
await p.close();

/* ── 2. Le tracé : Ctrl+Z pendant le tracé, pièce fermée contre une autre ───────────────── */
p = await onglet();
await p.evaluate(() => closeWelcome("blank")); await wait(100);
Object.assign(t, await p.evaluate(() => ({
  "feuille blanche à la 1re visite : aucun historique (Ctrl+Z ne ramène pas l'exemple)": history.length === 0 && L().walls.length === 0,
  "…et pas de promesse « Ctrl+Z pour retrouver l'ancien »": !/retrouver l'ancien/.test(document.getElementById("toast").textContent),
})));
await p.evaluate(() => { view.zoom = 80; view.ox = 160; view.oy = 140; draw(); });
await clic(p, 0, 0);
const q = await ecran(p, 2, 0.1); await p.mouse.move(q.x, q.y); await wait(40);
await p.keyboard.type("3"); await p.keyboard.press("Enter"); await wait(80);
const depart = await p.evaluate(() => ({ n: L().walls.length, x: chain[0].x, y: chain[0].y }));
t["longueur tapée : un mur posé"] = depart.n === 1;
await ctrl(p, "z");
t["Ctrl+Z pendant le tracé : le mur part, le tracé repart du point d'avant"] = await p.evaluate((d) => L().walls.length === 0 && chain.length === 1 && Math.abs(chain[0].x - d.x) < 1e-6 && Math.abs(chain[0].y - d.y) < 1e-6, depart);
await clic(p, 0, 2);
t["clic suivant : le mur part du point d'avant, aucun mur orphelin"] = await p.evaluate((d) => L().walls.length === 1 && [L().walls[0].a, L().walls[0].b].some((z) => Math.abs(z.x - d.x) < 1e-6 && Math.abs(z.y - d.y) < 1e-6), depart);
await p.keyboard.press("Escape");
await ctrl(p, "z"); await ctrl(p, "y");
t["Ctrl+Y après le tracé : aucun tracé fantôme"] = await p.evaluate(() => chain.length === 0 && chainWallIds.length === 0);
await p.evaluate(() => { state = blankState(); history = []; afterChange(); setTool("mur"); wallType = "mur"; view.zoom = 80; view.ox = 160; view.oy = 140; draw(); });
for (const [x, y] of [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]]) await clic(p, x, y);
for (const [x, y] of [[4, 0], [7, 0], [7, 3.5], [4, 3.5]]) await clic(p, x, y);
t["2e pièce fermée contre la 1re : le tracé s'arrête"] = await p.evaluate(() => chain.length === 0 && (facesCache[L().id] || []).filter((f) => f.room).length === 2);
const n2 = await p.evaluate(() => L().walls.length);
await clic(p, 5.5, 1.75);
t["clic suivant dans la pièce : aucun mur parasite"] = await p.evaluate((n) => L().walls.length === n, n2);
await p.close();

/* ── 3. Vue Travaux : Suppr marque ce qui existe ─────────────────────────────────────────── */
p = await onglet();
await p.evaluate(() => { closeModal(); setMode("projet"); closeModal(); setTool("select"); });
const avant = await p.evaluate(() => { const lv = L(), cl = lv.walls.find((w) => w.type === "cloison" && !w.st); sel = { kind: "wall", id: cl.id }; render();
  return { cl: cl.id, nW: lv.walls.length, nT: chantierTasks().length, px: chantierPrix().total, bouton: [...document.querySelectorAll("#pbody .danger")].map((x) => x.textContent.trim()), hint: document.getElementById("hint").textContent }; });
t["Travaux · le bouton rouge d'un mur existant dit « À démolir »"] = avant.bouton.includes("À démolir");
t["Travaux · la bulle d'aide dit « Suppr = à démolir »"] = /Suppr/.test(avant.hint) && /démolir/.test(avant.hint);
await p.keyboard.press("Delete"); await wait(80);
Object.assign(t, await p.evaluate((a) => { const r = {}, w = findWall(a.cl);
  r["Suppr sur un mur existant : il reste, marqué « À démolir »"] = !!w && wst(w) === "demolir" && L().walls.length === a.nW;
  r["…il reste au relevé (vue Avant travaux)"] = wallDrawn(w, "existant");
  /* D42 : la tâche de démolition de CE mur (compter les tâches ne suffit plus : l'exemple rebouche une porte dans cette cloison, qui part avec elle) */
  r["…et sa démolition entre au chiffrage"] = chantierTasks().some((x) => { const k = tacheCible(x.id); return k && k.kind === "wall" && k.id === a.cl && /^Démolir/.test(x.label); }) && chantierPrix().total >= a.px;
  r["…avec « Annuler » dans le message"] = !!document.querySelector("#toast .tact");
  return r; }, avant));
await p.evaluate(() => document.querySelector("#toast .tact").click()); await wait(60);
t["« Annuler » rend le mur à son état"] = await p.evaluate((id) => wst(findWall(id)) === "existant", avant.cl);
Object.assign(t, await p.evaluate(() => { const r = {}, lv = L();
  const fen = lv.openings.find((o) => o.type === "fenetre" && !o.st), nO = lv.openings.length; sel = { kind: "opening", id: fen.id }; render(); deleteSel();
  r["Suppr sur une fenêtre existante : « À boucher », pas effacée"] = ost(fen) === "boucher" && lv.openings.length === nO;
  const lit = lv.items.find((i) => i.type === "lit"), nI = lv.items.length; clearSel(); sel = { kind: "item", id: lit.id }; render(); deleteSel();
  r["Suppr sur un meuble existant : « À déposer », pas effacé"] = ist(lit) === "demolir" && lv.items.length === nI;
  const neuf = { id: uid(), a: v(6, 4.5), b: v(8, 4.5), type: "cloison", st: "creer" }; lv.walls.push(neuf); afterChange(); const nW = lv.walls.length;
  sel = { kind: "wall", id: neuf.id }; render();
  r["mur créé en Travaux : le bouton dit « Supprimer »"] = [...document.querySelectorAll("#pbody .danger")].some((x) => x.textContent.trim() === "Supprimer");
  deleteSel();
  r["Suppr sur un mur créé en Travaux : il s'efface"] = !findWall(neuf.id) && lv.walls.length === nW - 1;
  const ex = lv.items.filter((i) => !i.st && i.type === "prise").slice(0, 2), pose = { id: uid(), type: "radiateur", x: 6, y: 5, w: ITEMS.radiateur.w, h: ITEMS.radiateur.h, rot: 0, st: "creer" };
  lv.items.push(pose); afterChange(); const nI2 = lv.items.length;
  multi = [...ex.map((i) => i.id), pose.id]; sel = { kind: "item", id: pose.id }; render(); deleteSel();
  r["sélection mixte : l'existant passe « À déposer », le neuf s'efface"] = ex.every((i) => ist(i) === "demolir") && !lv.items.some((i) => i.id === pose.id) && lv.items.length === nI2 - 1;
  const cl2 = lv.walls.find((w) => w.type === "cloison" && !w.st), note = TX(lv)[0], nT = TX(lv).length;
  msel = [{ kind: "wall", id: cl2.id }, { kind: "text", id: note.id }]; sel = { kind: "marquee" }; render(); deleteSel();
  r["sélection rectangle : le mur est marqué, la note (annotation) s'efface"] = wst(cl2) === "demolir" && TX(lv).length === nT - 1;
  return r; }));
/* Vue Après travaux : lecture seule */
await p.evaluate(() => { setTool("mur"); setMode("final"); });
Object.assign(t, await p.evaluate(() => { const r = {};
  r["vue finale : l'outil repasse en Sélection"] = tool === "select";
  setTool("mur");
  r["vue finale : l'outil Murs est refusé, avec un message et un bouton"] = tool === "select" && /lecture seule/.test(document.getElementById("toast").textContent) && !!document.querySelector("#toast .tact");
  setTool("mesure"); r["vue finale : Mesurer reste permis"] = tool === "mesure"; setTool("select");
  r["vue finale : les 7 outils de modification sont grisés"] = document.querySelectorAll('#tools .tb.ro[aria-disabled="true"]').length === 7;
  return r; }));
for (const k of ["m", "p", "e", "d", "c", "t"]) await p.keyboard.press(k);
t["vue finale : aucune lettre ne rend un outil de dessin"] = await p.evaluate(() => tool === "select");
const mur = await p.evaluate(() => { const w = L().walls.find((x) => x.type === "mur"); sel = { kind: "wall", id: w.id }; render(); return { id: w.id, a: { ...w.a }, b: { ...w.b }, n: L().walls.length, mx: (w.a.x + w.b.x) / 2, my: (w.a.y + w.b.y) / 2 }; });
await p.keyboard.press("Delete"); await p.keyboard.press("ArrowLeft"); await wait(60);
const m1 = await ecran(p, mur.mx, mur.my); await p.mouse.move(m1.x, m1.y); await p.mouse.down(); await p.mouse.move(m1.x + 30, m1.y + 60, { steps: 6 }); await p.mouse.up(); await wait(80);
Object.assign(t, await p.evaluate((m) => { const r = {}, w = findWall(m.id);
  r["vue finale : Suppr, flèches et glisser ne touchent pas le mur"] = !!w && L().walls.length === m.n && Math.abs(w.a.x - m.a.x) + Math.abs(w.a.y - m.a.y) + Math.abs(w.b.x - m.b.x) + Math.abs(w.b.y - m.b.y) < 1e-9 && wst(w) !== "demolir";
  sel = { kind: "wall", id: m.id }; render();
  r["vue finale : la fiche est en lecture (réglages désactivés, bandeau)"] = !!document.querySelector("#pbody fieldset.ro[disabled]") && !!document.querySelector("#pbody .robanner");
  const it = L().items.find((i) => itemDrawn(i)), rot = it.rot; sel = { kind: "item", id: it.id }; render(); rotateItem(); duplicateItem();
  r["vue finale : pivoter et dupliquer refusés"] = it.rot === rot && !L().items.some((i) => i !== it && i.x === it.x + 0.3 && i.y === it.y + 0.3);
  sel = { kind: "wall", id: m.id }; render(); modifierEnTravaux();
  r["« Modifier en vue Travaux » garde l'élément sélectionné"] = mode() === "projet" && sel?.id === m.id;
  return r; }, mur));
await p.close();

/* ── 4. Plusieurs équipements sélectionnés, dans les trois vues ─────────────────────────── */
p = await onglet();
await p.evaluate(() => closeModal());
for (const m of ["existant", "projet", "final"]) {
  const e0 = errs.length;
  await p.evaluate((m) => { setMode(m); closeModal(); setTool("select"); clearSel(); fitView(); render(); }, m);
  await ctrl(p, "a"); await wait(60);
  const ctrlA = await p.evaluate(() => sel?.kind === "item" && multi.length === L().items.length && /équipements/.test(document.getElementById("pbody").textContent));
  const deux = await p.evaluate((m) => L().items.filter((i) => !i.st && itemDrawn(i, m) && ["lit", "armoire"].includes(i.type)).map((i) => ({ x: i.x, y: i.y })), m);
  await p.evaluate(() => { clearSel(); render(); });
  await clic(p, deux[0].x, deux[0].y);
  await shift(p, async () => { await clic(p, deux[1].x, deux[1].y); });
  const majClic = await p.evaluate(() => sel?.kind === "item" && multi.length === 2);
  await p.evaluate(() => { clearSel(); setTool("zone"); });
  const z0 = await ecran(p, 0.3, 0.3), z1 = await ecran(p, 3.3, 3.8);
  await p.mouse.move(z0.x, z0.y); await p.mouse.down(); await p.mouse.move(z1.x, z1.y, { steps: 8 }); await p.mouse.up(); await wait(80);
  const zone = await p.evaluate(() => !!sel);
  const dessine = await p.evaluate(() => { let n = 0; const d0 = draw; return typeof d0 === "function"; });
  t[`vue ${m} · Ctrl+A, Maj+clic et rectangle sur des équipements : sélection sans erreur`] = ctrlA && majClic && zone && dessine && errs.length === e0;
}
/* filet de sécurité : une erreur du panneau n'empêche plus le plan de se redessiner */
const e5 = errs.length;
t["une erreur dans le panneau : le plan se redessine quand même"] = await p.evaluate(() => { const brut = renderPanelBrut, d0 = draw; let n = 0;
  renderPanelBrut = () => { throw new Error("panne volontaire du contrôle"); }; draw = function () { n++; return d0.apply(this, arguments); };
  try { render(); } finally { renderPanelBrut = brut; draw = d0; }
  const ok = n > 0 && /pas pu s'afficher/.test(document.getElementById("pbody").textContent); render(); return ok; });
await wait(100);
const levees = errs.splice(e5); errs.push(...levees.filter((m) => !/panne volontaire/.test(m)));
t["…et l'erreur reste signalée à la page (les contrôles la voient)"] = levees.some((m) => /panne volontaire/.test(m));
await p.close();

/* ── 5. Le panneau revient en haut quand on change d'élément ─────────────────────────────── */
p = await onglet();
await p.evaluate(() => { closeModal(); setMode("projet"); closeModal(); setTool("select"); fitView(); });
const cle = await p.evaluate(() => { const w = L().walls.find((x) => x.type === "mur"); sel = { kind: "wall", id: w.id }; render(); const P = document.getElementById("pbody"); P.scrollTop = 400; return { haut: P.scrollTop, id: w.id }; });
const piece = await p.evaluate(() => { const f = (facesCache[L().id] || []).find((x) => x.room && x.room.type === "chambre"); return { x: f.label.x + 0.3, y: f.label.y + 0.6 }; });
await clic(p, piece.x, piece.y);
t["clic sur une pièce après avoir défilé la fiche d'un mur : le panneau est en haut"] = cle.haut > 0 && await p.evaluate(() => sel?.kind === "room" && document.getElementById("pbody").scrollTop === 0);
t["réglage d'un champ du même élément : le défilement reste"] = await p.evaluate((id) => { sel = { kind: "wall", id }; render(); const P = document.getElementById("pbody"); P.scrollTop = 300; const h = P.scrollTop; setWallProp("t", 0.21); return h > 0 && P.scrollTop === h; }, cle.id);
await p.close();

/* ── 6. Zéro perte de travail (Pro) ──────────────────────────────────────────────────────── */
p = await onglet();
await p.evaluate(() => closeModal());
Object.assign(t, await p.evaluate(() => { const r = {};
  loadTemplate("studio");
  r["exemple jamais touché → plan type : rien de rangé, aucun historique"] = Object.keys(loadPlans()).length === 0 && history.length === 0;
  L().walls[0].b.x += 0.2; afterChange();
  loadTemplate("t3");
  const lib = Object.values(loadPlans());
  r["plan type retouché → autre plan type : il est rangé dans « Mes plans »"] = lib.length === 1 && /Studio/.test(lib[0].name);
  state.name = "Mon appart"; L().walls[0].b.x += 0.2; afterChange();
  newPlan();
  r["« Nouveau » : « Mon appart » est rangé avant, le plan est vierge"] = Object.values(loadPlans()).some((e) => e.name === "Mon appart") && L().walls.length === 0;
  r["…et le message le dit"] = /Mes plans/.test(document.getElementById("toast").textContent);
  return r; }));
await wait(700);
t["indicateur : « Enregistré » près du nom, branché sur la vraie écriture"] = await p.evaluate(() => { const el = document.getElementById("saveState"); return el.classList.contains("ok") && /Enregistré/.test(el.textContent) && !!JSON.parse(localStorage.getItem("avyora-plan-v2")); });
t["indicateur : « Enregistrement… » pendant l'écriture"] = await p.evaluate(() => { state.name = "Feuille"; save(); const el = document.getElementById("saveState"); return el.classList.contains("saving") && /Enregistrement/.test(el.textContent); });
await wait(700);
await p.reload({ waitUntil: "networkidle0" }); await wait(300);
Object.assign(t, await p.evaluate(() => ({
  "rechargement après « Nouveau » : la feuille blanche revient, pas l'exemple": L().walls.length === 0 && state.name === "Feuille" && !modaleOuverte(),
  "…et « Mes plans » a gardé les deux plans": Object.keys(loadPlans()).length === 2,
})));
Object.assign(t, await p.evaluate(() => { const r = {}; const id = Object.values(loadPlans()).find((e) => e.name === "Mon appart").id;
  state.levels[0].walls.push({ id: uid(), a: v(0, 0), b: v(3, 0), type: "mur" }); afterChange();
  openSavedPlan(id);
  r["ouvrir un plan rangé : la feuille en cours (modifiée) est rangée d'abord"] = state.name === "Mon appart" && Object.values(loadPlans()).some((e) => e.name === "Feuille");
  state.name = "Mon appart 2"; save(); openSavedPlan(id);
  r["« Ouvrir » le plan déjà ouvert : rien n'est rechargé, rien n'est perdu"] = state.name === "Mon appart 2";
  L().walls[0].b.x += 0.3; afterChange(); enregistrerMaintenant();
  const e = loadPlans()[id];
  r["le plan ouvert est tenu à jour dans « Mes plans »"] = e.name === "Mon appart 2" && Math.abs(e.state.levels[0].walls[0].b.x - L().walls[0].b.x) < 1e-9;
  const idF = Object.values(loadPlans()).find((x) => x.name === "Feuille").id; openPlansModal(); deleteSavedPlan(idF);
  r["supprimer un plan : il part, avec « Annuler » dans le message (visible au-dessus de la fenêtre)"] = !loadPlans()[idF] && !!document.querySelector("#toast.over .tact");
  document.querySelector("#toast .tact").click();
  r["« Annuler » le remet dans « Mes plans »"] = !!loadPlans()[idF];
  closeModal();
  closeWelcome("sample");
  r["« Découvrir avec l'exemple » sur un plan à soi : l'exemple s'ouvre, le plan reste rangé"] = /Exemple/.test(state.name) && Object.values(loadPlans()).some((x) => x.name === "Mon appart 2");
  return r; }));
await p.close();

/* ── 7. Zéro perte de travail (gratuit : la limite est annoncée AVANT) ───────────────────── */
p = await onglet();
await p.evaluate(() => { closeModal(); localStorage.setItem("avyora-plan-pro", "0"); });
Object.assign(t, await p.evaluate(() => { const r = {};
  L().walls[0].b.x += 0.2; afterChange(); newPlan();
  r["gratuit · exemple retouché puis « Nouveau » : il ne prend pas la seule place, on le dit (Annuler)"] = Object.keys(loadPlans()).length === 0 && !!document.querySelector("#toast .tact");
  document.querySelector("#toast .tact").click();
  r["…« Annuler » ramène l'exemple retouché"] = /Exemple/.test(state.name);
  state = blankState(); state.name = "Plan A"; [[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0]].forEach(([a, b2, c, d]) => L().walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" })); afterChange();
  newPlan();
  r["gratuit · « Nouveau » avec « Mes plans » plein : on l'annonce avant"] = Object.values(loadPlans()).some((e) => e.name === "Plan A") && modaleOuverte()?.id === "m-confirm" && /1 plan/.test(document.getElementById("confirmTitre").textContent) && L().walls.length === 4;
  [...document.querySelectorAll("#confirmChoix button")].find((x) => /quand même/.test(x.textContent)).click();
  r["…« Commencer quand même » : plan vierge"] = !modaleOuverte() && L().walls.length === 0;
  state.name = "Plan B"; L().walls.push({ id: uid(), a: v(0, 0), b: v(5, 0), type: "mur" }); afterChange();
  const idA = Object.values(loadPlans())[0].id; openPlansModal(); openSavedPlan(idA);
  r["gratuit · ouvrir A avec B non rangé : la perte est annoncée, pas silencieuse"] = modaleOuverte()?.id === "m-confirm" && /n'est pas enregistré/.test(document.getElementById("confirmTitre").textContent);
  [...document.querySelectorAll("#confirmChoix button")].find((x) => x.textContent === "Annuler").click();
  r["…« Annuler » : B est toujours là"] = state.name === "Plan B" && L().walls.length === 1;
  closeModal(); openSavedPlan(idA);
  [...document.querySelectorAll("#confirmChoix button")].find((x) => /sans le garder/.test(x.textContent)).click();
  r["…« Continuer sans le garder » : A s'ouvre (choix explicite)"] = state.name === "Plan A";
  r["gratuit · plus de promesse « illimité »"] = !/illimit/.test(document.documentElement.innerHTML);
  return r; }));
await p.close();

/* ── 8. Le reste des constats ─────────────────────────────────────────────────────────────── */
p = await onglet();
await p.evaluate(() => closeModal());
Object.assign(t, await p.evaluate(() => { const r = {};
  /* séparations sans mur qui se rejoignent */
  const sansErreur = () => ["existant", "projet", "final"].every((m) => { setMode(m); closeModal(); return danglingNodes(L()).length === 0; });
  r["exemple : aucune extrémité « en l'air » (séparations en L), dans les trois vues"] = sansErreur();
  for (const T of TEMPLATES.filter((x) => x.build)) { setMode("existant"); loadTemplate(T.id); r[`plan type ${T.id} : aucune extrémité « en l'air »`] = sansErreur(); }
  /* côtés d'un mur démoli */
  setMode("existant"); loadSample(); setMode("projet"); closeModal();
  const c5 = L().walls.find((w) => w.st === "demolir"), s1 = sideLabel(c5, 1), s2 = sideLabel(c5, -1);
  r["mur à démoli : ses deux côtés nomment les pièces de l'existant"] = s1 !== s2 && !/extérieur/.test(s1 + s2);
  /* au doigt, le point lumineux ne capte plus la pièce */
  setMode("existant"); loadTemplate("t3"); view.zoom = 35; hitScale = 2.2;
  /* chambre : le toucher tombe sur le lit, à 65 cm du plafonnier ; cuisine : dans le vide, à 65 cm du sien */
  const nom = (x) => x?.kind === "item" ? L().items.find((i) => i.id === x.id).type : x?.kind;
  const h = hitTest(v(1.75, 1.75)), hc = hitTest(v(8.75, 2.15)), hl = hitTest(v(1.75, 2.4)); hitScale = 1;
  r["au doigt : toucher à 65 cm d'un plafonnier ne le sélectionne pas"] = nom(h) !== "lumiere" && nom(hc) === "room";
  r["au doigt : toucher le plafonnier le sélectionne toujours"] = hl?.kind === "item" && L().items.find((i) => i.id === hl.id).type === "lumiere";
  fitView();
  /* export : un radiateur posé suffit à sortir les pages Travaux et Après travaux */
  state = blankState(); [[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0]].forEach(([a, b2, c, d]) => L().walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" })); afterChange();
  setMode("projet"); closeModal(); L().items.push({ id: uid(), type: "radiateur", x: 2, y: 0.15, w: ITEMS.radiateur.w, h: ITEMS.radiateur.h, rot: 0, st: "creer" }); afterChange();
  exportPlan();
  r["export : un équipement posé → pages Avant, Travaux et Après travaux"] = document.querySelectorAll("#exportGallery img").length === 3;
  closeModal();
  /* copier le plan complet ne touche pas au bloc à envoyer */
  const ta = document.getElementById("envoiJson"); ta.value = "CONTRAT"; try { copierPlanComplet(); } catch {}
  r["« Copier le plan complet » ne remplace pas le bloc à envoyer"] = ta.value === "CONTRAT";
  return r; }));
/* calque : une photo lourde est réduite et gardée ; un PDF est refusé en le disant */
Object.assign(t, await p.evaluate(async () => { const r = {};
  const c = document.createElement("canvas"); c.width = 3600; c.height = 2700; const g = c.getContext("2d");
  const im = g.createImageData(c.width, c.height); for (let i = 0; i < im.data.length; i += 4) { const x = (Math.random() * 255) | 0; im.data[i] = x; im.data[i + 1] = (x * 7) & 255; im.data[i + 2] = 255 - x; im.data[i + 3] = 255; } g.putImageData(im, 0, 0);
  const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.97));
  r._taille = blob.size;
  setMode("existant"); importBg(new File([blob], "plan.jpg", { type: "image/jpeg" }));
  for (let i = 0; i < 60 && !L().bg; i++) await new Promise((ok) => setTimeout(ok, 100));
  const bg = L().bg, img = bg && images[bg.img];
  r["calque : une photo de plus de 2 Mo est réduite (2000 px) et gardée"] = blob.size > 2e6 && !!img && Math.max(img.width, img.height) <= 2000 && !!(JSON.parse(localStorage.getItem("avyora-plan-images")) || {})[bg.img];
  const avant = L().bg; importBg(new File(["%PDF-1.4"], "plan.pdf", { type: "application/pdf" }));
  r["calque : un PDF est refusé, en le disant"] = L().bg === avant && /PDF/.test(document.getElementById("toast").textContent);
  delete r._taille; return r; }));
/* la densité de pixels change sans redimensionnement (écran Retina → écran standard) */
const survol = async () => { const c = await ecran(p, 1, 1); await p.mouse.move(c.x, c.y); await p.mouse.move(c.x + 5, c.y + 5); await wait(150); };
await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 }); await wait(300); await survol();
t["densité de pixels ×2 : le canvas se recale"] = await p.evaluate(() => { const r = cv.parentElement.getBoundingClientRect(); return devicePixelRatio === 2 && Math.abs(cv.width - r.width * 2) <= 2; });
await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 }); await wait(300); await survol();
t["densité de pixels ×1 : le canvas se recale"] = await p.evaluate(() => { const r = cv.parentElement.getBoundingClientRect(); return devicePixelRatio === 1 && Math.abs(cv.width - r.width) <= 2; });
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
Object.entries(t).forEach(([k, ok]) => console.log((ok ? "  ✓ " : "  ✗ ") + k));
if (errs.length) { console.log("\nerreurs de page :"); errs.forEach((e) => console.log("  " + e)); }
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ rien ne se perd, rien n'agit derrière une fenêtre");
process.exit(echecs.length || errs.length ? 1 : 0);
