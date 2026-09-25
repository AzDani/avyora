/**
 * Le plan à toutes les tailles d'écran (D43).
 *
 * Une passe automatique à 390 × 844 (téléphone), 320 × 640 (petit téléphone, zoom 400 % : D51), 768 × 1024 (tablette en portrait), 1024 × 768,
 * 1280 × 800, 1440 × 900, 720 × 450 et 640 × 360 (portable zoomé à 200 et 300 %), qui vérifie :
 *   - la barre du haut : aucun de ses éléments ne déborde (ni à droite, ni sous la barre) ;
 *   - « Estimer ce plan » visible et cliquable (le point touché est bien le bouton, et le clic ouvre
 *     l'estimation) — tiroir fermé ET ouvert au téléphone ;
 *   - aucun élément flottant du plan ne se chevauche (niveaux, vues, badge de surface, astuce, zoom,
 *     bandeau du téléphone) ; au téléphone, la barre de zoom ne passe jamais sur le tiroir ouvert ;
 *   - la hauteur utile du panneau (fiche d'une pièce) : le pied (budget) n'écrase pas la fiche ;
 *   - pas de défilement horizontal de la page ; les tableaux de l'estimation défilent dans leur cadre ;
 *   - au téléphone (mode chantier), les commandes du chantier font au moins 40 px, les cases du Suivi 24 px ;
 *   - la tablette en portrait : le plan a plus de place, et le panneau se replie d'un bouton (et revient) ;
 *   - D48 : le téléphone est le mode chantier en CONSULTATION — fiches et réglages en lecture (le
 *     glossaire reste actif), rien ne se tire au doigt, Suppr ne marque rien, pas de nouveau plan ;
 *     le Suivi se coche ; et l'on dit honnêtement qu'un plan reste sur l'appareil où il a été dessiné.
 *
 *   node maquettes/tools/responsive.mjs "$(pwd)/maquettes"
 *
 * Sort en code 1 si un contrôle échoue ou si la page lève une erreur.
 */
import puppeteer from "puppeteer-core";
const SP = process.argv[2];
if (!SP) { console.error("usage : node maquettes/tools/responsive.mjs <dossier maquettes>"); process.exit(2); }

const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
/* Jamais de passe qui pend : une erreur ou un délai dépassé ferment Chrome (un Chrome orphelin gardait la
   sortie ouverte et la batterie attendait sans fin). */
const fin = async (msg) => { console.log("\n✗ " + msg); await b.close().catch(() => {}); process.exit(1); };
for (const ev of ["unhandledRejection", "uncaughtException"]) process.on(ev, (e) => fin("erreur du contrôle : " + (e && e.message || e)));
setTimeout(() => fin("délai dépassé (240 s)"), 240000).unref();
/* La page ne dépend que de Google Fonts : si une police traîne sur le réseau, on attend la page, pas la police. */
async function charger(p) {
  try { await p.goto("file://" + SP + "/plan-editor.html", { waitUntil: "networkidle0", timeout: 15000 }); }
  catch (e) { if (!/timeout/i.test(e.message)) throw e; await p.waitForFunction(() => document.readyState === "complete" && typeof render === "function", { timeout: 15000 }); }
}
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = {};
async function onglet(larg, haut, mobile = false, pro = true) {
  const p = await b.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: larg, height: haut, isMobile: mobile, hasTouch: mobile });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); /* géométrie finale, sans attendre les transitions */
  await p.evaluateOnNewDocument((pro) => { try { localStorage.clear(); localStorage.setItem("avyora-plan-projet-tip", "1"); localStorage.setItem("avyora-plan-tuto", "fait"); if (!pro) localStorage.setItem("avyora-plan-pro", "0"); } catch {} }, pro);
  await charger(p);
  await wait(250);
  await p.evaluate(() => { closeWelcome("sample"); closeModal(); setTool("select"); sel = null; render(); });
  await wait(250);
  return p;
}
/* mesures communes, dans la page */
const MESURES = () => {
  const vis = (e) => { if (!e || !e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05; };
  const top = document.querySelector(".top").getBoundingClientRect();
  const hors = [...document.querySelectorAll(".top > *")].filter(vis).filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 0.5 || q.left < -0.5 || q.bottom > top.bottom + 0.5 || q.top < top.top - 0.5); }).map((e) => e.id || e.className);
  const eb = document.getElementById("estBtnTop"), q = eb.getBoundingClientRect();
  const estOk = vis(eb) && q.right <= innerWidth + 0.5 && [0.15, 0.5, 0.85].every((f) => { const el = document.elementFromPoint(q.left + q.width * f, q.top + q.height / 2); return el && el.closest("#estBtnTop"); });
  const flottants = ["#levels", "#modes", "#surfBadge", "#hint", ".zoomctl", "#phoneBanner", "#emptyStage .emptyCard", "#measBox"].map((s) => document.querySelector(s)).filter(vis);
  const chev = [];
  for (let i = 0; i < flottants.length; i++) for (let j = i + 1; j < flottants.length; j++) {
    const a = flottants[i].getBoundingClientRect(), c = flottants[j].getBoundingClientRect();
    if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) chev.push((flottants[i].id || flottants[i].className) + " / " + (flottants[j].id || flottants[j].className));
  }
  return { topH: Math.round(top.height), hors, estOk, chev, scroll: document.documentElement.scrollWidth - innerWidth, scrollB: document.body.scrollWidth - innerWidth };
};

/* D51 (cj-access12) : 320 × 640 — le petit téléphone, et la largeur de référence du critère 1.4.10 (1 280 px zoomé à 400 %) */
for (const [L, H, mob] of [[390, 844, true], [320, 640, true], [768, 1024, false], [1024, 768, false], [1280, 800, false], [1440, 900, false], [720, 450, false], [640, 360, false]]) {
  const tag = `${L} × ${H}`;
  const p = await onglet(L, H, mob);
  /* 1. vue d'ensemble */
  let m = await p.evaluate(MESURES);
  t[`${tag} · barre du haut : rien ne déborde${m.hors.length ? " (" + m.hors.join(", ") + ")" : ""}`] = !m.hors.length && m.topH <= 56;
  t[`${tag} · « Estimer ce plan » visible et cliquable`] = m.estOk;
  t[`${tag} · aucun élément flottant ne se chevauche${m.chev.length ? " (" + m.chev.join(" ; ") + ")" : ""}`] = !m.chev.length;
  t[`${tag} · pas de défilement horizontal`] = m.scroll <= 0 && m.scrollB <= 0;
  /* le vrai clic ouvre l'estimation */
  {
    const r = await p.evaluate(() => { const q = document.getElementById("estBtnTop").getBoundingClientRect(); return { x: q.left + q.width * 0.8, y: q.top + q.height / 2 }; });
    await p.mouse.click(r.x, r.y); await wait(200);
    t[`${tag} · un clic sur « Estimer ce plan » ouvre l'estimation`] = await p.evaluate(() => document.getElementById("m-estimate").classList.contains("show"));
    const est = await p.evaluate(() => { const mo = document.querySelector("#m-estimate .modal"); const tb = [...mo.querySelectorAll("table")]; return { deb: mo.scrollWidth - mo.clientWidth, cadres: tb.every((x) => x.parentElement.classList.contains("tscroll")), dehors: tb.filter((x) => x.parentElement.getBoundingClientRect().right > mo.getBoundingClientRect().right + 1).length }; });
    t[`${tag} · estimation : rien ne déborde de la fenêtre (${est.deb} px), les tableaux défilent dans leur cadre`] = est.deb <= 1 && est.cadres && !est.dehors;
    await p.evaluate(() => closeModal()); await wait(100);
  }
  /* 2. la fiche d'une pièce : hauteur utile du panneau */
  await p.evaluate(() => { const r = L().rooms.find((x) => x.type === "sejour") || L().rooms[0]; sel = { kind: "room", id: r.id }; render(); });
  await wait(300);
  const P = await p.evaluate(() => {
    const pn = document.getElementById("panel").getBoundingClientRect(), pb = document.getElementById("pbody").getBoundingClientRect(), pf = document.getElementById("pfoot").getBoundingClientRect();
    const hautVisible = Math.min(pb.bottom, innerHeight) - Math.max(pb.top, document.querySelector(".top").getBoundingClientRect().bottom);
    const bb = document.querySelector("#pfoot .budgetbtn"); let budget = true;
    if (bb) { const k = bb.getBoundingClientRect(); budget = [0.2, 0.5, 0.8, 0.95].every((f) => { const el = document.elementFromPoint(k.left + k.width * f, k.top + k.height / 2); return el && el.closest(".budgetbtn"); }); }
    const zc = document.querySelector(".zoomctl"), zv = zc.getClientRects().length && getComputedStyle(zc).display !== "none";
    let zSurPanneau = false; if (zv) { const a = zc.getBoundingClientRect(); zSurPanneau = a.left < pn.right && pn.left < a.right && a.top < pn.bottom && pn.top < a.bottom; }
    return { pn: Math.round(pn.height), pb: Math.round(hautVisible), pf: Math.round(pf.height), budget, zSurPanneau, stage: Math.round(document.getElementById("stage").getBoundingClientRect().width) };
  });
  const seuil = mob ? 0.62 : 0.6;
  t[`${tag} · fiche d'une pièce : ${P.pb} px utiles sur ${P.pn} (pied ${P.pf} px)`] = P.pb >= P.pn * seuil && P.pf <= (H <= 640 || mob ? 115 : 175);
  t[`${tag} · la carte budget se touche sur toute sa largeur`] = P.budget;
  if (mob) t[`${tag} · tiroir ouvert : la barre de zoom ne passe pas dessus`] = !P.zSurPanneau;
  m = await p.evaluate(MESURES);
  t[`${tag} · fiche ouverte : « Estimer ce plan » reste visible et cliquable`] = m.estOk;
  t[`${tag} · fiche ouverte : aucun flottant ne se chevauche${m.chev.length ? " (" + m.chev.join(" ; ") + ")" : ""}`] = !m.chev.length;
  if (mob) {
    /* 3. mode chantier : cibles du chantier */
    const petits = await p.evaluate(() => {
      const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
      const out = [];
      const verif = (sel, min) => document.querySelectorAll(sel).forEach((e) => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.height < min - 0.5 || r.width < min - 0.5) out.push(`${sel} ${Math.round(r.width)}×${Math.round(r.height)}`); });
      verif("#undoBtn,#redoBtn,#aideBtn,#estBtnTop", 40); verif("#levels button", 40); verif("#modes button", 40); verif("#sheetHandle", 44); verif("#pbody .ptabs button", 40); verif("#phoneBanner button", 40);
      return out;
    });
    t[`${tag} · mode chantier : commandes de 40 px au moins${petits.length ? " (" + petits.join(", ") + ")" : ""}`] = !petits.length;
    await p.evaluate(() => { sel = null; toggleSheet(false); render(); }); await wait(200);
    const z = await p.evaluate(() => { const vis = (e) => e.getClientRects().length && getComputedStyle(e).display !== "none"; const r = [...document.querySelectorAll(".zoomctl button")].filter(vis).map((e) => e.getBoundingClientRect()); const zc = document.querySelector(".zoomctl").getBoundingClientRect(), sh = document.getElementById("sheetHandle").getBoundingClientRect(); return { petits: r.filter((q) => q.width < 39.5 || q.height < 39.5).length, n: r.length, surPoignee: zc.bottom > sh.top + 0.5 }; });
    t[`${tag} · tiroir fermé : zoom en boutons de 40 px (${z.n}), au-dessus de la poignée`] = z.n > 0 && !z.petits && !z.surPoignee;
    await p.evaluate(() => { panelTab = "suivi"; toggleSheet(true); render(); }); await wait(250);
    const S = await p.evaluate(() => { const cases = [...document.querySelectorAll("#pbody .task input[type=checkbox]")].filter((e) => e.getClientRects().length); const pb = document.getElementById("pbody").getBoundingClientRect(); return { cases: cases.length, petites: cases.filter((c) => c.getBoundingClientRect().width < 23.5 || c.getBoundingClientRect().height < 23.5).length, lignes: cases.filter((c) => c.closest(".task").getBoundingClientRect().height < 43.5).length, haut: Math.round(pb.height) }; });
    t[`${tag} · Suivi : cases de 24 px, lignes de 44 px (${S.cases} tâches), liste de ${S.haut} px`] = S.cases > 0 && !S.petites && !S.lignes && S.haut >= (H >= 800 ? 380 : Math.round(H * 0.4)); /* D51 : sur 640 px de haut, 40 % de l'écran (4 tâches) */
    m = await p.evaluate(MESURES);
    t[`${tag} · Suivi ouvert : « Estimer ce plan » visible et cliquable`] = m.estOk;
    await p.evaluate(() => { panelTab = "details"; sel = null; render(); }); await wait(200);
    t[`${tag} · vue d'ensemble du tiroir : « Mes plans » à portée de doigt`] = await p.evaluate(() => { const b = [...document.querySelectorAll("#pbody .mplan button")].find((x) => /Mes plans/.test(x.textContent)); return !!b && b.getBoundingClientRect().height >= 40; });
    await p.evaluate(() => { const b = [...document.querySelectorAll("#pbody .mplan button")][0]; b && b.click(); }); await wait(150);
    t[`${tag} · « Mes plans » s'ouvre depuis le tiroir`] = await p.evaluate(() => document.getElementById("m-plans").classList.contains("show"));
    t[`${tag} · « Mes plans » : ni « Nouveau plan vierge » ni « Enregistrer » au téléphone`] = await p.evaluate(() => !document.querySelector("#m-plans .btnrow").getClientRects().length);
    await p.evaluate(() => closeModal());
    /* 3 bis. D48 · consultation : les fiches se lisent, rien ne change le budget au doigt */
    Object.assign(t, await p.evaluate((tag) => { const r = {}, total = chantierPrix().total;
      setMode("projet"); closeModal(); const w = L().walls.find((x) => x.type === "cloison" && !x.st); sel = { kind: "wall", id: w.id }; render();
      const P = document.getElementById("pbody"), ctl = [...P.querySelectorAll("fieldset.ro input, fieldset.ro select, fieldset.ro button")];
      r[`${tag} · fiche : en lecture, réglages grisés, glossaire actif`] = ctl.length > 0 && ctl.every((x) => x.classList.contains("gl") ? !x.disabled : x.disabled);
      r[`${tag} · fiche : le bandeau dit où modifier (l'appareil où le plan a été dessiné)`] = /ordinateur ou la tablette où tu l'as dessiné/.test(P.querySelector(".robanner")?.textContent || "");
      r[`${tag} · fiche : pas de consigne de souris (Maj+clic, glisser)`] = !/Maj|glisse ses/.test(P.innerText);
      deleteSel();
      r[`${tag} · Suppr ne marque rien, le budget ne bouge pas`] = !findWall(w.id).st && chantierPrix().total === total;
      sel = null; render(); const cp = P.querySelector('input[aria-label="Code postal du chantier"]');
      r[`${tag} · vue d'ensemble : les réglages du chantier se lisent, grisés`] = !cp || cp.disabled;
      newPlan();
      r[`${tag} · « Nouveau plan » refusé : le dessin se fait sur ordinateur`] = !planVide() && /ordinateur ou tablette/.test(document.getElementById("toast").textContent);
      setMode("existant"); setMode("projet");
      r[`${tag} · vue Travaux : le message ne parle pas d'ajouter`] = !/ajoutes/.test(document.getElementById("toast").textContent) && /jaune/.test(document.getElementById("toast").textContent);
      setMode("existant"); closeModal(); return r; }, tag));
    { const it = await p.evaluate(() => { const i = L().items.find((x) => x.type === "table"); const s = S(v(i.x, i.y)); const rc = cv.getBoundingClientRect(); return { id: i.id, x: i.x, y: i.y, sx: rc.left + s.x, sy: rc.top + s.y }; });
      await p.mouse.move(it.sx, it.sy); await p.mouse.down(); for (let k = 1; k <= 6; k++) await p.mouse.move(it.sx + 10 * k, it.sy + 6 * k); await p.mouse.up(); await wait(150);
      t[`${tag} · au doigt, un équipement touché ne se déplace pas`] = await p.evaluate((it) => { const i = L().items.find((x) => x.id === it.id); return i.x === it.x && i.y === it.y; }, it); }
    await p.evaluate(() => { sel = null; toggleSheet(false); render(); }); await wait(150);
  }
  if (L === 768) {
    /* 4. tablette en portrait : plus de place pour le plan, et un panneau qui se replie */
    t[`${tag} · le plan fait ${P.stage} px de large (378 avant D43)`] = P.stage >= 400;
    await p.evaluate(() => { sel = null; render(); });
    /* D50 (cj-access04) : replié, le plan vu en entier se recadre (zoom plus grand) et le budget reste à l'écran, sans toucher la bulle d'astuce */
    { const z = await p.evaluate(async () => { fitView(); const z0 = view.zoom; plierPanneau(true); await new Promise((r) => setTimeout(r, 150));
        const bp = document.getElementById("budgetPlie"), q = bp.getBoundingClientRect(), h = document.getElementById("hint"), hr = h.getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect();
        const out = { z0, z1: view.zoom, pill: bp.getClientRects().length > 0 && /Budget HT/.test(bp.textContent) && /€/.test(bp.textContent) && q.right <= st.right && q.bottom <= st.bottom,
          horsBulle: h.hidden || !h.getClientRects().length || !(q.left < hr.right && q.right > hr.left && q.top < hr.bottom && q.bottom > hr.top) };
        bp.click(); out.estimer = document.getElementById("m-estimate").classList.contains("show"); closeModal();
        plierPanneau(false); await new Promise((r) => setTimeout(r, 150)); out.z2 = view.zoom; out.sansPill = !bp.getClientRects().length; return out; });
      t[`${tag} · replié : le plan se recadre (zoom ${Math.round(z.z0)} → ${Math.round(z.z1)} px/m), puis revient déplié`] = z.z1 > z.z0 * 1.2 && Math.abs(z.z2 - z.z0) < 0.5;
      t[`${tag} · replié : le budget reste visible (pastille « Budget HT », hors de la bulle d'astuce), elle ouvre Estimer`] = z.pill && z.horsBulle && z.estimer;
      t[`${tag} · déplié : pas de pastille (le budget est dans le panneau)`] = z.sansPill; }
    const f = await p.evaluate(async () => {
      const b = document.getElementById("pfold"), r0 = b.getBoundingClientRect();
      const avant = { exp: b.getAttribute("aria-expanded"), vis: r0.width > 0 && r0.right <= innerWidth };
      b.click(); await new Promise((r) => setTimeout(r, 150));
      const pl = { exp: b.getAttribute("aria-expanded"), panneau: document.getElementById("panel").getClientRects().length, stage: Math.round(document.getElementById("stage").getBoundingClientRect().width), btn: b.getBoundingClientRect().right <= innerWidth + 0.5 && b.getBoundingClientRect().left >= 0, nom: b.getAttribute("aria-label") };
      const cw = cv.width / devicePixelRatio;
      b.click(); await new Promise((r) => setTimeout(r, 150));
      return { avant, pl, cw, apres: { exp: b.getAttribute("aria-expanded"), panneau: document.getElementById("panel").getClientRects().length } };
    });
    t[`${tag} · « Replier le panneau » : un bouton visible (aria-expanded=true)`] = f.avant.exp === "true" && f.avant.vis;
    t[`${tag} · replié : le plan prend ${f.pl.stage} px, le canvas suit, le bouton dit « Afficher le panneau »`] = f.pl.exp === "false" && !f.pl.panneau && f.pl.stage >= 680 && Math.abs(f.cw - f.pl.stage) < 2 && f.pl.btn && /Afficher/.test(f.pl.nom);
    t[`${tag} · déplié : le panneau revient`] = f.apres.exp === "true" && f.apres.panneau > 0;
    /* replié puis « voir sur le plan » (Estimer, Suivi, checklist) : le panneau se rouvre sur la fiche */
    const g = await p.evaluate(() => { plierPanneau(true); const w = L().walls.find((x) => x.st === "demolir"); montrerSurLePlan({ kind: "wall", id: w.id }); return !document.querySelector(".body.panelPlie") && sel && sel.id === w.id; });
    t[`${tag} · replié : « voir sur le plan » rouvre le panneau sur la fiche`] = g;
    /* la consigne du plan vide (outil Murs) passe à la ligne : elle était coupée des deux côtés */
    await p.evaluate(() => closeWelcome("blank")); await wait(250);
    const txt = await p.evaluate(() => { const o = ctx.fillText, out = []; ctx.fillText = function (s, x) { const w = this.measureText(s).width, al = this.textAlign; out.push({ s, l: al === "center" ? x - w / 2 : x, r: al === "center" ? x + w / 2 : x + w }); return o.apply(this, arguments); }; draw(); ctx.fillText = o; return { W: cv.clientWidth, L: out.filter((q) => /coin|pièce/.test(q.s)) }; });
    t[`${tag} · plan vide, outil Murs : la consigne tient dans le plan (${txt.L.length} lignes)`] = txt.L.length >= 3 && txt.L.every((q) => q.l >= 0 && q.r <= txt.W);
  }
  await p.close();
}

await b.close();
const echecs = Object.entries(t).filter(([, ok]) => !ok);
for (const [nom, ok] of Object.entries(t)) console.log(`  ${ok ? "✓" : "✗"} ${nom}`);
if (errs.length) console.log("\n  erreurs de page :", errs.join(" · "));
console.log(echecs.length || errs.length ? `\n✗ ${echecs.length} contrôle(s) en échec` : "\n✓ le plan tient à toutes les tailles d'écran");
process.exit(echecs.length || errs.length ? 1 : 0);
