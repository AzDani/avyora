/* ───────────────────────── La scène : le 25e étage d'une tour, à Miami ───────────────────────── */
const canvas = document.getElementById("c"), boite = document.getElementById("scene");
const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
/* La finesse du rendu : au plus 1,5 pixel par point, et au plus ~3,7 millions de pixels dessinés. En pleine fenêtre sur un grand écran
   Retina, la densité native (×2) faisait dessiner 4 fois plus de pixels que dans l'aperçu : la carte graphique pouvait lâcher (27/11/2026). */
const PIXELS_MAX = 3.7e6;
function finesse(w, h) { return Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(PIXELS_MAX / Math.max(1, w * h)))); }
renderer.setPixelRatio(finesse(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight));
/* Si la 3D s'arrête (carte graphique saturée, erreur en cours de route), on le DIT à l'écran au lieu de laisser une image figée. */
function panne(texte) {
  if (document.getElementById("panne")) return;
  const d = document.createElement("div"); d.id = "panne"; d.className = "panne"; d.setAttribute("role", "alert");
  d.innerHTML = "<p></p><button type=\"button\">Recharger</button>"; d.querySelector("p").textContent = texte; d.querySelector("button").onclick = () => location.reload();
  (document.getElementById("scene") || document.body).appendChild(d); window.__erreur = window.__erreur || texte;
}
canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); panne("La 3D s'est arrêtée : la carte graphique de cet ordinateur a été saturée. Ferme d'autres onglets lourds, puis recharge."); });
window.addEventListener("error", (e) => { if (document.getElementById("chargement").hidden) panne("La 3D s'est arrêtée sur une erreur : " + (e.message || "inconnue")); });
window.addEventListener("unhandledrejection", (e) => { if (document.getElementById("chargement").hidden) panne("La 3D s'est arrêtée sur une erreur : " + String(e.reason && e.reason.message || e.reason)); });
/* Le rendu. Les ombres en « PCFSoft » : des bords lissés, sans les hachures que donnait le mode au flou réglable. La courbe « ACES » donne
   des blancs qui ne brûlent pas ; l'exposition est fixée par l'ambiance (voir « Le ciel »). */
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
const ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
const TAN = Math.tan(Math.PI / 12);                                       // demi-angle de la caméra (15°)
const ETAGE = 88;                                                          // hauteur de l'étage au-dessus de la rue
const SOL = -ETAGE;                                                        // le niveau de la rue (l'étage est à y = 0)
const vue = { cible: new THREE.Vector3(0, 0, 1.5), taille: 40, az: Math.PI / 4, el: 0.6 };

/* ── Les lumières. Leurs couleurs et leurs forces sont réglées par l'ambiance (jour ou nuit) : voir AMBIANCES dans « Le ciel ». ──
   hemi   : un léger rebond du sol (le gros de la lumière d'ambiance vient du vrai ciel photographié) ;
   soleil : la seule lumière qui porte des ombres. Sa zone d'ombre est recadrée sur l'étage à chaque changement d'ambiance (cadrerOmbres) ;
   lampes : une lampe chaude au-dessus de chaque pièce, allumée la nuit seulement (éteinte, elle ne coûte rien). */
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0xd9b48a, 0.2); scene.add(hemi);
const soleil = new THREE.DirectionalLight(0xffd9a8, 1.5);
soleil.castShadow = true; soleil.shadow.mapSize.set(3072, 3072);                // (4096 : bords plus nets, plus cher ; 2048 : bords plus flous, moins cher)
Object.assign(soleil.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 200 });
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.025; scene.add(soleil); scene.add(soleil.target);
const ETAGE_OMBRES = { x0: -24, x1: 29.5, z0: -17, z1: 22.5, haut: 4.6 };      // tout ce qui doit recevoir ou porter une ombre tient dans cette boîte (les palmiers en pot montent à 4,4 m)
const LAMPE = { hauteur: 3.4, portee: 17, chute: 1.7 };                   // les lampes de la nuit : une flaque de lumière chaude par pièce
const lampes = [];
for (const [x, z] of [[-15, -10], [0, -10], [15, -10], [-13, 3], [10, 3], [-1, 15]]) {                // 6 grandes flaques de lumière au lieu d'une par pièce : deux fois moins de calcul la nuit
  const l = new THREE.PointLight(0xffc98a, 0, LAMPE.portee, LAMPE.chute); l.position.set(x, LAMPE.hauteur, z); l.visible = false; scene.add(l); lampes.push(l);
}

/* Hasard reproductible (la même ville à chaque ouverture) */
function alea(graine) { let s = graine >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* Les matières : des textures dessinées ici, sans rien télécharger */
function toile(w, h, dessin, repete) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; dessin(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = ANISO;
  if (repete !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function grain(c, w, h, n, a, r) { for (let i = 0; i < n; i++) { c.fillStyle = "rgba(" + (r() < 0.5 ? "0,0,0," : "255,255,255,") + (a * r()).toFixed(3) + ")"; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }
function texParquet(R, G, B, graine) {
  return toile(512, 512, (c, w, h) => {
    const r = alea(graine), lame = 32;
    for (let col = 0; col < w / lame; col++) { let y = -r() * 220;
      while (y < h) { const L = 150 + r() * 230, k = 0.84 + r() * 0.3; c.fillStyle = "rgb(" + (R * k | 0) + "," + (G * k | 0) + "," + (B * k | 0) + ")"; c.fillRect(col * lame, y, lame, L);
        for (let i = 0; i < 5; i++) { c.strokeStyle = "rgba(50,28,10," + (0.05 + r() * 0.09).toFixed(3) + ")"; c.lineWidth = 0.6 + r(); const gx = col * lame + r() * lame; c.beginPath(); c.moveTo(gx, y); c.bezierCurveTo(gx + r() * 8 - 4, y + L * 0.3, gx + r() * 8 - 4, y + L * 0.7, gx + r() * 6 - 3, y + L); c.stroke(); }
        c.strokeStyle = "rgba(30,16,6,.5)"; c.lineWidth = 1; c.strokeRect(col * lame + 0.5, y + 0.5, lame - 1, L - 1); y += L; } }
    grain(c, w, h, 2500, 0.05, r);
  });
}
function texMarbre(graine) {
  return toile(512, 512, (c, w, h) => { const r = alea(graine); c.fillStyle = "#e4dfd6"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { c.strokeStyle = "rgba(120,118,125," + (0.05 + r() * 0.16).toFixed(3) + ")"; c.lineWidth = 0.5 + r() * 2.4; c.shadowColor = "rgba(120,118,125,.35)"; c.shadowBlur = 6; let x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += r() * 190 - 95; y += r() * 190 - 60; c.lineTo(x, y); } c.stroke(); }
    c.shadowBlur = 0; c.strokeStyle = "rgba(90,90,100,.28)"; c.lineWidth = 1.5; for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(i * 256, 0); c.lineTo(i * 256, h); c.moveTo(0, i * 256); c.lineTo(w, i * 256); c.stroke(); }
    grain(c, w, h, 1500, 0.03, r); });
}
function texMoquette(R, G, B, graine) {
  return toile(256, 256, (c, w, h) => { const r = alea(graine); c.fillStyle = "rgb(" + R + "," + G + "," + B + ")"; c.fillRect(0, 0, w, h); grain(c, w, h, 9000, 0.14, r);
    c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 1.5; c.strokeRect(0.5, 0.5, w - 1, h - 1); });
}
function texBeton(ton, graine) {
  return toile(512, 512, (c, w, h) => { const r = alea(graine); c.fillStyle = ton; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.fillStyle = "rgba(" + (r() < 0.5 ? "255,255,255," : "0,0,0,") + (0.02 + r() * 0.04).toFixed(3) + ")"; c.beginPath(); c.ellipse(r() * w, r() * h, 30 + r() * 110, 20 + r() * 70, r() * 3, 0, 7); c.fill(); }
    grain(c, w, h, 5000, 0.06, r); c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1); });
}
function texBois(graine) { return texParquet(150, 102, 62, graine); }
function texEcran(graine) {
  return toile(256, 160, (c, w, h) => { const r = alea(graine); c.fillStyle = "#0f1230"; c.fillRect(0, 0, w, h); c.fillStyle = "#4f46e5"; c.fillRect(0, 0, w, 18);
    for (let i = 0; i < 4; i++) { c.fillStyle = ["#a78bfa", "#30a46c", "#f59e0b", "#60a5fa"][i]; c.fillRect(12 + i * 60, 30, 48, 30); }
    c.strokeStyle = "#8b85ff"; c.lineWidth = 3; c.beginPath(); for (let x = 12; x < w - 10; x += 14) c.lineTo(x, 130 - r() * 50); c.stroke();
    c.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 4; i++) c.fillRect(12, 76 + i * 9, 60 + r() * 120, 3); }, false);
}
const facadesAllumables = [];                                              // les façades dont les fenêtres s'allument la nuit (remplies par la ville)
const mats = new Map();
function pbr(couleur, o) {
  o = o || {}; const k = [couleur, o.rough, o.metal, o.opacite, o.lum].join("|");
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: couleur, roughness: o.rough == null ? 0.7 : o.rough, metalness: o.metal || 0, transparent: o.opacite != null && o.opacite < 1, opacity: o.opacite == null ? 1 : o.opacite, depthWrite: !(o.opacite < 1), emissive: o.lum ? couleur : 0x000000, emissiveIntensity: o.lum || 0 }));
  return mats.get(k);
}
/* Finitions nommées : laque blanche, métal sombre, tissu, etc. */
const FIN = { laque: { rough: 0.32 }, metal: { rough: 0.38, metal: 0.85 }, tissu: { rough: 0.96 }, mat: { rough: 0.8 }, ceramique: { rough: 0.25 }, feuille: { rough: 0.75 } };
function boiteM(parent, w, h, d, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !o.sansOmbre && !(o.opacite < 1); m.receiveShadow = !o.sansOmbre || !!o.recoit;
  if (o.ry) m.rotation.y = o.ry; parent.add(m); return m;
}
function cyl(parent, r, h, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.CylinderGeometry(o.rHaut == null ? r : o.rHaut, r, h, o.seg || 20), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !(o.opacite < 1) && !o.sansOmbre; m.receiveShadow = true; parent.add(m); return m;
}
function boule(parent, r, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(o.facettes ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 20, 14), pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !(o.opacite < 1); parent.add(m); return m;
}
const matVerre = new THREE.MeshStandardMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.1, depthWrite: false, envMapIntensity: 2.2 });
const NOIR = 0x1b1d2b;

