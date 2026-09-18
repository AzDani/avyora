# D4 — Mappage des 20 types de pièces du plan vers les compteurs du moteur

Décidé le 18 septembre 2026. Code : [`lib/estimateur/plan-mapping.ts`](../../lib/estimateur/plan-mapping.ts),
tests : `tests/estimateur-plan-mapping.test.ts`. Rien ne l'importe encore : il sera appelé au
branchement (phase 4).

Méthode : cinq analyses parallèles (une par famille de pièces), chacune attaquée par une
contre-expertise chiffrée sur le code réel — 10 agents, 275 lectures de fichiers. Les deux
affirmations qui commandent tout le reste ont été re-vérifiées à la main, en exécutant le moteur.

---

## Ce que pèse vraiment le mappage

Mesuré sur un T3 de 70 m² en rénovation complète, CP 33620 :

| | aujourd'hui | après injection des mesures du plan |
|---|---|---|
| une pièce de plus | 1 152 € TTC | **149 €** (seuils 41 € + peinture des boiseries 99 €) |
| une salle de bain de plus | 3 111 € TTC | **913 €**, dont 858 € de faïence forfaitisée à 12 m² |

Les trois autres postes par pièce — porte, radiateur, plinthes — sont mesurés par le plan et
injectés en quantité manuelle, donc le compteur ne les pilote plus. **Le mappage n'est donc pas
d'abord une décision de chiffrage : c'est une décision de lisibilité.** La décision D1 renvoie
l'utilisateur sur l'intake détaillé pour valider ; ce qu'il y lit doit ressembler à son plan.

Les deux colonnes sortent du même devis, mêmes postes cochés : la seule différence est que le
plan impose ses quantités mesurées (radiateur 516 €, porte 325 €, plinthes 103 €), ce qui éteint
le calcul automatique de ces lignes.

**Règle de livraison : ce mappage ne part jamais seul.** Livré sans l'injection mesurée, il
chiffrerait une pièce non classée 1 152 € de moins au lieu de 149 €.

---

## Les trois règles

1. **Un type entre dans un compteur quand l'utilisateur, devant le libellé français de l'intake,
   y compterait spontanément sa pièce.** Un type sans case honnête n'entre nulle part — il ne
   squatte pas la case voisine.
2. **Une pièce d'eau se reconnaît à l'appareil posé, jamais au nom de la pièce.** `sdbEff` vaut
   `sdb + suites` : compter une suite parentale ET sa salle de bain dessinée facturerait deux
   salles de bain pour une seule (2 610 € HT de fantôme). C'est la douche ou la baignoire posée
   qui décide — ce qui rattrape aussi la douche du sous-sol, que le type de pièce ne dit pas.
3. **« Aucun compteur » veut dire écrire ZÉRO.** `defaultCtx()` livre séjour 1, cuisine 1,
   chambres 3, couloir 1 : un plan qui n'écrirait que ce qu'il sait remplir laisserait ces
   défauts en place — un plan de garage afficherait « Chambres : 3 ».

---

## Le tableau

| type du plan | compteur | ce que l'utilisateur relit |
|---|---|---|
| Séjour | `sejour` | Séjour / salon |
| Cuisine | `cuisine` | Cuisine |
| Chambre | `chambres` | Chambres |
| **Bureau** | `chambres` | Chambres — mêmes besoins (porte, radiateur, prise réseau) |
| **Suite parentale** | `suites` **si sa douche est dans la face**, sinon `chambres` | Suite parentale · chambre + SDB |
| Salle de bain | `sdb` | Salles de bain · hors suite |
| **Salle d'eau** | `sdb` | Salles de bain — les 14 postes de ce compteur sont douche + vasque + faïence, jamais baignoire |
| WC | `wc` | WC |
| Couloir / dégagement | `couloir` | Couloir / dégagement |
| **Entrée** | `couloir` | idem — c'est le mot du libellé |
| **Palier / escalier** | `couloir` | idem |
| Buanderie | `buanderie` | Buanderie / cellier |
| **Cellier / rangement** | `buanderie` | idem — le libellé le nomme |
| **Dressing** | aucun | personne ne déclare un dressing en buanderie |
| **Mezzanine** | aucun | volume ouvert : une porte et une prise réseau de plus n'existeraient pas |
| **Autre** | aucun | type non renseigné — le plan doit demander à l'utilisateur de préciser |
| Garage · Cave · Combles | aucun | non habitables. Une douche posée dedans reste comptée, par la règle 2 |
| Balcon / terrasse | aucun | le catalogue n'a aucun poste extérieur |

Les WC et les salles de bain n'entrent pas dans le nombre de pièces du moteur : c'est ainsi que
`piecesEff` est écrit, et on ne le change pas. Conséquence assumée : la porte d'un WC séparé n'est
jamais chiffrée par le compteur — le plan la mesure.

### Les quatre cas de la suite parentale

| ce qui est dessiné | `suites` | `sdb` | pièces d'eau chiffrées |
|---|---|---|---|
| suite indivise + SDB familiale | 1 | 1 | 2 ✓ |
| suite cloisonnée (sa SDB est une face voisine) | 0 (→ chambre) | 1 | 1 ✓ |
| suite seule, indivise | 1 | 0 | 1 ✓ |
| plan sans mobilier | 1 | par type | selon les types ✓ |

`sdb + suites` vaut toujours le nombre de pièces d'eau réellement dessinées.

---

## Ce que la contre-expertise a trouvé et qui reste ouvert

Rien de tout cela n'est un défaut du mappage : ce sont des décisions ou des correctifs à part.

1. **Le type « Combles » est non habitable.** Des combles AMÉNAGÉS dessinés sous ce type sortent
   de la surface habitable : 45 m² aménagés = ~9 000 € HT de postes au m² qui tombent à zéro, et
   le récapitulatif annonce 100 m² pour une maison de 145. À scinder en « Combles perdus » /
   « Combles aménagés », côté plan.
2. **Les pièces non habitables sont comptées dans `wallPaint` et `plinthes`, mais pas dans
   `area`.** Un garage fait donc entrer sa peinture dans le devis sans faire entrer sa surface.
   C'est la décision D5 (surface habitable vs surface de travaux).
3. **`ctx.fenetres` n'est lu par aucune formule du moteur** — vérifié : zéro occurrence hors sa
   déclaration et les préréglages. C'est un compteur décoratif dans l'écran où l'utilisateur est
   censé valider.
4. **`travaux.creerPortes` compte les passages sans porte, la porte d'entrée et la porte de
   garage.** À ventiler avant d'injecter « Porte intérieure battante », sinon une porte de garage
   se facture en menuiserie intérieure.
5. **« Robinetterie baignoire » a une quantité automatique indexée sur le nombre de salles de
   bain, alors que « Installer une baignoire » n'en a aucune.** Incohérence du catalogue.
6. **La faïence est forfaitisée à 12 m² par salle de bain** (858 €). Le plan sait mesurer la
   surface réelle, mais la hauteur de pose est la décision D10.
7. **Le lot Cuisine n'a aucune quantité automatique** et ses deux branches s'excluent : c'est D15.

## Corrigé dans la foulée

`bien.surfaceExterieure` ne sommait que le niveau bas — un balcon à l'étage en était absent. Le
champ est retiré : `ext` somme déjà tous les niveaux, et deux sources pour une même grandeur, c'est
la panne garantie.
