/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA VILLE : Miami vu du 25e étage. Tout ce qui est hors de l'étage : le sol et ses rues, les îlots et leurs
   immeubles, la baie, les ponts, Miami Beach, la plage, l'océan, les arbres, les voitures, les bateaux, et le
   corps de la tour sous l'étage.

   Le principe (budget : 70 tracés, 700 000 triangles) : presque tout est FONDU dans quelques grands tampons.
     · un tampon par style de façade : 5 textures répétées, des UV en mètres, une teinte par sommet ;
     · un tampon « plat » (toits, terrasses, édicules, quais, sable) et un tampon « dalle » (ce qui est posé au sol) ;
     · l'eau (baie, océan, piscines), les ombres portées dessinées au sol, les lumières de la nuit ;
     · des InstancedMesh pour les palmiers, les arbres, les voitures et les bateaux.
   Rien ne projette ni ne reçoit d'ombre calculée. Le plan est tiré avec alea() : la même ville à chaque ouverture.

   Repères : l'étage est à y = 0, la rue à y = SOL. Les voies sont sur une trame de 90 m (axes à 45 + 90 k), une
   avenue à terre-plein planté une fois sur deux, une rue l'autre fois. La baie est à l'ouest (x < -252), Miami Beach
   entre x = -716 et -596, puis la plage et l'océan.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const VILLE = (function () {

  /* ───────────────────────── 1. Réglages et petits outils ───────────────────────── */
  const EAU_Y = SOL - 1.2;                                   // le niveau de l'eau, un peu sous les quais
  const BAIE = 3, NIV = 3.3;                                 // une travée de façade, un étage (en mètres)
  const TU = 16 * BAIE, TV = 16 * NIV;                       // un carreau de façade = 16 travées × 16 étages
  const RIVE = -252;                                         // le quai de la baie, côté ville
  const ILE_O = -716, ILE_E = -596;                          // Miami Beach : bord côté plage, bord côté baie
  const COLLINS = -644;                                      // l'avenue de l'île
  const PONTS_Z = [-765, -405, 135, 495, 855];               // les ponts prolongent des avenues
  const SOLEIL = [-0.72, 0.56, 0.4];                        // le soleil de fin de journée (pour les ombres dessinées au sol)
  const DETAIL = { palmiers: 30, palmiersMoyens: 500, arbres: 150, arbresMoyens: 620, autosGarees: 30, autosRoulantes: 36, rayonAutos: 135 };   // les modèles détaillés, réservés aux abords de la tour ; puis une version moyenne, puis une version légère au loin
  const R = alea(2026);

  const _c = new THREE.Color();
  function C(hex, k) { _c.setHex(hex).convertSRGBToLinear(); if (k == null) k = 1; return [_c.r * k, _c.g * k, _c.b * k]; }   // une couleur « écran » → valeurs linéaires
  const mel = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const fois = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (r, t) => t[r() * t.length | 0];
  const rvb = (r, g, b, a) => "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + (a == null ? 1 : a) + ")";
  const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  /* Au loin, les couleurs se délavent un peu (en plus de la brume) */
  function lointain(c, x, z) { const d = Math.hypot(x, z); if (d < 500) return c; const g = (c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15) * 1.04; return mel(c, [g, g, g * 1.04], Math.min(0.32, (d - 500) / 2800)); }

  /* Un tampon : des sommets qu'on accumule, puis UNE seule géométrie */
  function tampon() { return { p: [], n: [], u: [], c: [], i: [], nb: 0 }; }
  /* Quatre points en anneau ; le sens des triangles est déduit de la normale voulue. cb = couleur des points 0-1, ch = des points 2-3 */
  function quad(T, P, N, UV, cb, ch) {
    const gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const b = T.nb; ch = ch || cb;
    for (let k = 0; k < 4; k++) {
      const x = P[3 * k], y = P[3 * k + 1], z = P[3 * k + 2], c = k < 2 ? cb : ch;
      T.p.push(x, y, z); T.n.push(N[0], N[1], N[2]); T.c.push(c[0], c[1], c[2]);
      if (UV) T.u.push(UV[2 * k], UV[2 * k + 1]); else if (Math.abs(N[1]) > 0.7) T.u.push(x / 24, z / 24); else T.u.push((x + z) / 24, y / 24);
    }
    if (gx * N[0] + gy * N[1] + gz * N[2] >= 0) T.i.push(b, b + 1, b + 2, b, b + 2, b + 3); else T.i.push(b, b + 2, b + 1, b, b + 3, b + 2);
    T.nb += 4;
  }
  function tri(T, P, N, c0, c1, c2) {
    const gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const b = T.nb, cols = [c0, c1 || c0, c2 || c1 || c0];
    for (let k = 0; k < 3; k++) { T.p.push(P[3 * k], P[3 * k + 1], P[3 * k + 2]); T.n.push(N[0], N[1], N[2]); T.u.push(P[3 * k] / 24, P[3 * k + 2] / 24); T.c.push(cols[k][0], cols[k][1], cols[k][2]); }
    if (gx * N[0] + gy * N[1] + gz * N[2] >= 0) T.i.push(b, b + 1, b + 2); else T.i.push(b, b + 2, b + 1);
    T.nb += 3;
  }
  /* Un polygone convexe à plat, tourné vers le haut */
  function polyH(T, pts, y, col) {
    const b = T.nb, n = pts.length;
    for (const p of pts) { T.p.push(p[0], y, p[1]); T.n.push(0, 1, 0); T.u.push(p[0] / 24, p[1] / 24); T.c.push(col[0], col[1], col[2]); }
    const s = (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) >= 0;
    for (let k = 1; k < n - 1; k++) if (s) T.i.push(b, b + k, b + k + 1); else T.i.push(b, b + k + 1, b + k);
    T.nb += n;
  }
  /* Un quadrilatère quelconque, tourné vers le haut : la normale est calculée (palmes, voiles) */
  function quadLibre(T, P, cb, ch) {
    let gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const l = (Math.hypot(gx, gy, gz) || 1) * (gy < 0 ? -1 : 1); quad(T, P, [gx / l, gy / l, gz / l], null, cb, ch);
  }
  function plaque(T, x0, z0, x1, z1, y, col) { quad(T, [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], [0, 1, 0], null, col); }
  /* Une boîte sans fond (les côtés un peu plus sombres en bas) */
  function caisse(T, x0, y0, z0, x1, y1, z1, col, dessus) {
    const bas = fois(col, 0.8);
    quad(T, [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0], [0, 0, -1], null, bas, col);
    quad(T, [x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1], [0, 0, 1], null, bas, col);
    quad(T, [x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1], [-1, 0, 0], null, bas, col);
    quad(T, [x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0], [1, 0, 0], null, bas, col);
    plaque(T, x0, z0, x1, z1, y1, dessus || col);
  }
  function geoDe(T) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(T.p), 3)); g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(T.n), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(T.u), 2)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(T.c), 3));
    g.setIndex(new THREE.BufferAttribute(T.nb > 65535 ? new Uint32Array(T.i) : new Uint16Array(T.i), 1)); return g;
  }
  function maille(T, mat, ordre) {
    const m = new THREE.Mesh(geoDe(T), mat); m.castShadow = m.receiveShadow = false; m.matrixAutoUpdate = false; if (ordre != null) m.renderOrder = ordre; scene.add(m); return m;
  }
  function instances(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; m.frustumCulled = false; m.castShadow = m.receiveShadow = false; scene.add(m); return m; }
  /* Écrit la place d'un exemplaire : tourné autour de la verticale (cap hx, hz), à l'échelle s (sy en hauteur si donné) */
  function ecrire(a, i, x, y, z, hx, hz, s, sy) {
    const o = i * 16; a[o] = hz * s; a[o + 1] = 0; a[o + 2] = -hx * s; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sy == null ? s : sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = hx * s; a[o + 9] = 0; a[o + 10] = hz * s; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  }

  /* ───────────────────────── 2. Les textures (toutes dessinées ici) ───────────────────────── */

  /* Le sol : un carreau de 180 m (2 × 2 îlots) qui se répète. Une avenue (4 voies, terre-plein planté) et une rue
     (2 voies, stationnement) dans chaque sens, les trottoirs, les passages piétons, les lignes d'arrêt. Dessiné en mètres. */
  const texSol = toile(2048, 2048, (c, w, h) => {
    const r = alea(7), k = w / 180; c.scale(k, k);
    const arrondi = (x, y, l, t, a) => { c.beginPath(); c.moveTo(x + a, y); c.arcTo(x + l, y, x + l, y + t, a); c.arcTo(x + l, y + t, x, y + t, a); c.arcTo(x, y + t, x, y, a); c.arcTo(x, y, x + l, y, a); c.closePath(); };
    c.fillStyle = "#7d8084"; c.fillRect(0, 0, 180, 180);                                      // l'asphalte, gris moyen
    for (let i = 0; i < 420; i++) {                                                           // reprises et usure
      c.fillStyle = (r() < 0.5 ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.02 + r() * 0.05).toFixed(3) + ")";
      const L = 4 + r() * 24, l = 1.2 + r() * 2.2; if (r() < 0.5) c.fillRect(r() * 180, r() * 180, L, l); else c.fillRect(r() * 180, r() * 180, l, L);
    }
    // les îlots : bordure, trottoir à joints, puis l'intérieur (recouvert ensuite par les socles, les parcs, les parkings)
    const BX = [[53, 129.2, 4, 3.2], [140.8, 217, 3.2, 4]], BY = [[50.8, 127, 3.2, 4], [143, 219.2, 4, 3.2]];
    for (const dx of [-180, 0]) for (const dy of [-180, 0]) for (const bx of BX) for (const by of BY) {
      c.save(); c.translate(dx, dy);
      c.fillStyle = "#cfccc4"; arrondi(bx[0], by[0], bx[1] - bx[0], by[1] - by[0], 5); c.fill();
      c.fillStyle = "#b9b5ac"; arrondi(bx[0] + 0.3, by[0] + 0.3, bx[1] - bx[0] - 0.6, by[1] - by[0] - 0.6, 4.7); c.fill();
      c.save(); c.clip(); c.strokeStyle = "rgba(0,0,0,.09)"; c.lineWidth = 0.1; c.beginPath();
      for (let v = 0; v < 80; v += 1.5) { c.moveTo(bx[0] + v, by[0]); c.lineTo(bx[0] + v, by[1]); c.moveTo(bx[0], by[0] + v); c.lineTo(bx[1], by[0] + v); }
      c.stroke(); c.restore();
      c.fillStyle = "#aeaaa0"; arrondi(bx[0] + bx[2], by[0] + by[2], bx[1] - bx[0] - bx[2] - bx[3], by[1] - by[0] - by[2] - by[3], 1.2); c.fill();
      c.restore();
    }
    // une voie, dessinée de haut en bas (pour une voie est-ouest on échange x et y avant d'appeler)
    const blanc = "rgba(240,240,234,.92)", jaune = "rgba(226,190,72,.95)";
    function voie(axe, demi, avenue, croix, gaucheMonte) {
      for (let n = 0; n < croix.length; n++) {
        const a = croix[n], b = croix[(n + 1) % croix.length], y0 = a[0] + a[1] + 7.5, y1 = b[0] - b[1] - 7.5 + (n === croix.length - 1 ? 180 : 0);
        for (const dy of [0, -180]) {
          c.save(); c.translate(0, dy);
          c.fillStyle = "rgba(0,0,0,.05)";                                                    // les traces de roulement
          for (const o of avenue ? [-6.35, -3, 3, 6.35] : [-1.75, 1.75]) { c.fillRect(axe + o - 1.05, y0 - 7, 0.5, y1 - y0 + 14); c.fillRect(axe + o + 0.55, y0 - 7, 0.5, y1 - y0 + 14); }
          if (avenue) {
            c.fillStyle = "#d2cec4"; arrondi(axe - 1.3, y0, 2.6, y1 - y0, 1.3); c.fill();    // le terre-plein planté
            c.fillStyle = "#74905d"; arrondi(axe - 1.0, y0 + 0.3, 2.0, y1 - y0 - 0.6, 1.0); c.fill();
            for (let i = 0; i < 46; i++) { c.fillStyle = r() < 0.5 ? "rgba(60,95,50,.5)" : "rgba(150,175,105,.45)"; c.beginPath(); c.arc(axe - 0.7 + r() * 1.4, y0 + 1 + r() * (y1 - y0 - 2), 0.3 + r() * 0.5, 0, 7); c.fill(); }
            c.fillStyle = jaune; c.fillRect(axe - 1.65, y0 - 0.5, 0.2, y1 - y0 + 1); c.fillRect(axe + 1.45, y0 - 0.5, 0.2, y1 - y0 + 1);
            c.fillStyle = blanc; for (let y = y0 - 1; y < y1; y += 9) { c.fillRect(axe - 4.75, y, 0.2, 3); c.fillRect(axe + 4.55, y, 0.2, 3); }
          } else {
            c.fillStyle = jaune; c.fillRect(axe - 0.28, y0 - 3, 0.16, y1 - y0 + 6); c.fillRect(axe + 0.12, y0 - 3, 0.16, y1 - y0 + 6);
            c.fillStyle = blanc; c.fillRect(axe - 3.56, y0 + 2, 0.12, y1 - y0 - 4); c.fillRect(axe + 3.44, y0 + 2, 0.12, y1 - y0 - 4);
            for (let y = Math.ceil((y0 + 2) / 6) * 6; y <= y1 - 2; y += 6) { c.fillRect(axe - 5.8, y - 0.06, 2.3, 0.12); c.fillRect(axe + 3.5, y - 0.06, 2.3, 0.12); }   // les places le long du trottoir
          }
          c.fillStyle = "#6c6758"; for (let y = 9; y < 360; y += 18) if (y > y0 + 6 && y < y1 - 6) { c.fillRect(axe - demi - 1.6, y - 0.6, 1.2, 1.2); c.fillRect(axe + demi + 0.4, y - 0.6, 1.2, 1.2); }   // les fosses d'arbres
          c.restore();
        }
      }
      for (const cr of croix) {                                                               // passages piétons et lignes d'arrêt
        const p = cr[0], hw = cr[1]; c.fillStyle = blanc;
        for (let x = axe - demi + 0.5; x < axe + demi - 0.9; x += 1.25) { c.fillRect(x, p - hw - 4.4, 0.65, 3.2); c.fillRect(x, p + hw + 1.2, 0.65, 3.2); }
        const larg = demi - 0.6 - (avenue ? 1.3 : 0), g = axe - demi + 0.3, d = axe + (avenue ? 1.6 : 0.3);
        c.fillRect(gaucheMonte ? g : d, p + hw + 5.4, larg, 0.45); c.fillRect(gaucheMonte ? d : g, p - hw - 5.85, larg, 0.45);
      }
    }
    voie(45, 8, true, [[45, 5.8], [135, 8]], true); voie(135, 5.8, false, [[45, 5.8], [135, 8]], true);                    // nord-sud : l'avenue, la rue
    c.save(); c.transform(0, 1, 1, 0, 0, 0);
    voie(135, 8, true, [[45, 8], [135, 5.8]], false); voie(45, 5.8, false, [[45, 8], [135, 5.8]], false);                  // est-ouest
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0); grain(c, w, h, 30000, 0.045, r);
  });

  /* Les façades : 16 travées × 16 étages par carreau. Un dessin de jour par style, et les fenêtres allumées de la nuit. */
  function allumage(graine, mode) {
    const r = alea(graine), G = [];
    const chaud = () => { const k = 0.5 + r() * 0.5, t = r(); return t < 0.1 ? [175 * k, 208 * k, 255 * k] : t < 0.22 ? [255 * k, 238 * k, 208 * k] : [255 * k, (178 + r() * 46) * k, (94 + r() * 72) * k]; };   // quelques écrans bleutés, des blancs, surtout des lampes chaudes
    for (let f = 0; f < 16; f++) {
      const L = []; G.push(L);
      if (mode === "bureaux") {                                                               // des plateaux entiers restés allumés
        for (let b = 0; b < 16; b++) L.push(r() < 0.05 ? chaud() : null);
        if (r() < 0.42) { const d = r() * 16 | 0, n = 2 + (r() * 9 | 0), k = 0.45 + r() * 0.5, ton = r() < 0.6 ? [228 * k, 238 * k, 255 * k] : [255 * k, 224 * k, 172 * k]; for (let b = d; b < d + n; b++) L[b % 16] = ton; }
      } else if (mode === "logements") for (let b = 0; b < 16; b += 2) { const ton = r() < 0.34 ? chaud() : null; L.push(ton, r() < 0.8 ? ton : null); }   // par appartement (2 travées), une pièce parfois éteinte
      else for (let b = 0; b < 16; b++) L.push(r() < 0.27 ? chaud() : null);
    }
    return G;
  }
  /* Une vitre allumée, vue de dehors : plus claire sous le plafond, parfois un store à demi baissé ou un rideau tiré, un plafonnier dans les bureaux */
  function vitreAllumee(c, r, x, y, w, h, t, bureau) {
    const j = 0.88 + r() * 0.2, g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rvb(Math.min(255, t[0] * j * 1.12), Math.min(255, t[1] * j * 1.12), Math.min(255, t[2] * j * 1.12))); g.addColorStop(1, rvb(t[0] * j * 0.56, t[1] * j * 0.53, t[2] * j * 0.5));
    c.fillStyle = g; c.fillRect(x, y, w, h);
    const u = r();
    if (u < 0.26) { c.fillStyle = "rgba(0,0,0," + (0.3 + r() * 0.45).toFixed(2) + ")"; c.fillRect(x, y, w, h * (0.25 + r() * 0.55)); }                 // le store
    else if (u < 0.46 && !bureau) { const l = w * (0.18 + r() * 0.3); c.fillStyle = "rgba(0,0,0,.52)"; c.fillRect(r() < 0.5 ? x : x + w - l, y, l, h); }   // le rideau
    if (bureau) { c.fillStyle = rvb(Math.min(255, t[0] * 1.5 + 40), Math.min(255, t[1] * 1.5 + 40), Math.min(255, t[2] * 1.5 + 40)); c.fillRect(x + w * 0.12, y + h * 0.1, w * 0.3, Math.max(1.5, h * 0.07)); c.fillRect(x + w * 0.58, y + h * 0.1, w * 0.3, Math.max(1.5, h * 0.07)); }
  }
  /* Mur-rideau : le vitrage en haut de chaque étage, l'allège opaque en bas, un montant tous les 1,5 m */
  function jourVitrage(base, allege, montant, graine) {
    return (c, w, h) => {
      const r = alea(graine), cw = w / 32, ch = h / 16;
      for (let f = 0; f < 16; f++) for (let b = 0; b < 32; b++) {
        const x = b * cw, y = f * ch, k = 0.93 + r() * 0.14, g = c.createLinearGradient(0, y, 0, y + ch * 0.62);
        g.addColorStop(0, rvb(base[0] * k * 1.2, base[1] * k * 1.15, base[2] * k * 1.1)); g.addColorStop(1, rvb(base[0] * k * 0.84, base[1] * k * 0.87, base[2] * k * 0.92));
        c.fillStyle = r() < 0.05 ? rvb(base[0] * 0.45 + 118, base[1] * 0.45 + 120, base[2] * 0.45 + 118) : g; c.fillRect(x, y, cw + 0.5, ch * 0.62);   // parfois un store baissé
        c.fillStyle = rvb(allege[0] * k, allege[1] * k, allege[2] * k); c.fillRect(x, y + ch * 0.62, cw + 0.5, ch * 0.38);
      }
      c.fillStyle = montant; for (let b = 0; b < 32; b++) c.fillRect(b * cw - 1, 0, b % 2 ? 1.5 : 2.5, h);
      for (let f = 0; f < 16; f++) { c.fillRect(0, f * ch + ch * 0.62 - 1, w, 2); c.fillRect(0, (f + 1) * ch - 2.5, w, 3); }
      grain(c, w, h, 5000, 0.035, r);
    };
  }
  /* Bandeaux : un ruban vitré, un bandeau blanc plein */
  function jourBandes(c, w, h) {
    const r = alea(41), cw = w / 32, ch = h / 16;
    for (let f = 0; f < 16; f++) {
      for (let b = 0; b < 32; b++) {
        const x = b * cw, y = f * ch, k = 0.88 + r() * 0.24, g = c.createLinearGradient(0, y, 0, y + ch * 0.6);
        g.addColorStop(0, rvb(66 * k, 88 * k, 106 * k)); g.addColorStop(1, rvb(124 * k, 152 * k, 168 * k));
        c.fillStyle = r() < 0.07 ? "#aab4b8" : g; c.fillRect(x, y, cw + 0.5, ch * 0.6);
        c.fillStyle = "rgba(16,24,32,.6)"; c.fillRect(x - 0.8, y, 1.6, ch * 0.6);
      }
      c.fillStyle = "#f2efe8"; c.fillRect(0, f * ch + ch * 0.6, w, ch * 0.4);
      c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(0, f * ch + ch * 0.6, w, 2); c.fillStyle = "rgba(0,0,0,.1)"; c.fillRect(0, (f + 1) * ch - 1.5, w, 1.5);
      c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(0, f * ch, w, 4);                           // l'ombre du bandeau sur le vitrage
    }
    grain(c, w, h, 6000, 0.03, r);
  }
  /* Balcons filants : la dalle blanche, le garde-corps vitré, la baie en retrait dans l'ombre, un refend tous les 6 m */
  function jourBalcons(c, w, h) {
    const r = alea(53), cw = w / 16, ch = h / 16;
    for (let f = 0; f < 16; f++) {
      const y = f * ch, g = c.createLinearGradient(0, y, 0, y + ch * 0.6);
      g.addColorStop(0, "#2a3946"); g.addColorStop(0.3, "#4d6474"); g.addColorStop(1, "#86a1b0"); c.fillStyle = g; c.fillRect(0, y, w, ch * 0.56);
      for (let b = 0; b < 32; b++) {
        const x = b * cw / 2;
        if (r() < 0.22) { c.fillStyle = rvb(200 + r() * 30, 198 + r() * 30, 186 + r() * 30, 0.5); c.fillRect(x + 2, y + ch * 0.08, cw / 2 - 3, ch * 0.48); }    // un voilage
        c.fillStyle = "rgba(215,222,226,.5)"; c.fillRect(x - 0.6, y + 4, 1.3, ch * 0.56 - 4);
      }
      c.fillStyle = "#eef0ec"; c.fillRect(0, y + ch * 0.56, w, ch * 0.36);                    // le garde-corps : plein et blanc, ou vitré selon l'appartement
      for (let b = 0; b < 16; b += 2) if (r() < 0.45) { c.fillStyle = "rgba(150,190,196,.55)"; c.fillRect(b * cw + 6, y + ch * 0.62, 2 * cw - 8, ch * 0.26); }
      c.fillStyle = "#fbfbf8"; c.fillRect(0, y + ch * 0.56, w, 2.5);
      c.fillStyle = "rgba(0,0,0,.07)"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 0.5, y + ch * 0.6, 1, ch * 0.32);
      c.fillStyle = "#f7f5ef"; c.fillRect(0, y + ch * 0.92, w, ch * 0.08 + 0.5);              // le nez de dalle
      for (let b = 0; b < 16; b += 2) { c.fillStyle = "#f1eee7"; c.fillRect(b * cw - 4, y, 8, ch * 0.56); c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(b * cw + 4, y, 4, ch * 0.56); }   // les refends
    }
    grain(c, w, h, 6000, 0.03, r);
  }
  /* Fenêtres percées dans un enduit clair, avec la casquette filante des immeubles Art déco */
  function jourPerce(c, w, h) {
    const r = alea(67), cw = w / 16, ch = h / 16;
    c.fillStyle = "#f3efe6"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = "rgba(120,105,85," + (0.02 + r() * 0.04).toFixed(3) + ")"; c.fillRect(r() * w, r() * h, 3 + r() * 10, 30 + r() * 120); }   // coulures
    for (let f = 0; f < 16; f++) {
      const y = f * ch;
      c.fillStyle = "#ffffff"; c.fillRect(0, y + ch * 0.1, w, ch * 0.06); c.fillStyle = "rgba(60,50,40,.24)"; c.fillRect(0, y + ch * 0.16, w, ch * 0.05);
      c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(0, y + ch - 1, w, 1.5);
      for (let b = 0; b < 16; b++) {
        const x = b * cw + cw * 0.2, fw = cw * 0.6, fy = y + ch * 0.26, fh = ch * 0.46, k = 0.85 + r() * 0.3, g = c.createLinearGradient(0, fy, 0, fy + fh);
        g.addColorStop(0, rvb(40 * k, 56 * k, 72 * k)); g.addColorStop(1, rvb(92 * k, 120 * k, 138 * k));
        c.fillStyle = r() < 0.16 ? "#c9c6ba" : g; c.fillRect(x, fy, fw, fh);
        c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2; c.strokeRect(x, fy, fw, fh); c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(x + fw / 2 - 0.8, fy, 1.6, fh);
        c.fillStyle = "rgba(0,0,0,.16)"; c.fillRect(x - 1, fy + fh + 1, fw + 2, 3);
      }
    }
    grain(c, w, h, 7000, 0.03, r);
  }
  const nuitRuban = (G) => (c, w, h) => {
    const r = alea(601), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) vitreAllumee(c, r, b * cw, f * ch + 2, cw, ch * 0.6 - 4, G[f][b], true);
    c.fillStyle = "#000"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 1.2, 0, 2.4, h);
  };
  const nuitBalcons = (G) => (c, w, h) => {
    const r = alea(607), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) {
      const t = G[f][b], x = b * cw + (b % 2 ? 0 : 6), l = cw - 6;
      vitreAllumee(c, r, x, f * ch + 4, l, ch * 0.52 - 4, t, false);
      c.fillStyle = rvb(t[0] * 0.13, t[1] * 0.12, t[2] * 0.1); c.fillRect(x, f * ch + ch * 0.56, l, ch * 0.36);                                        // la lumière qui déborde sur le balcon
    }
    c.fillStyle = "#000"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 1, 0, 2, h);
  };
  const nuitPerce = (G) => (c, w, h) => {
    const r = alea(613), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) { const x = b * cw + cw * 0.22, y = f * ch + ch * 0.28, l = cw * 0.56; vitreAllumee(c, r, x, y, l, ch * 0.42, G[f][b], false); c.fillStyle = "#000"; c.fillRect(x + l / 2 - 1.2, y, 2.4, ch * 0.42); }
  };
  const lumBureaux = toile(1024, 1024, nuitRuban(allumage(301, "bureaux")));                    // la même pour les trois façades à ruban vitré
  const STYLES = {
    verre: { map: toile(1024, 1024, jourVitrage([112, 158, 184], [86, 128, 154], "rgba(222,230,235,.85)", 11)), lum: lumBureaux, rough: 0.18, metal: 0.32, env: 1.5 },
    sombre: { map: toile(1024, 1024, jourVitrage([58, 76, 92], [34, 45, 56], "rgba(140,152,162,.55)", 23)), lum: lumBureaux, rough: 0.14, metal: 0.5, env: 1.6 },
    bandes: { map: toile(1024, 1024, jourBandes), lum: lumBureaux, rough: 0.5, metal: 0.08, env: 1.5 },
    balcons: { map: toile(1024, 1024, jourBalcons), lum: toile(1024, 1024, nuitBalcons(allumage(307, "logements"))), rough: 0.6, metal: 0.04, env: 1.5 },
    perce: { map: toile(1024, 1024, jourPerce), lum: toile(1024, 1024, nuitPerce(allumage(311, "fenetres"))), rough: 0.86, metal: 0, env: 1.5 },
  };
  /* Le grain des surfaces plates (toits, sable, quais) */
  const texCrepi = toile(256, 256, (c, w, h) => {
    const r = alea(19); c.fillStyle = "#eeeeee"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = (r() < 0.5 ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.015 + r() * 0.035).toFixed(3) + ")"; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 50, 8 + r() * 36, r() * 3, 0, 7); c.fill(); }
    grain(c, w, h, 9000, 0.07, r);
  });
  /* Le clapot : une carte de normales qui se répète, faite d'une somme d'ondes */
  const texOndes = toile(256, 256, (c, w, h) => {
    const r = alea(31), img = c.createImageData(w, h), O = [], gx = new Float32Array(w * h), gy = new Float32Array(w * h); let somme = 0;
    for (let k = 0; k < 18; k++) { const f = 2 + r() * (k < 6 ? 4 : 20), a = r() * 6.2832; O.push([Math.round(f * Math.cos(a)), Math.round(f * Math.sin(a)), r() * 6.2832, 1 / (1 + f * 0.25)]); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0; for (const o of O) { const cs = Math.cos(6.2832 * (o[0] * x + o[1] * y) / w + o[2]) * o[3]; dx += cs * o[0]; dy += cs * o[1]; }
      gx[y * w + x] = dx; gy[y * w + x] = dy; somme += dx * dx + dy * dy;
    }
    const k = 0.42 / Math.sqrt(somme / (w * h));
    for (let i = 0; i < w * h; i++) { const nx = -gx[i] * k, ny = -gy[i] * k, l = Math.hypot(nx, ny, 1); img.data[i * 4] = 127.5 + 127.5 * nx / l; img.data[i * 4 + 1] = 127.5 + 127.5 * ny / l; img.data[i * 4 + 2] = 127.5 + 127.5 / l; img.data[i * 4 + 3] = 255; }
    c.putImageData(img, 0, 0);
  });
  texOndes.encoding = THREE.LinearEncoding;
  /* Les rouleaux : des lignes d'écume qui avancent vers la plage */
  const texEcume = toile(256, 256, (c, w, h) => {
    const r = alea(43); c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.lineCap = "round";
    for (const v of [0.14, 0.47, 0.8]) for (let passe = 0; passe < 3; passe++) {
      const A = 5 + r() * 6, ph = r() * 6.28, n = 1 + (r() * 2 | 0), ph2 = r() * 6.28, tirets = [[30 + r() * 50, 6 + r() * 22, 12 + r() * 30, 4 + r() * 12], [50 + r() * 40, 20 + r() * 30], [20 + r() * 30, 40 + r() * 40]];
      for (const dx of [-w, 0, w]) { c.beginPath();
        for (let x = 0; x <= w; x += 4) { const y = v * h + passe * 5 + A * Math.sin(6.2832 * n * x / w + ph) + 2.5 * Math.sin(6.2832 * 5 * x / w + ph2); if (x === 0) c.moveTo(x + dx, y); else c.lineTo(x + dx, y); }
        c.setLineDash(tirets[passe]); c.strokeStyle = "rgba(255,255,255," + (passe === 0 ? 0.8 : 0.28) + ")"; c.lineWidth = passe === 0 ? 2.5 : 6 + passe * 2; c.stroke(); }
    }
    for (let i = 0; i < 500; i++) { c.fillStyle = "rgba(255,255,255," + (0.1 + r() * 0.35).toFixed(2) + ")"; const v = pick(r, [0.14, 0.47, 0.8]); c.fillRect(r() * w, v * h + 4 + r() * 26, 1 + r() * 3, 1 + r() * 2); }
  });

  /* ───────────────────────── 3. Les matières et les tampons ───────────────────────── */
  const F = {}, matFacades = {};
  for (const nom in STYLES) {
    const s = STYLES[nom]; F[nom] = tampon();
    matFacades[nom] = new THREE.MeshStandardMaterial({ map: s.map, emissiveMap: s.lum, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: s.rough, metalness: s.metal, envMapIntensity: s.env });
    facadesAllumables.push(matFacades[nom]);                                                  // le ciel règle leur éclat, jour et nuit
  }
  const PLAT = tampon(), DALLE = tampon(), SOLT = tampon(), EAU = tampon(), LUM = tampon(), ECUME = tampon();
  const matSol = new THREE.MeshStandardMaterial({ map: texSol, roughness: 0.94, metalness: 0 });
  const matPlat = new THREE.MeshStandardMaterial({ map: texCrepi, vertexColors: true, roughness: 0.88, metalness: 0 });
  const matDalle = new THREE.MeshStandardMaterial({ map: texCrepi, vertexColors: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -3 });
  const uEau = { value: new THREE.Vector4(0, 0, 0, 0) };
  const matEau = new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: texOndes, normalScale: new THREE.Vector2(0.24, 0.24), roughness: 0.2, metalness: 0.02, envMapIntensity: 0.2 });   // peu de reflets du ciel : c'est la couleur de l'eau qui doit dominer
  matEau.onBeforeCompile = (sh) => {                                                          // deux lectures du clapot, à deux échelles, qui glissent l'une sur l'autre ; et un éclat du soleil atténué (sinon la mer blanchit face au couchant)
    sh.uniforms.uEau = uEau;
    sh.fragmentShader = "uniform vec4 uEau;\n" + sh.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n\treflectedLight.directSpecular *= 0.3;").replace("#include <normal_fragment_maps>", THREE.ShaderChunk.normal_fragment_maps.replace(/vec3 mapN = texture2D\( normalMap, vUv \)\.xyz \* 2\.0 - 1\.0;/, "vec3 mapN = texture2D( normalMap, vUv + uEau.xy ).xyz + texture2D( normalMap, vUv * 0.27 + uEau.zw ).xyz - 1.0;"));
  };
  const matOmbre = new THREE.MeshBasicMaterial({ color: 0x050914, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp });   // le pochoir : deux ombres superposées ne noircissent pas deux fois
  const matLum = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const matEcume = new THREE.MeshBasicMaterial({ map: texEcume, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });

  /* Les palettes */
  const BLANC = [1, 1, 1], BLANCS = [C(0xf2f2f0), C(0xebe8e0), C(0xe7e2d7), C(0xe5e7e6), C(0xeeeae2)];   // jamais tout à fait blancs : le soleil est fort
  const PASTELS = [C(0xf0d6bf), C(0xeec8ca), C(0xcfe4d9), C(0xd0dfec), C(0xf0e2b4), C(0xe9c1a8), C(0xc9e4e2), C(0xf2dccb)];
  const VITRES = [C(0xffffff), C(0xe2f6ee), C(0xe4edff), C(0xf4f1e6), C(0xd4e6ee), C(0xcfeee6)];
  const SOMBRES = [C(0xffffff), C(0xffeedd), C(0xe2eaff), C(0xd8d8d8)];
  const TOITS = [C(0xbdbab4), C(0xaeaba5), C(0xc9c6c0), C(0xa29e96), C(0x98958e), C(0xc2b9aa)];
  const PONTONS = [C(0xc6bca8), C(0xb7a586), C(0xcfcbc2), C(0xc1b299)];                       // le sol des terrasses à piscine
  const BASSINS = [C(0x2db8cc), C(0x41c4d2), C(0x25a8c8), C(0x3bbdbd)];
  const PARASOLS = [C(0xf4f4f0), C(0x1f6f8f), C(0xf2c230), C(0xef7d62), C(0x1e3a5c), C(0x3fb7a8)];
  const ASPHALTE = C(0x7a7c80), PELOUSE = C(0x7d9a60), PELOUSE2 = C(0x6b8a55), HAIE = C(0x4a6f47), SABLE = C(0xdccba6), SABLE_MOUILLE = C(0xa99878), BOIS = C(0xb08a62), QUAI = C(0xc3bcae), BETON = C(0xc2bdb3), PAVE = C(0xc5beaf);
  const TUILES = [C(0xb5704f), C(0xc48866), C(0xe6e2da), C(0x9a9a98), C(0xa8644a)];
  function styleTour(r, verre) { const t = r(); return verre ? (t < 0.4 ? "verre" : t < 0.68 ? "balcons" : t < 0.84 ? "sombre" : "bandes") : (t < 0.4 ? "balcons" : t < 0.6 ? "verre" : t < 0.77 ? "bandes" : t < 0.86 ? "sombre" : "perce"); }
  function teinteDe(r, style, pastel) { if (style === "verre") return pick(r, VITRES); if (style === "sombre") return pick(r, SOMBRES); return r() < (pastel == null ? 0.22 : pastel) ? pick(r, PASTELS) : pick(r, BLANCS); }

  /* Ce qui sera posé en exemplaires, une fois le plan tracé */
  const palmiers = [], arbres = [], garees = [], ombres = [];

  /* ───────────────────────── 4. Les briques : murs, toits, terrasses ───────────────────────── */

  /* Un volume droit sur un contour convexe : les murs dans le tampon du style (ou « plat » si style est nul), le toit, l'acrotère, l'ombre */
  function prisme(style, pts, y0, y1, o) {
    o = o || {}; const n = pts.length; let aire = 0, cx = 0, cz = 0;
    for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; aire += a[0] * b[1] - b[0] * a[1]; cx += a[0] / n; cz += a[1] / n; }
    const s = aire > 0 ? 1 : -1, teinte = lointain(o.teinte || BLANC, cx, cz), bas = fois(teinte, o.ao || 0.8), T = style ? F[style] : PLAT;
    const du = (o.du || 0) / 16, dv = (o.dv || 0) / 16, hv = (y1 - y0) / TV; let cumul = 0;
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
      const N = [s * (b[1] - a[1]) / L, 0, -s * (b[0] - a[0]) / L], u0 = du + (o.rond ? cumul / TU : k * 5 / 16), u1 = u0 + L / TU;   // chaque face commence sur une travée, décalée de la précédente
      quad(T, [a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]], N, style ? [u0, dv, u1, dv, u1, dv + hv, u0, dv + hv] : null, bas, teinte);
      cumul += L;
    }
    if (!o.sansToit) {
      const hp = o.parapet == null ? 1.1 : o.parapet;
      polyH(PLAT, pts, y1, lointain(o.toit || TOITS[0], cx, cz));
      if (hp > 0 && (o.niv == null || o.niv >= 1)) {                                          // l'acrotère : face dehors, dessus, face dedans
        const rive = lointain(o.rive || mel(o.teinte || BLANC, BLANC, 0.6), cx, cz), dedans = pts.map((p) => o.rond ? [cx + (p[0] - cx) * 0.97, cz + (p[1] - cz) * 0.97] : [p[0] + Math.sign(cx - p[0]) * 0.4, p[1] + Math.sign(cz - p[1]) * 0.4]);
        for (let k = 0; k < n; k++) {
          const a = pts[k], b = pts[(k + 1) % n], a2 = dedans[k], b2 = dedans[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
          const N = [s * (b[1] - a[1]) / L, 0, -s * (b[0] - a[0]) / L];
          quad(PLAT, [a[0], y1, a[1], b[0], y1, b[1], b[0], y1 + hp, b[1], a[0], y1 + hp, a[1]], N, null, rive);
          quad(PLAT, [a2[0], y1, a2[1], b2[0], y1, b2[1], b2[0], y1 + hp, b2[1], a2[0], y1 + hp, a2[1]], [-N[0], 0, -N[2]], null, fois(rive, 0.82));
          quad(PLAT, [a[0], y1 + hp, a[1], b[0], y1 + hp, b[1], b2[0], y1 + hp, b2[1], a2[0], y1 + hp, a2[1]], [0, 1, 0], null, rive);
        }
      }
    }
    if (!o.sansOmbre && Math.hypot(cx, cz) < 1500) ombres.push([pts, y0 - SOL, y1 - SOL + (o.sansToit ? 0 : 1)]);
  }
  /* Une lueur au sol (réverbère, piscine éclairée) : un hexagone clair au centre, noir au bord, additionné à l'image */
  function eventail(T, x, y, z, rx, rz, col) {
    const b = T.nb; T.p.push(x, y, z); T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(col[0], col[1], col[2]);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; T.p.push(x + rx * Math.cos(a), y, z + rz * Math.sin(a)); T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(0, 0, 0); }
    for (let i = 0; i < 6; i++) T.i.push(b, b + 1 + i, b + 1 + (i + 1) % 6);
    T.nb += 7;
  }
  function lueur(x, y, z, rayon, col) { const d = Math.hypot(x, z); eventail(LUM, x, y, z, rayon, rayon, fois(col, d < 900 ? 1 : Math.max(0.3, 1 - (d - 900) / 2400))); }
  /* Un point lumineux vu de côté (balise rouge au sommet des tours) : deux losanges debout, en croix */
  function balise(x, y, z, rayon, col) {
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      const b = LUM.nb; LUM.p.push(x, y, z); LUM.n.push(0, 1, 0); LUM.u.push(0, 0); LUM.c.push(col[0], col[1], col[2]);
      for (const [h, v] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { LUM.p.push(x + ax * h * rayon, y + v * rayon, z + az * h * rayon); LUM.n.push(0, 1, 0); LUM.u.push(0, 0); LUM.c.push(0, 0, 0); }
      for (let i = 0; i < 4; i++) LUM.i.push(b, b + 1 + i, b + 1 + (i + 1) % 4);
      LUM.nb += 5;
    }
  }
  /* Un bassin : la margelle blanche, l'eau turquoise (dans le tampon de l'eau : elle miroite), sa lueur la nuit */
  function bassin(x0, z0, x1, z1, y, r) {
    plaque(PLAT, x0 - 0.7, z0 - 0.7, x1 + 0.7, z1 + 0.7, y + 0.3, lointain(BLANCS[1], x0, z0)); plaque(EAU, x0, z0, x1, z1, y + 0.52, lointain(pick(r, BASSINS), x0, z0));
    lueur((x0 + x1) / 2, y + 0.9, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) * 0.62, C(0x2fd2e2, 0.42));
  }
  function parasol(x, y, z, col, t) {
    t = t || 1.3; const s = [x, y + 2.75, z], h = y + 2.25;
    tri(PLAT, [x - t, h, z - t, x + t, h, z - t].concat(s), [0, 1, 0], col); tri(PLAT, [x + t, h, z - t, x + t, h, z + t].concat(s), [0, 1, 0], fois(col, 0.92));
    tri(PLAT, [x + t, h, z + t, x - t, h, z + t].concat(s), [0, 1, 0], col); tri(PLAT, [x - t, h, z + t, x - t, h, z - t].concat(s), [0, 1, 0], fois(col, 0.92));
  }
  /* Des rangées de voitures garées (le sol gris est posé par l'appelant) */
  function stationnement(r, x0, z0, x1, z1, y, taux, niv) {
    taux *= niv >= 2 ? 1 : niv === 1 ? 0.4 : 0; if (taux <= 0) return;                       // au loin, les parkings restent vides : on ne verrait pas les voitures
    const enX = (x1 - x0) >= (z1 - z0), a0 = enX ? x0 : z0, a1 = enX ? x1 : z1, b1 = enX ? z1 : x1; let b = (enX ? z0 : x0) + 2.6, rang = 0;
    while (b + 2.6 <= b1) {
      for (let a = a0 + 1.4; a + 1.3 <= a1; a += 2.75) if (r() < taux) { const sens = r() < 0.5 ? 1 : -1; garees.push(enX ? { x: a, y, z: b, hx: 0, hz: sens } : { x: b, y, z: a, hx: sens, hz: 0 }); }
      b += (rang++ % 2 === 0) ? 11.8 : 5.3;
    }
  }
  /* Le dessus d'un toit : l'édicule technique, les groupes froids, parfois des panneaux solaires */
  function equipToit(r, x0, z0, x1, z1, y, niv, plafond) {
    const W = x1 - x0, D = z1 - z0; if (niv < 1 || W < 9 || D < 9) return;
    const ew = W * (0.28 + r() * 0.24), ed = D * (0.28 + r() * 0.24), ex = x0 + 2.5 + r() * (W - ew - 5), ez = z0 + 2.5 + r() * (D - ed - 5), eh = Math.min(3 + r() * 2.6, (plafond == null ? 1e9 : plafond) - y);
    if (eh > 1.6) { caisse(PLAT, ex, y, ez, ex + ew, y + eh, ez + ed, lointain(C(0xd9d6cf), ex, ez), lointain(pick(r, TOITS), ex, ez)); if (niv >= 2 && r() < 0.5 && eh > 2.6) caisse(PLAT, ex + ew * 0.2, y + eh, ez + ed * 0.25, ex + ew * 0.6, y + eh + 1.2, ez + ed * 0.7, C(0x9fa1a2)); }
    if (niv < 2) return;
    const n = 3 + (r() * 6 | 0), enX = W >= D, cote = (enX ? ez - z0 : ex - x0) > 4.5 ? 1.2 : (enX ? D : W) - 2.8;                 // les groupes froids, en rang du côté libre
    for (let k = 0; k < n; k++) { const t = 2 + k * 3.1; if (t + 2.4 > (enX ? W : D) - 1.5) break;
      if (enX) caisse(PLAT, x0 + t, y, z0 + cote, x0 + t + 2.2, y + 1.25, z0 + cote + 1.4, C(0x9c9ea0), C(0x74777a)); else caisse(PLAT, x0 + cote, y, z0 + t, x0 + cote + 1.4, y + 1.25, z0 + t + 2.2, C(0x9c9ea0), C(0x74777a)); }
    if (r() < 0.3 && eh > 0) {                                                                // des panneaux solaires
      const px = ex + ew + 1.5 < x1 - 8 ? ex + ew + 1.5 : x0 + 2, pz = ez; for (let k = 0; k < 4; k++) { const z = pz + k * 2.4; if (z + 1.8 > z1 - 1.5 || px + 6 > x1 - 1) break; plaque(PLAT, px, z, px + 6, z + 1.7, y + 0.5, C(0x27384f)); }
    }
  }
  /* Une terrasse à piscine : bassin, transats, parasols, cabanons, palmiers */
  function terrasse(r, a, y, niv) {
    const x0 = a[0], z0 = a[1], x1 = a[2], z1 = a[3], W = x1 - x0, D = z1 - z0; if (W < 9 || D < 9) return;
    const enX = W >= D, L = Math.min(25, (enX ? W : D) - 7) * (0.72 + r() * 0.28), l = borne((enX ? D : W) * 0.3, 4.5, 9);
    const pw = enX ? L : l, pd = enX ? l : L, px = x0 + 3.5 + r() * Math.max(0, W - pw - 7), pz = z0 + 3.5 + r() * Math.max(0, D - pd - 7);
    bassin(px, pz, px + pw, pz + pd, y, r);
    if (niv < 1) return;
    for (let k = 0, n = 4 + (r() * 3 | 0); k < n; k++) { const x = x0 + 1.5 + r() * (W - 3), z = z0 + 1.5 + r() * (D - 3); if (x > px - 2 && x < px + pw + 2 && z > pz - 2 && z < pz + pd + 2) continue; palmiers.push({ x, y, z, s: 0.5 + r() * 0.22 }); }
    if (niv < 2) return;
    const ton = pick(r, PARASOLS), lit = C(0xf6f4ee);
    for (let t = 0.6; t < L - 1.4; t += 1.45) for (const cote of [-1, 1]) {                    // les transats, le long du bassin
      const e = cote < 0 ? -3.2 : l + 1.3;
      if (enX) plaque(PLAT, px + t, pz + e, px + t + 0.7, pz + e + 1.9, y + 0.42, lit); else plaque(PLAT, px + e, pz + t, px + e + 1.9, pz + t + 0.7, y + 0.42, lit);
      if (cote > 0 && (t / 1.45 | 0) % 3 === 1) { if (enX) parasol(px + t + 0.35, y, pz + e + 2.6, ton); else parasol(px + e + 2.6, y, pz + t + 0.35, ton); }
    }
    for (let k = 0; k < 3; k++) { const t = 1 + k * 4.2; if (enX ? (px - 4.5 < x0 + 1 || t + 3.2 > D - 1) : (pz - 4.5 < z0 + 1 || t + 3.2 > W - 1)) break;       // les cabanons, au bout
      if (enX) caisse(PLAT, x0 + 1, y, z0 + t, x0 + 4.2, y + 2.7, z0 + t + 3.2, BLANCS[1], BLANCS[2]); else caisse(PLAT, x0 + t, y, z0 + 1, x0 + t + 3.2, y + 2.7, z0 + 4.2, BLANCS[1], BLANCS[2]); }
    if (enX) caisse(PLAT, x0 + 0.6, y, z1 - 1.8, x1 - 0.6, y + 1.1, z1 - 0.6, HAIE, fois(HAIE, 1.15)); else caisse(PLAT, x1 - 1.8, y, z0 + 0.6, x1 - 0.6, y + 1.1, z1 - 0.6, HAIE, fois(HAIE, 1.15));   // une haie
  }

  /* ───────────────────────── 5. Les îlots : quelques recettes ───────────────────────── */

  /* Le fût d'une tour, avec parfois un retrait en partie haute, et sa couronne technique */
  function corpsDeTour(r, style, teinte, x0, z0, x1, z1, y0, y1, niv, plafond) {
    const du = r() * 16 | 0, dv = r() * 16 | 0, toit = pick(r, TOITS), n = Math.round((y1 - y0) / NIV);
    let a = [x0, z0, x1, z1];
    if (n > 24 && r() < 0.65) {
      const nBas = Math.round(n * (0.6 + r() * 0.22)), ym = y0 + nBas * NIV, e = BAIE * (1 + (r() * 2 | 0)), c = r() * 4 | 0;
      prisme(style, rect(x0, z0, x1, z1), y0, ym, { teinte, toit: PONTONS[2], du, dv, niv });
      a = [x0 + ((c & 1) ? e : 0), z0 + ((c & 2) ? e : 0), x1 - ((c & 1) ? 0 : e), z1 - ((c & 2) ? 0 : e)];
      prisme(style, rect(a[0], a[1], a[2], a[3]), ym, y1, { teinte, toit, du, dv: dv + nBas, niv });
    } else prisme(style, rect(x0, z0, x1, z1), y0, y1, { teinte, toit, du, dv, niv });
    equipToit(r, a[0], a[1], a[2], a[3], y1, niv, plafond);
    if (y1 - SOL > 105) { balise((a[0] + a[2]) / 2, y1 + 7, (a[1] + a[3]) / 2, 2.2, [1, 0.12, 0.08]); if (niv >= 1 && r() < 0.5) caisse(PLAT, (a[0] + a[2]) / 2 - 0.3, y1, (a[1] + a[3]) / 2 - 0.3, (a[0] + a[2]) / 2 + 0.3, y1 + 7 + r() * 9, (a[1] + a[3]) / 2 + 0.3, C(0xcfd3d6)); }
  }
  /* La recette type de Miami : un socle (parking, commerces) et une tour en retrait ; sur le socle, la piscine */
  function tourSurSocle(r, X0, Z0, X1, Z1, H, niv, o) {
    o = o || {};
    const m = 2 + r() * 2.5, x0 = X0 + m, z0 = Z0 + m, x1 = X1 - m, z1 = Z1 - m, W = x1 - x0, D = z1 - z0;
    const nS = borne(3 + (r() * 5 | 0), 2, Math.max(2, H * 0.42 / NIV | 0)), yS = SOL + nS * NIV;
    const style = o.style || styleTour(r, o.fond), teinte = teinteDe(r, style, o.pastel), piscine = o.piscine != null ? o.piscine : r() < 0.72;
    prisme(r() < 0.65 ? "bandes" : "perce", rect(x0, z0, x1, z1), SOL, yS, { teinte: mel(pick(r, BLANCS), teinte, 0.25), toit: piscine ? pick(r, PONTONS) : fois(ASPHALTE, 1.1), du: r() * 16 | 0, dv: r() * 16 | 0, niv, ao: 0.72 });
    let tw = o.tw || BAIE * (8 + (r() * 3 | 0)), td = o.td || BAIE * (11 + (r() * 5 | 0));
    if (o.elancee || o.ronde) tw = td = o.ronde ? 30.8 : BAIE * (8 + (r() * 2 | 0)); else if (!o.tw && r() < 0.5) { const t = tw; tw = td; td = t; }
    if (o.jumelles) { tw = Math.min(tw, 27); td = Math.min(td, 27); }
    tw = Math.min(tw, BAIE * Math.floor((W - 2) / BAIE)); td = Math.min(td, BAIE * Math.floor((D - 2) / BAIE));
    const coin = o.coin != null ? o.coin : r() * 4 | 0;
    let tx = (coin & 1) ? x1 - tw - 1 : x0 + 1, tz = (coin & 2) ? z1 - td - 1 : z0 + 1;
    if (o.xMax != null) tx = Math.min(tx, o.xMax - tw); if (o.zMax != null) tz = Math.min(tz, o.zMax - td);
    const nT = Math.max(nS + 4, Math.round(H / NIV)), yT = SOL + nT * NIV;
    if (o.ronde) {                                                                            // une tour ronde (16 pans de 6 m)
      const pts = []; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; pts.push([tx + 15.4 + 15.38 * Math.cos(a), tz + 15.4 + 15.38 * Math.sin(a)]); }
      prisme(style, pts, yS, yT, { teinte, toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv, rond: true }); equipToit(r, tx + 6, tz + 6, tx + 25, tz + 25, yT, niv, o.plafond);
      if (yT - SOL > 105) balise(tx + 15.4, yT + 6, tz + 15.4, 2.2, [1, 0.12, 0.08]);
    } else corpsDeTour(r, style, teinte, tx, tz, tx + tw, tz + td, yS, yT, niv, o.plafond);
    if (o.jumelles) {                                                                         // la sœur, au coin opposé, un peu moins haute
      let ux = (coin & 1) ? x0 + 1 : x1 - tw - 1, uz = (coin & 2) ? z0 + 1 : z1 - td - 1;
      if (o.xMax != null) ux = Math.min(ux, o.xMax - tw); if (o.zMax != null) uz = Math.min(uz, o.zMax - td);
      corpsDeTour(r, style, teinte, ux, uz, ux + tw, uz + td, yS, SOL + Math.round(nT * (0.78 + r() * 0.14)) * NIV, niv, o.plafond);
    }
    // ce qui reste du socle : la bande à côté de la tour, et la bande devant
    const ax0 = (coin & 1) ? x0 + 2 : tx + tw + 2.5, ax1 = (coin & 1) ? tx - 2.5 : x1 - 2, bz0 = (coin & 2) ? z0 + 2 : tz + td + 2.5, bz1 = (coin & 2) ? tz - 2.5 : z1 - 2;
    let A = [ax0, z0 + 2, ax1, z1 - 2], B = [tx, bz0, tx + tw, bz1];
    if (o.jumelles) { A = [ax0, (coin & 2) ? z0 + 2 + td + 2 : z0 + 2, ax1, (coin & 2) ? z1 - 2 : z1 - 4 - td]; }
    const grande = (A[2] - A[0]) * (A[3] - A[1]) >= (B[2] - B[0]) * (B[3] - B[1]) ? A : B, petite = grande === A ? B : A;
    if (piscine) terrasse(r, grande, yS, niv); else stationnement(r, grande[0], grande[1], grande[2], grande[3], yS + 0.03, 0.6, niv);
    if (niv >= 2 && petite[2] - petite[0] > 6 && petite[3] - petite[1] > 6) { for (let k = 0; k < 4; k++) { const t = petite[0] + 1 + k * 3.2; if (t + 2.4 > petite[2]) break; caisse(PLAT, t, yS, petite[1] + 1, t + 2.2, yS + 1.25, petite[1] + 2.4, C(0x9c9ea0), C(0x74777a)); } }
  }
  /* Une barre de logements, son parking au sol et sa piscine */
  function barre(r, X0, Z0, X1, Z1, H, niv, plafond) {
    const enX = r() < 0.5, ep = BAIE * 6, n = Math.max(3, Math.round(H / NIV)), y1 = SOL + n * NIV, style = r() < 0.6 ? "balcons" : r() < 0.6 ? "bandes" : "perce", teinte = teinteDe(r, style), bout = r() < 0.5;
    const L = BAIE * Math.floor(((enX ? X1 - X0 : Z1 - Z0) - 6) / BAIE);
    const a = enX ? [X0 + 3, bout ? Z0 + 3 : Z1 - 3 - ep, X0 + 3 + L, bout ? Z0 + 3 + ep : Z1 - 3] : [bout ? X0 + 3 : X1 - 3 - ep, Z0 + 3, bout ? X0 + 3 + ep : X1 - 3, Z0 + 3 + L];
    prisme(style, rect(a[0], a[1], a[2], a[3]), SOL, y1, { teinte, toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv }); equipToit(r, a[0], a[1], a[2], a[3], y1, niv, plafond);
    const lib = enX ? [X0 + 3, bout ? a[3] + 4 : Z0 + 3, X1 - 3, bout ? Z1 - 3 : a[1] - 4] : [bout ? a[2] + 4 : X0 + 3, Z0 + 3, bout ? X1 - 3 : a[0] - 4, Z1 - 3];
    const mi = enX ? (lib[0] + lib[2]) / 2 : (lib[1] + lib[3]) / 2, jardin = enX ? [lib[0], lib[1], mi - 2, lib[3]] : [lib[0], lib[1], lib[2], mi - 2], park = enX ? [mi + 2, lib[1], lib[2], lib[3]] : [lib[0], mi + 2, lib[2], lib[3]];
    plaque(DALLE, jardin[0], jardin[1], jardin[2], jardin[3], SOL + 0.05, lointain(pick(r, PONTONS), jardin[0], jardin[1])); terrasse(r, jardin, SOL + 0.05, niv);
    plaque(DALLE, park[0], park[1], park[2], park[3], SOL + 0.05, lointain(ASPHALTE, park[0], park[1])); stationnement(r, park[0] + 1, park[1] + 1, park[2] - 1, park[3] - 1, SOL + 0.07, 0.55, niv);
  }
  /* Deux ailes en équerre autour d'une cour à piscine */
  function enEquerre(r, X0, Z0, X1, Z1, H, niv, plafond) {
    const ep = BAIE * 6, n = Math.max(4, Math.round(H / NIV)), style = r() < 0.5 ? "balcons" : r() < 0.5 ? "perce" : "bandes", teinte = teinteDe(r, style, 0.3), du = r() * 16 | 0, dv = r() * 16 | 0, toit = pick(r, TOITS);
    const x0 = X0 + 3, z0 = Z0 + 3, x1 = x0 + BAIE * Math.floor((X1 - X0 - 6) / BAIE), z1 = z0 + BAIE * Math.floor((Z1 - Z0 - 6) / BAIE), mx = r() < 0.5, mz = r() < 0.5, n2 = Math.max(3, n - (r() * 4 | 0));
    const A = [x0, mz ? z1 - ep : z0, x1, mz ? z1 : z0 + ep], B = [mx ? x1 - ep : x0, mz ? z0 : z0 + ep, mx ? x1 : x0 + ep, mz ? z1 - ep : z1];
    prisme(style, rect(A[0], A[1], A[2], A[3]), SOL, SOL + n * NIV, { teinte, toit, du, dv, niv }); equipToit(r, A[0], A[1], A[2], A[3], SOL + n * NIV, niv, plafond);
    prisme(style, rect(B[0], B[1], B[2], B[3]), SOL, SOL + n2 * NIV, { teinte, toit, du: du + 7, dv, niv }); equipToit(r, B[0], B[1], B[2], B[3], SOL + n2 * NIV, niv, plafond);
    const cour = [mx ? x0 : x0 + ep + 3, mz ? z0 : z0 + ep + 3, mx ? x1 - ep - 3 : x1, mz ? z1 - ep - 3 : z1];
    plaque(DALLE, cour[0], cour[1], cour[2], cour[3], SOL + 0.05, lointain(pick(r, PONTONS), cour[0], cour[1])); terrasse(r, cour, SOL + 0.05, niv);
  }
  /* Un îlot bas : petits immeubles, un parking, parfois un jardin */
  function petits(r, X0, Z0, X1, Z1, hMax, niv, pastel) {
    const mx = X0 + (X1 - X0) * (0.42 + r() * 0.16), mz = Z0 + (Z1 - Z0) * (0.42 + r() * 0.16), Q = [[X0, Z0, mx, mz], [mx, Z0, X1, mz], [X0, mz, mx, Z1], [mx, mz, X1, Z1]], park = r() * 4 | 0;
    Q.forEach((q, k) => {
      if (k === park) { plaque(DALLE, q[0] + 1, q[1] + 1, q[2] - 1, q[3] - 1, SOL + 0.05, lointain(ASPHALTE, q[0], q[1])); stationnement(r, q[0] + 2, q[1] + 2, q[2] - 2, q[3] - 2, SOL + 0.07, 0.55, niv); return; }
      if (r() < 0.14) { plaque(DALLE, q[0] + 1.5, q[1] + 1.5, q[2] - 1.5, q[3] - 1.5, SOL + 0.05, lointain(PELOUSE, q[0], q[1])); for (let i = 0; i < 6; i++) arbres.push({ x: q[0] + 4 + r() * (q[2] - q[0] - 8), y: SOL, z: q[1] + 4 + r() * (q[3] - q[1] - 8), s: 3 + r() * 2.5, t: r() }); return; }
      const m = 1.5 + r() * 2.5, n = 2 + (r() * Math.max(1, Math.min(6, hMax / NIV - 1)) | 0), t = r(), style = t < 0.55 ? "perce" : t < 0.8 ? "bandes" : t < 0.92 ? "balcons" : "verre";
      const w = BAIE * Math.floor((q[2] - q[0] - 2 * m) / BAIE), d = BAIE * Math.floor((q[3] - q[1] - 2 * m) / BAIE), x = q[0] + m, z = q[1] + m;
      prisme(style, rect(x, z, x + w, z + d), SOL, SOL + n * NIV, { teinte: teinteDe(r, style, pastel == null ? 0.35 : pastel), toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv });
      equipToit(r, x, z, x + w, z + d, SOL + n * NIV, niv);
    });
  }
  /* Un parc : pelouse, allées, un bassin, des arbres */
  function parc(r, X0, Z0, X1, Z1, niv) {
    const y = SOL + 0.05, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    plaque(DALLE, X0 + 1, Z0 + 1, X1 - 1, Z1 - 1, y, lointain(PELOUSE, cx, cz));
    if (niv >= 2) {
      const allee = C(0xd9cfb8);
      quad(DALLE, [X0 + 2, y + 0.1, Z0 + 2, X0 + 5.5, y + 0.1, Z0 + 2, X1 - 2, y + 0.1, Z1 - 2, X1 - 5.5, y + 0.1, Z1 - 2], [0, 1, 0], null, allee);
      quad(DALLE, [X1 - 2, y + 0.1, Z0 + 2, X1 - 5.5, y + 0.1, Z0 + 2, X0 + 2, y + 0.1, Z1 - 2, X0 + 5.5, y + 0.1, Z1 - 2], [0, 1, 0], null, allee);
      const O = (R0) => { const p = []; for (let k = 0; k < 10; k++) p.push([cx + R0 * Math.cos(k * 0.6283), cz + R0 * Math.sin(k * 0.6283)]); return p; };
      polyH(DALLE, O(9), y + 0.2, C(0xe2dccd)); polyH(EAU, O(6), y + 0.45, BASSINS[1]); lueur(cx, y + 0.8, cz, 7, C(0x2fd2e2, 0.4));
      for (let k = 0; k < 14; k++) plaque(DALLE, X0 + 4 + r() * (X1 - X0 - 14), Z0 + 4 + r() * (Z1 - Z0 - 14), X0 + 10 + r() * (X1 - X0 - 14), Z0 + 9 + r() * (Z1 - Z0 - 14), y + 0.04, lointain(r() < 0.5 ? PELOUSE2 : fois(PELOUSE, 1.08), cx, cz));
    }
    for (let k = 0, n = niv >= 1 ? 30 : 10; k < n; k++) { const x = X0 + 4 + r() * (X1 - X0 - 8), z = Z0 + 4 + r() * (Z1 - Z0 - 8); if (Math.hypot(x - cx, z - cz) < 11) continue; if (r() < 0.28) palmiers.push({ x, y: SOL, z, s: 0.8 + r() * 0.4 }); else arbres.push({ x, y: SOL, z, s: 3.2 + r() * 3, t: r() }); }
  }
  /* Un pâté de maisons : toits à quatre pans, jardins, quelques piscines */
  function maisons(r, X0, Z0, X1, Z1, niv) {
    plaque(DALLE, X0 + 0.5, Z0 + 0.5, X1 - 0.5, Z1 - 0.5, SOL + 0.05, lointain(mel(PELOUSE, PELOUSE2, r()), X0, Z0));
    const nx = 3, nz = 4, px = (X1 - X0) / nx, pz = (Z1 - Z0) / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      if (r() < 0.08) continue;
      const w = 9 + r() * 4, d = 8 + r() * 3, x = X0 + a * px + 2 + r() * (px - w - 4), z = Z0 + b * pz + 1.5 + r() * (pz - d - 3), y1 = SOL + 3.4 + (r() < 0.25 ? 3 : 0), mur = lointain(r() < 0.5 ? pick(r, BLANCS) : pick(r, PASTELS), x, z), toit = lointain(pick(r, TUILES), x, z), f = [x + w / 2, y1 + 2.2, z + d / 2];
      prisme(null, rect(x, z, x + w, z + d), SOL, y1, { teinte: mur, sansToit: true, sansOmbre: niv < 1 });
      tri(PLAT, [x - 0.5, y1, z - 0.5, x + w + 0.5, y1, z - 0.5].concat(f), [0, 0.8, -0.6], toit); tri(PLAT, [x + w + 0.5, y1, z - 0.5, x + w + 0.5, y1, z + d + 0.5].concat(f), [0.6, 0.8, 0], toit);
      tri(PLAT, [x + w + 0.5, y1, z + d + 0.5, x - 0.5, y1, z + d + 0.5].concat(f), [0, 0.8, 0.6], toit); tri(PLAT, [x - 0.5, y1, z + d + 0.5, x - 0.5, y1, z - 0.5].concat(f), [-0.6, 0.8, 0], toit);
      if (niv >= 1 && r() < 0.3 && x + w + 7 < X0 + (a + 1) * px) plaque(EAU, x + w + 1.5, z + 1, x + w + 5.5, z + 7, SOL + 0.3, lointain(BASSINS[0], x, z));
      if (r() < (niv >= 1 ? 0.5 : 0.12)) arbres.push({ x: x - 1 + r() * (w + 2), y: SOL, z: z + d + 1.5 + r() * 2, s: 2.6 + r() * 2.6, t: r() });
      if (niv >= 1 && r() < 0.25) garees.push({ x: x + 1.5, y: SOL + 0.07, z: z - 3, hx: 0, hz: r() < 0.5 ? 1 : -1 });
    }
  }

  /* ───────────────────────── 6. Le plan : la terre, l'eau, les îlots ───────────────────────── */
  const demiVoie = (k) => (k & 1) ? 12 : 9;                                                   // demi-emprise de la voie n° k (axe à 45 + 90 k) : avenue si k est impair
  const demiChaussee = (k) => (k & 1) ? 8 : 5.8;
  const uvSol = (x, z, dx) => [(x + 90 + (dx || 0)) / 180, (z + 90) / 180];

  /* La terre ferme, d'un seul tenant, avec le carreau de rues répété */
  function solQuad(x0, z0, x1, z1, y, dx) { const a = uvSol(x0, z0, dx), b = uvSol(x1, z1, dx); quad(SOLT, [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], [0, 1, 0], [a[0], a[1], b[0], a[1], b[0], b[1], a[0], b[1]], BLANC); }
  solQuad(RIVE, -2900, 2900, 2900, SOL);
  solQuad(ILE_O, -1700, ILE_E, 1700, SOL, 599);                                               // Miami Beach : le même carreau, calé pour que l'avenue tombe sur Collins
  // le quai de la baie : une promenade claire devant le boulevard, le mur de quai
  { let z = -1700; for (const zp of PONTS_Z.concat([1712])) { plaque(DALLE, RIVE, z, -238.6, zp - 12, SOL + 0.05, PAVE); z = zp + 12; } }   // interrompue au droit des ponts
  quad(PLAT, [RIVE, EAU_Y - 1, -1700, RIVE, EAU_Y - 1, 1700, RIVE, SOL + 0.06, 1700, RIVE, SOL + 0.06, -1700], [-1, 0, 0], null, fois(QUAI, 0.7), QUAI);
  quad(PLAT, [ILE_E, EAU_Y - 1, -1700, ILE_E, EAU_Y - 1, 1700, ILE_E, SOL, 1700, ILE_E, SOL, -1700], [1, 0, 0], null, fois(QUAI, 0.7), QUAI);
  for (let z = -700; z <= 700; z += 13) if (Math.abs(((z - 45) % 90 + 90) % 90 - 0) > 14 && Math.abs(((z - 45) % 90 + 90) % 90 - 90) > 14) palmiers.push({ x: -245.5, y: SOL, z: z + R() * 3, s: 0.85 + R() * 0.4 });

  /* La presqu'île du parc, devant le centre, et ses deux marinas */
  const amarres = [];                                                                         // les bateaux à quai : { x, z, hx, hz, s, voilier }
  (function () {
    const r = alea(77), x0 = -304, z0 = -100, z1 = 108, y = SOL + 0.05;
    plaque(DALLE, x0, z0, RIVE, z1, y, PELOUSE);
    plaque(DALLE, x0, z0, x0 + 4.5, z1, y + 0.1, PAVE); plaque(DALLE, x0, z0, RIVE, z0 + 4, y + 0.1, PAVE); plaque(DALLE, x0, z1 - 4, RIVE, z1, y + 0.1, PAVE);     // la promenade du bord de l'eau
    quad(DALLE, [RIVE, y + 0.1, -20, RIVE, y + 0.1, -16, x0 + 4, y + 0.1, 40, x0 + 4, y + 0.1, 36], [0, 1, 0], null, C(0xd9cfb8)); quad(DALLE, [RIVE, y + 0.1, 60, RIVE, y + 0.1, 64, x0 + 4, y + 0.1, -40, x0 + 4, y + 0.1, -44], [0, 1, 0], null, C(0xd9cfb8));
    quad(PLAT, [x0, EAU_Y - 1, z0, x0, EAU_Y - 1, z1, x0, y, z1, x0, y, z0], [-1, 0, 0], null, fois(QUAI, 0.7), QUAI);
    quad(PLAT, [x0, EAU_Y - 1, z0, RIVE, EAU_Y - 1, z0, RIVE, y, z0, x0, y, z0], [0, 0, -1], null, fois(QUAI, 0.7), QUAI);
    quad(PLAT, [x0, EAU_Y - 1, z1, RIVE, EAU_Y - 1, z1, RIVE, y, z1, x0, y, z1], [0, 0, 1], null, fois(QUAI, 0.7), QUAI);
    for (let k = 0; k < 46; k++) { const x = x0 + 6 + r() * 40, z = z0 + 6 + r() * (z1 - z0 - 12); if (r() < 0.45) palmiers.push({ x, y: SOL, z, s: 0.85 + r() * 0.45 }); else arbres.push({ x, y: SOL, z, s: 3 + r() * 3, t: r() }); }
    for (let z = z0 + 6; z < z1 - 4; z += 11) palmiers.push({ x: x0 + 2.2, y: SOL, z, s: 0.9 + r() * 0.3 });
    // la marina du sud : trois pontons, des yachts cul à quai, une digue
    for (const z of [-124, -152, -180]) {
      caisse(PLAT, -332, EAU_Y - 0.6, z - 1.3, RIVE, EAU_Y + 0.75, z + 1.3, QUAI, BOIS);
      for (let x = -262; x > -326; x -= 6.4 + r() * 1.2) for (const c of [-1, 1]) if (r() < 0.72) amarres.push({ x, z: z + c * (7.2 + r()), hx: 0, hz: -c, s: 0.3 + r() * 0.1 });
    }
    caisse(PLAT, -342, EAU_Y - 1, -196, -337, EAU_Y + 1, -112, C(0xa9a59b), C(0xbdb8ad));
    amarres.push({ x: -272, z: -106.5, hx: 1, hz: 0, s: 0.95 }, { x: -296, z: 113.5, hx: -1, hz: 0, s: 0.8 }, { x: -309.5, z: 20, hx: 0, hz: 1, s: 1 });
    // la marina du nord, au-delà du pont
    for (let z = 176; z <= 330; z += 31) {
      caisse(PLAT, -306, EAU_Y - 0.6, z - 1.2, RIVE, EAU_Y + 0.75, z + 1.2, QUAI, BOIS);
      for (let x = -260; x > -302; x -= 6.6 + r() * 1.4) for (const c of [-1, 1]) if (r() < 0.72) amarres.push({ x, z: z + c * (7.4 + r()), hx: 0, hz: -c, s: 0.28 + r() * 0.12, voilier: r() < 0.3 });
    }
  })();

  /* L'eau : turquoise près des rives et de la plage, bleu profond au large ; un chenal plus sombre au milieu de la baie */
  function tonEau(x, z) {
    const ondule = 0.5 + 0.5 * Math.sin(x * 0.013 + z * 0.021) * Math.sin(x * 0.007 - z * 0.011 + 1.3);
    if (x > ILE_E - 4) {
      const rive = (z > -104 && z < 112) ? -304 : RIVE, t = borne(Math.min(rive - x, x - ILE_E) / 115, 0, 1);
      let c = t < 0.5 ? mel(C(0x3fb9ad), C(0x1f93a3), t * 2) : mel(C(0x1f93a3), C(0x167693), t * 2 - 1);
      const chenal = Math.max(0, 1 - Math.abs(x + 425) / 55); c = mel(c, C(0x115a84), chenal * 0.7);
      return mel(c, C(0x58c4b4), ondule * 0.16 * (1 - chenal));
    }
    const d = -776 - x; let c;
    if (d < 40) c = mel(C(0x62d2c4), C(0x34b9c0), borne(d / 40, 0, 1)); else if (d < 130) c = mel(C(0x34b9c0), C(0x1b8fb8), (d - 40) / 90); else if (d < 330) c = mel(C(0x1b8fb8), C(0x126aa3), (d - 130) / 200); else c = mel(C(0x126aa3), C(0x0d4a80), borne((d - 330) / 500, 0, 1));
    const banc = Math.max(0, 1 - Math.abs(d - 165 - 30 * Math.sin(z * 0.004)) / 34); c = mel(c, C(0x3bb7bd), banc * 0.4);     // le banc de sable, plus clair
    return mel(c, C(0x4fc0ba), ondule * 0.1 * borne(1 - d / 500, 0, 1));
  }
  (function () {
    const xs = [-4200, -3000, -2300, -1800, -1500, -1300, -1160, -1060, -990, -940, -905, -875, -850, -826, -806, -790, -776, -760, ILE_E - 4, -584, -566, -540, -510, -480, -452, -425, -398, -370, -345, -326, -310, -296, -280, -266, RIVE - 2, -200], zs = [];
    for (let z = -3400; z <= 3400; z += Math.abs(z) < 1280 || (z < 0 && z >= -1280) ? 64 : 265) zs.push(z);
    const b = EAU.nb, nx = xs.length, nz = zs.length;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const c = lointain(tonEau(xs[i], zs[j]), xs[i], zs[j]); EAU.p.push(xs[i], EAU_Y, zs[j]); EAU.n.push(0, 1, 0); EAU.u.push(xs[i] / 46, zs[j] / 46); EAU.c.push(c[0], c[1], c[2]); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = b + j * nx + i; EAU.i.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    EAU.nb += nx * nz;
  })();

  /* La plage : la promenade en bois, la dune, le sable qui descend dans l'eau, les rouleaux */
  (function () {
    const r = alea(91), z0 = -1700, z1 = 1700;
    caisse(PLAT, -721, SOL - 0.2, z0, ILE_O, SOL + 0.35, z1, BOIS, BOIS);                    // la promenade
    plaque(PLAT, -728, z0, -721, z1, SOL + 0.02, C(0xb6b184));                                // la dune et ses herbes
    quad(PLAT, [-728, SOL, z0, -728, SOL, z1, -762, SOL - 0.15, z1, -762, SOL - 0.15, z0], [0, 1, 0], null, SABLE, SABLE);
    quad(PLAT, [-762, SOL - 0.15, z0, -762, SOL - 0.15, z1, -771, SOL - 0.85, z1, -771, SOL - 0.85, z0], [0, 1, 0], null, SABLE, mel(SABLE, SABLE_MOUILLE, 0.7));
    quad(PLAT, [-771, SOL - 0.85, z0, -771, SOL - 0.85, z1, -800, SOL - 3.2, z1, -800, SOL - 3.2, z0], [0, 1, 0], null, mel(SABLE, SABLE_MOUILLE, 0.7), SABLE_MOUILLE);
    for (let z = z0; z < z1; z += 85) {                                                       // les rouleaux, de moins en moins vifs au loin
      const k0 = borne(1 - (Math.abs(z) - 500) / 1300, 0.15, 1), X = [-774, -790, -812, -850], V = [0.85, 0.7, 0.4, 0];
      for (let i = 0; i < 3; i++) quad(ECUME, [X[i], EAU_Y + 0.12, z, X[i], EAU_Y + 0.12, z + 85, X[i + 1], EAU_Y + 0.12, z + 85, X[i + 1], EAU_Y + 0.12, z], [0, 1, 0],
        [z / 44, (X[i] + 774) / -76, (z + 85) / 44, (X[i] + 774) / -76, (z + 85) / 44, (X[i + 1] + 774) / -76, z / 44, (X[i + 1] + 774) / -76], fois(BLANC, V[i] * k0), fois(BLANC, V[i + 1] * k0));
    }
    for (let z = -1010; z < 1010; z += 90) {                                                  // un « club de plage » par îlot : parasols en rangs, transats
      const ton = pick(r, PARASOLS), rangs = 2 + (r() * 2 | 0), n = 7 + (r() * 7 | 0), zc = z + 18 + r() * 20, fin = Math.abs(z) < 420;
      for (let a = 0; a < rangs; a++) for (let b = 0; b < n; b++) { const x = -737 - a * 5.2, zz = zc + b * 3.7; parasol(x, SOL - 0.1, zz, ton, 1.25); if (fin) { plaque(PLAT, x - 1.9, zz - 1.25, x + 0.1, zz - 0.6, SOL + 0.32, BLANCS[1]); plaque(PLAT, x - 1.9, zz + 0.6, x + 0.1, zz + 1.25, SOL + 0.32, BLANCS[1]); } }
      for (let k = 0, m = fin ? 26 : 8; k < m; k++) { const x = -733 - r() * 30, zz = z + r() * 90, t = pick(r, PARASOLS); plaque(PLAT, x, zz, x + 1.9, zz + 0.95, SOL + 0.12, fois(t, 0.95)); }   // des serviettes
      if (((z + 1010) / 90 | 0) % 3 === 1) { const t = pick(r, [C(0xf2a0b4), C(0xf6d04a), C(0x4fc4c0), C(0xf08a5c), C(0xb9a0e0)]); caisse(PLAT, -757, SOL + 1.3, z + 60, -753.6, SOL + 3.7, z + 63.4, t, BLANCS[0]); caisse(PLAT, -755.6, SOL - 0.2, z + 61.4, -755, SOL + 1.3, z + 62, BLANCS[1]); }   // la cabane du sauveteur
    }
    for (let z = -1000; z < 1000; z += 9 + r() * 8) { if (r() < 0.6) palmiers.push({ x: -724.5 + r() * 2, y: SOL, z, s: 0.8 + r() * 0.4 }); else arbres.push({ x: -725 + r() * 3, y: SOL - 2.2, z, s: 2 + r() * 1.2, t: r() }); }
  })();

  /* Les ponts : un tablier en dos d'âne (les bateaux passent dessous), des piles, des garde-corps */
  const PROFIL = [0.5, 4.6, 11, 14.2, 11, 4.6, 0.5], PAS_PONT = (ILE_E + 14 - (RIVE - 14)) / 6;   // hauteurs du tablier, de la ville vers l'île
  function hautPont(x) {                                                                      // la hauteur du tablier au-dessus de la rue, à l'abscisse x
    if (x >= RIVE || x <= ILE_E) return 0;
    if (x > RIVE - 14) return PROFIL[0] * (RIVE - x) / 14;
    if (x < ILE_E + 14) return PROFIL[6] * (x - ILE_E) / 14;
    const t = (x - (RIVE - 14)) / PAS_PONT, i = Math.min(5, t | 0); return PROFIL[i] + (PROFIL[i + 1] - PROFIL[i]) * (t - i);
  }
  for (const zp of PONTS_Z) {
    const xa = RIVE - 14, v0 = (zp - 12 + 90) / 180, v1 = (zp + 12 + 90) / 180;
    // les deux rampes d'accès (du sol au premier nœud) puis les six travées
    const N = [[RIVE, 0], [xa, PROFIL[0]]]; for (let k = 1; k <= 6; k++) N.push([xa + k * PAS_PONT, PROFIL[k]]); N.push([ILE_E, 0]);
    for (let k = 0; k < N.length - 1; k++) {
      const a = N[k], b = N[k + 1], ya = SOL + a[1], yb = SOL + b[1], L = a[0] - b[0], u0 = 62 / 180, u1 = (62 + Math.min(62, L)) / 180, pente = (yb - ya) / L, nn = Math.hypot(pente, 1);
      quad(SOLT, [a[0], ya, zp - 12, a[0], ya, zp + 12, b[0], yb, zp + 12, b[0], yb, zp - 12], [pente / nn, 1 / nn, 0], [u0, v0, u0, v1, u1, v1, u1, v0], BLANC);
      for (const c of [-1, 1]) quad(PLAT, [a[0], ya - 1.7, zp + c * 12, b[0], yb - 1.7, zp + c * 12, b[0], yb + 0.95, zp + c * 12, a[0], ya + 0.95, zp + c * 12], [0, 0, c], null, fois(BETON, 0.8), BETON);
      for (const c of [-1, 1]) quad(PLAT, [a[0], ya - 1.7, zp + c * 11.7, b[0], yb - 1.7, zp + c * 11.7, b[0], yb + 0.95, zp + c * 11.7, a[0], ya + 0.95, zp + c * 11.7], [0, 0, -c], null, fois(BETON, 0.8), BETON);
      quad(PLAT, [a[0], ya - 1.7, zp - 12, a[0], ya - 1.7, zp + 12, b[0], yb - 1.7, zp + 12, b[0], yb - 1.7, zp - 12], [0, -1, 0], null, fois(BETON, 0.45));
      ombres.push([[[a[0], zp - 12], [b[0], zp - 12], [b[0], zp + 12], [a[0], zp + 12]], Math.max(0, (a[1] + b[1]) / 2 - 1.7), (a[1] + b[1]) / 2]);
      if (k >= 1 && k < N.length - 1) { caisse(PLAT, a[0] - 1.4, EAU_Y - 1, zp - 9, a[0] + 1.4, ya - 1.6, zp + 9, BETON); if (k < N.length - 2) caisse(PLAT, (a[0] + b[0]) / 2 - 1.2, EAU_Y - 1, zp - 9, (a[0] + b[0]) / 2 + 1.2, (ya + yb) / 2 - 1.6, zp + 9, BETON); }
    }
    for (let x = RIVE - 10; x > ILE_E + 10; x -= 26) for (const c of [-1, 1]) lueur(x, SOL + hautPont(x) + 0.4, zp + c * 6, 9, C(0xffd9a0, 0.36));
  }

  /* Le choix de la hauteur : bas près de la tour, une grappe de grandes tours au fond (x < -60 et z < -60), puis la ville qui s'étale */
  function hauteurPermise(cx, cz, fond, pres) {
    const grappe = 208 * Math.exp(-Math.pow(Math.hypot(cx + 140, cz + 262) / 235, 2));
    if (fond) return Math.max(46, grappe);
    if (pres) return 62;
    const d = Math.hypot(cx, cz), base = d < 800 ? 92 - 52 * (d - 300) / 500 : 26;
    return cz < -200 && cx < 420 ? Math.max(base, grappe * 0.8) : base;
  }
  const PLAFOND_PRES = SOL + 69.4;                                                            // à moins de 300 m (hors du fond) rien ne dépasse y = -18
  for (let i = -2; i <= 16; i++) for (let j = -18; j <= 18; j++) {
    if (i === 0 && j === 0) continue;                                                         // la parcelle de la tour, plus bas
    const X0 = 90 * i - 45 + demiVoie(i - 1), X1 = 90 * i + 45 - demiVoie(i), Z0 = 90 * j - 45 + demiVoie(j - 1), Z1 = 90 * j + 45 - demiVoie(j), cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const r = alea(7919 * (i + 40) + 104729 * (j + 40)), d = Math.hypot(cx, cz), pres = Math.hypot(Math.max(0, Math.abs(cx) - 36), Math.max(0, Math.abs(cz) - 36)) < 302, fond = i <= -1 && j <= -1;
    const niv = d < 430 ? 2 : d < 1000 ? 1 : 0, H = hauteurPermise(cx, cz, fond, pres), plafond = pres && !fond ? PLAFOND_PRES : null, cle = i + "," + j, t = r();
    const bord = { xMax: fond && i === -1 ? -60.5 : null, zMax: fond && j === -1 ? -60.5 : null };          // les tours du fond restent dans leur quart
    if (cle === "-2,0" || cle === "3,-2" || cle === "-2,4" || cle === "5,3") parc(r, X0, Z0, X1, Z1, niv);
    else if (cle === "1,1") { petits(r, X0, Z0, X1, Z1, 14, niv, 0.5); }
    else if (cle === "2,2") petits(r, X0, Z0, X1, Z1, 30, niv);
    else if (cle === "-1,0") tourSurSocle(r, X0, Z0, X1, Z1, 56, niv, { coin: 0, piscine: true, style: "balcons", tw: 27, td: 45, plafond });
    else if (cle === "0,-1") tourSurSocle(r, X0, Z0, X1, Z1, 50, niv, { coin: 0, piscine: true, style: "verre", tw: 48, td: 24, plafond });
    else if (cle === "-2,-1") tourSurSocle(r, X0, Z0, X1, Z1, 84, niv, { coin: 0, piscine: true, fond: true, tw: 42, td: 24 });
    else if (fond && H > 70) tourSurSocle(r, X0, Z0, X1, Z1, H * (0.74 + r() * 0.26), niv, Object.assign({ fond: true, jumelles: t < 0.2 && H > 110, ronde: t > 0.9, elancee: t > 0.68 && t <= 0.9 }, bord));
    else if (d > 1250) { if (t < 0.72) maisons(r, X0, Z0, X1, Z1, niv); else petits(r, X0, Z0, X1, Z1, 14, niv); }
    else if (d > 800 && !(cz < -200 && cx < 420)) { if (t < 0.4) maisons(r, X0, Z0, X1, Z1, niv); else if (t < 0.84) petits(r, X0, Z0, X1, Z1, 22, niv); else if (t < 0.9) parc(r, X0, Z0, X1, Z1, niv); else barre(r, X0, Z0, X1, Z1, 30 + r() * 14, niv); }
    else {
      const h = H * (0.52 + r() * 0.48);
      if (t < 0.5) tourSurSocle(r, X0, Z0, X1, Z1, h, niv, Object.assign({ plafond, fond: H > 100 }, bord));
      else if (t < 0.64) barre(r, X0, Z0, X1, Z1, Math.min(h, 58), niv, plafond);
      else if (t < 0.8) enEquerre(r, X0, Z0, X1, Z1, Math.min(h, 46), niv, plafond);
      else if (t < 0.95) petits(r, X0, Z0, X1, Z1, 24, niv);
      else parc(r, X0, Z0, X1, Z1, niv);
    }
  }

  /* La parcelle de la tour AVYORA : le fût de verre sous l'étage, ses lames blanches, le hall, le parvis */
  (function () {
    const r = alea(5), verre = C(0xe9f3ff);
    // tout tient dans l'emprise de l'étage (x de -23,2 à 23,2 ; z de -16,2 à 17,2) et s'arrête à y = -0,6 : le vitrage est en retrait de 22 cm, les lames blanches affleurent le bord
    const X0 = -23.2, X1 = 23.2, Z0 = -16.2, Z1 = 17.2, e = 0.22, haut = -0.6;
    prisme("verre", rect(X0 + e, Z0 + e, X1 - e, Z1 - e), SOL, haut, { teinte: verre, sansToit: true, du: 3, dv: 5, ao: 0.7 });
    for (let k = 0; k <= 8; k++) { const x = X0 + k * 5.8, xa = Math.max(X0, x - 0.3), xb = Math.min(X1, x + 0.3); caisse(PLAT, xa, SOL + 8.2, Z0, xb, haut, Z0 + e, BLANCS[0]); caisse(PLAT, xa, SOL + 8.2, Z1 - e, xb, haut, Z1, BLANCS[0]); }
    for (let k = 0; k <= 6; k++) { const z = Z0 + k * (Z1 - Z0) / 6, za = Math.max(Z0, z - 0.3), zb = Math.min(Z1, z + 0.3); caisse(PLAT, X0, SOL + 8.2, za, X0 + e, haut, zb, BLANCS[0]); caisse(PLAT, X1 - e, SOL + 8.2, za, X1, haut, zb, BLANCS[0]); }
    for (const z of [Z0, Z1]) quad(PLAT, [X0, -2.6, z, X1, -2.6, z, X1, haut, z, X0, haut, z], [0, 0, z < 0 ? -1 : 1], null, BLANCS[0]);     // le bandeau blanc sous l'étage
    for (const x of [X0, X1]) quad(PLAT, [x, -2.6, Z0, x, -2.6, Z1, x, haut, Z1, x, haut, Z0], [x < 0 ? -1 : 1, 0, 0], null, BLANCS[0]);
    prisme("sombre", rect(-28, -21, 28, 22), SOL, SOL + 8, { teinte: BLANC, toit: PONTONS[2], rive: BLANCS[0], du: 2, dv: 9 });              // le hall, sur deux niveaux
    plaque(DALLE, -32, -32, 35, 35, SOL + 0.05, C(0xc8c2b6));                                                                              // le parvis
    bassin(-31, -29.5, 31, -25.5, SOL - 0.2, r); bassin(30, -14, 33.5, 16, SOL - 0.2, r);
    for (const [x, z] of [[-30.5, 26], [-22, 30], [-11, 30], [0, 30], [11, 30], [22, 30], [31, 26], [-31, -8], [-31, 4], [-31, 16]]) palmiers.push({ x, y: SOL, z, s: 0.95 + r() * 0.3 });
  })();

  /* Miami Beach : côté océan, les petits hôtels Art déco (au centre) puis les grands hôtels ; côté baie, villas puis tours */
  for (let j = -17; j <= 17; j++) {
    const Z0 = 90 * j - 45 + demiVoie(j - 1), Z1 = 90 * j + 45 - demiVoie(j), cz = 90 * j, r = alea(4000 + j * 37), deco = Math.abs(cz) < 250, niv = Math.abs(cz) < 340 ? 2 : Math.abs(cz) < 950 ? 1 : 0;
    const elan = borne(1.15 - Math.abs(Math.abs(cz) - 560) / 520, 0.35, 1);                   // la silhouette de l'île : haute de part et d'autre du quartier Art déco
    if (deco) {
      let z = Z0 + 1;
      while (z < Z1 - 13) {
        let l = BAIE * (5 + (r() * 4 | 0)); const n = 3 + (r() * 4 | 0), ton = pick(r, PASTELS), y1 = SOL + n * NIV; if (z + l > Z1 - 1) l = BAIE * Math.floor((Z1 - 1 - z) / BAIE); if (l < 12) break;
        prisme("perce", rect(-688, z, -658, z + l), SOL, y1, { teinte: ton, toit: pick(r, TOITS), rive: BLANCS[0], du: r() * 16 | 0, dv: r() * 16 | 0, niv }); equipToit(r, -688, z, -658, z + l, y1, niv);
        caisse(PLAT, -658.6, SOL, z + l / 2 - 1.5, -657.4, y1 + 3.2, z + l / 2 + 1.5, BLANCS[0]);                                           // l'aileron vertical des façades Art déco
        caisse(PLAT, -660.5, SOL + 3.4, z + 1, -655.5, SOL + 3.9, z + l - 1, mel(ton, BLANC, 0.3));                                        // l'auvent sur le trottoir
        if (l > 17) { bassin(-707, z + 3, -698, z + l - 4, SOL - 0.2, r); for (let k = 0; k < 4; k++) { parasol(-695, SOL, z + 3 + k * 3.6, pick(r, PARASOLS), 1.2); plaque(PLAT, -711.5, z + 3 + k * 2, -709.6, z + 3.7 + k * 2, SOL + 0.42, BLANCS[1]); } }
        for (let k = 0; k < 3; k++) palmiers.push({ x: -712 + r() * 20, y: SOL, z: z + r() * l, s: 0.8 + r() * 0.35 });
        z += l + 1.5 + r() * 3;
      }
      plaque(DALLE, -714, Z0 + 1, -690, Z1 - 1, SOL + 0.05, lointain(pick(r, PONTONS), -700, cz));
    } else {
      const n = Math.round((9 + r() * 14) * elan), style = r() < 0.55 ? "balcons" : r() < 0.6 ? "bandes" : "verre", ton = teinteDe(r, style, 0.3), L = BAIE * Math.floor((Z1 - Z0 - 8 - r() * 20) / BAIE), z = Z0 + 4 + r() * (Z1 - Z0 - 8 - L);
      prisme("bandes", rect(-712, Z0 + 2, -658, Z1 - 2), SOL, SOL + 2 * NIV, { teinte: pick(r, BLANCS), toit: pick(r, PONTONS), niv, du: r() * 16 | 0 });
      corpsDeTour(r, style, ton, -688, z, -664, z + L, SOL + 2 * NIV, SOL + n * NIV, niv);
      terrasse(r, [-710, Z0 + 4, -691, Z1 - 4], SOL + 2 * NIV, niv);
    }
    // côté baie
    if (deco || r() < 0.3) {
      let z = Z0 + 1.5;
      while (z < Z1 - 14) {
        const l = 12 + r() * 9, n = 2 + (r() * 2 | 0); if (z + l > Z1 - 1) break;
        prisme("perce", rect(-628, z, -610, z + l), SOL, SOL + n * NIV, { teinte: r() < 0.6 ? pick(r, BLANCS) : pick(r, PASTELS), toit: pick(r, TUILES), niv, du: r() * 16 | 0, dv: r() * 16 | 0 });
        if (r() < 0.7) plaque(EAU, -606.5, z + 2, -600.5, z + l - 3, SOL + 0.3, lointain(BASSINS[0], -600, z));
        if (r() < 0.5 && (z > 440 || z < 140)) { caisse(PLAT, ILE_E, EAU_Y - 0.6, z + l / 2 - 0.9, ILE_E + 17, EAU_Y + 0.7, z + l / 2 + 0.9, QUAI, BOIS); if (r() < 0.7) amarres.push({ x: ILE_E + 9, z: z + l / 2 + 5, hx: 1, hz: 0, s: 0.3 + r() * 0.2 }); }
        arbres.push({ x: -604, y: SOL, z: z + l - 1, s: 2.6 + r() * 2, t: r() }); palmiers.push({ x: -600 + r() * 2, y: SOL, z: z + 1 + r() * 3, s: 0.8 + r() * 0.4 });
        z += l + 3 + r() * 5;
      }
      plaque(DALLE, -609, Z0 + 1, -598, Z1 - 1, SOL + 0.05, lointain(PELOUSE, -600, cz));
    } else {
      const n = Math.round((11 + r() * 17) * elan), style = styleTour(r, r() < 0.5), L = BAIE * (9 + (r() * 6 | 0)), z = Z0 + 3 + r() * Math.max(0, Z1 - Z0 - 6 - L);
      prisme("bandes", rect(-630, Z0 + 2, -599, Z1 - 2), SOL, SOL + 2 * NIV, { teinte: pick(r, BLANCS), toit: pick(r, PONTONS), niv, dv: r() * 16 | 0 });
      corpsDeTour(r, style, teinteDe(r, style, 0.2), -628, z, -604, Math.min(z + L, Z1 - 3), SOL + 2 * NIV, SOL + n * NIV, niv);
      if (z - Z0 > 20) bassin(-624, Z0 + 5, -607, Z0 + 12, SOL + 2 * NIV, r); else if (Z1 - z - L > 20) bassin(-624, Z1 - 12, -607, Z1 - 5, SOL + 2 * NIV, r);
    }
  }

  /* Le paquebot de croisière, à quai le long de l'île au nord du pont : la coque, les ponts à balcons, la passerelle, la cheminée */
  (function () {
    const r = alea(808), cx = -566, cz = 292, y0 = EAU_Y + 12.5, M = (pts) => pts.map((p) => [cx + p[0], cz + p[1]]), P = (x0, z0, x1, z1) => rect(cx + x0, cz + z0, cx + x1, cz + z1);
    const coque = [[-15, -120], [15, -120], [15, 84], [9.5, 106], [0, 121], [-9.5, 106], [-15, 84]];
    prisme(null, M(coque.map((p) => [p[0] * 1.012, p[1] * 1.004])), EAU_Y - 1, EAU_Y + 2.4, { teinte: C(0x1d2c4a), sansToit: true, sansOmbre: true });   // la ligne de flottaison
    prisme(null, M(coque), EAU_Y - 1, y0, { teinte: BLANCS[0], toit: C(0xb9a98a), parapet: 1.1, ao: 0.86 });
    prisme("balcons", P(-13.6, -104, 13.6, 70), y0, y0 + 7 * NIV, { teinte: BLANCS[0], toit: PONTONS[2], du: 3, dv: 2 });
    prisme("sombre", P(-15.6, 70, 15.6, 80), y0, y0 + 8 * NIV, { teinte: BLANC, toit: BLANCS[1], rive: BLANCS[0], du: 1, dv: 4 });                   // la passerelle, plus large que le navire
    prisme("bandes", P(-12, -92, 12, 52), y0 + 7 * NIV, y0 + 9 * NIV, { teinte: BLANCS[0], toit: PONTONS[0], du: 6, dv: 1 });
    bassin(cx - 6, cz - 30, cx + 6, cz - 8, y0 + 9 * NIV, r); bassin(cx - 5, cz + 12, cx + 5, cz + 26, y0 + 9 * NIV, r);
    prisme(null, P(-5.5, -74, 5.5, -54), y0 + 9 * NIV, y0 + 9 * NIV + 12, { teinte: C(0x1d2c4a), toit: C(0x20242c), parapet: 0 });                    // la cheminée
    caisse(PLAT, cx - 6, y0 + 9 * NIV + 8.5, cz - 75, cx + 6, y0 + 9 * NIV + 10.5, cz - 53, C(0xc8452c));
    caisse(PLAT, cx - 0.4, y0 + 8 * NIV, cz + 73, cx + 0.4, y0 + 8 * NIV + 9, cz + 73.8, BLANCS[0]); balise(cx, y0 + 8 * NIV + 9.5, cz + 73.4, 1.6, [1, 0.9, 0.7]);
    for (let k = 0; k < 9; k++) for (const c of [-1, 1]) caisse(PLAT, cx + c * 15.9 - 1.3, y0 - 0.4, cz - 96 + k * 18, cx + c * 15.9 + 1.3, y0 + 2, cz - 87 + k * 18, C(0xe07a2c), C(0xeeeae2));   // les canots
    caisse(PLAT, ILE_E, EAU_Y - 1, cz - 132, cx - 16.5, SOL, cz + 130, QUAI, BETON);                                                                 // le quai de la gare maritime
    for (let z = cz - 110; z <= cz + 110; z += 44) lueur(ILE_E + 6, SOL + 0.4, z, 11, C(0xffe0b4, 0.4));
  })();

  /* Les plantations : palmiers le long des avenues et sur leurs terre-pleins, arbres ronds dans les rues ; les voitures garées le long des trottoirs ; les réverbères */
  (function () {
    const r = alea(313);
    function ligne(nordSud, c, k, a0, a1) {                                                  // une voie d'axe c, parcourue de a0 à a1
      const avenue = (k & 1) === 1, bord = avenue ? 9 : 6.8, pose = (a, lat, quoi) => { const x = nordSud ? c + lat : a, z = nordSud ? a : c + lat; if (quoi) palmiers.push({ x, y: SOL, z, s: 0.82 + r() * 0.4 }); else arbres.push({ x, y: SOL, z, s: 2.6 + r() * 1.6, t: r() }); };
      for (let a = Math.ceil((a0 - 9) / 18) * 18 + 9; a < a1; a += 18) {
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45), x = nordSud ? c : a, z = nordSud ? a : c, d = Math.hypot(x, z), p = d < 380 ? 1 : d < 700 ? 0.42 : d < 1150 ? 0.1 : 0;
        if (croix > 16) for (const s of [-1, 1]) if (r() < p * (avenue ? 1 : 0.8)) pose(a, s * bord, avenue || r() < 0.25);
        if (avenue && croix > 26 && r() < p) pose(a - 9, 0, true);                             // le terre-plein
      }
      for (let a = Math.ceil(a0 / 6) * 6 + 3; a < a1; a += 6) {                                 // le stationnement le long des rues
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45), x = nordSud ? c : a, z = nordSud ? a : c, d = Math.hypot(x, z); if (avenue || croix < 23 || d > 760) continue;
        for (const s of [-1, 1]) if (r() < (d < 350 ? 0.6 : 0.26)) garees.push(nordSud ? { x: c + s * 4.65, y: SOL + 0.02, z: a, hx: 0, hz: -s } : { x: a, y: SOL + 0.02, z: c + s * 4.65, hx: s, hz: 0 });
      }
      for (let a = Math.ceil(a0 / 36) * 36, n = 0; a < a1; a += 36, n++) {                       // les réverbères, en quinconce
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45); if (croix < 9) continue;
        const lat = (n % 2 ? 1 : -1) * (avenue ? 5 : 3.2), x = nordSud ? c + lat : a, z = nordSud ? a : c + lat;
        lueur(x, SOL + 0.3, z, avenue ? 13 : 11, avenue ? C(0xffd2a0, 0.34) : C(0xffb774, 0.3));
      }
    }
    for (let k = -3; k <= 16; k++) ligne(true, 45 + 90 * k, k, -1550, 1550);
    for (let k = -18; k <= 17; k++) ligne(false, 45 + 90 * k, k, -238, 1500);
    // Miami Beach : Collins, ses palmiers, ses lumières
    for (let z = -1200; z < 1200; z += 18) { const croix = Math.abs(((z - 45) % 90 + 135) % 90 - 45); if (croix < 16) continue; for (const s of [-1, 1]) if (r() < 0.8) palmiers.push({ x: COLLINS + s * 9, y: SOL, z: z + 9, s: 0.85 + r() * 0.35 }); if (croix > 26 && r() < 0.8) palmiers.push({ x: COLLINS, y: SOL, z, s: 0.9 + r() * 0.3 }); }
    for (let z = -1500; z < 1500; z += 30) { lueur(COLLINS + ((z / 30) % 2 ? 5 : -5), SOL + 0.3, z, 13, C(0xffd2a0, 0.34)); if ((z / 30) % 3 === 0) lueur(-718, SOL + 0.7, z, 8, C(0xffc98a, 0.3)); }
    for (let k = -17; k <= 16; k++) for (let x = ILE_O + 12; x < ILE_E; x += 34) lueur(x, SOL + 0.3, 45 + 90 * k + 3, 11, C(0xffb774, 0.3));
  })();

  /* ───────────────────────── 7. Les ombres portées, dessinées au sol ─────────────────────────
     Chaque volume laisse au sol la trace balayée par ses arêtes « sous le vent » du soleil. Les arbres laissent une tache. */
  function tracerOmbres(dir) {
    const T = tampon(), ox = -dir[0] / dir[1], oz = -dir[2] / dir[1], y = SOL + 0.2, noir = [0, 0, 0];
    for (const o of ombres) {
      const pts = o[0], h0 = o[1], h1 = o[2], n = pts.length; let aire = 0;
      for (let k = 0; k < n; k++) aire += pts[k][0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * pts[k][1];
      const s = aire > 0 ? 1 : -1;
      if (h0 > 0.05) polyH(T, pts.map((p) => [p[0] + ox * h0, p[1] + oz * h0]), y, noir);
      for (let k = 0; k < n; k++) {
        const a = pts[k], b = pts[(k + 1) % n]; if (s * ((b[1] - a[1]) * ox - (b[0] - a[0]) * oz) <= 0) continue;
        quad(T, [a[0] + ox * h0, y, a[1] + oz * h0, b[0] + ox * h0, y, b[1] + oz * h0, b[0] + ox * h1, y, b[1] + oz * h1, a[0] + ox * h1, y, a[1] + oz * h1], [0, 1, 0], null, noir);
      }
    }
    const tache = (x, z, h, ray) => { const p = []; for (let k = 0; k < 9; k++) { const q = ray * (0.86 + 0.14 * Math.sin(k * 2.4 + x)); p.push([x + ox * h + q * Math.cos(k * 0.698), z + oz * h + q * 0.82 * Math.sin(k * 0.698)]); } polyH(T, p, y, noir); };
    for (const p of palmiers) if (p.y < SOL + 1 && Math.hypot(p.x, p.z) < 520) tache(p.x, p.z, 8.6 * p.s, 2.5 * p.s);
    for (const a of arbres) if (a.y > SOL - 1 && a.y < SOL + 1 && Math.hypot(a.x, a.z) < 520) tache(a.x, a.z, 1.25 * a.s, 1.12 * a.s);
    return T;
  }

  /* ───────────────────────── 8. Les mailles fondues ───────────────────────── */
  maille(SOLT, matSol); maille(DALLE, matDalle); maille(PLAT, matPlat); maille(EAU, matEau);
  for (const nom in F) maille(F[nom], matFacades[nom]);
  let dirOmbres = SOLEIL, mOmbres = maille(tracerOmbres(SOLEIL), matOmbre, 2);
  const mEcume = maille(ECUME, matEcume, 3);
  const mLum = maille(LUM, matLum, 4); mLum.visible = false;

  /* ───────────────────────── 9. Les exemplaires : palmiers, arbres, voitures, bateaux ───────────────────────── */
  function verser(T, g, col, sens) {                                                          // recopie un morceau de modèle dans un tampon, d'une seule couleur
    const pos = g.attributes.position, nor = g.attributes.normal, b = T.nb, s = sens || 1;
    for (let i = 0; i < pos.count; i++) { T.p.push(s * pos.getX(i), pos.getY(i), s * pos.getZ(i)); if (nor) T.n.push(s * nor.getX(i), nor.getY(i), s * nor.getZ(i)); else T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(col[0], col[1], col[2]); }
    if (g.index) for (let i = 0; i < g.index.count; i++) T.i.push(b + g.index.getX(i)); else for (let i = 0; i < pos.count; i++) T.i.push(b + i);
    T.nb += pos.count;
  }
  function couleurs(m, n) { m.instanceColor = new THREE.BufferAttribute(new Float32Array(Math.max(1, n) * 3).fill(1), 3); }
  const foyer = (p) => Math.min(Math.hypot(p.x + 30, p.z + 30), Math.hypot(p.x - 70, p.z - 70) + 70);   // la distance aux endroits qu'on regarde de près

  /* Le palmier léger (au loin) : un tronc à quatre faces, huit palmes pliées */
  function geoPalmier() {
    const T = tampon(), tronc = C(0x8a765e), sombre = C(0x35602f), clair = C(0x6f9448), mi = mel(sombre, clair, 0.5), h = 7.8;
    for (let k = 0; k < 4; k++) {
      const a0 = k * Math.PI / 2, a1 = a0 + Math.PI / 2, am = a0 + Math.PI / 4;
      quad(T, [0.26 * Math.cos(a0), 0, 0.26 * Math.sin(a0), 0.26 * Math.cos(a1), 0, 0.26 * Math.sin(a1), 0.16 * Math.cos(a1), h, 0.16 * Math.sin(a1), 0.16 * Math.cos(a0), h, 0.16 * Math.sin(a0)], [Math.cos(am), 0, Math.sin(am)], null, fois(tronc, 0.8), tronc);
    }
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + (k % 2) * 0.22, ca = Math.cos(a), sa = Math.sin(a), L = 3.1 + (k % 3) * 0.35, w = 0.62, N = [ca * 0.35, 0.94, sa * 0.35];
      const g = [ca * L * 0.5 - sa * w, h + 0.75, sa * L * 0.5 + ca * w], d = [ca * L * 0.5 + sa * w, h + 0.75, sa * L * 0.5 - ca * w];
      tri(T, [0, h + 0.15, 0].concat(g, d), N, sombre, mi, mi); tri(T, g.concat([ca * L, h - 0.75 - (k % 2) * 0.4, sa * L], d), N, mi, clair, mi);
    }
    return geoDe(T);
  }
  /* Le palmier de moyenne distance : un stipe un peu penché, onze palmes arquées qui retombent (trois tronçons pliés en V),
     les jeunes dressées au cœur, une ou deux vieilles palmes jaunies qui pendent */
  function geoPalmierMoyen() {
    const T = tampon(), r = alea(4242), tronc = C(0x8f7d66), h = 8.3, V0 = C(0x2c4f2d), V1 = C(0x4a7739), V2 = C(0x76964c), SEC = C(0x8f8850);
    const axe = (t) => [0.5 * t * t, h * t, 0.18 * t * t];
    for (let s = 0; s < 3; s++) {
      const a = axe(s / 3), b = axe((s + 1) / 3), ra = 0.3 - 0.045 * s, rb = 0.3 - 0.045 * (s + 1);
      for (let k = 0; k < 5; k++) {
        const a0 = k * 1.2566, a1 = a0 + 1.2566, am = a0 + 0.6283;
        quad(T, [a[0] + ra * Math.cos(a0), a[1], a[2] + ra * Math.sin(a0), a[0] + ra * Math.cos(a1), a[1], a[2] + ra * Math.sin(a1), b[0] + rb * Math.cos(a1), b[1], b[2] + rb * Math.sin(a1), b[0] + rb * Math.cos(a0), b[1], b[2] + rb * Math.sin(a0)],
          [Math.cos(am), 0, Math.sin(am)], null, fois(tronc, 0.7 + 0.09 * s), fois(tronc, 0.79 + 0.09 * s));
      }
    }
    const s0 = axe(1), N = 11;
    for (let k = 0; k < N; k++) {
      const az = (k + r() * 0.5) * 6.2832 / N, ca = Math.cos(az), sa = Math.sin(az), dresse = k % 3 === 1, pend = k % 5 === 4;
      const L = (dresse ? 2.7 : 3.6) + r() * 0.8, lever = dresse ? 1.15 : pend ? 0.28 : 0.55 + r() * 0.3, chute = dresse ? 0.75 : pend ? 1.25 : 1.2 + r() * 0.5, w = 0.54 + r() * 0.14, k0 = 0.85 + r() * 0.3;
      let avant = null;
      for (let s = 0; s <= 3; s++) {
        const t = s / 3, rad = L * (t - 0.14 * t * t), y = s0[1] + 0.15 + L * (lever * t - chute * t * t), ww = s === 3 ? 0.06 : w * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.5) / 2));
        const x = s0[0] + ca * rad, z = s0[2] + sa * rad, pli = 0.34 * ww;
        const col = fois(pend ? mel(V1, SEC, 0.65) : t < 0.5 ? mel(V0, V1, t * 2) : mel(V1, V2, t * 2 - 1), k0);
        const ici = { m: [x, y, z], g: [x - sa * ww, y - pli, z + ca * ww], d: [x + sa * ww, y - pli, z - ca * ww], col };
        if (avant) { quadLibre(T, avant.g.concat(avant.m, ici.m, ici.g), avant.col, col); quadLibre(T, avant.m.concat(avant.d, ici.d, ici.m), fois(avant.col, 0.84), fois(col, 0.84)); }
        avant = ici;
      }
    }
    return geoDe(T);
  }
  /* L'arbre : niveau 2 = un houppier à cinq lobes et son tronc ; niveau 1 = une boule bosselée ; niveau 0 (au loin) = un volume à vingt faces.
     Les normales sont lissées sur tout le houppier (pas de facettes), le dessous est sombre, le feuillage moucheté. */
  function geoArbre(niveau) {
    const T = tampon(), lobes = niveau === 2 ? [[0, 1.52, 0, 0.9], [0.72, 1.2, 0.26, 0.7], [-0.62, 1.24, -0.5, 0.74], [-0.16, 1.22, 0.8, 0.64], [0.34, 1.3, -0.74, 0.6]] : [[0, 1.3, 0, 1]];
    if (niveau === 2) for (let k = 0; k < 5; k++) {                                            // le tronc (sa couleur compense la teinte verte donnée à chaque arbre)
      const a0 = k * 1.2566, a1 = a0 + 1.2566, am = a0 + 0.6283, bois = [0.9, 0.42, 0.7];
      quad(T, [0.1 * Math.cos(a0), 0, 0.1 * Math.sin(a0), 0.1 * Math.cos(a1), 0, 0.1 * Math.sin(a1), 0.07 * Math.cos(a1), 1, 0.07 * Math.sin(a1), 0.07 * Math.cos(a0), 1, 0.07 * Math.sin(a0)], [Math.cos(am), 0, Math.sin(am)], null, bois);
    }
    for (const b of lobes) {
      const g = niveau === 0 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, niveau === 2 ? 8 : 7, niveau === 2 ? 5 : 4), p = g.attributes.position, base = T.nb;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = b[3] * (1 + 0.1 * Math.sin(x * 7.1 + z * 5.3 + y * 3.7 + b[0] * 9) + 0.07 * Math.sin(z * 11.3 - x * 4.1));
        const X = b[0] + x * k, Y = b[1] + y * 0.76 * k, Z = b[2] + z * k, nx = x + X * 0.9, ny = y + (Y - 1.1) * 1.1, nz = z + Z * 0.9, nl = Math.hypot(nx, ny, nz) || 1;
        const tache = Math.sin(X * 12.9898 + Y * 78.233 + Z * 37.719) * 43758.5453, c = (0.36 + 0.66 * borne((Y - 0.6) / 1.35, 0, 1)) * (0.86 + 0.24 * (tache - Math.floor(tache)));
        T.p.push(X, Y, Z); T.n.push(nx / nl, ny / nl, nz / nl); T.u.push(0, 0); T.c.push(c, c, c * 0.94);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) T.i.push(base + g.index.getX(i)); else for (let i = 0; i < p.count; i++) T.i.push(base + i);
      T.nb += p.count; g.dispose();
    }
    return geoDe(T);
  }
  /* La voiture légère : une caisse, un habitacle vitré, l'ombre dessous (l'avant est en +z) */
  function geoAuto() {
    const T = tampon(), b = [1, 1, 1], vitre = C(0x1b2229), B = [-0.86, 0.84, -1.5, 0.86, 0.84, 0.85], H = [-0.72, 1.36, -1.1, 0.72, 1.36, 0.35];
    caisse(T, -0.92, 0.3, -2.25, 0.92, 0.84, 2.25, b, b);
    quad(T, [B[0], B[1], B[5], B[3], B[1], B[5], H[3], H[1], H[5], H[0], H[1], H[5]], [0, 0.5, 0.86], null, vitre);
    quad(T, [B[3], B[1], B[2], B[0], B[1], B[2], H[0], H[1], H[2], H[3], H[1], H[2]], [0, 0.5, -0.86], null, vitre);
    quad(T, [B[0], B[1], B[2], B[0], B[1], B[5], H[0], H[1], H[5], H[0], H[1], H[2]], [-0.96, 0.26, 0], null, vitre);
    quad(T, [B[3], B[1], B[5], B[3], B[1], B[2], H[3], H[1], H[2], H[3], H[1], H[5]], [0.96, 0.26, 0], null, vitre);
    plaque(T, H[0], H[2], H[3], H[5], H[1], b); plaque(T, -1.02, -2.35, 1.02, 2.35, 0.04, C(0x101113));
    return geoDe(T);
  }
  /* La voiture détaillée : les morceaux du modèle fondus en un seul, sans les roues (invisibles de si haut), la caisse en blanc pour prendre la teinte de chaque exemplaire */
  function geoAutoVraie(mod) {
    const T = tampon(), L = mod.longueur; let caisseP = null, max = 0, avant = 1;
    const infos = mod.parties.map((p) => {
      p.geometry.computeBoundingBox(); const bb = p.geometry.boundingBox, n = (p.geometry.index ? p.geometry.index.count : p.geometry.attributes.position.count) / 3;
      const roue = (bb.max.z - bb.min.z) < 0.22 * L && bb.min.y < 0.04 * L; if (!roue && n > max) { max = n; caisseP = p; }
      if (/head/i.test(p.nom || "")) avant = (bb.min.z + bb.max.z) > 0 ? 1 : -1; return { p, roue };
    });
    for (const q of infos) if (!q.roue) verser(T, q.p.geometry, q.p === caisseP ? [1, 1, 1] : [q.p.material.color.r, q.p.material.color.g, q.p.material.color.b], avant);
    const l = mod.taille.x / 2 - 0.1; caisse(T, -l, 0.03, -L / 2 + 0.3, l, 0.4, L / 2 - 0.3, C(0x0e0f10));   // le dessous sombre tient lieu de roues et d'ombre
    return geoDe(T);
  }
  /* Un bateau : le modèle fondu, ou à défaut une coque pointue, un roof, un mât et sa voile */
  function geoBateau(mod, voilier) {
    const T = tampon();
    if (mod) {
      for (const p of mod.parties) { const c = p.material.color; let col = [c.r, c.g, c.b]; if (voilier && /sail/i.test(p.nom || "")) col = [0.9, 0.88, 0.82]; else if (voilier && /light/i.test(p.nom || "")) col = [0.8, 0.8, 0.78]; verser(T, p.geometry, col, 1); }
      return geoDe(T);
    }
    const L = voilier ? 12 : 32, l = voilier ? 1.8 : 3.8, h = voilier ? 1.2 : 2.8, blanc = C(0xf3f3ee), pts = [[-l, -L / 2], [l, -L / 2], [l, L * 0.15], [0, L / 2], [-l, L * 0.15]];
    for (let k = 0; k < 5; k++) { const a = pts[k], b = pts[(k + 1) % 5], nn = Math.hypot(b[1] - a[1], a[0] - b[0]); quad(T, [a[0] * 0.8, 0, a[1], b[0] * 0.8, 0, b[1], b[0], h, b[1], a[0], h, a[1]], [(b[1] - a[1]) / nn, 0, (a[0] - b[0]) / nn], null, fois(blanc, 0.8), blanc); }
    polyH(T, pts, h, C(0xd9cdb6));
    if (voilier) { caisse(T, -0.1, h, -0.1, 0.1, h + 13, 0.1, C(0xcfcfcf)); tri(T, [0, h + 1.5, -0.2, 0, h + 12.5, -0.2, 0, h + 1.5, -5.2], [1, 0, 0], [0.92, 0.9, 0.84]); tri(T, [0, h + 1.5, 0.3, 0, h + 10, 0.3, 0, h + 1.5, 4.6], [1, 0, 0], [0.92, 0.9, 0.84]); }
    else { caisse(T, -l * 0.7, h, -L * 0.28, l * 0.7, h + 2.5, L * 0.14, blanc); caisse(T, -l * 0.5, h + 2.5, -L * 0.2, l * 0.5, h + 4.6, L * 0.04, blanc); }
    return geoDe(T);
  }

  // les palmiers : les plus proches en modèle détaillé, puis le palmier moyen (jusqu'au premier plan de la « Vue sur Miami »), puis le palmier léger
  palmiers.sort((a, b) => foyer(a) - foyer(b));
  (function () {
    const r = alea(401), mods = MODELES.palmiers || [], nVrais = mods.length ? Math.min(DETAIL.palmiers, palmiers.length) : 0, parModele = mods.map(() => []);
    for (let i = 0; i < nVrais; i++) parModele[i % mods.length].push(palmiers[i]);
    mods.forEach((mod, k) => { for (const part of mod.parties) {
      const mat = part.material.clone(); mat.color.setRGB(0.78, 0.8, 0.7); mat.roughness = 0.9; mat.metalness = 0;      // un vert moins vif (matière copiée : le modèle sert peut-être ailleurs)
      const m = instances(part.geometry, mat, parModele[k].length), ra = alea(410 + k);
      parModele[k].forEach((p, i) => { const a = ra() * 6.283; ecrire(m.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), p.s * 1.02); }); m.count = parModele[k].length;
    } });
    const foyerLarge = (p) => Math.min(foyer(p), Math.hypot(p.x - 250, p.z - 30) + 60), reste = palmiers.slice(nVrais).sort((a, b) => foyerLarge(a) - foyerLarge(b));
    const matPalme = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), nMoyens = Math.min(DETAIL.palmiersMoyens, reste.length);
    [[geoPalmierMoyen(), 0, nMoyens, true], [geoPalmier(), nMoyens, reste.length, false]].forEach((lot) => {
      const n = lot[2] - lot[1], m = instances(lot[0], matPalme, n); couleurs(m, n);
      for (let i = 0; i < n; i++) {
        const p = reste[lot[1] + i], a = r() * 6.283, c = lointain(fois(BLANC, 0.85 + r() * 0.3), p.x, p.z), e = lot[3] ? p.s * (1 + r() * 0.2) : p.s * 1.25;
        ecrire(m.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), e, lot[3] ? e : p.s * (1.05 + r() * 0.3)); m.instanceColor.setXYZ(i, c[0], c[1], c[2]);
      }
      m.count = n;
    });
    // les arbres, de verts un peu différents : trois niveaux de détail selon la distance
    arbres.sort((a, b) => foyer(a) - foyer(b));
    const matArbre = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), V1 = C(0x3f6337), V2 = C(0x5e8446), V3 = C(0x74904a), nFins = Math.min(DETAIL.arbres, arbres.length), nMoyens2 = Math.min(nFins + DETAIL.arbresMoyens, arbres.length);
    [[geoArbre(2), 0, nFins], [geoArbre(1), nFins, nMoyens2], [geoArbre(0), nMoyens2, arbres.length]].forEach((lot) => {
      const nb = lot[2] - lot[1], ma = instances(lot[0], matArbre, nb); couleurs(ma, nb);
      for (let i = 0; i < nb; i++) { const p = arbres[lot[1] + i], a = r() * 6.283, c = lointain(p.t < 0.5 ? mel(V1, V2, p.t * 2) : mel(V2, V3, p.t * 2 - 1), p.x, p.z); ecrire(ma.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), p.s, p.s * (0.8 + r() * 0.3)); ma.instanceColor.setXYZ(i, c[0], c[1], c[2]); }
      ma.count = nb;
    });
  })();

  // les voitures : la circulation suit des circuits fermés (une voie dans un sens, demi-tour, la voie d'en face), on roule à droite
  const TEINTES_AUTO = [0xf2f2f0, 0xf2f2f0, 0xf2f2f0, 0xdcdddf, 0xb9bcc0, 0x8d9196, 0x55585d, 0x1c1d20, 0x1c1d20, 0x2a3f6b, 0x8c1f24, 0x6f7f8c, 0xcdbf9f, 0x3d5c4a].map((h) => new THREE.Color(h).convertSRGBToLinear()), TAXI = new THREE.Color(0xf2c318).convertSRGBToLinear();
  const circuits = [];
  function circuit(axeX, c, a, b, o, pas, pont) {
    const L = b - a, arc = Math.PI * o, ci = { axeX, c, a, b, o, L, arc, tour: 2 * (L + arc), autos: [], pont: !!pont, kc: Math.round((c - 45) / 90) }, n = Math.max(1, Math.round(ci.tour / pas));
    for (let k = 0; k < n; k++) { const v0 = 8.5 + R() * 4.5; ci.autos.push({ s: (k + 0.15 + 0.7 * R()) * ci.tour / n, v: v0, v0, t: R() * 4 | 0, c: R() < 0.035 ? -1 : R() * TEINTES_AUTO.length | 0 }); }
    circuits.push(ci);
  }
  for (let k = -3; k <= 9; k++) { const x = 45 + 90 * k; if (k & 1) { circuit(false, x, -790, 790, 3, 85); circuit(false, x, -790, 790, 6.35, 95); } else circuit(false, x, -790, 790, 1.75, 125); }
  for (let k = -9; k <= 8; k++) { const z = 45 + 90 * k, pont = PONTS_Z.indexOf(z) >= 0, a = pont ? -706 : -219; if (k & 1) { circuit(true, z, a, 880, 3, 85, pont); circuit(true, z, a, 880, 6.35, 95, pont); } else circuit(true, z, a, 880, 1.75, 125); }
  circuit(false, COLLINS, -900, 900, 3, 90); circuit(false, COLLINS, -900, 900, 6.35, 120);
  const nRoulantes = circuits.reduce((n, ci) => n + ci.autos.length, 0);
  /* La place d'une voiture sur son circuit : l'aller, le demi-tour, le retour, le demi-tour */
  const P = { x: 0, z: 0, hx: 0, hz: 1, q: 0, sens: 0 };
  function surCircuit(ci, s) {
    const L = ci.L, arc = ci.arc, o = ci.o; let q, lat, ha, hl; P.sens = 0;
    if (s < L) { q = ci.a + s; lat = o; ha = 1; hl = 0; P.sens = 1; }
    else if (s < L + arc) { const t = (s - L) / o; q = ci.b + o * Math.sin(t); lat = o * Math.cos(t); ha = Math.cos(t); hl = -Math.sin(t); }
    else if (s < 2 * L + arc) { q = ci.b - (s - L - arc); lat = -o; ha = -1; hl = 0; P.sens = -1; }
    else { const t = (s - 2 * L - arc) / o; q = ci.a - o * Math.sin(t); lat = -o * Math.cos(t); ha = -Math.cos(t); hl = Math.sin(t); }
    P.q = q;
    if (ci.axeX) { P.x = q; P.z = ci.c + lat; P.hx = ha; P.hz = hl; } else { P.z = q; P.x = ci.c - lat; P.hz = ha; P.hx = -hl; }   // vers l'est, la droite est au sud (+z) ; vers +z, la droite est à l'ouest
  }
  /* Le feu du prochain carrefour : renvoie la distance à la ligne d'arrêt s'il est rouge, sinon -1 */
  function feuRouge(ci, q, sens, ts) {
    const k = sens > 0 ? Math.floor((q - 45) / 90) + 1 : Math.ceil((q - 45) / 90) - 1;
    if (ci.axeX ? (k < -3 || k > 9) : (k < -9 || k > 8)) return -1;
    const d = (45 + 90 * k - q) * sens - ((k & 1) ? 16.3 : 14.1); if (d < 0) return -1;
    const kx = ci.axeX ? k : ci.kc, kz = ci.axeX ? ci.kc : k, ph = (ts + ((kx * 5 + kz * 3) % 7 + 7) % 7 * 4.86) % 34;
    return (ci.axeX ? ph < 14 : (ph >= 17 && ph < 31)) ? -1 : d;
  }

  garees.sort((a, b) => foyer(a) - foyer(b));
  const matAuto = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.3 });
  const modsAuto = MODELES.voitures || [], nVraiesGarees = modsAuto.length ? Math.min(DETAIL.autosGarees, garees.length) : 0, parType = Math.ceil(DETAIL.autosRoulantes / Math.max(1, modsAuto.length));
  const rA = alea(977), teinteAuto = () => rA() < 0.02 ? TAXI : TEINTES_AUTO[rA() * TEINTES_AUTO.length | 0];
  const vraies = modsAuto.map((mod, k) => {                                                   // un tracé par modèle : d'abord les garées (fixes), puis celles qui roulent près de la tour
    const fixes = []; for (let i = k; i < nVraiesGarees; i += modsAuto.length) fixes.push(garees[i]);
    const m = instances(geoAutoVraie(mod), matAuto, fixes.length + parType); couleurs(m, fixes.length + parType); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fixes.forEach((g, i) => { const c = teinteAuto(); ecrire(m.instanceMatrix.array, i, g.x, g.y, g.z, g.hx, g.hz, 1); m.instanceColor.setXYZ(i, c.r, c.g, c.b); });
    m.count = fixes.length; return { m, fixes: fixes.length, max: fixes.length + parType };
  });
  const nLegGarees = garees.length - nVraiesGarees, legeres = instances(geoAuto(), matAuto, nLegGarees + nRoulantes); couleurs(legeres, nLegGarees + nRoulantes); legeres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < nLegGarees; i++) { const g = garees[nVraiesGarees + i], c = teinteAuto(); ecrire(legeres.instanceMatrix.array, i, g.x, g.y, g.z, g.hx, g.hz, 1); legeres.instanceColor.setXYZ(i, c.r, c.g, c.b); }
  /* Les phares et les feux arrière, la nuit : une tache claire devant, un point rouge derrière, additionnés à l'image */
  const feux = (function () {
    const T = tampon(), blanc = [1, 0.92, 0.76], rouge = [0.95, 0.07, 0.03];
    eventail(T, 0, 0.15, 7, 2.4, 5.5, fois(blanc, 0.5)); eventail(T, 0, 0.5, -2.6, 1.5, 1.1, fois(rouge, 0.8));
    quad(T, [-0.85, 0.45, 2.32, 0.85, 0.45, 2.32, 0.85, 0.9, 2.32, -0.85, 0.9, 2.32], [0, 0, 1], null, blanc); quad(T, [-0.85, 0.5, -2.32, 0.85, 0.5, -2.32, 0.85, 0.9, -2.32, -0.85, 0.9, -2.32], [0, 0, -1], null, rouge);
    const m = instances(geoDe(T), matLum, nRoulantes); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 5; m.visible = false; return m;
  })();
  let nuit = false;
  const R2 = DETAIL.rayonAutos * DETAIL.rayonAutos, compte = vraies.map(() => 0);
  function majAutos(dt, ts) {
    let nL = nLegGarees, nF = 0; for (let k = 0; k < vraies.length; k++) compte[k] = vraies[k].fixes;
    const LA = legeres.instanceMatrix.array, LC = legeres.instanceColor.array, FA = feux.instanceMatrix.array;
    for (const ci of circuits) {
      const A = ci.autos, n = A.length;
      for (let i = 0; i < n; i++) {
        const a = A[i]; surCircuit(ci, a.s);
        if (dt > 0) {
          let cible = a.v0;
          if (n > 1) { let ecart = A[(i + 1) % n].s - a.s; if (ecart <= 0) ecart += ci.tour; ecart -= 5.6; if (ecart < 15) cible = Math.min(cible, Math.max(0, (ecart - 1.5) * 0.9)); }   // on garde ses distances
          if (P.sens !== 0) { const d = feuRouge(ci, P.q, P.sens, ts); if (d >= 0 && d < 45 && d >= a.v * a.v / 11 - 1.5) cible = Math.min(cible, Math.sqrt(Math.max(0, d - 0.4) * 7)); }   // on freine au feu rouge, si on peut encore
          a.v = cible < a.v ? Math.max(cible, a.v - 10 * dt) : Math.min(cible, a.v + 2.4 * dt);
          a.s += a.v * dt; if (a.s >= ci.tour) a.s -= ci.tour;
        }
        const y = SOL + 0.02 + (ci.pont && P.x < RIVE ? hautPont(P.x) : 0), col = a.c < 0 ? TAXI : TEINTES_AUTO[a.c], k = vraies.length ? a.t % vraies.length : -1;
        if (k >= 0 && P.x * P.x + P.z * P.z < R2 && compte[k] < vraies[k].max) { const v = vraies[k], j = compte[k]++; ecrire(v.m.instanceMatrix.array, j, P.x, y, P.z, P.hx, P.hz, 1); v.m.instanceColor.setXYZ(j, col.r, col.g, col.b); }
        else { ecrire(LA, nL, P.x, y, P.z, P.hx, P.hz, 1); LC[3 * nL] = col.r; LC[3 * nL + 1] = col.g; LC[3 * nL + 2] = col.b; nL++; }
        if (nuit) ecrire(FA, nF++, P.x, y, P.z, P.hx, P.hz, 1);
      }
    }
    legeres.count = nL; legeres.instanceMatrix.needsUpdate = true; legeres.instanceColor.needsUpdate = true;
    for (let k = 0; k < vraies.length; k++) { const v = vraies[k]; v.m.count = compte[k]; v.m.instanceMatrix.needsUpdate = true; v.m.instanceColor.needsUpdate = true; }
    feux.count = nF; if (nuit) feux.instanceMatrix.needsUpdate = true;
  }

  // les bateaux : à quai (fixes), et quelques-uns en route sur de grandes boucles, avec leur sillage
  const PROUE = { yacht: 1, voilier: 1 };                                                     // le sens de la proue dans chaque modèle (+z ou -z)
  const flotte = [];
  (function () {
    const r = alea(555);
    for (let k = 0; k < 5; k++) flotte.push({ voilier: false, cx: -425, cz: -100, rx: 30, rz: 800, a: k * 1.26 + r() * 0.5, w: (0.0075 + r() * 0.003), s: 0.55 + r() * 0.45 });             // le chenal de la baie, sous les ponts
    for (let k = 0; k < 3; k++) flotte.push({ voilier: false, cx: -1010 - k * 70, cz: 60, rx: 55, rz: 1050, a: k * 2.1 + r(), w: -(0.006 + r() * 0.003), s: 0.6 + r() * 0.4 });           // au large de la plage
    for (const p of [[-500, -160, 34, 70], [-365, 20, 22, 60], [-490, 300, 28, 80], [-350, -290, 26, 60], [-480, 30, 30, 55], [-545, -300, 25, 70], [-380, 330, 30, 70]]) flotte.push({ voilier: true, cx: p[0], cz: p[1], rx: p[2], rz: p[3], a: r() * 6.283, w: (r() < 0.5 ? -1 : 1) * (0.03 + r() * 0.02), s: 0.9 + r() * 0.5 });
    for (let k = 0; k < 7; k++) flotte.push({ voilier: true, cx: -900 - r() * 380, cz: -700 + r() * 1400, rx: 40 + r() * 50, rz: 60 + r() * 90, a: r() * 6.283, w: (r() < 0.5 ? -1 : 1) * (0.02 + r() * 0.015), s: 0.9 + r() * 0.6 });
  })();
  const matBateau = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide });
  const quaiY = amarres.filter((b) => !b.voilier && b.s >= 0.6), quaiV = amarres.filter((b) => b.voilier), petitsBateaux = amarres.filter((b) => !b.voilier && b.s < 0.6), enRouteY = flotte.filter((b) => !b.voilier), enRouteV = flotte.filter((b) => b.voilier);
  const barques = instances(geoBateau(null, false), matBateau, petitsBateaux.length);       // les petits bateaux des marinas : une coque simple suffit
  petitsBateaux.forEach((b, i) => ecrire(barques.instanceMatrix.array, i, b.x, EAU_Y - 0.15, b.z, b.hx, b.hz, b.s)); barques.count = petitsBateaux.length;
  const yachts = instances(geoBateau(MODELES.bateaux && MODELES.bateaux.yacht, false), matBateau, quaiY.length + enRouteY.length), voiliers = instances(geoBateau(MODELES.bateaux && MODELES.bateaux.voilier, true), matBateau, quaiV.length + enRouteV.length);
  yachts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); voiliers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quaiY.forEach((b, i) => ecrire(yachts.instanceMatrix.array, i, b.x, EAU_Y - 0.25 * b.s, b.z, b.hx * PROUE.yacht, b.hz * PROUE.yacht, b.s));
  quaiV.forEach((b, i) => ecrire(voiliers.instanceMatrix.array, i, b.x, EAU_Y - 0.2, b.z, b.hx * PROUE.voilier, b.hz * PROUE.voilier, 3.2 * b.s));
  yachts.count = quaiY.length + enRouteY.length; voiliers.count = quaiV.length + enRouteV.length;
  const sillages = (function () {                                                             // un triangle clair qui s'élargit et s'éteint derrière le bateau
    const T = tampon(), b = [0.75, 0.8, 0.8], n = [0, 0, 0];
    tri(T, [0, 0, -9, -10, 0, -100, 0, 0, -100], [0, 1, 0], b, n, [0.1, 0.11, 0.11]); tri(T, [0, 0, -9, 0, 0, -100, 10, 0, -100], [0, 1, 0], b, [0.1, 0.11, 0.11], n);
    tri(T, [0, 0, 17, -5.5, 0, -14, 5.5, 0, -14], [0, 1, 0], [0.3, 0.32, 0.32], n, n);
    const m = instances(geoDe(T), new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), flotte.length);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 3; m.count = flotte.length; return m;
  })();
  function majBateaux(dt) {
    let iy = quaiY.length, iv = quaiV.length, n = 0;
    for (const b of flotte) {
      b.a += b.w * dt; const ca = Math.cos(b.a), sa = Math.sin(b.a), x = b.cx + b.rx * ca, z = b.cz + b.rz * sa, sg = b.w < 0 ? -1 : 1; let hx = -b.rx * sa * sg, hz = b.rz * ca * sg; const l = Math.hypot(hx, hz); hx /= l; hz /= l;
      if (b.voilier) { ecrire(voiliers.instanceMatrix.array, iv++, x, EAU_Y - 0.2, z, hx * PROUE.voilier, hz * PROUE.voilier, 1.25 * b.s); ecrire(sillages.instanceMatrix.array, n++, x, EAU_Y + 0.15, z, hx, hz, 0.16 * b.s); }
      else { ecrire(yachts.instanceMatrix.array, iy++, x, EAU_Y - 0.25 * b.s, z, hx * PROUE.yacht, hz * PROUE.yacht, b.s); ecrire(sillages.instanceMatrix.array, n++, x, EAU_Y + 0.15, z, hx, hz, b.s); }
    }
    yachts.instanceMatrix.needsUpdate = voiliers.instanceMatrix.needsUpdate = sillages.instanceMatrix.needsUpdate = true;
  }

  /* ───────────────────────── 10. La vie de la ville, image après image, et les deux ambiances ───────────────────────── */
  let aFaire = true;
  function maj(dt, t) {
    if (calme && !aFaire) return;                                                             // mouvement réduit : tout reste en place
    const pas = calme ? 0 : Math.min(0.05, dt || 0), ts = (t || 0) / 1000; aFaire = false;
    uEau.value.set(ts * 0.0085, ts * 0.0052, -ts * 0.0021, ts * 0.0034);                      // le clapot glisse
    texEcume.offset.y = (ts * 0.03) % 1;                                                      // les rouleaux avancent vers la plage
    majAutos(pas, ts); majBateaux(pas);
  }
  function ambiance(nom, a) {
    nuit = nom === "nuit"; aFaire = true;
    mLum.visible = feux.visible = nuit; mOmbres.visible = !nuit;
    matEau.color.setHex(nuit ? 0x33466b : 0xffffff); matEcume.color.setScalar(nuit ? 0.22 : 1); sillages.material.color.setScalar(nuit ? 0.25 : 1);
    if (!nuit && a && a.dir && Math.abs(a.dir[0] / a.dir[1] - dirOmbres[0] / dirOmbres[1]) + Math.abs(a.dir[2] / a.dir[1] - dirOmbres[2] / dirOmbres[1]) > 0.02) {   // le soleil a bougé : on retrace les ombres
      scene.remove(mOmbres); mOmbres.geometry.dispose(); dirOmbres = a.dir.slice(); mOmbres = maille(tracerOmbres(dirOmbres), matOmbre, 2);
    }
  }
  maj(0, 0);
  return { maj, ambiance };
})();

/* Appelée à chaque image : la circulation, les bateaux, l'eau (rien ne bouge si « calme ») */
function majVille(dt, t) { VILLE.maj(dt, t); }
/* Appelée au changement de thème : lumières de la ville, phares, ombres, couleur de l'eau */
function ambianceVille(nom, a) { VILLE.ambiance(nom, a); }
