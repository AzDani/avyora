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
  /* une ouverture : trou au centre, bords pleins juste à côté, allège et linteau pleins ; rayon horizontal à travers le mur */
  window.__trou = (lv, i, o, vue) => {
    const w = lv.walls.find((x) => x.id === o.wallId), H = lv.height || 2.5, Y0 = v3.altitudes[i], d = OPENINGS[o.type];
    const t = wallT(w), u = norm(sub(w.b, w.a)), n = perp(u), off = wallOff(w), Lw = wallLen(w);
    const z0 = Math.max(0, allegeOf(o) || 0), z1 = Math.min(H, z0 + (o.h || d.h)), hw = (o.w || d.w) / 2, sc = o.t * Lw;
    const top = Math.min(v3.coupe, H), D = t / 2 + 0.35;
    const tir = (s, z) => { const P = add(add(w.a, off), mul(u, s)), O = add(P, mul(n, D)); const h = v3Viser([O.x, Y0 + z, O.y], [-n.x, 0, -n.y]); return h ? h.d : Infinity; };
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
      const P = add(add(w.a, off), mul(u, s)); const h = v3Viser([P.x, Y0 + 40, P.y], [0, -1, 0]); return h ? { y: h.p[1] - Y0, kind: h.kind, cle: h.cle, niveau: h.niveau } : { y: null }; }
    return null;
  };
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
      const faces = facesFor(lv, "final").filter((f) => f.room), S = faces.map((f) => { const h = v3Viser([f.label.x, 30, f.label.y], [0, -1, 0]), s = v3Etat().sols.find((q) => q.roomId === f.room.id);
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
      const h = v3Viser([O.x, z, O.y], [-n.x, 0, -n.y]);
      const avant = { mur: v3Etat().murs.some((m) => m.id === dem.id), trou: v3Etat().trous.some((x) => x.id === cre.id), plein: !!h && h.d <= 0.351, vue: v3.vue, btn: document.querySelector("#v3Barre .v3grp button[aria-pressed=true]")?.textContent };
      r["phases · Après travaux : le mur démoli n'est plus là, la fenêtre créée est percée (rayon)"] = !!dem && !!cre && !apres.mur && apres.trou && apres.mesure.vu && !apres.mesure.ko.length;
      r["phases · Avant travaux : le mur démoli est debout, le mur de la fenêtre à créer est plein (rayon)"] = avant.mur && !avant.trou && avant.plein && avant.vue === "existant" && avant.btn === LEX.vue.existant;
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
    const f1 = facesFor(lv1, "existant").find((f) => f.room), h = v3Viser([f1.label.x + 2.5, 30, f1.label.y - 2], [0, -1, 0]);
    r["niveaux · le sol de l'étage est à sa hauteur (rayon)"] = !!h && h.kind === "sol" && h.niveau === 1 && Math.abs(h.p[1] - (Y1 + 0.012)) < 0.002;
    const esc2 = lv0.items.find((i) => i.type === "escalier"), ht = v3Viser([esc2.x, 30, esc2.y], [0, -1, 0]);
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
    return r; }));
  await p.keyboard.press("Escape"); await wait(150);
  t["plan réel · intact après la 3D"] = await p.evaluate((av) => JSON.stringify(state) === av.json && empreinte(state) === av.emp, avant);
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
