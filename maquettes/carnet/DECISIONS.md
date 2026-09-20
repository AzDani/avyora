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
