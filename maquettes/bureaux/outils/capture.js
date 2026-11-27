// Capture d'une page locale avec Chrome sans fenêtre, en attendant qu'elle soit prête. Aucune dépendance (protocole de débogage, WebSocket de Node).
// Usage : node capture.js <url> <sortie.png> [largeur=1280] [hauteur=800] [expression à attendre="window.__pret===true"] [attente en plus ms=1500] [sombre=0|1] [port=9333]
const { spawn } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path");
const [url, sortie, L = "1280", H = "800", attendre = "window.__pret===true", plus = "1500", sombre = "0", port = "9333"] = process.argv.slice(2);
const profil = fs.mkdtempSync(path.join(os.tmpdir(), "capture-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--use-angle=metal", "--hide-scrollbars", "--no-first-run", "--user-data-dir=" + profil, "--remote-debugging-port=" + port, "--window-size=" + L + "," + H, "about:blank"], { stdio: "ignore" });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let cible = null;
  for (let i = 0; i < 50 && !cible; i++) { await pause(200); try { cible = (await (await fetch("http://127.0.0.1:" + port + "/json")).json()).find((t) => t.type === "page"); } catch (e) {} }
  if (!cible) throw new Error("Chrome ne répond pas");
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((r, k) => { ws.onopen = r; ws.onerror = k; });
  let n = 0; const attente = new Map(), journal = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d.result || d.error); attente.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") journal.push("EXCEPTION " + (d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text));
    if (d.method === "Runtime.consoleAPICalled" && /error|warning/.test(d.params.type)) journal.push(d.params.type.toUpperCase() + " " + d.params.args.map((a) => a.value || a.description || "").join(" ").slice(0, 300)); };
  const envoi = (method, params) => new Promise((r) => { const id = ++n; attente.set(id, r); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  await envoi("Runtime.enable"); await envoi("Page.enable");
  await envoi("Emulation.setDeviceMetricsOverride", { width: +L, height: +H, deviceScaleFactor: 1, mobile: false });
  await envoi("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: sombre === "1" ? "dark" : "light" }] });
  await envoi("Page.navigate", { url });
  let pret = false; const debut = Date.now();
  while (!pret && Date.now() - debut < 45000) { await pause(300); const r = await envoi("Runtime.evaluate", { expression: "(function(){try{return !!(" + attendre + ")}catch(e){return false}})()", returnByValue: true }); pret = !!(r.result && r.result.value); }
  await pause(+plus);
  const etat = await envoi("Runtime.evaluate", { expression: "(document.getElementById('etat')||{}).textContent||window.__mesure||''", returnByValue: true });
  // window.__rapport() : un contrôle écrit par la page d'essai (peut être asynchrone) ; son résultat est affiché tel quel
  const rapport = await envoi("Runtime.evaluate", { expression: "(async()=>{try{return typeof window.__rapport==='function'?JSON.stringify(await window.__rapport()):''}catch(e){return 'ERREUR rapport '+e.message}})()", returnByValue: true, awaitPromise: true });
  const erreur = await envoi("Runtime.evaluate", { expression: "window.__erreur||''", returnByValue: true });
  const img = await envoi("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(sortie, Buffer.from(img.data, "base64"));
  console.log(JSON.stringify({ pret, ms: Date.now() - debut, etat: etat.result && etat.result.value, erreur: erreur.result && erreur.result.value, rapport: rapport.result && rapport.result.value, journal: journal.slice(0, 12) }));
  ws.close(); chrome.kill(); setTimeout(() => { try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {} process.exit(0); }, 300);
})().catch((e) => { console.error("ECHEC", e.message); chrome.kill(); process.exit(1); });
