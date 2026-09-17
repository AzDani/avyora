# Maquettes

Prototypes autonomes, hors application. Un seul fichier HTML par maquette, zéro dépendance :
on l'ouvre dans un navigateur, on le publie en artefact, on le branche plus tard.

---

## `plan-editor.html` — Éditeur de plan 2D

L'éditeur de plan d'AVYORA : on dessine son logement, le plan produit les **quantités** que le
moteur d'estimation chiffre. ~3 100 lignes, un seul `<script>`, aucune dépendance externe.

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
```

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
6. **Distinguer conseil et règle.** Les dégagements sont des usages de confort → libellé
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

**Reste à faire : le branchement.** `quantities()` ne parle encore à personne. Cible : le mode
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
