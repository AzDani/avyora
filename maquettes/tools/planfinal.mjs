/**
 * D67 · Le Plan final : on dessine directement le logement que l'on veut obtenir.
 *
 * Deux types de plan vivent dans le même éditeur, sur le même moteur : `state.workflow` vaut
 * 'final_plan' (Plan final) ou 'renovation' (Projet rénovation, Avant travaux → Travaux → Après
 * travaux). Le Plan final dessine dans la couche « existant », sans aucun état ; une seule fonction,
 * estPlanFinal(), retire de l'interface tout ce qui relève du chantier. Ce contrôle vérifie :
 *   - la donnée : un plan sans `workflow` (d'avant D67) reste une rénovation, à l'identique ; un Plan
 *     final garde son type à l'enregistrement, au rechargement et dans « Mes plans » ; jamais d'autre
 *     vue que celle que l'on dessine (setMode refuse) ;
 *   - le chiffrage : ni tâche, ni prix, ni travaux au contrat, qui porte le type ;
 *   - l'écran : dans CHAQUE état lu (vue d'ensemble, chaque outil, la fiche, la barre d'actions et le
 *     menu du clic droit de chaque élément, les menus Fichier et Aide, l'Aide, Mes plans, les plans
 *     types, le dossier, les messages, le téléphone, en Pro et en gratuit), aucun mot du chantier :
 *     existant, avant / après travaux, travaux, à démolir, démoli, conservé, je garde, nouveau, à créer,
 *     à poser, à déposer, phase, chantier, suivi, avancement, budget, estimer ; ni « actuel » (on dit
 *     « Sol », pas « Sol actuel »), ni aucune décision (LEX.etat) ; et rien de ce qui s'y rattache —
 *     sélecteur de vues, légende, onglet Suivi, « Ton projet à X % », budget, « Le chantier », toiture ;
 *   - le dessin : un Plan final se dessine à la souris (murs, ouvertures, équipements, cote) ;
 *   - la barre du haut : « Exporter le plan » à la place d'« Estimer ce plan ».
 *
 *   node maquettes/tools/planfinal.mjs "$(pwd)/maquettes"            (ajouter --lister pour voir chaque mot trouvé)
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/planfinal.mjs <dossier maquettes>"); process.exit(2); }
const LISTER = process.argv.includes("--lister");

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"], protocolTimeout: 60000 });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
/* une page neuve ; `graine` (facultatif) : ce que localStorage contient avant le chargement (sinon il est vidé) */
async function onglet({ largeur = 1440, hauteur = 900, pro = true, graine = null } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: largeur, height: hauteur });
  await p.evaluateOnNewDocument((pro, graine) => {
    try {
      if (sessionStorage.getItem("pf-semee")) return; /* un rechargement garde ce que la page a écrit */
      sessionStorage.setItem("pf-semee", "1");
      localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0");
      if (graine) for (const [k, v] of Object.entries(graine)) localStorage.setItem(k, v);
    } catch {}
  }, pro, graine);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}

/* ── Les mots du chantier, interdits à l'écran d'un Plan final ── */
const MOTS = [
  [/(?<!\p{L})existant(?:e|s|es)?(?!\p{L})/iu, "existant"],
  [/(?<!\p{L})travaux(?!\p{L})/iu, "travaux (avant, après travaux)"],
  [/à démolir|(?<!\p{L})démoli(?:e|s|es)?(?!\p{L})/iu, "démolir / démoli"],
  [/(?<!\p{L})conserv(?:é|ée|és|ées)(?!\p{L})/iu, "conservé"],
  [/je garde/iu, "je garde"],
  [/à créer/iu, "à créer"],
  /* l'état « nouveau » (LEX.sous) et « nouveaux murs » ; « Nouveau plan » est une commande de fichier, « Nouvelle mesure » un geste */
  [/(?<!\p{L})nouveaux?(?!\p{L})(?!\s+(?:plan|niveau))/iu, "nouveau (l'état)"],
  [/à poser/iu, "à poser"],
  [/à déposer/iu, "à déposer"],
  [/(?<!\p{L})phases?(?!\p{L})/iu, "phase"],
  [/(?<!\p{L})chantiers?(?!\p{L})/iu, "chantier"],
  [/(?<!\p{L})suivi(?!\p{L})/iu, "suivi"],
  [/avancement/iu, "avancement"],
  [/(?<!\p{L})budgets?(?!\p{L})/iu, "budget"],
  [/(?<!\p{L})estimer(?!\p{L})/iu, "estimer"],
  /* vocabulaire (D67) : un Plan final décrit ce que l'on veut, pas ce qui est là */
  [/(?<!\p{L})(?<!plan |niveau )actuel(?:le|s|les)?(?!\p{L})/iu, "actuel (vocabulaire du Plan final : « Sol », pas « Sol actuel » ; « le plan actuel » reste)"],
];
/* Ce qu'on lit à l'écran : texte visible + bulles, titres, libellés accessibles, exemples (comme langage.mjs) */
const LIRE = () => {
  const vis = (el) => !!el && el.getClientRects().length > 0;
  const attrs = [...document.querySelectorAll("[data-tip],[title],[aria-label],[placeholder]")].filter(vis)
    .flatMap((el) => ["data-tip", "title", "aria-label", "placeholder"].map((a) => el.getAttribute(a)).filter(Boolean));
  return [document.body.innerText, ...attrs].join("\n");
};
const lus = []; /* [contexte, texte] */
const noter = async (p, etat) => { lus.push([etat, await p.evaluate(LIRE)]); };
/* ce qui ne doit JAMAIS se voir dans un Plan final, mesuré dans chaque état lu */
const RIEN_DU_CHANTIER = () => {
  const vis = (s) => [...document.querySelectorAll(s)].some((el) => el.getClientRects().length > 0);
  const E = Object.values(LEX.etat), txt = document.body.innerText;
  return {
    vues: vis("#modes button"), legende: vis(".vlegend"), decision: vis(".segetat") || vis(".sbe") || vis("#ctxMenu [role=menuitemradio]"),
    suivi: [...document.querySelectorAll(".ptabs [role=tab]")].some((x) => x.getClientRects().length && /Suivi/.test(x.textContent)),
    budget: vis("#pfoot .budget") || vis("#budgetPlie") || vis("#budgetDelta.show"), projet: vis(".projet") || /Ton projet à/.test(txt),
    etats: E.filter((m) => txt.includes(m)),
  };
};
const constats = []; /* [contexte, objet RIEN_DU_CHANTIER] */
const regarder = async (p, etat) => { await noter(p, etat); constats.push([etat, await p.evaluate(RIEN_DU_CHANTIER)]); };

/* ── La scène : une maison de 120 m² dessinée en Plan final (3 chambres, cuisine ouverte, 2 salles de bain…) ── */
function scenePF() {
  closeWelcome("blank");
  state = blankState(); state.workflow = WORKFLOW_FINAL; state.name = "Maison de 120 m²";
  const lv = L(); lv.height = 2.5;
  const W = (a, c, t) => { const x = { id: uid(), a: v(...a), b: v(...c), type: t }; lv.walls.push(x); return x; };
  const nord = W([0, 0], [12, 0], "mur"), est = W([12, 0], [12, 10], "mur"), sud = W([12, 10], [0, 10], "mur"), ouest = W([0, 10], [0, 0], "mur");
  const refend = W([7, 0], [7, 10], "porteur");
  const c1 = W([7, 3.5], [12, 3.5], "cloison"), c2 = W([7, 6.5], [12, 6.5], "cloison"), c3 = W([9.5, 6.5], [9.5, 10], "cloison");
  const c4 = W([0, 7], [4.5, 7], "cloison"), c5 = W([3, 7], [3, 10], "cloison"), c6 = W([4.5, 7], [4.5, 10], "cloison");
  W([0, 3.5], [7, 3.5], "virtuel"); /* la cuisine ouverte : une séparation, sans mur */
  nord.iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 };
  const O = (mur, t, type, extra = {}) => { const d = OPENINGS[type]; const o = { id: uid(), wallId: mur.id, t, type, w: d.w, h: d.h, side: 1, hinge: 1, ...extra }; lv.openings.push(o); return o; };
  O(sud, 0.62, "porte_entree"); O(nord, 0.25, "baie"); O(nord, 0.8, "fenetre"); O(est, 0.2, "porte_fenetre"); O(est, 0.5, "fenetre"); O(est, 0.85, "fenetre");
  O(refend, 0.2, "porte"); O(refend, 0.5, "porte"); O(c3, 0.5, "porte"); O(c4, 0.85, "porte"); O(c5, 0.5, "coulissante"); O(ouest, 0.5, "fenetre_p"); O(c2, 0.8, "porte_double"); O(c1, 0.5, "passage");
  afterChange();
  const I = (type, x, y, extra = {}) => { const d = ITEMS[type]; const it = { id: uid(), type, x, y, w: d.w, h: d.h, rot: 0, ...extra }; lv.items.push(it); return it; };
  I("evier", 1.2, 0.5); I("plan", 2.8, 0.5, { w: 2.4 }); I("frigo", 4.6, 0.5); I("ilot", 2.5, 2.2); I("lave_vaisselle", 5.4, 0.5);
  I("canape", 2, 5); I("table", 5, 4.5); I("escalier", 6.2, 5, { w: 1, h: 2.5, stair: { type: "droit" } });
  I("wc", 3.7, 9.4); I("douche", 0.7, 9.3, { douche: "bac" }); I("lavabo", 2, 9.6); I("baignoire", 8.3, 9.4, { w: 1.7, h: 0.75 }); I("vasque2", 8.3, 7);
  I("lit", 9.5, 1.5); I("lit1", 9.5, 5); I("armoire", 11, 9); I("radiateur", 11.6, 1.5); I("seche_serviette", 7.3, 8.5);
  I("prise", 0.2, 5); I("interrupteur", 6.8, 2); I("lumiere", 3.5, 5, { lum: "plafonnier" }); I("vmc", 1.5, 8); I("chaudiere", 4.2, 7.4);
  I("poteau", 4, 3.5); I("poutre", 2, 3.5, { w: 3 });
  lv.dims.push({ id: uid(), a: v(0, 0), b: v(12, 0), off: -1 });
  TX(lv).push({ id: uid(), x: 2, y: 6.2, text: "Ici le coin lecture", color: "bleu" });
  afterChange();
  const faces = facesCache[lv.id] || [];
  const nommer = (x, y, type, name) => { const f = faces.find((g) => g.room && pointIn(v(x, y), g.poly)); if (f) { f.room.type = type; f.room.name = name; f.room.typeAuto = false; } };
  nommer(2, 1.5, "cuisine", "Cuisine"); nommer(2, 5, "sejour", "Séjour"); nommer(9.5, 1.5, "chambre", "Chambre 1"); nommer(9.5, 5, "chambre", "Chambre 2");
  nommer(11, 8, "chambre", "Chambre 3"); nommer(8, 8, "sdb", "Salle de bain"); nommer(1.5, 8.5, "sde", "Salle d'eau"); nommer(3.7, 8.5, "wc", "WC");
  addLevel("empty"); const et = L(); et.name = "Étage"; [[0, 0, 12, 0], [12, 0, 12, 10], [12, 10, 0, 10], [0, 10, 0, 0]].forEach(([a, b2, c, d]) => et.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" }));
  state.cur = 0; afterChange(); fitView(); setTool("select"); sel = null; render();
}

/* ═════════ 1. La donnée ═════════ */
let p = await onglet();
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["donnée · un plan neuf porte son type (rénovation par défaut)"] = blankState().workflow === "renovation";
  const ancien = { name: "Ancien", mode: "projet", levels: [newLevel("RDC")], done: {}, schema: 47 }; const avant = empreinte(ancien); migrerEtat(ancien);
  r["donnée · un plan sans type (d'avant D67) devient une rénovation, sans rien d'autre (vue, empreinte)"] = ancien.workflow === "renovation" && ancien.mode === "projet" && empreinte(ancien) === avant;
  const pf = { name: "PF", mode: "final", workflow: "final_plan", levels: [newLevel("RDC")], done: {}, schema: 47 }; migrerEtat(pf);
  r["donnée · un Plan final relu n'a jamais d'autre vue que celle que l'on dessine"] = pf.workflow === "final_plan" && pf.mode === "existant";
  const bizarre = { levels: [], workflow: "autre" }; migrerEtat(bizarre);
  r["donnée · un type inconnu se lit comme une rénovation"] = bizarre.workflow === "renovation";
  r["donnée · estPlanFinal() suit state.workflow, et seulement lui"] = (() => { const s0 = state; state = blankState(); const a = estPlanFinal(); state.workflow = "final_plan"; const c = estPlanFinal(); state.mode = "final"; const d = estPlanFinal(); state = s0; return !a && c && d; })();
  return r;
}));

/* ═════════ 2. Un Plan final dessiné par script : ni vue, ni tâche, ni contribution ═════════ */
await p.evaluate(scenePF);
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["scène · 8 pièces détectées au rez-de-chaussée"] = (facesCache[L().id] || []).filter((f) => f.room).length >= 8;
  r["vue · le Plan final dessine dans la couche « existant »"] = mode() === "existant" && estPlanFinal();
  for (const m of ["projet", "final"]) { setMode(m); r[`vue · setMode('${m}') refusé : on reste sur le plan dessiné`] = mode() === "existant" && !document.getElementById("m-projet").classList.contains("show"); }
  state.mode = "projet"; setMode("projet");
  r["vue · une vue forcée dans l'état revient au plan dessiné au premier setMode"] = mode() === "existant";
  r["chiffrage · aucune tâche, aucun prix"] = chantierTasks().length === 0 && chantierPrix().nb === 0 && chantierPrix().total === 0;
  { const w = L().walls.find((x) => x.type === "cloison"); w.st = "demolir"; const n = chantierTasks().length; delete w.st;
    r["chiffrage · la garde est explicite : même un état égaré sur un mur ne fait aucune tâche"] = n === 0; }
  const c = contratPlan();
  r["contrat · il porte le type « final_plan »"] = c.workflow === "final_plan";
  r["contrat · aucun travail : ni démolition, ni création, ni percement, ni menuiserie à poser"] = (() => { const tq = c.travaux || {}; return !(tq.demolM2 > 0) && !(tq.creerM2 > 0) && !(tq.percements > 0) && !(tq.boucher > 0) && !(tq.remplacer > 0) && !((tq.poser || []).length) && !((tq.deposer || []).length); })();
  r["contrat · chaque objet du plan est « existant » (aucun état)"] = (c.detailNiveaux || []).every((n) => (n.equipements || []).every((e) => e.etat === "existant") && (n.menuiseries || []).every((m) => m.etat === "existant")) && ((c.provenance || {}).murs || []).every((m) => m.etat === "existant");
  return r;
}));

/* ═════════ 3. L'écran, état par état (Pro, 1 440 × 900) ═════════ */
await regarder(p, "Pro · vue d'ensemble");
Object.assign(t, await p.evaluate(() => {
  const r = {}, top = document.getElementById("estBtnTop");
  r["barre du haut · « Exporter le plan » à la place d'« Estimer ce plan »"] = /Exporter le plan/.test(top.textContent) && !/Estimer/.test(top.textContent);
  r["panneau · son nom accessible ne parle pas de budget"] = !/budget/i.test(document.getElementById("panel").getAttribute("aria-label") || "");
  return r;
}));
for (const outil of ["mur", "ouverture", "doublage", "equipement", "cote", "mesure", "texte", "zone", "calque"]) {
  await p.evaluate((o) => { setTool(o); }, outil); await regarder(p, "Pro · outil " + outil);
}
await p.evaluate(() => { itemType = "wc"; setTool("equipement"); }); await regarder(p, "Pro · outil equipement · WC choisi");
await p.evaluate(() => { setTool("select"); sel = null; render(); });
const elements = await p.evaluate(() => { const lv = L(); return [...lv.walls.map((w) => ["wall", w.id]), ...lv.openings.map((o) => ["opening", o.id]), ...lv.items.map((i) => ["item", i.id]), ...lv.rooms.filter((r) => (facesCache[lv.id] || []).some((f) => f.room === r)).map((r) => ["room", r.id]), ...lv.dims.map((d) => ["dim", d.id]), ...TX(lv).map((x) => ["text", x.id])]; });
for (const [kind, id] of elements) {
  const nom = await p.evaluate(([kind, id]) => { sel = { kind, id }; multi = []; msel = []; panelTab = "details"; render(); majBarreSel(); const lv = L();
    return kind === "wall" ? "mur " + (findWall(id).type) : kind === "opening" ? OPENINGS[lv.openings.find((o) => o.id === id).type].label : kind === "item" ? ITEMS[lv.items.find((i) => i.id === id).type].label : kind === "room" ? roomName(lv.rooms.find((r) => r.id === id)) : kind; }, [kind, id]);
  await regarder(p, `Pro · fiche ${kind} · ${nom}`);
  if (kind !== "room") { const ok = await p.evaluate(() => ouvrirMenuCtx(null)); if (ok) { await regarder(p, `Pro · clic droit ${kind} · ${nom}`); await p.evaluate(() => fermerMenuCtx(false)); } }
}
/* plusieurs équipements, une zone de tout le plan */
await p.evaluate(() => { const lv = L(); multi = lv.items.slice(0, 3).map((i) => i.id); sel = { kind: "item", id: multi[0] }; render(); majBarreSel(); }); await regarder(p, "Pro · trois équipements");
await p.evaluate(() => { const lv = L(); msel = [...lv.walls.map((w) => ({ kind: "wall", id: w.id })), ...lv.openings.map((o) => ({ kind: "opening", id: o.id })), ...lv.items.map((i) => ({ kind: "item", id: i.id }))]; multi = []; sel = { kind: "marquee" }; render(); majBarreSel(); }); await regarder(p, "Pro · zone de tout le plan");
await p.evaluate(() => { sel = null; msel = []; render(); });
/* l'étage */
await p.evaluate(() => { setLevel(1); }); await regarder(p, "Pro · étage"); await p.evaluate(() => { setLevel(0); });
/* menus, Aide, Mes plans, plans types, dossier */
for (const m of ["fichier", "aide"]) { await p.evaluate((m) => { if (m === "fichier") majMenuFichier(); ouvrirMenu(m); }, m); await regarder(p, "Pro · menu " + m); await p.evaluate(() => fermerMenus(false)); }
await p.evaluate(() => ouvrirAide("keys")); await regarder(p, "Pro · Aide · raccourcis");
await p.evaluate(() => { aideOnglet("gloss"); }); await regarder(p, "Pro · Aide · glossaire");
Object.assign(t, await p.evaluate(() => { const r = {}, k = document.getElementById("aideKeys").innerText, g = document.getElementById("aideGloss").innerText;
  r["Aide · Suppr « supprime l'élément choisi », et la visite de la rénovation n'y est pas"] = /Supprime l'élément choisi/.test(k) && ![...document.querySelectorAll("#m-keys button")].some((b) => b.getClientRects().length && /visite/i.test(b.textContent));
  r["Aide · le glossaire garde les mots du plan (doublage, allège), sans dépose ni corps d'état"] = /Doublage/.test(g) && /Allège/.test(g) && !/Dépose/.test(g) && !/Corps d'état/.test(g);
  return r; }));
await p.evaluate(() => closeModal());
await p.evaluate(() => openPlansModal()); await regarder(p, "Pro · Mes plans"); await p.evaluate(() => closeModal());
await p.evaluate(() => openModal("level")); await regarder(p, "Pro · ajouter un niveau"); await p.evaluate(() => closeModal());
await p.evaluate(() => openTemplates()); await regarder(p, "Pro · plans types"); await p.evaluate(() => closeModal());
await p.evaluate(() => toggleLayersPop()); await regarder(p, "Pro · Affichage"); await p.evaluate(() => toggleLayersPop());
/* au clavier : l'élément suivant est annoncé (lecteur d'écran) */
await p.evaluate(() => { sel = null; render(); cv.focus(); }); await p.keyboard.down("Alt"); await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight"); await p.keyboard.up("Alt"); await wait(120);
await regarder(p, "Pro · élément choisi au clavier, annoncé"); await p.evaluate(() => { sel = null; render(); });
await p.evaluate(() => { try { exportPlan(); } catch (e) { window.__pfErr = String(e); } }); await wait(400); await regarder(p, "Pro · dossier exporté");
t["dossier Pro · les plans (un par niveau), le contrôle du plan et les quantités — ni budget, ni suivi"] = await p.evaluate(() => JSON.stringify([...document.querySelectorAll("#exportGallery .xpage h4")].map((x) => x.textContent)) === JSON.stringify([...state.levels.map((l) => l.name), "Contrôle du plan", "Quantités"]));
await p.evaluate(() => closeModal());
await p.evaluate(() => { plierPanneau(true); }); await wait(150); await regarder(p, "Pro · panneau replié (barre d'état)"); await p.evaluate(() => { plierPanneau(false); });
/* les messages d'un geste : supprimer, annuler, poser une note */
await p.evaluate(() => { const it = L().items.find((i) => i.type === "canape"); sel = { kind: "item", id: it.id }; deleteSel(); }); await regarder(p, "Pro · message après une suppression"); await p.evaluate(() => { undo(); toast(""); });
await p.evaluate(() => { const w = L().walls.find((x) => x.type === "cloison"); sel = { kind: "wall", id: w.id }; deleteSel(); }); await regarder(p, "Pro · message après la suppression d'un mur"); await p.evaluate(() => { undo(); sel = null; render(); });
/* la barre d'état pendant un tracé de mur */
await p.evaluate(() => { setTool("mur"); }); { const q = await p.evaluate(() => { const s = S(v(14, 2)), rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }); await p.mouse.move(q.x, q.y); await p.mouse.click(q.x, q.y); await p.mouse.move(q.x + 120, q.y); await wait(150); }
await regarder(p, "Pro · tracé d'un mur en cours"); await p.keyboard.press("Escape"); await p.evaluate(() => { setTool("select"); render(); });

/* ═════════ 4. Le dessin à la souris, en Plan final ═════════ */
await p.evaluate(() => { closeWelcome("blank"); state = blankState(); state.workflow = WORKFLOW_FINAL; afterChange(); fitView(); setTool("mur"); render(); });
await regarder(p, "Pro · feuille blanche, outil Murs"); await p.evaluate(() => { setTool("select"); render(); }); await regarder(p, "Pro · feuille blanche");
t["feuille blanche · « Dessine ton plan final », commence par tes murs"] = await p.evaluate(() => { const e = document.getElementById("emptyStage"); return !e.hidden && /Dessine ton plan final/.test(e.innerText) && /Commence par tes murs/.test(e.innerText); });
await p.evaluate(() => setTool("mur"));
const P = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
const clic = async (x, y) => { const q = await P(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(120); };
for (const [x, y] of [[0, 0], [6, 0], [6, 4], [0, 4], [0, 0]]) await clic(x, y);
await p.evaluate(() => { fitView(); render(); });
await p.evaluate(() => { setOpeningType("fenetre"); setTool("ouverture"); }); await clic(3, 0); await wait(100);
await p.evaluate(() => { setTool("equipement"); setItemType("wc"); }); await clic(5.3, 3.4); await wait(100);
await p.evaluate(() => { setTool("cote"); toast(""); }); await clic(0.4, 1.5); await clic(5.6, 1.5); await clic(3, 2.2); await wait(100);
Object.assign(t, await p.evaluate(() => {
  const r = {}, lv = L(), f = (facesCache[lv.id] || []).filter((x) => x.room);
  r["souris · la pièce de 6 × 4 m est fermée"] = f.length === 1;
  r["souris · la fenêtre est posée, sans état"] = lv.openings.length === 1 && !lv.openings[0].st;
  r["souris · le WC est posé, sans état"] = lv.items.length === 1 && lv.items[0].type === "wc" && !lv.items[0].st;
  r["souris · la cote est posée"] = lv.dims.length === 1;
  r["souris · les murs n'ont aucun état"] = lv.walls.every((w) => !w.st);
  r["souris · toujours ni tâche ni prix"] = chantierTasks().length === 0 && chantierPrix().total === 0;
  return r;
}));
await p.evaluate(() => { setTool("select"); sel = null; render(); }); await regarder(p, "Pro · pièce dessinée à la souris");

/* ═════════ 5. Enregistrer, recharger, ranger : le type reste ═════════ */
await p.evaluate(() => { state.name = "Mon plan final"; save(); enregistrerMaintenant(); savePlanToLibrary(); closeModal(); });
await p.reload({ waitUntil: "networkidle0" }); await wait(300);
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["rechargement · le Plan final le reste, sur son plan dessiné"] = estPlanFinal() && mode() === "existant" && L().walls.length === 4;
  const lib = loadPlans(), e = Object.values(lib).find((x) => x.name === "Mon plan final");
  r["Mes plans · le plan rangé porte son type"] = !!e && e.state.workflow === "final_plan";
  state = blankState(); afterChange(); ouvrirPlanRange(e.id); closeModal();
  r["Mes plans · rouvert, il est toujours un Plan final"] = estPlanFinal() && mode() === "existant";
  return r;
}));
await regarder(p, "Pro · Plan final rechargé");
await p.close();

/* ═════════ 6. En gratuit ═════════ */
p = await onglet({ pro: false });
await p.evaluate(scenePF);
await regarder(p, "gratuit · vue d'ensemble");
for (const [kind, i] of [["wall", 0], ["opening", 0], ["item", 0], ["room", 0]]) {
  await p.evaluate(([kind, i]) => { const lv = L(); const o = kind === "wall" ? lv.walls[i] : kind === "opening" ? lv.openings[i] : kind === "item" ? lv.items[i] : (facesCache[lv.id] || []).find((f) => f.room).room; sel = { kind, id: o.id }; render(); majBarreSel(); }, [kind, i]);
  await regarder(p, "gratuit · fiche " + kind);
}
await p.evaluate(() => { sel = null; render(); ouvrirMenu("fichier"); }); await regarder(p, "gratuit · menu fichier"); await p.evaluate(() => fermerMenus(false));
await p.evaluate(() => openPlansModal()); await regarder(p, "gratuit · Mes plans"); await p.evaluate(() => closeModal());
await p.evaluate(() => { try { exportPlan(); } catch {} }); await wait(400); await regarder(p, "gratuit · dossier exporté");
t["dossier gratuit · les plans seuls, avec le filigrane"] = await p.evaluate(() => JSON.stringify([...document.querySelectorAll("#exportGallery .xpage h4")].map((x) => x.textContent)) === JSON.stringify(state.levels.map((l) => l.name)) && !!document.querySelector("#exportGallery .xpage .wm"));
await p.evaluate(() => closeModal());
await p.close();

/* ═════════ 6 bis. Tablette (768 × 1024) : panneau replié d'office, la bande au-dessus du plan ═════════ */
p = await onglet({ largeur: 768, hauteur: 1024 });
await p.evaluate(scenePF); await p.evaluate(() => closeModal());
await regarder(p, "tablette · plan");
await p.evaluate(() => { const w = L().walls[0]; sel = { kind: "wall", id: w.id }; render(); majBarreSel(); }); await regarder(p, "tablette · un mur choisi");
await p.evaluate(() => { sel = null; setTool("ouverture"); }); await regarder(p, "tablette · outil Ouvertures");
await p.close();

/* ═════════ 7. Au téléphone (390 × 844) : on consulte le plan ═════════ */
p = await onglet({ largeur: 390, hauteur: 844 });
await p.evaluate(scenePF); await p.evaluate(() => closeModal());
await regarder(p, "téléphone · plan");
await p.evaluate(() => { toggleSheet(true); renderPanel(); }); await regarder(p, "téléphone · tiroir ouvert");
t["téléphone · consultation : le bandeau le dit, et le tiroir n'a pas d'onglet Suivi"] = await p.evaluate(() => /Consultation/.test(document.getElementById("phoneBanner").innerText) && !document.querySelector("#pbody .ptabs"));
await p.evaluate(() => { const f = (facesCache[L().id] || []).find((x) => x.room); sel = { kind: "room", id: f.room.id }; render(); }); await regarder(p, "téléphone · fiche d'une pièce");
await p.evaluate(() => { const w = L().walls[0]; sel = { kind: "wall", id: w.id }; render(); }); await regarder(p, "téléphone · fiche d'un mur");
await p.evaluate(() => { sel = null; toggleSheet(false); setTool("mur"); }); await regarder(p, "téléphone · tentative de dessin");
await p.close();

/* ═════════ 8. Le type se transmet, et une rénovation retrouve ses textes ═════════ */
p = await onglet();
await p.evaluate(scenePF);
Object.assign(t, await p.evaluate(() => {
  const r = {};
  newPlan(); closeModal();
  r["Nouveau, depuis un Plan final : un Plan final (vide)"] = estPlanFinal() && planVide();
  chargerModele(TEMPLATES[0]); closeModal();
  r["plan type, depuis un Plan final : un Plan final, sans état"] = estPlanFinal() && L().walls.length > 0 && L().walls.every((w) => !w.st) && chantierTasks().length === 0;
  closeWelcome("sample"); closeModal();
  r["l'exemple reste une rénovation"] = !estPlanFinal() && state.workflow === "renovation";
  const eb = document.getElementById("estBtnTop");
  r["rénovation rouverte après un Plan final : « Estimer ce plan » et le panneau « Détails et budget » reviennent"] = /Estimer ce plan/.test(eb.textContent) && !/Exporter/.test(eb.textContent) && document.getElementById("panel").getAttribute("aria-label") === "Détails et budget";
  r["rénovation rouverte : la fenêtre « Ajouter un niveau » retrouve ses deux cas"] = /les travaux le créent/.test(document.querySelector("#m-level .sub").innerHTML) && !document.body.classList.contains("planFinal");
  r["rénovation rouverte : les vues et le Suivi sont là"] = document.querySelectorAll("#modes button").length === 3 && getComputedStyle(document.getElementById("modes")).display !== "none" && [...document.querySelectorAll(".ptabs [role=tab]")].some((x) => /Suivi/.test(x.textContent));
  return r;
}));
await p.close();

/* ═════════ 9. Un ancien plan (sans type) reste une rénovation, entière ═════════ */
p = await onglet();
const ancien = await p.evaluate(() => { closeWelcome("sample"); closeModal(); const s = JSON.parse(JSON.stringify(state)); delete s.workflow; return JSON.stringify({ state: s, view }); });
await p.close();
p = await onglet({ graine: { "avyora-plan-v2": ancien } });
Object.assign(t, await p.evaluate(() => {
  const r = {}; closeModal();
  r["ancien plan · relu en rénovation"] = state.workflow === "renovation" && !estPlanFinal();
  r["ancien plan · les trois vues et l'onglet Suivi sont là"] = document.querySelectorAll("#modes button").length === 3 && [...document.querySelectorAll(".ptabs [role=tab]")].some((x) => /Suivi/.test(x.textContent));
  setMode("projet"); closeModal();
  r["ancien plan · la vue Travaux s'ouvre, ses tâches et son budget sont là"] = mode() === "projet" && chantierTasks().length > 0 && chantierPrix().total > 0 && /Estimer ce plan/.test(document.getElementById("estBtnTop").textContent);
  r["ancien plan · le contrat le dit rénovation"] = contratPlan().workflow === "renovation";
  return r;
}));
await p.close();

/* ═════════ Verdicts ═════════ */
for (const [etat, txt] of lus) {
  const trouves = MOTS.filter(([re]) => re.test(txt)).map(([re, nom]) => { const m = txt.match(re); const i = txt.indexOf(m[0]); return nom + " ← « " + txt.slice(Math.max(0, i - 50), i + m[0].length + 30).replace(/\s+/g, " ") + " »"; });
  t[`mots · ${etat} : aucun mot du chantier`] = !trouves.length;
  if (trouves.length) console.log("   " + etat + "\n      " + (LISTER ? trouves : trouves.slice(0, 1)).join("\n      "));
}
for (const [etat, c] of constats) {
  const k = Object.entries(c).filter(([n, x]) => (Array.isArray(x) ? x.length : x)).map(([n, x]) => n + (Array.isArray(x) ? " (" + x.join(", ") + ")" : ""));
  t[`écran · ${etat} : ni vue, ni légende, ni décision, ni Suivi, ni budget, ni « Ton projet »`] = !k.length;
  if (k.length) console.log("   " + etat + " · visible : " + k.join(" · "));
}

let ko = 0;
for (const [k, ok] of Object.entries(t)) { if (!ok) ko++; if (!ok || LISTER) console.log((ok ? "  ok   " : "  ECHEC ") + k); }
console.log(`${Object.keys(t).length - ko}/${Object.keys(t).length} contrôles verts` + (errs.length ? ` · erreurs de page : ${[...new Set(errs)].join(" | ")}` : ""));
await b.close();
process.exit(ko || errs.length ? 1 : 0);
