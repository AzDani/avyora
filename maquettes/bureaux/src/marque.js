/* ───────────────────────── La marque AVYORA : le vrai logo et le vrai mot, tels qu'ils sont sur le site ─────────────────────────
   Le logo : un carré indigo aux coins ronds, un chevron blanc (le « A » sans barre) et un point violet. Tracé sur une grille de 64,
   comme le fichier du site. Le mot : « AVY » en blanc (ou en encre sur fond clair) et « ORA » en violet, lettres espacées. */
const MARQUE = { indigo: "#4F46E5", nuit: "#1E1B4B", violet: "#A78BFA", lilas: "#C4B5FD" };
function arrondi(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function dessinerLogo(c, x, y, cote) {
  const u = cote / 64;
  c.fillStyle = MARQUE.indigo; arrondi(c, x + 2 * u, y + 2 * u, 60 * u, 60 * u, 14 * u); c.fill();
  c.strokeStyle = "#ffffff"; c.lineWidth = 7 * u; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x + 17 * u, y + 45 * u); c.lineTo(x + 32 * u, y + 15 * u); c.lineTo(x + 47 * u, y + 45 * u); c.stroke();
  c.fillStyle = MARQUE.lilas; c.beginPath(); c.arc(x + 32 * u, y + 39 * u, 4.5 * u, 0, Math.PI * 2); c.fill();
}
/* Le mot « AVYORA », lettre par lettre pour l'espacement (0,14 em, comme sur le site). Rend sa largeur ; avec `mesure`, ne dessine pas. */
function ecrireAvyora(c, x, y, h, clair, mesure) {
  c.font = "600 " + h + "px Geist, system-ui, -apple-system, sans-serif"; c.textAlign = "left"; c.textBaseline = "alphabetic";
  let px = x; const esp = h * 0.14;
  for (const [l, i] of [..."AVYORA"].map((l, i) => [l, i])) { const w = c.measureText(l).width; if (!mesure) { c.fillStyle = i < 3 ? (clair ? "#ffffff" : "#15172b") : MARQUE.violet; c.fillText(l, px, y); } px += w + esp; }
  return px - esp - x;
}
/* Le logo et le mot côte à côte, centrés dans le cadre (cx, cy), le logo haut de `h`. */
function dessinerMarque(c, cx, cy, h, clair) {
  const hm = h * 0.62, ecart = h * 0.34, wm = ecrireAvyora(c, 0, 0, hm, clair, true), total = h + ecart + wm, x = cx - total / 2;
  dessinerLogo(c, x, cy - h / 2, h); ecrireAvyora(c, x + h + ecart, cy + hm * 0.36, hm, clair);
}
/* Une image posée dans la scène (mur, bandeau, sol) : elle s'éclaire un peu elle-même, pour rester lisible la nuit. */
function image3d(g, tex, w, h, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.lum == null ? 0.5 : o.lum, roughness: o.rough == null ? 0.45 : o.rough, transparent: !!o.transparent, depthWrite: !o.transparent }));
  m.position.set(x, y, z); if (o.auSol) m.rotation.x = -Math.PI / 2; m.rotation[o.auSol ? "z" : "y"] = o.ry || 0; m.receiveShadow = !!o.auSol; g.add(m); return m;
}
const TEX_MARQUE = {
  /* Le grand mur de l'accueil : fond nuit, logo et mot, la promesse en dessous */
  mur: () => toile(2048, 682, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1E1B4B"); g.addColorStop(1, "#2a2670"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(167,139,250,.10)"; c.beginPath(); c.arc(W * 0.82, H * 0.1, H * 0.7, 0, 7); c.fill();
    dessinerMarque(c, W / 2, H * 0.43, H * 0.4, true);
    c.font = "500 " + Math.round(H * 0.075) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = MARQUE.lilas; c.fillText("Estimation de travaux  ·  Plans  ·  Artisans vérifiés", W / 2, H * 0.82);
  }, false),
  /* Le bandeau de façade, sur le nez de dalle du porte-à-faux */
  bandeau: () => toile(2048, 128, (c, W, H) => { c.fillStyle = MARQUE.nuit; c.fillRect(0, 0, W, H); c.fillStyle = MARQUE.violet; c.fillRect(0, H - 6, W, 6); dessinerMarque(c, W / 2, H * 0.47, H * 0.66, true); }, false),
  /* Le médaillon incrusté dans le marbre de l'accueil */
  medaillon: () => toile(1024, 1024, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.strokeStyle = "rgba(30,27,75,.55)"; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, H / 2, W * 0.47, 0, 7); c.stroke();
    c.strokeStyle = "rgba(167,139,250,.8)"; c.lineWidth = 4; c.beginPath(); c.arc(W / 2, H / 2, W * 0.44, 0, 7); c.stroke();
    dessinerLogo(c, W * 0.26, H * 0.2, W * 0.48); const h = W * 0.085, w = ecrireAvyora(c, 0, 0, h, false, true); ecrireAvyora(c, (W - w) / 2, H * 0.8, h, false);
  }, false),
  /* La plaque de la banque d'accueil et les kakémonos */
  plaque: () => toile(1024, 256, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); dessinerMarque(c, W / 2, H / 2, H * 0.56, false); }, false),
  kakemono: () => toile(384, 1024, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#4F46E5"); g.addColorStop(1, "#1E1B4B"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    dessinerLogo(c, W * 0.25, H * 0.12, W * 0.5); const h = W * 0.15, w = ecrireAvyora(c, 0, 0, h, true, true); ecrireAvyora(c, (W - w) / 2, H * 0.5, h, true);
    c.font = "500 " + Math.round(W * 0.075) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = MARQUE.lilas;
    ["Tes travaux,", "sans les erreurs", "qui coûtent cher."].forEach((l, i) => c.fillText(l, W / 2, H * 0.66 + i * W * 0.105));
  }, false),
  /* L'insigne qui flotte au-dessus d'un responsable : le logo dans une pastille blanche (agent IA), une étoile dorée (Dani) */
  insigneIA: (etat) => toile(160, 200, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(W / 2, 76, 70, 0, 7); c.fill(); c.strokeStyle = MARQUE.indigo; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 16, 140); c.lineTo(W / 2, 172); c.lineTo(W / 2 + 16, 140); c.closePath(); c.fillStyle = MARQUE.indigo; c.fill();
    dessinerLogo(c, W / 2 - 44, 32, 88);
    const ton = { travail: "#30a46c", attend: "#f59e0b", repos: "#9aa0b4" }[etat];                                    // l'état de l'agent : vert au travail, orange s'il attend ta décision, gris au repos
    if (ton || etat === "creer") { c.beginPath(); c.arc(W - 30, 122, 24, 0, 7); c.fillStyle = "#ffffff"; c.fill(); c.beginPath(); c.arc(W - 30, 122, 17, 0, 7);
      if (ton) { c.fillStyle = ton; c.fill(); } else { c.setLineDash([7, 6]); c.lineWidth = 5; c.strokeStyle = "#9aa0b4"; c.stroke(); c.setLineDash([]); } }   // (à créer : un cercle en pointillés)
  }, false),
  insigneDani: () => toile(160, 200, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = "#1E1B4B"; c.beginPath(); c.arc(W / 2, 76, 70, 0, 7); c.fill(); c.strokeStyle = "#f5c451"; c.lineWidth = 8; c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 16, 140); c.lineTo(W / 2, 172); c.lineTo(W / 2 + 16, 140); c.closePath(); c.fillStyle = "#f5c451"; c.fill();
    c.fillStyle = "#f5c451"; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 20 : 46; c.lineTo(W / 2 + Math.cos(a) * r, 76 + Math.sin(a) * r); } c.closePath(); c.fill();
  }, false),
};
