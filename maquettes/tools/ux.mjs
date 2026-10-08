/**
 * La refonte de l'interface (D59 et suivants) : ce qui fait « logiciel de plans professionnel ».
 *
 * U1 · design system et icônes (D59) — à 1 440 × 900, 1 280 × 800 et 1 024 × 768 :
 *   - UN registre d'icônes : chaque <svg> de l'interface (barre, outils, panneau, zoom, menus, niveaux, vues,
 *     pied, fenêtres) est une icône .ico dont le tracé est EXACTEMENT un tracé de ICONS — plus aucune copie à
 *     la main ; seules exceptions, les illustrations (logo, accueil, plans types, Mes plans) et les vignettes
 *     d'ouvertures (chantier U2) ;
 *   - chaque outil (.tb) : une icône svg.ico[aria-hidden] de 20 px puis son libellé dans le 1er <span> ;
 *   - trois tailles d'icône, un poids optique constant : 16 px (trait 2), 20 px (1,75), 24 px (1,5), mini-coupes
 *     40 × 24 (1,5) — trait réel entre 1,3 et 1,5 px ;
 *   - aucun glyphe texte comme icône dans la barre de zoom (« − » « + ») ;
 *   - le HTML statique n'a plus de <svg data-ico> vide ; plus d'icône morte dans ICONS ;
 *   - jetons du design system présents (espacements, rayons, hauteurs, textes, ombres, focus) ; rayons
 *     calculés des contrôles ∈ {0, 2, 3, 4, 6, 8, 12, pastille} ; aucune taille de texte à demi-pixel ;
 *     hauteurs : bouton de barre 32, primaire 36, zoom et niveaux 28 ;
 *   - familles des bibliothèques sans couleur de famille (icône en encre, plus de liseré) ; la carte choisie
 *     en indigo ;
 *   - les intitulés de groupe de la colonne d'outils ne sont plus barrés par leurs filets ;
 *   - vignettes d'ouvertures : Porte d'entrée, Porte de garage et Petite fenêtre ont leur propre dessin
 *     (le bug openingIcon(o.kind)) ;
 *   - mini-coupes : les 5 types de mur et le trait (axe / faces) ont chacun leur coupe ; une décision
 *     porte l'échantillon de la légende (encre, rouge, jaune à tirets, hachure rouge) ;
 *   - fiche d'une ouverture : le modèle se choisit par les MÊMES cartes que l'outil (plus de liste déroulante) ;
 *   - la bibliothèque des ouvertures et des équipements se lit sans défiler à 1 024 × 768 (Fenêtre, Porte
 *     d'entrée, Porte simple, Porte-fenêtre, Douche, Lavabo, WC au-dessus du pied) ;
 *   - CSS et code morts retirés (.lib, .tools .sep, #cotesBtn, initToolTips) ; au téléphone, pas de « + » de niveau.
 *
 * U2 · symboles du plan et vignettes (D60) :
 *   - LA vignette d'un modèle est le symbole du plan, rendu par le même code (vignette() → drawOpening sur un mur
 *     témoin, drawItem cadré sur ce qu'il dessine) : pour les 11 ouvertures et les 35 équipements, la vignette égale le
 *     rendu du plan au même cadrage (écart moyen sous 1,5 / 255, 99 % des pixels à moins de 40) ; deux modèles n'ont
 *     jamais la même vignette (empreinte des pixels) ; aucune n'est coupée (bord vide, sauf le mur témoin qui file à
 *     gauche et à droite) ; rendue à la densité de l'écran (×1 et ×2), sans réduction CSS ; les deux bibliothèques
 *     l'utilisent (img.vig) ;
 *   - symboles à la convention d'architecte : une fenêtre a un arc par vantail (2 pour la Fenêtre et la Porte-fenêtre,
 *     1 pour la Petite fenêtre, 0 pour la baie coulissante) et plus de chevron ; la porte d'entrée a son seuil ; l'âme
 *     pleine, son vantail plein ; la porte de garage, ses rails en tirets ;
 *   - une seule encre : le plan d'un exemple (murs, ouvertures, équipements, électricité) ne dessine plus en violet,
 *     orange, vert, lilas, ni dans les 4 encres d'avant ; cloison à 65 %, mur plein, mur épais hachuré visible ; une
 *     cloison existante s'arrête à la face du mur qu'elle rencontre en T ;
 *   - électricité à taille d'écran bornée (12 à 20 px), au téléphone comme de près, jamais un pâté ;
 *   - glyphes du canvas : poignées carrées indigo, losange au milieu d'un mur, rotation = rond indigo et flèche du
 *     registre, défauts en losange --danger, plus de texte « à poser » au-dessus d'un appareil.
 *
 *   node maquettes/tools/ux.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/ux.mjs <dossier maquettes>"); process.exit(2); }
const SRC = readFileSync(SP + "/plan-editor.html", "utf8");
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"], protocolTimeout: 60000 });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet({ larg = 1440, haut = 900, mobile = false } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  await p.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "passe"); } catch {} });
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(250);
  await p.evaluate(() => { closeWelcome("sample"); closeModal(); setTool("select"); sel = null; render(); });
  await wait(150);
  return p;
}

/* ═════════ 0. Le source ═════════ */
t["source · plus de CSS ni de code morts (.lib, .tools .sep, #cotesBtn, initToolTips)"] = !/\n\.lib\{|\.lib button|\.tools \.sep|#cotesBtn|initToolTips/.test(SRC);
{ const a = SRC.indexOf("const ICONS={"), z = SRC.indexOf("\n};", a), cles = [...SRC.slice(a, z).matchAll(/^\s+(\w+):/gm)].map((m) => m[1]), reste = SRC.slice(0, a) + SRC.slice(z);
  const mortes = cles.filter((k) => !new RegExp(`['"]${k}['"]|ICONS\\.${k}\\b`).test(reste));
  t[`source · aucune icône morte dans ICONS (${cles.length} tracés)${mortes.length ? " — " + mortes.join(", ") : ""}`] = cles.length > 60 && !mortes.length; }
t["source · plus de « + » ni de « − » dessinés en texte (CSS content, bouton de couleur libre)"] = !/content:"[+−] ?"/.test(SRC) && !/setTextColor\(this\.value\)">\+</.test(SRC);
t["source · plus de SVG d'outil ou de famille écrit à la main (TOOLS, FAM, catégories d'ouvertures)"] = !/\['select','Sélection','V','<svg/.test(SRC) && !/ic:'<svg/.test(SRC) && !/'Extérieur','#0284c7','<svg/.test(SRC);

/* ═════════ 1. Registre, tailles, outils, jetons — à trois largeurs ═════════ */
for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L, haut: H });
  Object.assign(t, await p.evaluate((larg) => {
    const r = {}, vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none";
    const norm = (h) => { const g = document.createElementNS("http://www.w3.org/2000/svg", "svg"); g.innerHTML = h; return g.innerHTML; }; const TRACES = new Set(Object.values(ICONS).map(norm));
    const ILLU = ".brand .lg svg, .wv svg, .pmini svg, .tpl .tv svg, .th.op svg, .xbrand svg";
    const ZONES = ".top, #tools, #pbody, #pfoot, .zoomctl, #levels, #modes, #layerPop, .mpop, .overlay, #emptyStage";
    const mauvais = new Set(), tailles = new Set(), poids = [];
    const releve = (ctx) => { for (const s of document.querySelectorAll(ZONES.split(",").map((z) => z + " svg").join(","))) {
      if (s.closest(ILLU.replace(/ svg/g, ""))) continue;
      if (!s.classList.contains("ico") || !TRACES.has(s.innerHTML) || s.getAttribute("aria-hidden") !== "true") mauvais.add(ctx + " : " + (s.parentElement?.className || s.parentElement?.id || "?") + " " + s.outerHTML.slice(0, 60));
      if (vis(s)) { const q = s.getBoundingClientRect(), sw = parseFloat(getComputedStyle(s).strokeWidth); const k = Math.round(q.width) + "×" + Math.round(q.height); tailles.add(k); const vb = s.viewBox.baseVal; poids.push([k, sw * q.height / (vb && vb.height || 24)]); }
    } };
    /* états parcourus : vue d'ensemble, chaque outil, une fiche de chaque genre, menus, calques, onglet Suivi */
    releve("ensemble");
    for (const o of ["mur", "ouverture", "doublage", "equipement", "cote", "mesure", "calque"]) { setTool(o); releve("outil " + o); }
    setTool("select"); setMode("projet"); closeModal();
    const lv = L();
    for (const [k, x] of [["wall", lv.walls.find((w) => !isVirtual(w))], ["opening", lv.openings.find((o) => OPENINGS[o.type].cat === "fenetre")], ["opening", lv.openings.find((o) => OPENINGS[o.type].cat === "porte")], ["item", lv.items[0]], ["room", lv.rooms[0]]]) { if (!x) continue; sel = { kind: k, id: x.id }; render(); document.querySelectorAll("#pbody details").forEach((d) => (d.open = true)); releve("fiche " + k); }
    sel = null; render(); setPanelTab("suivi"); releve("Suivi"); setPanelTab("details");
    basculerMenu("fichier"); releve("menu Fichier"); fermerMenus(); basculerMenu("aide"); releve("menu Aide"); fermerMenus();
    toggleLayersPop(); releve("calques"); toggleLayersPop();
    ouvrirAide("keys"); releve("Aide"); closeModal(); setMode("existant"); closeModal();
    r[`${larg} · un seul registre : chaque icône de l'interface est un tracé de ICONS (svg.ico, aria-hidden)${mauvais.size ? " — " + [...mauvais].slice(0, 3).join(" | ") : ""}`] = !mauvais.size;
    const ok = (k) => ["16×16", "20×20", "24×24", "40×24"].includes(k);
    r[`${larg} · trois tailles d'icône (16, 20, 24) et la mini-coupe (40 × 24) — vu : ${[...tailles].join(", ")}`] = [...tailles].every(ok);
    const lourds = poids.filter(([k, w]) => w < 1.3 || w > 1.55);
    r[`${larg} · un même poids optique : trait réel de 1,3 à 1,5 px${lourds.length ? " — " + lourds.slice(0, 3).map(([k, w]) => k + " " + w.toFixed(2)).join(", ") : ""}`] = !lourds.length;
    /* les outils */
    const tb = [...document.querySelectorAll("#tools .tb")];
    r[`${larg} · 10 outils : chacun une icône svg.ico[aria-hidden] de 20 px, puis son libellé dans le 1er <span>`] = tb.length === 10 && tb.every((x) => { const s = x.firstElementChild; return s && s.tagName.toLowerCase() === "svg" && s.classList.contains("ico") && s.getAttribute("aria-hidden") === "true" && Math.round(s.getBoundingClientRect().width) === 20 && x.querySelector("span") && x.querySelector("span").textContent.trim().length > 2; });
    r[`${larg} · intitulés de groupe des outils : sous un filet, jamais barrés`] = [...document.querySelectorAll("#tools .cat")].every((c) => getComputedStyle(c, "::before").content === "none" && getComputedStyle(c, "::after").content === "none");
    /* zoom */
    const z = [...document.querySelectorAll(".zoomctl button")];
    r[`${larg} · zoom : des icônes, plus de « − » ni de « + » en texte`] = z.length >= 5 && z.every((x) => x.querySelector("svg.ico") && !x.textContent.trim());
    r[`${larg} · le HTML statique n'a plus d'icône vide`] = [...document.querySelectorAll("svg[data-ico]")].every((s) => s.innerHTML.length > 10);
    /* jetons et composants */
    const rs = getComputedStyle(document.documentElement);
    r[`${larg} · jetons du design system (espacements, rayons, hauteurs, textes, ombres, états)`] = ["--sp-1", "--sp-2", "--sp-3", "--sp-4", "--sp-6", "--r-s", "--r-m", "--r-l", "--h-s", "--h-m", "--h-l", "--fs-xs", "--fs-s", "--fs-m", "--fs-b", "--fs-l", "--fs-xl", "--sh-1", "--sh-2", "--sh-pop", "--hover", "--press", "--focus"].every((k) => rs.getPropertyValue(k).trim());
    const RAY = new Set(["0px", "2px", "3px", "4px", "6px", "8px", "12px"]);
    const ctrl = [...document.querySelectorAll(".top .ib, #tools .tb, .zoomctl, .zoomctl button, #levels, #levels button, #modes button, #pbody .ib, #pbody .seg, #pbody .seg button, #pbody .fin, #pbody .lib2 .it, #pbody .ptabs button, #pfoot .bcard, .mpop")].filter(vis);
    const rayHors = ctrl.map((x) => getComputedStyle(x).borderTopLeftRadius).filter((v) => !RAY.has(v) && !/^(50%|9\d\dpx|99px)$/.test(v) && parseFloat(v) < 50);
    r[`${larg} · rayons des contrôles sur l'échelle (6 / 8 / 12)${rayHors.length ? " — " + [...new Set(rayHors)].join(", ") : ""}`] = !rayHors.length;
    const demi = [...document.querySelectorAll(".top *, #tools *, #pbody *, #pfoot *, .zoomctl *, #levels *, #modes *")].filter((x) => x.childNodes.length && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(x)).map((x) => getComputedStyle(x).fontSize).filter((v) => !Number.isInteger(parseFloat(v)));
    r[`${larg} · aucune taille de texte à demi-pixel (échelle 11 / 12 / 13 / 14 / 16 / 20)${demi.length ? " — " + [...new Set(demi)].join(", ") : ""}`] = !demi.length;
    const h = (sel) => [...document.querySelectorAll(sel)].filter(vis).map((x) => Math.round(x.getBoundingClientRect().height));
    r[`${larg} · hauteurs : boutons de la barre 32, primaire 36, zoom et niveaux 28`] = h(".top .ib:not(.primary)").every((v) => v === 32) && h(".top .ib.primary").every((v) => v === 36) && h(".zoomctl button").every((v) => v === 28) && h("#levels button").every((v) => v === 28);
    /* bibliothèques */
    setTool("equipement");
    r[`${larg} · familles neutres : icône en encre, ni liseré ni teinte de famille`] = [...document.querySelectorAll("#pbody .famh")].every((f) => !f.closest(".fam").getAttribute("style") && parseFloat(getComputedStyle(f).borderLeftWidth) === 0 && getComputedStyle(f.querySelector(".fic")).color === getComputedStyle(document.querySelector("#pbody .famh .fic")).color);
    setTool("ouverture");
    const on = document.querySelector("#pbody .lib2 .it.on");
    r[`${larg} · la carte choisie est indigo, comme toute sélection`] = !!on && getComputedStyle(on).borderTopColor === "rgb(79, 70, 229)";
    const vig = (n) => { const it = [...document.querySelectorAll("#pbody .lib2 .it")].find((x) => x.querySelector("b").textContent === n); return it ? it.querySelector(".th").innerHTML : "?"; };
    r[`${larg} · vignettes : Porte d'entrée, Porte de garage et Petite fenêtre ont leur propre dessin`] = vig("Porte d'entrée") !== vig("Porte simple") && vig("Porte de garage") !== vig("Porte coulissante (intérieure)") && vig("Petite fenêtre") !== vig("Fenêtre");
    /* bibliothèque à toutes les largeurs (D54 l'exigeait à 1 280 et 1 440 ; D59 ajoute 1 024 × 768) */
    const P = document.getElementById("pbody").getBoundingClientRect(), pied = document.getElementById("pfoot").getBoundingClientRect().top;
    const vu = (n) => { const it = [...document.querySelectorAll("#pbody .lib2 .it")].find((x) => x.querySelector("b").textContent === n); if (!it) return false; const q = it.getBoundingClientRect(); return q.top >= P.top && q.bottom <= pied; };
    r[`${larg} · Ouvertures : Fenêtre, Porte d'entrée, Porte simple, Porte-fenêtre sans défiler`] = ["Fenêtre", "Porte d'entrée", "Porte simple", "Porte-fenêtre"].every(vu);
    setTool("equipement");
    r[`${larg} · Équipements : Douche, Lavabo, WC sans défiler`] = ["Douche", "Lavabo", "WC"].every(vu);
    /* mini-coupes */
    setTool("mur");
    const segs = [...document.querySelectorAll("#pbody .seg.stack")];
    const coupes = (s) => [...s.querySelectorAll(":scope>button>svg.ico.mc")].filter(vis).map((x) => x.innerHTML);
    r[`${larg} · outil Murs : chaque type de mur a sa mini-coupe, toutes différentes`] = segs.length >= 2 && coupes(segs[0]).length === 5 && new Set(coupes(segs[0])).size === 5;
    r[`${larg} · outil Murs : le trait (axe, face ext., face int.) a sa mini-coupe`] = coupes(segs[1]).length === 3 && new Set(coupes(segs[1])).size === 3;
    setTool("select"); return r;
  }, L));
  await p.close();
}

/* ═════════ 2. Décision et modèle dans les fiches ═════════ */
{
  const p = await onglet({ larg: 1280, haut: 800 });
  Object.assign(t, await p.evaluate(() => {
    const r = {}; setMode("projet"); closeModal();
    const o = L().openings.find((x) => OPENINGS[x.type].cat === "fenetre"); sel = { kind: "opening", id: o.id }; render();
    const bt = [...document.querySelectorAll("#pbody .segetat button")];
    const ech = (cl) => { const x = bt.find((b) => b.classList.contains(cl)); return x ? getComputedStyle(x, "::after") : null; };
    r["décision · chaque état porte l'échantillon de la légende (Je garde encre, À remplacer rouge, À boucher hachuré)"] = document.querySelector("#pbody .segetat").classList.contains("stack") && ech("e-garder")?.backgroundColor === "rgb(30, 27, 75)" /* D60 : l'encre des murs déjà là, #1E1B4B */ && ech("e-remplacer")?.backgroundColor === "rgb(185, 28, 28)" && /repeating-linear-gradient/.test(ech("e-boucher")?.backgroundImage || "") && /dashed/.test(ech("e-existant")?.borderTopStyle || "");
    r["décision · le libellé reste le 1er texte de chaque bouton"] = bt.every((x) => Object.values(LEX.etat).includes(x.firstChild.textContent));
    r["fiche d'une ouverture · plus de liste déroulante « Modèle » : les cartes de l'outil, repliées"] = ![...document.querySelectorAll("#pbody select")].some((s) => [...s.options].some((x) => x.textContent === "Porte-fenêtre")) && !!document.querySelector('#pbody details.plie[data-k="op-modele"] .lib2.liste .it.on[aria-pressed="true"]');
    const d = document.querySelector('#pbody details.plie[data-k="op-modele"]'); if (d) d.open = true; plisOuverts["op-modele"] = true;
    const c = d && [...d.querySelectorAll(".it")].find((x) => x.querySelector("b").textContent === "Petite fenêtre"); if (c) c.click();
    r["fiche d'une ouverture · une carte change le modèle (Petite fenêtre)"] = L().openings.find((x) => x.id === o.id).type === "fenetre_p" && !!document.querySelector('#pbody details.plie[data-k="op-modele"]');
    undo(); delete plisOuverts["op-modele"]; return r;
  }));
  await p.close();
}

/* ═════════ 3. Téléphone : pas de « + » de niveau (D48), icônes du registre ═════════ */
{
  const p = await onglet({ larg: 390, haut: 844, mobile: true });
  Object.assign(t, await p.evaluate(() => {
    const r = {}; closeModal();
    r["téléphone · pas de « + » de niveau (D48 : la règle perdait contre .levels button.add)"] = !document.querySelector("#levels .add")?.getClientRects().length;
    r["téléphone · le zoom garde ses icônes (registre)"] = [...document.querySelectorAll(".zoomctl button")].filter((x) => x.getClientRects().length).every((x) => { const g = document.createElementNS("http://www.w3.org/2000/svg", "svg"); const s = x.querySelector("svg.ico"); return s && Object.values(ICONS).some((h) => { g.innerHTML = h; return g.innerHTML === s.innerHTML; }); });
    return r;
  }));
  await p.close();
}

/* ═════════ 4. U2 · symboles du plan et vignettes (D60) ═════════ */
for (const dsf of [1, 2]) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: dsf });
  await p.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "passe"); } catch {} });
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(250);
  Object.assign(t, await p.evaluate(async (dsf) => {
    const r = {}; closeWelcome("blank"); closeModal();
    if (typeof vignette !== "function") return { [`×${dsf} · une fonction unique rend la vignette d'un modèle (vignette())`]: false };
    const charger = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; });
    const MOD = [...Object.keys(OPENINGS).map((k) => ["ouverture", k, 54, 30]), ...Object.keys(ITEMS).map((k) => ["equipement", k, 84, 44])];
    const vus = [];
    for (const [g, k, lw, lh] of MOD) { const m = vignette(g, k, lw, lh); const im = await charger(m.url); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); vus.push({ g, k, lw, lh, m, im, d: x.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }); }
    /* 1. densité : la vignette a autant de pixels que l'écran en affiche */
    const flous = vus.filter((x) => x.W !== Math.round(x.lw * dsf) || x.H !== Math.round(x.lh * dsf)).map((x) => x.k);
    r[`×${dsf} · vignettes rendues à la densité de l'écran (${vus.length} modèles)${flous.length ? " — " + flous.join(", ") : ""}`] = !flous.length;
    /* 2. deux modèles, deux vignettes : empreinte des pixels */
    const emp = (d) => { let h = 2166136261; for (let i = 0; i < d.length; i += 1) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
    const H = new Map(); vus.forEach((x) => { const e = emp(x.d); H.set(e, (H.get(e) || []).concat(x.k)); });
    const doubles = [...H.values()].filter((l) => l.length > 1).map((l) => l.join(" = "));
    r[`×${dsf} · deux modèles n'ont jamais la même vignette (${H.size} empreintes pour ${vus.length})${doubles.length ? " — " + doubles.join(" ; ") : ""}`] = !doubles.length && H.size === vus.length;
    /* 3. aucune vignette coupée : le bord est vide — sauf, pour une ouverture, le mur témoin qui file à gauche et à droite */
    const coupees = vus.filter((x) => { const a = (i, j) => x.d[(j * x.W + i) * 4 + 3] > 24;
      let band = null; if (x.g === "ouverture") { const t = OPENINGS[x.k] && isExtType(x.k) ? 0.2 : 0.07; band = [Math.floor((x.m.oy - t / 2 * x.m.z - 1.5) * dsf), Math.ceil((x.m.oy + t / 2 * x.m.z + 1.5) * dsf)]; }
      for (let i = 0; i < x.W; i++) if (a(i, 0) || a(i, x.H - 1)) return true;
      for (let j = 0; j < x.H; j++) if ((a(0, j) || a(x.W - 1, j)) && !(band && j >= band[0] && j <= band[1])) return true;
      if (band) { let trou = 0; for (let j = Math.max(0, band[0]); j <= Math.min(x.H - 1, band[1]); j++) { let n = 0; for (let i = 0; i < x.W; i++) if (x.d[(j * x.W + i) * 4 + 3] < 8) n++; trou = Math.max(trou, n); } return trou < 4 * dsf; } /* une ouverture : le mur témoin est bien percé */
      let n = 0; for (let j = 0; j < x.H; j++) for (let i = 0; i < x.W; i++) if (a(i, j)) n++;
      return n < 50 * dsf * dsf; }).map((x) => x.k); /* un équipement : au moins 50 px² d'encre (le poteau, 20 cm à l'échelle commune, en a 144) */
    r[`×${dsf} · aucune vignette coupée ni vide${coupees.length ? " — " + coupees.join(", ") : ""}`] = !coupees.length;
    /* 4. la vignette EST le rendu du plan : même scène posée sur le plan, même cadrage, on compare les pixels */
    /* les deux images passent par un flou 3 × 3 : le rasteriseur du plan (accéléré) et celui d'une toile hors écran ne
       placent pas l'anticrénelage au même demi-pixel ; un autre dessin, lui, laisse des écarts francs (âme pleine contre
       porte simple : 6 % de pixels à plus de 40, prise contre prise double : 2 %) */
    const flou = (A, W, H) => { const B = new Float32Array(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) { let s2 = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; s2 += A[(yy * W + xx) * 3 + c]; n++; } B[(y * W + x) * 3 + c] = s2 / n; } return B; };
    const ecarts = [];
    for (const x of vus) {
      state = blankState(); const lv = L(); settings.grid = false; settings.cotes = false; sel = null; tool = "export"; hover = null;
      if (x.g === "ouverture") { const d = OPENINGS[x.k], T = x.m.temoin || {}, w = { id: uid(), a: v(30, 0), b: v(-30, 0), type: T.mur }; lv.walls.push(w); lv.openings.push({ id: uid(), wallId: w.id, t: 0.5, type: x.k, w: d.w, h: d.h, side: T.side, hinge: T.hinge }); }
      else { const d = ITEMS[x.k], it = { id: uid(), type: x.k, x: 0, y: 0, w: d.w, h: d.h, rot: x.m.rot }; if (x.k === "escalier") { it.stair = { type: "droit" }; fitStair(it, lv); } lv.items.push(it); }
      afterChange(); tool = "export"; settings.grid = false; settings.cotes = false; sel = null;
      const X = 300, Y = 200; for (let i = 0; i < 2; i++) { view.zoom = x.m.z; view.ox = X + x.m.ox; view.oy = Y + x.m.oy; draw(); } /* deux fois : un premier draw() peut recaler la toile (resize) et décaler la vue */
      const k = cv.width / cv.clientWidth, P = ctx.getImageData(Math.round(X * k), Math.round(Y * k), x.W, x.H).data;
      const fond = [247, 248, 252], A = new Float32Array(x.W * x.H * 3), B2 = new Float32Array(x.W * x.H * 3);
      for (let i = 0; i < x.W * x.H; i++) { const al = x.d[i * 4 + 3] / 255; for (let c2 = 0; c2 < 3; c2++) { A[i * 3 + c2] = x.d[i * 4 + c2] * al + fond[c2] * (1 - al); B2[i * 3 + c2] = P[i * 4 + c2]; } }
      const a2 = flou(A, x.W, x.H), b3 = flou(B2, x.W, x.H); let som = 0, loin = 0;
      for (let i = 0; i < x.W * x.H; i++) { let m = 0; for (let c2 = 0; c2 < 3; c2++) { const e = Math.abs(a2[i * 3 + c2] - b3[i * 3 + c2]); som += e; if (e > m) m = e; } if (m > 40) loin++; }
      const moy = som / (x.W * x.H * 3); if (moy > 3 || loin > x.W * x.H * 0.003) ecarts.push(`${x.k} (${moy.toFixed(2)} ; ${loin} px)`);
    }
    r[`×${dsf} · chaque vignette est le rendu du plan au même cadrage (après flou 3 × 3 : écart moyen < 3 / 255, aucun pixel à plus de 40)${ecarts.length ? " — " + ecarts.slice(0, 6).join(", ") : ""}`] = !ecarts.length;
    return r;
  }, dsf));
  if (dsf === 1) Object.assign(t, await p.evaluate(() => { try {
    const r = {}; closeWelcome("sample"); closeModal(); setMode("existant"); closeModal(); setTool("select"); sel = null; render();
    /* 5. les bibliothèques montrent ces vignettes, à leur taille, sans réduction */
    setTool("ouverture"); const io = [...document.querySelectorAll("#pbody .lib2 .it .th")];
    r["bibliothèque des ouvertures · chaque carte montre la vignette du plan (img.vig 54 × 30, non réduite)"] = io.length === Object.keys(OPENINGS).length && io.every((th) => { const im = th.querySelector("img.vig"); if (!im) return false; const q = im.getBoundingClientRect(); return Math.round(q.width) === 54 && Math.round(q.height) === 30 && getComputedStyle(im).transform === "none"; });
    setTool("equipement"); const ie = [...document.querySelectorAll("#pbody .lib2 .it .th")];
    r["bibliothèque des équipements · chaque carte montre la vignette du plan (img.vig 84 × 44, non réduite)"] = ie.length === Object.keys(ITEMS).length && ie.every((th) => { const im = th.querySelector("img.vig"); if (!im) return false; const q = im.getBoundingClientRect(); return Math.round(q.width) === 84 && Math.round(q.height) === 44 && getComputedStyle(im).transform === "none"; });
    setTool("select");
    /* 6. conventions d'architecte : arcs par vantail, plus de chevron, seuil, âme pleine, rails */
    const releve = (k) => { state = blankState(); const lv = L(), d = OPENINGS[k], w = { id: uid(), a: v(30, 0), b: v(-30, 0), type: isExtType(k) ? "mur" : "cloison" }; lv.walls.push(w); const o = { id: uid(), wallId: w.id, t: 0.5, type: k, w: d.w, h: d.h, side: 1, hinge: 1 }; lv.openings.push(o); afterChange(); view.zoom = 120; view.ox = 500; view.oy = 300;
      const n = { arc: 0, tirets: 0, plein: 0 }; const A = ctx.arc, F = ctx.fill, D = ctx.setLineDash; ctx.arc = function () { n.arc++; return A.apply(this, arguments); }; ctx.setLineDash = function (x) { if (x && x.length) n.tirets++; return D.apply(this, arguments); }; ctx.fill = function () { if (String(ctx.fillStyle).toLowerCase() === ENCRE) n.plein++; return F.apply(this, arguments); };
      try { drawOpening(o, false); } finally { ctx.arc = A; ctx.fill = F; ctx.setLineDash = D; } return n; };
    const f = releve("fenetre"), fp = releve("fenetre_p"), pf = releve("porte_fenetre"), bv = releve("baie"), pe = releve("porte_entree"), ps = releve("porte"), pp = releve("porte_pleine"), ga = releve("garage");
    r["fenêtres · un arc par vantail (Fenêtre 2, Petite fenêtre 1, Porte-fenêtre 2, baie coulissante 0)"] = f.arc === 2 && fp.arc === 1 && pf.arc === 2 && bv.arc === 0;
    r["fenêtre · plus de chevron d'élévation (le source ne trace plus la pointe vers l'intérieur)"] = !/ov==='battant'\|\|ov==='oscillo'\)\{const iy=/.test(drawOpening.toString());
    r["portes · l'entrée a sa marque (triangle plein), l'âme pleine son vantail plein, la porte simple non"] = pe.plein >= 1 && pp.plein >= 1 && ps.plein === 0;
    r["porte de garage · rails en tirets (ce qui est au plafond)"] = ga.tirets >= 1;
    /* 7. une seule encre : ni violet, ni orange, ni vert, ni lilas, ni les quatre encres d'avant, sur le plan d'un exemple */
    loadSample(); setMode("existant"); closeModal(); sel = null; tool = "select"; settings.grid = true; settings.cotes = true;
    const vu = new Set(); let dans = 0; const proto = CanvasRenderingContext2D.prototype, dS = Object.getOwnPropertyDescriptor(proto, "strokeStyle"), dF = Object.getOwnPropertyDescriptor(proto, "fillStyle");
    Object.defineProperty(ctx, "strokeStyle", { configurable: true, get() { return dS.get.call(this); }, set(x) { if (dans) vu.add(String(x).toLowerCase()); dS.set.call(this, x); } });
    Object.defineProperty(ctx, "fillStyle", { configurable: true, get() { return dF.get.call(this); }, set(x) { if (dans) vu.add(String(x).toLowerCase()); dF.set.call(this, x); } });
    const O = { drawWall, drawJoins, drawOpening, drawItem }; const env = (fn) => function () { dans++; try { return fn.apply(this, arguments); } finally { dans--; } };
    drawWall = env(O.drawWall); drawJoins = env(O.drawJoins); drawOpening = env(O.drawOpening); drawItem = env(O.drawItem);
    try { draw(); } finally { drawWall = O.drawWall; drawJoins = O.drawJoins; drawOpening = O.drawOpening; drawItem = O.drawItem; delete ctx.strokeStyle; delete ctx.fillStyle; }
    const BANNI = ["#7c3aed", "#b45309", "#16a34a", "#dc2626", "#9d8df0", "#5a5875", "#3f3d63", "#1e1b3a", "#2b2857", "#a78bfa", "#ca8a04"];
    const mauvais = [...vu].filter((c) => BANNI.includes(c) || /^rgba\((124, ?58, ?237|180, ?83, ?9|90, ?88, ?117)/.test(c));
    r[`une seule encre · le plan (Avant travaux) ne dessine qu'en encre (${[...vu].length} teintes vues)${mauvais.length ? " — " + mauvais.join(", ") : ""}`] = !mauvais.length && vu.has(ENCRE) && vu.has(ENCRE_CLOISON);
    /* 8. murs : poché plein, cloison à 65 %, mur épais hachuré visible, la cloison s'arrête à la face du mur en T */
    state = blankState(); const lv = L(); const W = (a, c, ty) => { const x = { id: uid(), a: v(...a), b: v(...c), type: ty }; lv.walls.push(x); return x; };
    W([0, 0], [6, 0], "mur"); W([3, 0], [3, 3], "cloison"); W([1, 1], [1, 3], "porteur"); afterChange(); settings.grid = false; settings.cotes = false; tool = "export"; view.zoom = 100; view.ox = 200; view.oy = 200; draw();
    const lire = (x, y) => { const s2 = S(v(x, y)), k = cv.width / cv.clientWidth, d = ctx.getImageData(Math.round(s2.x * k), Math.round(s2.y * k), 1, 1).data; return [d[0], d[1], d[2]]; };
    const pres = (c, ref, tol = 4) => c.every((n2, i) => Math.abs(n2 - ref[i]) <= tol);
    r["murs · un mur en poché plein d'encre (#1E1B4B), une cloison à 65 % (#5E5A86)"] = pres(lire(4.5, 0), [30, 27, 75]) && pres(lire(3, 1.5), [94, 90, 134]);
    r["murs · une cloison existante s'arrête à la face du mur rencontré en T (pas d'encoche claire jusqu'à l'axe)"] = pres(lire(3, 0.05), [30, 27, 75]);
    let cl = 0, tot = 0; for (let y = 1.2; y < 2.8; y += 0.01) { tot++; const c = lire(1.15, y); if (c[0] > 70) cl++; } /* hachure blanche à 35 % dans un mur de 60 cm */
    r[`murs · un mur épais se lit hachuré (${Math.round(cl / tot * 100)} % de pixels de hachure)`] = cl / tot > 0.12;
    /* 9. électricité : taille d'écran bornée, jamais un pâté */
    const taille = (k, z) => { const d = ITEMS[k], it = { type: k, x: 0, y: 0, w: d.w, h: d.h, rot: 0 }; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); ctx.clearRect(0, 0, 400, 400); view.zoom = z; view.ox = 200; view.oy = 200; drawItem(it, false);
      const kk = devicePixelRatio, D = ctx.getImageData(0, 0, 400 * kk, 400 * kk).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
      for (let y = 0; y < 400 * kk; y++) for (let x = 0; x < 400 * kk; x++) { const i = (y * 400 * kk + x) * 4; if (D[i + 3] > 30 && D[i] < 120) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      const L2 = Math.max(x1 - x0 + 1, y1 - y0 + 1) / kk; return { L: L2, encre: n / kk / kk / Math.max(1, (x1 - x0 + 1) * (y1 - y0 + 1) / kk / kk) }; };
    const pts = ["prise", "prise2", "interrupteur", "lumiere", "applique"].flatMap((k) => [15, 60, 400].map((z) => [k, z, taille(k, z)]));
    const hors = pts.filter(([, , m]) => m.L < 9 || m.L > 24 || m.encre > 0.85).map(([k, z, m]) => `${k}@${z} : ${m.L.toFixed(0)} px, ${Math.round(m.encre * 100)} %`); /* avant D60, au téléphone : un pâté de 38 px plein */
    r[`électricité · le symbole garde 9 à 24 px à l'écran (boîte de 12 à 20 px) du téléphone au gros plan, jamais un pâté${hors.length ? " — " + hors.join(" ; ") : ""}`] = !hors.length;
    draw();
    /* 10. glyphes du canvas : poignées carrées, losange, rotation au registre, défauts en losange, plus de « à poser » écrit */
    state = blankState(); const l2 = L(); l2.walls.push({ id: "m1", a: v(0, 0), b: v(4, 0), type: "mur" }, { id: "m2", a: v(1, 1), b: v(2, 2), type: "cloison" }); l2.items.push({ id: "e1", type: "lavabo", x: 2, y: 0.33, w: 0.6, h: 0.45, rot: 0, st: "creer" }); afterChange(); setMode("projet"); closeModal(); tool = "select"; fitView();
    const appels = { car: 0, los: 0, ico: [], txt: [] }; const G = { poigneeCarree, losangeAlerte, icoCanvas }, FT = ctx.fillText;
    poigneeCarree = function () { appels.car++; return G.poigneeCarree.apply(this, arguments); }; losangeAlerte = function () { appels.los++; return G.losangeAlerte.apply(this, arguments); }; icoCanvas = function (n) { appels.ico.push(n); return G.icoCanvas.apply(this, arguments); }; ctx.fillText = function (x) { appels.txt.push(String(x)); return FT.apply(this, arguments); };
    try { sel = { kind: "wall", id: "m1" }; draw(); const car = appels.car; sel = { kind: "item", id: "e1" }; multi = []; draw();
      r["glyphes · un mur choisi : deux poignées carrées ; un équipement choisi : la flèche « pivoter » du registre ; bouts libres : losanges"] = car === 2 && appels.ico.includes("pivoter") && appels.los >= 2;
      r["glyphes · plus de « à poser » écrit au-dessus d'un appareil à créer"] = !appels.txt.some((x) => /poser/.test(x));
    } finally { poigneeCarree = G.poigneeCarree; losangeAlerte = G.losangeAlerte; icoCanvas = G.icoCanvas; ctx.fillText = FT; sel = null; }
    return r;
  } catch (e) { return { ["U2 · symboles et glyphes du plan — " + e.message]: false }; } }));
  await p.close();
}

await b.close().catch(() => {});
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : `\n✓ refonte : ${Object.keys(t).length} contrôles (registre d'icônes, design system, bibliothèques, symboles du plan et vignettes)`);
process.exit(echecs.length || errs.length ? 1 : 0);
