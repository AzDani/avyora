/**
 * Le visuel professionnel (D41).
 *
 * Ce que le contrôle vérifie, à 1 440 × 900, 1 280 × 800, 1 024 × 768 (et 768, 390 pour le repli) :
 *   - la barre du haut tient sur UNE ligne : rien ne dépasse de ses 56 px, pas de défilement
 *     horizontal, « Estimer ce plan » entier dans l'écran ; menus Fichier (Nouveau, Plans types,
 *     Mes plans, Enregistrer, Exporter) et Aide (visite, Glossaire, Raccourcis) accessibles
 *     (aria-haspopup / aria-expanded / role=menu, flèches, Échap qui rend le focus, clic ailleurs,
 *     une lettre ne change pas d'outil derrière) ; sous 1 100 px, les libellés deviennent des
 *     icônes nommées (aria-label) ; « Passer Pro » en gratuit seulement ;
 *   - la colonne d'outils tient sans défiler à 1 280 × 800 et 1 024 × 768, libellés uniques et
 *     entiers ;
 *   - aucun emoji dans l'interface (textes, bulles, titres, libellés accessibles, étiquettes du
 *     plan), aucun « ${ » échappé d'un gabarit ;
 *   - étiquettes de pièces : le nom toujours là (jamais la surface seule), jamais sous une cote
 *     intérieure, jamais sur un équipement (plan de l'exemple), dans leur pièce ;
 *   - plancher de 11 px pour tout texte de l'interface (barre, outils, panneau, fenêtres) ; textes
 *     secondaires ≥ 4,5:1 ; le bouton de la vue Travaux n'est plus rouge ;
 *   - segmentés : au-delà de 3 choix ou plus de 2 lignes → liste radio verticale ; aria-pressed ;
 *   - formulaires : l'unité dans le champ, sur la même ligne ; cartes de bibliothèque dans leur
 *     famille ; fiches longues : la décision visible sans défiler, la technique repliée ;
 *   - vue d'ensemble : les pièces avant « Le chantier », qui dit ce qu'il reste à répondre, sans
 *     encart d'erreur ; légende de la vue Travaux dans le DOM ;
 *   - messages : en bas, le temps de les lire ; bulle d'astuce contextuelle, repliée après 7 s ;
 *   - cotes (D46) : un contour cliqué 4 × 3,5 (murs de 20 cm) ou 5 × 4 (60 cm) se cote 4,00 × 3,50
 *     ou 5,00 × 4,00 dedans, 4,40 × 3,90 ou 6,20 × 5,20 dehors, à l'écran et dans le dossier ; la
 *     cote du mur sélectionné n'écrase pas une cote extérieure ;
 *   - D50 : étiquettes et cotes aussi à 768 et 390 (et sur chaque plan type) — jamais l'une sur l'autre,
 *     cotes verticales lues dans le même sens, notes dans l'écran (pastilles au petit zoom) ; rangées
 *     d'épaisseur lisibles, boutons de fiche sur une ligne sans rouge métier, « Fermer » discret, barres
 *     d'Estimer alignées, Mono sur les nombres seulement, visite qui ne couvre pas l'onglet Suivi.
 *
 *   node maquettes/tools/visuel.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/visuel.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet({ larg = 1440, haut = 900, pro = true, mobile = false } = {}) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  await p.evaluateOnNewDocument((pro) => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); } catch {} }, pro);
  await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0" });
  await wait(250);
  await p.evaluate(() => { closeWelcome("sample"); closeModal(); setTool("select"); sel = null; render(); });
  await wait(200);
  return p;
}

/* ═════════ 1. La barre du haut, sur une ligne, à chaque largeur (Pro et gratuit) ═════════ */
for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024]]) for (const pro of [true, false]) {
  const p = await onglet({ larg: L, haut: H, pro });
  const tag = `${L} ${pro ? "Pro" : "gratuit"}`;
  Object.assign(t, await p.evaluate((tag, larg) => {
    const r = {}, top = document.querySelector(".top").getBoundingClientRect();
    const vis = [...document.querySelectorAll(".top > *")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
    const hors = vis.filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.top < top.top - 0.5 || q.bottom > top.bottom + 0.5); });
    r[`barre ${tag} · une ligne : rien ne dépasse de ses ${Math.round(top.height)} px`] = top.height <= 56.5 && !hors.length;
    r[`barre ${tag} · pas de défilement horizontal`] = document.documentElement.scrollWidth <= innerWidth;
    const e = document.getElementById("estBtnTop").getBoundingClientRect();
    r[`barre ${tag} · « Estimer ce plan » entier, sur une ligne`] = e.left >= 0 && e.right <= innerWidth && e.height <= 40 && /Estimer ce plan/.test(document.getElementById("estBtnTop").textContent);
    const ib = [...document.querySelectorAll(".top .ib")].filter((x) => x.getClientRects().length);
    r[`barre ${tag} · aucun bouton sur deux lignes`] = ib.every((x) => x.getBoundingClientRect().height <= 40);
    const pt = document.getElementById("proTop");
    r[`barre ${tag} · « Passer Pro » en gratuit seulement`] = isPro() ? !pt.getClientRects().length : (pt.getClientRects().length > 0 && pt.getAttribute("href") === TARIFS_URL);
    const mb = [...document.querySelectorAll(".top .mbtn")];
    r[`barre ${tag} · menus Fichier et Aide nommés, annoncés comme menus`] = mb.length === 2 && mb.every((x) => x.getAttribute("aria-haspopup") === "menu" && x.getAttribute("aria-expanded") === "false" && x.getAttribute("aria-label") && document.getElementById(x.getAttribute("aria-controls"))?.getAttribute("role") === "menu");
    if (larg <= 1100) r[`barre ${tag} · sous 1 100 px : icônes seules (le nom reste dans aria-label)`] = mb.every((x) => !x.querySelector(".lbl").getClientRects().length && x.getBoundingClientRect().width <= 36);
    else r[`barre ${tag} · libellés « Fichier » et « Aide » visibles`] = mb.every((x) => x.querySelector(".lbl").getClientRects().length > 0);
    if (larg >= 1024) r[`barre ${tag} · le nom du plan n'est pas coupé`] = (() => { const n = document.getElementById("pname"); return n.scrollWidth <= n.clientWidth + 1; })();
    return r;
  }, tag, L));
  await p.close();
}

/* ═════════ 2. Menus : souris et clavier ═════════ */
{
  const p = await onglet({ larg: 1280, haut: 800 });
  await p.click("#fichierBtn"); await wait(80);
  Object.assign(t, await p.evaluate(() => {
    const r = {}, m = document.getElementById("fichierMenu"), it = [...m.querySelectorAll("[role=menuitem]")].map((x) => x.textContent.replace(/\s+/g, " ").trim());
    r["Fichier · s'ouvre au clic, focus sur la 1re entrée"] = !m.hidden && document.getElementById("fichierBtn").getAttribute("aria-expanded") === "true" && document.activeElement.id === "newBtn";
    r["Fichier · Nouveau, Plans types, Mes plans, Enregistrer, Exporter"] = ["Nouveau", "Plans types", "Mes plans", "Enregistrer", "Exporter"].every((k, i) => it[i] && it[i].startsWith(k));
    const q = m.getBoundingClientRect(); r["Fichier · la liste reste dans l'écran"] = q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight;
    return r;
  }));
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("m"); await wait(40);
  t["Fichier · flèches ; une lettre ne change pas d'outil derrière"] = await p.evaluate(() => document.activeElement.id === "plansBtn" && tool === "select");
  await p.keyboard.press("End"); await wait(30);
  t["Fichier · Fin → dernière entrée"] = await p.evaluate(() => document.activeElement.id === "exportBtn");
  await p.keyboard.press("Escape"); await wait(60);
  t["Fichier · Échap ferme et rend le focus au bouton"] = await p.evaluate(() => document.getElementById("fichierMenu").hidden && document.activeElement.id === "fichierBtn");
  await p.keyboard.press("ArrowDown"); await wait(60);
  t["Fichier · flèche bas sur le bouton ouvre la liste"] = await p.evaluate(() => !document.getElementById("fichierMenu").hidden);
  await p.keyboard.press("ArrowRight"); await wait(60);
  t["menus · flèche droite passe au menu Aide"] = await p.evaluate(() => document.getElementById("fichierMenu").hidden && !document.getElementById("aideMenu").hidden);
  Object.assign(t, await p.evaluate(() => {
    const it = [...document.querySelectorAll("#aideMenu [role=menuitem]")].map((x) => x.textContent.replace(/\s+/g, " ").trim());
    return { "Aide · visite (ou guide), Glossaire, Raccourcis": /^(Visite guidée|Guide de démarrage)/.test(it[0]) && it[1].startsWith("Glossaire") && it[2].startsWith("Raccourcis") };
  }));
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await wait(120);
  t["Aide · « Glossaire » ouvre l'Aide sur le glossaire"] = await p.evaluate(() => modaleOuverte()?.id === "m-keys" && !document.getElementById("aideGloss").hidden);
  await p.keyboard.press("Escape"); await wait(80);
  t["Aide · la fenêtre fermée, le focus revient au bouton Aide"] = await p.evaluate(() => document.activeElement.id === "aideBtn");
  Object.assign(t, await p.evaluate(() => {
    openModal("plans"); const q = document.getElementById("fichierBtn").getBoundingClientRect(), au = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    const r = { "menus · la barre passe sous le voile d'une fenêtre ouverte": !!au && !au.closest(".top") }; closeModal(); return r;
  }));
  await p.click("#fichierBtn"); await wait(60); await p.mouse.click(600, 450); await wait(60);
  t["menus · un clic ailleurs ferme"] = await p.evaluate(() => document.getElementById("fichierMenu").hidden && document.getElementById("fichierBtn").getAttribute("aria-expanded") === "false");
  await p.close();
}

/* ═════════ 3. Colonne d'outils ═════════ */
for (const [L, H] of [[1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L, haut: H });
  Object.assign(t, await p.evaluate((larg) => {
    const r = {}, T = document.getElementById("tools"), tb = [...T.querySelectorAll(".tb")];
    r[`outils ${larg} · les ${tb.length} outils tiennent sans défiler`] = T.scrollHeight <= T.clientHeight + 1 && tb.every((x) => x.getBoundingClientRect().bottom <= innerHeight);
    const l = tb.map((x) => x.querySelector("span").textContent.trim());
    r[`outils ${larg} · libellés uniques et entiers`] = new Set(l).size === l.length && tb.every((x) => { const s = x.querySelector("span"); return s.scrollWidth <= x.clientWidth + 1; });
    return r;
  }, L));
  await p.close();
}

/* ═════════ 4. Aucun emoji, aucun gabarit échappé, plancher 11 px, contrastes ═════════ */
{
  const p = await onglet({ larg: 1280, haut: 800 });
  Object.assign(t, await p.evaluate(() => {
    const r = {}, EMO = /[\u{1F000}-\u{1FAFF}☀-➿⬀-⯿⏎▭▴◰◭ℹ️＋]/u;
    const fautes = { emoji: [], gabarit: [], petit: [], pale: [] };
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return [0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), m[3] ?? 1]; };
    /* fond réel : la 1re couleur opaque en remontant ; un dégradé (cartes budget) → on ne sait pas lire, on passe */
    const fond = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const a = cs.backgroundColor.match(/[\d.]+/g).map(Number); if ((a[3] ?? 1) > 0.9) return cs.backgroundColor; } return "rgb(255,255,255)"; };
    const lire = (tag) => {
      const cl = document.body.cloneNode(true); cl.querySelectorAll("script,style").forEach((x) => x.remove());
      const h = cl.innerHTML; if (h.includes("${")) fautes.gabarit.push(tag);
      const attrs = [...document.querySelectorAll("[title],[aria-label],[data-tip],[placeholder]")].filter((x) => x.getClientRects().length).map((x) => [x.title, x.getAttribute("aria-label"), x.dataset.tip, x.placeholder].join(" "));
      const txt = [document.body.innerText, ...attrs].join("\n"); const m = txt.match(EMO); if (m) fautes.emoji.push(tag + " « " + txt.slice(Math.max(0, m.index - 30), m.index + 10).replace(/\s+/g, " ") + " »");
      /* plancher 11 px et contraste des textes de l'interface (le plan dessiné est vérifié à part) */
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const el = n.parentElement; if (!n.textContent.trim() || !el || el.closest("script,style,#tipbox,#glossPop,.flou,.wm,pre,textarea,.devonly,#m-export")) continue;
        if (!el.getClientRects().length) continue; const cs = getComputedStyle(el); if (cs.visibility === "hidden" || +cs.opacity === 0 || el.closest("[aria-hidden=true],[inert]")) continue;
        if (parseFloat(cs.fontSize) < 10.99) fautes.petit.push(tag + " " + parseFloat(cs.fontSize) + "px « " + n.textContent.trim().slice(0, 30) + " »");
        const fd = fond(el); if (!fd) continue;
        const [lf] = lum(cs.color), [lb] = lum(fd), cr = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
        if (cr < 4.5 && !el.closest("button:disabled,[aria-disabled=true],.ib.attente,.bcard.attente,.estimate:disabled,.task.done,.tb.ro,.vlegend i")) fautes.pale.push(tag + " " + cr.toFixed(2) + ":1 « " + n.textContent.trim().slice(0, 30) + " »");
      }
    };
    for (const vue of ["existant", "projet", "final"]) {
      setMode(vue); closeModal(); setTool("select"); sel = null; toitOpen = false; render(); lire(vue);
      const lv = L();
      [...lv.walls.map((w) => ["wall", w.id]), ...lv.openings.map((o) => ["opening", o.id]), ...lv.items.map((i) => ["item", i.id]), ...lv.rooms.map((x) => ["room", x.id])].forEach(([kind, id]) => { sel = { kind, id }; renderPanel(); lire(vue + " " + kind); });
      if (vue !== "final") for (const o of ["mur", "ouverture", "doublage", "equipement", "cote", "mesure", "calque", "texte", "zone"]) { sel = null; setTool(o); lire(vue + " outil " + o); }
      setTool("select"); sel = null; setPanelTab("suivi"); lire(vue + " suivi"); setPanelTab("details");
    }
    showEstimate(); lire("estimer"); closeModal(); openPlansModal(); lire("mes plans"); closeModal(); ouvrirAide("keys"); lire("aide"); closeModal();
    toggleLayersPop(); lire("affichage"); toggleLayersPop();
    const noms = etiquettesVues.map((e) => e.lignes.join(" ")).join(" ");
    r["aucun emoji dans l'interface (textes, bulles, libellés, étiquettes du plan)"] = !fautes.emoji.length && !EMO.test(noms);
    r["aucun gabarit « ${ » échappé dans la page"] = !fautes.gabarit.length;
    r["plancher de 11 px pour tout texte de l'interface"] = !fautes.petit.length;
    r["textes de l'interface ≥ 4,5:1 sur leur fond"] = !fautes.pale.length;
    window.__fautes = fautes;
    return r;
  }));
  const f = await p.evaluate(() => window.__fautes);
  for (const [k, l] of Object.entries(f)) if (l.length) console.log(`    ${k} : ${[...new Set(l)].slice(0, 6).join(" | ")}`);
  await p.close();
}

/* ═════════ 5. Étiquettes de pièces (D50 : aussi à la tablette et au téléphone) ═════════ */
for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]]) for (const vue of ["existant", "projet"]) {
  const p = await onglet({ larg: L, haut: H, mobile: L < 600 });
  Object.assign(t, await p.evaluate((larg, vue) => {
    const r = {}, tag = `étiquettes ${larg} ${nomVue(vue)}`;
    setMode(vue); closeModal(); sel = null; render(); draw();
    const lv = L(), faces = (facesCache[lv.id] || []).filter((f) => f.room), E = etiquettesVues;
    const ch = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    r[`${tag} · une étiquette par pièce, le nom toujours là`] = E.length === faces.length && E.every((e) => e.lignes.length && e.lignes.join(" ").trim().length >= 2 && !/^\d/.test(e.lignes[0]));
    r[`${tag} · le nom jamais tronqué (entier, court connu ou sur deux lignes)`] = E.every((e) => { const j = e.lignes.join(" ").replace(/ \?$/, ""); return j === e.nom || NOM_COURT[e.nom] === j; });
    r[`${tag} · aucune cote intérieure sous une étiquette`] = !cotesVues.some((c) => E.some((e) => ch(c, e.box)));
    /* sur un équipement : au plus un coin de point lumineux dans une toute petite pièce (≤ 15 % de l'étiquette) */
    r[`${tag} · aucune étiquette sur un équipement`] = E.every((e) => obstaclesEtiquettes(lv).reduce((s, o) => { const dx = Math.min(e.box.x + e.box.w, o.x + o.w) - Math.max(e.box.x, o.x), dy = Math.min(e.box.y + e.box.h, o.y + o.h) - Math.max(e.box.y, o.y); return s + (dx > 0 && dy > 0 ? dx * dy : 0); }, 0) <= (larg >= 1000 ? 0.15 : 0.4) * e.box.w * e.box.h); /* D50 : au téléphone et à la tablette, un WC de 40 px de large est rempli de symboles — l'étiquette en couvre au plus 40 % */
    r[`${tag} · chaque étiquette est dans sa pièce`] = E.every((e) => { const f = faces.find((x) => x.room.id === e.id); return f && pointIn(W2(v(e.box.x + e.box.w / 2, e.box.y + e.box.h / 2)), f.polyInt || f.poly); });
    r[`${tag} · deux étiquettes ne se chevauchent pas`] = E.every((a, i) => E.every((b2, j) => i >= j || !ch(a.box, b2.box)));
    /* D50 (cj-qa10, cj-design06, cj-integration05, cj-access03) : les cotes entre elles, les notes, le sens de lecture */
    const C = cotesVues, N = Object.values(textBoxes);
    r[`${tag} · aucune cote intérieure sur une autre`] = C.every((a, i) => C.every((b2, j) => i >= j || !ch(a, b2)));
    r[`${tag} · aucune cote intérieure sur une note`] = !C.some((c) => N.some((n) => ch(c, n)));
    r[`${tag} · cotes verticales lues dans le même sens (depuis la droite)`] = C.filter((c) => Math.abs(Math.sin(c.ang)) > 0.99).every((c) => Math.abs(c.ang + Math.PI / 2) < 1e-6);
    r[`${tag} · aucune étiquette sur une cote extérieure`] = !E.some((e) => boitesChaines.some((c) => ch(e.box, c)));
    r[`${tag} · notes dans l'écran${view.zoom < NOTE_ZOOM ? ", en pastille au petit zoom" : ", entières"}`] = N.length > 0 && N.every((n) => n.x >= 0 && n.y >= 0 && n.x + n.w <= cv.clientWidth && n.y + n.h <= cv.clientHeight) && N.every((n) => (view.zoom < NOTE_ZOOM) === (n.w === 22));
    if (larg === 1440 && vue === "existant") {
      const plaque = lv.items.find((i) => i.type === "plan"), P2 = itemCorners(plaque).map(S), bx = { x: Math.min(...P2.map((q) => q.x)), y: Math.min(...P2.map((q) => q.y)), w: 0, h: 0 }; bx.w = Math.max(...P2.map((q) => q.x)) - bx.x; bx.h = Math.max(...P2.map((q) => q.y)) - bx.y;
      r[`${tag} · exemple : aucune cote sur la plaque de cuisson`] = !C.some((c) => ch(c, bx));
      r[`${tag} · exemple : « 2,90 m » de la cuisine ouverte une seule fois (pas de doublon de part et d'autre de la séparation)`] = C.filter((c) => c.txt === "2,90 m").length === 1;
      const wc = lv.items.find((i) => i.type === "wc");
      r[`${tag} · exemple : aucun point lumineux dans la cuvette des WC`] = !lv.items.some((i) => i.type === "lumiere" && itemContient(wc, lv, v(i.x, i.y)));
    }
    return r;
  }, L, vue));
  await p.close();
}

/* ═════════ 5 bis. D50 · Plans types : étiquettes et cotes lisibles, du bureau au téléphone ═════════ */
for (const [L, H] of [[1440, 900], [768, 1024], [390, 844]]) {
  const p = await onglet({ larg: L, haut: H, mobile: L < 600 });
  Object.assign(t, await p.evaluate((larg) => {
    const r = {}, ch = (a, b2) => a.x < b2.x + b2.w && a.x + a.w > b2.x && a.y < b2.y + b2.h && a.y + a.h > b2.y;
    for (const T of TEMPLATES) {
      closeModal(); state.origine = null; chargerModele(T, null, null); closeModal();
      for (const vue of ["existant", "projet"]) {
        setMode(vue, true); closeModal(); sel = null; fitView(); render(); draw();
        const E = etiquettesVues, C = cotesVues, faces = (facesCache[L().id] || []).filter((f) => f.room), tag = `plan type ${T.name} ${larg} ${nomVue(vue)}`;
        r[`${tag} · étiquettes : une par pièce, aucune sur une autre, centre dans sa pièce`] = E.length === faces.length && E.every((a, i) => E.every((b2, j) => i >= j || !ch(a.box, b2.box))) && E.every((e) => { const f = faces.find((x) => x.room.id === e.id); return f && pointIn(W2(v(e.box.x + e.box.w / 2, e.box.y + e.box.h / 2)), f.polyInt || f.poly); });
        r[`${tag} · cotes : aucune sur une autre ni sous une étiquette`] = C.every((a, i) => C.every((b2, j) => i >= j || !ch(a, b2))) && !C.some((c) => E.some((e) => ch(c, e.box)));
      }
    }
    return r;
  }, L));
  await p.close();
}

/* ═════════ 6. Panneau : segmentés, formulaires, bibliothèque, fiches, vue d'ensemble ═════════ */
{
  const p = await onglet({ larg: 1280, haut: 800 });
  Object.assign(t, await p.evaluate(() => {
    const r = {}, P = document.getElementById("pbody"), lv = L(), segs = [], rows = [], legende = {};
    const relever = () => { P.querySelectorAll("div.seg").forEach((s) => segs.push(s)); P.querySelectorAll(".row").forEach((x) => rows.push(x)); };
    for (const vue of ["existant", "projet"]) {
      setMode(vue); closeModal(); sel = null; render(); relever();
      legende[vue] = document.querySelectorAll("#modes .vlegend span").length;
      [...lv.walls.map((w) => ["wall", w.id]), ...lv.openings.map((o) => ["opening", o.id]), ...lv.items.map((i) => ["item", i.id]), ...lv.rooms.map((x) => ["room", x.id])].forEach(([kind, id]) => { sel = { kind, id }; renderPanel(); relever(); });
      for (const o of ["mur", "doublage", "ouverture", "equipement"]) { sel = null; setTool(o); relever(); } setTool("select");
      const on = document.querySelector("#modes button.on");
      if (vue === "projet") r["vue Travaux · son bouton n'est plus rouge « à créer »"] = !/185,\s*28,\s*28/.test(getComputedStyle(on).backgroundColor);
    }
    r["légende Travaux dans le DOM (3 entrées), absente Avant travaux"] = legende.projet === 3 && legende.existant === 0;
    /* segLisibles s'applique après chaque rendu : on relit les segmentés encore dans la page */
    const vus = segs.filter((s) => document.contains(s));
    sel = null; setMode("projet"); closeModal();
    const w = lv.walls.find((x) => !isVirtual(x) && isExteriorWall(x)); sel = { kind: "wall", id: w.id }; renderPanel();
    const S1 = [...P.querySelectorAll("div.seg")];
    r["segmentés · au-delà de 3 choix : liste radio verticale"] = S1.filter((s) => s.querySelectorAll(":scope>button").length > 3).every((s) => s.classList.contains("stack") && getComputedStyle(s).flexDirection === "column");
    r["segmentés · aucun choix sur plus de 2 lignes"] = S1.filter((s) => !s.classList.contains("stack")).every((s) => [...s.querySelectorAll(":scope>button")].every((x) => x.offsetHeight <= 46));
    r["segmentés · chaque choix dit s'il est pris (aria-pressed)"] = S1.every((s) => [...s.querySelectorAll(":scope>button")].every((x) => x.getAttribute("aria-pressed") === String(x.classList.contains("on"))));
    r["segmentés · sous-titres ≥ 11 px"] = S1.every((s) => [...s.querySelectorAll("small")].every((x) => parseFloat(getComputedStyle(x).fontSize) >= 11));
    r["mur · la décision se voit sans défiler"] = (() => { const d = P.querySelector(".segetat"); return d && d.getBoundingClientRect().bottom <= P.getBoundingClientRect().bottom; })();
    r["mur · épaisseur et alignement repliés (Réglages de dessin)"] = !!P.querySelector('details.plie[data-k="mur-dessin"]:not([open])') && /Position par rapport au trait/.test(P.querySelector('details.plie[data-k="mur-dessin"]').innerHTML);
    const lignes = [...P.querySelectorAll(".row")].filter((x) => x.querySelector("input.fin.n") && !x.querySelector(".miniep")); /* D50 : une rangée de pastilles a sa propre mise en page (contrôlée plus bas) */
    r["formulaires · l'unité dans le champ, sur la même ligne"] = lignes.length > 0 && lignes.every((x) => { const s = x.querySelector(":scope>span"); return s.getBoundingClientRect().height <= 40 && getComputedStyle(s).borderTopWidth !== "0px"; });
    r["formulaires · tous les champs chiffrés font la même largeur"] = new Set(lignes.map((x) => Math.round(x.querySelector(":scope>span").getBoundingClientRect().width))).size === 1;
    /* fenêtre gardée : courte, la technique repliée ; remplacée : la technique ouverte */
    setMode("existant"); closeModal(); delete plisOuverts["op-tech"];
    const o = lv.openings.find((x) => OPENINGS[x.type].cat === "fenetre" && !x.st); sel = { kind: "opening", id: o.id }; renderPanel();
    /* D51 (cj-access10) : + une ligne repliée « Position sur le mur » (placer sans glisser, WCAG 2.5.7) : 900 → 960 px */
    r["fenêtre gardée · fiche courte (≤ 960 px), détails et position repliés"] = P.scrollHeight <= 960 && !!P.querySelector('details.plie[data-k="op-tech"]:not([open])') && !!P.querySelector('details.plie[data-k="op-position"]:not([open])');
    r["fenêtre · la décision se voit sans défiler"] = (() => { const d = P.querySelector(".segetat"); return d && d.getBoundingClientRect().bottom <= P.getBoundingClientRect().bottom; })();
    delete plisOuverts["op-tech"]; setOpeningProp("st", "remplacer"); renderPanel();
    r["fenêtre à remplacer · détails de la menuiserie ouverts"] = !!P.querySelector('details.plie[data-k="op-tech"][open]') && /Vitrage/.test(P.innerHTML);
    undo();
    /* bibliothèques : aucune carte ne déborde */
    for (const o2 of ["ouverture", "equipement"]) { sel = null; setTool(o2); r[`bibliothèque ${o2} · aucun nom coupé (deux lignes au plus, sans points de suspension)`] = [...P.querySelectorAll(".lib2 .it b")].every((x) => x.scrollHeight <= x.clientHeight + 1 && getComputedStyle(x).textOverflow !== "ellipsis"); }
    for (const o2 of ["ouverture", "equipement"]) { sel = null; setTool(o2); const pr = P.getBoundingClientRect(); r[`bibliothèque ${o2} · aucune carte ne déborde`] = [...P.querySelectorAll(".lib2 .it")].every((c) => { const q = c.getBoundingClientRect(); return q.right <= pr.right + 0.5 && c.scrollWidth <= c.clientWidth + 1; }); }
    setTool("select");
    /* vue d'ensemble : les pièces d'abord, puis « Le chantier » qui dit ce qu'il manque */
    sel = null; setMode("existant"); closeModal(); render();
    const h = P.innerHTML, iP = h.indexOf(">Pièces<"), iC = h.indexOf('data-k="chantier"'), iN = h.indexOf('data-k="niveau"');
    r["vue d'ensemble · les pièces, puis le chantier, puis les réglages du niveau"] = iP > 0 && iC > iP && iN > iC;
    const c = chantier(), manque = [!c.bien && "type de bien", !cpValide(c.cp) && "code postal"].filter(Boolean);
    r["le chantier · dit ce qu'il reste à répondre (état réel)"] = P.querySelector('details[data-k="chantier"] summary').textContent.includes(manque.length ? "à compléter : " + manque.join(", ") : "complet");
    r["vue d'ensemble · aucun encart d'erreur rouge sur l'exemple"] = !P.querySelector(".tip.err") && !/#fecaca|#fff5f5/i.test(h);
    return r;
  }));
  await p.close();
}

/* ═════════ 7. Messages et astuce ═════════ */
{
  const p = await onglet({ larg: 1280, haut: 800 });
  Object.assign(t, await p.evaluate(() => {
    const r = {};
    toast("Un message assez long pour vérifier qu'il reste affiché le temps d'être lu, et qu'il ne se pose pas sur le sélecteur de vue ni sur la légende.");
    const q = document.getElementById("toast").getBoundingClientRect(), m = document.getElementById("modes").getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect();
    r["message · en bas du plan, loin du sélecteur de vue"] = q.top > st.top + st.height / 2 && !(q.left < m.right && q.right > m.left && q.top < m.bottom && q.bottom > m.top);
    return r;
  }));
  await wait(4200);
  t["message long · encore affiché après 4 s"] = await p.evaluate(() => document.getElementById("toast").classList.contains("show"));
  Object.assign(t, await p.evaluate(() => {
    const r = {}; setMode("projet"); closeModal();
    const w = L().walls.find((x) => x.type === "cloison" && !x.st); sel = { kind: "wall", id: w.id }; render();
    const h = document.getElementById("hint");
    r["astuce · parle du mur sélectionné (Suppr = à démolir)"] = /Suppr/.test(h.textContent) && /démolir/.test(h.textContent) && /décision de ce mur/.test(h.textContent);
    r["astuce · affichée au changement"] = !h.classList.contains("replie") && !h.hidden;
    return r;
  }));
  await wait(7400);
  t["astuce · repliée en « ? » après 7 s, texte gardé"] = await p.evaluate(() => { const h = document.getElementById("hint"); return h.classList.contains("replie") && h.getBoundingClientRect().width <= 32 && /Suppr/.test(h.textContent); });
  await p.evaluate(() => document.getElementById("hint").click()); await wait(60);
  t["astuce · un clic sur le « ? » la rouvre"] = await p.evaluate(() => !document.getElementById("hint").classList.contains("replie"));
  await p.close();
}

/* ═════════ 8. Téléphone : le bouton Estimer jamais recouvert ═════════ */
{
  const p = await onglet({ larg: 390, haut: 844, mobile: true });
  Object.assign(t, await p.evaluate(() => {
    const r = {}, e = document.getElementById("estBtnTop"), q = e.getBoundingClientRect();
    const au = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    r["téléphone · « Estimer ce plan » entier et cliquable"] = q.left >= 0 && q.right <= innerWidth && (au === e || e.contains(au));
    r["téléphone · pas de menu Fichier (mode chantier), pas de défilement horizontal"] = !document.getElementById("menuFichier").getClientRects().length && document.documentElement.scrollWidth <= innerWidth;
    return r;
  }));
  await p.close();
}

/* ═════════ 9. D46 · Les cotes disent la surface (cj-novice00, cj-design00, cj-qa00) ═════════
   Un premier contour tracé à la souris pose ses murs vers l'extérieur (le trait = la face
   intérieure). 4 × 3,5 cliqués : 14,0 m², et les cotes doivent dire 4,00 × 3,50 dedans, 4,40 × 3,90
   dehors — à l'écran ET dans le dossier exporté. Même chose en murs épais de 60 cm. */
for (const [nom, type, pts, dedans, dehors, aire] of [
  ["murs de 20 cm, 4 × 3,5", "mur", [[0, 0], [4, 0], [4, 3.5], [0, 3.5], [0, 0]], ["4,00", "3,50"], ["4,40", "3,90"], 14],
  ["murs épais de 60 cm, 5 × 4", "porteur", [[0, 0], [5, 0], [5, 4], [0, 4], [0, 0]], ["5,00", "4,00"], ["6,20", "5,20"], 20]]) {
  const p = await onglet({ larg: 1440, haut: 900 });
  await p.evaluate((type) => { newPlan(() => setTool("mur")); wallType = type; view.zoom = 80; view.x = 320; view.y = 220; renderPanel(); draw(); }, type);
  await wait(150);
  for (const [x, y] of pts) {
    const q = await p.evaluate(([x, y]) => { const s = S(v(x, y)); const rc = cv.getBoundingClientRect(); return { x: rc.left + s.x, y: rc.top + s.y }; }, [x, y]);
    await p.mouse.move(q.x, q.y); await wait(40); await p.mouse.click(q.x, q.y); await wait(100);
  }
  await wait(200);
  Object.assign(t, await p.evaluate((nom, dedans, dehors, aire) => {
    const r = {}, lv = L(), f = (facesCache[lv.id] || []).find((x) => x.room);
    const lire = (fn) => { const vus = []; const orig = window.drawDim; window.drawDim = function (a, b2, col) { vus.push({ t: fmt(dist(a, b2)), int: col === "#6d4fc2" }); return orig.apply(this, arguments); }; try { fn(); } finally { window.drawDim = orig; } return vus; };
    setTool("select"); sel = null;
    const ecran = lire(() => draw()), dossier = lire(() => renderLevelImage(0, "existant"));
    const dit = (vus, int, v2) => vus.some((x) => x.int === int && x.t === v2), seul = (vus, int, attendus) => vus.filter((x) => x.int === int).every((x) => attendus.includes(x.t));
    r[`cotes · ${nom} : la pièce se ferme à la souris, ${fmtM2(aire)}`] = !!f && Math.abs(f.areaInt - aire) < 0.05;
    r[`cotes · ${nom} : dedans ${dedans.join(" × ")} à l'écran`] = dedans.every((x) => dit(ecran, true, x)) && seul(ecran, true, dedans);
    r[`cotes · ${nom} : dehors ${dehors.join(" × ")} à l'écran`] = dehors.every((x) => dit(ecran, false, x)) && seul(ecran, false, dehors);
    r[`cotes · ${nom} : les mêmes dans le dossier exporté`] = [...dedans].every((x) => dit(dossier, true, x)) && dehors.every((x) => dit(dossier, false, x)) && seul(dossier, true, dedans) && seul(dossier, false, dehors);
    /* la cote du mur sélectionné ne s'imprime pas sur une cote de chaîne */
    const ch = (a, b2) => a.x < b2.x + b2.w && a.x + a.w > b2.x && a.y < b2.y + b2.h && a.y + a.h > b2.y;
    r[`cotes · ${nom} : la cote du mur sélectionné évite les cotes extérieures`] = lv.walls.every((w) => { sel = { kind: "wall", id: w.id }; draw(); const c = coteLabels.find((x) => x.wallId === w.id); if (!c) return true; const bw = Math.abs(Math.cos(c.ang)) * c.w + Math.abs(Math.sin(c.ang)) * c.h, bh = Math.abs(Math.sin(c.ang)) * c.w + Math.abs(Math.cos(c.ang)) * c.h; return !boitesChaines.some((o) => ch({ x: c.cx - bw / 2, y: c.cy - bh / 2, w: bw, h: bh }, o)); });
    sel = null; draw();
    return r;
  }, nom, dedans, dehors, aire));
  await p.close();
}
/* murs centrés (l'exemple) : la cote intérieure d'une pièce rectangulaire = la boîte de son polygone intérieur */
{
  const p = await onglet({ larg: 1440, haut: 900 });
  Object.assign(t, await p.evaluate(() => {
    setMode("existant"); closeModal(); sel = null; render();
    const lv = L(), faces = (facesCache[lv.id] || []).filter((f) => f.room && f.polyInt && rectDroit(sansAlignes(f.polyInt)));
    return { "cotes · exemple : chaque pièce rectangulaire cotée à ses faces intérieures": faces.length > 0 && faces.every((f) => { const b2 = roomInteriorBox(lv, f), xs = f.polyInt.map((q) => q.x), ys = f.polyInt.map((q) => q.y); return Math.abs(b2.x1 - b2.x0 - (Math.max(...xs) - Math.min(...xs))) < 1e-6 && Math.abs((b2.x1 - b2.x0) * (b2.y1 - b2.y0) - f.areaInt) < 0.05 + 0.02 * f.areaInt; }) };
  }));
  await p.close();
}

/* ═════════ 10. D50 · pastilles d'épaisseur, boutons de fiche, fenêtres, Estimer, visite ═════════ */
for (const [L, H] of [[1440, 900], [1024, 768], [390, 844]]) {
  const p = await onglet({ larg: L, haut: H, mobile: L < 600 });
  Object.assign(t, await p.evaluate((larg) => {
    const r = {}, P = document.getElementById("pbody"), lv = L();
    /* cj-design01, cj-integration02, cj-novice06 : libellé au-dessus, pastilles qui passent à la ligne, rien hors du panneau */
    const pastilles = (tag) => { const pr = P.getBoundingClientRect(), rows = [...P.querySelectorAll(".row")].filter((x) => x.querySelector(".miniep"));
      r[`${larg} · ${tag} : rangée d'épaisseurs lisible (libellé ≥ 40 px, au-dessus des pastilles)`] = rows.length > 0 && rows.every((x) => { const l = x.querySelector("label").getBoundingClientRect(), b0 = x.querySelector(".miniep").getBoundingClientRect(); return l.width >= 40 && l.bottom <= b0.top + 1; });
      r[`${larg} · ${tag} : aucune pastille ni champ hors du panneau`] = rows.every((x) => [...x.querySelectorAll("button,input")].every((b2) => b2.getBoundingClientRect().right <= pr.right + 0.5) && x.scrollWidth <= x.clientWidth + 1); };
    if (larg >= 1000) { setMode("projet", true); closeModal(); setTool("doublage"); pastilles("outil Doublage"); setTool("select"); }
    setMode("projet", true); closeModal(); const wd = lv.walls.find((w) => isoList(w).length); sel = { kind: "wall", id: wd.id }; render(); pastilles("fiche d'un mur doublé");
    /* cj-design04 : boutons sur une ligne, pas de rouge pour un état métier, « Supprimer du plan » en lien */
    const btns = () => [...P.querySelectorAll(".btnrow .ib")].filter((x) => x.getClientRects().length);
    const wc = lv.items.find((i) => i.type === "wc"); sel = { kind: "item", id: wc.id }; render();
    if (larg >= 1000) r[`${larg} · fiche équipement (Travaux) : Pivoter et Dupliquer sur une ligne, sans bouton rouge « À déposer »`] = btns().every((x) => x.offsetHeight <= 40) && /Pivoter/.test(P.textContent) && !P.querySelector(".ib.danger") && !P.querySelector(".lsuppr");
    if (larg < 600) r[`${larg} · téléphone (consultation) : aucun lien « Supprimer du plan » dans les fiches, quelle que soit la vue`] = ["existant", "projet", "final"].every((m) => { setMode(m, true); closeModal(); sel = { kind: "item", id: wc.id }; render(); return !P.querySelector(".lsuppr"); }) && (setMode("projet", true), closeModal(), true);
    const po = lv.openings.find((o) => o.type === "porte"); sel = { kind: "opening", id: po.id }; render();
    if (larg >= 1000) r[`${larg} · fiche porte : « Ouvre de l'autre côté » et « Charnière » jamais sur deux lignes, icônes SVG`] = btns().filter((x) => /Ouvre de l'autre côté|Charnière/.test(x.textContent)).length === 2 && btns().every((x) => x.offsetHeight <= 40 && !/[\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F]/.test(x.textContent));
    if (larg >= 1000) {
      setMode("existant", true); closeModal(); sel = { kind: "item", id: wc.id }; render();
      const ls = P.querySelector(".lsuppr");
      r[`${larg} · Avant travaux : « Supprimer du plan » en lien discret, pas en bouton plein`] = !!ls && /Supprimer du plan/.test(ls.textContent) && getComputedStyle(ls).backgroundColor === "rgba(0, 0, 0, 0)" && !P.querySelector(".ib.danger");
      /* novice09 : la fiche d'un mur en Avant travaux dit l'essentiel, le reste replié */
      delete plisOuverts["mur-avant-surface"]; const wt = lv.walls.find((w) => w.type === "mur" && !isoList(w).length && isExteriorWall(w)); sel = { kind: "wall", id: wt.id }; render(); P.scrollTop = 0;
      r[`${larg} · fiche d'un mur en Avant travaux : isolation et finition extérieure repliées, fiche ≤ 1 400 px (était 1 857)`] = !!P.querySelector('details.plie[data-k="mur-avant-surface"]:not([open])') && P.scrollHeight <= 1400;
    }
    /* D50 : aucun bouton de rangée (.btnrow) coupé, hors de sa rangée ou sur deux lignes — dans toutes les fiches des trois vues et les outils */
    { const bad = new Set(), scan = (tag) => document.querySelectorAll(".btnrow").forEach((row) => { if (!row.getClientRects().length) return; const rr = row.getBoundingClientRect(); row.querySelectorAll(".ib").forEach((x) => { if (!x.getClientRects().length) return; const q = x.getBoundingClientRect(); if (x.scrollWidth > x.clientWidth + 1 || q.right > rr.right + 1 || q.left < rr.left - 1 || x.offsetHeight > 44) bad.add(tag + " : " + x.textContent.trim().slice(0, 30)); }); });
      for (const m of ["existant", "projet", "final"]) { setMode(m, true); closeModal();
        [...lv.walls.map((w) => ["wall", w.id]), ...lv.openings.map((o) => ["opening", o.id]), ...lv.items.map((i) => ["item", i.id]), ...lv.rooms.map((x) => ["room", x.id])].forEach(([kind, id]) => { sel = { kind, id }; renderPanel(); scan(m + " " + kind); });
        if (!isMobile()) for (const o of ["mur", "ouverture", "doublage", "equipement"]) { sel = null; setTool(o); scan(m + " outil " + o); } setTool("select"); }
      r[`${larg} · aucun bouton de rangée coupé ni sur deux lignes (fiches, outils)${bad.size ? " — " + [...bad].slice(0, 3).join(" | ") : ""}`] = bad.size === 0; }
    sel = null; setMode("projet", true); closeModal(); render();
    /* cj-design09 : « Fermer » discret partout ; un seul bouton plein par fenêtre */
    for (const [nom, f] of [["Plans types", () => openTemplates()], ["Mes plans", () => openPlansModal()], ["Estimer", () => showEstimate()], ["Dossier", () => exportPlan()]]) {
      closeModal(); f(); const o = [...document.querySelectorAll(".overlay.show")].pop(), c = o && o.querySelector(".mclose");
      r[`${larg} · fenêtre ${nom} : « Fermer » discret (sans fond), au plus un bouton plein`] = !!c && getComputedStyle(c).backgroundColor === "rgba(0, 0, 0, 0)" && [...o.querySelectorAll(".ib.primary, .mclose.primaire")].filter((x) => x.getClientRects().length).length <= 1;
      if (nom === "Estimer" && larg >= 1000) {
        const xs = [...o.querySelectorAll(".estlot .lb")].filter((x) => x.getClientRects().length).map((x) => Math.round(x.getBoundingClientRect().left));
        r[`${larg} · Estimer (cj-design10) : les barres des corps d'état partent toutes du même x`] = xs.length > 2 && new Set(xs).size === 1;
        r[`${larg} · Estimer : la Mono pour les nombres, pas pour « hors plan », la finition ni « oui / non »`] = [...o.querySelectorAll(".mtable td.n")].filter((x) => /[a-zé]{3,}/i.test(x.textContent) && !/\d/.test(x.textContent)).every((x) => !/Mono/.test(getComputedStyle(x).fontFamily));
        r[`${larg} · Estimer : « Ce que ton plan ne dit pas encore » sans rond de sélection (lignes sans action)`] = [...o.querySelectorAll(".chk.neutre .ci")].every((x) => !x.innerHTML.includes(ICONS.cercle));
      }
      if (nom === "Dossier" && larg < 600) { const m = o.querySelector(".modal").getBoundingClientRect();
        r[`${larg} · dossier au téléphone (cj-integration12) : les chiffres clés restent dans la fenêtre`] = [...o.querySelectorAll(".kpi")].filter((x) => x.getClientRects().length).every((x) => x.getBoundingClientRect().right <= m.right + 0.5); }
    }
    closeModal();
    return r;
  }, L));
  await p.close();
}
/* cj-design07 : la dernière étape de la visite entoure « Estimer » ET l'onglet Suivi, la bulle ne couvre pas l'onglet */
for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const p = await onglet({ larg: L, haut: H });
  await p.evaluate(() => { try { localStorage.removeItem(VISITE_CLE); } catch {} lancerVisite(true); etapeVisite(99); });
  await wait(450);
  Object.assign(t, await p.evaluate((larg) => {
    const r = {}, ch = (a, b2) => a.left < b2.right && a.right > b2.left && a.top < b2.bottom && a.bottom > b2.top;
    const su = document.querySelector('#panel .ptabs[aria-label="Panneau"] button:last-child').getBoundingClientRect(), bu = document.querySelector("#visite .vbulle").getBoundingClientRect(), ha = document.querySelector("#visite .vhalo").getBoundingClientRect();
    r[`visite ${larg} · dernière étape : le halo entoure l'onglet Suivi, la bulle ne le couvre pas`] = ha.left <= su.left && ha.right >= su.right && ha.top <= su.top && ha.bottom >= su.bottom && !ch(bu, su);
    r[`visite ${larg} · dernière étape : boutons sur une ligne, pas de « Passer »`] = [...document.querySelectorAll("#visite .vsuiv")].every((x) => x.offsetHeight <= 40) && ![...document.querySelectorAll("#visite button")].some((x) => /Passer/.test(x.textContent));
    fermerVisite("fait"); return r;
  }, L));
  await p.close();
}

/* ═════════ 11. R6 · La cote d'un mur sélectionné se lit comme les autres (de bas en haut) ═════════
   Un mur vertical tracé de haut en bas écrivait sa longueur de haut en bas, collée à la cote
   intérieure de la pièce qui, elle, se lit de bas en haut (D50) : deux « 3,50 m » tête-bêche. */
{
  const p = await onglet();
  Object.assign(t, await p.evaluate(() => {
    const r = {}, lv = L(); setMode("existant"); closeModal();
    const verticaux = lv.walls.filter((w) => !isVirtual(w) && Math.abs(w.a.x - w.b.x) < 1e-6 && wallLen(w) * view.zoom > 40);
    const lu = (w) => { sel = { kind: "wall", id: w.id }; draw(); const c = coteLabels.find((x) => x.wallId === w.id); return c ? c.ang : null; };
    const angs = verticaux.map(lu);
    /* le même mur, tracé dans l'autre sens */
    const w0 = verticaux[0], a0 = { ...w0.a }; w0.a = { ...w0.b }; w0.b = a0; syncRooms(lv); const inv = lu(w0); w0.b = { ...w0.a }; w0.a = a0; syncRooms(lv);
    r["mur sélectionné · la cote d'un mur vertical se lit de bas en haut, quel que soit le sens du tracé"] = verticaux.length >= 3 && angs.every((a) => a != null && Math.abs(a + Math.PI / 2) < 1e-6) && inv != null && Math.abs(inv + Math.PI / 2) < 1e-6;
    sel = null; draw(); return r;
  }));
  await p.close();
}

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un visuel de produit fini, à toutes les largeurs");
process.exit(echecs.length || errs.length ? 1 : 0);
