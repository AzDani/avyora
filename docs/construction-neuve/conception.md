# AVYORA — Construction neuve d'une maison individuelle : conception (v1)

Ce document décrit comment faire entrer la **construction neuve** dans le **même moteur** que la rénovation (`core.ts`). Il remplace `conception.md` (brouillon) et intègre les corrections des six vérificateurs (études, terrain, gros œuvre, second œuvre, conducteur de travaux, économiste).

Fichiers liés :
- `catalog-neuf.v1.json` : le catalogue (lots dans l'ordre du chantier ; `{ref}` = poste repris du catalogue rénovation, même prix) ;
- `calibre.mjs` : la **référence exécutable** des formules ci-dessous (`geometrie()` et `regles()` préfigurent l'`autoQty` du neuf) ;
- `calibrage-v1.md` : le contrôle chiffré (5 maisons, 3 finitions, 2 modes) ;
- `prix-sources.json` et `verif-*.json` : les sources de chaque prix ;
- `journal-corrections.md` : chaque changement depuis le brouillon et sa raison ;
- `decisions-dani.md` : ce qui reste à trancher.

**En chiffres :** 9 phases · 37 blocs de lot (24 noms de lot distincts, dont 7 nouveaux) · **202 postes : 99 nouveaux + 103 repris** du catalogue rénovation par référence. Dans les tableaux, **(v1)** marque un poste ajouté depuis le brouillon.

**Périmètre.** Du permis de construire jusqu'à la déclaration d'achèvement : enduit de façade compris, TVA 20 % partout. Les aides (PTZ, MaPrimeRénov', CEE…) sont hors sujet. Les démarches administratives sont des jalons à 0 €. Les **aménagements extérieurs** (allée, terrasse, clôture définitive, portail, engazonnement) restent hors périmètre : la recherche « calibrage » les estime à 8 000 – 20 000 € sur un terrain de 600 – 800 m² (décision Dani).

---

## Ce qu'il faut changer dans le moteur

> **État :** ce document a servi de cahier des charges. Il est implémenté dans `lib/estimateur/` : `catalog-neuf.json` (catalogue v1), `catalogue-neuf.ts` (chargement), `neuf.ts` (géométrie, quantités, décisions), `presets-neuf.ts` (modes rapide et détaillé). Les fichiers cités ci-dessous sous leur nom de travail (`calibre.mjs`, `catalog-neuf.v1.json`…) sont dans `sources/` ou ont été intégrés au code ; `tests/estimateur-neuf.test.ts` vérifie les règles et le calage.

Ce que le moteur sait déjà faire :
- `effRate` renvoie 20 % quand `ctx.nature === "neuf"` ;
- `lineHT` et `totals` gèrent `t.frais` : pas de TVA, pas d'aléas, pas de coefficient régional ni de finition ;
- `qtyOf` met **1** pour toute unité `forfait` : c'est pourquoi la deuxième benne est un poste à part.

Ce qu'il reste à faire :
1. **Chargement.** Si `ctx.nature === "neuf"`, charger `catalog-neuf.json` (v1). Chaque `{ref}` est résolu vers le poste rénovation : même objet, même prix, même `c`.
2. **`LOT_FIN`.** Ajouter les 7 nouveaux lots :
   - G0 : « Assurance & ouverture du chantier », « Terrassement », « Fondations & soubassement », « Réseaux enterrés (VRD) », « Contrôles & réception », « Taxes & participations » ;
   - G2 : « Couverture & zinguerie ».
   Sans cet ajout, ces lots retombent sur `FINCO` (G3), ce qui serait faux pour le béton.
3. **Unité `pct`** (nouvelle), calculée en 2 passes dans `totals` / `lineHT` comme `chiffrer()` dans `calibre.mjs` :
   - **dommages-ouvrage** 3,5 %, `frais`, assiette = HT de tous les postes hors frais, études comprises ;
   - **maîtrise d'œuvre complète** 10 %, assiette = HT des travaux hors études et hors frais.
   Plan B : un poste `forfait` dont le `pu` est recalculé à chaque rendu.
4. **`autoQty` du neuf** : une branche à part qui reprend `geometrie()` + `regles()` de `calibre.mjs`. Les règles rénovation (« Faux plafond » = S…) ne s'appliquent **pas** aux postes repris.
5. **Clé `key(c, n)`** : elle reste unique (vérifié par `valide-v1.mjs`). Un même nom de lot apparaît dans plusieurs phases, et parfois deux fois dans la même phase (« Carrelage / Revetements » avant et après la peinture, « Isolation » avant et après les plafonds) : l'affichage regroupe par **phase** (`p`), puis par bloc, dans l'ordre du fichier.
6. **Aléas du neuf** : paramètre propre, **10 % proposé** (7 % en rénovation). Décision Dani.
7. **« Je le fais » en neuf** : pas sur les `frais` ni sur les prestations pures (`sm` null), comme aujourd'hui. La structure et le clos-couvert restent aux pros **par défaut** en « le maximum », mais se prennent soi-même ligne par ligne dans le détaillé depuis N1 (§ h).
8. **Nouvelles questions** (§ b) : zone sismique, terrain borné, toit à pente faible, gouttière, terre végétale à évacuer, taux communal de la taxe d'aménagement (facultatif).

---

## a. Les phases du chantier, leurs jalons et leurs lots

| # | Phase | Ce qui s'y passe | Jalon qui la termine |
|---|---|---|---|
| 1 | **Études & permis** | Plan topo, étude de sol G2, plans et dossier de permis (architecte obligatoire au-delà de 150 m² de **surface de plancher**), étude thermique RE2020 (attestation n° 1), dépôt, instruction 2 mois, affichage, purge (recours 2 mois, retrait 3 mois). **Demandes de raccordement dès le permis obtenu** (Enedis : 2 à 6 mois). Étude béton armé si nécessaire, devis des lots, dommages-ouvrage, DOC. | **Permis purgé + DO souscrite + DOC déposée** = chantier ouvert |
| 2 | **Terrain & terrassement** | **DT sur le guichet unique des réseaux**, implantation par géomètre, installation, électricité provisoire **et compteur d'eau** (eau de chantier), décapage, fouilles, évacuation des terres | **Fond de fouille réceptionné** |
| 3 | **Fondations & plancher bas** | Semelles, boucle de terre, **réseaux sous dallage posés et testés** (plombier, électricien), soubassement + dalle (ou vide sanitaire, ou sous-sol) | **Plancher bas coulé** (≈ 25 % des appels de fonds en CCMI) |
| 4 | **Murs & planchers** | Élévation (maçonnerie ou ossature bois), linteaux, chaînages, appuis, plancher d'étage et ses rupteurs, escalier béton | **Murs et pignons arasés** (≈ 40 % en CCMI) |
| 5 | **Clos & couvert** | Charpente, couverture et zinguerie, puis menuiseries extérieures | **Hors d'eau** (couverture, ≈ 60 %) puis **hors d'air** (menuiseries posées) |
| 6 | **Réseaux & façade** | Tranchées, fourreaux, tube d'eau, regards, eaux pluviales et remblai au pied des murs, branchements définitifs (électricité, égout ou assainissement individuel), **puis** enduit ou bardage (il s'arrête au niveau du terrain fini) | **Branchements faits + façade finie** |
| 7 | **Second œuvre** | 1re passe électricité / plomberie / chauffage / VMC, doublages et pare-vapeur, **test d'étanchéité intermédiaire**, plafonds et cloisons, 2e benne, soufflage des combles, chapes et séchage | **Cloisons finies + chape sèche** (≈ 75 % en CCMI) |
| 8 | **Finitions & équipements** | Carrelage et faïence → peinture → stratifié / parquet et plinthes → portes → escalier bois et garde-corps → sanitaires → cuisine | **Équipements posés** (≈ 95 % en CCMI) |
| 9 | **Réception & achèvement** | **Consuel** puis mise en service du compteur, contrôles RE2020 (test final, VMC, attestation n° 2), attestations argile / parasismique selon le terrain, nettoyage, réception avec chaque artisan, levée des réserves, DAACT, **déclaration fiscale sous 90 jours**, taxe d'aménagement, PFAC ou redevances SPANC | **PV de réception** (départ des garanties) puis **DAACT déposée** (conformité acquise après 3 mois) |

Durées de repère (recherche calibrage) : permis + purge 5 à 6 mois ; gros œuvre jusqu'au hors d'eau / hors d'air 4 à 6 mois ; second œuvre 3 à 4 mois ; finitions 1 à 2 mois. Le chantier dure 10 à 12 mois en traditionnel et 6 à 8 mois en ossature bois. Le chemin critique est le **séchage de la chape** (≈ 1 semaine par cm, au moins 7 semaines pour 6 cm sur plancher chauffant) ; avant le chantier, c'est le **délai Enedis**.

Lots de chaque phase, dans l'ordre du catalogue :

| Phase | Lots (dans l'ordre) | Postes |
|---|---|---:|
| **Études & permis** | Etudes / Conception → Assurance & ouverture du chantier | 17 |
| **Terrain & terrassement** | Annexes de chantier → Raccordements aux réseaux *(repris)* → Location de matériel *(repris)* → Terrassement | 22 |
| **Fondations & plancher bas** | Maçonnerie *(repris)* → Electricite *(repris)* → Fondations & soubassement | 16 |
| **Murs & planchers** | Maçonnerie → Charpente, couverture & structure bois | 18 |
| **Clos & couvert** | Charpente, couverture & structure bois *(repris)* → Couverture & zinguerie → Menuiseries exterieures *(repris)* | 28 |
| **Réseaux & façade** | Réseaux enterrés (VRD) → Raccordements aux réseaux → Façade | 17 |
| **Second œuvre** | Electricite → Plomberie → Chauffage / VMC → Isolation → Contrôles & réception → Cloisons / Platrerie *(repris)* → Annexes de chantier → Isolation *(repris)* → Maçonnerie *(repris)* | 34 |
| **Finitions & équipements** | Carrelage / Revetements *(repris)* → Peinture → Carrelage / Revetements *(repris)* → Menuiseries interieures → Charpente, couverture & structure bois *(repris)* → Plomberie *(repris)* → Cuisine *(repris)* | 37 |
| **Réception & achèvement** | Electricite *(repris)* → Contrôles & réception → Annexes de chantier *(repris)* → Taxes & participations | 13 |

---

## b. Les questions à poser (mode détaillé)

Ordre conseillé : du plus structurant au plus fin. Chaque question a une **valeur par défaut** ; l'utilisateur peut tout laisser par défaut sauf la surface et le code postal.

| # | Question | Réponses | Défaut | Ce que ça pilote |
|---|---|---|---|---|
| 1 | Surface habitable | m² | — (obligatoire) | tout |
| 2 | Code postal | — | — (obligatoire) | coef. régional MO, taxe IDF ; à terme argile, sismicité et pente régionale |
| 3 | Niveaux | plain-pied / à étage / combles aménagés | plain-pied ≤ 110 m², à étage au-delà | emprise, murs, plancher, escalier, toiture, isolation combles |
| 4 | Forme | simple (rectangle) / en L / complexe | simple | périmètre, angles, noues |
| 5 | Garage accolé | non / oui (m², défaut 20) | non | dalle, murs, porte de garage, porte de communication, taxe |
| 6 | Chambres · salles d'eau · WC | nombres | 3 · 1 · 1 (≥ 4 ch. → 2 SDB, 2 WC) | ouvertures, cloisons humides, sanitaires, portes, CET |
| 7 | Plancher bas | dalle sur terre-plein / vide sanitaire / sous-sol | dalle ; **vide sanitaire conseillé** si pente, sol humide ou argile moyen/fort | fondations |
| 8 | Murs | parpaing / brique / brique monomur / béton cellulaire / ossature bois | parpaing | élévation, doublage, façade |
| 9 | Toiture | 2 pans / 4 pans / toit plat | 2 pans | charpente, zinguerie, dalle de toiture |
| 10 | Couverture | tuiles terre cuite / tuiles béton / ardoise / ardoise fibres-ciment / bac acier / zinc | tuiles terre cuite | m² de couverture |
| 11 | **(v1)** Toit à pente faible (tuile canal du Sud) | oui / non | non (à terme : déduit du département, liste à fixer par Dani) | pente 17° au lieu de 35° |
| 12 | **(v1)** Gouttières | zinc / PVC / alu continu | zinc (arbitrage Dani) | zinguerie |
| 13 | Façade | enduit / bardage bois / bardage composite | enduit (maçonnerie) ; bardage bois (ossature bois) | finition extérieure |
| 14 | Chauffage | PAC air/eau + plancher chauffant / PAC air/air gainable / poêle à granulés + radiateurs | PAC air/eau + plancher chauffant | chauffage, chape |
| 15 | Ventilation | simple flux / double flux | simple flux hygro | VMC |
| 16 | Escalier (si étage) | bois / béton | bois quart tournant | escalier |
| 17 | Eaux usées | tout-à-l'égout / fosse toutes eaux / micro-station | tout-à-l'égout | raccordement, PFAC ou étude + redevances SPANC |
| 18 | Eaux de pluie | infiltration sur la parcelle / réseau public | infiltration | puits, canalisations |
| 19 | Terrain | plat / en pente | plat | terrassement, drain, G2 PRO |
| 20 | Sol argileux (Géorisques) | non ou faible / moyen / fort / je ne sais pas | je ne sais pas → **non**, avec un avertissement **et une fourchette haute** (+ surcoût argile moyen) | fondations, drain, G2 PRO, étude BA, attestation argile |
| 21 | **(v1)** Zone sismique (Géorisques) | 1-2 / 3 / 4 / 5 / je ne sais pas | je ne sais pas → 1-2 | raidisseurs, étude BA, attestations parasismiques |
| 22 | Terrain viabilisé (réseaux devant le terrain) | oui / non | oui | extension Enedis |
| 23 | Distance entre la maison et la rue (réseaux) | m | 15 m | tranchées, fourreaux, tube d'eau, canalisations |
| 24 | Lotissement | oui / non | non | plan topo (fourni en lotissement) |
| 25 | **(v1)** Terrain déjà borné (hors lotissement) | oui / non | oui | bornage |
| 26 | **(v1)** Terre végétale à évacuer (petite parcelle) | oui / non | non | évacuation des terres |
| 27 | Cuisine équipée | oui / non | oui | cuisine |
| 28 | Qui pilote | moi (lots séparés) / un maître d'œuvre ou architecte | moi | mission MOE 10 % au lieu du dossier de permis |
| 29 | Finition | éco / standard / premium | standard | coefficients de matériaux (moteur existant) |
| 30 | Qui réalise | tout fait faire / une partie / le maximum | tout fait faire | mode « Je le fais » (§ h) |
| 31 | **(v1, facultatif)** Taux communal de la taxe d'aménagement | 1 à 5 % | 3 % | ± 45 % sur la taxe |

Remarques :
- **Surface de plancher (SP) et surface habitable (SH).** Le seuil de l'architecte (150 m²), son prix et l'assiette de la taxe d'aménagement portent sur la **SP**, plus grande que la SH (elle compte cloisons et gaines). Le modèle prend **SP ≈ 1,017 × SH** *[modèle]* : c'est la conséquence des hypothèses de l'emprise (intérieur des murs ≈ 87,5 % de l'emprise, SH ≈ 86 %). Aucun ratio sourcé : près de 150 m², dire à l'utilisateur de vérifier sa SP sur ses plans.
- **Zone sismique et argile** se lisent sur Géorisques ; tant que la carte n'est pas branchée sur le code postal, ce sont des questions.

---

## c. Le modèle géométrique

Notations et formules, identiques à `geometrie()` dans `calibre.mjs`. Les ratios sans source sont marqués **[raisonnement]** ou *[modèle]*.

**Convention de prix (à respecter partout).**
- Les murs (maçonnerie, ossature, doublage, peinture des murs) se comptent en **m² nets, ouvertures déduites**. Chaînages, linteaux et appuis s'ajoutent à part ; le chaînage au niveau d'un plancher n'est **pas** dans le prix du plancher (composition CYPE du plancher, devis Batisigne).
- La toiture se compte en **m² de rampants, débords compris**.
- La façade se compte en **m² nets des grandes ouvertures** pour l'enduit (fenêtres non déduites : tableaux et retours compensent, usage des métreurs **[raisonnement]**). L'échafaudage se compte sur les **pignons** en plain-pied (le reste se fait sur tréteaux, ktel : 0 à 300 € pour un plain-pied) et sur la **façade brute** à étage.

| Grandeur | Formule | Justification |
|---|---|---|
| SH rdc | plain-pied : SH ; à étage : SH / 2 ; combles aménagés : SH / 1,7 | **[raisonnement]** combles : le niveau haut fait ≈ 70 % du rdc en SH |
| **E** (emprise extérieure de la maison) | SH rdc / 0,86 | **[raisonnement]** maison 10 × 12 m, murs 33 cm : intérieur ≈ 87,5 % ; cloisons ≈ 2 % ⇒ 86 % |
| **SP** (surface de plancher) | 1,017 × SH (= 0,875 / 0,86) | *[modèle]*, mêmes hypothèses que E ; non sourcé |
| Rectangle équivalent | l = √(E / 1,3), L = 1,3 × l | **[raisonnement]** proportion courante 1,3 : 1 |
| **P** (périmètre extérieur) | kP × 2 (L + l), kP = 1 (simple), 1,12 (L), 1,25 (complexe) | **[raisonnement]** |
| Angles | 4 / 6 / 8 | forme |
| Garage | surface intérieure G ; emprise 1,1 G ; largeur 4,4 m ; 3 murs Lg3 = 2 × (1,1 G / 4,4) + 4,4 | le 4ᵉ mur est celui de la maison |
| Etot, Ptot | E + 1,1 G ; P + 2 × profondeur garage | |
| **Pente** | 35° ; **17° si « toit à pente faible »** (tuile canal du Sud) ; 45° en combles aménagés ; toit plat 0 | recherche clos : 30-45° courant ; jury conducteur : 30-35 % (≈ 17°) dans le Sud **[métier]** |
| **T** (toiture) | (Etot + d × Ptot + 4 d²) / cos(pente), débord d = 0,40 m | recherche clos |
| Pignons (2 pans) | 2 × l² × tan(pente) / 4 | recherche structure |
| Rampants de pignons | 4 × (l / 2) / cos(pente) | recherche clos (rives) |
| Arêtier / noue | √(2 (l/2)² + ((l/2) tan pente)²) | recherche clos |
| Raccords | 4 pans : (L − l) + 4 arêtiers ; + 2 noues (L) ou 4 (complexe) ; **+ 4,4 ml de solin** quand un garage d'un niveau (appentis) s'adosse à une maison à étage | faîtage d'un 2 pans compris dans la couverture ; solin : jury conducteur **[métier]** |
| Égout (gouttières) | 2 pans : 0,565 × Ptot + 4 d ; 4 pans : Ptot + 8 d | |
| Hauteur d'égout | 3,0 / 5,7 / 4,0 m (pp / étage / combles) | **[raisonnement]** |
| Descentes | n = max(2, ⌈égout / 11⌉) ; ml = n × hauteur d'égout, **la descente du garage d'une maison à étage comptant 2,6 m** | recherche clos ; jury conducteur |
| **Ouvertures** | surface en tableau = 0,18 × SH | **[raisonnement]** RT 2012 ≥ 1/6 de SH |
| nBaie | 1 (+ 1 si SH ≥ 130) | 2,40 × 2,15 m = 5,16 m² |
| nPF | plain-pied : max(1, round(chambres / 2)) ; à étage : 1 | 1,20 × 2,15 m = 2,58 m² |
| nFen | max(**SDB + WC + 1 + max(0, chambres − nPF)**, round((0,18 SH − 2,2 − 5,16 nBaie − 2,58 nPF) / 1,25)) | chaque pièce sans porte-fenêtre a sa fenêtre, cuisine comprise (jury conducteur) |
| Volets | nFen + nPF + nBaie − (SDB + WC) | pas de volet en salle d'eau / WC |
| Hauteur de murs | 2,70 m par niveau ; combles : 2,70 + 1 m de jambette = 3,70 m | |
| **Murs ext. nets** | P × hauteur + pignons (+ 0,6 × P d'acrotères si toit plat) − ouvertures | convention « m² net » |
| Refend porteur | à étage ou combles : L × 2,70 m ; plain-pied : 0 (fermettes) | **[raisonnement]** |
| Murs du garage | Lg3 × 2,60 − 4,80 (porte) | toujours en parpaing, non isolés |
| **Lsem** (semelles) | P + refend + Lg3 | |
| Périmètre intérieur | **Pint = P − 8 × 0,33** (8 épaisseurs de mur de moins, vrai pour toute forme à angles droits) | jury conducteur (au lieu de 0,97 P) |
| Doublage | Pint × 2,50 × niveaux − ouvertures ; combles : Pint × 3,5 + 0,9 × pignons − ouvertures | recherche second |
| Plafonds | (SH − SH combles) × 1,03 + SH combles × 0,30 | recherche second |
| Rampants isolés (combles) | 0,75 × T | **[raisonnement]** |
| Plafond sous combles perdus | SH dernier niveau × 1,03 | |
| Cloisons | 0,8 × SH (une face) − hydrofuges ; hydrofuges = 12 m² × SDB | recherche second |
| Faces du refend | 2 × refend (plaque + peinture des deux côtés) | jury conducteur (il n'était fini nulle part) |
| Peinture murs | doublage (tous murs, **monomur compris**) + 2 × refend + 2 × cloisons − faïence − 3,4 m² × portes intérieures | jury conducteur |
| Portes intérieures | chambres + SDB + WC + 1 | |
| Faïence | 12 m² × SDB | **[raisonnement]** |
| Sols | carrelage 60 % SH, stratifié 40 % SH (chambres) | **[raisonnement]** |
| Plinthes | 4 × √(SH × (chambres + 3)) | **[raisonnement]** |
| Façade brute | P × hauteur d'égout + pignons + Lg3 × 2,8 | |
| Façade nette | brute − (baies + PF + porte + porte garage) | |
| Décapage | Etot + 2 × Ptot + 16 | maison + 2 m autour (recherche terrain) |
| Évacuation des terres | 1,3 × 0,5 × 0,4 m³/ml × Lsem (sous-sol : × Lg3 seulement) ; option + 1,3 × 0,25 × décapage (terre végétale) | foisonnement 1,3 ; moitié des fouilles réutilisée en remblai **[raisonnement]** ; terre végétale : jury conducteur |
| Tranchées | D + D eaux usées (12 m si fosse) + 0,5 × Ptot + 10 m (puits) | recherche terrain |
| Durée de chantier | 9 mois plain-pied, 10 à étage, 7 ossature bois | recherche calibrage |
| Surface taxable ST | **SP + G** (garage clos) | recherche démarches |

---

## d. Chaque poste : règle de quantité et cochage par défaut

Légende : **N** = nouveau poste, **R** = repris du catalogue rénovation (même id, même prix). « fp base » est le prix fourni-posé HT du catalogue au niveau de base (premium matériaux) ; le moteur le ramène au standard selon le groupe de finition du lot.

### Études & permis

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| N | Etudes / Conception | Plan topographique du terrain (géomètre : niveaux, limites, arbres, réseaux visibles) <br><sub>`etu-plan-topographique`</sub> | forfait | 800 | 1 forfait | si le terrain n'est PAS en lotissement (le lotisseur le fournit) |
| N | Etudes / Conception | Bornage du terrain par un géomètre-expert <br><sub>`etu-bornage-du-terrain`</sub> | forfait | 920 | 1 forfait | si hors lotissement ET « terrain déjà borné ? » = non |
| N | Etudes / Conception | Étude de sol préalable G1 (si le vendeur ne l'a pas fournie) <br><sub>`etu-etude-de-sol-g1`</sub> | forfait | 800 | 1 forfait | option : jamais si on commande la G2 (et due par le vendeur en zone argile) |
| N | Etudes / Conception | Étude de sol G2 avant-projet (dit comment fonder la maison) <br><sub>`etu-etude-de-sol-g2-avp`</sub> | forfait | 1 600 | 1 forfait | toujours |
| N | Etudes / Conception | Étude de sol G2 projet (complément : calcul détaillé des fondations) <br><sub>`etu-etude-de-sol-g2-pro`</sub> | forfait | 750 | 1 forfait | si argile = fort, terrain en pente ou sous-sol |
| N | Etudes / Conception | Plans et dossier de permis de construire par un dessinateur ou maître d'œuvre (jusqu'à 150 m²) <br><sub>`etu-dossier-permis-dessinateur`</sub> | forfait | 2 500 | 1 forfait | si surface de plancher SP ≤ 150 m² et pas de maîtrise d'œuvre complète |
| N | Etudes / Conception | Architecte : plans et dossier de permis (obligatoire au-delà de 150 m² de surface de plancher) <br><sub>`etu-architecte-mission-permis`</sub> | m2 | 30 | SP (≈ 1,017 × SH *[modèle]*) | si SP > 150 m² et pas de maîtrise d'œuvre complète |
| N | Etudes / Conception | Architecte ou maître d'œuvre : mission complète (plans, choix des artisans, suivi du chantier, réception) <br><sub>`etu-maitrise-d-oeuvre-complete`</sub> | % | 10 % | % du HT travaux (10 %) | si « Qui pilote le chantier ? » = un architecte / maître d'œuvre (remplace les 2 postes « dossier de permis ») |
| N | Etudes / Conception | Étude thermique RE2020 + attestation à joindre au permis <br><sub>`etu-etude-thermique-re2020`</sub> | forfait | 850 | 1 forfait | toujours |
| R | Etudes / Conception | Étude assainissement individuel (SPANC) <br><sub>`etu-etude-assainissement-individuel-spanc`</sub> | forfait | 600 | 1 forfait | si assainissement ≠ tout-à-l'égout |
| N | Etudes / Conception | Dépôt du permis de construire en mairie (démarche gratuite, instruction ≈ 2 mois) *(frais)* <br><sub>`etu-depot-du-permis-de-construire`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| N | Etudes / Conception | Panneau d'affichage du permis de construire (80 × 120 cm) et sa fixation <br><sub>`etu-panneau-affichage-permis`</sub> | u | 20 | 1 u | toujours |
| N | Etudes / Conception | Constat d'affichage du permis par un commissaire de justice (3 passages) <br><sub>`etu-constat-affichage-commissaire`</sub> | forfait | 350 | 1 forfait | option (souvent demandé par la banque) |
| N | Etudes / Conception | Étude béton armé : calcul de la structure et plans de ferraillage pour le maçon <br><sub>`etu-etude-beton-arme`</sub> | forfait | 2 000 | 1 forfait | si étage, combles aménagés, sous-sol, toit plat, argile moyen/fort ou zone sismique ≥ 3 ; option sinon (souvent fournie par le maçon ou le fournisseur de plancher) |
| N | Etudes / Conception | Demandes de raccordement Enedis, eau et égout, dès le permis obtenu (démarche gratuite) *(frais)* **(v1)** <br><sub>`etu-demandes-de-raccordement`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| N | Assurance & ouverture du chantier | Assurance dommages-ouvrage (obligatoire, souscrite avant l'ouverture du chantier) *(frais)* <br><sub>`ass-assurance-dommages-ouvrage`</sub> | % | 3.5 % | % (3,5 %) du HT travaux + études | toujours |
| N | Assurance & ouverture du chantier | Déclaration d'ouverture de chantier en mairie (démarche gratuite) *(frais)* <br><sub>`ass-declaration-ouverture-de-chantier`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |

### Terrain & terrassement

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| N | Annexes de chantier | Déclaration de projet de travaux (DT) sur le guichet unique des réseaux, avant tout terrassement (démarche gratuite) *(frais)* **(v1)** <br><sub>`anx-declaration-dt-reseaux`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| N | Annexes de chantier | Implantation de la maison sur le terrain par un géomètre (angles et niveau du plancher) <br><sub>`anx-implantation-par-geometre`</sub> | forfait | 550 | 1 forfait | toujours |
| R | Annexes de chantier | Installation de chantier <br><sub>`anx-installation-de-chantier`</sub> | forfait | 400 | 1 forfait | toujours |
| N | Annexes de chantier | Clôture de chantier (panneaux grillagés sur plots, pose et dépose) <br><sub>`anx-cloture-de-chantier`</sub> | ml | 30 | côtés ouverts du terrain (ml) | option : terrain non clos en ville / lotissement |
| N | Annexes de chantier | WC de chantier (cabine louée pour les ouvriers) <br><sub>`anx-wc-de-chantier`</sub> | jour | 8 | durée en jours : 30 × (9 mois plain-pied, 10 à étage, 7 ossature bois) | toujours (décocher si le maçon fournit les sanitaires) |
| N | Annexes de chantier | Accès de chantier empierré (géotextile + grave compactée) pour les camions <br><sub>`anx-acces-de-chantier-empierre`</sub> | m2 | 20 | longueur d'accès × 3,5 m | option : terrain en terre ou humide |
| R | Annexes de chantier | Benne & évacuation des gravats <br><sub>`anx-benne-evacuation-des-gravats`</sub> | forfait | 400 | 1 forfait (benne du gros œuvre) | toujours |
| R | Raccordements aux réseaux | Coffret / tableau de chantier provisoire <br><sub>`rac-coffret-tableau-de-chantier-provisoire`</sub> | forfait | 300 | 1 forfait | toujours |
| R | Raccordements aux réseaux | Mise en service provisoire (Enedis) <br><sub>`rac-mise-en-service-provisoire-enedis`</sub> | forfait | 250 | 1 forfait | toujours |
| R | Raccordements aux réseaux | Raccordement eau potable <br><sub>`rac-raccordement-eau-potable`</sub> | forfait | 1 500 | 1 forfait (compteur posé dès l'installation de chantier) | toujours |
| R | Location de matériel | Mini-pelle (1,5-2,5 t) <br><sub>`loc-mini-pelle-1-5-2-5-t`</sub> | jour | 200 | jours | jamais cochée d'office : ajout à la main. La part d'engin d'un terrassement fait soi-même ira dans son `sm` (méthode réno, N12) ; une règle automatique compterait l'engin deux fois |
| R | Location de matériel | Livraison mini-pelle (dépose + reprise) <br><sub>`loc-livraison-mini-pelle-depose-reprise`</sub> | forfait | 300 | 1 forfait | avec la mini-pelle louée |
| R | Location de matériel | Bétonnière <br><sub>`loc-betonniere`</sub> | jour | 35 | jours | option (auto-construction) |
| R | Location de matériel | Nacelle / plateforme élévatrice <br><sub>`loc-nacelle-plateforme-elevatrice`</sub> | jour | 180 | jours | option (auto-construction) |
| N | Terrassement | Débroussaillage du terrain (avec évacuation des déchets verts) <br><sub>`ter-debroussaillage`</sub> | m2 | 1 | Etot + 2·Ptot + 16 (comme le décapage) | option : terrain en friche |
| N | Terrassement | Décapage de la terre végétale (20 à 30 cm) mise en tas sur le terrain <br><sub>`ter-decapage-terre-vegetale`</sub> | m2 | 4 | Etot + 2 × Ptot + 16 m² (maison + 2 m autour) | toujours |
| N | Terrassement | Fouilles en rigole pour les semelles (seulement en chiffrage détaillé des fondations) <br><sub>`ter-fouilles-en-rigole`</sub> | ml | 35 | Lsem | jamais (seulement en chiffrage détaillé, à la place de la semelle complète) |
| N | Terrassement | Fouilles en pleine masse (grand décaissement : sous-sol, terrain en pente) <br><sub>`ter-fouilles-en-pleine-masse`</sub> | m3 | 12 | terrain en pente : 0,5 × Etot m³ | si terrain en pente (jamais avec un sous-sol : l'excavation est dans son prix) |
| N | Terrassement | Évacuation des terres en décharge (chargement, transport, redevance) <br><sub>`ter-evacuation-des-terres`</sub> | m3 | 22 | 1,3 × 0,5 × 0,4 × Lsem m³ (sous-sol : Lg3 seulement) + option « terre végétale non réutilisable » : 1,3 × 0,25 × décapage | toujours |
| N | Terrassement | Remblai autour des fondations avec les terres du chantier, compacté <br><sub>`ter-remblai-peripherique`</sub> | m3 | 22 | 0,25 × Ptot m³ | toujours |
| N | Terrassement | Apport de remblai en grave compactée (mise à niveau, plateforme, sous dallage) <br><sub>`ter-apport-remblai-grave`</sub> | m3 | 38 | 0,3 × Etot m³ | si terrain en pente (ou terrain bas) |
| N | Terrassement | Journée de terrassier avec mini-pelle et conducteur (travail en régie) <br><sub>`ter-journee-terrassier-mini-pelle`</sub> | jour | 500 | jours | option (reprises, petits travaux en régie) |

### Fondations & plancher bas

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| R | Maçonnerie | Semelle de fondation (50 × 25-30 cm) <br><sub>`mac-semelle-de-fondation-50-25-30-cm`</sub> | ml | 140 | Lsem = P + refend porteur + 3 murs du garage (ml) | toujours (sauf radier ; en sous-sol : garage seulement) |
| R | Electricite | Mise à la terre <br><sub>`ele-mise-a-la-terre`</sub> | forfait | 500 | 1 forfait (boucle en fond de fouille) | toujours |
| N | Fondations & soubassement | Béton de propreté au fond des fouilles (chiffrage détaillé seulement) <br><sub>`fon-beton-de-proprete`</sub> | ml | 12 | Lsem | jamais (chiffrage détaillé seulement) |
| N | Fondations & soubassement | Semelle filante – béton armé seul, dans une fouille déjà creusée (chiffrage détaillé) <br><sub>`fon-semelle-filante-beton-arme-seul`</sub> | ml | 85 | Lsem | jamais (chiffrage détaillé seulement) |
| N | Fondations & soubassement | Semelle isolée sous poteau (plot en béton armé ≈ 80 × 80 × 40 cm), fouille comprise <br><sub>`fon-semelle-isolee-sous-poteau`</sub> | u | 240 | nombre de poteaux | option : auvent, terrasse couverte, baie à poteau |
| N | Fondations & soubassement | Longrine en béton armé (poutre enterrée entre plots ou sous un mur) <br><sub>`fon-longrine-beton-arme`</sub> | ml | 70 | ml prescrits | option : sur prescription de la G2 / du BET |
| N | Fondations & soubassement | Radier général (dalle de fondation épaisse sous toute la maison) <br><sub>`fon-radier-general`</sub> | m2 | 160 | E | option : sur prescription de la G2 (remplace semelles + dalle) ; coche alors « Isolant sous chape » (SH rdc) |
| N | Fondations & soubassement | Surcoût des fondations en sol argileux (ordre de grandeur avant l'étude G2) <br><sub>`fon-surcout-sol-argileux`</sub> | forfait | 12 500 | 1 forfait, variante aléa moyen / fort | si argile = moyen ou fort |
| N | Fondations & soubassement | Mur de soubassement en parpaings sur les semelles (2-3 rangs), arase étanche comprise <br><sub>`fon-mur-de-soubassement`</sub> | ml | 85 | Lsem (ml) | si plancher bas = dalle sur terre-plein |
| N | Fondations & soubassement | Arase étanche seule (coupure contre les remontées d'humidité en pied de mur) <br><sub>`fon-arase-etanche`</sub> | ml | 12 | Lsem | jamais (comprise dans soubassement et vide sanitaire) |
| N | Fondations & soubassement | Drain autour de la maison, posé dans la fouille ouverte (gravier, géotextile, membrane, regards) <br><sub>`fon-drain-peripherique`</sub> | ml | 60 | Ptot (ml) | si terrain en pente ou argile ≠ non, et jamais avec un sous-sol (drainage compris) |
| N | Fondations & soubassement | Réseaux sous dallage posés et testés avant le coulage (évacuations, fourreaux) — compris dans la plomberie et l'électricité *(frais)* **(v1)** <br><sub>`fon-reseaux-sous-dallage-poses`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| N | Fondations & soubassement | Dalle sur terre-plein complète et isolée (hérisson, film, isolant RE2020, treillis, béton ≈ 12 cm) <br><sub>`fon-dalle-terre-plein-isolee`</sub> | m2 | 140 | E − 0,2 × P (surface intérieure des murs, m²) | si plancher bas = dalle (défaut) |
| N | Fondations & soubassement | Vide sanitaire complet (murs ≈ 80 cm, poutrelles et entrevous isolants, dalle de compression) <br><sub>`fon-vide-sanitaire-complet`</sub> | m2 | 180 | E − 0,2 × P | si plancher bas = vide sanitaire (à conseiller en pente, sol humide ou argile moyen/fort ; jamais présenté comme moins cher) |
| N | Fondations & soubassement | Sous-sol enterré (gros œuvre brut, ordre de grandeur) <br><sub>`fon-sous-sol-enterre`</sub> | m2 | 250 | E | si plancher bas = sous-sol |
| N | Fondations & soubassement | Dalle du garage sur terre-plein, non isolée (hérisson, film, treillis, béton) <br><sub>`fon-dalle-garage-non-isolee`</sub> | m2 | 112 | G (surface du garage) | si garage accolé |

### Murs & planchers

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| R | Maçonnerie | Monter un mur en parpaings <br><sub>`mac-monter-un-mur-en-parpaings`</sub> | m2 | 75 | murs ext. nets + refends porteurs (+ murs du garage, toujours en parpaing) | si murs = parpaing (défaut) ; murs du garage quel que soit le choix |
| R | Maçonnerie | Monter un mur en brique <br><sub>`mac-monter-un-mur-en-brique`</sub> | m2 | 90 | murs ext. nets + refends | si murs = brique |
| N | Maçonnerie | Murs extérieurs en brique monomur 30 à 37,5 cm (brique isolante, sans doublage obligatoire) <br><sub>`mac-mur-brique-monomur`</sub> | m2 | 125 | murs ext. nets + refends | si murs = monomur |
| N | Maçonnerie | Murs extérieurs en béton cellulaire 20 cm (à doubler d'un isolant intérieur) <br><sub>`mac-mur-beton-cellulaire-20-cm`</sub> | m2 | 114 | murs ext. nets + refends | si murs = béton cellulaire |
| N | Maçonnerie | Murs extérieurs en béton cellulaire 30 à 36,5 cm (mur isolant, sans doublage) <br><sub>`mac-mur-beton-cellulaire-30-cm`</sub> | m2 | 130 | murs ext. nets + refends | option (béton cellulaire isolant, sans doublage) |
| N | Maçonnerie | Murs en béton banché (voile coulé) : murs enterrés, sous-sol, garage enterré <br><sub>`mac-mur-beton-banche`</sub> | m2 | 140 | m² de voiles | option (murs enterrés, garage enterré) |
| N | Maçonnerie | Chaînage horizontal en béton armé (ceinture en haut des murs et le long des pignons) <br><sub>`mac-chainage-horizontal`</sub> | ml | 37 | P + rampants des pignons + 3 murs du garage + refend + P par plancher d'étage maçonné (ml) | si murs maçonnés |
| N | Maçonnerie | Raidisseur (poteau en béton armé dans le mur : angles, côtés des grandes baies) <br><sub>`mac-raidisseur-chainage-vertical`</sub> | u | 88 | angles × niveaux maçonnés + 2 par baie + 4 si garage (+ ⌈P/5⌉ × niveaux maçonnés en zone sismique ≥ 3) | si murs maçonnés |
| N | Maçonnerie | Linteau au-dessus d'une fenêtre ou d'une porte (béton armé ou prélinteau, jusqu'à ≈ 2,5 m) <br><sub>`mac-linteau-beton-arme`</sub> | u | 98 | fenêtres + portes-fenêtres + 2 × baies + porte d'entrée (+ 2 si garage : porte de garage et porte de communication ; + 2 portes intérieures porteuses à étage) | si murs maçonnés |
| N | Maçonnerie | Appui de fenêtre ou seuil de porte en béton préfabriqué (posé) <br><sub>`mac-appui-fenetre-seuil-prefabrique`</sub> | u | 81 | fenêtres + portes-fenêtres + 2 × baies + porte d'entrée | si murs maçonnés |
| R | Maçonnerie | Poutre de reprise de charge (béton armé) <br><sub>`mac-poutre-de-reprise-de-charge-beton-arme`</sub> | ml | 260 | ml | option : baie > 2,5 m, grande portée (selon BET) |
| R | Maçonnerie | Poteau de reprise (béton armé) <br><sub>`mac-poteau-de-reprise-beton-arme`</sub> | u | 450 | u | option (selon BET) |
| R | Maçonnerie | Plancher béton (étage créé) <br><sub>`mac-plancher-beton-etage-cree`</sub> | m2 | 120 | à étage : SH étage / 0,9 ; combles aménagés : SH rdc / 0,9 ; + plancher haut du sous-sol (E − 0,2 P) ; + dalle de toiture d'un toit plat (Etot) | si étage / combles en maçonnerie, sous-sol ou toit plat |
| N | Maçonnerie | Rupteurs de ponts thermiques ou planelles isolées en rive du plancher d'étage **(v1)** <br><sub>`mac-rupteurs-thermiques-plancher`</sub> | ml | 19,6 | P (ml) par plancher d'étage | si maison maçonnée à étage isolée par l'intérieur (parpaing, brique, béton cellulaire 20), pas en ITE |
| R | Maçonnerie | Escalier en béton <br><sub>`mac-escalier-en-beton`</sub> | u | 4 500 | 1 | si étage et escalier = béton |
| N | Charpente, couverture & structure bois | Murs extérieurs en ossature bois isolés (montants 145 mm, isolant, frein-vapeur, panneau de contreventement, pare-pluie et tasseaux) <br><sub>`toi-mur-ossature-bois-isole`</sub> | m2 | 148 | murs ext. nets | si murs = ossature bois |
| R | Charpente, couverture & structure bois | Mur en ossature bois <br><sub>`toi-mur-en-ossature-bois`</sub> | m2 | 90 | refends porteurs (L × 2,7) | si ossature bois à étage |
| R | Charpente, couverture & structure bois | Créer un plancher bois <br><sub>`toi-creer-un-plancher-bois`</sub> | m2 | 90 | comme le plancher béton | si étage et ossature bois |

### Clos & couvert

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| R | Charpente, couverture & structure bois | Charpente en fermettes (hors couverture) <br><sub>`toi-charpente-en-fermettes-hors-couverture`</sub> | m2 | 80 | T (m² de toiture) | si toit en pente et combles perdus (défaut) |
| R | Charpente, couverture & structure bois | Charpente traditionnelle (hors couverture) <br><sub>`toi-charpente-traditionnelle-hors-couverture`</sub> | m2 | 120 | T | si combles aménagés (ou choix « charpente traditionnelle ») |
| R | Charpente, couverture & structure bois | Fenêtre de toit (Velux) <br><sub>`toi-fenetre-de-toit-velux`</sub> | u | 1 200 | ⌈SH combles / 15⌉ | si combles aménagés |
| R | Charpente, couverture & structure bois | Raccords (faîtage, noues, solins) <br><sub>`toi-raccords-faitage-noues-solins`</sub> | ml | 40 | 4 pans : (L − l) + 4 arêtiers ; + noues : 2 (L), 4 (complexe) ; + solin du garage en appentis 4,4 ml (maison à étage avec garage) | si toit 4 pans, forme en L / complexe, ou garage accolé à une maison à étage |
| R | Charpente, couverture & structure bois | Toit plat (étanchéité) <br><sub>`toi-toit-plat-etancheite`</sub> | m2 | 80 | m² | option (étanchéité seule non isolée : garage, auvent) |
| N | Couverture & zinguerie | Couverture en tuiles terre cuite tout compris (écran sous-toiture, liteaux, tuiles, rives, faîtage ventilé) <br><sub>`cou-couverture-tuiles-terre-cuite`</sub> | m2 | 92 | T | si couverture = tuiles terre cuite (défaut) |
| N | Couverture & zinguerie | Couverture en tuiles béton tout compris (écran, liteaux, tuiles, rives, faîtage ventilé) <br><sub>`cou-couverture-tuiles-beton`</sub> | m2 | 65 | T | si couverture = tuiles béton |
| N | Couverture & zinguerie | Couverture en ardoise naturelle tout compris (écran, liteaux ou voliges, crochets, faîtage, rives) <br><sub>`cou-couverture-ardoise-naturelle`</sub> | m2 | 146 | T | si couverture = ardoise |
| N | Couverture & zinguerie | Couverture en ardoises fibres-ciment tout compris (écran, liteaux, crochets, accessoires) <br><sub>`cou-couverture-ardoise-fibres-ciment`</sub> | m2 | 107 | T | si couverture = ardoise fibres-ciment |
| N | Couverture & zinguerie | Couverture en bac acier anti-condensation (plaques, faîtage, rives, closoirs) <br><sub>`cou-couverture-bac-acier`</sub> | m2 | 66 | T | si couverture = bac acier |
| N | Couverture & zinguerie | Couverture zinc à joint debout sur voligeage (voliges, écran, zinc, faîtage, rives) <br><sub>`cou-couverture-zinc-joint-debout`</sub> | m2 | 170 | T | si couverture = zinc |
| N | Couverture & zinguerie | Toiture-terrasse isolée sur dalle béton (pare-vapeur, isolant, étanchéité, relevés) <br><sub>`cou-toiture-terrasse-isolee`</sub> | m2 | 140 | Etot | si toit = plat |
| N | Couverture & zinguerie | Couvertine d'acrotère en aluminium laqué (dessus des murets d'un toit plat) <br><sub>`cou-couvertine-acrotere`</sub> | ml | 45 | Ptot | si toit = plat |
| N | Couverture & zinguerie | Gouttière zinc posée (crochets, naissances, angles) <br><sub>`cou-gouttiere-zinc`</sub> | ml | 65 | longueur d'égout : 2 pans 0,565 × Ptot + 4 × 0,4 ; 4 pans Ptot + 8 × 0,4 | si toit en pente et gouttière = zinc (défaut actuel, arbitrage Dani) |
| N | Couverture & zinguerie | Gouttière PVC posée (crochets, naissances, angles) <br><sub>`cou-gouttiere-pvc`</sub> | ml | 34 | idem | si gouttière = PVC |
| N | Couverture & zinguerie | Gouttière aluminium laqué en continu (profilée sur place, sans raccord) <br><sub>`cou-gouttiere-alu-continu`</sub> | ml | 80 | idem | si gouttière = alu continu |
| N | Couverture & zinguerie | Descente d'eaux pluviales avec coudes et colliers <br><sub>`cou-descente-eaux-pluviales`</sub> | ml | 37 | nb descentes (max(2, ⌈égout / 11⌉)) × hauteur d'égout (3,0 / 5,7 / 4,0 m) ; la descente du garage d'une maison à étage compte 2,6 m | toujours |
| N | Couverture & zinguerie | Sous-face des débords de toit en PVC (lambris + profilés + ventilation) <br><sub>`cou-sous-face-pvc`</sub> | m2 | 43 | 0,45 × longueur d'égout (débord 0,40 m + retour) | si toit en pente |
| N | Couverture & zinguerie | Sous-face des débords de toit en lambris bois lasuré <br><sub>`cou-sous-face-bois`</sub> | m2 | 49 | idem | alternative à la sous-face PVC |
| R | Menuiseries exterieures | Fenêtres <br><sub>`mex-fenetres`</sub> | u | 950 | nFen (au moins SDB + WC + 1 cuisine + chambres sans porte-fenêtre) | toujours |
| R | Menuiseries exterieures | Portes-fenêtres <br><sub>`mex-portes-fenetres`</sub> | u | 1 250 | nPF | toujours |
| R | Menuiseries exterieures | Baie vitrée <br><sub>`mex-baie-vitree`</sub> | u | 2 200 | nBaie | toujours |
| R | Menuiseries exterieures | Porte d'entrée <br><sub>`mex-porte-d-entree`</sub> | u | 1 600 | 1 | toujours |
| R | Menuiseries exterieures | Porte de garage <br><sub>`mex-porte-de-garage`</sub> | u | 1 200 | 1 | si garage |
| R | Menuiseries exterieures | Volets roulants <br><sub>`mex-volets-roulants`</sub> | u | 650 | nFen + nPF + nBaie − (SDB + WC) | toujours (défaut motorisés) |
| R | Menuiseries exterieures | Volets battants <br><sub>`mex-volets-battants`</sub> | u | 600 | idem | alternative aux volets roulants |
| R | Menuiseries exterieures | Stores extérieurs / brise-soleil <br><sub>`mex-stores-exterieurs-brise-soleil`</sub> | u | 1 000 | u | option |
| R | Menuiseries exterieures | Moustiquaires <br><sub>`mex-moustiquaires`</sub> | u | 200 | u | option |

### Réseaux & façade

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| N | Réseaux enterrés (VRD) | Tranchée pour réseaux enterrés (ouverture, lit de sable, grillage avertisseur, rebouchage) <br><sub>`vrd-tranchee-reseaux`</sub> | ml | 25 | D (réseaux secs) + D eaux usées (12 m si fosse) + 0,5 × Ptot (pluvial autour) + 10 m vers le puits (ou D vers le réseau) | toujours |
| N | Réseaux enterrés (VRD) | Fourreaux d'arrivée électricité, eau et fibre (3 gaines + grillages avertisseurs) <br><sub>`vrd-fourreaux-arrivees`</sub> | ml | 15 | D | toujours |
| N | Réseaux enterrés (VRD) | Tube d'eau potable PEHD Ø 25 du compteur à la maison, tiré dans le fourreau (raccords non compris) **(v1)** <br><sub>`vrd-tube-pehd-eau-potable`</sub> | ml | 4,41 | D (ml) | toujours |
| N | Réseaux enterrés (VRD) | Canalisation PVC enterrée (eaux usées vers l'égout ou la fosse, eaux de pluie vers le puits) <br><sub>`vrd-canalisation-pvc-enterree`</sub> | ml | 30 | eaux usées (D ou 12) + 0,5 × Ptot + 10 (ou D) | toujours |
| N | Réseaux enterrés (VRD) | Regard de visite ou de branchement avec tampon <br><sub>`vrd-regard-de-visite`</sub> | u | 150 | nb descentes + 2 en tout-à-l'égout (regard en limite compris dans le forfait) ; nb descentes + 3 en assainissement individuel | toujours |
| N | Réseaux enterrés (VRD) | Puits d'infiltration des eaux de pluie (buses, gravier, géotextile, tampon) <br><sub>`vrd-puits-infiltration`</sub> | u | 1 500 | 1 (2 si toiture projetée > 160 m²) | si eaux pluviales = infiltration (défaut) |
| R | Raccordements aux réseaux | Raccordement électrique (Enedis) <br><sub>`rac-raccordement-electrique-enedis`</sub> | forfait | 2 000 | 1 forfait | toujours (variante lotissement « coffret déjà posé » : décision Dani) |
| N | Raccordements aux réseaux | Extension du réseau électrique Enedis jusqu'au terrain — part fixe <br><sub>`rac-extension-reseau-electrique-part-fixe`</sub> | forfait | 1 658 | 1 forfait | si terrain non viabilisé (réseau pas devant le terrain) |
| N | Raccordements aux réseaux | Extension du réseau électrique Enedis — par mètre de réseau à créer <br><sub>`rac-extension-reseau-electrique-au-metre`</sub> | ml | 68,4 | D − 15 m (ml) | si terrain non viabilisé |
| R | Raccordements aux réseaux | Raccordement au tout-à-l'égout <br><sub>`rac-raccordement-au-tout-a-l-egout`</sub> | forfait | 2 500 | 1 forfait | si assainissement = tout-à-l'égout (défaut) |
| R | Raccordements aux réseaux | Assainissement — fosse toutes eaux (5 EH) <br><sub>`rac-assainissement-fosse-toutes-eaux-5-eh`</sub> | forfait | 8 400 | 1 forfait | si assainissement = fosse |
| R | Raccordements aux réseaux | Assainissement — micro-station (5 EH) <br><sub>`rac-assainissement-micro-station-5-eh`</sub> | forfait | 12 000 | 1 forfait | si assainissement = micro-station |
| N | Façade | Échafaudage de façade (montage, location pendant l'enduit, démontage) <br><sub>`fac-echafaudage-de-facade`</sub> | m2 | 12 | plain-pied : surface des pignons ; à étage / combles : façade brute = P × hauteur d'égout + pignons + garage | toujours si > 0 (sauf si le façadier l'inclut) |
| R | Façade | Enduit monocouche (machine) <br><sub>`fac-enduit-monocouche-machine`</sub> | m2 | 28 | façade nette (façade brute − baies, portes-fenêtres, porte, porte de garage) | si façade = enduit (défaut en maçonnerie) |
| R | Façade | Bardage <br><sub>`fac-bardage`</sub> | m2 | 90 | façade nette | si façade = bardage bois (défaut en ossature bois) |
| N | Façade | Bardage composite sur ossature avec pare-pluie <br><sub>`fac-bardage-composite`</sub> | m2 | 161 | façade nette | si façade = bardage composite |
| R | Façade | Isolation par l'extérieur (ITE) <br><sub>`fac-isolation-par-l-exterieur-ite`</sub> | m2 | 140 | façade nette | option (remplace enduit + doublage intérieur) |

### Second œuvre

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| N | Electricite | Installation électrique complète d'une maison neuve (norme NF C 15-100) <br><sub>`ele-installation-electrique-maison-neuve`</sub> | m2 | 100 | SH | toujours |
| R | Electricite | Spots encastrés (LED) <br><sub>`ele-spots-encastres-led`</sub> | u | 45 | u | option |
| R | Electricite | Visiophone / interphone <br><sub>`ele-visiophone-interphone`</sub> | forfait | 600 | 1 | option |
| R | Electricite | Alarme / vidéosurveillance <br><sub>`ele-alarme-videosurveillance`</sub> | forfait | 900 | 1 | option |
| R | Electricite | Borne de recharge voiture <br><sub>`ele-borne-de-recharge-voiture`</sub> | u | 1 400 | 1 | option (pré-équipement obligatoire seulement en collectif) |
| N | Plomberie | Plomberie d'une maison neuve : réseaux d'eau froide, eau chaude et évacuations (sans les appareils) <br><sub>`plo-reseaux-plomberie-maison-neuve`</sub> | m2 | 54 | SH | toujours |
| R | Plomberie | Chauffe-eau thermodynamique <br><sub>`plo-chauffe-eau-thermodynamique`</sub> | u | 3 200 | 1 (variante petit 200 L ; grand si ≥ 4 chambres) | toujours (sauf PAC double service) |
| R | Plomberie | Chauffe-eau électrique (cumulus) <br><sub>`plo-chauffe-eau-electrique-cumulus`</sub> | u | 950 | 1 | option (passe rarement la RE2020) |
| R | Chauffage / VMC | Pompe à chaleur (air/eau) <br><sub>`cha-pompe-a-chaleur-air-eau`</sub> | forfait | 11 000 | 1 | si chauffage = PAC air/eau (défaut) |
| N | Chauffage / VMC | Plancher chauffant à eau (isolant à plots, tubes, collecteur) — hors chape <br><sub>`cha-plancher-chauffant-eau-hors-chape`</sub> | m2 | 58 | SH | si chauffage = PAC air/eau |
| R | Chauffage / VMC | Thermostat / pilotage **(v1)** <br><sub>`cha-thermostat-pilotage`</sub> | u | 250 | zones (chambres + 1) | option (régulation pièce par pièce du plancher chauffant, si l'installateur ne la comprend pas) |
| R | Chauffage / VMC | Climatisation gainable (réversible) <br><sub>`cha-climatisation-gainable-reversible`</sub> | forfait | 8 000 | 1 (variante selon SH) | si chauffage = PAC air/air gainable |
| R | Chauffage / VMC | Climatisation réversible (split) <br><sub>`cha-climatisation-reversible-split`</sub> | u | 2 400 | u | option |
| R | Chauffage / VMC | Poêle à bois / granulés <br><sub>`cha-poele-a-bois-granules`</sub> | u | 4 000 | 1 | si chauffage = poêle + radiateurs |
| N | Chauffage / VMC | Conduit de fumée isolé double paroi pour poêle (traversées, sortie et étanchéité de toit) <br><sub>`cha-conduit-de-fumee-isole`</sub> | ml | 260 | 6 ml plain-pied, 8,5 ml à étage | si poêle |
| R | Chauffage / VMC | Radiateurs électriques <br><sub>`cha-radiateurs-electriques`</sub> | u | 500 | nb chambres | si chauffage = poêle (chambres) |
| R | Chauffage / VMC | Sèche-serviette <br><sub>`cha-seche-serviette`</sub> | u | 245 | SDB | toujours |
| R | Chauffage / VMC | Ventilation (VMC) <br><sub>`cha-ventilation-vmc`</sub> | u | 800 | 1 (variante simple / double flux) | toujours |
| N | Isolation | Doublage isolant collé des murs extérieurs (plaque de plâtre + polyuréthane, R ≥ 3,7) <br><sub>`iso-doublage-isolant-colle`</sub> | m2 | 52 | doublage = Pint × 2,5 × niveaux − ouvertures (combles : Pint × 3,5 + 0,9 × pignons − ouvertures) | si murs = parpaing, brique ou béton cellulaire 20 |
| R | Isolation | Isolation des murs par l'intérieur <br><sub>`iso-isolation-des-murs-par-l-interieur`</sub> | m2 | 55 | idem | alternative au doublage collé (sur ossature métallique) |
| R | Isolation | Pose d'un pare-vapeur <br><sub>`iso-pose-d-un-pare-vapeur`</sub> | m2 | 8 | plafond sous combles perdus × 1,03 | si combles perdus |
| R | Isolation | Isolation des combles aménagés (rampants) <br><sub>`iso-isolation-des-combles-amenages-rampants`</sub> | m2 | 65 | 0,75 × T | si combles aménagés |
| N | Isolation | Isolant sous chape (panneaux polyuréthane posés sur la dalle, R ≥ 3) <br><sub>`iso-isolant-sous-chape`</sub> | m2 | 35 | SH rdc | jamais avec la dalle isolée ou le vide sanitaire ; coché avec le radier ; option sur sous-sol |
| N | Contrôles & réception | Test d'étanchéité à l'air intermédiaire (avant la pose des plaques) <br><sub>`rec-test-etancheite-intermediaire`</sub> | forfait | 270 | 1 | toujours (conseillé), avant les plaques de plafond et les cloisons |
| R | Cloisons / Platrerie | Faux plafond <br><sub>`clo-faux-plafond`</sub> | m2 | 47 | plafonds = (SH − SH combles) × 1,03 + SH combles × 0,3 | toujours |
| R | Cloisons / Platrerie | Monter une cloison <br><sub>`clo-monter-une-cloison`</sub> | m2 | 50 | 0,8 × SH − cloisons hydrofuges | toujours |
| R | Cloisons / Platrerie | Cloison pièce humide (hydrofuge) <br><sub>`clo-cloison-piece-humide-hydrofuge`</sub> | m2 | 55 | 12 m² × SDB | toujours |
| R | Cloisons / Platrerie | Doubler un mur <br><sub>`clo-doubler-un-mur`</sub> | m2 | 40 | doublage (ossature bois) + 2 × refend porteur (L × 2,70 m, 2 faces) | si murs = ossature bois, et pour les 2 faces du refend de toute maison à étage |
| R | Cloisons / Platrerie | Cacher tuyaux / gaines (coffrage) **(v1)** <br><sub>`clo-cacher-tuyaux-gaines-coffrage`</sub> | ml | 25 | 2 × 2,70 ml (gaine technique) | si étage ou combles aménagés |
| R | Cloisons / Platrerie | Trappe de visite <br><sub>`clo-trappe-de-visite`</sub> | u | 80 | 1 | si combles perdus |
| N | Annexes de chantier | Deuxième benne pour le second œuvre (chutes de plaques, emballages, isolants) **(v1)** <br><sub>`anx-benne-second-oeuvre`</sub> | forfait | 400 | 1 forfait | toujours (décocher si chaque artisan évacue ses déchets) |
| R | Isolation | Isolation des combles perdus (soufflage) <br><sub>`iso-isolation-des-combles-perdus-soufflage`</sub> | m2 | 25 | plafond sous combles perdus × 1,03 | si combles perdus |
| R | Maçonnerie | Chape liquide <br><sub>`mac-chape-liquide`</sub> | m2 | 40 | SH | si plancher chauffant |
| R | Maçonnerie | Chape traditionnelle <br><sub>`mac-chape-traditionnelle`</sub> | m2 | 33 | SH | si pas de plancher chauffant |

### Finitions & équipements

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| R | Carrelage / Revetements | Carrelage au sol <br><sub>`rev-carrelage-au-sol`</sub> | m2 | 70 | 0,6 × SH | toujours |
| R | Carrelage / Revetements | Faïence / carrelage mural <br><sub>`rev-faience-carrelage-mural`</sub> | m2 | 70 | 12 m² × SDB | toujours |
| R | Carrelage / Revetements | Étanchéité sous carrelage (SPEC douche) <br><sub>`rev-etancheite-sous-carrelage-spec-douche`</sub> | m2 | 40 | 6,5 m² × SDB | toujours |
| R | Carrelage / Revetements | Béton ciré / résine <br><sub>`rev-beton-cire-resine`</sub> | m2 | 110 | m² | option |
| N | Peinture | Peinture des murs sur plaques neuves (impression + 2 couches) <br><sub>`pei-peinture-murs-plaques-neuves`</sub> | m2 | 26,1 | doublage (tous types de murs, monomur et ossature compris) + 2 × refend + 2 × cloisons − faïence − 3,4 m² par porte intérieure | toujours |
| N | Peinture | Peinture des plafonds sur plaques neuves (impression + 2 couches) <br><sub>`pei-peinture-plafonds-plaques-neuves`</sub> | m2 | 30,1 | plafonds + rampants | toujours |
| R | Carrelage / Revetements | Sol stratifié (imitation bois) <br><sub>`rev-sol-stratifie-imitation-bois`</sub> | m2 | 50 | 0,4 × SH (chambres) | toujours |
| R | Carrelage / Revetements | Parquet bois <br><sub>`rev-parquet-bois`</sub> | m2 | 90 | 0,4 × SH | alternative au stratifié |
| R | Carrelage / Revetements | Sol souple (PVC, lino) <br><sub>`rev-sol-souple-pvc-lino`</sub> | m2 | 45 | 0,4 × SH | alternative au stratifié |
| R | Carrelage / Revetements | Moquette <br><sub>`rev-moquette`</sub> | m2 | 35 | m² | option |
| R | Carrelage / Revetements | Plinthes <br><sub>`rev-plinthes`</sub> | ml | 13 | 4 × √(SH × pièces) (pièces = chambres + 3) | toujours |
| R | Menuiseries interieures | Porte intérieure battante <br><sub>`min-porte-interieure-battante`</sub> | u | 320 | chambres + SDB + WC + 1 | toujours |
| R | Menuiseries interieures | Porte intérieure coulissante <br><sub>`min-porte-interieure-coulissante`</sub> | u | 700 | u | option |
| R | Menuiseries interieures | Porte intérieure âme pleine **(v1)** <br><sub>`min-porte-interieure-ame-pleine`</sub> | u | 450 | 1 | si garage accolé (porte entre le garage et la maison ; prix plancher, une vraie porte isolante peut coûter plus) |
| R | Menuiseries interieures | Placards & rangements <br><sub>`min-placards-rangements`</sub> | ml | 500 | ml | option |
| R | Menuiseries interieures | Dressing sur mesure <br><sub>`min-dressing-sur-mesure`</sub> | ml | 750 | ml | option |
| R | Menuiseries interieures | Verrière intérieure <br><sub>`min-verriere-interieure`</sub> | m2 | 700 | m² | option |
| N | Menuiseries interieures | Escalier intérieur en bois quart tournant, sur mesure, posé avec sa rampe <br><sub>`min-escalier-bois-quart-tournant`</sub> | u | 4 338 | 1 | si étage et escalier = bois (défaut) |
| R | Charpente, couverture & structure bois | Garde-corps <br><sub>`toi-garde-corps`</sub> | ml | 180 | 3 ml (trémie d'escalier) | si étage / combles aménagés (posé en finitions) |
| R | Charpente, couverture & structure bois | Escalier en bois <br><sub>`toi-escalier-en-bois`</sub> | u | 2 500 | 1 | option (escalier droit en kit, alternative au quart tournant) |
| R | Plomberie | WC <br><sub>`plo-wc`</sub> | u | 410 | WC | toujours |
| R | Plomberie | Meuble-vasque <br><sub>`plo-meuble-vasque`</sub> | u | 433 | SDB | toujours |
| R | Plomberie | Robinetterie lavabo <br><sub>`plo-robinetterie-lavabo`</sub> | u | 160 | SDB | toujours |
| R | Plomberie | Bac de douche <br><sub>`plo-bac-de-douche`</sub> | u | 400 | SDB | toujours |
| R | Plomberie | Paroi de douche <br><sub>`plo-paroi-de-douche`</sub> | u | 380 | SDB | toujours |
| R | Plomberie | Colonne de douche <br><sub>`plo-colonne-de-douche`</sub> | u | 300 | SDB | toujours |
| R | Plomberie | Douche à l'italienne <br><sub>`plo-douche-a-l-italienne`</sub> | u | 1 090 | u | alternative au bac (déconseillée sur chape anhydrite) |
| R | Plomberie | Installer une baignoire <br><sub>`plo-installer-une-baignoire`</sub> | u | 960 | u | option |
| R | Plomberie | Robinetterie baignoire <br><sub>`plo-robinetterie-baignoire`</sub> | u | 260 | u | avec la baignoire |
| R | Plomberie | Miroir <br><sub>`plo-miroir`</sub> | u | 176 | SDB | option |
| R | Plomberie | Installer un adoucisseur d'eau <br><sub>`plo-installer-un-adoucisseur-d-eau`</sub> | u | 1 500 | 1 | option |
| R | Cuisine | Cuisine complète neuve — tout compris <br><sub>`cui-cuisine-complete-neuve-tout-compris`</sub> | ml | 2 000 | max(2,5 ; SH / 28) ml | si cuisine équipée = oui (défaut) |
| R | Cuisine | Meubles de cuisine <br><sub>`cui-meubles-de-cuisine`</sub> | ml | 900 | ml | alternative détaillée à la cuisine tout compris |
| R | Cuisine | Plan de travail seul <br><sub>`cui-plan-de-travail-seul`</sub> | ml | 150 | ml | alternative détaillée |
| R | Cuisine | Évier + robinetterie <br><sub>`cui-evier-robinetterie`</sub> | u | 450 | 1 | alternative détaillée |
| R | Cuisine | Hotte <br><sub>`cui-hotte`</sub> | u | 400 | 1 | alternative détaillée |
| R | Cuisine | Îlot central <br><sub>`cui-ilot-central`</sub> | u | 2 500 | 1 | option |

### Réception & achèvement

| | Lot | Poste | Unité | fp base HT | Quantité automatique | Coché par défaut |
|---|---|---|---|---:|---|---|
| R | Electricite | Consuel (attestation de conformité) <br><sub>`ele-consuel-attestation-de-conformite`</sub> | forfait | 180 | 1 | toujours (en fin de chantier, avant la mise en service du compteur) |
| N | Contrôles & réception | Contrôles RE2020 de fin de chantier : test d'étanchéité à l'air + contrôle de la ventilation + attestation RE2020 <br><sub>`rec-controles-re2020-fin-de-chantier`</sub> | forfait | 650 | 1 forfait | toujours |
| N | Contrôles & réception | Attestation « argile » (retrait-gonflement) à joindre à la déclaration d'achèvement **(v1)** <br><sub>`rec-attestation-argile-daact`</sub> | forfait | 292 | 1 forfait | si argile moyen ou fort |
| N | Contrôles & réception | Attestations parasismiques (au dépôt du permis + à l'achèvement) **(v1)** <br><sub>`rec-attestations-parasismiques`</sub> | forfait | 433 | 1 forfait | si zone sismique ≥ 3 (zone 5 : sur devis) |
| N | Contrôles & réception | Réception des travaux avec chaque artisan (procès-verbal, réserves) — démarche gratuite *(frais)* <br><sub>`rec-proces-verbal-de-reception`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| N | Contrôles & réception | Déclaration d'achèvement et de conformité des travaux en mairie (DAACT) — démarche gratuite *(frais)* <br><sub>`rec-declaration-achevement-daact`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |
| R | Annexes de chantier | Nettoyage de fin de chantier <br><sub>`anx-nettoyage-de-fin-de-chantier`</sub> | m2 | 10 | SH + G | toujours |
| N | Taxes & participations | Taxe d'aménagement + redevance d'archéologie — 100 premiers m² (résidence principale) *(frais)* <br><sub>`tax-taxe-amenagement-100-premiers-m2`</sub> | m2 | 26,31 | min(ST, 100) avec ST = SP + G, variante zone IDF / hors IDF | toujours |
| N | Taxes & participations | Taxe d'aménagement + redevance d'archéologie — m² au-delà de 100 *(frais)* <br><sub>`tax-taxe-amenagement-au-dela-100-m2`</sub> | m2 | 52,63 | ST − 100 | si ST > 100 m² |
| N | Taxes & participations | Taxe d'aménagement + redevance d'archéologie — places de stationnement extérieures *(frais)* <br><sub>`tax-taxe-amenagement-stationnement`</sub> | u | 172,75 | places extérieures (2 sans garage, 1 avec), variante zone IDF | toujours (le PLU impose des places) |
| N | Taxes & participations | Participation pour le raccordement au tout-à-l'égout (PFAC) *(frais)* <br><sub>`tax-pfac-participation-tout-a-l-egout`</sub> | forfait | 2 000 | 1 forfait | si tout-à-l'égout |
| N | Taxes & participations | Redevances du SPANC : contrôle de conception + contrôle de bonne exécution (assainissement individuel) *(frais)* **(v1)** <br><sub>`tax-redevances-spanc-controles`</sub> | forfait | 270 | 1 forfait | si assainissement individuel (fosse ou micro-station) |
| N | Taxes & participations | Déclaration des éléments d'imposition sur impots.gouv (« Gérer mes biens immobiliers ») dans les 90 jours après l'achèvement (démarche gratuite) *(frais)* **(v1)** <br><sub>`tax-declaration-elements-imposition`</sub> | forfait | 0 | 1 (0 €, jalon) | toujours |


---

## e. Mode rapide du neuf

**5 questions + 2 facultatives :** surface habitable ; plain-pied ou à étage ; code postal ; finition ; qui réalise ; *(facultatif)* garage accolé ; *(facultatif)* tout-à-l'égout / fosse. On réutilise le **même** `regles()` avec les défauts ci-dessous : mêmes chiffres en rapide et en détaillé (principe de `presetRapide`).

| Réponse dérivée | Valeur par défaut en rapide | Raison |
|---|---|---|
| Niveaux | réponse 2 (par défaut plain-pied ≤ 110 m², étage au-delà) | |
| Forme | simple | « en L » ≈ +3 % |
| Chambres | round(SH / 30), min 2, max 5 | **[raisonnement]** |
| SDB / WC | SH > 110 ⇒ 2 / 2, sinon 1 / 1 | identique à `presetRapide` |
| Garage | réponse 6 (non par défaut ; si oui 20 m²) | |
| Plancher bas | dalle sur terre-plein | terrain supposé plat |
| Murs | parpaing | |
| Toiture / couverture / gouttières | 2 pans, tuiles terre cuite, 35°, zinc | arbitrages Dani en cours (tuile béton, PVC, pente du Sud) |
| Façade | enduit monocouche | |
| Chauffage | PAC air/eau + plancher chauffant, VMC simple flux, CET | combinaison RE2020 la plus courante |
| Escalier | bois quart tournant | |
| Eaux usées / eaux de pluie | réponse 7 (tout-à-l'égout) / infiltration | |
| Terrain | plat, sol non argileux, zone sismique 1-2, viabilisé, hors lotissement, borné, réseaux à 15 m | afficher l'avertissement « hors étude de sol » et la fourchette haute argile |
| Pilotage | particulier (lots séparés) | |
| Cuisine | oui, SH / 28 ml | identique à `presetRapide` |
| Aléas | **10 % proposé** (7 % en rénovation) | Crédit Agricole 10-15 % ; deux jurys le recommandent ; décision Dani |

Résultat attendu, en standard et tout fait faire, avec les prix v1 (voir `calibrage-v1.md`) : **≈ 2 050 – 2 300 € TTC/m² pour la construction seule** et **≈ 2 500 – 2 800 € TTC/m² tout compris** (études, DO, taxes, branchements, aléas 10 %).

---

## f. Postes de la rénovation qui n'ont aucun sens en neuf (jamais repris)

| Lot rénovation | Postes jamais repris | Pourquoi |
|---|---|---|
| Etudes / Conception | Relevé + plans de l'existant · Plans du projet · Métré & quantitatifs · Diagnostics obligatoires (amiante, plomb, élec) · Diagnostic énergétique (DPE) · Démarches en mairie (DP / permis) · Étude de structure · Dossier d'aides (MaPrimeRénov', CEE) | remplacés par plan topo, G2, RE2020, permis, étude béton armé |
| Annexes de chantier | Sécurité du chantier | comprise dans l'installation de chantier |
| Location de matériel | Marteau-piqueur / brise-béton · Ponceuse (parquet / placo) · Aspirateur de chantier · Découpeur / scie (carrelage, béton) · Compresseur · Groupe électrogène · Déshumidificateur / chauffage chantier · Camion benne / utilitaire | matériel de démolition ; depuis N1, le neuf reprend aussi par `ref` les 7 autres (ponceuse, aspirateur, découpeur, compresseur, groupe électrogène, déshumidificateur, camion benne), pour les ajouts faits à la main |
| Démolition | tout le lot | rien à démolir sur un terrain nu |
| Maçonnerie | Ouvrir un mur porteur (petite / grande) · Poutres et poteaux de reprise (IPN, lamellé-collé, acier) · Créer un appui de fenêtre · Créer un seuil de porte · Couler une dalle béton · Consolider fondations / reprise en sous-œuvre · Monter un mur en pierre · Créer / enlever une cheminée en dur | interventions sur l'existant |
| Charpente, couverture & structure bois | Toiture complète tuile / ardoise · Dépose complète de toiture · Couverture tuiles / ardoise sur support existant · Réfection couverture · Couverture zinc / bac acier · Sous-toiture · Traiter la charpente · Gouttières & descentes · Nettoyer / démousser | remplacés par charpente + couverture neuve tout compris + zinguerie |
| Façade | Ravalement pierre · Nettoyer la façade · Rejointoiement · Enduit à la chaux · Peindre la façade · Imperméabilisant · ITE sous bardage · Éléments décoratifs | ravalement de l'existant ; monocouche teinté dans la masse |
| Isolation | Isolation du sol / plancher bas | comprise dans la dalle / le vide sanitaire neufs |
| Cloisons / Platrerie | Ratissage léger · Ratissage lourd | plaques neuves, sans ratissage. « Finitions plâtrerie (bandes, enduit) » n'est plus exclue : depuis la décision D5 de Dani, c'est une ligne à part, comme en rénovation (`journal-corrections.md` § 8) |
| Electricite | Rénovation électrique complète · Changer / mettre aux normes le tableau · Ajouter / déplacer une prise, un interrupteur, un point lumineux | dans l'installation neuve au m² |
| Plomberie | Refaire toute la plomberie · Créer / déplacer un point d'eau · Cabine complète · Chauffe-eau électrique instantané | attentes comprises dans le réseau neuf ; instantané non conforme RE2020 seul |
| Chauffage / VMC | Chaudière gaz à condensation · Plancher chauffant (rénovation) · Désembouage | gaz seul exclu par la RE2020 ; plancher chauffant neuf à part |
| Carrelage / Revetements | Préparation du sol (ragréage) · Ponçage + vitrification parquet | chape neuve plane |
| Peinture | Retirer le papier peint · Préparation des surfaces · Sous-couche · Peintures « rénovation » (murs, plafonds, boiseries) · Lasure · Peinture anti-humidité · Enduit décoratif | remplacées par la peinture sur plaques neuves |
| Cuisine | Rafraîchir une cuisine · Raccordements (eau, élec, évac) | compris dans les réseaux neufs |

Postes rénovation **valables en neuf mais non repris** (ajout possible en `{ref}` sans doublon) : portails battant / coulissant (extérieurs, hors périmètre) ; prise RJ45 et coffret VDI (déjà dans l'installation neuve) ; maison connectée ; cloison et isolation phoniques ; plafond décoratif ; caisson à galandage ; meuble sur mesure ; habillages & moulures ; crédence seule ; plan de travail et vasque de SDB ; seuils / barres de seuil ; papier peint ; grilles de sécurité.

**Repris en v1** (ils étaient dans les listes ci-dessus dans le brouillon) : « Cacher tuyaux / gaines (coffrage) » pour la gaine technique d'une maison à étage ; « Thermostat / pilotage » en option de régulation du plancher chauffant ; « Porte intérieure âme pleine » pour la porte entre le garage et la maison.

---

## g. Doublons à éviter et conflits entre postes

Chaque ligne est un **groupe exclusif** (un seul poste à la fois) ou une **inclusion** (A comprend déjà B). Le moteur les traite comme des variantes exclusives : cocher l'un décoche l'autre, avec un message.

| Conflit | Règle |
|---|---|
| **Semelle de fondation** (complète) ⟂ Fouilles en rigole + Béton de propreté + Semelle béton armé seul | La semelle complète comprend fouille, propreté, armatures, béton. |
| **Radier général** ⟂ Semelles + Dalle / Vide sanitaire | Le radier remplace les deux, mais **n'est pas isolé** : il coche « Isolant sous chape ». |
| **Plancher bas** : Dalle terre-plein isolée ⟂ Vide sanitaire complet ⟂ Sous-sol | Un seul. Le vide sanitaire comprend ses murs (≈ 80 cm), l'arase et l'isolant. |
| **Sous-sol** ⊃ excavation, drain, étanchéité, dallage | Avec un sous-sol : **ni** drain périphérique, **ni** fouilles en pleine masse, **ni** évacuation du volume excavé (à ajouter seulement si le devis l'exclut). |
| **Mur de soubassement** ⊃ Arase étanche | L'arase seule ne sert que si le soubassement est chiffré avec le poste générique « parpaings ». |
| **Surcoût sol argileux** ≠ choix du plancher bas | Le forfait couvre semelles plus profondes, longrines, chaînages ; le vide sanitaire reste un poste à part. |
| **Dalle isolée / vide sanitaire** ⊃ Isolant sous chape | Isolant sous chape seulement sur radier, dalle non isolée ou sous-sol. |
| **Dalle isolée + plancher chauffant** | Pas de doublon chiffrable : l'isolant de la dalle est celui de l'enveloppe, le panneau du plancher chauffant est exigé par le DTU 65.14. La variante « dalle non isolée + isolant sous chape » coûte plus cher aux prix du catalogue (≈ 199 € contre 195 €/m²) ; une variante « plancher chauffant sur panneau R 3,7 » n'a pas de prix sourcé (décision Dani). |
| **Murs** : parpaing ⟂ brique ⟂ monomur ⟂ béton cellulaire ⟂ ossature bois | Un seul système (le garage reste en parpaing). |
| **Ossature bois** ⊃ chaînages, raidisseurs, linteaux, appuis ; **mur ossature** ⊃ frein-vapeur, pare-pluie et tasseaux | Le bardage se pose sur les tasseaux du mur : ne pas recompter pare-pluie et tasseaux. Le bardage bois repris est déjà 12 % sous le marché (lames posées) ; pour le composite sur ossature bois, demander un prix « lames + fixations » (≈ 7 à 12 €/m² de moins). |
| **Monomur / béton cellulaire 30** ⟂ Doublage isolant | Pas de doublage, mais un enduit plâtre intérieur (non chiffré) et la peinture de ces murs. |
| **Doublage collé** ⟂ Isolation des murs par l'intérieur ⟂ Doubler un mur | Un seul parement par mur extérieur. « Doubler un mur » sert au parement intérieur de l'ossature bois **et aux deux faces du refend porteur**. |
| **Plaques (doublage, cloisons, plafonds)** + bandes à joints | Depuis la décision D5 de Dani : les bandes et l'enduit sont une ligne à part, « Finitions plâtrerie (bandes, enduit) », comme en rénovation ; sa quantité suit les m² de plaques cochées (`journal-corrections.md` § 8). |
| **Plancher d'étage** ⊅ chaînage | Le chaînage au niveau du plancher (P) et celui du refend s'ajoutent au plancher (composition CYPE, devis Batisigne). |
| **Charpente fermettes** ⟂ **charpente traditionnelle** | Fermettes = combles perdus ; combles aménagés = traditionnelle. |
| **Couverture neuve tout compris** ⊃ écran, liteaux, rives, faîtage d'un 2 pans | « Raccords » seulement pour 4 pans, L, noues et solin de garage. Ne jamais reprendre les postes rénovation de couverture. |
| **Toiture-terrasse isolée** ⟂ Toit plat (étanchéité seule) | La seconde pour un garage ou un auvent non chauffé. La toiture-terrasse exige la **dalle de toiture** (plancher béton sur Etot). |
| **Gouttière** zinc ⟂ PVC ⟂ alu continu ; **Sous-face** PVC ⟂ bois | Une seule de chaque. La sous-face ne comprend pas la planche de rive. |
| **Enduit monocouche** ⟂ Bardage ⟂ ITE ; pas de peinture de façade | L'ITE remplace enduit + doublage intérieur (et les rupteurs). |
| **Échafaudage de façade** | À retirer si le devis du façadier l'inclut. |
| **Installation électrique neuve** ⊃ tableau, VDI, RJ45, fibre, liaison des masses ; ⊅ VMC, câble depuis le coffret en limite | Ne jamais ajouter « Rénovation électrique », « Changer le tableau », « Coffret VDI », « Ajouter une prise ». La **boucle de terre** en fond de fouille est au gros œuvre (`ele-mise-a-la-terre`), une seule fois. |
| **Plomberie neuve** ⊃ évacuations sous dallage, ventilation primaire et sa sortie de toit, attentes, robinet extérieur | Si le maçon chiffre les évacuations sous dallage, retirer ≈ 15-20 €/m² du poste plomberie. La VMC comprend son rejet en toiture ; le poêle, sa sortie dans le conduit. |
| **PAC double service** ⟂ Chauffe-eau thermodynamique | Un seul producteur d'eau chaude. |
| **Plancher chauffant neuf (hors chape)** ⟂ « Plancher chauffant » rénovation ; ⊅ régulation | La chape est à part ; la régulation pièce par pièce est l'option « Thermostat / pilotage ». |
| **Chape liquide** ⟂ Chape traditionnelle | Liquide sous plancher chauffant, traditionnelle sinon. |
| **Étude thermique** + **Contrôles RE2020 de fin** ⟂ pack global d'un même bureau d'études | Si le pack global est pris (≈ 750-1 215 € HT), il remplace les deux postes. Ne pas recompter l'attestation n° 2. Le test intermédiaire reste à part. |
| **Cuisine tout compris** ⟂ Meubles + plan + évier + hotte | L'un ou le détail. |
| **Dossier de permis** (dessinateur SP ≤ 150 m² ⟂ architecte SP > 150 m²) ⟂ **Maîtrise d'œuvre complète** | La mission complète remplace le dossier de permis. |
| **Étude de sol G1** ⟂ G2 | La G1 est due par le vendeur en zone argile ; inutile si on commande la G2. |
| **Étude béton armé** | À retirer si le maçon ou le fournisseur de plancher l'inclut. |
| **Raccordement Enedis** ⊅ tranchée, fourreau, câble jusqu'au tableau, niche de coffret | Tranchée et fourreau sont dans les VRD ; câble et niche ne sont pas chiffrés. |
| **Raccordement égout** (forfait) = partie publique + regard en limite ; **VRD** = partie privée | Le regard en limite n'est pas recompté (regards = descentes + 2). L'écart de prix du forfait (2 500 contre 2 214-2 238 € de grilles publiques) est une décision Dani. |
| **Raccordement égout** (travaux) ≠ **PFAC** (taxe) ; **étude SPANC** ≠ **redevances SPANC** | Deux sommes distinctes à chaque fois. |
| **Taxe d'aménagement** ⊃ redevance d'archéologie | Déjà additionnée dans les prix (26,31 / 52,63 €/m², 172,75 €/place). |
| **Compteur provisoire** | Si le chantier dépasse 1 an, le définitif anticipé revient moins cher. |
| **Installation de chantier** ⟂ WC de chantier / clôture / bennes | L'installation (400 €) = amenée, panneau, protections ; WC, clôture et bennes à part. Décocher ce que le maçon inclut. |
| **Location de matériel** | Ajouts à la main, pour ce qu'on fait soi-même (un artisan amène ses engins). La part d'engin d'un poste fait soi-même va dans son `sm` (N12), jamais en location automatique. |
| **Escalier bois** quart tournant ⟂ droit en kit ⟂ béton | Un seul escalier ; garde-corps de trémie en plus. |

---

## h. « Je le fais » en neuf et affichage de la précision

**Qui réalise.** Le moteur valorise un poste fait soi-même à `sm × coef de finition`. Appliqué à tout ce qui a une fourniture, « le maximum » descend à ≈ 960 € TTC/m² (−54 %), sous le repère d'auto-construction (1 200-1 600 €/m²) : le particulier coulerait ses fondations, poserait sa charpente et installerait sa PAC au prix des matériaux. **Proposition v1 (décision Dani)** : en neuf, « le maximum » exclut toujours les lots Terrassement, Fondations & soubassement, Maçonnerie (chapes comprises), Charpente / ossature, Couverture & zinguerie, Menuiseries extérieures, Raccordements et la PAC. On obtient −23 à −27 %, soit ≈ 1 550-1 750 € TTC/m², dans ou juste au-dessus du repère. « Une partie » reste `DIY_PARTIE` (peinture, sols, plâtrerie, isolation : −11 à −13 %).

**Depuis N1 (revue rénovation / neuf, §3)**, « possible » et « par défaut » sont séparés. Ces lots restent aux pros **par défaut** en « le maximum » (`PRO_PAR_DEFAUT_MAX`, les totaux ci-dessus ne bougent pas), mais le détaillé propose « Je le fais » sur chaque poste qui a un prix de fourniture, comme la rénovation (`peutFaireSoiMeme`) : maçonnerie, fondations, charpente, couverture, menuiseries extérieures, fosse et micro-station. Une ligne de structure ou de clos-couvert prise soi-même rappelle qu'elle sort de la garantie décennale. Seuls les postes qui portent une raison `pro` restent fermés : études, concessionnaires, contrôles, PAC et climatisations, borne de recharge, procédés du poseur (`tests/postes-pro-neuf.txt`).

**Finition.** Éco / standard / premium ne déplacent le total que de −2 % / +7 % (la finition ne touche que les matériaux). Le dire dans l'interface et montrer les vrais leviers : sol argileux (+12 %), sous-sol (+10 %), forme, toiture, chauffage (± 3 à 5 %).

**Phrase de précision proposée (jury économiste) :** « Estimation à ± 10 % des coûts moyens constatés en France pour une maison simple (enquête officielle SDES 2024). Votre terrain, votre région et vos devis feront la différence. Hors terrain, notaire et aménagements extérieurs. » Ne jamais écrire « précision ± 10 % sur votre projet », ni « clé en main ».

---

## i. Points ouverts

Tout ce qui reste à trancher est dans **`decisions-dani.md`** : corrections du catalogue rénovation, aléas, mode « le maximum », extérieurs, tuile, gouttière, pente du Sud, Enedis en lotissement, et la liste des postes non chiffrés (enduit plâtre intérieur sur monomur, anti-termites, câble coffret → tableau, niche de coffret, planche de rive, marche ou perron, RC maître d'ouvrage / TRC, peinture des portes, garde-corps de fenêtres d'étage, protection collective en rive de toit).
