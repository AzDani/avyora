# Construction neuve : les décisions à prendre (v1)

Tous les chiffres viennent de `calibre.mjs` (maison A = plain-pied 100 m², B = à étage 120 m² + garage, C = ossature bois 90 m², niveau standard). Les sources sont dans `journal-corrections.md` et les fichiers `verif-*.json`.

**État :** le catalogue v1 et ses règles sont branchés dans le moteur (`lib/estimateur/catalog-neuf.json`, `neuf.ts`, `presets-neuf.ts`) ; aucun prix du catalogue rénovation n'a été modifié. Le point 4 (« le maximum soi-même ») est appliqué dans sa version proposée, réversible en une ligne (`PRO_PAR_DEFAUT_MAX` dans `presets-neuf.ts`) ; depuis N1, il ne règle plus que le défaut (voir le point 4). Les aléas restent à 7 % tant que tu n'as pas tranché le point 3.

---

## 1. Corriger 14 prix du catalogue rénovation ?

Ces postes sont partagés entre la rénovation et le neuf. On ne les a pas modifiés. Chaque ligne se décide à part.

| # | Poste | Aujourd'hui → proposé (fourni-posé / fourniture, € HT) | Prix standard affiché | Effet en rénovation | Effet en neuf (€ HT) | Fiabilité |
|---|---|---|---|---|---|---|
| 1 | Enduit monocouche | 28 / 10 → **43 / 19** | 26 → 40 €/m² | +14 €/m² (ravalement de 120 m² : +1 640 €) ; utilisé par le mode rapide | A +2 080 · B +3 300 · C 0 | haute (coût CYPE 42 € sans marge) |
| 2 | Carrelage au sol | 70 / 30 → **85 / 36** | 63 → 77 €/m² | +14 €/m² (30 m² : +410 €) ; mode rapide et pièces | A +850 · B +1 020 · C +770 | moyenne (devis Saint-Gobain 2026). La faïence (même prix) n'a pas été revue |
| 3 | Porte d'entrée | 1 600 / 1 150 → **2 150 / 1 550** | PVC 960 → 1 290 ; alu 1 600 → 2 150 | +330 € par porte PVC | +340 par maison | moyenne (2 sites de prix 2026) |
| 4 | Porte de garage | 1 200 / 800 → **1 966 / 1 566** | 1 064 → 1 700 | +636 € par porte | B +660 | moyenne (CYPE + 2 sites) |
| 5 | Raccords faîtage / noues | 40 / 15 → **59 / 22** | 37 → 55 €/ml | +18 €/ml | B +80 (plus sur les toits 4 pans ou en L) | haute (CYPE) |
| 6 | Chape liquide | 40 / 20 → **30 / —** | 37,6 → 30 €/m² | −7,6 €/m² | A −790 · B −940 · C −710 | moyenne (relevés de chapistes datés de 2015) |
| 7 | Cloison | 50 / 20 → **45 / 20** | 46,6 → 41,6 €/m² | −5 €/m² ; mode rapide | A −350 · B −370 · C −310 | moyenne |
| 8 | Consuel | 180 → **123** | | −57 € | −59 | haute (tarif Consuel 2026). Garder 180 si l'électricien facture le dossier |
| 9 | Compteur de chantier Enedis | 250 → **447** | | +197 € | +204 | haute (barème Enedis V8, au 28/10/2026) |
| 10 | Raccordement Enedis | 2 000 → **1 586** | | −414 € | −428 | haute (barème V8 ; tranchée et niche non comprises) |
| 11 | Micro-station | 12 000 / 6 600 → **9 500 / 5 500** | | −2 500 € | −2 500 si choisie (−3 340 TTC tout compris) | moyenne |
| 12 | Raccordement égout | 2 500 → **2 226** (partie publique seule) | | −274 € | −284 | moyenne (grilles publiques 2 214-2 238 €). Sinon garder 2 500 |
| 13 | Escalier béton | 4 500 → **3 800** | | −700 € | −700 si choisi | non contre-vérifié (proposé par la synthèse) |
| 14 | Plancher bois | 90 / 45 → **106 / 51** | 85 → 100 €/m² | +15 €/m² | ossature à étage seulement | non contre-vérifié (proposé par la synthèse) |

**Si tout est validé :** A +2 020 € TTC tout compris (+1 %), B +4 530 € (+2 %), C −620 €.

Abandonnées après vérification (pour info) : plancher béton 120 → 111 (le coût sans marge dépasse déjà 93 €), nettoyage 10 → 7 (sources contradictoires : 3-8 € contre 20-35 €), fermettes 80 → 91 (sources contradictoires, il faut un vrai devis).

## 2. Raccordement Enedis en lotissement (coffret déjà posé)

En lotissement, le coffret est souvent déjà en limite : Selectra l'annonce à 430 € TTC (≈ 358 € HT) au lieu de 2 000 €.
- **Option A :** ajouter une variante « coffret déjà posé » (−1 640 € HT par maison en lotissement), après vérification dans le barème Enedis officiel.
- **Option B :** garder un seul prix.

## 3. Aléas : 7 % ou 10 % en neuf ?

| | A | B | C |
|---|---:|---:|---:|
| Total tout compris, aléas 7 % | 246 760 € | 314 750 € | 245 320 € |
| Total tout compris, aléas 10 % | 252 150 € | 321 600 € | 250 680 € |

Tranché en D7 (revue rénovation / neuf) : le neuf reste à 7 %. Depuis D5 (bandes de plâtre à part, § 11), les totaux à 7 % sont de 253 172 €, 323 991 € et 251 172 €.

La recherche conseille 10 à 15 %, et les jurys conducteur et économiste recommandent 10 %. **Proposition : 10 %.**

## 4. « Je fais le maximum moi-même » en neuf

Aujourd'hui, le moteur compte au prix des seuls matériaux tout ce qui a une fourniture, y compris fondations, charpente, couverture et PAC. Résultat : 958 € TTC/m² sur A, sous le repère de l'auto-construction (1 200-1 600 €/m²).
- **Option A (proposée) :** structure, clos-couvert, raccordements et PAC toujours faits par des pros. A passe à **1 555 €/m²** (−25 %).
- **Option B :** garder le moteur tel quel.

**Appliqué (option A), puis précisé en N1 (revue rénovation / neuf, §3) : « possible » et « par défaut » sont deux règles séparées.**
- **Possible** : « Je le fais » est proposé sur un poste dès qu'il a un prix de fourniture inférieur au prix posé, hors location, frais et pourcentage, comme en rénovation (`peutFaireSoiMeme`, `core.ts`). La maçonnerie, les fondations, la charpente, la couverture, les menuiseries extérieures, la fosse et la micro-station se prennent donc soi-même ligne par ligne dans le détaillé (132 postes sur 209 après N1, 136 depuis D2). Une ligne de structure ou de clos-couvert prise soi-même affiche « Fait soi-même : hors garantie décennale. Vérifie avec ton assureur dommages-ouvrage. »
- **Jamais possible** : les postes qui portent une raison (`pro`) affichent « Pro obligatoire · <raison> » : études et géomètre, concessionnaires (Enedis, eau, tout-à-l'égout côté réseau), contrôles et attestations (Consuel, SPANC), procédés du poseur. Liste figée : `tests/postes-pro-neuf.txt` (26 postes). Pour les postes repris de la rénovation, la raison vit dans `PRO_PARTAGES_NEUF` (`presets-neuf.ts`) : `catalog.json` n'est pas touché, et la rénovation garde son « Je le fais » sur le tout-à-l'égout.
- **Décision D2 de Dani (13/10/2026) : NON au « Pro obligatoire » sur la PAC, les climatisations et la borne de recharge** (« certaines personnes le feront elles-mêmes »). Elles sont faisables soi-même en neuf comme en rénovation (136 postes sur 209 en neuf). Prises soi-même, la PAC et les climatisations rappellent « Manipulation du fluide frigorigène : attestation de capacité requise pour la mise en service », la borne « pose par un installateur qualifié IRVE exigée » au-delà de 3,7 kW (`MENTIONS_SOI_MEME`, `core.ts`). La chaudière gaz et l'amiante de la rénovation ne changent pas non plus.
- **Par défaut en « le maximum »** : structure, clos-couvert **et raccordements** restent aux pros (`PRO_PAR_DEFAUT_MAX`), ainsi que la PAC, les climatisations et la borne (`POSTES_PRO_PAR_DEFAUT_MAX`). Aucun total par défaut ne bouge : A en « le maximum » reste à 189 110 € TTC, 195 743 € avec une fosse, 200 441 € avec une micro-station. Depuis D5 (bandes de plâtre à part, § 11) : 190 990 €, 197 623 € et 202 321 €.
- **Une seule règle d'affichage pour les deux natures (N5)** : la ligne (`Row`) propose « Je le fais » quand `peutFaireSoiMeme(lot, poste)` est vrai et que le poste n'est pas réservé, ou quand le projet l'avait déjà pris soi-même. En rénovation, aucun bouton ne change (vérifié poste par poste et variante par variante).
- **Décision D4 (a) (13/10/2026)** : la rénovation garde son « Je fais un max moi-même » (électricité, mur porteur et charpente en « Je le fais ») ; ce sont les textes qui sont corrigés (rapide, détaillé, guide « faire soi-même ou artisan », méthodologie). Une ligne de maçonnerie, de charpente-couverture ou de menuiseries extérieures (ou l'abattage d'un mur porteur) prise soi-même affiche aussi en rénovation « hors garantie décennale », avec une étude conseillée pour la structure (`horsDecennaleSoiMeme`, `core.ts`). Aucun prix ne bouge.

## 5. Aménagements extérieurs (allée, terrasse, clôture, portail)

Ils coûtent 8 000 à 20 000 € (recherche « calibrage ») et ne sont pas chiffrés poste par poste.
- **Option A :** les laisser hors périmètre, avec un message clair.
- **Option B :** créer un lot optionnel « Extérieurs ». Il faudra alors sourcer les prix, sauf les portails qui existent déjà au catalogue.

## 6. Réglages par défaut de la toiture

| Choix | Effet sur A (total TTC) | Remarque |
|---|---:|---|
| Tuile **béton** au lieu de terre cuite | −5 540 € | prix de la tuile béton non revérifié |
| Gouttière **PVC** au lieu de zinc | −980 € | le conducteur pense que le PVC est plus courant en standard, sans source |
| Pente faible (17°) dans le Sud | −7 800 € | il faut fixer la liste des départements « tuile canal ». Aujourd'hui c'est une question, réponse « non » par défaut |

## 7. Dalle isolée + plancher chauffant

Les deux isolants sont comptés : celui de la dalle (≈ 28 €/m²) et le panneau du plancher chauffant.
- **Option A (actuelle) :** garder les deux. Le panneau est obligatoire (DTU), et la seule variante qu'on peut chiffrer coûte plus cher (199 € au lieu de 195 €/m²).
- **Option B :** demander 2 ou 3 devis pour une variante « dalle non isolée + plancher chauffant sur panneau épais ». Gain possible de 1 500 à 2 500 € sur A, non sourcé.

## 8. Postes non chiffrés : les sourcer avant la mise en ligne, ou afficher « non compris » ?

| Poste | Quand | Ce qu'on a trouvé | Ordre de grandeur sur A |
|---|---|---|---|
| Enduit plâtre intérieur sur monomur / béton cellulaire 30 | murs isolants | 18 à 60 €/m², fourchette peu fiable. Plan B immédiat : reprendre « Doubler un mur » (37 €/m² en standard), mais il ne garantit pas l'étanchéité à l'air | 1 500 à 5 000 € (plan B : 3 110 €). Sans lui, la variante monomur est sous-estimée |
| Protection anti-termites | départements sous arrêté | 5,5 à 6 €/m², prix de 2010 | ≈ 600 € |
| Câble du coffret Enedis au tableau | toujours | câble seul 8,2 €/m, pose inconnue | quelques centaines d'euros |
| Niche ou muret des coffrets | hors lotissement | aucun prix | — |
| Planche de rive (bandeau d'égout) | toit en pente | aucun prix posé | — |
| Marche ou perron d'entrée | toujours (sol fini 20-40 cm au-dessus du terrain) | aucun prix | — |
| Assurance RC maître d'ouvrage + tous risques chantier | option, lots séparés | +8 à 12 % de la prime DO (lu seulement en extrait) | ≈ 500-800 € |
| Peinture des portes intérieures | si portes livrées brutes | 50 à 100 € par porte, HT ou TTC non précisé | 300 à 600 € |
| Garde-corps des fenêtres d'étage à allège basse | selon les plans | poste existant à 180 €/ml, sans règle de quantité | — |
| Porte isolante garage → maison | si garage | comptée au prix d'une porte « âme pleine » (450 €), c'est un plancher | + ? |

## 9. Prix nouveaux restés incertains (inchangés faute de source)

Rien n'a été inventé : ces prix restent tels quels. Il faut des devis pour les fiabiliser.
- **Plancher chauffant** à 55 € HT/m² : bas des fourchettes, jusqu'à +2 800 € sur A.
- **Surcoût sol argileux** 12 500 € : une seule source.
- **Dommages-ouvrage** 3,5 % : les sources vont de 0,5 à 7 %.
- **Fosse toutes eaux** 8 400 € (prix repris).
- Tuile béton, ardoise fibres-ciment, gouttière alu continu, sous-face bois, semelle isolée, clôture de chantier, fouilles en pleine masse.

## 10. Texte de précision à afficher

Proposé par le jury économiste :

> « Estimation à ± 10 % des coûts moyens constatés en France pour une maison simple (enquête officielle SDES 2024). Votre terrain, votre région et vos devis feront la différence. Hors terrain, notaire et aménagements extérieurs. »

Le calage le permet : A est à +2 % et B sans garage à 0 % du repère EPTB. C (ossature bois) est à +13 % : ne pas afficher de précision pour l'ossature bois.

## 11. Bandes de plâtre : une ligne à part, comme en rénovation (décision D5 de Dani)

**Tranché, appliqué le 17/10/2026.** Dani : « dans la rénovation on a une ligne à part ; fais la même logique que la réno ». En neuf, les bandes et l'enduit des plaques ne sont plus « compris dans les plaques » : c'est la ligne de la rénovation, « Finitions plâtrerie (bandes, enduit) », reprise par `ref` (même poste, même prix : 15 € HT/m², 5 € de fourniture), cochée avec les plaques, faisable soi-même. Sa quantité suit les m² de plaques cochées : faux plafonds, cloisons et cloisons hydrofuges sur leurs deux faces, « Doubler un mur », doublage collé ou sur ossature. Détail, formule et preuve : `journal-corrections.md` § 10.

| | A | B | C |
|---|---:|---:|---:|
| Plaques cochées (m²) | 347,16 | 500,72 | 317,08 |
| Total tout compris avant D5 (aléas 7 %) | 246 762 € | 314 745 € | 245 317 € |
| **Depuis D5** | **253 172 €** (+2,6 %) | **323 991 €** (+2,9 %) | **251 172 €** (+2,4 %) |

- La rénovation ne bouge pas : sa formule (`derivedFinitions`) et ses prix sont les mêmes, T1 à 0 écart.
- « Le maximum » (§ 4) : A passe de 189 110 € à 190 990 € (195 743 → 197 623 € avec une fosse, 200 441 → 202 321 € avec une micro-station). La ligne y est prise soi-même, comme toute la plâtrerie.
- Prix au m² de l'estimation rapide (/estimation-construction-maison, 100 m² plain-pied, moyenne nationale, tout fait faire) : ≈ 2 468 → ≈ 2 532 €/m² en standard.
- Un projet neuf enregistré avant D5 garde son total : sa sélection n'a pas la ligne (décochée dans le détaillé rouvert).
- Limite connue : les rampants des combles aménagés n'ont pas de bandes, en neuf comme en rénovation (`journal-corrections.md` § 10).
- Reste ouvert, pour les deux natures à la fois : D5 (a) de la revue (les plaques comprennent-elles déjà leurs bandes ? 2 ou 3 devis à faire sourcer).


## 12. Doublage intérieur avec une ITE ou des murs en béton cellulaire 30 cm

**Tranché le 18/10/2026.** Dani : « non, pas automatique, comme ça les gens choisissent ». Cocher l'isolation par l'extérieur (ITE) ou choisir des murs en béton cellulaire 30 cm (mur isolant) ne décoche **pas** le doublage intérieur (collé ou isolation des murs par l'intérieur) : c'est à l'utilisateur de le décocher s'il n'en veut pas. Le comportement en ligne depuis N10 ne change pas, aucun prix ne bouge. La table des conflits de `conception.md` (§ g) le dit.
