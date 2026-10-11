const path = require("path"), fs = require("fs"), vm = require("vm");
const puppeteer = require("/Users/dani/Desktop/CLAUDE CODE/renopilot/app/node_modules/puppeteer-core");
const M = path.resolve(process.argv[2] || ".");  // dossier produit par assembler.mjs
const PAGE = "file://" + path.join(M, "construction-neuve.html");
const CAP = path.join(M, "captures");
fs.mkdirSync(CAP, { recursive: true });
setTimeout(() => { console.log("TIMEOUT de sécurité"); process.exit(2); }, 170000);
vm.runInThisContext(fs.readFileSync(path.join(M, "moteur.js"), "utf8"));
const A = globalThis.AVYORA;
const res = [];
const ok = (nom, cond, info) => { res.push([cond ? "OK " : "KO ", nom, info || ""]); };
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 60000, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(PAGE, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload({ waitUntil: "networkidle0" });

    /* 1. rapide affiche un total = moteur (node) pour l'exemple */
    const t0 = await page.$eval("#r-total", (e) => ({ txt: e.textContent, v: Number(e.dataset.ttc) }));
    const p0 = A.presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" });
    const ref0 = A.buildDevis(A.catalogueDe(p0.ctx), p0.ctx, p0.sel).totaux.ttc;
    ok("rapide : un total s'affiche", t0.v > 0 && /€/.test(t0.txt), t0.txt);
    ok("rapide : total page = buildDevis (node)", Math.abs(t0.v - ref0) < 0.01, t0.v.toFixed(2) + " vs " + ref0.toFixed(2));

    /* 2. changer la surface change le total */
    await page.$eval("#r-surface", (e) => { e.value = "140"; e.dispatchEvent(new Event("input", { bubbles: true })); });
    const t1 = await page.$eval("#r-total", (e) => Number(e.dataset.ttc));
    const p1 = A.presetNeuf({ surface: 140, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" });
    const ref1 = A.buildDevis(A.catalogueDe(p1.ctx), p1.ctx, p1.sel).totaux.ttc;
    ok("rapide : surface 100 → 140 change le total", t1 !== t0.v && Math.abs(t1 - ref1) < 0.01, Math.round(t0.v) + " → " + Math.round(t1));
    const inPage = await page.evaluate(() => { const A = window.AVYORA, R = window.__maquette.R; const p = A.presetNeuf(R); return { page: Number(document.querySelector("#r-total").dataset.ttc), moteur: A.buildDevis(A.catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc }; });
    ok("rapide : total page = AVYORA.buildDevis (dans la page)", Math.abs(inPage.page - inPage.moteur) < 0.01, inPage.page.toFixed(2));
    await page.click("#reset-ex");

    /* 3. Affiner → détaillé, même maison, même total */
    await page.click("#r-affiner");
    await page.waitForSelector("#p-detail:not([hidden])");
    const d0 = await page.$eval("#d-total", (e) => Number(e.dataset.ttc));
    ok("Affiner : le détaillé reprend la même maison (même total)", Math.abs(d0 - ref0) < 0.01, Math.round(d0) + "");
    const KLIN = await page.evaluate(() => { const p = window.AVYORA.POSTE_NEUF.get("mac-linteau-beton-arme"); return window.AVYORA.key(p.c, p.n); });
    const linAvant = await page.evaluate((k) => ({ coche: document.querySelector('[data-on="' + CSS.escape(k) + '"]').checked, devis: window.__maquette.devisDetail().lignes.some((l) => l.cle === k) }), KLIN);
    ok("détaillé : linteaux cochés en parpaing", linAvant.coche && linAvant.devis);
    await page.click('[data-qp="murs"][data-v="\\"ossature\\""]');
    const linApres = await page.evaluate((k) => ({ coche: document.querySelector('[data-on="' + CSS.escape(k) + '"]').checked, devis: window.__maquette.devisDetail().lignes.some((l) => l.cle === k) }), KLIN);
    ok("détaillé : ossature bois → linteaux décochés et hors devis", !linApres.coche && !linApres.devis);
    await page.click("#d-only");
    const linVisible = await page.evaluate((k) => !!document.querySelector('[data-on="' + CSS.escape(k) + '"]'), KLIN);
    ok("détaillé : « postes cochés seulement » → les linteaux disparaissent de la liste", !linVisible);
    await page.click("#d-only");
    const d1 = await page.evaluate(() => {
      const A = window.AVYORA, D = window.__maquette.D;
      const p = A.presetMaison(D.maison, { finition: D.finition, qui: D.qui, codePostal: D.maison.codePostal });
      return { page: Number(document.querySelector("#d-total").dataset.ttc), moteur: A.buildDevis(A.catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc, maison: D.maison };
    });
    ok("détaillé : total page = AVYORA.buildDevis(presetMaison(même maison))", Math.abs(d1.page - d1.moteur) < 0.01, d1.page.toFixed(2) + " vs " + d1.moteur.toFixed(2));
    const pN = A.presetMaison(d1.maison, { finition: "standard", qui: "pros", codePostal: "45000" });
    const refN = A.buildDevis(A.catalogueDe(pN.ctx), pN.ctx, pN.sel).totaux.ttc;
    ok("détaillé : total page = buildDevis (node, maison ossature)", Math.abs(d1.page - refN) < 0.01, refN.toFixed(2));

    /* 4. décocher un poste baisse le total */
    const KPL = await page.evaluate(() => { const p = window.AVYORA.POSTE_NEUF.get("rev-plinthes"); return window.AVYORA.key(p.c, p.n); });
    await page.evaluate(() => { document.querySelectorAll("details.phase").forEach((d) => (d.open = true)); });
    await page.$eval('[data-on="' + KPL.replace(/"/g, '\\"') + '"]', (e) => e.click());
    const d2 = await page.$eval("#d-total", (e) => Number(e.dataset.ttc));
    ok("détaillé : décocher les plinthes baisse le total", d2 < d1.page, Math.round(d1.page) + " → " + Math.round(d2));
    /* quantité manuelle puis retour auto */
    const KFEN = await page.evaluate(() => { const p = window.AVYORA.POSTE_NEUF.get("mex-fenetres"); return window.AVYORA.key(p.c, p.n); });
    await page.$eval('[data-q="' + KFEN + '"]', (e) => { e.value = "12"; e.dispatchEvent(new Event("change", { bubbles: true })); });
    const d3 = await page.$eval("#d-total", (e) => Number(e.dataset.ttc));
    const hasAutoBtn = await page.$('[data-auto="' + KFEN + '"]');
    ok("détaillé : quantité saisie → manuelle (bouton « auto » présent), total modifié", !!hasAutoBtn && d3 > d2, Math.round(d2) + " → " + Math.round(d3));
    await page.click('[data-auto="' + KFEN + '"]');
    const d4 = await page.$eval("#d-total", (e) => Number(e.dataset.ttc));
    ok("détaillé : retour « auto » rétablit le total", Math.abs(d4 - d2) < 0.01);
    /* jalons marqués */
    const nJal = await page.$$eval(".jalon-row", (x) => x.length);
    ok("détaillé : jalons marqués", nJal >= 8, nJal + " jalons");

    /* 5. étapes et prix */
    await page.click("#tab-etapes");
    const nSteps = await page.$$eval("#e-timeline .step", (x) => x.length);
    ok("étapes : 9 phases", nSteps === 9);
    await page.click("#tab-prix");
    const nPrix = await page.$$eval("#ptable .prow:not(.head)", (x) => x.length);
    const nLiens = await page.$$eval("#ptable .srcs a", (x) => x.length);
    ok("prix : postes propres au neuf listés avec sources", nPrix === 99 && nLiens > 150, nPrix + " postes, " + nLiens + " liens");
    await page.click('#f-kind [data-v="tous"]');
    const nTous = await page.$$eval("#ptable .prow:not(.head)", (x) => x.length);
    ok("prix : tous les postes", nTous === 202, nTous + "");
    await page.click('#f-kind [data-v="neuf"]');

    /* 6. captures (état propre : rechargement sur l'exemple) */
    for (const w of [1280, 375]) {
      await page.setViewport({ width: w, height: w === 375 ? 812 : 900, deviceScaleFactor: w === 375 ? 2 : 1 });
      for (const tab of ["rapide", "detail", "etapes", "prix"]) {
        await page.evaluate((t) => { try { localStorage.setItem("avyora-neuf-onglet", t); } catch (e) {} }, tab);
        await page.reload({ waitUntil: "networkidle0" });
        await page.evaluate(() => document.fonts.ready);
        const ow = await page.evaluate(() => document.documentElement.scrollWidth);
        ok("largeur " + w + " / " + tab + " : pas de défilement horizontal", ow <= w, "scrollWidth " + ow);
        const f = path.join(CAP, tab + "-" + w + ".png");
        await page.screenshot({ path: f, fullPage: tab !== "prix" || w === 375 ? true : false });
      }
    }
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluate(() => { try { localStorage.setItem("avyora-neuf-onglet", "detail"); } catch (e) {} });
    await page.reload({ waitUntil: "networkidle0" });
    await page.evaluate(() => window.scrollTo(0, document.querySelector("#d-phases").offsetTop - 80));
    await page.screenshot({ path: path.join(CAP, "detail-phases-1280.png") });
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: "networkidle0" });
    await page.evaluate(() => window.scrollTo(0, document.querySelector("#d-phases").offsetTop + 200));
    await page.screenshot({ path: path.join(CAP, "detail-phases-375.png") });
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.evaluate(() => { try { localStorage.setItem("avyora-neuf-onglet", "prix"); } catch (e) {} });
    await page.reload({ waitUntil: "networkidle0" });
    await page.evaluate(() => window.scrollTo(0, document.querySelector("#dec").offsetTop - 120));
    await page.screenshot({ path: path.join(CAP, "prix-decisions-1280.png") });
    /* sombre */
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    await page.evaluate(() => { try { localStorage.setItem("avyora-neuf-onglet", "detail"); } catch (e) {} });
    await page.reload({ waitUntil: "networkidle0" });
    await page.screenshot({ path: path.join(CAP, "detail-1280-sombre.png") });
    ok("0 erreur console", errs.length === 0, errs.slice(0, 5).join(" | "));
  } finally {
    for (const r of res) console.log(r.join(" "));
    await browser.close();
    process.exit(res.some((r) => r[0] === "KO ") ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(3); });
