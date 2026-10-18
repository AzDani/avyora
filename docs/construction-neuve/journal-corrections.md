# Journal des corrections — catalogue du neuf, brouillon → v1

Sources des vérificateurs : `verif-etudes.json`, `verif-terrain.json`, `verif-gros.json`, `verif-second.json`, `jury-conducteur.json`, `jury-economiste.md`. Construit par `build-v1.mjs`, contrôlé par `valide-v1.mjs` (JSON valide, ids uniques, refs existantes et dans un lot de même nom, aucune clé (c, n) en double).

**Bilan :** 190 → **202 postes** (99 nouveaux + 103 repris) · **10 prix nouveaux changés** · **13 ajouts** (10 nouveaux postes, dont 4 jalons à 0 €, + 3 postes repris) · **1 retrait** · aucun prix repris modifié (14 corrections à soumettre à Dani).

Règles suivies : un prix nouveau n'est changé que sur une source lue avec un chiffre explicite ; un prix repris n'est jamais changé ; un poste manquant n'est ajouté qu'avec un prix sourcé, sinon il va dans « non chiffré » (`decisions-dani.md`).

---

## 1. Prix des postes nouveaux changés (10)

| Poste | Brouillon (fp / sm) | v1 (fp / sm) | Raison et source |
|---|---|---|---|
| `etu-constat-affichage-commissaire` | 500 / — | **350** / — | 500 € HT est un tarif parisien. Hors Paris : 265 € TTC (3 passages regroupés, Toulouse), 359 € TTC (3 constats), 450 € TTC (GMBG), guides 2025 250-500 € TTC → médiane ≈ 400-450 TTC (verif-études). |
| `etu-etude-beton-arme` | 1 800 | **2 000** | Structatis « à partir de » 2 499 € TTC (≈ 2 083 HT), travaux.com « à partir de » 1 950 € HT (verif-études). |
| `tax-taxe-amenagement-stationnement` | 161,04 | **172,75** + variante IDF (× 1,1695 = 202,03) | La redevance d'archéologie (0,4 %) s'applique aussi aux places : 2 928 × (3 + 2,5 + 0,4) %. CGI art. 235 ter ZG, service-public F23263 (verif-études). Libellé corrigé. En IDF, + 1 % régional. |
| `anx-wc-de-chantier` | 5 / 5 | **8 / 8** €/jour | 5 € est le « à partir de » d'Obat ; Hellopro 155-447 €/mois vidange comprise (milieu ≈ 10 €/jour, 8 € si TTC) (verif-terrain). +810 € sur A. |
| `rac-extension-reseau-electrique-part-fixe` | 1 529 | **1 658** | Barème Enedis V8, annexe CRE 2026-160 : part fixe ZFA 2 764 € HT − 40 % de réfaction (verif-terrain). |
| `rac-extension-reseau-electrique-au-metre` | 63 | **68,4** €/ml | Même barème : 114 €/ml − 40 % (verif-terrain). |
| `fon-vide-sanitaire-complet` | 150 / 75 | **180 / 95** | Les sources du brouillon chiffraient des entrevous **béton non isolants** (CYPE GBV010 : « isolation non mentionnée ») alors que le libellé promet des entrevous isolants ; prix-travaux-m2 (01/2026) : hourdis PSE 98-185 € contre béton 84-116 € (+≈ 40 €/m²) (verif-terrain). Désaccord : le jury conducteur voulait le garder « incertain » sans le bouger ; la source du vérificateur terrain est explicite, on la retient. Le vide sanitaire redevient plus cher que dalle + soubassement (+809 € sur A), comme l'usage le veut (180 € reste une hypothèse basse : surcoût de 3 000 à 8 000 € selon L'artisan-conseil). |
| `mac-mur-brique-monomur` | 123 / 63 | **125 / 80** | Le fourni-posé tient (CYPE 115,85 € HT de déboursé), mais la fourniture seule était sous le prix de la brique (CYPE 85 €/m², travaux.com 50-80 € hors pose). Standard inchangé (115 €), seul « Je le fais » change (verif-gros). |
| `cou-gouttiere-pvc` | 42 / 12 | **34 / 12** | Maisonbionat 15-40 € TTC/ml posé ; CYPE 23,14 € HT de déboursé (× 1,32-1,76) → 32 € en standard (verif-gros). |
| `cou-descente-eaux-pluviales` | 27 / 10 | **37 / 10** | Descente zinc (assortie à la gouttière zinc par défaut) : Couverture Angers 30-60 €/ml, Maisonbionat 25-60 € TTC/ml → 35 € en standard (verif-gros). |

## 2. Postes ajoutés (13)

| Poste | Prix (fp / sm) | Règle | Raison et source |
|---|---|---|---|
| `rec-attestation-argile-daact` (Contrôles & réception, phase 9) | 292 / — | si argile moyen ou fort | Obligatoire à la DAACT ; sans constructeur, un contrôleur ou un BET la signe. Expertisol et Enrgetic : 350 € TTC (verif-études, service-public F1997). |
| `rec-attestations-parasismiques` (idem) | 433 / — | si zone sismique ≥ 3 | Expertisol : PCMI13 170 € TTC + attestation d'achèvement 350 € TTC (verif-études). Une seule source : confiance basse. Nouvelle question « zone sismique ». |
| `tax-redevances-spanc-controles` (frais) | 270 / — | si assainissement individuel | Redevances de conception + bonne exécution, distinctes de l'étude : Guingamp 276, Pornic 278, Haut-Béarn 250, Tulle 232 € (verif-études et verif-terrain ; le terrain proposait 278, l'écart est négligeable). |
| `vrd-tube-pehd-eau-potable` | 4,41 / 4,22 €/ml | D, toujours | Le tuyau compteur → maison manquait (fourreau compté, tuyau non). Grand Annecy 2025 : fourni-posé 4,36-4,41 €/ml ; Mecafluid : couronne 50 m 211,24 € HT (verif-terrain, jury conducteur). |
| `mac-rupteurs-thermiques-plancher` | 19,6 / 9,45 €/ml (standard ≈ 18,5) | P, si maison maçonnée à étage isolée par l'intérieur | CYPE GPH070 : 13,99 € HT/ml de déboursé (fournitures 8,32) ; × 1,32 (coefficient de vente du cours BTS eduscol, cité par verif-gros) = 18,5 € en standard, **bas de fourchette** (verif-gros). Le jury conducteur le jugeait non chiffrable (source Ruptherm de 2012) : la source CYPE de verif-gros est récente et explicite. Cochage d'office : arbitrage h-9 du jury conducteur. |
| `anx-benne-second-oeuvre` | 400 / — | toujours | Le jury conducteur demande 2 bennes (une au gros œuvre, une au plâtre). Le moteur met 1 à toute unité `forfait` : la 2ᵉ benne est donc un poste à part, **au prix du poste rénovation** (400 € « par benne »), placé en phase 7. |
| `etu-demandes-de-raccordement` (frais, 0 €) | jalon | toujours | Délai Enedis 2-6 mois : chemin critique, à lancer dès le permis (jury conducteur). |
| `anx-declaration-dt-reseaux` (frais, 0 €) | jalon | toujours | DT obligatoire avant terrassement, à la charge du maître d'ouvrage en lots séparés (jury conducteur, recherche terrain). |
| `fon-reseaux-sous-dallage-poses` (frais, 0 €) | jalon | toujours | Les évacuations sous dallage se posent avant la dalle (jury conducteur, « ordre ») ; leur prix reste dans la plomberie et l'électricité (pas de prix sourcé pour scinder). |
| `tax-declaration-elements-imposition` (frais, 0 €) | jalon | toujours | Déclaration sous 90 jours qui déclenche la taxe d'aménagement (jury conducteur, recherche calibrage). |
| `{ref: cha-thermostat-pilotage}` | 250 / 120 (repris) | option, zones = chambres + 1 | La régulation du plancher chauffant n'est ni dans la PAC ni dans le plancher (verif-second, devis-artisan.fr 300-1 500 € TTC). Pas de nouveau prix : on reprend le poste rénovation existant, en option. |
| `{ref: clo-cacher-tuyaux-gaines-coffrage}` | 25 / 10 (repris) | 2 × 2,70 ml si étage | Gaine technique de toute maison à étage (jury conducteur, quantité **[métier]**). |
| `{ref: min-porte-interieure-ame-pleine}` | 450 / 255 (repris) | 1 si garage | Porte entre garage et maison, absente (jury conducteur). Prix plancher : une vraie porte isolante peut coûter plus (non sourcé). |

## 3. Poste retiré (1)

| Poste | Raison |
|---|---|
| `clo-bandes-a-joints-plaques-neuves` (6,2 €/m²) | **Doublon confirmé** (verif-second) : les prix de marché qui valident cloisons, plafonds et doublages comprennent déjà les bandes (Prix-Pose « rails, montants, fixations et bandes » ; travaux.com « fourniture + pose + joints »). −2 100 € HT sur A. L'autre option (garder les bandes et baisser les plaques) est impossible sans toucher aux prix repris. **Remplacé depuis par la décision D5 de Dani** : les bandes reviennent sur une ligne à part, celle de la rénovation (§ 8). |

## 4. Quantités et cochages (dans `calibre.mjs`, reportés au § c / § d de la conception)

| Changement | Raison (vérificateur) | Effet |
|---|---|---|
| Architecte : seuil et quantité sur la **surface de plancher** SP (≈ 1,017 × SH *[modèle]*), plus sur SH | Bug signalé (études) : la loi vise la SP | dessinateur jusqu'à ≈ 147 m² SH |
| Taxe d'aménagement : ST = SP + G (au lieu de SH + G) | cohérence avec la définition de la surface taxable | +90 € sur A |
| Lotissement : plan topo décoché ; hors lotissement, bornage coché si « terrain borné ? » = non | Bug : la question n'avait aucun effet (conducteur) | −988 € en lotissement |
| Étude béton armé cochée seulement si étage, sous-sol, toit plat, argile moyen/fort ou sismique ≥ 3 | Rarement commandée à part en plain-pied simple (conducteur) | −2 000 € sur A et C (le toit plat est ajouté par cohérence : il a un plancher à calculer) |
| Zone sismique ≥ 3 : + ⌈P/5⌉ raidisseurs par niveau, étude BA, attestations | recherche structure via conducteur | +4 065 € sur A |
| Sous-sol : plus de drain, plus de fouilles en pleine masse, plus d'évacuation du volume excavé | Double compte (terrain) : prix-travaux-m2 inclut excavation et drainage | sous-sol +10 % au lieu de +15 % |
| Toit plat : + dalle de toiture (plancher béton sur Etot) | Oubli (gros) : la toiture-terrasse est posée « sur dalle béton » | +13 200 € HT sur un plain-pied à toit plat |
| Chaînage : + P au niveau de chaque plancher d'étage maçonné | Oubli (gros) : la composition CYPE du plancher n'a pas de chaînage, le devis Batisigne les sépare | +1 190 € sur B |
| Linteaux et appuis : 2 unités par baie vitrée | Biais (gros) : une baie fait ≈ 2 fois la longueur | +170 € par maison |
| Linteaux : + 1 pour la porte garage → maison | conducteur | — |
| nFen ≥ SDB + WC + 1 + chambres sans porte-fenêtre | La cuisine de C n'avait pas de fenêtre (conducteur) | C : 4 fenêtres au lieu de 3 |
| Périmètre intérieur Pint = P − 8 × 0,33 (au lieu de 0,97 P) | conducteur (8 épaisseurs de mur) | ≈ −4 % de doublage |
| Refend porteur : plaque (« Doubler un mur ») + peinture sur 2 faces | Oubli (conducteur) : 51,6 m² non finis sur B | +3 190 € sur B |
| Monomur : peinture des murs extérieurs rétablie | Bug (conducteur) : 0 m² peint | la variante monomur n'est plus artificiellement basse (l'enduit plâtre reste non chiffré) |
| Peinture des murs : − 3,4 m² par porte intérieure | conducteur **[métier]** | −20 m² sur A |
| Échafaudage : pignons seuls en plain-pied, façade brute à étage | Quantité surévaluée (gros : ktel, 0-300 € pour un plain-pied) | −1 570 € sur A |
| Descente du garage d'une maison à étage : 2,6 m | conducteur | −3,1 ml sur B |
| Solin du garage en appentis (4,4 ml de raccords) contre une maison à étage | conducteur **[métier]** (le garage n'est pas sous le même toit) | +165 € sur B |
| Regards : nb descentes + 2 en tout-à-l'égout | Doublon (terrain) : le regard en limite est dans les forfaits de branchement (Belley, Guingamp, Quimperlé) | −150 € |
| Option « terre végétale à évacuer » : + 1,3 × 0,25 × décapage m³ | conducteur | +2 090 € sur A si cochée |
| Option « toit à pente faible » (17°) | conducteur **[métier]** : tuile canal du Sud | −7 800 € sur A si cochée ; liste des départements non inventée (décision Dani) |
| Question « gouttière » (zinc par défaut) | conducteur (PVC plus courant en standard, non sourcé) | décision Dani |
| Radier : coche « Isolant sous chape » | Trou (terrain) : le radier CYPE n'est pas isolé | — |
| Benne : 2 (gros œuvre + second œuvre) | conducteur | +400 € |

## 5. Ordre du chantier (blocs déplacés)

| Changement | Raison (jury conducteur) |
|---|---|
| Raccordement eau potable : phase 6 → **phase 2** | Eau de chantier pour le maçon, le façadier, le plâtrier |
| Façade : phase 5 → **phase 6** (renommée « Réseaux & façade »), après les VRD | L'enduit s'arrête au terrain fini : pluvial et remblai d'abord |
| Second œuvre : électricité → plomberie → chauffage / VMC → isolation (doublages, pare-vapeur) → **test intermédiaire** → plafonds et cloisons → benne → soufflage des combles → chapes | Le test intermédiaire avant les plaques ; le soufflage après les plafonds |
| Consuel : phase 7 → **phase 9** (bloc « Electricite ») | Il contrôle une installation terminée |
| Finitions : carrelage et faïence → peinture → **stratifié, parquet, plinthes** → portes → **garde-corps et escalier droit** (déplacés depuis la phase 4) → sanitaires → cuisine | On ne peint pas au-dessus d'un sol neuf ; garde-corps posé avec l'escalier |

## 6. Doublons rendus exclusifs par le périmètre (notes et libellés)

- **Ossature bois** : le mur comprend frein-vapeur, pare-pluie et tasseaux (c'est le périmètre de sa source principale, devis 2021 à 140 € HT « pare-vapeur, OSB3, pare-pluie et lattage ») ; le libellé est corrigé et le bardage se pose dessus. Le « frein-vapeur absent » signalé par le conducteur était donc compris. **Reste** (gros) : si l'on choisit le **composite** sur ossature bois, ≈ 7 à 12 €/m² de pare-pluie et tasseaux peuvent être payés deux fois (note ajoutée ; pas de prix sourcé pour un composite « lames seules »).
- **Surcoût argile** : « vide sanitaire » retiré de sa note (terrain).
- **Sous-sol** : note « ne pas ajouter drain, fouilles, évacuation » (terrain).
- **Raccordement égout** = partie publique + regard en limite ; VRD = partie privée (conducteur). L'écart de prix du forfait est une décision Dani.
- **Électricité** : « hors VMC » et « hors câble depuis le coffret » (second) ; **mise à la terre** = boucle en fond de fouille seulement (second).
- **Étude thermique / contrôles de fin** : pack global d'un même BET à ne pas cumuler (études).
- **WC / installation de chantier** : à décocher si le maçon les fournit (terrain, conducteur).
- **Plomberie** : comprend ventilation primaire et sortie de toit ; VMC : son rejet ; poêle : sa sortie (arbitrage h-9 du conducteur, pas de poste « sorties de toit »).
- **Dommages-ouvrage** : note sur la prime minimale (≈ 3 127-3 589 € TTC jusqu'à 220 000 €, reassurez-moi) et les exigences de l'assureur (études).
- **Taxe d'aménagement** : taux communal 1-5 % signalé (± 45 %) (études).

## 7. Propositions rejetées ou non appliquées

| Proposition | Qui | Pourquoi |
|---|---|---|
| Peinture des plafonds 29 → 24 € HT | économiste | **Rejetée.** verif-second confirme 29 € avec des sources indépendantes (Ootravaux plafond neuf 20-50 € HT ; Futura 2026 29-42 € HT). Désaccord noté. |
| Retirer le chaînage du refend (doublon avec le plancher) | conducteur | **Rejetée.** verif-gros montre que le plancher n'inclut aucun chaînage (CYPE GPH010, devis Batisigne) ; on ajoute même la ceinture au niveau du plancher. |
| Vide sanitaire « incertain, ne pas le bouger » | conducteur | Non suivie : source explicite de verif-terrain (ci-dessus). |
| Dalle non isolée + plancher chauffant sur panneau R 3,7 (h-4) | terrain, second, économiste | **Non appliquée.** Aucun prix sourcé pour le panneau épais ; aux prix du catalogue, la seule variante chiffrable coûte plus cher (199 contre 195 €/m², conducteur). Décision Dani. |
| Scinder le vide sanitaire (plancher hourdis + soubassement 4 rangs) | terrain | Non appliquée : pas de prix sourcé du soubassement 4 rangs ; à étudier plus tard. |
| Gouttière alu continu ≈ 70 € | gros | Non appliquée : aucune source pour le « continu » (verdict incertain). Reste 80. |
| Tuile béton, ardoise fibres-ciment, sous-face bois, semelle isolée (130-170 € « plutôt »), clôture de chantier, fouilles en pleine masse, surcoût argile, plancher chauffant | gros, terrain, second | Verdicts « incertain » sans chiffre sourcé : prix inchangés, listés dans `decisions-dani.md`. |
| Régulation du plancher chauffant à 300-1 500 € TTC | second | Pas de nouveau prix créé ; on reprend « Thermostat / pilotage » (rénovation) en option. |
| Peinture des portes intérieures (50-100 €/porte, HT/TTC non précisé) | second | Non ajoutée : base HT/TTC inconnue → « non chiffré ». |
| Câble coffret → tableau (fourniture 8,2 €/ml, pose inconnue), niche de coffret, anti-termites (prix de 2010), enduit plâtre intérieur (18-60 €/m²), planche de rive, marche ou perron, RC maître d'ouvrage + TRC, protection collective | terrain, conducteur, second, études | Pas de prix posé sourcé et récent → « non chiffré, à décider ». |
| Garde-corps des fenêtres d'étage | conducteur | Le poste repris existe ; pas de règle de quantité par défaut (dépend des allèges) → option manuelle. |
| Cloisons de B à 0,85 × SH ; sous-face sur les rampants de pignon ; plinthes hors SDB ; cuisine 4-5 ml | conducteur | Formulés au conditionnel ou sans source ; règle commune avec la rénovation pour la cuisine. Non appliqués. |
| Pente selon une liste de départements « Sud » | conducteur | Liste non sourcée : mise en question (« toit à pente faible »), défaut non ; liste à fixer par Dani. |
| Anti-termites coché selon le département | conducteur | Pas de table département → arrêté ni de prix récent : non chiffré. |
| Plain-pied plus cher que l'étage (+8 à +15 %) | économiste | Verdict incertain (sources contradictoires) : aucune correction. |
| Garage « sous le toit principal » | économiste | Pas de prix sourcé ; seul le solin d'appentis est ajouté. |
| Variante Enedis « coffret déjà posé » (430 € TTC, Selectra) | conducteur | Prix repris + repère simplifié : décision Dani. |
| Aléas 10 % et « le maximum » restreint | conducteur, économiste | Appliqués **dans le calibrage** comme propositions ; décisions Dani (paramètres du moteur). |

## 8. Corrections des prix repris → décision de Dani (rien n'est modifié)

| Poste repris | Statut | Proposition |
|---|---|---|
| Enduit monocouche | confirmée (CYPE) | 28/10 → 43/19 |
| Porte de garage | revue à la hausse (gros) | 1 200/800 → 1 966/1 566 (la synthèse proposait 1 655/1 205) |
| Porte d'entrée | revue (gros) | 1 600/1 150 → 2 150/1 550, coefficient PVC 0,60 maintenu (la synthèse proposait ≈ 2 800 et 0,40) |
| Raccords faîtage / noues | confirmée (CYPE) | 40/15 → 59/22 |
| Chape liquide | confirmée (second) | 40/20 → 30/— |
| Carrelage au sol | nouvelle (second) | 70/30 → 85/36 |
| Cloison | confirmée (second) | 50/20 → 45/20 |
| Consuel | confirmée (second) | 180 → 123 |
| Mise en service provisoire Enedis | revue (terrain, barème V8) | 250 → 447 (la synthèse proposait 414, barème V7) |
| Raccordement Enedis | confirmée (terrain, barème V8) | 2 000 → 1 586 |
| Micro-station | confirmée (terrain) | 12 000/6 600 → 9 500/5 500 |
| Raccordement égout | nouvelle (conducteur) | 2 500 → 2 226 (partie publique) |
| Escalier béton | synthèse, non contre-vérifiée | 4 500 → 3 800 |
| Plancher bois | synthèse, non contre-vérifiée | 90/45 → 106/51 |
| Plancher béton | **retirée** (gros : CYPE 93,61 € de déboursé) | reste 120/50 |
| Nettoyage de fin de chantier | **refusée** (terrain : Obat 20-35 €/m²) | reste 10 |
| Fermettes | **en suspens** (gros : sources contradictoires) | reste 80/40 |
| Fenêtre de toit | incertaine (gros) | reste 1 200/500 |

## 9. Script `calibre.mjs`

Lit désormais `catalog-neuf.v1.json`. Bugs corrigés : seuil de l'architecte (SH → SP), question lotissement sans effet, peinture du monomur à 0, double compte du sous-sol, forfait « benne × 2 » impossible dans le moteur (2ᵉ poste), toit plat sans dalle. Ajouts : aléas paramétrables (10 % / 7 %), modes « Qui réalise » (tout fait faire, une partie, le maximum restreint, le maximum du moteur actuel), 3 finitions, variantes A-OB et A-SS, effet de chaque correction de prix repris, questions v1 (sismique, borné, pente faible, gouttière, terre végétale, pilotage).

## 8. Après la v1 : bandes de plâtre à part, comme en rénovation (décision D5 de Dani, appliquée le 17/10/2026)

Dani : « dans la rénovation on a une ligne à part ; fais la même logique que la réno ». Le retrait du § 3 est remplacé : ce n'est pas le poste du brouillon qui revient (`clo-bandes-a-joints-plaques-neuves`, 6,2 €/m²), c'est **le poste de la rénovation, repris par `ref`** : `clo-finitions-platrerie-bandes-enduit`, « Finitions plâtrerie (bandes, enduit) », 15 € HT/m² fourni-posé dont 5 € de fourniture (14,15 € en finition standard). Aucun prix ne change : ni celui de la ligne, ni ceux des plaques.

| | Avant D5 | Depuis D5 |
|---|---|---|
| Ligne | aucune : « bandes comprises dans les plaques » | « Finitions plâtrerie (bandes, enduit) », lot Cloisons / Plâtrerie (phase « Second œuvre »), cochée avec les plaques |
| Quantité | — | les m² de plaques **cochées**, à leur quantité effective (calculée, ou saisie à la main) : faux plafonds + 2 × cloisons + 2 × cloisons hydrofuges + « Doubler un mur » + doublage des murs extérieurs (collé ou sur ossature). `ID_BANDES_PLATRE` et `m2PlaquesCochees` dans `neuf.ts`, calculés par `autoQtyNeuf` comme `derivedFinitions` en rénovation |
| « Je le fais » | — | possible (fourniture 5 €/m²) ; pris d'office en « une partie » et « le maximum », comme le reste de la plâtrerie |
| Notes | « Les prix des plaques / des doublages comprennent les bandes à joints » (lots Isolation et Cloisons / Plâtrerie, doublage collé, peintures des murs et des plafonds) | « Bandes et enduit : voir Cloisons / Plâtrerie » ; la note du lot Cloisons / Plâtrerie décrit la ligne (FR et EN) |

**Écarts voulus avec la formule de la rénovation** (`derivedFinitions` = 2 × cloisons + max(« Doubler un mur », ITI) + faux plafond) : en neuf, toutes les plaques chiffrées ont leurs bandes. Le doublage collé (poste propre au neuf) et la cloison hydrofuge y entrent ; « Doubler un mur » **s'ajoute** au doublage des murs extérieurs, parce qu'en neuf il habille d'autres parois (les deux faces du refend, le parement de l'ossature bois), alors qu'en rénovation les deux postes décrivent la même façade. La formule de la rénovation n'est pas touchée (T1 à 0) ; la cloison hydrofuge y reste sans bandes (constat de l'audit plan ↔ estimateur), ce qui changerait des prix réno : à décider à part.

**Effet** (finition standard, tout fait faire, aléas 7 %, 45000) :

| Maison | Plaques cochées | Ligne HT | Total TTC avant → après |
|---|---:|---:|---|
| A, plain-pied 100 m² | 347,16 m² | 4 912 € | 246 762 → **253 172 €** (+6 411 €, +2,6 %) |
| B, à étage 120 m² + garage | 500,72 m² | 7 085 € | 314 745 → **323 991 €** (+9 246 €, +2,9 %) |
| C, ossature bois 90 m² | 317,08 m² | 4 487 € | 245 317 → **251 172 €** (+5 855 €, +2,4 %) |
| A en « le maximum » (ligne en « Je le fais ») | 347,16 m² | 1 441 € | 189 110 → **190 990 €** (+1 880 €) ; fosse 195 743 → 197 623 € ; micro-station 200 441 → 202 321 € |

Sur A, l'écart se décompose exactement : ligne 4 912,31 € HT + TVA 20 % (982,46 €) + aléas 7 % (343,86 €) + dommages-ouvrage 3,5 % de la ligne (171,93 €, un frais : ni TVA ni aléas) = 6 410,57 €. Sur les 2 647 scénarios de T5, la même maison sans la ligne redonne la référence d'avant D5 au centime : rien d'autre ne bouge que la ligne et ce qui la prend dans sa base (dommages-ouvrage ; maîtrise d'œuvre complète quand elle est cochée ; aléas ; TVA). Sur les 2 647 scénarios, la hausse va de +0,5 % à +3,3 % (médiane +1,0 %).

**À savoir** : verif-second jugeait que les prix de marché des plaques comprennent déjà les bandes (§ 3). Dani a choisi la convention de la rénovation pour les deux natures : les prix des plaques (partagés, inchangés) s'entendent hors bandes, le doublage collé aussi. Si les devis demandés en D5 (a) montrent que les plaques les comprennent, la correction (baisser les plaques ou retirer la ligne) vaudra d'un coup pour la rénovation et le neuf.

**Projets enregistrés** : la sélection d'un projet neuf enregistré avant D5 n'a pas la ligne. Son total ne bouge pas (liste, fiche, PDF, détaillé rouvert) et la ligne y apparaît décochée, à cocher à la main. Tout nouveau chiffrage l'a : rapide, détaillé, « Affiner », rapide rouvert puis réenregistré.

