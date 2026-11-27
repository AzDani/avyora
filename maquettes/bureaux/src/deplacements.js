/* ── Les déplacements ──
   Une grille par pièce : les meubles y sont des cases interdites. Chaque personnage suit un chemin calculé (A*) puis lissé.
   Trois garanties, vérifiées à chaque pas (et pas seulement au calcul du chemin) :
     1. personne n'entre dans l'emprise d'un meuble, ni ne sort de sa pièce ;
     2. deux personnes ne se chevauchent jamais (un pas qui rapproche de quelqu'un en dessous de la distance minimale est refusé) ;
     3. personne ne reste coincé : qui est bloqué ou piétine cherche un détour, puis change de but, puis s'écarte du groupe.
   On ne marche que là où deux personnes peuvent se croiser, et on contourne d'avance ceux qui sont à l'arrêt.
   La preuve automatique est à la fin du fichier (ajouter ?test=1 à l'adresse). */
const PAS = 0.35;                                                            // la taille d'une case
const CORPS = 0.3;                                                           // le rayon d'un corps : aucun centre ne s'approche plus près d'un meuble
const AISE = 0.12;                                                           // la marge de confort en plus, pour les chemins calculés
const MUR = 0.5;                                                             // la distance gardée avec les cloisons
const ECART = 0.68;                                                          // deux personnes ne s'approchent jamais plus près (de centre à centre)
const TEMOIN = 2;                                                            // toutes les 2 s, on vérifie que chaque marcheur a vraiment avancé (sinon : détour, autre but, puis dégagement)
const CONFORT = 1.15;                                                        // à cette distance, on commence à s'écarter et à ralentir
const stats = { recalculs: 0, causeries: 0, haltes: 0, arrivees: 0, recalages: 0, degagements: 0, pietinements: 0 };
const TEST = { presse: false };                                              // pour la preuve automatique : en « foule pressée », personne ne s'arrête
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* Le point (x, z) est-il dans la pièce, à plus de m de tout meuble ? */
function horsMeuble(q, x, z, m) {
  const b = MUR - (CORPS + AISE - m);
  if (x < q.x0 + b || x > q.x1 - b || z < q.z0 + b || z > q.z1 - b) return false;
  for (const o of q.meubles) if (x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m) return false;
  return true;
}
/* La ligne droite de a à b reste-t-elle à plus de m de tout meuble ? (calcul exact, pas un échantillonnage) */
function segmentLibre(q, a, b, m) {
  if (!horsMeuble(q, a.x, a.z, m) || !horsMeuble(q, b.x, b.z, m)) return false;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const o of q.meubles) {
    let t0 = 0, t1 = 1, dehors = false;
    if (Math.abs(dx) < 1e-9) dehors = a.x <= o.x0 - m || a.x >= o.x1 + m;
    else { let u = (o.x0 - m - a.x) / dx, w = (o.x1 + m - a.x) / dx; if (u > w) { const s = u; u = w; w = s; } t0 = Math.max(t0, u); t1 = Math.min(t1, w); dehors = t0 >= t1; }
    if (dehors) continue;
    if (Math.abs(dz) < 1e-9) dehors = a.z <= o.z0 - m || a.z >= o.z1 + m;
    else { let u = (o.z0 - m - a.z) / dz, w = (o.z1 + m - a.z) / dz; if (u > w) { const s = u; u = w; w = s; } t0 = Math.max(t0, u); t1 = Math.min(t1, w); dehors = t0 >= t1; }
    if (!dehors) return false;
  }
  return true;
}
/* La ligne de a à b passe-t-elle à moins de r d'une des personnes de la liste ? */
function croiseGens(a, b, liste, r) {
  const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
  for (const o of liste) { const t = L2 > 1e-9 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / L2)) : 0; if (Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) < r) return true; }
  return false;
}

function grille(q) {
  const nx = Math.floor((q.x1 - q.x0) / PAS), nz = Math.floor((q.z1 - q.z0) / PAS), libre = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) libre[j * nx + i] = horsMeuble(q, q.x0 + (i + 0.5) * PAS, q.z0 + (j + 0.5) * PAS, CORPS + AISE) ? 1 : 0;
  // pas de passage à une seule file : une case ne compte que si elle fait partie d'un carré de 2 × 2 cases libres.
  // Partout où l'on marche, deux personnes peuvent donc se croiser (c'est ce qui évite les bouchons entre un meuble et un mur).
  const brut = libre.slice(), carre = (i, j) => i >= 0 && j >= 0 && i + 1 < nx && j + 1 < nz && brut[j * nx + i] && brut[j * nx + i + 1] && brut[(j + 1) * nx + i] && brut[(j + 1) * nx + i + 1];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (brut[j * nx + i] && !(carre(i, j) || carre(i - 1, j) || carre(i, j - 1) || carre(i - 1, j - 1))) libre[j * nx + i] = 0;
  // on ne garde que la plus grande zone d'un seul tenant : pas de personnage enfermé dans un recoin
  const zone = new Int32Array(nx * nz).fill(-1); let meilleure = -1, taille = 0, n = 0;
  for (let d = 0; d < nx * nz; d++) { if (!libre[d] || zone[d] >= 0) continue; const pile = [d]; zone[d] = n; let t = 0;
    while (pile.length) { const c = pile.pop(); t++; const ci = c % nx, cj = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue; const v = j * nx + i; if (libre[v] && zone[v] < 0) { zone[v] = n; pile.push(v); } } }
    if (t > taille) { taille = t; meilleure = n; } n++; }
  const cases = []; for (let d = 0; d < nx * nz; d++) { if (zone[d] !== meilleure) libre[d] = 0; else cases.push(d); }
  const g = { nx, nz, libre, cases, q, haltes: [] };
  // les haltes : les cases au bord d'un meuble (on s'y arrête, tourné vers lui) ou devant la façade vitrée (on regarde Miami)
  for (const c of cases) { const m = centre(g, c); let pres = null, dm = CORPS + AISE + PAS * 0.8;
    for (const o of q.meubles) { if (o.perso) continue; const px = Math.max(o.x0, Math.min(o.x1, m.x)), pz = Math.max(o.z0, Math.min(o.z1, m.z)), d = Math.hypot(px - m.x, pz - m.z); if (d < dm) { dm = d; pres = { c, x: px, z: pz }; } }
    if (pres) g.haltes.push(pres);
    else if (q.z0 <= -14.9 && m.z < q.z0 + MUR + PAS) g.haltes.push({ c, x: m.x, z: m.z - 10, vue: true });
    else if (q.x0 <= -21.9 && m.x < q.x0 + MUR + PAS) g.haltes.push({ c, x: m.x - 10, z: m.z, vue: true });
    else if (q.x1 >= 21.9 && m.x > q.x1 - MUR - PAS) g.haltes.push({ c, x: m.x + 10, z: m.z, vue: true });
    else if (q.z1 >= 15.9 && m.z > q.z1 - MUR - PAS) g.haltes.push({ c, x: m.x, z: m.z + 10, vue: true }); }
  return g;
}
function centre(g, c) { return { x: g.q.x0 + ((c % g.nx) + 0.5) * PAS, z: g.q.z0 + (((c / g.nx) | 0) + 0.5) * PAS }; }
/* La case libre la plus proche d'un point, qu'on peut rejoindre en ligne droite sans toucher un meuble (-1 s'il n'y en a pas) */
function caseProche(g, x, z, accepte) {
  let mieux = -1, dm = Infinity; const ici = { x, z };
  for (const c of g.cases) { const m = centre(g, c), d = Math.hypot(m.x - x, m.z - z); if (d >= dm) continue; if (accepte && !accepte(m, d)) continue; if (d > 0.01 && !segmentLibre(g.q, ici, m, CORPS - 0.03)) continue; dm = d; mieux = c; }
  return mieux;
}
/* Le plus court chemin de la case a à la case b (A*). barre : les cases prises par d'autres personnes, s'il faut les contourner. */
function chemin(g, a, b, barre) {
  const N = g.nx * g.nz, vient = new Int32Array(N).fill(-1), cout = new Float32Array(N).fill(Infinity), f = new Float32Array(N).fill(Infinity), ferme = new Uint8Array(N);
  const bi = b % g.nx, bj = (b / g.nx) | 0, h = (c) => Math.hypot((c % g.nx) - bi, ((c / g.nx) | 0) - bj);
  const ok = (v) => g.libre[v] && !(barre && barre[v]);
  const ouvert = [a]; cout[a] = 0; f[a] = h(a); let trouve = a === b;
  while (ouvert.length && !trouve) {
    let k = 0; for (let i = 1; i < ouvert.length; i++) if (f[ouvert[i]] < f[ouvert[k]]) k = i;
    const c = ouvert.splice(k, 1)[0]; if (c === b) { trouve = true; break; } if (ferme[c]) continue; ferme[c] = 1; const ci = c % g.nx, cj = (c / g.nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
      const v = j * g.nx + i; if (!ok(v) || ferme[v]) continue; if (di && dj && (!ok(cj * g.nx + i) || !ok(j * g.nx + ci))) continue;   // pas de coin coupé
      const nc = cout[c] + (di && dj ? 1.4142 : 1); if (nc < cout[v]) { if (cout[v] === Infinity) ouvert.push(v); cout[v] = nc; vient[v] = c; f[v] = nc + h(v); }
    }
  }
  if (!trouve) return null;
  const pts = []; for (let c = b; c !== -1; c = vient[c]) { pts.push(centre(g, c)); if (c === a) break; } pts.reverse();
  return pts;
}

/* Les pièces : leurs meubles, leurs occupants, leur grille */
function preparer(q) {
  q.meubles = obstacles.filter((o) => o.x1 > q.x0 && o.x0 < q.x1 && o.z1 > q.z0 && o.z0 < q.z1);
  q.gens = persos.filter((p) => p.piece === q); q.grille = grille(q);
}
const ZONES = PIECES.concat(typeof COULOIRS !== "undefined" ? COULOIRS : []);   // les pièces et les couloirs : partout où l'on marche
for (const q of ZONES) preparer(q);
const dansUnMeuble = (q, p) => { for (const o of q.meubles) if (o.perso !== p && !(o.perso && p.fixe) && p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1) return true; return p.x < q.x0 || p.x > q.x1 || p.z < q.z0 || p.z > q.z1; };

/* La mise en place (toujours la même : hasard reproductible) */
(function placer() {
  const hasard = alea(2611), refaire = new Set();
  const poser = (p, c) => { p.x = c.x; p.z = c.z; p.g.position.x = c.x; p.g.position.z = c.z; };
  const loin = (p, m) => { let d = Infinity; for (const o of p.piece.gens) if (o !== p && o.place) d = Math.min(d, dist(o, m)); return d; };
  // la case libre la plus proche d'un point qui peut être DANS un meuble (un siège) : ici on ne demande pas de ligne droite dégagée
  const voisine = (g, pt, accepte) => { let c = -1, dm = Infinity; for (const k of g.cases) { const m = centre(g, k), d = dist(m, pt); if (d < dm && accepte(m, d)) { dm = d; c = k; } } return c; };
  for (const p of persos) if (p.fixe && !p.debout) p.place = true;
  for (const p of persos) {                                                  // qui ne peut pas s'asseoir (l'ouvrier) se tient debout à côté de son siège, hors de tout meuble
    if (!p.debout) continue; const g = p.piece.grille, siege = { x: p.x, z: p.z }, fx = Math.sin(p.ry), fz = Math.cos(p.ry);
    let c = voisine(g, siege, (m, d) => d > 0.6 && loin(p, m) > 0.9);         // la case libre la plus proche du siège
    if (c < 0) c = voisine(g, siege, (m) => loin(p, m) > ECART);             // pièce très pleine : on accepte plus près
    if (c >= 0) { poser(p, centre(g, c)); const vx = siege.x + fx * 1.6 - p.x, vz = siege.z + fz * 1.6 - p.z; p.g.rotation.y = p.ry = Math.atan2(vx, vz); }   // il regarde ce que regardait le siège (la table, la pièce)
    p.place = true; empriseDe(p, p.x, p.z, 0.55, 0.55); refaire.add(p.piece);
  }
  for (const p of persos) {                                                  // une personne fixe, debout, posée par erreur dans un meuble : on la sort
    if (!p.fixe || p.assis || p.debout || !dansUnMeuble(p.piece, p)) continue;
    const g = p.piece.grille, c = voisine(g, p, (m) => loin(p, m) > 0.9); if (c < 0) continue;
    for (const o of obstacles) if (o.perso === p) { const m = centre(g, c); o.x0 += m.x - p.x; o.x1 += m.x - p.x; o.z0 += m.z - p.z; o.z1 += m.z - p.z; }
    poser(p, centre(g, c)); refaire.add(p.piece);
  }
  for (const q of refaire) preparer(q);
  for (const p of persos) {                                                  // les marcheurs : une case libre, loin des autres
    if (p.fixe) continue; const g = p.piece.grille;
    if (!g.cases.length) { p.fixe = true; p.place = true; continue; }         // aucune place pour marcher dans cette pièce : il reste où il est
    let mieux = null, dm = -1;
    for (let e = 0; e < 40 && dm < 1.5; e++) { const m = centre(g, g.cases[(hasard() * g.cases.length) | 0]), d = loin(p, m); if (d > dm) { dm = d; mieux = m; } }
    poser(p, mieux); p.g.rotation.y = hasard() * 6.283; p.place = true; p.patience = 0.5; p.bloque = 0; p.revoir = 0; p.fuite = 0;
  }
  installerAssis(); poserGens(); if (typeof coifferAssis === "function") coifferAssis();
})();

/* Les autres personnes à contourner, et les cases qu'elles prennent. On contourne toujours ceux qui sont à l'arrêt ;
   avecMarcheurs : aussi ceux qui marchent à moins de 3 m (quand on est bloqué). Une case qui ne nous rapproche pas de quelqu'un
   n'est jamais barrée par lui : on peut toujours s'éloigner. */
function barrer(p, avecMarcheurs) {
  const q = p.piece, g = q.grille, barre = new Uint8Array(g.nx * g.nz), gens = [];
  for (const o of q.gens) { if (o === p || o.fixe || (o.route && !(avecMarcheurs && dist(o, p) <= 3))) continue; gens.push(o);   // (les personnes fixes ont déjà leur emprise, comme un meuble)
    const R = Math.min(ECART + 0.16, dist(o, p));
    const i0 = Math.max(0, Math.floor((o.x - R - q.x0) / PAS)), i1 = Math.min(g.nx - 1, Math.floor((o.x + R - q.x0) / PAS)), j0 = Math.max(0, Math.floor((o.z - R - q.z0) / PAS)), j1 = Math.min(g.nz - 1, Math.floor((o.z + R - q.z0) / PAS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(q.x0 + (i + 0.5) * PAS - o.x, q.z0 + (j + 0.5) * PAS - o.z) < R) barre[j * g.nx + i] = 1; }
  return { barre, gens };
}
/* Tracer la route de p jusqu'à la case c, en contournant les personnes à l'arrêt. avecGens = true : aussi celles qui marchent tout près ;
   avecGens = null : sans s'occuper de personne (pour les essais). Rend faux s'il n'y a pas de passage. */
function tracer(p, c, avecGens) {
  const q = p.piece, g = q.grille, ici = { x: p.x, z: p.z };
  // le départ : la case libre la plus proche qui ne nous rapproche pas d'un voisin collé à nous (sinon le premier pas serait refusé)
  const colles = avecGens === null ? [] : q.gens.filter((o) => o !== p && dist(o, p) < ECART + 0.15);
  let a = colles.length ? caseProche(g, p.x, p.z, (m) => colles.every((o) => dist(o, m) >= dist(o, p) - 0.02)) : -1; if (a < 0) a = caseProche(g, p.x, p.z); if (a < 0) return false;
  const B = avecGens === null ? { barre: new Uint8Array(g.nx * g.nz), gens: [] } : barrer(p, avecGens); B.barre[a] = 0; if (B.barre[c]) return false;
  const pts = chemin(g, a, c, B.barre); if (!pts) return false;
  const tous = [ici].concat(pts), lisse = [ici]; let i = 0;                  // on retire les zigzags : on vise le point le plus loin qu'on peut rejoindre tout droit
  const pres = B.gens.filter((o) => dist(o, p) >= ECART + 0.12), droit = (u, v) => segmentLibre(q, u, v, CORPS + AISE * 0.5) && !croiseGens(u, v, pres, ECART + 0.1);
  while (i < tous.length - 1) { let j = tous.length - 1; while (j > i + 1 && !droit(tous[i], tous[j])) j--; lisse.push(tous[j]); i = j; }
  if (lisse.length < 2) return false;
  p.route = lisse; p.etape = 1; p.but = c; p.retenu = false; p.fuite = 0; return true;
}
/* Un nouveau but : un meuble ou la baie vitrée où s'arrêter, quelqu'un à qui parler, ou simplement ailleurs dans la pièce */
function placePrise(p, m, d) { for (const o of p.piece.gens) { if (o === p) continue; if (dist(o, m) < d) return true; if (o.route && dist(o.route[o.route.length - 1], m) < d) return true; } return false; }
function choisirBut(p, avecGens) {
  const q = p.piece, g = q.grille; if (!g.cases.length) return false;
  if (p.ami && p.ami.attendu === p) p.ami.attendu = null; p.ami = null; p.vise = null; p.regarde = null; if (p.attendu) p.attendu = null;
  for (let essai = 0; essai < 7; essai++) {
    const h = essai < 4 ? Math.random() : 1; let c = -1, vise = null, ami = null;
    if (h < 0.3 && g.haltes.length) { vise = g.haltes[(Math.random() * g.haltes.length) | 0]; c = vise.c; }
    else if (h < 0.55) {                                                     // aller parler à quelqu'un qui ne bouge pas : on s'arrête à un bon mètre, face à lui s'il est assis
      const dispo = q.gens.filter((o) => o !== p && !o.attendu && !o.ami && (o.fixe || (!o.route && o.pause > 1.5 && !o.retenu)));   // (retenu : on l'a déjà fait attendre, il doit d'abord repartir)
      if (dispo.length) { ami = dispo[(Math.random() * dispo.length) | 0]; const ry = ami.g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), autour = [];
        for (const k of g.cases) { const m = centre(g, k), d = dist(m, ami); if (d > 0.9 && d < 1.3 && (!ami.fixe || (m.x - ami.x) * fx + (m.z - ami.z) * fz > 0.45)) autour.push(k); }
        if (autour.length) c = autour[(Math.random() * autour.length) | 0]; else ami = null; }
    }
    if (c < 0) c = g.cases[(Math.random() * g.cases.length) | 0];
    const m = centre(g, c);
    if (dist(m, p) < 1.2 || placePrise(p, m, 0.85)) continue;                // trop près pour être un vrai déplacement, ou la place est prise
    if (!tracer(p, c, avecGens)) continue;
    p.vise = vise; p.ami = ami;
    if (ami && !ami.fixe) { let L = 0; for (let i = 1; i < p.route.length; i++) L += dist(p.route[i - 1], p.route[i]); ami.attendu = p; ami.retenu = true; ami.pause = Math.max(ami.pause, Math.min(14, L / p.v + 3)); }   // il nous attend (jamais plus de 14 s)
    return true;
  }
  return false;
}
/* Arrivé : on s'arrête un moment, tourné vers ce qu'on est venu voir */
function arriver(p) {
  p.route = null; p.bloque = 0; p.palier = 0; p.jalon = null; stats.arrivees++; p.arrivees = (p.arrivees || 0) + 1;
  let duree = 2 + Math.random() * 5; const ouvrier = p.type === "artisan" || p.type === "candidat", o = p.ami;
  if (o) {
    if (o.attendu === p) o.attendu = null; p.ami = null;
    if (dist(o, p) < 1.8 && (o.fixe || !o.route)) { duree = 4 + Math.random() * 6; p.regarde = o; stats.causeries++;
      if (!o.fixe) { o.regarde = p; o.pause = Math.max(o.pause, duree + Math.random()); }
      if (Math.random() < (ouvrier ? 0.5 : 0.2)) geste(p, ouvrier ? "salut" : "applaudit", 1); }
  } else if (p.vise) { p.regarde = p.vise; duree = 3 + Math.random() * 5; stats.haltes++;
    if (ouvrier && !p.vise.vue && Math.random() < 0.7) duree = Math.max(duree, geste(p, "bricole", 2 + ((Math.random() * 3) | 0)) + 0.4);         // l'artisan s'affaire sur l'établi
  } else if (p.type === "visiteur" && Math.random() < 0.08) geste(p, "applaudit", 1);
  p.vise = null; p.pause = TEST.presse ? 0.05 : duree;
}
/* Sécurité : quelqu'un se retrouve trop près d'un meuble (ne devrait jamais arriver) → il repart de la case libre la plus proche */
function recaler(p) {
  const g = p.piece.grille; let mieux = -1, dm = Infinity;
  for (const c of g.cases) { const m = centre(g, c), d = dist(m, p); if (d < dm && !p.piece.gens.some((o) => o !== p && dist(o, m) < ECART)) { dm = d; mieux = c; } }
  if (mieux >= 0) { const m = centre(g, mieux); p.x = m.x; p.z = m.z; } p.route = null; p.pause = 0.4; p.vit = 0; stats.recalages++;
}

/* Le dégagement : la règle de dernier recours, celle qui défait toujours un bouchon. Qui est bloqué sans détour possible s'écarte
   du groupe pendant une seconde ou deux : ceux du bord ont toujours une issue, ceux du milieu attendent qu'ils soient partis. */
const fuites = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5];
function degager(p) { p.route = null; p.jalon = null; p.palier = 0; if (p.ami && p.ami.attendu === p) p.ami.attendu = null; p.ami = null; p.vise = null; p.regarde = null; p.fuite = 0.9 + Math.random() * 0.9; p.pause = 0.2 + Math.random() * 0.8; stats.degagements++; }
function reculer(p, dt, tourner) {
  const q = p.piece; let rx = 0, rz = 0;
  for (const o of q.gens) { if (o === p) continue; const ox = p.x - o.x, oz = p.z - o.z, d = Math.hypot(ox, oz); if (d < 1.7 && d > 1e-6) { rx += ox / (d * d); rz += oz / (d * d); } }
  const n = Math.hypot(rx, rz); p.fuite -= dt;
  if (n < 0.3) { p.fuite = 0; return; }                                      // plus personne autour : c'est dégagé
  rx /= n; rz /= n; p.vit += Math.max(-4 * dt, Math.min(2.5 * dt, p.v * 0.75 - p.vit)); const pas = p.vit * dt;
  for (const an of fuites) {
    const c = Math.cos(an), s = Math.sin(an), dx = rx * c + rz * s, dz = rz * c - rx * s, nx = p.x + dx * pas, nz = p.z + dz * pas;
    if (!horsMeuble(q, nx, nz, CORPS)) continue;
    let ok = true; for (const o of q.gens) { if (o === p) continue; const nd = Math.hypot(o.x - nx, o.z - nz); if (nd < ECART && nd < Math.hypot(o.x - p.x, o.z - p.z) + 1e-5) { ok = false; break; } }
    if (!ok) continue;
    p.x = nx; p.z = nz; p.g.position.x = nx; p.g.position.z = nz; tourner(Math.atan2(dx, dz), 7); return;
  }
  p.vit = 0;                                                                 // enfermé pour l'instant : il attend que ses voisins s'écartent
}

/* Débloquer : d'abord un détour autour des gens, puis un autre but, enfin le dégagement. Chaque nouvel échec monte d'un palier. */
function debloquer(p) {
  stats.recalculs++; p.recalculs = (p.recalculs || 0) + 1; p.bloque = 0; p.patience = 0.35 + Math.random() * 0.6;
  const fin = p.route && p.route[p.route.length - 1], palier = p.palier || 0; p.palier = palier + 1;
  if (fin && dist(fin, p) < 1.3) { arriver(p); return; }                     // presque arrivé et la place est prise : on s'arrête là
  if (palier === 0 && p.but != null && tracer(p, p.but, true)) return;
  if (palier <= 1 && choisirBut(p, true)) return;
  degager(p);
}
/* Un pas de temps pour un marcheur */
const essais = [0, 0.6, -0.6, 1.2, -1.2, 1.75, -1.75];                         // les écarts tentés (en radians) quand la voie directe est prise
function avancer(p, dt) {
  const q = p.piece, g = p.g;
  if (!horsMeuble(q, p.x, p.z, CORPS - 0.04)) recaler(p);
  const tourner = (cap, k) => { let da = cap - g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); g.rotation.y += da * Math.min(1, dt * k); return da; };
  if (!p.route && p.fuite > 0) { reculer(p, dt, tourner); return; }
  if (!p.route) {                                                            // à l'arrêt : on se tourne vers son interlocuteur, on attend, puis on repart
    p.vit = Math.max(0, p.vit - 4 * dt);
    if (p.regarde) tourner(Math.atan2(p.regarde.x - p.x, p.regarde.z - p.z), 5);
    p.pause -= dt; p.jalon = null;
    if (p.pause <= 0) {                                                      // entouré de gens à l'arrêt, il ne trouve aucun chemin : au troisième essai il se lance quand même (les contrôles de chaque pas restent)
      if (choisirBut(p, p.echecs >= 2 ? null : false)) p.echecs = 0; else { p.echecs = (p.echecs || 0) + 1; p.pause = 0.5 + Math.random(); }
    }
    return;
  }
  let but = p.route[p.etape], d = dist(but, p);
  const dernier = p.etape === p.route.length - 1;
  if (dernier ? d < 0.06 : d < 0.24 && segmentLibre(q, p, p.route[p.etape + 1], CORPS + 0.02) || d < 0.05) {   // on arrondit les angles quand la suite est dégagée
    if (dernier) { arriver(p); return; }
    p.etape++; but = p.route[p.etape]; d = dist(but, p);
  }
  const ux = (but.x - p.x) / (d || 1), uz = (but.z - p.z) / (d || 1); let ax = 0, az = 0, gene = 0, cote = 1;
  for (const o of q.gens) {                                                  // les voisins qui marchent : on s'écarte tôt, toujours du même côté (comme sur un trottoir), et on ralentit
    if (o === p || !(o.route || o.fuite > 0)) continue; const ox = o.x - p.x, oz = o.z - p.z, od = Math.hypot(ox, oz); if (od >= CONFORT || od < 1e-6) continue;
    const devant = (ox * ux + oz * uz) / od; if (devant < -0.2) continue;
    const f = Math.min(1, (CONFORT - od) / (CONFORT - ECART)), tr = (ux * oz - uz * ox) / od, s = Math.abs(tr) < 0.2 ? 1 : (tr > 0 ? 1 : -1);
    ax += (uz * s * 1.1 - ox / od * 0.35) * f; az += (-ux * s * 1.1 - oz / od * 0.35) * f; gene = Math.max(gene, f * (devant > 0.5 ? 0.6 : 0.3)); cote = s;
  }
  if (dernier && d < 0.5) ax = az = 0;                                       // tout près du but, on y va droit (le contrôle ci-dessous suffit)
  let vx = ux + ax, vz = uz + az; const n = Math.hypot(vx, vz) || 1; vx /= n; vz /= n;
  const da = tourner(Math.atan2(vx, vz), p.vit > 0.15 ? 8 : 3.5);             // il tourne en douceur (plus lentement à l'arrêt : pas de girouette), et ralentit tant qu'il n'est pas dans l'axe
  let veut = p.v * (1 - gene) * Math.max(0.15, Math.cos(Math.min(1.5, Math.abs(da))));
  if (dernier && d < 0.6) veut *= Math.max(0.35, d / 0.6);                   // il freine en arrivant
  p.vit += Math.max(-4 * dt, Math.min(2.5 * dt, veut - p.vit));
  const pas = Math.min(d, p.vit * dt);
  let fait = false;
  for (let e = 0; e < essais.length && !fait; e++) {
    const an = essais[e] * cote, c = Math.cos(an), s = Math.sin(an), bx = e ? ux : vx, bz = e ? uz : vz, nx = p.x + (bx * c + bz * s) * pas, nz = p.z + (bz * c - bx * s) * pas;
    if (!horsMeuble(q, nx, nz, CORPS)) continue;
    let ok = true; for (const o of q.gens) { if (o === p) continue; const nd = Math.hypot(o.x - nx, o.z - nz); if (nd < ECART && nd < Math.hypot(o.x - p.x, o.z - p.z) + 1e-5) { ok = false; break; } }
    if (!ok) continue;
    p.x = nx; p.z = nz; fait = true; if (e || gene) p.devie = true;
  }
  if (fait) p.bloque = Math.max(0, p.bloque - dt * 0.5); else { p.vit = 0; p.bloque += dt; }
  g.position.x = p.x; g.position.z = p.z;
  p.revoir -= dt;
  if (p.revoir <= 0) {                                                       // trois fois par seconde : la suite du chemin est-elle toujours praticable ? Sinon on le recalcule tout de suite.
    p.revoir = 0.3; let refaire = p.devie && fait && !segmentLibre(q, p, but, CORPS);                             // après un écart, un meuble cache le prochain point
    if (!refaire) for (const o of q.gens) {                                  // quelqu'un s'est arrêté sur le chemin
      if (o === p || o.fixe || o.route || o.fuite > 0) continue; const od = dist(o, p); if (od > 2.5) continue;
      if (od < ECART + 0.12 ? ((o.x - p.x) * ux + (o.z - p.z) * uz) / od > 0.35 : croiseGens(p, d > 2.5 ? { x: p.x + ux * 2.5, z: p.z + uz * 2.5 } : but, [o], ECART + 0.06)) { refaire = true; break; }
    }
    if (refaire) { stats.recalculs++; if (!tracer(p, p.but, false) && !choisirBut(p, false)) { p.route = null; p.pause = 0.3 + Math.random() * 0.5; return; } p.revoir = 0.6; }
    else if (!gene) p.devie = false;
  }
  if (p.route) {                                                             // le témoin d'avancée : en 2 secondes de marche, on doit s'être déplacé d'au moins 45 cm. Sinon on piétine : même règle.
    if (!p.jalon) p.jalon = { t: 0, x: p.x, z: p.z };                        // (après un premier échec, on revérifie plus vite : 1,2 s)
    const delai = p.palier ? 1.2 : TEMOIN; p.jalon.t += dt; if (p.jalon.t >= delai) { const fait2 = dist(p.jalon, p); p.jalon = null; if (fait2 < 0.225 * delai) { stats.pietinements++; debloquer(p); return; } p.palier = 0; }
  } else p.jalon = null;
  if (p.route && p.bloque > p.patience) debloquer(p);                        // bloqué net : la même règle, sans attendre
}

/* Chaque image (appelé par la boucle) : les déplacements, puis les mouvements du corps */
function avancerGens(dt) { for (const p of persos) if (!p.fixe) avancer(p, dt); }
function majGens(dt) { if (calme) return; avancerGens(dt); animerGens(dt); if (typeof majOmbres === "function") majOmbres(); }   // (majOmbres : la tache d'ombre qui suit chacun, voir « Le ciel »)

/* ── La preuve automatique (?test=1) : rien n'est affiché, on fait seulement avancer la simulation à pas fixe (1/30 s).
      1. 120 secondes de vie normale ;  2. 120 secondes de « foule pressée » (personne ne s'arrête jamais) ;
      3. des face-à-face forcés (deux marcheurs échangent leurs places) ;  4. des mêlées (tous les marcheurs d'une pièce serrés au même endroit).
      Partout, dansUnMeuble et chevauchements doivent valoir 0, et personne ne doit rester coincé. ── */
if (/[?&]test=1/.test(location.search)) window.__rapport = async function () {
  const dt = 1 / 30, marcheurs = persos.filter((p) => !p.fixe);
  const libre = (p) => { p.route = null; p.fuite = 0; p.regarde = null; p.attendu = null; p.ami = null; p.vise = null; p.retenu = false; p.bloque = 0; p.vit = 0; };
  const manche = (secondes) => {
    const R = { pas: Math.round(secondes / dt), personnes: persos.length, dansUnMeuble: 0, chevauchements: 0, bloques: 0 }, depart = marcheurs.map((p) => ({ x: p.x, z: p.z })), loin = marcheurs.map(() => 0), parcouru = marcheurs.map(() => 0);
    let ecartMin = Infinity, margeMin = Infinity, surPlace = 0; const avant = Object.assign({}, stats), ancre = marcheurs.map((p) => ({ x: p.x, z: p.z, t: 0 })); marcheurs.forEach((p) => { p.arrivees = 0; });
    for (let n = 0; n < R.pas; n++) {
      const ou = marcheurs.map((p) => ({ x: p.x, z: p.z })); avancerGens(dt);
      marcheurs.forEach((p, i) => { parcouru[i] += dist(p, ou[i]); loin[i] = Math.max(loin[i], dist(p, depart[i]));
        const a = ancre[i]; if (!p.route || dist(a, p) > 0.4) { a.x = p.x; a.z = p.z; a.t = 0; } else { a.t += dt; surPlace = Math.max(surPlace, a.t); } });   // en route, mais sans s'éloigner de 40 cm : il piétine
      for (const p of persos) {
        if (!p.assis && dansUnMeuble(p.piece, p)) R.dansUnMeuble++;
        if (!p.fixe) for (const o of p.piece.meubles) { const px = Math.max(o.x0, Math.min(o.x1, p.x)), pz = Math.max(o.z0, Math.min(o.z1, p.z)); margeMin = Math.min(margeMin, Math.hypot(px - p.x, pz - p.z)); }
        let pres = Infinity; for (const o of persos) if (o !== p) pres = Math.min(pres, dist(o, p)); if (pres < 0.35) R.chevauchements++; ecartMin = Math.min(ecartMin, pres);
      }
    }
    R.bloques = loin.filter((d) => d < 0.05).length;
    R.marcheurs = marcheurs.length; R.assis = persos.filter((p) => p.assis).length; R.deboutFixes = persos.filter((p) => p.fixe && !p.assis).length;
    R.ecartMinEntreDeux = +ecartMin.toFixed(3); R.margeMinAuxMeubles = +margeMin.toFixed(3); R.pireSurPlaceEnRoute = +surPlace.toFixed(1);
    R.metresParMarcheur = +(parcouru.reduce((a, b) => a + b, 0) / Math.max(1, marcheurs.length)).toFixed(1); R.metresMin = +Math.min.apply(null, parcouru.concat([1e9])).toFixed(1);
    R.arriveesMin = Math.min.apply(null, marcheurs.map((p) => p.arrivees).concat([1e9]));
    for (const k in stats) R[k] = stats[k] - avant[k];
    return R;
  };
  const normal = manche(120);
  TEST.presse = true; for (const p of marcheurs) p.pause = 0; const presse = manche(120); TEST.presse = false;
  // les face-à-face : deux marcheurs d'une même pièce échangent leurs places. Réussi = chacun finit à sa place (ou juste à côté si elle est prise) ;
  // sinon l'un des deux a préféré changer de but (détour impossible) : ce n'est pas une faute, tant que personne ne se touche.
  const duel = { paires: 0, reussies: 0, finies: 0, chevauchements: 0, dansUnMeuble: 0 };
  for (const q of PIECES) { const m = q.gens.filter((p) => !p.fixe); if (m.length < 2) continue;
    for (let k = 0; k + 1 < m.length; k += 2) { const a = m[k], b = m[k + 1], ga = q.grille, ca = caseProche(ga, a.x, a.z), cb = caseProche(ga, b.x, b.z); if (ca < 0 || cb < 0 || ca === cb) continue;
      for (const o of m) { libre(o); o.pause = 1e6; }
      a.pause = b.pause = 0; if (!tracer(a, cb, null) || !tracer(b, ca, null)) continue;
      duel.paires++; const A = centre(ga, cb), Bm = centre(ga, ca); let ok = true, fini = false;
      for (let n = 0; n < 60 / dt && !fini; n++) { avancer(a, dt); avancer(b, dt); if (dist(a, b) < 0.35) { duel.chevauchements++; ok = false; } if (dansUnMeuble(q, a) || dansUnMeuble(q, b)) { duel.dansUnMeuble++; ok = false; }
        if (!a.route && !(a.fuite > 0)) a.pause = 1e6; if (!b.route && !(b.fuite > 0)) b.pause = 1e6; fini = !a.route && !b.route && !(a.fuite > 0) && !(b.fuite > 0); }
      if (fini) duel.finies++; if (ok && fini && dist(a, A) < 1.6 && dist(b, Bm) < 1.6) duel.reussies++;
      for (const o of m) o.pause = Math.random() * 2; } }
  // les mêlées : tous les marcheurs d'une pièce sont serrés au plus près (à peine plus que la distance minimale) autour d'un même point, puis chacun repart, pressé.
  // En 40 secondes, chacun doit s'être éloigné d'au moins 1,5 m de sa place dans le tas, sans toucher personne.
  const melee = { pieces: 0, personnes: 0, coinces: 0, chevauchements: 0, dansUnMeuble: 0, degagements: 0, ou: [] }; TEST.presse = true;
  for (const q of PIECES) { const m = q.gens.filter((p) => !p.fixe), g = q.grille; if (m.length < 3) continue;
    for (const coin of [0, 1]) {                                             // une fois au milieu de la pièce, une fois dans le recoin le plus étroit (la case la plus loin du milieu)
      const milieu = { x: q.cx, z: q.cz }, tri = g.cases.slice().sort((a, b) => dist(centre(g, a), milieu) - dist(centre(g, b), milieu)), C = centre(g, tri[coin ? tri.length - 1 : 0]);
      tri.sort((a, b) => dist(centre(g, a), C) - dist(centre(g, b), C)); const places = [];
      for (const c of tri) { const mm = centre(g, c); if (places.every((o) => dist(o, mm) >= ECART + 0.04) && q.gens.every((o) => !o.fixe || dist(o, mm) > 0.7)) places.push(mm); if (places.length === m.length) break; }
      if (places.length < m.length) continue;
      m.forEach((p, i) => { libre(p); p.x = places[i].x; p.z = places[i].z; p.g.position.x = p.x; p.g.position.z = p.z; p.pause = 0; });
      melee.pieces++; melee.personnes += m.length; const loin = m.map(() => 0), avant = stats.degagements;
      for (let n = 0; n < 40 / dt; n++) { for (const p of m) avancer(p, dt);
        m.forEach((p, i) => { loin[i] = Math.max(loin[i], dist(p, places[i])); if (dansUnMeuble(q, p)) melee.dansUnMeuble++; for (const o of q.gens) if (o !== p && dist(o, p) < 0.35) melee.chevauchements++; }); }
      melee.coinces += loin.filter((d) => d < 1.5).length; melee.degagements += stats.degagements - avant;
      if (loin.some((d) => d < 1.5)) melee.ou.push({ piece: q.id, coin, places: places.map((o) => [+o.x.toFixed(2), +o.z.toFixed(2)]), loin: loin.map((d) => +d.toFixed(2)), fin: m.map((p) => [+p.x.toFixed(2), +p.z.toFixed(2), p.route ? "marche" : p.fuite > 0 ? "fuit" : "arret"]) });
    } }
  TEST.presse = false; for (const p of marcheurs) { libre(p); p.pause = Math.random() * 2; }
  return Object.assign({}, normal, { foulePressee: presse, faceAFace: duel, melees: melee });
};
/* Pour les contrôles (?diag=1) : la troupe est rendue visible depuis la console, rien d'autre ne change */
if (/[?&]diag=1/.test(location.search)) window.__gens = { persos, robots, obstacles, stats, GENS, gabarits, TEST, avancerGens, avancer, choisirBut, tracer, caseProche, horsMeuble, segmentLibre, centre, animerGens };
