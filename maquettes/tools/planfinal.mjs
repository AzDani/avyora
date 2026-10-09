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
 *   - D68 (création) : en gratuit, aucune question — un Plan final vide, sa carte « Dessine ton plan final », ni
 *     exemple ni choix de type (Nouveau, plans types : Plan final) ; en Pro, l'accueil, Fichier › Nouveau plan et
 *     Mes plans › Nouveau plan ouvrent le même choix à deux cartes (Plan final, Projet rénovation), puis le point de
 *     départ ; tout à la souris, puis au clavier (Tab, Entrée, la flèche de retour, Échap qui rend le focus) ; la
 *     pastille du type sous le nom et sur les cartes de Mes plans ; les plans types dans le type choisi ;
 *     « Démarrer un projet rénovation à partir de ce plan » (Pro) : une copie, le Plan final rangé et intact ;
 *     DROITS (« Projet rénovation » : Pro). Le choix du type décrit la rénovation avec ses mots (« Pars de l'existant
 *     et décide tes travaux ») : ses deux premières cartes ne sont pas lues comme un écran de Plan final ; ses étapes
 *     « Plan final » le sont.
 *   - D69 (interface épurée) : comparé au même plan en rénovation, moins de commandes dans la barre du haut (ni
 *     vues), une colonne d'outils plus courte (ni Zone ni raccourci B ; Structure, Menuiseries, Équipements, Mesures,
 *     Fond), pas de barre d'options sans option (la Sélection) — la tête du plan disparaît, le plan gagne sa hauteur —,
 *     une barre d'état sans budget ni légende ; à la tablette, les niveaux montent dans la barre du haut s'ils y
 *     tiennent ; le panneau garde les propriétés et, à la place du budget, un récapitulatif (surface habitable, pièces
 *     et surfaces par type, ouvertures par modèle), mêmes nombres que le plan ; « Exporter le plan » (clic) ouvre le
 *     dossier des plans, sans budget ni suivi ; l'aide de la première fois (la petite carte « Dessine ton plan final »
 *     et trois gestes) : où et quand elle se montre, fermée à la souris, mémorisée au rechargement, rouverte par
 *     Aide › Premiers pas, jamais dans une rénovation, ni par-dessus la carte du plan vide, ni au téléphone ; aux
 *     largeurs 1 440, 1 280, 1 024 (Pro et gratuit), 768 et 640 rien ne déborde ; au téléphone, la consultation.
 *   - D70 (corrections du jury) : l'aide ne prend aucun clic — un tracé à la souris dont le premier coin tombe SOUS la
 *     carte se ferme, la carte se replie en pastille « Premiers pas » (bas à gauche) dès qu'on dessine, d'office sur un
 *     plan type, et le « Mode d'emploi » du panneau reste replié tant qu'elle est dépliée ; Annuler s'allume dès la
 *     première pièce fermée ; une Séparation posée sur le bout d'une cloison coupe la pièce (Plan final et rénovation) ;
 *     en Pro, l'accueil s'ouvre sur une feuille blanche calme et le fermer sans choisir garde un Plan final vide
 *     (l'étape rénovation fermée ouvre l'exemple, D50) ; la vue d'ensemble dit chaque nombre une fois (pièces, puis
 *     ouvertures par modèle ; les totaux au pied) ; les mots démolir, MaPrimeRénov', neuf, ancien, toiture, artisan
 *     rejoignent la liste ; les plans types, le dossier, le glossaire, la Note et l'Affichage parlent du logement voulu ;
 *     au téléphone, le tiroir dit le type ; la rénovation d'un gratuit garde ses phrases et son exemple (D66).
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
  [/à démolir|(?<!\p{L})démoli(?:e|s|es|r)?(?!\p{L})/iu, "démolir / démoli"], /* D70 : « démolir » aussi (le glossaire « Tronçon ») */
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
  /* D70 (jury) : les aides à la rénovation, le neuf et l'ancien, la toiture (un Plan final n'en a pas), l'artisan (le chantier) */
  [/MaPrimeR[ée]nov/iu, "MaPrimeRénov'"],
  [/(?<!\p{L})neu(?:f|fs|ve|ves)(?!\p{L})/iu, "neuf / neuves"],
  [/(?<!\p{L})ancien(?:ne|s|nes)?(?!\p{L})/iu, "ancien"],
  [/(?<!\p{L})toitures?(?!\p{L})/iu, "toiture"],
  [/(?<!\p{L})artisans?(?!\p{L})/iu, "artisan"],
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

/* ═════════ 10. D68 · Création, gratuit : aucune question, un Plan final (à la souris) ═════════ */
/* ce qu'on lit dans une fenêtre seulement (l'écran derrière peut être l'exemple, une rénovation) */
const lireDans = (p, sel, etat) => p.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.innerText : ""; }, sel).then((txt) => { lus.push([etat, txt]); return txt; });
/* le centre d'un élément (sélecteur, ou texte d'un bouton visible) pour un vrai clic de souris */
const centre = (p, sel, texte) => p.evaluate((sel, texte) => {
  const el = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length && (!texte || x.innerText.replace(/\s+/g, " ").includes(texte)));
  if (!el) return null; el.scrollIntoView({ block: "nearest" }); const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel, texte || "");
const cliquer = async (p, sel, texte) => { const c = await centre(p, sel, texte); if (!c) throw new Error("introuvable : " + sel + " " + (texte || "")); await p.mouse.move(c.x, c.y); await wait(30); await p.mouse.click(c.x, c.y); await wait(180); };
const surPlan = (p, x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
const clicPlan = async (p, x, y) => { const q = await surPlan(p, x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(120); };
const piece = async (p, x0, y0, x1, y1) => { for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]) await clicPlan(p, x, y); };
const EXEMPLE_PROPOSE = /Découvrir avec l'exemple|Voir l'exemple|Revoir l'exemple/;

/* un parcours qui s'interrompt (un bouton absent, une fonction qui n'existe pas) compte comme un échec, et la suite continue */
const parcours = async (nom, fn) => { const k = `parcours · ${nom} : jusqu'au bout`; try { await fn(); t[k] = true; } catch (e) { t[k] = false; console.log("   " + nom + " interrompu : " + String((e && e.message) || e).split("\n")[0].slice(0, 160)); } finally { try { await p.close(); } catch {} } };
await parcours("gratuit, à l'ordinateur", async () => {
p = await onglet({ pro: false });
Object.assign(t, await p.evaluate((EX) => {
  const r = {}, vis = (el) => !!el && el.getClientRects().length > 0, e = document.getElementById("emptyStage");
  r["gratuit · arrivée : aucune fenêtre, aucune question — un Plan final vide"] = !modaleOuverte() && estPlanFinal() && planVide() && state.workflow === "final_plan";
  r["gratuit · arrivée : la carte « Dessine ton plan final — Commence par tes murs… »"] = vis(e) && /Dessine ton plan final/.test(e.innerText) && /Commence par tes murs, puis ajoute tes portes, fenêtres et aménagements/.test(e.innerText);
  r["gratuit · arrivée : l'accueil ne reviendra pas (drapeau posé)"] = localStorage.getItem("avyora-plan-welcome") === "1";
  r["gratuit · arrivée : la pastille « Plan final » sous le nom du plan"] = vis(document.getElementById("typePlan")) && document.getElementById("typePlan").textContent === "Plan final" && document.getElementById("pname").getAttribute("aria-describedby") === "typePlan";
  r["gratuit · l'exemple de rénovation n'est proposé nulle part (écran, menu Aide)"] = (() => { ouvrirMenu("aide"); const a = document.getElementById("aideMenu").innerText; fermerMenus(false); return !new RegExp(EX).test(document.body.innerText) && !new RegExp(EX).test(a); })();
  return r;
}, EXEMPLE_PROPOSE.source));
await regarder(p, "gratuit · arrivée");
await cliquer(p, "#emptyStage button", "Tracer les murs");
t["gratuit · « Tracer les murs » (clic) : l'outil Murs"] = await p.evaluate(() => tool === "mur");
await piece(p, 0, 0, 5, 4); await p.evaluate(() => { fitView(); render(); });
t["gratuit · une pièce de 5 × 4 m tracée à la souris, sans état"] = await p.evaluate(() => (facesCache[L().id] || []).filter((f) => f.room).length === 1 && L().walls.every((w) => !w.st) && estPlanFinal());
await p.evaluate(() => { setTool("select"); state.name = "Ma maison"; render(); });
await cliquer(p, "#fichierBtn"); await regarder(p, "gratuit · menu Fichier, un plan dessiné");
t["gratuit · Fichier : ni « Démarrer un projet rénovation », ni choix de type"] = await p.evaluate(() => !document.getElementById("renoDepuisBtn").getClientRects().length);
await cliquer(p, "#newBtn");
/* la place de « Mes plans » est prise par le plan dessiné (rangé d'abord) : la limite gratuite est dite avant (D48) */
t["gratuit · Fichier › Nouveau plan : pas de choix du type ; le plan dessiné est rangé, la limite gratuite dite avant"] = await p.evaluate(() => !document.getElementById("m-nouveau").classList.contains("show") && modaleOuverte()?.id === "m-confirm" && Object.values(loadPlans()).some((e) => e.name === "Ma maison" && e.state.workflow === "final_plan"));
await cliquer(p, "#confirmChoix button", "quand même");
t["gratuit · … un Plan final vide, l'outil Murs prêt"] = await p.evaluate(() => estPlanFinal() && planVide() && tool === "mur" && !modaleOuverte());
await p.evaluate(() => setTool("select"));
await cliquer(p, "#fichierBtn"); await cliquer(p, "#tplBtn");
t["gratuit · Plans types : rien à choisir (le type est toujours Plan final)"] = await p.evaluate(() => modaleOuverte()?.id === "m-templates" && !document.getElementById("tplType").innerHTML && !document.querySelector("#m-templates .seg"));
await regarder(p, "gratuit · plans types");
await cliquer(p, "#tplGrid .tpl", "T3");
if (await p.evaluate(() => modaleOuverte()?.id === "m-confirm")) await cliquer(p, "#confirmChoix button", "quand même");
t["gratuit · un plan type (clic) : un Plan final, sans aucun état, ni tâche"] = await p.evaluate(() => estPlanFinal() && /^T3/.test(state.name) && L().walls.length > 4 && L().walls.every((w) => !w.st) && L().openings.every((o) => !o.st) && chantierTasks().length === 0 && document.getElementById("typePlan").textContent === "Plan final");
await regarder(p, "gratuit · plan type T3");
await cliquer(p, "#fichierBtn"); await cliquer(p, "#plansBtn");
Object.assign(t, await p.evaluate(() => { const r = {}, L2 = document.getElementById("plansList");
  r["gratuit · Mes plans : chaque carte porte sa pastille « Plan final »"] = [...L2.querySelectorAll(".plancard")].length >= 1 && [...L2.querySelectorAll(".plancard")].every((c) => c.querySelector(".typeplan.pf")?.textContent === "Plan final");
  r["gratuit · Mes plans dit ce que Pro ajoute : le projet rénovation (DROITS)"] = L2.innerText.includes(DROITS.renovation.pro) && L2.innerText.includes(DROITS.plans.pro);
  r["gratuit · Mes plans : « Nouveau plan » (plus « vierge »)"] = /^\s*Nouveau plan\s*$/.test(document.querySelector('#m-plans button[onclick="newSavedPlan()"]').innerText);
  return r; }));
await regarder(p, "gratuit · Mes plans");
await p.evaluate(() => closeModal());
});
/* au téléphone, en gratuit : ni accueil, ni exemple */
await parcours("gratuit, au téléphone", async () => {
p = await onglet({ largeur: 390, hauteur: 844, pro: false });
Object.assign(t, await p.evaluate((EX) => { const vis = (el) => !!el && el.getClientRects().length > 0, e = document.getElementById("emptyStage");
  return { "téléphone gratuit · arrivée : aucune fenêtre, un Plan final, « Mes plans » seul sur la carte (pas d'exemple)": !modaleOuverte() && estPlanFinal() && vis(e) && [...e.querySelectorAll("button")].filter(vis).map((x) => x.textContent).join("|") === "Mes plans" && !new RegExp(EX).test(document.body.innerText) }; }, EXEMPLE_PROPOSE.source));
await regarder(p, "téléphone gratuit · arrivée");
});

/* ═════════ 11. D68 · Création, Pro : le type d'abord, deux cartes (à la souris, puis au clavier) ═════════ */
await parcours("Pro, création et navigation", async () => {
p = await onglet({ graine: { "avyora-plan-tuto": "fait" } });
Object.assign(t, await p.evaluate(() => {
  const r = {}, m = document.querySelector("#m-welcome .modal"), vis = (el) => !!el && el.getClientRects().length > 0, C = [...m.querySelectorAll(".wcard")].filter(vis);
  r["Pro · accueil : d'abord le type, deux cartes illustrées"] = modaleOuverte()?.id === "m-welcome" && m.dataset.etape === "type" && C.length === 2 && C.every((c) => c.querySelector(".wv svg"));
  r["Pro · accueil : « Plan final — Dessine directement le plan que tu veux obtenir. »"] = C[0].innerText.replace(/\s+/g, " ").trim() === "Plan final Dessine directement le plan que tu veux obtenir.";
  r["Pro · accueil : « Projet rénovation — Pars de l'existant et décide tes travaux. »"] = C[1].innerText.replace(/\s+/g, " ").trim() === "Projet rénovation Pars de l'existant et décide tes travaux.";
  r["Pro · accueil : le focus sur « Plan final », pas de flèche de retour au premier pas"] = C[0].contains(document.activeElement) && !vis(m.querySelector(".wretour"));
  r["Pro · accueil : il tient sans défiler"] = m.scrollHeight <= m.clientHeight + 1;
  return r; }));
await cliquer(p, "#m-welcome .wcard", "Projet rénovation");
Object.assign(t, await p.evaluate(() => { const m = document.querySelector("#m-welcome .modal"), vis = (el) => !!el && el.getClientRects().length > 0, C = [...m.querySelectorAll(".wcard")].filter(vis);
  return { "Pro · accueil › Projet rénovation (clic) : les choix d'avant (exemple recommandé, plan type, feuille blanche), une flèche de retour": m.dataset.etape === "reno" && C.length === 3 && /exemple/.test(C[0].innerText) && C[0].classList.contains("rec") && /plan type/.test(C[1].innerText) && /Feuille blanche/.test(C[2].innerText) && vis(m.querySelector(".wretour")) && /Dessine ton logement, on chiffre tes travaux/.test(m.querySelector("h3").textContent) }; }));
await cliquer(p, "#m-welcome .wretour");
t["Pro · accueil : la flèche (clic) revient au type, le focus sur la carte d'où l'on vient"] = await p.evaluate(() => document.querySelector("#m-welcome .modal").dataset.etape === "type" && /^Projet rénovation/.test(document.activeElement.innerText));
await cliquer(p, "#m-welcome .wcard", "Plan final");
Object.assign(t, await p.evaluate(() => { const m = document.querySelector("#m-welcome .modal"), vis = (el) => !!el && el.getClientRects().length > 0, C = [...m.querySelectorAll(".wcard")].filter(vis);
  return { "Pro · accueil › Plan final (clic) : « Dessine ton plan final — Comment veux-tu commencer ? », feuille blanche ou plan type (D70 : la consigne n'est dite qu'une fois, dans l'aide)": m.dataset.etape === "pf" && /Dessine ton plan final/.test(m.querySelector("h3").textContent) && m.querySelector(".wsub").textContent === "Comment veux-tu commencer ?" && !/Commence par tes murs/.test(m.innerText) && C.length === 2 && /Feuille blanche/.test(C[0].innerText) && /plan type/.test(C[1].innerText) }; }));
await lireDans(p, "#m-welcome .modal", "Pro · accueil, étape Plan final");
await cliquer(p, "#m-welcome .wcard", "Feuille blanche");
t["Pro · accueil › Plan final › Feuille blanche (clic) : un Plan final vide, l'outil Murs, l'exemple pas rangé"] = await p.evaluate(() => !modaleOuverte() && estPlanFinal() && planVide() && tool === "mur" && Object.keys(loadPlans()).length === 0 && localStorage.getItem("avyora-plan-welcome") === "1" && document.getElementById("typePlan").textContent === "Plan final");
await piece(p, 0, 0, 6, 4); await p.evaluate(() => { fitView(); setTool("select"); state.name = "Maison voulue"; render(); });
await regarder(p, "Pro · Plan final dessiné depuis l'accueil");
/* Fichier › Nouveau plan : le même choix ; puis Projet rénovation › Feuille blanche */
await cliquer(p, "#fichierBtn"); await cliquer(p, "#newBtn");
Object.assign(t, await p.evaluate(() => { const m = document.querySelector("#m-nouveau .modal"), vis = (el) => !!el && el.getClientRects().length > 0, C = [...m.querySelectorAll(".wcard")].filter(vis);
  return { "Pro · Fichier › Nouveau plan (clic) : la fenêtre « Nouveau plan », les deux mêmes cartes, le focus sur la première": modaleOuverte()?.id === "m-nouveau" && m.getAttribute("role") === "dialog" && /Nouveau plan/.test(document.getElementById(m.getAttribute("aria-labelledby")).textContent) && C.length === 2 && /^Plan final/.test(C[0].innerText) && /^Projet rénovation/.test(C[1].innerText) && C[0].contains(document.activeElement),
    "Pro · Nouveau plan : il dit ce qui arrive au plan ouvert (rangé d'abord)": /d'abord rangé dans Mes plans/.test(document.getElementById("nouvNote").textContent) }; }));
await cliquer(p, "#m-nouveau .wcard", "Plan final");
await lireDans(p, "#m-nouveau .modal", "Pro · Nouveau plan, étape Plan final");
await cliquer(p, "#m-nouveau .wretour"); await cliquer(p, "#m-nouveau .wcard", "Projet rénovation");
t["Pro · Nouveau plan › Projet rénovation (clic) : feuille blanche, plan type, exemple"] = await p.evaluate(() => { const C = [...document.querySelectorAll("#m-nouveau .wcard")].filter((x) => x.getClientRects().length); return document.querySelector("#m-nouveau .modal").dataset.etape === "reno" && C.length === 3 && /Feuille blanche/.test(C[0].innerText) && /plan type/.test(C[1].innerText) && /exemple/.test(C[2].innerText); });
await cliquer(p, "#m-nouveau .wcard", "Feuille blanche");
Object.assign(t, await p.evaluate(() => { const r = {}, lib = Object.values(loadPlans());
  r["Pro · … Feuille blanche (clic) : une rénovation vide (vues, « Estimer ce plan »), la pastille « Projet rénovation »"] = !modaleOuverte() && !estPlanFinal() && planVide() && document.querySelectorAll("#modes button").length === 3 && /Estimer ce plan/.test(document.getElementById("estBtnTop").textContent) && document.getElementById("typePlan").textContent === "Projet rénovation" && !document.getElementById("typePlan").classList.contains("pf");
  r["Pro · … le Plan final d'avant est rangé dans Mes plans, et le reste"] = lib.some((e) => e.name === "Maison voulue" && e.state.workflow === "final_plan" && e.state.levels[0].walls.length === 4);
  return r; }));
/* Mes plans : les deux types, et « Nouveau plan » ouvre le même choix (un mur dans la rénovation : elle a sa carte) */
await p.evaluate(() => { L().walls.push({ id: uid(), a: v(0, 0), b: v(4, 0), type: "mur" }); afterChange(); });
await cliquer(p, "#fichierBtn"); await cliquer(p, "#plansBtn");
t["Pro · Mes plans : chaque carte porte la pastille de son type"] = await p.evaluate(() => { const C = [...document.querySelectorAll("#plansList .plancard")]; const de = (n) => C.find((c) => c.querySelector(".gname b")?.textContent === n)?.querySelector(".typeplan")?.textContent; return de("Maison voulue") === "Plan final" && de(state.name) === "Projet rénovation"; });
await cliquer(p, "#m-plans button", "Nouveau plan");
t["Pro · Mes plans › Nouveau plan (clic) : le même choix à deux cartes"] = await p.evaluate(() => modaleOuverte()?.id === "m-nouveau" && document.querySelector("#m-nouveau .modal").dataset.etape === "type");
await cliquer(p, "#m-nouveau .wcard", "Plan final"); await cliquer(p, "#m-nouveau .wcard", "plan type");
t["Pro · Plan final › Partir d'un plan type (clic) : la fenêtre des plans types dit « Plan final », sans choix à refaire"] = await p.evaluate(() => modaleOuverte()?.id === "m-templates" && document.querySelector("#tplType .typeplan.pf")?.textContent === "Plan final" && !document.querySelector("#tplType .seg"));
await lireDans(p, "#m-templates .modal", "Pro · plans types (Plan final fixé), la fenêtre");
await cliquer(p, "#tplGrid .tpl", "Maison");
Object.assign(t, await p.evaluate(() => ({ "Pro · … Maison (clic) : un Plan final redessiné, sans état ni tâche": !modaleOuverte() && estPlanFinal() && /^Maison/.test(state.name) && L().walls.every((w) => !w.st) && L().openings.every((o) => !o.st) && L().items.every((i) => !i.st) && chantierTasks().length === 0 && document.getElementById("typePlan").textContent === "Plan final" })));
await regarder(p, "Pro · plan type Maison en Plan final");
/* Fichier › Plans types, depuis un Plan final : deux boutons, le type du plan ouvert d'abord */
await cliquer(p, "#fichierBtn"); await cliquer(p, "#tplBtn");
t["Pro · Fichier › Plans types : « Type du plan » en deux boutons, « Plan final » choisi (le plan ouvert)"] = await p.evaluate(() => { const B = [...document.querySelectorAll("#tplType .seg button")]; return B.length === 2 && B[0].textContent === "Plan final" && B[0].getAttribute("aria-pressed") === "true" && B[1].textContent === "Projet rénovation" && B[1].getAttribute("aria-pressed") === "false" && document.querySelector("#tplType .seg").getAttribute("role") === "group"; });
await regarder(p, "Pro · plans types, depuis un Plan final");
await cliquer(p, "#tplType .seg button", "Projet rénovation");
t["Pro · … « Projet rénovation » (clic) : choisi"] = await p.evaluate(() => document.querySelector("#tplType .seg button[aria-pressed=true]")?.textContent === "Projet rénovation");
await cliquer(p, "#tplGrid .tpl", "Studio");
t["Pro · … Studio (clic) : une rénovation (ses vues), le Plan final Maison rangé"] = await p.evaluate(() => !estPlanFinal() && /^Studio/.test(state.name) && document.querySelectorAll("#modes button").length === 3 && Object.values(loadPlans()).some((e) => /^Maison/.test(e.name) && e.state.workflow === "final_plan"));
/* au clavier : Fichier, Entrée, Entrée ; Tab, Entrée ; Maj+Tab sur la flèche, Entrée ; Échap */
await p.evaluate(() => { closeModal(); document.activeElement?.blur?.(); });
await p.focus("#fichierBtn"); await p.keyboard.press("Enter"); await wait(80); await p.keyboard.press("Enter"); await wait(150);
t["clavier · Fichier, Entrée, Entrée : « Nouveau plan », le focus sur « Plan final »"] = await p.evaluate(() => modaleOuverte()?.id === "m-nouveau" && /^Plan final/.test(document.activeElement.innerText));
await p.keyboard.press("Tab"); await p.keyboard.press("Enter"); await wait(150);
t["clavier · Tab, Entrée : l'étape Projet rénovation, le focus sur sa première carte"] = await p.evaluate(() => document.querySelector("#m-nouveau .modal").dataset.etape === "reno" && /^Feuille blanche/.test(document.activeElement.innerText));
await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await wait(40);
t["clavier · Maj+Tab : la flèche de retour, nommée"] = await p.evaluate(() => document.activeElement.classList.contains("wretour") && /Retour au choix du type de plan/.test(document.activeElement.getAttribute("aria-label")));
await p.keyboard.press("Enter"); await wait(150);
t["clavier · Entrée sur la flèche : le type, le focus sur « Projet rénovation »"] = await p.evaluate(() => document.querySelector("#m-nouveau .modal").dataset.etape === "type" && /^Projet rénovation/.test(document.activeElement.innerText));
for (let i = 0; i < 8; i++) await p.keyboard.press("Tab");
t["clavier · Tab ×8 : le focus reste dans la fenêtre"] = await p.evaluate(() => document.querySelector("#m-nouveau .modal").contains(document.activeElement));
await p.keyboard.press("Escape"); await wait(120);
t["clavier · Échap ferme, rien n'a changé, le focus revient à « Fichier »"] = await p.evaluate(() => !modaleOuverte() && /^Studio/.test(state.name) && document.activeElement.id === "fichierBtn");
/* « Démarrer un projet rénovation à partir de ce plan » (Pro, depuis un Plan final) */
t["Fichier, dans une rénovation : pas de « Démarrer un projet rénovation »"] = await p.evaluate(() => { majMenuFichier(); ouvrirMenu("fichier"); const v = !!document.getElementById("renoDepuisBtn").getClientRects().length; fermerMenus(false); return !v; });
await p.evaluate(() => { const e = Object.values(loadPlans()).find((x) => /^Maison/.test(x.name)); ouvrirPlanRange(e.id); closeModal(); const lv = L(); lv.walls.find((w) => w.type === "mur").iso = { e: 0.12, mat: "gv", mode: "iti", sys: "ossature", side: 1 }; addLevel("copy"); setLevel(0); afterChange(); render(); });
const avantCopie = await p.evaluate(() => ({ id: state.id, nom: state.name, n: state.levels.map((l) => [l.walls.length, l.openings.length, l.items.length].join(",")).join("|") }));
await cliquer(p, "#fichierBtn"); await regarder(p, "Pro · menu Fichier d'un Plan final");
await cliquer(p, "#renoDepuisBtn");
Object.assign(t, await p.evaluate((a) => { const r = {}, lib = loadPlans(), pf = lib[a.id];
  r["Démarrer une rénovation (clic) : un AUTRE plan, en rénovation, vue Avant travaux"] = !estPlanFinal() && state.workflow === "renovation" && mode() === "existant" && state.id !== a.id && state.name === a.nom + " · rénovation" && document.querySelectorAll("#modes button").length === 3 && document.getElementById("typePlan").textContent === "Projet rénovation";
  r["… le plan est copié tel quel (niveaux, murs, ouvertures, équipements), chaque objet « déjà là » (aucun état), aucune tâche"] = state.levels.map((l) => [l.walls.length, l.openings.length, l.items.length].join(",")).join("|") === a.n && state.levels.every((l) => [...l.walls, ...l.openings, ...l.items].every((o) => !o.st) && !l.neuf) && chantierTasks().length === 0;
  r["… le Plan final reste dans Mes plans, intact et Plan final"] = !!pf && pf.state.workflow === "final_plan" && pf.state.levels.map((l) => [l.walls.length, l.openings.length, l.items.length].join(",")).join("|") === a.n;
  r["… le message dit où est le Plan final et la vue suivante"] = /rangé dans « Mes plans »/.test(document.getElementById("toast").textContent) && /vue Travaux/.test(document.getElementById("toast").textContent);
  undo(); r["… Ctrl+Z ramène le Plan final"] = estPlanFinal() && state.name === a.nom; redo(); render();
  return r; }, avantCopie));
});
/* la carte « Voir l'exemple » de l'étape rénovation ouvre l'exemple (une rénovation) */
await parcours("Pro, l'exemple depuis Nouveau plan", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait" } });
await p.evaluate(() => { closeModal(); nouveauPlan(); etapeDepart("nouveau", "reno"); });
await cliquer(p, "#m-nouveau .wcard", "exemple");
t["Pro · Nouveau plan › Projet rénovation › Voir l'exemple (clic) : l'exemple, une rénovation"] = await p.evaluate(() => !modaleOuverte() && estExemple() && !estPlanFinal());
});

/* ═════════ 12. D68 · DROITS : « Projet rénovation : Pro », rien de promis qui n'existe pas ═════════ */
await parcours("DROITS", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1" } });
Object.assign(t, await p.evaluate(() => ({
  "DROITS · une ligne « Projet rénovation » : Pro seulement": DROITS.renovation && DROITS.renovation.gratuit === null && /^le projet rénovation/.test(DROITS.renovation.pro) && droitsPro().includes(DROITS.renovation.pro) && !droitsGratuit().includes(DROITS.renovation.pro),
  "DROITS · le gratuit dessine son plan final (plus « et tes travaux »)": DROITS.dessin.gratuit === "dessiner ton plan final" && !droitsGratuit().some((d) => /tes travaux/.test(d)),
  "DROITS · une phrase de liste, sans deux-points": !/:/.test(DROITS.renovation.pro),
})));
});

/* ═════════ 13. D68 · Aux autres tailles : l'accueil et « Nouveau plan » tiennent, la pastille est sous le nom ═════════ */
for (const [L0, H0] of [[1280, 800], [1024, 768], [768, 1024]]) {
  await parcours(`${L0}×${H0}`, async () => {
  p = await onglet({ largeur: L0, hauteur: H0 });
  Object.assign(t, await p.evaluate((tag) => { const r = {}, m = document.querySelector("#m-welcome .modal"), vis = (el) => !!el && el.getClientRects().length > 0, C = [...m.querySelectorAll(".wcard")].filter(vis), mr = m.getBoundingClientRect();
    r[`${tag} · accueil : les deux cartes côte à côte, dans l'écran, sans défiler`] = C.length === 2 && Math.abs(C[0].getBoundingClientRect().top - C[1].getBoundingClientRect().top) < 1 && mr.top >= 0 && mr.bottom <= innerHeight && m.scrollHeight <= m.clientHeight + 1;
    closeWelcome("fermer"); closeModal(); nouveauPlan(); const n = document.querySelector("#m-nouveau .modal"), nr = n.getBoundingClientRect();
    r[`${tag} · Nouveau plan : dans l'écran, sans défiler`] = nr.top >= 0 && nr.bottom <= innerHeight && n.scrollHeight <= n.clientHeight + 1;
    etapeDepart("nouveau", "reno"); r[`${tag} · Nouveau plan › Projet rénovation : trois cartes, sans défiler`] = [...n.querySelectorAll(".wcard")].filter(vis).length === 3 && n.scrollHeight <= n.clientHeight + 1;
    closeModal(); const tp = document.getElementById("typePlan"), nm = document.getElementById("pname"), a = tp.getBoundingClientRect(), b2 = nm.getBoundingClientRect(), top = document.querySelector(".top").getBoundingClientRect();
    r[`${tag} · la pastille du type, sous le nom, dans la barre`] = vis(tp) && a.top >= b2.bottom - 1 && a.left >= b2.left && a.bottom <= top.bottom && tp.textContent === nomType(workflowDe(state)); /* D70 : l'accueil fermé laisse un Plan final vide (plus l'exemple) : la pastille dit le type du plan ouvert */
    return r; }, `${L0}×${H0}`));
  });
}

/* ═════════ 14. D69 · L'interface épurée : le même plan, en Plan final puis en rénovation ═════════ */
/* ce qui se voit dans chaque bande autour du plan (comptes de commandes, outils, sections, tête du plan, zone utile) */
const MESURE = () => {
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const n = (sel) => [...document.querySelectorAll(sel)].filter(vis).length, z = zoneUtile(), tp = document.getElementById("tetePlan");
  return {
    top: n(".top button, .top input, .top a"),
    outils: [...document.querySelectorAll("#tools .tb")].filter(vis).map((x) => (x.getAttribute("onclick").match(/setTool\('(\w+)'\)/) || [])[1]),
    sections: [...document.querySelectorAll("#tools .cat")].filter(vis).map((c) => c.textContent.trim()).filter(Boolean),
    tete: vis(tp) ? tp.offsetHeight : 0, optbar: vis(document.getElementById("optbar")),
    etat: n("#etat > *") + n("#etat .zoomctl > *"), plan: Math.round(z.y1 - z.y0), y0: z.y0,
    budget: vis(document.querySelector("#pfoot .budget")) || vis(document.getElementById("budgetPlie")), legende: vis(document.querySelector("#etat .vlegend")) || vis(document.querySelector(".vlegend")),
    recap: vis(document.querySelector("#pfoot .recappf")), onglets: n(".ptabs [role=tab]"),
  };
};
await parcours("D69, l'interface épurée", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait", "avyora-plan-aide-pf": "1" } });
await p.evaluate(scenePF);
const pf = await p.evaluate(MESURE);
const reno = await p.evaluate((M) => { state.workflow = WORKFLOW_RENO; sel = null; render(); const r = (0, eval)("(" + M + ")")(); setMode("projet"); closeModal(); const rp = (0, eval)("(" + M + ")")(); state.workflow = WORKFLOW_FINAL; state.mode = "existant"; render(); return { ...r, etatProjet: rp.etat, legendeProjet: rp.legende }; }, MESURE.toString());
if (LISTER) console.log("   Plan final", JSON.stringify(pf), "\n   rénovation", JSON.stringify(reno));
t["épuré · barre du haut : moins de commandes que la rénovation du même plan (ni vues)"] = pf.top < reno.top && pf.top <= reno.top - 3;
t["épuré · colonne : 9 outils — Sélection, Murs, Doublage, Ouvertures, Équipements, Cote, Mesurer, Note, Image (ni Zone)"] = JSON.stringify(pf.outils) === JSON.stringify(["select", "mur", "doublage", "ouverture", "equipement", "cote", "mesure", "texte", "calque"]);
t["épuré · colonne : les sections Structure, Menuiseries, Intérieur (D70 : un titre à chaque famille), Mesures, Fond ; la Sélection en tête, sans titre"] = JSON.stringify(pf.sections) === JSON.stringify(["Structure", "Menuiseries", "Intérieur", "Mesures", "Fond"]);
t["rénovation · sa colonne ne bouge pas (10 outils, Zone comprise ; Édition, Annoter)"] = reno.outils.length === 10 && reno.outils.includes("zone") && JSON.stringify(reno.sections) === JSON.stringify(["Édition", "Structure", "Menuiseries", "Annoter", "Fond"]);
t["épuré · Sélection : pas de barre d'options, la tête du plan disparaît (le plan commence sous la barre du haut)"] = !pf.optbar && pf.tete === 0 && pf.y0 === 0;
t["épuré · le plan gagne la hauteur de la barre d'options (rénovation : barre de la Sélection, même plan)"] = reno.optbar && reno.tete > 0 && pf.plan >= reno.plan + reno.tete;
t["épuré · barre d'état : ni budget ni légende, moins d'éléments que la rénovation en vue Travaux"] = !pf.budget && !pf.legende && pf.etat < reno.etatProjet && reno.legendeProjet;
t["épuré · panneau : ni onglets ni budget ; le récapitulatif au pied (rénovation : onglets et budget)"] = pf.onglets === 0 && !pf.budget && pf.recap && reno.onglets === 2 && reno.budget && !reno.recap;
Object.assign(t, await p.evaluate(() => {
  const r = {}, vis = (el) => !!el && el.getClientRects().length > 0;
  setTool("mur"); const ob = document.getElementById("optbar");
  r["barre d'options : elle s'ouvre pour un outil qui a des options (Murs : Type, Trait, Pièce)"] = vis(ob) && /Type/.test(ob.innerText) && /Pièce/.test(ob.innerText) && vis(document.getElementById("tetePlan")) && zoneUtile().y0 > 0;
  setTool("select"); render();
  r["barre d'options : elle se referme à la Sélection"] = !vis(document.getElementById("tetePlan")) && zoneUtile().y0 === 0;
  setTool("zone"); r["Zone : hors de la colonne, l'outil revient à la Sélection"] = tool === "select";
  const tb = [...document.querySelectorAll("#tools .tb")].find((x) => /setTool\('select'\)/.test(x.getAttribute("onclick")));
  r["Sélection : sa bulle dit le cadre (Maj + glisser), qui remplace la Zone"] = /Maj \+ glisser dans le vide/.test(tb.dataset.tip);
  r["contexte : la barre du haut dit « Niveaux » (pas de vue à choisir)"] = document.getElementById("ctxTop").getAttribute("aria-label") === "Niveaux";
  ouvrirAide("keys"); const k = document.getElementById("aideKeys").innerText; closeModal();
  r["Aide · raccourcis : les outils de la colonne, sans la Zone ni sa touche"] = !/\bZone\b/.test(k) && /Murs/.test(k) && /Ouvertures/.test(k);
  return r;
}));
await p.evaluate(() => { sel = null; render(); cv.focus(); }); await p.keyboard.press("b"); await wait(80);
t["clavier · B ne choisit rien dans un Plan final (la Zone n'y est pas)"] = await p.evaluate(() => tool === "select");
await p.keyboard.press("m"); await wait(60);
t["clavier · M choisit toujours les Murs"] = await p.evaluate(() => tool === "mur");
await p.keyboard.press("Escape"); await p.evaluate(() => { setTool("select"); sel = null; render(); });
/* le panneau : propriétés + récapitulatif */
await regarder(p, "Pro · vue d'ensemble, le récapitulatif");
Object.assign(t, await p.evaluate(() => {
  const r = {}, vis = (el) => !!el && el.getClientRects().length > 0, P = document.getElementById("pbody");
  /* D70 (jury) : chaque nombre une fois — la liste des pièces (cliquable), puis les ouvertures par modèle, avant les réglages ;
     les totaux (surface habitable, pièces, ouvertures) au pied seulement ; les nombres qu'on lit en encre, pas en indigo */
  const hv = habView(quantities()), N = state.levels.reduce((s, l) => s + l.openings.length, 0);
  const ph = [...P.querySelectorAll(".ph")].find((x) => /^Ouvertures/.test(x.textContent.trim())), o = ph && ph.nextElementSibling, rows = o ? [...o.querySelectorAll(".sr")] : [];
  r["vue d'ensemble · la liste des pièces (cliquable), sans tableau des surfaces par type ni « Récapitulatif » qui la répète"] = P.querySelectorAll(".roomlist button.rl").length === (facesCache[L().id] || []).filter((f) => f.room).length && !P.querySelector(".stab:not(.ouv)") && ![...P.querySelectorAll(".ph")].some((x) => /^Récap/.test(x.textContent.trim()));
  r["vue d'ensemble · les ouvertures par modèle (tous niveaux), sans ligne de total : leur somme = toutes les ouvertures du plan"] = !!o && o.classList.contains("ouv") && /tous niveaux/.test(ph.textContent) && rows.length >= 5 && !o.querySelector(".tot") && rows.reduce((s, x) => s + +x.querySelector("b").textContent, 0) === N && /Baie vitrée/.test(o.innerText) && /Porte d'entrée/.test(o.innerText);
  r["vue d'ensemble · les ouvertures juste sous les pièces, avant « Réglages du niveau »"] = !!ph && ph.previousElementSibling?.classList.contains("roomlist") && !!(ph.compareDocumentPosition(P.querySelector('details[data-k="niveau"]') || P.lastElementChild) & Node.DOCUMENT_POSITION_FOLLOWING);
  r["vue d'ensemble · la surface habitable et les totaux ne se lisent qu'au pied"] = !/Surface habitable/.test(P.innerText) && !P.innerText.includes(fmtM2(hv.area));
  { const enc = document.createElement("i"); enc.style.color = "var(--ink)"; document.body.appendChild(enc); const ink = getComputedStyle(enc).color; enc.remove();
    r["vue d'ensemble · les nombres des ouvertures en encre (l'indigo dit ce qui se clique)"] = rows.length > 0 && rows.every((x) => getComputedStyle(x.querySelector("b")).color === ink); }
  const c = document.querySelector("#pfoot .recappf");
  r["pied · à la place du budget : « Surface habitable », la surface en grand (celle du plan)"] = vis(c) && /^Surface habitable/.test(c.querySelector(".rk").textContent) && c.querySelector(".rv").textContent === fmtM2(hv.area) && !document.querySelector("#pfoot .budget");
  r["pied · les pièces et les ouvertures (mêmes nombres), et les 2 niveaux"] = c.querySelector(".rs").textContent.replace(/\s+/g, " ").trim() === `${hv.rooms} pièces · ${N} ouvertures` && /2 niveaux/.test(c.querySelector(".rk").textContent) && c.getAttribute("aria-label") === "Récapitulatif du plan";
  const w = L().walls[0]; sel = { kind: "wall", id: w.id }; render();
  r["pied · il reste quand un élément est choisi (les propriétés au-dessus)"] = vis(document.querySelector("#pfoot .recappf")) && /Mur/.test(P.querySelector(".ptitle").textContent);
  sel = null; render();
  return r;
}));
/* « Exporter le plan », le bouton du haut, à la souris : le dossier des plans */
await cliquer(p, "#estBtnTop");
t["Exporter le plan (clic) : le dossier des plans — un par niveau, le contrôle, les quantités — ni budget ni suivi"] = await p.evaluate(() => { const H = [...document.querySelectorAll("#exportGallery .xpage h4")].map((x) => x.textContent); return modaleOuverte()?.id === "m-export" && JSON.stringify(H) === JSON.stringify([...state.levels.map((l) => l.name), "Contrôle du plan", "Quantités"]) && !H.some((h) => /Budget|Suivi|mots de ce budget/.test(h)); });
await regarder(p, "Pro · dossier exporté depuis le bouton du haut"); await p.evaluate(() => closeModal());
/* sans pièce : ni carte de récapitulatif, ni liste vide */
Object.assign(t, await p.evaluate(() => { const vis = (el) => !!el && el.getClientRects().length > 0; state = blankState(); state.workflow = WORKFLOW_FINAL; afterChange(); fitView(); setTool("select"); render();
  return { "sans pièce : pas de récapitulatif au pied, et le panneau ne dit qu'une fois comment fermer une pièce": !vis(document.getElementById("pfoot")) && !document.querySelector("#pfoot .recappf") && ![...document.querySelectorAll("#pbody .ph")].some((x) => vis(x) && /Pièces/.test(x.textContent)) && /Aucune pièce fermée/.test(document.getElementById("pbody").innerText),
    "sans pièce (D70) : le panneau ne redit pas « Trace les murs extérieurs » (la carte du plan vide et la barre d'état le disent)": !/Trace les murs/.test(document.getElementById("pbody").innerText) }; }));
await regarder(p, "Pro · plan vide, le panneau");
});

/* ═════════ 15. D69 · L'aide de la première fois ═════════ */
const AIDE = () => { const a = document.getElementById("aidePF"); if (!a || !a.getClientRects().length) return null; const q = a.getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect(), tp = document.getElementById("tetePlan"), et = document.getElementById("etat").getBoundingClientRect(), to = document.getElementById("tools").getBoundingClientRect();
  return { etat: a.dataset.etat, pill: a.querySelector(".aidepill")?.textContent, h4: a.querySelector("h4")?.textContent, p: a.querySelector("p")?.textContent, li: [...a.querySelectorAll("li")].map((x) => x.textContent.replace(/\s+/g, " ").trim()), ico: a.querySelectorAll("li svg.ico").length, x: a.querySelector(".aidex")?.getAttribute("aria-label"),
    dedans: q.left >= st.left && q.right <= st.right && q.top >= st.top && q.bottom <= et.top && q.left >= to.right && (!tp.getClientRects().length || q.top >= tp.getBoundingClientRect().bottom), l: Math.round(q.width), focus: a.contains(document.activeElement), carteVide: !document.getElementById("emptyStage").hidden }; };
await parcours("D69, l'aide de la première fois (Pro, à la souris)", async () => {
p = await onglet({ graine: { "avyora-plan-tuto": "fait" } });
await cliquer(p, "#m-welcome .wcard", "Plan final"); await cliquer(p, "#m-welcome .wcard", "Feuille blanche");
const a = await p.evaluate(AIDE);
t["aide · après « Plan final › Feuille blanche » (outil Murs), la petite carte est là"] = !!a;
t["aide · « Dessine ton plan final — Commence par tes murs, puis ajoute tes portes, fenêtres et aménagements. »"] = !!a && a.h4 === "Dessine ton plan final" && a.p === "Commence par tes murs, puis ajoute tes portes, fenêtres et aménagements.";
t["aide · trois gestes très courts (12 mots au plus : Murs, Ouvertures, Équipements), chacun avec l'icône de son outil"] = !!a && a.li.length === 3 && /^Murs :/.test(a.li[0]) && /^Ouvertures :/.test(a.li[1]) && /^Équipements :/.test(a.li[2]) && a.li.every((x) => (x.match(/\p{L}+/gu) || []).length <= 12) && a.ico === 3;
t["aide · en haut à gauche du plan : sous la barre d'options, à droite des outils, au-dessus de la barre d'état ; 320 px au plus"] = !!a && a.dedans && a.l <= 320;
t["aide (D70) · une seule voix : tant qu'elle est dépliée, le « Mode d'emploi » des Murs reste replié dans le panneau"] = await p.evaluate(() => !!document.querySelector("#pbody details.mepli") && !document.querySelector("#pbody details.mepli").open);
t["aide (D70) · elle ne prend aucun clic du plan (seuls ses boutons)"] = await p.evaluate(() => { const a = document.getElementById("aidePF"); return getComputedStyle(a).pointerEvents === "none" && [...a.querySelectorAll("button")].every((x) => getComputedStyle(x).pointerEvents === "auto"); });
t["aide · elle ne prend pas le focus ; sa croix est nommée « Fermer l'aide »"] = !!a && !a.focus && a.x === "Fermer l'aide";
await regarder(p, "Pro · l'aide de la première fois");
/* D70 (jury) : le premier coin tombe SOUS la carte — là où l'on commence sa maison. Le clic passe, la carte se replie. */
const coin = await p.evaluate(() => { const a = document.getElementById("aidePF").getBoundingClientRect(), rc = cv.getBoundingClientRect(); const x = (a.left + 110 - rc.left - view.ox) / view.zoom, y = (a.top + 120 - rc.top - view.oy) / view.zoom; return { x: Math.round(x), y: Math.round(y) }; });
t["aide (D70) · le premier coin choisi est bien sous la carte"] = await p.evaluate((c) => { const a = document.getElementById("aidePF").getBoundingClientRect(), rc = cv.getBoundingClientRect(), q = S(v(c.x, c.y)); const X = rc.left + q.x, Y = rc.top + q.y; return X > a.left && X < a.right && Y > a.top && Y < a.bottom; }, coin);
await clicPlan(p, coin.x, coin.y);
t["aide (D70) · le premier clic, sous la carte, commence le tracé ; la carte se replie, et pendant le tracé même la pastille s'efface"] = await p.evaluate(() => tool === "mur" && chain.length === 1 && document.getElementById("aidePF").hidden);
for (const [x, y] of [[coin.x + 5, coin.y], [coin.x + 5, coin.y + 4], [coin.x, coin.y + 4], [coin.x, coin.y]]) await clicPlan(p, x, y);
Object.assign(t, await p.evaluate(() => { const a = document.getElementById("aidePF"), q = a.getBoundingClientRect(), et = document.getElementById("etat").getBoundingClientRect(), to = document.getElementById("tools").getBoundingClientRect();
  return { "aide (D70) · la pièce de 5 × 4 m dont le premier coin était sous la carte se ferme (4 murs)": (facesCache[L().id] || []).filter((f) => f.room).length === 1 && L().walls.length === 4,
    "Annuler (D70) · allumé dès la première pièce fermée à la souris, et Rétablir éteint (rien à rétablir)": !document.getElementById("undoBtn").disabled && document.getElementById("redoBtn").disabled && history.length > 0 && !future.length,
    "aide (D70) · repliée : une pastille « Premiers pas », en bas à gauche du plan (au-dessus de la barre d'état, à droite des outils)": !a.hidden && a.dataset.etat === "pli" && /Premiers pas/.test(a.innerText) && q.bottom <= et.top && et.top - q.bottom <= 24 && q.left >= to.right && q.left - to.right <= 24 && q.height <= 44,
    "aide (D70) · la pastille ne prend pas le focus ; elle se rouvre (bouton) et se ferme (croix « Fermer l'aide »)": !a.contains(document.activeElement) && a.querySelector(".aidepill")?.getAttribute("aria-expanded") === "false" && a.querySelector(".aidex")?.getAttribute("aria-label") === "Fermer l'aide" }; }));
await p.evaluate(() => { setTool("select"); fitView(); render(); });
await regarder(p, "Pro · une pièce, l'aide repliée");
await cliquer(p, "#aidePF .aidepill");
t["aide (D70) · la pastille (clic) rouvre la carte"] = await p.evaluate(() => document.getElementById("aidePF").dataset.etat === "carte" && /Dessine ton plan final/.test(document.getElementById("aidePF").innerText));
await clicPlan(p, coin.x + 2.5, coin.y + 2);
t["aide (D70) · un clic dans le plan la replie de nouveau (le clic choisit ce qu'il touche)"] = await p.evaluate(() => document.getElementById("aidePF").dataset.etat === "pli" && !!sel);
await p.evaluate(() => { sel = null; render(); });
await cliquer(p, "#aidePF .aidex");
t["aide · la croix (clic) la ferme, et c'est mémorisé"] = await p.evaluate(() => document.getElementById("aidePF").hidden && localStorage.getItem("avyora-plan-aide-pf") === "1");
await p.evaluate(() => { save(); enregistrerMaintenant(); }); await p.reload({ waitUntil: "networkidle0" }); await wait(300);
t["aide · au rechargement, elle ne revient pas (le Plan final, si)"] = await p.evaluate(() => estPlanFinal() && document.getElementById("aidePF").hidden);
await cliquer(p, "#aideBtn");
t["aide · le menu Aide propose « Premiers pas » (Plan final)"] = await p.evaluate(() => !!document.getElementById("aidePfBtn").getClientRects().length && /Premiers pas/.test(document.getElementById("aidePfBtn").textContent));
await regarder(p, "Pro · menu Aide d'un Plan final");
await cliquer(p, "#aidePfBtn");
t["aide · Aide › Premiers pas (clic) la rouvre"] = !!(await p.evaluate(AIDE));
await cliquer(p, "#aidePF .aidex");
t["aide · … et la croix la referme"] = await p.evaluate(() => document.getElementById("aidePF").hidden);
});
await parcours("D69, l'aide : jamais dans une rénovation", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait" } });
Object.assign(t, await p.evaluate((A) => { const aide = (0, eval)("(" + A + ")"); closeModal(); const r = {};
  loadTemplate("maison", WORKFLOW_RENO); closeModal(); render();
  r["aide · une rénovation : pas d'aide, pas de « Premiers pas » au menu Aide"] = !aide() && (ouvrirMenu("aide"), !document.getElementById("aidePfBtn").getClientRects().length); fermerMenus(false);
  loadTemplate("maison", WORKFLOW_FINAL); closeModal(); render();
  const a = aide(), q = document.getElementById("aidePF").getBoundingClientRect(), b = bbox(L()), A0 = S(v(b.x0, b.y0)), A1 = S(v(b.x1, b.y1)), rc = cv.getBoundingClientRect();
  r["aide · le même plan type en Plan final : l'aide est là (première fois) — D70 : repliée en pastille, le plan a déjà ses murs"] = !!a && a.etat === "pli" && /Premiers pas/.test(a.pill || "");
  r["aide (D70) · sur un plan type cadré, la pastille ne couvre aucun mur"] = q.top >= rc.top + A1.y || q.right <= rc.left + A0.x || q.left >= rc.left + A1.x || q.bottom <= rc.top + A0.y;
  return r; }, AIDE.toString()));
await regarder(p, "Pro · plan type en Plan final, l'aide repliée");
});
await parcours("D69, l'aide : gratuit, après la carte du plan vide", async () => {
p = await onglet({ pro: false });
t["aide · gratuit, arrivée : la carte du plan vide seule (même titre : jamais les deux)"] = await p.evaluate(() => !document.getElementById("emptyStage").hidden && document.getElementById("aidePF").hidden);
await cliquer(p, "#emptyStage button", "Tracer les murs");
t["aide · gratuit, « Tracer les murs » (clic) : la carte du plan vide part, l'aide arrive"] = await p.evaluate((A) => { const a = (0, eval)("(" + A + ")")(); return !!a && !a.carteVide && a.dedans; }, AIDE.toString());
await regarder(p, "gratuit · l'aide après Tracer les murs");
});

/* ═════════ 16. D69 · Aux largeurs : rien ne déborde, l'aide et le récapitulatif tiennent ═════════ */
for (const [L0, H0, pro] of [[1440, 900, true], [1440, 900, false], [1280, 800, true], [1280, 800, false], [1024, 768, true], [1024, 768, false], [768, 1024, true], [768, 1024, false], [640, 900, false]]) {
  const tag = `${L0}×${H0} ${pro ? "Pro" : "gratuit"}`;
  await parcours(tag, async () => {
  p = await onglet({ largeur: L0, hauteur: H0, pro, graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait" } });
  await p.evaluate(scenePF); await p.evaluate(() => { closeModal(); sel = null; render(); });
  const r = await p.evaluate((A, tag, L0, pro) => { const aide = (0, eval)("(" + A + ")")(), o = {}, T = document.querySelector(".top"), Tl = document.getElementById("tools"), c = document.querySelector("#pfoot .recappf"), vis = (el) => !!el && el.getClientRects().length > 0;
    o[`${tag} · la barre du haut ne déborde pas`] = T.scrollWidth <= T.clientWidth + 1;
    o[`${tag} · la colonne d'outils tient sans défiler`] = Tl.scrollHeight <= Tl.clientHeight + 1;
    o[`${tag} · l'aide est dans le plan, sous la tête, à droite des outils, au-dessus de la barre d'état`] = !!aide && aide.dedans;
    if (L0 > 900 || vis(document.getElementById("panel"))) { const q = c && c.getBoundingClientRect(); o[`${tag} · le récapitulatif du pied se voit en entier`] = vis(c) && q.bottom <= innerHeight + 0.5 && q.right <= innerWidth + 0.5; }
    else if (L0 >= 768) o[`${tag} · panneau replié : la surface habitable dans la barre d'état`] = vis(document.getElementById("surfBadge")) && /habitables/.test(document.getElementById("surfBadge").textContent);
    /* à la tablette, les niveaux montent dans la barre du haut s'ils y tiennent, sinon la bande reste (mesuré) */
    if (L0 <= 900) { const haut = document.getElementById("ctxTop").contains(document.getElementById("levels")), bande = vis(document.getElementById("pbande"));
      o[`${tag} · les niveaux : dans la barre du haut (sans bande), ou dans la bande — jamais les deux, jamais de débordement`] = haut !== bande && T.scrollWidth <= T.clientWidth + 1;
      if (pro && L0 === 768) o[`${tag} · les niveaux tiennent dans la barre du haut : la bande disparaît (36 px de plan)`] = haut && !bande;
      if (L0 === 640) o[`${tag} · la barre est pleine : les niveaux restent dans la bande`] = bande && !haut; }
    return o; }, AIDE.toString(), tag, L0, pro);
  Object.assign(t, r);
  await regarder(p, tag + " · plan");
  });
}
await parcours("390×844 gratuit, la consultation", async () => {
p = await onglet({ largeur: 390, hauteur: 844, pro: false });
await p.evaluate(scenePF); await p.evaluate(() => { closeModal(); sel = null; render(); });
Object.assign(t, await p.evaluate(() => { const vis = (el) => !!el && el.getClientRects().length > 0;
  const r = { "téléphone · ni aide, ni barre d'options, ni annuler / rétablir (on consulte)": !vis(document.getElementById("aidePF")) && !vis(document.getElementById("optbar")) && !vis(document.getElementById("undoBtn")) && !vis(document.getElementById("redoBtn")) && /Consultation/.test(document.getElementById("phoneBanner").innerText) };
  toggleSheet(true); renderPanel(); return r; }));
await wait(500);
t["téléphone · le tiroir ouvert : le récapitulatif (surface habitable) en entier"] = await p.evaluate(() => { const c = document.querySelector("#pfoot .recappf"), q = c && c.getBoundingClientRect(); return !!c && c.getClientRects().length > 0 && q.bottom <= innerHeight + 0.5 && q.left >= 0 && q.right <= innerWidth + 0.5 && /Surface habitable/.test(c.innerText); });
t["téléphone · le tiroir (D70) : la carte « Plan ouvert » dit le type du plan"] = await p.evaluate(() => document.querySelector("#pbody .mplan .typeplan.pf")?.textContent === "Plan final");
await regarder(p, "téléphone · tiroir, le récapitulatif");
});

/* ═════════ 17. D70 · Les corrections du jury ═════════ */
/* Pro, première visite : le choix s'ouvre sur une feuille blanche calme ; le fermer sans choisir garde un Plan final vide */
await parcours("D70, Pro : l'accueil sur une feuille blanche, fermé sans choisir", async () => {
p = await onglet({ graine: { "avyora-plan-tuto": "fait" } });
Object.assign(t, await p.evaluate(() => { const vis = (s) => [...document.querySelectorAll(s)].some((el) => el.getClientRects().length > 0);
  return { "Pro · accueil (D70) : derrière le choix, une feuille blanche calme — un Plan final vide, ni exemple, ni vues, ni budget": modaleOuverte()?.id === "m-welcome" && estPlanFinal() && planVide() && !estExemple() && !vis("#modes button") && !vis("#pfoot .budget") && !vis("#budgetPlie") && /Exporter le plan/.test(document.getElementById("estBtnTop").textContent) }; }));
await cliquer(p, "#m-welcome .mx");
Object.assign(t, await p.evaluate(() => { const e = document.getElementById("emptyStage");
  return { "Pro · accueil fermé par la croix au premier pas (D70) : un Plan final vide, sa carte « Dessine ton plan final », rien de rangé": !modaleOuverte() && estPlanFinal() && planVide() && !e.hidden && /Dessine ton plan final/.test(e.innerText) && Object.keys(loadPlans()).length === 0 && localStorage.getItem("avyora-plan-welcome") === "1" }; }));
await regarder(p, "Pro · accueil fermé sans choisir");
await p.reload({ waitUntil: "networkidle0" }); await wait(300);
t["Pro · … au rechargement (D70) : ni accueil, toujours le Plan final vide"] = await p.evaluate(() => !modaleOuverte() && estPlanFinal() && planVide());
});
await parcours("D70, Pro : l'accueil fermé sur une étape", async () => {
p = await onglet({ graine: { "avyora-plan-tuto": "fait" } });
await cliquer(p, "#m-welcome .wcard", "Plan final"); await p.keyboard.press("Escape"); await wait(200);
t["Pro · accueil › Plan final, Échap (D70) : un Plan final vide"] = await p.evaluate(() => !modaleOuverte() && estPlanFinal() && planVide());
await p.evaluate(() => { localStorage.removeItem("avyora-plan-welcome"); openModal("welcome"); });
await cliquer(p, "#m-welcome .wcard", "Projet rénovation"); await cliquer(p, "#m-welcome .mx"); await wait(150);
t["Pro · accueil › Projet rénovation, la croix (D50, D70) : son choix recommandé, l'exemple, en vue Travaux"] = await p.evaluate(() => !modaleOuverte() && estExemple() && !estPlanFinal() && mode() === "projet");
});
/* les deux cartes du type : titres de 16 px, un survol qui se voit, un seul cadre au focus */
await parcours("D70, les deux cartes du type", async () => {
p = await onglet({ graine: { "avyora-plan-tuto": "fait" } });
await p.keyboard.press("Tab"); await p.keyboard.down("Shift"); await p.keyboard.press("Tab"); await p.keyboard.up("Shift"); await wait(100);
const st = await p.evaluate(() => { const C = [...document.querySelectorAll("#m-welcome .wcard.wtype")], cs = getComputedStyle(C[0]); return { n: C.length, focus: C[0].matches(":focus-visible"), titre: getComputedStyle(C[0].querySelector("b")).fontSize, off: cs.outlineOffset, ow: cs.outlineWidth }; });
const c = await centre(p, "#m-welcome .wcard", "Projet rénovation"); await p.mouse.move(c.x, c.y); await wait(300);
const survol = await p.evaluate(() => { const C = [...document.querySelectorAll("#m-welcome .wcard.wtype")][1], i = document.createElement("i"); document.body.appendChild(i); i.style.color = "var(--brand-b)"; const bb = getComputedStyle(i).color; i.style.color = "var(--brand-l)"; const bl = getComputedStyle(i).color; i.remove(); const cs = getComputedStyle(C); return cs.borderTopColor === bb && cs.backgroundColor === bl; });
t["choix du type (D70) : deux cartes aux titres de 16 px ; au focus clavier, un seul cadre de 2 px (posé sur la bordure)"] = st.n === 2 && st.titre === "16px" && st.focus && st.off === "-1px" && st.ow === "2px";
t["choix du type (D70) : le survol se voit (bordure et fond de la marque)"] = survol;
});
/* une Séparation posée à la souris sur le bout d'une cloison qui bute contre un refend (le moteur commun) */
await parcours("D70, la cuisine ouverte contre le bout d'une cloison", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait", "avyora-plan-aide-pf": "1" } });
for (const wf of ["final_plan", "renovation"]) {
  await p.evaluate((wf) => { closeModal(); state = blankState(); state.workflow = wf; afterChange(); view.zoom = 45; view.ox = cv.clientWidth / 2; view.oy = cv.clientHeight / 2 + 20; draw(); setTool("mur"); setWallType("auto"); }, wf);
  await piece(p, -6, -5, 6, 5); await p.keyboard.press("Escape"); await wait(60);
  const trait = async (a, c, type) => { await p.evaluate((ty) => { setTool("mur"); setWallType(ty); }, type); await clicPlan(p, ...a); await clicPlan(p, ...c); await p.keyboard.press("Escape"); await wait(60); };
  await trait([1, -5], [1, 5], "cloison"); await trait([1, -1.5], [6, -1.5], "cloison"); await trait([1, 2], [6, 2], "cloison");
  const avant = await p.evaluate(() => ({ n: (facesCache[L().id] || []).filter((f) => f.room).length, bout: L().walls.some((w) => w.type === "cloison" && Math.abs(w.a.y + 1.5) < 1e-6 && Math.abs(w.a.x - 1) > 0.01 && Math.abs(w.a.x - 1) < 0.1) }));
  await trait([-6, -1.5], [1, -1.5], "virtuel");
  const apres = await p.evaluate(() => ({ n: (facesCache[L().id] || []).filter((f) => f.room).length, sep: L().walls.filter((w) => w.type === "virtuel").length }));
  if (LISTER) console.log("   séparation", wf, JSON.stringify(avant), JSON.stringify(apres));
  t[`Séparation (D70, ${wf === "final_plan" ? "Plan final" : "rénovation"}) · posée à la souris sur le bout d'une cloison (accrochée à la face du refend) : une pièce de plus`] = avant.bout && apres.sep === 1 && apres.n === avant.n + 1;
}
});
/* les mots du logement voulu, et l'image exportée */
await parcours("D70, les mots du logement voulu", async () => {
p = await onglet({ graine: { "avyora-plan-welcome": "1", "avyora-plan-tuto": "fait" } });
await p.evaluate(scenePF);
Object.assign(t, await p.evaluate(() => { const r = {}; ouvrirAide("gloss"); aideOnglet("gloss"); const g = document.getElementById("aideGloss").innerText; closeModal();
  r["glossaire d'un Plan final (D70) : ni « Tronçon » (démolir), un faux plafond sans « l'ancien »"] = !/Tronçon/.test(g) && /Faux plafond/.test(g) && !/ancien/i.test(g);
  setTool("doublage"); const d = document.getElementById("pbody").innerText; setTool("select");
  r["Doublage d'un Plan final (D70) : ni MaPrimeRénov' ni CEE (une aide à la rénovation), l'isolation reste dite (R)"] = !/MaPrimeRénov|CEE/.test(d) && /m²·K\/W/.test(d);
  const tb = [...document.querySelectorAll("#tools .tb")].find((x) => /setTool\('texte'\)/.test(x.getAttribute("onclick")));
  r["bulles d'un Plan final (D70) : la Note sans « artisan », l'Affichage sans « toiture »"] = !/artisan/.test(tb.dataset.tip) && /remarque, idée/.test(tb.dataset.tip) && !/toiture/.test(document.getElementById("layersBtn").dataset.tip) && !/toiture/.test(document.getElementById("layersBtn").getAttribute("aria-description") || "");
  openTemplates(WORKFLOW_FINAL); const s1 = document.querySelector("#m-templates .sub").textContent; closeModal(); openTemplates(WORKFLOW_RENO); const s2 = document.querySelector("#m-templates .sub").textContent; closeModal();
  r["plans types (D70) : en Plan final « la base la plus proche du logement que tu veux » ; pour une rénovation, la phrase d'avant, mot pour mot"] = /logement que tu veux/.test(s1) && s2 === "Choisis le logement qui ressemble au tien : tu ajustes ensuite les cotes en glissant les murs, tu déplaces les portes, tu renommes les pièces. Bien plus rapide que de partir de zéro.";
  return r; }));
await p.evaluate(() => { window.__ent = []; const f0 = CanvasRenderingContext2D.prototype.fillText; window.__f0 = f0; CanvasRenderingContext2D.prototype.fillText = function (tx, ...a) { window.__ent.push(String(tx)); return f0.call(this, tx, ...a); };
  state = blankState(); state.workflow = WORKFLOW_FINAL; const lv = L(); [[0, 0, 5, 0], [5, 0, 5, 4], [5, 4, 0, 4], [0, 4, 0, 0]].forEach(([a, b2, c, d]) => lv.walls.push({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" })); afterChange();
  try { exportPlan(); } catch (e) {} });
await wait(700);
const ent = await p.evaluate(() => { CanvasRenderingContext2D.prototype.fillText = window.__f0; closeModal(); return window.__ent.filter((x) => /habitables/.test(x)); });
t["image exportée (D70) : « 1 pièce » au singulier dans son en-tête"] = ent.length > 0 && ent.every((x) => /· 1 pièce ·/.test(x) && !/1 pièces/.test(x));
});
/* la rénovation qu'un gratuit a déjà : ses phrases d'avant (D66), la visite qui dit le type du plan qui suit */
await parcours("D70, la rénovation d'un gratuit", async () => {
p = await onglet({ pro: false });
Object.assign(t, await p.evaluate(() => { const r = {}; closeModal(); loadTemplate("maison", WORKFLOW_RENO); closeModal(); setMode("projet"); closeModal();
  openPlansModal(); const m = document.getElementById("plansList").innerText; closeModal();
  r["gratuit, sa rénovation · Mes plans : « Dessiner ton logement et tes travaux reste gratuit » (la phrase d'avant)"] = /Dessiner ton logement et tes travaux reste gratuit/.test(m) && !/plan final/i.test(m);
  return r; }));
await p.evaluate(() => { lancerVisite(); }); await wait(300); await p.evaluate(() => etapeVisite(visite.E.length - 1)); await wait(300);
t["gratuit, la visite d'une rénovation (D70) : sa dernière bulle dit « Commencer mon plan final » (un plan neuf de gratuit, D68)"] = await p.evaluate(() => /Commencer mon plan final/.test(document.querySelector("#visite .vsuiv")?.textContent || ""));
await p.evaluate(() => fermerVisite("passe"));
});
await parcours("D70, téléphone, gratuit : une rénovation vide", async () => {
p = await onglet({ largeur: 390, hauteur: 844, pro: false });
Object.assign(t, await p.evaluate(() => { closeModal(); const vis = (el) => !!el && el.getClientRects().length > 0, e = document.getElementById("emptyStage"), bt = () => [...e.querySelectorAll("button")].filter(vis).map((x) => x.textContent).join("|");
  const pf = bt(); state = blankState(); state.workflow = WORKFLOW_RENO; sel = null; afterChange(); fitView(); render(); const reno = bt();
  return { "téléphone, gratuit (D70) : la carte d'un Plan final vide n'offre pas l'exemple ; celle d'une rénovation vide le garde (D66)": pf === "Mes plans" && reno === "Voir l'exemple|Mes plans" }; }));
});

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
