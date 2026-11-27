/* ───────────────────────── Les personnages ─────────────────────────
   De vrais modèles animés (marche, attente, assise), clonés puis rhabillés selon le type de personne.
   Chaque modèle est d'abord « fondu » en une seule pièce : un personnage = un seul tracé à l'écran, quel que soit son nombre de matières.
   Les couleurs sont alors portées par les sommets : on change une tenue sans créer de matière.
   Si un modèle manque, on retombe sur le bonhomme simple dessiné à la main. */
const TYPES = {                                                             // les couleurs du bonhomme simple (le secours)
  responsable: { haut: 0x14161f, bas: 0x0e1016, peau: 0xe8b894, cheveux: 0x15120e, col: 0x8b5cf6 },
  visiteur: { haut: 0x8d93b8, bas: 0x2a2c44, peau: 0xf0c8a8, cheveux: 0x3a2a1c }, particulier: { haut: 0x4f46e5, bas: 0x23263c, peau: 0xe8b894, cheveux: 0x1b1d2b }, pro: { haut: 0x0e8f8f, bas: 0x23263c, peau: 0xd9a47c, cheveux: 0x5a3a22 },
  artisan: { haut: 0xf08a24, bas: 0x35507a, peau: 0xe8b894, casque: 0xffd23f }, candidat: { haut: 0xb9a37a, bas: 0x35507a, peau: 0xf0c8a8, casque: 0xf4f1ea },
  serveur: { haut: 0xf4f1ea, bas: 0x15161c, peau: 0xe8b894, cheveux: 0x2a1d14, col: 0x1e1b4b },
  dani: { haut: 0x1e1b4b, bas: 0x15172b, peau: 0xd9a47c, cheveux: 0x15120e, col: 0xa78bfa }, client: { haut: 0xd9486e, bas: 0x2a2c44, peau: 0xf0c8a8, cheveux: 0x7a4a22 },
};
const persos = [], robots = [];

/* Les réglages qu'on peut vouloir retoucher */
const GENS = {
  tailleHomme: 1.78, tailleFemme: 1.67, tailleOuvrier: 1.8, tailleRobot: 1.5,   // en mètres (l'ouvrier : casque compris)
  ecartTaille: 0.03,                                                         // chacun est un peu plus grand ou plus petit (± 3 %)
  fondu: 0.25,                                                               // secondes pour passer de l'attente à la marche
  allure: [0.7, 0.92],                                                       // la vitesse de marche de chacun, en part du pas naturel du modèle (environ 1,5 m/s ; 1,3 pour l'ouvrier)
  siege: 0.46,                                                               // hauteur d'assise retenue quand on ne trouve pas le siège sous la personne
  siegeMin: 0.25, siegeMax: 0.72,                                            // un siège inconnu du mobilier se cherche entre ces deux hauteurs
  recul: { bureau: 0.05, tabouret: 0, transat: 0.1 },                         // sièges sans bord noté : de combien on recule les hanches par rapport au milieu de l'assise
  jeuMollet: 0.02,                                                           // sièges à bord noté (canapé, fauteuil, banc) : l'arrière des mollets reste à 2 cm DEVANT le nez du coussin, jamais dedans
  auBord: 0.12,                                                              // … et les hanches restent au moins 12 cm derrière ce nez (on ne s'assoit pas dans le vide)
  enfonce: { salon: 0.025, canape: 0.03 },                                   // un coussin s'écrase un peu sous la personne
  casque: 0.115,                                                             // hauteur du casque au-dessus de l'os de la tête, pour les ouvriers assis
  voile: 0.5,                                                                // opacité des robots (des hologrammes : ils ne sont « pas encore créés »)
  lissage: 62,                                                               // en degrés : deux facettes qui font un angle plus petit sont fondues en une surface lisse (0 = facettes brutes)
};

/* Qui porte quoi : les modèles possibles pour chaque type, et ses couleurs */
const PEAUX = [0xf0c8a8, 0xe8b894, 0xd9a47c, 0xc68e63, 0x9a6a44, 0x74492c], CHEVEUX = [0x15120e, 0x2a1d14, 0x4a3020, 0x7a5a36, 0xb08a4e, 0x6e6a66, 0x3a2a1c];
const TENUES = {
  visiteur: { modeles: ["hommeManches", "femmeDecontractee", "homme", "femmeRobe", "femmeVeste", "hommeManches", "femmeDecontractee"], hauts: [0xe9e4da, 0x9aa3b5, 0xcfd3dc, 0x6b7280, 0xb8c4d9, 0x8d93b8, 0xa8b0a0], bas: [0x2a2c44, 0x3b4252, 0x55607a, 0x8a8172, 0x1f2430] },
  particulier: { modeles: ["hommeManches", "femmeRobe", "femmeDecontractee", "homme", "femmeVeste"], hauts: [0x4f46e5, 0x6366f1, 0x4338ca, 0x818cf8, 0x3730a3], bas: [0x23263c, 0x1e1b4b, 0x2f3349, 0x3b4252] },
  pro: { modeles: ["hommeCostume", "femmeVeste", "hommeCostume"], hauts: [0x2b2f3a, 0x3d4454, 0x14343a, 0x4a4f5c, 0x1f2937], cravates: [0x0e8f8f, 0x9a2f3a, 0x3d5a9a] },
  client: { modeles: ["femmeRobe", "hommeManches", "femmeDecontractee", "homme", "femmeVeste"], hauts: [0xd9486e, 0xc2410c, 0xe0a030, 0xb5533c, 0xe8825a], bas: [0x2a2c44, 0x6b4a32, 0x3b3340, 0x4a3b34] },
  dani: { modeles: ["hommeCostume"] },
  serveur: { modeles: ["hommeManches", "femmeDecontractee"], hauts: [0xf4f1ea], bas: [0x15161c] },                 // le serveur du bar à café : chemise claire, pantalon noir, tablier indigo
  responsable: { modeles: ["hommeCostume", "femmeVeste"], hauts: [0x14161f], cravates: [0x8b5cf6] },   // l'agent IA responsable d'une pièce : costume sombre, cravate violette, insigne au-dessus de la tête
  artisan: { modeles: ["ouvrier"], gilets: [0xf08a24, 0xf5761a, 0xe89a1c], casque: 0xffd23f, bande: 0xf4e04d },
  candidat: { modeles: ["ouvrier"], gilets: [0xb9a37a, 0xc4b08a], casque: 0xf4f1ea, bande: 0xe9e3d5 },
};

/* ── Fondre un modèle en une seule pièce ──
   Le fichier range chaque matière dans un morceau à part (jusqu'à 19 pour le robot). On recopie tous les sommets, dans la pose de repos,
   dans une seule géométrie reliée à un seul squelette. Un morceau rigide accroché à un os (le robot) suit simplement cet os. */
const matGens = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, skinning: true, envMapIntensity: 0.6 });
function fondre(brut) {
  const racine = THREE.SkeletonUtils.clone(brut.scene);
  racine.position.set(0, 0, 0); racine.rotation.set(0, 0, 0); racine.scale.set(1, 1, 1); racine.updateMatrixWorld(true);
  const tout = [], sources = [];
  racine.traverse((o) => { if (!o.isMesh) return; tout.push(o); let a = o.parent; while (a && !a.isBone) a = a.parent;
    const peau = !!(o.isSkinnedMesh && o.geometry.attributes.skinIndex && o.geometry.attributes.skinWeight); if (peau || a) sources.push({ o, peau, os: a }); });
  const os = [], rang = new Map(), numero = (b) => { if (!rang.has(b)) { rang.set(b, os.length); os.push(b); } return rang.get(b); };
  let n = 0; for (const s of sources) n += s.o.geometry.attributes.position.count;
  if (!n) return null;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), coul = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), index = [], zones = [];
  const v = new THREE.Vector3(), w = new THREE.Vector3(), M = new THREE.Matrix4(), S = new THREE.Matrix4(), B = new THREE.Matrix4();
  let base = 0;
  for (const s of sources) {
    const o = s.o, g = o.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.attributes.skinIndex, W = g.attributes.skinWeight, nb = P.count;
    const div = W && W.normalized ? (W.array instanceof Uint8Array ? 255 : 65535) : 1, c = o.material.color, fixe = s.peau ? 0 : numero(s.os);
    for (let i = 0; i < nb; i++) {
      const k = base + i; let tot = 0;
      if (s.peau) {                                                          // la place du sommet au repos : le mélange des os qui le tirent
        const e = S.elements, ids = [I.getX(i), I.getY(i), I.getZ(i), I.getW(i)], pds = [W.getX(i), W.getY(i), W.getZ(i), W.getW(i)]; e.fill(0);
        for (let j = 0; j < 4; j++) { const p = pds[j] / div; if (!(p > 0)) continue; const b = o.skeleton.bones[ids[j]]; if (!b) continue;
          B.multiplyMatrices(b.matrixWorld, o.skeleton.boneInverses[ids[j]]); for (let m = 0; m < 16; m++) e[m] += B.elements[m] * p; tot += p; si[k * 4 + j] = numero(b); sw[k * 4 + j] = p; }
        if (tot > 0) { for (let m = 0; m < 16; m++) e[m] /= tot; for (let j = 0; j < 4; j++) sw[k * 4 + j] /= tot; M.copy(S).multiply(o.bindMatrix); }
      }
      if (!(tot > 0)) { M.copy(o.matrixWorld); si[k * 4] = fixe; sw[k * 4] = 1; }
      v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
      if (N) w.fromBufferAttribute(N, i).transformDirection(M); else w.set(0, 1, 0); nor[k * 3] = w.x; nor[k * 3 + 1] = w.y; nor[k * 3 + 2] = w.z;
      coul[k * 3] = c.r; coul[k * 3 + 1] = c.g; coul[k * 3 + 2] = c.b;
    }
    if (g.index) for (let j = 0; j < g.index.count; j++) index.push(base + g.index.getX(j)); else for (let j = 0; j < nb; j++) index.push(base + j);
    zones.push({ nom: o.material.name || "", partie: (o.parent && o.parent.name) || "", debut: base, nb });
    base += nb;
  }
  for (const o of tout) o.parent.remove(o);
  adoucir(pos, nor, index, GENS.lissage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(coul, 3));
  geo.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); geo.setIndex(index);
  const peau = new THREE.SkinnedMesh(geo, matGens); peau.name = "peau"; peau.frustumCulled = false; peau.castShadow = true; peau.receiveShadow = true;
  racine.add(peau); peau.bind(new THREE.Skeleton(os), new THREE.Matrix4());

  // les mouvements : on les retrouve par leur nom, et on ne garde que les pistes qui visent un os présent
  const piste = (t) => { try { return !!racine.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName); } catch (e) { return false; } };
  const clip = (re) => { const a = (brut.animations || []).find((x) => re.test(x.name)); return a ? new THREE.AnimationClip(a.name, a.duration, a.tracks.filter(piste)) : null; };
  const clips = { repos: clip(/idle$/i), marche: clip(/walk(ing)?$/i), assis: clip(/sitting$/i), salut: clip(/wave$/i), applaudit: clip(/clapping$/i), bricole: clip(/interact$/i), danse: clip(/dance$/i), oui: clip(/(yes|thumbsup)$/i) };

  // les mesures, prises sur la pose réelle (la boîte du maillage brut est fausse : l'armature est à l'échelle 100)
  const garde = []; racine.traverse((o) => garde.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  const mix = new THREE.AnimationMixer(racine);
  const pose = (c, t) => { mix.stopAllAction(); if (c) { mix.clipAction(c).reset().play(); mix.setTime(t); } racine.updateMatrixWorld(true); };
  const boite = (garder) => { const b = new THREE.Box3(); for (let i = 0; i < n; i++) { peau.boneTransform(i, v); if (!garder || garder(v)) b.expandByPoint(v); } return b; };
  pose(clips.repos, 0); const b0 = boite(), G = { racine, geo, zones, clips, hauteur: b0.max.y - b0.min.y, sol: b0.min.y, femme: (brut.animations || []).some((a) => /female/i.test(a.name)) };
  G.vClip = G.hauteur * 0.8;                                                 // vitesse du mouvement de marche, en unités du modèle par seconde
  if (clips.marche) {                                                        // la vraie : la course de chaque pied vers l'arrière pendant un cycle
    const pieds = os.filter((b) => /^foot[lr]$/i.test(b.name)), N = 48, T = clips.marche.duration, traj = pieds.map(() => []);
    for (let i = 0; i < N; i++) { pose(clips.marche, T * i / N); pieds.forEach((b, k) => { b.getWorldPosition(v); traj[k].push({ y: v.y, z: v.z }); }); }
    let somme = 0, nb = 0, course = 0;
    for (const t of traj) {                                                  // tant qu'un pied est posé (au plus bas), il recule exactement à la vitesse où le corps avance
      const bas = Math.min.apply(null, t.map((e) => e.y)), haut = Math.max.apply(null, t.map((e) => e.y)), zs = t.map((e) => e.z); course += Math.max.apply(null, zs) - Math.min.apply(null, zs);
      for (let i = 0; i < N; i++) { const a = t[i], b = t[(i + 1) % N], recul = (a.z - b.z) / (T / N); if (a.y < bas + (haut - bas) * 0.2 && b.y < bas + (haut - bas) * 0.2 && recul > 0) { somme += recul; nb++; } }
    }
    if (pieds.length === 2) G.vClip = nb > 6 ? somme / nb : course / T;       // (à défaut : la course des deux pieds pendant un cycle)
  }
  if (clips.assis) {                                                         // assis : où sont les hanches, et à quelle hauteur est le dessous des cuisses
    pose(clips.assis, clips.assis.duration * 0.999);
    const h = os.find((b) => /^hips$/i.test(b.name)); if (h) { h.getWorldPosition(w); const hz = w.z, H = G.hauteur;
      const b = boite((p) => p.z > hz - 0.02 * H && p.z < hz + 0.08 * H);
      const j = boite((p) => p.y < b.min.y - 0.025 * H && p.y > G.sol + 0.1 * H);          // les mollets : sous l'assise, au-dessus des chevilles
      G.assise = { recul: hz, y: b.min.y, mollets: j.isEmpty() ? hz + 0.2 * H : j.min.z }; }
  }
  mix.stopAllAction(); mix.uncacheRoot(racine);
  for (const [o, p, q, e] of garde) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(e); }
  racine.updateMatrixWorld(true);
  return G;
}
/* Adoucir les facettes : les modèles sont taillés à gros traits (chaque facette a sa propre lumière). Pour un rendu moins « jouet »,
   on donne à chaque sommet la moyenne des facettes voisines, sauf de part et d'autre d'une arête vive (visière du casque, semelles…). */
function adoucir(pos, nor, index, degres) {
  if (!(degres > 0)) return;
  const nf = index.length / 3, fn = new Float32Array(nf * 3), cle = new Map(), seuil = Math.cos(degres * Math.PI / 180);
  let ech = 0; for (let i = 0; i < pos.length; i++) ech = Math.max(ech, Math.abs(pos[i])); const K = 20000 / (ech || 1);
  const groupe = new Int32Array(pos.length / 3), faces = [];
  for (let v = 0; v < groupe.length; v++) { const k = Math.round(pos[v * 3] * K) + "," + Math.round(pos[v * 3 + 1] * K) + "," + Math.round(pos[v * 3 + 2] * K); let g = cle.get(k); if (g === undefined) { g = faces.length; cle.set(k, g); faces.push([]); } groupe[v] = g; }
  for (let f = 0; f < nf; f++) {                                             // la direction de chaque facette, pondérée par sa surface
    const a = index[f * 3] * 3, b = index[f * 3 + 1] * 3, c = index[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    fn[f * 3] = uy * vz - uz * vy; fn[f * 3 + 1] = uz * vx - ux * vz; fn[f * 3 + 2] = ux * vy - uy * vx;
    for (let j = 0; j < 3; j++) faces[groupe[index[f * 3 + j]]].push(f);
  }
  const neuf = new Float32Array(nor.length);
  for (let v = 0; v < groupe.length; v++) {
    const rx = nor[v * 3], ry = nor[v * 3 + 1], rz = nor[v * 3 + 2]; let x = 0, y = 0, z = 0;
    for (const f of faces[groupe[v]]) { const fx = fn[f * 3], fy = fn[f * 3 + 1], fz = fn[f * 3 + 2], L = Math.hypot(fx, fy, fz); if (L > 0 && (fx * rx + fy * ry + fz * rz) / L > seuil) { x += fx; y += fy; z += fz; } }
    const L = Math.hypot(x, y, z); if (L > 0) { neuf[v * 3] = x / L; neuf[v * 3 + 1] = y / L; neuf[v * 3 + 2] = z / L; } else { neuf[v * 3] = rx; neuf[v * 3 + 1] = ry; neuf[v * 3 + 2] = rz; }
  }
  nor.set(neuf);
}
const gabarits = {};
const SANS_MODELES = /[?&]secours=1/.test(location.search);                  // pour les essais : ?secours=1 fait comme si aucun modèle n'avait chargé
function gabarit(nom) {                                                      // le modèle fondu, fabriqué une seule fois ; null s'il manque
  if (!(nom in gabarits)) { let G = null; const brut = SANS_MODELES ? null : MODELES.gens[nom]; if (brut && brut.scene && THREE.SkeletonUtils) { try { G = fondre(brut); } catch (e) { G = null; } } gabarits[nom] = G; }
  return gabarits[nom];
}
/* Un exemplaire rhabillé : il partage tous les sommets du gabarit, seules ses couleurs lui sont propres */
const cTeinte = new THREE.Color();
function habiller(G, teinte) {
  const g = new THREE.BufferGeometry(), src = G.geo.attributes, c = new Float32Array(src.color.array);
  for (const k of ["position", "normal", "skinIndex", "skinWeight"]) g.setAttribute(k, src[k]); g.setIndex(G.geo.index);
  for (const z of G.zones) { const hex = teinte(z); if (hex == null) continue; cTeinte.setHex(hex).convertSRGBToLinear(); for (let i = z.debut; i < z.debut + z.nb; i++) { c[i * 3] = cTeinte.r; c[i * 3 + 1] = cTeinte.g; c[i * 3 + 2] = cTeinte.b; } }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
}
/* Le tablier du serveur : peint sur le devant du corps, de la poitrine aux cuisses (aucune pièce ajoutée, donc rien qui traverse) */
function tablier(geo, G, hex) {
  const P = G.geo.attributes.position, c = geo.attributes.color, H = G.hauteur, y0 = G.sol + 0.4 * H, y1 = G.sol + 0.74 * H, taille = G.sol + 0.6 * H;
  const zones = G.zones.filter((z) => /^shirt|^pants|^dress|^jacket/i.test(z.nom)); let zm = 0, nb = 0;
  for (const z of zones) for (let i = z.debut; i < z.debut + z.nb; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.abs(P.getX(i)) < 0.1 * H) { zm += P.getZ(i); nb++; } }
  if (!nb) return; zm /= nb; cTeinte.setHex(hex).convertSRGBToLinear();
  for (const z of zones) for (let i = z.debut; i < z.debut + z.nb; i++) { const y = P.getY(i); if (y > y0 && y < y1 && P.getZ(i) > zm && Math.abs(P.getX(i)) < (y > taille ? 0.07 : 0.115) * H) c.setXYZ(i, cTeinte.r, cTeinte.g, cTeinte.b); }
}
const nuance = (hex, k) => cTeinte.setHex(hex).lerp(k > 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), Math.abs(k)).getHex();

/* La tenue d'une personne : une couleur par matière du modèle (Shirt, Pants, Skin, Hair…), tirée au sort de façon reproductible */
function tenue(type, modele, r) {
  const T = TENUES[type] || TENUES.visiteur, pris = (l) => l[(r() * l.length) | 0];
  const peau = pris(PEAUX), poil = pris(CHEVEUX);
  if (modele === "ouvrier") {
    const gilet = pris(T.gilets), pantalon = pris([0x35507a, 0x3d4a5c, 0x4a4238, 0x2f3d55]), chemise = pris([0x8a8f9c, 0x6f7f96, 0xa39a86, 0x59657a]);
    return (z) => /yellow/i.test(z.nom) ? (/head/i.test(z.partie) ? T.casque : T.bande) : /vest/i.test(z.nom) ? gilet : /^skin/i.test(z.nom) ? peau : /brow$|eyebrow|moustache/i.test(z.nom) ? poil
      : /lightbrown/i.test(z.nom) ? chemise : /^brown2/i.test(z.nom) ? nuance(pantalon, -0.25) : /^brown/i.test(z.nom) ? pantalon : /black/i.test(z.nom) ? 0x1b1d2b : /grey/i.test(z.nom) ? 0x3a3d48 : null;
  }
  if (T.gilets) { const gilet = pris(T.gilets), pantalon = pris([0x35507a, 0x3d4a5c, 0x2f3d55]);   // un ouvrier sur un modèle ordinaire (assis) : haut de la couleur du gilet, pantalon de travail
    return (z) => /^skin/i.test(z.nom) ? peau : /^hair|brow/i.test(z.nom) ? poil : /^shirt/i.test(z.nom) ? gilet : /^pants/i.test(z.nom) ? pantalon : /^shoes/i.test(z.nom) ? 0x3b2a1c : /^socks/i.test(z.nom) ? 0x2a2c44 : null; }
  const dani = type === "dani", costume = modele === "hommeCostume", veste = modele === "femmeVeste";
  const haut = dani ? 0x1b2150 : pris(T.hauts || TENUES.visiteur.hauts), bas = dani ? 0x161b44 : costume || (veste && type === "pro") ? nuance(haut, -0.08) : pris(T.bas || TENUES.visiteur.bas);
  const cravate = dani ? 0xa78bfa : pris(T.cravates || [0x4f46e5, 0x9a2f3a, 0x3d5a9a]), souliers = pris([0x1b1d2b, 0x2a1d14, 0x3b2a1c, 0xe9e4da]);
  return (z) => {
    const n = z.nom;
    if (/^skin/i.test(n)) return dani ? 0xd9a47c : peau;
    if (/^hair|brow/i.test(n)) return dani ? 0x15120e : poil;
    if (/^shirt/i.test(n)) return veste ? 0xf4f1ea : haut;                  // sous une veste, le chemisier est clair
    if (/^lightjacket/i.test(n)) return nuance(haut, 0.18);
    if (/^jacket|^dress/i.test(n)) return haut;
    if (/^pants/i.test(n)) return bas;
    if (/^details/i.test(n)) return cravate;                                 // la cravate
    if (/^tie/i.test(n)) return 0xf4f1ea;                                    // le plastron de la chemise : blanc (c'est lui qui sortait violet sur Dani)
    if (/^shoes/i.test(n)) return costume || dani ? 0x15120e : souliers;
    if (/^socks/i.test(n)) return 0xe9e4da;
    return null;                                                             // les yeux gardent la couleur du fichier
  };
}

/* Le bonhomme simple, dessiné à la main : le secours quand un modèle n'a pas chargé */
function bonhomme(g, t, o) {
  const membres = [];
  for (const sx of [-0.1, 0.1]) { const j = new THREE.Group(); j.position.set(sx, 0.72, 0); g.add(j); cyl(j, 0.085, 0.68, t.bas, 0, -0.34, 0, { rHaut: 0.1, fin: "tissu", seg: 10 }); boiteM(j, 0.13, 0.07, 0.24, 0x15172b, 0, -0.7, 0.04, { fin: "mat" }); membres.push(j); }
  cyl(g, 0.2, 0.56, t.haut, 0, 1.0, 0, { rHaut: 0.23, fin: "tissu", seg: 14 }); boule(g, 0.23, t.haut, 0, 1.27, 0, { fin: "tissu" }).scale.set(1, 0.45, 0.8);
  for (const sx of [-0.27, 0.27]) { const b = new THREE.Group(); b.position.set(sx, 1.26, 0); g.add(b); cyl(b, 0.06, 0.55, t.haut, 0, -0.27, 0, { rHaut: 0.075, fin: "tissu", seg: 8 }); boule(b, 0.065, t.peau, 0, -0.58, 0, { rough: 0.6 }); membres.push(b); }
  cyl(g, 0.07, 0.1, t.peau, 0, 1.4, 0, { rough: 0.6, seg: 10 }); boule(g, 0.18, t.peau, 0, 1.58, 0, { rough: 0.6 });
  if (t.casque) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), pbr(t.casque, { rough: 0.3 })); c.position.set(0, 1.62, 0); c.castShadow = true; g.add(c); cyl(g, 0.23, 0.02, t.casque, 0, 1.63, 0.03, { rough: 0.3 }); }
  else { const c = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.9), pbr(t.cheveux, { rough: 0.9 })); c.position.set(0, 1.6, -0.02); g.add(c); }
  if (t.col) boiteM(g, 0.3, 0.06, 0.26, t.col, 0, 1.27, 0, { fin: "tissu", sansOmbre: true });
  if (o.assis) { membres[0].rotation.x = membres[1].rotation.x = -1.45; g.position.y = -0.2; }
  return membres;
}

/* L'emprise d'une personne qui ne bouge pas : les autres la contournent. On la marque, pour la distinguer d'un meuble. */
function empriseDe(p, x, z, w, d, ry) { const n = obstacles.length; emprise(x, z, w, d, ry); for (let i = n; i < obstacles.length; i++) obstacles[i].perso = p; }

/* Une personne. o : { fixe, assis, x, z, ry }. Sans modèle assis (l'ouvrier), « assis » veut dire : debout, à côté de son siège. */
const comptes = {};
function personne(type, piece, o) {
  o = o || {}; const t = TYPES[type] || TYPES.visiteur, T = TENUES[type] || TENUES.visiteur, g = new THREE.Group();
  const rg = comptes[type] = (comptes[type] || 0) + 1, r = alea(persos.length * 7919 + rg * 104729 + type.length * 131 + 17);
  const p = { g, piece, type, membres: [], fixe: !!o.fixe || !!o.assis, assis: false, debout: false, x: o.x != null ? o.x : piece.cx, z: o.z != null ? o.z : piece.cz,
    route: null, etape: 0, pause: Math.random() * 3, v: 0.9 + r() * 0.4, ph: Math.random() * 6, vit: 0, pm: 0, pg: 0, gt: 0, gesteA: null, regarde: null };
  // le modèle : chacun son tour dans la liste du type, pour une troupe variée et toujours la même
  let nom = null, G = null;
  const ouvrierAssis = !!o.assis && T.modeles[0] === "ouvrier", liste = ouvrierAssis ? ["hommeManches", "homme"] : T.modeles;   // le modèle « ouvrier » n'a pas de pose assise
  for (let i = 0; i < liste.length && !G; i++) { nom = liste[(rg - 1 + i) % liste.length]; G = gabarit(nom); }
  if (ouvrierAssis && G && G.clips.assis) p.casque = T.casque;
  if (G) {
    const corps = THREE.SkeletonUtils.clone(G.racine), peau = corps.getObjectByName("peau"); peau.geometry = habiller(G, tenue(type, nom, r)); if (type === "serveur") tablier(peau.geometry, G, 0x1e1b4b);
    const cible = nom === "ouvrier" ? GENS.tailleOuvrier : (G.femme ? GENS.tailleFemme : GENS.tailleHomme) * (type === "dani" ? 1.03 : 1), k = cible * (1 + (r() * 2 - 1) * GENS.ecartTaille) / G.hauteur;
    corps.scale.setScalar(k); corps.position.y = -G.sol * k; g.add(corps);
    p.G = G; p.k = k; p.corps = corps; p.vClip = G.vClip * k; p.mixer = new THREE.AnimationMixer(corps); p.A = {};
    p.v = p.vClip * (GENS.allure[0] + r() * (GENS.allure[1] - GENS.allure[0]));   // chacun son allure, toujours proche du pas naturel du modèle (sinon la marche a l'air ralentie)
    if (o.assis && G.clips.assis && G.assise) {                             // assis pour de bon : la fin du mouvement « s'asseoir », figée
      p.assis = true; const a = p.mixer.clipAction(G.clips.assis); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); a.time = G.clips.assis.duration - 0.01; a.paused = true;
      const s = typeof siegePres === "function" ? siegePres(p.x, p.z) : null; p.siegeNote = s && Math.hypot(s.x - p.x, s.z - p.z) < 0.15 ? s : null;   // le siège tel que le mobilier l'a noté
      const sn = p.siegeNote;
      if (sn && sn.bord != null) corps.position.z = Math.min(sn.bord + GENS.jeuMollet - G.assise.mollets * k, sn.bord - GENS.auBord - G.assise.recul * k);   // les mollets devant le coussin, les hanches encore dessus
      else corps.position.z = -G.assise.recul * k - (sn ? GENS.recul[sn.sorte] || 0 : 0);
      p.yAssise = G.assise.y * k; corps.position.y = GENS.siege - p.yAssise;       // les hanches au-dessus de l'assise
      p.tete = corps.getObjectByName("Head"); if (p.tete) p.tete0 = null;
    } else {
      if (o.assis) p.debout = true;
      if (G.clips.repos) { p.A.repos = p.mixer.clipAction(G.clips.repos); p.A.repos.play(); p.A.repos.time = Math.random() * G.clips.repos.duration; }
      if (G.clips.marche) { p.A.marche = p.mixer.clipAction(G.clips.marche); p.A.marche.play(); p.A.marche.setEffectiveWeight(0); }
    }
  } else { p.membres = bonhomme(g, t, o); p.assis = !!o.assis; }
  g.position.x = p.x; g.position.z = p.z; g.rotation.y = o.ry || 0; p.ry = o.ry || 0;
  if (p.assis) empriseDe(p, p.x + Math.sin(p.ry) * 0.28, p.z + Math.cos(p.ry) * 0.28, 0.55, 1.0, p.ry);        // le corps et les jambes, devant
  else if (p.fixe && !p.debout) empriseDe(p, p.x, p.z, 0.55, 0.55);                                           // (celui qui reste debout près de son siège est placé plus tard)
  if (type === "responsable" || type === "dani") insigne(p, type);
  scene.add(g); persos.push(p); return p;
}
/* L'insigne qui flotte au-dessus d'un responsable : le logo AVYORA pour un agent IA, une étoile dorée pour Dani */
const matInsignes = {};
function insigne(p, type) {
  const etat = type === "dani" ? "" : (p.piece && p.piece.agent && p.piece.agent.etat) || "", k = (type === "dani" ? "insigneDani" : "insigneIA") + etat;   // la pastille de l'agent porte son état : au travail, attend ta décision, au repos, à créer
  if (!matInsignes[k]) matInsignes[k] = new THREE.SpriteMaterial({ map: type === "dani" ? TEX_MARQUE.insigneDani() : TEX_MARQUE.insigneIA(etat), depthWrite: false, fog: false, toneMapped: false });
  const s = new THREE.Sprite(matInsignes[k]); s.scale.set(0.72, 0.9, 1); s.position.y = 2.42; p.g.add(s); p.insigne = s;
}
/* Le casque des ouvriers assis (leur modèle assis n'en a pas) : posé sur la tête, une fois la pose prise */
function coifferAssis() {
  const v = new THREE.Vector3();
  for (const p of persos) {
    if (!p.casque || !p.corps) continue; const t = p.corps.getObjectByName("Head"); if (!t) continue;
    p.g.updateMatrixWorld(true); t.getWorldPosition(v); p.g.worldToLocal(v);
    const c = new THREE.Group(); c.position.set(v.x, v.y + GENS.casque, v.z);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), pbr(p.casque, { rough: 0.35 })); d.castShadow = true; c.add(d);
    cyl(c, 0.165, 0.016, p.casque, 0, 0.004, 0.02, { rough: 0.35, seg: 18 }); p.g.add(c);
  }
}

/* Un geste joué une ou plusieurs fois par-dessus l'attente (saluer, applaudir, bricoler). Rend sa durée, 0 s'il n'existe pas. */
function geste(p, nom, tours) {
  const c = p.G && p.G.clips[nom]; if (!c || p.assis || !p.mixer || calme) return 0;
  if (p.gesteA) p.gesteA.stop();
  const a = p.mixer.clipAction(c); a.reset(); a.setEffectiveWeight(0); a.play(); p.gesteA = a; p.gt = c.duration * (tours || 1); return p.gt;
}

/* Un robot : un agent IA « pas encore créé », montré comme un hologramme à la couleur de sa cabine */
const voileRobot = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, skinning: true });
function robot(g, x, z, couleur) {
  const r = new THREE.Group(); r.position.set(x, 0, z); g.add(r);
  const G = gabarit("robot");
  if (!G) {                                                                  // le secours : le robot en boîtes
    const o = { opacite: 0.45, rough: 0.3, metal: 0.4 };
    boiteM(r, 0.5, 0.62, 0.36, couleur, 0, 0.78, 0, o); boiteM(r, 0.42, 0.34, 0.34, 0xf4f1ea, 0, 1.33, 0, o);
    boiteM(r, 0.3, 0.07, 0.02, couleur, 0, 1.35, 0.18, { lum: 1.2, sansOmbre: true });
    cyl(r, 0.02, 0.22, NOIR, 0, 1.61, 0, o); boule(r, 0.06, couleur, 0, 1.75, 0, { lum: 1.2 });
    cyl(r, 0.09, 0.46, NOIR, -0.13, 0.23, 0, o); cyl(r, 0.09, 0.46, NOIR, 0.13, 0.23, 0, o);
    return r;
  }
  const corps = THREE.SkeletonUtils.clone(G.racine), peau = corps.getObjectByName("peau"), k = GENS.tailleRobot / G.hauteur;
  peau.geometry = habiller(G, (zo) => /main/i.test(zo.nom) ? couleur : /grey/i.test(zo.nom) ? 0xe6e9f5 : 0x23263c);
  // deux passes : d'abord la silhouette (profondeur seule), puis la couleur. On voit à travers le robot, mais pas à travers ses propres pièces.
  peau.material = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: GENS.voile, depthWrite: false, roughness: 0.3, metalness: 0.35, emissive: couleur, emissiveIntensity: 0.4, skinning: true });
  peau.castShadow = false; peau.receiveShadow = false; peau.renderOrder = 6;
  const fond = new THREE.SkinnedMesh(peau.geometry, voileRobot); fond.frustumCulled = false; fond.renderOrder = 5; corps.add(fond); fond.bind(peau.skeleton, peau.bindMatrix);
  corps.scale.setScalar(k); corps.position.y = -G.sol * k; r.add(corps);
  const socle = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 40), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.8, depthWrite: false })); socle.rotation.x = -Math.PI / 2; socle.position.y = 0.035; r.add(socle);
  const R = { g: r, G, mixer: new THREE.AnimationMixer(corps), A: {}, gesteA: null, gt: 0, pg: 0, prochain: 6 + Math.random() * 25 };
  if (G.clips.repos) { R.A.repos = R.mixer.clipAction(G.clips.repos); R.A.repos.play(); R.A.repos.time = Math.random() * G.clips.repos.duration; R.A.repos.setEffectiveTimeScale(0.5); }
  R.mixer.update(0); robots.push(R); return r;
}

/* Poser chaque personne assise à la bonne hauteur : celle que le mobilier a notée pour ce siège ; à défaut (siège inconnu),
   un rayon tiré vers le bas trouve le dessus du meuble. */
function installerAssis() {
  const rayonBas = new THREE.Raycaster(), bas = new THREE.Vector3(0, -1, 0), d = new THREE.Vector3(), a = new THREE.Vector3(), exclus = new Set(persos.map((p) => p.g).concat(robots.map((r) => r.g)));
  rayonBas.camera = camera; rayonBas.far = GENS.siegeMax - GENS.siegeMin;
  const decor = scene.children.filter((c) => !exclus.has(c));
  for (const p of persos) {
    if (!p.assis || !p.corps) continue;
    let h = p.siegeNote ? p.siegeNote.y - (GENS.enfonce[p.siegeNote.sorte] || 0) : null;
    if (h == null) for (const av of [0.06, 0.2, -0.08]) {                                   // sous les hanches, puis sous les cuisses, puis un peu en arrière
      d.set(p.x + Math.sin(p.ry) * av, GENS.siegeMax, p.z + Math.cos(p.ry) * av); rayonBas.set(d, bas);
      let t = null; try { t = rayonBas.intersectObjects(decor, true)[0]; } catch (e) { t = null; }
      if (t && t.point.y >= GENS.siegeMin) { h = t.point.y; break; }
    }
    p.siege = h; p.corps.position.y = (h == null ? GENS.siege : h) - p.yAssise + 0.005;
  }
}

/* La première pose de chacun (aussi la seule quand l'animation est coupée : « calme ») */
function poserGens() { for (const p of persos) if (p.mixer) p.mixer.update(0); for (const r of robots) r.mixer.update(0); }

/* Chaque image : les mouvements du corps. La vitesse de marche (p.vit) est décidée par « Les déplacements ». */
const qTete = new THREE.Quaternion(), axeY = new THREE.Vector3(0, 1, 0);
function animerGens(dt) {
  const pas = dt / GENS.fondu, vers = (v, cible) => v + Math.max(-pas, Math.min(pas, cible - v));
  for (const p of persos) {
    if (!p.mixer) {                                                          // le bonhomme simple : il balance bras et jambes
      if (p.assis || !p.membres.length) continue;
      if (p.vit > 0.04) { p.ph += dt * p.vit * 6.5; const s = Math.sin(p.ph); p.g.position.y = Math.abs(s) * 0.025; p.membres[0].rotation.x = s * 0.55; p.membres[1].rotation.x = -s * 0.55; p.membres[2].rotation.x = -s * 0.4; p.membres[3].rotation.x = s * 0.4; }
      else { for (const j of p.membres) j.rotation.x *= 0.82; p.g.position.y = 0; }
      continue;
    }
    if (p.assis) {                                                           // assis : la pose est figée, seule la tête tourne un peu
      if (p.tete) { if (!p.tete0) p.tete0 = p.tete.quaternion.clone(); p.ph += dt; p.tete.quaternion.copy(p.tete0).multiply(qTete.setFromAxisAngle(axeY, Math.sin(p.ph * 0.37) * 0.3 + Math.sin(p.ph * 0.11) * 0.2)); }
      continue;
    }
    const marche = p.vit > 0.04 ? 1 : 0;
    p.pm = vers(p.pm, marche);                                               // le fondu entre l'attente et la marche
    if (p.gt > 0) { p.gt -= dt; if (marche) p.gt = 0; }
    if (p.type === "serveur" && !p.gesteA && !calme && (p.proch = (p.proch == null ? 3 : p.proch) - dt) <= 0) { geste(p, "bricole", 2); p.proch = 5 + Math.random() * 6; }   // le serveur prépare un café de temps en temps
    p.pg = vers(p.pg, p.gt > 0 ? 1 : 0); if (p.gesteA && p.pg <= 0 && p.gt <= 0) { p.gesteA.stop(); p.gesteA = null; }
    if (p.A.marche) { p.A.marche.setEffectiveWeight(p.pm); p.A.marche.setEffectiveTimeScale(Math.max(0.35, p.vit / p.vClip)); }   // le pas suit la vitesse : les pieds ne glissent pas
    if (p.A.repos) p.A.repos.setEffectiveWeight((1 - p.pm) * (1 - p.pg));
    if (p.gesteA) p.gesteA.setEffectiveWeight((1 - p.pm) * p.pg);
    p.mixer.update(dt);
  }
  for (const r of robots) {                                                  // les robots : une attente lente, et de temps en temps un signe ou un pas de danse
    r.prochain -= dt;
    if (r.prochain <= 0 && !r.gesteA) { const nom = ["salut", "oui", "danse", "salut"][(Math.random() * 4) | 0], c = r.G.clips[nom]; r.prochain = 18 + Math.random() * 30;
      if (c) { r.gesteA = r.mixer.clipAction(c); r.gesteA.reset(); r.gesteA.setEffectiveWeight(0); r.gesteA.play(); r.gt = c.duration * (nom === "danse" ? 1 : 1); } }
    if (r.gt > 0) r.gt -= dt;
    r.pg = vers(r.pg, r.gt > 0 ? 1 : 0); if (r.gesteA && r.pg <= 0 && r.gt <= 0) { r.gesteA.stop(); r.gesteA = null; }
    if (r.A.repos) r.A.repos.setEffectiveWeight(1 - r.pg); if (r.gesteA) r.gesteA.setEffectiveWeight(r.pg);
    r.mixer.update(dt);
  }
}
