# Bureaux virtuels AVYORA

L'étage de bureaux en 3D (`/admin/bureaux`, réservé à l'admin) : une pièce par activité d'AVYORA, pour voir d'un coup
d'œil où travailler. Three.js r128 (servi depuis `public/vendor/three@0.128.0`), sans dépendance npm.

- `src/` : les modules de la scène. `donnees.js` porte les pièces, les agents IA et leurs données d'EXEMPLE (la maquette) ;
  sur le site, la page porte `data-source="/api/admin/bureaux"` et les vraies données remplacent les exemples.
- `assembler.mjs` : fabrique `public/bureaux/scene.js`, `public/bureaux/scene.css` et `lib/bureaux/coquille.ts`.
  À relancer après toute modification de `src/` (un test vérifie que ces fichiers sont à jour).
  `--artefact <fichier.html>` écrit aussi la maquette autonome ; `--essai <dossier>` une page d'essai du mode « site ».
- `lib/bureaux/donnees.ts` (dans le site) : le calcul PUR du contenu des pièces à partir des listes de l'admin.
- `public/bureaux/paquets/` : les modèles 3D, tous libres de droits (CC0), listés dans `telechargements.json`.
- `outils/` : serveur local et capture sans fenêtre (`capture.js` attend `window.__pret`), preuve des déplacements (`?test=1`).

Paramètres d'essai de la page : `?theme=jour|nuit`, `?vue=ensemble|miami|<pièce>`, `?nu=1`, `?test=1`, `?cam=x,y,z,taille,az,el`,
`?tel=1` (comme sur un téléphone), `?force=1` (ouvrir la 3D quand même).

Ce qui n'est pas encore branché (étape suivante) : la comptabilité (Stripe, charges fixes), le planning des rendez-vous,
et les agents IA eux-mêmes (leurs fiches décrivent ce qu'ils feront).
