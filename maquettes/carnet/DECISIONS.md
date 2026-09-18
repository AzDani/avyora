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

**Ce qui reste ouvert.** Le catalogue de l'estimateur n'a **qu'un** poste de poutre, en IPN/HEA :
un lamellé-collé ou un béton armé sortent avec une déduction disant que la quantité est juste mais
le prix unitaire celui de l'acier. Et il n'a **aucun poste de poteau** : un poteau dessiné est
chiffré dans la maquette mais part dans les `ignores` de la correspondance. Les prix ci-dessus
sont validés, donc la création du poste « Poteau » n'attend plus qu'une décision.
