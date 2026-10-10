# Maquettes

Prototypes autonomes, hors application. Un seul fichier HTML par maquette, zéro dépendance :
on l'ouvre dans un navigateur, on le publie en artefact, on le branche plus tard.

---

## `plan-editor.html` — Éditeur de plan 2D

L'éditeur de plan d'AVYORA : on dessine son logement, le plan produit les **quantités** que le
moteur d'estimation chiffre. ~3 100 lignes, un seul `<script>`, aucune dépendance externe au chargement :
seule la vue 3D (D71) va chercher Three.js (jsDelivr, version épinglée) à sa première ouverture.

Publié ici : <https://claude.ai/artifact/Y1F75L5bdcuQt91KKrxWNr>
Ce fichier est la **source de vérité** ; l'artefact est la copie publiée. Republier le même
fichier conserve l'URL.

### ⚠️ Contrôle OBLIGATOIRE avant chaque publication

Tout l'éditeur est **un seul `<script>` écrit en lignes très longues**. Une erreur de parsing ne
dégrade pas une fonctionnalité : elle supprime **100 %** du fichier, page blanche, aucune fonction
définie. C'est déjà arrivé (V98, 15 sept. 2026) pour un commentaire de trop.

Les deux contrôles, dans l'ordre, **même pour une retouche d'une ligne** :

```bash
# 1. syntaxe du script extrait  → doit afficher « syntax: OK »
python3 -c "
import re,sys
s=open('maquettes/plan-editor.html',encoding='utf-8').read()
print('\n;\n'.join(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)))
" > /tmp/pe.js
node -e 'try{new Function(require("fs").readFileSync("/tmp/pe.js","utf8"));console.log("syntax: OK")}catch(e){console.log("ECHEC ->",e.message);process.exit(1)}'

# 2. chargement headless → typeof setMode === "function" et AUCUN pageerror
node maquettes/tools/review.mjs "$(pwd)/maquettes"

# 3. jonctions : une cloison ne rentre dans aucun doublage, par aucun des six gestes
node maquettes/tools/jonctions.mjs "$(pwd)/maquettes"

# 4. contrat : identifiants uniques, provenances qui pointent juste, choix non tranchés à null
node maquettes/tools/contrat.mjs "$(pwd)/maquettes"
```

La scène de référence des tests de correspondance se régénère avec
`node maquettes/tools/fixture-contrat.mjs "$(pwd)/maquettes" tests/fixtures/plan-contrat.json` —
à relancer quand le contrat change, puis à relire : les quantités attendues sont dans les tests.

### Règles d'écriture

1. **Jamais de `//` à l'intérieur d'une ligne longue** — le reste de la ligne (accolades comprises)
   passe en commentaire. Toujours `/* … */`.
2. **Aucun COEFFICIENT recopié ici** — finition, région, TVA vivent dans `lib/estimateur` ; la
   maquette collecte et transmet (`quantities() → contexte`), elle ne les applique pas. Une copie
   locale divergerait : c'est l'incident déjà vécu entre `app/sitemap.ts` et la règle d'indexation.

   En revanche la maquette **recopie bien des prix** : `PRIX`, `PRIX_TOIT`, `EQUIP_PRIX` et
   `FACADE_PRIX`, ~85 valeurs €/m² ou €/u, pour alimenter le compteur de budget *indicatif* affiché
   en bas du panneau. Ces copies dérivent dès que le catalogue bouge, et une dérive ne casse rien de
   visible : elle fabrique un chiffre faux. D'où le contrôle ci-dessous, à lancer après toute
   modification de `lib/estimateur/catalog.json` :

   ```bash
   node maquettes/tools/coherence.mjs     # sort en 1 si une divergence est trouvée
   ```

   Il vérifie six choses : les prix recopiés contre le fourni-posé du catalogue, les libellés de
   postes cités en dur (`FACADES[].poste`), la couverture exacte du carnet (200 postes), les
   nombres annoncés dans le bloc « hors plan », et il rappelle les deux correspondances qui restent
   à écrire au branchement (`logementPlus2Ans → ctx.fiscal`, les types de pièces sans compteur).
3. **Toute nouvelle géométrie d'isolant** (nouveau type d'ouverture, angle, refend, ITE) se teste
   sur une **scène propre** — `state=blankState()`, rectangle 6 × 4 + refend, doublage 80 mm des
   deux côtés — et se capture en zoom serré avant publication. Le plan d'exemple a un mur intérieur
   asymétrique qui trompe les captures.
4. **Les contrôles d'espace ne tournent pas dans la boucle de rendu.** `planChecks(lv)` est appelé
   par `draw()` à chaque frame : les dégagements et le balayage des portes y sont sautés
   (`planChecks(lv,{espace:false})`) et ne s'exécutent que dans le panneau et l'export.
5. **Aucune distance annoncée ne doit être approximative.** Les dégagements sont mesurés au
   centimètre (balayage 5 cm puis affinage 1 cm, emprise resserrée d'1 mm) : un chiffre faux, même
   pessimiste, reste un chiffre faux.
6. **Un seul point de sortie : `contratPlan()`.** `quantities()` est **interne**. Tout ce qui
   quitte la maquette passe par `contratPlan()`, qui porte un numéro (`CONTRAT_PLAN`, aujourd'hui
   `1.0.0`) que le consommateur doit vérifier. **Renommer ou retirer une clé émise = changer ce
   numéro.** Le `<details>` « Voir le JSON envoyé au moteur » affiche exactement ce contrat : ce
   qu'on y lit est ce qui sortira.
7. **Deux familles d'identifiants.** `uid()` (7 caractères aléatoires, sans contrôle de collision)
   est **interne** ; `pidOf(kind,objet)` pose un identifiant **public, typé, persisté et jamais
   réattribué** (`m` mur, `o` ouverture, `e` équipement, `p` pièce, `n` niveau) — c'est lui qui
   voyage dans le contrat et dans `provenance`. Ne jamais indexer sur un `uid()`, ni sur un NOM de
   pièce : deux pièces non renommées sont homonymes par construction (`roomName` retombe sur le
   label du type).
8. **Distinguer conseil et règle.** Les dégagements sont des usages de confort → libellé
   « conseillés », niveau `info` (ou `warn` s'il manque plus d'un tiers). Les seuls chiffres
   réglementaires cités dans le fichier : 9 m² et 2,20 m (décret décence), 83 cm (accessibilité),
   le sas des WC (règlement sanitaire).

### État

Fait : murs et détection automatique des pièces (faces du graphe planaire), ouvertures aimantées,
doublage ITI/ITE avec retour d'isolant en tableau, façade, toiture et pignons, escaliers (Blondel)
et trémies, sols en couches, niveaux, calques, cotes, notes, produits repérés, suivi de chantier,
export du dossier, plomberie, VMC, fenêtres de toit, déclenchement de l'étude de structure,
contexte de chantier (finition / code postal / TVA), dégagements d'usage, porte qui tape dans un
équipement, et le bloc « ce que ce chiffrage ne couvre pas encore ».

Phase 2 de l'audit faite : appariement des faces identique dans toutes les vues (plus de fiche
`tmp`), identifiants publics, emprise au sol du niveau bas indépendante du panneau Toiture, type de
bien demandé, percements ventilés (porteur petit / grand / léger), travaux détaillés par niveau,
dimensions des équipements et options des menuiseries émises, bloc `provenance` (quel mur, quelle
ouverture, quel équipement a produit quelle quantité), collisions de noms tuées
(`surfaceAuSolPiece`, `detailNiveaux`), une seule hauteur par objet, et la frontière d'export.

**Reste à faire : le branchement.** `contratPlan()` ne parle encore à personne. Cible : le mode
rapide (`ESPACES` / `presetRapide`) et l'intake du mode détaillé. Le cahier des charges est dans
`carnet/`.

---

### Revenir à un état connu bon

Les états de référence sont des **tags git annotés**, pas des copies de fichier : une copie se
périme et on ne sait plus laquelle est la vraie.

| tag | état |
|---|---|
| `maquette-v1` | 17 sept. 2026 — l'éditeur en V104 (artefact Version 107). Revue headless sans erreur, 46 prix sur 49 alignés, 3 dérives connues et assumées. |

```bash
git tag -n99 maquette-v1                                              # ce qu'il contient, en détail
git show maquette-v1:maquettes/plan-editor.html > maquettes/plan-editor.html
```

Puis republier le fichier sur l'artefact — l'URL est conservée. **Relancer les deux contrôles
après restauration** : un fichier restauré est un fichier modifié.

Pour poser un nouveau repère :

```bash
git tag -a maquette-v2 -m "…ce qu'il contient, et ce qui reste imparfait"
git push origin maquette-v2
```

---

## `carnet/` — correspondance catalogue ↔ plan

Relecture des **200 postes / 18 lots** du catalogue détaillé (`lib/estimateur/catalog.json`)
croisés avec ce que le plan sait produire. C'est le cahier des charges du branchement.

| fichier | contenu |
|---|---|
| `carnet-detail-vs-plan.tsv` | une ligne par poste : lot, unité, formule `autoQty` actuelle, classe, source dans le plan |
| `catalogue-brut.tsv` | le catalogue à plat : lot, phase, TVA, poste, unité |
| `autoqty-formules.json` | les 78 formules de quantité automatique du moteur, extraites de `autoQty()` |

Les cinq classes : **MESURE** (61 postes — le plan mesure ce que le moteur estime aujourd'hui par
une formule), **FOURNIT** (49 — quantité aujourd'hui saisie à la main), **REGLE** (13 — déductible,
le déclencheur existe), **AJOUT** (4 — il manquait un objet à poser, tous ajoutés depuis),
**QUESTION** (73 — hors de portée d'un plan 2D, et c'est normal).

Le point saillant : `autoQty()` estime la façade par `4 × √SurfaceSol × hauteur × niveaux × 1,25`
et la toiture par `SurfaceSol × 1,4`. Ce sont des proxys honnêtes pour un formulaire. Le plan, lui,
a la géométrie réelle. **Le plan ne remplit pas des cases : il remplace des estimations par des
mesures.**

---

## `tools/coherence.mjs` — cohérence maquette ↔ estimateur

```bash
node maquettes/tools/coherence.mjs
```

À lancer après toute modification du catalogue, et avant chaque publication qui touche aux prix.
Sort en code 1 si une divergence est trouvée — voir la règle 2 ci-dessus pour ce qu'il couvre.

---

## `tools/review.mjs` — parcours de revue headless

Rejoue tout le parcours (première visite, tracé, longueur tapée, ouvertures, équipements, cotes,
mesure, undo, Projet/Final, export, niveaux, mobile, raccourcis) et capture chaque étape.

```bash
node maquettes/tools/review.mjs "$(pwd)/maquettes"   # captures dans maquettes/review/
```

Il attend `puppeteer-core` (présent dans les dépendances de l'app) et Chrome à l'emplacement macOS
standard. Les captures ne sont **pas** versionnées : elles se régénèrent en une commande.

Depuis D59, la revue **sort en 1** si la page lève une erreur ou si un geste de base ne fait plus ce
qu'il faisait (18 contrôles : tracé, longueur tapée, pose, cote, note, mesure, clic droit, Ctrl+Z,
mur choisi en vue Travaux, export, niveaux, téléphone, raccourcis). Avant, son « ok » voulait seulement
dire « le script n'a pas planté ».

## `tools/ux.mjs` — la refonte de l'interface (D59 et suivants)

```bash
node maquettes/tools/ux.mjs "$(pwd)/maquettes"
```

Ce qui fait « logiciel de plans » et doit le rester : un seul registre d'icônes (`ICONS` / `ico()`,
chaque SVG de l'interface en est un tracé), trois tailles d'icône au même poids, les jetons du design
system (rayons, hauteurs, tailles de texte sans demi-pixel), familles de bibliothèque sans couleur,
mini-coupes et échantillons de légende, une seule carte « choisir un modèle », et la bibliothèque lisible
sans défiler jusqu'à 1 024 × 768. À lancer avec la batterie, après `responsive`.

Depuis D60 (chantier U2), il garde aussi les **symboles du plan et leurs vignettes** : la vignette d'un
modèle est rendue par le code du plan (`vignette()` : `drawOpening` sur un mur témoin, `drawItem` cadré sur
ce qu'il dessine) et doit égaler, après un flou 3 × 3, le rendu du plan au même cadrage — pour les 46
modèles, à ×1 et ×2 ; deux modèles n'ont jamais la même vignette ; aucune n'est coupée. Il vérifie aussi
les conventions d'architecte (un arc par vantail, plus de chevron, seuil, âme pleine, rails du garage),
l'encre unique du plan, la cloison à 65 %, l'électricité à taille d'écran bornée et les glyphes indigo.

Depuis D61 (chantier U3), il garde aussi **la disposition** : colonne d'outils en sections (Édition, Structure,
Menuiseries, Équipements, Annoter, Fond) et bulles riches ; la tête du plan (bande de contexte : niveaux, vues et
légende ; barre d'options d'une ligne, avec les variantes et les modèles de l'outil actif) et la barre d'état
(consigne, mesure en direct et accrochage nommé, surface, échelle graphique, zoom, grille, aimantation, affichage) —
plus aucune carte sur la zone utile du plan ; Équipements sans modèle posé en douce ; le panneau qui montre l'objet
posé et le mode d'emploi de chaque outil. La liste des éléments contrôlés au chevauchement (`responsive`) suit.

## `tools/vue3d.mjs` — la vue 3D du plan (D71)

```bash
node maquettes/tools/vue3d.mjs "$(pwd)/maquettes"
```

La 3D est **générée** depuis le plan (module `v3…` du même fichier, qui n'écrit jamais dans `state`) ; Three.js
n'est demandé au CDN qu'à la première ouverture. Le contrôle mesure la scène par des **rayons** (hauteur des murs,
largeur et hauteur de chaque trou, allège, linteau, doublage percé, un sol par pièce, l'étage posé sur le RDC, la
trémie), compare l'état du plan avant / après (JSON complet et empreinte), vérifie que la page 2D ne demande rien au
CDN et le message hors ligne (CDN bloqué). Il lance Chrome avec WebGL logiciel (SwiftShader). Sans réseau, il le dit
et sort en 0 avec un avertissement : la géométrie n'a alors pas été contrôlée.
