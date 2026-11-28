/* ── La tour et l'étage ── */
const texBetonCire = texBeton("#cfcac1", 3); texBetonCire.repeat.set(9, 7);
const matDalle = new THREE.MeshStandardMaterial({ map: texBetonCire, roughness: 0.45, envMapIntensity: 0.6 });
boiteM(decor, 47.2, 0.6, 34.2, 0xdedad2, 0, -0.52, 0.5, { mat: matDalle, sansOmbre: true, recoit: true });
boiteM(decor, 47.6, 0.35, 34.6, 0xf3f1ec, 0, -0.95, 0.5, { sansOmbre: true });

/* L'accueil avance de 4 m au-dessus du vide (porte-à-faux), tenu par deux bracons d'acier ; son nez de dalle porte le bandeau AVYORA.
   Le balcon du bureau de Dani fait pareil sur le côté : 5 m dans le vide, plancher bois, garde-corps en verre. */
const PAF = { x0: -10.7, x1: 8.4, z0: 17.5, z1: 21.7 }, AILE = { x0: 8.4, x1: 23.6, z0: 17.5, z1: 20.6 }, BALCON = { x0: 23.5, x1: 28.6, z0: -1.7, z1: 7.7 };
(function porteAFaux() {
  const cx = (PAF.x0 + PAF.x1) / 2, cz = (PAF.z0 + PAF.z1) / 2, L = PAF.x1 - PAF.x0, P = PAF.z1 - PAF.z0;
  boiteM(decor, L, 0.6, P, 0xdedad2, cx, -0.52, cz, { mat: matDalle, sansOmbre: true, recoit: true });
  boiteM(decor, L + 0.3, 0.38, P + 0.15, 0xf3f1ec, cx, -0.98, cz + 0.07, { sansOmbre: true });
  for (const x of [-7.2, 5.2]) { const b = boiteM(decor, 0.42, 0.42, 7.2, NOIR, x, -4.1, 19.3, { fin: "metal", sansOmbre: true }); b.rotation.x = -Math.atan2(5.6, 4.4); boiteM(decor, 0.7, 0.5, 0.5, NOIR, x, -6.9, 17.35, { fin: "metal", sansOmbre: true }); }
  const bandeauX = -1;                                                        // le bandeau reste centré sur l'accueil, quelle que soit la longueur du porte-à-faux
  const band = image3d(decor, TEX_MARQUE.bandeau(), 17.6, 1.1, bandeauX, -0.72, PAF.z1 + 0.16, { lum: 0.75 }); band.renderOrder = 2;
  boiteM(decor, 17.9, 1.25, 0.12, 0x1e1b4b, bandeauX, -0.72, PAF.z1 + 0.09, { fin: "laque", sansOmbre: true });
  // l'aile droite : le bâtiment se prolonge (pas un porte-à-faux, la tour descend dessous ; voir ville.js) un peu moins loin que l'accueil
  { const ax = (AILE.x0 + AILE.x1) / 2, az = (AILE.z0 + AILE.z1) / 2;
    boiteM(decor, AILE.x1 - AILE.x0, 0.6, AILE.z1 - AILE.z0, 0xdedad2, ax, -0.52, az, { mat: matDalle, sansOmbre: true, recoit: true });
    boiteM(decor, AILE.x1 - AILE.x0, 0.38, AILE.z1 - AILE.z0 + 0.15, 0xf3f1ec, ax, -0.98, az + 0.07, { sansOmbre: true }); }
  // le balcon
  const bx = (BALCON.x0 + BALCON.x1) / 2, bz = (BALCON.z0 + BALCON.z1) / 2, bl = BALCON.x1 - BALCON.x0, bp = BALCON.z1 - BALCON.z0;
  const deck = texParquet(170, 124, 84, 71); deck.repeat.set(2, 4);
  boiteM(decor, bl, 0.22, bp, 0, bx, -0.11, bz, { mat: new THREE.MeshStandardMaterial({ map: deck, roughness: 0.7 }), sansOmbre: true, recoit: true });
  boiteM(decor, bl + 0.1, 0.3, bp + 0.2, 0xf3f1ec, bx, -0.37, bz, { sansOmbre: true });
  for (const z of [0.3, 5.7]) { const b = boiteM(decor, 7.0, 0.38, 0.38, NOIR, 25.9, -3.2, z, { fin: "metal", sansOmbre: true }); b.rotation.z = Math.atan2(5.0, 4.9); boiteM(decor, 0.5, 0.5, 0.6, NOIR, 23.4, -5.7, z, { fin: "metal", sansOmbre: true }); }
})();
/* Un garde-corps ou un pan de façade en verre, avec ses montants */
function garde(x0, z0, x1, z1, h) {
  const hz = x0 === x1, L = hz ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  boiteM(decor, hz ? 0.06 : L, h, hz ? L : 0.06, 0, cx, h / 2 - 0.2, cz, { mat: matVerre, sansOmbre: true });
  boiteM(decor, hz ? 0.14 : L, 0.1, hz ? L : 0.14, NOIR, cx, h - 0.2, cz, { fin: "metal", sansOmbre: true });
  const n = Math.max(1, Math.round(L / (h > 2 ? 2.3 : 4.6))); for (let i = 0; i <= n; i++) boiteM(decor, 0.1, h, 0.1, NOIR, hz ? x0 : x0 + L * i / n, h / 2 - 0.2, hz ? z0 + L * i / n : z0, { fin: "metal", sansOmbre: true });
}
(function murRideau() {                                                     // la façade vitrée : haute au fond et à gauche, garde-corps devant et à droite (interrompus par l'accueil et le balcon)
  const X0 = -23, X1 = 23, Z0 = -16, Z1 = 17;
  garde(X0, Z0, X1, Z0, 3.3); garde(X0, Z0, X0, Z1, 3.3);
  garde(X0, Z1, -10, Z1, 1.25); garde(AILE.x0 + 0.2, AILE.z1 - 0.05, X1, AILE.z1 - 0.05, 1.25);   // devant : à gauche de l'accueil, et au bout de l'aile droite
  garde(X1, Z0, X1, BALCON.z0, 1.25); garde(X1, BALCON.z1, X1, AILE.z1 - 0.05, 1.25);
  garde(BALCON.x0, BALCON.z0, BALCON.x1, BALCON.z0, 1.2); garde(BALCON.x0, BALCON.z1, BALCON.x1, BALCON.z1, 1.2); garde(BALCON.x1, BALCON.z0, BALCON.x1, BALCON.z1, 1.2);
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [0, Z0], [X0, 0.5]]) cyl(decor, 0.42, 3.4, 0xf3f1ec, x + (x < 0 ? 0.6 : -0.6) * (x !== 0), 1.5, z + (z < 0 ? 0.6 : z > 10 ? -0.6 : 0), { rough: 0.6 });
})();

/* Les pièces : le sol, le ruban lumineux d'état, les cloisons vitrées */
const SOLS = {
  accueil: () => texMarbre(5), accompagnement: () => texParquet(128, 84, 52, 12), projets: () => texParquet(188, 132, 80, 8), plan: () => texBeton("#dfe3ea", 14),
  attente: () => texParquet(200, 154, 104, 21), atelier: () => texBeton("#b9b3a8", 9), devis: () => texParquet(160, 110, 70, 30), bureau: () => texMoquette(92, 82, 170, 4),
  marketing: () => texMoquette(84, 96, 128, 6), caisse: () => texMarbre(17), reunion: () => texParquet(150, 104, 66, 41), serveurs: () => texBeton("#c9ccd4", 33), claude: () => texMoquette(150, 120, 104, 8), archives: () => texBeton("#a9a59c", 19),
};
const sols = [], COULEUR_ETAT = { critique: 0xff4d52, attention: 0xffab1a, bon: 0x2fd08a, vide: 0x9a9fc0 };
const faits = new Set();
/* Une cloison vitrée entre deux points. `portes` : les passages, [[position le long du mur, largeur]] ; le verre s'arrête de part et
   d'autre, le linteau continue, un seuil clair marque le passage. */
function cloison(x0, z0, x1, z1, portes) {
  const k = [x0, z0, x1, z1].join(","); if (faits.has(k)) return; faits.add(k);
  const hz = x0 === x1, L = hz ? z1 - z0 : x1 - x0, a0 = hz ? z0 : x0, fixe = hz ? x0 : z0;
  const pose = (a, la, h, y, ep, couleur, o) => boiteM(decor, hz ? ep : la, h, hz ? la : ep, couleur, hz ? fixe : a, y, hz ? a : fixe, o);   // un élément centré en `a` le long du mur
  const trous = (portes || []).map((p) => [p[0] - (p[1] || 1.6) / 2, p[0] + (p[1] || 1.6) / 2]).sort((u, v) => u[0] - v[0]);
  const pans = []; let d = a0; for (const [t0, t1] of trous) { if (t0 > d + 0.05) pans.push([d, t0]); d = Math.max(d, t1); } if (d < a0 + L - 0.05) pans.push([d, a0 + L]);
  pose(a0 + L / 2, L, 0.07, 2.15, 0.08, NOIR, { fin: "metal", sansOmbre: true });                                     // le linteau, d'un bout à l'autre
  for (const [p0, p1] of pans) { const l = p1 - p0, c = (p0 + p1) / 2;
    pose(c, l, 2.1, 1.07, 0.04, 0, { mat: matVerre, sansOmbre: true }); pose(c, l, 0.05, 0.03, 0.08, NOIR, { fin: "metal", sansOmbre: true });
    const n = Math.max(1, Math.round(l / 3.5)); for (let i = 0; i <= n; i++) pose(p0 + l * i / n, 0.07, 2.15, 1.08, 0.07, NOIR, { fin: "metal" }); }
  for (const [t0, t1] of trous) pose((t0 + t1) / 2, t1 - t0, 0.012, 0.008, 0.34, 0xf3f1ec, { fin: "laque", sansOmbre: true, recoit: true });   // le seuil
}
/* Les portes de chaque pièce : sur le couloir du fond pour la rangée du haut, sur le couloir de l'accueil pour celle du milieu.
   « sans » : pas de cloison de ce côté (l'accueil est ouvert sur son couloir ; la caisse partage le mur de l'accueil). */
const PORTES = {
  marketing: { z1: [[-15]] }, projets: { z1: [[-1]] }, plan: { z1: [[10]] }, archives: { z1: [[18]] },
  attente: { z1: [[-18]] }, atelier: { z1: [[-8]] }, devis: { z1: [[3]] }, accompagnement: { z1: [[12]] }, bureau: { z1: [[19]], x1: [[3, 1.8]] },
  accueil: { z0: "sans", x0: [[13.6, 4.6]], x1: [[13.2, 1.8], [17.7, 1.5]] }, caisse: { x0: "sans", x1: [[13.4, 1.2]] }, reunion: { x0: "sans", x1: [[18.2, 1.2]] }, serveurs: { x0: [[11.0, 1.2]] }, claude: { x0: [[16.6, 1.2]] },   // (les quatre pièces de l'aile droite donnent sur le couloir d'accès, entre x = 14 et 15,6)   // (la salle de réunion s'ouvre par le mur de l'accueil et s'adosse à celui de la comptabilité)
};
for (const p of PIECES) {
  const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
  p.cx = cx; p.cz = cz;
  const t = SOLS[p.id](); t.repeat.set(w / 2.4, d / 2.4);
  const dur = p.id === "accueil" || p.id === "caisse" || p.id === "plan";
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: dur ? 0.3 : /bureau|marketing/.test(p.id) ? 0.95 : 0.5, envMapIntensity: dur ? 0.7 : 0.35 });   // (sols durs : assez polis pour refléter le ciel, pas au point que les lampes y fassent une tache blanche)
  const sol = boiteM(scene, w - 0.06, 0.2, d - 0.06, 0, cx, -0.1, cz, { mat: m, sansOmbre: true, recoit: true }); sol.userData.piece = p; p.matSol = m; sols.push(sol);
  p.lisere = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.03, 0.14), new THREE.MeshBasicMaterial({ color: COULEUR_ETAT[p.etat] }));
  p.lisere.position.set(cx, 0.02, p.z1 - 0.26); scene.add(p.lisere);
  const cotes = PORTES[p.id] || {}, mur = (c, a, b, e, f) => { if (cotes[c] !== "sans") cloison(a, b, e, f, cotes[c]); };
  mur("z0", p.x0, p.z0, p.x1, p.z0); mur("x0", p.x0, p.z0, p.x0, p.z1); mur("z1", p.x0, p.z1, p.x1, p.z1); mur("x1", p.x1, p.z0, p.x1, p.z1);
}

/* Les couloirs : des zones où l'on marche, comme les pièces, mais sans fiche ni étiquette (un peu plus larges que le sol
   visible, puisque leurs bords sont des cloisons fines). */
const COULOIRS = [{ id: "couloir-fond", x0: -22, x1: 22, z0: -5.25, z1: -1.75 }, { id: "couloir-accueil", x0: -22, x1: 22.9, z0: 7.7, z1: 10.3 },
  { id: "couloir-aile", x0: 13.75, x1: 15.85, z0: 9.7, z1: 20.4 }];   // le couloir d'accès de l'aile droite (comptabilité, réunion, serveurs, Claude Code)

/* Sur le site, chaque pièce montre autant de personnes qu'il y en a vraiment (p.foule, plafonné) : les places assises et les marcheurs
   prévus par le décor se remplissent dans l'ordre, puis des marcheurs s'ajoutent. Le personnel (accueil, bar, Dani, agents) n'est pas compté.
   Dans la maquette (p.foule absent), le décor garde sa troupe d'exemple. */
const creerPersonne = personne, GENS_MAX = 14, restePiece = new Map();
const TYPE_PIECE = { accueil: "visiteur", accompagnement: "client", projets: "particulier", plan: "particulier", attente: "candidat", atelier: "artisan", devis: "client" };
function aSaPlace(piece, o) {
  if (piece.foule == null || (o && o.equipe)) return true;
  const r = restePiece.has(piece) ? restePiece.get(piece) : Math.min(GENS_MAX, piece.foule); if (r <= 0) return false; restePiece.set(piece, r - 1); return true;
}
/* Les lignes d'une pièce, pour un tableau dessiné dans la 3D : [titre, pastille, couleur] (textes d'origine, coupés à la largeur) */
const TON_ETAT = { critique: "#e5484d", attention: "#f59e0b", bon: "#30a46c", vide: "#9aa0b4" };
const coupe = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const MOT_COURT = { "à rappeler": "rappel", "en retard": "retard", "à examiner": "examen", "à appeler": "appel", "à compléter": "à finir", "à relancer": "relance" };
const lignesMur = (p, n, large) => (p.brut || p.liste).slice(0, n).map((l) => [coupe(l[0], large), MOT_COURT[l[3]] || coupe(l[3], 8), TON_ETAT[l[2]] || TON_ETAT.vide]);

/* L'écran des salles des serveurs et de Claude Code : une jauge par limite, verte, orange au-delà de 60 %, rouge au-delà de 85 % */
const dessinJauges = (id, titreEcran) => function (c, W, H) {
  c.fillStyle = "#0f1022"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ffffff"; c.font = "600 36px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText(titreEcran, 40, 50);
  const J = (parId[id] && parId[id].jauges) || [];
  J.slice(0, 5).forEach((j, i) => {
    const y = 120 + i * 92, b = j.brut || [j.hote, j.nom, j.texte, j.mot || ""], part = j.part;
    c.fillStyle = "#a9aed0"; c.font = "500 22px Geist, system-ui, sans-serif"; c.fillText(b[0] + " · " + b[1], 40, y);
    c.fillStyle = "#262947"; arrondi(c, 40, y + 22, W - 220, 26, 13); c.fill();
    if (part != null) { c.fillStyle = part >= 0.85 ? "#e5484d" : part >= 0.6 ? "#f59e0b" : "#30a46c"; arrondi(c, 40, y + 22, Math.max(26, (W - 220) * Math.min(1, part)), 26, 13); c.fill(); }
    c.textAlign = "right"; c.fillStyle = part == null ? "#7b7f98" : "#ffffff"; c.font = "600 30px Geist, system-ui, sans-serif"; c.fillText(part == null ? (b[3] || "—") : part > 0 && part < 0.01 ? "< 1 %" : Math.round(part * 100) + " %", W - 40, y + 35); c.textAlign = "left";
  });
};
const dessinServeurs = dessinJauges("serveurs", "SERVEURS"), dessinClaude = dessinJauges("claude", "CLAUDE CODE");

/* L'écran de la salle de réunion : le planning des deux semaines, tiré des mêmes rendez-vous que la fiche */
function dessinPlanning(c, W, H) {
  c.fillStyle = "#0f1022"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ffffff"; c.font = "600 38px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText("PLANNING", 34, 44);
  const noms = ["lun.", "mar.", "mer.", "jeu.", "ven."], x0 = 34, lw = (W - 68) / 5;
  for (let s = 0; s < 2; s++) {
    const y0 = 86 + s * 244;
    c.fillStyle = "#a9aed0"; c.font = "500 22px Geist, system-ui, sans-serif"; c.textAlign = "right"; c.fillText(s ? "Semaine prochaine" : "Cette semaine", W - 34, s ? y0 - 4 : 44);
    for (let j = 0; j < 5; j++) {
      const x = x0 + j * lw, d = jourDu(s * 7 + j), auj = d.toDateString() === new Date().toDateString();
      c.fillStyle = auj ? "#262a5c" : "#181a33"; arrondi(c, x + 5, y0 + 10, lw - 10, 222, 12); c.fill();
      c.fillStyle = auj ? "#c4b5fd" : "#a9aed0"; c.font = "600 22px Geist, system-ui, sans-serif"; c.textAlign = "left"; c.fillText(noms[j] + " " + d.getDate(), x + 18, y0 + 34);
      RDVS.filter((r) => r.j === s * 7 + j).forEach((r, k) => { const y = y0 + 58 + k * 74;
        c.fillStyle = r.confirme ? "#4f46e5" : "#b86a00"; arrondi(c, x + 14, y, lw - 28, 64, 10); c.fill();
        c.fillStyle = "#ffffff"; c.font = "600 21px Geist, system-ui, sans-serif"; c.fillText(r.h, x + 24, y + 21); const ici = heureIci(r); if (ici) { const w = c.measureText(r.h).width; c.fillStyle = "#d9d2ff"; c.font = "500 19px Geist, system-ui, sans-serif"; c.fillText("· " + ici.h, x + 32 + w, y + 21); c.fillStyle = "#ffffff"; } c.font = "500 19px Geist, system-ui, sans-serif"; c.fillText(r.qui.length > 13 ? r.qui.slice(0, 12) + "…" : r.qui, x + 24, y + 45); });
    }
  }
}

/* L'aménagement, pièce par pièce. Tout le mobilier va dans `decor` (fusionné à la fin) ; chaque meuble déclare son emprise au sol.
   Rappel des directions : la caméra regarde depuis +x et +z. Ce qui est accroché se met donc sur les murs du fond (z0) et de gauche (x0). */
(function amenager() {
  const D = decor, PI = Math.PI;
  /* Asseoir quelqu'un sur le siège le plus proche du point donné : la personne prend la place et la direction exactes du siège */
  const personne = (type, piece, o) => (type === "serveur" || type === "dani" || type === "responsable" || aSaPlace(piece, o) ? creerPersonne(type, piece, o) : null);
  const asseoir = (type, piece, x, z) => { const s = siegePres(x, z); return personne(type, piece, { fixe: true, assis: true, x: s.x, z: s.z, ry: s.ry }); };

  let p = parId.accueil;                                                   // ── Accueil : le grand mur de marque, la banque, le médaillon au sol, deux salons, la vue (4 m en porte-à-faux)
  { const ax = p.cx, z0 = p.z0;
    // le mur de marque, dos au couloir : le vrai logo et le vrai mot, éclairés
    emprise(ax, z0 + 0.62, 10.9, 0.34);
    boiteM(D, 9.2, 3.1, 0.22, NUIT, ax, 1.55, z0 + 0.62, { fin: "laque" }); image3d(D, TEX_MARQUE.mur(), 9.0, 3.0, ax, 1.56, z0 + 0.74, { lum: 0.85 });
    for (const s of [-1, 1]) boiteM(D, 0.8, 3.1, 0.18, 0, ax + s * 5.0, 1.55, z0 + 0.62, { mat: matNoyer }); boiteM(D, 9.2, 0.05, 0.03, 0x8b85ff, ax, 0.06, z0 + 0.75, { lum: 1.5, sansOmbre: true });
    // la banque d'accueil : laque blanche, dessus en marbre, façade en noyer, la plaque AVYORA au milieu
    const bz = z0 + 2.9; emprise(ax, bz, 5.7, 1.1);
    boiteM(D, 5.4, 1.05, 0.9, 0xffffff, ax, 0.52, bz, { fin: "laque" }); boiteM(D, 5.6, 0.06, 1.05, 0, ax, 1.08, bz, { mat: matMarbre });
    boiteM(D, 5.2, 0.7, 0.03, 0, ax, 0.5, bz + 0.465, { mat: matNoyer, sansOmbre: true }); boiteM(D, 5.4, 0.05, 0.02, 0x8b85ff, ax, 0.08, bz + 0.48, { lum: 1.6, sansOmbre: true });
    image3d(D, TEX_MARQUE.plaque(), 1.9, 0.48, ax, 0.56, bz + 0.49, { lum: 0.55 });
    portable(D, ax + 1.3, 1.11, bz - 0.15, PI); portable(D, ax - 1.4, 1.11, bz - 0.15, PI); cyl(D, 0.07, 0.2, BLANC, ax - 2.3, 1.21, bz, { fin: "ceramique", seg: 12 }); boule(D, 0.16, 0x3fa55e, ax - 2.3, 1.42, bz, { fin: "feuille", facettes: true });
    personne("pro", p, { fixe: true, equipe: true, x: ax - 0.9, z: bz - 0.95, ry: 0 }); personne("pro", p, { fixe: true, equipe: true, x: ax + 1.1, z: bz - 0.95, ry: 0 });
    // le bar à café, à droite de la banque : comptoir en noyer et marbre, la machine, les tasses, le serveur derrière et un visiteur servi
    { const bx = 5.0, bc = z0 + 2.6; emprise(bx, bc, 3.2, 0.84);
      boiteM(D, 3.0, 1.0, 0.64, 0, bx, 0.5, bc, { mat: matNoyer }); boiteM(D, 3.2, 0.05, 0.8, 0, bx, 1.025, bc, { mat: matMarbre });
      boiteM(D, 3.0, 0.05, 0.02, 0x8b85ff, bx, 0.08, bc + 0.33, { lum: 1.5, sansOmbre: true }); panneauTexte(D, "CAFÉ", 1.3, 0.36, bx, 0.58, bc + 0.325, 0, "#1E1B4B", "#ffffff", 0.7);
      machineCafe(D, bx - 1.05, 1.05, bc - 0.08, PI);
      for (let i = 0; i < 6; i++) cyl(D, 0.04, 0.09, i % 2 ? 0xa78bfa : BLANC, bx - 0.5 + (i % 3) * 0.11, 1.095, bc - 0.2 + ((i / 3) | 0) * 0.12, { fin: "ceramique", seg: 10, sansOmbre: true });   // les tasses propres
      boiteM(D, 0.5, 0.02, 0.3, NOIR, bx + 0.95, 1.06, bc + 0.1, { fin: "metal", sansOmbre: true }); for (let i = 0; i < 2; i++) { cyl(D, 0.045, 0.1, BLANC, bx + 0.85 + i * 0.2, 1.12, bc + 0.1, { fin: "ceramique", seg: 10, sansOmbre: true }); cyl(D, 0.036, 0.006, 0x3b2416, bx + 0.85 + i * 0.2, 1.171, bc + 0.1, { rough: 0.25, seg: 10, sansOmbre: true }); }   // le plateau, deux cafés servis
      cyl(D, 0.085, 0.2, 0x4a3324, bx + 1.42, 1.15, bc - 0.15, { rough: 0.35, seg: 14 }); cyl(D, 0.088, 0.02, 0xc9ccd6, bx + 1.42, 1.26, bc - 0.15, { fin: "metal", seg: 14, sansOmbre: true });                 // le pot de grains
      personne("serveur", p, { fixe: true, x: bx - 0.3, z: bc - 0.8, ry: 0 }); personne("visiteur", p, { fixe: true, x: bx + 1.05, z: bc + 0.85, ry: PI });
    }
    // le médaillon AVYORA incrusté dans le marbre, devant la banque
    image3d(D, TEX_MARQUE.medaillon(), 4.2, 4.2, ax, 0.014, z0 + 6.6, { auSol: true, transparent: true, lum: 0.12, rough: 0.3 });
    // les kakémonos, de chaque côté du mur
    for (const s of [-1, 1]) { const kx = ax + s * 6.6; emprise(kx, z0 + 0.9, 0.95, 0.3); boiteM(D, 0.9, 2.4, 0.04, NUIT, kx, 1.25, z0 + 0.9, { fin: "laque" }); image3d(D, TEX_MARQUE.kakemono(), 0.86, 2.3, kx, 1.25, z0 + 0.93, { lum: 0.7 }); boiteM(D, 1.0, 0.05, 0.3, NOIR, kx, 0.025, z0 + 0.9, { fin: "metal", sansOmbre: true }); }
    // le salon, à gauche : deux canapés en angle, une table basse, un fauteuil
    tapis(D, -7.3, z0 + 7.0, 4.6, 5.4, TAPIS.indigo);
    canape(D, p.x0 + 0.6, z0 + 7.0, PI / 2, CUIR.cognac); canape(D, -7.2, z0 + 4.3, 0, CUIR.ivoire); tableBasse(D, -7.2, z0 + 7.0);
    fauteuilSalon(D, -7.2, z0 + 9.5, PI, CUIR.cognac); lampadaire(D, p.x0 + 0.6, z0 + 4.4); plante(D, -5.0, z0 + 9.4, 0.8);
    asseoir("visiteur", p, p.x0 + 0.7, z0 + 6.55); asseoir("visiteur", p, -7.2, z0 + 4.4);
    // le coin d'attente, à droite : quatre fauteuils autour d'une table basse
    tapis(D, 5.2, z0 + 7.0, 4.2, 4.4, TAPIS.sable);
    fauteuilSalon(D, 4.2, z0 + 5.6, 0, CUIR.cognac); fauteuilSalon(D, 6.2, z0 + 5.6, 0, CUIR.cognac); fauteuilSalon(D, 4.2, z0 + 8.5, PI, CUIR.ivoire); fauteuilSalon(D, 6.2, z0 + 8.5, PI, CUIR.ivoire); tableBasse(D, 5.2, z0 + 7.05, 0.6);
    // la borne d'accueil (un écran sur pied) et la vue : des palmiers devant la baie vitrée du porte-à-faux
    emprise(2.6, z0 + 4.6, 0.7, 0.4); boiteM(D, 0.6, 1.5, 0.08, NOIR, 2.6, 0.75, z0 + 4.6, { fin: "metal" }); ecran(D, 0.52, 0.8, 2.6, 1.05, z0 + 4.65, 0);
    palmierPot(D, p.x0 + 0.95, p.z1 - 0.95, 3.4); palmierPot(D, p.x1 - 0.95, p.z1 - 0.95, 3.4); plante(D, p.x0 + 0.8, z0 + 10.2, 1.0, true);
    for (let i = 0; i < 9; i++) personne("visiteur", p);
  }

  p = parId.caisse;                                                        // ── Comptabilité (ancienne « Caisse », l'identifiant est resté) : le mur vert, le comptoir, le coffre, la file
  { const z0 = p.z0, cx = p.cx;
    cimaise(D, cx - 0.4, z0 + 0.3, 3.4, 2.5, 0, 0x0b7a53); panneauTexte(D, "COMPTABILITÉ", 3.0, 0.5, cx - 0.4, 2.0, z0 + 0.37, 0, "#0b7a53", "#ffffff", 0.8); panneauTexte(D, SOURCE ? (p.kpis[0] && p.kpis[0][1] !== "—" ? "Entrées " + p.kpis[0][1] + "  ·  Charges " + p.kpis[1][1] : "Entrées et charges : voir Compta").replace(/&amp;/g, "&") : "Entrées 198 €  ·  Charges 226 €", 3.0, 0.3, cx - 0.4, 1.5, z0 + 0.37, 0, "#ffffff", "#0b7a53", 0.5);
    emprise(cx - 0.4, z0 + 2.1, 3.3, 1.1); boiteM(D, 3, 1.0, 0.9, 0xffffff, cx - 0.4, 0.5, z0 + 2.1, { fin: "laque" }); boiteM(D, 3.2, 0.06, 1.05, 0x0b7a53, cx - 0.4, 1.03, z0 + 2.1, { rough: 0.2 });
    boiteM(D, 2.8, 0.05, 0.02, 0x2fd08a, cx - 0.4, 0.08, z0 + 2.58, { lum: 1.3, sansOmbre: true });
    boiteM(D, 0.5, 0.2, 0.42, NOIR, cx - 1.1, 1.16, z0 + 2.1, { fin: "metal" }); boiteM(D, 0.44, 0.3, 0.03, NOIR, cx - 1.1, 1.45, z0 + 1.95, { fin: "metal", sansOmbre: true }); ecran(D, 0.4, 0.26, cx - 1.1, 1.45, z0 + 1.93, PI);   // la caisse et son écran
    boiteM(D, 0.1, 0.03, 0.18, NOIR, cx + 0.3, 1.09, z0 + 2.4, { fin: "mat", sansOmbre: true, ry: 0.3 }); boiteM(D, 0.3, 0.012, 0.4, 0xffffff, cx + 0.8, 1.07, z0 + 2.2, { sansOmbre: true, ry: -0.2 });
    chaise(D, cx - 0.9, z0 + 1.15, PI, 0x2c2f45);
    emprise(p.x1 - 0.75, z0 + 0.75, 1.0, 0.9); boiteM(D, 0.9, 1.3, 0.8, 0x3b3f52, p.x1 - 0.75, 0.65, z0 + 0.75, { rough: 0.3, metal: 0.9 });                                            // le coffre
    cyl(D, 0.16, 0.05, 0xc9ccd6, p.x1 - 0.75, 0.75, z0 + 1.17, { fin: "metal" }).rotation.x = PI / 2; boiteM(D, 0.05, 0.24, 0.03, 0xc9ccd6, p.x1 - 1.05, 0.75, z0 + 1.16, { fin: "metal", sansOmbre: true });
    emprise(cx, z0 + 4.2, 3.0, 0.2);                                                                                   // la file : trois poteaux et leur cordon
    for (const dx of [-1.4, 0, 1.4]) { cyl(D, 0.16, 0.03, 0xc9a04a, cx + dx, 0.015, z0 + 4.2, { fin: "metal", seg: 16 }); cyl(D, 0.025, 0.95, 0xc9a04a, cx + dx, 0.5, z0 + 4.2, { fin: "metal", seg: 8 }); boule(D, 0.045, 0xc9a04a, cx + dx, 0.99, z0 + 4.2, { fin: "metal" }); }
    for (const dx of [-0.7, 0.7]) boiteM(D, 1.36, 0.04, 0.04, 0x4f46e5, cx + dx, 0.84, z0 + 4.2, { fin: "tissu", sansOmbre: true });
    plante(D, p.x0 + 0.85, p.z1 - 0.95, 1.1, true); personne("particulier", p); personne("pro", p);
  }

  p = parId.reunion;                                                       // ── Salle de réunion : la table, l'écran du planning, la vue (au bout de l'aile droite, à côté de l'accueil)
  { const z0 = p.z0, tx = p.cx + 0.2, tz = z0 + 2.6;
    tapis(D, tx, tz, 3.8, 3.0, TAPIS.gris);
    cimaise(D, tx, z0 + 0.3, 3.4, 2.4, 0, NUIT); ecranMural(D, 2.9, 1.63, tx, 1.38, z0 + 0.39, 0, lumineux(1024, 576, dessinPlanning, 0.9));
    emprise(tx, tz, 1.2, 2.3); boiteM(D, 1.1, 0.06, 2.2, 0, tx, 0.75, tz, { mat: matNoyer }); for (const sz of [-0.75, 0.75]) { boiteM(D, 0.7, 0.7, 0.1, NOIR, tx, 0.36, tz + sz, { fin: "metal" }); boiteM(D, 0.8, 0.03, 0.4, NOIR, tx, 0.015, tz + sz, { fin: "metal", sansOmbre: true }); }
    for (const dz of [-0.55, 0.55]) { chaise(D, tx - 1.0, tz + dz, -PI / 2); chaise(D, tx + 1.0, tz + dz, PI / 2); }
    asseoir("client", p, tx - 1.0, tz - 0.55); asseoir("client", p, tx - 1.0, tz + 0.55);
    portable(D, tx + 0.22, 0.78, tz + 0.55, -PI / 2); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, tx - 0.2, 0.787, tz - 0.5, { sansOmbre: true, ry: 1.4 }); cyl(D, 0.04, 0.09, BLANC, tx - 0.25, 0.825, tz + 0.2, { fin: "ceramique", seg: 10, sansOmbre: true });
    cyl(D, 0.11, 0.035, NOIR, tx, 0.8, tz - 0.05, { fin: "metal", seg: 16, sansOmbre: true }); cyl(D, 0.03, 0.012, 0x30a46c, tx, 0.822, tz - 0.05, { lum: 1.4, seg: 10, sansOmbre: true });                 // le micro de table : l'appel est enregistré
    plante(D, p.x1 - 0.8, p.z1 - 0.8, 1.0, true);
  }

  p = parId.serveurs;                                                      // ── Salle des serveurs : les baies Supabase et Vercel, l'écran des jauges (aile droite, côté couloir)
  { const z0 = p.z0, x0 = p.x0, rz = z0 + 0.62;
    const baie = (x, nom, ton, encre) => {                                   // une baie : l'armoire noire, ses voyants, son nom au-dessus de la porte vitrée
      emprise(x, rz, 0.66, 0.96); boiteM(D, 0.62, 2.05, 0.92, 0x15161c, x, 1.025, rz, { fin: "metal" }); boiteM(D, 0.54, 1.7, 0.02, 0x23252f, x, 1.0, rz + 0.465, { rough: 0.25, metal: 0.6, sansOmbre: true });
      for (let i = 0; i < 9; i++) { const y = 0.3 + i * 0.18; boiteM(D, 0.44, 0.1, 0.015, 0x2c2f3b, x, y, rz + 0.48, { fin: "metal", sansOmbre: true }); boiteM(D, 0.03, 0.018, 0.012, i % 3 === 1 ? 0x5aa9ff : 0x3ad18a, x + 0.17, y, rz + 0.49, { lum: 1.6, sansOmbre: true }); }
      panneauTexte(D, nom, 0.6, 0.16, x, 1.93, rz + 0.48, 0, ton, encre, 0.9);
    };
    baie(x0 + 1.95, "SUPABASE", "#1c1c1c", "#3ecf8e"); baie(x0 + 2.65, "SUPABASE", "#1c1c1c", "#3ecf8e"); baie(x0 + 3.75, "VERCEL", "#000000", "#ffffff"); baie(x0 + 4.45, "VERCEL", "#000000", "#ffffff");
    boiteM(D, 3.4, 0.08, 0.3, 0x3a3d4a, x0 + 3.2, 2.1, rz - 0.1, { fin: "metal", sansOmbre: true });                                              // le chemin de câbles au-dessus
    cimaise(D, x0 + 0.3, p.cz + 0.6, 2.6, 2.3, PI / 2, NUIT); ecranMural(D, 2.2, 1.24, x0 + 0.39, 1.38, p.cz + 0.6, PI / 2, lumineux(1024, 576, dessinServeurs, 0.95));
    tapis(D, x0 + 3.2, p.z1 - 1.3, 2.6, 1.2, TAPIS.gris); plante(D, p.x1 - 0.7, p.z1 - 0.7, 0.9, true);
  }

  p = parId.claude;                                                        // ── Salle Claude Code : l'écran des limites au mur du fond, le poste face à lui, le coin canapé (aile droite, au bout)
  { const x1 = p.x1, cz = p.cz;
    cimaise(D, x1 - 0.3, cz, 3.0, 2.4, -PI / 2, NUIT); ecranMural(D, 2.6, 1.46, x1 - 0.39, 1.4, cz, -PI / 2, lumineux(1024, 576, dessinClaude, 0.95));
    panneauTexte(D, "CLAUDE CODE", 1.5, 0.22, x1 - 0.38, 2.28, cz, -PI / 2, "#1a1a1a", "#d97757", 0.9);
    tapis(D, x1 - 2.6, cz, 2.6, 3.2, TAPIS.gris);
    bureauM(D, x1 - 2.7, cz, -PI / 2, { double: true, couleur: 0x1e1b4b });                                                            // le poste, face à l'écran des limites
    canape(D, p.x0 + 1.1, cz + 0.4, PI / 2, CUIR.cognac); tableBasse(D, p.x0 + 2.5, cz + 0.4, 0.8);
    plante(D, p.x0 + 0.7, p.z1 - 0.7, 0.9, true);
  }

  p = parId.accompagnement;                                                // ── Accompagnement : le salon où les clients attendent leur rappel, le bureau du conseiller
  { const z0 = p.z0, x0 = p.x0;
    tapis(D, x0 + 2.3, 4.6, 4.2, 3.4, TAPIS.sable);
    canape(D, x0 + 0.6, 4.6, PI / 2, CUIR.cognac); tableBasse(D, x0 + 2.4, 4.6, 0.9); fauteuilSalon(D, x0 + 4.1, 4.6, -PI / 2, CUIR.ivoire); lampadaire(D, x0 + 0.5, 6.25);
    asseoir("client", p, x0 + 0.7, 4.15); asseoir("client", p, x0 + 0.7, 5.05); personne("client", p);
    const b = bureauM(D, 13.2, z0 + 2.4, PI, { double: true }); chaise(D, 12.5, z0 + 3.75, 0, 0x8a3b2e); chaise(D, 13.9, z0 + 3.75, 0, 0x8a3b2e);
    boiteM(b, 0.2, 0.06, 0.2, NOIR, 0.6, 0.795, 0.15, { fin: "mat", sansOmbre: true }); boiteM(b, 0.06, 0.05, 0.2, NOIR, 0.6, 0.84, 0.15, { fin: "mat", sansOmbre: true });   // le téléphone
    cimaise(D, x0 + 2.2, z0 + 0.3, 2.8, 2.2, 0, BLANC);                                                                  // le tableau des rappels
    affiche(D, 2.5, 1.5, x0 + 2.2, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "RAPPELS À FAIRE", 28, 44, 34, "#1e1b4b", "700");
      const L = SOURCE ? lignesMur(p, 3, 15) : [["Julie M.", "3 j", "#e5484d"], ["Karim B.", "99 €", "#f59e0b"], ["Sophie L.", "devis", "#f59e0b"]];
      L.forEach((l, i) => { const y = 112 + i * 62; c.fillStyle = l[2]; c.beginPath(); c.arc(44, y, 13, 0, 7); c.fill(); titre(c, l[0], 74, y, 32, "#23263c", "500"); c.fillStyle = l[2]; c.fillRect(W - 150, y - 20, 120, 40); c.textAlign = "center"; titre(c, l[1], W - 90, y + 2, 26, "#ffffff", "700"); c.textAlign = "left"; }); });
    plante(D, p.x1 - 0.85, z0 + 0.85, 0.85); plante(D, p.x1 - 0.8, p.z1 - 1.0, 1.1, true);
  }

  p = parId.projets;                                                       // ── Projets : l'open space (deux îlots de bureaux face à face), le coin café, le copieur
  { const z0 = p.z0;
    const ilot = (xs, zc) => { xs.forEach((x, i) => { bureauM(D, x, zc + 0.45, 0, { portable: i === 1 }); bureauM(D, x, zc - 0.45, PI, { portable: i === 2, couleur: 0x3b3f66 }); });
      boiteM(D, xs.length * 1.7, 0.42, 0.03, 0x6d6ab8, (xs[0] + xs[xs.length - 1]) / 2, 0.97, zc, { fin: "tissu" }); };                                                                   // l'écran de séparation en feutre
    ilot([-5.6, -3.9, -2.2], z0 + 2.9); ilot([-5.6, -3.9], z0 + 7.45);                                               // placés pour laisser des allées où deux personnes se croisent (au fond, à gauche, entre les deux îlots)
    cimaise(D, 3.2, z0 + 0.3, 4.4, 2.3, 0, BLANC);                                                                     // le tableau des estimations (colonnes de fiches)
    affiche(D, 4.0, 1.7, 3.2, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#fbfaf7"; c.fillRect(0, 0, W, H); const r = alea(31), cols = ["RAPIDE", "DÉTAILLÉE", "NEUF", "TERMINÉES"], tons = ["#4f46e5", "#a78bfa", "#f59e0b", "#30a46c"];
      cols.forEach((n, k) => { const x = 14 + k * (W - 28) / 4, w = (W - 28) / 4 - 10; c.fillStyle = "#eeecf6"; c.fillRect(x, 10, w, H - 20); titre(c, n, x + 8, 28, 15, "#23263c", "700");
        for (let i = 0; i < 2 + (r() * 4 | 0); i++) { c.fillStyle = tons[k]; c.globalAlpha = 0.55 + r() * 0.45; c.fillRect(x + 8, 46 + i * 31, w - 16, 24); c.globalAlpha = 1; } }); });
    copieur(D, p.x1 - 0.62, z0 + 2.1, -PI / 2); emprise(p.x1 - 0.7, z0 + 3.0, 0.5, 0.4); carton(D, p.x1 - 0.7, 0, z0 + 3.0, 0.45, 0.3, 0.35, 0.1, BLANC);
    coinCafe(D, p.x1 - 0.5, z0 + 6.4, 2.3, -PI / 2);
    tapis(D, 2.5, z0 + 7.3, 3.4, 3.2, TAPIS.indigo); tableRonde(D, 2.5, z0 + 7.3, 0.5, 1.05); tabouret(D, 1.65, z0 + 7.3, 0x6d6ab8, 0.74); tabouret(D, 2.95, z0 + 8.05, 0x6d6ab8, 0.74); tabouret(D, 2.95, z0 + 6.55, 0x6d6ab8, 0.74);
    portable(D, 2.5, 1.08, z0 + 7.3, -PI / 2);
    plante(D, p.x1 - 0.85, p.z1 - 0.85, 0.85); plante(D, 0.55, z0 + 0.85, 1.15, true);
    asseoir("particulier", p, -5.6, z0 + 4.1); asseoir("pro", p, -2.2, z0 + 1.7); asseoir("particulier", p, -3.9, z0 + 8.65); asseoir("particulier", p, -5.6, z0 + 6.25);   // ceux qui font leur estimation
    for (let i = 0; i < 3; i++) personne("particulier", p); for (let i = 0; i < 2; i++) personne("pro", p);
  }

  p = parId.plan;                                                          // ── Studio Plan 3D : le grand écran, les tables à dessin inclinées, la maquette, le traceur
  { const z0 = p.z0, cx = p.cx;
    cimaise(D, cx, z0 + 0.3, 4.2, 2.5, 0, NUIT); ecranMural(D, 3.2, 2.0, cx, 1.32, z0 + 0.39, 0, matPlan);
    for (const x of [cx - 1.6, cx + 1.6]) { const z = z0 + 3.5, t = new THREE.Group(); t.position.set(x, 0, z); D.add(t); emprise(x, z, 2.1, 1.3);
      const pl = new THREE.Group(); pl.position.set(0, 0.98, 0); pl.rotation.x = 0.3; t.add(pl);                                                          // le plateau, penché vers la personne
      boiteM(pl, 2.0, 0.05, 1.2, 0xffffff, 0, 0, 0, { fin: "laque" }); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), matPlan); f.rotation.x = -PI / 2; f.position.y = 0.03; pl.add(f);
      boiteM(pl, 1.9, 0.03, 0.04, 0xc9ccd6, 0, 0.04, 0.2, { fin: "metal", sansOmbre: true }); boiteM(pl, 2.0, 0.05, 0.05, NOIR, 0, 0.03, 0.6, { fin: "metal", sansOmbre: true });
      for (const sx of [-0.85, 0.85]) { boiteM(t, 0.06, 1.12, 0.06, NOIR, sx, 0.56, -0.5, { fin: "metal" }); boiteM(t, 0.06, 0.8, 0.06, NOIR, sx, 0.4, 0.5, { fin: "metal" }); boiteM(t, 0.06, 0.05, 1.1, NOIR, sx, 0.2, 0, { fin: "metal", sansOmbre: true }); }
      boiteM(t, 1.7, 0.05, 0.05, NOIR, 0, 0.2, -0.5, { fin: "metal", sansOmbre: true });
      tabouret(D, x, z + 1.1, 0x2c2f45, 0.66, PI); }
    asseoir("particulier", p, cx - 1.6, z0 + 4.6);
    { const x = cx, z = z0 + 7.4; emprise(x, z, 2.3, 1.5);                                                              // la maquette : une villa blanche sur son terrain
      boiteM(D, 2.2, 0.06, 1.4, 0xffffff, x, 0.82, z, { fin: "laque" }); for (const sx of [-0.95, 0.95]) for (const sz of [-0.55, 0.55]) boiteM(D, 0.06, 0.8, 0.06, NOIR, x + sx, 0.4, z + sz, { fin: "metal" });
      boiteM(D, 1.9, 0.03, 1.15, 0xb9c7a8, x, 0.865, z, { fin: "mat", sansOmbre: true });
      boiteM(D, 0.8, 0.26, 0.5, 0xffffff, x - 0.3, 1.01, z - 0.15, { fin: "mat" }); boiteM(D, 0.45, 0.22, 0.7, 0xffffff, x + 0.25, 0.99, z + 0.05, { fin: "mat" }); boiteM(D, 0.5, 0.2, 0.36, 0xffffff, x - 0.35, 1.24, z - 0.2, { fin: "mat" });
      boiteM(D, 0.86, 0.02, 0.56, 0xd9d6cf, x - 0.3, 1.15, z - 0.15, { fin: "mat", sansOmbre: true }); boiteM(D, 0.5, 0.012, 0.3, 0x25c9dc, x - 0.4, 0.886, z + 0.36, { rough: 0.1, lum: 0.3, sansOmbre: true });
      for (const [dx, dz] of [[0.75, -0.4], [0.8, 0.42], [-0.82, -0.42], [0.55, 0.45]]) { cyl(D, 0.012, 0.1, 0x6b4a2e, x + dx, 0.93, z + dz, { seg: 5, sansOmbre: true }); boule(D, 0.07, 0x3fa55e, x + dx, 1.02, z + dz, { fin: "feuille", facettes: true }); } }
    { const x = p.x1 - 0.65, z = z0 + 6.6; emprise(x, z, 0.7, 1.6);                                                     // le traceur grand format
      boiteM(D, 0.5, 0.3, 1.5, BLANC, x, 0.95, z, { fin: "laque" }); boiteM(D, 0.52, 0.06, 1.52, 0x2c2f45, x, 1.13, z, { fin: "mat" }); for (const sz of [-0.65, 0.65]) boiteM(D, 0.4, 0.8, 0.05, NOIR, x, 0.4, z + sz, { fin: "metal" });
      const f = boiteM(D, 0.02, 0.5, 1.1, 0xffffff, x - 0.3, 0.62, z, { sansOmbre: true }); f.rotation.z = -0.25; cyl(D, 0.06, 1.2, 0xffffff, x, 0.62, z, { seg: 10, sansOmbre: true }).rotation.x = PI / 2; }
    { const x = p.x0 + 0.6, z = z0 + 1.0; emprise(x, z, 0.5, 0.5); cyl(D, 0.2, 0.55, NOIR, x, 0.275, z, { fin: "metal", seg: 14 });                                              // le panier à rouleaux
      for (let i = 0; i < 5; i++) { const c = cyl(D, 0.035, 0.9, i % 2 ? 0xffffff : 0xdbe6ff, x + Math.sin(i * 1.3) * 0.09, 0.62, z + Math.cos(i * 1.3) * 0.09, { seg: 8, sansOmbre: true }); c.rotation.z = Math.sin(i * 2.1) * 0.14; c.rotation.x = Math.cos(i * 1.7) * 0.14; } }
    cimaise(D, p.x0 + 0.3, z0 + 6.6, 2.6, 1.9, PI / 2, BLANC);                                                         // le nuancier des matériaux
    { const tons = [0xd9b48a, 0x8a6a48, 0xe9e4da, 0x9aa3ad, 0x35507a, 0xb9c7a8, 0xc2410c, 0x2c2f45, 0xf4f1ea, 0x6b4a2e, 0xa9a59c, 0x4f46e5]; for (let i = 0; i < 12; i++) boiteM(D, 0.02, 0.34, 0.34, tons[i], p.x0 + 0.37, 1.55 - ((i / 4) | 0) * 0.42, z0 + 5.95 + (i % 4) * 0.43, { fin: i % 3 ? "mat" : "laque", sansOmbre: true }); }
    plante(D, p.x1 - 0.85, z0 + 0.85, 1.15, true); for (let i = 0; i < 2; i++) personne("particulier", p);
  }

  p = parId.attente;                                                       // ── Salle d'attente : les fauteuils le long du mur, le banc, la fontaine à eau, le tableau des candidatures
  { const z0 = p.z0, x0 = p.x0;
    tapis(D, x0 + 2.4, z0 + 3.4, 3.8, 5.6, TAPIS.sable);
    for (let i = 0; i < 4; i++) fauteuilSalon(D, x0 + 0.62, z0 + 1.7 + i * 1.15, PI / 2, CUIR.cognac);
    tableBasse(D, x0 + 2.6, z0 + 3.4, 0.9);
    cimaise(D, x0 + 3.6, z0 + 0.3, 3.0, 2.2, 0, BLANC);                                                                 // le tableau : qui attend, depuis quand
    affiche(D, 2.7, 1.5, x0 + 3.6, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "CANDIDATURES", 28, 42, 34, "#1e1b4b", "700");
      (SOURCE ? lignesMur(p, 4, 20) : [["Maçonnerie Durand", "6 j", "#e5484d"], ["Élec Martin", "4 j", "#f59e0b"], ["Toitures Roy", "2 j", "#f59e0b"], ["Plomberie Faure", "1 j", "#30a46c"]]).forEach((l, i) => { const y = 100 + i * 50; c.fillStyle = l[2]; c.beginPath(); c.arc(42, y, 11, 0, 7); c.fill(); titre(c, l[0], 68, y, 27, "#23263c", "500"); c.textAlign = "right"; titre(c, l[1], W - 30, y, 27, l[2], "700"); c.textAlign = "left"; }); });
    cyl(D, 0.3, 0.04, 0xffffff, x0 + 5.7, 1.75, z0 + 0.38, { fin: "laque", seg: 28, sansOmbre: true }).rotation.x = PI / 2; cyl(D, 0.32, 0.03, NOIR, x0 + 5.7, 1.75, z0 + 0.37, { fin: "metal", seg: 28, sansOmbre: true }).rotation.x = PI / 2;      // l'horloge
    boiteM(D, 0.03, 0.2, 0.012, NOIR, x0 + 5.7, 1.83, z0 + 0.41, { sansOmbre: true }); boiteM(D, 0.16, 0.025, 0.012, NOIR, x0 + 5.77, 1.75, z0 + 0.41, { sansOmbre: true });
    emprise(x0 + 5.7, z0 + 0.3, 0.8, 0.24); boiteM(D, 0.7, 2.2, 0.12, BLANC, x0 + 5.7, 1.1, z0 + 0.3, { fin: "laque" });
    banc(D, x0 + 5.6, z0 + 3.4, 2.2, -PI / 2, 0xb9a37a, 3);
    { const x = p.x1 - 0.6, z = z0 + 0.6; emprise(x, z, 0.45, 0.45); boiteM(D, 0.36, 1.0, 0.36, BLANC, x, 0.5, z, { fin: "laque" }); cyl(D, 0.15, 0.4, 0x8fd3f4, x, 1.22, z, { opacite: 0.6, rough: 0.1, seg: 14 }); boiteM(D, 0.2, 0.12, 0.03, 0x2c2f45, x, 0.78, z + 0.18, { fin: "mat", sansOmbre: true }); }   // la fontaine à eau
    plante(D, p.x1 - 0.9, p.z1 - 0.95, 0.85); plante(D, x0 + 0.8, p.z1 - 0.95, 1.1, true);
    asseoir("candidat", p, x0 + 0.62, z0 + 1.7); asseoir("candidat", p, x0 + 0.62, z0 + 4.0); personne("candidat", p); personne("candidat", p);
  }

  p = parId.atelier;                                                       // ── Atelier : le mur d'outils, les établis, le rayonnage, les matériaux, la grande table sur tréteaux
  { const z0 = p.z0, x0 = p.x0, x1 = p.x1;
    cimaise(D, x0 + 4.1, z0 + 0.28, 5.8, 2.2, 0, 0xd8ccb6, { fin: "mat" });
    { const r = alea(71), zf = z0 + 0.36; for (let i = 0; i < 16; i++) { const x = x0 + 1.6 + (i % 8) * 0.7, y = 1.85 - ((i / 8) | 0) * 0.5, s = r();                                // les outils accrochés
        if (s < 0.35) { boiteM(D, 0.05, 0.34, 0.03, 0x8a6a48, x, y, zf, { fin: "mat", sansOmbre: true }); boiteM(D, 0.2, 0.08, 0.05, 0x5a5f6e, x, y + 0.17, zf, { fin: "metal", sansOmbre: true }); }
        else if (s < 0.6) { boiteM(D, 0.36, 0.1, 0.02, 0xc9ccd6, x, y, zf, { fin: "metal", sansOmbre: true }); boiteM(D, 0.12, 0.14, 0.03, [0xd93a3f, 0xf59e0b, 0x35507a][i % 3], x - 0.2, y, zf, { fin: "mat", sansOmbre: true }); }
        else if (s < 0.8) { boiteM(D, 0.04, 0.36, 0.02, 0xc9ccd6, x, y, zf, { fin: "metal", sansOmbre: true }); boiteM(D, 0.06, 0.12, 0.04, [0xd93a3f, 0xf59e0b, 0x30a46c][i % 3], x, y - 0.2, zf, { fin: "mat", sansOmbre: true }); }
        else { cyl(D, 0.13, 0.03, 0xf59e0b, x, y, zf, { rough: 0.5, seg: 14, sansOmbre: true }).rotation.x = PI / 2; } } }
    for (let i = 0; i < 2; i++) { const x = x0 + 2.7 + i * 2.9, z = z0 + 1.1; emprise(x, z, 2.6, 0.9);                                                                                  // les deux établis
      boiteM(D, 2.5, 0.09, 0.8, 0, x, 0.9, z, { mat: matChene }); for (const sx of [-1.15, 1.15]) boiteM(D, 0.08, 0.86, 0.7, NOIR, x + sx, 0.43, z, { fin: "metal" }); boiteM(D, 2.2, 0.04, 0.6, 0, x, 0.25, z, { mat: matChene });
      boiteM(D, 0.5, 0.26, 0.26, [0xd93a3f, 0x35507a][i], x - 0.6, 1.08, z - 0.1, { rough: 0.35, metal: 0.3 }); boiteM(D, 0.24, 0.03, 0.05, NOIR, x - 0.6, 1.225, z - 0.1, { fin: "metal", sansOmbre: true });
      boiteM(D, 0.18, 0.16, 0.14, 0x5a5f6e, x + 0.9, 1.03, z + 0.22, { fin: "metal" }); boiteM(D, 0.5, 0.04, 0.1, 0xc9ccd6, x + 0.3, 0.965, z + 0.1, { fin: "metal", ry: 0.5, sansOmbre: true });
      carton(D, x + 0.4, 0.27, z, 0.5, 0.28, 0.4, 0.1); cyl(D, 0.13, 0.26, BLANC, x - 0.5, 0.4, z, { rough: 0.4, metal: 0.2, seg: 14 }); }
    etagere(D, x1 - 2.2, z0 + 0.5, 0, 5, "atelier");
    { const x = x0 + 6.3, z = z0 + 5.6; emprise(x, z, 2.8, 1.3);                                                          // la table sur tréteaux, le plan déroulé, le casque
      boiteM(D, 2.7, 0.05, 1.2, 0, x, 0.84, z, { mat: matChene }); for (const sx of [-0.95, 0.95]) { for (const s of [-1, 1]) { const j = boiteM(D, 0.06, 0.86, 0.06, 0xc9a877, x + sx, 0.41, z + s * 0.3, { fin: "mat" }); j.rotation.x = s * 0.33; } boiteM(D, 0.08, 0.06, 1.0, 0xc9a877, x + sx, 0.79, z, { fin: "mat", sansOmbre: true }); }
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), matPlan); f.rotation.x = -PI / 2; f.rotation.z = 0.12; f.position.set(x - 0.3, 0.872, z); D.add(f);
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, PI * 2, 0, PI / 2), pbr(0xffd23f, { rough: 0.3 })); c.position.set(x + 0.85, 0.87, z + 0.2); c.castShadow = true; D.add(c); cyl(D, 0.175, 0.015, 0xffd23f, x + 0.85, 0.875, z + 0.22, { rough: 0.3, seg: 16, sansOmbre: true });
      boiteM(D, 0.6, 0.03, 0.08, 0xf59e0b, x + 0.6, 0.885, z - 0.4, { fin: "mat", ry: 0.2, sansOmbre: true }); }
    { const x = x0 + 1.15, z = z0 + 4.2; emprise(x, z, 1.3, 2.6); for (let i = 0; i < 7; i++) boiteM(D, 1.2, 0.045, 2.5, i % 3 === 2 ? 0xdfe6e2 : 0xe9e6df, x + (i % 2) * 0.02, 0.1 + i * 0.047, z + (i % 3) * 0.015, { fin: "mat", sansOmbre: i < 6 });                       // les plaques de plâtre
      for (const sz of [-0.9, 0, 0.9]) boiteM(D, 1.2, 0.07, 0.1, 0xc9a877, x, 0.035, z + sz, { fin: "mat", sansOmbre: true }); }
    { const x = x0 + 1.3, z = z0 + 7.6; emprise(x, z, 1.3, 1.1); boiteM(D, 1.2, 0.03, 1.0, 0xc9a877, x, 0.135, z, { fin: "mat" }); for (const sz of [-0.42, 0, 0.42]) boiteM(D, 1.2, 0.1, 0.1, 0xb8935f, x, 0.05, z + sz, { fin: "mat", sansOmbre: true });   // la palette de sacs
      for (let i = 0; i < 6; i++) boiteM(D, 0.52, 0.15, 0.4, i % 2 ? 0xd9d2c2 : 0xcfc7b4, x - 0.28 + (i % 2) * 0.56, 0.23 + ((i / 2) | 0) * 0.155, z - 0.22 + ((i + (i >> 1)) % 2) * 0.44, { fin: "mat", ry: (i % 3 - 1) * 0.05 }); }
    { const x = x1 - 1.0, z = z0 + 4.4; emprise(x, z, 1.0, 1.0); const tons = [0x4f46e5, 0xd9486e, 0x30a46c, BLANC]; [[0, 0], [0.34, 0.1], [0.12, 0.36], [-0.25, 0.28]].forEach(([dx, dz], i) => { cyl(D, 0.14, 0.28, BLANC, x + dx - 0.1, 0.14, z + dz - 0.2, { rough: 0.4, seg: 14 }); cyl(D, 0.143, 0.09, tons[i], x + dx - 0.1, 0.14, z + dz - 0.2, { rough: 0.5, seg: 14, sansOmbre: true }); });   // les pots de peinture
      cyl(D, 0.14, 0.28, BLANC, x + 0.02, 0.42, z - 0.1, { rough: 0.4, seg: 14 }); }
    { const x = x1 - 1.0, z = z0 + 7.4; emprise(x, z, 0.8, 1.4);                                                          // l'escabeau
      for (const sx of [-0.25, 0.25]) for (const s of [-1, 1]) { const m = boiteM(D, 0.04, 1.7, 0.05, 0xc9ccd6, x + sx, 0.8, z + s * 0.32, { fin: "metal" }); m.rotation.x = -s * 0.36; }
      for (let i = 0; i < 4; i++) boiteM(D, 0.5, 0.03, 0.12, 0xc9ccd6, x, 0.3 + i * 0.36, z + 0.5 - i * 0.135, { fin: "metal", sansOmbre: true }); boiteM(D, 0.56, 0.04, 0.3, 0xf59e0b, x, 1.6, z, { fin: "mat" }); }
    for (const [x, z] of [[x0 + 5.2, z0 + 8.6], [x0 + 9.4, z0 + 3.1]]) { emprise(x, z, 0.4, 0.4); boiteM(D, 0.36, 0.03, 0.36, 0xf08a24, x, 0.015, z, { fin: "mat", sansOmbre: true }); cone(D, 0.13, 0.52, 0xf08a24, x, 0.29, z, { rough: 0.6 }); cyl(D, 0.085, 0.07, 0xffffff, x, 0.33, z, { rHaut: 0.062, rough: 0.5, seg: 12, sansOmbre: true }); }   // les cônes de chantier
    { const x = x1 - 2.4, z = z0 + 8.9; emprise(x, z, 1.5, 1.4); boiteM(D, 1.3, 0.5, 1.2, 0, x, 0.25, z, { mat: matPlateau }); boiteM(D, 1.0, 0.42, 0.9, 0, x - 0.05, 0.71, z, { mat: matPlateau, ry: 0.25 }); }                                     // les caisses en bois
    for (let i = 0; i < 9; i++) personne("artisan", p);
  }

  p = parId.devis;                                                         // ── Salle des devis : la table de réunion, l'écran, le buffet
  { const z0 = p.z0, cx = p.cx, cz = p.cz;
    tapis(D, cx, cz, 6.6, 4.4, TAPIS.gris);
    emprise(cx, cz, 4.5, 1.6); boiteM(D, 4.4, 0.06, 1.5, 0, cx, 0.75, cz, { mat: matNoyer }); for (const sx of [-1.5, 1.5]) { boiteM(D, 0.1, 0.7, 1.0, NOIR, cx + sx, 0.36, cz, { fin: "metal" }); boiteM(D, 0.5, 0.03, 1.1, NOIR, cx + sx, 0.015, cz, { fin: "metal", sansOmbre: true }); }
    for (const dx of [-1.5, 0, 1.5]) { chaise(D, cx + dx, cz - 1.2, PI); chaise(D, cx + dx, cz + 1.2, 0); } chaise(D, cx - 2.7, cz, -PI / 2); chaise(D, cx + 2.7, cz, PI / 2);
    asseoir("client", p, cx - 1.5, cz + 1.2); asseoir("artisan", p, cx, cz - 1.2);
    portable(D, cx - 1.5, 0.78, cz + 0.42, 0); portable(D, cx, 0.78, cz - 0.42, PI);
    boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx - 0.75, 0.787, cz + 0.3, { sansOmbre: true, ry: 0.15 }); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx + 0.8, 0.787, cz - 0.2, { sansOmbre: true, ry: -0.4 }); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx + 0.9, 0.799, cz - 0.15, { sansOmbre: true, ry: 0.1 });
    cyl(D, 0.04, 0.9, 0xffffff, cx + 1.6, 0.82, cz + 0.25, { seg: 8, sansOmbre: true }).rotation.z = PI / 2; cyl(D, 0.04, 0.09, BLANC, cx - 0.5, 0.825, cz - 0.3, { fin: "ceramique", seg: 10, sansOmbre: true });
    cimaise(D, cx, z0 + 0.3, 3.8, 2.4, 0, NUIT); ecranMural(D, 3.0, 1.7, cx, 1.35, z0 + 0.39, 0);
    coinCafe(D, p.x0 + 0.5, cz + 2.6, 1.9, PI / 2);
    plante(D, p.x1 - 0.85, z0 + 0.85, 0.85); plante(D, p.x1 - 0.8, p.z1 - 0.95, 1.1, true);
    personne("client", p); personne("artisan", p); personne("particulier", p);
  }

  p = parId.bureau;                                                        // ── Ton bureau : le grand bureau en noyer face à la pièce, la bibliothèque, le salon
  { const z0 = p.z0, cx = p.cx;
    etagere(D, cx, z0 + 0.45, 0, 2, "livres");
    tapis(D, cx, z0 + 4.9, 4.4, 3.6, TAPIS.sable);
    const b = bureauM(D, cx, z0 + 4.6, PI, { large: 2.1, prof: 0.95, mat: matNoyer, double: true, couleur: 0x1e1b4b }); portable(b, 0.62, 0.765, 0.08, 0.35);
    asseoir("dani", p, cx, z0 + 3.8);
    cimaise(D, p.x0 + 0.3, z0 + 2.9, 2.6, 2.2, PI / 2, BLANC);                                                           // sa liste du jour, triée par ce qui rapporte
    affiche(D, 2.3, 1.6, p.x0 + 0.37, 1.3, z0 + 2.9, PI / 2, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "TA LISTE", 28, 44, 36, "#1e1b4b", "700");
      (SOURCE ? lignesMur(p, 4, 24).map((l) => [l[0], l[2]]) : [["Rappeler 3 demandes", "#e5484d"], ["Examiner 4 candidatures", "#f59e0b"], ["Publier 1 avis", "#f59e0b"], ["Relancer 1 décennale", "#30a46c"]]).forEach((l, i) => { const y = 112 + i * 62; c.fillStyle = l[1]; c.beginPath(); c.arc(46, y, 19, 0, 7); c.fill(); c.textAlign = "center"; titre(c, String(i + 1), 46, y + 2, 24, "#ffffff", "700"); c.textAlign = "left"; titre(c, l[0], 82, y + 1, 30, "#23263c", "500"); }); });
    chaise(D, cx - 0.7, z0 + 6.0, 0, 0x6d6ab8); chaise(D, cx + 0.7, z0 + 6.0, 0, 0x6d6ab8);
    canape(D, p.x0 + 0.6, p.z1 - 1.5, PI / 2); tableBasse(D, p.x0 + 2.1, p.z1 - 1.5, 0.75); lampadaire(D, p.x0 + 0.5, z0 + 6.6);
    plante(D, p.x1 - 0.85, p.z1 - 0.9, 0.85); plante(D, p.x1 - 0.8, z0 + 0.85, 1.15, true);
  }

  p = parId.marketing;                                                     // ── Marketing : une cabine par agent IA (robot plein s'il est en service, hologramme sinon), le coin tournage
  { const z0 = p.z0, tons = [0x4f46e5, 0x30a46c, 0xd9486e], feutre = [0x34307a, 0x245c44, 0x7a2c44], noms = ["PROSPECTION", "SEO", "RÉSEAUX"];
    for (let i = 0; i < 3; i++) { const x = p.x0 + 2.6 + i * 4.4, hex = "#" + tons[i].toString(16).padStart(6, "0");
      cimaise(D, x, z0 + 0.4, 3.6, 2.75, 0, 0x15172b); boiteM(D, 3.6, 0.07, 0.14, tons[i], x, 2.78, z0 + 0.4, { lum: 1.2, sansOmbre: true });
      for (const s of [-1, 1]) { emprise(x + s * 1.76, z0 + 1.5, 0.12, 2.1); boiteM(D, 0.08, 1.15, 2.1, feutre[i], x + s * 1.76, 0.575, z0 + 1.5, { fin: "tissu" }); boiteM(D, 0.09, 0.04, 2.1, tons[i], x + s * 1.76, 1.17, z0 + 1.5, { lum: 0.8, sansOmbre: true }); }
      panneauTexte(D, noms[i], 2.6, 0.42, x, 2.42, z0 + 0.47, 0, "#15172b", hex, 1.1); ecranMural(D, 1.7, 0.95, x, 1.6, z0 + 0.48, 0);
      emprise(x, z0 + 1.15, 1.9, 0.8); boiteM(D, 1.8, 0.05, 0.75, 0, x, 0.76, z0 + 1.15, { mat: matPlateau }); for (const sx of [-0.82, 0.82]) boiteM(D, 0.05, 0.74, 0.65, NOIR, x + sx, 0.37, z0 + 1.15, { fin: "metal" });
      boiteM(D, 0.42, 0.015, 0.15, 0xe9e7e2, x, 0.79, z0 + 1.25, { fin: "laque", sansOmbre: true }); portable(D, x + 0.55, 0.785, z0 + 1.15, -0.3);
      boiteM(D, 3.4, 0.02, 3.4, tons[i], x, 0.012, z0 + 2.5, { opacite: 0.22, sansOmbre: true }); boiteM(D, 3.4, 0.03, 0.06, tons[i], x, 0.02, z0 + 4.25, { lum: 1.4, sansOmbre: true });
      // les deux étiquettes au sol hors du décor fusionné : l'une ou l'autre s'affiche selon l'état de l'agent (majRobots)
      const e = panneauTexte(scene, "À CRÉER", 1.5, 0.3, x, 0.03, z0 + 3.85, 0, "#232640", "#c9cbe0", 0.5); e.rotation.x = -PI / 2;
      const s = panneauTexte(scene, "EN SERVICE", 1.5, 0.3, x, 0.03, z0 + 3.85, 0, "#232640", hex, 0.9); s.rotation.x = -PI / 2; s.visible = false;
      emprise(x, z0 + 2.6, 0.8, 0.7); CABINES.push({ id: ["prospection", "seo", "reseaux"][i], robot: robot(scene, x, z0 + 2.6, tons[i]), creer: e, service: s }); }
    majRobots(ACTIFS_CABINES);
    { const x = p.x1 - 2.2, z = p.z1 - 2.3;                                                                              // le coin tournage : le fond, l'anneau de lumière, le trépied
      emprise(x - 1.1, z - 1.3, 2.3, 0.2); boiteM(D, 2.2, 2.0, 0.04, 0xf2b8c6, x - 1.1, 1.05, z - 1.3, { fin: "mat" }); for (const sx of [-1.12, 1.12]) cyl(D, 0.025, 2.2, NOIR, x - 1.1 + sx, 1.1, z - 1.3, { fin: "metal", seg: 6 });
      emprise(x - 1.1, z + 0.9, 0.6, 0.6); for (let i = 0; i < 3; i++) { const j = cyl(D, 0.015, 1.3, NOIR, x - 1.1 + Math.sin(i * 2.1) * 0.2, 0.6, z + 0.9 + Math.cos(i * 2.1) * 0.2, { fin: "metal", seg: 5, sansOmbre: true }); j.rotation.z = -Math.sin(i * 2.1) * 0.32; j.rotation.x = Math.cos(i * 2.1) * 0.32; }
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 28), pbr(0xfff1d6, { lum: 1.3 })); a.position.set(x - 1.1, 1.5, z + 0.9); D.add(a); boiteM(D, 0.09, 0.17, 0.015, NOIR, x - 1.1, 1.5, z + 0.9, { fin: "metal", sansOmbre: true });
      emprise(x - 1.1, z - 0.4, 0.45, 0.45); cyl(D, 0.2, 0.45, 0xd9486e, x - 1.1, 0.225, z - 0.4, { fin: "tissu", seg: 18 }); }
    tapis(D, p.x0 + 5.2, p.z1 - 2.2, 4.6, 2.8, TAPIS.nuit); tableRonde(D, p.x0 + 5.2, p.z1 - 2.2, 0.6);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, x = p.x0 + 5.2 + Math.sin(a) * 1.15, z = p.z1 - 2.2 + Math.cos(a) * 1.15; emprise(x, z, 0.5, 0.5); cyl(D, 0.23, 0.42, tons[i], x, 0.21, z, { fin: "tissu", seg: 18 }); }
    plante(D, p.x0 + 0.9, p.z1 - 0.95, 0.85); plante(D, p.x1 - 0.8, p.z1 - 0.9, 1.1, true); plante(D, p.x0 + 9.6, p.z1 - 0.9, 1.0, true);
  }

  p = parId.archives;                                                      // ── Archives : les rayonnages pleins de boîtes, le chariot
  { const z0 = p.z0, noms = ["RÉNOVATION", "NEUF", "DEVIS"];
    for (let i = 0; i < 3; i++) { const x = p.x0 + 1.5 + i * 2.4; etagere(D, x, z0 + 2.3, PI / 2, i); etagere(D, x, z0 + 6.3, PI / 2, i + 3);
      panneauTexte(D, noms[i], 0.46, 0.13, x, 1.95, z0 + 7.42, 0, "#1e1b4b", "#ffffff", 0.4); }
    { const x = p.x0 + 4.4, z = p.z1 - 1.1; emprise(x, z, 1.0, 0.6);                                                      // le chariot
      boiteM(D, 0.9, 0.04, 0.5, 0xc9ccd6, x, 0.2, z, { fin: "metal" }); boiteM(D, 0.9, 0.04, 0.5, 0xc9ccd6, x, 0.75, z, { fin: "metal" }); for (const sx of [-0.43, 0.43]) for (const sz of [-0.23, 0.23]) cyl(D, 0.018, 0.95, 0xc9ccd6, x + sx, 0.5, z + sz, { fin: "metal", seg: 6, sansOmbre: true });
      carton(D, x - 0.2, 0.77, z, 0.36, 0.28, 0.4, 0.1); carton(D, x + 0.22, 0.77, z, 0.36, 0.28, 0.4, -0.08, BLANC); carton(D, x, 0.22, z, 0.5, 0.3, 0.4, 0); }
    { const x = p.x1 - 0.9, z = p.z1 - 1.0; emprise(x, z, 1.0, 0.9); carton(D, x, 0, z, 0.55, 0.36, 0.42, 0.2); carton(D, x + 0.1, 0.37, z - 0.02, 0.5, 0.32, 0.4, -0.15); carton(D, x - 0.5, 0, z + 0.25, 0.45, 0.3, 0.4, 0.5, BLANC); }
  }

  // ── Le palier des ascenseurs (à gauche de l'accueil) : les portes donnent vers l'accueil
  { boiteM(D, 7, 3.2, 4.6, 0xe9e6df, -16.5, 1.6, 13.6, { mat: new THREE.MeshStandardMaterial({ map: (() => { const t = texBeton("#e6e2d9", 23); t.repeat.set(2, 1); return t; })(), roughness: 0.75 }) });
    boiteM(D, 0.1, 2.75, 4.2, 0, -12.96, 1.38, 13.6, { mat: matNoyer });
    for (const z of [12.55, 14.65]) { boiteM(D, 0.06, 2.3, 1.5, 0xc9ccd6, -12.9, 1.15, z, { rough: 0.25, metal: 0.9, sansOmbre: true }); boiteM(D, 0.07, 2.3, 0.03, NOIR, -12.9, 1.15, z, { fin: "metal", sansOmbre: true }); boiteM(D, 0.08, 0.08, 1.66, NOIR, -12.9, 2.34, z, { fin: "metal", sansOmbre: true }); }
    boiteM(D, 0.04, 0.3, 0.14, NOIR, -12.9, 1.15, 13.6, { fin: "metal", sansOmbre: true }); boiteM(D, 0.045, 0.05, 0.05, 0xffd08a, -12.9, 1.2, 13.6, { lum: 1.5, sansOmbre: true });
    panneauTexte(D, "25", 0.7, 0.44, -12.9, 2.58, 13.6, PI / 2, "#15172b", "#ffd08a", 1.2);
    tapis(D, -11.5, 13.6, 2.7, 3.6, TAPIS.nuit); plante(D, -12.3, 11.0, 1.2, true); plante(D, -12.3, 16.3, 1.2, true);
  }
  // ── Le couloir entre les deux rangées de pièces : un long tapis, des jardinières, deux bancs
  { tapis(D, 0, -3.5, 43.4, 1.5, TAPIS.nuit);
    for (const [x, g] of [[-18, 1], [-5, 2], [9.5, 3], [19, 4]]) jardiniere(D, x, -4.62, 2.2, 0, g * 17);
    banc(D, -11, -2.4, 1.8, PI, 0x6d6ab8); banc(D, 12.5, -2.4, 1.8, PI, 0x6d6ab8);
    palmierPot(D, -21.6, 9.0, 3.0);
  }
  // ── Le couloir de l'accueil (entre la rangée du milieu et l'accueil) : un tapis, des jardinières
  { tapis(D, 0.4, 9.0, 44.6, 1.3, TAPIS.nuit);
    for (const [x, g] of [[-17, 5], [10.5, 6], [19.6, 7]]) jardiniere(D, x, 9.72, 2.0, 0, g * 17);
    tapis(D, 14.8, 15.2, 1.1, 9.4, TAPIS.nuit);                                                                        // le couloir d'accès de l'aile droite
    palmierPot(D, 14.8, 19.9, 2.6);
  }
  // ── Le balcon du bureau de Dani, en porte-à-faux : deux transats, une table, des palmiers
  { for (const z of [1.6, 3.4]) { const t = new THREE.Group(); t.position.set(26.6, 0, z); t.rotation.y = PI / 2; D.add(t); emprise(26.6, z, 2.1, 0.8);
      boiteM(t, 0.7, 0.07, 1.35, 0xffffff, 0, 0.33, -0.25, { fin: "tissu" }); const d = boiteM(t, 0.7, 0.07, 0.75, 0xffffff, 0, 0.52, 0.72, { fin: "tissu" }); d.rotation.x = -0.6;
      for (const sz of [-0.8, 0.3]) boiteM(t, 0.62, 0.28, 0.05, 0x8a6a48, 0, 0.15, sz, { fin: "mat" }); boiteM(t, 0.6, 0.02, 0.5, z < 2 ? 0x4f46e5 : 0xa78bfa, 0, 0.375, -0.5, { fin: "tissu", sansOmbre: true }); }
    tableRonde(D, 25.0, 6.0, 0.4); palmierPot(D, 27.7, -0.9, 3.2); palmierPot(D, 27.7, 6.9, 3.4); tapis(D, 26.0, 3.0, 3.6, 5.4, TAPIS.sable);
  }
  // ── Un agent IA responsable par pièce : en costume sombre, cravate violette, l'insigne AVYORA au-dessus de la tête
  for (const q of PIECES) { const t = TYPE_PIECE[q.id], r = q.foule == null || !t ? 0 : restePiece.has(q) ? restePiece.get(q) : Math.min(GENS_MAX, q.foule); for (let i = 0; i < r; i++) creerPersonne(t, q); }   // sur le site : ceux que le décor n'avait pas prévus
  for (const q of PIECES) if (q.agent) personne("responsable", q);                       // un agent IA par pièce, sauf ton bureau : là, le responsable c'est toi
  // ── Les couloirs : des gens qui vont d'une pièce à l'autre
  for (const q of COULOIRS) { q.cx = (q.x0 + q.x1) / 2; q.cz = (q.z0 + q.z1) / 2; }
  for (const t of ["pro", "particulier", "visiteur", "client", "pro"]) personne(t, COULOIRS[0]);
  for (const t of ["visiteur", "pro", "particulier", "visiteur"]) personne(t, COULOIRS[1]);
})();
const nCouleurs = vraiesCouleurs(decor);                                     // les couleurs à plat, converties une fois (voir « Le mobilier »)
const nMaillagesDecor = fusionner(decor);                                    // le décor fixe : un seul maillage par matière

/* Outils d'essai (aucun effet pour l'utilisateur) : window.__essaiMobilier.viser(x, z, taille, az, el) approche la caméra d'un point ;
   .rapport() contrôle les allées : part de sol praticable par pièce, cases enfermées, personnes assises et leur siège. */
window.__essaiMobilier = {
  viser(x, z, taille, az, el) { vue.cible.set(x, 0, z); vue.taille = taille || 8; if (az != null) vue.az = az; if (el != null) vue.el = el; return true; },
  /* La carte d'une pièce, case par case : « . » on peut y marcher, « # » un meuble, « + » trop près d'un meuble ou d'un mur, « o » un recoin enfermé */
  carte(id) {
    const q = parId[id], g = q.grille, L = [];
    for (let j = 0; j < g.nz; j++) { let s = ""; for (let i = 0; i < g.nx; i++) { const x = q.x0 + (i + 0.5) * PAS, z = q.z0 + (j + 0.5) * PAS; let dedans = false; for (const o of q.meubles) if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) { dedans = !o.perso || "p"; break; }
      s += g.libre[j * g.nx + i] ? "." : dedans === "p" ? "p" : dedans ? "#" : horsMeuble(q, x, z, CORPS + AISE) ? "o" : "+"; } L.push(s); }
    return L;
  },
  rapport() {
    const r = { maillagesDecor: nMaillagesDecor, obstacles: obstacles.length, sieges: sieges.length, modeles: {}, pieces: {}, assis: [] };
    for (const k in MM) r.modeles[k] = MM[k] ? [MM[k].userData.taille.x, MM[k].userData.taille.y, MM[k].userData.taille.z].map((v) => +v.toFixed(2)).join(" × ") : "absent";
    for (const q of PIECES) {
      const nx = Math.floor((q.x1 - q.x0) / 0.35), nz = Math.floor((q.z1 - q.z0) / 0.35); let libres = 0;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = q.x0 + (i + 0.5) * 0.35, z = q.z0 + (j + 0.5) * 0.35; let ok = x > q.x0 + 0.5 && x < q.x1 - 0.5 && z > q.z0 + 0.5 && z < q.z1 - 0.5; if (ok) for (const o of obstacles) if (x > o.x0 - 0.33 && x < o.x1 + 0.33 && z > o.z0 - 0.33 && z < o.z1 + 0.33) { ok = false; break; } if (ok) libres++; }
      const g = q.grille; let enfermees = 0; if (g) for (const l of this.carte(q.id)) for (const c of l) if (c === "o") enfermees++;
      r.pieces[q.id] = { praticable: Math.round(100 * (g ? g.cases.length : libres) * 0.35 * 0.35 / ((q.x1 - q.x0 - 1) * (q.z1 - q.z0 - 1))) + " %", cases: g ? g.cases.length : libres, enfermees };
    }
    for (const p of persos) if (p.fixe) { const s = siegePres(p.x, p.z), d = s ? Math.hypot(s.x - p.x, s.z - p.z) : 99; r.assis.push(p.piece.id + " " + p.type + (p.assis ? " assis" : p.debout ? " debout près du siège" : " debout") + " (" + p.x.toFixed(2) + ", " + p.z.toFixed(2) + ") siège à " + d.toFixed(2) + " m" + (s && d < 0.3 ? ", " + s.sorte + ", assise prévue " + s.y + " m, trouvée " + (p.siege == null ? "aucune" : p.siege.toFixed(2) + " m") + ", regard " + s.ry.toFixed(2) : "")); }
    r.siegesParSorte = {}; for (const s of sieges) r.siegesParSorte[s.sorte] = (r.siegesParSorte[s.sorte] || 0) + 1;
    return r;
  },
};
