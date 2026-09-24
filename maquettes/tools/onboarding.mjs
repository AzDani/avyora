/**
 * Onboarding et rétention (D42).
 *
 * Le premier contact décide du reste. Le contrôle fait le parcours d'un nouveau venu, au clavier,
 * à la souris et au doigt, et vérifie :
 *   - l'accueil : court, une croix, trois cartes illustrées, « Découvrir avec l'exemple » recommandé
 *     et focalisé ; au téléphone, une version « mode chantier » (voir l'exemple, mes plans, continuer
 *     sur ordinateur) qui ne promet jamais de dessiner, sans défilement ;
 *   - la visite guidée : 5 bulles ancrées aux vrais éléments (4 au téléphone), un halo sur la cible,
 *     la bulle dans l'écran et JAMAIS sur sa cible (1 440, 1 280, 1 024 px, et après un
 *     redimensionnement en cours de route), points de progression, Suivant / Retour / Passer,
 *     Échap, ← →, Tab qui reste dans la bulle, rien qui atteigne le plan (clic, lettre, Suppr) ;
 *     pas de fenêtre « vue Travaux » par-dessus ; mémorisée (fait / passe), ne revient pas au
 *     rechargement, relançable depuis Aide (qui rend la vue et le focus d'avant) ;
 *   - « Ton projet à X % » : des étapes lues sur l'état réel, la prochaine étape qui mène au bon
 *     outil ou au bon objet, le pourcentage sur la carte « Mes plans » ;
 *   - l'exemple T2, vitrine : zéro alerte dans les trois vues, appartement, un cas de chaque état
 *     (démolition, création, remplacement, doublage partiel), faïence comptée une fois, aucun prix
 *     inventé, ouvert en vue Travaux sans pastille d'écart ;
 *   - le plan vide : une carte avec des actions (et sa version téléphone) ;
 *   - la pastille orange d'une pièce s'explique au survol et dans sa fiche ; le sol actuel se règle
 *     en vue Travaux ; le doublage confirme sa pose et propose d'aller jusqu'à l'angle ; le bandeau
 *     du téléphone fermé ne revient pas ; la fenêtre « vue Travaux » ne s'ouvre pas au téléphone.
 *
 *   node maquettes/tools/onboarding.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/onboarding.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
/* `garder` : la mémoire du navigateur n'est vidée qu'au premier chargement (pour tester le rechargement). */
async function onglet({ larg = 1440, haut = 900, mobile = false, welcomeVu = false, garder = false } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  await p.evaluateOnNewDocument((welcomeVu, garder) => {
    try {
      if (garder && sessionStorage.getItem("w6-deja")) return;
      localStorage.clear(); sessionStorage.setItem("w6-deja", "1");
      if (welcomeVu) localStorage.setItem("avyora-plan-welcome", "1");
    } catch {}
  }, welcomeVu, garder);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(350);
  return p;
}
const EMOJI = /\p{Extended_Pictographic}/u;
/* état de la bulle : dans l'écran, hors de sa cible, halo autour de la cible */
const ETAT_BULLE = () => {
  const root = document.getElementById("visite"), bl = root.querySelector(".vbulle").getBoundingClientRect();
  const e = visite.E[visite.i], cible = e.cible && document.querySelector(e.cible), cr = cible && cible.getClientRects().length ? cible.getBoundingClientRect() : null;
  const h = root.querySelector(".vhalo"), hr = h.style.display === "none" ? null : h.getBoundingClientRect();
  const sur = (a, c) => a.left < c.right - 0.5 && a.right > c.left + 0.5 && a.top < c.bottom - 0.5 && a.bottom > c.top + 0.5;
  const vis = (c) => ({ left: Math.max(0, c.left), top: Math.max(0, c.top), right: Math.min(innerWidth, c.right), bottom: Math.min(innerHeight, c.bottom) });
  return {
    i: visite.i, n: visite.E.length, titre: document.getElementById("vTitre").textContent,
    dansEcran: bl.left >= 0 && bl.top >= 0 && bl.right <= innerWidth + 0.5 && bl.bottom <= innerHeight + 0.5,
    horsCible: !cr || !sur(bl, vis(cr)),
    halo: !cr ? !hr : !!hr && hr.left <= Math.max(0, cr.left) + 4 && hr.top <= Math.max(0, cr.top) + 4 && hr.right >= Math.min(innerWidth, cr.right) - 4 && hr.bottom >= Math.min(innerHeight, cr.bottom) - 4,
    passer: !!root.querySelector(".vpasser") && root.querySelector(".vpasser").getClientRects().length > 0,
    points: root.querySelectorAll(".vpts i").length, pointOn: [...root.querySelectorAll(".vpts i")].findIndex((x) => x.classList.contains("on")),
    focus: !!document.activeElement && root.querySelector(".vbulle").contains(document.activeElement),
    estimerLibre: !sur(bl, document.getElementById("estBtnTop").getBoundingClientRect()) || e.cible === "#estBtnTop",
    emoji: /\p{Extended_Pictographic}/u.test(root.innerText), modale: !!modaleOuverte(),
  };
};

/* ═════════ 1. Accueil, ordinateur ═════════ */
let p = await onglet();
Object.assign(t, await p.evaluate((EMO) => {
  const r = {}, o = document.getElementById("m-welcome"), m = o.querySelector(".modal"), ae = document.activeElement;
  const vis = (el) => !!el && el.getClientRects().length > 0;
  const cartes = [...m.querySelectorAll(".wcard")].filter(vis);
  r["accueil · ouvert à la première visite"] = o.classList.contains("show");
  r["accueil · une croix visible"] = vis(m.querySelector(".mx"));
  r["accueil · trois cartes illustrées"] = cartes.length === 3 && cartes.every((c) => c.querySelector(".wv svg"));
  r["accueil · « Découvrir avec l'exemple » recommandé (badge) et focalisé"] = cartes[0].classList.contains("rec") && /Recommandé/.test(cartes[0].textContent) && cartes[0].contains(ae) && /exemple/i.test(ae.textContent);
  r["accueil · les autres cartes : plan type, feuille blanche"] = /plan type/i.test(cartes[1].textContent) && /Feuille blanche/.test(cartes[2].textContent);
  const mots = m.innerText.replace(/\s+/g, " ").trim().split(" ").length;
  r[`accueil · court (${mots} mots ≤ 80), sans touches clavier ni étapes`] = mots <= 80 && !m.querySelector("kbd,.steps,details");
  r["accueil · tient sans défiler"] = m.scrollHeight <= m.clientHeight + 1;
  r["accueil · aucun emoji"] = !new RegExp(EMO, "u").test(m.innerText);
  return r;
}, EMOJI.source));

/* ═════════ 2. La visite guidée, ordinateur ═════════ */
await p.keyboard.press("Enter"); await wait(350);
Object.assign(t, await p.evaluate(() => ({
  "visite · démarre après « Découvrir avec l'exemple » (1re visite)": !!visite && !document.getElementById("visite").hidden,
  "visite · l'exemple s'ouvre en vue Travaux": /Exemple/.test(state.name) && mode() === "projet",
  "visite · pas de fenêtre « vue Travaux » par-dessus": !modaleOuverte(),
  "visite · pas de pastille d'écart en ouvrant l'exemple": !document.getElementById("budgetDelta").classList.contains("show"),
  "visite · 5 bulles, ancrées aux outils, aux vues, au panneau, au budget, à Estimer": visite.E.length === 5 && visite.E.map((e) => e.cible).join() === "#tools,#modes,#panel,#pfoot,#estBtnTop",
})));
/* rien n'atteint le plan pendant la visite : un clic sur le plan, une lettre d'outil, Suppr */
{
  const avant = await p.evaluate(() => ({ outil: tool, murs: L().walls.length, sel: JSON.stringify(sel) }));
  const c = await p.evaluate(() => { const r = cv.getBoundingClientRect(); return { x: r.left + r.width * 0.45, y: r.top + r.height * 0.5 }; });
  await p.mouse.click(c.x, c.y); await wait(60);
  for (const k of ["m", "d", "Delete"]) await p.keyboard.press(k);
  await wait(60);
  t["visite · un clic sur le plan, une lettre, Suppr : rien ne bouge"] = await p.evaluate((a) => tool === a.outil && L().walls.length === a.murs && JSON.stringify(sel) === a.sel && !!visite && visite.i === 0, avant);
}
/* Tab reste dans la bulle */
for (let i = 0; i < 6; i++) await p.keyboard.press("Tab");
t["visite · Tab reste dans la bulle"] = await p.evaluate(() => document.querySelector("#visite .vbulle").contains(document.activeElement));
await p.evaluate(() => document.querySelector("#visite .vsuiv").focus());
/* chaque étape, aux trois largeurs */
const etapes = [];
for (let i = 0; i < 5; i++) {
  await wait(380);
  etapes.push(await p.evaluate(ETAT_BULLE));
  if (i === 2) t["visite · étape 3 : une pièce de l'exemple est sélectionnée, sa fiche est ouverte"] = await p.evaluate(() => sel && sel.kind === "room" && /Chambre/.test(document.querySelector("#pbody .ptitle")?.textContent || ""));
  if (i === 1) t["visite · étape 2 : on est en vue Travaux, la fenêtre de la vue ne s'est pas ouverte"] = await p.evaluate(() => mode() === "projet" && !modaleOuverte());
  if (i < 4) await p.keyboard.press("Enter");
}
etapes.forEach((e, i) => {
  t[`visite 1440 · étape ${i + 1} « ${e.titre} » : bulle dans l'écran, hors de sa cible, halo, Passer, points, focus`] =
    e.dansEcran && e.horsCible && e.halo && e.passer && e.points === 5 && e.pointOn === i && e.focus && !e.emoji && !e.modale;
});
await p.keyboard.press("ArrowLeft"); await wait(250);
t["visite · ← revient à l'étape précédente"] = await p.evaluate(() => visite && visite.i === 3);
await p.keyboard.press("ArrowRight"); await wait(250);
t["visite · → avance"] = await p.evaluate(() => visite && visite.i === 4);
await p.keyboard.press("Enter"); await wait(250);
Object.assign(t, await p.evaluate(() => ({
  "visite · « C'est parti » la termine, mémorisée « fait »": !visite && document.getElementById("visite").hidden && localStorage.getItem("avyora-plan-tuto") === "fait",
  "visite · à la fin, plus rien de sélectionné : la vue d'ensemble et sa prochaine étape": !sel && !!document.querySelector("#pbody .pp .ppnext"),
  "visite · la vue Travaux reste (l'exemple s'explique par ses couleurs)": mode() === "projet",
})));
await p.close();

/* aux autres largeurs, et au redimensionnement en cours de route */
for (const [larg, haut] of [[1280, 800], [1024, 768]]) {
  p = await onglet({ larg, haut });
  await p.evaluate(() => closeWelcome("sample", true)); await wait(300);
  const E = [];
  for (let i = 0; i < 5; i++) { await wait(380); E.push(await p.evaluate(ETAT_BULLE)); if (i < 4) await p.evaluate(() => etapeVisite(visite.i + 1)); }
  E.forEach((e, i) => { t[`visite ${larg} · étape ${i + 1} : dans l'écran, hors de sa cible, halo`] = e.dansEcran && e.horsCible && e.halo; });
  if (larg === 1280) {
    await p.evaluate(() => etapeVisite(2)); await wait(350);
    await p.setViewport({ width: 1100, height: 720 }); await wait(450);
    const e = await p.evaluate(ETAT_BULLE);
    t["visite · redimensionnée en cours de route : la bulle se recale, hors de sa cible"] = e.dansEcran && e.horsCible && e.halo && e.i === 2;
  }
  await p.keyboard.press("Escape"); await wait(150);
  t[`visite ${larg} · Échap la ferme, mémorisée « passe »`] = await p.evaluate(() => !visite && localStorage.getItem("avyora-plan-tuto") === "passe");
  await p.close();
}

/* ═════════ 3. Mémorisée, relançable depuis Aide ═════════ */
p = await onglet({ garder: true });
await p.evaluate(() => closeWelcome("sample", true)); await wait(300);
await p.evaluate(() => document.querySelector("#visite .vpasser").click()); await wait(150);
t["« Passer » ferme la visite, mémorisée « passe »"] = await p.evaluate(() => !visite && localStorage.getItem("avyora-plan-tuto") === "passe");
await p.reload({ waitUntil: "networkidle0" }); await wait(350);
Object.assign(t, await p.evaluate(() => {
  const r = {};
  r["rechargement · ni accueil, ni visite"] = !modaleOuverte() && !visite;
  closeWelcome("sample", true);
  r["rechargement · « Découvrir avec l'exemple » ne relance pas une visite déjà vue"] = !visite;
  return r;
}));
/* relance depuis Aide, sur son propre plan en vue Avant travaux */
await p.evaluate(() => {
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
  W([0, 0], [5, 0]); W([5, 0], [5, 4]); W([5, 4], [0, 4]); W([0, 4], [0, 0]); sel = null; afterChange(); fitView();
});
await p.click("#aideBtn"); await wait(120);
await p.click("#visiteBtn"); await wait(400);
Object.assign(t, await p.evaluate(() => ({
  "Aide ▸ Visite guidée : la visite repart, même déjà vue": !!visite && visite.i === 0 && document.getElementById("visiteLbl").textContent === "Visite guidée",
  "Aide ▸ Visite guidée : sur un plan à soi, pas de « T2 » dans les bulles": !/T2/.test(document.getElementById("vTexte").textContent),
})));
await p.evaluate(() => etapeVisite(1)); await wait(250);
t["relance · l'étape des vues passe en Travaux"] = await p.evaluate(() => mode() === "projet");
await p.keyboard.press("Escape"); await wait(150);
t["relance · fermée : la vue d'avant revient, le focus retourne au bouton Aide"] = await p.evaluate(() => !visite && mode() === "existant" && document.activeElement?.id === "aideBtn");
/* la fenêtre d'Aide propose aussi de revoir la visite */
await p.evaluate(() => ouvrirAide("keys")); await wait(100);
t["Aide (fenêtre) · « Revoir la visite guidée »"] = await p.evaluate(() => [...document.querySelectorAll("#m-keys button")].some((x) => /Revoir la visite guidée/.test(x.textContent) && /lancerVisite/.test(x.getAttribute("onclick"))));
await p.evaluate(() => closeModal());
await p.close();

/* ═════════ 4. Téléphone : accueil « mode chantier », visite en 4 bulles ═════════ */
p = await onglet({ larg: 390, haut: 844, mobile: true });
Object.assign(t, await p.evaluate(() => {
  const r = {}, m = document.querySelector("#m-welcome .modal"), vis = (el) => !!el && el.getClientRects().length > 0;
  const cartes = [...m.querySelectorAll(".wcard")].filter(vis), txt = m.innerText;
  r["téléphone · accueil : voir l'exemple, mes plans, continuer sur ordinateur"] = cartes.length === 3 && /Voir l'exemple/.test(cartes[0].textContent) && /mes plans/i.test(cartes[1].textContent) && /ordinateur/i.test(cartes[2].textContent);
  r["téléphone · accueil : aucune promesse de dessin (ni feuille blanche, ni plan type, ni raccourcis)"] = !/Feuille blanche|plan type|raccourci/i.test(txt) && /ordinateur ou tablette/.test(txt);
  r["téléphone · accueil : l'exemple recommandé et focalisé"] = cartes[0].classList.contains("rec") && cartes[0].contains(document.activeElement);
  r["téléphone · accueil : tient sans défiler"] = m.scrollHeight <= m.clientHeight + 1 && m.getBoundingClientRect().bottom <= innerHeight;
  return r;
}));
await p.evaluate(() => document.querySelector("#m-welcome .wcards.wphone .wcard.rec").click()); await wait(350);
{
  const E = [];
  const n = await p.evaluate(() => visite ? visite.E.length : 0);
  t["téléphone · visite en 4 bulles (plan, vues, tiroir, budget)"] = n === 4 && await p.evaluate(() => visite.E.map((e) => e.cible || "-").join() === "-,#modes,#sheetHandle,#estBtnTop");
  for (let i = 0; i < n; i++) { await wait(380); E.push(await p.evaluate(ETAT_BULLE)); if (i < n - 1) await p.evaluate(() => etapeVisite(visite.i + 1)); }
  E.forEach((e, i) => { t[`téléphone · étape ${i + 1} : dans l'écran, hors de sa cible, « Estimer ce plan » jamais recouvert`] = e.dansEcran && e.horsCible && e.estimerLibre && e.passer; });
  await p.evaluate(() => fermerVisite("fait")); await wait(150);
  t["téléphone · après la visite, le bandeau « mode chantier » s'efface (il disait la même chose)"] = await p.evaluate(() => document.getElementById("phoneBanner").hidden && localStorage.getItem("avyora-plan-phonebanner") === "1");
}
/* la fenêtre « vue Travaux » ne s'ouvre pas au téléphone */
await p.evaluate(() => { localStorage.removeItem("avyora-plan-projet-tip"); setMode("existant"); setMode("projet"); }); await wait(100);
t["téléphone · passer en vue Travaux n'ouvre pas la fenêtre explicative (message court)"] = await p.evaluate(() => !modaleOuverte() && mode() === "projet");
/* plan vide au téléphone */
await p.evaluate(() => { state = blankState(); sel = null; afterChange(); fitView(); }); await wait(150);
Object.assign(t, await p.evaluate(() => {
  const c = document.getElementById("emptyStage"), vis = (el) => !!el && el.getClientRects().length > 0, txt = c.innerText;
  return {
    "téléphone · plan vide : une carte propre au mode chantier (exemple, Mes plans)": !c.hidden && /ordinateur ou tablette/.test(txt) && [...c.querySelectorAll("button")].filter(vis).map((x) => x.textContent).join("|") === "Voir l'exemple|Mes plans",
    "téléphone · plan vide : aucune invitation à tracer": !/Tracer les murs|Poser une pièce/.test(txt),
  };
}));
await p.close();
/* bandeau fermé une fois : il ne revient pas */
p = await onglet({ larg: 390, haut: 844, mobile: true, welcomeVu: true, garder: true });
t["téléphone · bandeau visible au départ, avec un rôle de note"] = await p.evaluate(() => { const b = document.getElementById("phoneBanner"); return !b.hidden && b.getClientRects().length > 0 && b.getAttribute("role") === "note"; });
await p.evaluate(() => document.querySelector("#phoneBanner button").click());
await p.reload({ waitUntil: "networkidle0" }); await wait(300);
t["téléphone · bandeau fermé : il ne revient pas au rechargement"] = await p.evaluate(() => document.getElementById("phoneBanner").hidden);
await p.close();

/* ═════════ 5. L'exemple T2, vitrine ═════════ */
p = await onglet({ welcomeVu: true });
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample();
  const vues = {};
  for (const m of ["existant", "projet", "final"]) { state.mode = m; afterChange(); vues[m] = planChecks(L()).map((c) => c.msg.replace(/<[^>]+>/g, "")); }
  r[`exemple · zéro alerte dans les trois vues${Object.values(vues).flat().length ? " (" + Object.values(vues).flat().join(" | ") + ")" : ""}`] = Object.values(vues).every((x) => x.length === 0);
  state.mode = "projet"; afterChange();
  const lv = L();
  r["exemple · un appartement (pas de toiture demandée)"] = chantier().bien === "appartement";
  r["exemple · une démolition (cloison)"] = lv.walls.some((w) => w.st === "demolir");
  r["exemple · une création (fenêtre à créer)"] = lv.openings.some((o) => o.st === "creer");
  r["exemple · un remplacement (fenêtre à remplacer)"] = lv.openings.some((o) => o.st === "remplacer");
  r["exemple · un doublage partiel (une partie du mur seulement), compté"] = lv.walls.some((w) => isoList(w).some((io) => io.st === "creer" && isoT1(io) - isoT0(io) < 0.99)) && chantierTasks().some((x) => x.lot === "Isolation" && /Doubler/.test(x.label));
  r["exemple · les WC s'ouvrent sur l'entrée, pas sur le séjour"] = (() => { const f = facesFor(lv, "existant").find((g) => g.room.type === "wc"); return !!f && openingsOfFace(lv, f, "existant").filter((o) => OPENINGS[o.type].cat === "porte").every((o) => facesFor(lv, "existant").filter((g) => g !== f && g.edges.some((e) => e && e.wall === o.wallId)).every((g) => !["sejour", "cuisine"].includes(g.room.type))); })();
  const sdb = facesFor(lv, "projet").find((g) => g.room.type === "sdb"), fa = faienceDe(lv, sdb);
  const pf = allProducts().filter((x) => /Faïence/.test(x.nom));
  r["exemple · la faïence repérée suit la faïence décidée (une seule quantité), et n'est pas « Peinture / murs »"] = !!fa && pf.length === 1 && pf[0].poste === "Faïence" && Math.abs(pf[0].qty - fa.m2) < 0.01;
  r["exemple · une seule tâche de faïence"] = chantierTasks().filter((x) => x.lot === "Faïence").length === 1;
  r["exemple · aucun prix inventé, aucun lien d'enseigne"] = allProducts().every((x) => !x.url && !x.prix);
  const px = chantierPrix();
  r["exemple · un budget cohérent : la somme de ses tâches, identifiants uniques"] = px.total > 0 && Math.abs(px.total - px.taches.reduce((s, x) => s + (x.prix || 0), 0)) < 0.5 && new Set(px.taches.map((x) => x.id)).size === px.taches.length;
  r["exemple · chaque pièce a son sol actuel décrit"] = facesFor(lv, "existant").every((f) => f.room.floor && f.room.floor !== "À définir");
  /* les plans types disent ce qu'ils sont (novice15) : on ne redemande pas « maison ou appartement » à une maison */
  const bienDe = (id) => { loadTemplate(id); return chantier().bien; };
  r["plans types · « Maison » est une maison, le studio un appartement, le T3 ne présume rien"] = bienDe("maison") === "maison" && bienDe("studio") === "appartement" && !bienDe("t3");
  return r;
}));
await p.close();

/* ═════════ 6. « Ton projet à X % » ═════════ */
p = await onglet({ welcomeVu: true });
Object.assign(t, await p.evaluate(() => {
  const r = {}, nx = () => etapesProjet().find((e) => !e.fait)?.k, P = () => document.getElementById("pbody");
  /* plan vide */
  state = blankState(); sel = null; setTool("select"); afterChange();
  r["projet · plan vide : 0 %, prochaine étape « dessiner »"] = pctProjet() === 0 && nx() === "pieces" && /Ton projet à\s*0 %/.test(P().querySelector(".pp").textContent);
  P().querySelector(".pp .ppnext").click();
  r["projet · « Dessine ta première pièce » mène à l'outil Murs"] = tool === "mur";
  setTool("select");
  /* une pièce, sans ouverture */
  const lv = L(); lv.height = 2.5; const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur" }; lv.walls.push(x); return x; };
  const w0 = W([0, 0], [5, 0]); W([5, 0], [5, 4]); W([5, 4], [0, 4]); W([0, 4], [0, 0]); afterChange();
  r["projet · une pièce : l'étape est faite, la suivante est « portes et fenêtres »"] = etapesProjet()[0].fait && nx() === "ouvertures";
  P().querySelector(".pp .ppnext").click();
  r["projet · « portes et fenêtres » mène à l'outil Ouvertures"] = tool === "ouverture";
  setTool("select");
  lv.openings.push({ id: uid(), wallId: w0.id, t: 0.5, type: "porte_entree", w: 0.9, h: 2.15, side: 1, hinge: 1 }); afterChange();
  r["projet · une porte : la suivante est « type de bien et code postal »"] = nx() === "chantier";
  sel = null; render(); P().querySelector(".pp .ppnext").click();
  const d = P().querySelector('details[data-k="chantier"]');
  r["projet · « maison ou appartement » ouvre la carte Le chantier, sur la question"] = !!d && d.open && d.contains(document.activeElement) && /Appartement/.test(document.activeElement.textContent);
  setChantier("bien", "appartement"); setChantier("cp", "69003");
  r["projet · type de bien + code postal : la suivante est « sol actuel »"] = nx() === "solActuel";
  sel = null; render(); P().querySelector(".pp .ppnext").click();
  return r;
}));
await wait(120);
Object.assign(t, await p.evaluate(() => {
  const r = {}, nx = () => etapesProjet().find((e) => !e.fait)?.k;
  r["projet · « sol actuel » : vue Avant travaux, la pièce sélectionnée, sa liste focalisée"] = mode() === "existant" && sel?.kind === "room" && document.activeElement?.getAttribute("aria-label") === "Sol actuel";
  sel && setRoomProp("floor", "Carrelage");
  r["projet · sol décrit : la suivante est « premier travail »"] = nx() === "travaux";
  localStorage.setItem("avyora-plan-projet-tip", "1");
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  r["projet · « premier travail » passe en vue Travaux"] = mode() === "projet";
  const f = facesFor(L(), "projet")[0]; f.room.peinture = "tout"; afterChange();
  r["projet · une décision : la suivante est « sols »"] = nx() === "sols";
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  return r;
}));
await wait(120);
Object.assign(t, await p.evaluate(() => {
  const r = {}, nx = () => etapesProjet().find((e) => !e.fait)?.k;
  r["projet · « sols » : la pièce sélectionnée en vue Travaux, la liste Revêtement focalisée"] = mode() === "projet" && sel?.kind === "room" && document.activeElement?.getAttribute("aria-label") === "Revêtement de sol";
  setRoomRevetement("__garde");
  r["projet · sol gardé = décision : la suivante est « estimation »"] = nx() === "estimer";
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  r["projet · « Ouvre ton estimation » ouvre Estimer ; 100 %"] = modaleOuverte()?.id === "m-estimate" && pctProjet() === 100;
  closeModal(); sel = null; render();
  r["projet · 100 % : la suite, c'est le Suivi"] = /Suivi/.test(document.querySelector("#pbody .pp .ppnext").textContent);
  /* la liste des étapes : chaque étape à faire est un bouton */
  state.chantier.cp = ""; render();
  const L2 = [...document.querySelectorAll("#pbody .pplist li")];
  r["projet · la liste : 7 étapes, celles à faire sont cliquables"] = L2.length === 7 && L2.filter((x) => x.querySelector("button")).length === etapesProjet().filter((e) => !e.fait).length;
  return r;
}));
/* l'exemple : son pourcentage, et ouvrir Estimer ne le « touche » pas */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample();
  const E = etapesProjet();
  r["projet · exemple : pièces, ouvertures, sol actuel, travaux faits ; code postal et sols à faire"] = ["pieces", "ouvertures", "solActuel", "travaux"].every((k) => E.find((e) => e.k === k).fait) && !E.find((e) => e.k === "chantier").fait && !E.find((e) => e.k === "sols").fait;
  showEstimate(); closeModal();
  r["projet · ouvrir Estimer : l'étape est faite, l'exemple reste « jamais touché »"] = etapesProjet().find((e) => e.k === "estimer").fait && planIntact();
  savePlanToLibrary(); openPlansModal();
  r["projet · « Mes plans » : le pourcentage sur la carte"] = document.querySelector("#plansList .plancard .gres").textContent.includes("projet à " + pctProjet() + " %");
  closeModal();
  return r;
}));
await p.close();
/* au téléphone, une étape de dessin n'est pas un bouton */
p = await onglet({ larg: 390, haut: 844, mobile: true, welcomeVu: true });
t["téléphone · « Dessine ta première pièce » : sur ordinateur ou tablette, pas un bouton"] = await p.evaluate(() => { state = blankState(); sel = null; afterChange(); const n = document.querySelector("#pbody .pp .ppnext"); return !!n && n.tagName !== "BUTTON" && /ordinateur ou tablette/.test(n.textContent); });
await p.close();

/* ═════════ 7. Plan vide, ordinateur ═════════ */
p = await onglet({ welcomeVu: true });
Object.assign(t, await p.evaluate(() => {
  const r = {}, c = document.getElementById("emptyStage"), vis = (el) => !!el && el.getClientRects().length > 0;
  r["plan vide · une carte « Dessine ton logement » avec trois actions"] = !c.hidden && /Dessine ton logement/.test(c.textContent) && [...c.querySelectorAll("button")].filter(vis).length === 3;
  document.querySelector("#emptyStage .ib.primary").click();
  r["plan vide · « Tracer les murs » : outil Murs, la carte s'efface"] = tool === "mur" && c.hidden && wallType === "mur";
  setTool("select");
  r["plan vide · retour à la sélection : la carte revient"] = !c.hidden;
  return r;
}));
await p.evaluate(() => document.querySelectorAll("#emptyStage .ib")[1].click()); await wait(120);
{
  const q = await p.evaluate(() => { const r = cv.getBoundingClientRect(); return { x: r.left + r.width / 2 - 90, y: r.top + r.height / 2 - 70 }; });
  await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(250);
  t["plan vide · « Poser une pièce de 4 × 3 m » : une pièce en murs, la carte s'efface"] = await p.evaluate(() => (facesCache[L().id] || []).length === 1 && L().walls.length === 4 && L().walls.every((w) => w.type === "mur") && document.getElementById("emptyStage").hidden);
}
await p.close();

/* ═════════ 8. La pastille d'une pièce s'explique ; le sol actuel en Travaux ; le doublage ═════════ */
p = await onglet({ welcomeVu: true });
await p.evaluate(() => {
  state = blankState(); const lv = L(); lv.height = 2.5;
  const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty || "mur" }; lv.walls.push(x); return x; };
  const h = W([0, 0], [6, 0]); W([6, 0], [6, 4]); W([6, 4], [0, 4]); W([0, 4], [0, 0]); W([3, 0], [3, 4], "cloison");
  lv.openings.push({ id: uid(), wallId: h.id, t: 0.25, type: "porte_entree", w: 0.9, h: 2.15, side: 1, hinge: 1 });
  settings.grid = false; afterChange(); setTool("select"); sel = null; fitView(); render();
});
await wait(150);
Object.assign(t, await p.evaluate(() => {
  const r = {}, ck = planChecks(L()).filter((c) => c.sel?.kind === "room" && /aucune porte/.test(c.msg)), id = ck[0]?.sel.id;
  r["pastille · une pièce sans porte est marquée"] = !!id && checkRooms.has(id);
  sel = { kind: "room", id }; render();
  r["pastille · sa fiche dit pourquoi, en tête"] = !!document.querySelector("#pbody .chks .chk") && /aucune porte/.test(document.querySelector("#pbody .chks").textContent) && document.querySelector("#pbody .chks").getBoundingClientRect().top < document.querySelector("#pbody .ph").getBoundingClientRect().top + 400;
  sel = null; render();
  return r;
}));
{
  await wait(100);
  const q = await p.evaluate(() => { const ck = planChecks(L()).find((c) => c.sel?.kind === "room" && /aucune porte/.test(c.msg)); const e = etiquettesVues.find((x) => x.id === ck.sel.id); const r = cv.getBoundingClientRect(); return { x: r.left + e.box.x + e.box.w / 2, y: r.top + e.box.y + e.box.h / 2 }; });
  await p.mouse.move(q.x, q.y); await wait(120);
  t["pastille · au survol de l'étiquette, l'infobulle dit pourquoi"] = await p.evaluate(() => { const b = document.getElementById("tipbox"); return b.style.display === "block" && /aucune porte/.test(b.textContent) && !/<b>/.test(b.textContent); });
  await p.mouse.move(5, 5); await wait(60);
  t["pastille · la souris s'en va : l'infobulle aussi"] = await p.evaluate(() => document.getElementById("tipbox").style.display === "none");
}
/* sol actuel, réglé en vue Travaux */
Object.assign(t, await p.evaluate(() => {
  const r = {}; localStorage.setItem("avyora-plan-projet-tip", "1"); setMode("projet");
  const f = facesFor(L(), "projet")[0]; sel = { kind: "room", id: f.room.id }; render(); setRoomRevetement("Parquet"); render();
  const s = document.querySelector('#pbody .solstep select[aria-label="Sol actuel"]');
  r["Travaux · le sol actuel se règle dans la fiche (sans changer de vue)"] = !!s && mode() === "projet";
  r["Travaux · sol actuel inconnu : l'alerte ne renvoie plus vers une autre vue"] = !planChecks(L()).some((c) => /sol/.test(c.msg) && /vue Avant travaux/.test(c.msg)) && planChecks(L()).some((c) => /sol actuel/.test(c.msg));
  s.value = "Dalle béton brute"; s.dispatchEvent(new Event("change"));
  r["Travaux · choisi sur place : la pièce le garde, la chape est conseillée"] = f.room.floor === "Dalle béton brute" && solPlan(f.room).steps.some((x) => x.k === "chape");
  return r;
}));
/* doublage : la pose se confirme ; un glissé court propose d'aller jusqu'à l'angle */
await p.evaluate(() => { sel = null; setTool("doublage"); DBL_CFG.mode = "iti"; DBL_CFG.action = "poser"; render(); fitView(); });
await wait(150);
{
  const co = await p.evaluate(() => { const r = cv.getBoundingClientRect(); const w = L().walls[0]; const si = interiorSideN(w); const off = (wallT(w) / 2 + 0.02) * si, n = perp(norm(sub(w.b, w.a)));
    const P = (x) => { const q = add(v(x, 0), mul(n, off)); const s = S(q); return { x: r.left + s.x, y: r.top + s.y }; }; return { a: P(0.4), b: P(2.62) }; });
  await p.mouse.move(co.a.x, co.a.y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(co.a.x + (co.b.x - co.a.x) * i / 8, co.a.y + (co.b.y - co.a.y) * i / 8);
  await p.mouse.up(); await wait(120);
  Object.assign(t, await p.evaluate(() => {
    const r = {}, T = document.getElementById("toast"), w = L().walls[0], l = isoList(w);
    r["doublage · la pose se confirme (longueur posée)"] = T.classList.contains("show") && /Doublage posé sur/.test(T.textContent) && l.length === 1;
    const act = T.querySelector(".tact");
    r["doublage · arrêté près d'un angle : « Jusqu'à l'angle » est proposé"] = !!act && /angle/.test(act.textContent);
    const avant = isoT1(l[0]) - isoT0(l[0]); if (act) act.click();
    const l2 = isoList(w);
    r["doublage · « Jusqu'à l'angle » prolonge le doublage"] = l2.length === 1 && isoT1(l2[0]) - isoT0(l2[0]) > avant + 0.05;
    return r;
  }));
}
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un premier contact qui guide, un exemple qui inspire confiance, une raison de revenir");
process.exit(echecs.length || errs.length ? 1 : 0);
