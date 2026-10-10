/**
 * D71 · La vue 3D du plan.
 *
 * La 3D est GÉNÉRÉE depuis le plan (une seule source, rien d'enregistré), dans un module du même fichier (fonctions v3…)
 * qui n'écrit jamais dans `state`. Three.js est chargé à la première ouverture, depuis jsDelivr. Ce contrôle vérifie :
 *   - le source : version de Three.js épinglée, sur un hôte que la CSP de l'artefact autorise ; aucune écriture de l'état
 *     dans le module (ni `state.… =`, ni historique, ni enregistrement) ;
 *   - le chargement : la page 2D ne demande RIEN au CDN (ni Three.js, ni aucun script) tant que la 3D n'est pas ouverte —
 *     seules les polices, déjà là avant D71 ; hors ligne (CDN bloqué), un message clair, « Réessayer » et « Retour au plan »,
 *     la 2D intacte ;
 *   - l'ouverture et la fermeture : le bouton « 3D » (à côté des niveaux), la touche 3, Échap, « Retour au plan », un outil
 *     choisi dans la colonne ; Suppr en 3D ne touche pas le plan caché ; (D73 : au téléphone, la maquette seule) ;
 *   - la géométrie, mesurée par des RAYONS lancés dans la scène (pas en relisant ce que le module dit avoir fait) : la
 *     hauteur de chaque mur = la hauteur du niveau (murs entiers), ou la coupe ; chaque ouverture = un trou de sa largeur
 *     et de sa hauteur, allège et linteau pleins, doublages percés avec le mur ; un sol par pièce, à sa place, de l'aire de
 *     la pièce ; l'étage posé sur le RDC (hauteur + plancher), la trémie de l'escalier ouverte ; les niveaux du dessus cachés ;
 *   - les phases : en rénovation, « Après travaux » par défaut (même si la 2D est en vue Travaux), le mur démoli absent
 *     après et présent avant, la fenêtre créée percée après et pas avant ; en Plan final, ni avant / après, ni mot du chantier ;
 *   - l'état du plan : identique (JSON complet ET empreinte) avant et après la 3D, avec ses réglages (niveau, vue, coupe,
 *     caméra) ; la 3D se reconstruit quand le plan change (Ctrl Z compris) et seulement alors ;
 *   - le rendu : pas d'erreur de page, une capture WebGL ni noire ni vide (l'encre des coupes s'y voit) ; le coût d'une
 *     construction sur la maison de 120 m².
 *   D72 (les détails), toujours par des rayons — les mesures des murs et des sols ne regardent que les murs, doublages et sols
 *   (v3Viser(…, genres)) : une fenêtre dans son trou ne doit pas fausser la mesure du trou, ni une table celle du sol :
 *   - menuiseries : une par ouverture (hors passages) ; chaque fenêtre ferme son jour jusqu'aux bords, côté pièce en applique,
 *     dans l'épaisseur en tunnel ; chaque porte intérieure a son vantail ouvert du côté où elle s'ouvre, à la hauteur de la
 *     porte ; la porte de garage fermée ; la matière (bois après, blanche avant pour une menuiserie à remplacer) ;
 *   - équipements : un volume par équipement montré, à sa largeur, à sa place, à sa hauteur courante (table 0,75, plan de
 *     travail 0,90, lit, canapé, baignoire, WC…), tranché par la coupe ; les points électriques en petits repères ; les
 *     phases (l'équipement déposé n'est plus là après) ;
 *   - escalier : ses vraies marches, une par une, du sol au plancher de l'étage, visibles par la trémie ; poteau et poutre ;
 *   - toiture : seulement pour une rénovation qui la décrit, éteinte par défaut ; allumée, la maison fermée (dernier niveau,
 *     murs entiers) ; la hauteur du pan (un pan, deux pans, plat) et les pignons mesurés ; couper les murs l'éteint.
 *
 *   D73 (l'ergonomie, la recette) :
 *   - la visite : « Visite » à la souris, une pièce à choisir (survol éclairé, son nom) ; un clic y entre, à 1,60 m du sol, murs
 *     entiers sous un plafond par pièce ; ZQSD / WASD et flèches (pas de côté, rotation sur place, Maj plus vite), un clic au
 *     sol y mène, la molette avance, glisser regarde ; les murs arrêtent à 25 cm (rayons), on glisse le long, une allège
 *     arrête, une porte se passe, la trémie de l'étage arrête, jamais dans un mur en courant droit devant ; Recentrer, Avant /
 *     Après en visite, un double-clic dans la maquette ; au clavier, « Visite » entre directement ; changer de niveau ;
 *   - la barre : la liste exacte de ses commandes, l'ordre de Tab, Espace / Entrée / flèches, un nom pour chacune ; à 1 440,
 *     1 280, 1 024 et 768 px : une ligne, sans chevauchement, la barre d'état en bas et son aide entière ; le plein écran ;
 *     Échap un cran à la fois ; au téléphone : le bouton, la maquette seule, l'orbite au doigt ;
 *   - la mémoire : vingt ouvertures et fermetures, rien ne s'accumule (géométries, textures, programmes, tas, écouteurs) ;
 *   - les performances : le temps de construction (maison de 94 m², de 120 m², plan réel) ; et, si la machine a une carte
 *     graphique (Chrome sans écran sur Metal), le temps d'une image à 2× (≤ 16,7 ms : 60 i/s) et la cadence de la boucle —
 *     sans carte graphique, rien n'est mesuré, et c'est dit ;
 *   - le réseau : la 3D ne demande que ses deux fichiers épinglés.
 *
 *   D74 (les corrections du jury) :
 *   - la caméra : 72° au plus après un glisser de 150 px vers le haut (des sols encore visibles), le double-clic dans le vide
 *     qui recentre, le cadrage sous la barre (1 024 px, toiture allumée) ;
 *   - la lumière, par des pixels : l'encre exacte sous le rendu filmique, le soleil à 30° de la caméra et la façade vue de face
 *     claire aux quatre azimuts, en visite des murs blancs dont deux perpendiculaires diffèrent, un plafond d'un autre ton,
 *     rien qui brûle ; les matières (métaux mats, noyer, parquet, tuile) ; les points lumineux en visite seulement ;
 *   - les joints : un mur percé d'une fenêtre est étanche (aucune jonction en T) ;
 *   - la visite : le point libre le plus proche d'un clic (le lit), l'entrée par la pièce devant sa porte, la sonde à 45 cm,
 *     les meubles et l'escalier qui arrêtent, l'arrêt à 60 cm d'un mur au clic puis le demi-tour vers la pièce, l'étage vu par
 *     la trémie, la volée entière ; les transitions, et leur absence sous « moins de mouvement » ;
 *   - avant / après : le fondu, ce qui change éclairé puis effacé ; la barre : largeur fixe de la coupe, facture du moment,
 *     Recentrer à part, barre éteinte sans scène, plan vide ; le panneau replié pendant la 3D ; la 3D proposée une fois ;
 *   - l'architecte : les quatre types d'escalier montent la marche de leur fiche, l'épaisseur de plancher de la fiche, la dalle
 *     et son chant, le garde-corps ouvert à l'arrivée, la partie basse de toiture (ni bandeau, ni tuiles à plat ; l'appentis),
 *     l'ITE sous les pans, la hauteur sous plafond d'une pièce, le retour d'isolant, le recouvrement en applique.
 *
 *   node maquettes/tools/vue3d.mjs "$(pwd)/maquettes"
 *
 * Three.js vient du CDN : sans réseau, le contrôle le DIT, joue ce qui ne demande pas le réseau, et sort en 0 avec un
 * avertissement (il ne masque pas une vraie erreur : une erreur de page ou un contrôle hors ligne raté sortent en 1).
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/vue3d.mjs <dossier maquettes>"); process.exit(2); }
setTimeout(() => { console.log("vue3d : délai dépassé (240 s)"); process.exit(3); }, 240000);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [], t = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SRC = fs.readFileSync(SP + "/plan-editor.html", "utf8");
const pf = fs.readFileSync(SP + "/tools/planfinal.mjs", "utf8"); const a0 = pf.indexOf("function scenePF() {"), SCENE_PF = pf.slice(a0, pf.indexOf("\n}\n", a0) + 3);
const FIX = JSON.parse(fs.readFileSync(SP + "/tools/fixtures/plan-refend-pierre.json", "utf8")).state;
const CDN = /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|three/i;
const V3_FACE = +(SRC.match(/V3_FACE=([\d.]+)/) || [0, 0.45])[1]; /* D74 : la sonde devant le visiteur */

async function onglet({ largeur = 1440, hauteur = 900, pro = true, bloquerCDN = false, requetes = null, tactile = false, dsf = 1, navigateur = b } = {}) {
  const p = await navigateur.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  if (requetes) p.on("request", (r) => requetes.push(r.url()));
  if (bloquerCDN) { await p.setRequestInterception(true); p.on("request", (r) => (CDN.test(r.url()) ? r.abort("internetdisconnected") : r.continue())); }
  await p.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: dsf, isMobile: tactile, hasTouch: tactile });
  await p.evaluateOnNewDocument((pro) => { try { if (sessionStorage.getItem("v3-semee")) return; sessionStorage.setItem("v3-semee", "1"); localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0");
    localStorage.setItem("avyora-plan-welcome", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); localStorage.setItem("avyora-plan-projet-tip", "1"); } catch {} }, pro);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}
/* attend la 3D prête ; renvoie 'pret', 'reseau' ou 'webgl' */
const attendre3D = (p) => p.waitForFunction(() => (v3Etat().pret && v3.etat !== "charge" && !v3.anim) || v3.etat === "reseau" || v3.etat === "webgl", { timeout: 60000 }).then(() => p.evaluate(() => (v3.etat === "reseau" || v3.etat === "webgl" ? v3.etat : "pret")));
/* D74 : les transitions de caméra (ouverture, entrée et sortie de visite, recadrage) durent 400 à 500 ms : on attend leur fin */
const finAnim = (p) => p.waitForFunction(() => !v3.anim, { timeout: 10000 }).then(() => wait(30));

/* ── les mesures, jouées DANS la page (THREE chargé) : rayons sur les murs, les ouvertures, les sols ── */
function MESURES() {
  /* D72 : les murs se mesurent parmi les murs et les doublages ; les sols parmi les sols et ce qui pourrait les couvrir à tort */
  const MUR = ["mur", "doublage"]; window.__SOL = ["sol", "mur", "doublage"];
  /* une ouverture : trou au centre, bords pleins juste à côté, allège et linteau pleins ; rayon horizontal à travers le mur */
  window.__trou = (lv, i, o, vue) => {
    const w = lv.walls.find((x) => x.id === o.wallId), H = lv.height || 2.5, Y0 = v3.altitudes[i], d = OPENINGS[o.type];
    const t = wallT(w), u = norm(sub(w.b, w.a)), n = perp(u), off = wallOff(w), Lw = wallLen(w);
    const z0 = Math.max(0, allegeOf(o) || 0), z1 = Math.min(H, z0 + (o.h || d.h)), hw = (o.w || d.w) / 2, sc = o.t * Lw;
    const top = Math.min(v3.coupe, H), D = t / 2 + 0.35;
    const tir = (s, z) => { const P = add(add(w.a, off), mul(u, s)), O = add(P, mul(n, D)); const h = v3Viser([O.x, Y0 + z, O.y], [-n.x, 0, -n.y], MUR); return h ? h.d : Infinity; };
    const plein = (s, z) => tir(s, z) <= 0.351, vide = (s, z) => tir(s, z) > D + t / 2 + 0.15;
    const ko = [];
    const zv0 = z0 + 0.05, zv1 = Math.min(z1, top) - 0.05;
    if (zv1 > zv0) { const zm = (zv0 + zv1) / 2;
      if (!vide(sc, zm)) ko.push("centre plein"); if (!vide(sc - hw + 0.04, zm)) ko.push("bord gauche plein"); if (!vide(sc + hw - 0.04, zm)) ko.push("bord droit plein");
      if (sc - hw - 0.04 > 0.3 && !plein(sc - hw - 0.04, zm)) ko.push("trop large à gauche"); if (sc + hw + 0.04 < Lw - 0.3 && !plein(sc + hw + 0.04, zm)) ko.push("trop large à droite");
      if (z0 > 0.12 && !plein(sc, z0 - 0.05)) ko.push("pas d'allège"); if (z1 < top - 0.12 && !plein(sc, z1 + 0.05)) ko.push("pas de linteau"); }
    return { id: o.id, type: o.type, ko, vu: zv1 > zv0 };
  };
  /* le haut d'un mur : rayon vertical sur l'axe du corps, loin des ouvertures et des bouts */
  window.__hautMur = (lv, i, w, vue) => {
    const Lw = wallLen(w), u = norm(sub(w.b, w.a)), off = wallOff(w), Y0 = v3.altitudes[i];
    const ops = lv.openings.filter((o) => o.wallId === w.id && opDrawn(o, vue)).map((o) => [o.t * Lw - (o.w || OPENINGS[o.type].w) / 2 - 0.25, o.t * Lw + (o.w || OPENINGS[o.type].w) / 2 + 0.25]);
    for (const k of [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6]) { const s = k * Lw; if (s < 0.35 || s > Lw - 0.35 || ops.some(([a, c]) => s > a && s < c)) continue;
      const P = add(add(w.a, off), mul(u, s)); const h = v3Viser([P.x, Y0 + 40, P.y], [0, -1, 0], MUR); return h ? { y: h.p[1] - Y0, kind: h.kind, cle: h.cle, niveau: h.niveau } : { y: null }; }
    return null;
  };
  /* D72 · une menuiserie : une fenêtre ferme son jour jusqu'aux bords (rayons horizontaux, des deux côtés), à sa place dans
     l'épaisseur (applique : côté pièce ; tunnel : dans le mur) ; le vantail d'une porte intérieure est ouvert du côté où elle
     s'ouvre, à la hauteur de la porte (rayon vertical) ; la porte de garage, fermée */
  window.__menuis = (lv, i, o) => {
    const d = OPENINGS[o.type], w = lv.walls.find((x) => x.id === o.wallId), H = lv.height || 2.5, Y0 = v3.altitudes[i];
    const t = wallT(w), Lw = wallLen(w), u = norm(sub(w.b, w.a)), n = perp(u), off = wallOff(w), A = add(w.a, off);
    const z0 = Math.max(0, allegeOf(o) || 0), z1 = Math.min(H, z0 + (o.h || d.h)), ow = o.w || d.w, hw = ow / 2, sc = o.t * Lw, top = Math.min(v3.coupe, H);
    const si = (() => { const a = wallSideInside(w, 1, lv), c = wallSideInside(w, -1, lv); return a && !c ? 1 : c && !a ? -1 : 1; })();
    const P = (s, b) => add(add(A, mul(u, s)), mul(n, b)), travers = (h) => (h.p[0] - A.x) * n.x + (h.p[2] - A.y) * n.y;
    /* parmi les menuiseries et les murs : un meuble posé devant (une tête de lit sous l'appui) ne cache pas la mesure */
    const BATI = ["menuiserie", "mur", "doublage"], tir = (s, z, cote) => { const O = P(s, cote * (t / 2 + 0.6)); return v3Viser([O.x, Y0 + z, O.y], [-cote * n.x, 0, -cote * n.y], BATI); };
    const ko = [];
    if (d.kind === "win" || d.kind === "bay" || d.kind === "doorwin") {
      const zm = (z0 + Math.min(z1, top)) / 2;
      [si, -si].forEach((cote) => { const h = tir(sc + 0.11 * hw, zm, cote); if (!h || h.kind !== "menuiserie") { ko.push("jour ouvert (" + (h ? h.kind : "rien") + ")"); return; }
        const b = travers(h); if (Math.abs(b) > t / 2 + 0.2) ko.push("hors du mur");
        if (poseOf(o) === "applique" && b * si < t / 2 - 0.02) ko.push("applique, pas côté pièce (" + b.toFixed(3) + ")"); if (poseOf(o) === "tunnel" && Math.abs(b) > t / 2 + 1e-3) ko.push("tunnel, hors de l'épaisseur"); });
      const bords = [[sc - hw + 0.02, zm], [sc + hw - 0.02, zm], [sc, z0 + 0.03]]; if (z1 < top - 0.05) bords.push([sc, z1 - 0.03]);
      bords.forEach(([s, z]) => { const h = tir(s, z, -si); if (!h || h.kind !== "menuiserie") ko.push("bord ouvert (" + s.toFixed(2) + ", " + z.toFixed(2) + ")"); });
      if (o.volet !== "battant") [[sc - hw - 0.03, zm], [sc + hw + 0.03, zm]].forEach(([s, z]) => { if (s < 0.1 || s > Lw - 0.1) return; const h = tir(s, z, -si); if (h && h.kind === "menuiserie") ko.push("cadre plus large que le trou, côté dehors"); });
    } else if ((d.kind === "door" || d.kind === "door2") && !isExtType(o.type)) {
      const side = o.side || 1, hinge = o.hinge || 1, V = d.kind === "door" ? [[-hw * hinge, hinge, ow]] : [[-hw, 1, hw], [hw, -1, hw]];
      V.forEach(([hx, hg, lw]) => { const C = P(sc + hx + hg * 0.02, side * (t / 2 + lw / 2)), h = v3Viser([C.x, Y0 + 30, C.y], [0, -1, 0], BATI);
        if (!h || h.kind !== "menuiserie" || Math.abs(h.p[1] - Y0 - Math.min(z1 - 0.005, top)) > 0.012) ko.push("vantail (" + (h ? h.kind + " " + (h.p[1] - Y0).toFixed(3) : "rien") + ")");
        const M = P(sc + hx + hg * 0.02, -side * (t / 2 + lw / 2)), hm = v3Viser([M.x, Y0 + 30, M.y], [0, -1, 0], BATI); if (hm && hm.kind === "menuiserie" && hm.p[1] - Y0 > 0.5) ko.push("vantail du mauvais côté"); });
    } else if (o.type === "garage") { const h = tir(sc, Math.min(1, top - 0.05), -si); if (!h || h.kind !== "menuiserie" || Math.abs(travers(h)) > t / 2 + 0.01) ko.push("tablier absent ou hors du tableau"); }
    return { id: o.id, type: o.type, ko };
  };
  /* D72 · un équipement : sa boîte construite (largeur, profondeur, centre) et un rayon vertical en son centre, à sa hauteur
     courante — tranchée par la coupe ; un point électrique : un petit repère, à sa hauteur */
  window.__HAUTS = { table: 0.75, bureau: 0.75, plan: 0.9, ilot: 0.904, lit: 0.57, lit1: 0.57, canape: 0.46, armoire: 2.0, frigo: 1.8, lave_vaisselle: 0.85, lave_linge: 0.85, baignoire: 0.156, lavabo: 0.864, vasque2: 0.86, wc: 0.41, radiateur: 0.75, cumulus: 1.55 };
  window.__equip = (lv, i, it) => {
    const E = v3Etat(), r = E.equipements.find((x) => x.id === it.id), d = ITEMS[it.type], ko = [];
    if (!r) return { type: it.type, ko: ["absent"] };
    const Y0 = v3.altitudes[i] + (i ? 0.012 : 0.003), top = v3.niveau === i ? Math.min(v3.coupe, lv.height) - (i ? 0.012 : 0.003) : 99, b = r.boite;
    if (d.elec) { if (!b) return { type: it.type, ko };
      const ext = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]); if (ext > (it.type === "tableau" || it.type === "lumiere" ? 0.82 : 0.17)) ko.push("repère trop grand " + ext.toFixed(2));
      const zb = b[1] - Y0; if ((it.type === "prise" || it.type === "prise2") && Math.abs(zb - 0.25) > 0.005) ko.push("prise à " + zb.toFixed(2)); if (it.type === "interrupteur" && Math.abs(zb - 1.06) > 0.005) ko.push("interrupteur à " + zb.toFixed(2));
      return { type: it.type, ko }; }
    if (["escalier", "poteau", "poutre", "velux"].includes(it.type)) return { type: it.type, ko };
    if (!b) { if (top > 0.5) ko.push("rien de construit"); return { type: it.type, ko }; }
    const w = it.w || d.w, h = it.h || d.h, rot = (((it.rot || 0) % Math.PI) + Math.PI) % Math.PI, axeX = Math.abs(Math.sin(rot)) < 0.02, axeY = Math.abs(Math.cos(rot)) < 0.02;
    if (axeX || axeY) { const ex = axeX ? b[3] - b[0] : b[5] - b[2], ey = axeX ? b[5] - b[2] : b[3] - b[0];
      if (ex < w - 0.08 || ex > w + 0.06) ko.push("largeur " + ex.toFixed(2) + " pour " + w); if (ey < h - 0.08 || ey > h + 0.6) ko.push("profondeur " + ey.toFixed(2) + " pour " + h);
      if (Math.abs((axeX ? b[0] + b[3] : b[2] + b[5]) / 2 - (axeX ? it.x : it.y)) > 0.05) ko.push("décentré"); }
    /* un autre équipement posé au-dessus de son centre (dans le plan : un radiateur sous la tête du lit) : sa hauteur ne se lit pas d'en haut */
    const sous = lv.items.some((j) => j !== it && !ITEMS[j.type]?.elec && itemDrawn(j, v3.vue) && (() => { const c = Math.cos(-(j.rot || 0)), sn = Math.sin(-(j.rot || 0)), dx = it.x - j.x, dy = it.y - j.y; return Math.abs(c * dx - sn * dy) < j.w / 2 && Math.abs(sn * dx + c * dy) < j.h / 2; })());
    const hit = v3Viser([it.x, v3.altitudes[i] + 30, it.y], [0, -1, 0], ["equipement"]), hz = hit ? hit.p[1] - Y0 : null, att = sous ? null : __HAUTS[it.type];
    if (!hit) ko.push("rien au centre"); else if (att != null && Math.abs(hz - Math.min(att, top)) > 0.012) ko.push("hauteur " + hz.toFixed(3) + " pour " + Math.min(att, top).toFixed(3));
    if (hit && hz > top + 0.002) ko.push("au-dessus de la coupe");
    return { type: it.type, ko, hz };
  };
  /* D72 · un escalier : un rayon vertical au milieu de chaque marche (stairGeom, la 2D) — chacune un cran plus haut, la dernière
     un cran sous le sol du dessus ; au-dessus de la coupe, plus rien */
  window.__escalier = (lv, i, it) => {
    const G = stairGeom(it, lv), c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0), W = (x, y) => [it.x + c * x - s * y, it.y + s * x + c * y];
    const Y0 = v3.altitudes[i] + (i ? 0.012 : 0.003), up = state.levels[i + 1], mt = up ? v3.altitudes[i + 1] + 0.012 - Y0 : stairCalc(it, lv).rise;
    const pts = []; G.rects.forEach((r) => { if (r.land) { pts.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 }); return; } const vert = r.dir === "up" || r.dir === "down", st = (vert ? r.h : r.w) / r.n;
      for (let k = 0; k < r.n; k++) { const a = (k + 0.5) * st; pts.push(r.dir === "up" ? { x: r.x + r.w / 2, y: r.y + r.h - a } : r.dir === "down" ? { x: r.x + r.w / 2, y: r.y + a } : r.dir === "right" ? { x: r.x + a, y: r.y + r.h / 2 } : { x: r.x + r.w - a, y: r.y + r.h / 2 }); } });
    const hm = mt / (pts.length + 1), top = v3.niveau === i ? Math.min(v3.coupe, lv.height) - (i ? 0.012 : 0.003) : 99, ko = []; let vues = 0;
    pts.forEach((p, j) => { const q = W(p.x, p.y), h = v3Viser([q[0], v3.altitudes[i] + 40, q[1]], [0, -1, 0], ["escalier", "sol"]), z = (j + 1) * hm;
      if (z <= top - 0.05) { if (!h || h.kind !== "escalier" || Math.abs(h.p[1] - Y0 - z) > 0.004) ko.push("marche " + (j + 1) + " : " + (h ? h.kind + " " + (h.p[1] - Y0).toFixed(3) : "rien") + " pour " + z.toFixed(3)); else vues++; }
      else if (z > top + 0.01 && h && h.kind === "escalier" && h.p[1] - Y0 > top + 0.001) ko.push("marche " + (j + 1) + " au-dessus de la coupe"); });
    return { ko, n: pts.length, vues, hm, mt };
  };
  /* D72 · la hauteur attendue du dessus de la toiture en p : le pan passe par l'arête extérieure du haut des murs du dernier
     niveau (toitureGeom : la face extérieure des murs, R), la couverture V3_TOIT_EP au-dessus ; le plus bas des pans */
  window.__toitZ = (p) => { const G = toitureGeom(), R = G.R, tan = Math.tan(G.pente * Math.PI / 180), top = state.levels.length - 1, base = v3.altitudes[top] + state.levels[top].height;
    const X = G.dir === "x", c = X ? p.y : p.x, a = X ? p.x : p.y, c0 = X ? R.y0 : R.x0, c1 = X ? R.y1 : R.x1, a0 = X ? R.x0 : R.y0, a1 = X ? R.x1 : R.y1;
    const dd = G.forme === "deuxpans" ? Math.min(c - c0, c1 - c) : G.forme === "quatrepans" ? Math.min(c - c0, c1 - c, a - a0, a1 - a) : G.forme === "mono" ? c1 - c : 0;
    return base + (G.forme === "plat" ? 0 : tan * dd) + V3_TOIT_EP; };
  /* le dessus de la toiture mesuré en une grille de points de son contour */
  window.__toitGrille = () => { const G = toitureGeom(), P = G.toitPoly, pts = [];
    for (let i = 1; i < 9; i++) for (let j = 1; j < 9; j++) { const q = v(G.ox0 + (G.ox1 - G.ox0) * i / 9, G.oy0 + (G.oy1 - G.oy0) * j / 9); if (pointIn(q, P) && P.every((a, k) => distSeg(q, a, P[(k + 1) % P.length]) > 0.05)) pts.push(q); }
    const faux = pts.filter((q) => { const h = v3Viser([q.x, 80, q.y], [0, -1, 0]); return !h || h.kind !== "toit" || Math.abs(h.p[1] - __toitZ(q)) > 0.004; }).map((q) => { const h = v3Viser([q.x, 80, q.y], [0, -1, 0]); return (h ? h.kind + " " + h.p[1].toFixed(3) : "rien") + " pour " + __toitZ(q).toFixed(3); });
    return { n: pts.length, faux }; };
  /* le pignon : un rayon horizontal, du dehors, à 40 cm au-dessus du haut des murs, vers le milieu d'une arête du contour au
     débord qui regarde vers `g` (le côté haut d'un pan unique, le bout d'un toit à deux pans) : il bute sur le mur monté
     sous le pan, à la face du mur */
  window.__pignon = (cote) => { const G = toitureGeom(), R = G.R, top = state.levels.length - 1, base = v3.altitudes[top] + state.levels[top].height, X = G.dir === "x";
    const lim = { x0: R.x0, x1: R.x1, y0: R.y0, y1: R.y1 }[cote], axeX = cote[0] === "x", sgn = cote[1] === "0" ? -1 : 1;
    const ar = (G.R.poly || []).map((a, k, P) => [a, P[(k + 1) % P.length]]).filter(([a, b]) => axeX ? Math.abs(a.x - lim) < 1e-3 && Math.abs(b.x - lim) < 1e-3 : Math.abs(a.y - lim) < 1e-3 && Math.abs(b.y - lim) < 1e-3).sort((A, B) => dist(B[0], B[1]) - dist(A[0], A[1]))[0];
    if (!ar) return { ok: false, pourquoi: "pas d'arête" }; const m = v((ar[0].x + ar[1].x) / 2, (ar[0].y + ar[1].y) / 2), O = axeX ? [m.x + sgn * 3, base + 0.4, m.y] : [m.x, base + 0.4, m.y + sgn * 3];
    const h = v3Viser(O, axeX ? [-sgn, 0, 0] : [0, 0, -sgn]); return { ok: !!h && h.kind === "toit" && Math.abs(h.d - 3) < 0.02, d: h && h.d, kind: h && h.kind }; };
}

/* ═════════ 0. Le source ═════════ */
{ const m = SRC.match(/const V3_THREE='([^']+)'/), fic = SRC.match(/const V3_FICHIERS=\[(.*?)\];/);
  t["source · Three.js épinglé (version exacte) sur jsDelivr /npm/, autorisé par la CSP de l'artefact"] = !!m && /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@\d+\.\d+\.\d+\/$/.test(m[1]) && !!fic && /build\/three\.min\.js/.test(fic[1]) && /OrbitControls\.js/.test(fic[1]);
  const a = SRC.indexOf("═══ D71 · LA VUE 3D"), z = SRC.indexOf("const planCharge=load();"), mod = a > 0 && z > a ? SRC.slice(a, z) : "";
  t["source · le module 3D est là, avant le démarrage de la page"] = mod.length > 5000;
  const ecrit = mod.match(/\bstate(\.[\w$]+|\[[^\]]+\])+\s*=(?!=)|\bstate\s*=(?!=)|history\.push|\bsave\(|afterChange\(|\bcommit\(|syncRooms\(|pairRoomFaces\([^)]*true/g);
  t[`source · le module 3D n'écrit jamais l'état du plan (ni affectation, ni historique, ni enregistrement)${ecrit ? " — " + ecrit.join(", ") : ""}`] = !ecrit;
  t["source · aucune balise <script src> ajoutée à la page (Three.js n'est demandé qu'à l'ouverture)"] = !/<script[^>]+src=/i.test(SRC);
}

/* ═════════ 1. La page 2D ne demande rien au CDN ; hors ligne, un message et la 2D intacte ═════════ */
{ const req = [];
  const p = await onglet({ bloquerCDN: true, requetes: req });
  const avant = await p.evaluate(() => { closeModal(); loadSample(); closeModal(); setMode("projet"); closeModal(); render(); return { three: typeof window.THREE, scripts: document.scripts.length, json: JSON.stringify(state), emp: empreinte(state) }; });
  await wait(300);
  const hors = req.filter((u) => !/^(file|data|blob):/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  t[`chargement · la page 2D (et l'exemple) ne fait aucune requête réseau hors les polices${hors.length ? " — " + hors.slice(0, 3).join(", ") : ""}`] = !hors.length && !req.some((u) => CDN.test(u));
  t["chargement · Three.js n'est pas chargé tant que la 3D n'est pas ouverte"] = avant.three === "undefined";
  await p.click("#v3Btn"); const etat = await attendre3D(p);
  const r = await p.evaluate(() => { const m = document.getElementById("v3Msg"), B = [...m.querySelectorAll("button")].map((x) => x.textContent.trim());
    return { etat: v3.etat, vis: !m.hidden && m.getClientRects().length > 0, txt: m.innerText, B, on: document.body.classList.contains("v3on"), alerte: !!m.querySelector("[role=alert]") }; });
  t["hors ligne · un message clair (« la 3D n'a pas pu se charger… connexion internet… ton plan n'a pas bougé »), en alerte"] = etat === "reseau" && r.vis && r.alerte && /n'a pas pu se charger/.test(r.txt) && /internet/.test(r.txt) && /plan n'a pas bougé/.test(r.txt);
  t["hors ligne · « Réessayer » et « Retour au plan »"] = JSON.stringify(r.B) === JSON.stringify(["Réessayer", "Retour au plan"]);
  t["hors ligne · le CDN a bien été demandé à l'ouverture (et seulement alors)"] = req.some((u) => /cdn\.jsdelivr\.net\/npm\/three@/.test(u));
  /* D74 : sans scène, la barre reste en place mais éteinte (grisée, hors du clavier), sauf « Retour au plan » ; la barre d'état se tait */
  { const b2 = await p.evaluate(() => { const B = [...document.querySelectorAll("#v3Barre button")], R = document.getElementById("v3Retour"); return { data: document.getElementById("v3").dataset.etat, eteints: B.filter((x) => x !== R).every((x) => x.getAttribute("aria-disabled") === "true" && x.tabIndex === -1), retour: !R.hasAttribute("aria-disabled") && getComputedStyle(R).pointerEvents !== "none", gris: [...document.querySelectorAll("#v3Barre .v3grp")].every((g) => +getComputedStyle(g).opacity < 0.5 && getComputedStyle(g).pointerEvents === "none"), aide: document.getElementById("v3Aide").innerText.trim() }; });
    t[`hors ligne (D74) · la barre de la 3D est éteinte (data-etat=${b2.data}) sauf « Retour au plan » ; la barre d'état ne dit pas de geste`] = b2.data === "reseau" && b2.eteints && b2.retour && b2.gris && b2.aide === ""; }
  await p.click("#v3Msg button.primary"); await wait(400);
  t["hors ligne · « Réessayer » redemande, et redit le message"] = await p.evaluate(() => v3.etat === "reseau" && !document.getElementById("v3Msg").hidden);
  await p.keyboard.press("Escape"); await wait(150);
  const apres = await p.evaluate(() => ({ on: document.body.classList.contains("v3on"), v3: document.getElementById("v3").hidden, json: JSON.stringify(state), emp: empreinte(state), cv: getComputedStyle(cv).display !== "none" }));
  t["hors ligne · Échap rend le plan, intact (état complet et empreinte identiques)"] = !apres.on && apres.v3 && apres.json === avant.json && apres.emp === avant.emp && apres.cv;
  await p.close();
}

/* ═════════ 2. La rénovation (l'exemple) : ouvrir, phases, géométrie, état ═════════ */
let reseau = true;
{ const p = await onglet();
  await p.evaluate(MESURES);
  const avant = await p.evaluate(() => { closeModal(); loadSample(); closeModal(); setMode("projet"); closeModal(); render();
    const lv = L(); const w = lv.walls.find((x) => !isVirtual(x)); sel = { kind: "wall", id: w.id }; render();
    return { json: JSON.stringify(state), emp: empreinte(state), selId: w.id, ordre: [document.querySelector(".top"), document.getElementById("tools"), cv].every((e, i, A) => !i || (A[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
  const bt = await p.evaluate(() => { const b = document.getElementById("v3Btn"); return b && { txt: b.textContent, label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed"), dansNiveaux: !!b.closest("#levels"), h: Math.round(b.getBoundingClientRect().height), tip: b.dataset.tip }; });
  t["bouton · « 3D » à côté des niveaux (groupe #levels), nommé « Vue 3D », 28 px comme eux, non enfoncé"] = !!bt && bt.txt === "3D" && bt.label === "Vue 3D" && bt.pressed === "false" && bt.dansNiveaux && bt.h === 28;
  t["bouton · sa bulle dit ce qu'elle fait et sa touche (3)"] = !!bt && /Vue 3D/.test(bt.tip) && /touche 3/.test(bt.tip);
  await p.click("#v3Btn"); const etat = await attendre3D(p);
  if (etat !== "pret") { reseau = false; console.log(`  AVERTISSEMENT · la 3D n'a pas pu charger Three.js (${etat}) : pas de réseau ? les contrôles de géométrie ne sont pas joués.`); }
  if (reseau) {
    Object.assign(t, await p.evaluate(() => { const r = {}, E = v3Etat(), lv = L();
      r["ouverture · la 3D couvre la zone du plan ; colonne d'outils et barre du haut restent ; D74 : le panneau de droite (qui décrivait le niveau de la 2D) se replie, sans toucher la préférence gardée"] = !document.getElementById("v3").hidden && document.getElementById("stage").contains(document.getElementById("v3")) && getComputedStyle(document.getElementById("v3")).position === "absolute" && document.getElementById("tools").getClientRects().length > 0 && !document.getElementById("panel").getClientRects().length && document.querySelector(".body").classList.contains("panelPlie") && localStorage.getItem("avyora-plan-plie") === null;
      r["ouverture · le bouton dit « Retour au plan », enfoncé ; niveaux et vues de la 2D masqués pendant la 3D"] = document.getElementById("v3Btn").getAttribute("aria-pressed") === "true" && /Retour au plan/.test(document.getElementById("v3Btn").dataset.tip) && !document.querySelector("#modes button")?.getClientRects().length;
      r["rénovation · « Après travaux » par défaut, même quand la 2D est en vue Travaux"] = E.vue === "final" && mode() === "projet";
      const B = [...document.querySelectorAll("#v3Barre button")].map((x) => x.getAttribute("aria-label") || x.textContent.trim());
      /* D73 : la barre de T3 — Maquette / Visite, Recentrer et Plein écran s'y ajoutent ; la liste reste exacte, dans l'ordre */
      r[`rénovation · la barre : Retour au plan, Vue aérienne / Visite, Avant travaux / Après travaux (LEX), la coupe, Recentrer, Plein écran — pas de niveaux pour un plan d'un niveau (${B.join(" · ")})`] = JSON.stringify(B) === JSON.stringify(["Retour au plan", "Vue aérienne", "Visite", LEX.vue.existant, LEX.vue.final, "Recentrer la vue", "Plein écran"]) && !!document.getElementById("v3Coupe");
      const murs = lv.walls.filter((w) => !isVirtual(w) && wallDrawn(w, "final")), trous = lv.openings.filter((o) => opDrawn(o, "final") && murs.some((w) => w.id === o.wallId)), faces = facesFor(lv, "final").filter((f) => f.room);
      r[`construction · un corps par mur (${E.murs.length}/${murs.length}), un trou par ouverture (${E.trous.length}/${trous.length}), un sol par pièce (${E.sols.length}/${faces.length})`] = E.murs.length === murs.length && E.trous.length === trous.length && E.sols.length === faces.length;
      r["construction · les sols portent le revêtement de la vue (parquet en bois, carrelage en dalles)"] = E.sols.some((s) => s.genre === "bois") && E.sols.some((s) => s.genre === "carrelage");
      return r; }));
    /* les murs entiers : hauteur des murs = hauteur du niveau ; puis la coupe */
    Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), H = lv.height; v3ChoisirCoupe(H); v3Rafraichir();
      const M = lv.walls.filter((w) => !isVirtual(w) && wallDrawn(w, "final")).map((w) => ({ w, h: __hautMur(lv, 0, w, "final") })).filter((x) => x.h);
      const faux = M.filter((x) => x.h.y == null || Math.abs(x.h.y - H) > 0.002 || x.h.kind !== "mur");
      r[`hauteur · murs entiers : chaque mur monte à la hauteur du niveau (${fmt(H, 2)} m, ${M.length} murs mesurés)${faux.length ? " — " + faux.map((x) => x.w.type + " " + x.h.y).join(", ") : ""}`] = M.length >= 8 && !faux.length;
      v3ChoisirCoupe(1.2); v3Rafraichir();
      const C = lv.walls.filter((w) => !isVirtual(w) && wallDrawn(w, "final")).map((w) => ({ w, h: __hautMur(lv, 0, w, "final") })).filter((x) => x.h);
      const fc = C.filter((x) => x.h.y == null || Math.abs(x.h.y - 1.2) > 0.002 || !/Coupe$/.test(x.h.cle));
      r[`hauteur · coupe à 1,20 m : chaque mur s'arrête à la coupe, son dessus à l'encre de la coupe${fc.length ? " — " + fc.map((x) => x.w.type + " " + x.h.y + " " + x.h.cle).join(", ") : ""}`] = C.length >= 8 && !fc.length;
      v3ChoisirCoupe(H); v3Rafraichir();
      const T = lv.openings.filter((o) => opDrawn(o, "final")).map((o) => __trou(lv, 0, o, "final")), ko = T.filter((x) => x.ko.length);
      r[`ouvertures · chaque ouverture est un trou de sa largeur et de sa hauteur, allège et linteau pleins (${T.length} mesurées)${ko.length ? " — " + ko.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = T.length >= 8 && !ko.length;
      v3ChoisirCoupe(1.2); v3Rafraichir();
      const fen = lv.openings.find((o) => o.type === "fenetre" && !o.st), x = __trou(lv, 0, fen, "final");
      r["coupe · à 1,20 m, une fenêtre (allège 0,90 m) n'a plus de linteau, mais garde son allège et son trou jusqu'à la coupe"] = x.vu && !x.ko.length && v3Viser([0, 2.2, 0], [1, 0, 0]) === null;
      const faces = facesFor(lv, "final").filter((f) => f.room), S = faces.map((f) => { const h = v3Viser([f.label.x, 30, f.label.y], [0, -1, 0], __SOL), s = v3Etat().sols.find((q) => q.roomId === f.room.id);
        return { ok: !!h && h.kind === "sol" && h.roomId === f.room.id && Math.abs(h.p[1] - 0.003) < 0.002 && !!s && (f.hasHole || Math.abs(s.aire - f.areaInt) <= 0.02 + 0.01 * f.areaInt), nom: roomName(f.room), aire: s && s.aire, ai: f.areaInt }; });
      const fs = S.filter((s) => !s.ok);
      r[`sols · un sol par pièce, sous son repère, au niveau du plancher, de l'aire de la pièce${fs.length ? " — " + fs.map((s) => s.nom + " " + s.aire + "/" + s.ai).join(", ") : ""}`] = S.length >= 5 && !fs.length;
      return r; }));
    /* les phases : le mur démoli et la fenêtre créée */
    Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), dem = lv.walls.find((w) => w.st === "demolir"), cre = lv.openings.find((o) => o.st === "creer");
      v3ChoisirCoupe(lv.height); v3Rafraichir();
      const apres = { mur: v3Etat().murs.some((m) => m.id === dem.id), trou: v3Etat().trous.some((x) => x.id === cre.id), mesure: __trou(lv, 0, cre, "final") };
      v3ChoisirVue("existant"); v3Rafraichir();
      const w = lv.walls.find((x) => x.id === cre.wallId), u = norm(sub(w.b, w.a)), n = perp(u), c = add(add(w.a, mul(sub(w.b, w.a), cre.t)), wallOff(w)), O = add(c, mul(n, wallT(w) / 2 + 0.35)), z = (allegeOf(cre) || 0) + 0.3;
      const h = v3Viser([O.x, z, O.y], [-n.x, 0, -n.y], ["mur", "doublage"]);
      const avant = { mur: v3Etat().murs.some((m) => m.id === dem.id), trou: v3Etat().trous.some((x) => x.id === cre.id), plein: !!h && h.d <= 0.351, vue: v3.vue, btn: document.querySelector('#v3Barre [aria-label="Moment montré"] button[aria-pressed=true]')?.textContent }; /* D73 : le groupe des vues (Maquette / Visite a aussi son bouton enfoncé) */
      r["phases · Après travaux : le mur démoli n'est plus là, la fenêtre créée est percée (rayon)"] = !!dem && !!cre && !apres.mur && apres.trou && apres.mesure.vu && !apres.mesure.ko.length;
      r["phases · Avant travaux : le mur démoli est debout, le mur de la fenêtre à créer est plein (rayon)"] = avant.mur && !avant.trou && avant.plein && avant.vue === "existant" && avant.btn === LEX.vue.existant;
      v3ChoisirVue("final"); v3Rafraichir(); return r; }));
    /* D72 · les menuiseries et les équipements de l'exemple, murs entiers puis coupés ; les phases */
    Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), H = lv.height; v3ChoisirVue("final"); v3ChoisirCoupe(H); v3Rafraichir(); const E = v3Etat();
      const ops = lv.openings.filter((o) => opDrawn(o, "final") && OPENINGS[o.type].kind !== "gap" && lv.walls.some((w) => w.id === o.wallId && wallDrawn(w, "final")));
      r[`menuiseries · une menuiserie par ouverture percée, hors passages (${E.menuiseries.length}/${ops.length})`] = E.menuiseries.length === ops.length && ops.every((o) => E.menuiseries.some((m) => m.id === o.id));
      const M = ops.map((o) => __menuis(lv, 0, o)), mk = M.filter((x) => x.ko.length);
      r[`menuiseries · chaque fenêtre ferme son jour jusqu'aux bords, à sa pose ; chaque porte a son vantail ouvert du côté où elle s'ouvre, à sa hauteur (${M.length} mesurées)${mk.length ? " — " + mk.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = M.length >= 8 && !mk.length;
      const its = lv.items.filter((it) => itemDrawn(it, "final"));
      r[`équipements · un volume par équipement montré, points électriques compris (${E.equipements.length}/${its.length})`] = E.equipements.length === its.length && its.every((it) => E.equipements.some((q) => q.id === it.id));
      const Q = its.map((it) => __equip(lv, 0, it)), qk = Q.filter((x) => x.ko.length);
      r[`équipements · chacun à sa place, à sa largeur, à sa hauteur courante (table 0,75, plan 0,90, lit, canapé, baignoire, WC…) ; les prises à 25 cm, les interrupteurs à 1,06 m (${Q.length})${qk.length ? " — " + qk.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = Q.length >= 20 && !qk.length && Q.filter((x) => x.hz != null).length >= 9;
      v3ChoisirCoupe(1.2); v3Rafraichir();
      const arm = lv.items.find((x) => x.type === "armoire"), fr = lv.items.find((x) => x.type === "frigo"), A = __equip(lv, 0, arm), F = __equip(lv, 0, fr);
      r["coupe · l'armoire (2,00 m) et le réfrigérateur (1,80 m) sont tranchés à la coupe, comme les murs ; rien au-dessus"] = !A.ko.length && !F.ko.length && Math.abs(A.hz - (1.2 - 0.003)) < 0.002 && Math.abs(F.hz - (1.2 - 0.003)) < 0.002 && v3Viser([0, 2.2, 0], [1, 0, 0]) === null;
      const ll = lv.items.find((x) => x.type === "lave_linge" && x.st === "demolir"), apres = v3Etat().equipements.some((q) => q.id === ll.id);
      v3ChoisirVue("existant"); v3Rafraichir(); const avant = v3Etat().equipements.some((q) => q.id === ll.id), Ll = __equip(lv, 0, ll);
      r["phases · le lave-linge à déposer est là avant travaux (à sa place), plus après"] = !!ll && !apres && avant && !Ll.ko.length;
      v3ChoisirVue("final"); v3Rafraichir(); return r; }));
    /* la caméra au clavier, la capture */
    await p.evaluate(() => { v3ChoisirCoupe(1.2); v3Rafraichir(); });
    await p.focus("canvas.v3cv"); for (const k of ["ArrowLeft", "ArrowLeft", "ArrowUp", "-", "+"]) await p.keyboard.press(k); await wait(300);
    const px = await p.evaluate(() => v3Pixels());
    t[`rendu · capture WebGL ni noire ni vide (moyenne ${px && Math.round(px.moyenne)}, fond ${px && Math.round(px.fond * 100)} %, encre de coupe ${px && (px.encre * 100).toFixed(1)} %)`] = !!px && px.noirs < 0.01 && px.moyenne > 80 && px.fond < 0.95 && px.encre > 0.002;
    await p.screenshot({ path: "/tmp/vue3d-renovation.png" });
    /* Suppr en 3D ne touche pas le plan caché ; Échap ferme */
    await p.keyboard.press("Delete"); await wait(100);
    t["clavier · en 3D, Suppr ne supprime pas l'élément choisi du plan caché"] = await p.evaluate((id) => L().walls.some((w) => w.id === id) && v3.ouvert, avant.selId);
    await p.keyboard.press("Escape"); await wait(150);
    const ap = await p.evaluate(() => ({ on: document.body.classList.contains("v3on"), v3: document.getElementById("v3").hidden, json: JSON.stringify(state), emp: empreinte(state), pressed: document.getElementById("v3Btn").getAttribute("aria-pressed"), modes: !!document.querySelector("#modes button")?.getClientRects().length, panneau: document.getElementById("panel").getClientRects().length > 0 && !document.querySelector(".body").classList.contains("panelPlie"), pref: localStorage.getItem("avyora-plan-plie"), toast: document.getElementById("toast").classList.contains("show") && /Plan au clavier/.test(document.getElementById("toast").textContent) }));
    t["fermeture · Échap rend le plan : bouton relâché, vues de la 2D revenues ; D74 : le panneau rouvert, la préférence intacte, et pas de message « Plan au clavier »"] = !ap.on && ap.v3 && ap.pressed === "false" && ap.modes && ap.panneau && ap.pref === null && !ap.toast;
    t["état · le plan est identique avant et après la 3D (JSON complet et empreinte), après niveau, vues, coupe et caméra"] = ap.json === avant.json && ap.emp === avant.emp;
    t["DOM · l'ordre .top → #tools → canvas tient ; la 3D vient après le canvas"] = avant.ordre && await p.evaluate(() => !!(cv.compareDocumentPosition(document.getElementById("v3")) & Node.DOCUMENT_POSITION_FOLLOWING));
    /* la touche 3, « Retour au plan », un outil choisi */
    await p.evaluate(() => { cv.focus(); }); await p.keyboard.press("3"); await attendre3D(p);
    t["clavier · la touche 3 ouvre la 3D"] = await p.evaluate(() => v3.ouvert && !document.getElementById("v3").hidden);
    await p.keyboard.press("3"); await wait(150);
    t["clavier · la touche 3 la referme"] = await p.evaluate(() => !v3.ouvert);
    await p.evaluate(() => v3Ouvrir()); await attendre3D(p);
    await p.click("#v3Barre button:first-child"); await wait(150);
    t["« Retour au plan » ferme la 3D"] = await p.evaluate(() => !v3.ouvert && document.getElementById("v3").hidden);
    await p.evaluate(() => v3Ouvrir()); await attendre3D(p);
    await p.click('#tools .tb[aria-label="Murs"]'); await wait(150);
    t["un outil choisi dans la colonne ferme la 3D et prend l'outil"] = await p.evaluate(() => !v3.ouvert && tool === "mur");
    await p.evaluate(() => { setTool("select"); setRaccourcis(false); closeModal(); }); await wait(200);
    await p.evaluate(() => { const t2 = document.getElementById("toast"); if (t2) t2.classList.remove("show"); cv.focus(); }); await p.keyboard.press("3"); await wait(200);
    t["clavier · raccourcis d'une touche coupés : la touche 3 n'ouvre rien (le bouton reste)"] = await p.evaluate(() => !v3.ouvert && !document.getElementById("v3Btn").hasAttribute("aria-keyshortcuts"));
    await p.evaluate(() => setRaccourcis(true));
    /* reconstruire seulement quand le plan change : un rendu sans changement, un changement, Ctrl Z */
    await p.evaluate(() => { v3Ouvrir(); }); await attendre3D(p);
    Object.assign(t, await p.evaluate(() => { const r = {}; let n = 0; const o = window.v3Construire; window.v3Construire = function () { n++; return o.apply(this, arguments); };
      render(); render(); const sans = n;
      setLevelProp("height", "2.8"); const apres = n, lv = L(), w = lv.walls.find((x) => !isVirtual(x) && wallDrawn(x, "final")); v3ChoisirCoupe(2.8); v3Rafraichir(); const h = __hautMur(lv, 0, w, "final");
      window.__n = () => n; window.__w = w.id;
      r["reconstruction · un rendu sans changement du plan ne reconstruit rien"] = sans === 0;
      r["reconstruction · le plan change (hauteur du niveau 2,80 m) : la 3D suit, les murs montent à 2,80 m"] = apres === 1 && !!h && Math.abs(h.y - 2.8) < 0.002;
      return r; }));
    await p.focus("canvas.v3cv"); await p.keyboard.down("Control"); await p.keyboard.press("z"); await p.keyboard.up("Control"); await wait(200);
    t["robustesse · une erreur de construction ne casse pas la 2D : un message, render() passe, la 3D revient au rendu suivant"] = await p.evaluate(() => { const o = window.v3Extruder; let ok2d = true;
      window.v3Extruder = () => { throw new Error("essai"); }; v3.sig = ""; try { render(); } catch (e) { ok2d = false; } const m = v3.etat === "erreur" && !document.getElementById("v3Msg").hidden && /pas pu se construire/.test(document.getElementById("v3Msg").innerText);
      window.v3Extruder = o; v3.sig = ""; render(); return ok2d && m && v3.etat === "" && document.getElementById("v3Msg").hidden && v3Etat().murs.length > 0; });
    t["reconstruction · Ctrl Z en 3D annule le changement du plan, et la 3D le montre (2,50 m)"] = await p.evaluate(() => { const lv = L(), w = lv.walls.find((x) => x.id === window.__w); v3Rafraichir(); const h = __hautMur(lv, 0, w, "final"); return v3.ouvert && lv.height === 2.5 && !!h && Math.abs(h.y - Math.min(v3.coupe, 2.5)) < 0.002 && window.__n() >= 2; });
    await p.evaluate(() => v3Fermer());
  }
  await p.close();
}

/* ═════════ 3. Le Plan final : la maison de 120 m² sur deux niveaux ═════════ */
if (reseau) {
  const p = await onglet();
  await p.evaluate(MESURES);
  const avant = await p.evaluate((S) => { (0, eval)("(" + S + ")")(); closeModal(); sel = null; render(); return { json: JSON.stringify(state), emp: empreinte(state), cur: state.cur }; }, SCENE_PF);
  await p.evaluate(() => cv.focus()); await p.keyboard.press("3"); await attendre3D(p);
  Object.assign(t, await p.evaluate(() => { const r = {}, E = v3Etat();
    const B = [...document.querySelectorAll("#v3Barre button")].map((x) => x.getAttribute("aria-label") || x.textContent.trim());
    r[`Plan final · la vue est le plan tel quel ; la barre : Retour au plan, Vue aérienne / Visite, les niveaux, la coupe, Recentrer, Plein écran — ni avant ni après (${B.join(" · ")})`] = E.vue === "existant" && JSON.stringify(B) === JSON.stringify(["Retour au plan", "Vue aérienne", "Visite", "RDC", "Étage", "Recentrer la vue", "Plein écran"]) && !!document.getElementById("v3Coupe");
    const lire = () => { const el = document.getElementById("v3"); return [el.innerText, ...[...el.querySelectorAll("[data-tip],[title],[aria-label]")].flatMap((x) => ["data-tip", "title", "aria-label"].map((a) => x.getAttribute(a)).filter(Boolean)), document.getElementById("v3Btn").dataset.tip, document.getElementById("v3Btn").getAttribute("aria-label")].join("\n"); };
    const txt = lire(), mots = [/travaux/i, /(?<!\p{L})existant/iu, /toiture/i, /chantier/i, /budget/i, /démoli/i, /à créer/i, /avant/i, /après/i].filter((re) => re.test(txt));
    r[`Plan final · aucun mot du chantier dans la 3D${mots.length ? " — " + mots.join(" ") : ""}`] = !mots.length;
    r["niveaux · la 3D s'ouvre sur le niveau de la 2D ; les niveaux du dessus sont cachés"] = E.niveau === state.cur && v3.groupe.children.every((g) => g.userData.niveau <= E.niveau) && v3.groupe.children.length === 1;
    const t0 = performance.now(); for (let k = 0; k < 5; k++) { v3.sig = ""; v3Rafraichir(); } const ms = (performance.now() - t0) / 5;
    const F = v3Etat();
    r[`coût · une construction de la maison de 120 m² : ${ms.toFixed(1)} ms, ${F.maillages} maillages, ${Math.round(F.triangles)} triangles (≤ 120 ms, ≤ 60, ≤ 20 000)`] = ms <= 120 && F.maillages <= 60 && F.triangles <= 20000;
    window.__ms = ms; return r; }));
  Object.assign(t, await p.evaluate(() => { const r = {}, lv0 = state.levels[0], lv1 = state.levels[1];
    v3ChoisirNiveau(1); v3Rafraichir(); const E = v3Etat(), Y1 = lv0.height + V3_PLANCHER;
    r["niveaux · « Étage » : le RDC dessous, l'étage dessus ; le niveau de la 2D n'a pas bougé"] = E.niveau === 1 && v3.groupe.children.length === 2 && state.cur === 0;
    r[`niveaux · l'étage est posé à la hauteur du RDC + le plancher (${fmt(Y1, 2)} m)`] = Math.abs(E.altitudes[1] - Y1) < 1e-9;
    const f1 = facesFor(lv1, "existant").find((f) => f.room), h = v3Viser([f1.label.x + 2.5, 30, f1.label.y - 2], [0, -1, 0], __SOL);
    r["niveaux · le sol de l'étage est à sa hauteur (rayon)"] = !!h && h.kind === "sol" && h.niveau === 1 && Math.abs(h.p[1] - (Y1 + 0.012)) < 0.002;
    const esc2 = lv0.items.find((i) => i.type === "escalier"), ht = v3Viser([esc2.x, 30, esc2.y], [0, -1, 0], __SOL);
    r["niveaux · la trémie de l'escalier est ouverte dans le plancher de l'étage (le rayon descend au RDC)"] = !!ht && ht.kind === "sol" && ht.niveau === 0 && E.sols.some((s) => s.niveau === 1 && s.trous >= 1);
    const bas = E.murs.filter((m) => m.niveau === 0), haut = E.murs.filter((m) => m.niveau === 1);
    r["niveaux · les murs du RDC montent jusqu'au plancher de l'étage (2 cm de joint), ceux de l'étage en descendent d'autant : la façade est continue ; ceux de l'étage sont coupés"] = bas.length && bas.every((m) => Math.abs(m.haut - (Y1 - V3_JOINT)) < 1e-9 && m.bas === 0 && m.coupe == null) && haut.length === 4 && haut.every((m) => m.bas === -V3_JOINT && Math.abs(m.coupe - Math.min(v3.coupe, lv1.height)) < 1e-9);
    const M = lv1.walls.map((w) => __hautMur(lv1, 1, w, "existant")).filter(Boolean), fm = M.filter((x) => x.y == null || Math.abs(x.y - Math.min(v3.coupe, lv1.height)) > 0.002);
    r[`niveaux · les murs de l'étage s'arrêtent à la coupe (rayon, ${M.length} murs)${fm.length ? " — " + fm.map((x) => x.y).join(", ") : ""}`] = M.length === 4 && !fm.length;
    v3ChoisirNiveau(0); v3ChoisirCoupe(lv0.height); v3Rafraichir();
    const T = lv0.openings.map((o) => __trou(lv0, 0, o, "existant")), ko = T.filter((x) => x.ko.length);
    r[`Plan final · ${T.length} ouvertures : chacune un trou juste (refend de 60 cm, cloisons, baie, porte de garage…)${ko.length ? " — " + ko.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = T.length === 14 && !ko.length;
    const dbl = lv0.openings.find((o) => o.type === "baie"), xb = __trou(lv0, 0, dbl, "existant");
    r["doublage · la baie du mur doublé perce le mur ET son doublage"] = xb.vu && !xb.ko.length && v3Etat().doublages >= 1;
    return r; }));
  /* D72 · la maison de 120 m² : menuiseries, équipements, escalier, poteau, poutre */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv0 = state.levels[0], H = lv0.height; v3ChoisirNiveau(0); v3ChoisirCoupe(H); v3Rafraichir(); const E = v3Etat();
    const M = lv0.openings.filter((o) => OPENINGS[o.type].kind !== "gap").map((o) => __menuis(lv0, 0, o)), mk = M.filter((x) => x.ko.length);
    r[`Plan final · ${M.length} menuiseries : baie, porte-fenêtre, fenêtres, porte d'entrée, portes simples et double, coulissante — chacune juste${mk.length ? " — " + mk.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = M.length === 13 && E.menuiseries.length === 13 && !mk.length;
    const Q = lv0.items.map((it) => __equip(lv0, 0, it)), qk = Q.filter((x) => x.ko.length);
    r[`Plan final · ${Q.length} équipements, chacun à sa place, à sa largeur, à sa hauteur${qk.length ? " — " + qk.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = Q.length === lv0.items.length && E.equipements.length === lv0.items.length && !qk.length;
    const esc = lv0.items.find((i) => i.type === "escalier"), S = __escalier(lv0, 0, esc), R0 = E.escaliers.find((x) => x.id === esc.id);
    /* murs entiers, le niveau montré s'arrête à son plafond (2,50 m) : les marches dans l'épaisseur du plancher n'y sont pas — vues de l'étage, si */
    const sousPlafond = Array.from({ length: S.n }, (_, j) => (j + 1) * S.hm).filter((z) => z <= H - 0.003 - 0.05).length;
    r[`escalier · ${S.n} marches réelles, une par une (rayons), chacune ${(S.hm * 100).toFixed(1)} cm plus haute, du sol au plafond du niveau (${S.vues} sous les 2,50 m)${S.ko.length ? " — " + S.ko.slice(0, 4).join(" | ") : ""}`] = S.n >= 12 && S.vues === sousPlafond && sousPlafond >= S.n - 2 && !S.ko.length && !!R0 && R0.marches === S.n && Math.abs(S.hm - (E.altitudes[1] + 0.012 - 0.003) / (S.n + 1)) < 1e-9 && S.hm > 0.15 && S.hm < 0.19;
    const pot = lv0.items.find((i) => i.type === "poteau"), pou = lv0.items.find((i) => i.type === "poutre");
    const hp = v3Viser([pot.x, 30, pot.y], [0, -1, 0]), hu = v3Viser([pou.x, 30, pou.y], [0, -1, 0]), hb = v3Viser([pou.x, 0.5, pou.y], [0, 1, 0]);
    r["structure · le poteau monte du sol au plafond ; la poutre est sous le plafond, sa retombée de 20 à 40 cm (rayons)"] = !!hp && hp.kind === "structure" && Math.abs(hp.p[1] - H) < 0.002 && !!hu && hu.kind === "structure" && Math.abs(hu.p[1] - H) < 0.002 && !!hb && hb.kind === "structure" && hb.p[1] > H - 0.4 - 1e-3 && hb.p[1] < H - 0.2 + 1e-3;
    v3ChoisirCoupe(1.2); v3Rafraichir(); const Sc = __escalier(lv0, 0, esc), hp2 = v3Viser([pot.x, 30, pot.y], [0, -1, 0]), hu2 = v3Viser([pou.x, 30, pou.y], [0, -1, 0], ["structure"]);
    r["coupe · à 1,20 m, l'escalier n'a plus que ses marches du dessous, le poteau est tranché, la poutre (en hauteur) disparaît"] = !Sc.ko.length && Sc.vues >= 5 && Sc.vues < Sc.n && !!hp2 && Math.abs(hp2.p[1] - 1.2) < 0.002 && !hu2;
    v3ChoisirNiveau(1); v3Rafraichir(); const Se = __escalier(lv0, 0, esc);
    r[`escalier · vu de l'étage, le RDC entier : toutes ses marches (${Se.vues}/${Se.n}) montent par la trémie, la dernière un cran sous le sol de l'étage`] = !Se.ko.length && Se.vues === Se.n && Math.abs(Se.n * Se.hm + Se.hm - Se.mt) < 1e-9;
    v3ChoisirNiveau(0); return r; }));
  const px = await p.evaluate(() => { v3ChoisirCoupe(1.2); v3Rafraichir(); v3Cadrer(); return v3Pixels(); });
  t[`Plan final · capture WebGL ni noire ni vide (moyenne ${px && Math.round(px.moyenne)}, encre ${px && (px.encre * 100).toFixed(1)} %)`] = !!px && px.noirs < 0.01 && px.moyenne > 80 && px.fond < 0.95 && px.encre > 0.002;
  await p.keyboard.press("Escape"); await wait(150);
  const ap = await p.evaluate(() => ({ json: JSON.stringify(state), emp: empreinte(state), cur: state.cur, ouvert: v3.ouvert }));
  t["Plan final · le plan est identique avant et après la 3D (niveaux changés en 3D, pas en 2D)"] = !ap.ouvert && ap.json === avant.json && ap.emp === avant.emp && ap.cur === avant.cur;
  await p.close();
}

/* ═════════ 4. Le plan réel (murs de pierre de 60 cm, doublages) ═════════ */
if (reseau) {
  const p = await onglet();
  await p.evaluate(MESURES);
  const avant = await p.evaluate((fix) => { closeModal(); state = fix; migrerEtat(state); state.levels.forEach(syncRooms); sel = null; render(); return { json: JSON.stringify(state), emp: empreinte(state) }; }, FIX);
  await p.click("#v3Btn"); await attendre3D(p);
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), H = lv.height; v3ChoisirCoupe(H); v3Rafraichir(); const E = v3Etat();
    const nb = facesFor(lv, "final").reduce((s, f) => s + (f.dbl || []).filter(Boolean).length, 0) + bandesITE(lv, "final").length;
    r[`plan réel · chaque bande de doublage est construite (${E.doublages}/${nb})`] = nb > 0 && E.doublages === nb;
    const T = lv.openings.filter((o) => opDrawn(o, "final")).map((o) => __trou(lv, 0, o, "final")), ko = T.filter((x) => x.ko.length);
    r[`plan réel · ${T.length} ouvertures dans la pierre doublée : chacune un trou juste (mur et doublage)${ko.length ? " — " + ko.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = T.length === lv.openings.filter((o) => opDrawn(o, "final")).length && T.length >= 6 && !ko.length;
    const M = lv.walls.map((w) => __hautMur(lv, 0, w, "final")).filter(Boolean), fm = M.filter((x) => x.y == null || Math.abs(x.y - H) > 0.002);
    r[`plan réel · les murs de pierre montent à ${fmt(H, 2)} m (${M.length} mesurés)`] = M.length >= 5 && !fm.length;
    /* D72 · ses menuiseries dans la pierre doublée, leur matière avant / après */
    const ops = lv.openings.filter((o) => opDrawn(o, "final") && OPENINGS[o.type].kind !== "gap"), Mn = ops.map((o) => __menuis(lv, 0, o)), mk = Mn.filter((x) => x.ko.length);
    r[`plan réel · ${Mn.length} menuiseries dans la pierre doublée (portes de garage fermées, porte d'entrée, petites fenêtres, porte-fenêtre) : chacune juste${mk.length ? " — " + mk.map((x) => x.type + " : " + x.ko.join(", ")).join(" | ") : ""}`] = Mn.length >= 5 && !mk.length && E.menuiseries.length === ops.length;
    const bois = ops.filter((o) => o.mat === "bois" && o.st === "remplacer"), matA = (id) => (v3Etat().menuiseries.find((m) => m.id === id) || {}).mat;
    const apres = bois.map((o) => matA(o.id)); v3ChoisirVue("existant"); v3Rafraichir(); const avant = bois.map((o) => matA(o.id)); v3ChoisirVue("final"); v3Rafraichir();
    r[`menuiseries · la matière : à remplacer en bois, elles sont en bois après travaux, et blanches (inconnue) avant (${bois.length})`] = bois.length >= 2 && apres.every((m) => m === "bois") && avant.every((m) => m === "blanc");
    return r; }));
  /* D72 · la toiture décrite (un pan) : l'interrupteur, la maison fermée, la hauteur du pan, le pignon du côté haut */
  Object.assign(t, await p.evaluate(() => { const r = {}; v3ChoisirCoupe(1.2); v3Rafraichir();
    const b = document.getElementById("v3Toit"), top = state.levels.length - 1, H = state.levels[top].height;
    r["toiture · une rénovation qui décrit sa toiture a l'interrupteur « Toiture », éteint par défaut ; rien de construit"] = !!b && b.getAttribute("aria-pressed") === "false" && !v3Etat().toit && v3.groupe.children.every((g) => g.userData.kind !== "toit");
    b.click(); const E = v3Etat(), b2 = document.getElementById("v3Toit");
    r["toiture · allumée : le dernier niveau, murs entiers, la toiture posée, de la forme décrite (un pan)"] = v3.toit && E.niveau === top && Math.abs(E.coupe - H) < 1e-9 && !!E.toit && E.toit.forme === "mono" && toiture().forme === "mono" && b2.getAttribute("aria-pressed") === "true" && /toiture/.test(v3.renderer.domElement.getAttribute("aria-label")) && document.getElementById("v3CoupeV").textContent === "murs entiers";
    const g = __toitGrille();
    r[`toiture · un pan : la couverture à la hauteur de son pan en chaque point du contour (${g.n} rayons, pente ${toitureGeom().pente}°)${g.faux.length ? " — " + g.faux.slice(0, 3).join(" | ") : ""}`] = g.n >= 15 && !g.faux.length;
    const G = toitureGeom(), pg = __pignon(G.dir === "x" ? "y0" : "x0");
    r[`toiture · le mur du côté haut monte jusque sous le pan (rayon à 40 cm au-dessus des murs : ${pg.kind} à ${pg.d && pg.d.toFixed(3)} m)`] = pg.ok;
    v3ChoisirCoupe(1.5); v3Rafraichir();
    r["toiture · couper les murs l'éteint : plus de toiture, l'interrupteur relâché"] = !v3.toit && !v3Etat().toit && document.getElementById("v3Toit").getAttribute("aria-pressed") === "false";
    return r; }));
  await p.keyboard.press("Escape"); await wait(150);
  t["plan réel · intact après la 3D"] = await p.evaluate((av) => JSON.stringify(state) === av.json && empreinte(state) === av.emp, avant);
  await p.close();
}

/* ═════════ 4 bis. D72 · La toiture à deux pans (débord), puis plate : la maison de 94 m² en rénovation ═════════ */
if (reseau) {
  const p = await onglet();
  await p.evaluate(MESURES);
  const avant = await p.evaluate(() => { closeModal(); loadTemplate("maison", WORKFLOW_RENO); closeModal(); state.toiture = toitureDefaults(); sel = null; render(); return { json: JSON.stringify(state), emp: empreinte(state), forme: toiture().forme, deb: toiture().debord }; });
  await p.click("#v3Btn"); await attendre3D(p);
  Object.assign(t, await p.evaluate(() => { const r = {}; document.getElementById("v3Toit").click(); const E = v3Etat(), G = toitureGeom();
    const g = __toitGrille();
    r[`toiture · deux pans, débord de ${Math.round(G.deb * 100)} cm : la couverture à la hauteur de son pan partout, faîtage au milieu (${g.n} rayons)${g.faux.length ? " — " + g.faux.slice(0, 3).join(" | ") : ""}`] = E.toit && E.toit.forme === "deuxpans" && E.toit.pans === 2 && g.n >= 30 && !g.faux.length;
    const a = __pignon(G.dir === "x" ? "x0" : "y0"), b = __pignon(G.dir === "x" ? "x1" : "y1");
    r[`toiture · deux pans : les deux pignons montent jusque sous la toiture (${a.kind} ${a.d && a.d.toFixed(3)} · ${b.kind} ${b.d && b.d.toFixed(3)})`] = a.ok && b.ok;
    const R = G.R, X = G.dir === "x", m = X ? v((R.x0 + R.x1) / 2, R.y0 - G.deb / 2) : v(R.x0 - G.deb / 2, (R.y0 + R.y1) / 2), base = v3.altitudes[0] + L().height, he = v3Viser([m.x, base - 0.3, m.y], [0, 1, 0]);
    r["toiture · l'avancée déborde des murs et descend sous le haut des murs (rayon vers le haut, sous l'égout)"] = !!he && he.kind === "toit" && he.p[1] < base && he.p[1] > base - 0.4;
    return r; }));
  Object.assign(t, await p.evaluate(() => { const r = {}; setToiture("forme", "plat"); const E = v3Etat(), g = __toitGrille();
    r[`toiture · plate (le plan change, la 3D suit) : une dalle au-dessus des murs, partout à la même hauteur (${g.n} rayons)${g.faux.length ? " — " + g.faux.slice(0, 3).join(" | ") : ""}`] = v3.toit && !!E.toit && E.toit.forme === "plat" && g.n >= 30 && !g.faux.length;
    undo(); const E2 = v3Etat(); r["toiture · Ctrl Z : les deux pans reviennent"] = !!E2.toit && E2.toit.forme === "deuxpans"; return r; }));
  await p.keyboard.press("Escape"); await wait(150);
  t["toiture · la maison est intacte après la 3D (état complet et empreinte)"] = await p.evaluate((av) => JSON.stringify(state) === av.json && empreinte(state) === av.emp && toiture().forme === av.forme, avant);
  await p.close();
}

/* ═════════ 5. D73 · Le téléphone : la maquette seulement, au doigt ═════════ */
{ const p = await onglet({ largeur: 390, hauteur: 844, pro: true, tactile: true });
  const r = await p.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); const b = document.getElementById("v3Btn"), q = b && b.getBoundingClientRect(); return { vis: !!b && b.getClientRects().length > 0, w: q && q.width, h: q && q.height, niv: !!b && !!b.closest("#levels") }; });
  t[`téléphone · le bouton 3D est là, à côté des niveaux, une cible de 40 px et plus (${r.w && Math.round(r.w)} × ${r.h && Math.round(r.h)})`] = r.vis && r.niv && r.w >= 40 && r.h >= 40;
  if (reseau) {
    await p.tap("#v3Btn"); await attendre3D(p);
    Object.assign(t, await p.evaluate(() => { const r = {}, v = document.getElementById("v3"), R = v.getBoundingClientRect(), B = [...document.querySelectorAll("#v3Barre button,#v3Barre input")].filter((x) => x.getClientRects().length);
      const petits = B.filter((x) => x.tagName === "BUTTON" && (x.getBoundingClientRect().width < 39.5 || x.getBoundingClientRect().height < 37.5)).map((x) => x.getAttribute("aria-label") || x.textContent.trim());
      const hors = B.filter((x) => { const q = x.getBoundingClientRect(); return q.left < R.left - 0.5 || q.right > R.right + 0.5 || q.top < R.top - 0.5; }).map((x) => x.id || x.textContent.trim());
      r["téléphone · la 3D s'ouvre en vue aérienne ; ni Vue aérienne ni Visite à choisir (la visite demande un clavier ou une souris)"] = v3.ouvert && v3Etat().pret && v3.mode === "maquette" && !document.getElementById("v3Visite") && !document.querySelector("#v3Barre .v3mode");
      r[`téléphone · la barre tient dans la 3D, sur deux lignes au plus, des cibles de 40 px${petits.length ? " — petits : " + petits.join(", ") : ""}${hors.length ? " — dehors : " + hors.join(", ") : ""}`] = !petits.length && !hors.length && document.getElementById("v3Barre").getBoundingClientRect().height < 110;
      r["téléphone · la barre d'état dit le geste : un doigt tourne, deux doigts zooment et déplacent"] = /Un doigt/.test(document.getElementById("v3Aide").innerText) && /deux doigts/.test(document.getElementById("v3Aide").innerText);
      v3ChoisirMode("visite"); const g = v3PlusGrande(0); const entre = v3EntrerVisite(g);
      r["téléphone · la visite est refusée (bouton absent, appel sans effet)"] = !entre && v3.mode === "maquette" && !v3.choix;
      return r; }));
    /* orbiter au doigt : un glisser tactile fait tourner la caméra autour du niveau */
    const az = () => p.evaluate(() => { const o = v3.cam.position.clone().sub(v3.ctl.target); return Math.atan2(o.x, o.z); });
    const a0 = await az(), c = await p.evaluate(() => { const r = v3.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 }; });
    const tch = await p.touchscreen.touchStart(c.x - 60, c.y); for (let k = 1; k <= 8; k++) { await tch.move(c.x - 60 + k * 15, c.y); await wait(16); } await tch.end(); await wait(500);
    const a1 = await az();
    t[`téléphone · un doigt qui glisse fait tourner la maquette (azimut ${(a0 * 180 / Math.PI).toFixed(0)}° → ${(a1 * 180 / Math.PI).toFixed(0)}°)`] = Math.abs(a1 - a0) > 0.2;
    const ap = await p.evaluate(() => { document.getElementById("v3Retour").click(); return !v3.ouvert; });
    t["téléphone · « Retour au plan » rend le plan"] = ap;
  }
  await p.close();
}

/* ═════════ 6. D73 · La visite (l'exemple, une rénovation) ═════════ */
if (reseau) {
  const req = [];
  const p = await onglet({ requetes: req });
  await p.evaluate(MESURES);
  await p.evaluate(() => {
    /* les obstacles (tranches pleines vues de dessus) : le visiteur n'en recouvre aucun ; la distance de son centre au plus proche */
    window.__penetre = () => { const V = v3.vis; let m = Infinity, dedans = false; for (const o of v3.obst) { if (pointIn({ x: V.x, y: V.z }, o.poly)) dedans = true; for (let k = 0; k < o.poly.length; k++) { const a = o.poly[k], c = o.poly[(k + 1) % o.poly.length]; m = Math.min(m, distSeg({ x: V.x, y: V.z }, a, c)); } } return { dedans, m }; };
    /* un rayon à 35 cm du sol (les genoux), devant soi, parmi les murs et doublages */
    window.__devant = (h) => { const V = v3.vis, y = v3.altitudes[v3.niveau] + (h || 0.35), r = v3Viser([V.x, y, V.z], [-Math.sin(V.yaw), 0, -Math.cos(V.yaw)], ["mur", "doublage"]); return r ? r.d : Infinity; };
    window.__poser = (x, z, yaw) => { Object.assign(v3.vis, { x, z, yaw, pitch: 0 }); v3.glisse = null; v3Repousser(); v3Regard(); v3PieceIci(true); };
    window.__ecran = (x, y, niv, h) => { const T = window.THREE, q = new T.Vector3(x, v3.altitudes[niv] + (h || 0.01), y).project(v3.cam), r = v3.renderer.domElement.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; };
  });
  const avant = await p.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); return { json: JSON.stringify(state), emp: empreinte(state) }; });
  await p.click("#v3Btn"); await attendre3D(p);
  const cam0 = await p.evaluate(() => v3.cam.position.toArray());
  /* les mots de la 3D, à chaque moment : aucun de ceux que D39 a retirés de l'écran (langage.mjs) */
  const MOTS = () => { const el = document.getElementById("v3"), vis = (x) => x.getClientRects().length > 0; return [el.innerText, ...[...el.querySelectorAll("[data-tip],[title],[aria-label]")].filter(vis).flatMap((x) => ["data-tip", "title", "aria-label"].map((k) => x.getAttribute(k)).filter(Boolean)), document.getElementById("v3Btn").dataset.tip, v3.renderer && v3.renderer.domElement.getAttribute("aria-label")].join("\n"); };
  const motsLus = [await p.evaluate(MOTS)];
  /* « Visite » à la souris : une pièce à choisir, la maquette reste */
  await p.click("#v3Visite"); await wait(150); motsLus.push(await p.evaluate(MOTS));
  const ch = await p.evaluate(() => ({ choix: v3.choix, mode: v3.mode, pressed: document.getElementById("v3Visite").getAttribute("aria-pressed"), aide: document.getElementById("v3Aide").innerText, coupe: !!document.getElementById("v3Coupe"), classe: document.getElementById("v3").classList.contains("choix"), s: v3Etat().sols.find((q) => q.type === "chambre") }));
  t["visite · « Visite » à la souris : on choisit sa pièce (bouton enfoncé, consigne dans la barre d'état), la maquette et sa coupe restent"] = ch.choix && ch.mode === "maquette" && ch.pressed === "true" && /Clique dans une pièce/.test(ch.aide) && ch.coupe && ch.classe;
  const P = await p.evaluate((s) => __ecran(s.x, s.y, 0), ch.s);
  await p.mouse.move(P.x, P.y); await wait(250);
  const sv = await p.evaluate(() => ({ de: v3.surligne ? v3.surligne.userData.de.userData.roomId : null, info: document.getElementById("v3Info").innerText, curseur: v3.renderer.domElement.classList.contains("surPiece"), maill: v3Etat().maillages }));
  t[`visite · la pièce survolée s'éclaire, son nom dans la barre d'état (${sv.info})`] = sv.de === ch.s.roomId && sv.info === ch.s.nom && sv.curseur;
  await p.mouse.click(P.x, P.y); await wait(60);
  const enAnim = await p.evaluate(() => ({ anim: !!v3.anim, fov: v3.cam.fov }));
  await finAnim(p);
  Object.assign(t, await p.evaluate((s) => { const r = {}, E = v3Etat(), V = E.visiteur, lv = L(), H = lv.height;
    /* D74 (architecte) : le repère de la chambre tombe DANS le lit — on entre au point libre le plus proche : hors du lit (et
       30 cm autour), à 50 cm des murs, dans la chambre */
    const lit = lv.items.find((x) => x.type === "lit"), c = Math.cos(-(lit.rot || 0)), sn = Math.sin(-(lit.rot || 0)), dx = V.x - lit.x, dy = V.z - lit.y, lx = c * dx - sn * dy, ly = sn * dx + c * dy;
    const horsLit = Math.abs(lx) > lit.w / 2 + 0.29 || Math.abs(ly) > lit.h / 2 + 0.29, dMur = v3DistObst(V.x, V.z, v3.obst), clicDansLit = Math.abs((c * (s.x - lit.x) - sn * (s.y - lit.y))) < lit.w / 2 && Math.abs(sn * (s.x - lit.x) + c * (s.y - lit.y)) < lit.h / 2;
    r[`visite · un clic dans la pièce y entre ; D74 : le clic tombait dans le lit — on entre au point libre le plus proche (${V && V.piece}, à ${Math.hypot(V.x - s.x, V.z - s.y).toFixed(2)} m du clic, ${dMur.toFixed(2)} m du mur le plus proche, hors du lit)`] = E.mode === "visite" && !E.choix && !!V && V.piece === s.nom && clicDansLit && horsLit && dMur >= V3_LIBRE - 1e-3 && Math.hypot(V.x - s.x, V.z - s.y) < 2;
    r["visite · à hauteur d'yeux : 1,60 m au-dessus du sol du niveau, un objectif plus large (68°) — D74 : à la fin de la transition"] = Math.abs(V.yeux - 1.6) < 1e-9 && Math.abs(v3.cam.position.y - v3.altitudes[0] - 1.6) < 1e-9 && V.fov === 68 && !E.anim;
    const M = lv.walls.filter((w) => !isVirtual(w) && wallDrawn(w, "final")).map((w) => ({ w, h: __hautMur(lv, 0, w, "final") })).filter((x) => x.h), fm = M.filter((x) => x.h.y == null || Math.abs(x.h.y - H) > 0.002);
    r[`visite · murs entiers (${M.length} murs à ${fmt(H, 2)} m, rayon), sans coupe ni toiture dans la barre`] = M.length >= 8 && !fm.length && !document.getElementById("v3Coupe") && !document.getElementById("v3Toit");
    const couv = facesFor(lv, "final").filter((f) => f.room && RT[f.room.type] && !RT[f.room.type].ext).length, up = v3Viser([V.x, 1.6, V.z], [0, 1, 0]);
    r[`visite · un plafond par pièce couverte (${E.plafonds.length}/${couv}), à la hauteur du niveau au-dessus de la tête (rayon)`] = E.plafonds.length === couv && !!up && up.kind === "plafond" && Math.abs(up.p[1] - H) < 1e-6;
    r["visite · la barre d'état : ZQSD ou flèches, glisser, clic au sol ; la pièce où l'on est ; le clavier va à la scène"] = /ZQSD|WASD/.test(document.getElementById("v3Aide").innerText) && /flèches/.test(document.getElementById("v3Aide").innerText) && /clic au sol/.test(document.getElementById("v3Aide").innerText) && document.getElementById("v3Info").innerText === s.nom && document.activeElement === v3.renderer.domElement;
    return r; }, ch.s));
  motsLus.push(await p.evaluate(MOTS));
  { const tout = motsLus.join("\n"), ko = [/maquette/i, /\bmoteur\b/i, /\bProjet\b(?! rénovation)|\bFinal\b/, /\bJSON\b/].filter((re) => re.test(tout));
    t[`langage · la 3D (vue aérienne, pièce à choisir, visite) ne dit aucun mot retiré par D39 — ni « maquette », ni « moteur »${ko.length ? " — " + ko.join(" ") : ""}`] = !ko.length && /Vue aérienne/.test(tout); }
  /* marcher : au clavier, dans une direction dégagée (le séjour) */
  /* D74 : les meubles hauts arrêtent aussi (la sonde) — on choisit la direction la plus libre, meubles compris */
  const dep = await p.evaluate(() => { const g = v3PlusGrande(0); __poser(g.x, g.y, 0); const x = v3.vis.x, z = v3.vis.z; let best = 0, bd = 0; for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18, d = v3Degage(x, z, a, false, true); if (d > bd) { bd = d; best = a; } } __poser(x, z, best); return { x: v3.vis.x, z: v3.vis.z, yaw: v3.vis.yaw, libre: bd }; });
  await p.focus("canvas.v3cv"); await p.keyboard.down("KeyW"); await wait(700); await p.keyboard.up("KeyW"); await wait(80);
  const m1 = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z, yaw: v3.vis.yaw }));
  const d1 = Math.hypot(m1.x - dep.x, m1.z - dep.z), av = ((m1.x - dep.x) * -Math.sin(dep.yaw) + (m1.z - dep.z) * -Math.cos(dep.yaw));
  t[`visite · Z (W) fait avancer droit devant, à la marche (${d1.toFixed(2)} m en 0,7 s ; ${dep.libre.toFixed(1)} m libres)`] = d1 > 0.6 && d1 < 1.4 && av > 0.98 * d1;
  await p.evaluate((d) => __poser(d.x, d.z, d.yaw), dep);
  await p.keyboard.down("Shift"); await p.keyboard.down("KeyW"); await wait(700); await p.keyboard.up("KeyW"); await p.keyboard.up("Shift"); await wait(80);
  const m2 = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z }));
  const d2 = Math.hypot(m2.x - dep.x, m2.z - dep.z);
  t[`visite · avec Maj, plus vite (${d2.toFixed(2)} m contre ${d1.toFixed(2)})`] = d2 > 1.4 * d1 || (d2 > d1 && d2 > dep.libre - 0.6);
  await p.evaluate((d) => __poser(d.x, d.z, d.yaw), dep);
  await p.keyboard.down("KeyA"); await wait(400); await p.keyboard.up("KeyA"); await wait(80);
  const m3 = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z, yaw: v3.vis.yaw })), gauche = (m3.x - dep.x) * -Math.cos(dep.yaw) + (m3.z - dep.z) * Math.sin(dep.yaw);
  await p.keyboard.down("ArrowLeft"); await wait(400); await p.keyboard.up("ArrowLeft"); await wait(80);
  const m4 = await p.evaluate(() => ({ yaw: v3.vis.yaw, x: v3.vis.x, z: v3.vis.z }));
  t[`visite · Q (A) fait un pas de côté à gauche (${gauche.toFixed(2)} m), la flèche gauche tourne sur place (${((m4.yaw - m3.yaw) * 180 / Math.PI).toFixed(0)}°)`] = gauche > 0.2 && Math.abs(m3.yaw - dep.yaw) < 1e-9 && m4.yaw - m3.yaw > 0.3 && Math.hypot(m4.x - m3.x, m4.z - m3.z) < 1e-9;
  /* les murs arrêtent : face au mur le plus proche, on s'arrête à 25 cm ; on glisse le long du mur */
  const mur = await p.evaluate(() => { const g = v3PlusGrande(0); __poser(g.x, g.y, 0); const x = v3.vis.x, z = v3.vis.z; let best = 0, bd = 99; for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36, d = v3Degage(x, z, a); if (d < bd && Math.abs(d - v3Degage(x, z, a, false, true)) < 1e-6) { bd = d; best = a; } } __poser(x, z, best); return { yaw: best, d0: bd }; });
  await p.keyboard.down("KeyW"); await wait(Math.min(3000, 700 + mur.d0 * 900)); await p.keyboard.up("KeyW"); await wait(80);
  const mr = await p.evaluate(() => ({ d: __devant(0.35), d2: __devant(1.0), pen: __penetre(), x: v3.vis.x, z: v3.vis.z }));
  t[`collisions · face à un mur, D74 : la sonde arrête à 45 cm de sa face (rayon à 35 cm : ${mr.d.toFixed(3)} m ; à 1 m : ${mr.d2.toFixed(3)} m) — le cercle de 25 cm reste pour les portes`] = Math.abs(mr.d - V3_FACE) < 0.015 && Math.abs(mr.d2 - V3_FACE) < 0.015 && !mr.pen.dedans && mr.pen.m > 0.245;
  await p.keyboard.down("KeyD"); await wait(500); await p.keyboard.up("KeyD"); await wait(80);
  const gl = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z, pen: __penetre() }));
  t[`collisions · contre le mur, un pas de côté glisse le long (${Math.hypot(gl.x - mr.x, gl.z - mr.z).toFixed(2)} m), sans y entrer`] = Math.hypot(gl.x - mr.x, gl.z - mr.z) > 0.3 && !gl.pen.dedans && gl.pen.m > 0.245;
  /* une fenêtre (allège) arrête ; une porte se passe */
  /* une fenêtre devant laquelle aucun meuble haut ne se tient (D74 : un lit sous l'appui arrêterait avant) */
  const fz = await p.evaluate(() => { const lv = L(); for (const o of lv.openings.filter((x) => x.type === "fenetre" && opDrawn(x, "final") && (allegeOf(x) || 0) > 0.5)) { const w = lv.walls.find((x) => x.id === o.wallId), t = wallT(w), u = norm(sub(w.b, w.a)), n = perp(u), A = add(w.a, wallOff(w)), sc = o.t * wallLen(w);
    const si = (() => { const a = wallSideInside(w, 1, lv), c = wallSideInside(w, -1, lv); return a && !c ? 1 : c && !a ? -1 : 1; })(), Q = add(add(A, mul(u, sc)), mul(n, si * (t / 2 + 1.2))), yaw = Math.atan2(si * n.x, si * n.y);
    __poser(Q.x, Q.y, yaw); if (Math.hypot(v3.vis.x - Q.x, v3.vis.z - Q.y) > 1e-6 || Math.abs(v3Degage(Q.x, Q.y, yaw) - v3Degage(Q.x, Q.y, yaw, false, true)) > 1e-6) continue;
    return { id: o.id, si, nx: n.x, ny: n.y, ax: A.x + u.x * sc, ay: A.y + u.y * sc, piece: v3.vis.piece }; } return null; });
  await p.keyboard.down("KeyW"); await wait(1800); await p.keyboard.up("KeyW"); await wait(80);
  const fr = await p.evaluate((f) => ({ d: __devant(0.35), cote: ((v3.vis.x - f.ax) * f.nx + (v3.vis.z - f.ay) * f.ny) * f.si, piece: v3.vis.piece, pen: __penetre() }), fz);
  t[`collisions · une fenêtre arrête : D74 : la sonde arrête à 45 cm de son allège, côté pièce (${fr.d.toFixed(3)} m, ${fz.piece})`] = Math.abs(fr.d - V3_FACE) < 0.015 && fr.cote > 0 && fr.piece === fz.piece && !fr.pen.dedans;
  const pz = await p.evaluate(() => { const lv = L(), fc = facesFor(lv, "final").filter((f) => f.room);
    for (const o of lv.openings.filter((x) => x.type === "porte" && opDrawn(x, "final"))) { const w = lv.walls.find((x) => x.id === o.wallId), t = wallT(w), u = norm(sub(w.b, w.a)), n = perp(u), A = add(w.a, wallOff(w)), sc = o.t * wallLen(w), C = add(A, mul(u, sc));
      const a = add(C, mul(n, t / 2 + 0.9)), c = sub(C, mul(n, t / 2 + 0.9)), ra = v3SolSous(a.x, a.y, 0), rc = v3SolSous(c.x, c.y, 0);
      if (ra && rc && ra.roomId !== rc.roomId) { __poser(a.x, a.y, Math.atan2(n.x, n.y)); return { de: ra.nom, vers: rc.nom, w: o.w || OPENINGS[o.type].w }; } }
    return null; });
  if (pz) { await p.keyboard.down("KeyW"); await wait(1400); await p.keyboard.up("KeyW"); await wait(80); }
  const pr = pz && await p.evaluate(() => ({ piece: v3.vis.piece, pen: __penetre() }));
  t[`collisions · une porte se passe : de « ${pz && pz.de} » à « ${pz && pz.vers} » par une porte de ${pz && pz.w} m, sans toucher les tableaux`] = !!pz && pr.piece === pz.vers && !pr.pen.dedans && pr.pen.m > 0.245;
  /* tout droit dans 8 directions depuis le séjour, au pas de course : jamais dans un mur */
  const ko8 = [];
  for (let k = 0; k < 8; k++) {
    await p.evaluate((k) => { const g = v3PlusGrande(0); __poser(g.x, g.y, k * Math.PI / 4); }, k);
    await p.keyboard.down("Shift"); await p.keyboard.down("KeyW"); await wait(1100); await p.keyboard.up("KeyW"); await p.keyboard.up("Shift"); await wait(60);
    const q = await p.evaluate(() => __penetre()); if (q.dedans || q.m < 0.245) ko8.push(k * 45 + "° : " + q.m.toFixed(3));
  }
  t[`collisions · 8 courses droit devant depuis le séjour : jamais dans un mur, jamais à moins de 25 cm${ko8.length ? " — " + ko8.join(", ") : ""}`] = !ko8.length;
  /* aller où l'on clique ; la molette avance ; glisser regarde */
  const cible = await p.evaluate(() => { const g = v3PlusGrande(0); let best = 0, bd = 0; for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18, d = v3Degage(g.x, g.y, a); if (d > bd) { bd = d; best = a; } } __poser(g.x, g.y, best); v3.vis.pitch = -0.35; v3Regard(); v3Rendre();
    const l = Math.min(2, bd - 0.6), x = g.x - Math.sin(best) * l, z = g.y - Math.cos(best) * l; return { x, z, e: __ecran(x, z, 0, 0.003), l }; });
  await p.mouse.click(cible.e.x, cible.e.y); await wait(Math.max(1200, cible.l / 2.4 * 1000 + 600));
  const va = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z, mode: v3.mode }));
  t[`visite · un clic au sol y mène (${cible.l.toFixed(1)} m, arrivé à ${(Math.hypot(va.x - cible.x, va.z - cible.z) * 100).toFixed(0)} cm)`] = va.mode === "visite" && Math.hypot(va.x - cible.x, va.z - cible.z) < 0.08;
  const mo = await p.evaluate(() => { const g = v3PlusGrande(0); let best = 0, bd = 0; for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18, d = v3Degage(g.x, g.y, a); if (d > bd) { bd = d; best = a; } } __poser(g.x, g.y, best); v3.vis.pitch = 0; v3Regard(); return { x: v3.vis.x, z: v3.vis.z }; });
  const cc = await p.evaluate(() => { const r = v3.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(cc.x, cc.y); await p.mouse.wheel({ deltaY: -100 }); await wait(700);
  const mw = await p.evaluate(() => ({ x: v3.vis.x, z: v3.vis.z }));
  t[`visite · la molette avance d'un pas (${Math.hypot(mw.x - mo.x, mw.z - mo.z).toFixed(2)} m)`] = Math.abs(Math.hypot(mw.x - mo.x, mw.z - mo.z) - 0.5) < 0.03;
  const y0 = await p.evaluate(() => v3.vis.yaw);
  await p.mouse.move(cc.x, cc.y); await p.mouse.down(); for (let k = 1; k <= 10; k++) await p.mouse.move(cc.x + k * 20, cc.y + k * 4); await p.mouse.up(); await wait(200);
  const gr = await p.evaluate(() => ({ yaw: v3.vis.yaw, pitch: v3.vis.pitch, x: v3.vis.x, z: v3.vis.z, gl: v3.glisse }));
  t[`visite · glisser regarde autour (la vue suit la main : ${((gr.yaw - y0) * 180 / Math.PI).toFixed(0)}° à 200 px), sans déplacer`] = Math.abs(gr.yaw - y0 - 0.9) < 0.02 && gr.pitch > 0.1 && Math.hypot(gr.x - mw.x, gr.z - mw.z) < 1e-9 && !gr.gl;
  await p.click("#v3Recentrer"); await wait(150);
  t["visite · « Recentrer » ramène à l'entrée de la visite"] = await p.evaluate(() => { const V = v3.vis, E = V.entree; return Math.hypot(V.x - E.x, V.z - E.z) < 1e-9 && V.yaw === E.yaw; });
  /* avant / après en visite : le mur démoli revient, le visiteur reste hors des murs */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), dem = lv.walls.find((w) => w.st === "demolir"), M = dem && add(add(dem.a, wallOff(dem)), mul(sub(dem.b, dem.a), 0.5));
    __poser(M.x, M.y, 0); const ap = __penetre(); v3ChoisirVue("existant"); const av = __penetre(), E = v3Etat();
    r["visite · Avant travaux en visite : le mur démoli est debout, et le visiteur qui s'y trouvait est remis hors du mur"] = E.mode === "visite" && E.murs.some((m) => m.id === dem.id) && !ap.dedans && !av.dedans && av.m > 0.245;
    v3ChoisirVue("final"); return r; }));
  /* plein écran, puis Échap un cran à la fois */
  await p.click("#v3Plein"); await wait(250);
  const pl = await p.evaluate(() => { const q = document.getElementById("v3").getBoundingClientRect(), e = document.elementFromPoint(20, 20); return { on: document.body.classList.contains("v3plein"), etat: v3.plein, q: [q.left, q.top, q.width, q.height].map(Math.round), pressed: document.getElementById("v3Plein").getAttribute("aria-pressed"), dessus: !!e && !!e.closest("#v3"), focus: document.activeElement && document.activeElement.id }; });
  t[`plein écran · la 3D couvre toute la fenêtre (${pl.q[2]} × ${pl.q[3]} depuis le coin), barre du haut et panneau dessous ; le bouton enfoncé garde le focus`] = pl.on && pl.etat && pl.q.join() === "0,0,1440,900" && pl.pressed === "true" && pl.dessus && pl.focus === "v3Plein";
  await p.keyboard.press("Escape"); await wait(200);
  const e1 = await p.evaluate(() => ({ plein: v3.plein, cls: document.body.classList.contains("v3plein"), mode: v3.mode, ouvert: v3.ouvert }));
  await p.keyboard.press("Escape"); await wait(60);
  const e2a = await p.evaluate(() => !!v3.anim); await finAnim(p);
  const e2 = await p.evaluate((c0) => ({ mode: v3.mode, ouvert: v3.ouvert, fov: v3.cam.fov, cam: v3.cam.position.toArray().every((x, i) => Math.abs(x - c0[i]) < 1e-6), coupe: !!document.getElementById("v3Coupe"), ctl: v3.ctl.enabled, aide: document.getElementById("v3Aide").innerText }), cam0);
  await p.keyboard.press("Escape"); await wait(200);
  const e3 = await p.evaluate(() => ({ ouvert: v3.ouvert, json: JSON.stringify(state), emp: empreinte(state) }));
  t["transitions (D74) · la sortie de visite remonte des yeux à la vue aérienne (une transition, puis la pose laissée)"] = e2a;
  t["Échap · un cran à la fois : le plein écran, puis la visite (la maquette revient telle qu'on l'avait laissée), puis le plan"] = !e1.plein && !e1.cls && e1.mode === "visite" && e1.ouvert && e2.mode === "maquette" && e2.ouvert && e2.fov === 32 && e2.cam && e2.coupe && e2.ctl && /double-clic/.test(e2.aide) && !e3.ouvert;
  t["visite · le plan est identique après la visite (état complet et empreinte)"] = e3.json === avant.json && e3.emp === avant.emp;
  /* un double-clic dans la maquette entre en visite */
  await p.evaluate(() => v3Ouvrir()); await attendre3D(p);
  const P2 = await p.evaluate(() => { const s = v3PlusGrande(0); return __ecran(s.x, s.y, 0); });
  await p.mouse.click(P2.x, P2.y, { count: 2 }); await wait(300);
  t["visite · un double-clic dans une pièce de la maquette y entre directement"] = await p.evaluate(() => v3.mode === "visite" && !!v3.vis && v3.vis.piece === v3PlusGrande(0).nom);
  await p.evaluate(() => v3Fermer());
  const cdn = req.filter((u) => CDN.test(u));
  t[`réseau · la 3D ne demande que ses deux fichiers épinglés, la visite rien de plus (${cdn.length} requêtes)`] = cdn.length >= 2 && cdn.every((u) => /three@0\.147\.0\/(build\/three\.min\.js|examples\/js\/controls\/OrbitControls\.js)$/.test(u));
  await p.close();
}

/* ═════════ 7. D73 · La visite au clavier, sur deux niveaux (Plan final, 120 m²) ═════════ */
if (reseau) {
  const p = await onglet();
  await p.evaluate(MESURES);
  await p.evaluate((S) => { (0, eval)("(" + S + ")")(); closeModal(); sel = null; render(); }, SCENE_PF);
  await p.evaluate(() => cv.focus()); await p.keyboard.press("3"); await attendre3D(p);
  await p.focus("#v3Visite"); await p.keyboard.press("Enter"); await wait(100); await finAnim(p);
  const k1 = await p.evaluate(() => { const E = v3Etat(); return { mode: E.mode, choix: E.choix, piece: E.visiteur && E.visiteur.piece, focus: document.activeElement === v3.renderer.domElement, niv: E.niveau }; });
  t[`clavier · « Visite » au clavier (Entrée) entre directement dans la pièce du centre de la vue (${k1.piece}), le clavier passe à la scène`] = k1.mode === "visite" && !k1.choix && !!k1.piece && k1.focus && k1.niv === 0;
  await p.click('#v3Barre [aria-label="Niveau montré"] button:nth-child(2)'); await wait(300); await finAnim(p);
  Object.assign(t, await p.evaluate(() => { const r = {}, E = v3Etat(), y1 = v3.altitudes[1];
    r[`niveaux · en visite, « Étage » : on y est, les yeux à 1,60 m de son sol, dans une de ses pièces (${E.visiteur.piece})`] = E.mode === "visite" && E.niveau === 1 && Math.abs(v3.cam.position.y - y1 - 1.6) < 1e-9 && !!E.visiteur.piece && !!v3SolSous(E.visiteur.x, E.visiteur.z, 1);
    const trem = v3Tremies(state.levels[1], 1, v3.vue);
    r[`niveaux · ce qui arrête est de l'étage : ses murs (${v3.obst.length - trem.length} tranches) et la trémie de l'escalier qui y monte (${trem.length})`] = trem.length === 1 && v3.obst.length > trem.length && v3.obst.every((o) => v3.registre.obstacles.some((q) => q.poly === o.poly && Math.abs(q.y0 - y1) < 1e-9) || trem.some((P) => P.length === o.poly.length && P.every((q, k) => Math.abs(q.x - o.poly[k].x) < 1e-9 && Math.abs(q.y - o.poly[k].y) < 1e-9)));
    r[`niveaux · les plafonds de l'étage (${E.plafonds.length}), aucun au RDC`] = E.plafonds.length > 0 && E.plafonds.every((q) => q.niveau === 1);
    return r; }));
  /* la trémie de l'escalier arrête : on ne marche pas dans le vide */
  const tr = await p.evaluate(() => { const T = v3Tremies(state.levels[1], 1, v3.vue)[0], cx = T.reduce((s, q) => s + q.x, 0) / T.length, cy = T.reduce((s, q) => s + q.y, 0) / T.length;
    let best = null; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = cx + Math.sin(a) * 2.2, y = cy + Math.cos(a) * 2.2; if (v3SolSous(x, y, 1) && !v3.obst.some((o) => pointIn({ x, y }, o.poly))) { best = { x, y, yaw: a }; break; } }
    if (!best) return null; Object.assign(v3.vis, { x: best.x, z: best.y, yaw: best.yaw, pitch: 0 }); v3Repousser(); v3Regard(); return { cx, cy }; });
  if (tr) { await p.focus("canvas.v3cv"); await p.keyboard.down("KeyW"); await wait(2200); await p.keyboard.up("KeyW"); await wait(80); }
  const tv = tr && await p.evaluate((c) => ({ sol: !!v3SolSous(v3.vis.x, v3.vis.z, 1), d: Math.hypot(v3.vis.x - c.cx, v3.vis.z - c.cy) }), tr);
  t[`niveaux · la trémie de l'escalier arrête le visiteur de l'étage : il reste sur le plancher${tv ? " (à " + tv.d.toFixed(2) + " m de son centre)" : ""}`] = !!tv && tv.sol;
  await p.keyboard.press("Escape"); await wait(150);
  t["niveaux · Échap : la maquette, sur l'étage"] = await p.evaluate(() => v3.mode === "maquette" && v3.niveau === 1 && v3.ouvert);
  /* l'ordre du clavier : la scène, puis la barre de gauche à droite ; Entrée et Espace y agissent */
  await p.focus("canvas.v3cv"); const ordre = [];
  for (let k = 0; k < 12; k++) { await p.keyboard.press("Tab"); const id = await p.evaluate(() => { const a = document.activeElement; return a && a.closest("#v3") ? (a.getAttribute("aria-label") || a.textContent.trim()) : null; }); if (!id) break; ordre.push(id); }
  t[`clavier · Tab parcourt la barre dans l'ordre (${ordre.join(" › ")})`] = JSON.stringify(ordre) === JSON.stringify(["Retour au plan", "Vue aérienne", "Visite", "RDC", "Étage", "Hauteur de coupe", "Recentrer la vue", "Plein écran"]);
  await p.focus('#v3Barre [aria-label="Niveau montré"] button:nth-child(1)'); await p.keyboard.press("Space"); await wait(150);
  const sp = await p.evaluate(() => ({ niv: v3.niveau, focus: document.activeElement && document.activeElement.textContent.trim() }));
  const c0 = await p.evaluate(() => v3.coupe);
  await p.focus("#v3Coupe"); await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowLeft"); await wait(150);
  const cp = await p.evaluate(() => ({ c: v3.coupe, v: document.getElementById("v3CoupeV").textContent }));
  t[`clavier · Espace sur « RDC » change de niveau (le focus reste) ; les flèches règlent la coupe (${c0.toFixed(2)} m → ${cp.v})`] = sp.niv === 0 && sp.focus === "RDC" && Math.abs(cp.c - (c0 - 0.1)) < 1e-6;
  /* ce que disent les commandes : un nom pour chacune, un groupe nommé */
  t["accessibilité · chaque commande de la 3D a un nom ; chaque groupe aussi"] = await p.evaluate(() => [...document.querySelectorAll("#v3 button,#v3 input")].every((x) => (x.getAttribute("aria-label") || x.textContent.trim() || (x.labels && x.labels[0] && x.labels[0].textContent.trim()))) && [...document.querySelectorAll("#v3Barre .v3grp")].every((g) => !g.querySelectorAll("button").length || g.querySelectorAll("button").length === 1 || g.getAttribute("role") === "group" && g.getAttribute("aria-label")));
  await p.keyboard.press("Escape"); await wait(100);
  await p.close();
}

/* ═════════ 8. D73 · La barre à toutes les largeurs (le plan réel : toutes les commandes) ═════════ */
if (reseau) {
  const BARRE = () => { const v = document.getElementById("v3"), R = v.getBoundingClientRect(), b = document.getElementById("v3Barre"), bas = document.getElementById("v3Bas").getBoundingClientRect(), K = [...b.children].filter((x) => x.getClientRects().length).map((x) => x.getBoundingClientRect());
    const hors = K.filter((q) => q.left < R.left - 0.5 || q.right > R.right + 0.5).length, lignes = new Set(K.map((q) => Math.round(q.top))).size;
    let chev = 0; for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) if (K[i].left < K[j].right - 1 && K[j].left < K[i].right - 1 && K[i].top < K[j].bottom - 1 && K[j].top < K[i].bottom - 1) chev++;
    const a = document.getElementById("v3Aide");
    return { hors, lignes, chev, etapes: [...b.classList].filter((c) => /^r\d$/.test(c)).join(" "), basVu: bas.height > 20 && Math.abs(bas.bottom - R.bottom) < 1, basSousBarre: bas.top > Math.max(...K.map((q) => q.bottom)), aide: a.innerText.length > 10 && a.scrollWidth <= a.clientWidth + 1 }; };
  for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024]]) {
    const p = await onglet({ largeur: L, hauteur: H });
    await p.evaluate((fix) => { closeModal(); state = fix; migrerEtat(state); state.levels.forEach(syncRooms); sel = null; render(); v3Ouvrir(); }, FIX);
    await attendre3D(p);
    const m = await p.evaluate(BARRE);
    await p.evaluate(() => v3ChoisirMode("visite")); await p.evaluate(() => v3EntrerVisite(v3PlusGrande(0))); await wait(150);
    const v = await p.evaluate(BARRE);
    t[`${L} × ${H} · la barre de la 3D tient sur une ligne, sans chevauchement, dans la 3D (maquette : ${m.etapes || "entière"} ; visite : ${v.etapes || "entière"}) ; la barre d'état en bas, l'aide entière`] = m.lignes === 1 && !m.hors && !m.chev && m.basVu && m.basSousBarre && m.aide && v.lignes === 1 && !v.hors && !v.chev && v.basVu && v.aide;
    await p.close();
  }
}

/* ═════════ 9. D73 · Ouvrir et fermer vingt fois : rien ne s'accumule ═════════ */
if (reseau) {
  const p = await onglet();
  await p.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); });
  const cdp = await p.createCDPSession();
  const ecouteurs = async () => { const { result } = await cdp.send("Runtime.evaluate", { expression: "window" }), { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId }), d = await cdp.send("Runtime.evaluate", { expression: "document" }), L2 = await cdp.send("DOMDebugger.getEventListeners", { objectId: d.result.objectId }); return listeners.length + L2.listeners.length; };
  const tas = async () => { await cdp.send("HeapProfiler.collectGarbage"); await cdp.send("HeapProfiler.collectGarbage"); return (await cdp.send("Runtime.getHeapUsage")).usedSize; };
  const mesures = [];
  for (let k = 0; k < 20; k++) {
    await p.evaluate(() => v3Ouvrir()); await attendre3D(p);
    const o = await p.evaluate((k) => { if (k % 2) v3EntrerVisite(v3PlusGrande(0)); if (k % 3 === 0) v3ChoisirVue("existant"); v3Rendre(); const m = v3Etat().memoire; if (!window.__r0) window.__r0 = v3.renderer; return { m, meme: window.__r0 === v3.renderer, cv: document.querySelectorAll("#v3 canvas").length }; }, k);
    await p.evaluate(() => v3Fermer());
    const f = await p.evaluate(() => ({ m: { geometries: v3.renderer.info.memory.geometries, textures: v3.renderer.info.memory.textures, programmes: v3.renderer.info.programs.length }, groupe: v3.groupe, scene: v3.scene.children.length }));
    if (k === 2 || k === 19) mesures.push({ k, o, f, tas: await tas(), ec: await ecouteurs() });
    else mesures.push({ k, o, f });
  }
  const a = mesures[2], z = mesures[19], ouv = mesures.map((x) => x.o.m.geometries), fer = mesures.map((x) => x.f.m.geometries);
  t[`mémoire · fermée, la 3D ne garde aucune géométrie (${[...new Set(fer)].join("/")} : le sol des ombres), et la scène est vide`] = fer.every((g) => g <= 1) && mesures.every((x) => x.f.groupe === null);
  t[`mémoire · vingt ouvertures : un seul moteur et un seul canvas ; textures et programmes n'augmentent plus (${a.f.m.textures} → ${z.f.m.textures} textures, ${a.f.m.programmes} → ${z.f.m.programmes} programmes)`] = mesures.every((x) => x.o.meme && x.o.cv === 1) && z.f.m.textures <= a.f.m.textures && z.f.m.programmes <= a.f.m.programmes + 1;
  t[`mémoire · le tas JavaScript ne grossit pas d'une ouverture à l'autre (${(a.tas / 1e6).toFixed(1)} → ${(z.tas / 1e6).toFixed(1)} Mo de la 3e à la 20e) ; les écouteurs non plus (${a.ec} → ${z.ec})`] = z.tas - a.tas < 3e6 && z.ec === a.ec;
  await p.close();
}

/* ═════════ 10. D73 · Le temps de construction (WebGL logiciel) et les images par seconde (carte graphique, si elle est là) ═════════ */
if (reseau) {
  const scenes = [["la maison de 94 m²", () => { closeModal(); loadTemplate("maison", WORKFLOW_FINAL); closeModal(); render(); }], ["la maison de 120 m² sur deux niveaux", SCENE_PF], ["le plan réel", "FIX"]];
  const charger = (p, sc) => (sc[1] === "FIX" ? p.evaluate((fix) => { closeModal(); state = fix; migrerEtat(state); state.levels.forEach(syncRooms); sel = null; render(); }, FIX) : typeof sc[1] === "string" ? p.evaluate((S) => { (0, eval)("(" + S + ")")(); closeModal(); sel = null; render(); }, sc[1]) : p.evaluate(sc[1]));
  for (const sc of scenes) {
    const p = await onglet(); await charger(p, sc); await p.evaluate(() => v3Ouvrir()); await attendre3D(p);
    const c = await p.evaluate(() => { const T = []; for (let k = 0; k < 6; k++) { v3.sig = ""; const t0 = performance.now(); v3Rafraichir(); T.push(performance.now() - t0); } T.sort((a, b) => a - b); const E = v3Etat(); v3ChoisirCoupe(state.levels[v3.niveau].height); v3Rafraichir(); const E2 = v3Etat(); return { ms: T[3], maill: E.maillages, tri: Math.round(E.triangles), tri2: Math.round(E2.triangles) }; });
    t[`performances · ${sc[0]} : une construction en ${c.ms.toFixed(1)} ms (médiane), ${c.maill} maillages, ${c.tri} triangles à la coupe, ${c.tri2} murs entiers (≤ 120 ms, ≤ 60, ≤ 20 000)`] = c.ms <= 120 && c.maill <= 60 && c.tri2 <= 20000;
    await p.close();
  }
  /* la carte graphique de la machine : Chrome sans écran, sur Metal (Mac) ; sans carte graphique, rien n'est mesuré, et c'est dit */
  let g = null;
  try { g = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000, args: ["--no-sandbox", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); } catch { g = null; }
  const carte = g && await (async () => { const p = await g.newPage(); await p.goto("about:blank"); const r = await p.evaluate(() => { const c = document.createElement("canvas"), x = c.getContext("webgl2") || c.getContext("webgl"); if (!x) return ""; const d = x.getExtension("WEBGL_debug_renderer_info"); return d ? x.getParameter(d.UNMASKED_RENDERER_WEBGL) : x.getParameter(x.RENDERER); }); await p.close(); return r; })().catch(() => "");
  if (!carte || /swiftshader|llvmpipe|software/i.test(carte)) console.log(`  AVERTISSEMENT · pas de carte graphique joignable (${carte || "aucune"}) : les images par seconde ne sont pas mesurées.`);
  else {
    for (const sc of scenes) {
      const p = await onglet({ navigateur: g, dsf: 2 }); await charger(p, sc); await p.evaluate(() => v3Ouvrir()); await attendre3D(p); await wait(300);
      const r = await p.evaluate(async () => { const W = v3.renderer.domElement.width, H = v3.renderer.domElement.height; v3MesurerRendu(20); const coupe = v3MesurerRendu(120); v3ChoisirCoupe(state.levels[v3.niveau].height); v3Rafraichir(); const entiers = v3MesurerRendu(120); const ips = await v3MesurerIps(2000);
        v3EntrerVisite(v3PlusGrande(v3.niveau)); v3MesurerRendu(20); const visite = v3MesurerRendu(120); return { W, H, coupe, entiers, visite, ips }; });
      const pire = Math.max(r.coupe, r.entiers, r.visite);
      t[`performances · ${sc[0]}, ${carte.replace(/^ANGLE \(|\)$/g, "").split(",").slice(0, 2).join(",")}, ${r.W} × ${r.H} px : une image en ${r.coupe.toFixed(2)} ms (coupe), ${r.entiers.toFixed(2)} (murs entiers), ${r.visite.toFixed(2)} (visite) — ${Math.round(1000 / pire)} i/s au pire ; la boucle tourne à ${r.ips.toFixed(0)} i/s`] = pire <= 1000 / 60 && r.ips >= 55;
      await p.close();
    }
  }
  if (g) g.close().catch(() => {});
}

/* ═════════ 11. D74 · Les corrections du jury ═════════ */
/* le pixel d'un point du monde (s'il est bien le premier touché), sa luminance ; la part du sol dans l'image */
function PIX() {
  window.__pix = (P, genres) => { const T = THREE, gl = v3.renderer.getContext(), px = new Uint8Array(4); v3.cam.updateMatrixWorld(); const q = new T.Vector3(...P).project(v3.cam); if (Math.abs(q.x) > 0.98 || Math.abs(q.y) > 0.98 || q.z > 1) return null;
    const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(q.x, q.y), v3.cam); const h = rc.intersectObject(v3.groupe, true)[0]; if (!h || h.point.distanceTo(new T.Vector3(...P)) > 0.08) return null; if (genres && !genres.includes(h.object.userData.kind)) return null;
    v3Rendre(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; gl.readPixels(Math.round((q.x + 1) / 2 * W), Math.round((q.y + 1) / 2 * H), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; };
  window.__lum = (c) => c ? 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] : null;
  window.__poser = (x, z, yaw) => { Object.assign(v3.vis, { x, z, yaw, pitch: 0, tourne: null }); v3.glisse = null; v3Repousser(); v3Regard(); v3PieceIci(true); };
  window.__ecran = (x, y, niv, h) => { const T = THREE, q = new T.Vector3(x, v3.altitudes[niv] + (h || 0.01), y).project(v3.cam), r = v3.renderer.domElement.getBoundingClientRect(); return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; };
  window.__partSol = () => { const T = THREE, rc = new T.Raycaster(); let n = 0, s = 0; for (let i = 0; i < 24; i++) for (let j = 0; j < 16; j++) { rc.setFromCamera(new T.Vector2(-0.95 + 1.9 * i / 23, -0.95 + 1.9 * j / 15), v3.cam); const h = rc.intersectObject(v3.groupe, true).find((x) => x.object.userData.kind !== "survol"); n++; if (h && h.object.userData.kind === "sol") s++; } return s / n; };
  window.__polaire = () => { const o = v3.cam.position.clone().sub(v3.ctl.target); return Math.acos(Math.max(-1, Math.min(1, o.y / o.length()))) * 180 / Math.PI; };
  window.__az = (o) => Math.atan2(o.x, o.z) * 180 / Math.PI;
  window.__boiteDansZone = () => { const T = THREE, b = v3Boite(), cvr = v3.renderer.domElement.getBoundingClientRect(), br = document.getElementById("v3Barre").getBoundingClientRect(); let ok = true, pire = 0;
    for (let k = 0; k < 8; k++) { const q = new T.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).project(v3.cam), x = cvr.left + (q.x + 1) / 2 * cvr.width, y = cvr.top + (1 - q.y) / 2 * cvr.height;
      if (x < cvr.left + 2 || x > cvr.right - 2 || y > cvr.bottom - 2 || y < br.bottom + 2) { ok = false; pire = Math.max(pire, cvr.left - x, x - cvr.right, br.bottom - y, y - cvr.bottom); } } return { ok, pire: Math.round(pire) }; };
}
if (reseau) {
  /* 11a · l'exemple (rénovation), à 1 440 px : la caméra, la lumière, la barre, le bouton, la visite */
  const p = await onglet();
  await p.evaluate(MESURES); await p.evaluate(PIX);
  await p.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); });
  const bt = await p.evaluate(() => { const b = document.getElementById("v3Btn"); return { ico: !!b.querySelector("svg.ico"), txt: b.textContent.trim(), cadre: getComputedStyle(b).boxShadow !== "none" }; });
  t["bouton (D74) · « 3D » en pastille, avec le cube de « Vue aérienne » (il ne se lit plus comme un niveau)"] = bt.ico && bt.txt === "3D" && bt.cadre;
  await p.click("#v3Btn"); await attendre3D(p);
  /* la caméra : un glisser de 150 px vers le haut ne couche jamais l'œil au ras du sol */
  const c0 = await p.evaluate(() => { const r = v3.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.55, pol: __polaire() }; });
  await p.mouse.move(c0.x, c0.y); await p.mouse.down(); for (let k = 1; k <= 15; k++) { await p.mouse.move(c0.x, c0.y - k * 10); await wait(16); } await p.mouse.up(); await wait(700);
  const cam1 = await p.evaluate(() => ({ pol: __polaire(), sol: __partSol(), max: v3.ctl.maxPolarAngle * 180 / Math.PI }));
  t[`caméra (D74) · un glisser de 150 px vers le haut : l'œil s'arrête à ${cam1.pol.toFixed(1)}° (72° au plus ; ${c0.pol.toFixed(0)}° au départ ; avant D74, 87°, au ras du sol), et l'on voit encore des sols (${(cam1.sol * 100).toFixed(1)} % de l'image)`] = cam1.max <= 72.01 && cam1.pol <= 72.5 && cam1.sol >= 0.01;
  /* un double-clic dans le vide recentre (en glissant) */
  const P0 = await p.evaluate(() => { const P = v3CadragePose(); return { p: P.p.toArray(), t: P.t.toArray() }; });
  await p.evaluate(() => { const T = THREE, off = v3.cam.position.clone().sub(v3.ctl.target), s = new T.Spherical().setFromVector3(off); s.theta += 1.3; s.radius *= 0.6; v3.cam.position.copy(v3.ctl.target).add(off.setFromSpherical(s)); v3.ctl.update(); });
  const vide = await p.evaluate(() => { const r = v3.renderer.domElement.getBoundingClientRect(); for (let y = r.top + 70; y < r.top + 200; y += 10) for (let x = r.left + 10; x < r.right - 10; x += 40) { if (!v3Sol({ clientX: x, clientY: y })) { const T = THREE, rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1), v3.cam); if (!rc.intersectObject(v3.groupe, true).length) return { x, y }; } } return null; });
  if (vide) { await p.mouse.click(vide.x, vide.y, { count: 2 }); await wait(80); }
  const dc = vide && await p.evaluate(() => ({ anim: !!v3.anim, mode: v3.mode }));
  await finAnim(p);
  const dc2 = await p.evaluate((P0) => ({ d: v3.cam.position.distanceTo(new THREE.Vector3(...P0.p)), dt: v3.ctl.target.distanceTo(new THREE.Vector3(...P0.t)), mode: v3.mode }), P0);
  t[`caméra (D74) · un double-clic dans le vide recentre la vue, en glissant (à ${dc2.d.toFixed(3)} m du cadrage)`] = !!vide && dc.anim && dc.mode === "maquette" && dc2.d < 0.02 && dc2.dt < 0.02 && dc2.mode === "maquette";
  /* le soleil suit la caméra ; la façade vue de face reste claire de tous les côtés ; l'encre reste l'encre */
  Object.assign(t, await p.evaluate(() => { const r = {}, T = THREE, lv = L(); v3ChoisirCoupe(1.2); v3Rafraichir();
    const w0 = lv.walls.find((w) => !isVirtual(w) && w.type !== "cloison" && wallDrawn(w, v3.vue)), M = add(mul(add(w0.a, w0.b), 0.5), wallOff(w0)), enc = __pix([M.x, 1.2, M.y]);
    r[`lumière (D74) · la coupe reste à l'encre exacte #1E1B4B sous le rendu filmique (${enc && enc.join(",")})`] = !!enc && Math.abs(enc[0] - 0x1E) <= 2 && Math.abs(enc[1] - 0x1B) <= 2 && Math.abs(enc[2] - 0x4B) <= 2 && v3.renderer.toneMapping === T.ACESFilmicToneMapping;
    v3ChoisirCoupe(9); v3Rafraichir();
    const fac = lv.walls.filter((w) => !isVirtual(w) && isExteriorWall(w, lv)).map((w) => { const u = norm(sub(w.b, w.a)), n = perp(u), t = wallT(w), si = v3CoteInt(w, lv), Ps = [];
      for (const k of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) for (const zz of [0.45, 1.6]) { const M2 = add(add(add(w.a, mul(sub(w.b, w.a), k)), wallOff(w)), mul(n, -si * (t / 2 + 0.002))); Ps.push([M2.x, zz, M2.y]); }
      const M3 = add(add(mul(add(w.a, w.b), 0.5), wallOff(w)), mul(n, -si * (t / 2 + 0.002))); return { P: [M3.x, 0.9, M3.y], Ps, nrm: [-si * n.x, -si * n.y] }; });
    const az = [], ko = [];
    for (let k = 0; k < 4; k++) { const off = v3.cam.position.clone().sub(v3.ctl.target), s = new T.Spherical().setFromVector3(off); s.theta += Math.PI / 2; v3.cam.position.copy(v3.ctl.target).add(off.setFromSpherical(s)); v3.ctl.update();
      const o = v3.cam.position.clone().sub(v3.ctl.target), so = v3.soleil.position.clone().sub(v3.soleil.target.position); let d = __az(so) - (__az(o) - 30); while (d > 180) d -= 360; while (d < -180) d += 360;
      const cam = v3.cam.position, F = fac.map((f) => { const dx = cam.x - f.P[0], dz = cam.z - f.P[2], l = Math.hypot(dx, dz); return { ...f, face: (f.nrm[0] * dx + f.nrm[1] * dz) / l }; }).filter((f) => f.face > 0.6).map((f) => { const L2 = f.Ps.map((q) => __lum(__pix(q, ["mur", "doublage"]))).filter((x) => x != null).sort((a, b) => a - b); return L2.length ? L2[Math.floor(L2.length / 2)] : null; }).filter((x) => x != null);
      az.push(Math.round(Math.min(...F))); if (Math.abs(d) > 1 || !F.length || Math.min(...F) < 200) ko.push(k); }
    r[`lumière (D74) · le soleil suit la caméra (30° à sa gauche) : la façade vue de face reste claire de tous les côtés (${az.join(" / ")}, 200 au moins)`] = !ko.length;
    return r; }));
  /* la visite : des murs blancs, deux murs perpendiculaires de valeurs différentes, un plafond d'un autre ton ; rien ne brûle */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), sj = v3Etat().sols.find((s) => s.type === "sejour"); v3EntrerVisite(sj.roomId); v3FinAnim(); const V = v3.vis, x = V.x, z = V.z, L_ = [];
    for (let k = 0; k < 8; k++) { V.yaw = k * Math.PI / 4; V.pitch = 0; v3Regard(); const h = v3Viser([x, v3.altitudes[0] + 1.4, z], [-Math.sin(V.yaw), 0, -Math.cos(V.yaw)], ["mur", "doublage"]); if (!h) { L_.push(null); continue; } L_.push(__lum(__pix(h.p, ["mur", "doublage"]))); }
    const dirs = [0, 2, 4, 6].map((k) => L_[k]).filter((l) => l != null), paires = [[0, 2], [2, 4], [4, 6], [6, 0]].map(([a, b]) => L_[a] != null && L_[b] != null ? Math.abs(L_[a] - L_[b]) : null).filter((d) => d != null);
    V.yaw = 0; V.pitch = 1.1; v3Regard(); const up = v3Viser([x, v3.altitudes[0] + 1.6, z], [-Math.sin(0) * 0.4, 1, -Math.cos(0) * 0.4], ["plafond"]), lp = up && __lum(__pix(up.p, ["plafond"]));
    V.pitch = 0; v3Regard(); const px = v3Pixels(), gl = v3.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, buf = new Uint8Array(W * H * 4); v3Rendre(); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let brule = 0; for (let i = 0; i < buf.length; i += 4) { const l = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]; if (l > 247.5) brule++; }
    r[`lumière (D74) · en visite (séjour), les murs restent blancs (${dirs.map(Math.round).join(" / ")} : 225 au moins) et deux murs perpendiculaires diffèrent (${paires.map(Math.round).join(" / ")} : 8 au moins)`] = dirs.length >= 3 && dirs.every((l) => l >= 225) && paires.length >= 2 && paires.every((d) => d >= 8);
    r[`lumière (D74) · le plafond a son ton, distinct des murs (${lp && Math.round(lp)} contre ${Math.round(Math.min(...dirs))}–${Math.round(Math.max(...dirs))}) ; aucune surface ne brûle (${(brule / (W * H) * 100).toFixed(2)} % au-delà de 247)`] = lp != null && dirs.every((l) => Math.abs(l - lp) >= 6) && brule / (W * H) < 0.005 && px.noirs < 0.01;
    v3QuitterVisite(); v3FinAnim(); return r; }));
  /* matières et repères */
  Object.assign(t, await p.evaluate(() => { const r = {};
    r["matières (D74) · aucun métal très métallique (sortait noir sans environnement) : chrome, poignées, inox, alu, acier ≤ 0,1"] = ["eq:chrome", "men:poignee", "eq:inox", "men:alu", "str:acier", "esc:metal", "eq:bac"].every((k) => (V3_MATS[k].m || 0) <= 0.1);
    r["matières (D74) · le bois des meubles se détache du parquet ; le parquet est moins orangé ; le sol « À définir » n'est plus blanc ; la tuile tient 3,2 m (512 px)"] = V3_MATS["eq:bois"].c !== V3_SOLS.bois.c && parseInt(V3_SOLS.bois.c.slice(1, 3), 16) - parseInt(V3_SOLS.bois.c.slice(5, 7), 16) < 70 && V3_SOLS.defaut.c === "#D9DADF" && V3_MATS["toit:tuile"].motif === 3.2;
    const lum = L().items.filter((x) => x.type === "lumiere"), E = v3Etat(), sansBoite = lum.every((it) => !E.equipements.find((q) => q.id === it.id).boite);
    v3EntrerVisite(v3PlusGrande(0).roomId); v3FinAnim(); const E2 = v3Etat(), avecBoite = lum.every((it) => !!E2.equipements.find((q) => q.id === it.id).boite); v3QuitterVisite(); v3FinAnim();
    r[`repères (D74) · les points lumineux du plafond (${lum.length}) ne flottent plus en vue aérienne ; la visite les montre`] = lum.length >= 1 && sansBoite && avecBoite;
    return r; }));
  /* avant / après : un fondu, et ce qui change s'éclaire puis s'efface */
  const tr = await p.evaluate(() => { v3ChoisirVue("existant"); const im = document.querySelector("#v3 img.v3fondu"), M = v3.mats["cloison~demolir"]; return { fondu: !!im && im.classList.contains("va"), trav: !!v3.trav, teinte: !!M && !M.color.equals(M.userData.base), maill: (() => { let n = 0; v3.groupe.traverse((x) => { if (x.isMesh && /~demolir$/.test(x.userData.cle || "")) n++; }); return n; })() }; });
  await wait(2200);
  const tr2 = await p.evaluate(() => { const M = v3.mats["cloison~demolir"]; return { trav: !!v3.trav, base: !!M && M.color.equals(M.userData.base), canvas: document.querySelectorAll("#v3 canvas").length }; });
  const tr3 = await p.evaluate(() => { v3ChoisirVue("final"); let n = 0; v3.groupe.traverse((x) => { if (x.isMesh && /~creer$/.test(x.userData.cle || "")) n++; }); const M = v3.mats["doublage~creer"]; return { n, teinte: !!M && !M.color.equals(M.userData.base) }; });
  t[`avant / après (D74) · la bascule se fond (un instantané), ce qui sera démoli ou remplacé s'éclaire en ambre (${tr.maill} matières), ce qui est créé en rouge (${tr3.n}) — puis s'efface en 2 s ; un seul canevas`] = tr.fondu && tr.trav && tr.teinte && tr.maill >= 2 && !tr2.trav && tr2.base && tr2.canvas === 1 && tr3.n >= 2 && tr3.teinte;
  await wait(2200);
  /* la barre : la coupe a une largeur fixe ; « murs entiers » est un mot ; le moment a la facture de la 2D ; Recentrer et Plein écran */
  Object.assign(t, await p.evaluate(() => { const r = {}, o = document.getElementById("v3CoupeV"), g = document.querySelector("#v3Barre .v3coupe"); v3ChoisirCoupe(1.2); const w1 = o.getBoundingClientRect().width, d1 = g.getBoundingClientRect().right, f1 = getComputedStyle(o).fontFamily;
    v3ChoisirCoupe(9); const w2 = o.getBoundingClientRect().width, d2 = g.getBoundingClientRect().right, f2 = getComputedStyle(o).fontFamily;
    r[`barre (D74) · la valeur de la coupe a une largeur fixe (${w1.toFixed(0)} = ${w2.toFixed(0)} px) : rien ne bouge sous le curseur ; « murs entiers » en police de texte, « 1,20 m » en Geist Mono`] = Math.abs(w1 - w2) < 0.5 && Math.abs(d1 - d2) < 0.5 && /Geist Mono/.test(f1) && !/Geist Mono/.test(f2) && o.textContent === "murs entiers";
    const m = document.querySelector('#v3Barre [aria-label="Moment montré"]');
    r["barre (D74) · « Moment montré » a la facture du sélecteur de vue de la 2D (piste grise, pastille blanche)"] = !!m && m.classList.contains("v3moment") && getComputedStyle(m).backgroundColor !== getComputedStyle(document.querySelector("#v3Barre .v3mode")).backgroundColor && getComputedStyle(m.querySelector("button.on")).backgroundColor === "rgb(255, 255, 255)";
    const rc = document.getElementById("v3Recentrer"), pl = document.getElementById("v3Plein");
    r["barre (D74) · « Recentrer » en toutes lettres à 1 440 px, à part du plein écran (seul à l'extrême droite)"] = rc.querySelector(".v3t").getClientRects().length > 0 && rc.parentElement !== pl.parentElement && pl.getBoundingClientRect().right > rc.getBoundingClientRect().right;
    r["barre (D74) · le curseur de coupe a l'anneau de focus arrondi de la marque"] = [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((x) => /\.v3coupe input\[type="?range"?\]:focus-visible/.test(x.selectorText || "") && /border-radius/.test(x.cssText)); } catch { return false; } });
    v3ChoisirCoupe(1.2); return r; }));
  /* l'entrée par la pièce : devant sa porte, le regard vers la pièce */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), sj = v3Etat().sols.find((s) => s.type === "sejour"), P = v3PoseDePiece(sj.roomId, 0); v3EntrerVisite(sj.roomId); v3FinAnim();
    const V = v3.vis, o = lv.openings.find((x) => x.id === P.porte), w = lv.walls.find((x) => x.id === o.wallId), C = add(add(w.a, mul(sub(w.b, w.a), o.t)), wallOff(w)), n = perp(norm(sub(w.b, w.a))), dPorte = Math.hypot(V.x - C.x, V.z - C.y);
    const axe = Math.atan2(-(V.x - C.x), -(V.z - C.y)), ecart = Math.abs(Math.atan2(Math.sin(V.yaw - axe), Math.cos(V.yaw - axe))) * 180 / Math.PI; /* l'axe : de la porte vers la pièce */
    r[`visite (D74) · par la pièce (« ${sj.nom} ») : devant sa porte (${dPorte.toFixed(2)} m), le regard vers la pièce (${ecart.toFixed(0)}° de l'axe de la porte, 35 au plus), hors des meubles, loin des murs`] = !!P && dPorte < 1.2 && ecart <= 36 && v3DistObst(V.x, V.z, v3.meubles) >= 0.29 && v3DistObst(V.x, V.z, v3.obst) >= V3_LIBRE - 0.26;
    return r; }));
  /* la sonde : marcher vers le lit s'arrête à 45 cm (les meubles hauts arrêtent) */
  const lit = await p.evaluate(() => { const lv = L(), it = lv.items.find((x) => x.type === "lit"), ch = v3Etat().sols.find((s) => s.type === "chambre"); if (v3.mode !== "visite") { v3EntrerVisite(ch.roomId); v3FinAnim(); }
    const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0); for (const [lx, ly] of [[0, it.h / 2 + 1.4], [it.w / 2 + 1.2, 0], [-it.w / 2 - 1.2, 0]]) { const x = it.x + c * lx - s * ly, z = it.y + s * lx + c * ly, yaw = Math.atan2(-(it.x - x), -(it.y - z));
      __poser(x, z, yaw); if (Math.hypot(v3.vis.x - x, v3.vis.z - z) > 1e-6 || !v3SolSous(x, z, 0)) continue; if (v3Degage(x, z, yaw) < v3Degage(x, z, yaw, false, true) + 0.3) continue; return { ok: true }; } return null; });
  if (lit) { await p.focus("canvas.v3cv"); await p.keyboard.down("KeyW"); await wait(1600); await p.keyboard.up("KeyW"); await wait(80); }
  const lr = lit && await p.evaluate(() => ({ d: v3Degage(v3.vis.x, v3.vis.z, v3.vis.yaw, false, true), dans: v3.meubles.some((o) => pointIn({ x: v3.vis.x, y: v3.vis.z }, o.poly)) }));
  t[`collisions (D74) · on ne traverse plus les meubles : en marchant vers le lit, la sonde arrête à ${lr ? lr.d.toFixed(2) : "?"} m de lui (0,45)`] = !!lr && Math.abs(lr.d - V3_FACE) < 0.03 && !lr.dans;
  /* un clic au sol près d'un mur : on s'arrête à 60 cm, puis on se tourne vers le côté le plus profond */
  const cl = await p.evaluate(() => { const sj = v3Etat().sols.find((s) => s.type === "sejour"); if (v3.mode === "visite") v3QuitterVisite(); v3FinAnim(); v3EntrerVisite(sj.roomId); v3FinAnim(); const x = v3.vis.x, z = v3.vis.z;
    /* une direction vers un mur, sans meuble sur le passage (le cercle du visiteur compris) */
    const libre = (a, d) => { for (let s = 0.1; s < d; s += 0.1) if (v3DistObst(x - Math.sin(a) * s, z - Math.cos(a) * s, v3.meubles) < 0.35) return false; return true; };
    const C = []; for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36, d = v3Degage(x, z, a, false, true), dw = v3Degage(x, z, a); if (d > 1.6 && d < 4.5 && Math.abs(d - dw) < 1e-6 && libre(a, d)) C.push({ a, d }); }
    C.sort((p1, p2) => p1.d - p2.d);
    /* le point visé doit être un sol que le clic atteint (rien devant lui) */
    for (const best of C) { __poser(x, z, best.a); v3.vis.pitch = -0.5; v3Regard(); v3Rendre(); const l = best.d - 0.2, X = x - Math.sin(best.a) * l, Z = z - Math.cos(best.a) * l, e = __ecran(X, Z, 0, 0.003), h = v3Sol({ clientX: e.x, clientY: e.y });
      if (h && Math.hypot(h.x - X, h.y - Z) < 0.05) return { e, yaw: best.a, l }; }
    return null; });
  if (cl) { await p.mouse.click(cl.e.x, cl.e.y); await wait(Math.max(1500, cl.l / 2.4 * 1000 + 1500)); }
  const ca = cl && await p.evaluate((y0) => { const V = v3.vis; return { mur: v3Degage(V.x, V.z, y0, false, true), devant: v3Degage(V.x, V.z, V.yaw, true, true), tourne: Math.abs(Math.atan2(Math.sin(V.yaw - y0), Math.cos(V.yaw - y0))) > 0.2 }; }, cl.yaw);
  t[`visite (D74) · un clic au sol à 20 cm d'un mur : on s'arrête à ${ca ? ca.mur.toFixed(2) : "?"} m de lui (60 cm), puis on se tourne vers le côté le plus profond (${ca ? ca.devant.toFixed(1) : "?"} m devant)`] = !!ca && ca.mur >= V3_FACE + 0.1 && ca.mur < 0.75 && ca.tourne && ca.devant >= 1;
  /* les joints : le corps d'un mur percé d'une fenêtre est ÉTANCHE — aucun sommet au milieu d'une arête d'un autre triangle (une
     jonction en T laisse passer un trait clair : celui que le jury voyait sous les fenêtres, et en zébrures sur les façades) */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = L(), m = "final";
    const o = lv.openings.find((x) => x.type === "fenetre" && opDrawn(x, m) && (allegeOf(x) || 0) > 0.5), w = lv.walls.find((x) => x.id === o.wallId), t_ = wallT(w), Lw = wallLen(w), u = norm(sub(w.b, w.a)), n = perp(u), off = wallOff(w), h = mul(n, t_ / 2), P = (s) => add(add(w.a, off), mul(u, s));
    const sv = v3.registre; v3.registre = null; const S = {}, B = (k) => S[k] || (S[k] = { pos: [], nor: [] });
    try { v3Extruder(B, [add(P(0), h), add(P(Lw), h), sub(P(Lw), h), sub(P(0), h)], u, v3Trous(lv, m, w, u, lv.height), 0, lv.height, 1.6, "mur", 0); } finally { v3.registre = sv; }
    const pos = [].concat(...Object.values(S).map((x) => x.pos)), tris = []; for (let i = 0; i < pos.length; i += 9) tris.push([0, 1, 2].map((k) => [pos[i + 3 * k], pos[i + 3 * k + 1], pos[i + 3 * k + 2]]));
    const V = []; tris.forEach((T) => T.forEach((q) => V.push(q))); let tj = 0;
    tris.forEach((T) => { for (let k = 0; k < 3; k++) { const a = T[k], b = T[(k + 1) % 3], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; if (L2 < 1e-10) continue;
      for (const q of V) { const aq = [q[0] - a[0], q[1] - a[1], q[2] - a[2]], tt = (aq[0] * ab[0] + aq[1] * ab[1] + aq[2] * ab[2]) / L2; if (tt <= 1e-4 || tt >= 1 - 1e-4) continue; const d2 = (aq[0] - tt * ab[0]) ** 2 + (aq[1] - tt * ab[1]) ** 2 + (aq[2] - tt * ab[2]) ** 2; if (d2 < 1e-10) { tj++; break; } } } });
    r[`joints (D74) · un mur percé d'une fenêtre (coupé à 1,60 m) est étanche : ${tris.length} triangles, ${tj} jonction(s) en T — plus de trait clair sous l'appui ni de façade zébrée`] = tris.length >= 20 && tj === 0 && !!S.murCoupe;
    return r; }));
  /* moins de mouvement (réglage du système) : ni transition, ni fondu */
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const rm = await p.evaluate(() => { if (v3.mode === "visite") { v3QuitterVisite(); } v3FinAnim(); v3EntrerVisite(v3PlusGrande(0).roomId); const a = !!v3.anim; v3QuitterVisite(); const b = !!v3.anim; v3ChoisirVue("existant"); const im = document.querySelector("#v3 img.v3fondu"), f = !!im && im.classList.contains("va") && getComputedStyle(im).animationName !== "none"; v3ChoisirVue("final"); return { a, b, f }; });
  t["transitions (D74) · « moins de mouvement » : ni glissement de caméra ni fondu"] = !rm.a && !rm.b && !rm.f;
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p.close();
}
if (reseau) {
  /* 11b · la maison de 120 m² (Plan final) : l'étage vu de la visite du RDC, la trémie, son garde-corps, le plancher ; à 1 024 px */
  const p = await onglet({ largeur: 1024, hauteur: 768 });
  await p.evaluate(MESURES); await p.evaluate(PIX);
  await p.evaluate((S) => { (0, eval)("(" + S + ")")(); closeModal(); sel = null; render(); }, SCENE_PF);
  await p.click("#v3Btn"); await attendre3D(p);
  const z0 = await p.evaluate(() => __boiteDansZone());
  t[`cadrage (D74) · à 1 024 px, la maison entière tient dans la scène, sous la barre (dépassement ${z0.pire} px)`] = z0.ok;
  Object.assign(t, await p.evaluate(() => { const r = {}, lv0 = state.levels[0], esc = lv0.items.find((i) => i.type === "escalier"), G = stairGeom(esc, lv0), ra = G.rects[0], c = Math.cos(esc.rot || 0), s = Math.sin(esc.rot || 0), W = (x, y) => [esc.x + c * x - s * y, esc.y + s * x + c * y];
    v3ChoisirNiveau(1); v3Rafraichir(); const y1 = v3.altitudes[1], E = v3Etat();
    const ch = v3Viser([esc.x, y1 - 0.1, esc.y], [1, 0, 0], ["plancher", "mur", "sol"]);
    r[`plancher (D74) · l'étage a son plancher (${(y1 - v3.altitudes[0] - lv0.height).toFixed(2)} m), son chant au bord de la trémie (rayon : ${ch && ch.kind} à ${ch && ch.d.toFixed(3)} m)`] = E.dalles.length >= 1 && !!ch && ch.kind === "plancher" && Math.abs(ch.d - ra.w / 2) < 0.01;
    const arr = W(0, ra.y + 0.01), dep = W(0, ra.y + ra.h - 0.01), ha = v3Viser([arr[0], y1 + 1.15, arr[1]], [0, -1, 0], ["gardecorps", "escalier", "sol"]), hd = v3Viser([dep[0], y1 + 1.15, dep[1]], [0, -1, 0], ["gardecorps", "escalier", "sol"]);
    r[`garde-corps (D74) · la trémie a son garde-corps de 1,00 m (${E.gardecorps.length && E.gardecorps[0].cotes} côtés), ouvert à l'arrivée de la volée`] = E.gardecorps.length === 1 && !!hd && hd.kind === "gardecorps" && Math.abs(hd.p[1] - (y1 + 0.012 + 1.0)) < 0.005 && (!ha || ha.kind !== "gardecorps");
    v3ChoisirNiveau(0); return r; }));
  /* la visite du RDC : l'étage par la trémie, la volée entière */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv0 = state.levels[0], esc = lv0.items.find((i) => i.type === "escalier"); v3EntrerVisite(v3PlusGrande(0).roomId); v3FinAnim();
    const E = v3Etat(), haut = v3.groupe.children.find((g) => g.userData.niveau === 1), y1 = v3.altitudes[1];
    /* un regard qui monte le long de la trémie, depuis son départ, vers le mur nord de l'étage */
    const G = stairGeom(esc, lv0), ra = G.rects[0], c = Math.cos(esc.rot || 0), s = Math.sin(esc.rot || 0), O = [esc.x + (-s) * (ra.y + ra.h + 0.35), 1.6, esc.y + c * (ra.y + ra.h + 0.35)], Cb = [esc.x + (-s) * (ra.y - 2.5), y1 + 0.8, esc.y + c * (ra.y - 2.5)];
    const hc = v3Viser([esc.x, y1 - 0.1, esc.y], [1, 0, 0], ["plancher"]), hm = v3Viser(O, [Cb[0] - O[0], Cb[1] - O[1], Cb[2] - O[2]]);
    const cs = v3.coupe; v3.coupe = 99; const S = __escalier(lv0, 0, esc); v3.coupe = cs; const der = S.n * S.hm, st = ra.h / ra.n, L1 = [esc.x + (-s) * (ra.y + st / 2), esc.y + c * (ra.y + st / 2)], hd = v3Viser([L1[0], 10, L1[1]], [0, -1, 0], ["escalier", "sol"]);
    r[`visite (D74) · au RDC, l'étage est posé au-dessus (plancher, chant de la trémie, bas de ses murs) : par la trémie on voit l'étage (${hm && hm.kind} niveau ${hm && hm.niveau})`] = !!haut && !!hc && !!hm && hm.niveau === 1;
    r[`visite (D74) · la volée monte entière jusqu'au plancher de l'étage : sa dernière marche à ${hd ? (hd.p[1] - 0.003).toFixed(3) : "?"} m (plus haut que le plafond, ${lv0.height} m)`] = der > lv0.height && !!hd && hd.kind === "escalier" && Math.abs(hd.p[1] - 0.003 - der) < 0.004 && S.vues >= S.n - 1;
    r["visite (D74) · ce qu'on ne peut atteindre ne coûte rien : les obstacles restent ceux du RDC"] = v3.obst.every((o) => !v3.registre.obstacles.some((q) => q.poly === o.poly && Math.abs(q.y0 - y1) < 1e-6));
    r["visite (D74) · l'escalier arrête le visiteur (ses volées comptent parmi les obstacles)"] = v3.meubles.some((o) => pointIn({ x: esc.x, y: esc.y }, o.poly));
    v3QuitterVisite(); v3FinAnim(); return r; }));
  /* les escaliers : la 2D et la 3D disent la même marche, quel que soit le type ; l'épaisseur de plancher de la fiche */
  Object.assign(t, await p.evaluate(() => { const r = {}, lv = state.levels[0], it = lv.items.find((x) => x.type === "escalier"), sv = JSON.stringify(it), out = [];
    for (const ty of ["droit", "quart", "demi", "helico"]) { it.stair = { ...(it.stair || {}), type: ty }; fitStair(it, lv); v3.sig = ""; v3Rafraichir(); const e = v3Etat().escaliers.find((x) => x.id === it.id), c = stairCalc(it, lv); out.push({ ty, d: Math.abs(e.hm - c.hM), n: c.n, m: e.marches + (e.palier ? 1 : 0) + 1 }); }
    r[`escalier (D74) · droit, quart tournant, demi-tour, hélicoïdal : la 3D monte les marches que la fiche annonce (${out.map((x) => x.ty + " " + x.n + "/" + x.m + " " + (x.d * 1000).toFixed(1) + " mm").join(", ")})`] = out.every((x) => x.d <= 0.002 && x.m === x.n);
    it.stair = { type: "droit", plancher: 0.3 }; fitStair(it, lv); v3.sig = ""; v3Rafraichir(); const a1 = v3.altitudes[1], e1 = v3Etat().escaliers.find((x) => x.id === it.id), c1 = stairCalc(it, lv);
    r[`plancher (D74) · l'épaisseur de plancher de la fiche de l'escalier (0,30 m) pose l'étage à ${a1.toFixed(2)} m ; la marche de la 3D est celle de la fiche (${(e1.hm * 100).toFixed(2)} cm)`] = Math.abs(a1 - (lv.height + 0.3)) < 1e-9 && Math.abs(e1.hm - c1.hM) <= 0.002;
    Object.assign(it, JSON.parse(sv)); if (!JSON.parse(sv).stair) delete it.stair; return r; }));
  await p.close();
}
if (reseau) {
  /* 11c · le plan réel : la toiture allumée ne fait pas sauter la barre ; elle recadre ; à 1 024 px */
  for (const [L_, H_] of [[1440, 900], [1024, 768]]) {
    const p = await onglet({ largeur: L_, hauteur: H_ });
    await p.evaluate(PIX);
    await p.evaluate((fix) => { closeModal(); state = fix; migrerEtat(state); state.levels.forEach(syncRooms); sel = null; render(); v3Ouvrir(); }, FIX);
    await attendre3D(p);
    const x0 = await p.evaluate(() => document.getElementById("v3Toit").getBoundingClientRect().left);
    await p.click("#v3Toit"); await wait(60); const an = await p.evaluate(() => !!v3.anim); await finAnim(p);
    const r2 = await p.evaluate(() => ({ x: document.getElementById("v3Toit").getBoundingClientRect().left, toit: !!v3Etat().toit, z: __boiteDansZone() }));
    t[`${L_} px · la toiture allumée : le bouton ne bouge pas sous le curseur (${Math.round(x0)} → ${Math.round(r2.x)} px), la vue se recadre en glissant, le toit entier sous la barre (dépassement ${r2.z.pire} px)`] = Math.abs(r2.x - x0) < 0.5 && r2.toit && an && r2.z.ok;
    await p.close();
  }
}
if (reseau) {
  /* 11d · la toiture d'une rénovation sur deux niveaux, l'étage plus petit : la partie basse ; puis l'ITE sous les pans (maison de 94 m²) */
  const p = await onglet();
  await p.evaluate(MESURES);
  await p.evaluate((S) => { (0, eval)("(" + S + ")")(); closeModal(); state.workflow = WORKFLOW_RENO; state.toiture = toitureDefaults(); const et = state.levels[1]; et.walls = [[0, 0, 7, 0], [7, 0, 7, 10], [7, 10, 0, 10], [0, 10, 0, 0]].map(([a, b2, c, d]) => ({ id: uid(), a: v(a, b2), b: v(c, d), type: "mur" })); state.cur = 0; afterChange(); render(); v3Ouvrir(); }, SCENE_PF);
  await attendre3D(p);
  Object.assign(t, await p.evaluate(() => { const r = {}; v3ChoisirNiveau(1); v3ChoisirToit(); v3FinAnim(); const E = v3Etat(), base = v3.altitudes[1] - V3_JOINT;
    /* 15 cm devant la façade ouest de l'étage, alignée sur celle du RDC : aucun toit à 2,70 m (le débord du toit, plus haut, si) */
    const f = v3Viser([-0.25, 9, 5], [0, -1, 0], ["toit"]), g = v3Viser([-0.25, base + 0.5, 5], [0, -1, 0], ["toit"]), a = v3Viser([9.5, 9, 5], [0, -1, 0], ["toit"]);
    r[`toiture (D74) · une partie basse : plus de bandeau de tuiles au pied d'une façade d'étage alignée sur le RDC (sous le débord du toit : ${g ? g.cle + " à " + g.p[1].toFixed(2) : "rien"})`] = !!E.toit && E.toit.parties === 1 && !g && !!f && f.p[1] > base + 1;
    r[`toiture (D74) · la partie basse en appentis, adossé à l'étage, dans la couverture du toit (${a && a.cle}, pente ${E.toit.pente3d}°)`] = !!a && a.cle === "toit:tuile" && a.p[1] > base + 0.2 && E.toit.appentis >= 1;
    state.levels[0].toit = { forme: "plat" }; v3.sig = ""; v3Rafraichir(); const pl = v3Viser([9.5, 9, 5], [0, -1, 0], ["toit"]);
    r[`toiture (D74) · une partie basse plate est en étanchéité, jamais en tuiles posées à plat (${pl && pl.cle})`] = !!pl && pl.cle === "toit:plat";
    return r; }));
  await p.close();
  const q = await onglet();
  await q.evaluate(() => { closeModal(); loadTemplate("maison", WORKFLOW_RENO); closeModal(); state.toiture = toitureDefaults(); const lv = L();
    lv.walls.forEach((w) => { if (isVirtual(w) || !isExteriorWall(w, lv)) return; w.isos = [{ id: uid(), e: 0.13, mat: DBL_CFG.mat, mode: "ite", sys: "enduit", side: -interiorSideN(w), t0: 0, t1: 1, st: "creer" }]; });
    afterChange(); render(); v3Ouvrir(); });
  await attendre3D(q);
  Object.assign(t, await q.evaluate(() => { const r = {}; v3ChoisirToit(); v3FinAnim(); const F = v3.toitF, G = F.G, R = G.R, X = G.dir === "x", dt = 0.14;
    const O = X ? [R.x0 - 3, F.base + 0.4, (R.y0 + R.y1) / 2] : [(R.x0 + R.x1) / 2, F.base + 0.4, R.y0 - 3], h = v3Viser(O, X ? [1, 0, 0] : [0, 0, 1]);
    r[`toiture (D74) · l'ITE monte avec le pignon jusque sous les pans (rayon à 40 cm au-dessus des murs : ${h && h.kind} à ${h && h.d.toFixed(3)} m)`] = !!h && h.kind === "doublage" && Math.abs(h.d - (3 - dt)) < 0.01 && v3Etat().toit.ite >= 2;
    const eg = X ? { x: (R.x0 + R.x1) / 2, y: R.y0 - dt / 2 } : { x: R.x0 - dt / 2, y: (R.y0 + R.y1) / 2 }, hi = v3Viser([eg.x, F.base + 3, eg.y], [0, -1, 0], ["doublage"]);
    r[`toiture (D74) · à l'égout, l'ITE s'arrête sous le dessous du toit (${hi && hi.p[1].toFixed(3)} m pour ${F.zb([eg.x, eg.y]).toFixed(3)})`] = !!hi && hi.p[1] <= F.zb([eg.x, eg.y]) + 1e-3;
    return r; }));
  await q.close();
}
if (reseau) {
  /* 11e · le retour d'isolant, le recouvrement en applique ; la hauteur sous plafond d'une pièce */
  const p = await onglet();
  await p.evaluate(() => { closeModal(); state = blankState(); state.workflow = WORKFLOW_RENO; const lv = L(); lv.height = 2.5;
    const W = (a, c) => { const x = { id: uid(), a: v(...a), b: v(...c), type: "mur", t: 0.2 }; lv.walls.push(x); return x; };
    const s = W([0, 0], [8, 0]), e = W([8, 0], [8, 5]), n = W([8, 5], [0, 5]), o = W([0, 5], [0, 0]); afterChange();
    [s, e, n, o].forEach((w) => { w.isos = [{ id: uid(), e: 0.11, mat: DBL_CFG.mat, mode: "iti", sys: "ossature", side: interiorSideN(w), t0: 0, t1: 1 }]; });
    const O = (w, t, type, ex) => { const d = OPENINGS[type]; lv.openings.push({ id: uid(), wallId: w.id, t, type, w: d.w, h: d.h, side: 1, hinge: 1, ...ex }); };
    O(s, 0.2, "fenetre", { pose: "applique" }); O(s, 0.7, "fenetre", { pose: "tunnel", retour: [interiorSideN(s)] }); afterChange(); render(); v3Ouvrir(); });
  await attendre3D(p);
  Object.assign(t, await p.evaluate(() => { const r = {}; v3ChoisirCoupe(9); v3Rafraichir(); const E = v3Etat(), lv = L(), s = lv.walls[0], u = norm(sub(s.b, s.a)), n = perp(u), si = interiorSideN(s);
    const o = lv.openings[1], sc = o.t * wallLen(s), hw = o.w / 2, R0 = E.retours[0], L_ = R0 && R0.L[0], dt = doublageOf(s.isos[0]);
    const P = add(add(s.a, mul(u, sc + hw - L_ / 2)), mul(n, si * 0.5)), h = v3Viser([P.x, 1.4, P.y], [-si * n.x, 0, -si * n.y], ["mur", "doublage", "menuiserie"]);
    const Pm = add(add(s.a, mul(u, sc)), mul(n, si * 0.5)), hm = v3Viser([Pm.x, 1.4, Pm.y], [-si * n.x, 0, -si * n.y], ["mur", "doublage"]);
    r[`retour d'isolant (D74) · choisi dans le tableau, il y est : un rayon dans le jambage, à ${(hw - L_ / 2).toFixed(2)} m de l'axe, bute sur le doublage (${h && h.kind}, ${L_} m de large) ; le milieu reste ouvert`] = !!R0 && R0.cotes.length === 1 && Math.abs(L_ - Math.min(dt, hw - 0.02)) < 1e-3 && !!h && h.kind === "doublage" && Math.abs(h.d - (0.5 - 0.1 - dt)) < 0.01 && (!hm || hm.d > 0.5 + 0.1);
    const o0 = lv.openings[0], sc0 = o0.t * wallLen(s), P0 = add(add(s.a, mul(u, sc0 + o0.w / 2 + 0.025)), mul(n, si * 0.5)), h0 = v3Viser([P0.x, 1.4, P0.y], [-si * n.x, 0, -si * n.y], ["mur", "doublage", "menuiserie"]);
    r[`menuiserie (D74) · en applique, le dormant garde son recouvrement de la 2D, doublage ou non : à 2,5 cm du tableau, il est là (${h0 && h0.kind} à ${h0 && (0.5 - h0.d).toFixed(3)} m de l'axe)`] = !!h0 && h0.kind === "menuiserie" && 0.5 - h0.d >= 0.1 - 1e-3 && 0.5 - h0.d <= 0.1 + dt + 0.01;
    return r; }));
  await p.close();
  const q = await onglet();
  await q.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); const lv = L(), f = facesFor(lv, "final").find((x) => x.room && x.room.type === "sejour"); f.room.height = 3.2; afterChange(); render(); v3Ouvrir(); });
  await attendre3D(q);
  Object.assign(t, await q.evaluate(() => { const r = {}, lv = L(), f = facesFor(lv, "final").find((x) => x.room && x.room.type === "sejour"), max = +document.getElementById("v3Coupe").max;
    v3ChoisirCoupe(9); v3Rafraichir(); const ws = new Set((f.edges || []).map((e) => e.wall)), murs = v3Etat().murs.filter((m) => ws.has(m.id)), autres = v3Etat().murs.filter((m) => !ws.has(m.id) && !lv.walls.find((w) => w.id === m.id && facesFor(lv, "final").some((g) => g.room && g.room.height > 2.6 && (g.edges || []).some((e) => e.wall === w.id))));
    v3EntrerVisite(f.room.id); v3FinAnim(); const V = v3.vis, up = v3Viser([V.x, 1.6, V.z], [0, 1, 0], ["plafond"]); v3QuitterVisite(); v3FinAnim();
    r[`hauteur (D74) · une pièce à 3,20 m dans un niveau à 2,50 m : ses murs montent à 3,20 m (${murs.length}), les autres restent à 2,50 m ; son plafond de visite à ${up && up.p[1].toFixed(2)} m ; la coupe va jusqu'à ${max} m`] = max === 3.2 && murs.length >= 3 && murs.every((m) => Math.abs(m.haut - 3.2) < 1e-9) && autres.length >= 1 && autres.every((m) => Math.abs(m.haut - 2.5) < 1e-9) && !!up && Math.abs(up.p[1] - 3.2) < 1e-3;
    return r; }));
  await q.close();
}
{
  /* 11f · le plan vide : que faire ; et la 3D proposée une fois au chargement d'un plan type */
  const p = await onglet();
  await p.evaluate(() => { closeModal(); render(); }); await p.click("#v3Btn");
  if (reseau) {
    await p.waitForFunction(() => v3.etat === "vide", { timeout: 60000 });
    const r = await p.evaluate(() => ({ B: [...document.querySelectorAll("#v3Msg button")].map((x) => x.textContent.trim()), visite: !!document.getElementById("v3Visite"), coupe: !!document.getElementById("v3Coupe"), data: document.getElementById("v3").dataset.etat }));
    t[`plan vide (D74) · « Rien à montrer en 3D » propose « Tracer les murs » et « Partir d'un plan type » ; ni Visite ni coupe (${r.B.join(", ")})`] = JSON.stringify(r.B) === JSON.stringify(["Tracer les murs", "Partir d'un plan type"]) && !r.visite && !r.coupe && r.data === "vide";
    await p.evaluate(() => [...document.querySelectorAll("#v3Msg button")][0].click()); await wait(150);
    t["plan vide (D74) · « Tracer les murs » rend le plan, l'outil Murs pris"] = await p.evaluate(() => !v3.ouvert && tool === "mur");
  }
  await p.evaluate(() => { setTool("select"); loadTemplate("t2", WORKFLOW_FINAL); }); await wait(150);
  const a1 = await p.evaluate(() => { const b = [...document.querySelectorAll("#toast .tact")].find((x) => /Voir en 3D/.test(x.textContent)); return { b: !!b }; });
  await p.evaluate(() => { closeModal(); state = blankState(); render(); loadTemplate("maison", WORKFLOW_FINAL); }); await wait(150);
  const a2 = await p.evaluate(() => ({ b: [...document.querySelectorAll("#toast .tact")].some((x) => /Voir en 3D/.test(x.textContent)) }));
  t["annonce (D74) · une fois, au chargement d'un plan type, le message propose « Voir en 3D » — pas la fois suivante"] = a1.b && !a2.b;
  await p.close();
}

let ko = 0;
for (const [k, ok] of Object.entries(t)) { if (!ok) ko++; console.log((ok ? "  ok   " : "  ECHEC ") + k); }
console.log(`${Object.keys(t).length - ko}/${Object.keys(t).length} contrôles verts` + (reseau ? "" : " · AVERTISSEMENT : sans réseau, la géométrie 3D n'a pas été contrôlée") + (errs.length ? ` · erreurs de page : ${[...new Set(errs)].join(" | ")}` : ""));
await b.close();
process.exit(ko || errs.length ? 1 : 0);
