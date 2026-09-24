# Décisions du fondateur — branchement plan ↔ estimateur

Les seize arbitrages posés par l'audit, tranchés les 18 et 19 septembre 2026. Ce fichier fait foi :
l'audit pose les questions, celui-ci porte les réponses.

| | décision | état |
|---|---|---|
| **D1** | Le plan envoie le **delta** (il sait, par objet, existant / à créer / à déposer) ; le moteur n'est pas modifié. **Et l'utilisateur est renvoyé sur l'estimateur détaillé pour valider avant chiffrage définitif.** | à implémenter |
| **D2** | Le doublage ITI est porté par **« Isolation des murs par l'intérieur »** (55 €/m², TVA 5,5 %), pas par « Doubler un mur ». | ✅ fait (`b769642`) |
| **D3** | Un plan importe **toujours en logement entier**. Le plan n'écrit donc jamais `ctx.espaces` ni `perimetre:"piece"`. | acquis |
| **D4** | Mappage explicite des 20 types de pièces vers les 8 compteurs. | ✅ fait (`51fbf9a`) |
| **D5** | La **surface habitable** reste la surface affichée (c'est elle qui donne le €/m² et le repère marché). Garage, cave et combles sont facturés en **lignes propres mesurées** par le plan. Rien à changer dans le moteur. | à implémenter |
| **D6** | Le plan **demande le type de douche** : bac + colonne + paroi (1 209 €, défaut), à l'italienne (1 228 €) ou cabine (836 €). | ✅ demandé et émis |
| **D7** | Une double vasque = **1 meuble en variante « double »** (909 €), jamais 2 unités. Le piège à ne jamais produire : 2 unités **et** la variante = 1 817 € et 4 robinetteries. | à implémenter |
| **D8** | « Parquet » projeté : le plan **déduit de l'existant** — parquet existant + parquet projeté = ponçage (869 € les 20 m²), sinon parquet neuf (2 020 €). Corrigeable au double check. | à implémenter |
| **D9** | Trois postes créés : **Abattre un mur porteur** (110 €/m²), **Poutre de reprise de charge IPN/HEA** (480 €/ml) et **Monter un mur en pierre** (250 €/m²). Prix relevés sur le marché et croisés avec trois devis réels, validés le 19/09/2026. | ✅ fait (`48773c7`) |
| **D10** | La hauteur de faïence est **un réglage par salle de bain** dans le plan : zone douche (4 m²), mi-hauteur (13,4 m², défaut) ou pleine hauteur (22,8 m²) — mesuré, sur l'exemple d'une SDB de 6 m². La cloison hydrofuge suit la surface réelle des cloisons de pièce humide, que le plan mesure déjà. | ✅ réglage posé et émis ; le calcul de surface vient avec la table de correspondance |
| **D11** | Le plan **coche** un poste au forfait, il ne l'alimente **jamais** en quantité. Aucun prix affiché ne bouge. | acquis |
| **D12** | Une quantité corrigée à la main **épingle la ligne** : le plan cesse de l'alimenter et signale l'écart (« tu as fixé 12 u, le plan en mesure 14 »). | à implémenter |
| **D13** | L'estimation **reste écrite** ; le plan y écrit, chaque ligne gardant sa provenance. Un projet sans plan continue de fonctionner à l'identique. | acquis |
| **D14** | État **« Conservé »** distinct de « rien de prévu » — mais **seulement sur les équipements et les menuiseries**, là où la question « je garde ou je remplace » se pose vraiment. Pas sur les murs : personne n'arbitre un mur qu'il garde, et la rangée y revenait à quatre colonnes pour rien. Le bloc de couverture lit l'écart et l'annonce en euros, pas en nombre d'éléments. | ✅ fait |
| **D15** | Quand un objet peut alimenter deux postes, **c'est l'objet qui porte l'attribut** — escalier bois / béton, point lumineux spot / plafonnier / suspension. Même mécanique que la douche (D6). | ✅ escalier et point lumineux ; **le plancher créé reste à faire** — c'est une propriété de niveau, pas d'objet |
| **D16** | **Un identifiant stable pour les 203 postes** ; le libellé devient un affichage, renommable librement. **Sans migration de base** : un renommage s'écrit dans la table d'alias, et les projets enregistrés se relisent tout seuls. | ✅ fait |

---

## Ce que ça ouvre

L'audit bloquait sa phase 3 (table de correspondance) sur D6, D7, D8, D9, D11 et D15, et sa phase 4
(injection) sur D1, D3, D4, D12 et D13. **Les deux sont débloquées** : plus aucune décision en attente.

Ordre de travail qui découle des décisions :

1. ~~**D16 d'abord.**~~ Fait. Chaque poste porte un `id` gelé, un renommage se déclare dans
   `ALIAS` (`lib/estimateur/identite.ts`) et trois tests de garde font échouer le build si le
   moteur cite un poste qui n'existe plus. La table de correspondance peut être clée dessus.
2. ~~**Les attributs d'objet** (D6, D15) et le réglage de faïence (D10).~~ Faits, contrat 1.1.0.
   Reste le matériau du plancher créé, qui se règle au niveau et pas sur un objet.
3. ~~**L'état « Conservé »** (D14).~~ Posé sur les trois familles et émis. Reste à lui faire dire
   quelque chose dans le bloc « ce que ce chiffrage ne couvre pas ».
4. **La table de correspondance** (phase 3), puis **l'injection** (phase 4) avec l'épinglage de D12
   et le renvoi vers le double check de D1.
5. **D5** au passage : sortir les locaux non habitables des agrégats de peinture et de plinthes, et
   les émettre en lignes par pièce — le plan porte déjà `wallArea` et `plinthes` par pièce.

## Les chiffres qui ont servi à trancher

Tous mesurés sur le vrai catalogue, TTC, finition standard, CP 33620 — aucun n'est estimé.

- Une pièce de plus au compteur : **1 152 €** aujourd'hui, **149 €** une fois le plan branché.
- Une salle de bain de plus : **3 111 €** aujourd'hui, **913 €** après injection (dont 858 € de
  faïence, que D10 rend enfin mesurée).
- Faïence d'une SDB de 6 m² : 858 € au forfait actuel · 286 € en zone douche · 958 € à mi-hauteur ·
  1 630 € en pleine hauteur.
- Douche : bac 450 · colonne 335 · paroi 424 · italienne 1 228 · cabine 836. Les cinq cochés
  ensemble, ce qui n'est interdit nulle part aujourd'hui : 3 273 €.
- Sols pour 20 m² : moquette 715 · souple 915 · stratifié 1 018 · carrelage 1 430 · parquet neuf
  2 020 · béton ciré 2 345. Ponçage d'un parquet existant : 869.
- Doublage ITI facturé deux fois (D2, corrigé) : **4 646 €** sur un T3 de 70 m².

## D17 · Ossature dessinée : poteaux et poutres

Une poutre n'existait que comme ligne **induite** par la démolition d'un mur porteur. Elle est
maintenant dessinable, le poteau aussi, avec portée, section et matériau.

Prix de la maquette, fourni-posé, **validés le 18/09/2026** :

| | acier (IPN/HEB) | bois lamellé-collé | béton armé |
|---|---|---|---|
| **Poutre**, €/ml de portée | **480** | **190** | **260** |
| **Poteau**, €/unité | **550** | **350** | **450** |

D'où ils viennent — aucun n'est inventé :

- **Poutre acier 480 €/ml** : reprend `PRIX.poutreReprise` déjà en place depuis D9, inchangé.
  Recoupé sur une poutre de 4 m → 1 920 €, à l'intérieur de la fourchette « IPN posé
  1 500–3 500 € » relevée sur le marché.
- **Lamellé-collé 190 €/ml** : fourniture relevée à 30–160 €/ml, et la pose coûte à peu près
  autant que la fourniture. Milieu de fourchette doublé.
- **Béton armé 260 €/ml** et les trois poteaux : extrapolés du générateur de prix CYPE
  (1 075–1 177 €/m³ pour un poteau béton armé, coffrage et acier compris), majorés de l'étaiement
  que ce prix ne couvre pas en rénovation. Ce sont les quatre valeurs les moins directement
  sourcées du lot.

**Règle du double comptage.** Une poutre **à poser** le long d'un mur marqué « à démolir » EST sa
reprise de charge : la ligne induite disparaît. Éloignée, les deux lignes coexistent. Une poutre
déjà en place ne remplace rien (D1 : seul le delta est facturé). La maquette et la table de
correspondance appliquent la même règle — elles divergeaient au premier jet.

**Les cinq postes ont été créés** le 19/09/2026 — le catalogue passe de 203 à **208**. La poutre
acier existait depuis D9 ; s'ajoutent la poutre lamellé-collé, la poutre béton armé et les trois
poteaux. Chaque matériau a son poste, comme le catalogue distingue déjà « ouvrir un mur porteur »
petite et grande : ce ne sont pas les mêmes prix, et un seul poste aurait obligé à chiffrer du
bois au tarif de l'acier.

Part fourniture (`sm`) déduite, non validée séparément : 90 / 70 €/ml pour les poutres bois et
béton, 190 / 120 / 110 € pour les trois poteaux. L'acier garde ses 180 €/ml d'origine. Elle ne
sert qu'au mode « je le fais moi-même » ; le fourni-posé, lui, est validé.

Les six valeurs de la maquette sont désormais **comparées automatiquement** au fourni-posé de leur
poste par `tools/coherence.mjs` : elles ne peuvent plus diverger en silence. La couverture de la
table de correspondance passe de 101/203 à **106/208**.

## D18 · L'estimateur a toujours raison

Décidé le 19/09/2026. La maquette recopiait 94 prix du catalogue ; **14 avaient divergé**. Le plus
gros écart était un facteur 6,6 (plan de travail), le plus coûteux une fenêtre à 550 € quand le
devis en facture 950. Comme le compteur du plan et le devis n'étaient pas encore branchés l'un sur
l'autre, personne ne voyait les deux chiffres côte à côte — le jour du branchement, l'utilisateur
aurait vu **deux prix différents pour le même ouvrage**.

**La règle, maintenant écrite :** le catalogue de l'estimateur détaillé fait foi. La maquette ne
discute pas ses prix, elle les recopie. Aucune valeur de la maquette n'est une opinion.

Les 14 valeurs alignées :

| maquette | avant | après | poste du catalogue |
|---|---|---|---|
| `PRIX.cloisonNeuve` | 55 | **50** | Monter une cloison |
| `PRIX.murNeuf` | 120 | **75** | Monter un mur en parpaings |
| `PRIX.deposeSol` | 30 | **20** | Enlever un revêtement de sol |
| `PRIX.galandage` | 900 | **800** | Caisson à galandage |
| `PRIX.revetement.Carrelage` | 65 | **70** | Carrelage au sol |
| `PRIX.revetement.Parquet` | 75 | **90** | Parquet bois |
| `PRIX.revetement.Moquette` | 40 | **35** | Moquette |
| `PRIX.menuiserie.porte_entree` | 1500 | **1600** | Porte d'entrée |
| `PRIX.menuiserie.garage` | 1500 | **1200** | Porte de garage |
| `PRIX.menuiserie.fenetre` | 550 | **950** | Fenêtres |
| `PRIX.menuiserie.baie` | 1900 | **2200** | Baie vitrée |
| `EQUIP_PRIX.lavabo` | 310 | **433** | Meuble-vasque |
| `EQUIP_PRIX.vasque2` | 593 | **814** | Meuble-vasque, variante « double » (433 × 1,88) |
| `EQUIP_PRIX.plan` | 985 | **150** | Plan de travail seul (€/ml) |

**Trois corrections ne sont pas de simples nombres — la correspondance elle-même était fausse.**

- **`lavabo`.** Le contrôle le comparait au poste « Vasque » (150 €). Or la table de
  correspondance en fait un **« Meuble-vasque »** (433 €) : c'est ce que le devis facturera. Le
  contrôle validait la ressemblance d'un nom, pas l'ouvrage. Corrigé dans `coherence.mjs`.
- **`vasque2`.** Une double vasque est UNE unité du même poste en variante « double » (D7), donc
  433 × 1,88. Le contrôle ne savait pas lire un coefficient de variante ; il en lit un maintenant.
- **`plan`.** La maquette chiffrait 900 (meubles de cuisine) + 85 (plan de travail *plomberie*,
  celui d'une vasque à poser) = 985 €/ml. Le contrat, lui, n'envoie qu'un seul poste : « Plan de
  travail seul », 150 €/ml. Les meubles ne sont pas dessinés, donc ils ne sont pas chiffrés. La
  maquette facturait une cuisine entière pour un trait de plan de travail.

**Trois prix quittent la liste « sans poste ».** `fenetre_p` (petite fenêtre) part sur le même
poste « Fenêtres » que les autres : le compteur ne peut pas promettre une remise de 600 € que le
devis ne fera pas. `lave_linge` et `lave_vaisselle` deviennent « Créer / déplacer un point d'eau »
(190 €) — ils étaient déjà à 190 par coïncidence, et auraient dérivé sans que rien ne le dise.

Le contrôle passe de 80/94 à **97/97 alignés**, et la liste des prix hors catalogue de 12 à 9
(rebouchage, percement d'un mur non porteur, linteau/tableaux, retour d'isolant, dépose
d'équipement, finition béton, porte double, passage sans porte, pose d'un réfrigérateur). Ces
neuf-là chiffrent de vrais ouvrages que le catalogue ignore : ce sont des postes à créer, pas des
divergences.

Conséquence chiffrée sur la scène de référence : l'arbitrage « si tu les remplaçais » passe de
810 à **933 €**. Aucun autre champ du contrat ne bouge — les prix n'y ont jamais circulé.

## D19 · Les neuf ouvrages abandonnés

Décidé le 19/09/2026, dans la foulée de D18. Une fois les 14 prix recalés, il restait neuf prix
de la maquette qui chiffraient un ouvrage **sans poste au catalogue**. Dani a tranché : « met tout
à 0 dans la maquette, on abandonne ces postes ».

Le mélange qui existait était le pire des trois : la maquette annonçait un montant, la table de
correspondance n'avait rien à alimenter, et le devis ne portait pas la ligne. Personne ne voyait
la différence — quatre de ces neuf disparaissaient en remontant une ligne « ignoré » à l'import,
les cinq autres **en silence**.

| prix | avant | ouvrage abandonné | l'import le signalait ? |
|---|---|---|---|
| `PRIX.boucher` | 90 €/m² | rebouchage d'une ouverture | oui |
| `PRIX.percLeger` | 320 €/u | percement d'un mur non porteur | oui |
| `PRIX.menuiserie.porte_double` | 600 €/u | porte double intérieure | oui |
| `EQUIP_PRIX.frigo` | 80 €/u | pose d'un réfrigérateur | oui |
| `PRIX.deposeEquip` | 60 €/u | dépose d'un équipement | **non** |
| `PRIX.betonFini` | 45 €/m² | finition béton lissé / quartzé | **non** |
| `PRIX.jambagesMl` | 35 €/ml | linteau et tableaux | **non** |
| `PRIX.retourIso` | 28 €/ml | retour d'isolant en tableau | **non** |
| `PRIX.menuiserie.passage` | 110 €/u | passage sans porte | **non** |

**Le passage sans porte n'était pas un trou, c'était un désaccord.** La table de correspondance
l'exclut explicitement — « une ouverture sans porte n'a rien à poser ». L'estimateur disait 0, la
maquette disait 110 : sous D18, c'est la maquette qui avait tort.

**Le linteau et les tableaux** ne manquent pas non plus vraiment : le forfait « Ouvrir un mur
porteur » (2 500 / 4 500 €) les porte déjà. Les facturer une seconde fois au ml était un double
comptage.

**Zéro n'est pas un oubli, c'est la décision.** `tools/coherence.mjs` ne se contente plus de
lister ces neuf prix en « à savoir » : il **vérifie qu'ils valent 0**, et échoue sinon. Pour en
rouvrir un, il faut d'abord créer son poste au catalogue, puis le déplacer dans `PRIX_MAP`.

**La tâche reste, le prix part.** Un ouvrage abandonné continue d'apparaître dans le suivi de
chantier — il faudra bien le faire — avec la mention **« non chiffré : aucun poste au catalogue »**.
Sans ce mot, la ligne figurait au suivi et manquait au total sans que rien ne l'explique, ce qui
recréait exactement la panne qu'on venait de fermer. `detailTache()` le pose pour toutes les
tâches à prix nul, sauf celles déjà expliquées autrement (la PAC extérieure, « incluse dans le
split »).

**Un bug trouvé en vérifiant.** Le prix de pose d'une menuiserie se lisait
`PRIX.menuiserie[type] || 500` : un prix mis à 0 retombait sur le défaut de 500 €. Un passage sans
porte repartait donc à 500 € au lieu de 0. Corrigé en `??` ici et sur le revêtement de sol, qui
portait le même piège en sommeil.

## D20 · Les prix sont alignés ; les ACTIONS, pas encore

Mesuré le 19/09/2026, en réponse à une question de Dani : « chaque action de maquette a une
réponse avec l'estimateur ? » `coherence.mjs` compare des prix unitaires — il ne dit rien de ce
qu'une action DEVIENT. Nouvel outil : **`maquettes/tools/couverture.mts`**. Il construit la scène
de référence, lit ce que la maquette ANNONCE (ses tâches et leurs prix) et ce qu'elle ÉMET (son
contrat), passe le contrat dans la vraie table de correspondance, valorise les lignes au catalogue
et rapproche les deux **par identifiant d'élément** — jamais par libellé.

Verdict sur la scène de référence : **compteur 40 427 € · devis 45 572 € · +12,7 %.**

L'écart ne vient d'aucun prix — ils sont alignés. Il vient de trois familles :

**1. Des ouvrages que l'estimateur DÉRIVE et que le compteur ignore** (~3 600 €) : plinthes (654),
faïence (1 593), faux plafond (630), cloison hydrofuge (688), chape traditionnelle (442),
robinetterie de baignoire (260), colonne et paroi de douche (680). Le plan les MESURE et les
transmet — il ne les compte simplement pas dans son total.

**2. Deux règles qui n'existent que d'un seul côté.** D8 : un parquet posé sur un parquet existant
se ponce (912 €) au lieu de se remplacer (2 049 €) — la maquette ne connaît pas la règle, elle
sur-compte de 1 137 €. D15 : un spot encastré (45 €) n'est pas un plafonnier (110 €) — la maquette
applique un prix unique.

**3. Une prise double** compte pour 2 unités au devis, pour 1 dans la maquette.

Un seul trou de traçabilité, signalé à part : le **doublage** arrive au devis en AGRÉGAT, sans
identifiant de mur. La ligne est bien facturée, mais elle ne se rattache à aucun mur dessiné — ce
que D1 exige pourtant de toute ligne injectée. À corriger au prochain numéro de contrat.

### Le bug que cette mesure a fait sortir : le plancher compté deux fois

**Deux règles posaient un plancher.** Celle du NIVEAU (« étage créé », D15) et celle de la PIÈCE
(« pas de plancher », contrat 1.8). Or cocher « étage créé » sur un étage déjà dessiné passe
justement toutes ses pièces en « pas de plancher » : les deux se déclenchaient ensemble et
`add()` fusionnait les deux lignes en additionnant les quantités. **14,44 m² de plancher sortaient
facturés 28,88 m²**, soit 1 300 € de trop sur l'ouvrage le plus cher d'une création d'étage.

Même famille que le double comptage de toiture que Dani avait attrapé : deux chemins qui mesurent
la même chose sans savoir l'un de l'autre. Corrigé — la règle du niveau ne compte plus que les
pièces que la règle pièce par pièce n'a pas prises — et **verrouillé par un test**.

### ⏳ Point ouvert, à trancher par Dani

Si on coche « étage créé » AVANT de dessiner ses murs, les pièces apparaissent ensuite avec un sol
« à définir ». La maquette **refuse alors de chiffrer le plancher** et affiche un avertissement
(« mets son sol sur Pas de plancher »), tandis que l'estimateur, lui, **le facture** via la règle
du niveau. 1 300 € que le devis porte et que le compteur annonce comme non chiffrés.

- **A** — la maquette le chiffre aussi, au matériau par défaut du niveau, et l'avertissement
  devient « choisis le matériau » au lieu de « ce n'est pas chiffré ».
- **B** — l'estimateur retire sa règle de repli au niveau : rien n'est facturé tant que
  l'utilisateur n'a pas déclaré le plancher pièce par pièce. C'est ce que dit déjà le contrat 1.3
  (« un choix non tranché sort à null, au consommateur d'appliquer le défaut ET de le signaler »).

## D21 · On ne facture rien tant que ce n'est pas décidé sur le plan

Décidé le 19/09/2026 par Dani, sur le point ouvert de D20 : « oui on facture rien tant que c'est
pas décidé sur le plan ».

**Il n'y a plus qu'UNE règle qui pose un plancher** : une pièce qui déclare `plancherACreer`
(contrat 1.8). Le repli qui vivait au niveau — cocher « étage créé » suffisait à facturer le
plancher du niveau entier, au matériau du niveau ou à **bois par défaut** — est retiré.

Deux raisons, et la seconde est la vraie :

1. **Le contrat 1.3 le disait déjà** : « un choix non tranché sort à null, c'est au consommateur
   d'appliquer le défaut ET de le signaler ». Le repli fabriquait un choix — bois — que
   l'utilisateur n'avait jamais fait, sur l'ouvrage le plus cher d'une création d'étage.
2. **Les deux règles se déclenchaient ensemble sur le chemin normal de l'éditeur.** Cocher
   « étage créé » passe justement les pièces en « pas de plancher » : le plancher sortait en
   double, 14,44 m² facturés 28,88.

**Ne rien facturer n'est pas se taire.** Un étage créé dont les pièces ne se prononcent pas
remonte maintenant à l'écran de validation, avec les pièces concernées, leur surface, et le geste
exact qui règle la situation — le même que l'éditeur affiche déjà sur le plan :

> plancher de « Étage » — 1 pièce(s), 14.44 m² → étage créé par le projet, mais son plancher n'est
> pas décidé sur le plan : mets le sol de ces pièces sur « Pas de plancher » et choisis bois ou béton

La maquette n'a pas bougé : elle refusait déjà de chiffrer ce plancher et affichait cet
avertissement. C'est l'estimateur qui s'aligne sur elle, pour une fois — parce que sur ce point
c'est la maquette qui appliquait la règle du contrat.

**Effet mesuré** sur la scène de référence : l'écart compteur ↔ devis passe de **+12,7 % à
+9,5 %**, et `couverture.mts` ne signale plus aucune rupture. Le seuil de l'outil descend de 13 à
**10 %** — il ne remonte jamais.

Ce qui reste dans les 9,5 % est connu et listé en D20 : des ouvrages que l'estimateur dérive et
que le compteur ignore (plinthes, faïence, faux plafond, chape, cloison hydrofuge, robinetterie,
colonne et paroi de douche), la règle D8 du ponçage de parquet, la distinction D15 spot /
plafonnier, et la prise double.

## D22 · Les 9,5 % refermés

Fait le 19/09/2026 : « oui vas-y, referme les 9,5 % ». Sur la scène de référence, le compteur du
plan annonçait **40 427 €** et le devis en facturait **44 272 €**. Les deux chiffres s'affichent à
l'utilisateur, et le compteur était presque toujours **en dessous** — le mauvais sens : un chiffre
qui sous-estime déçoit plus qu'un chiffre qui surestime.

**Après : 44 271 € contre 44 272 €. Écart 0 %** (1 € d'arrondi). Le seuil de `couverture.mts`
descend de 13 % à **1 %**.

### Ce qui manquait : des ouvrages que le plan MESURAIT sans jamais les compter — 4 947 €

| ouvrage | quantité mesurée par le plan | prix |
|---|---|---|
| Faïence / carrelage mural | hauteur de pose × périmètre (D10) | 1 593 € |
| Cloisons hydrofuges | les CLOISONS de la pièce humide, pas ses murs extérieurs | 688 € |
| Plinthes | périmètre réel, hors portes | 654 € |
| Faux plafond | surface de la pièce | 630 € |
| Chape traditionnelle | *voir le bug de vocabulaire ci-dessous* | 442 € |
| Paroi de douche | 1 | 380 € |
| Colonne de douche | 1 | 300 € |
| Robinetterie de baignoire | 1 | 260 € |

**Trois objets ne sont pas une ligne de devis.** Une douche, c'est un receveur + une colonne + une
paroi — sauf la cabine, qui est un bloc. Une baignoire vient avec sa robinetterie. Le devis le
savait déjà ; le compteur perdait 940 € sans rien dire.

### Trois règles qui n'existaient que d'un côté — −1 102 €

- **D8** : un parquet posé sur un parquet existant se **ponce** (40 €/m²), il ne se remplace pas
  (90 €/m²). La règle vivait dans la table de correspondance seule. −1 137 €.
- **D15** : un spot encastré (45 €) n'est pas un plafonnier (110 €). La maquette appliquait un
  prix unique. −65 €.
- Une **prise double**, c'est **deux** prises au devis. +100 €.

### Le bug que la fermeture a fait sortir : deux mots pour la même chape

La table de correspondance cherchait `chape === "traditionnelle"`. L'éditeur écrit **`"tradi"`**
(`setRoomSol('chape','tradi')`). **Une chape traditionnelle dessinée n'était donc jamais
facturée** — 442 € muets sur chaque salle de bain qui en demande une.

Le contrôle de couverture ne l'avait pas vu, et c'est le plus instructif : la scène de référence
posait `chape:'traditionnelle'` **à la main**, avec l'orthographe longue que l'éditeur n'écrit
jamais. Une scène de test qui fabrique ses données au lieu d'emprunter le vocabulaire du produit
valide le test, pas le produit. La scène utilise désormais `'tradi'`.

### Ce qui reste, et qui n'est pas un écart

`couverture.mts` ne rend plus de verdict sur deux situations où la comparaison élément par élément
serait fausse des deux côtés alors que le total est juste :

- une ligne du devis **partagée entre plusieurs pièces** (les plinthes de trois pièces fusionnées
  en un seul linéaire de 50,34 ml) est rangée sous la première ;
- le **doublage** arrive en agrégat, sans identifiant de mur — trou de traçabilité déjà noté en
  D20, à corriger au prochain numéro de contrat.

Les douze nouveaux prix sont tenus par `coherence.mjs` : **110/110 alignés**. L'écart ne peut plus
se rouvrir en silence.

## D23 · Le doublage se lit mur par mur — et un doublage déjà en place ne se facture pas

Fait le 19/09/2026, sur le dernier point noté en D20 et D22 : « vas-y corrige le doublage aussi ».
Le trou annoncé était de traçabilité. Il y en avait un second, plus grave, caché derrière.

**Le contrat portait déjà le détail mur par mur.** `provenance.doublages` donne, pour chaque
couche : le mur, le mode (ITI / ITE), le matériau, **l'état** et la surface. Personne ne le lisait :
la table de correspondance se servait de l'agrégat `doublage.iti`.

### Le bug : 688 € facturés sur un mur déjà isolé

L'agrégat compte **tout ce que la vue Projet montre**, y compris un doublage déjà en place. Sur
une scène où un mur de 12,5 m² est déjà isolé et un autre de 20 m² est à doubler, le contrat émet
`iti: 32,5` — et le devis facturait les 32,5, soit **688 € pour un ouvrage qui existe**. C'est
exactement ce que D1 interdit : seul le delta se facture.

La maquette, elle, avait toujours raison sur ce point — son compteur filtre `io.st !== 'creer'`.
Comme pour le plancher (D21), c'est l'estimateur qui s'aligne sur elle.

### Le trou annoncé : des lignes orphelines

Une ligne sans source ne se rattache à aucun objet du plan. D1 exige l'inverse : chaque ligne
injectée doit dire d'où elle vient, sinon l'écran de validation ne peut pas la montrer sur le
dessin et l'utilisateur ne peut pas la contester. Le doublage et la façade arrivaient tous deux
sans source.

**Les deux se lisent désormais par mur**, groupés par mode pour le doublage et par poste pour la
façade, avec la liste des murs en `sources`. Sans `provenance` — un plan émis par une version
antérieure de l'éditeur — on retombe sur l'agrégat : moins juste, mais jamais vide.

La façade n'avait pas le bug d'état : son agrégat ne comptait déjà que le neuf. Elle gagne
seulement la traçabilité.

### Vérifié

Sur la scène de référence augmentée d'un mur déjà doublé : **compteur 44 237 € · devis 44 236 €**.
Avant le correctif, le devis en aurait annoncé 44 924. Deux tests verrouillent les deux points :
la ligne de doublage porte des identifiants de mur, et une couche `etat: "existant"` n'ajoute pas
un m².

`couverture.mts` perd son exception « doublage transmis en agrégat » : elle n'a plus lieu d'être.

## D24 · Revue des étapes de chantier : ce que le plan disait et que le devis n'écoutait pas

Revue du 20/09/2026, lot par lot, sur les 208 postes du catalogue. Le plan en alimente 106 ; le
reste se partage entre des forfaits que l'utilisateur coche lui-même (diagnostics, mairie, aides,
benne, location de matériel, raccordements aux réseaux) et des ouvrages qu'un dessin ne peut pas
connaître. Cinq trouvailles, dont une qui portait sur mes propres outils.

### 0. Le contrôle mesurait à côté

`couverture.mts` valorisait chaque ligne au **prix brut du catalogue**. Or le moteur applique des
coefficients — matériau, vitrage, motorisation, taille. Il annonçait donc « 0 % d'écart » en
comparant à un prix que personne ne facture. Il appelle maintenant `effPrices`, le calcul du
moteur lui-même, au lieu de refaire les coefficients à la main.

**Et il ne tourne plus sur une seule scène.** Le bug de la chape (D22) était passé par un chemin
que le témoin ne parcourait jamais. Une **seconde scène** exerce désormais le bois, le triple
vitrage, le galandage, la trémie et le doublage existant. Elle a immédiatement trouvé le point 5.

### 1. Le matériau des menuiseries ne changeait aucun prix

Le plan proposait PVC, alu et bois. Le compteur ignorait le choix, et la table de correspondance
ne le transmettait pas : le devis retombait sur son défaut. Au catalogue, **l'alu coûte 67 % de
plus que le PVC** (`MAT_COEF` : alu 1, PVC 0,60). Une fenêtre à 950 € ou à 570 €, selon un choix
que personne n'écoutait.

Cause technique : `Contribution.variante` écrit dans `s.vsel`, alors que le moteur lit le matériau
et le vitrage sur `s.mat` / `s.vit`. Passer par `variante` revenait à n'envoyer rien du tout. La
contribution porte donc maintenant `mat` et `vit` en propre, et le regroupement final les prend
dans sa clé — deux fenêtres de matériaux différents ne fusionnent plus en une ligne.

### 2. Le bois n'existait pas au moteur

Choix offert sur le plan, absent du catalogue. **`MAT_COEF.bois = 1,05`**, ajouté le 20/09/2026.

Le rapport vient de trois comparatifs 2026 qui chiffrent le **même produit** dans les trois
matériaux — c'est la seule comparaison honnête, les fourchettes larges mélangeant les essences :

| | alu | bois | rapport |
|---|---|---|---|
| Fenêtre 135 × 120 | 1 000 € | 1 030 € | 1,03 |
| Porte-fenêtre 215 × 120 | 1 390 € | 1 430 € | 1,03 |
| Baie 215 × 240 | 1 730 € | 1 850 € | 1,07 |

Contrôle de la méthode : les mêmes sources donnent PVC/alu ≈ 0,69, à comparer au 0,60 déjà validé
au catalogue — même ordre de grandeur, le catalogue restant le plus prudent. **Réserve assumée :**
le bois s'étale plus que les autres matériaux — un pin d'entrée de gamme passe sous l'alu, un
chêne le dépasse de près de 20 %. Un coefficient unique sera toujours un peu faux pour quelqu'un.

Sources : [architecteo](https://architecteo.com/prix-fenetre-alu-pvc-bois.html) ·
[lecoindesartisans](https://lecoindesartisans.fr/blog/comparatif-fenetres-pvc-alu-bois-prix-performance) ·
[travaux.com](https://www.travaux.com/fenetre-porte/guide-des-prix/comparatif-de-prix-fenetre-pour-bien-choisir)

Le moteur accepte donc un troisième matériau (`effPrices` ne teste plus « PVC ou alu » mais lit le
coefficient commun), et l'estimateur détaillé affiche le bouton **Bois**. Aucun prix existant ne
bouge : alu et PVC sont inchangés.

### 3. Le volet ne suivait pas sa fenêtre

Le catalogue donne au volet son propre coefficient PVC (**0,80**, pas 0,60). Le moteur l'appliquait,
la maquette non : elle affichait un volet alu sur une fenêtre PVC, **130 € de trop par volet**. Le
volet prend maintenant le matériau de sa menuiserie, des deux côtés.

### 4. Le caisson à galandage n'arrivait jamais au devis

Le contrat portait le choix dans `ouvrant` ; rien ne le lisait. Le compteur annonçait **800 €** que
le devis ne facturait pas. Une porte à galandage paie désormais sa menuiserie **et** sa poche.

### 5. Le garde-corps de trémie n'était facturé nulle part

Un escalier créé ouvre un vide dans le plancher : le garde-corps est obligatoire, le plan en mesure
déjà le pourtour exact — et ni le compteur ni le devis ne s'en servaient. **180 €/ml** perdus.

Contrat **1.10** : `tremiePerimNeuf` par pièce. On ne lit pas `tremiePerim` : une trémie qui existe
déjà a déjà son garde-corps (D1).

### 6. Les percements arrivaient en agrégat

Même motif que le doublage (D23) : `travaux.percementsDetail` n'a pas d'identifiant, donc le devis
portait jusqu'à **19 000 €** de percements qui ne se rattachaient à aucune ouverture du plan.

Contrat **1.11** : `provenance.ouvertures[].percement` dit, pour chaque ouverture, le percement
qu'elle provoque. L'agrégat reste le repli pour un plan d'une version antérieure.

### Fausse alerte : la peinture

J'ai d'abord compté 0/10 postes de peinture alimentés et cru à un trou. Le moteur la calcule seul
(`surface × hauteur`) : elle est bien facturée. Le plan mesure mieux — 122 m² réels, ouvertures
déduites — mais c'est une amélioration de précision, pas un ouvrage manquant.

### Résultat

Deux scènes, **écart 0 %** dans les deux, aucune rupture de couverture. `coherence.mjs` tient
désormais **111 prix** et, nouveauté, les **5 coefficients** que la maquette recopie du moteur —
ce sont eux qui avaient dérivé sans qu'aucun contrôle de prix puisse le voir.

## D25 · Le galandage se choisit sur la menuiserie, plus dans la plâtrerie

Décidé le 20/09/2026 par Dani : « il faudrait un truc genre on choisit entre baie vitrée classique
ou à galandage comme PVC ou alu ou bois, plutôt que dans plâtrerie — comme ça les gens peuvent pas
le louper ».

**Le constat.** Le « Caisson à galandage » était une ligne du lot **Cloisons / Plâtrerie**, décochée,
**sans quantité automatique** et qu'**aucun préréglage ne coche** — le mot n'apparaît pas une fois
dans `presets.ts`. Donc : jamais compté en mode rapide, et en détaillé seulement si l'utilisateur
savait qu'une baie à galandage a besoin d'une poche dans la cloison. **800 € que personne ne
cochait.**

**Ce qu'on a fait.** Le choix remonte là où il se fait vraiment — sur la menuiserie, à côté du
matériau et du vitrage :

- **Baie vitrée** → *Coulissante* / *À galandage*
- **Porte intérieure coulissante** → *En applique* / *À galandage*

La poche, elle, **reste dans la plâtrerie** : c'est là qu'elle se réalise, et le devis doit garder
ses corps d'état justes. Elle n'est simplement plus à cocher — `autoQty` la déduit du nombre de
menuiseries posées à galandage, et cocher « à galandage » l'allume.

**Le piège qu'il a fallu désamorcer d'abord.** `finCoefTask` renvoie 1 dès qu'un poste porte des
`vars` — « piloté par variante ». Ajouter un simple choix à la porte coulissante lui aurait donc
retiré son coefficient de finition, c'est-à-dire **changé son prix** pour tous les utilisateurs qui
ne dessinent aucun plan. Un choix ne « pilote le prix » que s'il le déplace : la règle teste
maintenant qu'une option au moins ait un coefficient ≠ 1, ou que le poste ait une grille de prix
exacts (le sèche-serviette, dont toutes les options valent 1 mais dont la grille fixe le prix).

Témoin avant / après, sur les 208 postes :

| | éco | standard | premium |
|---|---|---|---|
| somme des coefficients de finition | 177,41 | 187,08 | 208,00 |

Identique dans les deux sens, et la somme des fourni-posé effectifs reste à **138 954 €**. Aucun
prix existant ne bouge.

**Dans l'éditeur.** Le galandage n'était proposé que sur une baie ; une porte coulissante héritait
du jeu des portes battantes (*battant, oscillo, coulissant, fixe*), ce qui n'a aucun sens pour
elle. Elle a désormais son propre choix — *en applique* ou *à galandage* — et le plan transmet la
pose à l'estimateur, pour qu'une ligne importée affiche le même état que si elle avait été cochée à
la main.

**Pas de double comptage.** Le plan épingle la poche (quantité manuelle, D12) : sa quantité ne se
redéduit pas par-dessus. Les deux scènes de `couverture.mts` restent à **0 %**.

## D25 bis · Le prix voyage avec l'option

Dani, le 20/09/2026 : « on choisit sur la baie vitrée mais y a pas de différence de prix haha, il
faut que tu rajoutes le prix dans l'option ».

Il avait raison et le défaut était réel : cocher « à galandage » faisait bien monter le devis de
800 €, mais **rien ne bougeait là où le clic se faisait**. Un choix dont on ne voit pas l'effet
ressemble à un choix cassé.

**Une option peut désormais DÉCLARER le poste qu'elle déclenche** — champ `induit` sur l'option du
catalogue. Deux choses en découlent, sans qu'aucun nom soit écrit en dur :

- **L'affichage.** L'option porte le surcoût, lu au catalogue à l'exécution et calculé comme le
  devis le calculera — finition et coefficient régional compris. En éco 725 €, en standard 749 €,
  en premium 800 €. Le jour où la poche change de prix, l'étiquette change avec elle. C'est la
  règle du projet : aucun prix écrit en dur.
- **La quantité.** `autoQty` ne nomme plus « Baie vitrée » et « Porte intérieure coulissante » une
  à une : il parcourt le catalogue et additionne les lignes dont l'option choisie désigne le poste.
  La version précédente les citait en dur — le mécanisme aurait été oublié au troisième cas.

Un détail qui a demandé une reprise : un poste désigné par une option devient **déduit**, et rend
donc 0 plutôt que null même quand aucune ligne ne le déclenche. Sinon, repasser une baie de
« galandage » à « coulissante » laissait la poche sur sa dernière quantité, saisie à la main et
plus jamais révisée.

`core.ts` importe maintenant le catalogue. Pas de cycle à l'exécution : `catalog.ts` n'en tire
qu'un type, effacé à la compilation.

## D25 ter · Cocher une ligne, c'est en demander une

Signalé par Dani le 20/09/2026 : « quand je sélectionne à galandage ça ne s'ajoute pas au
compteur ». Reproduit, et le galandage n'y était pour rien — **deux** défauts derrière.

**1. Cocher un poste sans quantité automatique ne coûtait rien.** Tout le lot *Menuiseries
extérieures* est manuel : cocher « Baie vitrée » posait une ligne à **0 €** jusqu'à ce qu'on tape
un nombre. La poche du galandage suit la baie — 0 baie, 0 poche. Ce n'est donc pas le galandage
qui ne s'ajoutait pas, c'est la baie qui ne valait rien.

Une ligne cochée qui ne coûte rien ressemble à une panne. Cocher, c'est en demander **au moins
une** : la quantité par défaut passe à 1 pour les postes sans quantité automatique, comme elle
l'était déjà pour la location de matériel. Les postes à quantité automatique ne bougent pas — la
leur est calculée. Et rien n'est rétroactif : le défaut ne s'applique qu'au moment du clic, les
projets enregistrés gardent leurs quantités.

**2. `quantiteInduite` refaisait le calcul de quantité au lieu de le demander.** Elle testait
`s.manual ? s.qty : autoQty(...)` — or une baie cochée porte une quantité SAISIE sans être marquée
`manual`, parce que `qtyOf` ne consulte `manual` que sur les postes automatiques. Résultat : baie à
2 200 €, poche à 0. Elle appelle maintenant **`qtyOf`, et rien d'autre**.

C'est le motif qu'on traque depuis trois jours — deux chemins qui mesurent la même chose — et je
venais de l'écrire moi-même, la veille du jour où j'ai fini de le corriger ailleurs.

Le parcours complet est désormais tenu par un test, et non plus seulement la déduction sur des
sélections fabriquées à la main :

| | baie | poche |
|---|---|---|
| baie cochée | 2 200 € | 0 € |
| pose « à galandage » | 2 200 € | 749 € (×1) |
| baie passée à 3 | 6 600 € | 2 247 € (×3) |
| retour « coulissante » | 6 600 € | 0 € |
| baie décochée | 0 € | 0 € |

## D26 · Le galandage est une plus-value sur la menuiserie, pas une ligne ailleurs

Dani, le 20/09/2026, après deux tentatives ratées de ma part : « peu importe ce que je mets le prix
ne change pas — il doit y avoir une plus-value sur le total de la baie vitrée ».

**Ce que j'avais fait, et pourquoi c'était à côté.** J'avais posé la poche comme une ligne du lot
plâtrerie, cochée automatiquement quand on choisissait « à galandage ». Comptablement exact — une
poche EST de la plâtrerie — mais le prix de la baie ne bougeait pas d'un euro. Un choix dont le
prix ne change pas là où on clique est un choix qui a l'air cassé, et c'est l'utilisateur qui a
raison contre la comptabilité analytique.

**Le prix est maintenant porté par la menuiserie.**

| | coulissante | à galandage |
|---|---|---|
| Baie vitrée | 2 200 € HT · 2 420 € TTC | **3 000 € HT · 3 300 € TTC** |
| Porte intérieure coulissante | 700 € | **1 500 €** |

**Une addition, pas un coefficient.** C'est le point technique qui décide de tout : un coefficient
est proportionnel, il faudrait donc 1,36 sur une baie à 2 200 € et 2,14 sur une porte à 700 € —
deux chiffres dérivés qui mentiraient le jour où l'un des deux prix bouge. Le supplément est donc
**additif**, et son montant est **lu sur le poste désigné** par l'option (`induit`) : il n'y a
toujours aucun prix écrit en dur.

Il s'ajoute **après** les coefficients de la menuiserie : la poche d'un galandage ne coûte pas
20 % de plus parce que la baie est en triple vitrage. Vérifié par test.

**Plus de ligne séparée.** Le poste « Caisson à galandage » n'a plus de quantité à lui — la lui
rendre le facturerait deux fois. Le plan cesse aussi d'injecter cette ligne : il pose la variante,
le moteur ajoute le prix. Les deux scènes de couverture restent à **0 %**.

**Réserve assumée :** le devis ne montre plus la poche dans le lot plâtrerie. Elle est dans la
ligne « Baie vitrée · à galandage », ce qui déplace ~800 € du lot Cloisons vers le lot Menuiseries
dans la répartition par corps d'état. C'est le prix de la lisibilité, et c'est la lisibilité qui a
été choisie.

## D27 · Deux réglages qui mentaient, retirés

**La finition « Collé » du doublage.** Le plan proposait ossature métallique ou plaque collée
(Placomur). Aucun poste du catalogue ne les distingue : le choix ne déplaçait que l'épaisseur
dessinée, jamais un euro. Dans un outil de chiffrage, un réglage qui ne change pas le prix est un
piège — il laisse croire qu'on affine quelque chose. L'ITI est désormais toujours sur **ossature**,
et le sélecteur disparaît quand il n'y a qu'un système possible (l'ITE garde enduit / bardage, qui
eux ont leurs postes). La branche `colle` reste lue pour qu'un plan déjà enregistré garde sa
géométrie. Si le catalogue gagne un jour un poste « doublage collé », le choix reviendra avec lui.

**Le « +800 € » sur l'option À galandage.** Ajouté le matin même, retiré le soir à la demande de
Dani : « sur les autres endroits on n'a rien écrit, donc on ne va pas préciser la plus-value à un
seul endroit ». Argument juste — ni le matériau, ni le vitrage, ni la motorisation n'affichent leur
écart. En montrer un seul laisse croire que les autres sont gratuits. Le total, lui, bouge à chaque
clic : c'est lui qui informe.

## D28 · L'outil Doublage : on le trace, il ne se pose plus tout seul

Demandé par Dani le 20/09/2026 : « le fait qu'il soit auto ça fait de la merde, il y a des loupés
— si on le place nous-même on contrôle ce qui se passe, et le quantitatif n'a qu'à retranscrire ce
que j'ai dessiné ».

**Ce qui n'allait pas.** Le doublage était une PROPRIÉTÉ du mur : on sélectionnait le mur, on
cliquait « Isoler », et il naissait sur **toute sa longueur**. Sur un mur qui traverse trois pièces,
il s'étalait sur les trois ; en groupe, il s'appliquait à tous les murs sélectionnés d'un coup. On
passait son temps à le retirer plutôt qu'à le poser. Les poignées ● servaient à réparer après coup
ce qu'on n'avait jamais demandé.

**L'outil.** Un vrai outil dans la barre (raccourci **D**). On glisse le long de la **face** du mur
à doubler : le doublage se pose exactement sur la longueur tirée, avec un aperçu à la vraie
épaisseur et le métré en cours de geste. Un **clic sans glisser** prend le mur entier — c'est le
cas courant, et l'exiger au glissé obligerait à viser deux bouts pour dire « ce mur-là ».

Le panneau de l'outil porte les réglages du prochain doublage : par l'intérieur ou l'extérieur,
isolant, épaisseur, avec le R et l'épaisseur perdue affichés avant de tracer.

**Il reste ancré à sa face, et ce n'est pas un détail d'implémentation.** C'est ce qui fait
fonctionner quatre choses qu'un trait libre ne saurait pas :

- le **retour d'isolant en tableau** des ouvertures ;
- la **tapée des menuiseries**, calée sur l'épaisseur du doublage ;
- la **cloison qui s'arrête contre le doublage** et non contre le mur ;
- et le devis, qui a besoin de savoir que le mur doublé donne sur l'**extérieur** pour appliquer
  l'ITI plutôt qu'autre chose.

**Aimantation aux jonctions.** L'abscisse se cale sur les arrêts naturels du mur — ses bouts et
chaque point où un autre mur le touche — à 30 cm près. Un doublage s'arrête contre une cloison,
pas au milieu de nulle part, et `detectFaces` a déjà coupé le mur à ces endroits : une arête est
donc soit entièrement doublée, soit pas du tout, ce qui garde exactes à la fois la surface de la
pièce, la quantité chiffrée et le dessin.

**Vérifié** sur une pièce de 8 × 5 avec un refend à 3 m :

| | attendu | obtenu |
|---|---|---|
| face visée sous le mur nord | mur nord, côté intérieur, t = 0,625 | ✓ |
| aimantation de 0,38 | 0,375 (la jonction du refend) | ✓ |
| doublage tracé de 0 à 3 m | 7,5 m² | ✓ |
| clic simple sur le mur est | +12,5 m² | ✓ |

L'ancien chemin — sélectionner le mur, régler l'isolation dans son panneau — reste en place : il
sert à modifier un doublage existant, et les poignées ● gardent leur rôle d'ajustement fin.

## D28 bis · Un seul chemin pour poser un doublage

Dani, le 20/09/2026, après avoir testé l'outil : « retire le doublage automatique, comme ça on ne
fait que du placement manuel — le mix des deux ça fait de la merde ».

Il a raison, et c'était ma faute de conception : j'avais **ajouté** l'outil sans **retirer**
l'ancien chemin. Deux façons de créer la même chose, dont une qui couvre tout le mur sans qu'on le
demande — on ne savait plus lequel des deux avait posé quoi.

**Désormais, un doublage ne peut naître que d'un tracé.** Trois portes d'entrée ont été fermées :

| | avant | après |
|---|---|---|
| panneau du mur | « Aucune / ITI / ITE » — créait sur tout le mur | modifie ou **retire** celui qui est là |
| panneau d'une face | « Aucune / Doubler » — créait sur toute la face | modifie ou **retire** |
| groupe de murs | appliquait ITI/ITE à tous d'un coup | **retire** seulement |

Là où il n'y a pas de doublage, le panneau ne propose plus un bouton : il dit où est l'outil.
Poser d'un clic un doublage sur dix murs, c'était s'engager à en retirer sur sept.

**Le retrait en masse reste**, lui, parce qu'il n'invente rien — effacer d'un coup est sans risque,
c'est créer d'un coup qui ne l'était pas.

Vérifié : le panneau ne crée plus rien (`setWallIso('mode','iti')` sur un mur nu ne produit aucun
doublage), l'outil pose bien ses 10 m², le panneau modifie toujours l'épaisseur d'un doublage tracé
(140 mm), le groupe n'applique pas et retire bien. Quinze contrôles verts, couverture à 0 %,
contrat inchangé, 151 tests.

## D28 ter · Un mur, plusieurs pièces, plusieurs doublages

Dani, le 20/09/2026 : « tu peux avoir un grand mur, mais quand tu cliques il faut que l'isolation
se mette seulement sur le mur de la pièce — si un autre mur tape ce même mur, c'est qu'il y a une
autre pièce, donc il faut pouvoir les traiter indépendamment ».

**Deux choses manquaient**, et la seconde était invisible tant qu'on n'avait pas la première.

**1. Le clic prenait tout le mur.** Il prend maintenant le **tronçon de la pièce cliquée** : entre
les deux jonctions qui encadrent le point. Un mur de façade longe souvent trois pièces ; en doubler
une ne dit rien des deux autres. Sur un mur sans jonction, le tronçon est le mur entier — le geste
garde son sens évident dans le cas simple.

**2. Un mur ne pouvait porter que DEUX doublages**, `iso` et `iso2`, un par face. Donc sur un mur
qui longe trois pièces, doubler la troisième **effaçait la première**. Le stockage devient une
liste : autant de doublages que de tronçons, chacun avec son étendue. `iso`/`iso2` restent lus pour
les plans déjà enregistrés et se convertissent à la première modification.

Ce qui se **chevauche** est remplacé — repasser sur un tronçon le refait, ça n'en empile pas un
second. Ce qui ne se chevauche pas cohabite : c'est une autre pièce.

Le dessin, le contrat et le suivi de chantier n'ont pas bougé : ils parcouraient déjà `isoLayers`
ou résolvaient par `isoOnSideAt`, c'est-à-dire « la couche qui est LÀ » et non « la couche de cette
face ». Seul `isoOnSideAt` a dû apprendre à chercher parmi plusieurs.

Les réglages, eux, portent sur **toute la face** : on isole une pièce avec un seul produit, on ne
change pas d'isolant tronçon par tronçon.

**Vérifié** sur un mur de 12 m coupé par deux refends :

| | |
|---|---|
| arrêts | 0 · ⅓ · ⅔ · 1 |
| clic dans la 1re pièce | son tronçon seul, 10 m² |
| clic dans la 3e | 20 m² au total, **la 1re n'est pas effacée** |
| pièce du milieu | reste nue |
| repasser sur la 1re | toujours 20 m², toujours deux couches |

### Le contrôle avait raison, pas moi

Le test souris du contrôle doublage est tombé en panne avec ce changement. Mon premier réflexe a
été de l'accuser d'être fragile — à tort : l'ancienne version passait. Le vrai coupable était
l'**état laissé par les blocs précédents** (autre vue, autre niveau, panneau d'une autre largeur) :
un test qui vise des pixels partait d'un écran qui n'était plus celui d'un démarrage, et ratait la
poignée d'une vingtaine de pixels. Il **recharge la page** avant de viser.

## D28 quater · Les triangles de doublage

Signalé par Dani le 20/09/2026, capture à l'appui : « l'isolant se met en travers et finit à 0, il
fait un triangle ».

**Reproduit, et le calcul n'y était pour rien.** Les quantités et les surfaces de pièce étaient
justes ; c'est le **dessin** qui se refermait en pointe. Un défaut qui ne se voit pas dans les
chiffres — il a fallu une capture d'écran pour l'attraper, et c'est exactement pour ça que Dani l'a
vu avant les onze contrôles.

**La cause.** Le bord intérieur de la bande était lu sur `polyInt`, le polygone de la pièce. Or un
sommet de ce polygone ne porte qu'**un seul décalage**. Là où un doublage s'arrête au milieu d'un
pan, son sommet est partagé avec une arête **alignée et non doublée** : le coin tombait sur la face
du mur, et la bande passait de 12 cm à zéro sur toute sa longueur.

Le bug était là avant l'outil — mais l'outil l'a rendu courant : tant que le doublage couvrait le
mur entier, ses bouts tombaient sur de vrais angles, jamais au milieu d'un pan.

**Le correctif.** Quand l'arête voisine est doublée elle aussi, on garde `polyInt` : c'est un vrai
angle et la coupe d'onglet y est juste. Sinon on décale depuis la face du mur, de l'épaisseur de
CE doublage — le bout est alors franc, perpendiculaire au mur.

**Et surtout : la bande est devenue mesurable.** Le quadrilatère dessiné sort maintenant de
`bandeDoublage(f,i)`, appelée par le dessin ET par le contrôle. Deux nouvelles vérifications : la
bande garde son épaisseur d'un bout à l'autre, et cette épaisseur est bien celle du doublage. Un
défaut de tracé ne se verra plus seulement à l'œil.

## D28 quinquies · Retirer un doublage

« Et comment on retire l'isolation, si on veut refaire ? » — Dani, 20/09/2026. Question légitime :
j'avais livré un outil qui pose et aucun geste pour déposer. Le seul retrait passait par la fiche
du mur, qui vide **toute la face**.

**`Alt` + clic retire le tronçon visé.** Le même outil pose et dépose — on ne change pas d'outil
pour défaire ce qu'on vient de faire — et il enlève **le tronçon sous le curseur**, pas toute la
face : sur un mur qui longe trois pièces, on en refait rarement trois.

Là où il n'y a rien, rien n'est retiré, et l'outil le dit plutôt que de faire semblant.

Les deux autres chemins restent, pour ce qu'ils font mieux : la fiche du mur vide une face entière
d'un coup, la sélection de groupe vide plusieurs murs.

| geste | portée |
|---|---|
| `Alt` + clic à l'outil | le tronçon visé |
| « Retirer » dans la fiche du mur | toute la face |
| « Retirer » sur un groupe | tous les murs sélectionnés |

## D28 sexies · Le retrait devient un bouton

« Je ne vois pas l'outil retirer. » — Dani, 20/09/2026, une heure après que je lui aie livré le
retrait sous forme d'un `Alt` + clic.

Il l'a cherché dans le volet de l'outil et ne l'a pas trouvé, parce qu'il n'y était pas. **Une
fonction qu'on ne voit pas est une fonction qui n'existe pas** — un raccourci n'est pas une
interface, c'est une commodité pour qui sait déjà.

Le volet de l'outil Doublage s'ouvre maintenant sur une bascule **Poser / Retirer**. En mode
Retirer, les réglages du prochain doublage disparaissent : isolant, épaisseur et ITI/ITE ne
veulent rien dire quand on enlève. `Alt` + clic reste, comme raccourci, et le volet le dit à cet
endroit-là plutôt que dans un coin.

Leçon à garder : j'ai livré deux fois de suite une fonction sans son entrée visible — l'outil sans
le retrait, puis le retrait sans son bouton. Quand une capacité existe, la question n'est pas
« comment l'appeler » mais « où la voit-on ».

## D28 septies · L'isolant entrait dans le mur

Signalé par Dani le 23/09/2026, capture à l'appui : « l'isolant rentre dans le mur, c'est pas
normal ».

**La règle était bonne, sa condition était trop large.** Un doublage passe **derrière** le mur qui
vient buter dessus, jusqu'à son **axe** : c'est ce qui permet aux deux bandes de part et d'autre de
s'y rejoindre exactement, sans laisser un trou de leur épaisseur. On prolongeait donc à chaque
jonction en T.

Mais on prolongeait **aussi là où le doublage s'arrête**. La bande entrait alors d'une
demi-épaisseur dans le mur qui arrive — invisible sur une cloison de 7 cm, criant sur une
maçonnerie de 20 : de l'isolant dessiné dans le mur.

**La condition devient : on prolonge seulement si le doublage CONTINUE de l'autre côté.** On teste
un point juste au-delà de la jonction, sur le mur doublé : couvert, on passe derrière ; pas
couvert, la bande s'arrête net contre la face.

Mesuré sur deux pièces séparées par un refend de 20 cm, mur du haut doublé :

| | bande de x… | à x… |
|---|---|---|
| doublage arrêté au refend | **0,10** (face du mur gauche) | **4,90** (face du refend) |
| doublage continu | 0,10 | 11,90 — il passe derrière et rejoint l'autre bande |

Avant, le premier cas donnait 0,00 → 5,00 : une demi-épaisseur mordue de chaque côté.

C'est le troisième défaut de **tracé** en deux jours, tous invisibles dans les chiffres. Les
quantités n'ont jamais bougé — seul le dessin mentait. Les contrôles mesurent maintenant la bande
elle-même (`bandeDoublage`), et c'est ce qui a permis d'écrire celui-ci.

## D29 · Un seul isolant proposé, tant que le catalogue n'en distingue qu'un

Repéré par Dani le 24/09/2026 : « dans le plan on propose plusieurs types d'isolation alors que
sur l'estimateur on est que à un type ? ». Exact — et c'est le même piège que la finition
« Collé » (D27).

Le plan proposait **laine de verre, laine de roche, PSE et polyuréthane**. Le catalogue n'a qu'un
poste, « Isolation des murs par l'intérieur », **55 €/m² quel que soit l'isolant**. Le matériau
partait bien dans le contrat (`provenance.doublages[].mat`), la table de correspondance déclarait
le champ — et ne le lisait jamais. Quatre choix, aucun ne déplaçait un euro.

**Décision de Dani : rester simple, ne proposer que ce que l'estimateur sait chiffrer.** Le plan
n'offre plus que la **laine de verre**. L'épaisseur reste réglable (6 à 20 cm) et le R se calcule
comme avant — on perd un choix de matière, pas la logique thermique.

**Ce que le catalogue dit vraiment.** Il ne nomme aucun matériau : sa note dit « isolant + ossature
+ plaque ». À 15 €/m² de fourniture pour ces trois-là, c'est le cas standard d'une laine minérale —
la lecture de Dani est la bonne, mais elle reste une lecture, pas une mention.

**Mise en œuvre.** `ISO_MAT` garde ses quatre entrées, avec leur λ : un plan déjà enregistré en
polyuréthane reste lisible et garde son R (vérifié : λ 0,022 → R 4,55 sur 10 cm). C'est la liste
`ISO_MAT_CHOIX` qui décide de ce qu'on PROPOSE. Et comme pour « Collé », un sélecteur à une seule
option disparaît : le volet affiche « Isolant · Laine de verre · λ 0,035 » au lieu d'un bouton
unique qui simule un choix.

Le jour où le catalogue distingue les isolants — un coefficient par matériau sur la fourniture —
il suffira d'allonger `ISO_MAT_CHOIX`. La recherche de prix est faite et consignée : laine de roche
≈ 1,06 et PIR ≈ 1,25 sur le poste, calculés sur l'écart de FOURNITURE (la main-d'œuvre, l'ossature
et la plaque ne bougent pas). Non appliqués : Dani a choisi la simplicité pour l'instant.

⏳ **Reste ouvert : le sol.** `SOL_MAT` propose encore polyuréthane, PSE et XPS pour trois postes
qui n'en font qu'un (« Isolation du sol / plancher bas », 45 €/m²). Même problème, mais une laine
ne va pas sous une chape — le choix y a donc une raison technique qu'il n'a pas sur un mur.

## D29 bis · Le sol aussi : un seul isolant

Dani, le 24/09/2026 : « pareil pour le sol, garde qu'un seul isolant, panneau mousse polyuréthane
(TMS) — je veux rendre plus simple pour le moment, pour faire une première version sans bug et pas
compliquée à comprendre pour les utilisateurs ».

Le plan proposait polyuréthane, PSE et XPS ; le catalogue n'a qu'un poste (« Isolation du sol /
plancher bas », **45 €/m²**, quel que soit le produit). Même piège que les murs : trois choix dont
aucun ne déplace un euro.

Le plan n'offre plus que la **mousse polyuréthane (TMS)** — qui était déjà le défaut. Le nom du
produit est explicite plutôt que générique : « Mousse polyuréthane (TMS) » et non « Polyuréthane /
PIR ». L'épaisseur reste réglable (4 à 12 cm).

Même mise en œuvre que D29 : `SOL_MAT` garde ses trois entrées pour que les plans déjà enregistrés
restent lisibles (vérifié : un sol en XPS s'affiche toujours « Polystyrène extrudé (XPS) » dans sa
tâche de chantier), et `SOL_MAT_CHOIX` décide de ce qu'on propose. Le sélecteur disparaît, remplacé
par la mention du produit.

**La raison derrière la décision, et elle vaut au-delà de l'isolant.** Première version sans bug,
compréhensible sans effort. Chaque choix offert est une occasion de se tromper et une question de
plus à se poser ; un choix qui ne change pas le prix est un coût pur pour l'utilisateur. On les
rouvrira un par un, quand le catalogue saura les chiffrer.

## D30 · « Rien n'est gratuit » : l'ITE sous bardage devient un poste

Dani, le 24/09/2026, sur la finition d'ITE qui ne changeait aucun prix : « bah rien n'est gratuit,
donc mets-le correctement et logique ».

**Le problème était double.** La finition ITE proposait *Enduit* ou *Bardage* pour **0 €** — et dans
le même panneau de mur, dix lignes plus bas, « Finition extérieure » proposait déjà **Bardage**,
lui **chiffré 90 €/m²**. Le même mot deux fois : une fois gratuit, une fois payant.

**Pourquoi un poste et pas un coefficient.** Le marché 2026 donne ITE sous enduit **120–220 €/m²**
et sous bardage **180–270** — soit un rapport de **1,32**. Deux pistes se présentaient :

- *ajouter le poste Bardage (90 €) par-dessus l'ITE* → 230 €/m², soit 1,64 × : au-dessus de tout ce
  que les sources donnent, et ça compterait deux fois la finition déjà incluse dans les 140 € ;
- *une variante sur le poste ITE* → impossible sans dégât : `finCoefTask` fige à 1 tout poste qui
  porte des variantes, or l'ITE **suit le coefficient de finition** (0,75 en éco, 0,83 en standard,
  1 en premium). Lui ajouter une variante aurait **augmenté son prix** pour tous ceux qui ne
  dessinent aucun plan.

D'où un **poste distinct**, comme le catalogue distingue déjà « toiture complète tuile » et
« ardoise » : **Isolation par l'extérieur (ITE) sous bardage, 185 €/m²** (140 × 1,32), fourniture
80 € au même rapport que l'ITE sous enduit, TVA 5,5 %. Le catalogue passe de 208 à **209 postes**.

Contrat **1.12** : `provenance.doublages[].sys` — la finition de chaque couche. Le contrat portait
déjà le mode mur par mur, pas la finition ; le devis ne pouvait donc pas choisir.

Vérifié des deux côtés sur 25 m² de mur :

| finition | compteur du plan | devis |
|---|---|---|
| enduit | 3 500 € | Isolation par l'extérieur (ITE) → **3 500 €** |
| bardage | 4 625 € | ITE sous bardage → **4 625 €** |

Sources : [dpeclair — prix ITE 2026, enduit vs bardage](https://dpeclair.fr/travaux/isolation-exterieure-ite/prix-ite-m2-2026/) ·
[cout-isolation-maison — ITE 2026](https://www.cout-isolation-maison.fr/guides/isolation-exterieure-ite-prix/)

## D30 bis · La pose en feuillure retirée

Trois façons de poser un dormant — applique, tunnel, feuillure — pour un seul prix. Dani :
« on va juste mettre applique et tunnel ». Le plan n'en propose plus que deux ; `POSE` garde ses
trois entrées pour qu'un plan déjà enregistré en feuillure reste lisible.

## D30 ter · La tapée d'isolation reste

Elle ne change aucun prix non plus, mais Dani la garde : « la variation du prix est minime, ils
l'auront lorsqu'ils réaliseront un vrai devis ». C'est la bonne limite — l'estimateur donne un
budget, pas un devis d'exécution, et la tapée sert ici d'**avertissement technique** (un dormant de
40 mm sur un doublage de 120 est une erreur de chantier), pas de ligne de prix.

## D31 · Un mur porteur interrompt le doublage, une cloison non

Dani, le 24/09/2026, capture à l'appui, pour la **deuxième fois** : « il y a toujours ça qui n'est
pas bon, l'isolant rentre dans les murs ».

Ma correction précédente (D28 septies) était juste mais **incomplète**. J'avais posé la bonne
condition — ne prolonger que si le doublage continue de l'autre côté — et raté la vraie règle
physique.

**Un doublage passe derrière une CLOISON**, qui vient buter contre lui : la bande est continue, les
deux moitiés se rejoignent à l'axe, et c'est la cloison qui est raccourcie. **Un mur porteur, lui,
l'INTERROMPT** : on ne double pas par-dessus vingt centimètres de parpaing ni soixante de pierre.
La bande s'arrête à sa face et reprend de l'autre côté.

On prolongeait derrière **n'importe quel** mur. Sur le plan de Dani — chambre et garage séparés par
un refend en parpaings — l'isolant entrait donc d'une demi-épaisseur dans la maçonnerie, de chaque
côté. Invisible sur une cloison de 7 cm, criant sur un refend de 20.

La condition tient maintenant en trois termes : on prolonge si **(1)** le coin est une jonction en
T, **(2)** le doublage continue au-delà, **(3)** le mur qui arrive n'est **pas porteur**.

**Vérifié** sur un mur de 12 m coupé par un refend parpaing à 5 m et une cloison à 9 m :

| bande | de x | à x | |
|---|---|---|---|
| 1 | 0,10 | **4,90** | s'arrête à la face du refend porteur |
| 2 | **5,10** | 9,00 | reprend à l'autre face · va jusqu'à l'axe de la cloison |
| 3 | 9,00 | 11,90 | rejoint la 2 exactement, sans trou |

**Ce que je retiens.** C'est le quatrième défaut de tracé en trois jours, et le deuxième sur le
même sujet. Les trois premiers venaient de mes calculs ; celui-ci venait de ma **connaissance du
métier** — j'avais codé « passe derrière ce qui arrive » sans distinguer ce qui peut être traversé
de ce qui ne le peut pas. Aucun contrôle ne pouvait l'attraper : ils vérifiaient que la géométrie
était cohérente, pas qu'elle était vraie.

## D32 · Ce n'était pas l'isolant qui entrait dans le mur — c'était le mur qui reculait

Troisième signalement de Dani sur le même symptôme, le 24/09/2026, capture zoomée à l'appui :
« regarde, l'isolant rentre dans l'épaisseur du mur ».

**J'avais cherché du mauvais côté deux fois.** Mes deux corrections précédentes portaient sur la
BANDE — jusqu'où elle s'étend (D28 septies), et derrière quoi elle a le droit de passer (D31). Les
deux étaient justes, et aucune ne réglait ce qu'il voyait, parce que le défaut n'était pas dans la
bande : **il était dans le mur**.

`retraitContreDoublage` raccourcit un mur qui vient buter contre un doublage — c'est la règle qui
fait qu'une cloison s'arrête sur la plaque et non sur le mur, pendant que le doublage passe
derrière elle, continu. Elle s'appliquait à **n'importe quel mur**. Un refend en pierre de 44 cm
perdait donc une tranche de maçonnerie à son extrémité, et la bande occupait la place libérée :
vu du plan, de l'isolant dans le mur.

**Une cloison recule, un porteur non.** C'est exactement la règle posée en D31 pour la bande, vue
de l'autre côté — et les deux se contredisaient : `bandeDoublage` refusait déjà de passer derrière
un porteur, mais le mur reculait quand même. Deux moitiés d'une même règle, dont une seule avait
été corrigée.

| | la cloison | le mur porteur |
|---|---|---|
| recule devant le doublage | oui, de son demi-épaisseur + la plaque | **non** |
| le doublage passe derrière | oui | **non**, il s'arrête à sa face |

**Ce que je retiens, et c'est le plus utile.** Trois allers-retours pour un seul défaut. J'ai
mesuré, balayé dix configurations, écrit un invariant — et tout était vert, parce que je vérifiais
la bande alors que le défaut était dans le mur. Mon invariant demandait « aucun point de bande dans
un mur » ; il était satisfait, puisque le mur n'était plus là.

Ce qui a débloqué : **regarder mon propre rendu** au lieu de mesurer mes propres chiffres. Le trou
clair au sommet du refend se voyait en une seconde sur l'image, et aucune mesure ne l'aurait
montré. Quand un défaut est visuel et que trois mesures disent que tout va bien, la mesure suivante
doit être une capture d'écran.

## D33 · L'isolant dans le mur : la vraie cause, trouvée sur le vrai plan

Cinquième signalement de Dani, le 24/09/2026. Cette fois il m'a envoyé **son plan exact**, via le
bouton « Copier le plan complet » ajouté pour l'occasion. Le défaut s'est reproduit au premier
chargement.

**Aucune de mes reconstructions ne pouvait le produire**, parce qu'il tenait à deux détails qu'elles
n'avaient pas, et qu'il fallait les deux ensemble :

1. **Un mur dessiné au-delà de son voisin.** Le mur du haut du garage part de x = 6,6 alors que le
   mur qu'il rejoint est à x = 6,9. Pour détecter les pièces, l'éditeur le ramène à l'axe (6,9 →
   20) : le segment de calcul fait 13,1 m, le mur enregistré 13,4. Or l'étendue d'un doublage est
   stockée en **fraction** du mur enregistré. La même fraction appliquée au segment plus court
   tombait 17 cm plus loin — dans le refend.
2. **Des bornes arrondies à 4 décimales**, dans la pose du doublage ET dans la liste des jonctions.
   Sur un mur de 19,9 m, 0,3719 au lieu de 0,371859 : la borne tombait à 12,5992 au lieu de 12,6000.
   Le graphe des pièces, lui, calcule la jonction exacte. Entre les deux naissait **une arête d'un
   millimètre** — le coin de la pièce ne voyait plus le refend, n'appliquait pas son épaisseur, et la
   bande partait de son axe au lieu de sa face.

Mes scènes de test dessinaient toujours les murs d'axe à axe, sur des longueurs rondes : le mur de
calcul et le mur enregistré avaient la même longueur, et l'arrondi tombait juste. Le défaut était
invisible par construction.

**Trois corrections, qui tiennent chacune un bout :**

- la borne est reportée sur le segment de calcul **par son point physique**, plus par sa fraction ;
- une borne à moins de 2 cm d'une jonction **s'y accroche** — ce qui répare les plans déjà
  enregistrés avec des bornes arrondies ;
- les bornes et les jonctions sont gardées **en pleine précision**, pour que le millimètre ne se
  fabrique plus.

Sur le plan de Dani : la bande de la chambre s'arrête à **12,30** (face gauche du refend), celle du
garage part de **12,90** (face droite), la bande fantôme de 12,30 à 12,60 — entièrement dans la
pierre — a disparu. Vérifié **à l'image**, en haut et en bas.

**Son plan est désormais un test.** Il est gardé tel quel dans `tools/fixtures/`, et le contrôle
vérifie qu'aucun point de bande n'entre dans le refend et qu'aucune pièce n'a d'arête de moins d'un
centimètre. J'ai vérifié que ce test **échoue sur l'ancien code** avant de le déclarer bon.

### Ce que je retiens de ces cinq allers-retours

Les corrections D28 septies, D31 et D32 étaient justes — chacune a fermé un vrai cas — mais aucune
ne touchait **le sien**, parce que je corrigeais ce que je savais reproduire, pas ce qu'il voyait.
J'aurais dû lui demander son plan au deuxième signalement, pas au cinquième. Quand un utilisateur
voit un défaut que je ne reproduis pas, **la donnée qui manque est la sienne**, et aucune quantité
de reconstruction ne la remplace.

## D34 · Le retour d'isolant en tableau devient un choix, face par face (24/09/2026)

**Constat de Dani** sur son plan : il double la seule face chambre du passage séjour/chambre (refend
en pierre de 60) et l'isolant tourne dans le tableau **jusqu'à l'axe du mur**, sans qu'il l'ait
demandé. Deux défauts : le retour s'imposait, et il s'arrêtait au milieu du tableau.

**Décision (Dani) :** « certaines personnes ne voudront pas isoler côté tableau pour gagner de la
largeur de passage, donc elles doivent avoir le choix ». Par défaut, **pas de retour** : la bande
s'arrête **à fleur du tableau**.

- Le choix se fait dans le panneau de l'ouverture, bloc « Retour d'isolant dans le tableau », une
  ligne **Non / Oui par face doublée** (nommée par sa pièce). Il n'apparaît que là où un retour a du
  sens (`retourPossible`) : face doublée en ITI, ouverture non bouchée, pas de fenêtre extérieure
  posée en applique côté intérieur.
- Stocké dans `o.retour` (liste des côtés). Dessin, découpe des bandes et suivi lisent
  `revealOnSide`, qui exige ce choix.
- Retour choisi sur **une seule face** : il habille **tout** le tableau jusqu'à l'autre parement (à
  l'axe, il laissait un demi-tableau nu). Sur les deux faces : ils se rejoignent à l'axe, comme avant.
  Fenêtre en tunnel côté intérieur : arrêt au plan de la menuiserie, inchangé.
- Le suivi compte le retour dès que **le doublage de la face est neuf** — il ne dépendait que d'une
  menuiserie neuve, alors qu'un passage existant dans un mur qu'on double se retourne aussi. Prix
  toujours à 0 (`PRIX.retourIso`, poste abandonné) : rien ne change au budget.
- Les plans enregistrés avant n'ont pas de `o.retour` : ils s'ouvrent **sans retour**, ce qui est le
  nouveau défaut voulu.

Contrôle : `tools/doublage.mjs`, 5 vérifications sur le plan réel de Dani (proposé du seul côté
doublé, absent par défaut, bande à fleur du tableau, choisi → dessiné et suivi, re-cliqué → retiré).

### D34 bis · La bande s'arrêtait 7 cm avant le tableau (même jour)

Dani : « elle ne s'arrête pas vraiment à fleur mais un peu avant ». Sur son plan, le refend
séjour/chambre est dessiné jusqu'à −11,80, 10 cm au-delà de l'axe de la façade (−11,90). La
détection des pièces travaille sur une **copie** du mur ramenée à cet axe, plus courte ; la bande
reportait la position du passage (`o.t`, fraction du mur **enregistré**) sur cette copie, soit
7 cm de décalage. Correction : `murReel(w)` — la découpe des bandes aux ouvertures lit toujours le
mur enregistré. Même famille que D33 : une copie raccourcie qu'on prend pour le vrai mur.

Le contrôle ajouté en D34 ne le voyait pas : il comparait la copie au mur réel, ne trouvait donc
**aucune** bande, et passait. Il vérifie maintenant qu'une bande est trouvée et qu'elle **touche
les deux jambages à 2 mm près** — il échoue sur l'ancien code.

## D35 · Tableaux isolables sans doublage · la tapée et l'ITE relisent les vrais doublages (24/09/2026)

**Tableaux.** Dani : « on doit pouvoir isoler l'épaisseur du mur » dans un grand passage, doublage
ou pas. Isoler les tableaux devient **un seul choix par ouverture** (Non / Oui) — côté par côté, les
deux boutons disaient la même chose, puisqu'un retour d'une face habille déjà tout le tableau.
- Sans doublage : l'isolant habille les jambages sur toute l'épaisseur, à fleur des parements.
  Avec doublage : il rejoint la bande (règle V92). Épaisseur = celle du doublage, sinon celle
  réglée dans l'outil Doublage.
- Jamais côté façade d'un mur extérieur, jamais contre une ITE, jamais derrière une menuiserie en
  applique (le doublage recouvre le dormant) ; en tunnel, côté intérieur jusqu'à la menuiserie.
- Deux gestes : le panneau de l'ouverture (qui affiche la largeur de passage restante), ou un
  **clic dans l'ouverture avec l'outil Doublage** (Poser / Retirer).
- Suivi : « Isoler les tableaux », en ml (jambages + linteau). Prix toujours 0 : aucun poste au
  catalogue de l'estimateur (poste abandonné, cf. D-prix « on facture rien tant que… »).

**Même cause, quatre défauts.** Depuis l'outil Doublage, un mur porte ses doublages dans `w.isos`,
tronçon par tronçon ; `w.iso` (l'ancien doublage unique) n'existe plus. Quatre endroits le lisaient
encore :
1. **La tapée** : la porte-fenêtre de Dani gardait 40 mm derrière 120 mm de doublage. Une menuiserie
   qu'on pose prend désormais la tapée du doublage **au droit de l'ouverture** (`doublageIntAu`),
   calculée et non recopiée ; une menuiserie conservée garde son constat, et l'écart reste une alerte.
2. **Le panneau d'un mur de façade** disait « ce mur n'est pas doublé » sur un mur doublé : il se lit
   maintenant face par face, comme un mur intérieur, et sait dire ITE (finition enduit / bardage, R).
3. **L'ITE posée à l'outil** était chiffrée mais jamais dessinée : dessin couche par couche.
4. **Le groupe de murs** affichait « Aucun » et ses réglages ne faisaient rien.

Au passage : `setWallIsoSide` transformait une ITE en ITI au moindre réglage d'épaisseur ; et les
réglages d'une face (épaisseur, finition, étendue, état) étaient cachés depuis qu'il ne reste qu'un
isolant — ils étaient accrochés au sélecteur d'isolant. Code mort retiré : `setWallIso`,
`isoSlotForSide`, `doublageTotal`, `isoShown`.

Contrôles : `tools/doublage.mjs` (+16 vérifications : tableaux sans doublage, clic de l'outil,
applique/tunnel, tapée, alerte, panneau de façade, ITE dessinée et réglable).

### D35 bis · Le clic sur le tableau vise le jambage, et se voit avant (même jour)

Dani cliquait sur le **trait du jambage** pour isoler le tableau : rien ne se passait. Le clic n'était
reconnu que dans le blanc de l'ouverture ; 3 px dans le mur, c'était le mur. Or le tableau, c'est ce
bord-là. La zone déborde maintenant de **10 px dans la masse du mur** autour de chaque jambage — mais
pas sur la face du mur, d'où l'on trace un doublage qui part du jambage.
Et au survol, l'outil Doublage **montre** l'isolant de tableau (jaune, ou rouge en mode Retirer) avec
« Clic : isoler les tableaux » : sans aperçu, rien ne disait que ce clic faisait quelque chose.

## D36 · Chiffrage juste : aucun euro sans geste, une seule formule par ouvrage (24/09/2026)

**Constat (jury, 7 experts).** Le compteur annonçait de l'argent que personne n'avait décidé, et
comptait certains ouvrages autrement que le contrat.
- Une pièce tracée en vue Existant, sans rien décider : 182 à 281 € de **plinthes**. Une salle de
  bain typée : **faïence** mi-hauteur et **cloisons hydrofuges** en plus. Plans types chargés sans
  rien toucher : Studio 1 766 €, T3 2 829 €, Maison 3 555 €. Dans l'exemple, 2 417 € sur 5 786 €
  (42 %) ne venaient d'aucune décision. Un sol décrit « en terre » faisait couler une **dalle**.
- **Doublage** : le Suivi comptait le mur entier (`len × h`), le contrat le seul tronçon tracé
  (`t0..t1`). Plan réel de Dani : 189,6 m² au Suivi, 75,8 m² au contrat. Au-delà de deux tronçons
  sur un mur, les tâches partageaient l'id `iso2:<mur>` : cocher l'une en cochait trois.
- **Copier un niveau** recopiait les murs à démolir, les percements, les sols neufs (budget ×2),
  et partageait les objets entre niveaux (`{...o}`) : retirer un doublage à l'étage le retirait au RDC.
- Deux clics au même endroit posaient **deux fenêtres superposées**, invisibles, chiffrées deux fois
  (+3 320 €).
- **Démolir un mur** passait ses portes « à boucher » : tâche de rebouchage dans un mur qui n'existe
  plus. Et boucher une ouverture ne déposait pas sa menuiserie.
- **Évier, VMC, fenêtre de toit** : « non chiffré, aucun poste au catalogue » au Suivi, alors que
  l'estimation les facture (450, 800, 1 200 €). La fenêtre de toit se comptait deux fois (panneau
  Toiture + objet dessiné). Le réfrigérateur devenait une tâche de pose.
- Le bloc « Le chantier » disait « commande le prix », mais le compteur ne bougeait ni avec la
  finition ni avec la région, et n'était pas dit HT.
- Le récap des surfaces de la vue Existant montrait l'après-travaux (58,9 contre 58,8 m²). Le
  tableau « Pièces (état projet) » d'Estimer affichait le sol d'avant.
- L'outil Doublage proposait 100 mm, que le même outil signalait aussitôt « sous le seuil d'aide ».

**Vérifié dans l'estimateur avant d'écrire quoi que ce soit.** `fp` est bien du fourni-posé **HT**
(core.ts). Et la finition s'applique aux matériaux avec un coefficient où **Premium = 1** : le prix
catalogue que lit le compteur est donc celui d'une finition Premium, moyenne nationale. En Standard
(0,78 à 0,88 sur la part matériaux selon le lot) l'estimation sera plus basse ; en région chère
(main-d'œuvre × 1,04 à 1,20) plus haute.

**Décisions.**
1. **Formules partagées** (juste avant `chantierTasks`) : `plinthesDe`, `faienceDe`,
   `cloisonsHumidesDe`, `isoLongueur` / `isoSurface`, `solDecide`, `perimHorsPortes`. Le Suivi, le
   compteur, `quantities()` et donc `contratPlan()` les lisent ; plus aucune copie.
2. **Plinthes** : seulement avec un revêtement neuf (pas sur un béton fini), et pas là où la faïence
   descend au sol (mi-hauteur, pleine hauteur ; en « zone douche », le reste du périmètre).
   **Faïence et cloisons hydrofuges** : seulement si la hauteur de faïence est choisie. La fiche
   propose désormais **« Aucune — je garde l'existant »**, qui est le défaut. **Dalle sur terre** :
   seulement si l'on refait ce sol.
3. **Doublage** : chaque couche compte sa longueur tracée, porte un id `iso:<mur>:<couche>`
   (chaque couche posée reçoit un `id`), et se nomme par ce qu'elle double : « Doubler 3,15 m du mur
   de 9,00 m · côté Chambre ». Les cases déjà cochées des anciens plans (`iso:`, `iso2:`) sont
   reportées au chargement (`migrerDone`).
4. **Copier un niveau** = l'existant seul, copié en profondeur : pas les murs ni les ouvertures à
   créer, aucun état, aucune décision de pièce (sol neuf, faïence, faux plafond, produits, notes).
   La surélévation et le plancher créé partent de cette copie, comme avant.
5. **Ouvertures** : un clic sur une ouverture existante la sélectionne (« Il y a déjà une ouverture
   ici ») ; le glisser ne se pose pas sur une autre ; `planChecks` signale un chevauchement. Une
   ouverture à boucher peut en croiser une neuve (murer une porte, percer une fenêtre au même
   endroit) : elle ne compte pas.
6. **Mur démoli** : ses ouvertures partent avec lui — aucune tâche, rien au contrat, plus dessinées
   en vue Final, et leur fiche le dit. **Reboucher** : « Déposer la menuiserie avant de reboucher »
   figure au Suivi **à 0 €, en le disant** (l'estimation ne compte cette dépose que pour une
   menuiserie remplacée : règle B) ; le rebouchage d'une cloison passe au lot Cloisons.
7. **Prix** : `EQUIP_PRIX.evier/vmc/velux` = fourni-posé des postes que l'estimation leur applique,
   tenus par `coherence.mjs`. Fenêtres de toit : **une seule source**, comme l'estimation — dessinées,
   elles font foi et le champ du panneau Toiture devient « n dessinée(s) sur le plan ». Le
   réfrigérateur rejoint le mobilier.
8. **Dire ce que vaut le chiffre** : « Budget travaux HT · indicatif · prix catalogue, moyenne
   nationale ». Tant que rien n'est décidé, la carte le dit, à 0 €, avec le geste à faire. Le bloc
   « Le chantier » (« affine l'estimation ») dit qui applique ses réponses : l'estimation AVYORA, pas
   le compteur — et dans quel sens elles le feront bouger. On n'a **pas** recopié les coefficients de
   finition et de région dans la maquette : il faudrait la part matériaux (`sm`) de chaque poste, et
   une table recopiée à la main qui dérive en silence, c'est la panne que `coherence.mjs` combat.
9. **Textes** calculés sur l'état réel : fiche d'une ouverture (gardée → pas chiffrée ; bouchée →
   sans prix ; passage → rien à poser ; menuiserie intérieure / extérieure), équipement déposé
   (« figure au Suivi, sans prix »), outil Équipements (le mobilier ne se chiffre pas), repères
   électriques attribués à la NF C 15-100, seuil R 3,7 nommé (MaPrimeRénov' / CEE) et limité aux
   murs extérieurs. Une fenêtre gardée dit que ses volets et options sont un constat, non chiffré.
10. **Récap des surfaces** : celui de la vue affichée, titré « avant » ou « après travaux ». Estimer
    affiche le sol neuf, l'ancien en petit.
11. **Doublage 120 mm par défaut** (arbitrage K), une seule liste d'épaisseurs (60 à 200 mm) dans
    l'outil, la fiche du mur et le bloc de groupe. Pour que 120 mm donne bien R ≥ 3,7, la laine de
    verre proposée passe de λ 0,035 à **λ 0,032** (laine haute performance, la plus courante en
    doublage) : R = 3,75. Avec 0,035, il aurait fallu 130 mm. Si Dani préfère garder 0,035, c'est
    `DBL_CFG.e` à 0,14 — une ligne.
12. **Contrat 1.13.0** : `plinthes` ne compte que les plinthes neuves, `sols` que les sols décidés,
    et les ouvertures d'un mur démoli ne sortent plus. Aucune clé renommée ni retirée.

**Ce qui n'est pas fait, et pourquoi.**
- **L'estimateur applique encore un défaut** : `plan-correspondance.ts` facture une faïence
  mi-hauteur et des cloisons hydrofuges à toute pièce humide dont la faïence n'est pas choisie
  (contrat 1.3 : « au consommateur d'appliquer le défaut »). Le plan, lui, n'en compte plus. Aligner
  l'estimateur sur « aucun euro sans geste » est une ligne (`if (!humide || !r.faience) continue`),
  mais ce chantier ne touche pas `lib/estimateur`. À trancher.
- **Isolation des rampants** calculée avec le débord de toit (+15 % environ) : le compteur ne peut
  pas changer seul, l'estimation lit la même surface. Il faut exposer une surface de rampants hors
  débord au contrat **et** la faire lire à l'estimateur.
- **Volet ajouté à une fenêtre gardée** : l'estimation ne chiffre rien sur une menuiserie existante
  (D1). La fiche le dit et renvoie vers « À remplacer » ; un vrai poste « volet seul » demande
  l'estimateur.
- **Toiture** : l'action projet est encore proposée d'après l'état constaté, et comptée tant que
  l'utilisateur ne l'a pas changée. C'est un euro sans geste au sens strict ; le corriger change le
  contrat (`projet.action`) et la scène de référence. À trancher avec la toiture.

**Contrôles.** Nouveau `tools/budget.mjs` (56 vérifications, **à ajouter à la batterie**) : pièce
tracée à la souris, salle de bain typée, sol en terre, plans types chargés → 0 €, 0 tâche, contrat
muet ; doublage : Suivi = formule = contrat couche par couche, ids uniques, une case = une couche,
migration des anciennes cases, et Suivi = contrat sur le plan réel de Dani ; copie de niveau sans travaux ni objets partagés ; double-clic, alerte
de chevauchement ; mur démoli ; dépose avant rebouchage ; évier, VMC, fenêtre de toit, réfrigérateur ;
HT et honnêteté du bloc « Le chantier » ; 120 mm et R ≥ 3,7 ; récap Existant = `areaBefore`.
Mis à jour en gardant leur intention : `doublage.mjs` (épaisseur dessinée = celle de la couche posée,
plus un chiffre figé), `decision.mjs` (« rien à préciser »), `coherence.mjs` (+3 prix tenus), test
des plinthes (19,17 ml : la salle de bain est faïencée jusqu'au sol, l'étage n'a pas de sol décidé),
fixture du contrat régénérée (1.13.0).

## D37 · Justesse métier : le plan parle comme un pro du bâtiment (24/09/2026)

**Constat (jury, pro du bâtiment, débutant, chasseur de bugs, rétention).** Le chiffrage était
juste au centime, mais sur des ouvrages qu'un artisan n'aurait jamais écrits.
- **Parquet** : choisir « Parquet » sur un parquet facturait l'arrachage (532 €) **et** le ponçage
  (1 065 €) du même parquet, avec une chape proposée dessous. Aucun moyen de demander un parquet neuf.
- **Sol gardé** : garder son carrelage affichait encore « Chape · à choisir / Revêtement · à
  choisir » ; « garder » et « pas encore décidé » étaient la même option, et Estimer se plaignait
  « aucun revêtement choisi ». « Recommandée sur dalle » s'affichait sur un carrelage.
- **Étage créé** : « Plancher de cet étage : Béton » était ignoré — plancher bois chiffré (1 642 €),
  et une chape ciment proposée sur des solives.
- **Doublage** : l'outil posait un doublage par l'intérieur côté rue (chiffré), une ITE côté pièce.
- **Appartement** : « pas de toiture » répondu, toiture et façade toujours réclamées (contrôle,
  fiche du niveau, couverture d'Estimer).
- **Fusion** : abattre la cloison WC / cellier de l'exemple laissait un « Cellier » avec la cuvette
  dedans ; le logement n'avait plus de WC, et l'alerte « WC sur séjour » disparaissait.
- **Façade** : six finitions empilées sur un mur de parpaing, toutes facturées (7 469 € pour
  19,5 m²) — ravalement pierre « tout compris » + joints + nettoyage + enduit + chaux + bardage.
- **Murs** : l'outil restait en « Parpaing 20 cm » après le premier contour ; chaque cloison tracée
  devenait porteuse, et la démolir ajoutait étude + poutre (353 € → 3 805 €) sans aucune question.
- **Fenêtre sur une cloison** : elle « éclairait » la pièce et effaçait l'alerte « pas de fenêtre ».
- **Peinture** : inexistante, alors que le plan mesure les murs et plafonds à peindre.
- **Rehausse** : 8 cm d'isolant + une chape, jamais annoncés ; **poutre ou poteau créé** sans étude.

**Vérifié avant d'écrire.** Le catalogue a « Peinture des murs » (25 €/m²) et « Peinture des
plafonds » (28 €/m²), que la correspondance ne reliait à rien ; il n'a **aucun** poste de dépose
d'un équipement (`PRIX.deposeEquip` est abandonné, D19). Le moteur masque déjà la toiture d'un
appartement (`HIDE_APPART_TASK`).

**Décisions.**
1. **Le revêtement se choisit dans sa ligne** (décision validée par Dani) : la liste « Revêtement
   de sol souhaité » disparaît ; la ligne « Revêtement » de l'ordre de réalisation porte le choix,
   comme la chape juste en dessous. Options : *À choisir* · *Garder le sol actuel (…)* · *Poncer et
   vitrifier le parquet actuel* (seulement sur un parquet) · les revêtements neufs (« Parquet neuf
   (à la place de l'ancien) » sur un parquet).
2. **Garder est une décision** (`r.solGarde`) : la pile se réduit à « Revêtement · conservé · rien à
   faire », aucune chape ne reste comptée, la pièce sort des « sans décision » d'Estimer (« Sol — n
   pièces sans décision : garder le sol ou le refaire »).
3. **Poncer n'est pas arracher** (`PONCAGE`) : une couche, ni dépose, ni chape, ni plinthes (le
   parquet garde les siennes). « Parquet » sur un parquet = parquet neuf, après dépose. Les plans
   enregistrés où « Parquet » était posé sur un parquet (qui voulait dire « poncer », D8) sont
   repris en ponçage au chargement (`migrerSols`), sans la dépose qui l'accompagnait à tort.
4. **Une seule lecture des couches** (`solCouches`) pour la fiche, le Suivi, le compteur et le
   contrat : sol gardé, ponçage, béton fini → aucune couche ; plancher bois → ni chape ciment ni
   isolant sous chape (la fiche le dit) ; chape liquide → pas de ragréage. « Conseillé » devient un
   état à part (ni compté, ni « à choisir ») : chape sur une dalle, ragréage après une dépose.
5. **Rehausse** : isolant + chape (épaisseur courante 5 cm tradi, 4 cm liquide, **modifiable** —
   ordre de grandeur, pas une norme) → « le sol monte d'environ X cm, hauteur ≈ Y m, portes et seuils
   à reprendre » ; le contrôle alerte sous 2,20 m.
6. **Étage créé** : le plancher choisi au niveau s'applique à toutes ses pièces sans plancher (une
   pièce peut ensuite différer) ; l'étage coché ou créé prend le matériau du niveau.
7. **Doublage** : ITI seulement sur une face côté pièce, ITE seulement côté dehors
   (`faceDoublageInterdite`). On ne tranche que ce qu'on sait : un mur sans pièce d'aucun côté reste libre. Le
   geste refusé le dit (toast) ; un plan déjà enregistré est signalé par le contrôle.
8. **Appartement** (`estAppart`) : toiture ni réclamée, ni affichée, ni comptée, ni émise
   (`toiture: null`) ; façade retirée de la couverture d'Estimer. Bien non dit → « Type de bien —
   appartement ou maison, pas encore dit ».
9. **Fusion de pièces** (`ficheDeFusion`) : la pièce née d'une démolition garde la fiche que ses
   appareils désignent (WC, puis salle d'eau / de bain), sinon celle déjà appariée à cette face (un
   aller-retour entre vues ne permute rien), sinon la première comme avant. Un toast dit « A et B
   ne font plus qu'une pièce : « C » ». Le contrôle signale des WC, une douche ou une baignoire dans
   une pièce d'un autre type.
10. **Façade** (`facadeFinsEffectives`) : un seul parement (enduit, chaux, bardage ou ravalement —
    cocher l'un retire l'autre) ; le ravalement pierre comprend nettoyage et joints ; joints,
    ravalement et chaux réservés au mur en pierre ; une ITE à créer comprend son enduit / bardage.
    La fiche ne propose que ce qui va avec le mur ; un plan ancien qui empilait voit ce qui n'est
    plus compté, et pourquoi.
11. **Murs** (arbitrage I) : le premier contour fermé fait passer l'outil en « Cloison 7 cm »
    (toast). Démolir un mur épais dont personne n'a dit s'il porte pose la question « Ce mur
    porte-t-il un plancher ou le toit ? Oui / Non / Je ne sais pas » en tête de fiche ; sans réponse
    ou « je ne sais pas » : chiffrage prudent (porteur) et « à faire vérifier par un pro » (tâche,
    fiche, contrôle, contrat `porteurAVerifier`, déduction signalée au devis). Le réglage « Auto »
    devient « Oui / Non / Je ne sais pas », avec la déduction dite en clair.
12. **Étude de structure** aussi pour une poutre ou un poteau **créé** (forfait unique).
13. **Fenêtre** : seule une fenêtre sur un mur qui donne dehors éclaire une pièce ; posée sur un mur
    intérieur, un toast et le contrôle demandent si c'était une porte (une verrière voulue peut rester).
14. **Peinture** (arbitrage « aucun euro sans geste ») : pastilles « Rien · Murs · Plafond · Les
    deux » par pièce, **rien par défaut** ; murs hors ouvertures et **moins la faïence décidée**,
    plafond hors trémie ; lot « Peinture » (avant Équipements) ; prix du catalogue tenus par
    `coherence.mjs`. La fiche faïence ne dit plus « le reste des murs est peint ».
15. **Contrat 1.14.0** (ajout pur) : `sols[].poncage`, `rooms[].peinture`, `provenance.murs[].
    porteurAVerifier`, `etudes.ossatureCreee` ; `toiture` null en appartement. **Estimateur**
    (`plan-correspondance.ts`, touché pour la peinture) : lit `poncage` quand il est dit (un contrat
    antérieur garde la déduction D8), relie les deux postes de peinture, signale un porteur à
    vérifier, dit pourquoi l'étude est comptée, et une ligne regroupée reste « déduite » si l'une de
    ses sources l'est.

**Ce qui n'est pas fait, et pourquoi.**
- **« À remplacer » pour les équipements** (pro09) : la pose se chiffrerait (même poste que « à
  poser »), mais le catalogue n'a **aucun poste de dépose d'un équipement** — `deposeEquip` est un
  ouvrage abandonné (D19). La condition posée (« dépose + pose, sans poste inventé ») n'est pas
  remplie. Il faudrait un poste « Déposer un équipement (sanitaire, chauffage) » au catalogue — à
  décider par Dani —, puis `etat: 'remplacer'` lu comme `creer` + dépose dans la correspondance.
  En attendant : « À déposer » sur l'ancien, un neuf « À poser » au même endroit.
- **Lot du plancher bois** : il reste au lot « Toiture » (le catalogue le range en charpente) ; le
  renommer relève du chantier du Suivi (arbitrage L : « Charpente / couverture »).
- **Aperçu de l'outil Doublage** : une face interdite n'est pas encore dessinée en rouge au survol ;
  le refus se lit au lâcher (toast).
- **Toujours pendant depuis D36** : `plan-correspondance.ts` applique encore une faïence mi-hauteur
  par défaut à toute pièce humide dont la faïence n'est pas choisie.
- **L'exemple T2** montre désormais les vraies alertes de sa pièce WC (WC ouvrant sur le séjour,
  porte qui tape la cuvette) que la fusion en « cellier » cachait : au chantier de l'exemple de les
  résoudre (arbitrage G : 0 alerte).

**Contrôles.** Nouveau `tools/metier.mjs` (65 vérifications, **à ajouter à la batterie**) : ponçage,
parquet neuf, sol gardé, conseils, rehausse, migration, plancher d'étage, faces de doublage,
appartement, fusion WC / cellier, façade, cloison après le premier contour, question « porteur ? »,
fenêtre intérieure, peinture. Mis à jour en gardant leur intention : `structure.mjs` (une poutre
ajoute aussi l'étude, une seule fois), `budget.mjs` (la face extérieure reçoit une ITE, plus une
ITI), `coherence.mjs` (+2 prix tenus), `scene-reference.mjs` (chambre en parquet neuf repeinte ;
scène variantes : parquet poncé, sol gardé, plafond seul), tests de correspondance (+6), fixture du
contrat régénérée (1.14.0).

## D38 · Robustesse et zéro perte de travail : rien ne se perd, rien n'agit derrière une fenêtre (24/09/2026)

**Constat (jury : chasseur de bugs, accessibilité, rétention, débutant, designer, cohérence, pro).**
Le plan était juste ; c'est ce qu'on pouvait lui faire *sans le vouloir* qui ne l'était pas.
- **Pertes de travail** : « Nouveau », un plan type, « Feuille blanche » (depuis le guide rouvert)
  remplaçaient le plan sans rien demander ; seul un Ctrl+Z en mémoire le retenait, et au
  rechargement l'exemple T2 revenait à la place (il se rechargeait dès que le plan était vide).
  Deux « Nouveau » faisaient deux choses différentes. En gratuit, un 2e plan se dessinait, ne
  pouvait pas s'enregistrer, et disparaissait en rouvrant le 1er — sous le slogan « illimité ».
  La croix de « Mes plans » effaçait définitivement. « Ouvrir » le plan déjà ouvert rechargeait sa
  vieille version. La sauvegarde automatique existait, mais rien ne le disait. Une photo de
  téléphone en calque disparaissait au rechargement (trop lourde), et l'aide promettait les PDF.
- **Fenêtres** : Tab passait derrière le voile, Échap ne fermait rien, Suppr effaçait le mur
  sélectionné derrière « Estimer », une lettre changeait d'outil sous l'accueil ; ni rôle de
  dialogue ni focus. Fermer l'accueil d'un clic à côté le faisait revenir à chaque visite.
- **Clavier** : Cmd+C passait sur l'outil Cote (sélection perdue), Ctrl+D sur Doublage, Ctrl+S
  n'enregistrait pas ; Espace n'activait aucun bouton (intercepté par « Espace + glisser »).
- **Vue Travaux** : Suppr effaçait l'existant — le mur disparaissait aussi du relevé, sa
  démolition sortait du chiffrage, le budget *baissait*. **Vue finale** : annoncée « pour
  modifier, repasse en Projet », elle laissait tracer un mur « à créer » invisible (+375 €).
- **Bugs** : sélectionner plusieurs équipements hors Travaux levait `it is not defined` et figeait
  le plan (render() s'arrêtait avant draw()) ; Ctrl+Z en plein tracé laissait un mur fantôme ; la
  2e pièce fermée contre la 1re continuait le tracé (le clic suivant tirait un mur en diagonale) ;
  le panneau gardait son défilement d'un élément à l'autre (la décision « À démolir » hors de vue) ;
  deux séparations en L signalées ⛔ « extrémité en l'air » sur l'exemple et tous les plans types ;
  les deux faces d'un mur démoli « côté extérieur » ; au doigt, le plafonnier captait le toucher
  destiné à la pièce ; le canvas en double après un changement d'écran (densité de pixels) ;
  l'export oubliait les pages Travaux / Après travaux quand les travaux étaient des équipements ;
  « Copier le plan complet » écrasait le bloc à envoyer.

**Décisions.**
1. **Un seul socle pour les fenêtres** (`openModal` / `closeModal` / `fermerModale` /
   `gardeModale`) : `role="dialog"`, `aria-modal`, `aria-labelledby` (le titre), focus initial sur
   le choix recommandé ou le bouton principal, Tab et Maj+Tab qui restent dedans, Échap / croix ✕
   (ajoutée à chaque fenêtre) / clic sur le voile qui ferment, focus rendu au bouton d'origine.
   Fermer l'accueil « par le côté » pose le drapeau et ne change pas le plan. Le calage du calque
   passe par le même socle (Entrée valide).
2. **Garde en tête du clavier** : fenêtre ouverte → seuls Échap et Tab la concernent, rien
   n'atteint le plan. Ctrl/Cmd + lettre ne change **jamais** d'outil ; **Ctrl/Cmd+S enregistre**
   dans « Mes plans ». Espace / Entrée sur un bouton **atteint au clavier** (Tab) l'activent ; un
   bouton seulement cliqué à la souris laisse Espace à « Espace + glisser » (et un clic sur le plan
   lui retire le focus). Le focus est rendu au bouton équivalent quand le panneau, les outils ou
   les vues se redessinent (`avecFocus`).
3. **Toast avec action** (`toast(msg, ok, {action, fn, ms})`) : « Annuler » (8 s), « Aller en … » ;
   il passe au-dessus d'une fenêtre ouverte au lieu de s'afficher derrière le voile.
4. **Suppr en vue Travaux** (arbitrage J, `marquerAuLieuDEffacer`) : sur ce qui existe, il
   **marque** — mur « À démolir » (avec la question « porteur ? » de D37 si elle se pose),
   ouverture « À boucher », équipement « À déposer » — avec « Annuler » ; il n'efface que ce qui a
   été créé en Travaux, et les annotations (notes, cotes). Sélection mixte ou rectangle : chacun
   selon son état. Le bouton rouge dit ce qu'il fera (`libSuppr`) ; la bulle d'aide aussi.
5. **Vue finale en lecture seule** : seuls Sélection, Sélection rectangle et Mesurer ; les 7 autres
   outils grisés (`aria-disabled`), refusés avec un message et « Aller en … » ; Suppr, flèches, R,
   Ctrl+V/D, glisser un mur ou une poignée, cliquer une cote : refusés (glisser déplace la vue). La
   fiche d'un élément se lit (réglages dans un `fieldset` désactivé) sous un bandeau « lecture
   seule » avec « Modifier en vue … », qui garde l'élément sélectionné.
6. **Zéro perte de travail** (arbitrage D) :
   - **Indicateur** près du nom (`#saveState`) branché sur la vraie écriture : « Enregistrement… »
     puis « Enregistré » (heure au survol), « Non enregistré » + message si le navigateur refuse.
   - Un plan déjà dans « Mes plans » y est **tenu à jour** (écriture groupée, 450 ms ; vidée avant
     tout remplacement et à la fermeture de la page). « Ouvrir » le plan ouvert ne recharge rien.
   - **Avant tout remplacement** (Nouveau, plan type, feuille blanche, exemple, ouvrir un plan —
     `avantDeRemplacer`), un plan qui porte du travail est **rangé dans « Mes plans »** ; le message
     le dit. Un plan vide, l'exemple ou un plan type **jamais touchés** partent sans regret et sans
     historique (`empreinte` : tout l'état sauf ce qui se recalcule — contours et ancres des
     pièces, qui changent d'une vue à l'autre). Ctrl+Z ne ramène plus un exemple qu'on n'a pas
     demandé, et la 1re « feuille blanche » dit « clique pour poser le 1er coin ».
   - **Gratuit** : la limite est annoncée **avant** — commencer un 2e plan quand « Mes plans » est
     plein ouvre « Version gratuite : 1 plan enregistré » (Commencer quand même / Passer Pro /
     Annuler) ; remplacer un plan non rangé ouvre « « X » n'est pas enregistré » (Continuer sans le
     garder / Passer Pro / Annuler). L'exemple retouché ne prend pas la seule place : on dit qu'il
     n'est pas gardé, avec « Annuler ». « illimité » disparaît (« Dessiner reste gratuit · 1 plan
     enregistré »).
   - Un seul « Nouveau » (celui de « Mes plans » appelle le même). Supprimer un plan : « Annuler »
     pendant 8 s. « Découvrir avec l'exemple » range d'abord le plan ouvert, puis ouvre l'exemple.
   - **Démarrage** : l'exemple n'est chargé qu'à la toute première visite (ou si le navigateur ne
     garde rien) ; un plan vide enregistré revient vide.
   - **Calque** : réduit à l'import (2000 px de côté, JPEG) ; s'il ne tient toujours pas, on le dit
     tout de suite ; un PDF est refusé en le disant. Les calques des plans rangés dans « Mes plans »
     ne sont plus effacés quand on en ouvre un autre (`chargerCalques`).
7. **Bugs** : branche multi-équipements corrigée (`its`, plus `it`) et `renderPanel` protégé — une
   erreur du panneau affiche un message, le plan se redessine, l'erreur reste levée à part pour
   les contrôles. Ctrl+Z pendant un tracé retire le dernier segment et le tracé repart du point
   d'avant (`resetGestes` sur annuler / rétablir). Une pièce fermée contre un mur existant termine
   le tracé. Le panneau revient en haut quand l'élément, l'outil, la vue ou l'onglet changent, et
   garde sa place quand on règle un champ (`panneauEnHaut`). Une séparation peut s'appuyer sur une
   autre séparation (`separationTouche`). Les côtés d'un mur démoli se lisent sur l'existant (sinon
   « côté A / B »). Au doigt, un point électrique ne cumule plus son élargissement et celui du doigt.
   Le canvas suit la densité de pixels (media query + `ResizeObserver` + recalage au dessin). Export :
   pages Travaux / Après travaux dès qu'une décision existe (équipements, sols, tâches). « Copier le
   plan complet » copie sa propre chaîne, derrière un lien discret « pour le support ».
8. **Vocabulaire** : les nouveaux messages nomment les vues par `nomVue()` (lu dans `MODE_LABEL`) :
   ils suivront le renommage « Avant travaux / Travaux / Après travaux » sans être réécrits.

**Ce qui n'est pas fait, et pourquoi.**
- **« Enregistrer » renommé « Créer une copie »** (retention05) : non. « Mes plans » n'est pas
  devenu la seule source — un plan n'y entre qu'à l'enregistrement ou avant d'être remplacé, pour
  ne pas consommer la seule place gratuite à l'insu de l'utilisateur. « Enregistrer » (et Ctrl+S)
  garde donc son sens : ranger ce plan dans « Mes plans ».
- **`inert` sur l'arrière-plan** (access02) : non posé — il aurait aussi rendu inerte le message
  « Annuler », qui vit dans la zone du plan. Le piège de tabulation, `aria-modal` et la garde du
  clavier couvrent le même besoin.
- **Barre du haut** : l'indicateur est posé près du nom ; la barre sur une ligne dès 1024 px et le
  menu Fichier relèvent du chantier visuel (elle déborde encore à 1024 px).
- **Changement de densité de pixels** : le navigateur de test n'émet ni l'événement de la media
  query ni celui du `ResizeObserver` en émulation ; le contrôle vérifie le recalage au premier
  dessin qui suit.

**Contrôles.** Nouveau `tools/robustesse.mjs` (96 vérifications, **à ajouter à la batterie**),
avec de vrais gestes clavier et souris : fenêtres (rôle, focus, Tab, Échap, voile, focus rendu,
rien derrière), Ctrl/Cmd + lettre, Ctrl+S / Z / Y, Espace, tracé (Ctrl+Z, 2e pièce), Suppr en
Travaux (mur, fenêtre, meuble, neuf, mixte, rectangle, « Annuler »), vue finale en lecture seule,
sélection multiple d'équipements dans les trois vues, filet de sécurité du panneau, défilement,
pertes de travail (Pro et gratuit, rechargement, indicateur, suppression annulable), séparations,
côtés d'un mur démoli, toucher au doigt, export, calque, densité de pixels. Mis à jour en gardant
son intention : `review.mjs` (le passage en viewport mobile recharge la page et rouvre l'accueil :
on le ferme avant de tester les raccourcis, qui ne passent plus sous une fenêtre).

## D39 · Un seul langage, honnête, avec glossaire (24/09/2026)

**Constat (jury : débutant, pro du bâtiment, cohérence, design, rétention, QA, accessibilité).**
Le plan disait la même chose avec trois mots, et parfois le contraire de ce qu'il faisait.
- **Vues et états** : « 🏠 Existant / 🛠 Projet / ✅ Final » ; en vue Existant, un mur proposait
  « Rien de prévu / Je le garde / À démolir », puis, juste en dessous, « l'état de ce mur se règle
  en vue Projet [Passer en Projet] » ; en Projet, les mêmes boutons s'appelaient « Existant /
  Conservé ». Estimer demandait de mettre « Conservé », un bouton absent de la vue où l'on était.
- **Mots internes** : « le moteur », « lot », « poste au catalogue », « base de prix », « BET »,
  « BA13 », « placo », « Contrat 1.12.0 · 19 Ko », « Voir le JSON envoyé au moteur » ; et des
  mots de métier jamais expliqués (doublage, tapée, dormant, allège, chape, ragréage, trémie…).
- **Traces de maquette** : chip « Éditeur de plan · maquette 2D », interrupteur ★ Pro / 🔓 Gratuit
  cliquable par tous, notes « 🔌 Maquette », « 🔒 Maquette : au branchement… », trois « Passer Pro »
  qui répondaient par un toast « Maquette : ce bouton mènera… », et « Envoyer vers mon estimation
  AVYORA » qui menait à un écran d'import que le site n'a pas (ImporterPlan non monté).
- **Pro incohérent** : un abonné lisait « le détail poste par poste arrive avec Pro » ; le paywall
  promettait un « suivi de chantier chiffré » et un détail « ajusté à ta région » qui n'existaient
  pas ; le Suivi n'avait aucun prix ; le gratuit voyait « 10 283 € si tu les remplaçais » sous un
  budget masqué.
- **Décence** : « en dessous de 9 m², ce n'est pas une chambre au sens du décret décence » pour
  chaque chambre, « sous les 2,20 m réglementaires » pour chaque WC ou cellier — c'est inexact : le
  texte demande qu'**au moins une** pièce principale fasse 9 m² avec 2,20 m, ou 20 m³.
- **Raccourcis** : deux listes écrites à la main qui divergeaient (R à 90° ou « rotation libre » ;
  D, B, T absents de l'une). Deux outils affichés « Sélection », « Calque » et « Calques » pour deux
  choses, un outil « Texte » qui posait des notes.
- **Suivi** : lots dans le désordre (isolation après cloisons, façade après sols, faïence rangée
  dans « Sol », plancher bois dans « Toiture ») ; libellés sans article (« Poser fenêtre »,
  « Poser vmc (caisson) », « Poser lave-linge » pour une arrivée d'eau à créer, « Percement, linteau
  & tableaux » dans une cloison de 7 cm, « Fenêtres de toit (Velux) »).
- **Divers** : épaisseurs en mm ici, en cm là ; « λ 0.035 », « m².K/W » ; placeholder « 33620 »
  lu comme une valeur ; « Surface habitable » sur un garage ; « Parpaing / Pierre » pour dire 20 cm
  ou 60 cm ; produits de l'exemple avec prix inventés et liens d'enseignes ; « Budget cible
  25 000 € » ; une pièce tracée baptisée « Chambre » au hasard ; 4 m cliqués = 3,80 m à l'intérieur.

**Décisions.**
1. **LEX** (en tête du script) : les vues « Avant travaux / Travaux / Après travaux » et les états
   « À décider · Je garde · À démolir / À déposer · À remplacer · À boucher · À créer / À poser »,
   avec leur sous-titre. Le code garde ses clés (`existant/projet/final`, `existant/garder/…`).
   `MODE_LABEL` et `nomVue()` lisent LEX ; les boutons de vue n'ont plus d'emoji ; les textes fixes
   lisent LEX par `data-lex`. **Un seul composant d'état** (`choixEtat` / `segEtat`) sert les deux
   vues : en Avant travaux, ce qui a un sens sur l'existant (décider, garder, démolir / remplacer /
   déposer) ; en Travaux, la liste complète — mêmes mots, même ordre, mêmes couleurs. Titre
   « Décision » partout ; la consigne contradictoire « se règle en vue Projet » est retirée.
2. **Glossaire** : `GLOSSAIRE` (42 mots, une phrase chacun) et `gl(clé)`, une pastille ⓘ qui est un
   vrai bouton (nom accessible « C'est quoi, … ? », `aria-expanded`, `aria-describedby`) : bulle
   `role="tooltip"` au survol, au focus clavier et au clic (épinglée), fermée par Échap (sans
   désélectionner) ou un clic ailleurs, recalée pour ne jamais sortir de l'écran (et fermée si sa
   pastille disparaît). Posée une fois par panneau et par mot : mur (cloison, porteur, linteau,
   doublage, ravalement), fenêtre (allège, tableau, pose, tapée, dormant, pont thermique,
   oscillo-battant), pièce (faïence, faux plafond, surface habitable, chape, ragréage, dalle,
   dépose), outil Doublage (doublage, ITI, ITE, R, λ, aides), toiture (faîtage, pignon, combles,
   fermettes), chantier (TVA, HT), Suivi et Estimer (corps d'état, HT), escalier, spots, ossature.
   L'Aide (bouton ?) a deux onglets : Raccourcis et Glossaire (`ouvrirAide('gloss')` pour le futur
   menu Aide). Le focus d'ouverture d'une fenêtre ne tombe jamais sur une pastille.
3. **Mode développeur** : `isDev()` (`?dev` dans l'adresse, classe `html.dev`, `.devonly`). Seul
   lui montre l'interrupteur Pro / Gratuit, la mention « maquette », le contrat, le JSON et
   « Envoyer vers mon estimation AVYORA ». La note de « Mes plans » dit simplement « Tes plans sont
   enregistrés dans ce navigateur, sur cet appareil ».
4. **Gratuit / Pro** : une table `DROITS` (dessin, contrôle, budget, suivi, export, plans), reprise
   **mot pour mot** par le pied, le paywall (« Ce que Pro ajoute » = `droitsPro()`), le Suivi,
   l'export, « Mes plans » et les fenêtres de limite (`avecPro(k)`). Elle ne promet que ce qui existe
   ici (plus de « ajusté à ta région », plus de produits « reliés à la base de prix »). « Passer Pro »
   est un vrai lien vers `https://getavyora.fr/tarifs` (nouvel onglet ; `passerPro()` dans les
   fenêtres de choix). Un Pro ne lit jamais « avec Pro » : sa carte budget est un bouton « Voir le
   détail » qui ouvre Estimer. En gratuit, l'arbitrage n'affiche plus de montant. `isPro()` lit
   d'abord `window.AVYORA_PRO` si le site l'injecte ; sinon, comme avant (Pro par défaut).
5. **« Estimer ce plan » = l'écran de la valeur** (arbitrage C) : le montant d'abord (HT ⓘ, indicatif,
   « ta finition, ta région et la TVA n'y sont pas encore appliquées »), avec tâches, corps d'état
   et « à décider » ; le détail **par corps d'état** (barre, total, repliable) puis **par tâche** ;
   **« Encore à décider (n) »** — chaque ligne sélectionne son objet sur le plan (`montrerSurLePlan`,
   même règle que `quantities().arbitrage`, plus les sols sans décision) ; **« Pas encore chiffré »**
   (tâches à 0 €, dites) ; ce que le plan ne dit pas encore ; puis **un seul appel principal**
   (Exporter le dossier) et « Enregistrer dans Mes plans ». Les quantités mesurées sont repliées
   (`quantitesHTML`, reprises telles quelles par la page « Quantités » de l'export). En gratuit :
   montant flouté, vrais corps d'état et nombre de tâches, « Ce que Pro ajoute », lien Tarifs.
   `SEUIL_ARBITRAGE` sort de `quantities()` pour être partagé ; une ouverture dans un mur démoli
   n'est plus « à trancher » (elle part avec son mur).
6. **Le Suivi est un planning** (arbitrage L) : `LOTS` = Études → Démolition → Maçonnerie →
   Charpente et couverture → Menuiseries extérieures → Façade → Isolation → Plâtrerie et cloisons →
   Électricité et plomberie → Sols → Faïence → Menuiseries intérieures → Peinture → Équipements.
   Faïence à part, plancher bois en charpente, menuiseries séparées par `isExtType`, points
   électriques et arrivées d'eau dans leur lot (avec « les gaines et les arrivées d'eau passent
   avant que les cloisons soient fermées »), mur épais créé en maçonnerie. Libellés de pro : un
   verbe, un article, la pièce (`OUV_NOM`, `LIB_EQUIP`, `FAC_ACTION`, `POSE_SOL`, `piecesAutour`) —
   « Poser la fenêtre neuve · Chambre », « Ouvrir la cloison pour la porte entre Séjour et
   Chambre », « Créer l'arrivée et l'évacuation du lave-linge », « Remplacer le tableau électrique
   (mise aux normes) », « Poser 2 fenêtres de toit ». En Pro : prix de chaque tâche, total par corps
   d'état, « X € réalisés sur Y € HT ». Un clic sur le texte d'une tâche sélectionne son objet
   (vue Travaux, bon niveau, recentrage) ; la case, elle, coche. **Aucun montant ne change** :
   vérifié tâche par tâche contre la version d'avant sur la scène de référence, les variantes,
   l'exemple et les quatre plans types.
7. **Décence dite prudemment** : une petite chambre (< 9 m²) est une info « si tu loues, vérifie » ;
   une pièce de vie sous 2,20 m aussi ; plus rien sur un WC ou un cellier ; le seul seuil vérifié
   l'est **sur le logement** (`decenceLogement` : au moins une pièce de vie de 9 m² avec 2,20 m, ou
   20 m³), une fois, « à vérifier », sans citer de texte. « Réglementaire » et « décret » disparaissent
   de l'écran ; le sas des WC devient « le règlement sanitaire de ton département demande en
   général… : à vérifier ».
8. **Une seule liste de raccourcis** : `keysHTML()` rend l'accueil et l'Aide ; les outils viennent de
   `TOOLS` + `TOOL_TIP` (D, B, T y sont d'office), les gestes de `KEYS_GESTES` (R = 90°, poignée =
   pas de 15°, Maj+clic partout). Outils : « Zone » (B), « Note » (T), « Fond de plan » (libellé
   court « Image »), bouton « Affichage » ; `TOOL_TIP.doublage`.
9. **Mots justes** : « Travaux décidés », « Pièces après travaux », « Murs maçonnés (20 cm) » /
   « Murs anciens épais », « Équipements dessinés (mobilier compris) », « non compté dans le
   budget », « étude de structure », « plaque de plâtre » ; ⚡ réservé à l'électricité (Estimer et
   Suivi ont une icône SVG) ; épaisseurs en cm partout (`cmDe`), λ et R à la virgule, m²·K/W,
   Geist Mono sur les nombres seulement ; types de mur « Cloison · Mur (20 cm · béton, parpaing) ·
   Mur épais (60 cm · pierre) · Séparation » ; « Surface au sol » pour un garage, une cave, des
   combles, un balcon, et avant travaux pour un volume non habitable (`horsHabitable`) ; code postal
   « 5 chiffres », champ vide en pointillés ; l'exemple n'a plus ni prix inventé, ni lien
   d'enseigne, ni budget cible ; plus de nom d'enseigne dans les exemples de saisie.
10. **Une pièce tracée** garde son type deviné marqué « ? » sur le plan et « deviné d'après la
    surface » dans sa fiche tant qu'on ne l'a pas choisi (`typeAuto`, hors contrat) ; le message de
    fermeture propose « Choisir son type ». **Le premier contour** d'un plan vide, en murs épais,
    suit l'intérieur des pièces (sauf choix explicite de l'alignement) : 4 × 3,5 m cliqués = 14,0 m²
    à l'intérieur, le mur pousse dehors, et le volet le dit.

**Ce qui n'est pas fait, et pourquoi.**
- **« À enlever »** pour un équipement (coherence16) : non, l'arbitrage E fixe « À déposer ».
- **Toast de différence** à chaque décision (« +2 580 € · mur porteur démoli », novice06) : pas fait
  — il écraserait les messages qui portent une action (« Annuler »). La carte budget ouvre désormais
  le détail, qui répond à « d'où vient ce montant ».
- **« Estimer ce plan · Pro » dans la barre du haut** (coherence10) : la barre déborde déjà à
  1 440 px avec ce suffixe ; le bouton dit « Avec Pro : … » au survol, le pied dit « · Pro ». La
  barre sur une ligne et le menu Aide relèvent du chantier visuel.
- **Renommer l'outil « Doublage » en « Isoler un mur »** (novice08) : non — « doublage » est le mot
  de la fiche, du Suivi et du devis ; il a sa bulle (« Isoler un mur (doublage) : … ») et son ⓘ.
- **« Corps de métier »** (coherence14) : on garde « corps d'état », le mot de l'arbitrage C et du
  site, avec son ⓘ.
- **Mini-palette « C'est quoi ? » posée sur le plan** (novice16) : remplacée par le « ? », la fiche
  et « Choisir son type » ; une palette dans le canvas demande le chantier visuel.
- **Cote intérieure pendant le tracé** (novice19) : le tracé reste coté à l'axe jusqu'à la fermeture ;
  une fois fermé, les cotes intérieures valent ce qu'on a cliqué.
- **`isPro()` vrai par défaut** : inchangé (le site injectera `window.AVYORA_PRO`). La page publiée
  seule reste donc en Pro pour qui l'ouvre.
- **Emojis** hors de ce que ce chantier a touché (couches d'affichage, 🛒, 📝, 🔎, 🏠 de la
  toiture, bandeau téléphone) : au chantier visuel.

**Contrôles.** Nouveau `tools/langage.mjs` (77 vérifications, **à ajouter à la batterie**) : il lit
tout ce qui s'affiche (texte, bulles, titres, libellés accessibles, exemples de saisie) dans 375
états — accueil, chaque mur / ouverture / équipement / pièce et chaque outil dans les trois vues,
Suivi, Estimer, export, Mes plans, Aide, en Pro, en gratuit et avec `?dev`, sur l'exemple, la scène
de référence et ses variantes, les fenêtres fixes et les messages des gestes courants — et refuse
« maquette », « moteur », « catalogue » (hors « prix catalogue »), « poste », « BET », « placo », les
anciens noms de vues et d'états, « décret / réglementaire », les enseignes, « λ 0.035 »… ; un Pro
ne lit jamais d'invite Pro. Il vérifie aussi : états identiques dans les deux vues, pastilles par
panneau (une fois par mot), bulle (survol, clic, clavier, Échap, clic ailleurs, dans l'écran à
1 400 et 420 px), `?dev`, DROITS mot pour mot et lien Tarifs, raccourcis uniques et complets,
décence au niveau du logement, Suivi (ordre, verbes, pièce, prix, « réalisés sur », clic), Estimer
(montant d'abord = budget, corps d'état ordonnés, chaque tâche, « Encore à décider » = arbitrage,
un seul appel, clic → objet), garage, types de mur, code postal, exemple, unités, premier contour
et type deviné. Mis à jour en gardant leur intention : `budget.mjs` (« non comptée dans le
budget », lot « Plâtrerie et cloisons », « Poser la fenêtre de toit »), `metier.mjs` (plancher béton
/ bois, lot « Charpente et couverture »), `existant.mjs` (même lot ; un mur épais créé va en
maçonnerie), `decision.mjs` (titre « Décision » dans les deux vues, liste complète en Travaux,
« Épaisseur du cadre (tapée) »), `robustesse.mjs` (l'outil B s'appelle « Zone »), `coherence.mjs`
(le bloc « hors plan » ne cite plus de nombre de postes). Fixture du contrat régénérée : seuls les
libellés et lots du `suivi` et les textes des contrôles changent (contrat 1.14.0 inchangé).
