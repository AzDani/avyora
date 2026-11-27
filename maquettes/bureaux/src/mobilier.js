/* Les obstacles : l'emprise au sol de chaque meuble, pour que personne ne passe au travers (voir « Les déplacements ») */
const obstacles = [];
function emprise(x, z, w, d, ry) { const c = Math.abs(Math.cos(ry || 0)), s = Math.abs(Math.sin(ry || 0)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; obstacles.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }); }

/* Les sièges : chaque assise posée est notée ici (position au sol, hauteur du dessus de l'assise, direction du regard de la
   personne assise). Sert à asseoir quelqu'un exactement sur un siège : siegePres(x, z) rend le plus proche. */
const sieges = [];
const H_ASSISE = { bureau: 0.5, salon: 0.4, canape: 0.41, banc: 0.45, tabouret: 0.62, transat: 0.36 };
function siege(x, z, y, ry, sorte, bord) { sieges.push({ x, z, y, ry, sorte, bord }); }   // bord : du point noté jusqu'au nez de l'assise, vers l'avant (sert à garder les mollets devant le coussin)
/* Le vrai profil d'une assise, lu sur le modèle 3D : dans le couloir de la place (à sx du milieu), où s'arrête le coussin vers l'avant (nez)
   et à quelle hauteur est son dessus, là où reposent les cuisses (haut). Sans modèle : null (on garde les cotes de la forme simple). */
function profilAssise(nom, sx) {
  const m = MM[nom]; if (!m) return null;
  m.updateMatrixWorld(true); const v = new THREE.Vector3(), pts = [];
  m.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); if (Math.abs(v.x - sx) < 0.22 && v.y > 0.2 && v.y < 0.62) pts.push(v.x, v.y, v.z); } });
  if (pts.length < 30) return null;
  let nez = -1e9; for (let i = 0; i < pts.length; i += 3) nez = Math.max(nez, pts[i + 2]);
  let haut = 0; for (let i = 0; i < pts.length; i += 3) { const z = pts[i + 2]; if (z > nez - 0.3 && z < nez - 0.08) haut = Math.max(haut, pts[i + 1]); }
  return haut > 0.25 ? { nez, haut } : null;
}
function siegePres(x, z) { let m = null, dm = 1e9; for (const s of sieges) { const d = Math.hypot(s.x - x, s.z - z); if (d < dm) { dm = d; m = s; } } return m; }
/* Un point et une direction donnés dans un groupe, traduits en coordonnées de l'étage */
function monde(g, x, z, ry) {
  g.updateWorldMatrix(true, false);
  const p = new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld), d = new THREE.Vector3(Math.sin(ry || 0), 0, Math.cos(ry || 0)).transformDirection(g.matrixWorld);
  return { x: p.x, z: p.z, ry: Math.atan2(d.x, d.z) };
}

/* Le décor fixe : tout ce qui ne bouge jamais est rangé dans ce groupe. À la fin de l'aménagement, fusionner() le réduit à un
   seul maillage par matière : des centaines de petites boîtes ne coûtent plus que quelques tracés. */
const decor = new THREE.Group(); decor.name = "decor"; scene.add(decor);
function fusionner(groupe) {
  groupe.updateMatrixWorld(true);
  const lots = new Map(), v = new THREE.Vector3(), mn = new THREE.Matrix3();
  groupe.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.geometry.attributes.position) return;
    const k = o.material.uuid + (o.castShadow ? "|o" : "|-") + (o.receiveShadow ? "r" : "-");
    if (!lots.has(k)) lots.set(k, []); lots.get(k).push(o);
  });
  const neufs = [];
  for (const liste of lots.values()) {
    let nS = 0, nI = 0;
    for (const o of liste) { const g = o.geometry; nS += g.attributes.position.count; nI += g.index ? g.index.count : g.attributes.position.count; }
    const avecUv = liste.every((o) => o.geometry.attributes.uv), avecN = liste.every((o) => o.geometry.attributes.normal);
    const P = new Float32Array(nS * 3), N = avecN ? new Float32Array(nS * 3) : null, U = avecUv ? new Float32Array(nS * 2) : null, I = new (nS > 65535 ? Uint32Array : Uint16Array)(nI);
    let s = 0, i = 0;
    for (const o of liste) {
      const g = o.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, m = o.matrixWorld; mn.getNormalMatrix(m);
      for (let a = 0; a < p.count; a++) {
        const k = (s + a) * 3; v.fromBufferAttribute(p, a).applyMatrix4(m); P[k] = v.x; P[k + 1] = v.y; P[k + 2] = v.z;
        if (N) { v.fromBufferAttribute(n, a).applyMatrix3(mn).normalize(); N[k] = v.x; N[k + 1] = v.y; N[k + 2] = v.z; }
        if (U) { U[(s + a) * 2] = u.getX(a); U[(s + a) * 2 + 1] = u.getY(a); }
      }
      if (g.index) for (let a = 0; a < g.index.count; a++) I[i++] = s + g.index.getX(a); else for (let a = 0; a < p.count; a++) I[i++] = s + a;
      s += p.count;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    if (U) geo.setAttribute("uv", new THREE.BufferAttribute(U, 2)); geo.setIndex(new THREE.BufferAttribute(I, 1));
    if (N) geo.setAttribute("normal", new THREE.BufferAttribute(N, 3)); else geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, liste[0].material); mesh.castShadow = liste[0].castShadow; mesh.receiveShadow = liste[0].receiveShadow; neufs.push(mesh);
  }
  for (const liste of lots.values()) for (const o of liste) o.parent.remove(o);
  for (const m of neufs) groupe.add(m);
  return neufs.length;
}

/* Les vraies couleurs. Dans cette version de three.js, une couleur donnée « à plat » (0x4f46e5) sort délavée à l'écran : il faut la
   convertir une fois. On le fait ici pour tout le décor fixe, sur des copies : les matières partagées avec la ville ne changent pas.
   Les métaux gardent leur teinte d'origine (un acier ardoise plutôt qu'un noir dur). On calme aussi le reflet du ciel sur ce qui est mat. */
function vraiesCouleurs(groupe) {
  const plates = new Set(mats.values()), copies = new Map(), vus = new Set();
  groupe.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return; const m = o.material;
    if (plates.has(m)) {
      if (!copies.has(m)) { const c = m.clone(); if (m.metalness <= 0.5) { c.color.convertSRGBToLinear(); c.emissive.convertSRGBToLinear(); } if (c.metalness <= 0.5) c.envMapIntensity = c.roughness >= 0.7 ? 0.4 : 0.7; copies.set(m, c); }
      o.material = copies.get(m);
    } else if (!vus.has(m)) { vus.add(m); if (m.isMeshStandardMaterial && m.envMapIntensity === 1 && !m.roughnessMap && m.metalness <= 0.5 && m.roughness >= 0.7) m.envMapIntensity = 0.45; }
  });
  return copies.size;
}

/* ── Les matières du mobilier ── */
function bois(R, G, B, graine, rough) { return new THREE.MeshStandardMaterial({ map: texParquet(R, G, B, graine), roughness: rough == null ? 0.45 : rough, envMapIntensity: 0.7 }); }
const texPlateau = texBois(41), matPlateau = new THREE.MeshStandardMaterial({ map: texPlateau, roughness: 0.45 });
const matChene = bois(206, 172, 130, 43), matNoyer = bois(112, 72, 46, 47, 0.38);
const matMarbre = new THREE.MeshStandardMaterial({ map: texMarbre(8), roughness: 0.15 });
function moquette(R, G, B, graine) { const t = texMoquette(R, G, B, graine); t.repeat.set(3, 3); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }
const TAPIS = { sable: moquette(214, 206, 190, 3), indigo: moquette(62, 56, 150, 5), gris: moquette(120, 124, 140, 7), terre: moquette(188, 108, 72, 9), nuit: moquette(40, 42, 68, 11), vert: moquette(96, 132, 108, 13) };
const BLANC = 0xf4f1ea, KRAFT = 0xc9a877, INDIGO = 0x4f46e5, NUIT = 0x1e1b4b;
/* Une surface qui éclaire (écran, plan lumineux) : son dessin sert aussi de lumière */
function lumineux(w, h, dessin, lum) { const t = toile(w, h, dessin, false); return new THREE.MeshStandardMaterial({ color: 0x0a0c1e, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.9 : lum, roughness: 0.2 }); }
const ecrans = [texEcran(1), texEcran(2), texEcran(3)].map((t) => new THREE.MeshStandardMaterial({ color: 0x0a0c1e, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.2 }));
/* Le plan d'architecte (studio) : traits clairs sur fond bleu nuit */
function dessinPlan(c, W, H) {
  c.fillStyle = "#12224f"; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(160,190,255,.18)"; c.lineWidth = 1;
  for (let x = 0; x < W; x += W / 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += H / 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.strokeStyle = "#e8f0ff"; c.lineWidth = Math.max(3, W / 90); const a = W * 0.14, b = H * 0.16, w = W * 0.72, h = H * 0.68;
  c.strokeRect(a, b, w, h); c.beginPath(); c.moveTo(a + w * 0.42, b); c.lineTo(a + w * 0.42, b + h * 0.58); c.lineTo(a, b + h * 0.58); c.moveTo(a + w * 0.42, b + h * 0.36); c.lineTo(a + w, b + h * 0.36); c.moveTo(a + w * 0.7, b + h * 0.36); c.lineTo(a + w * 0.7, b + h); c.stroke();
  c.lineWidth = Math.max(1.5, W / 220); c.strokeStyle = "#8fb4ff"; c.beginPath(); c.arc(a + w * 0.42, b + h * 0.58, w * 0.1, 0, Math.PI / 2); c.stroke(); c.beginPath(); c.arc(a + w * 0.7, b + h, w * 0.09, Math.PI, Math.PI * 1.5); c.stroke();
  c.fillStyle = "#8fb4ff"; c.fillRect(a, b + h + H * 0.05, w, 2); c.fillRect(a, b + h + H * 0.035, 2, H * 0.03); c.fillRect(a + w - 2, b + h + H * 0.035, 2, H * 0.03);
}
const matPlan = lumineux(512, 320, dessinPlan, 0.75);
let nEcran = 0;
function ecran(g, w, h, x, y, z, ry, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || ecrans[nEcran++ % 3]); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m; }
function cone(parent, r, h, couleur, x, y, z, o) {
  o = o || {}; const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 12), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !o.sansOmbre; m.receiveShadow = true; parent.add(m); return m;
}

/* ── Les modèles téléchargés : petites retouches faites une fois, puis des fonctions qui les posent ── */
const MM = MODELES.meubles;
const TOURNE = { fauteuilBureau: 0, fauteuilSalon: 0, canape: 0, imprimante: 0, machineCafe: 0, portable: Math.PI };   // pour que chaque modèle regarde du bon côté
const variantes = new Map();
function teindre(objet, motif, couleur) {                                   // la même matière dans une autre couleur (gardée en mémoire : une seule par couleur)
  objet.traverse((o) => { if (!o.isMesh || !motif.test(o.material.name || "")) return; const k = o.material.uuid + "|" + couleur;
    if (!variantes.has(k)) { const m = o.material.clone(); m.color.setHex(couleur).convertSRGBToLinear(); variantes.set(k, m); } o.material = variantes.get(k); });
  return objet;
}
/* Le cuir d'une autre couleur. La photo du modèle est un cuir noir : on l'éclaircit puis on la teinte, les plis et les coutures restent.
   Le bois (les points roux de la photo) n'est pas touché. Si la photo ne peut pas être lue, le meuble garde son cuir noir. */
const cuirs = new Map();
function reteindre(mat, couleur) {
  try {
    const img = mat.map.image, W = Math.min(1024, img.width), H = Math.min(1024, img.height), c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H), p = d.data, R = couleur >> 16 & 255, G = couleur >> 8 & 255, B = couleur & 255;
    let somme = 0, n = 0; const cuirIci = (i) => p[i] - p[i + 2] < 26;                                  // un point gris ou noir : du cuir
    for (let i = 0; i < p.length; i += 16) if (cuirIci(i)) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; if (l > 10) { somme += l; n++; } }
    const ref = n ? somme / n : 40;                                                                      // la clarté moyenne du cuir d'origine
    for (let i = 0; i < p.length; i += 4) { if (!cuirIci(i)) continue; const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], k = Math.max(0.42, Math.min(1.18, 0.25 + 0.75 * l / ref));
      p[i] = Math.min(255, R * k); p[i + 1] = Math.min(255, G * k); p[i + 2] = Math.min(255, B * k); }
    x.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c), o = mat.map; t.encoding = o.encoding; t.flipY = o.flipY; t.wrapS = o.wrapS; t.wrapT = o.wrapT; t.anisotropy = o.anisotropy; t.repeat.copy(o.repeat); t.offset.copy(o.offset);
    const m = mat.clone(); m.map = t; return m;
  } catch (e) { return null; }
}
function cuir(objet, motif, couleur) {
  objet.traverse((o) => { if (!o.isMesh || !motif.test(o.material.name || "") || !o.material.map || !o.material.map.image) return; const k = o.material.uuid + "|" + couleur;
    if (!cuirs.has(k)) cuirs.set(k, reteindre(o.material, couleur)); if (cuirs.get(k)) o.material = cuirs.get(k); });
  return objet;
}
const CUIR = { sable: 0xd9cdb8, cognac: 0xb06a34, ivoire: 0xece6da, indigo: 0x4a44b0, olive: 0x7c7a55 };
/* Les petits modèles arrivent en vert d'eau : on leur donne des couleurs de vrai matériel (une fois, sur le modèle : tous les exemplaires suivent) */
function recolorer(modele, tons) {
  const faites = new Map(); if (!modele) return;
  modele.traverse((o) => { if (!o.isMesh) return; const t = tons[o.material.name]; if (!t) return;
    if (!faites.has(o.material)) { const m = o.material.clone(); m.color.setHex(t[0]).convertSRGBToLinear(); m.roughness = t[1]; m.metalness = t[2] || 0; if (t[3]) { m.emissive.setHex(t[3]).convertSRGBToLinear(); m.emissiveIntensity = t[4] || 1; } faites.set(o.material, m); }
    o.material = faites.get(o.material); });
}
recolorer(MM.portable, { metalDark: [0xb9bcc6, 0.35, 0.7], metalMedium: [0x2a2c38, 0.6], metal: [0x10142e, 0.2, 0, 0x7f9cff, 0.85] });   // la coque alu, le clavier sombre, l'écran allumé
recolorer(MM.machineCafe, { metalMedium: [0x23252f, 0.35, 0.4], metal: [0xc9ccd6, 0.3, 0.85], carpetWhite: [0xf4f1ea, 0.3] });
function sansOmbrePortee(objet) { objet.traverse((o) => { if (o.isMesh) o.castShadow = false; }); return objet; }
/* Une ombre simple pour un modèle très détaillé : une forme invisible qui porte l'ombre à sa place (moins de triangles à dessiner deux fois) */
const matOmbre = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function ombre(g, w, h, d, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOmbre); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = false; g.add(m); return m; }
/* La plante : on garde le vrai feuillage ; le pot et la terre sont refaits à la main (le modèle y met près de 60 000 triangles) */
let feuillage = null, potPlante = { x: 0, z: 0 };
if (MM.plante) {
  feuillage = MM.plante.clone(true); feuillage.updateMatrixWorld(true); const retire = [];
  feuillage.traverse((o) => { if (!o.isMesh) return; if (/leaves/i.test(o.material.name || "")) return; if (!/dirt/i.test(o.name)) { const b = new THREE.Box3().setFromObject(o); potPlante = { x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2 }; } retire.push(o); });
  for (const o of retire) o.parent.remove(o);
  sansOmbrePortee(feuillage);
}

function bureauM(g, x, z, ry, o) {
  o = o || {}; ry = ry || 0; const L = o.large || 1.7, P = o.prof || 0.85, n = nBureau++;
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
  const zf = P / 2 + 0.335, bout = o.sansFauteuil ? P / 2 : zf + 0.37, c = (bout - P / 2) / 2;
  emprise(x + Math.sin(ry) * c, z + Math.cos(ry) * c, L + 0.04, P / 2 + bout, ry);                             // le bureau et son fauteuil
  boiteM(b, L, 0.04, P, 0, 0, 0.745, 0, { mat: o.mat || matPlateau });
  for (const sx of [-L / 2 + 0.06, L / 2 - 0.06]) { boiteM(b, 0.05, 0.7, 0.05, NOIR, sx, 0.365, -P / 2 + 0.06, { fin: "metal" }); boiteM(b, 0.05, 0.7, 0.05, NOIR, sx, 0.365, P / 2 - 0.06, { fin: "metal" }); boiteM(b, 0.05, 0.04, P - 0.12, NOIR, sx, 0.705, 0, { fin: "metal", sansOmbre: true }); }
  boiteM(b, L - 0.18, 0.32, 0.02, NOIR, 0, 0.54, -P / 2 + 0.07, { fin: "metal" });                              // le voile de fond
  if (!o.sansCaisson) { const cx = (n % 2 ? 1 : -1) * (L / 2 - 0.3); boiteM(b, 0.4, 0.56, 0.52, BLANC, cx, 0.3, -0.08, { fin: "laque" }); boiteM(b, 0.3, 0.02, 0.012, NOIR, cx, 0.46, 0.185, { fin: "metal", sansOmbre: true }); boiteM(b, 0.3, 0.02, 0.012, NOIR, cx, 0.28, 0.185, { fin: "metal", sansOmbre: true }); }
  if (o.portable) portable(b, 0, 0.765, -0.05, 0);
  else {
    boiteM(b, 0.66, 0.4, 0.03, NOIR, 0, 1.1, -0.24, { fin: "metal" }); ecran(b, 0.62, 0.36, 0, 1.1, -0.224, 0); boiteM(b, 0.05, 0.16, 0.05, NOIR, 0, 0.86, -0.26, { fin: "metal", sansOmbre: true }); boiteM(b, 0.26, 0.015, 0.18, NOIR, 0, 0.772, -0.26, { fin: "metal", sansOmbre: true });
    boiteM(b, 0.42, 0.015, 0.15, 0xe9e7e2, 0, 0.773, 0.12, { fin: "laque", sansOmbre: true }); boiteM(b, 0.06, 0.02, 0.1, 0xe9e7e2, 0.32, 0.775, 0.13, { fin: "laque", sansOmbre: true });
  }
  if (o.double) { boiteM(b, 0.6, 0.36, 0.03, NOIR, -0.66, 1.08, -0.2, { fin: "metal", ry: 0.35 }); const e = ecran(b, 0.56, 0.32, -0.658, 1.08, -0.183, 0.35); boiteM(b, 0.05, 0.16, 0.05, NOIR, -0.66, 0.86, -0.22, { fin: "metal", sansOmbre: true }); }
  if (n % 3 === 0) cyl(b, 0.04, 0.09, [BLANC, 0xa78bfa, 0xf59e0b][n % 9 / 3 | 0], -L / 2 + 0.28, 0.81, 0.18, { fin: "ceramique", seg: 10, sansOmbre: true });   // une tasse
  if (n % 3 === 1) { boiteM(b, 0.22, 0.012, 0.3, 0xffffff, L / 2 - 0.3, 0.772, 0.12, { sansOmbre: true, ry: 0.2 }); boiteM(b, 0.22, 0.012, 0.3, 0xffffff, L / 2 - 0.34, 0.784, 0.1, { sansOmbre: true, ry: -0.15 }); }   // des feuilles
  if (n % 3 === 2) { boiteM(b, 0.16, 0.03, 0.22, [INDIGO, 0x30a46c, 0xd9486e][n % 9 / 3 | 0], -L / 2 + 0.26, 0.78, 0.1, { fin: "mat", sansOmbre: true, ry: 0.3 }); }                                                // un carnet
  if (!o.sansFauteuil) fauteuil(b, 0, zf, 0, o.couleur);
  return b;
}
let nBureau = 0;
/* Le fauteuil de bureau à roulettes. ry = 0 : il regarde vers −z (comme avant). */
function fauteuil(g, x, z, ry, couleur) {
  couleur = couleur == null ? 0x2c2f45 : couleur;
  const c = poser3d("fauteuilBureau", g, x, z, (ry || 0) + TOURNE.fauteuilBureau);
  if (c) teindre(c, /chair/i, couleur);
  else {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f);
    boiteM(f, 0.5, 0.09, 0.5, couleur, 0, 0.46, 0, { fin: "tissu" }); boiteM(f, 0.48, 0.52, 0.07, couleur, 0, 0.8, 0.24, { fin: "tissu" });
    cyl(f, 0.035, 0.34, NOIR, 0, 0.26, 0, { fin: "metal" }); for (let i = 0; i < 5; i++) { const a = i * 1.2566; boiteM(f, 0.04, 0.04, 0.3, NOIR, Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15, { fin: "metal", ry: a, sansOmbre: true }); }
  }
  const w = monde(g, x, z, (ry || 0) + Math.PI); siege(w.x, w.z, H_ASSISE.bureau, w.ry, "bureau");
}
function chaise(g, x, z, ry, couleur) { fauteuil(g, x, z, ry, couleur == null ? 0x3b3f66 : couleur); emprise(x, z, 0.66, 0.74, ry); }
/* Le tabouret haut (tables à dessin, mange-debout) */
function tabouret(g, x, z, couleur, h, ry) {
  h = h || 0.62; emprise(x, z, 0.4, 0.4); cyl(g, 0.17, 0.05, couleur == null ? NOIR : couleur, x, h - 0.025, z, { fin: "tissu", seg: 16 }); cyl(g, 0.025, h - 0.06, NOIR, x, (h - 0.05) / 2, z, { fin: "metal", seg: 8 });
  cyl(g, 0.17, 0.02, NOIR, x, 0.01, z, { fin: "metal", seg: 16, sansOmbre: true }); { const w = monde(g, x, z, ry || 0); siege(w.x, w.z, h, w.ry, "tabouret"); }
}
/* Le fauteuil de salon. ry = 0 : il regarde vers +z. */
function fauteuilSalon(g, x, z, ry, couleur) {
  ry = ry || 0; const t = MM.fauteuilSalon ? MM.fauteuilSalon.userData.taille : { x: 0.78, z: 0.8 };
  emprise(x, z, t.x + 0.04, t.z + 0.04, ry);
  const c = poser3d("fauteuilSalon", g, x, z, ry + TOURNE.fauteuilSalon);
  if (c) { sansOmbrePortee(c); if (couleur != null) cuir(c, /pillow/i, couleur); const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); ombre(s, t.x * 0.86, 0.3, t.z * 0.8, 0, 0.27, 0.02); ombre(s, t.x * 0.8, 0.5, 0.14, 0, 0.6, -t.z * 0.36); }
  else {
    couleur = couleur == null ? 0xe9e4da : couleur; const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    boiteM(f, 0.74, 0.2, 0.7, couleur, 0, 0.32, 0.03, { fin: "tissu" }); boiteM(f, 0.74, 0.5, 0.16, couleur, 0, 0.6, -0.3, { fin: "tissu" }); for (const sx of [-0.33, 0.33]) { boiteM(f, 0.1, 0.3, 0.7, couleur, sx, 0.5, 0.03, { fin: "tissu" }); for (const sz of [-0.3, 0.3]) cyl(f, 0.02, 0.22, NOIR, sx, 0.11, sz, { fin: "metal", seg: 8 }); }
  }
  const pr = c ? profilAssise("fauteuilSalon", 0) : null, nez = pr ? pr.nez : 0.38, av = nez - 0.26;                 // le point noté : 26 cm derrière le nez du coussin
  const w = monde(g, x + Math.sin(ry) * av, z + Math.cos(ry) * av, ry); siege(w.x, w.z, pr ? pr.haut : H_ASSISE.salon, w.ry, "salon", 0.26);
}
/* La plante. e = taille. Le vrai feuillage partout ; haute = true : la même plante dans un pot haut et sombre (une autre silhouette).
   Sans le modèle : un ficus dessiné à la main. */
let nPlante = 0;
function plante(g, x, z, e, haute) {
  e = e || 1;
  if (feuillage) {
    const k = (haute ? 1.12 : 1.25) * e, dy = haute ? 0.34 * e : 0, a = (nPlante++ * 2.4) % 6.283, ca = Math.cos(a), sa = Math.sin(a);
    emprise(x, z, 0.92 * e, 0.92 * e);
    const f = feuillage.clone(true); f.scale.setScalar(k); f.rotation.y = a; f.position.set(x - (potPlante.x * ca + potPlante.z * sa) * k, dy, z - (-potPlante.x * sa + potPlante.z * ca) * k); g.add(f);
    cyl(g, haute ? 0.21 * k : 0.3 * k, 0.5 * k + dy, haute ? 0x2c2f45 : BLANC, x, (0.5 * k + dy) / 2, z, { rHaut: haute ? 0.3 * k : 0.34 * k, fin: haute ? "mat" : "ceramique", seg: 24 }); cyl(g, (haute ? 0.27 : 0.31) * k, 0.02, 0x3a2a1c, x, 0.49 * k + dy, z, { sansOmbre: true, seg: 24 });
    ombre(g, 0.62 * k, 0.5 * k, 0.62 * k, x, 0.82 * k + dy, z, 0.6); return;
  }
  emprise(x, z, 0.8 * e, 0.8 * e); cyl(g, 0.22 * e, 0.55 * e, BLANC, x, 0.275 * e, z, { rHaut: 0.3 * e, fin: "ceramique" }); cyl(g, 0.28 * e, 0.03, 0x3a2a1c, x, 0.55 * e, z, { sansOmbre: true });
  cyl(g, 0.035 * e, 0.75 * e, 0x6b4a2e, x, 0.9 * e, z, { rough: 1, seg: 6 });
  const tons = [0x2f8a4b, 0x3fa55e, 0x57b872]; let k = 0;
  for (const [dx, dy, dz, r] of [[0, 1.45, 0, 0.4], [0.22, 1.62, -0.1, 0.3], [-0.2, 1.6, 0.14, 0.3], [0.04, 1.9, 0.04, 0.27], [-0.1, 1.3, -0.22, 0.25], [0.14, 1.3, 0.2, 0.24]]) boule(g, r * e, tons[k++ % 3], x + dx * e, dy * e, z + dz * e, { fin: "feuille", facettes: true });
}
/* La jardinière de sansevières : un bac long et des lames droites, pour border un passage */
function jardiniere(g, x, z, L, ry, graine) {
  ry = ry || 0; emprise(x, z, L + 0.04, 0.44, ry); const j = new THREE.Group(); j.position.set(x, 0, z); j.rotation.y = ry; g.add(j);
  boiteM(j, L, 0.55, 0.4, BLANC, 0, 0.275, 0, { fin: "laque" }); boiteM(j, L - 0.06, 0.02, 0.34, 0x3a2a1c, 0, 0.555, 0, { sansOmbre: true });
  const r = alea(graine || 5), n = Math.round(L / 0.11);
  for (let i = 0; i < n; i++) { const h = 0.45 + r() * 0.5, c = cone(j, 0.055, h, [0x2f8a4b, 0x3fa55e, 0x4a9a52, 0x6fb46a][i % 4], -L / 2 + 0.08 + (L - 0.16) * i / (n - 1) + (r() - 0.5) * 0.05, 0.55 + h / 2, (r() - 0.5) * 0.2, { fin: "feuille", seg: 4, sansOmbre: i % 2 === 1 }); c.scale.z = 0.35; c.rotation.y = r() * 3; c.rotation.z = (r() - 0.5) * 0.25; }
}
/* Le palmier en pot : un vrai palmier de la ville, en petit, s'il est chargé */
let nPalmier = 0;
function palmierPot(g, x, z, h) {
  h = h || 3.4; emprise(x, z, 1.0, 1.0); cyl(g, 0.4, 0.62, BLANC, x, 0.31, z, { rHaut: 0.5, fin: "ceramique", seg: 24 }); cyl(g, 0.46, 0.03, 0x3a2a1c, x, 0.61, z, { sansOmbre: true, seg: 24 });
  const p = MODELES.palmiers.length ? MODELES.palmiers[nPalmier++ % MODELES.palmiers.length] : null;
  if (p) { const k = h / p.hauteur, a = new THREE.Group(); a.position.set(x, 0.55, z); a.scale.setScalar(k); a.rotation.y = nPalmier * 2.1; g.add(a); for (const q of p.parties) { const m = new THREE.Mesh(q.geometry, q.material); m.castShadow = true; m.receiveShadow = true; a.add(m); } return; }
  cyl(g, 0.09, 2.6, 0x8a6a48, x, 1.9, z, { rough: 1, seg: 8 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9, f = boiteM(g, 0.34, 0.03, 1.5, 0x3f9a55, x + Math.sin(a) * 0.62, 3.05, z + Math.cos(a) * 0.62, { fin: "feuille", ry: a }); f.rotation.x = 0.5; }
}
/* Le canapé. ry = 0 : il regarde vers +z. Deux places assises notées. */
function canape(g, x, z, ry, couleur) {
  ry = ry || 0; const t = MM.canape ? MM.canape.userData.taille : { x: 2.2, z: 0.9 };
  emprise(x, z, t.x + 0.06, t.z + 0.06, ry);
  const c = poser3d("canape", g, x, z, ry + TOURNE.canape);
  if (c) { if (couleur != null) cuir(c, /sofa/i, couleur); }
  else {
    couleur = couleur == null ? 0xe9e4da : couleur; const k = new THREE.Group(); k.position.set(x, 0, z); k.rotation.y = ry; g.add(k);
    boiteM(k, 2.2, 0.26, 0.9, couleur, 0, 0.3, 0, { fin: "tissu" }); boiteM(k, 2.2, 0.55, 0.22, couleur, 0, 0.6, -0.34, { fin: "tissu" });
    boiteM(k, 0.2, 0.42, 0.9, couleur, -1.0, 0.44, 0, { fin: "tissu" }); boiteM(k, 0.2, 0.42, 0.9, couleur, 1.0, 0.44, 0, { fin: "tissu" });
    for (const sx of [-0.5, 0.5]) boiteM(k, 0.9, 0.14, 0.62, couleur, sx, 0.47, 0.08, { fin: "tissu" }); for (const sx of [-1, 1]) for (const sz of [-0.36, 0.36]) cyl(k, 0.03, 0.22, NOIR, sx, 0.11, sz, { fin: "metal" });
  }
  // les deux places : chacune notée 26 cm derrière le nez de SON coussin (le devant du canapé est galbé), à la vraie hauteur du coussin
  for (const sx of [-0.45, 0.45]) { const pr = c ? profilAssise("canape", sx) : null, av = (pr ? pr.nez : 0.39) - 0.26;
    const w = monde(g, x + Math.cos(ry) * sx + Math.sin(ry) * av, z - Math.sin(ry) * sx + Math.cos(ry) * av, ry); siege(w.x, w.z, pr ? pr.haut : H_ASSISE.canape, w.ry, "canape", 0.26); }
}
/* La table basse ronde (le vrai modèle), e = taille */
function tableBasse(g, x, z, e) {
  e = e || 1; const t = MM.tableBasse ? MM.tableBasse.userData.taille : { x: 1.1, y: 0.42, z: 1.1 };
  emprise(x, z, t.x * e + 0.04, t.z * e + 0.04);
  const c = poser3d("tableBasse", g, x, z, 0);
  if (c) c.scale.setScalar(e); else { cyl(g, 0.55 * e, 0.04, 0, x, 0.4 * e, z, { mat: matNoyer, seg: 32 }); for (let i = 0; i < 3; i++) cyl(g, 0.025, 0.38 * e, NOIR, x + Math.sin(i * 2.1) * 0.38 * e, 0.19 * e, z + Math.cos(i * 2.1) * 0.38 * e, { fin: "metal", seg: 8 }); }
  return t.y * e;                                                           // la hauteur du plateau, pour y poser quelque chose
}
/* La table ronde haute de 74 cm (réunion, repas). h = autre hauteur (mange-debout : 1,05) */
function tableRonde(g, x, z, r, h) { h = h || 0.74; emprise(x, z, 2 * r + 0.1, 2 * r + 0.1); cyl(g, r, 0.05, BLANC, x, h, z, { fin: "laque", seg: 32 }); cyl(g, 0.05, h - 0.04, NOIR, x, (h - 0.04) / 2, z, { fin: "metal" }); cyl(g, r * 0.55, 0.03, NOIR, x, 0.02, z, { fin: "metal", seg: 24 }); }
/* Le rayonnage : deux vraies étagères en acier côte à côte, remplies. genre = "archives" (boîtes, classeurs), "livres" ou "atelier". */
function etagere(g, x, z, ry, n, genre) {
  const e = new THREE.Group(); e.position.set(x, 0, z); e.rotation.y = ry || 0; g.add(e);
  const t = MM.etagere ? MM.etagere.userData.taille : null, lu = t ? t.x : 1.2, prof = t ? t.z : 0.5, niveaux = t ? [0.11, 0.61, 1.11, 1.6] : [0.14, 0.76, 1.38];
  emprise(x, z, 2 * lu + 0.04, prof + 0.06, ry);
  if (t) { poser3d("etagere", e, -lu / 2, 0, 0); poser3d("etagere", e, lu / 2, 0, 0); }
  else { for (const sx of [-1.2, 0, 1.2]) boiteM(e, 0.05, 2.1, 0.5, NOIR, sx, 1.05, 0, { fin: "metal" }); for (let r = 0; r < 4; r++) boiteM(e, 2.4, 0.04, 0.5, 0, 0, 0.12 + r * 0.62, 0, { mat: matPlateau }); }
  const r = alea(977 + (n || 0) * 131);
  for (const sx of [-lu / 2, lu / 2]) for (let k = 0; k < niveaux.length; k++) garnir(e, r, genre || "archives", sx, niveaux[k] + 0.012, lu - 0.16, prof - 0.12, k);
}
const TONS_DOSSIER = [INDIGO, 0x2c2f45, 0xe0a52a, 0x1e1b4b, 0x7f8aa6, 0x2f7d5b, 0xb84a3c, 0x4f46e5, 0x2c2f45];   // les classeurs : surtout bleu nuit, indigo et gris
function garnir(e, r, genre, cx, y, W, D, etage) {                           // remplit une tablette, de gauche à droite
  let x = cx - W / 2;
  const fin = cx + W / 2;
  while (x < fin - 0.06) {
    const tir = r();
    if (genre === "livres") {
      if (tir < 0.2) { x += 0.08 + r() * 0.14; continue; }
      if (tir < 0.3 && fin - x > 0.2) { const o = r(); if (o < 0.5) { cyl(e, 0.07, 0.12, BLANC, x + 0.1, y + 0.06, 0, { fin: "ceramique", seg: 12 }); boule(e, 0.1, 0x3fa55e, x + 0.1, y + 0.2, 0, { fin: "feuille", facettes: true }); } else boiteM(e, 0.16, 0.2, 0.03, [0xd9b48a, NOIR, 0xa78bfa][etage % 3], x + 0.1, y + 0.1, 0.02, { fin: "laque" }); x += 0.24; continue; }
      const nb = 3 + (r() * 5 | 0); for (let i = 0; i < nb && x < fin - 0.05; i++) { const w = 0.03 + r() * 0.03, h = 0.2 + r() * 0.12; boiteM(e, w, h, 0.2 + r() * 0.06, [0xe9e3d5, 0x1e1b4b, 0x8a3b2e, 0x2f5d50, 0xc9a877, 0x4f46e5, 0x2c2f45][(r() * 7) | 0], x + w / 2, y + h / 2, 0.02, { fin: "mat", sansOmbre: true }); x += w + 0.004; }
      continue;
    }
    if (genre === "atelier") {
      if (tir < 0.15) { x += 0.1 + r() * 0.12; continue; }
      if (tir < 0.55 && fin - x > 0.24) { const c = [0xf4f1ea, 0xf4f1ea, 0xc9ccd6][(r() * 3) | 0]; cyl(e, 0.105, 0.22, c, x + 0.12, y + 0.11, 0.02, { rough: 0.35, metal: 0.3, seg: 14 }); cyl(e, 0.108, 0.07, TONS_DOSSIER[(r() * 5) | 0], x + 0.12, y + 0.1, 0.02, { rough: 0.5, seg: 14, sansOmbre: true }); x += 0.25; continue; }
      if (fin - x > 0.46) { const c = [0xd93a3f, 0x35507a, 0xf59e0b][(r() * 3) | 0]; boiteM(e, 0.42, 0.2, 0.24, c, x + 0.22, y + 0.1, 0.02, { rough: 0.4, metal: 0.2 }); boiteM(e, 0.2, 0.03, 0.04, NOIR, x + 0.22, y + 0.215, 0.02, { fin: "metal", sansOmbre: true }); x += 0.47; continue; }
      x += 0.12; continue;
    }
    if (tir < 0.1) { x += 0.08 + r() * 0.1; continue; }
    if (tir < 0.62 && fin - x > 0.34) {                                         // une boîte d'archives, avec son étiquette de chaque côté
      const w = 0.3 + r() * 0.04, h = 0.27 + r() * 0.05, ton = r() < 0.6 ? KRAFT : BLANC; boiteM(e, w, h, D, ton, x + w / 2, y + h / 2, 0, { fin: "mat" });
      const et = TONS_DOSSIER[(r() * TONS_DOSSIER.length) | 0]; for (const s of [-1, 1]) boiteM(e, w * 0.62, 0.09, 0.006, et, x + w / 2, y + h * 0.56, s * (D / 2 + 0.002), { fin: "mat", sansOmbre: true });
      x += w + 0.015; continue;
    }
    const nb = 2 + (r() * 4 | 0), ton = TONS_DOSSIER[(r() * TONS_DOSSIER.length) | 0];                                    // une série de classeurs
    for (let i = 0; i < nb && x < fin - 0.075; i++) { boiteM(e, 0.068, 0.32, D - 0.06, i === nb - 1 && r() < 0.4 ? 0xe9e3d5 : ton, x + 0.035, y + 0.16, 0, { fin: "mat", sansOmbre: i % 2 === 1 }); x += 0.074; }
  }
}
function panneauTexte(g, texte, w, h, x, y, z, ry, fond, encre, lum) {
  const t = toile(512, Math.round(512 * h / w), (c, W, H) => { c.fillStyle = fond; c.fillRect(0, 0, W, H); c.fillStyle = encre; c.font = "600 " + Math.round(H * 0.46) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texte, W / 2, H / 2 + 4); }, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.35 : lum, roughness: 0.4 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m;
}

/* ── Les meubles ajoutés ── */
/* Le tapis : une moquette posée sur le sol, sans épaisseur visible */
function tapis(g, x, z, w, d, mat) { return boiteM(g, w, 0.02, d, 0, x, 0.012, z, { mat: mat || TAPIS.sable, sansOmbre: true, recoit: true }); }
/* La cimaise : un pan de mur plein, posé au sol devant la cloison vitrée, pour y accrocher un écran ou une enseigne */
function cimaise(g, x, z, L, h, ry, couleur, o) { emprise(x, z, L + 0.04, 0.24, ry); return boiteM(g, L, h, 0.12, couleur == null ? BLANC : couleur, x, h / 2, z, Object.assign({ fin: "laque", ry: ry || 0 }, o || {})); }
/* L'écran accroché : un cadre noir et sa dalle lumineuse. ry = 0 : il regarde vers +z. */
function ecranMural(g, w, h, x, y, z, ry, mat) {
  ry = ry || 0; boiteM(g, w + 0.08, h + 0.08, 0.05, NOIR, x, y, z, { fin: "metal", ry, sansOmbre: true });
  return ecran(g, w, h, x + Math.sin(ry) * 0.027, y, z + Math.cos(ry) * 0.027, ry, mat);
}
/* Le meuble bas (buffet, comptoir) : façades laquées, plateau en bois. Rend le groupe, pour y poser des objets (dessus à y = 0,86). */
function meubleBas(g, x, z, L, ry, o) {
  o = o || {}; const P = o.prof || 0.5, H = o.h || 0.84; emprise(x, z, L + 0.04, P + 0.04, ry);
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = ry || 0; g.add(m);
  boiteM(m, L, H - 0.1, P, o.couleur == null ? BLANC : o.couleur, 0, 0.06 + (H - 0.1) / 2, 0, { fin: "laque" }); boiteM(m, L - 0.1, 0.06, P - 0.08, NOIR, 0, 0.03, 0, { fin: "metal", sansOmbre: true });
  boiteM(m, L + 0.04, 0.04, P + 0.04, 0, 0, H, 0, { mat: o.mat || matPlateau });
  const n = Math.max(1, Math.round(L / 0.6)); for (let i = 1; i < n; i++) boiteM(m, 0.012, H - 0.16, 0.01, 0xc9ccd6, -L / 2 + L * i / n, 0.06 + (H - 0.1) / 2, P / 2 + 0.003, { fin: "metal", sansOmbre: true });
  return m;
}
/* Le coin café : un buffet, la machine, les tasses */
function coinCafe(g, x, z, L, ry) {
  const m = meubleBas(g, x, z, L, ry); machineCafe(m, -L / 2 + 0.4, 0.86, 0, 0);
  for (let i = 0; i < 4; i++) cyl(m, 0.04, 0.09, i % 2 ? 0xa78bfa : BLANC, -L / 2 + 0.85 + (i % 2) * 0.11, 0.905, -0.08 + (i >> 1) * 0.12, { fin: "ceramique", seg: 10, sansOmbre: true });
  if (L > 1.6) { boiteM(m, 0.34, 0.03, 0.24, NOIR, L / 2 - 0.35, 0.875, 0, { fin: "metal", sansOmbre: true }); for (let i = 0; i < 3; i++) cyl(m, 0.035, 0.16, [0x30a46c, 0xf59e0b, 0xd9486e][i], L / 2 - 0.45 + i * 0.1, 0.97, 0, { rough: 0.3, seg: 8, sansOmbre: true }); }
  return m;
}
function machineCafe(g, x, y, z, ry) {
  const c = poser3d("machineCafe", g, x, z, (ry || 0) + TOURNE.machineCafe, y); if (c) return c;
  boiteM(g, 0.26, 0.36, 0.34, NOIR, x, y + 0.18, z, { fin: "metal", ry: ry || 0 }); return boiteM(g, 0.2, 0.05, 0.1, 0xc9ccd6, x, y + 0.2, z + 0.16, { fin: "metal", ry: ry || 0, sansOmbre: true });
}
/* L'ordinateur portable ouvert. ry = 0 : l'écran regarde vers +z (vers la personne assise de ce côté). */
function portable(g, x, y, z, ry) {
  const c = poser3d("portable", g, x, z, (ry || 0) + TOURNE.portable, y); if (c) { sansOmbrePortee(c); return c; }
  const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry || 0; g.add(p);
  boiteM(p, 0.34, 0.016, 0.24, 0xc9ccd6, 0, 0.008, 0, { fin: "metal", sansOmbre: true }); const e = boiteM(p, 0.34, 0.22, 0.012, 0xc9ccd6, 0, 0.12, -0.13, { fin: "metal", sansOmbre: true }); e.rotation.x = -0.2; return p;
}
/* L'imprimante (le vrai modèle, à sa taille de bureau) posée sur un petit meuble. ry = 0 : elle regarde vers +z. */
function imprimante(g, x, z, ry) {
  const t = MM.imprimante ? MM.imprimante.userData.taille : null, k = t ? 0.46 / t.x : 1, P = t ? Math.max(0.6, t.z * k + 0.04) : 0.6;
  const m = meubleBas(g, x, z, 0.78, ry, { prof: P, h: 0.66 });
  const c = poser3d("imprimante", m, 0, 0, TOURNE.imprimante, 0.68);
  if (c) { c.scale.setScalar(k); sansOmbrePortee(c); ombre(m, 0.44, 0.2, 0.4, 0, 0.78, 0); }
  else { boiteM(m, 0.46, 0.2, 0.4, NOIR, 0, 0.78, 0, { fin: "laque" }); boiteM(m, 0.3, 0.012, 0.2, 0xffffff, 0, 0.885, 0.05, { sansOmbre: true }); }
  boiteM(m, 0.22, 0.05, 0.3, 0xffffff, 0.24, 0.705, 0.02, { sansOmbre: true, ry: 0.08 });                     // une rame de papier
  return m;
}
/* Le copieur sur pied : le gros appareil blanc de tout open space. ry = 0 : sa façade regarde vers +z. */
function copieur(g, x, z, ry) {
  emprise(x, z, 0.7, 0.72, ry); const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c);
  boiteM(c, 0.62, 0.74, 0.62, BLANC, 0, 0.41, 0, { fin: "laque" }); boiteM(c, 0.56, 0.04, 0.56, NOIR, 0, 0.02, 0, { fin: "metal", sansOmbre: true });
  for (let i = 0; i < 3; i++) { boiteM(c, 0.56, 0.012, 0.01, 0x9aa0b4, 0, 0.2 + i * 0.2, 0.312, { fin: "metal", sansOmbre: true }); boiteM(c, 0.14, 0.03, 0.02, 0x2c2f45, 0, 0.27 + i * 0.2, 0.315, { fin: "mat", sansOmbre: true }); }   // les trois bacs à papier
  boiteM(c, 0.62, 0.1, 0.5, 0x2c2f45, 0, 0.83, -0.06, { fin: "mat" }); boiteM(c, 0.66, 0.06, 0.56, BLANC, 0, 0.91, -0.03, { fin: "laque" });                                                  // la vitre et son capot
  boiteM(c, 0.5, 0.03, 0.3, 0xdfe1e8, 0, 0.955, -0.05, { fin: "laque", sansOmbre: true }); boiteM(c, 0.4, 0.012, 0.22, 0xffffff, 0.02, 0.975, -0.05, { sansOmbre: true, ry: 0.06 });               // le chargeur, une feuille
  const e = boiteM(c, 0.26, 0.02, 0.14, 0x15172b, 0.14, 0.87, 0.3, { fin: "laque", sansOmbre: true }); e.rotation.x = 0.5; const v = boiteM(c, 0.16, 0.006, 0.09, 0x7f9cff, 0.14, 0.882, 0.305, { lum: 0.9, sansOmbre: true }); v.rotation.x = 0.5;   // l'écran de commande
  boiteM(c, 0.2, 0.02, 0.34, BLANC, -0.41, 0.6, 0, { fin: "laque" }); boiteM(c, 0.16, 0.012, 0.28, 0xffffff, -0.42, 0.616, 0, { sansOmbre: true });                                             // le bac de sortie, sur le côté
  return c;
}
/* Le lampadaire : une tige, un abat-jour qui éclaire */
function lampadaire(g, x, z) { emprise(x, z, 0.4, 0.4); cyl(g, 0.16, 0.03, NOIR, x, 0.015, z, { fin: "metal", seg: 16 }); cyl(g, 0.015, 1.5, NOIR, x, 0.76, z, { fin: "metal", seg: 6 }); cyl(g, 0.2, 0.3, 0xffe2b0, x, 1.62, z, { rHaut: 0.14, lum: 0.9, rough: 0.9, seg: 16 }); }
/* Le banc rembourré (ry = 0 : on s'y assoit en regardant +z). places = nombre d'assises notées */
function banc(g, x, z, L, ry, couleur, places) {
  ry = ry || 0; emprise(x, z, L + 0.04, 0.5, ry); const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
  boiteM(b, L, 0.12, 0.46, couleur == null ? 0x2c2f45 : couleur, 0, 0.39, 0, { fin: "tissu" }); boiteM(b, L - 0.1, 0.04, 0.4, NOIR, 0, 0.31, 0, { fin: "metal", sansOmbre: true });
  for (const sx of [-L / 2 + 0.12, L / 2 - 0.12]) boiteM(b, 0.04, 0.3, 0.4, NOIR, sx, 0.15, 0, { fin: "metal" });
  places = places || Math.max(1, Math.floor(L / 0.6)); for (let i = 0; i < places; i++) { const w = monde(b, -L / 2 + L * (i + 0.5) / places, 0, 0); siege(w.x, w.z, H_ASSISE.banc, w.ry, "banc", 0.23); }
}
/* Le carton (déménagement, archives) */
function carton(g, x, y, z, w, h, d, ry, ton) { boiteM(g, w, h, d, ton == null ? KRAFT : ton, x, y + h / 2, z, { fin: "mat", ry: ry || 0 }); boiteM(g, w + 0.004, 0.012, d * 0.16, 0xe6d2a8, x, y + h + 0.001, z, { fin: "mat", ry: ry || 0, sansOmbre: true }); }

/* L'affiche ou le tableau : un dessin fait ici, sur un panneau plat. ry = 0 : il regarde vers +z. lum : il éclaire un peu (écran) ou pas (papier). */
function affiche(g, w, h, x, y, z, ry, dessin, lum) {
  const t = toile(512, Math.max(64, Math.round(512 * h / w)), dessin, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.18 : lum, roughness: 0.5 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m;
}
function titre(c, texte, x, y, px, couleur, gras) { c.fillStyle = couleur; c.font = (gras || "600") + " " + px + "px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.fillText(texte, x, y); }

