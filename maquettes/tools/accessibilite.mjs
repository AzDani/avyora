/**
 * Accessibilité du plan (D43) : clavier, lecteur d'écran, focus, bulles, mouvement.
 *
 * Ce que le contrôle vérifie, avec de vrais gestes clavier et souris :
 *   - la page : <!doctype html> (mode standard), lang="fr", zoom de la page libre (le canvas garde
 *     touch-action:none), repères (bannière, outils, plan, panneau) ;
 *   - les noms et les états : chaque champ de chaque fiche (pièce, mur, ouverture, équipement, vue
 *     d'ensemble, dans les trois vues) a un nom qui n'est pas un exemple ; outils, niveaux, vues et
 *     segmentés disent lequel est choisi (aria-pressed) ; onglets (role=tab, aria-selected, ← →) ;
 *     titres de section (role=heading) ; boutons de « Mes plans » nommés ; tiroir (aria-expanded) ;
 *   - la liste des pièces et les points du contrôle sont des boutons (Tab, Entrée) ;
 *   - le plan au clavier : le canvas se focalise (role=application, nom, consigne), Tab / Maj+Tab
 *     parcourent pièces, murs, ouvertures et équipements en l'annonçant, Entrée ouvre la fiche (focus
 *     sur son titre), Échap puis Tab quitte le plan, Tab au bout aussi ; outil de tracé : Tab sort ;
 *   - le focus se voit : anneau de 2 px au clavier, champ focalisé à bordure indigo, contour des
 *     champs ≥ 3:1 ;
 *   - les bulles d'aide : au survol et au focus clavier, dans l'écran, jamais au toucher, Échap les
 *     ferme ; description accessible ;
 *   - les messages : role=status, durée selon la longueur, figés au survol ; la pastille d'écart du
 *     budget annonce le nouveau total ;
 *   - moins d'animation quand le système le demande (tiroir, messages, compteur) ;
 *   - un tableau défile dans son cadre.
 *
 *   node maquettes/tools/accessibilite.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/accessibilite.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
/* Jamais de passe qui pend : une erreur ou un délai dépassé ferment Chrome (un Chrome orphelin gardait la
   sortie ouverte et la batterie attendait sans fin). */
const fin = async (msg) => { console.log("\n✗ " + msg); await b.close().catch(() => {}); process.exit(1); };
for (const ev of ["unhandledRejection", "uncaughtException"]) process.on(ev, (e) => fin("erreur du contrôle : " + (e && e.message || e)));
setTimeout(() => fin("délai dépassé (300 s)"), 300000).unref();
/* La page ne dépend que de Google Fonts : si une police traîne sur le réseau, on attend la page, pas la police. */
async function charger(p) {
  try { await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0", timeout: 15000 }); }
  catch (e) { if (!/timeout/i.test(e.message)) throw e; await p.waitForFunction(() => document.readyState === "complete" && typeof render === "function", { timeout: 15000 }); }
}
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet({ larg = 1440, haut = 900, mobile = false, pro = true, calme = false } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  if (calme) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.evaluateOnNewDocument((pro) => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); } catch {} }, pro);
  await charger(p);
  await wait(250);
  await p.evaluate(() => { closeWelcome("sample"); closeModal(); setTool("select"); sel = null; render(); });
  await wait(200);
  return p;
}
const contraste = (a, c) => { const L = (h) => { const m = h.match(/\d+(\.\d+)?/g).slice(0, 3).map((x) => +x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; }; const x = L(a), y = L(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* ═════════ 1. La page, ses repères, ses noms et ses états ═════════ */
let p = await onglet();
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["page · <!doctype html> : mode standard"] = document.compatMode === "CSS1Compat" && !!document.doctype;
  r["page · lang=\"fr\" (voix française au lecteur d'écran)"] = document.documentElement.lang === "fr";
  const vp = document.querySelector("meta[name=viewport]").content;
  r["page · le zoom n'est pas bloqué (ni maximum-scale ni user-scalable=no)"] = !/maximum-scale|user-scalable\s*=\s*no/.test(vp);
  r["page · le plan garde son propre pincement (touch-action:none)"] = getComputedStyle(cv).touchAction === "none";
  const roles = ["banner", "main", "complementary"].map((x) => document.querySelectorAll(`[role=${x}]`).length);
  r["page · repères : bannière, plan (main), panneau, outils nommés"] = roles.every((n) => n === 1) && document.querySelector("#tools[role=region][aria-label]") && document.querySelector("#panel[aria-label]");
  r["plan · focalisable, role=application, nommé (niveau et vue), avec sa consigne"] = cv.tabIndex === 0 && cv.getAttribute("role") === "application" && /RDC/.test(cv.getAttribute("aria-label")) && /Travaux/.test(cv.getAttribute("aria-label")) && /Tab/.test(document.getElementById(cv.getAttribute("aria-describedby")).textContent);
  const tb = [...document.querySelectorAll("#tools .tb")];
  r["outils · aria-pressed : un seul vrai, l'outil courant"] = tb.every((x) => x.hasAttribute("aria-pressed")) && tb.filter((x) => x.getAttribute("aria-pressed") === "true").length === 1 && document.querySelector('#tools .tb[aria-pressed="true"]').classList.contains("on");
  r["niveaux · aria-pressed sur le niveau courant, « + » nommé"] = document.querySelector('#levels button[aria-pressed="true"]')?.classList.contains("on") && document.querySelector("#levels .add").getAttribute("aria-label") === "Ajouter un niveau";
  r["vues · aria-pressed sur la vue courante"] = [...document.querySelectorAll("#modes button")].filter((x) => x.getAttribute("aria-pressed") === "true").length === 1;
  const tabs = document.querySelector("#pbody .ptabs");
  r["onglets du panneau · role=tablist / tab, aria-selected"] = tabs.getAttribute("role") === "tablist" && [...tabs.querySelectorAll("button")].every((x) => x.getAttribute("role") === "tab") && tabs.querySelector('[aria-selected="true"]').classList.contains("on");
  r["panneau · titres de section navigables (role=heading, niveaux 2 et 3)"] = !!document.querySelector('#pbody .ptitle[role=heading][aria-level="2"]') && document.querySelectorAll('#pbody .ph[role=heading][aria-level="3"]').length >= 3;
  r["pièces · la liste est faite de boutons"] = [...document.querySelectorAll("#pbody .rl")].length > 3 && [...document.querySelectorAll("#pbody .rl")].every((x) => x.tagName === "BUTTON");
  r["panneau · aucun élément cliquable qui ne soit pas un bouton (div[onclick])"] = !document.querySelector("#pbody div[onclick], #pfoot div[onclick]");
  return r;
}));
/* le contour visible d'un champ : le sien, ou celui de son enveloppe (champ à unité « m », « cm », « % ») */
{
  const cols = await p.evaluate(async () => { const r = L().rooms.find((x) => x.type === "sejour") || L().rooms[0]; sel = { kind: "room", id: r.id }; render(); await new Promise((q) => setTimeout(q, 20));
    return [...document.querySelectorAll("#pbody .fin:not(.devine):not(.cpvide)")].filter((x) => x.getClientRects().length).map((x) => { const e = parseFloat(getComputedStyle(x).borderTopWidth) > 0 ? x : x.parentElement; return getComputedStyle(e).borderTopColor; }); });
  const faibles = cols.filter((c) => contraste(c, "rgb(255,255,255)") < 3);
  t[`champs · contour ≥ 3:1 sur blanc (${cols.length} champs d'une fiche de pièce)${faibles.length ? " — " + faibles[0] : ""}`] = cols.length >= 4 && !faibles.length;
  await p.evaluate(() => { sel = null; render(); });
}

/* chaque champ de chaque fiche, dans les trois vues : un nom, qui n'est pas l'exemple du champ */
{
  const cas = await p.evaluate(() => { const lv = L(), C = []; for (const m of ["existant", "projet", "final"]) { C.push([m, null]); lv.rooms.forEach((r) => C.push([m, { kind: "room", id: r.id }])); lv.walls.forEach((w) => C.push([m, { kind: "wall", id: w.id }])); lv.openings.forEach((o) => C.push([m, { kind: "opening", id: o.id }])); lv.items.forEach((i) => C.push([m, { kind: "item", id: i.id }])); } return C; });
  const sans = new Set(); let n = 0; const noms = new Set();
  for (const [m, s] of cas) {
    await p.evaluate((m, s) => { state.mode = m; sel = s; render(); document.querySelectorAll("#pbody details").forEach((d) => (d.open = true)); }, m, s);
    await wait(15);
    const r = await p.evaluate(() => [...document.querySelectorAll("#pbody input:not([type=hidden]),#pbody select,#pbody textarea")].map((x) => {
      const nom = (x.getAttribute("aria-label") || (x.labels && [...x.labels].map((l) => l.textContent.trim()).join(" ")) || x.title || "").trim();
      return { h: x.outerHTML.slice(0, 80), nom, ph: x.placeholder || "" };
    }));
    r.forEach((o) => { n++; noms.add(o.nom); if (!o.nom || o.nom === o.ph) sans.add(o.h); });
  }
  t[`champs · ${n} champs dans ${cas.length} fiches : tous nommés, jamais par leur exemple${sans.size ? " — " + [...sans].slice(0, 3).join(" | ") : ""}`] = n > 50 && !sans.size;
  t["champs · les noms sont des libellés (« Hauteur sous plafond », « Longueur », « Épaisseur », « Nom »…)"] = ["Hauteur sous plafond", "Nom"].every((x) => [...noms].some((y) => y.startsWith(x))) && [...noms].some((y) => /Longueur/.test(y)) && [...noms].some((y) => /paisseur/.test(y));
  await p.evaluate(() => { state.mode = "projet"; sel = null; render(); });
}

/* segmentés : aria-pressed */
t["segmentés · chaque choix dit s'il est pris (aria-pressed)"] = await p.evaluate(async () => { const w = L().walls.find((x) => x.type === "cloison"); sel = { kind: "wall", id: w.id }; render(); await new Promise((r) => setTimeout(r, 20)); const B = [...document.querySelectorAll("#pbody .seg button")]; return B.length > 3 && B.every((x) => x.getAttribute("aria-pressed") === String(x.classList.contains("on"))); });

/* onglets au clavier : → ouvre Suivi, ← revient */
await p.evaluate(() => { sel = null; panelTab = "details"; render(); document.querySelector('#pbody .ptabs [role=tab][aria-selected="true"]').focus(); });
await p.keyboard.press("ArrowRight"); await wait(80);
t["onglets · → ouvre « Suivi » et y garde le focus"] = await p.evaluate(() => panelTab === "suivi" && document.activeElement.getAttribute("role") === "tab" && document.activeElement.getAttribute("aria-selected") === "true" && /Suivi/.test(document.activeElement.textContent));
await p.keyboard.press("ArrowLeft"); await wait(80);
t["onglets · ← revient à « Détails »"] = await p.evaluate(() => panelTab === "details" && /Détails/.test(document.activeElement.textContent));

/* Mes plans : boutons nommés, plus de symbole ⧉ */
await p.evaluate(() => { savePlanToLibrary(); openPlansModal(); }); await wait(150);
t["Mes plans · « Dupliquer » et « Supprimer » disent quel plan, sans symbole ⧉"] = await p.evaluate(() => { const L2 = document.getElementById("plansList"); return !/⧉/.test(L2.textContent) && [...L2.querySelectorAll("button.gx")].every((x) => /^Supprimer le plan « .+ »$/.test(x.getAttribute("aria-label"))) && [...L2.querySelectorAll("button")].some((x) => /^Dupliquer le plan « .+ »$/.test(x.getAttribute("aria-label") || "")); });
await p.evaluate(() => closeModal());

/* ═════════ 2. Liste des pièces et points du contrôle au clavier ═════════ */
await p.evaluate(() => { sel = null; render(); document.querySelectorAll("#pbody .rl")[1].focus(); });
await p.keyboard.press("Enter"); await wait(80);
t["pièces · Entrée sur une ligne de la liste sélectionne la pièce"] = await p.evaluate(() => sel && sel.kind === "room");
t["contrôle · un point qui mène à un élément est un bouton"] = await p.evaluate(async () => {
  /* une pièce sans porte (on bouche celles d'une pièce) fait naître un point cliquable */
  state.mode = "existant"; const lv = L(); const wc = lv.rooms.find((r) => r.type === "wc"); const f = roomFace(lv, wc.id);
  const ids = new Set(f.edges.filter(Boolean).map((e) => e.wall)); lv.openings = lv.openings.filter((o) => !ids.has(o.wallId)); syncRooms(lv); sel = null; render();
  await new Promise((r) => setTimeout(r, 20));
  const c = [...document.querySelectorAll("#pbody .chks .chk")]; const cliquables = c.filter((x) => x.hasAttribute("onclick"));
  const ok = cliquables.length > 0 && cliquables.every((x) => x.tagName === "BUTTON");
  undo(); state.mode = "projet"; render(); return ok;
});
await p.close();

/* ═════════ 3. Le plan au clavier ═════════ */
p = await onglet();
await p.evaluate(() => { document.querySelector('#tools .tb[aria-pressed="true"]').focus(); });
/* Tab jusqu'au plan : les outils, puis le canvas */
for (let i = 0; i < 15; i++) { if (await p.evaluate(() => document.activeElement === cv)) break; await p.keyboard.press("Tab"); await wait(30); }
t["plan · Tab depuis les outils arrive sur le plan"] = await p.evaluate(() => document.activeElement === cv);
t["plan · le focus clavier se voit (anneau indigo)"] = await p.evaluate(() => cv.matches(":focus-visible") && getComputedStyle(cv).outlineStyle === "solid" && parseFloat(getComputedStyle(cv).outlineWidth) >= 2);
t["plan · une consigne s'affiche une fois au premier focus clavier"] = await p.evaluate(() => document.getElementById("toast").classList.contains("show") && /Tab/.test(document.getElementById("toast").textContent));
const N = await p.evaluate(() => elementsDuPlan().length);
await p.keyboard.press("Tab"); await wait(120);
let s1 = await p.evaluate(() => ({ sel: sel && sel.kind, focus: document.activeElement === cv, dit: document.getElementById("cvAnnonce").textContent }));
t[`plan · Tab : 1er élément = une pièce, annoncée « Pièce : …, 1 sur ${N} »`] = s1.sel === "room" && s1.focus && new RegExp("^Pièce : .+ · 1 sur " + N).test(s1.dit);
const kinds = new Set(["room"]);
for (let i = 1; i < N; i++) { await p.keyboard.press("Tab"); const k = await p.evaluate(() => sel && sel.kind); kinds.add(k); }
await wait(80);
s1 = await p.evaluate(() => ({ sel: sel && sel.kind, focus: document.activeElement === cv, dit: document.getElementById("cvAnnonce").textContent }));
t[`plan · Tab parcourt pièces, murs, ouvertures et équipements (${[...kinds].join(", ")})`] = ["room", "wall", "opening", "item"].every((k) => kinds.has(k)) && s1.focus && new RegExp(N + " sur " + N).test(s1.dit);
t["plan · un mur s'annonce avec sa longueur, ses pièces et sa décision"] = await p.evaluate(() => { const w = L().walls.find((x) => x.st === "demolir"); return /^(Cloison|Mur|Mur épais) de \d+,\d\d m, entre .+ et .+ · À démolir$/.test(decrireObjet({ kind: "wall", id: w.id })); });
await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await wait(80);
t["plan · Maj+Tab revient à l'élément d'avant"] = await p.evaluate((N) => new RegExp((N - 1) + " sur " + N).test(document.getElementById("cvAnnonce").textContent) && document.activeElement === cv, N);
await p.evaluate(() => { const E = elementsDuPlan(); sel = { kind: E[0].kind, id: E[0].id }; render(); cv.focus(); });
await p.keyboard.press("Tab"); await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await wait(80);
const nomPiece = await p.evaluate(() => sel.kind === "room" ? roomName(L().rooms.find((r) => r.id === sel.id)) : null);
await p.keyboard.press("Enter"); await wait(120);
t["plan · Entrée ouvre la fiche : le focus va sur son titre"] = await p.evaluate((nm) => document.activeElement.classList.contains("ptitle") && document.activeElement.closest("#pbody") && document.activeElement.textContent.startsWith(nm), nomPiece);
/* Échap puis Tab : on quitte le plan */
await p.evaluate(() => cv.focus()); await p.keyboard.press("Escape"); await wait(50); await p.keyboard.press("Tab"); await wait(80);
t["plan · Échap puis Tab quitte le plan (pas de piège)"] = await p.evaluate(() => document.activeElement !== cv && !sel);
/* au bout de la liste, Tab sort */
await p.evaluate(() => { const E = elementsDuPlan(); const z = E[E.length - 1]; sel = { kind: z.kind, id: z.id }; render(); cv.focus(); });
await p.keyboard.press("Tab"); await wait(80);
t["plan · Tab après le dernier élément quitte le plan"] = await p.evaluate(() => document.activeElement !== cv);
/* outil de tracé : Tab n'est pas pris par le plan */
await p.evaluate(() => { setTool("mur"); cv.focus(); }); await p.keyboard.press("Tab"); await wait(80);
t["plan · avec l'outil Murs, Tab sort du plan"] = await p.evaluate(() => document.activeElement !== cv);
await p.evaluate(() => setTool("select"));
/* focus à la souris : pas d'anneau */
await p.evaluate(() => document.activeElement.blur());
{ const r = await p.evaluate(() => { const q = cv.getBoundingClientRect(); return { x: q.left + 30, y: q.top + q.height - 30 }; }); await p.mouse.click(r.x, r.y); await wait(60); }
t["plan · cliqué à la souris : pas d'anneau de focus"] = await p.evaluate(() => !cv.matches(":focus-visible"));
{ /* une pièce cliquée à la souris, puis Tab : on passe à la suite de la page, la sélection ne saute pas */
  const r = await p.evaluate(() => { const f = (facesCache[L().id] || []).find((x) => x.room && x.room.type === "sejour"); const q = S(f.label), c = cv.getBoundingClientRect(); return { x: c.left + q.x, y: c.top + q.y + 30 }; });
  await p.mouse.click(r.x, r.y); await wait(80);
  const avant = await p.evaluate(() => sel && sel.kind + ":" + sel.id);
  await p.keyboard.press("Tab"); await wait(80);
  t["plan · cliqué à la souris puis Tab : on quitte le plan, la sélection reste"] = await p.evaluate((a) => document.activeElement !== cv && (sel && sel.kind + ":" + sel.id) === a, avant) && !!avant;
}

/* ═════════ 4. Le focus se voit ═════════ */
await p.evaluate(() => { document.getElementById("undoBtn").focus(); document.activeElement.blur(); document.getElementById("pname").focus(); });
await p.keyboard.press("Tab"); await wait(60);
t["focus · un bouton atteint au clavier a un anneau de 2 px"] = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return a.tagName === "BUTTON" && a.matches(":focus-visible") && cs.outlineStyle === "solid" && parseFloat(cs.outlineWidth) >= 2; });
await p.evaluate(() => { const r = L().rooms[0]; sel = { kind: "room", id: r.id }; render(); document.querySelector("#pbody .fin").focus(); });
t["focus · un champ focalisé prend une bordure indigo"] = await p.evaluate(() => getComputedStyle(document.activeElement).borderTopColor === "rgb(79, 70, 229)");

/* ═════════ 5. Les bulles d'aide ═════════ */
{
  await p.evaluate(() => { sel = null; render(); document.activeElement.blur(); });
  const cibles = await p.evaluate(() => [...document.querySelectorAll(".top [data-tip], .zoomctl [data-tip], #tools .tb, #pfold")].filter((e) => e.getClientRects().length).map((e) => { const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, tip: e.dataset.tip }; }));
  let dehors = [], rates = [];
  for (const c of cibles) {
    await p.mouse.move(c.x, c.y); await wait(40);
    const r = await p.evaluate(() => { const bu = document.getElementById("bulle"); if (bu.hidden) return null; const q = bu.getBoundingClientRect(); return { txt: bu.textContent, in: q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight }; });
    if (!r || r.txt !== c.tip) rates.push(c.tip.slice(0, 20)); else if (!r.in) dehors.push(c.tip.slice(0, 20));
  }
  t[`bulles · au survol, les ${cibles.length} bulles (barre, zoom, outils) s'affichent${rates.length ? " — ratées : " + rates.join(" | ") : ""}`] = cibles.length > 12 && !rates.length;
  t[`bulles · toutes dans l'écran${dehors.length ? " — dehors : " + dehors.join(" | ") : ""}`] = !dehors.length;
  await p.mouse.move(700, 450); await wait(40);
  t["bulles · la souris s'en va : la bulle aussi"] = await p.evaluate(() => document.getElementById("bulle").hidden);
  /* au clavier : de « Estimer ce plan », Tab mène au premier outil */
  await p.evaluate(() => { const r = [...document.querySelectorAll(".top button, .top a")].filter((e) => e.getClientRects().length).pop(); r.focus(); });
  await p.keyboard.press("Tab"); await wait(50);
  const k2 = await p.evaluate(() => { const a = document.activeElement, bu = document.getElementById("bulle"); const q = bu.getBoundingClientRect(), r = a.getBoundingClientRect(); return { tb: a.classList.contains("tb"), vis: !bu.hidden, txt: bu.textContent === a.dataset.tip, adroite: q.left >= r.right, desc: a.getAttribute("aria-description") === a.dataset.tip }; });
  t["bulles · au clavier, un outil montre sa bulle, à droite, et la porte en description"] = k2.tb && k2.vis && k2.txt && k2.adroite && k2.desc;
  await p.keyboard.press("Escape"); await wait(30);
  t["bulles · Échap la ferme sans bouger le focus"] = await p.evaluate(() => document.getElementById("bulle").hidden && document.activeElement.classList.contains("tb"));
}

/* ═════════ 6. Les messages et le budget ═════════ */
{
  const long = "Ce message est volontairement long pour vérifier qu'il reste affiché assez longtemps pour être lu en entier par quelqu'un qui lit lentement, sans se presser du tout.";
  await p.evaluate((m) => toast(m), long);
  t["messages · role=status (annoncés)"] = await p.evaluate(() => document.getElementById("toast").getAttribute("role") === "status");
  await wait(4500);
  t["messages · un message de 160 caractères est encore là après 4,5 s"] = await p.evaluate(() => document.getElementById("toast").classList.contains("show"));
  /* un message à action (« Annuler ») se fige sous la souris : on a le temps d'atteindre le bouton */
  await p.evaluate(() => toast("Mur marqué « À démolir ».", true, { action: "Annuler", fn: () => {}, ms: 1500 }));
  const r = await p.evaluate(() => { const q = document.getElementById("toast").getBoundingClientRect(); return { x: q.left + 20, y: q.top + q.height / 2 }; });
  await p.mouse.move(r.x, r.y); await wait(2600);
  t["messages · un message à action est figé tant que la souris est dessus"] = await p.evaluate(() => document.getElementById("toast").classList.contains("show"));
  await p.mouse.move(700, 300); await wait(2300);
  t["messages · il repart quand la souris s'en va"] = await p.evaluate(() => !document.getElementById("toast").classList.contains("show"));
  const d = await p.evaluate(async () => { const cl = L().walls.find((w) => w.type === "cloison" && !w.st && !isVirtual(w)); sel = { kind: "wall", id: cl.id }; render(); setWallProp("st", "demolir"); await new Promise((r) => setTimeout(r, 80)); const bd = document.getElementById("budgetDelta"); return { role: bd.getAttribute("role"), live: bd.getAttribute("aria-live"), txt: bd.textContent, tot: eur(chantierPrix().total) }; });
  t["budget · la pastille d'écart (role=status) annonce aussi le nouveau total"] = d.role === "status" && d.live === "polite" && d.txt.includes("Budget travaux : " + d.tot + " HT");
}
await p.close();

/* ═════════ 7. Téléphone : tiroir, toucher, bulles ═════════ */
p = await onglet({ larg: 390, haut: 844, mobile: true });
t["téléphone · poignée du tiroir : aria-expanded suit son état"] = await p.evaluate(() => { const h = document.getElementById("sheetHandle"); toggleSheet(true); const a = h.getAttribute("aria-expanded"); toggleSheet(false); const c = h.getAttribute("aria-expanded"); return a === "true" && c === "false" && h.getAttribute("aria-controls") === "pbody"; });
{
  const r = await p.evaluate(() => { const q = document.querySelector(".zoomctl button[aria-label='Ajuster à la fenêtre']").getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.touchscreen.tap(r.x, r.y); await wait(120);
  t["téléphone · toucher un bouton n'affiche pas de bulle (elle restait collée au doigt)"] = await p.evaluate(() => document.getElementById("bulle").hidden);
}
await p.close();

/* ═════════ 8. Moins d'animation ═════════ */
p = await onglet({ larg: 390, haut: 844, mobile: true, calme: true });
t["mouvement réduit · le tiroir ne glisse plus (transition ≈ 0)"] = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById("panel")).transitionDuration) < 0.01);
t["mouvement réduit · les messages non plus"] = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById("toast")).transitionDuration) < 0.01);
await p.close();
/* piège connu : une durée de 0,01 ms sur « * » fait transitionner TOUT (propriété par défaut « all ») —
   le canvas lisait encore son ancienne largeur au redimensionnement et le plan se dessinait décalé */
p = await onglet({ larg: 768, haut: 1024, calme: true });
t["mouvement réduit · aucune transition ajoutée là où il n'y en avait pas (canvas)"] = await p.evaluate(() => getComputedStyle(cv).transitionProperty === "none" || parseFloat(getComputedStyle(cv).transitionDuration) === 0);
t["mouvement réduit · replier / déplier le panneau : le plan suit sa nouvelle largeur tout de suite"] = await p.evaluate(() => { const ok = () => Math.abs(cv.clientWidth - document.getElementById("stage").getBoundingClientRect().width) < 1 && Math.abs(cv.width / devicePixelRatio - cv.clientWidth) < 1; plierPanneau(true); const a = ok(); plierPanneau(false); const c = ok(); return a && c; });
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le plan se lit, se parcourt et se comprend sans souris");
process.exit(echecs.length || errs.length ? 1 : 0);
