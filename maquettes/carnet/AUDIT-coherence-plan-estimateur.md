<!-- Audit produit le 18 septembre 2026 par un audit multi-agents (36 agents, 7 dimensions,
     chaque constat soumis à un vérificateur indépendant chargé de le réfuter en ouvrant les
     fichiers). 28 constats confirmés, 0 écarté. Aucune ligne de code n'a été écrite pendant
     l'audit : le brief l'exigeait.
     Sa section 10 dit ce qu'il n'a PAS couvert — la lire avant de s'appuyer dessus. -->

# Cohérence éditeur de plan ↔ estimateur détaillé
### Audit complet avant toute ligne de code — 18 septembre 2026

Aujourd'hui la cohérence est **nulle mais réparable** : l'estimateur a déjà un point d'entrée propre et éprouvé pour des quantités mesurées (`sel["lot|poste"] = {on:true, qty, manual:true}`, utilisé en production par le mode rapide), et le plan mesure déjà la plupart de ce que le moteur devine — mais le point qui bloque le plus n'est pas technique : **`quantities()` mélange « ce qui existera après travaux » et « ce qu'on fait », alors que les 200 postes du catalogue sont tous des travaux fourni-posé**, donc tout branchement naïf facture la pose de WC, de radiateurs et de doublages déjà en place et présente ce devis gonflé comme juste.

---

## 0. Ce que j'ai vérifié moi-même

Tout ce qui suit est lu dans les fichiers, pas repris de mémoire. Les chiffres et numéros de ligne ci-dessous sont ceux que j'ai constatés aujourd'hui, et **ils corrigent plusieurs constats de l'audit précédent** (section 8).

Fichiers ouverts : `lib/estimateur/core.ts`, `lib/estimateur/catalog.json`, `lib/estimateur/presets.ts`, `lib/estimateur/pieces.ts`, `lib/estimateur/projet.ts`, `lib/validation.ts`, `components/Estimateur.tsx`, `components/EstimationResultat.tsx`, `supabase/migrations/0001_tenancy.sql`, `maquettes/plan-editor.html`, `maquettes/carnet/carnet-detail-vs-plan.tsv`, `maquettes/carnet/autoqty-formules.json`, `maquettes/tools/coherence.mjs` (exécuté).

---

## 1. Audit de l'estimateur — la source de vérité

### 1.1 Catégories et périmètre

| Grandeur | Valeur vérifiée | Preuve |
|---|---|---|
| Lots (corps d'état) | **18** | `lib/estimateur/catalog.json` |
| Postes | **200** | idem |
| Phases | **4** — Préparation / Gros œuvre & clos-couvert / Second œuvre / Équipements | `lib/estimateur/core.ts:157` |
| Répartition des lots par phase | 4 / 5 / 8 / 1 | `catalog.json` (champ `l.p`) |
| Unités | **m² 77 · u 60 · forfait 33 · ml 19 · jour 11** | `catalog.json` (champ `t.u`) |
| TVA par défaut du lot | 15 lots à 10 % · 3 lots à 20 % (Etudes / Conception, Location de matériel, Raccordements aux réseaux) | `catalog.json` (champ `l.tva`) |
| Postes portant leur propre TVA | **14** | `catalog.json` (champ `t.tva`) |

Les 18 lots, avec leur nombre de postes : Etudes / Conception (9), Annexes de chantier (4), Location de matériel (12), Raccordements aux réseaux (7), Démolition (10), Maçonnerie (14), Charpente, couverture & structure bois (21), Façade (10), Menuiseries exterieures (12), Isolation (6), Cloisons / Platrerie (12), Electricite (14), Plomberie (19), Chauffage / VMC (11), Carrelage / Revetements (12), Peinture (10), Menuiseries interieures (8), Cuisine (9).

**Les unités « point » et « pct » citées en commentaire de `core.ts` n'existent dans aucun poste.**

### 1.2 Structure des données — ce qui est stocké, ce qui est recalculé

Toute la saisie de l'utilisateur tient dans **quatre objets sérialisés** dans une seule colonne :

```
projects.reponses (jsonb)  ←  supabase/migrations/0001_tenancy.sql:38
= { v:"estimateur", mode:"detaille", ctx, sel, codePostal, custom[], statuts? }
   components/Estimateur.tsx:260
```

- **`Ctx`** (`core.ts:51-75`) : 13 champs obligatoires (`surface`, `surfaceSol`, `surfaceSolManual`, `niveaux`, `type`, `hauteur`, `pieces`, `fenetres`, `sdb`, `wc`, `budget`, `aleas`, `finition`) + 15 optionnels (`fiscal`, `codePostal`, `sejour`, `cuisine`, `chambres`, `suites`, `couloir`, `buanderie`, `perimetre`, `espace`, `espaces`, `zChambre`, `zSdb`, `zDressing`, `avecDressing`).
- **`Selection = Record<string, LigneSel>`** (`core.ts:91`). Le type est un `Record<string, …>` **nu** : la convention de clé n'est pas portée par TypeScript, elle est portée par `key(c,n) = c + "|" + n` (`core.ts:250`), respectée partout (`lineHT:501`, `bilan:566`, `buildDevis:604`, `projet.ts:33`).
- **`LigneSel`** (`core.ts:77-90`) : 12 champs **tous optionnels** — `on`, `self`, `qty`, `manual`, `mat`, `vit`, `mot`, `tai`, `vsel`, `note`, `pu`, `pm`.
- **`CustomLine`** (`core.ts:529`) : lignes hors catalogue, avec leur propre `prix` et `qte`.
- **`statuts`** : `Record<"corps|nom", number>` (`projet.ts:18, 29-35`), avancement de chantier.

**Tout le reste est recalculé à chaque affichage** : quantités auto, `piecesEff`, `sdbEff`, prix effectifs, coefficients de finition, coefficient régional, TVA, `lineHT`/`lotHT`/`totals`/`bilan`/`buildDevis`. `estimationProjet()` et `avancementProjet()` rejouent `buildDevis()` à chaque rendu (`projet.ts:28, 52`). **Conséquence forte et utile : un projet enregistré sans plan reste insensible à tout ce qu'on ajoutera** — les chemins de lecture ne testent que `v==="estimateur" && ctx` (`projet.ts:44`).

Le catalogue est un **import statique** de `catalog.json` (`lib/estimateur/catalog.ts`) : aucune surcharge de prix depuis la base. Les tables `kb_postes.id` et `moteur_prix.poste_id` concernent un autre moteur et ne sont lues par aucun code applicatif.

### 1.3 Identité d'un poste : une phrase française

`key(c, n)` est la **seule** identité. `catalog.json` ne contient **aucun champ `id`** — les clés de tâche relevées sur les 200 postes sont `n, u, fp, sm, tva, note, fixe, mat, matPvc, matDef, vitrage, moto, taille, taillePetit, vars, grid`.

J'ai vérifié : **il n'y a aucun doublon de libellé sur les 200 postes**, ni entre lots ni à l'intérieur d'un lot. La clé composite est donc unique aujourd'hui, et `t.n` seul le serait aussi.

Deux fragilités actives :
1. Le suivi de chantier utilise un **espace de clés différent** : `key(corps, nom + variantLabel(...))` depuis les lignes de devis (`core.ts:604`, lu en `projet.ts:33` et `EstimationResultat.tsx:515`). Donc `« Plomberie|Meuble-vasque (double) »` pour `statuts` contre `« Plomberie|Meuble-vasque »` pour `sel`. Changer la variante d'une ligne déplace sa clé de statut et **perd l'avancement déjà saisi**, sans aucun renommage de catalogue.
2. Les mêmes chaînes servent de clés de traduction EN (`catalog-i18n.ts`), et `EstimationResultat.tsx` traduit le nom **suffixé** de la variante — donc l'affichage EN retombe en FR sur toute ligne à variante.

### 1.4 Variables quantitatives : d'où viennent les quantités

Il n'y a **qu'une seule porte d'entrée**, et elle fait quatre lignes :

```
qtyOf(ctx, sel, c, t)                                  core.ts:478-483
  1. si t.u === "forfait"                → return 1    ← 33 postes, la qty n'est JAMAIS lue
  2. si isAuto(ctx,c,t.n) && !s.manual   → autoQty()    ← 81 postes, le proxy GAGNE
  3. sinon                               → s.qty ?? 0
```

`qtyOf` est traversée par **tous** les chemins d'argent : `lineHT` (`core.ts:505`), `bilan` (`571`), `buildDevis` (`608`), et la page résultat qui la rejoue (`EstimationResultat.tsx:331`). Aucun autre chemin n'existe pour un poste du catalogue.

**Décompte exact des postes auto — corrigé :**

| | Nombre | Vérification |
|---|---|---|
| Clés de la table `A` d'`autoQty` | **80** (`core.ts:426-467`) | comptées par script ; **0 orpheline**, toutes apparient un poste du catalogue |
| + le cas spécial `FINI` | 1 (`core.ts:421`) | « Finitions plâtrerie (bandes, enduit) » via `derivedFinitions` |
| **Total postes auto** | **81** | |
| Dont au forfait | **0** | aucun poste auto n'est au forfait |
| Répartition | **59 m² · 19 u · 3 ml** | |
| Postes **sans** auto et **non** forfait | **86** | cochés, ils affichent 0 et pèsent 0 € |

Le carnet et `autoqty-formules.json` n'en connaissent que **78**. J'ai identifié exactement les manquants : `« Créer un plancher bois »` et `« Plancher béton (étage créé) »` (tous deux `Math.max(0, S − SS)`, `core.ts:449`), et `FINI`. **Le carnet doit passer à 81 lignes auto avant de servir de base de mapping** — sinon le plan écrira une `qty` sans `manual:true` sur ces trois postes et sa mesure réelle sera écrasée en silence.

Les grandeurs pilotes d'`autoQty` (`core.ts:393-399`) :
- `S = ctx.surface` (393), `SS = ctx.surfaceSol || S` (394) — **le repli est ici, pas dans `deriveSol`**
- `roof = SS × 1,4` (395), `facade = 4·√SS · hauteur · niveaux · 1,25` (396)
- `P = piecesEff(ctx)`, `SDB = sdbEff(ctx)` (397), `placo = S × (hauteur+1)` (398), `rj45` (399)

`deriveSol()` (`core.ts:361-363`) n'est **jamais** appelée par `autoQty` : son seul appelant du dépôt est le handler de champ `onNum` (`Estimateur.tsx:148`). Un `ctx` construit programmatiquement ne la déclenche jamais.

**31 des 80 formules dépendent de `SS`** : 7 en direct (combles perdus, combles aménagés, sol/plancher bas, toit plat, gouttières, plancher bois, plancher béton), 11 via `facade`, 13 via `roof`.

### 1.5 Dépendances entre postes — `autoQty` lit la sélection

Trois dérivations relisent `sel`, donc **une injection doit écrire les parents avant de se fier aux enfants** :

| Poste dérivé | Formule | Parents lus | Preuve |
|---|---|---|---|
| Finitions plâtrerie (bandes, enduit) | `2 × Monter une cloison + Doubler un mur + Faux plafond` | 3 postes du lot Cloisons, à leur quantité **effective** | `core.ts:381-389`, branché en `421` |
| Robinetterie lavabo | `qty(Meuble-vasque) × (vsel.config==='double' ? 2 : 1)` | Meuble-vasque + sa variante | `core.ts:400-404` |
| Étanchéité sous carrelage (SPEC douche) | surface reconstruite depuis la **dimension `vsel`** du bac | Bac de douche, Douche à l'italienne | `core.ts:406-420` |

Piège vérifié sur le troisième : quand le bac est coché en mode auto et que `SDB` vaut 0, `area += per * (q || 1)` (`core.ts:417`) transforme ce 0 en 1 → **le poste d'étanchéité reste chiffré ~6,6 m² pendant que le bac qu'il étanche est à 0**. Ce n'est pas un zéro franc, c'est une incohérence silencieuse.

`FINI` n'inclut **ni** « Cloison pièce humide (hydrofuge) » **ni** « Cloison anti-bruit » : une cloison de SDB routée vers le poste hydrofuge perd ses bandes et son enduit.

Six libellés sont donc **load-bearing** dans le code : « Monter une cloison », « Doubler un mur », « Faux plafond », « Meuble-vasque », « Bac de douche », « Douche à l'italienne ». Un libellé mal orthographié au branchement ne lève **aucune erreur** : il met la quantité dérivée à zéro.

### 1.6 Options qui influencent le prix

```
lineHT (core.ts:500-522), dans cet ordre :
q = qtyOf()  →  {fp,sm} = effPrices()  →  fc = finCoefTask()  →  R = regionCoef(ctx.codePostal)
formule normale :  (sm × fc × R.mat  +  (fp − sm) × R.mo) × q
```

**Aucun coefficient ne touche la quantité. Tous s'appliquent au prix unitaire.** C'est ce qui rend le branchement possible sans toucher au moteur.

Priorités dans `lineHT`, du plus fort au plus faible :
1. lot « Location de matériel » → `(s.pu ?? fp) × q` (ni finition ni régional, `core.ts:509`)
2. `self && pm` → `pm × q`
3. `self` → `(sm ?? fp) × fc × R.mat × q`
4. `pu` → `pu × q` (total figé)
5. `pm` → `(pm + (fp − sm) × R.mo) × q`
6. sinon la formule normale ; et si `sm === null` (**32 postes**) → `fp × R.mo × q`, où `fc` est calculé mais **non utilisé**.

Variantes (`effPrices`, `core.ts:104-131`) : produit des coefficients des groupes `vars` × `MAT_COEF` × `VIT_COEF` × `MOT_COEF` × `TAILLE_COEF`, puis arrondi. Si le poste a `grid` + `vars`, la grille donne le prix exact de la combinaison et court-circuite tout (un seul poste : Sèche-serviette, vérifié). **19 postes portent `vars`**, 3 portent `fixe`.

Défauts implicites à connaître (`core.ts:94-102`) : matériau = **alu si finition premium, sinon PVC à 0,60** ; vitrage = double (1,00) ; **motorisation = MOTORISÉ (1,60)** ; taille = grand (1,00). Un poste `moto` laissé sans choix est chiffré motorisé, +60 %.

Finition : `finCoefTask` renvoie **1** dès que le poste porte `fixe | mat | vitrage | moto | taille | vars` (`core.ts:199`) — soit 22 postes au minimum ; la finition ne touche que les **matériaux** (`sm`), jamais la main-d'œuvre.

TVA : calculée **par ligne**, jamais globalement (`effRate`, `core.ts:489-498`). Ordre : `self` → 20 % ; `ctx.fiscal === "pro"` → 20 % ; option de variante portant `tva` ; sinon `t.tva ?? l.tva ?? 10`. **Seul `=== "pro"` est testé** : tout le reste, `undefined` inclus, donne le taux réduit.

Aléas : `totals()` (`core.ts:545-558`) — `ht` **exclut** les aléas, `aleasBase` est le `ht` de tous les lots **sauf** Etudes / Conception, et les aléas ne portent **aucune TVA**. Donc `ht × (1 + taux)` ne redonne jamais le TTC affiché, et toute quantité du plan gonfle mécaniquement les aléas.

### 1.7 Filtres de visibilité — un piège pour le plan

- `visible(ctx, l)` (`core.ts:334-341`) masque un lot quand `ctx.perimetre === "piece"` et que le lot n'est pas dans `espacesLots()`. Il est appliqué dans `totals` (547), `bilan` (564) et `buildDevis` (593) — **mais pas dans `lineHT`/`lotHT`/`lotTTC`**. Un lot masqué garde des lignes cochées et un `lotHT` non nul, invisibles au total.
- `visibleTask(ctx, t)` (`core.ts:351`) masque `HIDE_APPART_TASK` (charpente, fermettes, traitement, dépose complète + les 13 `TOITURE_TASKS`) dès que `ctx.type !== "Maison"`. Celui-là **est** appliqué dans `lineHT` (503). **Une toiture dessinée est silencieusement ramenée à zéro si `ctx.type` n'est pas « Maison ».**

Aucun des 7 espaces à liste explicite ne contient Maçonnerie, Façade, Menuiseries exterieures, Raccordements ni Annexes de chantier. `combles` contient bien Charpente. `autre` a `lots:null` et rouvre tout.

### 1.8 Compteurs de pièces : un instantané figé

`ESPACES` (`core.ts:259-291`) ne connaît **que 7 clés** : `sdb, suite, cuisine, sejour, chambre, combles, autre`. `espacesCompo()` (`core.ts:320-332`) somme les `ctx` partiels et écrit `surface / surfaceSol / sdb / wc / chambres / suites / sejour / cuisine / couloir / buanderie / fenetres` **dans `ctx` au moment du clic** (appelée en `Estimateur.tsx:170`) — plus `surfaceSolManual: true` et `niveaux: 1` (`core.ts:331`), ce qui **neutralise définitivement** `deriveSol`.

`ESPACES.autre` ne porte que `{niveaux:1}` : aucun compteur. `selectedEspaces` filtre toute clé inconnue sans le dire (`core.ts:299`), `espacesCompo` fait `continue` (`324`). **22 quantités auto dépendent de ces compteurs** (5 via `P`, 13 via `SDB`, + `vasques`, `rj45`, `specArea`, `ctx.wc`) : mapper les types de pièces du plan vers `autre` produit 21 postes à zéro + 1 poste incohérent, **sans aucun message**.

Point vérifié utile : `ctx.fenetres` n'est lu par **aucune** formule d'`autoQty`. C'est un champ mort côté chiffrage ; les menuiseries sont toutes en quantité saisie (le mode rapide écrit d'ailleurs `sel[key("Menuiseries exterieures","Fenêtres")].qty = fenetres`, `presets.ts:105`).

### 1.9 Le tuyau d'injection existe déjà et tourne en production

Deux précédents dans le dépôt écrivent exactement le contrat dont le plan a besoin :

```
pieces.ts:167   sel[k] = { on:true, self, qty: Math.round(qty), manual:true }
presets.ts:118-119   sel[k] = { on:true, self } ; puis  sel[k].qty = … ; sel[k].manual = true
```

`presetPieces` cumule d'ailleurs déjà les quantités de **toutes les pièces sur une seule clé** (`pieces.ts:153-161`) — c'est le même effondrement que le plan devra faire.

### 1.10 Un seul écran de saisie

L'estimateur détaillé n'a qu'un écran (« Ma saisie ») : la carte « Parlez-nous du bien » qui remplit `ctx`, puis les accordéons de lots qui remplissent `sel`. Le second onglet est en lecture seule. La correction d'une quantité passe par `onQty` (`Estimateur.tsx:488`), qui force `manual: true` si le poste est auto ; le bascule auto/manuel est `toggleAuto` (`Estimateur.tsx:235-242`), qui **conserve `qty`** (il ne fait que basculer `manual`) — donc une mesure du plan n'est pas détruite par un clic, elle est **masquée** et remplacée par le proxy dans tout le chiffrage, sans aucune trace à l'écran.

---

## 2. Audit de l'éditeur de plan

### 2.1 Forme de l'état

3 126 lignes, **un seul `<script>`, zéro dépendance**.

```
state = { id?, name, cur, mode:'existant'|'projet'|'final', levels[], done{}, groups[],
          chantier:{finition,cp,plus2ans}, toiture?, notes? }      plan-editor.html:652
Level  = { id, name, height:2.5, walls[], openings[], rooms[], items[], dims[], texts[], bg }   :624
```

- **wall** : `{id, a, b, type:'cloison'|'mur'|'porteur'|'virtuel', t?, porteur?, side?, st?, iso?, iso2?, facade?, product?, note?}`. `WALL_TYPES` (`:493`) = Cloison 0,07 / Parpaing 0,20 / **Pierre 0,60** / Séparation 0. Un doublage **par face** (`isoLayers`, `:924`).
- **opening** : `{id, wallId, t, type, w, h, side, hinge, st?, allege?, dormant?, vitrage?, mat?, ouvrant?, pose?, volet?, opts?[], product?, note?}`. `OPENINGS` (`:498-509`) = **11 types**, 7 `cat:'porte'` + 4 `cat:'fenetre'`.
- **item** : `{id, type, x, y, w, h, rot, st?, stair?, link?, product?, note?}`. `ITEMS` (`:511`) portent les drapeaux `elec` et `plomb` qui alimentent les compteurs. **`evier`, `vmc`, `velux` existent bel et bien** (`:519`, `:526`, `:534`) — deux lignes du carnet les déclarent absents, c'est faux.
- **room** (fiche) : `{id, type, name, floor, anchor, poly, height?, lowPct?, floorNew?, sol?, note?, products?}`. `ROOM_TYPES` (`:455-462`) = **20 types**, dont `exterieur` marqué `ext` et `garage`/`cave`/`combles` marqués `nh`.
- **dim / text** : coordonnées pures, **aucune référence à un mur**, aucune contribution à une quantité.
- **state.toiture** : **unique pour tout le plan**, appliquée au dernier niveau, sur le **rectangle enveloppe** des murs extérieurs (`toitureGeom`, `:707-719`).

Persistance : `localStorage 'avyora-plan-v2'` (`:1321`), images dans une clé séparée plafonnée à 3,5 Mo. **Aucun lien avec `projects.reponses`.**

### 2.2 Les 29 clés de `quantities()` (`plan-editor.html:2734-2793`)

`area`, `areaBefore`, `ext`, `rooms`, `roomsBefore`, `doors`, `windows`, `wallPaint`, `glass`, `plinthes`, `toiture`, `lin{cloison,mur,porteur}`, `byType{type→m²}`, `levels[]`, `travaux{}`, `plomberie{8}`, `velux`, `etudes{structure,mlPorteurDemoli}`, `contexte{3}`, `produits[]`, `produitsTotal`, `notes`, `sols[]`, `electricite{5}`, `chauffage{8}`, `doublage{iti,ite,surface,surfacePerdue,aCreer,parMateriau}`, `facades{aFaire,parPoste,existant}`, `controles[]`, `suivi{total,faits,taches[]}`.

Seul détail par élément : `levels[].rooms[]` (**14 champs** à `:2743`, +`note`/`produits` ajoutés à `:2788`), `levels[].menuiseries[]` (`:2756`, seulement `{type,l,h,allege,etat}`), `sols[]`, `produits[]`, `suivi.taches[]`, `controles[]`. `levels[].items` est **un simple tableau de chaînes de types** (`:2755`).

Conventions de mesure vérifiées :
- `areaNet` = `(areaInt − trémie) × (1 − lowPct/100)` (`:1183`)
- `wallPaintArea` = `perimReal × roomHeight − ouvertures` (`:1185`)
- `facadeArea` = `wallLen × lv.height − ouvertures + triangle de pignon` (`:1011`)
- doublage ITI/ITE = `wallLen(w) × lv.height`, **sans aucune déduction d'ouverture** (`:2778`)
- `plinthes` = `perimReal − largeur des portes` (`:2742`)
- toiture : `surface = Lx·Ly / cos(pente)` débord 0,30 m inclus, `emprise = R.L × R.W`, `egouts`, `faitage`, `aretiers`, `raccords = faitage + aretiers` (`:719`)

### 2.3 Ce que le plan détient déjà et que l'estimateur n'a pas

- **L'état de l'existant pièce par pièce** : `FLOORS_EX` (`:468`), `r.floor`, `solPlan` (`:474`), `sols[].existant/depose/dalle/betonFini`.
- **L'état de chaque élément** : murs `existant|creer|demolir` (`:859`), ouvertures `existant|creer|remplacer|boucher`, équipements `existant|creer|demolir` (`:868`). Le champ est **supprimé** au retour à l'existant : l'absence de champ *est* la valeur. Il n'y a **aucun état « à conserver »** distinct de « rien décidé », et **`remplacer` n'existe que pour les ouvertures**.
- **Les dimensions** : `o.w`, `o.h`, `allege` par menuiserie ; `it.w` par équipement (éditable, `:2508`).
- **Une hauteur par niveau** (`lv.height`) et une surcharge **par pièce** (`r.height`, lue par `roomHeight` `:1128`).

### 2.4 Une deuxième chaîne de chiffrage, interdite par la règle absolue

`chantierTasks()` (`:799-835`) calcule un `prix` par tâche depuis `PRIX` (`:981`), `PRIX_TOIT` (`:696`), `EQUIP_PRIX` (`:681`), `FACADE_PRIX` (`:998`), `VITRAGE_COEF`, `MENUIS_OPTS` — **sans coefficient de finition, sans coefficient régional, sans TVA, sans aléas** — et `chantierPrix()` (`:837`) en fait un total par lot. Ce total ne peut **structurellement** pas égaler celui du moteur, même à prix identiques.

Ses lots sont les **9** `LOTS` de la maquette (`:679`) : Démolition, Maçonnerie, Toiture, Menuiseries, Cloisons, Isolation, Sol, Façade, Équipements. Seuls **4** correspondent au caractère près à un `l.c` du catalogue (Démolition, Maçonnerie, Isolation, Façade). « Toiture » ↔ « Charpente, couverture & structure bois » ; « Cloisons » ↔ « Cloisons / Platrerie » ; « Menuiseries » recouvre deux lots ; « Sol » traverse trois lots ; et **« Équipements » est le nom d'une PHASE du moteur** (`core.ts:157`).

Détail que l'audit précédent avait faux : `sol-iso` est poussé dans le lot **`'Sol'`** de la maquette (`:824`), pas `'Isolation'`. Et `toit:depose` est poussé dans **`'Démolition'`** (`:756`) alors que « Dépose complète de toiture » vit au lot Charpente du catalogue.

### 2.5 Identifiants

- `uid()` = `Math.random().toString(36).slice(2,9)` (`:622`) — au plus 7 caractères base36, non typé, non ordonné, sans contrôle de collision.
- Les ids de **murs, ouvertures, équipements** survivent à la sauvegarde (`snapshot` `:1316`, `save` `:1321`) : ce sont des clés stables.
- Les ids de **pièces** sont ré-appariés à chaque édition par `syncRooms` en 3 passes (`:1096-1118`) : ancrage → recouvrement avec le polygone persisté (`:1115`) → fiche neuve `{id:uid(),…}` (`:1113`). Le cas où la perte de `roomId` est **garantie** est le découpage d'une pièce par une nouvelle cloison, et symétriquement la fusion après suppression d'un mur. Les orphelines sont purgées au-delà de `used.size + 30` (`:1117`).
- `facesFor(lv, m)` affecte l'id littéral **`'tmp'`** à toute face sans fiche dès que le mode demandé diffère du mode courant (`:2614`), avec un `find` **nu** (sans le tri du plus petit d'abord ni le `Set used` de `syncRooms`) — donc une même fiche réelle peut être rattachée à plusieurs faces. Et la fiche `tmp` reçoit `guessType(areaInt, [])` avec un `usedTypes` **vide**, alors que `RT[type].ext`/`.nh` décide si la surface tombe dans `area`, dans `ext` ou nulle part : **`area`, `ext` et `byType` dépendent réellement de la vue affichée**.
- **Le schéma d'identifiants existe déjà et fonctionne pour l'AVANCEMENT** : `chantierTasks()` forge `w:<wallId>:demolir`, `o:<opId>:poser`, `sol-rev:<roomId>`, `i:<itemId>:creer`, `fac:<wallId>:<fin>`, `iso:<wallId>` ; `taskElem()` (`:845`) les reparse ; `state.done` s'y indexe (`:838`). `suivi.taches[]` transporte ces ids. **Aucune des quantités agrégées ne transporte le sien.**

### 2.6 Aucune frontière d'export

`quantities()` n'est appelée qu'en interne (aperçu, estimation, PDF). Il n'existe **aucun `postMessage`, aucun `JSON.stringify` de son résultat, aucun numéro de version de contrat**. Le seul endroit qui prétend l'exporter est le panneau « Voir le JSON envoyé au moteur » (`:2900`), et **il n'émet ni `toiture`, ni `sols`, ni `plomberie`, ni `etudes`, ni `velux`** — il émet `contexte, surface, surfaceAvant, exterieur, pieces, portes, fenetres, mursPeinture, plafonds, plinthes, vitrage, lineaires, travaux, electricite, chauffage, doublage, facades, controles, suivi, produits, budgetProduitsHT, prixProduits, notes, niveaux`.

Ce panneau écrit déjà `surface: q.area` et `pieces: q.byType` — donc **l'incohérence habitable/non-habitable est déjà matérialisée dans la charge utile** (§5.2).

---

## 3. Matrice de correspondance

Je donne les lignes qui portent le plus de valeur, avec le chemin exact dans `quantities()`, et je dis combien de postes suivent la même règle. Les libellés de postes sont ceux du catalogue **tel qu'il est aujourd'hui**.

### 3.1 Le cas parfait : Façade — 8 postes, zéro traduction

J'ai vérifié les 8 `FACADES[].poste` (`plan-editor.html:947-956`) contre les libellés du lot Façade : **ils sont identiques au caractère près**.

| Poste | Lot | U | Élément du plan | Donnée récupérable | Classe |
|---|---|---|---|---|---|
| Nettoyer la façade | Façade | m² | mur avec `facade.fins` et `facade.st==='creer'` | `q.facades.parPoste["Nettoyer la façade"]` | **A** |
| Enduit monocouche (machine) | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Enduit à la chaux (maison ancienne) | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Peindre la façade | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Refaire les joints / rejointoiement (pierre, briquette, moellon) | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Ravalement façade pierre (tout compris) | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Bardage | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |
| Traitement imperméabilisant | Façade | m² | idem | `q.facades.parPoste[…]` | **A** |

⚠ `q.facades.existant` est indexé par **label** (pas par poste) et décrit la finition **conservée** : ne jamais le facturer.

### 3.2 Toiture — 1 grandeur, 18 postes déclenchés par une règle déjà écrite

| Poste | Lot | U | Donnée | Remplace | Classe |
|---|---|---|---|---|---|
| Les 13 `TOITURE_TASKS` + Charpente trad. / fermettes / Traiter / Dépose complète | Charpente… | m² | `q.toiture.surface` | `roof = SS × 1,4` (`core.ts:395`) | **B** (quantité) / **A** (déclenchement) |
| Gouttières & descentes | Charpente… | ml | `q.toiture.egouts` | `4·√SS + 4·h·niveaux` (`core.ts:462`) | **B** |
| **Raccords (faîtage, noues, solins)** | Charpente… | ml | `q.toiture.raccords` (= faîtage + arêtiers) | *aucun autoQty* | **B** |
| Isolation des combles perdus (soufflage) | Isolation | m² | `q.toiture.emprise` | `SS` | **B** |
| Isolation des combles aménagés (rampants) | Isolation | m² | `q.toiture.surface` | `SS` (`core.ts:430`) | **B** |
| Toit plat (étanchéité) | Charpente… | m² | `q.toiture.surface` si `forme==='plat'` | `SS` | **B** |
| Fenêtre de toit (Velux) | Charpente… | u | `q.velux` **ou** `q.toiture.projet.velux` | — | **A**, à trancher |

Quelle combinaison est active est **déjà décidé** par `q.toiture.projet.action` + `q.toiture.couverture`, exactement comme `toitureTasks` (`:749-762`). Mais ses libellés ne sont pas ceux du catalogue : `« Couverture tuiles + sous-toiture »` (`:758`) est une ligne **fusionnée** à rééclater en deux postes, et `« Traiter la charpente (préventif) »` / `« Toiture complète tuile (charpente traditionnelle + couverture) »` diffèrent des libellés catalogue.

### 3.3 Sols — la plus grosse valeur, et la moins branchable

`q.sols[]` = `{piece, niveau, surface, existant, revetement, depose, dalle, betonFini, isolant, chape, ragreage, alerte}` (`:2793`).

| Poste | Lot | U | Donnée | Remplace | Classe |
|---|---|---|---|---|---|
| Carrelage au sol / Sol stratifié / Parquet bois / Sol souple / Moquette / Béton ciré (6 postes) | Carrelage / Revetements | m² | `Σ sols[].surface` groupé par `revetement` | `S × 0,6` et `S × 0,4` (`core.ts:450-454`) | **A** |
| Enlever un revêtement de sol | Démolition | m² | `Σ sols[].surface où depose` | `S` (`core.ts:429`) | **B** |
| Casser une dalle / vieux sol · Couler une dalle béton | Démolition / Maçonnerie | m² | `Σ sols[].surface où dalle` | *aucun* | **B** |
| Chape traditionnelle · Chape liquide | Maçonnerie | m² | `Σ … où chape==='tradi'` / `'liquide'` | `S` | **A** |
| Préparation du sol (ragréage) | Carrelage / Revetements | m² | `Σ … où ragreage` | `S` | **A** |
| Isolation du sol / plancher bas | Isolation | m² | `Σ … où isolant !== null` | `SS` | **A** |
| Plancher chauffant | Chauffage / VMC | m² | **aucune source** | reste sur `S` | **C** en l'état |

Trois trous durs : **`FLOORS_NEW` a 7 valeurs pour 6 postes** — `« Béton fini (dalle lissée / quartz) »` n'a aucun poste ; `« Parquet »` ne dit pas s'il faut *Parquet bois* (90 €) ou *Ponçage + vitrification* (40 €) ; et le cas « garder et poncer le parquet ancien » n'est **pas exprimable** (`solPlan` n'a pas d'étape de rénovation de l'existant, et une pièce dont on garde le sol sort de l'export).

### 3.4 Doublage et murs

| Poste | Lot | U | Donnée | Remplace |
|---|---|---|---|---|
| Isolation des murs par l'intérieur | Isolation | m² | `q.doublage.iti` (détail `parMateriau["ITI …"]`) | `facade` (`core.ts:431`) |
| Doubler un mur | Cloisons / Platrerie | m² | `q.doublage.iti` — **la MÊME donnée** | `facade` (`core.ts:448`) |
| Isolation par l'extérieur (ITE) | Façade | m² | `q.doublage.ite` | `facade` |
| Abattre une cloison / un mur non porteur | Démolition | m² | **pas de source** — `demolLin` est en ml par type, `demolM2` est un scalaire tous types confondus (`:2746`) | *aucun* |
| Monter une cloison / un mur en parpaings | Cloisons / Maçonnerie | m² | **pas de source** — même problème sur `creerLin`/`creerM2` (`:2748`) | `S × 0,35` pour la cloison |

`q.doublage.surface` (= iti + ite, `:2781`) est **inutilisable** : versé dans « Doubler un mur », l'ITE entre dans `FINI` — des bandes d'enduit sur de l'isolation extérieure.

### 3.5 Comptages d'objets — le lot le plus propre après la Façade

| Poste | Lot | U | Donnée | Remplace |
|---|---|---|---|---|
| Ajouter / déplacer une prise · un interrupteur · Ajouter un point lumineux | Electricite | u | `q.electricite.prises / .interrupteurs / .pointsLumineux` | *aucun* |
| Spots encastrés (LED) | Electricite | u | `q.electricite.pointsLumineux` — **même donnée que le point lumineux** | `S / 2` (`core.ts:440`) |
| WC · Installer une baignoire · Robinetterie baignoire | Plomberie | u | `q.plomberie.wc / .baignoires` | `ctx.wc`, `SDB` |
| Évier + robinetterie | Cuisine | u | `q.plomberie.eviers` | *aucun* |
| Chauffe-eau électrique (cumulus) | Plomberie | u | `q.plomberie.chauffeEau` **ou** `q.chauffage.chauffeEau` — `cumulus` alimente **les deux** (`:2771`, `:2774`) | *aucun* |
| Radiateurs électriques · Sèche-serviette | Chauffage / VMC | u | `q.chauffage.radiateurs / .secheServiettes` | `P`, `SDB` |
| Climatisation réversible (split) | Chauffage / VMC | u | `q.chauffage.clim` — **ne pas facturer `.uniteExt`** | *aucun* |
| Poêle · Chaudière gaz | Chauffage / VMC | u | `q.chauffage.poele / .chaudiere` | *aucun* |
| Ventilation (VMC) | Chauffage / VMC | u | `q.chauffage.vmc` | **la constante `1`** (`core.ts:447`) |
| Îlot central | Cuisine | u | `levels[].items` filtré sur `'ilot'` | *aucun* |
| Escalier en bois **ou** Escalier en béton | Charpente / Maçonnerie | u | `Σ levels[].escaliers` — **le plan ne dit pas lequel** | *aucun* |

⚠ `EQUIP_PRIX.prise2 = 100` alors que `quantities()` compte une prise double comme **2** prises (`:2773`) : le compteur interne facture 100 €, le moteur en facturera 2 × 100 €.

### 3.6 Surfaces murs / plafonds — 6 postes sur une seule donnée

| Poste | Lot | U | Donnée | Remplace |
|---|---|---|---|---|
| Peinture des murs · Préparation des surfaces · Sous-couche / primaire | Peinture | m² | `q.wallPaint` | `S × ctx.hauteur` |
| Retirer l'ancien papier peint · Enlever un revêtement mural | Peinture / Démolition | m² | `q.wallPaint` | *aucun* / `S` |
| Peinture des plafonds | Peinture | m² | `q.area` (⚠ `areaNet`, sous-pente déduite) | `S` |
| Plinthes | Carrelage / Revetements | ml | `q.plinthes` | `4·√(S×P)` (`core.ts:455`) |
| Seuils / barres de seuil · Peinture des boiseries | Carrelage / Peinture | u | `q.doors` | `P` |
| Ratissage léger / lourd · Pare-vapeur | Cloisons / Isolation | m² | `q.wallPaint + q.area` | `placo = S × (h+1)` |

### 3.7 Menuiseries

| Poste | Lot | U | Donnée |
|---|---|---|---|
| Fenêtres · Portes-fenêtres · Baie vitrée · Porte d'entrée · Porte de garage (5) | Menuiseries exterieures | u | comptage de `levels[].menuiseries[]` où `etat ∈ {creer, remplacer}`, groupé par `type` |
| Porte intérieure battante · âme pleine · coulissante (3) | Menuiseries interieures | u | comptage par `type` |
| Volets roulants / battants · Moustiquaires · Stores · Grilles (5) | Menuiseries exterieures | u | **`opts` et `volet` ne sont PAS exportés** → C en l'état |
| Enlever les anciennes portes / fenêtres | Démolition | u | `q.travaux.boucher` + déposes — ⚠ double comptage possible avec `remplacer` |
| Caisson à galandage (châssis + habillage) | Cloisons / Platrerie | u | **`ouvrant` n'est pas exporté** → aucune source |

`OPENINGS.passage` et `porte_double` n'ont **aucun poste** au catalogue. Et `l`, `h`, `allege` sont exportés alors qu'**aucun poste de menuiserie n'a de variante de dimension** : une baie de 3 m et une fenêtre de 60 cm valent le même prix dans un même poste. `q.glass` (surface vitrée, m²) n'a **aucune destination** : les 12 postes Menuiseries exterieures sont tous en `u`.

### 3.8 Maçonnerie induite, études, annexes

| Poste | Lot | U | Donnée |
|---|---|---|---|
| Ouvrir un mur porteur — petite / grande | Maçonnerie | u | `q.travaux.percements` ne distingue **ni le porteur ni la largeur**, alors que `openingInduits` (`:1000-1005`) le fait déjà en interne (seuil baie : `kind bay/doorwin` ou `w ≥ 1,8`) |
| Créer un appui de fenêtre · un seuil de porte | Maçonnerie | u | `q.travaux.creerFenetres` / `.creerPortes` |
| Étude de structure | Etudes / Conception | **forfait** | `q.etudes.structure` (0/1) — **déclencheur, pas quantité** |
| Nettoyage de fin de chantier | Annexes | m² | `q.area` |
| Benne & évacuation · Installation · Sécurité de chantier | Annexes | **forfait** | aucune règle m² → bennes n'existe ; je ne l'invente pas |
| Créer un plancher bois **ou** Plancher béton (étage créé) | Charpente / Maçonnerie | m² | `Σ levels[i].rooms[].area` du niveau ajouté — **le plan ne dit pas bois ou béton** |
| Garde-corps | Charpente… | ml | **pas de source** : `rooms[].tremie` donne l'AIRE, pas le périmètre |
| Étanchéité sous carrelage (SPEC douche) | Carrelage | m² | **pas de source** : `it.w`/`it.h` de la douche ne sont pas exportés |
| Prise internet / TV (RJ45) | Electricite | u | **pas d'objet RJ45** dans `ITEMS` → reste sur `rj45` |
| Faux plafond | Cloisons | m² | mesurable, mais **le plan n'a pas de drapeau « faux plafond » par pièce** |

### 3.9 Le lot Cuisine reste entièrement à la main

`it.w` est éditable (`:2508`) et le chiffrage interne s'en sert déjà pour les prix au ml (`EQUIP_UNIT = {plan:'ml'}`, `:682`), **mais `quantities()` n'exporte que le type de l'objet** (`:2755`). Les 5 postes `ml` du lot Cuisine — Cuisine complète neuve — tout compris, Meubles de cuisine, Rafraîchir une cuisine (façades / plan), Plan de travail seul, Crédence seule — n'ont aucun `autoQty` et **aucune source**.

### 3.10 Bilan de la matrice

D'après le croisement carnet × `autoQty` que j'ai recalculé : sur les **61 postes classés MESURE**, 59 ont un `autoQty` à remplacer ; sur les **49 FOURNIT**, **35 n'ont aucun `autoQty`** — le plan y apporterait la *première* quantité, pas le remplacement d'un proxy. Les **73 QUESTION** (location, raccordements, diagnostics, pathologies) et les **13 REGLE** sont C par construction.

---

## 4. Classification A / B / C

**Règle appliquée** (technique, je la tranche) :

- **A — directement dessinable** : la quantité est un **comptage d'objets que l'utilisateur pose ou d'états qu'il déclare**. `ITEMS`, `OPENINGS` par état, couches d'isolation, finitions de façade, escaliers, cases cochées dans la fiche de pièce (chape, ragréage, isolant, revêtement). Aucun calcul géométrique : si l'objet est là, la quantité est là.
- **B — calculable depuis la géométrie** : la quantité **n'a pas d'objet propre**, elle se déduit des surfaces, périmètres et hauteurs. `wallPaint`, `plinthes`, `area`, `toiture.surface`, `egouts`, m² de placo, m² de démolition. Sensible aux conventions de mesure — c'est là que se cachent les écarts de ±10 à 40 %.
- **C — non géométrique** : reste dans l'estimateur. Location de matériel (11 postes, **seul l'utilisateur sait combien de jours**), Raccordements aux réseaux (7), Etudes / Conception (9), diagnostics, pathologies, choix de gamme, régime fiscal.

**Le forfait coupe transversalement les trois classes** : 33 postes, dont `qtyOf` retourne 1 en dur (`core.ts:479`) et pour lesquels `Estimateur.tsx:666` ne rend même pas de stepper. Un poste A ou B **au forfait est inatteignable** : le plan peut le cocher, jamais le quantifier. Exemples vérifiés : « Changer / mettre aux normes le tableau » (1 150 €, forfait) alors que le plan compte les tableaux posés ; « Dépose complète cuisine / salle de bain (curage) » (700 €, forfait) alors que le plan sait combien de SDB et de cuisines sont à curer ; « Étude de structure » (900 €, forfait), déclenchée par `q.etudes.structure`.

**Synthèse**, à partir du carnet corrigé :

| Classe | Ordre de grandeur | Où c'est propre | Où ça coince |
|---|---|---|---|
| **A** | ~60 postes | Façade (8), équipements plomberie/élec/chauffage (~20), revêtements de sol (6), couches de sol (4), menuiseries par état (8) | données jetées avant l'export (`it.w`, `opts`, `ouvrant`, dimensions de douche) |
| **B** | ~40 postes | peinture/plâtrerie (6), toiture (18), plinthes, plafonds, nettoyage | conventions divergentes (§5), et **m² par type de mur absents de l'export** |
| **C** | ~100 postes | assumé explicitement par le bloc HORS_PLAN de la maquette | rien à faire, c'est bien |

---

## 5. Les incohérences entre les deux systèmes

### 5.1 `surfaceSol` : deux grandeurs, un seul nom — et aucune emprise exploitable

`core.ts:53` : `surfaceSol` = **emprise du bâtiment**, qui pilote `roof = SS×1,4` et `facade = 4·√SS·h·niv·1,25`.
`plan-editor.html:2743` : `surfaceSol` = **`areaInt` d'UNE PIÈCE**, brut de trémie.

Un mappage par nom de champ somme les surfaces de pièces de tous les niveaux. Sur une maison R+1 de 80 m² d'emprise / 160 m² habitables : `SS = 160` au lieu de 80, donc `roof = 224` au lieu de 112 m². À 230 €/m² (« Toiture complète tuile »), c'est **+25 700 €** ; et `facade` passe de 223 à 316 m².

Pire : **le seul vrai footprint du fichier est `emprise` dans `toitureGeom` (`:718`)**, c'est la bounding box du **dernier** niveau (pas du RDC), exposée seulement via `toiture:toitureQ()` qui renvoie `null` sans toiture configurée — et `toiture` **n'est même pas dans le payload de `:2900`**. Si l'utilisateur n'ouvre pas le panneau Toiture, il n'existe **aucune emprise dans la sortie**, et les 31 formules `SS` retombent sur `SS = ctx.surfaceSol || S` (`core.ts:394`), soit la surface habitable entière.

Même piège sur un second nom : le payload émet `niveaux: q.levels` (un **tableau**) alors que `ctx.niveaux` est un **entier** — `(ctx.niveaux||1)` dans `facade` produirait un `NaN`.

### 5.2 `area` exclut ce que `byType`, `wallPaint` et `plinthes` comptent

`plan-editor.html:2742` : `if(isExt) ext+=an; else { if(!nh) area+=an; wallPaint+=wa; plinthes+=pl; byType[type]+=an; }`

Pour un **garage** : `area` n'augmente pas, mais `wallPaint`, `plinthes` et `byType` augmentent. Pour une **terrasse** : ni `area`, ni `wallPaint`, ni `plinthes` — mais la boucle sol de `chantierTasks` (`:817`) n'a **aucun garde** sur `ext`/`nh` et facture quand même son revêtement. Donc **`area ≠ Σ byType`**, et le compteur chiffre des m² que `area` cache.

En face, le moteur fait l'inverse : `ESPACES.combles` a `surface: 40` et `chambres: 1` (`core.ts:285-288`) — il traite les combles comme de l'habitable portant une chambre.

**24 formules dépendent de `S` seul** + 3 via `placo`. Sur le cas emblématique d'un aménagement de combles où le plan ne contient que le niveau combles, `area = 0` : le devis s'effondre à presque rien (sauf les forfaits et la VMC à 1) alors que le plan affiche des pièces, des murs peints et des sols posés.

### 5.3 Les proxys vont par FAMILLE : remplacer un membre double-compte

| Famille | Postes qui se partagent la même surface physique | Total si tout est coché |
|---|---|---|
| **Sols** | Carrelage 0,6·S · Béton ciré 0,6·S · stratifié/parquet/ponçage/souple/moquette 0,4·S chacun · ragréage/chape tradi/chape liquide/plancher chauffant 1,0·S chacun | **7,2 · S** |
| **Murs (peinture)** | Peinture des murs / Préparation / Sous-couche = `S×h` ; Ratissage léger/lourd / pare-vapeur = `S×(h+1)` | deux surfaces différentes, écart **+40 %** à h = 2,5 m |
| **Toiture** | le composite « Toiture complète tuile » **ET** ses composants (fermettes, couverture tuiles, sous-toiture), tous à `roof` | jusqu'à 4× la même toiture |
| **ITI** | « Doubler un mur » (Cloisons, 40/18, TVA 10) **et** « Isolation des murs par l'intérieur » (Isolation, 55/15, TVA 5,5) — **même formule `facade`** | 2× la même surface |

Rien dans le catalogue ni dans `autoQty` ne rend ces membres exclusifs : seul `s.on` les sépare. **Une quantité du plan ne peut donc pas être injectée poste par poste : il faut injecter par FAMILLE**, en posant explicitement `on:false` sur les membres que le dessin ne mesure pas.

**Et le doublon ITI n'attend pas le plan : il est déjà LIVE.** `presets.ts:46` coche « Isolation des murs par l'intérieur » et `presets.ts:47` coche « Doubler un mur », tous deux dans `COMPLETE_ADD` concaténé pour toute « réno complète » ou « lourde » (`presets.ts:93`). Aujourd'hui, en mode rapide, la même surface `facade` est chiffrée deux fois — à ~53,20 + ~36,94 €/m² HT en finition standard, coefficient régional 1. Ce n'est pas un risque de branchement, c'est une correction à faire dans l'estimateur, avec effet rétroactif sur les projets déjà enregistrés.

### 5.4 Trois conventions de surface de mur, dans le même envoi

- `wallPaintArea` **déduit** les ouvertures (`:1185`)
- `facadeArea` déduit les ouvertures **et ajoute** le triangle de pignon (`:1011`)
- le **doublage** fait `wallLen × lv.height`, **sans aucune déduction** (`:2778`, et la même expression dans `chantierTasks:801`)

Sur un mur de 6 m en h 2,50 avec une fenêtre 1,20 × 1,25, l'ITI est compté **15 m² au lieu de 13,5 m² nets (+11 %)** — et la tâche « Retour d'isolant en tableau » (`:813`) facture **en plus** `(2h + l)` ml sur cette même ouverture.

Deux hauteurs qui ne s'accordent pas : `lv.height` pilote le doublage, `demolM2`, `creerM2`, `facadeArea`, `stairCalc` ; `r.height` pilote `wallPaintArea` et le contrôle des 2,20 m. **Le même envoi transporte `height: roomHeight(lv, room)` par pièce (`:2743`) et des m² de travaux calculés à `lv.height`.** Une pièce à 2,20 m voit sa peinture mesurée à 2,20 m et la cloison qui la borde chiffrée à 2,50 m.

Enfin, asymétrie de robustesse : `facadeArea` retombe sur 2 m quand le type d'ouverture est inconnu (`o.h||OPENINGS[o.type]?.h||2`), tandis que `wallPaintArea` écrit `OPENINGS[o.type].h` **sans `?.` ni repli** — la même donnée corrompue fait planter le calcul de peinture.

### 5.5 État projet vs travaux : l'incohérence la plus coûteuse

Le commentaire d'en-tête (`:2733`) distingue explicitement les deux sémantiques. **La structure de sortie, non.**

| Sémantique | Clés concernées | Filtre |
|---|---|---|
| **État PROJET** (inclut l'existant conservé) | `plomberie`, `electricite`, `chauffage`, `velux`, `lin`, `byType`, `wallPaint`, `plinthes`, `doors`, `windows`, `glass`, `doublage.iti/.ite` | `itemActive(it,'projet')` = `ist(it)!=='demolir'` (`:869`) ; `isoShownIso` renvoie `true` pour toute couche sans `st` (`:927`) |
| **Delta TRAVAUX** | `travaux{}`, `etudes{}`, `facades.aFaire/parPoste`, `doublage.aCreer`, `sols[]`, `suivi{}`, `menuiseries[].etat`, `toiture.projet` | état déclaré |

Au moteur, **aucun poste n'est un inventaire** : « WC » a pour quantité auto `ctx.wc` (`core.ts:441`) et est chiffré fourni-posé. Brancher `plomberie.wc` sur ce poste **facture la pose de WC déjà en place**. `facades` sépare bien, mais de façon asymétrique (`parPoste` clé par poste, `existant` clé par label) et sans bucket « à déposer ».

Aggravant : `velux` est compté **deux fois avec deux sens** — `q.velux` depuis les objets posés, existants inclus (`:2772`), et `q.toiture.projet.velux`, un compteur manuel destiné aux velux **à créer** (`:761`).

### 5.6 Les prix recopiés dans la maquette

`coherence.mjs` tourne et rapporte **3 divergences sur 49 paires déclarées** — je l'ai exécuté, c'est exact :

| Clé maquette | Valeur | Poste catalogue | Valeur | Écart |
|---|---|---|---|---|
| `PRIX.cloisonNeuve` | 55 | Monter une cloison | 50 | +10 % |
| `PRIX.deposeSol` | 30 | Enlever un revêtement de sol | 20 | +50 % (et le commentaire du code dit « catalogue 30 » — **commentaire périmé**) |
| `EQUIP_PRIX.lavabo` | 310 | Vasque | 150 | +107 % |

**Mais son `PRIX_MAP` (49 entrées) n'entre pas dans les objets imbriqués.** J'ai vérifié à la main ce qu'il ne couvre pas, et j'y ai trouvé **6 divergences supplémentaires qui dorment** :

| Clé non contrôlée | Valeur | Poste | Valeur | Écart |
|---|---|---|---|---|
| `PRIX.menuiserie.fenetre` | 550 | Fenêtres | 950 | **−42 %** |
| `PRIX.menuiserie.baie` | 1 900 | Baie vitrée | 2 200 | −14 % |
| `PRIX.menuiserie.porte_entree` | 1 500 | Porte d'entrée | 1 600 | −6 % |
| `PRIX.menuiserie.garage` | 1 500 | Porte de garage | 1 200 | +25 % |
| `PRIX.galandage` | 900 | Caisson à galandage | 800 | +12,5 % |
| `PRIX.revetement.Carrelage` | 65 | Carrelage au sol | 70 | −7 % |
| `PRIX.revetement.Parquet` | 75 | Parquet bois | 90 | −17 % |
| `PRIX.revetement.Moquette` | 40 | Moquette | 35 | +14 % |
| `EQUIP_PRIX.vasque2` | 593 | Meuble-vasque double (433 × 1,88) | 814 | **−27 %** |
| `PRIX.murNeuf` | 120 | *aucun* (parpaings 75, brique 90, ossature 90) | — | sans correspondance |

Le « 46/49 alignés » affiché donne donc une confiance imméritée exactement sur la ligne la plus lourde d'une rénovation. Bonne nouvelle en revanche : **`PRIX_TOIT` est entièrement aligné** (20 clés vérifiées une par une), sauf `deposeCouv: 25` qui n'a aucun poste.

Sept prix de la maquette ne correspondent à **aucun** poste du catalogue : `boucher` 90 €/m², `retourIso` 28 €/ml, `jambagesMl` 35 €/ml, `percLeger` 320 €/u, `betonFini` 45 €/m², `deposeEquip` 60 €/u, `PRIX_TOIT.deposeCouv` 25 €/m². Et `EQUIP_PRIX.plan = 985` est un **composite inventé** : 900 (Cuisine|Meubles de cuisine) + 85 (Plomberie|Plan de travail), comme le dit le commentaire de `:682` — il mélange deux lots, et ignore « Plan de travail seul » (Cuisine, 150 €/ml).

### 5.7 Le vocabulaire de lots

9 lots maquette vs 18 lots catalogue, 4 correspondances exactes. Le nom de lot **n'est pas une étiquette d'affichage dans le moteur** : c'est la clé de `finCoef` via `LOT_FIN` (`core.ts:166-171`) et le porteur de la TVA par défaut. Router `sol-iso` (lot maquette `'Sol'`) vers un poste de Carrelage / Revetements au lieu d'Isolation ferait perdre **le taux réduit de 5,5 %** que porte « Isolation du sol / plancher bas », en plus de changer de barème de finition (G1 → G3, soit ~5 à 10 % sur le montant de ligne, la finition ne scalant que `sm`).

### 5.8 Le contexte transmis

`contexte = {finition, codePostal, logementPlus2Ans}` (`:2786`). Le moteur lit `ctx.fiscal === "pro"` (`core.ts:492`). **Le mot `logementPlus2Ans` n'existe nulle part dans le code du site.** Sans traduction, la TVA est fausse. Et il manque `ctx.type` : sans drapeau maison/appartement, `visibleTask` peut ramener à zéro toute la toiture dessinée.

### 5.9 Divergence d'affichage déjà en place

`EstimationResultat.tsx:323-338` recalcule un total « tout fait faire » **sans coefficient régional**, là où le total principal l'applique — les deux €/m² affichés côte à côte ne sont pas sur la même base. Et l'écran résultat et le PDF affichent `ctx.pieces`, que la saisie détaillée n'écrit jamais (seul `onType` le fait, `Estimateur.tsx:153`), alors que le chiffrage utilise `piecesEff`.

---

## 6. Architecture de synchronisation

### 6.1 Le contrat, en une fonction pure — CHOIX TECHNIQUE, je tranche

`qtyOf` est l'unique porte d'entrée. Il n'y a donc **ni service, ni bus d'événements, ni API à créer**. Il faut **une fonction pure, côté plan** :

```
planVersSelection(plan) → { ctxPatch, selPatch, contributions[], refus[] }
```

- **Zéro modification du moteur.** Prix, finition, régional, TVA, aléas restent intégralement dans `core.ts`.
- Elle écrit `{on:true, manual:true, qty:Σ}` sur **les seuls** postes que le plan sait mesurer, et `on:false` sur les membres de famille que le dessin ne mesure pas (§5.3).
- Elle **refuse** d'écrire une quantité vers un poste `u:"forfait"` et le signale dans `refus[]` plutôt que de produire une contribution sans effet.
- Elle **n'écrit jamais** « Finitions plâtrerie », « Robinetterie lavabo » ni « Étanchéité sous carrelage » : elle écrit leurs **parents** et laisse le moteur dériver.
- La table de correspondance auto/non-auto est dérivée de **`isAuto()` à l'exécution**, en itérant les couples `(lot, poste)` du catalogue — **jamais** du carnet, et **jamais** indexée par nom seul (la branche `A[n]` d'`isAuto` ignore le lot : aujourd'hui sans ambiguïté, mais un futur doublon de libellé produirait un poste auto fantôme).

### 6.2 Traçabilité PLAN → QUANTITÉ → POSTE → PRIX

Le moteur ne peut pas la porter : `LigneSel.qty` est un **scalaire** et `DevisLigne` (`core.ts:149-152`) ne contient que `{corps, phase, nom, unite, qty, mode, ht, tva, ttc}`. `manual:true` est le **seul** drapeau existant signifiant « pas autoQty », et c'est celui qu'écrit déjà l'utilisateur — une quantité du plan y est **indiscernable d'une saisie à la main**.

**CHOIX TECHNIQUE : une table de CONTRIBUTIONS en side-car, que le moteur ne lit jamais.**

```
contribution = { poste: "Carrelage / Revetements|Carrelage au sol",
                 src: "r:d9f3h6t", role: "sol-rev",
                 niveau: "RDC", libelle: "Salle de bain", u: "m2", q: 5.8 }
```

`qty` injecté = exactement `Σ q` du poste, calculé une fois. Les trois exigences tombent mécaniquement :
- **traçabilité** = grouper par `poste`, jointure sur la même `key(corps,nom)` que l'UI manipule déjà (`Estimateur.tsx:467`, `EstimationResultat.tsx:515`) ;
- **temps réel sans double comptage** = une contribution est identifiée par `(poste, src, role)`, donc une ré-émission **remplace** au lieu d'ajouter. Le double comptage devient structurellement impossible au lieu d'être évité par discipline ;
- **incrémental** = on remplace les contributions dont l'élément `src` a changé, puis on re-somme ce poste. **Mais le recalcul doit rester global au niveau du moteur** : `autoQty` lit `sel`, donc toucher un parent change la quantité auto de ses dérivés.

Le précédent existe dans le dépôt : `reponses.statuts` est déjà exactement une carte frère indexée par `key()`, vivant à côté de `ctx`/`sel` dans le même jsonb (`projet.ts:19, 29-35`). Le drapeau « l'utilisateur a épinglé cette ligne » se loge au même endroit, sans toucher au moteur.

Le schéma d'ids n'est pas à inventer : `taskElem()` (`:845`) normalise déjà en `w:` / `o:` / `i:` / `r:`. **`src` = `taskElem(id)`, `role` = le discriminant restant** (et non « préfixe/suffixe » : pour `sol-rev:<roomId>` le rôle est devant, pour `iso:<wallId>` il n'y a pas de suffixe).

### 6.3 Deux corrections d'identité, préalables et entièrement côté plan — CHOIX TECHNIQUE

1. **`facesFor` doit apparier comme `syncRooms`.** Aujourd'hui il invente `{id:'tmp'}` avec un `find` nu et un `guessType` à `usedTypes` vide (`:2614`). Le correctif n'est **pas** de renvoyer `room:null` — cela ferait disparaître ces faces de `area`, `wallPaint`, `plinthes` et `byType` en vue Existant, rendant le payload *plus* dépendant de la vue. Le correctif est de faire exécuter à `facesFor` le même appariement en 3 passes, pour que chaque face reçoive une fiche stable quelle que soit la vue courante, et de découpler l'agrégation géométrique (comptée dans tous les cas) de l'identité de la fiche. Le défaut `sol-rev:tmp` est aujourd'hui **latent** (la fiche `tmp` naît sans `sol` ni `floorNew`, donc aucune tâche sol n'est émise) — mais il devient actif dès qu'on indexe des contributions par `src`.
2. **Un id public, typé, persisté, jamais réattribué** posé à la création de chaque objet (`w.pid`, `r.pid`, `o.pid`, `i.pid`), en plus de `uid()` pour l'usage interne. C'est lui qui part dans `src` et s'affiche dans la trace. `uid()` (≤ 7 caractères base36, sans contrôle de collision) ne peut pas devenir une clé de base.

À corriger dans la même passe, parce que c'est un bug vivant : `quantities()` rejoint les fiches de pièces **par leur nom** (`:2788`, `lv.rooms.find(x=>roomName(x)===r.name)`) alors que `roomName = r.name || RT[r.type].label` (`:1126`) et que les fiches naissent avec `name:''` — **deux chambres non renommées sont homonymes par défaut**, et la seconde hérite de la note et des produits de la première.

### 6.4 Où vit le plan — CHOIX TECHNIQUE : une table dédiée, pas `reponses`

`reponses` est plafonné à **40 000 caractères sérialisés** (`lib/validation.ts:9-11`), appliqué à la création (`:18`) comme à la modification (`:28`). Le 400 renvoyé dit **« Données invalides. »** (le message zod n'est jamais exposé, par choix documenté dans `validation.ts`) : l'utilisateur ne peut pas comprendre que c'est un problème de volume.

`reponses` porte déjà `ctx + sel + custom + statuts + v + mode + codePostal`. Une géométrie de maison sur deux niveaux plus une sélection lourde dépasse le plafond. Donc :

```
project_plans ( id, project_id references projects on delete cascade,
                version int, plan jsonb, quantities jsonb, contributions jsonb, updated_at )
```

avec **exactement** le motif RLS déjà utilisé par les six tables filles `for all` : `using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id))` (`0001_tenancy.sql:175-180`). Aucun concept de tenancy nouveau. Réserve honnête : `peut_acceder_projet` (`:152-155`) = propriétaire **ou** membre `status='active'`, **sans distinction de rôle** — la restriction d'écriture par rôle restera à écrire applicativement, comme pour les autres tables (le commentaire de `:161` l'assume déjà).

`reponses` ne gagne qu'un pointeur minuscule `{ plan: { id, version, at } }`.

**Ne pas ressusciter la table `rooms`** (`0001_tenancy.sql:68-76` : `longueur, largeur, hauteur, portes, fenetres, carrelage_sol, faience`). Elle n'est lue par aucun code applicatif, sa forme « un rectangle par pièce » ne peut porter ni polygone ni multi-niveaux, et son validateur `pieceSchema` (`lib/validation.ts:34`) n'est importé par aucune route. C'est une modélisation morte, doublement abandonnée.

### 6.5 Ne rien casser pour ceux qui n'utilisent pas le plan — vérifiable ligne à ligne

`estFormatEstimateur()` ne teste que `v==="estimateur" && ctx` (`projet.ts:44`) ; `estimationProjet()` et `avancementProjet()` rejouent `buildDevis(CATALOG, ctx, sel)` (`:28`, `:52`) ; `lib/data/dashboard.ts` n'appelle qu'`estimationProjet`. **Aucun de ces chemins ne lit le plan.** Un projet sans plan se comporte exactement comme aujourd'hui, sans condition et sans migration de données.

### 6.6 Extensibilité (niveaux, extension, surélévation, neuf, plusieurs bâtiments, extérieur)

Le décalage de forme est net : le plan a `state.levels[]` avec une hauteur par niveau (`:624`) et `quantities()` somme les niveaux ; `Ctx` n'a que des scalaires `niveaux: number` et `hauteur: number` (`core.ts:55, 57`). La **seule** forme multi-instances déjà présente dans le moteur est `ctx.espaces: Record<string, number[]>` (`core.ts:72`), agrégée par `espacesCompo()`.

Conséquence architecturale : **l'extensibilité vit entièrement dans les contributions, pas dans `Ctx`.** Ajouter un niveau, une extension, un bâtiment ou une zone extérieure = ajouter des contributions avec un `src` et un `niveau`/`batiment` de plus ; la somme par poste absorbe tout, et `Ctx` reste un agrégat scalaire. C'est la seule voie qui ne demande aucune réécriture du moteur. Le corollaire est que **`ctx.hauteur` restera toujours une moyenne** : dès que deux niveaux ont des hauteurs différentes, les formules `S×h` et `S×(h+1)` du moteur seront fausses pour au moins un niveau — raison de plus pour que le plan écrase ces postes avec des mesures réelles.

À prévoir dès maintenant côté plan : `travaux.demolM2` et `creerM2` doivent devenir **des m² par type de mur et par niveau**. Aujourd'hui `creerLin[type]` est en ml tous niveaux confondus et `creerM2` est un scalaire tous types confondus : **on ne peut pas reconstituer les m² par type en multipliant par une hauteur** dès que deux niveaux diffèrent.

### 6.7 Ce que le plan doit émettre en plus — CHOIX TECHNIQUE

Liste minimale, toutes données déjà calculées en interne et jetées avant la sortie :

1. **une emprise du niveau bas**, indépendante du panneau Toiture (les 31 formules `SS` en dépendent) ;
2. **`ctx.type`** (maison / appartement), sinon la toiture est masquée par `visibleTask` ;
3. **`niveaux` (entier) et une hauteur** — et un renommage : `surfaceSol` par pièce → `surfaceAuSolPiece`, `niveaux` (tableau) → `detailNiveaux`, pour tuer les deux collisions de nom ;
4. **m² de démolition et de création par type de mur et par niveau** ;
5. **`percements` ventilés** `{porteurPetit, porteurGrand, leger}` — `openingInduits` le sait déjà (`:1000-1005`) ;
6. **`it.w`** des équipements (les 5 postes ml du lot Cuisine) ;
7. **`mat`, `vitrage`, `ouvrant`, `opts`, `volet`** sur les menuiseries (ils pilotent `MAT_COEF`, `VIT_COEF`, et le poste Caisson à galandage) ;
8. **les dimensions de l'objet douche** (pour la variante `dim` et `specArea`) ;
9. **l'adjacence mur ↔ pièce** (pour « Cloison pièce humide ») et **le périmètre de trémie** (pour Garde-corps) ;
10. **un `id` sur chaque ligne** de `levels[].rooms[]`, `levels[].menuiseries[]`, `levels[].items[]` et `sols[]`, et un écho par élément sur `lin`, `plomberie`, `electricite`, `chauffage`, `doublage`, `facades`, `velux` ;
11. **un numéro de version du contrat**, que le consommateur vérifie.

---

## 7. Décisions du fondateur — je pose la question, je ne décide pas

Ces arbitrages ne sont pas techniques. Tant qu'ils ne sont pas tranchés, le branchement ne peut pas être spécifié.

### D1 — Le plan envoie-t-il l'état PROJET ou le DELTA ? *(le plus bloquant)*
Soit `plomberie`, `electricite`, `chauffage`, `doublage`, `lin`, `byType` sont dédoublés en `{existant, aCreer, aDeposer}` comme `facades` le fait déjà — soit le plan envoie l'état complet et l'estimateur décide poste par poste ce qui est un travail, ce qui suppose de lui donner aussi l'état existant. Sans ça, tout devis est gonflé d'équipements déjà présents.

### D2 — Qui porte le doublage ITI : « Doubler un mur » (40 €, TVA 10) ou « Isolation des murs par l'intérieur » (55 €, TVA 5,5) ?
Les deux, c'est +36,94 €/m² de trop. L'Isolation seule fait **disparaître les finitions plâtrerie** du doublage, parce que `derivedFinitions` ne lit que « Doubler un mur ». Si c'est l'Isolation qui gagne, `derivedFinitions` doit apprendre à lire ce poste-là. **Et la décision est rétroactive** : `presets.ts` coche déjà les deux.

### D3 — Un plan importe-t-il toujours en périmètre « logement entier » ?
Si le mode « pièces ciblées » survit, `visible()` fait **disparaître du total** Maçonnerie, Façade, Menuiseries exterieures, Raccordements, Etudes et Annexes — exactement les lots où le plan apporte le plus (façades mesurées, toiture, étude de structure déduite du porteur démoli, induits d'ouverture). Il faut soit élargir `ESPACES.lots`, soit interdire le mode.

### D4 — Les 20 types de pièces du plan vers les 7 espaces du moteur : mappage explicite, ou le plan n'écrit jamais `ctx.espaces` ?
Passer par `autre` met 21 postes à zéro et 1 en incohérence, sans message. 12 types du plan n'ont aucun compteur (`entree, sde, dressing, bureau, cellier, palier, mezzanine, garage, cave, combles, exterieur, autre`). Et `garage`, `cave`, `combles` sont hors habitable côté plan alors que `ESPACES.combles` compte une chambre.

### D5 — Une surface habitable et une surface de TRAVAUX distinctes ?
`area` exclut garage/cave/combles, `byType`/`wallPaint`/`plinthes` les incluent, `chantierTasks` facture même les terrasses. Il faut décider laquelle des deux grandeurs alimente `ctx.surface`, et aligner `ESPACES.combles` ou `RT.combles`.

### D6 — La douche : un objet, cinq postes
Le catalogue offre Bac (400), Colonne (300), Italienne (1 090), Paroi (380), Cabine (750), **tous à `autoQty = SDB`**, et rien ne les rend exclusifs. Le plan a implicitement tranché (`EQUIP_PRIX.douche = 1090` = le fp de l'italienne) mais ne l'a documenté nulle part. Soit le plan gagne un attribut « type de douche », soit on pose une règle fixe.

### D7 — La double vasque : unités ou variante ?
Le plan compte `vasques += 2` pour un objet `vasque2`. Le catalogue modélise le double par une **variante de prix** (Meuble-vasque `config:double` → ×1,88). Envoyer 2 unités **et** `vsel:{config:'double'}` donne 4 robinetteries dérivées et un meuble facturé ×3,76. Règle à poser : **1 unité en `double`**, ou **2 unités en `simple`** — jamais les deux.

### D8 — Les 7 valeurs de `FLOORS_NEW` vers les postes de sol
Table de correspondance explicite à écrire. Deux trous : **« Béton fini (dalle lissée / quartz) »** n'a aucun poste (créer un poste, ou le router vers « Béton ciré / résine » qui est un autre ouvrage — et noter que la maquette le range sous Maçonnerie alors que les 8 postes de sol vivent dans Carrelage / Revetements, donc le routage change aussi le lot, la TVA et le camembert). Et **« Parquet »** : Parquet bois neuf (90 €) ou Ponçage + vitrification (40 €) ? Le cas « garder et poncer l'ancien » n'est aujourd'hui **pas exprimable** dans le plan.

### D9 — Le mur de pierre / porteur
`WALL_TYPES` a Cloison / Parpaing / **Pierre**. Le catalogue n'a que « Abattre une cloison » et « Abattre un mur non porteur » : **abattre le mur en pierre dessiné n'a aucune destination**, et « non porteur » est faux par son nom. En création, il n'y a ni « monter un mur en pierre » ni contrepartie plan pour « Monter un mur en brique ». Créer les postes, ou assumer le libellé — la règle « ne pas inventer de postes » m'interdit de choisir.

### D10 — La faïence : quelle hauteur de pose ?
« Faïence / carrelage mural » (70 €/m²) et « Cloison pièce humide (hydrofuge) » (55 €/m²) partagent `SDB × 12` alors que ce sont deux ouvrages différents. Le carnet propose `wallArea` pour les deux : pour une SDB carrée de 6 m² c'est ~22,8 m² contre 12 m² au proxy, soit ~1,9× (de ~1,5× à 4 m² à ~2,5× à 10 m²). **C'est l'erreur la plus visible du chiffrage d'une salle de bain.** Pleine hauteur ? 2,00 m dans la douche et 1,20 m ailleurs ? Un réglage dans la fiche de pièce ? Et il faut dissocier la cloison hydrofuge de la faïence. *(Note : l'erreur pleine hauteur est déjà commise dans la maquette — `productQty` retourne `wallPaintArea` pour le poste « murs », `:1177`.)*

### D11 — Les 33 postes au forfait
Soit le plan ne les alimente jamais (il ne fait que les cocher), soit certains passent à l'unité au catalogue — ce qui **change le prix affiché**, donc ne peut pas être décidé côté plan. Concernés et mesurables : tableau électrique, curage cuisine/SDB, benne, installation et sécurité de chantier, métré.

### D12 — Qui gagne quand l'utilisateur a corrigé une quantité et que le plan change ensuite ?
Trois options seulement : le plan écrase toujours (on efface un travail sans prévenir) ; la saisie manuelle **épingle** la ligne (drapeau `pinned` dans la table de provenance, le plan cesse d'alimenter ce poste) ; on demande à chaque conflit. **Tant que ce n'est pas tranché, le comportement du recalcul temps réel n'est pas spécifiable.**

### D13 — `reponses.sel` reste-t-il la vérité ÉCRITE, ou devient-il DÉRIVÉ du plan ?
Écrite : le projet reste autonome, PDF et tableau de bord n'ont besoin de rien de neuf. Dérivée : vérité unique, mais toute modification du plan réécrit l'estimation et D12 devient permanent.

### D14 — Un état « à conserver » distinct de « existant » ?
Ce n'est pas cosmétique : c'est la différence entre « 0 € sur cet élément, décision prise » et « poste non renseigné, à ne pas présenter comme chiffré ». La **couverture** du chiffrage en dépend. Et faut-il étendre « remplacer » aux équipements et aux murs, ou accepter `demolir + creer` sans lien entre les deux ?

### D15 — Trancher les doubles sources
`velux` : objets posés ou compteur du panneau Toiture ? `cumulus` : `plomberie.chauffeEau` ou `chauffage.chauffeEau` ? « Spots encastrés » vs « Ajouter un point lumineux » : le plan ne distingue pas un spot d'un plafonnier ni d'une applique. Escalier : bois ou béton ? Plancher créé : bois ou béton ?

### D16 — Un id stable par poste au catalogue, maintenant ?
La correspondance plan → estimateur sera clé sur des **phrases françaises**. La revue lot-par-lot en cours est justement en train d'en renommer — et j'en ai la preuve directe : les libellés du lot Cuisine ont déjà changé depuis l'audit initial (§8). Un renommage orpheline en silence trois choses d'un coup : les `sel` enregistrés, les `statuts` de chantier, et la correspondance du plan. Soit on introduit un id stable, soit on **gèle les libellés du catalogue avant de câbler le plan**.

---

## 8. Corrections apportées aux constats précédents

J'ai rouvert les fichiers. Voici ce que j'ai trouvé **faux** dans le matériau d'audit, et qu'il ne faut pas propager.

| Constat précédent | Réalité vérifiée |
|---|---|
| « Le catalogue n'a pas de poste *Raccords (faîtage, arêtiers, solins)* ; la maquette en chiffre un à 40 €/ml — poste inexistant, à créer ou abandonner. » | **FAUX.** « Raccords (faîtage, noues, solins) » existe : Charpente, ml, fp 40, sm 15. `PRIX_TOIT.raccords = 40` **correspond exactement**, et `coherence.mjs` le mappe déjà. Seul le libellé affiché par la maquette diffère (*arêtiers* vs *noues*). `q.toiture.raccords` est donc un branchement **propre**, pas un trou. |
| Libellés Cuisine cités : « Cuisine complète », « Meubles de cuisine (sans électro) », « Rafraîchir une cuisine (façades + plan) » | **Périmés.** Le catalogue dit aujourd'hui « Cuisine complète neuve — tout compris », « Meubles de cuisine », « Rafraîchir une cuisine (façades / plan) ». `presets.ts:106` est à jour, le matériau d'audit non. **C'est la démonstration vivante du risque D16.** |
| « `sol-iso` → Isolation » | **FAUX.** `plan-editor.html:824` pousse `lot:'Sol'`. Idem `sol-chape`, `sol-rag`, `sol-rev`. Seuls `sol-dalle` et `sol-fini` vont en `'Maçonnerie'`, et `sol-depose` en `'Démolition'`. |
| « 78 postes ont une quantité automatique » | **81** : 80 clés de la table `A` + `FINI`. Manquent au carnet et à `autoqty-formules.json` : « Créer un plancher bois », « Plancher béton (étage créé) », et `FINI`. Vérifié par script. |
| « Les 78 autres postes métrés n'ont aucun pré-remplissage » | **86**, pas 78 (200 − 81 auto − 33 forfait). |
| « Tout cocher fait 3,4·S » (sols) | **7,2·S** (3,2·S de revêtements + 4,0·S de préparations). Le sur-comptage est plus grave que décrit. |
| « la préparation reste sur un proxy 25 % plus gros que la peinture » | « Préparation des surfaces » vaut **exactement** `S × hauteur`, comme « Peinture des murs ». Les postes plus gros sont Ratissage et pare-vapeur, à `S × (h+1)`, soit **+40 %** à h = 2,5 m. |
| « `deriveSol()` est le repli du moteur » | **Non.** `autoQty` ne l'appelle jamais ; son seul appelant est le handler `onNum` (`Estimateur.tsx:148`). Le vrai repli est `SS = ctx.surfaceSol || S` (`core.ts:394`) — et c'est lui qui produit l'erreur ×2. |
| « 29 des 78 formules dépendent de SS » | **31 sur 80** : 7 en direct (et non 5), 11 via `facade`, 13 via `roof`. |
| « `toggleAuto` détruit la mesure » | **Non.** `toggleAuto` ne fait que basculer `manual` (`Estimateur.tsx:238`) et ne supprime jamais `qty` ; un second clic la restitue. La mesure est **masquée**, pas détruite. |
| « un plan de pièces non mappées se sauvegarde à 0 m² » | **Non.** Bloqué deux fois : `Estimateur.tsx:252` refuse et affiche le message, et `lib/validation.ts:16` (`surface: positive()`) rejette 0 côté API. Le défaut réel est que le message **ne nomme pas la cause**. |
| « `q.doublage` doit être ventilé par `io.mode` » | Déjà fait : `doublage.iti` et `.ite` sont séparés (`:2781`) et `parMateriau` est clé `'ITI …'`/`'ITE …'`. Seul le champ sommé `.surface` est inutilisable. La ventilation manquante est celle **des murs** (m² par `w.type`). |
| « les ids sont disponibles à deux lignes de là » (jointure par nom) | 45 lignes plus haut (`:2743` vs `:2788`). Mais la gravité est **sous-estimée** : les fiches naissent avec `name:''`, donc l'homonymie est le cas **normal**. |
| « `travaux.demolPorteur` / `etudes.structure` à `:2756` », « `toitureQ` à `:2765` », « `isPorteur` à `:495` », « `facesFor` à `:2611`/`:2619` », « `roomName` à `:1128` », « `taskElem` à `:843` », « `snapshot` `:1319`, `save` `:1322`, `poly` `:1120`, purge `:1121` » | Numéros exacts : `etudes` **2762**, `toitureQ` **765**, `isPorteur` **496**, `facesFor` **2611** (appels en **2738** et **2744**, et **817** dans `chantierTasks`), `roomName` **1126**, `taskElem` **845**, `snapshot` **1316**, `save` **1321**, `poly` **1115**, purge **1117**. |
| « `duplicateLevel` remappe les ids » | La fonction s'appelle **`addLevel(mode)`**, branche `'copy'` (`:2327`). Et la copie **ne crée pas de référence morte** dans `state.groups` (global, pointant vers les murs source, cas inter-niveaux déjà géré à `:676`) : le vrai dangling vient de la **suppression** d'éléments et de niveaux, qui ne nettoie ni `groups` ni `done`. |
| « `role` = suffixe, `src` = préfixe de l'id de tâche » | Vrai seulement pour `w:`/`o:`/`i:`. Pour `sol-*:<roomId>` le rôle est **devant** ; pour `iso:<wallId>` il n'y a pas de suffixe. La règle juste : `src = taskElem(id)`, `role` = le reste. |
| « `chantierPrix` distingue les 3 types de mur » | Non : `:802-803` ne price que sur le binaire `isPorteur` (seuil ≥ 0,15 m), donc **le Parpaing 0,20 m est traité comme la Pierre 0,60 m**. La distinction est perdue deux fois. |
| « 3 prix recopiés divergent » | 3 **détectés**. J'ai vérifié à la main les tables non couvertes par `PRIX_MAP` et j'en ai trouvé **6 à 9 de plus** (§5.6), dont `PRIX.menuiserie.fenetre` à **−42 %**. |
| « 46/49 alignés donne une confiance imméritée » | Confirmé, et **`PRIX_TOIT` est en réalité entièrement aligné** (20/20 vérifiées) — le problème est concentré sur `PRIX.menuiserie.*`, `PRIX.revetement.*` et `EQUIP_PRIX.douche/vasque2/plan`. |
| « `EQUIP_PRIX.plan = 985` » | C'est un **composite inventé** : 900 (Cuisine|Meubles de cuisine) + 85 (Plomberie|Plan de travail), donc il mélange deux lots et ignore « Plan de travail seul » (150 €/ml). À ajouter à la liste des prix sans correspondance. |
| Carnet : « objet fenêtre de toit ABSENT », « objet VMC ABSENT », « objet évier ABSENT » | **Faux trois fois** : `ITEMS.velux` (`:534`), `ITEMS.vmc` (`:526`), `ITEMS.evier` (`:519`) existent et sont comptés (`:2771-2772`). |

---

## 9. Ce qu'il faudrait implémenter, et dans quel ordre

Rien ici n'est à coder avant les décisions **D1, D2, D3, D4** — les trois premières phases sont des corrections locales qui ne dépendent d'aucune d'entre elles.

### Phase 0 — Mettre la vérité d'accord avec elle-même *(aucune décision requise)*
1. Corriger le carnet : **81 lignes auto**, pas 78. Corriger `autoqty-formules.json`.
2. Étendre `PRIX_MAP` de `coherence.mjs` aux objets imbriqués (`PRIX.revetement.*`, `PRIX.menuiserie.*`, `EQUIP_PRIX.douche/vasque2/plan`, `betonFini`, `percPorteur*`, `galandage`, `volet*`, `opt*`, `murNeuf`, `deposeSol`) et **faire échouer le contrôle** sur les 6 à 9 divergences trouvées.
3. Faire lister par `coherence.mjs` les prix maquette **sans poste catalogue** (7 identifiés) : c'est la liste des postes à créer ou à abandonner (D9, D8).
4. Corriger le commentaire périmé de `PRIX.deposeSol` (« catalogue 30 » → 20).

### Phase 1 — Réparer les défauts déjà actifs, sans le plan
5. **Le doublon ITI de `presets.ts:46-47`** (D2) : c'est un sur-chiffrage en production sur toute réno complète.
6. Le mismatch de clés `sel` / `statuts` (variante suffixée) : il fait déjà perdre l'avancement de chantier quand on change une variante.
7. La jointure par nom de `quantities()` (`:2788`) → par `id`.
8. `wallPaintArea` sans `?.` ni repli (`:1185`), alors que `facadeArea` en a un.
9. L'affichage `ctx.pieces` vs `piecesEff` dans le résultat et le PDF ; le `ffHT` sans coefficient régional (`EstimationResultat.tsx:323-338`).

### Phase 2 — Préparer le plan à être une source *(côté plan uniquement, zéro impact moteur)*
10. `facesFor` apparie comme `syncRooms` (§6.3, point 1) : l'export cesse de dépendre de la vue courante.
11. `pid` public, typé, persisté, jamais réattribué, sur murs / ouvertures / équipements / pièces.
12. Les 11 champs manquants de §6.7, **en tête l'emprise du niveau bas et `ctx.type`** — sans eux, 31 formules et tout le lot toiture sont faux.
13. Renommer `surfaceSol` (par pièce) et `niveaux` (tableau) pour tuer les deux collisions de nom.
14. Unifier la hauteur : soit `r.height` est propagée partout, soit elle est retirée. Aujourd'hui le même envoi transporte deux hauteurs contradictoires.
15. Ajouter un **numéro de version du contrat** et sortir `quantities()` derrière une frontière explicite (aujourd'hui le seul « export » est un `<details>` de debug qui n'émet même pas `toiture`, `sols`, `plomberie`, `etudes` ni `velux`).

### Phase 3 — La table de correspondance *(bloquée par D6, D7, D8, D9, D11, D15)*
16. Écrire la correspondance `(élément du plan, rôle) → (lot, poste)` comme une **donnée déclarative**, dérivée du catalogue à l'exécution, et lui faire porter : l'unité attendue, l'appartenance à une **famille** (§5.3), l'exclusion mutuelle, et la liste des postes à mettre `on:false`.
17. La faire vérifier par `coherence.mjs` : tout poste cité doit exister au catalogue, avec la bonne unité, et ne pas être au forfait.

### Phase 4 — `planVersSelection` + contributions *(bloquée par D1, D3, D4, D12, D13)*
18. La fonction pure de §6.1, avec ses refus explicites.
19. La table de contributions (§6.2), la table `project_plans` (§6.4) et le pointeur dans `reponses`.
20. Le troisième état de provenance (auto / plan / saisi à la main) **hors de `LigneSel`**, sur le modèle de `statuts`, plus le drapeau `pinned` de D12.
21. L'UI : la carte géométrique devient un récapitulatif avec un renvoi « modifier sur le plan » **ou** reste éditable avec un drapeau d'override et un bouton « recalculer depuis le plan » — rien dans le code n'impose le verrou, le motif d'override existe déjà (`surfaceSolManual`, `s.manual`). Et l'étiquette « auto » doit cesser de désigner le proxy statistique quand une mesure existe : aujourd'hui **le mot le plus rassurant de l'écran est celui qui remplace une mesure par une estimation**.

### Phase 5 — Ce qui change le catalogue *(décisions D8, D9, D11, D16, et donc en dernier)*
22. Les postes manquants (mur porteur démoli/monté, béton fini, retour d'isolant, percement léger) ou leur abandon assumé.
23. Un id stable par poste, ou le gel des libellés.
24. La granularité dimensionnelle des menuiseries, si elle est voulue (le plan mesure `l`, `h`, `allege` ; le catalogue chiffre à l'unité) — **cela touche la source de vérité, donc c'est un choix de fondateur, pas une correction**.

---

## 10. Ce que l'audit n'a PAS couvert

- **Je n'ai pas exécuté la maquette.** Aucun chiffre de cet audit ne vient d'un rendu ou d'un `state` réel : ni le poids JSON d'un plan, ni le contenu de `q` sur un cas concret, ni la vérification que `detectFaces` reconstruit bien les pièces qu'il prétend. Les mesures de volume citées ailleurs (plan de démo ≈ 6 500 caractères, maison 2 niveaux ≈ 25 500) **ne sont pas les miennes** — je n'ai pas relancé la mesure headless.
- **Je n'ai pas vérifié les 200 postes un par un.** J'ai vérifié par script le nombre de lots, de postes, les unités, l'absence de doublon de libellé, la table `A` d'`autoQty`, le nombre de `sm === null`, de `vars`, de `fixe`, de `tva` propres ; et lu en entier les lots Démolition, Maçonnerie, Charpente, Façade, Menuiseries ext. et int., Isolation, Cloisons, Electricite, Plomberie, Chauffage, Carrelage, Peinture, Cuisine, Etudes, Annexes. **Je n'ai pas lu les lots Location de matériel ni Raccordements aux réseaux** (19 postes), tous classés C.
- **Je n'ai pas audité `lib/seo-projets.ts`** (1 038 lignes : `estimProjet`, `panierVariante`, `PIECES_ESTIMATEUR`) ni les pages `prix-travaux`. Ce chemin force `perimetre:"piece"` puis appelle `buildDevis` ; **je n'ai pas vérifié si `panierVariante` peut y produire une ligne hors des lots de l'espace**, ce qui serait le même bug que D3 en production SEO.
- **Je n'ai pas vérifié `lib/data/admin.ts`, `components/RapportPDF.tsx`, `ResultatRapide.tsx`** au-delà des lignes citées, ni les routes API autrement que par `lib/validation.ts` et `projet.ts`.
- **Je n'ai rien vérifié sur le framework.** Je n'ai pas ouvert `node_modules/next/dist/docs/`, donc **cet audit ne contient aucune affirmation sur Next, le routage, le rendu ou les Server Actions**. Toute décision de découpage client/serveur pour `project_plans` reste à instruire.
- **Je n'ai pas mesuré les conséquences chiffrées sur des projets existants.** Le doublon ITI de `presets.ts` est rétroactif ; je ne sais pas combien de projets enregistrés le portent.
- **Je n'ai pas classé A/B/C les 73 lignes QUESTION du carnet** : elles sont C par construction, et le bloc HORS_PLAN de la maquette les assume déjà explicitement.
- **Je n'ai pas vérifié** s'il existe quelque part une note métier qui tranche D2 (ITI : isolant seul + ossature/plaque, ou ouvrage unique). La seule description du dépôt que j'aie vue sur le doublage laisse les deux lectures ouvertes.