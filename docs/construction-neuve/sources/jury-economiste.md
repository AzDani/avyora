# Jury « économiste de la construction » : calage global du neuf

**Méthode.** J'ai lancé `node calibre.mjs` sans le modifier : les sorties correspondent à `calibrage-brouillon.md`. J'ai ensuite calculé des variantes avec une copie importable du même moteur, dans `scratchpad/jury-eco/` :
- `ana.mjs` : finitions, répartition par lot ;
- `diy.mjs` : modes « Je le fais », avec la logique de `lineHT`, où un poste fait soi-même vaut `sm × coef` ;
- `ppet.mjs` : plain-pied comparé à une maison à étage ;
- `gar.mjs` : garage ;
- `gamme.mjs` : combinaisons de gamme.

Tous les repères viennent de `recherche-calibrage.json`. **Je n'ai introduit aucun prix nouveau.** Quand un chiffre est déduit du modèle et non d'une source, il est marqué *[modèle]*.

## Verdict en bref

| Question | Verdict |
|---|---|
| Calage global (maisons maçonnées A et B) | **Bon.** Une fois les périmètres alignés, l'écart à l'EPTB « totalement terminée » (2 006) ou « entrepreneur / artisan » (1 981) va de **−4 % à +6 %**. Les « +28 à +32 % » face au chiffre « particulier » (1 656) ne sont pas une erreur : ce repère mélange de l'auto-construction et des maisons non finies. |
| Ossature bois (C) | **+9 à +16 %** au-dessus de l'EPTB. L'explication tient : petite surface, bardage bois et surcoût de l'ossature. Les sources sur ce surcoût vont de 0 % à +22 %. |
| Répartition par lot | Globalement conforme : hors d'eau / hors d'air 44 à 46 %, gros œuvre fermé ≈ 51 %, lots techniques ≈ 21 à 24 %. **Sous-pondérés** : façade et finitions (cause : prix) ; menuiseries extérieures (cause : périmètre du repère). **Sur-pondérée** : la toiture du plain-pied (cause : quantité, et elle est juste). |
| Éco < standard < premium | **Ordre respecté**, mais l'écart est **étroit** : −2 % / +7,5 %, contre −20 % / +29 % chez un maître d'œuvre. C'est voulu, car la finition ne touche que les matériaux. Il faut l'expliquer à l'utilisateur. |
| « Je fais le maximum » | **Faux en l'état** : −54 % sur la construction, soit **≈ 970 € TTC/m²**, sous le repère auto-construction de 1 200 à 1 600 €/m². Le moteur fait faire au particulier ses fondations, sa charpente, sa couverture et sa PAC, au prix des seuls matériaux. **Il faut restreindre** le mode : on obtient alors −26 %, soit ≈ 1 560 €/m², dans le repère. |
| Plain-pied plus cher au m² que l'étage | **Oui, mais peu** : +1,8 % à 100 m², +4,4 % à 140 m². Le repère annonce +8 à +15 %, mais les sources se contredisent (0 à +15 %). Pas de correction sans meilleure source : **incertain**. |
| Ossature contre parpaing | **+7 %** à maison égale, entre les deux sources (≈ 0 % et ≈ +22 %). Plausible. |

---

## 1. Calage des maisons types sur l'EPTB, à périmètres alignés

### 1.1 Ce que mesure l'EPTB et ce que mesure AVYORA

| Élément | EPTB 2024 (SDES) | AVYORA « construction seule » | Effet sur la comparaison |
|---|---|---|---|
| Nature du prix | coût **prévisionnel déclaré au permis**, TTC, permis 2024 | prix de marché 2025-2026, HT × 1,2 | AVYORA plus haut. L'ampleur n'est pas chiffrée : aucun indice BT01 2024→2026 dans les recherches. Le piège « prévisionnel » dit que l'EPTB **sous-estime** le coût final. |
| Surface | **surface de plancher** (SP) | surface **habitable** (SH) | SP ≥ SH. Le modèle géométrique sous-entend une SP intérieure de 1,05 à 1,08 × SH *[modèle : (E − 0,2 P) / SH]*. C'est un plafond, car un mur de 20 cm plus son doublage est plus épais. **Aucun ratio sourcé.** |
| Garage | dans le **coût** quand il existe, pas dans la **surface** | même chose (B) | B avec garage et B sans garage encadrent le repère. |
| Études, DO, branchements, VRD privés | **inconnu** (`non_trouve` n° 3 : périmètre déclaratif non précisé) | études, DO, taxes et branchements **exclus**. VRD privés, installation et contrôles RE2020 **inclus** | Écart de 0 à +11 % selon ce que le ménage a déclaré. |
| Finition | « totalement terminée » : 43 % des maisons, 120 m² | maison finie, cuisine comprise | Cuisine : 3,4 % du coût d'AVYORA. Son inclusion dans l'EPTB n'est pas connue. |
| Mode de réalisation | entrepreneur / artisan : 9 % des maisons. Le croisement « particulier + terminée » **n'est pas publié** | particulier en lots séparés, tout fait faire | **Aucun repère direct.** Les lots séparés devraient coûter un peu moins qu'une entreprise générale, d'environ 5 à 15 % selon progineer (MOE contre CCMI, source commerciale). Il peut donc rester un biais haut de quelques %, non mesurable. |

### 1.2 Les maisons types ramenées sur la même base

Les montants sont en € TTC/m², **construction seule**, prix du catalogue tels quels.

| Maison | /m² SH (script) | /m² SP *[modèle]* | Écart à « terminée » 2 006 (SH → SP) | Écart à « artisan » 1 981 (SH → SP) |
|---|---:|---:|---:|---:|
| A, plain-pied 100 m² | 2 121 | 1 972 (SP ≈ 107,6) | +6 % → −2 % | +7 % → 0 % |
| B, étage 120 m², **sans** garage | 2 016 | 1 920 (SP ≈ 126) | +0,5 % → −4 % | +2 % → −3 % |
| B, étage 120 m², **avec** garage | 2 193 | 2 089 | +9 % → +4 % | +11 % → +5 % |
| C, ossature bois 90 m² | 2 332 | 2 177 (SP ≈ 96,4) | +16 % → +9 % | +18 % → +10 % |

**Variante haute.** Supposons que les ménages déclarent aussi études, DO et branchements. Il faut alors comparer A à 2 351 € TTC/m² SH (212 138 + 16 284 + 6 662) : **+17 %**. C'est le principal facteur d'incertitude du calage, et la recherche n'a pas pu le lever.

**Contrôle croisé à l'intérieur de l'EPTB.** L'écart « totalement terminée » / « prêt à décorer » vaut 2 006 / 1 890, soit **+6,1 %**. Dans AVYORA, peinture + stratifié + plinthes représentent ≈ 7 % de A, soit un écart de **≈ +7,5 %**. La finition de surface est donc bien dosée.

### 1.3 L'écart restant de A (+6 % sur la SH), poste par poste

L'écart vaut ≈ +115 € TTC/m², soit ≈ 9 600 € HT. Il se décompose ainsi.

| Cause | Effet sur A | Sens | Statut |
|---|---:|---|---|
| Base de surface (SH au lieu de SP) | jusqu'à −7 % | explique **à elle seule** l'écart | *[modèle]*, non sourcé |
| Taille et forme : A fait 100 m² en plain-pied, la moyenne EPTB 118-120 m² mélange les types | −5 % (B sans garage = 2 016) | idem | *[modèle]* |
| VRD privés (tranchées, canalisations, regards, puits) | 5 572 € HT (3,2 %) | inclus chez nous, **inconnu** dans l'EPTB | périmètre |
| Installation, WC de chantier, implantation, nettoyage, contrôles RE2020 | ≈ 5 170 € HT (2,9 %) | idem. WC 5 €/jour en confiance basse, souvent fourni par le maçon | périmètre |
| Isolant compté deux fois (dalle isolée + panneau à plots du plancher chauffant) | ≈ 3 000 € HT (1,7 %) | trop haut | conception, déjà en § h-4 |
| Prix repris trop hauts en neuf (chape liquide +25 %, nettoyage +43 %, cloison +11 %, Consuel) | ≈ −1 460 € HT | trop haut | déjà sourcés (`prix-sources.json`) |
| Prix trop bas (enduit −34 %, fermettes −12 %, provisoire Enedis −40 %, carrelage −30 %) | ≈ +3 900 à +5 500 € HT | trop bas | déjà sourcés |

Les deux dernières lignes se compensent : c'est l'effet net de **+1,4 %** des 14 corrections. **Le niveau de A n'est donc pas dû à des prix unitaires faux.** Il vient du périmètre (surface, VRD, chantier) et d'un choix de conception (isolant compté deux fois).

**Garage de B.** Il coûte 17 750 € HT, dont ≈ 15 700 € HT hors d'eau / hors d'air hors façade. Le repère `prix-travaux-m2` dit 5 000 à 15 000 € pour un garage en hors d'eau / hors d'air : B est **en haut de fourchette, voire légèrement au-dessus**. Causes : une toiture tuile complète à 35° (≈ 5 100 €), plus des semelles et un soubassement identiques à ceux de la maison (≈ 3 100 €). Le cas courant d'un garage sous le même toit ou en appentis n'est pas modélisé. **Incertain**, à vérifier sur devis.

---

## 2. Répartition du budget par grand lot

Les parts sont calculées sur la construction seule HT, **hors cuisine**.

| Grand lot | A (plain-pied) | B (étage + garage) | C (ossature) | Repère (source) | Verdict et cause probable |
|---|---:|---:|---:|---|---|
| Gros œuvre : terrassement, fondations, maçonnerie (hors chape) | 23,1 % | 26,3 % | 14,0 % (les murs passent au lot bois) | maçonnerie 25-30 % (monprojetmaison, constructeur, non daté) ; gros œuvre seul ≈ 30 % (construires.fr) | **Conforme**, A un peu bas. Le plain-pied déplace le poids vers la toiture. Murs à ≈ 104 € HT/m² chaînages compris, contre 110-220 (construires.fr, Île-de-France) : bas de fourchette, normal hors IDF. |
| Charpente + couverture + zinguerie | **16,7 %** | 11,6 % | 25,6 % (avec les murs ossature, soit 10,2 %) | charpente 5 % + couverture 6 % = 11 % (monprojetmaison) | **A sur-pondéré, à cause de la quantité**, pas du prix : 1,64 m² de toit par m² SH en plain-pied, géométrie juste à 35°. Les prix sont en **bas** de fourchette : fermettes 75 €/m² contre 70-180, tuiles 85 contre 90-200 (construires.fr). B colle au repère. |
| Gros œuvre + charpente + couverture | 39,8 % | 37,9 % | 39,6 % | 35-40 % (progineer) | **Conforme** (haut de fourchette). |
| Hors d'eau / hors d'air | 46 % | 44 % | 45 % | 45-55 % (construires.fr, prix-travaux-m2) ; 40-45 % (forum) | **Conforme.** |
| Menuiseries extérieures | **5,6 %** | 6,5 % | 5,0 % | 10 % (monprojetmaison, source unique) | **Sous-pondéré**, mais les prix sont vérifiés : fenêtre PVC 570 € contre 600-800 posé (Hellowatt), volets, baie. La quantité est au plancher du repère, 18 % de SH pour 1/6 à 1/5 (`recherche-clos`, `recherche-structure`). Cause probable : le **périmètre** du repère (alu, porte de garage, constructeur). Pas de correction. Vérifier le ratio de 18 % sur de vrais plans. |
| Façade | **3,4 %** | 4,4 % | 7,9 % (bardage) | ravalement 5 % (monprojetmaison) | **Sous-pondéré, à cause du prix** : enduit 26 € contre 40 € HT (correction déjà sourcée). Une fois corrigé, A passe à ≈ 5 %. |
| Plâtrerie + isolation | 10,5 % | 10,2 % | 9,1 % | isolation 6-7 % + plâtrerie 8 % = 14-15 % | **Légèrement sous-pondéré, à cause du périmètre** : l'isolant de la dalle (≈ 1,8 %) est rangé en fondations, et l'étanchéité à l'air et les rupteurs ne sont pas chiffrés (pas de source). Les prix sont justes ou un peu hauts : doublage 48 contre 40-75 TTC, cloison +11 %. Pas de correction de prix. |
| Fluides : électricité + plomberie + chauffage / VMC | 21,4 % | 20,4 % | 20,2 % | 5 + 5 + 7 à 20 % = 17-30 % (monprojetmaison) ; lots techniques ≈ 25 % (maisons-ideales) | **Conforme.** PAC + plancher + chape = 19 264 € HT, soit ≈ 23 100 € TTC, contre 17 000-25 000 € TTC pour PAC + plancher en neuf sur 100 m² (la-pompe-a-chaleur.com). |
| Finitions : sols, carrelage, peinture, menuiseries intérieures | **10,8 %** | 13,2 % (avec escalier) | 10,1 % | 11-14 % (monprojetmaison) ; 15-20 % (progineer, sur un total qui inclut 10-15 % d'études) | **Sous-pondéré, à cause du prix** : carrelage à 63 € contre 73-109 € HT (Habitatpresto). Le reste (peinture 25 €, portes 289 €) est juste ou non revérifié. |
| Installation, VRD privés, contrôles | 6,3 % | 5,3 % | 6,1 % | aucun (hors grilles) | À afficher comme un lot à part : c'est souvent oublié dans les budgets. |
| Études + DO + taxes + branchements (TTC / construction TTC) | 13,2 % | 11,9 % | 13,1 % | frais annexes 10-15 % (plan-immobilier) ; études seules 2-3 % (monprojetmaison) | **Conforme.** Études stricto sensu (sol, thermique, béton, contrôles) ≈ 2,9 % de A. |

---

## 3. Cohérence interne

### 3.1 Niveaux de finition

| Maison A | Construction TTC/m² | Écart |
|---|---:|---:|
| éco | 2 070 | −2,4 % |
| standard | 2 121 | — |
| premium (menuiseries alu par défaut) | 2 280 | +7,5 % |
| éco + tuile béton + poêle et radiateurs | 1 914 | −9,8 % |
| premium + 4 pans + plan en L + double flux + ardoise | 2 485 | +17,1 % |

Pour B : −2,4 % / +7,9 %. Pour C : −2,5 % / +7,4 %.

L'ordre est toujours respecté. L'écart est étroit face au maître d'œuvre progineer, en € HT/m² : entrée de gamme 1 500-1 800, standard 1 800-2 300, haut de gamme 2 300-3 000, soit **−20 % / +29 %** entre milieux de fourchette. Il y a deux raisons :
- la finition ne s'applique qu'aux matériaux, et le gros œuvre est en G0 / G1 ;
- sur le marché, « haut de gamme » couvre aussi l'architecture : vitrages, forme, toiture. Chez AVYORA, ce sont d'autres questions. En les cumulant, on atteint +17 %.

Notre standard (1 768 € HT/m²) tombe d'ailleurs **en bas** de la fourchette « standard » de progineer, et il est cohérent avec l'EPTB. **Pas de recalibrage des coefficients G** : aucune source ne le justifie. Il faut en revanche dire dans l'interface que **la finition déplace ±5 à 8 %**, et que les vrais leviers sont ailleurs :
- sous-sol : +15 % ;
- sol argileux fort : +11 % ;
- forme, toiture et chauffage : ±5 à 10 %.

### 3.2 « Qui réalise »

Le calcul suit `lineHT` : un poste fait soi-même vaut `sm × coef de finition`, et une prestation pure (`sm` null) garde son prix.

| Mode | A, construction TTC/m² | A, total projet TTC/m² | B | C |
|---|---:|---:|---:|---:|
| tout fait faire | 2 121 | 2 528 | 2 193 | 2 332 |
| une partie (`DIY_PARTIE` : peinture, sols, plâtrerie, isolation) | 1 839 (−13 %) | 2 221 | 1 903 | 2 045 |
| **le maximum, moteur actuel** (tout ce qui a un `sm`) | **968 (−54 %)** | 1 252 | 989 | 1 067 |
| le maximum **hors** terrassement, fondations, maçonnerie, charpente, couverture, menuiseries extérieures, raccordements, PAC | **1 562 (−26 %)** | 1 920 | 1 586 | 1 700 |

Repères d'auto-construction :
- plan-immobilier : 1 200-1 600 €/m², HT ou TTC non précisé ;
- SeLoger : « peut descendre à 1 300 €/m² » ;
- forum : faire tout le second œuvre ≈ −25 % (confiance basse) ;
- sic-habitat : agencement intérieur à 400-700 €/m² en auto-construction, contre 800-1 200 €/m² par des pros.

Lecture :
- **« Une partie », à −13 %,** est cohérente : elle ne touche que la moitié du second œuvre.
- **« Le maximum », tel que le moteur l'applique aujourd'hui,** tombe à 970 € TTC/m². C'est sous le bas du repère (1 200), et au niveau d'un **kit** (800-1 200 €/m², Crédit Agricole). Ce chiffre suppose que le particulier coule ses fondations, monte ses murs, pose sa charpente et sa couverture et installe la PAC, sans louer de matériel ni perdre de productivité.
  - Les postes de location (bétonnière, nacelle) existent mais ne sont pas cochés.
  - Pour une PAC split, la manipulation du fluide frigorigène est réservée aux entreprises qui ont une attestation de capacité (code de l'environnement). C'est **à faire confirmer par la recherche réglementaire**, je ne l'ai pas sourcé ici.
  - La recherche signale aussi que la DO coûte plus cher en auto-construction et que **certains assureurs la refusent**. Or le moteur calcule la DO à 3,5 % sur une assiette réduite aux seuls matériaux.
- **Recommandation.** En neuf, « le maximum » = second œuvre et finitions (isolation, plâtrerie, électricité, plomberie, VMC, plancher chauffant, carrelage, peinture, menuiseries intérieures, cuisine, façade). La structure, le clos-couvert et la PAC restent faits par des pros. On obtient −26 %, soit ≈ 1 560 € TTC/m², dans le repère. C'est un choix produit : je le soumets à Dani.

### 3.3 Plain-pied comparé à une maison à étage

Même programme, parpaing, sans garage, € TTC/m² SH :

| Surface | Plain-pied | Étage | Plain-pied / étage |
|---|---:|---:|---:|
| 90 m² | 2 183 | 2 158 | +1,2 % |
| 100 m² | 2 121 | 2 083 | +1,8 % |
| 120 m² | 2 074 | 2 016 | +2,9 % |
| 140 m² | 2 001 | 1 918 | +4,4 % |

Avec les corrections, l'écart passe de +1,6 % à +4,9 %.

À 100 m², le plain-pied paie en plus la dalle (+7 800 €), la couverture et la charpente (+12 400 €) et les combles (+1 600 €). L'étage paie en plus le plancher béton (+6 300 €), l'escalier (+4 000 €), les murs (+4 100 €), le doublage (+2 100 €) et des menuiseries, de la peinture et de l'enduit supplémentaires.

Les sources ne s'accordent pas :
- abctravaux : **+8 à +15 %**, source commerciale CCMI ;
- progineer : plain-pied standard 1 900-2 400 contre traditionnelle 1 800-2 300, soit **≈ +5 %** ;
- prix-travaux-m2 : « étage ≈ +200 €/m² » en hors d'eau / hors d'air, soit **l'inverse**.

Le modèle respecte le sens (le plain-pied coûte plus cher) avec une ampleur basse. **Verdict : incertain.** Aucune correction n'est justifiable sans une source neutre.

### 3.4 Ossature bois comparée au parpaing

À maison égale, l'ossature coûte **+6,7 % à +7,3 %** : 90 m² en plain-pied, 2 332 contre 2 183. À 90 m², le surcoût se décompose ainsi :
- murs ossature isolés : +17 333 € ;
- bardage : +7 936 € ;
- parement intérieur : +3 099 € ;
- maçonnerie : −12 812 € ;
- doublage isolant : −4 060 €.

Repères :
- progineer : ossature bois RE2020 standard à 2 200-2 800 contre 1 800-2 300 en traditionnel, soit ≈ +22 % ;
- prix-travaux-m2 : en hors d'eau / hors d'air, bois 800-1 300 contre parpaing 650-1 450, soit ≈ 0 %.

**Plausible.** Le bardage bois par défaut pèse à lui seul ≈ +4 %. L'avantage de délai (6 à 8 mois au lieu de 10 à 12) n'est pas monétisé, ce qui est normal.

---

## 4. Ce que l'on peut afficher honnêtement sur la précision

> **Estimation indicative.** Elle est calculée poste par poste, avec des prix moyens 2025-2026 d'artisans en France métropolitaine. Sur des maisons simples, nos totaux retrouvent à environ 10 % près les coûts moyens de construction déclarés en France (enquête officielle SDES 2024). Ce n'est pas le prix de *votre* maison. Votre coût réel dépendra surtout du terrain (seule l'étude de sol le dira), de votre région (les moyennes régionales varient d'environ −13 % à +12 %) et des devis que vous obtiendrez : seuls ces devis font foi. Non compris : terrain, notaire et aménagements extérieurs (souvent 8 000 à 20 000 €).

Version courte pour l'interface : « Estimation à ±10 % des coûts moyens constatés en France pour une maison simple. Votre terrain, votre région et vos devis feront la différence. »

Ce qu'il ne faut **pas** écrire :
- « précision ±10 % sur votre projet » : on ne mesure qu'un accord avec des **moyennes** ;
- un chiffre pour l'ossature bois, qui sort à +9 à +16 % du repère ;
- « clé en main » si les extérieurs restent exclus.

---

## 5. Recommandations

**Les corrections du catalogue rénovation restent à soumettre à Dani.** Je ne propose aucune correction nouvelle sur un prix repris. J'appuie les 14 corrections déjà sourcées dans `prix-sources.json` (+0,2 % à +1,4 %), en particulier :
- enduit monocouche 28/10 → 43/19 ;
- fermettes → 91/45 ;
- chape liquide → 30.

J'appuie aussi l'arbitrage sur le **carrelage au sol** : 63 € contre 73-109 € HT (Habitatpresto), soit +580 à +1 650 € HT sur A.

**Les postes nouveaux du neuf présentent une anomalie.** Pour `pei-peinture-plafonds-plaques-neuves`, le relevé dit « ≈ 26 TTC », ce qui donne ≈ 24 € HT avec la convention ÷ 1,1 des murs. Le prix retenu est pourtant de 29 € HT (« murs + 15 % »), au-dessus de sa propre source. Effet sur A : ≈ +500 € HT. Je propose de l'aligner sur le relevé (≈ 24), sinon de le marquer incertain.

Moteur et produit :
1. **Restreindre « le maximum »** en neuf (§ 3.2). C'est le seul vrai défaut de calage trouvé.
2. **Aléas à 10 %** en neuf au lieu de 7 % : Crédit Agricole conseille 10-15 %, et l'EPTB est un prévisionnel qui sous-estime. Effet : ≈ +3 % sur le total affiché.
3. **Isolant compté deux fois** (dalle isolée + plancher chauffant, ≈ 3 000 € sur A) : à trancher (§ h-4). C'est le seul doublon chiffré qui pèse.
4. **Garage accolé** en haut de fourchette : proposer une variante « sous le toit principal » ou un appentis. Le prix est à sourcer avant de chiffrer.
5. **Afficher l'écart de finition** (±5-8 %) et les vrais leviers : sol, sous-sol, forme, chauffage.

**Ce qui reste incertain**, faute de source :
- le ratio SP / SH ;
- le périmètre déclaratif de l'EPTB (études, DO, VRD) : c'est l'incertitude principale, de 0 à +11 % ;
- l'inflation des coûts 2024 → 2026 ;
- l'écart plain-pied / étage ;
- le coût d'un garage seul ;
- le croisement EPTB « particulier + terminée ».
