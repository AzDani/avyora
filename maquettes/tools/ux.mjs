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
 * U3 · organisation et disposition (D61) — à 1 440, 1 280 et 1 024 :
 *   - colonne d'outils en sections (Édition, Structure, Menuiseries, Équipements, Annoter, Fond), 10 outils dans cet ordre,
 *     bulle riche (nom, touche, une phrase) ;
 *   - bande de contexte en haut (niveaux à gauche, vues et légende à droite), barre d'options dessous (une ligne de 44 px
 *     pour chaque outil), barre d'état en bas (consigne, mesure en direct, surface, échelle, zoom, grille, aimant,
 *     affichage) ; plus aucune carte posée sur la zone utile du plan ; le cadrage commence sous la tête du plan ;
 *   - Murs (type, trait, pièce, poteau et poutre vers Équipements), Ouvertures (11 modèles + fenêtre de toit), Équipements
 *     (6 familles en onglets, chaque modèle une fois, recherche par mots de tous les jours) ; plus de modèle posé en
 *     douce ; après une pose, le panneau montre l'objet posé ; choisir un outil rebascule sur Détails ; chaque outil a
 *     son mode d'emploi ; mesure en direct et accrochage nommé (coin…) ; l'échelle graphique mesure ce qu'elle dit.
 *
 * U4 · interactions et retours (D62) — à 1 440, 1 280 et 1 024 :
 *   - UNE table de raccourcis : le clavier lit la touche dans TOOLS (une touche changée là change le raccourci) ;
 *   - Échap en cascade : le geste en cours, puis l'outil (retour à la Sélection, l'objet posé reste choisi), puis la
 *     sélection ;
 *   - un seul langage : choisi, un mur (à démolir compris), une ouverture, un équipement gardent leur couleur métier et
 *     prennent un contour indigo plein ; le survol, le même contour, léger (plus de lilas ni de tirets) ;
 *   - la barre d'actions près de l'élément choisi (role toolbar) : dans la zone du plan pour chaque élément de
 *     l'exemple, ses boutons appellent les fonctions des fiches (décision, pivoter, dupliquer, supprimer, sens), au
 *     clavier (Tab, ← →, Échap) ; rien pour une pièce, pendant la pose ni en lecture seule ;
 *   - le menu du clic droit (outil Sélection, role menu) : les mêmes actions avec leurs touches, au clavier (↓, Fin,
 *     Échap qui rend le focus, Maj + F10), toujours dans l'écran ; hors d'un élément, le clic droit garde son rôle ;
 *   - l'aperçu de pose : cotes temporaires du jambage au voisin, refus visible ; accrochage nommé (Cote, Mesurer) ;
 *     raccourcis d'une touche coupés : ni la barre ni le menu ne promettent « R ».
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
  Object.assign(t, await p.evaluate((larg) => { try {
    const r = {}, vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none";
    const norm = (h) => { const g = document.createElementNS("http://www.w3.org/2000/svg", "svg"); g.innerHTML = h; return g.innerHTML; }; const TRACES = new Set(Object.values(ICONS).map(norm));
    const ILLU = ".brand .lg svg, .wv svg, .pmini svg, .tpl .tv svg, .th.op svg, .xbrand svg";
    const ZONES = ".top, #tools, #pbody, #pfoot, .zoomctl, #levels, #modes, #optbar, #etat, #layerPop, .mpop, .overlay, #emptyStage"; /* D61 : la barre d'options et la barre d'état aussi */
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
    setTool("ouverture"); /* D61 : les contrôles de la barre d'options comptent aussi (cartes, segmentés, onglets de famille) */
    const ctrl = [...document.querySelectorAll(".top .ib, #tools .tb, .zoomctl button, #levels, #levels button, #modes button, #pbody .ib, #pbody .seg, #pbody .seg button, #pbody .fin, #pbody .lib2 .it, #pbody .ptabs button, #pfoot .bcard, .mpop, #optbar .lib2 .it")].filter(vis);
    setTool("mur"); ctrl.push(...[...document.querySelectorAll("#optbar .seg.barre, #optbar .seg.barre button, #optbar .fin, #optbar .ib")].filter(vis));
    setTool("equipement"); ctrl.push(...[...document.querySelectorAll("#optbar .fams button, #optbar .recherche")].filter(vis)); setTool("select");
    const rayHors = ctrl.map((x) => getComputedStyle(x).borderTopLeftRadius).filter((v) => !RAY.has(v) && !/^(50%|9\d\dpx|99px)$/.test(v) && parseFloat(v) < 50);
    r[`${larg} · rayons des contrôles sur l'échelle (6 / 8 / 12)${rayHors.length ? " — " + [...new Set(rayHors)].join(", ") : ""}`] = !rayHors.length;
    const demi = [...document.querySelectorAll(".top *, #tools *, #pbody *, #pfoot *, .zoomctl *, #levels *, #modes *")].filter((x) => x.childNodes.length && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(x)).map((x) => getComputedStyle(x).fontSize).filter((v) => !Number.isInteger(parseFloat(v)));
    r[`${larg} · aucune taille de texte à demi-pixel (échelle 11 / 12 / 13 / 14 / 16 / 20)${demi.length ? " — " + [...new Set(demi)].join(", ") : ""}`] = !demi.length;
    const h = (sel) => [...document.querySelectorAll(sel)].filter(vis).map((x) => Math.round(x.getBoundingClientRect().height));
    r[`${larg} · hauteurs : boutons de la barre 32, primaire 36, zoom et niveaux 28`] = h(".top .ib:not(.primary)").every((v) => v === 32) && h(".top .ib.primary").every((v) => v === 36) && h(".zoomctl button").every((v) => v === 28) && h("#levels button").every((v) => v === 28);
    /* bibliothèques — D61 : dans la barre d'options, au-dessus du plan */
    setTool("equipement");
    const fics = [...document.querySelectorAll("#optbar .fams button:not(.on) .ico")].map((x) => getComputedStyle(x).color);
    r[`${larg} · familles neutres : onglets à l'icône en encre, sans teinte de famille`] = fics.length === 5 && new Set(fics).size === 1 && !document.querySelector("#optbar .fams [style]");
    setTool("ouverture");
    const on = document.querySelector("#optbar .lib2 .it.on");
    r[`${larg} · la carte choisie est indigo, comme toute sélection`] = !!on && getComputedStyle(on).borderTopColor === "rgb(79, 70, 229)";
    const vig = (n) => { const it = [...document.querySelectorAll("#optbar .lib2 .it")].find((x) => x.querySelector("b").textContent === n); return it ? it.querySelector(".th").innerHTML : "?"; };
    r[`${larg} · vignettes : Porte d'entrée, Porte de garage et Petite fenêtre ont leur propre dessin`] = vig("Porte d'entrée") !== vig("Porte simple") && vig("Porte de garage") !== vig("Porte coulissante (intérieure)") && vig("Petite fenêtre") !== vig("Fenêtre");
    /* bibliothèque à toutes les largeurs (D54 l'exigeait à 1 280 et 1 440 ; D59 ajoute 1 024 × 768) — D61 : dans la partie visible de la barre */
    const vu = (n) => { const O = document.getElementById("optbar").getBoundingClientRect(), it = [...document.querySelectorAll("#optbar .lib2 .it")].find((x) => x.querySelector("b").textContent === n); if (!it) return false; const q = it.getBoundingClientRect(); return q.left >= O.left - 0.5 && q.right <= O.right + 0.5 && q.top >= O.top - 0.5 && q.bottom <= O.bottom + 0.5; };
    r[`${larg} · Ouvertures : Fenêtre, Porte d'entrée, Porte simple, Porte-fenêtre sans défiler`] = ["Fenêtre", "Porte d'entrée", "Porte simple", "Porte-fenêtre"].every(vu);
    setTool("equipement"); setFamEquip("bain");
    r[`${larg} · Équipements : Douche, Lavabo, WC sans défiler`] = ["Douche", "Lavabo", "WC"].every(vu);
    /* mini-coupes — D61 : dans la barre d'options de l'outil Murs */
    setTool("mur");
    const segs = [...document.querySelectorAll("#optbar .seg.barre")];
    const coupes = (s) => [...s.querySelectorAll(":scope>button>svg.ico.mc")].filter(vis).map((x) => x.innerHTML);
    r[`${larg} · outil Murs : chaque type de mur a sa mini-coupe, toutes différentes`] = segs.length >= 2 && coupes(segs[0]).length === 5 && new Set(coupes(segs[0])).size === 5;
    /* ce qui déborde à droite de la barre se fait défiler : les coupes non visibles comptent quand même (getClientRects) */
    r[`${larg} · outil Murs : le trait (axe, face ext., face int.) a sa mini-coupe`] = coupes(segs[1]).length === 3 && new Set(coupes(segs[1])).size === 3;
    setTool("select"); return r;
  } catch (e) { return { [`U1 · ${larg} — ${e.message}`]: false }; } }, L));
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
    /* 5. les bibliothèques montrent ces vignettes, à leur taille, sans réduction — D61 : dans la barre d'options (54 × 30),
       et le modèle choisi en grand dans le panneau (84 × 44) */
    const net = (im, w, h) => { if (!im) return false; const q = im.getBoundingClientRect(); return Math.round(q.width) === w && Math.round(q.height) === h && getComputedStyle(im).transform === "none"; };
    setTool("ouverture"); const io = [...document.querySelectorAll("#optbar .lib2 .it .th")];
    r["bibliothèque des ouvertures · chaque carte montre la vignette du plan (img.vig 54 × 30, non réduite), plus la fenêtre de toit"] = io.length === Object.keys(OPENINGS).length + 1 && io.every((th) => net(th.querySelector("img.vig"), 54, 30)) && net(document.querySelector("#pbody .mprop img.vig"), 84, 44);
    setTool("equipement"); const ie = []; for (const f of FAM_EQUIP) { setFamEquip(f[0]); ie.push(...[...document.querySelectorAll("#optbar .lib2 .it .th")].map((th) => net(th.querySelector("img.vig"), 54, 30))); }
    setItemType("wc");
    r["bibliothèque des équipements · chaque carte montre la vignette du plan (img.vig 54 × 30, non réduite), famille par famille"] = ie.length === Object.keys(ITEMS).length && ie.every(Boolean) && net(document.querySelector("#pbody .mprop img.vig"), 84, 44);
    itemType = null; setFamEquip("bain");
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

/* ═════════ 6. U3 · organisation et disposition (D61) ═════════ */
for (const [L0, H0] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L0, haut: H0 });
  Object.assign(t, await p.evaluate(async (larg) => { try {
    const r = {}, vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
    const rect = (e) => e.getBoundingClientRect(), dans = (a, b, m = 0.5) => a.left >= b.left - m && a.right <= b.right + m && a.top >= b.top - m && a.bottom <= b.bottom + m;
    const coupe = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const ST = rect(document.getElementById("stage")), TP = document.getElementById("tetePlan"), OB = document.getElementById("optbar"), ET = document.getElementById("etat");
    /* a. la colonne d'outils en sections, par intention */
    const cats = [...document.querySelectorAll("#tools .cat")].map((c) => c.textContent.trim());
    r[`${larg} · outils : sections Édition, Structure, Menuiseries, (filet), Annoter, Fond — vu : ${cats.join(" | ")}`] = cats.join("|") === "Édition|Structure|Menuiseries||Annoter|Fond";
    const ordre = [...document.querySelectorAll("#tools .tb")].map((b) => b.getAttribute("onclick").match(/'(\w+)'/)[1]);
    r[`${larg} · outils : 10 boutons, dans l'ordre des sections`] = ordre.join() === "select,zone,mur,doublage,ouverture,equipement,cote,mesure,texte,calque";
    const tips = [...document.querySelectorAll("#tools .tb")].map((b) => b.dataset.tip);
    r[`${larg} · outils : bulle riche (nom, touche, une phrase) ; Ouvertures « Portes, fenêtres, baies, passages »`] = tips.every((x, i) => { const sp = document.querySelectorAll("#tools .tb span")[i].textContent; return x.startsWith(sp) && x.split(" · ").length >= 2 && x.length > sp.length + 15; }) && /\(P\) · Portes, fenêtres, baies, passages/.test(document.querySelector('#tools .tb[aria-label="Ouvertures"]').dataset.tip) && /\(M\)/.test(document.querySelector('#tools .tb[aria-label="Murs"]').dataset.tip);
    r[`${larg} · outils : aucun titre de section coupé ni plus large que la colonne`] = [...document.querySelectorAll("#tools .cat")].every((c) => c.scrollWidth <= c.clientWidth + 1);
    /* b. les bandes : la tête (niveaux à gauche, vues à droite, barre d'options) en haut, la barre d'état en bas, rien sur le plan */
    const lvR = rect(document.getElementById("levels")), moR = rect(document.getElementById("modes")), tpR = rect(TP), etR = rect(ET);
    r[`${larg} · bande de contexte : niveaux à gauche, vues à droite, en haut de la zone du plan`] = document.getElementById("pbande").contains(document.getElementById("levels")) && document.getElementById("pbande").contains(document.getElementById("modes")) && Math.abs(tpR.top - ST.top) < 1 && lvR.left < moR.left && moR.right <= ST.right + 0.5 && lvR.left - ST.left < 20;
    r[`${larg} · barre d'état : consigne, mesure en direct, surface, échelle, zoom, grille, aimantation, affichage — en bas, sur toute la largeur`] = ["hint", "mesureLive", "measBox", "surfBadge", "echelle", "zlabel", "gridBtn", "magnetBtn", "layersBtn"].every((id) => ET.contains(document.getElementById(id))) && Math.abs(etR.bottom - ST.bottom) < 1 && Math.abs(etR.width - ST.width) < 1 && etR.height <= 33;
    const Z = zoneUtile(), cvr = rect(cv), zone = { left: cvr.left + Z.x0, right: cvr.left + Z.x1, top: cvr.top + Z.y0, bottom: cvr.top + Z.y1 };
    const surLePlan = [...document.querySelectorAll("#stage > *")].filter((e) => e !== cv && vis(e) && !e.matches("#toast, #emptyStage, #layerPop, .cotePop, #cvAide, #cvAnnonce, #bgFile") && coupe(rect(e), zone)).map((e) => e.id || e.className);
    r[`${larg} · plus aucune carte posée sur le plan (zone utile dégagée)${surLePlan.length ? " — " + surLePlan.join(", ") : ""}`] = !surLePlan.length && Math.abs(Z.y0 - tpR.height) < 1 && Math.abs(cvr.height - Z.y1 - etR.height) < 1;
    fitView(); { const b0 = bbox(L()), a = S(v(b0.x0, b0.y0)); r[`${larg} · cadrage : le plan commence sous la tête du plan (aucune cote sous le sélecteur de vue)`] = a.y - 40 >= Z.y0 - 1; }
    /* c. la barre d'options : une ligne, pour chaque outil, qui défile à l'horizontale sans faire défiler la page */
    const hauteurs = {}, vides = [];
    for (const o of ["select", "zone", "mur", "ouverture", "doublage", "equipement", "cote", "mesure", "texte", "calque"]) { setTool(o); hauteurs[o] = Math.round(rect(OB).height); if (!OB.children.length) vides.push(o); }
    r[`${larg} · barre d'options : une ligne de 44 px pour chacun des 10 outils${vides.length ? " — vide : " + vides.join(", ") : ""}`] = !vides.length && Object.values(hauteurs).every((h) => h === 44) && document.documentElement.scrollWidth <= innerWidth;
    setTool("mur");
    r[`${larg} · Murs : type (5), le trait (3), pièce rectangulaire, poteau et poutre`] = OB.querySelectorAll(".seg.barre")[0]?.children.length === 5 && OB.querySelectorAll(".seg.barre")[1]?.children.length === 3 && !!OB.querySelector("#rectL") && !!OB.querySelector("#rectl") && [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent).join() === "Poteau,Poutre";
    OB.querySelectorAll(".seg.barre")[0].children[2].click();
    r[`${larg} · Murs : un clic choisit « Cloison » (wallType), le panneau dit « Prochains murs : Cloison »`] = wallType === "cloison" && /Cloison/.test(document.querySelector("#pbody .mprop b").textContent);
    wallType = "auto"; [...OB.querySelectorAll(".lib2 .it")].find((x) => /Poteau/.test(x.textContent)).click();
    r[`${larg} · Murs › Poteau : passe à l'outil Équipements avec le poteau choisi`] = tool === "equipement" && itemType === "poteau" && famEquip === "structure";
    setTool("ouverture"); const cOuv = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent);
    r[`${larg} · Ouvertures : les 11 modèles puis la fenêtre de toit, en cartes`] = cOuv.length === 12 && Object.values(OPENINGS).every((o) => cOuv.includes(o.label)) && cOuv[11] === ITEMS.velux.label;
    [...OB.querySelectorAll(".lib2 .it")].find((x) => /Porte-fenêtre/.test(x.textContent)).click();
    r[`${larg} · Ouvertures : un clic choisit le modèle (carte indigo), le panneau montre sa fiche (vignette, dimensions)`] = openingType === "porte_fenetre" && /Porte-fenêtre/.test(OB.querySelector(".lib2 .it.on b").textContent) && /Porte-fenêtre/.test(document.querySelector("#pbody .mprop").textContent) && /1,40 × 2,15 m/.test(document.querySelector("#pbody .mprop").textContent);
    [...OB.querySelectorAll(".lib2 .it")].find((x) => /Fenêtre de toit/.test(x.textContent)).click();
    r[`${larg} · Ouvertures › Fenêtre de toit : l'outil Équipements, famille Escalier et structure`] = tool === "equipement" && itemType === "velux" && OB.querySelector(".fams button.on").getAttribute("aria-label") === "Escalier et structure";
    /* d. Équipements : familles en onglets, recherche, plus de modèle posé en douce */
    itemType = null; setTool("equipement"); setFamEquip("bain");
    const fams = [...OB.querySelectorAll(".fams button")].map((x) => x.getAttribute("aria-label"));
    r[`${larg} · Équipements : 6 familles en onglets (Salle de bain, Cuisine, Chauffage, Électricité, Mobilier, Escalier et structure)`] = fams.join("|") === "Salle de bain|Cuisine|Chauffage|Électricité|Mobilier|Escalier et structure";
    const tous = FAM_EQUIP.flatMap((f) => f[3]);
    r[`${larg} · Équipements : chaque modèle dans une famille, une seule fois (${tous.length} pour ${Object.keys(ITEMS).length})`] = tous.length === Object.keys(ITEMS).length && new Set(tous).size === tous.length && Object.keys(ITEMS).every((k) => tous.includes(k));
    chercherEquip("toilettes"); const tr = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent);
    chercherEquip("zzzz"); const rien = /Aucun équipement/.test(OB.textContent); chercherEquip("chauffe eau"); const ce = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent); chercherEquip("");
    r[`${larg} · Équipements : la recherche trouve « toilettes » → WC, « chauffe eau » → Chauffe-eau, et dit quand rien ne répond`] = tr.join() === "WC" && rien && ce.includes("Chauffe-eau");
    const n0 = L().items.length, c = S(v(...(() => { const b0 = bbox(L()); return [(b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2]; })())); clickAction(W2(c));
    r[`${larg} · Équipements : sans modèle choisi, un clic ne pose rien (fin du « Lit double » en douce) et le dit`] = itemType === null && L().items.length === n0 && /Choisis d'abord un modèle/.test(document.getElementById("toast").textContent) && /Choisis d'abord un modèle/.test(document.getElementById("hint").textContent);
    [...OB.querySelectorAll(".lib2 .it")].find((x) => x.querySelector("b").textContent === "WC").click(); clickAction(W2(c));
    r[`${larg} · Équipements : après la pose, le panneau montre l'objet posé (sa fiche)`] = L().items.length === n0 + 1 && sel?.kind === "item" && document.querySelector("#pbody .ptitle")?.textContent.includes("WC");
    undo(); sel = null;
    /* e. le panneau de propriétés : choisir un outil bascule sur Détails, chaque outil a son mode d'emploi */
    setTool("select"); setPanelTab("suivi"); setTool("ouverture");
    r[`${larg} · panneau : choisir un outil rebascule de Suivi sur Détails`] = panelTab === "details" && !!document.querySelector("#pbody .memploi");
    const sansMode = ["mur", "ouverture", "doublage", "equipement", "cote", "mesure", "texte", "zone", "calque"].filter((o) => { setTool(o); return !(document.querySelectorAll("#pbody .memploi li").length >= 2); });
    r[`${larg} · panneau : chaque outil a son mode d'emploi court (2 à 3 gestes numérotés)${sansMode.length ? " — sans : " + sansMode.join(", ") : ""}`] = !sansMode.length;
    setTool("select");
    /* f. la barre d'état : mesure en direct et accrochage nommé pendant un tracé, échelle graphique juste */
    setTool("mur"); const b0 = bbox(L()); hover = v(b0.x1 + 2, b0.y0); clickAction(hover); hover = v(b0.x1 + 2, b0.y0 + 3); draw();
    const ml = document.getElementById("mesureLive");
    r[`${larg} · barre d'état : pendant un tracé, la longueur, l'angle et l'accrochage nommé (« ${ml.textContent} »)`] = vis(ml) && /Longueur 3,00 m/.test(ml.textContent) && /Angle 270°/.test(ml.textContent) && /angle droit|grille|alignement|coin|face du mur|prolongement/.test(ml.textContent);
    hover = { ...L().walls[0].a }; draw(); const acc = ml.querySelector(".acc")?.textContent || "";
    r[`${larg} · barre d'état : au-dessus d'un coin, l'accrochage dit « coin »`] = acc === "coin";
    keys.shift = false; endChain(false); setTool("select"); hover = null; draw();
    const ech = document.getElementById("echelle"), eb = ech.querySelector("i"), lab = ech.querySelector("span").textContent, m = parseFloat(lab.replace(",", ".")) / (/cm/.test(lab) ? 100 : 1);
    r[`${larg} · échelle graphique : la barre « ${lab} » mesure ${lab} au zoom du plan`] = !vis(ech) || Math.abs(rect(eb).width - m * view.zoom) <= 2;
    zoomBy(1.25); const lab2 = ech.querySelector("span").textContent, m2 = parseFloat(lab2.replace(",", ".")) / (/cm/.test(lab2) ? 100 : 1);
    r[`${larg} · échelle graphique : suit le zoom`] = !vis(ech) || Math.abs(rect(eb).width - m2 * view.zoom) <= 2;
    fitView();
    /* g. la consigne tient sur une ligne, sans être coupée, pour l'outil et la sélection courants (1 440 et 1 280) */
    if (larg >= 1280) { const coupees = []; for (const o of ["select", "zone", "mur", "ouverture", "doublage", "cote", "mesure", "texte", "calque"]) { setTool(o); draw(); const h = document.getElementById("hint"); if (h.scrollWidth > h.clientWidth + 1) coupees.push(o); } setTool("select");
      r[`${larg} · barre d'état : la consigne de chaque outil se lit en entier${coupees.length ? " — coupée : " + coupees.join(", ") : ""}`] = !coupees.length; }
    return r;
  } catch (e) { return { [`U3 · ${larg} — ${e.message}`]: false }; } }, L0));
  await p.close();
}

/* ═════════ 7. U4 · interactions et retours (D62) ═════════ */
t["source · le clavier lit la table TOOLS (plus de lettres d'outil écrites en dur dans le gestionnaire)"] = !/if\(k==='[a-z]'\)setTool\(/.test(SRC) && /outilDeTouche\(k\)/.test(SRC);
t["source · Annuler et Rétablir ont la bulle commune (nom, raccourci, une phrase), plus de title natif"] = /id="undoBtn" data-tip="Annuler \(Ctrl Z\) · [^"]+"/.test(SRC) && /id="redoBtn" data-tip="Rétablir \(Ctrl Y\) · [^"]+"/.test(SRC) && !/id="(undo|redo)Btn" title=/.test(SRC);
t["source · plus de cadre de sélection en tirets ni de survol lilas (ouvertures, équipements, électricité)"] = !/setLineDash\(\[px\(4\),px\(3\)\]\);ctx\.(?:strokeStyle='#4f46e5'|lineWidth=px\(1\.25\);ctx\.strokeStyle='#4f46e5')/.test(SRC) && !/strokeStyle='#a78bfa';ctx\.lineWidth=1\.5[^;]*;strokeRects/.test(SRC) && !/ctx\.arc\(c\.x,c\.y,Math\.max\(14,o\.w\/2\*z\+6\)/.test(SRC);
for (const [L0, H0] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L0, haut: H0 });
  const plan = async (x, y) => p.evaluate((x, y) => { const q = S(v(x, y)), r = cv.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; }, x, y);
  try { /* une fonction absente (fichier d'avant D62) : un échec dit, pas un plantage */
  /* a. une seule table de raccourcis : la touche lue dans TOOLS, même changée */
  Object.assign(t, await p.evaluate((larg) => { const r = {};
    const od = typeof outilDeTouche === "function" ? outilDeTouche : () => undefined;
    const ok = TOOLS.filter((x) => x[2]).every((x) => od(x[2]) === x[0] && od(x[2].toLowerCase()) === x[0]);
    r[`${larg} · clavier : chaque touche de TOOLS rend son outil (outilDeTouche)`] = ok && od("z") === null;
    return r; }, L0));
  await p.evaluate(() => { setMode("existant"); closeModal(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); setTool("select"); });
  const essais = await p.evaluate(() => TOOLS.filter((x) => x[2]).map((x) => [x[2].toLowerCase(), x[0]]));
  const rates = [];
  for (const [k, id] of essais) { await p.keyboard.press(k); await wait(20); const o = await p.evaluate(() => tool); if (o !== id) rates.push(k + "→" + o); await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); }
  t[`${L0} · clavier : les ${essais.length} touches d'outil, tapées pour de vrai${rates.length ? " — " + rates.join(", ") : ""}`] = !rates.length;
  await p.evaluate(() => { setTool("select"); const m = TOOLS.find((x) => x[0] === "mur"); m.__k = m[2]; m[2] = "Q"; });
  await p.keyboard.press("q"); await wait(20); const viaQ = await p.evaluate(() => tool); await p.keyboard.press("Escape"); await p.keyboard.press("m"); await wait(20); const viaM = await p.evaluate(() => tool);
  await p.evaluate(() => { const m = TOOLS.find((x) => x[0] === "mur"); m[2] = m.__k; delete m.__k; setTool("select"); render(); });
  t[`${L0} · clavier : la touche changée dans TOOLS change le raccourci (Q → Murs, M ne fait plus rien) — vu ${viaQ} / ${viaM}`] = viaQ === "mur" && viaM === "select";
  /* b. Échap : le geste, puis l'outil, puis la sélection */
  await p.evaluate(() => { setTool("ouverture"); });
  await p.keyboard.press("Escape"); await wait(30);
  t[`${L0} · Échap : sans geste en cours, l'outil Ouvertures revient à la Sélection`] = await p.evaluate(() => tool === "select");
  await p.evaluate(() => { setTool("mur"); const b0 = bbox(L()); clickAction(v(b0.x1 + 1, b0.y0)); });
  await p.keyboard.press("Escape"); await wait(30);
  const e1 = await p.evaluate(() => ({ tool, chain: chain.length }));
  await p.keyboard.press("Escape"); await wait(30);
  const e2 = await p.evaluate(() => tool);
  t[`${L0} · Échap : un tracé en cours se termine (l'outil reste Murs), le 2e Échap rend la Sélection`] = e1.tool === "mur" && e1.chain === 0 && e2 === "select";
  { const w = await p.evaluate(() => { const w = L().walls.filter((x) => x.type === "mur").sort((a, c) => wallLen(c) - wallLen(a))[0]; const L2 = wallLen(w); let best = null; for (let k = 1; k < 20; k++) { const t2 = k / 20; if (!ouverturesChevauchees(L(), w.id, t2, 1.2, null).length && t2 * L2 > 0.8 && (1 - t2) * L2 > 0.8) { best = t2; break; } } setTool("ouverture"); setOpeningType("fenetre"); return { a: w.a, b: w.b, t: best }; });
    const q = await plan(w.a.x + (w.b.x - w.a.x) * w.t, w.a.y + (w.b.y - w.a.y) * w.t); await p.mouse.move(q.x, q.y); await wait(30); await p.mouse.click(q.x, q.y); await wait(80);
    await p.keyboard.press("Escape"); await wait(60);
    t[`${L0} · Échap après une pose : la Sélection, l'ouverture posée reste choisie et sa fiche ouverte`] = await p.evaluate(() => tool === "select" && sel && sel.kind === "opening" && /Fenêtre/.test(document.querySelector("#pbody .ptitle")?.textContent || ""));
    await p.keyboard.press("Escape"); await wait(30);
    t[`${L0} · Échap avec la Sélection : désélectionne`] = await p.evaluate(() => tool === "select" && !sel);
    await p.evaluate(() => undo()); }
  /* c. un seul langage : la couleur métier reste, le contour indigo se pose par-dessus */
  Object.assign(t, await p.evaluate((larg) => { const r = {};
    state = blankState(); const lv = L(); lv.walls.push({ id: "m1", a: v(0, 0), b: v(6, 0), type: "mur" }, { id: "m2", a: v(0, 0), b: v(0, 4), type: "mur" }, { id: "c1", a: v(3, 0), b: v(3, 4), type: "cloison", st: "demolir" });
    lv.openings.push({ id: "o1", wallId: "m1", t: 0.25, type: "porte", w: 0.83, h: 2.04, hinge: 1, side: 1 }); lv.items.push({ id: "e1", type: "lavabo", x: 5, y: 1.5, w: 0.6, h: 0.45, rot: 0 });
    afterChange(); setMode("existant"); closeModal(); tool = "select"; settings.grid = false; settings.cotes = false; view.zoom = 100; view.ox = 60; view.oy = 300; hover = null;
    const k = devicePixelRatio, lire = (x, y, dy = 0, dx = 0) => { const s = S(v(x, y)), d = ctx.getImageData(Math.round((s.x + dx) * k), Math.round((s.y + dy) * k), 1, 1).data; return [d[0], d[1], d[2]]; };
    const balaye = (x, y, sx, sy, d0, d1) => { for (let d = d0; d <= d1; d += 0.5) { const c = lire(x, y, sy * d, sx * d); if (c[2] > c[0] + 70 && c[2] > 150 && c[0] < 170) return c; } return null; };
    const indigo = (c) => c[2] > c[0] + 70 && c[2] > 150 && c[0] < 170, encre = (c) => Math.abs(c[0] - 30) < 8 && Math.abs(c[1] - 27) < 8 && Math.abs(c[2] - 75) < 8;
    /* le mur m1 : 20 cm = 20 px ; sa face haute à y = -10 px ; 4 px au-dessus = le contour */
    /* le mur m1 (20 cm = 20 px, axe à y = 300 px) : le contour est juste au-dessus de sa face (10 px) */
    sel = null; draw(); const libre = balaye(2.4, 0, 0, -1, 10.5, 16), coeurLibre = lire(2.4, 0);
    sel = { kind: "wall", id: "m1" }; draw(); const choisi = balaye(2.4, 0, 0, -1, 10.5, 16), coeurChoisi = lire(2.4, 0);
    r[`${larg} · un mur choisi garde son encre et prend un contour indigo (cœur ${coeurChoisi}, bord ${choisi} ; libre ${libre})`] = encre(coeurLibre) && encre(coeurChoisi) && !!choisi && !libre;
    setMode("projet"); closeModal(); tool = "select"; view.zoom = 100; view.ox = 60; view.oy = 300; sel = null; draw();
    const avantD = balaye(3, 2, -1, 0, 4, 10); sel = { kind: "wall", id: "c1" }; draw(); const apresD = balaye(3, 2, -1, 0, 4, 10), coeurD = lire(3, 2);
    r[`${larg} · un mur à démolir choisi se voit : contour indigo autour du jaune (bord ${apresD}, libre ${avantD}, cœur ${coeurD})`] = !!apresD && !avantD && coeurD[0] > 200 && coeurD[1] > 150 && coeurD[2] < 200;
    /* ouverture et équipement : le dessin reste à l'encre, un cadre plein indigo (jamais en tirets) */
    setMode("existant"); closeModal(); tool = "select"; view.zoom = 100; view.ox = 60; view.oy = 300;
    const traits = []; const S0 = ctx.stroke, SR = ctx.strokeRect;
    ctx.stroke = function () { traits.push([String(this.strokeStyle).toLowerCase(), this.getLineDash().length]); return S0.apply(this, arguments); };
    ctx.strokeRect = function () { traits.push([String(this.strokeStyle).toLowerCase(), this.getLineDash().length]); return SR.apply(this, arguments); };
    let o1, e1;
    try { traits.length = 0; drawOpening(L().openings[0], true); o1 = traits.slice(); traits.length = 0; drawItem(L().items[0], true); e1 = traits.slice(); }
    finally { ctx.stroke = S0; ctx.strokeRect = SR; }
    const cadre = (T) => T.some(([c, d]) => c === "#4f46e5" && d === 0) && !T.some(([c, d]) => c === "#4f46e5" && d > 0);
    const encreSeule = (T) => T.filter(([c]) => c !== "#4f46e5" && !/^rgba\(79, ?70, ?229/.test(c)).length >= 2;
    r[`${larg} · une ouverture choisie : son symbole à l'encre, un cadre plein indigo`] = cadre(o1) && encreSeule(o1);
    r[`${larg} · un équipement choisi : son symbole à l'encre, un cadre plein indigo`] = cadre(e1) && encreSeule(e1);
    /* survol : le même langage, léger (plus de cercle ni de tirets lilas) */
    const vu = new Set(), dS = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "strokeStyle");
    Object.defineProperty(ctx, "strokeStyle", { configurable: true, get() { return dS.get.call(this); }, set(x) { vu.add(String(x).toLowerCase()); dS.set.call(this, x); } });
    const appels = []; const CM = contourMur; contourMur = function (w, a, b2, fort) { appels.push([w.id, fort]); return CM.apply(this, arguments); };
    try { sel = null; for (const h of [v(5, 1.5), L().walls.find((x) => x.id === "m2") && v(0, 2), (() => { const w = findWall("m1"); return add(w.a, mul(sub(w.b, w.a), 0.25)); })()]) { hover = h; draw(); } }
    finally { delete ctx.strokeStyle; contourMur = CM; hover = null; }
    r[`${larg} · survol : un liseré indigo léger (équipement, mur, ouverture), plus de lilas`] = vu.has("#4f46e5") && !vu.has("#a78bfa") && appels.some(([id, f]) => id === "m2" && f === false);
    return r; }, L0));
  /* d. la barre d'actions, près de l'élément choisi */
  await p.evaluate(() => { closeWelcome("sample"); closeModal(); setMode("projet"); closeModal(); setTool("select"); sel = null; fitView(); render(); });
  { const w = await p.evaluate(() => { const w = L().walls.find((x) => x.st === "demolir"); for (let k = 1; k < 20; k++) { const q = add(add(w.a, mul(sub(w.b, w.a), k / 20)), wallOff(w)), h = hitTest(q); if (h && h.kind === "wall" && h.id === w.id) return q; } return mul(add(w.a, w.b), 0.5); }); const q = await plan(w.x, w.y); await p.mouse.move(q.x, q.y); await p.mouse.click(q.x, q.y); await wait(120); }
  Object.assign(t, await p.evaluate((larg) => { const r = {}, b = document.getElementById("selbar"), q = b.getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect(), tp = document.getElementById("tetePlan").getBoundingClientRect(), et = document.getElementById("etat").getBoundingClientRect();
    const B = [...b.querySelectorAll("button")];
    r[`${larg} · barre d'actions : un clic sur un mur à démolir la montre (role toolbar), « ${LEX.etat.demolir} » enfoncé`] = !b.hidden && b.getAttribute("role") === "toolbar" && !!b.getAttribute("aria-label") && B.some((x) => x.textContent.trim() === LEX.etat.demolir && x.getAttribute("aria-pressed") === "true");
    r[`${larg} · barre d'actions : dans la zone du plan, jamais sous la bande du haut ni sous la barre d'état`] = q.left >= st.left && q.right <= st.right && q.top >= tp.bottom && q.bottom <= et.top;
    r[`${larg} · barre d'actions : chaque bouton a un nom (texte ou aria-label), les icônes leur bulle avec la touche`] = B.every((x) => (x.textContent.trim() || x.getAttribute("aria-label"))) && B.filter((x) => x.classList.contains("ic")).every((x) => /\(.+\)$/.test(x.dataset.tip || "") || x.getAttribute("aria-label") === x.dataset.tip);
    r[`${larg} · barre d'actions : ses icônes viennent du registre (svg.ico aria-hidden)`] = [...b.querySelectorAll("svg")].every((s) => s.classList.contains("ico") && s.getAttribute("aria-hidden") === "true");
    return r; }, L0));
  /* chaque élément du plan, choisi : la barre ne sort jamais de la zone du plan */
  t[`${L0} · barre d'actions : pour chaque mur, ouverture et équipement de l'exemple, elle reste dans la zone du plan`] = await p.evaluate(() => { const st = document.getElementById("stage").getBoundingClientRect(), tp = document.getElementById("tetePlan").getBoundingClientRect(), et = document.getElementById("etat").getBoundingClientRect(), b = document.getElementById("selbar"); const hors = [];
    for (const c of elementsDuPlan()) { if (c.kind === "room") continue; sel = { kind: c.kind, id: c.id }; multi = []; msel = []; render(); if (b.hidden) continue; const q = b.getBoundingClientRect(); if (!(q.left >= st.left - 0.5 && q.right <= st.right + 0.5 && q.top >= tp.bottom - 0.5 && q.bottom <= et.top + 0.5)) hors.push(c.kind); }
    sel = null; render(); return !hors.length; });
  /* les boutons appellent les fonctions des fiches */
  Object.assign(t, await p.evaluate((larg) => { const r = {}, b = document.getElementById("selbar"), btn = (f) => [...b.querySelectorAll("button")].find(f);
    const w = L().walls.find((x) => x.st === "demolir"); sel = { kind: "wall", id: w.id }; render(); btn((x) => x.textContent.trim() === LEX.etat.garder).click();
    const garde = wst(findWall(w.id)) === "garder"; btn((x) => x.textContent.trim() === LEX.etat.demolir).click(); const remis = wst(findWall(w.id)) === "demolir";
    r[`${larg} · barre d'actions : « ${LEX.etat.garder} » puis « ${LEX.etat.demolir} » changent la décision du mur (setWallProp)`] = garde && remis;
    setMode("existant"); closeModal(); setTool("select");
    const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier"); sel = { kind: "item", id: it.id }; multi = []; render(); const rot0 = it.rot, n0 = L().items.length;
    btn((x) => x.getAttribute("aria-label") === "Pivoter de 90°").click(); const pivote = Math.abs(((L().items.find((x) => x.id === it.id).rot - rot0 + 2 * Math.PI) % (2 * Math.PI)) - Math.PI / 2) < 1e-6;
    btn((x) => x.getAttribute("aria-label") === "Dupliquer").click(); const duplique = L().items.length === n0 + 1;
    btn((x) => x.getAttribute("aria-label") === "Supprimer").click(); const supprime = L().items.length === n0;
    r[`${larg} · barre d'actions : Pivoter (R), Dupliquer (Ctrl D), Supprimer (Suppr) agissent sur l'équipement`] = pivote && duplique && supprime && /\(R\)$/.test(btn((x) => x.getAttribute("aria-label") === "Pivoter de 90°")?.dataset.tip || "(R)");
    const d = L().openings.find((x) => OPENINGS[x.type].kind === "door"); sel = { kind: "opening", id: d.id }; render(); const s0 = d.side || 1;
    btn((x) => x.getAttribute("aria-label") === "Ouvre de l'autre côté").click();
    r[`${larg} · barre d'actions : « Ouvre de l'autre côté » retourne la porte (setOpeningProp)`] = (L().openings.find((x) => x.id === d.id).side || 1) === -s0;
    undo();
    /* elle ne s'affiche pas : une pièce, un outil de pose, la vue Après travaux */
    const room = L().rooms[0]; sel = { kind: "room", id: room.id }; render(); const piece = b.hidden;
    sel = { kind: "item", id: it.id }; setTool("ouverture"); const outil = b.hidden; setTool("select"); sel = { kind: "item", id: L().items[0].id }; render();
    setMode("final"); closeModal(); const fin = b.hidden; setMode("existant"); closeModal(); sel = null; render();
    r[`${larg} · barre d'actions : rien pour une pièce, pendant la pose, ni en vue ${nomVue("final")} (lecture seule)`] = piece && outil && fin;
    return r; }, L0));
  /* au clavier : Tab depuis le plan y entre, ← → la parcourent, Échap rend le plan (la sélection reste) */
  await p.evaluate(() => { cv.focus(); const E = elementsDuPlan(), i = E.findIndex((x) => x.kind === "item"); choisirAuClavier(E[i], i, E.length); cv.focus(); });
  await p.keyboard.press("Tab"); await wait(60);
  const k1 = await p.evaluate(() => ({ dans: !!document.activeElement.closest("#selbar"), i: [...document.querySelectorAll("#selbar button")].indexOf(document.activeElement), n: document.querySelectorAll("#selbar button").length }));
  await p.keyboard.press("ArrowRight"); await wait(40);
  const k2 = await p.evaluate(() => [...document.querySelectorAll("#selbar button")].indexOf(document.activeElement));
  const sel0 = await p.evaluate(() => sel && sel.id); await p.keyboard.press("Escape"); await wait(40);
  const k3 = await p.evaluate((s0) => document.activeElement === cv && sel && sel.id === s0, sel0);
  t[`${L0} · barre d'actions au clavier : Tab depuis le plan y entre, → passe à l'action suivante, Échap rend le plan (sélection gardée)`] = k1.dans && k1.i === 0 && k1.n > 1 && k2 === 1 && k3;
  /* e. le menu du clic droit (outil Sélection) */
  const ci = await p.evaluate(() => { setTool("select"); sel = null; render(); const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier" && hitTest(v(x.x, x.y))?.id === x.id); return { id: it.id, x: it.x, y: it.y, n: L().items.length, larg: innerWidth }; });
  { const q = await plan(ci.x, ci.y); await p.mouse.move(q.x, q.y); await p.mouse.click(q.x, q.y, { button: "right" }); await wait(120); }
  Object.assign(t, await p.evaluate((ci) => { const r = {}, m = document.getElementById("ctxMenu"), it = [...m.querySelectorAll("[role^=menuitem]")], q = m.getBoundingClientRect();
    r[ci.larg + " · menu du clic droit : sur un équipement, il le choisit et ouvre le menu de ses actions (role menu, menuitem)"] = !m.hidden && m.getAttribute("role") === "menu" && sel && sel.id === ci.id && it.length >= 4 && it.every((x) => x.getAttribute("tabindex") === "-1");
    r[ci.larg + " · menu du clic droit : les mêmes actions que les raccourcis, avec leur touche (Entrée, R, Ctrl D, Suppr)"] = ["Entrée", "R", "Ctrl D", "Suppr"].every((k) => it.some((x) => x.querySelector("kbd")?.textContent === k));
    r[ci.larg + " · menu du clic droit : le focus est dans le menu, qui tient dans l'écran"] = m.contains(document.activeElement) && q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight;
    r[ci.larg + " · menu du clic droit : ses icônes viennent du registre (svg.ico aria-hidden)"] = [...m.querySelectorAll("svg")].every((s) => s.classList.contains("ico") && s.getAttribute("aria-hidden") === "true");
    return r; }, ci));
  await p.keyboard.press("ArrowDown"); await wait(30); const f1 = await p.evaluate(() => document.activeElement.getAttribute("role"));
  await p.keyboard.press("End"); await wait(30); const f2 = await p.evaluate(() => /Supprimer/.test(document.activeElement.textContent));
  await p.keyboard.press("m"); await wait(30); const f3 = await p.evaluate(() => tool === "select" && !document.getElementById("ctxMenu").hidden);
  await p.keyboard.press("Escape"); await wait(40); const f4 = await p.evaluate(() => document.getElementById("ctxMenu").hidden && document.activeElement === cv && sel && sel.kind === "item");
  t[`${L0} · menu du clic droit au clavier : ↓ et Fin parcourent les actions, une lettre ne change pas d'outil, Échap ferme et rend le focus au plan`] = f1 === "menuitem" && f2 && f3 && f4;
  { const q = await plan(ci.x, ci.y); await p.mouse.click(q.x, q.y, { button: "right" }); await wait(100);
    await p.evaluate(() => { [...document.querySelectorAll("#ctxMenu [role=menuitem]")].find((x) => /Dupliquer/.test(x.textContent)).click(); }); await wait(60); }
  t[`${L0} · menu du clic droit : « Dupliquer » duplique l'équipement, le menu se ferme`] = await p.evaluate((ci) => L().items.length === ci.n + 1 && document.getElementById("ctxMenu").hidden, ci);
  await p.evaluate(() => undo());
  /* hors d'un élément : le clic droit garde son rôle (désélectionner, terminer un tracé et revenir à la Sélection) */
  { const r0 = await p.evaluate(() => { const z = zoneUtile(); for (let i = 0; i < 40; i++) { const q = W2(v(z.x0 + 24 + i * 7, z.y1 - 24)); if (!hitTest(q)) return q; } return W2(v(z.x0 + 24, z.y1 - 24)); }); const q = await plan(r0.x, r0.y);
    await p.mouse.click(q.x, q.y, { button: "right" }); await wait(80);
    const vide = await p.evaluate(() => document.getElementById("ctxMenu").hidden && !sel);
    await p.evaluate(() => { setTool("mur"); const b0 = bbox(L()); clickAction(v(b0.x1 + 1, b0.y0)); }); await p.mouse.click(q.x, q.y, { button: "right" }); await wait(80);
    const trace = await p.evaluate(() => document.getElementById("ctxMenu").hidden && tool === "select" && !chain.length);
    t[`${L0} · clic droit hors d'un élément : pas de menu, il désélectionne ; pendant un tracé, il termine et rend la Sélection`] = vide && trace; }
  /* au bord de l'écran : le menu se replie vers l'intérieur */
  { const r0 = await p.evaluate(() => { const st = document.getElementById("stage").getBoundingClientRect(), z = zoneUtile(); return { x: st.left + st.width - 6, y: st.top + z.y1 - 6 }; });
    await p.evaluate(() => { const it = L().items[0]; sel = { kind: "item", id: it.id }; render(); });
    await p.evaluate((r0) => { ouvrirMenuCtx({ x: r0.x, y: r0.y }); }, r0); await wait(40);
    t[`${L0} · menu du clic droit : ouvert au coin bas-droit du plan, il reste entier dans l'écran`] = await p.evaluate(() => { const q = document.getElementById("ctxMenu").getBoundingClientRect(); return q.width > 100 && q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight; });
    await p.keyboard.press("Escape"); }
  /* Maj + F10 : le menu au clavier, focus sur la 1re action */
  await p.evaluate(() => { cv.focus(); const E = elementsDuPlan(), i = E.findIndex((x) => x.kind === "wall"); choisirAuClavier(E[i], i, E.length); cv.focus(); });
  await p.keyboard.down("Shift"); await p.keyboard.press("F10"); await p.keyboard.up("Shift"); await wait(60);
  t[`${L0} · Maj + F10 : le menu des actions de l'élément choisi s'ouvre, focus sur sa 1re action`] = await p.evaluate(() => !document.getElementById("ctxMenu").hidden && document.activeElement.getAttribute("role") === "menuitem" && document.activeElement === document.querySelector("#ctxMenu [role^=menuitem]"));
  await p.keyboard.press("Escape"); await wait(30);
  /* f. l'aperçu de pose : ses cotes temporaires, et ce qui ne tient pas */
  Object.assign(t, await p.evaluate((larg) => { const r = {};
    state = blankState(); const lv = L(); lv.walls.push({ id: "m1", a: v(0, 0), b: v(6, 0), type: "mur" }, { id: "m2", a: v(0, 0), b: v(0, 4), type: "mur" }); lv.openings.push({ id: "o1", wallId: "m1", t: 0.75, type: "fenetre", w: 1.2, h: 1.25, hinge: 1, side: 1 });
    afterChange(); setMode("existant"); closeModal(); view.zoom = 80; view.ox = 200; view.oy = 300; setTool("ouverture"); setOpeningType("porte");
    const cotes = []; const D0 = window.drawDim; window.drawDim = function (a, b2, col) { if (col === SEL_C) cotes.push(dist(a, b2)); return D0.apply(this, arguments); };
    let deja, ml;
    try { hover = v(2, 0.05); draw(); const c1 = cotes.slice(); cotes.length = 0; hover = v(4.5, 0.05); draw(); deja = apercuInfo && apercuInfo.deja; ml = document.getElementById("mesureLive").textContent; const c2 = cotes.slice(); cotes.length = 0;
      /* porte de 0,83 centrée à 2 m : 1,585 m jusqu'au bout du mur, 1,485 m jusqu'au jambage de la fenêtre (1,20 centrée à 4,5 m) */
      r[`${larg} · aperçu d'une porte : deux cotes temporaires, du jambage au bout du mur et au jambage voisin (${c1.map((x) => x.toFixed(2)).join(" / ")})`] = c1.length === 2 && c1.some((x) => Math.abs(x - 1.585) < 0.02) && c1.some((x) => Math.abs(x - 1.485) < 0.02);
      r[`${larg} · aperçu sur une ouverture déjà là : rouge, sans cotes, et la barre d'état le dit (« ${ml} »)`] = !!deja && !c2.length && /déjà là/.test(ml);
      setTool("equipement"); setItemType("wc"); hover = v(1.2, 0.5); draw(); const c3 = cotes.slice(); cotes.length = 0; const ml3 = document.getElementById("mesureLive").textContent;
      r[`${larg} · aperçu d'un équipement : collé au mur, une cote temporaire jusqu'au mur voisin (${c3.map((x) => x.toFixed(2)).join(" / ")}) et « contre le mur »`] = c3.length >= 1 && c3.every((x) => x > 0.02) && /contre le mur/.test(ml3);
    } finally { window.drawDim = D0; hover = null; }
    /* l'accrochage nommé : Cote sur un coin, Mesurer dans un angle de pièce */
    setTool("cote"); hover = v(0, 0); draw(); const a1 = document.querySelector("#mesureLive .acc")?.textContent;
    r[`${larg} · barre d'état : l'outil Cote nomme l'accrochage (« ${a1} »)`] = a1 === "coin";
    closeWelcome("sample"); closeModal(); setMode("existant"); closeModal(); setTool("mesure"); const f = (facesCache[L().id] || []).find((x) => x.room && x.polyInt); hover = { ...f.polyInt[0] }; draw(); const a2 = document.querySelector("#mesureLive .acc")?.textContent;
    r[`${larg} · barre d'état : l'outil Mesurer nomme l'accrochage (« ${a2} »)`] = a2 === "angle intérieur";
    hover = null; setTool("select");
    /* les raccourcis d'une touche coupés : la barre et le menu ne disent plus « R » */
    setRaccourcis(false); const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier"); sel = { kind: "item", id: it.id }; multi = []; render();
    const tipR = [...document.querySelectorAll("#selbar button")].find((x) => x.getAttribute("aria-label") === "Pivoter de 90°")?.dataset.tip; ouvrirMenuCtx(null); const kR = [...document.querySelectorAll("#ctxMenu kbd")].some((x) => x.textContent === "R"); fermerMenuCtx(false); setRaccourcis(true); sel = null; render();
    r[`${larg} · raccourcis d'une touche coupés : ni la barre ni le menu ne promettent « R » (bulle « ${tipR} »)`] = tipR === "Pivoter de 90°" && !kR;
    return r; }, L0));
  } catch (e) { t[`U4 · ${L0} — ${e.message.split("\n")[0]}`] = false; }
  await p.close();
}

await b.close().catch(() => {});
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : `\n✓ refonte : ${Object.keys(t).length} contrôles (registre d'icônes, design system, bibliothèques, symboles du plan et vignettes, disposition, interactions)`);
process.exit(echecs.length || errs.length ? 1 : 0);
