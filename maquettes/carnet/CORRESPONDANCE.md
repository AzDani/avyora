# La table de correspondance

Code : [`lib/estimateur/plan-correspondance.ts`](../../lib/estimateur/plan-correspondance.ts) ·
tests : `tests/estimateur-plan-correspondance.test.ts` sur un contrat réel figé dans
`tests/fixtures/plan-contrat.json`.

Une fonction pure : elle prend le contrat du plan, elle rend des contributions. Elle ne chiffre
rien et n'écrit nulle part — c'est la phase 4 qui les transformera en sélection. **97 postes du
catalogue sur 203 sont alimentés**, et chaque contribution porte les identifiants des objets du
plan qui l'ont produite.

Elle est testée sur une scène de référence figée dans `tests/fixtures/plan-contrat.json` : deux
pièces, une salle de bain carrelée à mi-hauteur avec douche à l'italienne et baignoire, une chambre
au parquet ancien à poncer, un mur porteur et une cloison à démolir, un doublage intérieur, une
toiture entièrement refaite, une menuiserie remplacée, une neuve avec volet, une conservée, une à
boucher, et des équipements déjà en place qui ne doivent rien produire.

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
| **Sols**, pièce par pièce | dépose de l'ancien, dalle, isolation sous chape, chape traditionnelle ou liquide, ragréage, puis le revêtement — avec la déduction de D8 : un parquet posé sur un parquet existant se ponce |
| **Faïence et cloison humide** (D10) | la hauteur choisie devient une surface : pleine hauteur = les murs moins les ouvertures ; mi-hauteur = 1,20 m au périmètre et 2,00 m contre la douche et la baignoire, mesurés sur les appareils dessinés ; zone douche = ces seuls murs. L'hydrofuge ne prend que les CLOISONS de la pièce, pas ses murs extérieurs, qui sont doublés |
| **Plinthes** | au périmètre réel de chaque pièce, là où le moteur prenait 4·√(S·P) |
| **Toiture** | l'action du panneau décide : démousser, réfection selon la couverture, ou dépose puis toiture complète ; plus l'isolation des combles à l'emprise, les gouttières au linéaire d'égout et les raccords au faîtage |
| **Maçonnerie induite** | l'appui d'une fenêtre neuve, le seuil d'une baie ou d'une porte extérieure neuve — une menuiserie remplacée garde les siens |

## Les deux règles qui ne viennent pas d'une décision

**Seul le delta est facturé.** Un élément `existant` ou `conservé` ne produit rien. Dans la scène
de référence, un radiateur et un lavabo sont déjà là et un chauffe-eau est marqué conservé :
aucun des trois n'apparaît dans les contributions, et trois tests le vérifient à chaque build.

**On n'injecte jamais ce que le moteur dérive correctement.** « Robinetterie lavabo » se calcule
déjà depuis le meuble-vasque, y compris quand sa quantité est saisie à la main. L'injecter ne la
corrigerait pas : ça la figerait. Même raisonnement pour tous les postes dont la quantité est une
fonction de la surface — « Rénovation électrique complète », « Refaire toute la plomberie »,
« Peinture des murs », « Nettoyage de fin de chantier ». Le plan les rend justes **en donnant la
bonne surface**, pas en envoyant une ligne.

## Ce qui n'est pas encore branché

29 postes restent, et presque aucun n'attend une mesure.

**Ceux que le moteur calcule déjà correctement** — les lister comme « non couverts » serait
trompeur. Peinture des murs et des plafonds, préparation des surfaces, sous-couche, rénovation
électrique complète, réfection du réseau de plomberie, nettoyage de fin de chantier, ratissages :
tous sont une fonction de la surface. Le plan les rend justes **en donnant la bonne surface**, pas
en envoyant une ligne. Idem pour « Vasque », « Robinetterie lavabo », « Miroir » et « Finitions
plâtrerie », que le moteur dérive de ce qui a été injecté.

**Ceux qui attendent une décision**, pas du code : « Doubler un mur » est écarté par D2, le
matériau du plancher créé est le reste de D15, les meubles de cuisine sont une branche à choisir,
et « Retirer l'ancien papier peint » comme « Enlever un revêtement mural » supposent une question
par pièce que le plan ne pose pas encore.

**Ceux qui demandent vraiment une mesure de plus** : le faux plafond (un choix par pièce), les
seuils de porte au sol (il faut savoir où deux revêtements se rencontrent), le toit plat, le mur en
ossature bois et le plancher béton d'étage créé.

## Ce que la table refuse de faire

Trois choses que le plan sait mesurer et que le catalogue ne sait pas recevoir. Elles ne sont pas
perdues en silence : la fonction les rend dans `ignores`, avec leur raison.

- Le **rebouchage d'une ouverture** : aucun poste au catalogue.
- Le **percement d'un mur léger** : seul le mur porteur a ses deux postes.
- L'**escalier métallique** : le catalogue a le bois et le béton.

Ce sont des trous de catalogue, pas des trous de correspondance — à trancher comme D9 l'a été.
