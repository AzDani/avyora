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
 *     choisi dans la colonne ; au téléphone, pas de 3D ; Suppr en 3D ne touche pas le plan caché ;
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

async function onglet({ largeur = 1440, hauteur = 900, pro = true, bloquerCDN = false, requetes = null } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  if (requetes) p.on("request", (r) => requetes.push(r.url()));
  if (bloquerCDN) { await p.setRequestInterception(true); p.on("request", (r) => (CDN.test(r.url()) ? r.abort("internetdisconnected") : r.continue())); }
  await p.setViewport({ width: largeur, height: hauteur });
  await p.evaluateOnNewDocument((pro) => { try { if (sessionStorage.getItem("v3-semee")) return; sessionStorage.setItem("v3-semee", "1"); localStorage.clear(); if (!pro) localStorage.setItem("avyora-plan-pro", "0");
    localStorage.setItem("avyora-plan-welcome", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); localStorage.setItem("avyora-plan-projet-tip", "1"); } catch {} }, pro);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(300);
  return p;
}
/* attend la 3D prête ; renvoie 'pret', 'reseau' ou 'webgl' */
const attendre3D = (p) => p.waitForFunction(() => (v3Etat().pret && v3.etat !== "charge") || v3.etat === "reseau" || v3.etat === "webgl", { timeout: 60000 }).then(() => p.evaluate(() => (v3.etat === "reseau" || v3.etat === "webgl" ? v3.etat : "pret")));

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
      r["ouverture · la 3D couvre la zone du plan ; colonne d'outils, barre du haut et panneau restent"] = !document.getElementById("v3").hidden && document.getElementById("stage").contains(document.getElementById("v3")) && getComputedStyle(document.getElementById("v3")).position === "absolute" && document.getElementById("tools").getClientRects().length > 0 && document.getElementById("panel").getClientRects().length > 0;
      r["ouverture · le bouton dit « Retour au plan », enfoncé ; niveaux et vues de la 2D masqués pendant la 3D"] = document.getElementById("v3Btn").getAttribute("aria-pressed") === "true" && /Retour au plan/.test(document.getElementById("v3Btn").dataset.tip) && !document.querySelector("#modes button")?.getClientRects().length;
      r["rénovation · « Après travaux » par défaut, même quand la 2D est en vue Travaux"] = E.vue === "final" && mode() === "projet";
      const B = [...document.querySelectorAll("#v3Barre button")].map((x) => x.textContent.trim());
      r[`rénovation · la barre : Retour au plan, Avant travaux / Après travaux (LEX), la coupe — pas de niveaux pour un plan d'un niveau (${B.join(" · ")})`] = B[0] === "Retour au plan" && B.includes(LEX.vue.existant) && B.includes(LEX.vue.final) && !!document.getElementById("v3Coupe") && B.length === 3;
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
      const avant = { mur: v3Etat().murs.some((m) => m.id === dem.id), trou: v3Etat().trous.some((x) => x.id === cre.id), plein: !!h && h.d <= 0.351, vue: v3.vue, btn: document.querySelector("#v3Barre .v3grp button[aria-pressed=true]")?.textContent };
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
    const ap = await p.evaluate(() => ({ on: document.body.classList.contains("v3on"), v3: document.getElementById("v3").hidden, json: JSON.stringify(state), emp: empreinte(state), pressed: document.getElementById("v3Btn").getAttribute("aria-pressed"), modes: !!document.querySelector("#modes button")?.getClientRects().length }));
    t["fermeture · Échap rend le plan : bouton relâché, vues de la 2D revenues"] = !ap.on && ap.v3 && ap.pressed === "false" && ap.modes;
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
    const B = [...document.querySelectorAll("#v3Barre button")].map((x) => x.textContent.trim());
    r[`Plan final · la vue est le plan tel quel ; la barre : Retour au plan, les niveaux, la coupe — ni avant ni après (${B.join(" · ")})`] = E.vue === "existant" && JSON.stringify(B) === JSON.stringify(["Retour au plan", "RDC", "Étage"]) && !!document.getElementById("v3Coupe");
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

/* ═════════ 5. Le téléphone : pas de 3D (consultation) ═════════ */
{ const p = await onglet({ largeur: 390, hauteur: 844, pro: true });
  const r = await p.evaluate(() => { closeModal(); loadSample(); closeModal(); render(); const b = document.getElementById("v3Btn"); return { vis: !!b && b.getClientRects().length > 0 }; });
  await p.evaluate(() => cv.focus()); await p.keyboard.press("3"); await wait(200);
  t["téléphone · ni bouton 3D, ni touche 3 (la 3D reste sur ordinateur et tablette)"] = !r.vis && await p.evaluate(() => !v3.ouvert);
  await p.close();
}

let ko = 0;
for (const [k, ok] of Object.entries(t)) { if (!ok) ko++; console.log((ok ? "  ok   " : "  ECHEC ") + k); }
console.log(`${Object.keys(t).length - ko}/${Object.keys(t).length} contrôles verts` + (reseau ? "" : " · AVERTISSEMENT : sans réseau, la géométrie 3D n'a pas été contrôlée") + (errs.length ? ` · erreurs de page : ${[...new Set(errs)].join(" | ")}` : ""));
await b.close();
process.exit(ko || errs.length ? 1 : 0);
