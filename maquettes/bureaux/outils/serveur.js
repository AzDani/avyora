// Serveur statique local d'essai (lecture seule, 127.0.0.1). Usage : node serveur.js <dossier> <port> [secondes avant arrêt]
const http = require("http"), fs = require("fs"), path = require("path");
const racine = path.resolve(process.argv[2]), port = Number(process.argv[3] || 4791), duree = Number(process.argv[4] || 0);
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".jpg": "image/jpeg", ".png": "image/png" };
http.createServer((q, r) => {
  const f = path.join(racine, path.normalize(decodeURIComponent(q.url.split("?")[0])));
  if (!f.startsWith(racine)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end("introuvable"); } r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); });
}).listen(port, "127.0.0.1");
if (duree) setTimeout(() => process.exit(0), duree * 1000);
