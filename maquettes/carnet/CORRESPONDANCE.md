# La table de correspondance

Code : [`lib/estimateur/plan-correspondance.ts`](../../lib/estimateur/plan-correspondance.ts) ·
tests : `tests/estimateur-plan-correspondance.test.ts` sur un contrat réel figé dans
`tests/fixtures/plan-contrat.json`.

Une fonction pure : elle prend le contrat du plan, elle rend des contributions. Elle ne chiffre
rien et n'écrit nulle part — c'est la phase 4 qui les transformera en sélection. **101 postes du
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
| **Faux plafond** | par pièce, sur demande, à la surface de la pièce — le moteur le prenait sur toute la surface du logement |
| **Plancher d'un étage créé** (D15) | un niveau dit désormais s'il est créé par le projet, et en quoi est son plancher : bois ou dalle béton |
| **Toit plat** | une étanchéité, un seul poste — ni tuile ni ardoise n'a de sens dessus |

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

## Les déductions se signalent

Le plan choisit parfois à la place de l'utilisateur. Chaque contribution concernée porte une
phrase — `deduction` — qui dit ce qui a été déduit et quoi changer, pour que l'écran de validation
de D1 puisse la mettre en évidence plutôt que de la noyer :

- un **parquet** posé sur un parquet existant est poncé, pas remplacé — 1 151 € d'écart sur 20 m² ;
- un **type de douche** non choisi retombe sur receveur + colonne + paroi ;
- un **matériau d'escalier** non choisi retombe sur le bois, qui coûte près de moitié moins que le béton ;
- une **hauteur de faïence** non choisie retombe sur la mi-hauteur, quand la pleine hauteur double presque la surface ;
- un **point lumineux** non choisi devient un spot encastré, qui suppose un faux plafond ;
- des **fenêtres de toit** comptées au panneau plutôt que dessinées ne sont pas situées sur le plan.

Pour que ce soit possible, le contrat émet désormais ces choix **bruts** : `null` quand
l'utilisateur n'a rien tranché, au lieu du défaut déjà appliqué. C'est au consommateur d'appliquer
le défaut — et de dire qu'il l'a appliqué.

## Ce qui n'est pas encore branché

Il reste 102 postes du catalogue hors de la table, et c'est normal : la plupart n'ont rien à
recevoir du plan.

**Ceux que le moteur calcule déjà correctement.** Peinture des murs et des plafonds, préparation
des surfaces, sous-couche, rénovation électrique complète, réfection du réseau de plomberie,
nettoyage de fin de chantier, ratissages : tous sont une fonction de la surface. Le plan les rend
justes **en donnant la bonne surface**, pas en envoyant une ligne. Idem pour « Vasque »,
« Robinetterie lavabo », « Miroir » et « Finitions plâtrerie », que le moteur dérive de ce qui a
été injecté. Les lister comme « non couverts » serait trompeur.

**Ceux qui attendent une décision**, pas du code : « Doubler un mur » est écarté par D2, les
meubles de cuisine sont une branche à choisir, et « Retirer l'ancien papier peint » comme
« Enlever un revêtement mural » supposent une question par pièce que le plan ne pose pas.

**Ceux qui demandent une mesure que le plan ne fait pas encore** : les seuils de porte au sol — il
faudrait savoir où deux revêtements se rencontrent, donc lier chaque ouverture aux deux pièces
qu'elle sépare — et le mur en ossature bois, qui n'est pas un type de mur du plan.

**Et tout le reste du catalogue** : études, diagnostics, raccordements aux réseaux, location de
matériel, assainissement. Un plan ne les décrit pas, et c'est pour ça que le bloc « ce que ce
chiffrage ne couvre pas » existe.

## Ce que la table refuse de faire

Trois choses que le plan sait mesurer et que le catalogue ne sait pas recevoir. Elles ne sont pas
perdues en silence : la fonction les rend dans `ignores`, avec leur raison.

- Le **rebouchage d'une ouverture** : aucun poste au catalogue.
- Le **percement d'un mur léger** : seul le mur porteur a ses deux postes.
- L'**escalier métallique** : le catalogue a le bois et le béton.

Ce sont des trous de catalogue, pas des trous de correspondance — à trancher comme D9 l'a été.
