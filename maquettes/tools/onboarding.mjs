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
 *     du téléphone fermé ne revient pas ; la fenêtre « vue Travaux » ne s'ouvre pas au téléphone ;
 *   - D48 : la visite se termine sur « Commencer mon plan » (ou « Continuer l'exemple ») ; l'exemple
 *     montre une carte « À toi » au lieu de la checklist d'un T2 fictif ; le Suivi se date (en retard,
 *     cette semaine, tri) ; la page appelle window.AVYORA_TRACK aux moments clés, sans donnée
 *     personnelle ni appel réseau ;
 *   - D50 : l'accueil fermé par la croix ouvre l'exemple en Travaux et propose la visite ; chaque plan type
 *     s'ouvre sans point au contrôle, à 0 €, avec son type de bien, et le T2 n'est plus l'exemple.
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
/* D48 (cj-retention02) : la dernière bulle mène au plan de l'utilisateur */
t["visite · dernière bulle : « Commencer mon plan » focalisé, « Continuer l'exemple » à côté"] = await p.evaluate(() => /Commencer mon plan/.test(document.activeElement?.textContent || "") && /Continuer l'exemple/.test(document.querySelector("#visite .vpasser")?.textContent || ""));
await p.keyboard.press("Enter"); await wait(300);
Object.assign(t, await p.evaluate(() => ({
  "visite · « Commencer mon plan » la termine, mémorisée « fait »": !visite && document.getElementById("visite").hidden && localStorage.getItem("avyora-plan-tuto") === "fait",
  "visite · « Commencer mon plan » : un plan vierge, l'outil Murs prêt, l'exemple intact pas rangé": planVide() && tool === "mur" && Object.keys(loadPlans()).length === 0 && !modaleOuverte(),
})));
await p.close();
/* « Continuer l'exemple » : la vue Travaux reste, la carte « À toi » remplace la checklist du T2 fictif */
p = await onglet();
await p.evaluate(() => closeWelcome("sample", true)); await wait(300);
await p.evaluate(() => etapeVisite(4)); await wait(300);
await p.evaluate(() => document.querySelector("#visite .vpasser").click()); await wait(250);
Object.assign(t, await p.evaluate(() => ({
  "visite · « Continuer l'exemple » la termine, mémorisée « fait »": !visite && localStorage.getItem("avyora-plan-tuto") === "fait",
  "visite · la vue Travaux reste (l'exemple s'explique par ses couleurs)": mode() === "projet" && !sel,
  "visite · le message propose « Commencer mon plan »": /Commencer mon plan/.test(document.querySelector("#toast .tact")?.textContent || ""),
  "exemple · une carte « À toi : dessine ton logement » (plan type, feuille blanche), plus la checklist du T2": !!document.querySelector("#pbody .pp.ppex .ppnext") && /plan type/.test(document.querySelector("#pbody .pp.ppex").textContent) && !/code postal/.test(document.querySelector("#pbody .pp").textContent),
})));
await p.close();
/* téléphone : la dernière bulle propose « Continuer sur ordinateur » */
p = await onglet({ larg: 390, haut: 844, mobile: true });
await p.evaluate(() => { document.querySelector("#m-welcome .wcards.wphone .wcard.rec").click(); }); await wait(350);
await p.evaluate(() => etapeVisite(visite.E.length - 1)); await wait(300);
t["téléphone · dernière bulle : « Continuer sur ordinateur » et « Continuer l'exemple »"] = await p.evaluate(() => /Continuer sur ordinateur/.test(document.querySelector("#visite .vsuiv")?.textContent || "") && /Continuer l'exemple/.test(document.querySelector("#visite .vpasser")?.textContent || ""));
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

/* D50 (cj-design11, cj-qa10) : fermer l'accueil par la croix ouvre l'exemple en vue Travaux et propose la visite en une ligne */
{
  const q = await onglet();
  await q.evaluate(() => document.querySelector("#m-welcome .mx").click()); await wait(250);
  Object.assign(t, await q.evaluate(() => { const to = document.getElementById("toast"), a = to.querySelector(".tact");
    return { "accueil fermé par la croix · l'exemple en vue Travaux (comme la carte)": estExemple() && mode() === "projet" && !modaleOuverte(),
      "accueil fermé par la croix · une ligne propose la visite guidée (bouton)": to.classList.contains("show") && !!a && /Visite guidée/.test(a.textContent) && to.getBoundingClientRect().height <= 60 }; }));
  await q.evaluate(() => document.querySelector("#toast .tact").click()); await wait(300);
  t["accueil fermé par la croix · le bouton lance la visite"] = await q.evaluate(() => !!visite && !document.getElementById("visite").hidden);
  await q.close();
}

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
  /* D50 (cj-pro07) : le T3 et le T2 disent aussi ce qu'ils sont — sans type de bien, le T3 réclamait une toiture */
  r["plans types · chacun dit son type de bien (Maison : maison ; T2, studio, T3 : appartement)"] = bienDe("maison") === "maison" && bienDe("studio") === "appartement" && bienDe("t3") === "appartement" && bienDe("t2") === "appartement";
  /* D50 (cj-pro07, cj-qa09, cj-integration04, cj-coherence06, cj-pro08) : un plan type chargé → 0 point au contrôle dans
     les trois vues (la Maison garde la seule invitation à décrire SA toiture), 0 €, aucune tâche, un rectangle sans
     fausse alerte « plan non rectangulaire » ; le T2 n'est plus l'exemple (ni travaux, ni note, ni produit) */
  for (const T of TEMPLATES) {
    closeModal(); state.origine = null; chargerModele(T, null, null); closeModal();
    const pts = [];
    for (const m of ["existant", "projet", "final"]) { state.mode = m; afterChange(); planChecks(L()).forEach((c) => { if (!(T.bien === "maison" && /Toiture/.test(c.msg))) pts.push(m + " : " + c.msg.replace(/<[^>]+>/g, "").slice(0, 60)); }); }
    state.mode = "existant"; afterChange();
    const lv = L(), st = lv.walls.filter((w) => w.st).length + lv.openings.filter((o) => o.st).length + lv.items.filter((i) => i.st).length + lv.walls.filter((w) => isoList(w).length).length;
    const tr = toitureRect();
    r[`plan type ${T.name} · zéro point au contrôle dans les trois vues${pts.length ? " (" + pts.join(" | ") + ")" : ""}`] = pts.length === 0;
    r[`plan type ${T.name} · 0 €, aucune tâche, aucun travaux ni note ni produit`] = chantierPrix().total === 0 && chantierTasks().length === 0 && st === 0 && TX(lv).length === 0 && allProducts().length === 0 && !state.notes;
    r[`plan type ${T.name} · type de bien renseigné, pas l'exemple`] = !!chantier().bien && state.origine?.k === "modele" && !/Exemple/.test(state.name);
    r[`plan type ${T.name} · rectangle : pas de « plan non rectangulaire » (toiture)`] = !!tr && tr.compose === false;
  }
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
  /* D49 (cj-novice04, cj-coherence04) : « sols » devient « Tout décider » — la même liste qu'« Encore à décider » d'Estimer */
  const A0 = elementsATrancher()[0], dec = () => etapesProjet().find((e) => e.k === "decider");
  r["projet · une décision : la suivante est « tout décider », qui nomme le premier « à décider » d'Estimer"] = nx() === "decider" && !!A0 && dec().suite.startsWith("Décide · " + A0.label);
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  r["projet · « tout décider » : le premier élément à décider est sélectionné, en vue Travaux"] = mode() === "projet" && sel?.kind === A0.kind && sel?.id === A0.id;
  /* on tranche tout ce qui n'est pas un sol : la prochaine étape mène au sol de la pièce */
  elementsATrancher().filter((a) => a.kind === "opening").forEach((a) => { const o = L().openings.find((x) => x.id === a.id); o.st = "garder"; });
  elementsATrancher().filter((a) => a.kind === "item").forEach((a) => { const i = L().items.find((x) => x.id === a.id); i.st = "garder"; }); afterChange();
  r["projet · il reste le sol : « tout décider » n'est pas fait"] = nx() === "decider" && elementsATrancher()[0].kind === "room" && pctProjet() < 100;
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  return r;
}));
await wait(120);
Object.assign(t, await p.evaluate(() => {
  const r = {}, nx = () => etapesProjet().find((e) => !e.fait)?.k;
  r["projet · « tout décider » sur un sol : la pièce sélectionnée en vue Travaux, la liste Revêtement focalisée"] = mode() === "projet" && sel?.kind === "room" && document.activeElement?.getAttribute("aria-label") === "Revêtement de sol";
  setRoomRevetement("__garde");
  r["projet · sol gardé = décision : la suivante est « estimation »"] = nx() === "estimer";
  sel = null; render(); document.querySelector("#pbody .pp .ppnext").click();
  r["projet · « Ouvre ton estimation » ouvre Estimer ; 100 %"] = modaleOuverte()?.id === "m-estimate" && pctProjet() === 100;
  closeModal(); sel = null; render();
  r["projet · 100 % : la suite, c'est le Suivi"] = /Suivi/.test(document.querySelector("#pbody .pp .ppnext").textContent);
  /* D49 : une erreur au contrôle du plan, et ce n'est plus 100 % */
  const lvE = L(), bout = { id: uid(), a: v(2, 1.5), b: v(3, 1.5), type: "cloison" }; lvE.walls.push(bout); afterChange();
  const eE = etapesProjet().find((e) => e.k === "erreurs");
  r["projet · une erreur au contrôle : « Un plan sans erreur » n'est pas fait, plus de 100 %, la suite dit « Corrige · … »"] = !eE.fait && pctProjet() < 100 && nx() === "erreurs" && /^Corrige · /.test(eE.suite) && planChecks(lvE).some((c) => c.lvl === "err");
  sel = null; render();
  r["projet · … et le panneau ne dit plus « Ton plan est complet »"] = !/Ton plan est complet/.test(document.querySelector("#pbody .pp").textContent);
  lvE.walls = lvE.walls.filter((w) => w !== bout); afterChange(); sel = null; render();
  /* la liste des étapes : chaque étape à faire est un bouton */
  state.chantier.cp = ""; render();
  const L2 = [...document.querySelectorAll("#pbody .pplist li")];
  r["projet · la liste : 8 étapes, celles à faire sont cliquables"] = L2.length === 8 && L2.filter((x) => x.querySelector("button")).length === etapesProjet().filter((e) => !e.fait).length;
  return r;
}));
/* l'exemple : son pourcentage, et ouvrir Estimer ne le « touche » pas */
Object.assign(t, await p.evaluate(() => {
  const r = {};
  loadSample();
  const E = etapesProjet();
  r["projet · exemple : pièces, ouvertures, sol actuel, travaux faits ; code postal et « tout décider » à faire"] = ["pieces", "ouvertures", "solActuel", "travaux"].every((k) => E.find((e) => e.k === k).fait) && !E.find((e) => e.k === "chantier").fait && !E.find((e) => e.k === "decider").fait;
  showEstimate(); closeModal();
  r["projet · ouvrir Estimer : l'étape est faite, l'exemple reste « jamais touché »"] = etapesProjet().find((e) => e.k === "estimer").fait && planIntact();
  savePlanToLibrary(); openPlansModal();
  r["projet · « Mes plans » : le pourcentage sur la carte"] = new RegExp("projet à " + pctProjet() + "\u00a0%").test(document.querySelector("#plansList .plancard .gres").textContent); /* R6 : « 50 % » insécable, jamais « 50 » en fin de ligne et « % » à la suivante */
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
  r["plan vide · « Tracer les murs » : outil Murs, la carte s'efface"] = tool === "mur" && c.hidden && wallType === "auto" && typeAuTrace(L(), v(0, 0), v(3, 0)).type === "mur"; /* D48 : automatique, le 1er contour est en murs */
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

/* ═════════ 10. D48 · Un Suivi daté : rendez-vous, retard, tri (cj-retention06) ═════════ */
p = await onglet({ welcomeVu: true });
Object.assign(t, await p.evaluate(() => {
  const r = {}, f = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  loadSample(); setMode("projet"); closeModal(); sel = null; setPanelTab("suivi");
  const P = () => document.getElementById("pbody"), lots = [...new Set(chantierTasks().map((x) => x.lot))];
  r["Suivi · sans date : une invitation à dater, rien d'inventé"] = !state.prevu && /date prévue/.test(P().innerText) && !P().querySelector(".suivdates") && P().querySelectorAll(".lotdate input[type=date]").length === lots.length;
  const hier = new Date(); hier.setDate(hier.getDate() - 3); const inp = P().querySelector(".lotdate input"); inp.value = f(hier); inp.dispatchEvent(new Event("change"));
  setPrevu(lots[2], f(new Date())); const loin = new Date(); loin.setDate(loin.getDate() + 20); setPrevu(lots[1], f(loin));
  const tx = P().querySelector(".suivdates")?.textContent || "";
  r["Suivi · « En retard », « Cette semaine », « Ensuite », chacun avec sa date"] = /En retard/.test(tx) && tx.includes(lots[0]) && /Cette semaine/.test(tx) && tx.includes(lots[2]) && /Ensuite/.test(tx) && tx.includes(lots[1]);
  r["Suivi · chaque corps d'état daté porte son état"] = /en retard/.test(P().querySelector(".lotst.retard")?.textContent || "") && !!P().querySelector(".lotst.semaine");
  r["Suivi · les dates sont dans le plan (state.prevu), annulables"] = Object.keys(state.prevu).length === 3 && (undo(), setPanelTab("suivi"), Object.keys(state.prevu || {}).length === 2);
  redo(); setPanelTab("suivi"); setTriSuivi("date");
  r["Suivi · trié par date : le corps d'état le plus tôt en tête"] = P().querySelector(".tasks .lot span").textContent === lots[0] && [...P().querySelectorAll(".tasks .lot span:first-child")].map((x) => x.textContent)[1] === lots[2];
  setTriSuivi("chantier");
  r["Suivi · l'ordre du chantier revient"] = P().querySelector(".tasks .lot span").textContent === lots[0] && [...P().querySelectorAll(".tasks .lot span:first-child")].map((x) => x.textContent)[1] === lots[1];
  chantierTasks().filter((x) => x.lot === lots[0]).forEach((x) => { if (!isDone(x.id)) toggleDone(x.id); }); setPanelTab("suivi");
  r["Suivi · un corps d'état fini n'est plus « en retard »"] = !/En retard/.test(P().querySelector(".suivdates")?.textContent || "") && !!P().querySelector(".lotst.fait");
  r["Mes plans · la prochaine étape datée"] = /^.+, le \d{2}\/\d{2}$/.test(resumePlan().prochain || "") && resumePlan().prochain.startsWith(lots[2]);
  exportPlan(); r["dossier · le Suivi porte les dates prévues"] = /Prévu le/.test(document.getElementById("exportGallery").innerText); closeModal();
  setPanelTab("details"); return r;
}));
await p.close();

/* ═════════ 11. D48 · Mesurer sans réseau : window.AVYORA_TRACK aux moments clés (cj-retention05) ═════════ */
p = await b.newPage(); p.on("pageerror", (e) => errs.push(e.message)); await p.setViewport({ width: 1440, height: 900 });
await p.evaluateOnNewDocument(() => { window.__ev = []; window.AVYORA_TRACK = (n, d) => window.__ev.push([n, d]); window.open = () => ({}); try { localStorage.clear(); } catch {} });
const reseau = []; p.on("request", (q) => { if (!/^(file|data|blob):/.test(q.url()) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(q.url())) reseau.push(q.url()); }); /* la police de la page mise à part (elle précède D48) */
await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" }); await wait(350);
await p.evaluate(() => closeWelcome("sample", true)); await wait(300);
await p.evaluate(() => etapeVisite(4)); await wait(200);
await p.evaluate(() => document.querySelector("#visite .vpasser").click()); await wait(150);
await p.evaluate(() => { const w = L().walls.find((x) => x.type === "cloison" && !x.st && x.a.x === 3.5 && x.a.y === 0); sel = { kind: "wall", id: w.id }; setWallProp("st", "demolir"); showEstimate(); closeModal(); passerPro("test"); newPlan(); });
{ const P2 = (x, y) => p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
  for (const [x, y] of [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]) { const q = await P2(x, y); await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(110); } }
Object.assign(t, await p.evaluate(() => { const r = {}, ev = window.__ev, noms = ev.map((e) => e[0]);
  r["mesure · plan ouvert, visite terminée, 1re décision, Estimer ouvert, clic Passer Pro, 1re pièce fermée"] = ["plan_ouvert", "visite_terminee", "premiere_decision", "estimer_ouvert", "clic_passer_pro", "premiere_piece"].every((n) => noms.includes(n));
  r["mesure · ouvrir l'exemple n'est pas une « première décision »"] = noms.indexOf("premiere_decision") > noms.indexOf("visite_terminee");
  r["mesure · chaque événement dit Pro / gratuit et téléphone, sans nom de plan"] = ev.every((e) => typeof e[1].pro === "boolean" && typeof e[1].telephone === "boolean") && !/Exemple|T2 de|Mon plan/.test(JSON.stringify(ev));
  r["mesure · le lien Passer Pro dit d'où il vient"] = ev.some((e) => e[0] === "clic_passer_pro" && e[1].origine === "test") && /source=editeur-plan/.test(TARIFS_URL);
  delete window.AVYORA_TRACK; let ok = true; try { suivre("x", {}); } catch { ok = false; }
  r["mesure · sans AVYORA_TRACK injecté : rien, sans erreur"] = ok;
  return r; }));
t["mesure · aucun appel réseau (hors police de la page)"] = reseau.length === 0; if (reseau.length) console.log("réseau :", reseau.slice(0, 5));
await p.close();

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un premier contact qui guide, un exemple qui inspire confiance, une raison de revenir");
process.exit(echecs.length || errs.length ? 1 : 0);
