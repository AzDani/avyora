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
 *   - le plan au clavier : le canvas se focalise (role=application, nom, consigne) ; c'est UN arrêt de Tab
 *     (D51) : Alt + flèches parcourent pièces, murs, ouvertures et équipements en l'annonçant, en boucle,
 *     les flèches seules déplacent l'élément choisi, Entrée ouvre la fiche (focus sur son titre), Tab et
 *     Maj+Tab quittent le plan quel que soit l'élément choisi ; outil de tracé : Tab sort ;
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
/* D51 (cj-access07) : le plan est UN arrêt de Tab (composant composite). Tab y entre et en sort ; à l'intérieur,
   Alt + flèches passent d'un élément à l'autre (Tab et Maj+Tab jusqu'au D50 : 59 arrêts sur l'exemple). */
p = await onglet();
await p.evaluate(() => { document.querySelector('#tools .tb[aria-pressed="true"]').focus(); });
/* Tab jusqu'au plan : les outils, puis le canvas */
for (let i = 0; i < 15; i++) { if (await p.evaluate(() => document.activeElement === cv)) break; await p.keyboard.press("Tab"); await wait(30); }
t["plan · Tab depuis les outils arrive sur le plan"] = await p.evaluate(() => document.activeElement === cv);
t["plan · le focus clavier se voit (anneau indigo)"] = await p.evaluate(() => cv.matches(":focus-visible") && getComputedStyle(cv).outlineStyle === "solid" && parseFloat(getComputedStyle(cv).outlineWidth) >= 2);
t["plan · une consigne s'affiche une fois au premier focus clavier (Alt + flèches, Tab)"] = await p.evaluate(() => document.getElementById("toast").classList.contains("show") && /Alt \+ flèches/.test(document.getElementById("toast").textContent) && /Tab sort/.test(document.getElementById("toast").textContent));
t["plan · la consigne du lecteur d'écran dit Alt + flèches et Tab"] = await p.evaluate(() => { const d = document.getElementById(cv.getAttribute("aria-describedby")).textContent; return /Alt \+ flèches/.test(d) && /Tab quitte le plan/.test(d); });
const altFl = async (k) => { await p.keyboard.down("Alt"); await p.keyboard.press(k); await p.keyboard.up("Alt"); };
const N = await p.evaluate(() => elementsDuPlan().length);
await altFl("ArrowDown"); await wait(120);
let s1 = await p.evaluate(() => ({ sel: sel && sel.kind, focus: document.activeElement === cv, dit: document.getElementById("cvAnnonce").textContent }));
t[`plan · Alt+↓ : 1er élément = une pièce, annoncée « Pièce : …, 1 sur ${N} »`] = s1.sel === "room" && s1.focus && new RegExp("^Pièce : .+ · 1 sur " + N).test(s1.dit);
const kinds = new Set(["room"]);
for (let i = 1; i < N; i++) { await altFl("ArrowDown"); const k = await p.evaluate(() => sel && sel.kind); kinds.add(k); }
await wait(80);
s1 = await p.evaluate(() => ({ sel: sel && sel.kind, focus: document.activeElement === cv, dit: document.getElementById("cvAnnonce").textContent }));
t[`plan · Alt+↓ parcourt pièces, murs, ouvertures et équipements (${[...kinds].join(", ")})`] = ["room", "wall", "opening", "item"].every((k) => kinds.has(k)) && s1.focus && new RegExp(N + " sur " + N).test(s1.dit);
await altFl("ArrowRight"); await wait(80);
t["plan · Alt+→ au bout de la liste repart du début (boucle, jamais de piège : Tab sort)"] = await p.evaluate((N) => new RegExp("· 1 sur " + N).test(document.getElementById("cvAnnonce").textContent), N);
await altFl("ArrowUp"); await wait(80);
t["plan · Alt+↑ revient à l'élément d'avant"] = await p.evaluate((N) => new RegExp(N + " sur " + N).test(document.getElementById("cvAnnonce").textContent) && document.activeElement === cv, N);
t["plan · un mur s'annonce avec sa longueur, ses pièces et sa décision"] = await p.evaluate(() => { const w = L().walls.find((x) => x.st === "demolir"); return /^(Cloison|Mur|Mur épais) de \d+,\d\d m, entre .+ et .+ · À démolir$/.test(decrireObjet({ kind: "wall", id: w.id })); });
/* Alt + flèches ne déplacent rien ; les flèches seules déplacent l'élément choisi */
{ const r = await p.evaluate(() => { const E = elementsDuPlan(), i = E.findIndex((x) => x.kind === "item"); const it = L().items.find((x) => x.id === E[i].id); sel = { kind: "item", id: it.id }; multi = [it.id]; render(); cv.focus(); return { id: it.id, x: it.x, y: it.y }; });
  await altFl("ArrowRight"); await wait(60);
  const a = await p.evaluate((r) => { const it = L().items.find((x) => x.id === r.id); return it.x === r.x && it.y === r.y && sel.id !== r.id; }, r);
  await p.evaluate((r) => { sel = { kind: "item", id: r.id }; multi = [r.id]; render(); cv.focus(); }, r);
  await p.keyboard.press("ArrowRight"); await wait(60);
  const b2 = await p.evaluate((r) => { const it = L().items.find((x) => x.id === r.id); return Math.abs(it.x - r.x - 0.05) < 1e-6 || Math.abs(it.x - r.x) > 0; }, r);
  await p.evaluate(() => undo());
  t["plan · Alt+→ passe à l'élément suivant sans rien déplacer ; → seul déplace l'élément choisi"] = a && b2; }
await p.evaluate(() => { const E = elementsDuPlan(); sel = { kind: E[0].kind, id: E[0].id }; render(); cv.focus(); });
await altFl("ArrowDown"); await altFl("ArrowUp"); await wait(80);
const nomPiece = await p.evaluate(() => sel.kind === "room" ? roomName(L().rooms.find((r) => r.id === sel.id)) : null);
await p.keyboard.press("Enter"); await wait(120);
t["plan · Entrée ouvre la fiche : le focus va sur son titre"] = await p.evaluate((nm) => document.activeElement.classList.contains("ptitle") && document.activeElement.closest("#pbody") && document.activeElement.textContent.startsWith(nm), nomPiece);
/* un seul arrêt de Tab : avec un élément choisi, Tab quitte le plan (la sélection reste) */
await p.evaluate(() => cv.focus()); await altFl("ArrowDown"); await wait(60);
{ const avant = await p.evaluate(() => sel && sel.kind + ":" + sel.id);
  await p.keyboard.press("Tab"); await wait(80);
  t["plan · un seul arrêt de Tab : un élément choisi, Tab quitte le plan et la sélection reste"] = await p.evaluate((a) => document.activeElement !== cv && (sel && sel.kind + ":" + sel.id) === a, avant) && !!avant; }
/* Échap puis Tab : on quitte le plan */
await p.evaluate(() => cv.focus()); await p.keyboard.press("Escape"); await wait(50); await p.keyboard.press("Tab"); await wait(80);
t["plan · Échap puis Tab quitte le plan (pas de piège)"] = await p.evaluate(() => document.activeElement !== cv && !sel);
/* Maj+Tab aussi */
await p.evaluate(() => { const E = elementsDuPlan(); sel = { kind: E[3].kind, id: E[3].id }; render(); cv.focus(); });
await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await wait(80);
t["plan · Maj+Tab quitte le plan vers l'arrière"] = await p.evaluate(() => document.activeElement !== cv);
/* outil de tracé : Tab n'est pas pris par le plan */
await p.evaluate(() => { setTool("mur"); cv.focus(); }); await p.keyboard.press("Tab"); await wait(80);
t["plan · avec l'outil Murs, Tab sort du plan"] = await p.evaluate(() => document.activeElement !== cv);
await p.evaluate(() => setTool("select"));
/* focus à la souris : pas d'anneau */
await p.evaluate(() => document.activeElement.blur());
{ const r = await p.evaluate(() => { const q = cv.getBoundingClientRect(); return { x: q.left + 30, y: q.top + q.height - 30 }; }); await p.mouse.click(r.x, r.y); await wait(60); }
t["plan · cliqué à la souris : pas d'anneau de focus"] = await p.evaluate(() => !cv.matches(":focus-visible"));
/* D50 (cj-design02) : cliqué à la souris, puis une touche (Échap, une lettre d'outil) : toujours pas de cadre indigo sur tout le plan */
await p.keyboard.press("Escape"); await wait(40); await p.keyboard.press("v"); await wait(60);
t["plan · cliqué à la souris puis Échap / V : pas de cadre indigo autour du plan"] = await p.evaluate(() => document.activeElement === cv && getComputedStyle(cv).outlineStyle === "none");
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

/* ═════════ 9. D51 · le focus ne se perd ni ne se cache, les raccourcis se coupent, tout se fait sans glisser ═════════ */
/* 9.1 (cj-access00) · WCAG 2.4.11 : dans « Ton budget travaux », chaque élément atteint au clavier reste visible —
   jamais entièrement sous le pied collant « Exporter / Enregistrer » */
for (const [L0, H0, mob] of [[1440, 900, false], [390, 844, true]]) {
  p = await onglet({ larg: L0, haut: H0, mobile: mob });
  await p.evaluate(() => document.getElementById("estBtnTop").focus()); await p.keyboard.press("Enter"); await wait(300);
  const caches = []; let n = 0;
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press("Tab"); await wait(35);
    const r = await p.evaluate(() => { const a = document.activeElement, m = document.querySelector("#m-estimate .modal"); if (!m || !m.contains(a) || a === m) return null; const q = a.getBoundingClientRect(); const pts = []; for (let f = 0.1; f <= 0.91; f += 0.2) for (let g = 0.2; g <= 0.81; g += 0.3) pts.push([q.left + q.width * g, q.top + q.height * f]);
      return { t: (a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 30), vis: pts.some(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e === a || a.contains(e)); }) }; });
    if (r) { n++; if (!r.vis) caches.push(r.t); }
  }
  t[`${L0} × ${H0} · Estimer : ${n} arrêts de Tab, aucun caché sous le pied collant${caches.length ? " — " + caches.slice(0, 3).join(" | ") : ""}`] = n > 20 && !caches.length;
  await p.close();
}
p = await onglet();
/* 9.2 (cj-access01) : cocher une tâche du Suivi à l'Espace, valider un champ par Entrée : le focus reste là */
await p.evaluate(() => { panelTab = "suivi"; render(); document.querySelector("#pbody .task input[type=checkbox]").focus(); });
{ const nom = await p.evaluate(() => document.activeElement.getAttribute("aria-label"));
  await p.keyboard.press("Space"); await wait(100);
  t["Suivi · Espace coche la tâche et le focus reste sur sa case"] = await p.evaluate((nom) => { const a = document.activeElement; return a.type === "checkbox" && a.checked && a.getAttribute("aria-label") === nom; }, nom);
  await p.keyboard.press("Tab"); await wait(60);
  t["Suivi · le Tab suivant continue dans la liste (il repartait de « Détails »)"] = await p.evaluate(() => { const a = document.activeElement; return !!a.closest("#pbody .tasks") && a.getAttribute("role") !== "tab"; });
  await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await p.keyboard.press("Space"); await wait(100);
  t["Suivi · décocher au clavier : le focus reste aussi"] = await p.evaluate((nom) => { const a = document.activeElement; return a.type === "checkbox" && !a.checked && a.getAttribute("aria-label") === nom; }, nom); }
await p.evaluate(() => { panelTab = "details"; const r = L().rooms.find((x) => x.type === "sejour"); sel = { kind: "room", id: r.id }; render(); document.querySelectorAll("#pbody details").forEach((d) => (d.open = true)); });
{ const lab = await p.evaluate(() => { const f = [...document.querySelectorAll("#pbody input.fin.n")].filter((x) => x.getClientRects().length && !x.disabled)[0]; f.focus(); f.select(); return f.labels && f.labels[0] ? f.labels[0].textContent.trim() : f.getAttribute("aria-label"); });
  await p.keyboard.type("2.6"); await p.keyboard.press("Enter"); await wait(100);
  t[`champ · « ${lab} » validé par Entrée : le focus reste dans le champ`] = await p.evaluate((lab) => { const a = document.activeElement; const l = a.labels && a.labels[0] ? a.labels[0].textContent.trim() : a.getAttribute("aria-label"); return a.tagName === "INPUT" && l === lab && a.closest("#pbody"); }, lab); }
/* 9.3 (cj-access02) · WCAG 2.1.4 : une lettre seule n'agit pas depuis un bouton atteint au clavier, se coupe
   dans l'Aide (mémorisé), et ne fait jamais rien dans un champ */
await p.evaluate(() => { sel = null; render(); setTool("select"); document.querySelector('#pbody .ptabs [role=tab]').focus(); tabAt = performance.now() + 5; });
await p.keyboard.press("m"); await wait(50);
t["raccourcis · « m » sur un onglet atteint au clavier : l'outil ne change pas"] = await p.evaluate(() => tool === "select");
await p.evaluate(() => { cv.focus(); }); await p.keyboard.press("m"); await wait(50);
t["raccourcis · « m » sur le plan : outil Murs"] = await p.evaluate(() => tool === "mur");
await p.evaluate(() => { setTool("select"); document.querySelector('#tools .tb[aria-label="Zone"]').focus(); }); await p.keyboard.press("m"); await wait(50);
t["raccourcis · « m » depuis la colonne d'outils : outil Murs"] = await p.evaluate(() => tool === "mur");
await p.evaluate(() => { setTool("select"); const r = L().rooms[0]; sel = { kind: "room", id: r.id }; render(); document.querySelector("#pbody .fin").focus(); }); await p.keyboard.press("m"); await wait(50);
t["raccourcis · « m » dans un champ : on écrit, l'outil ne change pas"] = await p.evaluate(() => tool === "select");
await p.evaluate(() => { sel = null; render(); setTool("select"); openModal("welcome"); closeModal(); }); await p.keyboard.press("m"); await wait(50);
t["raccourcis · une fenêtre fermée ne garde pas le focus sur un de ses boutons : « m » agit aussitôt"] = await p.evaluate(() => !document.activeElement.closest(".overlay") && tool === "mur");
await p.evaluate(() => setTool("select"));
t["raccourcis · l'Aide porte le réglage « Raccourcis d'une touche », coché par défaut"] = await p.evaluate(() => { ouvrirAide("keys"); const c = document.getElementById("raccOn"); const ok = !!c && c.checked && c.closest("#aideKeys") && /Raccourcis d'une touche/.test(document.getElementById(c.getAttribute("aria-labelledby")).textContent); closeModal(); return ok; });
t["raccourcis · outils : la touche est annoncée (aria-keyshortcuts) et affichée"] = await p.evaluate(() => document.querySelector('#tools .tb[aria-label="Murs"]').getAttribute("aria-keyshortcuts") === "M" && !!document.querySelector('#tools .tb[aria-label="Murs"] kbd'));
await p.evaluate(() => { ouvrirAide("keys"); document.getElementById("raccOn").click(); closeModal(); sel = null; render(); cv.focus(); }); await p.keyboard.press("m"); await wait(50);
t["raccourcis · coupés dans l'Aide : « m » sur le plan ne change plus d'outil"] = await p.evaluate(() => tool === "select");
t["raccourcis · coupés : plus de touche affichée ni annoncée sur les outils"] = await p.evaluate(() => { const b = document.querySelector('#tools .tb[aria-label="Murs"]'); return !b.hasAttribute("aria-keyshortcuts") && getComputedStyle(b).display !== "none" && ![...document.querySelectorAll("#tools kbd")].some((k) => k.getClientRects().length) && !/ · M$/.test(b.dataset.tip); });
{ const avant = await p.evaluate(() => { const w = L().walls.find((x) => x.type === "cloison" && !x.st && !isVirtual(x)); sel = { kind: "wall", id: w.id }; render(); cv.focus(); return w.id; });
  await p.keyboard.press("Delete"); await wait(60);
  t["raccourcis · coupés : Suppr reste actif"] = await p.evaluate((id) => findWall(id).st === "demolir", avant);
  await p.keyboard.down("Control"); await p.keyboard.press("z"); await p.keyboard.up("Control"); await wait(60);
  t["raccourcis · coupés : Ctrl+Z reste actif"] = await p.evaluate((id) => !findWall(id).st, avant); }
await p.evaluate(() => setRaccourcis(true));
await p.evaluate(() => setTool("select"));
/* 9.4 (cj-access05) · WCAG 1.4.13 : bulle d'un outil et définition du glossaire se survolent */
{ await p.evaluate(() => { sel = null; render(); document.activeElement.blur(); });
  const c = await p.evaluate(() => { const q = document.querySelector('#tools .tb[aria-label="Murs"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.mouse.move(c.x, c.y); await wait(60);
  const bq = await p.evaluate(() => { const q = document.getElementById("bulle").getBoundingClientRect(); return { l: q.left, r: q.right, y: q.top + q.height / 2 }; });
  for (let x = c.x; x <= bq.l + 24; x += 5) await p.mouse.move(x, c.y + (bq.y - c.y) * Math.min(1, (x - c.x) / Math.max(1, bq.l + 24 - c.x)));
  await wait(60);
  t["bulles · la souris passe du bouton à la bulle : elle reste (on peut la lire à la loupe)"] = await p.evaluate(() => !document.getElementById("bulle").hidden);
  await p.mouse.move(bq.r + 80, bq.y + 120); await wait(60);
  t["bulles · la souris quitte la bulle : elle se ferme"] = await p.evaluate(() => document.getElementById("bulle").hidden);
  await p.evaluate(() => { setMode("projet"); const w = L().walls.find((x) => !isVirtual(x) && isExteriorWall(x)); sel = { kind: "wall", id: w.id }; renderPanel(); });
  const g = await p.evaluate(() => { const q = document.querySelector('#pbody .gl[data-gl="porteur"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.mouse.move(g.x, g.y); await wait(80);
  const gp = await p.evaluate(() => { const q = document.getElementById("glossPop").getBoundingClientRect(); return { top: q.top, bottom: q.bottom, x: q.left + q.width / 2 }; });
  const cy = gp.top > g.y ? gp.top + 12 : gp.bottom - 12;
  for (let k = 1; k <= 10; k++) await p.mouse.move(g.x + (gp.x - g.x) * k / 10, g.y + (cy - g.y) * k / 10);
  await wait(80);
  t["glossaire · la souris passe de la pastille à la définition : elle reste"] = await p.evaluate(() => !document.getElementById("glossPop").hidden);
  await p.mouse.move(20, 450); await wait(80);
  t["glossaire · la souris quitte la définition : elle se ferme"] = await p.evaluate(() => document.getElementById("glossPop").hidden); }
await p.close();
/* le réglage est mémorisé : coupé, puis une nouvelle page (sans vider le stockage, que onglet() efface) */
p = await onglet(); await p.evaluate(() => setRaccourcis(false)); await p.close();
{ const p2 = await b.newPage(); p2.on("pageerror", (e) => errs.push(e.message)); await p2.setViewport({ width: 1440, height: 900 }); await charger(p2); await wait(300);
  await p2.evaluate(() => { closeWelcome("sample"); closeModal(); setTool("select"); sel = null; render(); cv.focus(); }); await p2.keyboard.press("m"); await wait(50);
  t["raccourcis · le réglage est mémorisé (nouvelle page : toujours coupés)"] = await p2.evaluate(() => tool === "select" && localStorage.getItem("avyora-plan-raccourcis") === "0" && document.documentElement.classList.contains("sansRaccourcis") && !document.getElementById("raccOn").checked);
  await p2.evaluate(() => { ouvrirAide("keys"); document.getElementById("raccOn").click(); closeModal(); cv.focus(); }); await p2.keyboard.press("m"); await wait(50);
  t["raccourcis · recochés dans l'Aide : « m » refonctionne"] = await p2.evaluate(() => tool === "mur" && localStorage.getItem("avyora-plan-raccourcis") === null);
  await p2.close(); }
/* 9.5 (cj-access06) : Espace active une entrée de menu choisie aux flèches, même menu ouvert à la souris ;
   Échap rend le focus à « Estimer ce plan », Espace le rouvre */
p = await onglet();
{ const f = await p.evaluate(() => { const q = document.getElementById("fichierBtn").getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.mouse.click(f.x, f.y); await wait(100); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await wait(40); await p.keyboard.press("Space"); await wait(200);
  t["menus · ouvert à la souris, ↓ ↓ puis Espace : « Mes plans » s'ouvre"] = await p.evaluate(() => document.getElementById("m-plans").classList.contains("show"));
  await p.keyboard.press("Escape"); await wait(100);
  const e = await p.evaluate(() => { const q = document.getElementById("estBtnTop").getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await p.mouse.click(e.x, e.y); await wait(200); await p.keyboard.press("Escape"); await wait(100); await p.keyboard.press("Space"); await wait(200);
  t["menus · « Estimer ce plan » cliqué, Échap, puis Espace : la fenêtre se rouvre"] = await p.evaluate(() => document.getElementById("m-estimate").classList.contains("show"));
  await p.evaluate(() => closeModal());
  await p.evaluate(() => { setTool("select"); document.activeElement?.blur?.(); }); await p.mouse.click(700, 500); await p.keyboard.down("Space");
  t["menus · Espace sur le plan cliqué : « Espace + glisser » reste disponible"] = await p.evaluate(() => keys.space === true); await p.keyboard.up("Space"); }
/* 9.6 (cj-access08) : l'anneau de la carte budget se voit (≥ 3:1 sur le pied) */
{ await p.evaluate(() => { sel = null; render(); document.getElementById("undoBtn").focus(); });
  for (let i = 0; i < 80; i++) { if (await p.evaluate(() => document.activeElement.classList.contains("budgetbtn"))) break; await p.keyboard.press("Tab"); }
  const r = await p.evaluate(() => { const b = document.activeElement, cs = getComputedStyle(b); return { ok: b.classList.contains("budgetbtn") && b.matches(":focus-visible"), c: cs.outlineColor, w: parseFloat(cs.outlineWidth), fond: getComputedStyle(document.getElementById("pfoot")).backgroundColor }; });
  const fond = /rgba\(0, 0, 0, 0\)/.test(r.fond) ? "rgb(255,255,255)" : r.fond;
  t[`focus · carte budget : anneau ${r.c} à ${contraste(r.c, fond).toFixed(2)}:1 sur le pied (≥ 3:1)`] = r.ok && r.w >= 2 && contraste(r.c, fond) >= 3; }
/* 9.7 (cj-access10) · WCAG 2.5.7 : déplacer sans glisser — équipement et ouverture */
Object.assign(t, await p.evaluate(async () => { const r = {}, tic = () => new Promise((q) => setTimeout(q, 20)); setMode("projet");
  const it = L().items.find((x) => x.type === "table") || L().items[0]; sel = { kind: "item", id: it.id }; multi = [it.id]; render();
  const B = [...document.querySelectorAll("#pbody .decal4 button")].map((b) => b.getAttribute("aria-label"));
  r["décaler · fiche d'un équipement : 4 boutons nommés « Décaler de 10 cm vers … »"] = B.length === 4 && ["la gauche", "la droite", "le haut", "le bas"].every((v, i) => B[i] === "Décaler de 10 cm vers " + v);
  const x0 = it.x, y0 = it.y; document.querySelector('#pbody button[aria-label="Décaler de 10 cm vers la droite"]').click(); document.querySelector('#pbody button[aria-label="Décaler de 10 cm vers le bas"]').click();
  const i2 = L().items.find((x) => x.id === it.id);
  r["décaler · un clic : l'équipement bouge de 10 cm (→ puis ↓)"] = Math.abs(i2.x - x0 - 0.1) < 0.02 && Math.abs(i2.y - y0 - 0.1) < 0.02;
  const o = L().openings.find((x) => x.type === "porte" && ost(x) !== "boucher"); sel = { kind: "opening", id: o.id }; render(); await tic();
  const f = [...document.querySelectorAll("#pbody input.fin.n")].find((x) => x.labels && x.labels[0] && /^Depuis le bout/.test(x.labels[0].textContent.trim()));
  const d0 = distanceOuverture(o);
  r["décaler · fiche d'une ouverture : « Position sur le mur › Depuis le bout … » = la cote du plan"] = !!f && Math.abs(+f.value - d0) < 0.006;
  const cible = d0 >= 0.4 ? d0 - 0.2 : d0 + 0.2; f.value = cible.toFixed(2); f.dispatchEvent(new Event("change"));
  const o2 = L().openings.find((x) => x.id === o.id);
  r["décaler · taper la distance place l'ouverture (au cm)"] = Math.abs(distanceOuverture(o2) - cible) < 0.006;
  const d1 = distanceOuverture(o2); document.querySelectorAll("#pbody .decal4 button")[0].click();
  r["décaler · « Décaler de 10 cm » fait coulisser l'ouverture le long de son mur"] = Math.abs(distanceOuverture(L().openings.find((x) => x.id === o.id)) - d1 + 0.1) < 0.006;
  undo(); undo(); undo(); undo(); return r; }));
{ const r = await p.evaluate(() => { const o = L().openings.find((x) => x.type === "porte" && ost(x) !== "boucher"); sel = { kind: "opening", id: o.id }; render(); cv.focus(); const w = findWall(o.wallId); return { id: o.id, t: o.t, hz: Math.abs(w.b.x - w.a.x) >= Math.abs(w.b.y - w.a.y) }; });
  await p.keyboard.press(r.hz ? "ArrowRight" : "ArrowDown"); await wait(60);
  t["décaler · au clavier, une ouverture coulisse aussi aux flèches"] = await p.evaluate((r) => L().openings.find((x) => x.id === r.id).t !== r.t, r);
  await p.evaluate(() => undo()); }
/* 9.8 (cj-access11) · WCAG 2.5.3 : le nom d'un bouton contient son libellé visible */
t["noms · chaque outil : le nom contient le libellé visible (« Image (fond de plan) »)"] = await p.evaluate(() => [...document.querySelectorAll("#tools .tb")].every((b) => (b.getAttribute("aria-label") || "").toLowerCase().includes(b.querySelector("span").textContent.trim().toLowerCase())) && !!document.querySelector('#tools .tb[aria-label="Image (fond de plan)"]'));
{ const bad = await p.evaluate(() => { const bad = []; for (const b of document.querySelectorAll(".top button, #tools button, #pbody button, #pfoot button, #levels button, #modes button")) { if (!b.getClientRects().length || !b.hasAttribute("aria-label")) continue; const c = b.cloneNode(true); c.querySelectorAll("kbd,svg,.sr-only").forEach((x) => x.remove()); /* le libellé visible : le premier texte du bouton (le titre d'une carte, pas tout son contenu) */ const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n0 = w.nextNode(); while (n0 && !n0.textContent.trim()) n0 = w.nextNode(); const vis = (n0 ? n0.textContent : "").replace(/\s+/g, " ").trim().toLowerCase(); if (vis && !b.getAttribute("aria-label").toLowerCase().includes(vis)) bad.push(vis + " ≠ " + b.getAttribute("aria-label")); } return bad; });
  t[`noms · barre, outils, panneau et pied : le nom de chaque bouton contient son texte affiché${bad.length ? " — " + bad.slice(0, 3).join(" | ") : ""}`] = !bad.length; }
await p.close();
/* 9.9 (cj-access09) · WCAG 2.1.1 : un plan vierge se commence au clavier */
p = await b.newPage(); p.on("pageerror", (e) => errs.push(e.message)); await p.setViewport({ width: 1440, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); } catch {} });
await charger(p); await wait(250); await p.evaluate(() => { closeWelcome("blank"); setTool("select"); }); await wait(200);
await p.evaluate(() => { const bt = [...document.querySelectorAll("#emptyStage button")].find((x) => /Poser une pièce/.test(x.textContent)); bt.focus(); });
await p.keyboard.press("Enter"); await wait(250);
t["plan vierge · Entrée sur « Poser une pièce de 4 × 3 m » : la pièce est posée, choisie, sa fiche a le focus"] = await p.evaluate(() => L().walls.length === 4 && (facesCache[L().id] || []).filter((f) => f.room).length === 1 && sel && sel.kind === "room" && tool === "select" && document.activeElement.classList.contains("ptitle"));
t["plan vierge · la pièce est au centre de la vue (entière à l'écran)"] = await p.evaluate(() => planEntierVisible());
await p.evaluate(() => { tracerLesMurs(); document.getElementById("rectL").value = "3.00"; document.getElementById("rectl").value = "2.50"; render(); });
await p.evaluate(() => { const bt = [...document.querySelectorAll("#pbody button")].find((x) => /Poser cette pièce/.test(x.textContent)); bt.focus(); });
await p.keyboard.press("Enter"); await wait(250);
t["plan vierge · « Poser cette pièce » (3 × 2,5 m) au clavier : posée tout de suite"] = await p.evaluate(() => L().walls.length >= 7 && sel && sel.kind === "room");
await p.evaluate(() => { tracerLesMurs(); rectMode = { L: 2, l: 2 }; cv.focus(); });
{ const n0 = await p.evaluate(() => L().walls.length); await p.keyboard.press("Enter"); await wait(250);
  t["plan vierge · une pièce en attente, Entrée dans le plan la pose au centre"] = await p.evaluate((n0) => L().walls.length > n0 && !rectMode, n0); }
await p.close();
/* 9.10 : la souris garde son sens — « Poser une pièce » cliqué attend le clic dans le plan */
p = await b.newPage(); p.on("pageerror", (e) => errs.push(e.message)); await p.setViewport({ width: 1440, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); } catch {} });
await charger(p); await wait(250); await p.evaluate(() => { closeWelcome("blank"); setTool("select"); }); await wait(200);
{ const q = await p.evaluate(() => { const bt = [...document.querySelectorAll("#emptyStage button")].find((x) => /Poser une pièce/.test(x.textContent)); const r = bt.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.click(q.x, q.y); await wait(150);
  t["plan vierge · à la souris, « Poser une pièce » attend le clic dans le plan (rien n'est posé)"] = await p.evaluate(() => !!rectMode && L().walls.length === 0); }
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le plan se lit, se parcourt et se comprend sans souris");
process.exit(echecs.length || errs.length ? 1 : 0);
