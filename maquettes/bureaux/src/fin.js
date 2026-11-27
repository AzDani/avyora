/* ───────────────────────── Caméra : déplacer, tourner, zoomer, voler vers une pièce ───────────────────────── */
let vol = null, choisie = null, survol = null;
const ENSEMBLE = { cible: new THREE.Vector3(1.6, 0, 3.2), az: Math.PI / 4, el: 0.6 };   // (l'étage s'est agrandi vers l'avant et la droite : accueil en porte-à-faux, balcon)
function tailleEnsemble() { const a = boite.clientWidth / Math.max(1, boite.clientHeight); return Math.max(33, 63 / a); }
function direction(az, el) { return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); }
function poser() {
  const w = boite.clientWidth, h = boite.clientHeight; camera.aspect = w / Math.max(1, h);
  camera.position.copy(vue.cible).addScaledVector(direction(vue.az, vue.el), vue.taille / (2 * TAN)); camera.lookAt(vue.cible); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function axes() { const e = camera.matrixWorld.elements; return { d: new THREE.Vector3(e[0], 0, e[2]).normalize(), h: new THREE.Vector3(e[4], 0, e[6]) }; }
function voler(cible, taille, az, el, duree) {
  az = az == null ? vue.az : az; el = el == null ? vue.el : el;
  if (calme) { vue.cible.copy(cible); vue.taille = taille; vue.az = az; vue.el = el; vol = null; return; }
  vol = { t0: performance.now(), duree: duree || 1100, c0: vue.cible.clone(), c1: cible.clone(), s0: vue.taille, s1: taille, az0: vue.az, az1: az, el0: vue.el, el1: el };
}
function versPiece(p) {
  const taille = Math.max(13, Math.max(p.x1 - p.x0, p.z1 - p.z0) * 1.45), c = new THREE.Vector3(p.cx, 0, p.cz), a = axes();
  if (boite.clientWidth > 760) c.addScaledVector(a.d, -170 * taille / boite.clientHeight);                      // laisse la place du panneau, à gauche
  else if (a.h.length() > 0.05) c.addScaledVector(a.h.clone().normalize(), -boite.clientHeight * 0.2 * taille / boite.clientHeight / a.h.length());
  voler(c, taille, null, 0.68);
}
function versEnsemble() { voler(ENSEMBLE.cible, tailleEnsemble(), ENSEMBLE.az, ENSEMBLE.el); }
function versMiami() { choisir(null); voler(new THREE.Vector3(0, -22, 0), 300, vue.az + 0.7, 0.17, 2600); }

INTERFACE_ICI

/* Souris, doigt, molette. Glisser déplace ; clic droit ou Maj + glisser tourne la vue. */
const rayon = new THREE.Raycaster(), souris = new THREE.Vector2(), doigts = new Map();
let appui = null, ecart = 0;
function viser(e) { const r = canvas.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); rayon.setFromCamera(souris, camera); const t = rayon.intersectObjects(sols, false)[0]; return t ? t.object.userData.piece : null; }
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); doigts.set(e.pointerId, { x: e.clientX, y: e.clientY }); appui = { bouge: 0, tourne: e.button === 2 || e.shiftKey }; if (doigts.size === 2) { const [a, b] = [...doigts.values()]; ecart = Math.hypot(a.x - b.x, a.y - b.y); } canvas.classList.add("tire"); });
canvas.addEventListener("pointermove", (e) => {
  if (!doigts.has(e.pointerId)) { const p = viser(e); if (p !== survol) { survol = p; canvas.style.cursor = p ? "pointer" : ""; } return; }
  const avant = doigts.get(e.pointerId), dx = e.clientX - avant.x, dy = e.clientY - avant.y; doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (doigts.size === 2) { const [a, b] = [...doigts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (ecart) vue.taille = Math.min(520, Math.max(8, vue.taille * ecart / d)); ecart = d; vol = null; return; }
  if (appui) appui.bouge += Math.abs(dx) + Math.abs(dy); vol = null;
  if (appui && appui.tourne) { vue.az -= dx * 0.006; vue.el = Math.min(1.4, Math.max(0.1, vue.el + dy * 0.005)); return; }
  const k = vue.taille / boite.clientHeight, a = axes(), L = Math.max(0.25, a.h.length());
  vue.cible.addScaledVector(a.d, -dx * k).addScaledVector(a.h.clone().normalize(), dy * k / L);
  vue.cible.x = Math.max(-60, Math.min(60, vue.cible.x)); vue.cible.z = Math.max(-50, Math.min(50, vue.cible.z));
});
function lacher(e) { const etait = appui; doigts.delete(e.pointerId); if (doigts.size < 2) ecart = 0; if (!doigts.size) { canvas.classList.remove("tire"); appui = null; if (etait && etait.bouge < 6 && !etait.tourne && e.type === "pointerup") { const p = viser(e); if (p) choisir(p); } } }
canvas.addEventListener("pointerup", lacher); canvas.addEventListener("pointercancel", lacher);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); vol = null; vue.taille = Math.min(520, Math.max(8, vue.taille * (e.deltaY > 0 ? 1.1 : 1 / 1.1))); }, { passive: false });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && choisie) choisir(null); });
document.getElementById("miami").onclick = versMiami;

/* Paramètres d'essai, pour les captures de contrôle (sans effet dans l'artefact publié, qui n'a pas de paramètres) :
   ?theme=jour|nuit   ?vue=ensemble|miami|<id d'une pièce>   ?nu=1 (sans panneaux ni étiquettes) */
const ESSAI = new URLSearchParams(location.search);
if (ESSAI.get("theme")) document.documentElement.setAttribute("data-theme", ESSAI.get("theme") === "nuit" ? "dark" : "light");
if (ESSAI.get("nu")) { for (const id of ["etiquettes", "priorites", "aide"]) document.getElementById(id).style.display = "none"; }

/* Le thème : fin de journée en clair, nuit en sombre */
function theme() {
  const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim() || "#f5f6fb";
  ambiance(new THREE.Color(fond).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4 ? "nuit" : "jour");
}
new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

/* ───────────────────────── La boucle ───────────────────────── */
function taille() { const w = boite.clientWidth, h = boite.clientHeight; renderer.setPixelRatio(finesse(w, h)); renderer.setSize(w, h, false); }
new ResizeObserver(taille).observe(boite);
const v3 = new THREE.Vector3();
let dernier = performance.now(), images = 0;
function image(t) {
  requestAnimationFrame(image);
  const dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
  if (vol) { const u = Math.min(1, (t - vol.t0) / vol.duree), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    vue.cible.lerpVectors(vol.c0, vol.c1, e); vue.taille = vol.s0 + (vol.s1 - vol.s0) * e; vue.az = vol.az0 + (vol.az1 - vol.az0) * e; vue.el = vol.el0 + (vol.el1 - vol.el0) * e; if (u >= 1) vol = null; }
  poser();
  majGens(dt);                                                               // les personnages (partie_gens / partie_deplacements)
  if (typeof majVille === "function") majVille(dt, t);                       // la circulation, les bateaux, l'eau (partie_ville)
  const loin = vue.taille > 110;
  for (const p of PIECES) {                                                   // le ruban d'une pièce à traiter respire ; la pièce choisie ou survolée s'éclaire
    if (p.etat === "critique" && !calme) p.lisere.material.color.setHex(COULEUR_ETAT.critique).multiplyScalar(0.7 + 0.3 * Math.sin(t / 260));
    p.matSol.emissive.setHex(p === choisie ? 0x1b1a44 : p === survol ? 0x0f0e2a : 0x000000);
    v3.set(p.cx, 2.7, p.cz).project(camera);
    const cache = loin || v3.z > 1; if (p.etq.hidden !== cache) p.etq.hidden = cache;
    if (!cache) { p.etq.style.left = ((v3.x * 0.5 + 0.5) * boite.clientWidth).toFixed(1) + "px"; p.etq.style.top = ((-v3.y * 0.5 + 0.5) * boite.clientHeight).toFixed(1) + "px"; }
  }
  renderer.render(scene, camera);
  if (++images === 40) { window.__pret = true; const i = renderer.info; window.__mesure = "tracés " + i.render.calls + " · triangles " + i.render.triangles; }
}
taille(); theme();
document.getElementById("chargement").hidden = true;
const fige = () => { if (vol) { vue.cible.copy(vol.c1); vue.taille = vol.s1; vue.az = vol.az1; vue.el = vol.el1; vol = null; } };
if (ESSAI.get("vue")) {                                                      // une vue d'essai : pas d'arrivée animée
  vue.taille = tailleEnsemble(); const v = ESSAI.get("vue");
  if (v === "miami") { versMiami(); fige(); } else if (parId[v]) { poser(); choisir(parId[v]); fige(); if (ESSAI.get("nu")) panneau.hidden = true; }
}
if (ESSAI.get("cam")) { const c = ESSAI.get("cam").split(",").map(Number); vue.cible.set(c[0], c[1] || 0, c[2]); vue.taille = c[3] || 6; if (c.length > 4) vue.az = c[4]; if (c.length > 5) vue.el = c[5]; vol = null; panneau.hidden = true; }   // ?cam=x,y,z,taille,az,el : un gros plan d'essai
else if (ESSAI.get("vue")) { }
else if (calme) { vue.taille = tailleEnsemble(); }
else { Object.assign(vue, { taille: 380, az: Math.PI / 4 + 1.0, el: 0.15 }); vue.cible.set(0, -26, 0); voler(ENSEMBLE.cible, tailleEnsemble(), ENSEMBLE.az, ENSEMBLE.el, 3600); }   // l'arrivée : on survole Miami, puis on descend sur l'étage
requestAnimationFrame(image);
