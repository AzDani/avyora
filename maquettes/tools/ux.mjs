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
    r["décision · chaque état porte l'échantillon de la légende (Je garde encre, À remplacer rouge, À boucher hachuré)"] = document.querySelector("#pbody .segetat").classList.contains("stack") && ech("e-garder")?.backgroundColor === "rgb(43, 40, 87)" && ech("e-remplacer")?.backgroundColor === "rgb(185, 28, 28)" && /repeating-linear-gradient/.test(ech("e-boucher")?.backgroundImage || "") && /dashed/.test(ech("e-existant")?.borderTopStyle || "");
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

await b.close().catch(() => {});
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : `\n✓ refonte : ${Object.keys(t).length} contrôles (registre d'icônes, design system, bibliothèques)`);
process.exit(echecs.length || errs.length ? 1 : 0);
