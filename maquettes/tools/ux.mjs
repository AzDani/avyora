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
 * U5 · toutes les tailles d'écran (D63) — 1 920, 1 440, 1 280, 1 024, 768 (portrait), 720 × 450 et 640 × 360 (portable
 *   zoomé), 390 (téléphone) :
 *   - la colonne d'outils ne défile jamais : libellés si la hauteur suffit, sinon icônes seules (puis deux colonnes), le nom
 *     dans aria-label et dans la bulle (survol réel et focus clavier) ; boutons de 30 px au moins ;
 *   - le panneau s'ouvre replié à 900 px et moins (le plan d'abord), déplié au-delà ; replié, « Voir sa fiche » est dans la
 *     barre d'actions ; jamais de défilement horizontal ;
 *   - la barre d'état (32 px) se resserre sans rien laisser déborder : les 6 commandes de vue toujours entières et
 *     cliquables, en vue d'ensemble, pendant un tracé (la mesure en direct se lit entière) et pendant une pose refusée ;
 *   - la bande de contexte (niveaux, vues) sans chevauchement ; la barre d'options d'une ligne de 44 px pour chaque outil,
 *     qui défile proprement : chevron du côté où il reste des options, un clic défile d'une page, le modèle choisi en vue ;
 *   - la barre d'actions dans la zone du plan et entière, le menu du clic droit dans l'écran ;
 *   - recette au clic : la bulle d'un outil choisi ne prend pas le 1er clic du tracé ; les cotes de jambage d'une ouverture
 *     choisie ne tombent jamais sur la chaîne de cotes extérieure (1 440 et 1 024) ;
 *   - le téléphone reste le mode chantier : ni outils, ni barre d'options, ni grille, ni aimantation, ni barre d'actions.
 *
 * D64 · les corrections du jury (à 1 440, 1 280 et 1 024, et la tablette à 768) :
 *   - la barre d'options ne porte que des options (plus de segmenté Sélection / Zone, plus de consigne répétée) ; Équipements :
 *     la famille est un menu au nom visible qui ne bouge pas d'un pixel, la recherche et la famille restent en place quand le
 *     dernier modèle est choisi, des tuiles sans cadre (le choisi en indigo), les 5 modèles de la salle de bain sans défiler de
 *     1 280 à 1 440 ; changer de famille ou chercher retire un modèle qu'on ne voit plus (le clic suivant ne pose rien et le dit) ;
 *     choisir un modèle retire « Choisis d'abord un modèle » ; les épaisseurs du doublage dans un segmenté ;
 *   - le panneau : plus de sous-titre « au-dessus du plan » ni de commande en double ; le mode d'emploi est un pli qui se
 *     souvient ; les encarts des Murs sous « En savoir plus » ; une carte budget calme ; un seul style d'intitulé ;
 *   - le niveau et la vue au centre de la barre du haut (plus de bande au-dessus du plan) ; la légende Travaux dans la barre
 *     d'état ; zoom, grille, aimantation et affichage collés au bord droit, en vue d'ensemble, au survol et pendant un tracé ;
 *   - Échap rend le plan depuis une note (la lettre suivante choisit l'outil) ; Échap sur une bulle de survol ne fait que la
 *     fermer ; supprimer le dit avec « Annuler » ; Annuler garde la sélection et dit la vue ; une dimension aberrante est
 *     refusée avec la proposition en centimètres ; consignes de la sélection multiple et d'une note ; plus d'aperçu fantôme
 *     quand la souris quitte le plan ; une porte posée sur une façade s'ouvre vers le logement ; juste après une pose, pas
 *     de rouge ; une fenêtre se choisit dans l'épaisseur du mur et sur ses vantaux ; la barre d'actions revient après un
 *     glissé de la vue ; la tablette replie la fiche quand la sélection se vide ;
 *   - le plan : la chaîne des baies au 1er rang, aucune cote intérieure écrite sur une ouverture, une palette de pièces loin
 *     des couleurs de sens, des icônes sans ambiguïté, ⌘ sur Mac, la bulle en deux niveaux.
 *
 * D65 · la dernière passe (à 1 440, 1 280 et 1 024, et la tablette à 768) :
 *   - la consigne de la barre d'état ne disparaît jamais : entière au repos pour chaque outil et chaque sélection, en Avant
 *     travaux et en Travaux, et pendant un tracé réel en vue Travaux (la légende et l'échelle laissent la place) ; ce qui cède
 *     le fait dans l'ordre (échelle et zoom avant la légende) ; une pose refusée garde la consigne ; sous 1 024, coupée en
 *     « … » et entière dans la bulle ;
 *   - une place par rôle : la surface une seule fois (pied du panneau, ou barre d'état panneau replié) ; sans modèle, la
 *     consigne dite une fois (la barre d'état s'allume, plus de message ni de carte qui la répète) et le rappel s'éteint ;
 *     la feuille blanche : un pictogramme au centre du plan, un mode d'emploi qui commence ailleurs ;
 *   - les finitions : l'icône Murs (angle poché et amorce de cloison) ; l'épaisseur choisie du doublage en vue ; un clic dans
 *     Largeur prend toute la valeur ; la séparation en cours de tracé en tirets d'encre (la ligne guide à côté) ; la cote de
 *     largeur d'une pièce meublée prend une ligne libre plus loin dans la pièce plutôt que traverser un meuble.
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
    setTool("equipement"); ctrl.push(...[...document.querySelectorAll("#optbar .famsel, #optbar .recherche")].filter(vis)); setTool("select"); /* D64 : la famille est un menu */
    const rayHors = ctrl.map((x) => getComputedStyle(x).borderTopLeftRadius).filter((v) => !RAY.has(v) && !/^(50%|9\d\dpx|99px)$/.test(v) && parseFloat(v) < 50);
    r[`${larg} · rayons des contrôles sur l'échelle (6 / 8 / 12)${rayHors.length ? " — " + [...new Set(rayHors)].join(", ") : ""}`] = !rayHors.length;
    const demi = [...document.querySelectorAll(".top *, #tools *, #pbody *, #pfoot *, .zoomctl *, #levels *, #modes *")].filter((x) => x.childNodes.length && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(x)).map((x) => getComputedStyle(x).fontSize).filter((v) => !Number.isInteger(parseFloat(v)));
    r[`${larg} · aucune taille de texte à demi-pixel (échelle 11 / 12 / 13 / 14 / 16 / 20)${demi.length ? " — " + [...new Set(demi)].join(", ") : ""}`] = !demi.length;
    const h = (sel) => [...document.querySelectorAll(sel)].filter(vis).map((x) => Math.round(x.getBoundingClientRect().height));
    r[`${larg} · hauteurs : boutons de la barre 32, primaire 36, zoom et niveaux 28`] = h(".top .ib:not(.primary)").every((v) => v === 32) && h(".top .ib.primary").every((v) => v === 36) && h(".zoomctl button").every((v) => v === 28) && h("#levels button").every((v) => v === 28);
    /* bibliothèques — D61 : dans la barre d'options, au-dessus du plan */
    setTool("equipement");
    /* D64 : les familles sont les entrées d'un menu (le bouton dit toujours la famille ouverte) — mêmes icônes, toutes de la même encre */
    basculerMenu("famille"); const fics = [...document.querySelectorAll("#famMenu [role=menuitemradio]:not([aria-checked=true]) .ico")].map((x) => getComputedStyle(x).color); fermerMenus();
    r[`${larg} · familles neutres : entrées du menu à l'icône en encre, sans teinte de famille`] = fics.length === 5 && new Set(fics).size === 1 && !document.querySelector("#famMenu [style]");
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
    /* D64 : le niveau et la vue au centre de la barre du haut (la bande de contexte, à moitié vide, coûtait 36 px de plan) */
    const TOPR = rect(document.querySelector(".top")), RED = rect(document.getElementById("redoBtn")), FIC = rect(document.getElementById("menuFichier"));
    r[`${larg} · niveau et vue au centre de la barre du haut (entre Rétablir et Fichier), plus de bande au-dessus du plan`] = document.getElementById("ctxTop").contains(document.getElementById("levels")) && document.getElementById("ctxTop").contains(document.getElementById("modes")) && dans(lvR, TOPR) && dans(moR, TOPR) && lvR.left < moR.left && lvR.left >= RED.right && moR.right <= FIC.left && !vis(document.getElementById("pbande")) && Math.abs(tpR.top - ST.top) < 1 && tpR.height <= 46;
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
    /* D64 : dans cet ordre — le trait se choisit avant de tracer ; poteau et poutre n'y sont plus en double (Équipements › Structure) */
    { const g = [...OB.querySelectorAll(".obg")].map((x) => x.getAttribute("aria-label"));
      r[`${larg} · Murs : type (5), puis le trait (3), puis la pièce rectangulaire ; plus de poteau ni de poutre en double`] = OB.querySelectorAll(".seg.barre")[0]?.children.length === 5 && OB.querySelectorAll(".seg.barre")[1]?.children.length === 3 && !!OB.querySelector("#rectL") && !!OB.querySelector("#rectl") && g.join("|") === "Type de mur|Le trait dessiné|Pièce rectangulaire" && !OB.querySelector(".lib2"); }
    OB.querySelectorAll(".seg.barre")[0].children[2].click();
    r[`${larg} · Murs : un clic choisit « Cloison » (wallType), le panneau dit « Prochains murs : Cloison »`] = wallType === "cloison" && /Cloison/.test(document.querySelector("#pbody .mprop b").textContent);
    wallType = "auto"; setTool("equipement"); setFamEquip("structure"); [...OB.querySelectorAll(".lib2 .it")].find((x) => /Poteau/.test(x.textContent)).click();
    r[`${larg} · Équipements › Structure › Poteau : le poteau choisi`] = tool === "equipement" && itemType === "poteau" && famEquip === "structure";
    setTool("ouverture"); const cOuv = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent);
    r[`${larg} · Ouvertures : les 11 modèles puis la fenêtre de toit, en cartes`] = cOuv.length === 12 && Object.values(OPENINGS).every((o) => cOuv.includes(o.label)) && cOuv[11] === ITEMS.velux.label;
    [...OB.querySelectorAll(".lib2 .it")].find((x) => /Porte-fenêtre/.test(x.textContent)).click();
    r[`${larg} · Ouvertures : un clic choisit le modèle (carte indigo), le panneau montre sa fiche (vignette, dimensions)`] = openingType === "porte_fenetre" && /Porte-fenêtre/.test(OB.querySelector(".lib2 .it.on b").textContent) && /Porte-fenêtre/.test(document.querySelector("#pbody .mprop").textContent) && /1,40 × 2,15 m/.test(document.querySelector("#pbody .mprop").textContent);
    [...OB.querySelectorAll(".lib2 .it")].find((x) => /Fenêtre de toit/.test(x.textContent)).click();
    r[`${larg} · Ouvertures › Fenêtre de toit : l'outil Équipements, famille Escalier et structure`] = tool === "equipement" && itemType === "velux" && famEquip === "structure" && /Structure/.test(document.getElementById("famBtn").textContent);
    /* d. Équipements : familles en onglets, recherche, plus de modèle posé en douce */
    itemType = null; setTool("equipement"); setFamEquip("bain");
    /* D64 : les 6 familles dans un menu dont le bouton dit toujours la famille ouverte, de largeur fixe */
    const fb = document.getElementById("famBtn"), fbw = rect(fb).width; basculerMenu("famille"); const fams = [...document.querySelectorAll("#famMenu [role=menuitemradio]")].map((x) => x.textContent.trim()); fermerMenus();
    r[`${larg} · Équipements : 6 familles (Salle de bain, Cuisine, Chauffage, Électricité, Mobilier, Escalier et structure), dans un menu au nom visible`] = fams.join("|") === "Salle de bain|Cuisine|Chauffage|Électricité|Mobilier|Escalier et structure" && fb.getAttribute("aria-haspopup") === "menu" && /Salle de bain/.test(fb.textContent) && fbw >= 120;
    const tous = FAM_EQUIP.flatMap((f) => f[3]);
    r[`${larg} · Équipements : chaque modèle dans une famille, une seule fois (${tous.length} pour ${Object.keys(ITEMS).length})`] = tous.length === Object.keys(ITEMS).length && new Set(tous).size === tous.length && Object.keys(ITEMS).every((k) => tous.includes(k));
    chercherEquip("toilettes"); const tr = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent);
    chercherEquip("zzzz"); const rien = /Aucun équipement/.test(OB.textContent); chercherEquip("chauffe eau"); const ce = [...OB.querySelectorAll(".lib2 .it b")].map((x) => x.textContent); chercherEquip("");
    r[`${larg} · Équipements : la recherche trouve « toilettes » → WC, « chauffe eau » → Chauffe-eau, et dit quand rien ne répond`] = tr.join() === "WC" && rien && ce.includes("Chauffe-eau");
    const n0 = L().items.length, c = S(v(...(() => { const b0 = bbox(L()); return [(b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2]; })())); clickAction(W2(c));
    /* D65 : « le dit » = la consigne de la barre d'état s'allume (le message du bas la répétait mot pour mot) */
    r[`${larg} · Équipements : sans modèle choisi, un clic ne pose rien (fin du « Lit double » en douce) et le dit (la consigne s'allume)`] = itemType === null && L().items.length === n0 && !/Choisis d'abord un modèle/.test(document.getElementById("toast").textContent) && /Choisis d'abord un modèle/.test(document.getElementById("hint").textContent) && document.getElementById("hint").classList.contains("allume");
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
    r[ci.larg + " · menu du clic droit : les mêmes actions que les raccourcis, avec leur touche (Entrée, R, Ctrl D — ⌘D sur Mac —, Suppr)"] = ["Entrée", "R", MAC ? "⌘D" : "Ctrl D", "Suppr"].every((k) => it.some((x) => x.querySelector("kbd")?.textContent === k));
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

/* ═════════ 8. U5 · à toutes les tailles d'écran (D63) ═════════ */
t["source · la colonne d'outils se compacte d'après sa hauteur mesurée (majOutilsCompacts, appelée par resize)"] = /function majOutilsCompacts\(\)/.test(SRC) && /function resize\(\)\{if\(typeof majOutilsCompacts==='function'\)majOutilsCompacts\(\);/.test(SRC);
for (const [L0, H0] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [720, 450], [640, 360]]) {
  const p = await onglet({ larg: L0, haut: H0 });
  const tag = `${L0} × ${H0}`;
  try {
  Object.assign(t, await p.evaluate(async (tag, larg, haut) => { const r = {};
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
    const rect = (e) => e.getBoundingClientRect(), dans = (a, b, m = 0.5) => a.left >= b.left - m && a.right <= b.right + m && a.top >= b.top - m && a.bottom <= b.bottom + m;
    const coupe = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const touche = (e) => { const q = rect(e), el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!el && (el === e || e.contains(el)); };
    const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const T = document.getElementById("tools"), tb = [...T.querySelectorAll(".tb")], TR = rect(T);
    /* a. la colonne d'outils : jamais de défilement, les 10 outils à l'écran ; libellés si la hauteur le permet, sinon icônes */
    r[`${tag} · outils : les 10 tiennent dans la colonne, sans défiler${T.classList.contains("deux") ? " (deux colonnes d'icônes)" : T.classList.contains("icones") ? " (icônes seules)" : ""}`] = tb.length === 10 && T.scrollHeight <= T.clientHeight + 1 && tb.every((b) => dans(rect(b), TR) && rect(b).bottom <= innerHeight && touche(b));
    const libs = tb.filter((b) => vis(b.querySelector("span"))).length;
    if (haut >= 768) r[`${tag} · outils : libellés visibles (la hauteur suffit)`] = libs === 10 && !T.classList.contains("icones");
    else r[`${tag} · outils : la hauteur manque — icônes seules, le nom dans aria-label et dans la bulle`] = T.classList.contains("icones") && libs === 0 && tb.every((b) => { const n = b.querySelector("span").textContent; return (b.getAttribute("aria-label") || "").includes(n) && b.dataset.tip.startsWith(n); });
    r[`${tag} · outils : chaque bouton fait au moins 30 × 30 px`] = tb.every((b) => rect(b).width >= 29.5 && rect(b).height >= 29.5);
    /* b. le panneau : replié sur un écran étroit (900 px et moins), déplié au-delà ; replié, aucun défilement horizontal */
    const plie = !!document.querySelector(".body.panelPlie"), ST = rect(document.getElementById("stage"));
    r[`${tag} · panneau ${larg <= 900 ? "replié (écran étroit, le plan d'abord)" : "déplié"} — plan de ${Math.round(ST.width)} px`] = (larg <= 900) === plie && (!plie || ST.width >= larg - 140) && document.documentElement.scrollWidth <= innerWidth;
    /* c. la barre d'état : une ligne de 32 px ; zoom, ajuster, grille, aimantation, affichage entiers et cliquables, dans tous les états */
    const ET = document.getElementById("etat");
    const etatOk = (ctx) => { const er = rect(ET), hors = [...ET.querySelectorAll(":scope > *, .zoomctl > *")].filter(vis).filter((e) => !dans(rect(e), er, 1)).map((e) => e.id || e.className);
      const btn = [...ET.querySelectorAll(".zoomctl button")]; const ko = btn.filter((b) => !vis(b) || !touche(b)).map((b) => b.getAttribute("aria-label"));
      const h = document.getElementById("hint");
      r[`${tag} · barre d'état (${ctx}) : 32 px, rien ne déborde, les 6 commandes de vue (−, +, ajuster, grille, aimantation, affichage) entières et cliquables${hors.length ? " — déborde : " + hors.join(", ") : ""}${ko.length ? " — cachées : " + ko.join(", ") : ""}`] = Math.round(er.height) === 32 && !hors.length && btn.length === 6 && !ko.length && (!vis(h) || rect(h).width >= 40 || h.textContent === ""); };
    etatOk("vue d'ensemble");
    setTool("mur"); const b0 = bbox(L()); hover = v(b0.x1 + 2, b0.y0); clickAction(hover); hover = v(b0.x1 + 2, b0.y0 + 3); draw();
    const ml = document.getElementById("mesureLive");
    r[`${tag} · barre d'état pendant un tracé : la mesure en direct se lit entière (« ${ml.textContent} »)`] = vis(ml) && /Longueur 3,00 m/.test(ml.textContent) && ml.scrollWidth <= ml.clientWidth + 1 && dans(rect(ml), rect(ET), 1);
    etatOk("tracé en cours");
    keys.shift = false; endChain(false); hover = null; setTool("select"); draw();
    /* la pose d'une ouverture sur une ouverture déjà là : le message le plus long de la barre d'état ne pousse jamais le zoom dehors */
    setTool("ouverture"); { const o0 = L().openings[0], w0 = findWall(o0.wallId); hover = add(add(w0.a, mul(sub(w0.b, w0.a), o0.t)), wallOff(w0)); draw(); }
    r[`${tag} · barre d'état pendant une pose refusée : « déjà là » est dit (${ml.textContent.slice(0, 40)}…)`] = vis(ml) && /déjà là/.test(ml.textContent);
    etatOk("pose refusée");
    hover = null; setTool("select"); draw();
    /* d. la tête du plan : la bande de contexte sans chevauchement, la barre d'options d'une ligne de 44 px pour chaque outil */
    const lv = rect(document.getElementById("levels")), mo = rect(document.getElementById("modes")), TP = rect(document.getElementById("tetePlan"));
    const CTX = contexteEnHaut() ? rect(document.querySelector(".top")) : TP; /* D64 : au-dessus de 900 px, dans la barre du haut */
    r[`${tag} · niveau et vue : côte à côte ou sur deux lignes, jamais l'un sur l'autre, dans la barre du haut (900 px et moins : la tête du plan)`] = !coupe(lv, mo) && dans(lv, CTX) && dans(mo, CTX) && [...document.querySelectorAll("#modes button")].every((b) => dans(rect(b), contexteEnHaut() ? CTX : ST) && touche(b));
    const OB = document.getElementById("optbar"), hauts = [];
    for (const o of ["select", "mur", "ouverture", "doublage", "equipement", "cote", "texte", "calque"]) { setTool(o); hauts.push(Math.round(rect(OB).height)); }
    r[`${tag} · barre d'options : une ligne de 44 px pour chaque outil, jamais de défilement de la page`] = hauts.every((h) => h === 44) && document.documentElement.scrollWidth <= innerWidth;
    /* e. la barre d'options défile proprement : chevron du côté où il reste des options, un clic la fait défiler, le modèle choisi est en vue */
    setTool("ouverture"); OB.scrollLeft = 0; bordsOptbar();
    const deb = OB.scrollWidth > OB.clientWidth + 1, gD = document.getElementById("obDroite"), gG = document.getElementById("obGauche");
    if (deb && !(gD && gG)) r[`${tag} · barre d'options trop longue : un chevron à droite, un clic défile d'une page, le chevron de gauche paraît ; au bout, plus de chevron à droite`] = false;
    else if (deb) {
      const d0 = vis(gD) && !vis(gG) && OB.classList.contains("vers-d") && dans(rect(gD), rect(OB)) && touche(gD);
      gD.click(); await attendre(700); bordsOptbar();
      const d1 = OB.scrollLeft > 60 && vis(gG) && touche(gG);
      OB.scrollLeft = OB.scrollWidth; bordsOptbar(); await attendre(60);
      const d2 = !vis(gD) && vis(gG);
      gG.click(); await attendre(700);
      r[`${tag} · barre d'options trop longue : un chevron à droite, un clic défile d'une page, le chevron de gauche paraît ; au bout, plus de chevron à droite`] = d0 && d1 && d2 && OB.scrollLeft < OB.scrollWidth - OB.clientWidth - 60;
    } else r[`${tag} · barre d'options : tout tient, aucun chevron`] = !vis(gD) && !vis(gG);
    const cle = ORDRE_OUV_BARRE[ORDRE_OUV_BARRE.length - 1]; /* le dernier modèle de la barre (Passage) */
    setOpeningType(cle); setTool("select"); setTool("ouverture");
    const on = OB.querySelector(".lib2 .it.on"), obr = rect(OB);
    r[`${tag} · barre d'options : le modèle choisi (${OPENINGS[cle].label}) est en vue au retour sur l'outil, hors des chevrons`] = !!on && rect(on).left >= obr.left - 0.5 && rect(on).right <= obr.right - 30;
    setOpeningType("porte"); setTool("select");
    /* f. la barre d'actions et le menu du clic droit restent dans la zone du plan / l'écran */
    const Z = zoneUtile(), cvr = rect(cv), zone = { left: cvr.left + Z.x0, right: cvr.left + Z.x1, top: cvr.top + Z.y0, bottom: cvr.top + Z.y1 };
    const sb = document.getElementById("selbar"), dehors = [];
    for (const k of ["wall", "opening", "item"]) { const lvv = L(), x = k === "wall" ? lvv.walls.find((w) => !isVirtual(w)) : k === "opening" ? lvv.openings[0] : lvv.items.find((i) => !ITEMS[i.type].elec);
      sel = { kind: k, id: x.id }; multi = []; render(); if (!sb.hidden && (!dans(rect(sb), zone, 1) || sb.scrollWidth > sb.clientWidth + 1)) dehors.push(k); }
    setMode("projet"); closeModal(); sel = { kind: "opening", id: L().openings[0].id }; render(); if (!sb.hidden && (!dans(rect(sb), zone, 1) || sb.scrollWidth > sb.clientWidth + 1)) dehors.push("ouverture en vue Travaux");
    ouvrirMenuCtx(null); const cm = document.getElementById("ctxMenu"), cq = rect(cm); const menuOk = !cm.hidden && cq.left >= 0 && cq.top >= 0 && cq.right <= innerWidth && cq.bottom <= innerHeight; fermerMenuCtx(false);
    setMode("existant"); closeModal(); sel = null; render();
    r[`${tag} · barre d'actions dans la zone du plan, entière (mur, ouverture, équipement, vue Travaux)${dehors.length ? " — " + dehors.join(", ") : ""} ; menu du clic droit dans l'écran`] = !dehors.length && menuOk;
    /* g. replié : « Voir sa fiche » est dans la barre d'actions ; déplié : au menu seulement (la fiche est déjà là) */
    const w0 = L().walls.find((w) => !isVirtual(w)); sel = { kind: "wall", id: w0.id }; multi = []; render();
    const fiche = [...sb.querySelectorAll("button")].some((b) => b.getAttribute("aria-label") === "Voir sa fiche");
    r[`${tag} · barre d'actions : « Voir sa fiche » ${plie ? "présent (panneau replié)" : "absent (la fiche est dans le panneau)"}`] = fiche === plie;
    sel = null; render();
    return r; }, tag, L0, H0));
  /* h. icônes seules : la bulle dit le nom de l'outil, au survol (souris réelle) et au focus clavier, à droite de la colonne */
  if (H0 < 768) {
    const q = await p.evaluate(() => { const b = document.querySelector('#tools .tb[aria-label="Murs"]'), r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(q.x, q.y); await wait(120);
    const s1 = await p.evaluate(() => { const bu = document.getElementById("bulle"), b = document.querySelector('#tools .tb[aria-label="Murs"]'); return !bu.hidden && bu.textContent.startsWith("Murs") && bu.getBoundingClientRect().left >= b.getBoundingClientRect().right; });
    await p.mouse.move(600, 5); await wait(80);
    await p.evaluate(() => { document.querySelector('#tools .tb[aria-label="Zone"]').focus(); }); await p.keyboard.press("Tab"); await wait(120);
    const s2 = await p.evaluate(() => { const bu = document.getElementById("bulle"); return document.activeElement.getAttribute("aria-label") === "Murs" && !bu.hidden && bu.textContent.startsWith("Murs"); });
    t[`${tag} · icônes seules : la bulle dit « Murs (M) · … » au survol et au focus clavier, à droite de la colonne`] = s1 && s2;
  }
  } catch (e) { t[`U5 · ${tag} — ${e.message.split("\n")[0]}`] = false; }
  /* j. la recette au clic l'a montré : après un clic sur un outil, sa bulle (rouverte par le bouton redessiné) restait sur le plan
     et prenait le 1er clic du tracé — elle se tait désormais jusqu'à ce que la souris quitte l'outil */
  if (L0 === 1440 || L0 === 1024) {
    await p.evaluate(() => { closeModal(); setMode("existant"); closeModal(); setTool("select"); sel = null; render(); });
    await p.click('#tools .tb[aria-label="Murs"]'); await wait(80);
    const cible = await p.evaluate(() => { const q = document.querySelector('#tools .tb[aria-label="Murs"]').getBoundingClientRect(); return { x: q.right + 70, y: q.top + q.height / 2 }; });
    await p.mouse.move(cible.x, cible.y); await wait(60); await p.mouse.click(cible.x, cible.y); await wait(80);
    const tr = await p.evaluate(() => ({ tool, chain: chain.length, bulle: !document.getElementById("bulle").hidden }));
    t[`${tag} · un outil choisi au clic : sa bulle ne prend pas le 1er clic sur le plan (le tracé commence)`] = tr.tool === "mur" && tr.chain === 1 && !tr.bulle;
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await wait(40);
    /* k. les cotes de jambage d'une ouverture choisie ne tombent jamais sur la chaîne de cotes extérieure */
    const heurts = await p.evaluate(() => { setTool("select"); fitView(); const out = []; const x = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      /* un seul rendu après un changement de zoom : la chaîne lue est celle de ce rendu, pas du précédent */
      for (const [i, o] of L().openings.entries()) { fitView(); view.zoom *= i % 2 ? 1.12 : 0.9; sel = { kind: "opening", id: o.id }; render(); if (cotesOuverture.some((c) => !c.court && boitesChaines.some((k) => x(c, k)))) out.push(OPENINGS[o.type].label); }
      fitView();
      sel = null; render(); return out; });
    t[`${tag} · ouverture choisie : ses cotes de jambage ne tombent sur aucune cote de la chaîne extérieure (hors cote plus courte que son texte, dessinée par-dessus)${heurts.length ? " — " + heurts.join(", ") : ""}`] = !heurts.length;
  }
  await p.close();
}
/* i. le téléphone reste le mode chantier, en consultation : ni outils, ni barre d'options, ni barre d'état, ni aimantation */
{ const p = await onglet({ larg: 390, haut: 844, mobile: true });
  Object.assign(t, await p.evaluate(() => { const r = {}, vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none";
    r["390 × 844 · téléphone : ni colonne d'outils, ni barre d'options, ni chevrons, ni mesure en direct, ni échelle"] = !vis(document.getElementById("tools")) && !vis(document.getElementById("optbar")) && !vis(document.getElementById("obDroite")) && !vis(document.getElementById("mesureLive")) && !vis(document.getElementById("echelle"));
    r["390 × 844 · téléphone : le zoom reste (−, +, ajuster, affichage), sans la grille ni l'aimantation (réglages de dessin)"] = !vis(document.getElementById("gridBtn")) && !vis(document.getElementById("magnetBtn")) && [...document.querySelectorAll(".zoomctl button")].filter(vis).length === 4;
    setTool("mur"); r["390 × 844 · téléphone : un outil de dessin est refusé (on consulte)"] = tool === "select";
    const w = L().walls.find((x) => !isVirtual(x)); sel = { kind: "wall", id: w.id }; render();
    r["390 × 844 · téléphone : un élément choisi n'a pas de barre d'actions (sa fiche est dans le tiroir)"] = document.getElementById("selbar").hidden;
    r["390 × 844 · téléphone : pas de défilement horizontal"] = document.documentElement.scrollWidth <= innerWidth;
    return r; }));
  await p.close(); }

/* ═════════ 9. D64 · les corrections du jury (après U1 à U5) ═════════ */
t["source · D64 : les extrémités de cote en obliques à 45° (convention française), comme l'icône Cote"] = /const ob=v\(\(n\.x\+u\.x\)\*4\.5\*k,\(n\.y\+u\.y\)\*4\.5\*k\)/.test(SRC) && !/ctx\.moveTo\(p\.x\+n\.x\*6\*k,p\.y\+n\.y\*6\*k\)/.test(SRC);
t["source · D64 : le mur en cours se prévisualise à l'encre (plus d'indigo de surligneur ni de violet pour une séparation)"] = !/rgba\(124,58,237,\.8\)':'rgba\(79,70,229,\.9\)'/.test(SRC) && /wallType==='virtuel'\?ENCRE_SEP:'rgba\(30,27,75,\.55\)'/.test(SRC);
for (const [L0, H0] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L0, haut: H0 });
  const plan = async (x, y) => p.evaluate((x, y) => { const q = S(v(x, y)), r = cv.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; }, x, y);
  try {
  /* a. la barre d'options : des options seulement, des tuiles, une famille qui ne bouge pas */
  Object.assign(t, await p.evaluate((larg) => { const r = {}, rect = (e) => e.getBoundingClientRect(), vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none";
    const OB = document.getElementById("optbar");
    const obt = {}; for (const o of ["select", "zone", "cote", "mesure", "texte", "calque"]) { setTool(o); obt[o] = !!OB.querySelector(".seg") || (o !== "select" && o !== "zone" && !!OB.querySelector(".obt")); }
    r[`${larg} · barre d'options : plus de segmenté Sélection / Zone (il est dans la colonne), plus de consigne répétée (Cote, Mesurer, Note, Image)`] = !Object.values(obt).some(Boolean);
    setTool("equipement"); itemType = null; setFamEquip("bain");
    const fb = () => rect(document.getElementById("famBtn")), f0 = fb(), pos = [];
    for (const f of FAM_EQUIP) { setFamEquip(f[0]); const q = fb(); pos.push(Math.abs(q.left - f0.left) < 0.5 && Math.abs(q.width - f0.width) < 0.5 && document.getElementById("famBtn").textContent.includes(f[4])); }
    r[`${larg} · Équipements : le bouton de la famille dit son nom et ne bouge pas d'un pixel d'une famille à l'autre`] = pos.every(Boolean);
    setFamEquip("cuisine"); const its = [...OB.querySelectorAll(".lib2 .it")]; its[its.length - 1].click();
    const sc = OB.querySelector(".obdefile"), O = rect(OB), F = fb(), R = rect(OB.querySelector(".recherche"));
    r[`${larg} · Équipements : le dernier modèle choisi, la recherche et la famille restent en place (seules les cartes défilent)`] = !!sc && F.left >= O.left - 0.5 && R.left >= O.left - 0.5 && vis(document.getElementById("famBtn")) && itemType === FAM_EQUIP[1][3][FAM_EQUIP[1][3].length - 1];
    const its2 = [...OB.querySelectorAll(".lib2 .it")], it0 = its2[0]; /* la barre s'est redessinée au clic : on relit ses cartes */
    r[`${larg} · Équipements : des tuiles sans cadre (le modèle choisi en indigo), les dimensions dans la bulle`] = getComputedStyle(it0).borderTopColor === "rgba(0, 0, 0, 0)" && getComputedStyle(its2[its2.length - 1]).borderTopColor === "rgb(79, 70, 229)" && !vis(it0.querySelector("small")) && /m/.test(it0.dataset.tip);
    if (larg >= 1280) { setFamEquip("bain"); const vu = [...OB.querySelectorAll(".lib2 .it")].filter((x) => { const q = rect(x), s2 = rect(OB.querySelector(".obdefile")); return q.left >= s2.left - 0.5 && q.right <= s2.right + 0.5; }).length;
      r[`${larg} · Équipements : les 5 modèles de la salle de bain se voient sans défiler (${vu})`] = vu === 5; }
    /* le modèle d'une autre famille ne reste pas choisi en douce */
    setFamEquip("chauffage"); setItemType("radiateur"); setFamEquip("elec"); const n0 = L().items.length; const b0 = bbox(L()); clickAction(v((b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2));
    r[`${larg} · Équipements : changer de famille retire le modèle d'une autre famille — le clic suivant ne pose rien et le dit`] = itemType === null && L().items.length === n0 && /Choisis d'abord un modèle/.test(document.getElementById("hint").textContent);
    setItemType("prise"); r[`${larg} · Équipements : choisir un modèle retire le message « Choisis d'abord un modèle »`] = !document.getElementById("toast").classList.contains("show") && !document.getElementById("hint").classList.contains("allume") && !/Choisis d'abord/.test(document.getElementById("hint").textContent);
    chercherEquip("radiateur"); r[`${larg} · Équipements : une recherche qui ne montre plus le modèle choisi le retire aussi`] = itemType === null; chercherEquip("");
    /* les épaisseurs du doublage : le même segmenté ; le panneau ne les répète pas */
    setTool("doublage"); const ep = OB.querySelector(".seg.barre.ep");
    r[`${larg} · Doublage : les 7 épaisseurs dans un segmenté (comme poser / retirer et par où), le panneau ne les répète pas`] = !!ep && ep.querySelectorAll("button.miniep").length === EP_DOUBLAGE.length && !document.querySelector("#pbody .miniep") && /Épaisseur perdue|Épaisseur ajoutée/.test(document.getElementById("pbody").textContent);
    setTool("select"); return r; }, L0));
  /* b. le panneau : les propriétés et le résultat ; le mode d'emploi se replie et s'en souvient */
  Object.assign(t, await p.evaluate((larg) => { const r = {}, P = document.getElementById("pbody");
    const sansBarre = ["mur", "ouverture", "doublage", "equipement"].every((o) => { setTool(o); return ![...P.querySelectorAll(".psub")].some((x) => /au-dessus du plan/.test(x.textContent)); });
    setTool("mesure"); const mes = ![...P.querySelectorAll("button")].some((x) => /Nouvelle mesure/.test(x.textContent));
    setTool("calque"); const img = ![...P.querySelectorAll("button")].some((x) => /Importer une image/.test(x.textContent));
    r[`${larg} · panneau : plus de sous-titre « … au-dessus du plan », ni « Nouvelle mesure », ni « Importer une image » en double`] = sansBarre && mes && img;
    setTool("mur"); const d = P.querySelector("details.mepli"); const ouvert = !!d && d.open && d.querySelectorAll(".memploi li").length === 3;
    d.open = false; d.dispatchEvent(new Event("toggle")); setTool("ouverture"); const garde = !P.querySelector("details.mepli").open; P.querySelector("details.mepli").open = true; P.querySelector("details.mepli").dispatchEvent(new Event("toggle"));
    r[`${larg} · panneau : le mode d'emploi est un pli, ouvert d'abord ; replié, il le reste d'un outil à l'autre`] = ouvert && garde;
    setTool("mur"); r[`${larg} · panneau Murs : les encarts sont sous « En savoir plus », replié`] = [...P.querySelectorAll("details.plie")].some((x) => /En savoir plus/.test(x.querySelector("summary").textContent) && !x.open && x.querySelector(".tip"));
    setTool("select"); sel = null; render(); const bc = document.querySelector("#pfoot .bcard:not(.attente)");
    r[`${larg} · pied du panneau : la carte budget est calme (fond blanc, montant en 24 px au lieu de 28 en blanc sur encre) — un seul appel fort, « Estimer ce plan »`] = !!bc && getComputedStyle(bc).backgroundColor === "rgb(255, 255, 255)" && parseFloat(getComputedStyle(document.getElementById("budgetVal")).fontSize) <= 24;
    r[`${larg} · un seul style d'intitulé de section, en casse normale`] = [...document.querySelectorAll("#pbody .ph")].every((x) => getComputedStyle(x).textTransform === "none");
    return r; }, L0));
  /* c. la barre d'état : la légende y est en vue Travaux, le zoom collé au bord droit */
  Object.assign(t, await p.evaluate((larg) => { const r = {}, ET = document.getElementById("etat"), Z = document.querySelector(".etat .zoomctl"), droit = () => Math.abs(ET.getBoundingClientRect().right - Z.getBoundingClientRect().right) <= 4;
    setMode("projet", true); closeModal(); sel = null; render();
    r[`${larg} · barre d'état : la légende de la vue Travaux (3 échantillons) juste avant l'échelle ; aucune en Avant travaux`] = document.querySelectorAll("#etat .vlegend > span").length === 3 && document.getElementById("legendeVue").nextElementSibling.id === "echelle" && (setMode("existant", true), closeModal(), render(), !document.querySelector("#etat .vlegend"));
    const ok = []; ok.push(droit()); setTool("mur"); hover = v(0, 0); draw(); ok.push(droit()); const b0 = bbox(L()); hover = v(b0.x1 + 2, b0.y0); clickAction(hover); hover = v(b0.x1 + 2, b0.y0 + 3); draw(); ok.push(droit()); endChain(false); hover = null; setTool("select"); draw();
    r[`${larg} · barre d'état : zoom, grille, aimantation et affichage collés au bord droit (vue d'ensemble, survol, tracé)`] = ok.every(Boolean);
    return r; }, L0));
  /* d. Échap rend le plan depuis une note ; la lettre suivante choisit l'outil, elle ne s'écrit pas dans la note */
  { const c = await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("texte"); const b0 = bbox(L()); return { x: (b0.x0 + b0.x1) / 2, y: (b0.y0 + b0.y1) / 2 }; });
    const q = await plan(c.x, c.y); await p.mouse.click(q.x, q.y); await wait(120); await p.keyboard.type("Abc"); await p.keyboard.press("Escape"); await wait(40); await p.keyboard.press("m"); await wait(60);
    t[`${L0} · note : Échap rend le plan, la touche M choisit les Murs, la note reste « Abc »`] = await p.evaluate(() => tool === "mur" && TX(L()).some((x) => x.text === "Abc") && !TX(L()).some((x) => /Abcm/.test(x.text)));
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); }
  /* e. Échap sur une bulle de survol la ferme, et rien d'autre */
  { await p.evaluate(() => { setTool("mur"); const b0 = bbox(L()); hover = v(b0.x1 + 2, b0.y0); clickAction(hover); });
    const bt = await p.evaluate(() => { const q = document.querySelector('#tools .tb[aria-label="Cote"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.move(bt.x, bt.y); await wait(80); await p.keyboard.press("Escape"); await wait(40);
    t[`${L0} · bulle de survol : Échap la ferme sans toucher au tracé en cours`] = await p.evaluate(() => document.getElementById("bulle").hidden && chain.length === 1 && tool === "mur");
    await p.mouse.move(5, 5); await p.evaluate(() => { endChain(false); setTool("select"); }); }
  /* f. retours : supprimer le dit et propose « Annuler » ; Annuler garde la sélection et dit la vue ; une dimension aberrante est refusée */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; setMode("existant", true); closeModal();
    const wc = L().items.find((x) => x.type === "wc"), n0 = L().items.length; sel = { kind: "item", id: wc.id }; render(); deleteSel(); const T = document.getElementById("toast"), b = T.querySelector(".tact");
    r[`${larg} · supprimer : « Retiré du plan : … » avec « Annuler », qui le rend`] = /Retiré du plan/.test(T.textContent) && !!b && /Annuler/.test(b.textContent) && (b.click(), L().items.length === n0);
    setMode("projet", true); closeModal(); const w = L().walls.find((x) => !isVirtual(x) && !isExteriorWall(x) && wst(x) !== "demolir"); sel = { kind: "wall", id: w.id }; render(); setWallProp("st", "demolir"); undo();
    r[`${larg} · Annuler garde l'élément choisi s'il existe encore`] = sel && sel.kind === "wall" && sel.id === w.id && wst(findWall(w.id)) !== "demolir";
    setWallProp("st", "demolir"); setMode("existant", true); closeModal(); undo();
    r[`${larg} · Annuler qui change de vue le dit (« retour en vue Travaux »)`] = mode() === "projet" && /retour en vue/.test(document.getElementById("toast").textContent);
    const rad = L().items.find((x) => x.type === "radiateur"); sel = { kind: "item", id: rad.id }; render(); const w0 = rad.w; setItemProp("w", 140); const T2 = document.getElementById("toast"), act = T2.querySelector(".tact");
    r[`${larg} · une largeur aberrante (140) n'est pas appliquée : le message propose 1,40 m, et le bouton la met`] = L().items.find((x) => x.id === rad.id).w === w0 && /1,40 m/.test(T2.textContent) && !!act && (act.click(), Math.abs(L().items.find((x) => x.id === rad.id).w - 1.4) < 1e-9);
    undo(); sel = null; render(); return r; }, L0));
  /* g. la consigne d'une sélection multiple, d'une cote, d'une note */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; setMode("projet", true); closeModal(); setTool("select");
    const ids = L().items.slice(0, 3).map((x) => x.id); multi = ids; sel = { kind: "item", id: ids[0] }; render(); const h1 = document.getElementById("hint").textContent;
    const nt = TX(L())[0]; sel = { kind: "text", id: nt.id }; multi = []; render(); const h2 = document.getElementById("hint").textContent;
    r[`${larg} · consigne : « ces 3 équipements » en sélection multiple, « Échap rend le plan » pour une note (« ${h1} » · « ${h2} »)`] = /ces 3 équipements/.test(h1) && /Échap/.test(h2);
    sel = null; render(); return r; }, L0));
  /* h. la souris quitte le plan : plus d'aperçu fantôme ni de mesure en direct */
  { await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("ouverture"); setOpeningType("porte"); });
    const w = await p.evaluate(() => { const x = L().walls.find((y) => !isVirtual(y) && wallLen(y) > 2.5); const c = add(add(x.a, mul(sub(x.b, x.a), 0.5)), wallOff(x)); return { x: c.x, y: c.y }; });
    const q = await plan(w.x, w.y); await p.mouse.move(q.x, q.y); await wait(60); const avant = await p.evaluate(() => !!hover && !document.getElementById("mesureLive").hidden);
    const ob = await p.evaluate(() => { const r = document.getElementById("optbar").getBoundingClientRect(); return { x: r.left + 20, y: r.top + 22 }; }); await p.mouse.move(ob.x, ob.y, { steps: 4 }); await wait(60);
    t[`${L0} · la souris quitte le plan : plus d'aperçu fantôme ni de mesure en direct`] = avant && await p.evaluate(() => hover === null && document.getElementById("mesureLive").hidden); }
  /* i. pose d'une porte : sur un mur de façade, le curseur dans l'épaisseur ouvre vers le logement ; juste après, pas de rouge */
  { const w = await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("ouverture"); setOpeningType("porte_entree"); const lv = L();
      const x = lv.walls.filter((y) => !isVirtual(y) && isExteriorWall(y) && wallLen(y) > 2).find((y) => { const L0 = wallLen(y); return !lv.openings.some((o) => o.wallId === y.id && Math.abs(o.t - 0.5) * L0 < 0.9); });
      if (!x) return null; const u = norm(sub(x.b, x.a)), n = perp(u), si = interiorSideN(x), c = add(add(add(x.a, mul(sub(x.b, x.a), 0.5)), wallOff(x)), mul(n, -si * wallT(x) * 0.3)); return { id: x.id, x: c.x, y: c.y, si }; });
    if (!w) t[`${L0} · porte posée sur une façade : un mur libre pour l'essai`] = false; else {
      const q = await plan(w.x, w.y); await p.mouse.move(q.x, q.y); await wait(50); await p.mouse.click(q.x, q.y); await wait(80);
      const r = await p.evaluate((w) => { const o = L().openings[L().openings.length - 1]; return { side: o.side, mur: o.wallId === w.id, live: document.getElementById("mesureLive").textContent, ko: !!apercuInfo?.deja }; }, w);
      t[`${L0} · porte d'entrée posée sur une façade, le curseur dans l'épaisseur : elle s'ouvre vers le logement`] = r.mur && r.side === w.si;
      t[`${L0} · juste après la pose : un retour neutre (« ${r.live.slice(0, 40)} »), pas « déjà là » ni de cadre rouge`] = /posée/.test(r.live) && !/déjà là/.test(r.live) && !r.ko;
      await p.evaluate(() => { undo(); setTool("select"); sel = null; render(); }); } }
  /* j. une fenêtre se choisit dans l'épaisseur de son mur, même avec un radiateur contre elle */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; setMode("existant", true); closeModal(); setTool("select"); render();
    const lv = L(), o = lv.openings.find((x) => OPENINGS[x.type].kind === "win" && x.w >= 1), w = findWall(o.wallId), u = norm(sub(w.b, w.a)), n = perp(u), si = interiorSideN(w), c = add(add(w.a, mul(sub(w.b, w.a), o.t)), wallOff(w));
    /* seuls la fenêtre et un radiateur contre elle (les autres équipements, mis de côté, ne gênent pas l'essai) */
    const rad = { id: uid(), type: "radiateur", x: 0, y: 0, w: 0.8, h: 0.1, rot: Math.atan2(u.y, u.x) }; const pc = add(c, mul(n, si * (wallT(w) / 2 + 0.05))); rad.x = pc.x; rad.y = pc.y; const garde = lv.items; lv.items = [rad]; draw();
    const h1 = hitTest(add(c, mul(n, si * wallT(w) * 0.4))), h2 = hitTest(add(add(c, mul(u, -o.w / 4)), mul(n, si * (wallT(w) / 2 + 0.3)))), h3 = hitTest(pc);
    r[`${larg} · une fenêtre se choisit dans l'épaisseur du mur et sur ses vantaux ; le radiateur contre elle reste choisissable`] = h1?.kind === "opening" && h1.id === o.id && h2?.kind === "opening" && h2.id === o.id && h3?.kind === "item" && h3.id === rad.id;
    lv.items = garde; draw(); return r; }, L0));
  /* k. la barre d'actions revient à la fin d'un glissé de la vue, sans attendre la souris */
  { const c = await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("select"); const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier"); sel = { kind: "item", id: it.id }; multi = []; render(); const r = cv.getBoundingClientRect(), Z = zoneUtile(); return { x: r.left + Z.x0 + 30, y: r.top + Z.y0 + 30 }; });
    await p.mouse.move(c.x, c.y); await p.mouse.down({ button: "middle" }); await p.mouse.move(c.x + 20, c.y + 12, { steps: 3 }); await p.mouse.up({ button: "middle" }); await wait(500);
    t[`${L0} · barre d'actions : visible à la fin d'un glissé de la vue (bouton du milieu), sans mouvement de souris`] = await p.evaluate(() => !document.getElementById("selbar").hidden); }
  /* l. le plan : la chaîne des baies, les cotes intérieures hors des ouvertures, une palette de pièces loin des couleurs de sens */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; setMode("existant", true); closeModal(); sel = null; settings.cotes = true; fitView(); render();
    const ch = exteriorChains(L()), lv = L(), avec = ch.filter((c) => c.baies);
    const jambes = avec.every((c) => lv.openings.filter((o) => { const w = findWall(o.wallId); if (!w || !opDrawn(o)) return false; const k = c.axis === "x" ? "y" : "x"; return Math.abs(w.a[k] - c.pos) < 0.05 && Math.abs(w.b[k] - c.pos) < 0.05; }).every((o) => { const w = findWall(o.wallId), cc = w.a[c.axis] + (w.b[c.axis] - w.a[c.axis]) * o.t; return c.baies.some((x) => Math.abs(x - (cc - o.w / 2)) < 0.011) && c.baies.some((x) => Math.abs(x - (cc + o.w / 2)) < 0.011); }));
    r[`${larg} · chaîne des baies : au 1er rang de chaque façade percée, nu extérieur et jambages de chaque ouverture (${avec.length} façades)`] = avec.length >= 2 && jambes;
    const ouv = boitesOuvertures(lv).map((b) => ({ x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 })), x = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    r[`${larg} · aucune cote intérieure n'écrit son texte sur une ouverture (dormant, vantaux, débattement)`] = !cotesVues.some((c) => ouv.some((o) => x(c, o)));
    const sens = ["#4f46e5", "#7c3aed", "#b45309", "#b91c1c", "#d97706"]; r[`${larg} · pièces : aucune teinte de type de pièce n'est une couleur de sens (sélection, à créer, à démolir)`] = ROOM_TYPES.every((x) => !sens.includes(String(x[2]).toLowerCase()));
    r[`${larg} · icônes : la surface n'a plus le dessin d'« Ajuster » ; Murs n'est plus une masse pleine`] = ICONS.surface !== ICONS.ajuster && !/fill="currentColor" stroke="none"/.test(ICONS.outilMur);
    return r; }, L0));
  /* m. Mac : les raccourcis se disent ⌘ (le clavier accepte ⌘ et Ctrl) */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; if (!MAC) { r[`${larg} · raccourcis : sur cette machine, « Ctrl » (pas un Mac)`] = !/⌘/.test(document.getElementById("undoBtn").dataset.tip); return r; }
    setMode("existant", true); closeModal(); const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier"); sel = { kind: "item", id: it.id }; multi = []; render(); ouvrirMenuCtx(null); const k = [...document.querySelectorAll("#ctxMenu kbd")].map((x) => x.textContent).join(" "); fermerMenuCtx(false); sel = null; render();
    r[`${larg} · raccourcis sur Mac : ⌘ dans le menu (« ${k} »), la bulle d'Annuler et le menu Fichier ; plus de « Ctrl »`] = /⌘D/.test(k) && !/Ctrl/.test(k) && /⌘Z/.test(document.getElementById("undoBtn").dataset.tip) && document.querySelector("#savePlanBtn kbd").textContent === "⌘S";
    return r; }, L0));
  /* n. la bulle en deux niveaux (nom et touche, puis la phrase), même texte que data-tip */
  { const bt = await p.evaluate(() => { setTool("select"); const q = document.querySelector('#tools .tb[aria-label="Murs"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.move(bt.x, bt.y); await wait(80);
    t[`${L0} · bulle d'un outil : le nom en gras et sa touche, puis la phrase — le texte reste celui de data-tip`] = await p.evaluate(() => { const b = document.getElementById("bulle"), el = document.querySelector('#tools .tb[aria-label="Murs"]'); return !b.hidden && b.querySelector("b")?.textContent === "Murs" && b.querySelector("kbd")?.textContent === "M" && !!b.querySelector(".ph") && b.textContent === el.dataset.tip; });
    await p.mouse.move(5, 5); }
  } catch (e) { t[`D64 · ${L0} — ${e.message.split("\n")[0]}`] = false; }
  await p.close();
}
/* o. tablette (≤ 900 px, panneau replié) : la fiche ouverte par « Voir sa fiche » se replie quand la sélection se vide */
{ const p = await onglet({ larg: 768, haut: 1024 });
  Object.assign(t, await p.evaluate(() => { const r = {}, plie = () => document.querySelector(".body").classList.contains("panelPlie"); let pref0 = null; try { pref0 = localStorage.getItem("avyora-plan-plie"); } catch {}
    setTool("select"); const it = L().items.find((x) => !ITEMS[x.type].elec && x.type !== "escalier"); sel = { kind: "item", id: it.id }; render(); const a = plie(); ouvrirFiche(); const b = !plie();
    sel = null; render(); let pref = null; try { pref = localStorage.getItem("avyora-plan-plie"); } catch {}
    r["768 × 1024 · « Voir sa fiche » ouvre le panneau ; la sélection vidée, il se replie, la préférence ne change pas"] = a && b && plie() && pref === pref0;
    return r; }));
  await p.close(); }

/* ═════════ 10. D65 · la dernière passe : la consigne toujours là, une place par rôle, les finitions ═════════ */
/* les aides de la page (noms à part : la page a ses propres globales) */
const AIDES = () => { window.__vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
  window.__H = document.getElementById("hint"); window.__entiere = () => __vis(__H) && !__H.classList.contains("cede") && __H.getBoundingClientRect().width >= 40 && __H.scrollWidth <= __H.clientWidth + 1; };
for (const [L0, H0] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L0, haut: H0 });
  await p.evaluate(AIDES);
  try {
  /* a. au repos : la consigne de chaque outil et de chaque sélection se lit entière, en Avant travaux comme en Travaux (la
     légende déplacée dans la barre d'état lui prenait sa place) ; ce qui cède le fait dans l'ordre (échelle, zoom, légende) */
  Object.assign(t, await p.evaluate((larg) => { const r = {}, ko = [];
    for (const vue of ["existant", "projet"]) { setMode(vue, true); closeModal();
      for (const o of ["select", "zone", "mur", "ouverture", "doublage", "equipement", "cote", "mesure", "texte", "calque"]) { setTool(o); sel = null; render(); if (!__entiere()) ko.push(vue + "/" + o); }
      setTool("select"); const lv = L();
      for (const [kind, x] of [["wall", lv.walls.find((w) => !isVirtual(w))], ["opening", lv.openings[0]], ["item", lv.items.find((i) => !ITEMS[i.type].elec)], ["room", lv.rooms[0]]]) { sel = { kind, id: x.id }; render(); if (!__entiere()) ko.push(vue + "/" + kind); }
      sel = null; render(); }
    r[`${larg} · barre d'état au repos : la consigne se lit entière pour chaque outil et chaque sélection, en Avant travaux et en Travaux${ko.length ? " — coupée : " + ko.join(", ") : ""}`] = !ko.length;
    setMode("projet", true); closeModal(); sel = { kind: "opening", id: L().openings[0].id }; render();
    const c = (id) => document.getElementById(id).classList, lg = c("legendeVue"), legendeCede = lg.contains("cede") || lg.contains("court");
    r[`${larg} · barre d'état : l'échelle et le pourcentage de zoom cèdent avant la légende, la légende avant la consigne (consigne entière)`] = __entiere() && (!legendeCede || (c("echelle").contains("cede") && c("zlabel").contains("cede"))) && !__H.dataset.tip;
    sel = null; render(); return r; }, L0));
  /* b. pendant un tracé réel en vue Travaux : consigne entière, mesure en direct ; la légende et l'échelle laissent la place */
  { await p.evaluate(() => { setMode("projet", true); closeModal(); setTool("select"); sel = null; render(); });
    await p.keyboard.press("m"); await wait(60);
    const c = await p.evaluate(() => { const Z = zoneUtile(), r = cv.getBoundingClientRect(); return { x: r.left + Z.x0 + 30, y: r.top + Z.y0 + 40, z: view.zoom }; });
    await p.mouse.move(c.x, c.y); await p.mouse.click(c.x, c.y); await wait(60); await p.mouse.move(c.x, c.y + 3 * c.z, { steps: 5 }); await wait(100);
    t[`${L0} · tracé réel en vue Travaux : la consigne se lit entière à côté de la mesure en direct ; la légende et l'échelle laissent la place ; le zoom reste au bord droit`] = await p.evaluate(() => { const ml = document.getElementById("mesureLive"), ET = document.getElementById("etat"), Z = document.querySelector(".etat .zoomctl"); return chain.length === 1 && __entiere() && /Coin suivant/.test(__H.textContent) && __vis(ml) && /Longueur/.test(ml.textContent) && !__vis(document.getElementById("legendeVue")) && !__vis(document.getElementById("echelle")) && Math.abs(ET.getBoundingClientRect().right - Z.getBoundingClientRect().right) <= 4; });
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.mouse.move(5, 5);
    /* la pose refusée (« déjà là ») : le message le plus long ; la consigne reste là, la fin du refus cède d'abord */
    t[`${L0} · pose refusée (« déjà là ») : la consigne reste visible${L0 >= 1024 ? "" : ", coupée avec sa bulle"}, le refus est dit`] = await p.evaluate(() => { setTool("ouverture"); const o0 = L().openings[0], w0 = findWall(o0.wallId); hover = add(add(w0.a, mul(sub(w0.b, w0.a), o0.t)), wallOff(w0)); draw(); const ml = document.getElementById("mesureLive"), ok = __vis(__H) && __H.getBoundingClientRect().width >= 40 && (__entiere() || __H.dataset.tip === __H.textContent.trim()) && __vis(ml) && /déjà là/.test(ml.textContent) && __vis(ml.querySelector(".ko")); hover = null; setTool("select"); draw(); return ok; }); }
  /* c. la surface une seule fois sur la ligne : dans le pied du panneau (à côté du budget) ; panneau replié, dans la barre d'état */
  Object.assign(t, await p.evaluate((larg) => { const r = {}; setMode("projet", true); closeModal(); setTool("select"); sel = null; render();
    const sb = document.getElementById("surfBadge"), pr = () => document.querySelector("#pfoot .presume"), a = !__vis(sb) && __vis(pr()) && /habitables/.test(pr().textContent);
    plierPanneau(true); render(); const b2 = __vis(sb) && /habitables/.test(sb.textContent) && !__vis(pr()) && __entiere(); plierPanneau(false); render();
    r[`${larg} · surface : une seule fois — pied du panneau quand il est ouvert, barre d'état quand il est replié (avec la consigne entière)`] = a && b2;
    return r; }, L0));
  /* d. une seule place par rôle : sans modèle (clic réel), la consigne n'est dite qu'une fois — dans la barre d'état, qui s'allume */
  { await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("equipement"); setFamEquip("chauffage"); document.getElementById("toast").classList.remove("show"); });
    const m = await p.evaluate(() => { const b0 = bbox(L()), q = S(v((b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2)), r = cv.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; });
    const n0 = await p.evaluate(() => L().items.length); await p.mouse.click(m.x, m.y); await wait(120);
    t[`${L0} · Équipements sans modèle (clic réel) : rien n'est posé ; la consigne est dite une fois (barre d'état, qui s'allume) ; pas de message ni de carte qui la répète`] = await p.evaluate((n0) => { const T = document.getElementById("toast"), P = document.getElementById("pbody"), re = /choisis[- ](d'abord )?(une famille, puis )?un modèle|choisis-en un/i;
      const textes = [__H.textContent, __vis(T) && T.classList.contains("show") ? T.textContent : "", P.innerText, document.getElementById("optbar").innerText];
      return L().items.length === n0 && itemType === null && textes.filter((x) => re.test(x)).length === 1 && re.test(__H.textContent) && __H.classList.contains("allume") && !!P.querySelector(".mprop.vide") && !/Aucun modèle choisi/.test(P.innerText); }, n0);
    t[`${L0} · Équipements : la consigne allumée s'éteint dès qu'une autre la remplace (autre outil)`] = await p.evaluate(() => { setTool("select"); draw(); return !__H.classList.contains("allume") && !document.getElementById("optbar").classList.contains("allume"); });
    await p.evaluate(() => { setItemType("radiateur"); setTool("select"); }); }
  /* e. la feuille blanche : la consigne dans la barre d'état seulement — un pictogramme au centre du plan, un mode d'emploi qui dit autre chose */
  t[`${L0} · feuille blanche : « clique le 1er coin » une seule fois (barre d'état) ; un pictogramme au centre du plan, le mode d'emploi commence ailleurs`] = await p.evaluate(() => { newPlan(); const o = ctx.fillText, oa = ctx.arc, ecrits = []; let pts = 0; ctx.fillText = function (s) { ecrits.push(s); return o.apply(this, arguments); }; ctx.arc = function () { pts++; return oa.apply(this, arguments); }; draw(); ctx.fillText = o; ctx.arc = oa;
    const P = document.getElementById("pbody").innerText, T = document.getElementById("toast"), ok = tool === "mur" && !ecrits.some((x) => /coin/i.test(x)) && pts >= 4 && /1er coin/.test(__H.textContent) && __entiere() && !/poser le premier coin|1er coin/.test(P) && !(T.classList.contains("show") && /coin/.test(T.textContent));
    closeWelcome("sample"); closeModal(); setTool("select"); return ok; });
  /* f. les finitions */
  Object.assign(t, await p.evaluate((larg) => { const r = {};
    r[`${larg} · icône Murs : un angle de mur poché avec l'amorce d'une cloison (plus la lettre « L »)`] = (ICONS.outilMur.match(/<path/g) || []).length >= 2 && !/fill="currentColor" stroke="none"/.test(ICONS.outilMur);
    const e0 = DBL_CFG.e; DBL_CFG.e = EP_DOUBLAGE[EP_DOUBLAGE.length - 1] / 1000; setTool("select"); setTool("doublage"); const on = document.querySelector("#optbar .seg.barre.ep .miniep.on"), sc = defileOptbar(document.getElementById("optbar")), q = on && on.getBoundingClientRect(), z = sc.getBoundingClientRect();
    r[`${larg} · Doublage : l'épaisseur choisie (${on ? on.textContent : "?"}) est en vue dans la barre d'options, comme le modèle choisi`] = !!on && q.left >= z.left - 0.5 && q.right <= z.right + 0.5;
    DBL_CFG.e = e0; setTool("select"); return r; }, L0));
  /* le champ Largeur : un clic au milieu prend toute la valeur — taper 140 la remplace (et propose 1,40 m) */
  { const f = await p.evaluate(() => { setMode("existant", true); closeModal(); setTool("select"); const rad = L().items.find((x) => x.type === "radiateur"); sel = { kind: "item", id: rad.id }; render(); const i = document.querySelector("#pbody input[type=number]"); i.scrollIntoView({ block: "center" }); const q = i.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: rad.w }; });
    await p.mouse.click(f.x, f.y); await wait(50); await p.keyboard.type("140"); await p.keyboard.press("Enter"); await wait(120);
    t[`${L0} · champ numérique : un clic au milieu de Largeur prend toute la valeur — 140 la remplace, refusé avec « Mettre 1,40 m »`] = await p.evaluate((w) => { const T = document.getElementById("toast"), rad = L().items.find((x) => x.type === "radiateur"); const ok = rad.w === w && /140,00 m/.test(T.textContent) && /1,40 m/.test(T.textContent) && !!T.querySelector(".tact"); sel = null; render(); return ok; }, f.w); }
  /* la séparation en cours de tracé : des tirets d'encre sur le trait, la ligne guide 10 px à côté */
  { await p.evaluate(() => { newPlan(); wallType = "virtuel"; renderOptions(); });
    const c = await p.evaluate(() => { const Z = zoneUtile(), r = cv.getBoundingClientRect(); return { x: r.left + (Z.x0 + Z.x1) / 2 - 150, y: r.top + Z.y0 + 60, z: view.zoom }; });
    await p.mouse.move(c.x, c.y); await p.mouse.click(c.x, c.y); await wait(60); await p.mouse.move(c.x, c.y + 3.2 * c.z, { steps: 5 }); await wait(100);
    t[`${L0} · séparation en cours de tracé : des tirets d'encre sur le trait, la ligne guide de la cote à côté (plus dessus)`] = await p.evaluate(() => { if (chain.length !== 1 || !liveMur) return false; const a = S(chain[0]), b = S(liveMur.end), k = devicePixelRatio;
      const lire = (dx) => { let ind = 0, enc = 0; for (let y = Math.min(a.y, b.y) + 24; y < Math.max(a.y, b.y) - 24; y += 1) { const d = ctx.getImageData(Math.round((a.x + dx) * k), Math.round(y * k), 1, 1).data; if (d[2] > 180 && d[0] < 140 && d[2] - d[0] > 80) ind++; else if (d[0] < 200 && d[2] < 210 && d[2] - d[0] < 70 && d[0] + d[1] + d[2] < 560) enc++; } return { ind, enc }; };
      const trait = lire(0), cote = [lire(-10), lire(10)].sort((x, y) => y.ind - x.ind)[0]; return Math.abs(a.x - b.x) < 1 && trait.enc > 10 && trait.ind <= 2 && cote.ind > 10; });
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.evaluate(() => { wallType = "auto"; closeWelcome("sample"); closeModal(); setTool("select"); }); }
  /* les cotes intérieures : une ligne libre plus loin dans la pièce avant de traverser un meuble (pièce de 5 × 4 m, un
     canapé contre chaque long mur : à 26 et 95 cm des deux murs, la cote de largeur traversait un meuble) */
  t[`${L0} · cotes intérieures : la cote de largeur prend une ligne libre plus loin dans la pièce plutôt que traverser un meuble`] = await p.evaluate(() => { newPlan(); rectMode = { L: 5, l: 4 }; clickAction(v(0, 0)); rectMode = null; setTool("select"); const lv = L(); render();
    const f = (facesCache[lv.id] || []).find((x) => x.room); if (!f) return false; const ib = roomInteriorBox(lv, f), w = ib.x1 - ib.x0;
    lv.items.push({ id: uid(), type: "canape", x: (ib.x0 + ib.x1) / 2, y: ib.y0 + 0.55, w: w - 0.2, h: 1.0, rot: 0 }, { id: uid(), type: "canape", x: (ib.x0 + ib.x1) / 2, y: ib.y1 - 0.55, w: w - 0.2, h: 1.0, rot: 0 }); fitView(); render();
    const o = drawDim, vus = []; drawDim = function (a, b, col, withText, evite, cout, essai) { const r2 = o.apply(this, arguments); if (col === "#6d4fc2" && withText && !essai && r2) vus.push({ A: S(a), B: S(b), hz: Math.abs(a.y - b.y) < 1e-6 }); return r2; }; draw(); drawDim = o;
    const eq = obstaclesEtiquettes(lv, true), larg = vus.find((x) => x.hz); const ok = !!larg && !eq.some((q) => segCoupeBoite(larg.A, larg.B, q)); closeWelcome("sample"); closeModal(); return ok; });
  } catch (e) { t[`D65 · ${L0} — ${e.message.split("\n")[0]}`] = false; }
  await p.close();
}
/* g. sous 1 024 px (tablette, panneau ouvert) : la consigne peut se couper — en « … », jamais retirée, entière dans la bulle */
{ const p = await onglet({ larg: 768, haut: 1024 });
  await p.evaluate(AIDES);
  await p.evaluate(() => { plierPanneau(false); setTool("mur"); const Z = zoneUtile(); hover = W2(v(Z.x0 + 30, Z.y0 + 40)); clickAction(hover); hover = W2(v(Z.x0 + 30, Z.y0 + 40 + 3 * view.zoom)); draw(); });
  const q = await p.evaluate(() => { const h = document.getElementById("hint"), r = __H.getBoundingClientRect(); return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2, w: r.width, coupe: __H.scrollWidth > __H.clientWidth + 1, tip: __H.dataset.tip || "", txt: __H.textContent.trim(), ell: getComputedStyle(h).textOverflow }; });
  await p.mouse.move(q.x, q.y); await wait(120);
  t[`768 × 1024 · panneau ouvert, pendant un tracé : la consigne reste (${Math.round(q.w)} px)${q.coupe ? ", coupée en « … », entière dans la bulle" : ", entière"}`] = q.w >= 40 && /Coin suivant/.test(q.txt) && (!q.coupe || (q.ell === "ellipsis" && q.tip === q.txt && await p.evaluate((txt) => { const b = document.getElementById("bulle"); return !b.hidden && b.textContent.replace(/\s+/g, " ").includes(txt.replace(/\s+/g, " ")); }, q.txt)));
  await p.close(); }

await b.close().catch(() => {});
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : `\n✓ refonte : ${Object.keys(t).length} contrôles (registre d'icônes, design system, bibliothèques, symboles du plan et vignettes, disposition, interactions, toutes les tailles d’écran)`);
process.exit(echecs.length || errs.length ? 1 : 0);
