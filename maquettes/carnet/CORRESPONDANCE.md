# La table de correspondance — première moitié

Code : [`lib/estimateur/plan-correspondance.ts`](../../lib/estimateur/plan-correspondance.ts) ·
tests : `tests/estimateur-plan-correspondance.test.ts` sur un contrat réel figé dans
`tests/fixtures/plan-contrat.json`.

Une fonction pure : elle prend le contrat du plan, elle rend des contributions. Elle ne chiffre
rien et n'écrit nulle part — c'est la phase 4 qui les transformera en sélection. **62 postes du
catalogue sur 203 sont alimentés**, et chaque contribution porte les identifiants des objets du
plan qui l'ont produite.

## Ce qui est branché

| famille | ce que le plan envoie |
|---|---|
| **Murs** | démolition (cloison · non porteur · porteur), création (cloison · parpaing · pierre), et pour un mur porteur les trois lignes de D9 — démolition au m², poutre de reprise au ml, étude au forfait |
| **Percements** | ventilés porteur petit / porteur grand, depuis les ouvertures réellement dessinées |
| **Menuiseries** | chaque type vers son poste, le volet, les options ; une menuiserie remplacée déclenche aussi la dépose de l'ancienne |
| **Équipements** | sanitaires, chauffage, électricité, VMC, velux, îlot, plan de travail au ml mesuré |
| **Les attributs qui lèvent une ambiguïté** | douche bac / italienne / cabine (D6), double vasque en variante (D7), escalier bois / béton (D15), spot ou plafonnier (D15) |
| **Doublage** | ITI vers « Isolation des murs par l'intérieur » (D2), ITE vers le poste de façade |
| **Façade** | les huit finitions, que la maquette nommait déjà |

## Les deux règles qui ne viennent pas d'une décision

**Seul le delta est facturé.** Un élément `existant` ou `conservé` ne produit rien. Sur le plan
d'exemple, 29 équipements sont en place et aucun n'apparaît dans les contributions — c'est
exactement ce que D1 demandait, et c'est ce qu'un test vérifie.

**On n'injecte jamais ce que le moteur dérive correctement.** « Robinetterie lavabo » se calcule
déjà depuis le meuble-vasque, y compris quand sa quantité est saisie à la main. L'injecter ne la
corrigerait pas : ça la figerait. Même raisonnement pour tous les postes dont la quantité est une
fonction de la surface — « Rénovation électrique complète », « Refaire toute la plomberie »,
« Peinture des murs », « Nettoyage de fin de chantier ». Le plan les rend justes **en donnant la
bonne surface**, pas en envoyant une ligne.

## Ce qui n'est pas encore branché

63 postes restent alimentables par le plan. Mais il faut les lire en deux tas.

**Ceux où le plan a une mesure que le moteur n'a pas** — c'est le vrai reste à faire :

- **Toiture, 17 postes**, tous pilotés par une seule grandeur que le plan calcule déjà. Mécanique,
  mais il faut traduire l'action du panneau Toiture (réfection, dépose complète, couverture seule)
  en choix de poste.
- **Sols, 8 postes**, pièce par pièce, avec la déduction du ponçage décidée en D8.
- **Faïence et cloison hydrofuge**, qui attendent que la hauteur de pose choisie en D10 devienne
  une surface.
- **Plinthes, seuils, faux plafond**, où le plan a le périmètre réel là où le moteur a une racine
  carrée.
- **Chape, dalle, ragréage**, qui se lisent dans les couches de sol de chaque pièce.

**Ceux où le plan n'apporte rien de plus** que la surface qu'il a déjà corrigée : peinture,
électricité au m², plomberie réseau, nettoyage. Les lister comme « non couverts » serait
trompeur — ils sont justes, et ils le sont grâce au plan.

## Ce que la table refuse de faire

Trois choses que le plan sait mesurer et que le catalogue ne sait pas recevoir. Elles ne sont pas
perdues en silence : la fonction les rend dans `ignores`, avec leur raison.

- Le **rebouchage d'une ouverture** : aucun poste au catalogue.
- Le **percement d'un mur léger** : seul le mur porteur a ses deux postes.
- L'**escalier métallique** : le catalogue a le bois et le béton.

Ce sont des trous de catalogue, pas des trous de correspondance — à trancher comme D9 l'a été.
