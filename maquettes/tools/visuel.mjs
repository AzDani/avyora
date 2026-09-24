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
 *   - messages : en bas, le temps de les lire ; bulle d'astuce contextuelle, repliée après 7 s.
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

/* ═════════ 5. Étiquettes de pièces ═════════ */
for (const [L, H] of [[1440, 900], [1280, 800], [1024, 768]]) for (const vue of ["existant", "projet"]) {
  const p = await onglet({ larg: L, haut: H });
  Object.assign(t, await p.evaluate((larg, vue) => {
    const r = {}, tag = `étiquettes ${larg} ${nomVue(vue)}`;
    setMode(vue); closeModal(); sel = null; render(); draw();
    const lv = L(), faces = (facesCache[lv.id] || []).filter((f) => f.room), E = etiquettesVues;
    const ch = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    r[`${tag} · une étiquette par pièce, le nom toujours là`] = E.length === faces.length && E.every((e) => e.lignes.length && e.lignes.join(" ").trim().length >= 2 && !/^\d/.test(e.lignes[0]));
    r[`${tag} · le nom jamais tronqué (entier, court connu ou sur deux lignes)`] = E.every((e) => { const j = e.lignes.join(" ").replace(/ \?$/, ""); return j === e.nom || NOM_COURT[e.nom] === j; });
    r[`${tag} · aucune cote intérieure sous une étiquette`] = !cotesVues.some((c) => E.some((e) => ch(c, e.box)));
    /* sur un équipement : au plus un coin de point lumineux dans une toute petite pièce (≤ 15 % de l'étiquette) */
    r[`${tag} · aucune étiquette sur un équipement`] = E.every((e) => obstaclesEtiquettes(lv).reduce((s, o) => { const dx = Math.min(e.box.x + e.box.w, o.x + o.w) - Math.max(e.box.x, o.x), dy = Math.min(e.box.y + e.box.h, o.y + o.h) - Math.max(e.box.y, o.y); return s + (dx > 0 && dy > 0 ? dx * dy : 0); }, 0) <= 0.15 * e.box.w * e.box.h);
    r[`${tag} · chaque étiquette est dans sa pièce`] = E.every((e) => { const f = faces.find((x) => x.room.id === e.id); return f && pointIn(W2(v(e.box.x + e.box.w / 2, e.box.y + e.box.h / 2)), f.polyInt || f.poly); });
    r[`${tag} · deux étiquettes ne se chevauchent pas`] = E.every((a, i) => E.every((b2, j) => i >= j || !ch(a.box, b2.box)));
    return r;
  }, L, vue));
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
    const lignes = [...P.querySelectorAll(".row")].filter((x) => x.querySelector("input.fin.n"));
    r["formulaires · l'unité dans le champ, sur la même ligne"] = lignes.length > 0 && lignes.every((x) => { const s = x.querySelector(":scope>span"); return s.getBoundingClientRect().height <= 40 && getComputedStyle(s).borderTopWidth !== "0px"; });
    r["formulaires · tous les champs chiffrés font la même largeur"] = new Set(lignes.map((x) => Math.round(x.querySelector(":scope>span").getBoundingClientRect().width))).size === 1;
    /* fenêtre gardée : courte, la technique repliée ; remplacée : la technique ouverte */
    setMode("existant"); closeModal(); delete plisOuverts["op-tech"];
    const o = lv.openings.find((x) => OPENINGS[x.type].cat === "fenetre" && !x.st); sel = { kind: "opening", id: o.id }; renderPanel();
    r["fenêtre gardée · fiche courte (≤ 900 px), détails repliés"] = P.scrollHeight <= 900 && !!P.querySelector('details.plie[data-k="op-tech"]:not([open])');
    r["fenêtre · la décision se voit sans défiler"] = (() => { const d = P.querySelector(".segetat"); return d && d.getBoundingClientRect().bottom <= P.getBoundingClientRect().bottom; })();
    delete plisOuverts["op-tech"]; setOpeningProp("st", "remplacer"); renderPanel();
    r["fenêtre à remplacer · détails de la menuiserie ouverts"] = !!P.querySelector('details.plie[data-k="op-tech"][open]') && /Vitrage/.test(P.innerHTML);
    undo();
    /* bibliothèques : aucune carte ne déborde */
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

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ un visuel de produit fini, à toutes les largeurs");
process.exit(echecs.length || errs.length ? 1 : 0);
