/**
 * C4 · L'éditeur HÉBERGÉ par le site sur /plan : la page réellement servie par `next start` (transformée au build par
 * lib/editeur/heberger.ts), et pas le fichier source. Il faut donc un serveur, interrupteur allumé :
 *
 *   NEXT_PUBLIC_FEATURE_PLANS=1 npm run build && NEXT_PUBLIC_FEATURE_PLANS=1 npx next start -p 3014
 *   node maquettes/tools/heberge.mjs "$(pwd)/maquettes" http://localhost:3014 [--captures <dossier>]
 *
 * Sans adresse (la batterie lance chaque outil avec le seul dossier maquettes), il ne fait rien et sort en 0.
 *
 * Contrôles :
 *   - les en-têtes : /plan porte la CSP de l'éditeur (sans balise Ads, sans Supabase, connect-src 'self') et
 *     X-Robots-Tag noindex, aussi avec ?id= ; / garde la CSP du site ; /vendor et /fonts sont servis ;
 *   - anonyme : l'éditeur démarre (setMode, voile retiré), zéro erreur de page, ZÉRO violation CSP, aucune requête hors
 *     de l'origine ; Pro à false ; ?dev sans effet ; « Passer Pro » vers /tarifs?source=editeur-plan ; le lien vers la
 *     construction relatif ; les polices chargées depuis /fonts ; la 3D ouverte depuis /vendor (pixels ni noirs ni vides) ;
 *   - l'amorçage, l'API des plans simulée par interception (aucun compte, aucune requête ne part vers la vraie API) :
 *     connecté et Pro, le plan ?id= ouvert depuis le compte ; plan introuvable (404) ; session en panne (500) et délai
 *     dépassé : le mode local et un message ; anonyme avec ?id= : un message ; ?type=final ; réseau bridé (1,6 Mb/s) :
 *     l'éditeur ne démarre qu'une fois la page lue ;
 *   - ordinateur 1 440 px, tablette 768 px, téléphone 375 px : la page démarre sans erreur.
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
const SP = process.argv[2];
const BASE = (process.argv[3] || "").replace(/\/$/, "");
if (!SP) { console.error("usage : node maquettes/tools/heberge.mjs <dossier maquettes> [http://localhost:3014]"); process.exit(2); }
if (!/^https?:\/\//.test(BASE)) { console.log("heberge : sans adresse de serveur, rien à contrôler (voir l'en-tête du fichier)"); process.exit(0); }
const iCap = process.argv.indexOf("--captures"), CAP = iCap > 0 ? process.argv[iCap + 1] : null;
if (CAP) fs.mkdirSync(CAP, { recursive: true });
setTimeout(() => { console.log("heberge : délai dépassé (300 s)"); process.exit(3); }, 300000);
const FIX = (n) => JSON.parse(fs.readFileSync(path.join(SP, "..", "tests", "fixtures", "plans-etats", n + ".json"), "utf8"));
const t = {}, errs = [], wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ORIGINE = new URL(BASE).origin;

/* ═════════ 1. Les en-têtes ═════════ */
const ent = async (chemin) => { const r = await fetch(BASE + chemin, { redirect: "manual" }); await r.arrayBuffer(); return r; };
{
  const ed = await ent("/plan"), edId = await ent("/plan?id=00000000-0000-4000-8000-000000000001&dev"), site = await ent("/");
  const csp = ed.headers.get("content-security-policy") || "", cspSite = site.headers.get("content-security-policy") || "";
  t["en-têtes · /plan répond 200 en text/html"] = ed.status === 200 && /^text\/html/.test(ed.headers.get("content-type") || "");
  t["en-têtes · /plan : la CSP de l'éditeur (connect-src 'self' sans Supabase, ni balise Ads, ni origine tierce hors mesure Vercel)"] =
    /connect-src 'self' https:\/\/va\.vercel-scripts\.com(;|$)/.test(csp) && /script-src 'self' 'unsafe-inline' https:\/\/va\.vercel-scripts\.com(;|$)/.test(csp)
    && /font-src 'self'(;|$)/.test(csp) && /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp)
    && !/googletagmanager|doubleclick|supabase|jsdelivr|googleapis/.test(csp);
  t["en-têtes · /plan : X-Robots-Tag noindex"] = /noindex/.test(ed.headers.get("x-robots-tag") || "");
  t["en-têtes · /plan?id=…&dev : la même CSP, le même noindex"] = edId.headers.get("content-security-policy") === csp && /noindex/.test(edId.headers.get("x-robots-tag") || "");
  t["en-têtes · / garde la CSP du site (balise Ads permise), différente de celle de l'éditeur"] = /googletagmanager/.test(cspSite) && cspSite !== csp && !/noindex/.test(site.headers.get("x-robots-tag") || "");
  t["en-têtes · /plan garde les autres en-têtes de sécurité (DENY, nosniff)"] = ed.headers.get("x-frame-options") === "DENY" && ed.headers.get("x-content-type-options") === "nosniff";
  const fic = ["/vendor/three@0.147.0/build/three.min.js", "/vendor/three@0.147.0/examples/js/controls/OrbitControls.js", "/fonts/geist/Geist-Variable.woff2", "/fonts/geist/GeistMono-Variable.woff2"];
  const R = await Promise.all(fic.map(ent));
  t["fichiers · /vendor (Three.js) et /fonts (Geist) servis en 200, avec le bon type"] = R.every((r) => r.status === 200)
    && R.slice(0, 2).every((r) => /javascript/.test(r.headers.get("content-type") || "")) && R.slice(2).every((r) => /font\/woff2/.test(r.headers.get("content-type") || ""));
  const html = await (await fetch(BASE + "/plan")).text();
  t["page · aucune origine externe dans le HTML servi (ni Google Fonts, ni jsDelivr, ni getavyora.fr en absolu)"] = !/fonts\.googleapis|cdn\.jsdelivr|https:\/\/getavyora\.fr\//.test(html);
  t["page · Pro à false avant le script différé, un seul script différé"] = html.indexOf("window.AVYORA_PRO=false;") > 0
    && html.indexOf("window.AVYORA_PRO=false;") < html.indexOf('<script type="text/plain" id="avyora-editeur">') && (html.match(/type="text\/plain"/g) || []).length === 1;
}

/* ═════════ 2. Le navigateur ═════════ */
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

/* un onglet neuf ; api : une fonction (méthode, chemin) → réponse simulée, ou null pour laisser la vraie API répondre */
async function onglet(chemin, { api = null, largeur = 1440, hauteur = 900, mobile = false, nom = "" } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const o = { p, ctx, req: [], csp: [], console: [], appels: [] };
  p.on("pageerror", (e) => errs.push(`${nom || chemin} · ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error") o.console.push(m.text()); });
  p.on("requestfinished", (r) => o.req.push({ u: r.url(), s: r.response() ? r.response().status() : 0 }));
  p.on("requestfailed", (r) => o.req.push({ u: r.url(), s: -1 }));
  await p.setViewport({ width: largeur, height: hauteur, isMobile: mobile, hasTouch: mobile });
  await p.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    window.open = (u) => { window.__ouvert = String(u || ""); return { location: "", opener: null, close() {} }; };
    try { localStorage.setItem("avyora-plan-welcome", "1"); } catch {}
  });
  if (api) {
    await p.setRequestInterception(true);
    p.on("request", (r) => {
      const u = new URL(r.url());
      if (u.origin === ORIGINE && u.pathname.startsWith("/api/plans")) {
        o.appels.push(`${r.method()} ${u.pathname}`);
        const rep = api(r.method(), u.pathname);
        /* jamais la vraie API : une réponse simulée, ou 503 */
        if (rep && rep.attendre) return; /* laissée en suspens (délai dépassé) */
        return r.respond(rep || { status: 503, contentType: "application/json", body: "{}" });
      }
      r.continue();
    });
  }
  await p.goto(BASE + chemin, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => typeof setMode === "function" && !document.getElementById("avyora-voile"), { timeout: 20000 });
  await wait(400);
  o.etat = () => p.evaluate(() => ({ csp: window.__csp.slice() }));
  return o;
}
const json = (status, j) => ({ status, contentType: "application/json", body: JSON.stringify(j) });
const horsOrigine = (o) => o.req.filter((x) => !/^(data|blob):/.test(x.u) && new URL(x.u).origin !== ORIGINE).map((x) => x.u);

/* 2a. anonyme, la vraie API (session sans compte) */
{
  const o = await onglet("/plan", { nom: "anonyme" });
  const { p } = o;
  const r = await p.evaluate(() => ({ pro: window.AVYORA_PRO, site: !!SITE, nuage: NUAGE, connecte: SITE && SITE.connecte, dev: isDev(),
    urls: SITE && SITE.urls, tarifs: TARIFS_URL, constr: CONSTRUCTION_URL, three: V3_THREE, prix: PRIX_PRO,
    proTop: document.getElementById("proTop") && document.getElementById("proTop").getAttribute("href"), proTopVis: !document.getElementById("proTop").hidden }));
  t["anonyme · l'éditeur démarre (setMode), le voile est retiré"] = true;
  t["anonyme · le mode site est posé, sans compte (connecte false, pas de NUAGE)"] = r.site && r.connecte === false && r.nuage === false;
  t["anonyme · AVYORA_PRO === false sans session"] = r.pro === false;
  t["anonyme · ?dev neutralisé (isDev() faux)"] = r.dev === false;
  t["anonyme · adresses relatives : TARIFS_URL, CONSTRUCTION_URL, V3_THREE vers /vendor"] = r.tarifs === "/tarifs?source=editeur-plan"
    && r.constr === "/estimation-construction-maison?source=editeur-plan" && r.three === "/vendor/three@0.147.0/";
  t[`anonyme · le prix Pro vient du site (${r.prix})`] = /^dès \d+,\d{2} € par mois, sans engagement$/.test(r.prix);
  t["anonyme · « Passer Pro » visible, vers /tarifs?source=editeur-plan"] = r.proTop === "/tarifs?source=editeur-plan" && r.proTopVis;
  const ap = await p.evaluate(async () => {
    closeModal(); chargerModele(TEMPLATES.find((x) => x.id === "maison"), null, null, WORKFLOW_FINAL); afterChange();
    /* le clic sur « Chiffrer cette maison » (window.open simulé) : le plan reçoit son id local */
    chiffrerConstruction(document.getElementById("constructionBtn"), "menu");
    return { u: lienConstruction(), id: state.id, ouvert: window.__ouvert || "" };
  });
  t["anonyme · lien vers la construction relatif, avec &pl=<id local> puis #plan="] = !!ap.u && ap.u.startsWith("/estimation-construction-maison?source=editeur-plan&pl=" + ap.id + "#plan=");
  /* les polices */
  const pol = await p.evaluate(async () => { await document.fonts.ready; return { sans: document.fonts.check('500 14px "Geist"'), mono: document.fonts.check('600 14px "Geist Mono"'),
    chargees: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "")) }; });
  const reqPol = o.req.filter((x) => /\/fonts\/geist\/.+\.woff2$/.test(x.u));
  t[`polices · Geist et Geist Mono chargées depuis /fonts (${[...new Set(pol.chargees)].join(", ")})`] = pol.sans && pol.mono && pol.chargees.includes("Geist") && pol.chargees.includes("Geist Mono")
    && reqPol.length >= 2 && reqPol.every((x) => x.s === 200 && new URL(x.u).origin === ORIGINE);
  /* la 3D, depuis /vendor */
  await p.evaluate(() => { closeModal(); loadSample(); closeModal(); setMode("projet"); closeModal(); render(); });
  const avant3D = await p.evaluate(() => typeof window.THREE);
  await p.evaluate(() => v3Ouvrir());
  const e3 = await p.waitForFunction(() => (v3Etat().pret && v3.etat !== "charge" && !v3.anim) || v3.etat === "reseau" || v3.etat === "webgl", { timeout: 60000 })
    .then(() => p.evaluate(() => (v3.etat === "reseau" || v3.etat === "webgl" ? v3.etat : "pret")));
  await wait(600);
  const px = e3 === "pret" ? await p.evaluate(() => { v3ChoisirCoupe(1.2); v3Rafraichir(); v3Cadrer(); return v3Pixels(); }) : null;
  const req3 = o.req.filter((x) => /three|OrbitControls/i.test(x.u));
  t[`3D · Three.js chargé à l'ouverture seulement, depuis /vendor (${req3.map((x) => new URL(x.u).pathname + " " + x.s).join(", ")})`] = avant3D === "undefined" && e3 === "pret"
    && req3.length === 2 && req3.every((x) => x.s === 200 && new URL(x.u).pathname.startsWith("/vendor/three@0.147.0/"));
  t[`3D · capture WebGL ni noire ni vide (moyenne ${px && Math.round(px.moyenne)}, fond ${px && Math.round(px.fond * 100)} %, encre ${px && (px.encre * 100).toFixed(1)} %)`] =
    !!px && px.noirs < 0.01 && px.moyenne > 80 && px.fond < 0.95 && px.encre > 0.002;
  if (CAP) await p.screenshot({ path: path.join(CAP, "3d-1440.png") });
  await p.evaluate(() => v3Fermer());
  /* « Passer Pro » au clic : un nouvel onglet vers les tarifs, sur la même origine */
  const cible = new Promise((res) => { b.once("targetcreated", (x) => res(x)); setTimeout(() => res(null), 4000); });
  await p.evaluate(() => { document.getElementById("proTop").click(); });
  const tg = await cible;
  let u = tg && tg.url();
  for (let i = 0; tg && i < 30 && (!u || u === "about:blank"); i++) { await wait(100); u = tg.url(); }
  t[`anonyme · clic « Passer Pro » : /tarifs?source=editeur-plan sur la même origine (${u})`] = !!u && u === ORIGINE + "/tarifs?source=editeur-plan";
  const { csp } = await o.etat();
  t[`anonyme · zéro violation CSP (chargement, polices, 3D)${csp.length ? " — " + csp.join(" | ") : ""}`] = !csp.length && !o.console.some((m) => /Content Security Policy/i.test(m));
  const hors = horsOrigine(o);
  t[`anonyme · aucune requête hors de l'origine${hors.length ? " — " + hors.slice(0, 3).join(", ") : ""}`] = !hors.length;
  t[`anonyme · aucune erreur en console${o.console.length ? " — " + o.console.slice(0, 2).join(" | ") : ""}`] = !o.console.length;
  await o.ctx.close();
}

/* 2b. ?dev : sans effet */
{
  const o = await onglet("/plan?dev", { nom: "?dev" });
  const r = await o.p.evaluate(() => ({ dev: isDev(), pro: isPro(), chip: document.body.classList.contains("gratuit") }));
  t["?dev · sans effet : isDev() faux, toujours gratuit"] = r.dev === false && r.pro === false && r.chip;
  await o.ctx.close();
}

/* 2c. l'amorçage, API simulée */
const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const etat = FIX("plan-final-etage");
const P1 = { id: UUID(1), nom: "Maison du compte", workflow: "final_plan", etat, vue: null, resume: {}, revision: 3, updated_at: "2026-10-10T10:00:00.000Z", estimations: [] };
const carte = (x) => ({ id: x.id, nom: x.nom, workflow: x.workflow, resume: x.resume, apercu: [[0, 0, 12.5, 0, "mur", ""]], revision: x.revision, updated_at: x.updated_at, estimations: 0 });
function api({ session = { connecte: true, pro: true, limite: null, utilises: 1 }, plans = [P1], plan = (id) => plans.find((x) => x.id === id) } = {}) {
  return (meth, chemin) => {
    if (chemin === "/api/plans/session") return typeof session === "function" ? session() : session.status ? session : json(200, session);
    if (chemin === "/api/plans" && meth === "GET") return json(200, { plans: plans.map(carte), limite: null, utilises: plans.length });
    const m = chemin.match(/^\/api\/plans\/([^/]+)$/);
    if (m && meth === "GET") { const x = plan(decodeURIComponent(m[1])); return x ? json(200, x) : json(404, { code: "introuvable" }); }
    if (m && meth === "PATCH") return json(200, { revision: 4 });
    return null;
  };
}
{
  const o = await onglet(`/plan?id=${P1.id}`, { api: api(), nom: "connecté" });
  const r = await o.p.evaluate(() => ({ pro: window.AVYORA_PRO, nuage: NUAGE, id: state.id, nom: state.name, wf: state.workflow, n: state.levels.length, rev: siteRev, lib: Object.keys(siteLib) }));
  t["amorçage · connecté et Pro : session, liste et plan lus, le plan ?id= ouvert depuis le compte (NUAGE, révision)"] = r.pro === true && r.nuage === true && r.id === P1.id
    && r.nom === P1.nom && r.wf === "final_plan" && r.n === etat.levels.length && r.rev === 3 && r.lib.includes(P1.id);
  t[`amorçage · appels : session, liste, plan (${o.appels.slice(0, 3).join(", ")})`] = o.appels.slice(0, 3).sort().join(",") === ["GET /api/plans", "GET /api/plans/session", `GET /api/plans/${P1.id}`].sort().join(",");
  const { csp } = await o.etat();
  t["amorçage · connecté : zéro violation CSP"] = !csp.length;
  await o.ctx.close();
}
{
  const o = await onglet(`/plan?id=${UUID(9)}`, { api: api(), nom: "introuvable" });
  const r = await o.p.evaluate(() => ({ nuage: NUAGE, id: state.id, toast: document.getElementById("toast").textContent }));
  t["amorçage · plan introuvable (404) : l'éditeur s'ouvre sans lui, « Ce plan n'est pas dans ton compte. »"] = r.nuage === true && r.id !== UUID(9) && /Ce plan n'est pas dans ton compte\./.test(r.toast);
  await o.ctx.close();
}
{
  const o = await onglet(`/plan?id=${P1.id}`, { api: api({ session: json(500, { code: "erreur" }) }), nom: "panne" });
  const r = await o.p.evaluate(() => ({ pro: window.AVYORA_PRO, nuage: NUAGE, site: !!SITE, id: state.id, toast: document.getElementById("toast").textContent }));
  t["amorçage · session en panne (500) : mode local, gratuit, et un message"] = r.site && r.nuage === false && r.pro === false && r.id !== P1.id && /n'a pas abouti : ton plan reste sur cet appareil/.test(r.toast);
  t["amorçage · panne : la liste et le plan ne sont pas demandés"] = o.appels.join(",") === "GET /api/plans/session";
  await o.ctx.close();
}
{
  const debut = Date.now();
  const o = await onglet("/plan", { api: api({ session: () => ({ attendre: true }) }), nom: "délai" });
  const ms = Date.now() - debut;
  const r = await o.p.evaluate(() => ({ nuage: NUAGE, pro: window.AVYORA_PRO, toast: document.getElementById("toast").textContent }));
  t[`amorçage · délai dépassé (session sans réponse) : l'éditeur démarre en local après 6 s, avec un message (${(ms / 1000).toFixed(1)} s)`] = r.nuage === false && r.pro === false && ms >= 5500 && ms < 15000 && /n'a pas abouti/.test(r.toast);
  await o.ctx.close();
}
{
  const o = await onglet(`/plan?id=${P1.id}`, { api: api({ session: { connecte: false, pro: false, limite: 1, utilises: 0 } }), nom: "anonyme ?id" });
  const r = await o.p.evaluate(() => ({ nuage: NUAGE, toast: document.getElementById("toast").textContent }));
  t["amorçage · anonyme avec ?id= : « Connecte-toi pour ouvrir ce plan », et rien d'autre n'est demandé"] = r.nuage === false && /Connecte-toi pour ouvrir ce plan/.test(r.toast) && o.appels.join(",") === "GET /api/plans/session";
  await o.ctx.close();
}
{
  const o = await onglet("/plan?type=final", { api: api({ session: { connecte: false, pro: false, limite: 1, utilises: 0 } }), nom: "?type=final" });
  const r = await o.p.evaluate(() => ({ type: SITE.type, wf: state.workflow, final: WORKFLOW_FINAL }));
  t["amorçage · ?type=final : passé à l'éditeur, un Plan final"] = r.type === "final" && r.wf === r.final;
  await o.ctx.close();
}
{
  const o = await onglet("/plan?type=<script>&id=../../x", { api: api({ session: { connecte: true, pro: false, limite: 1, utilises: 0 }, plans: [] }), nom: "paramètres hostiles" });
  const r = await o.p.evaluate(() => ({ type: SITE.type, pro: window.AVYORA_PRO }));
  t["amorçage · ?type et ?id hors liste : ignorés (type null, aucun plan demandé), gratuit"] = r.type === null && r.pro === false && !o.appels.some((x) => /\/api\/plans\/\.\.|x$/.test(x)) && o.appels.length === 2;
  await o.ctx.close();
}

/* 2c bis. réseau bridé (1,6 Mb/s) : la session répond bien avant la fin du HTML. L'éditeur ne doit démarrer qu'une fois
   la page lue (sinon son script, copié tronqué, lève une SyntaxError et l'éditeur reste mort). */
{
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const err = [];
  p.on("pageerror", (e) => { err.push(e.message); errs.push(`réseau bridé · ${e.message}`); });
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("avyora-plan-welcome", "1"); } catch {} });
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin === ORIGINE && u.pathname.startsWith("/api/plans")) return r.respond(json(200, { connecte: false, pro: false, limite: 1, utilises: 0 }));
    r.continue();
  });
  const cdp = await p.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await p.goto(BASE + "/plan", { waitUntil: "domcontentloaded", timeout: 60000 });
  const pret = await p.waitForFunction(() => typeof render === "function" && typeof setMode === "function" && !document.getElementById("avyora-voile"), { timeout: 60000 }).then(() => true, () => false);
  t["réseau bridé (1,6 Mb/s) · l'éditeur démarre entier une fois la page lue, sans erreur de page"] = pret && !err.length;
  await ctx.close();
}

/* 2d. les largeurs (D48 : au téléphone, la consultation) */
for (const [l, h, mob] of [[1440, 900, false], [768, 1024, true], [375, 812, true]]) {
  const o = await onglet("/plan", { largeur: l, hauteur: h, mobile: mob, nom: `${l} px` });
  const r = await o.p.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth, mode: typeof setMode }));
  if (CAP) await o.p.screenshot({ path: path.join(CAP, `plan-${l}.png`) });
  const { csp } = await o.etat();
  t[`${l} px · l'éditeur démarre, sans défilement horizontal, sans violation CSP`] = r.mode === "function" && r.w <= r.vw + 1 && !csp.length;
  await o.ctx.close();
}

let ko = 0;
for (const [k, ok] of Object.entries(t)) { if (!ok) ko++; console.log((ok ? "  ✓ " : "  ✗ ") + k); }
console.log(`${Object.keys(t).length - ko}/${Object.keys(t).length} contrôles verts` + (errs.length ? ` · erreurs de page : ${[...new Set(errs)].join(" | ")}` : ""));
await b.close();
process.exit(ko || errs.length ? 1 : 0);
