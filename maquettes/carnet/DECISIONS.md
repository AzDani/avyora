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
