/* ── Le ciel, la lumière : fin d'après-midi dorée en thème clair, heure bleue en thème sombre ──
   Tout ce qui règle l'image est ici, dans AMBIANCES. Les forces se lisent sur une même échelle : 1 = un sol blanc éclairé « normalement ».
     iSoleil × (hauteur du soleil)  = ce que le soleil apporte à un sol à plat ;
     ciel                           = ce que le ciel apporte au même sol (la lumière d'ambiance, celle qui reste dans les ombres) ;
     lampes                         = la force des lampes de chaque pièce (la nuit).
   Le rapport soleil / ciel fait le contraste des ombres. « expo » règle la clarté de toute l'image, sans toucher à ce rapport. */
const ciel = new THREE.Mesh(new THREE.SphereGeometry(2800, 32, 20), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
ciel.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(ciel.geometry.attributes.position.count * 3), 3)); scene.add(ciel);
const astre = new THREE.Mesh(new THREE.SphereGeometry(70, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false, toneMapped: false })); scene.add(astre);
const pmrem = new THREE.PMREMGenerator(renderer), envs = {};
const AMBIANCES = {
  jour: {
    haut: 0x3f7fc9, milieu: 0xa3c6e2, bas: 0xf4d3b1, brume: 0xf4d3b1, astre: 0xfff1c9,          // le dégradé du ciel (du zénith à l'horizon), la brume au loin (la même couleur que l'horizon : sinon on voit une ligne), le disque du soleil
    soleil: 0xffb873, iSoleil: 2.45, dir: [-0.72, 0.56, 0.4], ombres: true,                                  // un soleil bas et doré, qui vient de l'arrière gauche : de longues ombres vers l'avant droit
    ciel: 0.48, teinteCiel: [0.97, 1, 1.06], plafond: 5,                                          // la lumière du ciel (un peu bleue : elle refroidit les ombres) ; plafond : le soleil de la photo est écrêté (le vrai est « soleil »)
    iHemi: 0.12, hemiCiel: 0xbcd0ff, hemiSol: 0xe0a878,                                          // le rebond chaud du sol
    lampes: 0, teinteLampes: 0xffc98a, fenetres: 0, lueur: 1.1,                                  // lampes éteintes, fenêtres de la ville éteintes ; lueur : la force des écrans
    contact: 0.3, contactGens: 0.34, choisie: 0.3, expo: 0.85,                                   // les ombres de contact (sous les meubles, sous les gens) ; choisie : la force du voile indigo sur le sol de la pièce choisie (trop fort, il rend le bois rose)
  },
  nuit: {
    haut: 0x0a1232, milieu: 0x242c66, bas: 0x4a4279, brume: 0x4a4279, astre: 0xe9ecff,
    soleil: 0x93a8ff, iSoleil: 0.22, dir: [-0.45, 0.72, 0.32], ombres: false,                    // la lune : une lumière bleue et faible, qui dessine encore les volumes. Sans ombres portées : à peine visibles la nuit, elles coûtaient cher
    ciel: 0.09, teinteCiel: [0.6, 0.75, 1.3], plafond: 4,
    iHemi: 0.05, hemiCiel: 0x5a6cc0, hemiSol: 0x40305a,
    lampes: 1.8, teinteLampes: 0xffbb78, fenetres: 1.35, lueur: 1.7,
    contact: 0.62, contactGens: 0.6, choisie: 0.2, expo: 1.0,
  },
};

/* Le vrai ciel photographié, préparé pour éclairer la scène. La photo est beaucoup trop forte telle quelle (tout sortait délavé, et la nuit
   ressemblait au jour) : on écrête son soleil, on la ramène à la force voulue (a.ciel), on la teinte, et on la tourne pour que son côté
   le plus clair soit du côté de notre soleil. Rend null si la photo n'a pas le format attendu : on prend alors le dégradé. */
function cielRegle(hdr, a, d) {
  const img = hdr && hdr.image, W = img && img.width, H = img && img.height, src = img && img.data;
  if (!(src instanceof Uint8Array) || src.length !== W * H * 4) return null;
  const f = new Float32Array(W * H * 3), P2 = new Float32Array(256); for (let e = 0; e < 256; e++) P2[e] = Math.pow(2, e - 136);
  let somme = 0, max = 0, colMax = 0;
  for (let y = 0; y < H; y++) {
    const el = (0.5 - (y + 0.5) / H) * Math.PI, w = el > 0 ? Math.sin(el) * Math.cos(el) : 0;      // le poids d'un point du ciel dans la lumière reçue par un sol à plat
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, k = P2[src[i + 3]], j = (y * W + x) * 3; let r = src[i] * k, g = src[i + 1] * k, b = src[i + 2] * k, L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (L > max) { max = L; colMax = x; }
      if (L > a.plafond) { const c = a.plafond / L; r *= c; g *= c; b *= c; L = a.plafond; }
      f[j] = r; f[j + 1] = g; f[j + 2] = b; somme += L * w;
    }
  }
  const moyenne = somme * 2 * Math.PI / (W * H), gain = moyenne > 0 ? a.ciel / moyenne : 1, t = a.teinteCiel || [1, 1, 1];
  const dec = Math.round((Math.atan2(d.z, d.x) / (2 * Math.PI) + 0.5) * W - colMax), out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = (y * W + ((x - dec) % W + W) % W) * 3, o = (y * W + x) * 4, r = f[j] * gain * t[0], g = f[j + 1] * gain * t[1], b = f[j + 2] * gain * t[2], m = Math.max(r, g, b);
    if (m < 1e-30) continue;
    const e = Math.floor(Math.log2(m)) + 1, q = 256 / Math.pow(2, e);                              // on range la couleur au même format que la photo (trois nombres et une puissance de deux)
    out[o] = Math.min(255, r * q); out[o + 1] = Math.min(255, g * q); out[o + 2] = Math.min(255, b * q); out[o + 3] = e + 128;
  }
  const tex = new THREE.DataTexture(out, W, H, THREE.RGBEFormat, THREE.UnsignedByteType);
  tex.encoding = THREE.RGBEEncoding; tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = true; tex.needsUpdate = true;
  return tex;
}

/* La zone d'ombre du soleil, recadrée au plus juste sur l'étage (ETAGE_OMBRES) : toute la finesse de la carte d'ombres sert là où on regarde */
function cadrerOmbres(d) {
  const E = ETAGE_OMBRES, c = new THREE.Vector3((E.x0 + E.x1) / 2, 0, (E.z0 + E.z1) / 2), cam = soleil.shadow.camera, v = new THREE.Vector3();
  soleil.position.copy(c).addScaledVector(d, 90); soleil.target.position.copy(c); soleil.updateMatrixWorld(); soleil.target.updateMatrixWorld();
  cam.position.copy(soleil.position); cam.lookAt(c); cam.updateMatrixWorld(); const inv = cam.matrixWorld.clone().invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, pres = 1e9, loin = -1e9;
  for (const x of [E.x0, E.x1]) for (const y of [-0.3, E.haut]) for (const z of [E.z0, E.z1]) { v.set(x, y, z).applyMatrix4(inv);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); pres = Math.min(pres, -v.z); loin = Math.max(loin, -v.z); }
  cam.left = x0 - 0.5; cam.right = x1 + 0.5; cam.bottom = y0 - 0.5; cam.top = y1 + 0.5; cam.near = Math.max(1, pres - 6); cam.far = loin + 6; cam.updateProjectionMatrix();
}

/* ── Les ombres de contact : ce qui « pose » les meubles et les gens sur le sol, de jour comme de nuit (les lampes ne portent pas d'ombre) ──
   Pas de calcul en plus à chaque image : une tache sombre et floue dessinée une fois, étirée sous chaque meuble (son emprise, déjà notée pour
   les déplacements), au pied des cloisons, et une tache ronde qui suit chaque personne. Deux tracés en tout. */
const OMBRES = { halo: 0.3, retrait: 0.05, bord: 1.0, gens: 1.0, ySol: 0.026, yGens: 0.03 };   // halo : de combien l'ombre déborde du meuble ; bord : largeur assombrie au pied des cloisons ; gens : diamètre de la tache d'une personne
const texOmbre = toile(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  for (const [r, al] of [[0, 1], [0.2, 0.8], [0.4, 0.5], [0.6, 0.24], [0.8, 0.07], [1, 0]]) g.addColorStop(r, "rgba(0,0,0," + al + ")"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
const matOmbreSol = new THREE.MeshBasicMaterial({ map: texOmbre, color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
const matOmbreGens = matOmbreSol.clone();
let ombresGens = null;
(function ombresDeContact() {
  const P = [], U = [], I = [];
  /* Une tache étirée sur un rectangle : pleine au milieu, fondue sur les bords et arrondie aux coins (les 9 cases d'un cadre) */
  const cadre = (xs, zs, us, vs) => { const b = P.length / 3; for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) { P.push(xs[i], OMBRES.ySol, zs[j]); U.push(us[i], vs[j]); }
    const n = xs.length; for (let j = 0; j + 1 < zs.length; j++) for (let i = 0; i + 1 < n; i++) { const a = b + j * n + i; I.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } };
  const h = OMBRES.halo, s = OMBRES.retrait, m = [0, 0.5, 0.5, 1];
  for (const o of obstacles) {                                               // sous chaque meuble (pas sous les personnes assises : elles ont leur propre tache)
    if (o.perso) continue; const sx = Math.min(s, (o.x1 - o.x0) / 2 - 0.01), sz = Math.min(s, (o.z1 - o.z0) / 2 - 0.01);
    cadre([o.x0 - h, o.x0 + sx, o.x1 - sx, o.x1 + h], [o.z0 - h, o.z0 + sz, o.z1 - sz, o.z1 + h], m, m);
  }
  for (const p of PIECES) {                                                  // au pied des cloisons : le sol s'assombrit un peu vers les bords de chaque pièce
    const e = 0.03, b = OMBRES.bord, d = [0.74, 1];
    cadre([p.x0 + e, p.x1 - e], [p.z0 + e, p.z0 + e + b], [0.5, 0.5], d); cadre([p.x0 + e, p.x1 - e], [p.z1 - e - b, p.z1 - e], [0.5, 0.5], [1, 0.74]);
    cadre([p.x0 + e, p.x0 + e + b], [p.z0 + e, p.z1 - e], d, [0.5, 0.5]); cadre([p.x1 - e - b, p.x1 - e], [p.z0 + e, p.z1 - e], [1, 0.74], [0.5, 0.5]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
  const sol = new THREE.Mesh(g, matOmbreSol); sol.renderOrder = -2; sol.name = "ombres de contact"; scene.add(sol);
  if (!persos.length) return;
  const q = new THREE.PlaneGeometry(OMBRES.gens, OMBRES.gens); q.rotateX(-Math.PI / 2);
  ombresGens = new THREE.InstancedMesh(q, matOmbreGens, persos.length); ombresGens.frustumCulled = false; ombresGens.renderOrder = -1; ombresGens.name = "ombres des gens"; scene.add(ombresGens);
})();
/* Chaque image (appelé par « Les déplacements ») : la tache de chacun le suit */
const mOmbre = new THREE.Matrix4();
function majOmbres() {
  if (!ombresGens) return;
  for (let i = 0; i < persos.length; i++) { const p = persos[i].g.position; mOmbre.makeTranslation(p.x, OMBRES.yGens, p.z); ombresGens.setMatrixAt(i, mOmbre); }
  ombresGens.instanceMatrix.needsUpdate = true;
}
majOmbres();

/* Ce qui éclaire de l'intérieur (écrans, enseignes, liserés des cabines, eau de la piscine) : relevé une fois, puis réglé par l'ambiance */
let lueurs = null;
function releverLueurs() {
  lueurs = []; const vus = new Set();
  decor.traverse((o) => { const m = o.material; if (!m || vus.has(m) || !m.isMeshStandardMaterial) return; vus.add(m);
    if (m.emissiveIntensity > 0 && (m.emissiveMap || m.emissive.r + m.emissive.g + m.emissive.b > 0)) lueurs.push([m, m.emissiveIntensity]); });
}

function ambiance(nom) {
  const a = AMBIANCES[nom], pos = ciel.geometry.attributes.position, col = ciel.geometry.attributes.color, c = new THREE.Color(), h = new THREE.Color(a.haut), m = new THREE.Color(a.milieu), b = new THREE.Color(a.bas);
  for (let i = 0; i < pos.count; i++) { const t = Math.max(0, pos.getY(i) / 2800); if (t < 0.18) c.copy(b).lerp(m, t / 0.18); else c.copy(m).lerp(h, Math.min(1, (t - 0.18) / 0.6)); c.convertSRGBToLinear(); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true;
  scene.fog = new THREE.Fog(a.brume, 500, 2400); renderer.setClearColor(a.brume, 1); renderer.toneMappingExposure = a.expo;
  const d = new THREE.Vector3(a.dir[0], a.dir[1], a.dir[2]).normalize();
  soleil.color.setHex(a.soleil); soleil.intensity = a.iSoleil; soleil.castShadow = a.ombres !== false; cadrerOmbres(d);
  astre.position.copy(d).multiplyScalar(2500); astre.material.color.setHex(a.astre).convertSRGBToLinear(); astre.scale.setScalar(nom === "nuit" ? 0.55 : 1);
  hemi.color.setHex(a.hemiCiel); hemi.groundColor.setHex(a.hemiSol); hemi.intensity = a.iHemi;
  for (const f of facadesAllumables) f.emissiveIntensity = a.fenetres;
  for (const l of lampes) { l.intensity = a.lampes; l.color.setHex(a.teinteLampes); l.visible = a.lampes > 0; }   // éteinte, une lampe est retirée du calcul
  if (!lueurs) releverLueurs(); for (const [mat, base] of lueurs) mat.emissiveIntensity = base * a.lueur;
  matOmbreSol.opacity = a.contact; matOmbreGens.opacity = a.contactGens;
  for (const p of PIECES) if (p.matSol) p.matSol.emissiveIntensity = a.choisie;
  // les reflets et la lumière d'ambiance : le vrai ciel photographié (HDRI) s'il est chargé, sinon le dégradé
  if (!envs[nom]) { const hdr = SANS_CIEL ? null : MODELES.ciel[nom], regle = hdr ? cielRegle(hdr, a, d) : null;
    if (regle) { envs[nom] = pmrem.fromEquirectangular(regle).texture; regle.dispose(); }
    else if (hdr) envs[nom] = pmrem.fromEquirectangular(hdr).texture;
    else { const s = new THREE.Scene(); s.add(ciel.clone()); s.add(astre.clone()); envs[nom] = pmrem.fromScene(s, 0.03, 10, 4000).texture; } }
  scene.environment = envs[nom];
  if (typeof ambianceVille === "function") ambianceVille(nom, a);
}
const SANS_CIEL = /[?&]sansciel=1/.test(location.search);                    // pour les essais : fait comme si la photo du ciel n'avait pas chargé

/* Outils d'essai (aucun effet pour l'utilisateur) : window.__essaiLumiere.regler("jour", { iSoleil: 2 }) change un réglage et le montre aussitôt ;
   .banc(n) rend n images d'affilée et donne le temps moyen d'une image, en millisecondes. */
window.__essaiLumiere = {
  regler(nom, o) { Object.assign(AMBIANCES[nom], o || {}); if (envs[nom]) { envs[nom].dispose(); delete envs[nom]; } ambiance(nom); return true; },
  banc(n) { n = n || 40; const gl = renderer.getContext(), px = new Uint8Array(4); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now(); for (let i = 0; i < n; i++) { renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return +((performance.now() - t0) / n).toFixed(2); },
  objets: { soleil, lampes, hemi, renderer, scene, AMBIANCES },
  ombre() { const k = soleil.shadow.camera; return { large: +(k.right - k.left).toFixed(1), haut: +(k.top - k.bottom).toFixed(1), pres: +k.near.toFixed(1), loin: +k.far.toFixed(1), carte: soleil.shadow.mapSize.x }; },
};
