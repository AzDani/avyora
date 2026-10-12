/**
 * D76 · L'éditeur en « mode site » : la couche du site (window.AVYORA_SITE) et la preuve que l'artefact n'a pas bougé.
 *
 * Partie 0, le source :
 *   - le bloc MODE SITE existe, entre ses deux bornes, sans double barre oblique ;
 *   - chaque fetch( et chaque location.assign / location.replace ajoutés sont dans ce bloc ; hors du bloc, chaque appel
 *     à la couche site est derrière if(SITE…, if(NUAGE…, NUAGE? ou NUAGE&& (siteBrut, appelé par load(), sort d'emblée
 *     sans SITE) ;
 *   - aucun autre outil de la batterie n'injecte AVYORA_SITE ;
 *   - les lignes que la batterie fige sont là, à l'identique (V3_THREE, PRIX_PRO, CONSTRUCTION_URL et son #plan=,
 *     TARIFS_URL, l'@import, PLAN_LIMIT_FREE, « const planCharge=load(); »).
 * Partie A, l'artefact (le fichier tel quel, sans AVYORA_SITE) :
 *   - SITE === null, NUAGE === false ; aucune requête réseau hors polices, aucun fetch, sur un parcours qui range,
 *     ouvre, duplique et supprime ;
 *   - les clés localStorage écrites sont celles du code d'avant (aucune des clés du site) ;
 *   - TXT_LIEU rend les phrases d'avant au caractère près, et l'indicateur les affiche ;
 *   - lienConstruction() : CONSTRUCTION_URL#plan=…, sans &pid ni &pl ; ?dev marche toujours ;
 *   - esc() traite ' et >, escJs() ne laisse passer que [A-Za-z0-9_-] ; des données hostiles dans « Mes plans »
 *     (x en chaîne, id avec ') n'injectent aucun attribut.
 * Partie B, le site simulé : la page servie en http par interception Puppeteer, AVYORA_SITE injecté par
 *   evaluateOnNewDocument, l'API /api/plans simulée en mémoire (révisions, limite gratuite, editeurId, conflit) :
 *   plan injecté migré puis ouvert ; sauvegarde groupée avec la bonne révision ; 409 et ses deux choix ; hors ligne et
 *   nouvel envoi ; tampon modifié renvoyé au chargement ; 402 ; ?dev neutralisé et gratuit (D68) ; ouvrir, dupliquer,
 *   supprimer et « Annuler » ; lien neuf &pid= / &pl= ; logo ; invitation anonyme ; « Sur cet appareil » et drapeau de
 *   reprise ; données hostiles du serveur ; estimation détaillée d'une rénovation (Pro) ; estimations reliées ; retour Pro.
 *
 *   node maquettes/tools/site.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/site.mjs <dossier maquettes>"); process.exit(2); }
setTimeout(() => { console.log("site : délai dépassé (300 s)"); process.exit(3); }, 300000);
const LISTER = process.argv.includes("--tout");
const SRC = fs.readFileSync(SP + "/plan-editor.html", "utf8");
const FIX = (n) => JSON.parse(fs.readFileSync(path.join(SP, "..", "tests", "fixtures", "plans-etats", n + ".json"), "utf8"));
const t = {}, errs = [], wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═════════ 0. Le source ═════════ */
const DEB = "/* ===== MODE SITE (D76) =====", FIN = "/* ===== fin du MODE SITE (D76) ===== */";
const iA = SRC.indexOf(DEB), iZ = SRC.indexOf(FIN);
const BLOC = iA > 0 && iZ > iA ? SRC.slice(iA, iZ + FIN.length) : "";
const HORS = BLOC ? SRC.slice(0, iA) + SRC.slice(iZ + FIN.length) : SRC;
t["source · le bloc MODE SITE (D76) est là, une seule fois, entre ses deux bornes"] = !!BLOC && SRC.indexOf(DEB, iA + 1) < 0;
t["source · le bloc s'écrit sans double barre oblique (lignes courtes, commentaires /* */)"] = !!BLOC && !/\/\//.test(BLOC.replace(/https?:\/\//g, ""));
t["source · le bloc est en lignes courtes (≤ 200 caractères, hors gabarits HTML)"] = !!BLOC && BLOC.split("\n").filter((l) => l.length > 200 && !/[`<]/.test(l)).length === 0;
t["source · tout fetch( est dans le bloc MODE SITE"] = !/\bfetch\(/.test(HORS) && /\bfetch\(/.test(BLOC);
{ const hors = HORS.match(/location\.(assign|replace)\([^)]*\)/g) || [];
  t[`source · hors du bloc, la seule navigation est celle d'avant (passerPro) — ${hors.join(", ")}`] = hors.length === 1 && hors[0] === "location.assign(TARIFS_URL)"; }
{ const lignes = HORS.split("\n").filter((l) => /\bsite[A-Z]\w*\(/.test(l));
  const nues = lignes.filter((l) => !/if\(NUAGE|if\(SITE|NUAGE\?|NUAGE&&|conflitOnglet\.serveur/.test(l) && !/brut\?\?siteBrut\(\)/.test(l));
  t[`source · hors du bloc, chaque appel à la couche site est gardé (${lignes.length} crochets)${nues.length ? " — " + nues.map((l) => l.trim().slice(0, 80)).join(" | ") : ""}`] = lignes.length >= 10 && !nues.length;
  t["source · siteBrut() sort d'emblée sans AVYORA_SITE"] = /function siteBrut\(\)\{\n\s*if\(!SITE\|\|siteBrutPris\)return undefined;/.test(BLOC); }
{ const autres = fs.readdirSync(SP + "/tools").filter((f) => /\.(mjs|mts|cjs|js)$/.test(f) && f !== "site.mjs").filter((f) => /AVYORA_SITE/.test(fs.readFileSync(SP + "/tools/" + f, "utf8")));
  t[`source · aucun autre outil n'injecte AVYORA_SITE${autres.length ? " — " + autres.join(", ") : ""}`] = !autres.length; }
t["source · lignes figées intactes (V3_THREE, PRIX_PRO, CONSTRUCTION_URL+'#plan='+, TARIFS_URL, @import, PLAN_LIMIT_FREE, démarrage)"] =
  /const V3_THREE='https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.147\.0\/'/.test(SRC) && /const PRIX_PRO=\(typeof window!=='undefined'&&typeof window\.AVYORA_PRIX_PRO==='string'&&window\.AVYORA_PRIX_PRO\)\|\|'/.test(SRC)
  && /CONSTRUCTION_URL\+'#plan='\+f;\}/.test(SRC) && SRC.includes("const TARIFS_URL='https://getavyora.fr/tarifs?source=editeur-plan';")
  && (SRC.match(/@import url\('https:\/\/fonts\.googleapis\.com/g) || []).length === 1 && SRC.includes("const PLAN_LIMIT_FREE=1;") && SRC.includes("const planCharge=load();")
  && (SRC.match(/https:\/\/getavyora\.fr\//g) || []).length === 3;
t["source · aucune balise <script src> ajoutée, un seul <script>"] = !/<script[^>]+src=/i.test(SRC) && (SRC.match(/<script>/g) || []).length === 1;

/* les phrases d'avant (D76 · TXT_LIEU), recopiées du fichier d'avant au caractère près */
const ORIG = {
  enreg: "Enregistré sur cet appareil",
  err: "Pas enregistré : l'espace de ce navigateur est plein. Supprime un plan dans « Mes plans » ou exporte celui-ci.",
  perdu: "Ce plan est sur cet appareil, mais « Mes plans » n'a plus de place : il sera perdu si tu en ouvres un autre.",
  videTel: "Aucun plan sur ce téléphone. Pour l'instant, un plan reste enregistré sur l'appareil où il a été dessiné : ouvre-le sur cet ordinateur ou cette tablette.",
  plansSub: "Tes plans, sur cet appareil. Le plan ouvert s'enregistre tout seul ; il est rangé ici avant que tu en ouvres ou en commences un autre.",
  plansNote: "Tes plans sont enregistrés dans ce navigateur, sur cet appareil.",
  accueil: "Ton plan s'enregistre tout seul, sur cet appareil.",
  calque: "Calque importé — cale son échelle pour des surfaces justes",
};
const CLES_SITE = ["avyora-plan-rev", "avyora-plan-invite", "avyora-plan-claim"];
const CLES_AVANT = new Set([...HORS.matchAll(/'(avyora-[a-z0-9-]+)'/g)].map((m) => m[1]));
t["source · les clés du site n'existent que dans le bloc"] = CLES_SITE.every((k) => !CLES_AVANT.has(k) && BLOC.includes("'" + k + "'"));

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000, args: ["--no-sandbox"] });

/* ═════════ A. L'artefact : le fichier tel quel ═════════ */
async function ongletArtefact(suffixe = "", pro = true, avant = null) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const req = [];
  p.on("pageerror", (e) => errs.push("artefact · " + e.message));
  p.on("request", (r) => req.push(r.url()));
  await p.setViewport({ width: 1400, height: 900 });
  await p.evaluateOnNewDocument((pro, avant) => {
    window.__fetch = 0; const f = window.fetch; window.fetch = function () { window.__fetch++; return f.apply(this, arguments); };
    window.open = () => ({});
    try { localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); if (avant) for (const [k, v] of Object.entries(avant)) localStorage.setItem(k, v); } catch {}
  }, pro, avant);
  await p.goto("file://" + SP + "/plan-editor.html" + suffixe, { waitUntil: "networkidle0" });
  await wait(300);
  return { p, req, ctx };
}
{
  const { p, req, ctx } = await ongletArtefact();
  Object.assign(t, await p.evaluate((ORIG, CLES_SITE) => {
    const r = {};
    r["artefact · SITE === null, NUAGE === false, la couche est chargée mais endormie"] = SITE === null && NUAGE === false && typeof siteDemarrer === "function" && Object.keys(siteLib).length === 0;
    r["artefact · TXT_LIEU rend les phrases d'avant, au caractère près"] = TXT_LIEU.enreg(true) === ORIG.enreg && TXT_LIEU.enreg(false) === ORIG.enreg
      && ["err", "perdu", "videTel", "plansSub", "plansNote", "accueil", "calque"].every((k) => TXT_LIEU[k] === ORIG[k]);
    r["artefact · le HTML dit les mêmes phrases que TXT_LIEU (Mes plans, accueil)"] = document.querySelector("#m-plans .modal > .sub").textContent === TXT_LIEU.plansSub
      && document.querySelector("#m-plans .modal > .note").textContent === TXT_LIEU.plansNote
      && [...document.querySelector("#m-welcome .wnote").childNodes].filter((x) => x.nodeType === 3).pop().textContent === TXT_LIEU.accueil;
    closeWelcome("blank");
    chargerModele(TEMPLATES.find((x) => x.id === "maison"), null, null, WORKFLOW_FINAL); afterChange();
    const u = lienConstruction();
    r["artefact · lienConstruction() : CONSTRUCTION_URL#plan=…, sans &pid ni &pl"] = !!u && u.startsWith(CONSTRUCTION_URL + "#plan=") && !/[&?]p(id|l)=/.test(u);
    /* un parcours qui touche au stockage : ranger, ouvrir Mes plans, dupliquer, supprimer, Annuler, nouveau plan */
    savePlanToLibrary(); const id = state.id; openPlansModal(); duplicateSavedPlan(id);
    const copie = Object.keys(loadPlans()).find((k) => k !== id); deleteSavedPlan(copie);
    document.querySelector("#toast .tact")?.click(); closeModal(); enregistrerMaintenant();
    r["artefact · ranger, dupliquer, supprimer, Annuler : Mes plans en local, comme avant"] = Object.keys(loadPlans()).length === 2 && !!loadPlans()[id] && !!loadPlans()[copie];
    etatEnreg = "err"; afficherEnreg();
    r["artefact · l'indicateur dit la phrase d'avant (navigateur plein)"] = document.getElementById("saveState").title === ORIG.err;
    etatEnreg = "ok"; afficherEnreg(true);
    r["artefact · « Enregistré sur cet appareil », comme avant"] = document.getElementById("saveState").title.startsWith(ORIG.enreg);
    r["artefact · aucun fetch, aucune clé du site écrite"] = window.__fetch === 0 && CLES_SITE.every((k) => localStorage.getItem(k) === null);
    return r;
  }, ORIG, CLES_SITE));
  const cles = await p.evaluate(() => Object.keys(localStorage));
  const neuves = cles.filter((k) => !CLES_AVANT.has(k));
  t[`artefact · les clés localStorage écrites sont celles du code d'avant (${cles.length})${neuves.length ? " — " + neuves.join(", ") : ""}`] = !neuves.length && cles.includes("avyora-plans") && cles.includes("avyora-plan-v2");
  const hors = req.filter((u) => !/^(file|data|blob):/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  t[`artefact · aucune requête réseau hors polices${hors.length ? " — " + hors.slice(0, 3).join(", ") : ""}`] = !hors.length;
  /* gratuit, Mes plans plein, un autre plan dessiné : la phrase « perdu » d'avant */
  Object.assign(t, await p.evaluate((ORIG) => {
    const r = {}; localStorage.setItem("avyora-plan-pro", "0");
    const lib = loadPlans(); const garde = Object.keys(lib)[0]; Object.keys(lib).forEach((k) => { if (k !== garde) delete lib[k]; }); writePlans(lib);
    delete state.id; state.name = "Autre"; L().walls.push({ id: "zz1", a: { x: 50, y: 50 }, b: { x: 53, y: 50 }, type: "mur" }); afterChange(); etatEnreg = "ok"; afficherEnreg();
    r["artefact · gratuit, « Mes plans » plein : la phrase « perdu » d'avant"] = document.getElementById("saveState").title === "Version gratuite : " + DROITS.plans.gratuit + ". " + ORIG.perdu + " Clique pour voir tes options.";
    localStorage.setItem("avyora-plan-pro", "1"); return r;
  }, ORIG));
  await ctx.close();
}
{
  const { p, ctx } = await ongletArtefact("?dev");
  t["artefact · ?dev marche toujours (isDev, html.dev)"] = await p.evaluate(() => isDev() === true && document.documentElement.classList.contains("dev"));
  await ctx.close();
}
{
  /* des données hostiles dans « Mes plans » (un plan rangé par une version modifiée, ou une injection) */
  const hostile = { "x'),window.__pwn=1,('": { id: "x'),window.__pwn=1,('", name: "<img src=x onerror=window.__pwn=1>", savedAt: Date.now(),
    state: { levels: [{ walls: [{ id: "w", a: { x: '0" onload="window.__pwn=1', y: 0 }, b: { x: 4, y: '1"><script>window.__pwn=1</script>' }, type: 'mur" onclick="window.__pwn=1', st: '"><b>' }] }], cur: 0 }, view: null, resume: null } };
  const { p, ctx } = await ongletArtefact("", true, { "avyora-plans": JSON.stringify(hostile), "avyora-plan-welcome": "1" });
  Object.assign(t, await p.evaluate(() => {
    const r = {};
    r["artefact · esc() traite & < > \" ' ; escJs() ne garde que [A-Za-z0-9_-]"] = esc(`a'b>c<d"e&`) === "a&#39;b&gt;c&lt;d&quot;e&amp;" && escJs("a'b);x") === "abx" && escJs("k3j9x2a") === "k3j9x2a";
    openPlansModal();
    const L = document.getElementById("plansList"), tous = [...L.querySelectorAll("*")];
    const evts = tous.flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => a.name + "=" + a.value));
    const malsains = evts.filter((s) => !/^onclick=(openSavedPlan|duplicateSavedPlan|deleteSavedPlan)\('[A-Za-z0-9_-]*'\)$/.test(s) && !/^onclick=suivre\(/.test(s));
    r[`artefact · données hostiles : aucun attribut injecté dans « Mes plans »${malsains.length ? " — " + malsains.join(" | ") : ""}`] = !malsains.length && !L.querySelector("img,script") && window.__pwn === undefined
      && [...L.querySelectorAll("line")].every((l) => [...l.attributes].every((a) => /^(x1|y1|x2|y2|stroke|stroke-width|stroke-linecap|stroke-dasharray|opacity)$/.test(a.name)));
    return r;
  }));
  await wait(200);
  t["artefact · données hostiles : rien ne s'exécute"] = await p.evaluate(() => window.__pwn === undefined);
  await ctx.close();
}

/* ═════════ B. Le site simulé ═════════ */
const HTML = SRC;
const HOTE = "http://avyora.test";
const UUID = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
function serveur({ pro = true, plans = [] } = {}) {
  const S = { pro, plans: new Map(), log: [], nav: [], horsLigne: false, seq: 100 };
  for (const x of plans) S.plans.set(x.id, { revision: 1, updated_at: new Date().toISOString(), estimations: [], vue: null, resume: {}, ...x });
  S.carte = (x) => ({ id: x.id, nom: x.nom, workflow: x.workflow, resume: x.resume || {}, apercu: x.apercu || [], revision: x.revision, updated_at: x.updated_at, estimations: (x.estimations || []).length });
  S.rep = (st, j) => ({ status: st, contentType: "application/json", body: j === undefined ? "" : JSON.stringify(j) });
  S.api = (meth, chemin, corps) => {
    const m = chemin.match(/^\/api\/plans(?:\/([^/?]+))?/), id = m && m[1];
    if (id === "session") return S.rep(200, { connecte: true, pro: S.pro, limite: S.pro ? null : 1, utilises: S.plans.size });
    if (!id && meth === "GET") return S.rep(200, { plans: [...S.plans.values()].map(S.carte), limite: S.pro ? null : 1, utilises: S.plans.size });
    if (!id && meth === "POST") {
      if (corps.editeurId) { const d = [...S.plans.values()].find((x) => x.editeurId === corps.editeurId); if (d) return S.rep(201, { id: d.id, revision: d.revision, deja: true }); }
      if (!S.pro && S.plans.size >= 1) return S.rep(402, { code: "limite_gratuite" });
      const nid = UUID(++S.seq);
      S.plans.set(nid, { id: nid, nom: corps.nom, workflow: corps.etat.workflow, etat: corps.etat, vue: corps.vue || null, resume: corps.resume || {}, revision: 1, updated_at: new Date().toISOString(), estimations: [], editeurId: corps.editeurId });
      return S.rep(201, { id: nid, revision: 1, deja: false });
    }
    const x = S.plans.get(id);
    if (!x) return S.rep(404, { code: "introuvable" });
    if (meth === "GET") return S.rep(200, { id: x.id, nom: x.nom, workflow: x.workflow, etat: x.etat, vue: x.vue, resume: x.resume, revision: x.revision, updated_at: x.updated_at, estimations: x.estimations });
    if (meth === "DELETE") { S.plans.delete(id); return S.rep(204); }
    if (meth === "PATCH") {
      if (!corps.force && corps.revision !== x.revision) return S.rep(409, { code: "conflit", revision: x.revision });
      if (corps.etat) { x.etat = corps.etat; x.workflow = corps.etat.workflow; }
      if (corps.nom) x.nom = corps.nom; if (corps.vue) x.vue = corps.vue; if (corps.resume) x.resume = corps.resume; if (corps.contrat) x.contrat = corps.contrat;
      x.revision++; x.updated_at = new Date().toISOString();
      return S.rep(200, { revision: x.revision });
    }
    return S.rep(405, { code: "invalide" });
  };
  return S;
}
/* SITE : ce que l'amorçage du site pose (C4), calculé ici depuis le serveur simulé */
function siteDe(S, { connecte = true, planId = null, type = null } = {}) {
  const P = planId && S.plans.get(planId);
  return { v: 1, connecte, limite: S.pro ? null : 1, dev: false, lang: "fr", type,
    plans: connecte ? [...S.plans.values()].map(S.carte) : [],
    plan: connecte && P ? { id: P.id, nom: P.nom, workflow: P.workflow, etat: P.etat, vue: P.vue, resume: P.resume, revision: P.revision, updated_at: P.updated_at, estimations: P.estimations } : null,
    urls: { accueil: "/logiciel-plan-maison", editeur: "/plan", api: "/api/plans", inscription: "/inscription?next=%2Fplan", tarifs: "/tarifs?source=editeur-plan" } };
}
async function ongletSite(S, { site, pro = S.pro, chemin = "/plan", avant = null, ctx = null, largeur = 1400 } = {}) {
  /* un nouveau contexte part d'un stockage vide (et de « avant ») ; un onglet de plus dans le même contexte garde le stockage */
  if (!ctx) { ctx = await b.createBrowserContext(); avant = avant || { "avyora-plan-welcome": "1" }; } else avant = null;
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("site · " + e.message));
  await p.setViewport({ width: largeur, height: 900 });
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin !== HOTE) { r.abort(); return; }
    if (r.isNavigationRequest() && r.frame() === p.mainFrame()) {
      S.nav.push(u.pathname + u.search);
      if (u.pathname === "/plan") { r.respond({ status: 200, contentType: "text/html; charset=utf-8", body: HTML }); return; }
      r.respond({ status: 200, contentType: "text/html", body: "<!doctype html><title>autre page</title>" }); return;
    }
    if (u.pathname.startsWith("/api/plans")) {
      let corps = null; try { corps = r.postData() ? JSON.parse(r.postData()) : null; } catch {}
      S.log.push({ m: r.method(), u: u.pathname, c: corps, t: Date.now() });
      if (S.horsLigne) { r.abort("internetdisconnected"); return; }
      r.respond(S.api(r.method(), u.pathname, corps)); return;
    }
    r.respond({ status: 404, body: "" });
  });
  await p.evaluateOnNewDocument((site, pro, avant) => {
    if (location.pathname !== "/plan") return;
    window.AVYORA_SITE = site; window.AVYORA_PRO = pro; window.open = () => ({});
    window.__ev = []; window.AVYORA_TRACK = (n, d) => window.__ev.push(n);
    try { if (avant && !sessionStorage.getItem("__avant")) { sessionStorage.setItem("__avant", "1"); localStorage.clear(); for (const [k, v] of Object.entries(avant)) localStorage.setItem(k, v); } } catch {}
  }, site, pro, avant);
  await p.goto(HOTE + chemin, { waitUntil: "load" });
  await wait(400);
  return { p, ctx };
}
const patchs = (S) => S.log.filter((x) => x.m === "PATCH");
const posts = (S) => S.log.filter((x) => x.m === "POST");

/* B1–B2 · un plan du compte (schéma ancien) : migré, ouvert ; la sauvegarde groupée porte la révision */
{
  const pf = FIX("plan-final-etage"); const etat = { ...pf, schema: 30 };
  const S = serveur({ plans: [{ id: UUID(1), nom: "Ma maison", workflow: "final_plan", etat, revision: 4 }] });
  const { p, ctx } = await ongletSite(S, { site: siteDe(S, { planId: UUID(1) }), chemin: "/plan?id=" + UUID(1) });
  Object.assign(t, await p.evaluate((id, n) => ({
    "site · plan injecté : ouvert, migré (schéma, type), avec son id et sa révision": state.id === id && state.schema === SCHEMA && estPlanFinal() && state.levels.length === n && siteRev === 4 && state.name === "Ma maison",
    "site · NUAGE : « Mes plans » lit le compte (siteLib), pas avyora-plans": NUAGE === true && Object.keys(loadPlans()).join() === id && localStorage.getItem("avyora-plans") === null,
    "site · l'indicateur dit « Enregistré dans ton compte »": /Enregistré dans ton compte/.test(document.getElementById("saveState").title),
    "site · les textes de Mes plans et de l'accueil disent « ton compte »": /dans ton compte/.test(document.querySelector("#m-plans .modal > .sub").textContent) && /dans ton compte/.test(document.querySelector("#m-welcome .wnote").textContent),
  }), UUID(1), pf.levels.length));
  t["site · rien n'est envoyé à l'ouverture"] = patchs(S).length === 0 && posts(S).length === 0;
  await p.evaluate(() => { state.name = "Ma maison A"; afterChange(); state.name = "Ma maison B"; afterChange(); L().walls.push({ id: "zz9", a: { x: 40, y: 40 }, b: { x: 43, y: 40 }, type: "mur" }); afterChange(); });
  await wait(600);
  t["site · pendant la file, l'indicateur dit « Enregistrement… »"] = await p.evaluate(() => /saving/.test(document.getElementById("saveState").className));
  await wait(2600);
  const P1 = patchs(S);
  t[`site · sauvegarde automatique : un seul PATCH groupé, avec la révision lue (${P1.map((x) => x.c.revision).join(",")})`] = P1.length === 1 && P1[0].c.revision === 4 && P1[0].c.nom === "Ma maison B" && P1[0].c.etat.levels[0].walls.some((w) => w.id === "zz9") && !("force" in P1[0].c);
  Object.assign(t, await p.evaluate((id) => ({
    "site · après le PATCH : révision suivante, indicateur à jour, mémo de révision": siteRev === 5 && /ok/.test(document.getElementById("saveState").className) && JSON.parse(localStorage.getItem("avyora-plan-rev")).rev === 5 && JSON.parse(localStorage.getItem("avyora-plan-rev")).id === id,
  }), UUID(1)));
  await p.evaluate(() => { state.name = "Ma maison C"; afterChange(); });
  await wait(3000);
  t["site · la modification suivante part avec la révision 5"] = patchs(S).length === 2 && patchs(S)[1].c.revision === 5 && S.plans.get(UUID(1)).revision === 6;
  await p.evaluate(() => { const a = L().walls[0].a; a.x += 0.01; afterChange(); view.zoom *= 1.01; });

  /* B3 · un autre appareil a écrit : 409, la fenêtre, « Garder la mienne » (Pro : copie de l'autre) */
  await wait(3000);
  S.plans.get(UUID(1)).revision += 3; S.plans.get(UUID(1)).nom = "Version de l'autre appareil";
  await p.evaluate(() => { state.name = "Ma version"; afterChange(); });
  await wait(3000);
  Object.assign(t, await p.evaluate(() => ({
    "site · 409 : la fenêtre de conflit, deux choix, plus aucune écriture": !!conflitOnglet && conflitOnglet.serveur === true && modaleOuverte()?.id === "m-confirm"
      && /a changé ailleurs/.test(document.getElementById("confirmTitre").textContent)
      && [...document.querySelectorAll("#confirmChoix button")].map((x) => x.textContent).join("|") === "Ouvrir la version enregistrée|Garder la mienne",
    "site · 409 (Pro) : le texte annonce la copie « · autre appareil »": /autre appareil/.test(document.getElementById("confirmTexte").textContent),
    "site · 409 : l'indicateur passe en conflit": /conflit/.test(document.getElementById("saveState").className),
  })));
  await p.evaluate(() => { L().walls.push({ id: "zz8", a: { x: 30, y: 30 }, b: { x: 33, y: 30 }, type: "mur" }); afterChange(); });
  const n409 = patchs(S).length;
  await wait(2800);
  t["site · 409 : tant que l'on n'a pas choisi, plus aucun envoi"] = patchs(S).length === n409;
  await p.evaluate(() => [...document.querySelectorAll("#confirmChoix button")].find((x) => x.textContent === "Garder la mienne").click());
  await wait(800);
  const copie = [...S.plans.values()].find((x) => /autre appareil/.test(x.nom));
  t["site · « Garder la mienne » : l'autre version gardée en copie, la mienne envoyée de force"] = !!copie && copie.nom === "Version de l'autre appareil · autre appareil"
    && patchs(S).length === n409 + 1 && patchs(S).at(-1).c.force === true && S.plans.get(UUID(1)).nom === "Ma version" && await p.evaluate(() => !conflitOnglet && Object.keys(siteLib).length === 2);
  /* puis « Ouvrir la version enregistrée » */
  S.plans.get(UUID(1)).revision += 1;
  await p.evaluate(() => { state.name = "Encore la mienne"; afterChange(); });
  await wait(3000);
  const navAvant = S.nav.length;
  await p.evaluate(() => [...document.querySelectorAll("#confirmChoix button")].find((x) => x.textContent === "Ouvrir la version enregistrée")?.click());
  await wait(1200);
  t["site · « Ouvrir la version enregistrée » : le plan se rouvre par son adresse, le tampon est abandonné"] = S.nav.slice(navAvant).includes("/plan?id=" + UUID(1))
    && await p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem("avyora-plan-v2")); return !s || !s.state || s.state.name !== "Encore la mienne"; } catch { return true; } });
  await ctx.close();
}

/* B4 · hors ligne : l'indicateur, puis le nouvel envoi au retour du réseau ; B4b · tampon modifié renvoyé au chargement */
{
  const etat = FIX("maison");
  const S = serveur({ plans: [{ id: UUID(2), nom: "Maison", workflow: "renovation", etat, revision: 2 }] });
  const site = siteDe(S, { planId: UUID(2) });
  const { p, ctx } = await ongletSite(S, { site, chemin: "/plan?id=" + UUID(2) });
  S.horsLigne = true;
  await p.evaluate(() => { state.name = "Maison hors ligne"; afterChange(); });
  await wait(2800);
  Object.assign(t, await p.evaluate(() => ({
    "site · hors ligne : l'indicateur « Hors connexion », le plan gardé sur cet appareil": /horsligne/.test(document.getElementById("saveState").className)
      && /Pas de connexion : ton plan est gardé sur cet appareil, il partira dès que la connexion revient/.test(document.getElementById("saveState").title)
      && JSON.parse(localStorage.getItem("avyora-plan-v2")).state.name === "Maison hors ligne",
    "site · hors ligne : l'envoi en échec reste en file (beforeunload armé)": siteEchec === true && siteFile.size === 1,
  })));
  S.horsLigne = false;
  await p.evaluate(() => window.dispatchEvent(new Event("online")));
  await wait(800);
  t["site · retour du réseau : le PATCH part, l'indicateur revient à « Enregistré »"] = S.plans.get(UUID(2)).nom === "Maison hors ligne" && S.plans.get(UUID(2)).revision === 3
    && await p.evaluate(() => /ok/.test(document.getElementById("saveState").className) && siteEchec === false);
  /* une modification restée dans le tampon (page fermée hors ligne) : renvoyée au chargement suivant, et dit */
  S.horsLigne = true;
  await p.evaluate(() => { state.name = "Modifiée sans réseau"; afterChange(); });
  await wait(700);
  await p.close();
  S.horsLigne = false;
  const site2 = siteDe(S, { planId: UUID(2) });
  const { p: p2 } = await ongletSite(S, { site: site2, chemin: "/plan?id=" + UUID(2), ctx });
  t["site · tampon modifié, même révision : le plan ouvert est celui du tampon, et le message le dit"] = await p2.evaluate(() => state.name === "Modifiée sans réseau" && /partent dans ton compte/.test(document.getElementById("toast").textContent));
  await wait(2800);
  t["site · …et il part au compte (PATCH sur la révision lue)"] = S.plans.get(UUID(2)).nom === "Modifiée sans réseau" && patchs(S).at(-1).c.revision === 3;
  /* révision dépassée entre-temps (un autre appareil) : la fenêtre de conflit, au départ */
  S.horsLigne = true;
  await p2.evaluate(() => { state.name = "Tampon contre serveur"; afterChange(); });
  await wait(700); await p2.close(); S.horsLigne = false;
  S.plans.get(UUID(2)).revision += 2; S.plans.get(UUID(2)).nom = "Ailleurs";
  const { p: p3 } = await ongletSite(S, { site: siteDe(S, { planId: UUID(2) }), chemin: "/plan?id=" + UUID(2), ctx });
  t["site · tampon modifié sur une révision dépassée : la version du compte s'ouvre, la fenêtre de conflit demande"] = await p3.evaluate(() => state.name === "Ailleurs" && !!conflitOnglet && conflitOnglet.depart === true && modaleOuverte()?.id === "m-confirm");
  await p3.evaluate(() => [...document.querySelectorAll("#confirmChoix button")].find((x) => x.textContent === "Garder la mienne").click());
  await wait(1000);
  t["site · …« Garder la mienne » : le tampon remplace la version du compte"] = S.plans.get(UUID(2)).nom === "Tampon contre serveur" && await p3.evaluate(() => state.name === "Tampon contre serveur" && !conflitOnglet);
  await ctx.close();
}

/* B5–B6 · gratuit : 402 → planPaywall ; ?dev neutralisé ; ?type=renovation refusé (D68) */
{
  const S = serveur({ pro: false, plans: [{ id: UUID(3), nom: "Mon seul plan", workflow: "final_plan", etat: FIX("plan-final-etage"), revision: 1 }] });
  const site = siteDe(S, { type: "renovation" }); site.plans = [];
  const { p, ctx } = await ongletSite(S, { site, pro: false, chemin: "/plan?dev&type=renovation" });
  Object.assign(t, await p.evaluate(() => ({
    "site · ?dev neutralisé (ni isDev, ni html.dev, ni interrupteur Pro)": isDev() === false && !document.documentElement.classList.contains("dev"),
    "site · AVYORA_PRO=false : gratuit, « Passer Pro » vers la page Tarifs": isPro() === false && document.body.classList.contains("gratuit") && !document.getElementById("proTop").hidden,
    "site · ?type=renovation en gratuit : un Plan final, et Pro proposé (D68)": estPlanFinal() && planVide() && /réservé à Pro/.test(document.getElementById("toast").textContent),
  })));
  await p.evaluate(() => { addWall({ x: 0, y: 0 }, { x: 6, y: 0 }); addWall({ x: 6, y: 0 }, { x: 6, y: 5 }); addWall({ x: 6, y: 5 }, { x: 0, y: 5 }); addWall({ x: 0, y: 5 }, { x: 0, y: 0 }); afterChange(); });
  await wait(1500);
  t["site · 402 (le compte a déjà son plan) : la fenêtre de la limite gratuite, le plan reste sur l'appareil"] = posts(S).length === 1
    && await p.evaluate(() => modaleOuverte()?.id === "m-plans" && /Version gratuite/.test(document.getElementById("toast").textContent) && Object.keys(siteLib).length === 0 && siteProp());
  await wait(1200);
  t["site · après un 402 : aucun nouvel essai à chaque modification"] = await p.evaluate(() => { state.name = "X"; afterChange(); return true; }) && (await wait(1200), posts(S).length === 1);
  await ctx.close();
}

/* B7 · ouvrir, dupliquer, supprimer et « Annuler » (Pro) */
{
  const S = serveur({ plans: [
    { id: UUID(4), nom: "Ouvert", workflow: "final_plan", etat: FIX("plan-final-etage"), revision: 1, apercu: [[0, 0, 5, 0, "mur", ""], [5, 0, 5, 4, "mur", ""]] },
    { id: UUID(5), nom: "Autre", workflow: "renovation", etat: FIX("t2"), revision: 7, apercu: [[0, 0, 4, 0, "mur", ""], [4, 0, 4, 3, "cloison", "creer"]], resume: { m2: 41.2, pieces: 2 } } ] });
  const { p, ctx } = await ongletSite(S, { site: siteDe(S, { planId: UUID(4) }), chemin: "/plan?id=" + UUID(4) });
  Object.assign(t, await p.evaluate((a) => {
    openPlansModal(); const L = document.getElementById("plansList");
    return { "site · Mes plans : les cartes du compte, l'autre en ébauche (vignette tracée depuis l'aperçu)": L.querySelectorAll(".plancard").length === 2 && /Autre/.test(L.innerText) && L.querySelectorAll(".plancard")[1].querySelectorAll("line").length === 2 && siteLib[a].ebauche === true };
  }, UUID(5)));
  await p.evaluate((a) => openSavedPlan(a), UUID(5));
  await wait(900);
  t["site · ouvrir un plan du compte : par son adresse /plan?id="] = S.nav.at(-1) === "/plan?id=" + UUID(5);
  const { p: q } = await ongletSite(S, { site: siteDe(S, { planId: UUID(4) }), chemin: "/plan?id=" + UUID(4), ctx });
  await q.evaluate((a) => duplicateSavedPlan(a), UUID(5));
  await wait(700);
  const cop = [...S.plans.values()].find((x) => x.nom === "Autre (copie)");
  t["site · dupliquer (ébauche) : l'état est lu au compte (GET), la copie créée (POST), rangée"] = !!cop && S.log.some((x) => x.m === "GET" && x.u === "/api/plans/" + UUID(5)) && cop.etat.levels.length === FIX("t2").levels.length
    && await q.evaluate((id) => !!siteLib[id] && /Copie créée/.test(document.getElementById("toast").textContent), cop.id);
  await q.evaluate((id) => { openPlansModal(); deleteSavedPlan(id); }, cop.id);
  await wait(300);
  t["site · supprimer : rien ne part tout de suite, « Annuler » proposé"] = !S.log.some((x) => x.m === "DELETE") && await q.evaluate(() => !!document.querySelector("#toast .tact"));
  await q.evaluate(() => document.querySelector("#toast .tact").click());
  await wait(8600);
  t["site · « Annuler » : le DELETE en file est annulé, le plan revient"] = !S.log.some((x) => x.m === "DELETE") && S.plans.has(cop.id) && await q.evaluate((id) => !!siteLib[id], cop.id);
  await q.evaluate((id) => { openPlansModal(); deleteSavedPlan(id); }, cop.id);
  await wait(8600);
  t["site · supprimer sans annuler : le DELETE part à 8 s"] = S.log.filter((x) => x.m === "DELETE").length === 1 && !S.plans.has(cop.id) && await q.evaluate((id) => !siteLib[id], cop.id);
  /* B8 · le lien neuf (NUAGE) : &pid= avant #plan= */
  await q.evaluate(() => { closeModal(); chargerModele(TEMPLATES.find((x) => x.id === "maison"), null, null, WORKFLOW_FINAL); state.name = "Maison à chiffrer"; afterChange(); });
  await wait(1500);
  const lien = await q.evaluate(() => ({ u: lienConstruction(), id: state.id }));
  t["site · lien neuf d'un plan du compte : &pid=<uuid> puis #plan="] = !!lien.u && /^[0-9a-f-]{36}$/.test(lien.id) && lien.u.includes("&pid=" + lien.id + "#plan=") && lien.u.startsWith("https://getavyora.fr/estimation-construction-maison?source=editeur-plan&pid=");
  /* B9 · le logo ramène au site, après la file */
  await q.evaluate(() => { state.name = "Avant le logo"; afterChange(); });
  const nAv = patchs(S).length;
  await q.evaluate(() => document.querySelector(".top a.brand").click());
  await wait(1500);
  t["site · logo : un lien vers /logiciel-plan-maison, la file vidée avant de partir"] = S.nav.at(-1) === "/logiciel-plan-maison" && patchs(S).length === nAv + 1 && patchs(S).at(-1).c.nom === "Avant le logo";
  await ctx.close();
}

/* B10 · anonyme sur le site : mode local, invitation après la première pièce seulement, &pl= */
{
  const S = serveur({ pro: false });
  const site = siteDe(S, { connecte: false });
  const { p, ctx } = await ongletSite(S, { site, pro: false });
  Object.assign(t, await p.evaluate(() => ({
    "anonyme · SITE sans NUAGE : Mes plans en local, aucune invitation avant un dessin": !!SITE && NUAGE === false && !document.getElementById("siteInvite") && /sur cet appareil/.test(document.querySelector("#m-plans .modal > .sub").textContent),
  })));
  await p.evaluate(() => { addWall({ x: 0, y: 0 }, { x: 4, y: 0 }); addWall({ x: 4, y: 0 }, { x: 4, y: 3 }); });
  await wait(1000);
  t["anonyme · deux murs (pas encore de pièce) : pas d'invitation"] = await p.evaluate(() => !document.getElementById("siteInvite"));
  await p.evaluate(() => { addWall({ x: 4, y: 3 }, { x: 0, y: 3 }); addWall({ x: 0, y: 3 }, { x: 0, y: 0 }); });
  await wait(1100);
  Object.assign(t, await p.evaluate(() => {
    const c = document.getElementById("siteInvite");
    return { "anonyme · la première pièce : l'invitation, ses deux choix": window.__ev.includes("premiere_piece") && !!c && /Garde ce plan dans ton compte : tu le retrouves sur tous tes appareils\./.test(c.innerText)
      && [...c.querySelectorAll("button")].map((x) => x.textContent).join("|") === "Créer mon compte gratuit|Plus tard" };
  }));
  await p.evaluate(() => document.querySelector("#siteInvite button:last-child").click());
  await p.evaluate(() => { suivre("premiere_piece", {}); });
  await wait(1100);
  t["anonyme · « Plus tard » : fermée, et plus jamais pour ce plan"] = await p.evaluate(() => !document.getElementById("siteInvite") && JSON.parse(localStorage.getItem("avyora-plan-invite")).includes(state.id));
  await p.evaluate(() => { closeModal(); chargerModele(TEMPLATES.find((x) => x.id === "maison"), null, null, WORKFLOW_FINAL); afterChange(); });
  const lien = await p.evaluate(() => { chiffrerConstruction(document.getElementById("constructionBtn"), "menu"); return { u: lienConstruction(), id: state.id }; });
  t["anonyme · lien neuf : &pl=<id local> puis #plan="] = !!lien.u && /^[a-z0-9]{1,24}$/.test(lien.id) && lien.u.includes("&pl=" + lien.id + "#plan=");
  t["anonyme · aucun appel à l'API des plans (hors session)"] = S.log.every((x) => x.u === "/api/plans/session");
  await p.evaluate(() => { newPlan(undefined, WORKFLOW_FINAL); addWall({ x: 0, y: 0 }, { x: 4, y: 0 }); addWall({ x: 4, y: 0 }, { x: 4, y: 3 }); addWall({ x: 4, y: 3 }, { x: 0, y: 3 }); addWall({ x: 0, y: 3 }, { x: 0, y: 0 }); });
  await wait(1100);
  await p.evaluate(() => document.querySelector("#siteInvite button.primary")?.click());
  await wait(500);
  t["anonyme · « Créer mon compte gratuit » : le drapeau de reprise posé, direction l'inscription"] = S.nav.at(-1) === "/inscription?next=%2Fplan"
    && await p.evaluate(() => { const f = localStorage.getItem("avyora-plan-claim"); const s = JSON.parse(localStorage.getItem("avyora-plan-v2")); return !!f && s.state.id === f; });
  await ctx.close();
}

/* B11 · connecté, des plans sur cet appareil : la reprise par drapeau, « Sur cet appareil », jamais automatique sinon */
{
  const local = FIX("studio"), autre = FIX("t3");
  const buf = { ...local, id: "abc123", name: "Studio dessiné avant", origine: undefined };
  const libLocale = { loc9: { id: "loc9", name: "T3 de cet appareil", savedAt: 1, state: { ...autre, id: "loc9", origine: undefined }, view: null, resume: null } };
  const S = serveur({ pro: true });
  const avant = { "avyora-plan-welcome": "1", "avyora-plan-v2": JSON.stringify({ state: buf, view: null, onglet: "x" }), "avyora-plans": JSON.stringify(libLocale), "avyora-plan-claim": "abc123" };
  const { p, ctx } = await ongletSite(S, { site: siteDe(S), avant });
  await wait(800);
  const P0 = posts(S);
  t["reprise · drapeau : le plan demandé part au compte (POST avec editeurId), le drapeau est retiré"] = P0.length === 1 && P0[0].c.editeurId === "abc123" && P0[0].c.nom === "Studio dessiné avant"
    && await p.evaluate(() => /^[0-9a-f-]{36}$/.test(state.id) && localStorage.getItem("avyora-plan-claim") === null && /est dans ton compte/.test(document.getElementById("toast").textContent));
  Object.assign(t, await p.evaluate(() => {
    openPlansModal(); const L = document.getElementById("plansList"), s = document.getElementById("siteLocaux");
    return { "reprise · « Sur cet appareil (1) » : l'autre plan local, avec « Ajouter à mon compte »": !!s && s.textContent === "Sur cet appareil (1)" && /T3 de cet appareil/.test(L.innerText) && [...L.querySelectorAll("button")].some((x) => x.textContent === "Ajouter à mon compte") };
  }));
  await p.evaluate(() => [...document.querySelectorAll("#plansList button")].find((x) => x.textContent === "Ajouter à mon compte").click());
  await wait(700);
  t["reprise · « Ajouter à mon compte » : POST avec editeurId, retiré de cet appareil"] = posts(S).length === 2 && posts(S)[1].c.editeurId === "loc9"
    && await p.evaluate(() => !JSON.parse(localStorage.getItem("avyora-plans") || "{}").loc9 && Object.keys(siteLib).length === 2 && !document.getElementById("siteLocaux"));
  await ctx.close();
  /* sans drapeau : proposé, jamais envoyé seul */
  const S2 = serveur({ pro: true });
  const { p: p2, ctx: c2 } = await ongletSite(S2, { site: siteDe(S2), avant: { "avyora-plan-welcome": "1", "avyora-plan-v2": JSON.stringify({ state: buf, view: null, onglet: "x" }) } });
  await p2.evaluate(() => { state.name = "Studio retouché"; afterChange(); });
  await wait(2800);
  t["reprise · sans drapeau : le plan local est proposé (message), rien n'est envoyé, même après une retouche"] = posts(S2).length === 0
    && await p2.evaluate(() => siteProp() && /Enregistré sur cet appareil/.test(document.getElementById("saveState").title));
  await p2.evaluate(() => { history.push(snapshot()); state.name = "Studio retouché 2"; afterChange(); });
  await wait(600);
  await p2.evaluate(() => undo());
  await wait(2800);
  t["reprise · plan local proposé, une modification puis Annuler : toujours proposé, aucun POST"] = posts(S2).length === 0
    && await p2.evaluate(() => siteProp() && state.name === "Studio retouché" && Object.keys(siteLib).length === 0);
  await p2.evaluate(() => newPlan(undefined, WORKFLOW_FINAL));
  await wait(400);
  t["reprise · un nouveau plan : le plan local reste sur cet appareil (Sur cet appareil), pas dans le compte"] = posts(S2).length === 0
    && await p2.evaluate(() => !!JSON.parse(localStorage.getItem("avyora-plans")).abc123 && planVide());
  await p2.evaluate(() => { addWall({ x: 0, y: 0 }, { x: 4, y: 0 }); addWall({ x: 4, y: 0 }, { x: 4, y: 3 }); addWall({ x: 4, y: 3 }, { x: 0, y: 3 }); addWall({ x: 0, y: 3 }, { x: 0, y: 0 }); });
  await wait(1200);
  await wait(2600);
  t["reprise · un plan dessiné connecté : rangé d'office dans le compte, l'indicateur revient à « Enregistré dans ton compte »"] = posts(S2).length === 1
    && await p2.evaluate(() => /^[0-9a-f-]{36}$/.test(state.id) && !!siteLib[state.id] && siteFile.size === 0 && /ok/.test(document.getElementById("saveState").className) && /dans ton compte/.test(document.getElementById("saveState").title));
  await c2.close();
}

/* B12 · données hostiles venues du serveur ; B14 · estimations reliées ; B15 · retour Pro */
{
  const S = serveur({ pro: false, plans: [{ id: UUID(8), nom: "Maison", workflow: "final_plan", etat: FIX("plan-final-etage"), revision: 1,
    estimations: [{ id: UUID(80), nom: "Construction", nature: "neuf", created_at: "2026-10-18T10:00:00Z" }] }] });
  const site = siteDe(S, { planId: UUID(8) });
  site.plans.push({ id: "a'b", nom: "x", workflow: "final_plan", apercu: [], revision: 1 });
  site.plans.push({ id: UUID(9), nom: "<img src=x onerror=window.__pwn=1>", workflow: 'final_plan" onclick="x', revision: 1, updated_at: "x",
    apercu: [['0" onload="window.__pwn=1', 0, 1, 1, 'mur" onclick="window.__pwn=1', '"><script>window.__pwn=1</script>']], resume: { m2: '9"><img src=x onerror=window.__pwn=1>', pieces: 2, prochain: "<b>x</b>" } });
  const { p, ctx } = await ongletSite(S, { site, pro: false, chemin: "/plan?id=" + UUID(8) });
  await wait(300);
  Object.assign(t, await p.evaluate(() => {
    openPlansModal(); const L = document.getElementById("plansList");
    const evts = [...L.querySelectorAll("*")].flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => a.value));
    return { "site · données hostiles du serveur : id hors uuid écarté, aucun attribut ni balise injectés": !siteLib["a'b"] && !L.querySelector("img,script,b b")
      && evts.every((v) => /^(openSavedPlan|duplicateSavedPlan|deleteSavedPlan)\('[A-Za-z0-9_-]*'\)$|^suivre\(/.test(v)) && window.__pwn === undefined };
  }));
  await p.evaluate(() => closeModal());
  Object.assign(t, await p.evaluate((e) => {
    renderPanel(); const a = [...document.querySelectorAll(".siteestim a")];
    return { "site · estimations reliées : une ligne par estimation, sous le récapitulatif, vers /projets/<id>": a.length === 1 && a[0].getAttribute("href") === "/projets/" + e && /^Construction · 18 oct\./.test(a[0].innerText.trim()) && !/→/.test(a[0].innerText) };
  }, UUID(80)));
  S.pro = true;
  await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await wait(500);
  t["site · retour de l'onglet Tarifs : la session relue, Pro appliqué sans recharger"] = await p.evaluate(() => window.AVYORA_PRO === true && isPro() && !document.body.classList.contains("gratuit"));
  await ctx.close();
}

/* B13 · rénovation (Pro) : « Créer l'estimation détaillée » envoie le contrat avec la révision, puis la validation ; gratuit : avec Pro */
{
  const S = serveur({ plans: [{ id: UUID(6), nom: "Appart", workflow: "renovation", etat: FIX("exemple"), revision: 3 }] });
  const { p, ctx } = await ongletSite(S, { site: siteDe(S, { planId: UUID(6) }), chemin: "/plan?id=" + UUID(6) });
  const btn = await p.evaluate(() => { showEstimate(); return [...document.querySelectorAll("#estBody .estactions button")].map((x) => x.textContent); });
  t["rénovation · Pro : « Créer l'estimation détaillée » dans le pied d'Estimer"] = btn.includes("Créer l'estimation détaillée");
  await p.evaluate(() => [...document.querySelectorAll("#estBody .estactions button")].find((x) => x.textContent === "Créer l'estimation détaillée").click());
  await wait(1500);
  const pc = patchs(S).at(-1);
  t["rénovation · le contrat part (PATCH, révision lue), puis /projets/depuis-plan/<id>"] = !!pc && !!pc.c.contrat && pc.c.contrat.workflow === "renovation" && pc.c.revision === 3 && S.nav.at(-1) === "/projets/depuis-plan/" + UUID(6);
  await ctx.close();
  /* C8 · ouvert depuis la fiche d'une estimation (« Mettre à jour ») : ?projet= suit jusqu'à la validation */
  const S3 = serveur({ plans: [{ id: UUID(6), nom: "Appart", workflow: "renovation", etat: FIX("exemple"), revision: 3 }] });
  const { p: p3, ctx: c3 } = await ongletSite(S3, { site: siteDe(S3, { planId: UUID(6) }), chemin: "/plan?id=" + UUID(6) + "&projet=" + UUID(60) });
  await p3.evaluate(() => { showEstimate(); [...document.querySelectorAll("#estBody .estactions button")].find((x) => /estimation/.test(x.textContent)).click(); });
  await wait(1500);
  t["rénovation · ouvert avec &projet= : la validation vise cette estimation (/projets/depuis-plan/<id>?projet=<id>)"] = S3.nav.at(-1) === "/projets/depuis-plan/" + UUID(6) + "?projet=" + UUID(60);
  await c3.close();
  const S2 = serveur({ pro: false, plans: [{ id: UUID(7), nom: "Appart", workflow: "renovation", etat: FIX("exemple"), revision: 1 }] });
  const { p: p2, ctx: c2 } = await ongletSite(S2, { site: siteDe(S2, { planId: UUID(7) }), pro: false, chemin: "/plan?id=" + UUID(7) });
  const b2 = await p2.evaluate(() => { showEstimate(); return { h: document.getElementById("estBody").innerHTML, est: voitTout() }; });
  t["rénovation · gratuit : jamais « Créer l'estimation détaillée » (avec Pro)"] = !/Créer l'estimation détaillée/.test(b2.h) && (!b2.est || /avec Pro/.test(b2.h));
  await c2.close();
}

/* B16 · supprimer le plan ouvert : il reste ouvert sur cet appareil ; ni une modification ni Annuler (Ctrl+Z) ne le
   remettent dans le compte ; « Annuler » du message lui rend son id du compte */
{
  const S = serveur({ plans: [{ id: UUID(10), nom: "À supprimer", workflow: "final_plan", etat: FIX("plan-final-etage"), revision: 2 },
    { id: UUID(12), nom: "Gardé", workflow: "final_plan", etat: FIX("plan-final-etage"), revision: 1 }] });
  const { p, ctx } = await ongletSite(S, { site: siteDe(S, { planId: UUID(10) }), chemin: "/plan?id=" + UUID(10) });
  await p.evaluate((id) => { openPlansModal(); deleteSavedPlan(id); closeModal(); }, UUID(10));
  await wait(8600);
  t["suppression · le plan ouvert supprimé : DELETE à 8 s, il reste ouvert sous un id local, proposé"] = S.log.filter((x) => x.m === "DELETE").length === 1 && !S.plans.has(UUID(10))
    && await p.evaluate(() => /^[a-z0-9]{1,24}$/.test(state.id) && siteProp() && sortDuPlanOuvert() === "appareil");
  await p.evaluate(() => { history.push(snapshot()); state.name = "Modifié après suppression"; afterChange(); });
  await wait(2800);
  t["suppression · une modification ensuite : aucun POST"] = posts(S).length === 0;
  await p.evaluate(() => undo());
  await wait(2800);
  t["suppression · une modification puis Annuler (Ctrl+Z) : aucun POST, le plan n'est pas ressuscité"] = posts(S).length === 0 && !S.plans.has(UUID(10))
    && await p.evaluate((id) => siteProp() && !siteLib[id] && Object.keys(siteLib).length === 1, UUID(10));
  await ctx.close();
  const { p: q, ctx: c2 } = await ongletSite(S, { site: siteDe(S, { planId: UUID(12) }), chemin: "/plan?id=" + UUID(12) });
  await q.evaluate((id) => { openPlansModal(); deleteSavedPlan(id); closeModal(); }, UUID(12));
  await wait(300);
  await q.evaluate(() => document.querySelector("#toast .tact").click());
  await q.evaluate(() => { state.name = "Gardé et retouché"; afterChange(); });
  await wait(8800);
  t["suppression · « Annuler » du message : le plan ouvert reprend son id du compte, le PATCH part, aucun DELETE ni POST"] = S.plans.has(UUID(12)) && S.plans.get(UUID(12)).nom === "Gardé et retouché"
    && S.log.filter((x) => x.m === "DELETE").length === 1 && posts(S).length === 0 && await q.evaluate((id) => state.id === id && !!siteLib[id] && !siteProp(), UUID(12));
  await c2.close();
}

/* B17 · « Chiffrer cette maison » pendant que le plan entre dans le compte : le lien attend l'uuid (&pid=) */
{
  const S = serveur({ pro: true });
  const { p, ctx } = await ongletSite(S, { site: siteDe(S) });
  const r = await p.evaluate(() => {
    window.__w = {}; window.open = () => window.__w;
    chargerModele(TEMPLATES.find((x) => x.id === "maison"), null, null, WORKFLOW_FINAL); state.name = "Maison pressée"; afterChange();
    const suit = chiffrerConstruction(document.getElementById("constructionBtn"), "menu");
    return { suit, enVol: Object.keys(siteCrea).length };
  });
  await wait(1200);
  const w = await p.evaluate(() => ({ u: String(window.__w.location || ""), id: state.id }));
  t["neuf · clic pendant le POST : l'onglet attend la création, le lien porte &pid=<uuid>, jamais l'id local"] = r.suit === false && r.enVol === 1 && posts(S).length === 1
    && /^[0-9a-f-]{36}$/.test(w.id) && w.u.includes("&pid=" + w.id + "#plan=") && !/&pl=/.test(w.u);
  await ctx.close();
}

/* B18 · anonyme sur un appareil partagé : un plan du compte resté dans le tampon ne s'affiche pas */
{
  const S = serveur({ pro: false });
  const tampon = { state: { ...FIX("maison"), id: UUID(13), name: "Plan d'un compte" }, view: null };
  const { p, ctx } = await ongletSite(S, { site: siteDe(S, { connecte: false }), pro: false, avant: { "avyora-plan-welcome": "1", "avyora-plan-v2": JSON.stringify(tampon) } });
  t["anonyme · tampon portant un plan du compte (uuid) : ignoré, l'éditeur s'ouvre sur un plan vide"] = await p.evaluate((id) => state.id !== id && state.name !== "Plan d'un compte" && planVide(), UUID(13));
  await ctx.close();
}

let ko = 0;
for (const [k, ok] of Object.entries(t)) { if (!ok) ko++; console.log((ok ? "  ✓ " : "  ✗ ") + k); }
console.log(`${Object.keys(t).length - ko}/${Object.keys(t).length} contrôles verts` + (errs.length ? ` · erreurs de page : ${[...new Set(errs)].join(" | ")}` : ""));
await b.close();
process.exit(ko || errs.length ? 1 : 0);
