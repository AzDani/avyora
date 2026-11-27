/**
 * Les bureaux virtuels d'AVYORA (/admin/bureaux) : assemble la scène 3D depuis ses modules (maquettes/bureaux/src).
 *
 *   node maquettes/bureaux/assembler.mjs                      écrit ce que le SITE sert :
 *                                                               public/bureaux/scene.js, public/bureaux/scene.css, lib/bureaux/coquille.ts
 *   node maquettes/bureaux/assembler.mjs --artefact <f.html>  écrit en plus la MAQUETTE autonome (données d'exemple, Three.js par CDN,
 *                                                               modèles lus dans un dossier paquets/ à côté du fichier)
 *
 * Les fichiers écrits pour le site sont versionnés : tests/bureaux-scene.test.ts vérifie qu'ils sont à jour avec les modules.
 * Après avoir touché un module : relancer ce script, puis `node --check public/bureaux/scene.js`.
 *
 * Une seule scène, deux usages : sur le site, la page porte data-source (l'adresse des vraies données) et data-paquets ;
 * sans ces attributs, la scène montre ses données d'exemple (voir src/donnees.js).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "../..");
const lire = (nom) => readFileSync(join(ICI, "src", nom), "utf8");

/** Three.js r128 et ses trois modules d'exemple, dans l'ordre de chargement. */
const LIBS = ["build/three.min.js", "examples/js/loaders/GLTFLoader.js", "examples/js/loaders/RGBELoader.js", "examples/js/utils/SkeletonUtils.js"];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js",
];
const VENDOR = "/vendor/three@0.128.0/";

export function assembler() {
  const fin = lire("fin.js").replace("INTERFACE_ICI", lire("interface.js").trimEnd());
  const dedans = ["ville.js", "marque.js", "mobilier.js", "gens.js", "pieces.js", "deplacements.js", "ciel.js"].map(lire).join("\n") + "\n" + fin;
  // src/donnees.js se termine par « if (TELEPHONE) { … } else { » : tout le reste vit dans ce else (rien ne tourne sur un téléphone).
  const js = `"use strict";
${lire("donnees.js")}${lire("base.js")}
${lire("modeles.js")}
/* ───────────────────────── Le démarrage : les modèles et les données, puis la ville et l'étage ───────────────────────── */
async function demarrer() {
  await Promise.all([chargerModeles((faits, total) => { document.getElementById("avance").style.width = Math.round(100 * faits / total) + "%"; }), lireDonnees()]);
  try { await Promise.all([document.fonts.load('600 64px Geist'), document.fonts.load('500 32px Geist')]); } catch (e) {}   // la police de la marque, avant de dessiner les enseignes
${dedans}
}
demarrer().catch((e) => { document.getElementById("erreur").textContent = "Les bureaux n'ont pas pu s'ouvrir : " + (e && e.message ? e.message : e); window.__erreur = String(e && e.stack || e); });
}   // fin du « else » ouvert dans donnees.js
`;
  const style = lire("style.css"), corps = lire("corps.html");

  // ── Le site : la feuille de style (polices servies par le site), la coquille HTML, le script
  const css = `/* Fichier écrit par maquettes/bureaux/assembler.mjs : ne pas le modifier à la main. */
@font-face{font-family:'Geist';src:url('/fonts/geist/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Mono';src:url('/fonts/geist/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
html{height:100%}body{margin:0}
${style}`;
  const scene = `/* Fichier écrit par maquettes/bureaux/assembler.mjs : ne pas le modifier à la main. */\n${js}`;
  const v = createHash("sha1").update(scene).update(css).digest("hex").slice(0, 10);
  const coquille = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Bureaux · AVYORA</title>
<link rel="icon" href="/icon-192.png">
<link rel="stylesheet" href="/bureaux/scene.css?v=${v}">
</head>
<body>
${corps.replace('<div class="app">', '<div class="app" data-source="/api/admin/bureaux" data-paquets="/bureaux/paquets/">')}
${LIBS.map((l) => `<script src="${VENDOR}${l}"></script>`).join("\n")}
<script src="/bureaux/scene.js?v=${v}"></script>
</body>
</html>
`;
  const module = `/* Fichier écrit par maquettes/bureaux/assembler.mjs : ne pas le modifier à la main. */
/** La page des bureaux virtuels (/admin/bureaux) : la coquille HTML, sans aucune donnée (elles arrivent par /api/admin/bureaux). */
export const COQUILLE = ${JSON.stringify(coquille)};
`;

  // ── La maquette autonome (artefact) : tout dans un fichier, données d'exemple
  const artefact = `<meta name="claude:viewport-fit-sides" content="cover">
<title>Bureaux AVYORA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500;600&display=swap">
<style>
${style}</style>

${corps}
${CDN.map((u) => `<script src="${u}"></script>`).join("\n")}
<script>
${js}</script>
`;
  return { scene, css, module, artefact, coquille };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = assembler();
  mkdirSync(join(RACINE, "public/bureaux"), { recursive: true });
  mkdirSync(join(RACINE, "lib/bureaux"), { recursive: true });
  writeFileSync(join(RACINE, "public/bureaux/scene.js"), r.scene);
  writeFileSync(join(RACINE, "public/bureaux/scene.css"), r.css);
  writeFileSync(join(RACINE, "lib/bureaux/coquille.ts"), r.module);
  console.log(`site : scene.js ${r.scene.length} octets, scene.css ${r.css.length} octets, coquille.ts`);
  const i = process.argv.indexOf("--artefact");
  if (i > 0 && process.argv[i + 1]) { writeFileSync(resolve(process.argv[i + 1]), r.artefact); console.log("maquette :", process.argv[i + 1]); }
  // Une page d'essai du mode « site », servie par un petit serveur local : mêmes fichiers, données lues dans un fichier voisin.
  const j = process.argv.indexOf("--essai");
  if (j > 0 && process.argv[j + 1]) {
    const page = r.coquille.replaceAll("/bureaux/scene.", "scene.").replace('data-source="/api/admin/bureaux" data-paquets="/bureaux/paquets/"', 'data-source="donnees-essai.json" data-paquets="paquets/"')
      .replaceAll(VENDOR, "vendor/").replace(/<link rel="stylesheet"[^>]*>/, () => "<style>" + r.css.replaceAll("/fonts/geist/", "fonts/") + "</style>");   // (le serveur d'essai ne sert pas les .css)
    const d = resolve(process.argv[j + 1]);
    writeFileSync(join(d, "essai-site.html"), page); writeFileSync(join(d, "scene.js"), r.scene);
    console.log("essai du mode site :", join(d, "essai-site.html"));
  }
}
