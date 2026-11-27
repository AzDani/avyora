/* ───────────────────────── Les modèles 3D (tous libres de droits, CC0 : Poly Haven, Quaternius, Kenney, three.js) ─────────────────────────
   Chargés une fois au démarrage, puis clonés. Un modèle qui ne charge pas vaut `null` : la scène retombe alors sur la forme
   simple dessinée à la main. Rien d'autre que ces fichiers n'est téléchargé. */
const MODELES = { meubles: {}, gens: {}, palmiers: [], voitures: [], bateaux: { yacht: null, voilier: null }, ciel: { jour: null, nuit: null } };
/* Les fichiers : la géométrie et les animations sont dans paquets/<famille>.json (le glTF + son binaire en base64), les textures
   sont de vraies images dans paquets/img/, les ciels HDR sont dans paquets/ciel.json. (Un artefact ne sert pas les .glb ni les .hdr.) */
const PAQUETS = APP.dataset.paquets || "paquets/";                          // sur le site : /bureaux/paquets/
const LONGUEURS = { voiture0: 4.6, voiture1: 4.0, voiture2: 4.8, voiture3: 4.4, yacht: 32, voilier: 12 };
async function lirePaquet(nom) { try { const r = await fetch(PAQUETS + nom + ".json"); return r.ok ? await r.json() : {}; } catch (e) { return {}; } }
function octets(b64) { const s = atob(b64), n = s.length, t = new Uint8Array(n); for (let i = 0; i < n; i++) t[i] = s.charCodeAt(i); return t; }
/* Ouvre un modèle d'un paquet : null s'il manque ou s'il est illisible */
function ouvrirGltf(e) {
  return new Promise((ok) => {
    if (!e || !e.gltf || !THREE.GLTFLoader) return ok(null);
    try { e.gltf.buffers = [{ byteLength: e.gltf.buffers[0].byteLength, uri: "data:application/octet-stream;base64," + e.bin }]; new THREE.GLTFLoader().parse(JSON.stringify(e.gltf), PAQUETS, ok, () => ok(null)); }
    catch (err) { ok(null); }
  });
}
/* Ouvre un ciel HDR : la même texture que THREE.RGBELoader().load(), sans passer par une adresse */
function ouvrirHdr(b64) {
  if (!b64 || !THREE.RGBELoader) return null;
  try { const d = new THREE.RGBELoader().parse(octets(b64).buffer); if (!d) return null;
    const t = new THREE.DataTexture(d.data, d.width, d.height, d.format, d.type);
    t.encoding = THREE.RGBEEncoding; t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true; return t; }
  catch (err) { return null; }
}

/* Un meuble prêt à poser : mis à l'échelle sur une cote (x, y, z ou la plus grande), centré, pied au sol. On le clone ensuite. */
function normaliser(gltf, cote, valeur) {
  if (!gltf) return null;
  const racine = gltf.scene; racine.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(racine), t = b.getSize(new THREE.Vector3());
  const k = valeur / (cote === "max" ? Math.max(t.x, t.y, t.z) : t[cote]);
  racine.scale.multiplyScalar(k); racine.position.set(-(b.min.x + b.max.x) / 2 * k, -b.min.y * k, -(b.min.z + b.max.z) / 2 * k);
  racine.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = ANISO; } });
  const g = new THREE.Group(); g.add(racine); g.userData.taille = t.multiplyScalar(k); return g;
}
/* Un modèle à répéter en grand nombre (palmier, voiture, bateau) : ses morceaux, un par matière, avec la géométrie déjà en mètres,
   centrée, posée à y = 0 et la longueur le long de Z. S'utilise avec THREE.InstancedMesh(p.geometry, p.material, n). */
function morceaux(gltf, cible) {
  if (!gltf) return null;
  const racine = gltf.scene; racine.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(racine), t = b.getSize(new THREE.Vector3());
  const tourne = !!cible.longueur && t.x > t.z, k = cible.longueur ? cible.longueur / Math.max(t.x, t.z) : cible.hauteur / t.y;
  const M = new THREE.Matrix4().makeRotationY(tourne ? Math.PI / 2 : 0).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2));
  const parties = [];
  racine.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(M, o.matrixWorld)); g.computeBoundingSphere();
    const m = o.material.clone(), nom = m.name || "", carrosserie = !!cible.teinte && !/window|black|grey|gray|head|tail|light|material/i.test(nom);
    if (carrosserie) m.color.setHex(0xffffff);                             // la teinte vient de chaque exemplaire (instanceColor)
    parties.push({ geometry: g, material: m, carrosserie, nom });
  });
  const taille = t.multiplyScalar(k); if (tourne) { const x = taille.x; taille.x = taille.z; taille.z = x; }
  return { parties, taille, longueur: Math.max(taille.x, taille.z), hauteur: taille.y };
}

async function chargerModeles(avance) {
  const taches = []; let faits = 0, total = 30;
  const suivre = (p) => { const q = p.then((r) => { faits++; if (avance) avance(Math.min(faits, total), total); return r; }); taches.push(q); return q; };
  const [pm, pg, pv, pc] = await Promise.all([suivre(lirePaquet("meubles")), suivre(lirePaquet("gens")), suivre(lirePaquet("ville")), suivre(lirePaquet("ciel"))]);
  const brut = {};
  for (const k of ["canape", "tableBasse", "fauteuilSalon", "plante", "etagere", "fauteuilBureau", "imprimante", "machineCafe", "portable"]) suivre(ouvrirGltf(pm[k])).then((g) => { brut[k] = g; });
  for (const k of ["hommeCostume", "homme", "hommeManches", "femmeDecontractee", "femmeRobe", "femmeVeste", "ouvrier", "robot"]) suivre(ouvrirGltf(pg[k])).then((g) => { if (g) MODELES.gens[k] = g; });
  for (let i = 0; i < 3; i++) suivre(ouvrirGltf(pv["palmier" + i])).then((g) => { MODELES.palmiers[i] = morceaux(g, { hauteur: 10 }); });
  for (let i = 0; i < 4; i++) suivre(ouvrirGltf(pv["voiture" + i])).then((g) => { MODELES.voitures[i] = morceaux(g, { longueur: LONGUEURS["voiture" + i], teinte: true }); });
  for (const k of ["yacht", "voilier"]) suivre(ouvrirGltf(pv[k])).then((g) => { MODELES.bateaux[k] = morceaux(g, { longueur: LONGUEURS[k] }); });
  MODELES.ciel.jour = ouvrirHdr(pc.jour); MODELES.ciel.nuit = ouvrirHdr(pc.nuit);
  await Promise.all(taches);
  MODELES.palmiers = MODELES.palmiers.filter(Boolean); MODELES.voitures = MODELES.voitures.filter(Boolean);
  // les meubles, chacun à sa vraie taille
  const M = MODELES.meubles;
  M.canape = normaliser(brut.canape, "x", 2.1); M.tableBasse = normaliser(brut.tableBasse, "x", 1.1); M.fauteuilSalon = normaliser(brut.fauteuilSalon, "y", 0.92);
  M.plante = normaliser(brut.plante, "y", 1.15); M.etagere = normaliser(brut.etagere, "y", 2.1); M.fauteuilBureau = normaliser(brut.fauteuilBureau, "y", 1.02);
  M.imprimante = normaliser(brut.imprimante, "y", 1.05); M.machineCafe = normaliser(brut.machineCafe, "y", 0.42); M.portable = normaliser(brut.portable, "x", 0.36);
  if (M.fauteuilBureau) M.fauteuilBureau.traverse((o) => { if (o.isMesh && /chair/i.test(o.material.name)) { o.material = o.material.clone(); o.material.color.setHex(0x2c2f45); o.material.roughness = 0.9; } });
  return MODELES;
}
/* Pose un exemplaire d'un meuble chargé ; rend null si le modèle manque (l'appelant dessine alors la forme simple). */
function poser3d(nom, parent, x, z, ry, y) {
  const p = MODELES.meubles[nom]; if (!p) return null;
  const c = p.clone(true); c.position.set(x, y || 0, z); c.rotation.y = ry || 0; parent.add(c); return c;
}
