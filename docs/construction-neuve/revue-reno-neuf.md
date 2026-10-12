# Revue rénovation / construction neuve : ce qui n'est pas corrélé, et le plan

Racine du dépôt : `/Users/dani/Desktop/CLAUDE CODE/renopilot/app`. Tous les chemins partent de là.

La revue a été faite en lecture seule : aucun fichier du dépôt n'a été modifié. Elle croise six regards indépendants et deux contre-lectures. J'ai revérifié dans le code chaque correction issue des contre-lectures. Les sondes de vérification sont dans `scratchpad/revue-reno-neuf/`, sous-dossiers `critique/` et `presentation/`.

---

## 1. En bref

- **On ne demande jamais si le projet est une rénovation ou une construction neuve.** `/projets/nouveau` affiche la rénovation d'office. Le neuf n'est accessible que par une pilule grise placée entre le titre et les cartes (`components/ChoixEstimation.tsx:41-49`).
- **« Je le fais » est bloqué par lot dans le neuf.** Seuls 74 postes sur 202 le proposent, et aucun en maçonnerie. Parmi les postes bloqués, 32 sont identiques à ceux de la réno, où le choix existe. La cause : la liste qui règle le défaut du mode « Je fais le maximum » (`PRO_TOUJOURS`) sert aussi à cacher le bouton (`lib/estimateur/detaille-neuf.ts:143`). La correction du seul code porte le total à 133 postes, sans changer aucun total par défaut.
- **Le détaillé neuf est brouillon, et ça se mesure.** À l'ouverture : 55 lignes et 92 postes cochés (réno : 22 lignes, 0 coché). Les 32 questions sont posées une par ligne. Tout déplié, il y a 3,6 fois plus de texte. 51 lignes d'alternatives reposent des questions déjà posées dans le questionnaire.
- **Les questions sur le bien ne sont pas posées de la même façon.** En plus, le moteur neuf ignore 5 compteurs de la réno : séjour, suite, couloir, buanderie, menuiseries. Il faut l'étendre avant de recopier l'écran.
- **Le moteur et les prix sont partagés, mais des chiffres divergent** : lignes perso (2 totaux différents en réno), bandes de plâtre, quantités automatiques (portes, robinets, SPEC), finition des semelles.
- **Dans l'autre sens, la réno garde des défauts que le neuf a corrigés** : rouvrir un rapide en gratuit ne fonctionne pas ; les vrais montants ne sont cachés qu'en CSS ; le détaillé n'est pas traduit ; « tu » et « vous » sont mélangés.
- **Garde-fou manquant** : le témoin du moteur réno (3 336 scénarios) n'est pas dans le dépôt. Le chantier N0 le versionne avant toute autre chose.
- **Le plan compte 15 chantiers (N0 à N14) et 11 décisions pour Dani**, dont 4 qui changent des prix réno publics (D4 option b, D5, D8, D10).

---

## 2. Ce qui n'est pas corrélé

Gravité : **F** = forte, **M** = moyenne, **f** = faible. La colonne « Correction » renvoie aux chantiers du §6 et aux décisions du §7.

| # | Sujet | Rénovation | Neuf | Grav. | Correction |
|---|---|---|---|---|---|
| 1 | Choix de la nature du projet | Écran réno par défaut, qui parle de « budget travaux » et d'« ampleur » (`app/projets/nouveau/page.tsx:37`, `lib/i18n/dictionaries.ts:42-48`) | Pilule grise de 40 px, Rénovation présélectionnée (`ChoixEstimation.tsx:41-49`, CSS l.232-240) | F | Pré-page « Quel est ton projet ? » (N2) |
| 2 | Qui décide de « Je le fais » | Le poste : le bouton apparaît dès qu'il a un prix de fourniture `sm` (`components/estimateur/Row.tsx:53`) | Le lot, via `JAMAIS_SOI_MEME` (`presets-neuf.ts:16`), `PRO_TOUJOURS` (l.36-37) et `PAC` (l.40), appliqués par `diyNeuf` (`detaille-neuf.ts:143`). Résultat : 74 postes sur 202 ; maçonnerie, fondations, charpente, couverture et menuiseries extérieures verrouillées | F | Règle par poste ; `PRO_TOUJOURS` ne sert plus qu'au défaut du mode « le maximum » (N1) |
| 3 | Mêmes postes, droits différents | Pour les 32 postes repris (parpaing, fenêtres, chape, charpente, fosse…), « Je le fais » est proposé. Il l'est aussi sur la PAC, les 2 clims, l'égout, la borne de recharge et la chaudière gaz | Ces 32 postes sont refusés. L'escalier bois est faisable en Menuiseries intérieures, pas en Charpente | F | Une seule décision par poste, plus un champ `pro` (N1, N5, D2) |
| 4 | Mise en page des questions sur le bien | Une carte, 7 intertitres, des grilles (`components/Estimateur.tsx:283-431`) : environ 11 rangées | 32 questions, une par ligne, dans 6 `<details open>` (`EstimateurNeuf.tsx:326-343`, `questions-neuf.ts:34-124`), toutes en pastilles | F | Même carte et mêmes composants ; choix techniques repliés (N6, N9) |
| 5 | Pièces : compteurs et moteur | 10 compteurs `Stepper` à partir de 0 (`Estimateur.tsx:368-379`). `Ctx` a 8 compteurs, plus `piecesEff` et `sdbEff` (`core.ts:438-446`) | 3 compteurs en pilule. Séjour, cuisine et couloir figés à 1, suite et buanderie à 0 (`presets-neuf.ts:27`). `MaisonNeuve` n'a pas ces champs et compte les pièces = 3 + chambres (`neuf.ts:24-53`, `:189`) | F | Champs dans le moteur (N8), puis même grille (N9) |
| 6 | Ce qu'on voit à l'ouverture | 4 titres de phase + 18 lots fermés = 22 lignes, 0 poste coché | 9 phases ouvertes + 9 jalons + 37 blocs = 55 lignes, 92 postes cochés (`EstimateurNeuf.tsx:75`, `:379`, `:392-394`). La maquette fermait les phases (`maquettes/neuf/app.js:114`) | F | Phases fermées à l'ouverture (N3) |
| 7 | Rangement des postes | 18 lots, chacun une seule fois | 37 blocs pour 24 lots. Maçonnerie, Électricité, Charpente et Annexes apparaissent 3 fois ; Isolation et Carrelage 2 fois dans la même phase. 7 blocs ne contiennent qu'un poste | F | Rangement par corps d'état ; la chronologie passe dans « Mon devis », la fiche et le PDF (N10, D1) |
| 8 | Libellés et notes | 27 caractères en moyenne ; 73 notes courtes | Postes propres au neuf : 83 caractères en moyenne (153 au maximum), note toujours affichée (165 caractères). 3,6 fois plus de texte tout déplié | F | Libellé d'affichage `nc` de 45 caractères au plus, notes repliables (N11) |
| 9 | Alternatives (un choix parmi plusieurs) | Variantes sur la ligne elle-même (`Row.tsx:122-172`) | 51 lignes réparties en 17 groupes exclusifs (`neuf.ts:479-497`), **et** la même question dans le questionnaire | F | Une « ligne de choix » par groupe ; retrait des questions en double (N10) |
| 10 | Total avec lignes perso | Deux montants : sans les lignes perso dans la barre live, la fiche et la liste (`Estimateur.tsx:111`, `projet.ts:73`, `EstimationResultat.tsx:364`) ; avec elles dans le devis et le PDF (`Estimateur.tsx:543`, `RapportPDF.tsx:164-166`) | `totauxAvecPerso` utilisé partout (`projet.ts:30-36`) | F | Un seul calcul (N7, D8) |
| 11 | Bandes de plâtre | +15 €/m² ajoutés automatiquement (`catalog.json:1024`, `core.ts:524`, `presets.ts:49`) | « Comprises dans les plaques » (`catalog-neuf.json:1052`, `journal-corrections.md:48`), au même prix de plaque | F | À trancher (N12, D5a) |
| 12 | Rouvrir un rapide en gratuit | Ne fonctionne pas : `demarre` vaut faux en édition (`EstimateurRapide.tsx:96`, `:125`), donc aucun chiffre et le message « Renseignez la surface ». La liste des pièces est perdue (l.237). Le PATCH efface le suivi de chantier (`app/api/projects/[id]/route.ts:35-41`) | Fonctionne (`EstimateurRapideNeuf.tsx:133`, statuts repris l.104-105) | F | Reprendre la logique du neuf, sans déclencher de fausse conversion (N4) |
| 13 | Ordre des questions | Type → surfaces → pièces → finition → TVA → budget → récap | Surface et code postal avant les niveaux ; finition dans un groupe fourre-tout final ; récap avant le budget | M | Reprendre le squelette réno (N9) |
| 14 | Composant selon la question | Segment, pastilles, cartes, compteurs, interrupteur selon le type de question | Tout en pastilles, y compris les 11 questions à deux choix. Le garage a un contrôle unique en son genre (`EstimateurNeuf.tsx:222-231`) | M | (N9) |
| 15 | Niveau de finition | 3 cartes avec description (`Estimateur.tsx:382-392`) | 3 pastilles sans description (`questions-neuf.ts:120-122`) | M | Composant `CartesFinition` partagé (N6, N9) |
| 16 | « Qui réalise » dans le détaillé | Aucun réglage global | `$qui` réécrit toutes les lignes cochées (`detaille-neuf.ts:64-72`, `:80`) | M | Sorti du questionnaire ; réglage visible qui n'écrase rien (N3) |
| 17 | Cuisine | Compteur de pièces | Oui/Non « cuisine équipée » (`questions-neuf.ts:48`). `cuisine` est un booléen dans `MaisonNeuve`, un nombre dans `Ctx` | M | Nouveau compteur `cuisines` + interrupteur « équipée » ; le booléen est conservé (N8, N9) |
| 18 | Surfaces, hauteur, menuiseries | Aide sur la surface, surface au sol modifiable, hauteur, compteur de menuiseries. « Emprise » = mesure intérieure | Pas d'aide, hauteur figée à 2,5 m, menuiseries déduites. « Emprise » = mesure extérieure, garage compris (`neuf.ts:137`) | M | (N8, N9) |
| 19 | Récapitulatif | Bloc `.recap` (`Estimateur.tsx:408-430`) | « Le moteur en déduit » (`EstimateurNeuf.tsx:344-352`) | M | Composant `Recap` partagé (N6, N9) |
| 20 | Démarches, taxes, assurance | Hors de la liste des postes | 8 démarches à 0 € et 6 frais affichés comme des postes, comptés dans « N postes cochés » | M | Liste « Démarches » + carte « Taxes, assurance et frais » (N10) |
| 21 | Composants recopiés | Barre live, devis et questionnaire écrits sur place. En-tête de lot inaccessible au clavier ; `.phase-t` affiche un curseur « main » sur un titre qui ne fait rien | `DevisNeuf.tsx`, `detail-styles.ts` et la barre live réécrits. En-tête de lot sans icône (`EstimateurNeuf.tsx:274`) | M | `EnteteLot`, `ListeLots`, `BarreLive`, `VueDevis` (N6) |
| 22 | Prix unitaire affiché | Formule propre à `Row.tsx:32-46` : prix unitaire × quantité ≠ montant de la ligne hors moyenne régionale, et `TASK_FIN` ignoré | Prix calculé par le moteur (`detaille-neuf.ts:118-121`), sauf sur la puce « Je le fais » | M | `puReel` du moteur partout (N7) |
| 23 | Finition des ouvrages de structure | Maçonnerie et Charpente suivent la finition, barème G1 (`core.ts:226`) | Fondations indifférentes à la finition (G0), mais la semelle reprise de la réno reste en G1 : deux semelles, deux règles | M | Finition réglée par poste (N12, D5b) |
| 24 | Notes des postes repris | PAC « chauffage + eau chaude » ; bardage « bois/composite » à 90 € ; ITI « bandes à part » ; lot Menuiseries « base PVC » alors que `MAT_COEF` prend l'alu pour base (`core.ts:135`) | PAC « chauffage seul » ; composite à 161 €. La note réno s'affiche quand même en neuf | M | Notes réécrites pour valoir dans les deux contextes (N11, D6) |
| 25 | Même ouvrage, deux postes | Peinture 25 + sous-couche 8 ; plancher chauffant 90 ; zinc 90 ; un seul escalier bois | Peinture sur plaques neuves 26,1 ; plancher 58 ; zinc 170 ; deux escaliers bois dans deux lots | M | Un poste partagé avec variantes (N12) |
| 26 | Quantités automatiques | Portes = nombre de pièces ; robinets ×2 avec double vasque ; SPEC selon le bac ; spots = S/2 ; arrondi à l'entier (`core.ts:579`) | Portes = chambres + SDB + WC + 1 ; robinets = nombre de SDB ; SPEC = 6,5 × SDB ; spots = 1 au cochage ; 2 décimales (`neuf.ts:212`) | M | Fonctions partagées, le sens étant choisi formule par formule (N8) |
| 27 | Plan → estimation | Le plan alimente le **détaillé** Pro (`app/projets/depuis-plan/[planId]/page.tsx`, `lib/estimateur/plan-injection.ts`). Il transmet 8 compteurs, fenêtres, hauteur, emprise et finition (`plan-ctx.ts:111-134`). Bannière « Ton plan a changé » | Le plan n'alimente que le **rapide**, via la description. Les suites sont fondues dans les chambres ; fenêtres, hauteur, emprise et finition sont ignorées (`plan-neuf.ts:197-201`). Pas de bannière (`PlanRelie.tsx:33`, `app/projets/[id]/page.tsx:80`) | M | (N8) |
| 28 | « Je fais le maximum » | Tout passe en « Je le fais », électricité, mur porteur et charpente compris (`presets.ts:119`), alors que le texte annonce le contraire (`dictionaries.ts:208`) | Structure, clos-couvert, raccordements et PAC restent aux pros (`presets-neuf.ts:48`) | M | Une fonction de défaut unique (N5, D4) |
| 29 | Textes publics sur le « faire soi-même » | Le guide classe électricité, gaz et structure parmi les « lots à ne pas toucher » (`app/guides/[slug]/page.tsx:800-806`, `:863`). La page Méthodologie ne décrit que la réno (`app/methodologie/page.tsx:14`, `:85-97`) | La page Tarifs promet « fait-faire / je fais sur chaque tâche » (`dictionaries.ts:103`), ce qui est faux en neuf aujourd'hui | M | Textes réécrits (N5, N14) |
| 30 | Postes sans prix de fourniture, engins | Un petit `sm` existe même pour la main-d'œuvre (tranchées 38/6), part d'outil comprise. La location est un lot à part de 12 postes | 17 postes faisables n'ont pas de `sm` (presque tout le terrassement). Le lot Location n'a que 4 postes. La règle « mini-pelle » prévue (`conception.md:222`) n'est pas codée | M | `sm` sourcés qui incluent la part d'engin (méthode réno) + 7 locations reprises par `ref` (N1, N12) |
| 31 | Échafaudage | Aucun poste (ni en Façade, ni en Location) | `fac-echafaudage-de-facade` à 12 €/m² (`catalog-neuf.json:875-880`) | M | Poste partagé (N12) |
| 32 | Options absentes | Environ 20 options valables aussi en neuf (prises, VDI, papier peint…) et des portails (`catalog.json:874`, `:886`) | Absentes (voir `decisions.md` §5) | M | Reprises par `ref`, sans nouveau prix (N12, D10) |
| 33 | Écran du rapide | Une fourchette dans la barre | Un bilan sombre affiche le **total exact** en grand, sous une barre qui montre une fourchette (`BilanRapideNeuf.tsx:89-90`) | M | (N13) |
| 34 | Questions du rapide | Le type d'abord. « 4 questions » annoncées : on compte les blocs, mais il y a 5 ou 6 réponses. Finition « Economy » en anglais | La surface d'abord. « 5 questions » annoncées : on compte les réponses, comme le prévoit `conception.md:438`. Finition « Basic » en anglais ; libellés de « qui réalise » différents | M | Même ordre, même façon de compter, libellés communs (N13) |
| 35 | Boutons Affiner / Enregistrer | « — Pro » et « — gratuit » affichés même à un abonné. Un compte gratuit fait un détour par `/detaille` et perd ses réponses | Libellés adaptés, accès direct à `/tarifs`, réponses rendues au retour | M | (N13) |
| 36 | Aperçu du résultat rapide | Les vrais montants sont dans le HTML et seulement floutés en CSS (`ResultatRapide.tsx:85-96`, `:147-151`). Répartition payante | Données factices pour un compte gratuit. Répartition par phase gratuite (`BilanRapideNeuf.tsx:100-114`) | M | Données factices en réno (N4) ; règle commune (N13, D9) |
| 37 | Après le paiement | `/bienvenue-pro` (`:115`) et le bandeau « déjà Pro » de `/tarifs` (`:79`) mènent au détaillé réno | La maison décrite est perdue au moment du paiement : l'adresse de retour de Stripe est fixe (`app/api/stripe/checkout/route.ts:42`) | M | Faire suivre la nature jusqu'à Stripe (N2) |
| 38 | `?new=1` | Page vierge (`Estimateur.tsx:73-98`) | Ressème la dernière maison du rapide (`EstimateurNeuf.tsx:111-113`) | M | Page vierge ; reprise via `?reprise=1` (N2) |
| 39 | Langue et ton | Questionnaire et en-tête du détaillé en français en dur (`detaille/page.tsx:29-31`) ; « tu » et « vous » mélangés ; PDF entièrement en français | Questionnaire dans un dictionnaire FR/EN, mais lignes, lignes perso et compteurs en français en dur (`Row.tsx:90`, `:93`, `:128` ; `partage.tsx:84`, `:101`, `:113` ; `Stepper.tsx:63-64`). PDF mi-français mi-anglais. Anglais britannique (« postcode », « storey ») alors que la réno est en anglais américain (« ZIP code ») | M | (N6, N14) |
| 40 | Mesure d'audience | `estimation_terminee` envoyé sans `nature` (`EstimateurRapide.tsx:149`, `:207`, `:232`). `clic_nouveau_projet` déclaré mais jamais émis (`lib/track.ts:7`) | `nature: "neuf"` est bien envoyé. Mais il n'y a qu'une conversion Google Ads, dédupliquée par session toutes natures confondues (`lib/gtag.ts:36-44`). `vue_tarifs` ne dit pas de quelle nature vient le visiteur (`tarifs/page.tsx:33`, `:58-61`). Aucun événement à l'enregistrement d'un détaillé | M | (N2, N13) |
| 41 | Session expirée dans le détaillé | Sur une réponse 401, le drapeau est posé sans que le travail soit sauvegardé (`Estimateur.tsx:245`). `ClaimDraft` crée alors un projet à partir de l'ancien brouillon rapide, sans les lignes perso (`ClaimDraft.tsx:81-99`) | Le brouillon complet est écrit avant de poser le drapeau (`EstimateurNeuf.tsx:188-193`) | M | (N4) |
| 42 | Projets déjà enregistrés | Recalculés à chaque affichage | Même chose (`neuf.ts:512-526`, `EstimationResultat.tsx:316`) : toute correction de formule ou de prix fait bouger leur total sans action de l'utilisateur | M | Mesurer avec T7, décider (D11) |
| 43 | Questions sans objet | Masquées | Grisées, avec « sans objet ici » (`EstimateurNeuf.tsx:330-338`) | f | (N3) |
| 44 | Accessibilité et mobile | Pastilles de 34 px, boutons de 29 px, pas d'`aria-pressed`, pas de focus sur le champ en erreur (rapide : `rapide-styles.ts:10`, `:13`, `:93`) | Cibles de 44 px sur mobile seulement (38 px sur ordinateur, `detail-styles.ts:18`, `:47-49`), `aria-pressed`, focus sur le champ en erreur | f | (N6, N13) |
| 45 | Bornes et saisie | Aucune borne. Budget prérempli à 60 000 € (`core.ts:316`) | Deux jeux de bornes (`questions-neuf.ts:36,45-47` contre `neuf.ts:105-108`). Le total saute pendant la frappe. Budget à 0 | f | (N8, N9) |
| 46 | TVA dans le questionnaire | Rubrique dédiée | Absente | f | (N9) |
| 47 | Bandeau « Partir de mon plan » | Réservé au Pro (décision D68) | Gratuit (`ChoixEstimation.tsx:126-131`) | f | Garder D68 ; le bandeau reste à l'étape 2 (N2) |
| 48 | Fiche, liste, admin, e-mails | Pas de pastille « Rénovation ». Le mode (rapide ou détaillé) n'est affiché nulle part. La fiche admin affiche `EstimationResultat` même pour un rapide (`app/admin/projets/[id]/page.tsx:47`). La liste admin n'a ni nature ni mode | Seule la pastille « Construction neuve » existe. L'onboarding ne prévoit que la réno (`OnboardingForm.tsx:28-33`). Pied d'e-mail « estimateur de rénovation » (`lib/email.ts:58`). « renovation manager » en anglais (`bienvenue-pro/page.tsx:56`) | f | (N14) |
| 49 | Divers moteur | Coefficient régional appliqué aux barèmes Enedis et Consuel ; deux zonages sur la même fiche (`projet.ts:133-141` contre `core.ts:276-295`) ; `identite.ts` ignore le neuf ; trois listes différentes de ce qui est « hors travaux » ; noms de lots sans accents et « m2 » ; lignes perso à 10 % de TVA même en régime « pro » ; bouton « Neuf / −2 ans » dans la réno (`Estimateur.tsx:397`) | La barre « Qui fait quoi » ne couvre que 94 % du total (les frais sont hors barre). `eurM2FF` est calculé sur le catalogue réno (`EstimationResultat.tsx:387-396`) | f | (N7, N12, N14) |
| 50 | Passerelles entre les rapides | Aucun lien vers le neuf | Aucun lien vers la réno | f | (N13) |

---

## 3. Faire faire / je le fais

### La règle retenue

**Possible ou non** : « Je le fais » est proposé sur un poste si et seulement si `peutFaireSoiMeme(lot, poste)` est vrai. Cette fonction est à exporter de `lib/estimateur/core.ts`, pour les deux natures. Elle est vraie quand les cinq conditions suivantes sont réunies :
- le poste n'est pas une location (`isLoc`, `core.ts:322`) ;
- ce n'est ni un frais ni un pourcentage ;
- il a un prix de fourniture `sm` ;
- ce prix est inférieur au prix fait-faire (`sm < fp`) ;
- le poste ne porte pas le champ `pro`.

Le champ **`pro`** est nouveau et facultatif dans l'interface `Tache` (`core.ts:35-66`). Il indique la raison qui réserve le poste aux professionnels : `"concessionnaire" | "etude" | "controle" | "fluides" | "reglementaire" | "procede"`. Le moteur ne le lit pas, donc aucun prix ne change. Seul `Row` le lit. À la place du bouton absent, la ligne affiche « Pro obligatoire · raccordement Enedis » (ou la raison correspondante).

**Défaut du mode « Je fais le maximum »** : c'est une notion séparée. On a `soiMemeNeuf = peutFaireSoiMeme && règle du mode`. En mode « le maximum », `PRO_PAR_DEFAUT_MAX` contient les lots de `PRO_TOUJOURS` **plus « Raccordements aux réseaux »**, comme le prévoit la décision 4 (option A, `docs/construction-neuve/decisions.md:49-53`). Sans cet ajout, la fosse et la micro-station passeraient en « Je le fais » par défaut, et le rapide neuf changerait : 195 743 € → 190 262 € avec une fosse, 200 441 € → 193 394 € avec une micro-station (sonde `critique/fosse.mjs`). Avec cet ajout, **aucun total par défaut ne bouge**. Vérification : la maison A de 100 m² en mode « le maximum » reste à 189 110 € TTC.

Ce qui change dans le code :
- `JAMAIS_SOI_MEME` (`presets-neuf.ts:16`, et son test l.46) et le Set `PAC` (l.38-40) sont supprimés.
- `diyNeuf` est **conservé comme alias** de `peutFaireSoiMeme`, car deux tests l'importent (`tests/neuf-detaille.test.ts:13`, `tests/estimateur-briques.test.ts:15`).
- Dans `Row.tsx:53`, la règle devient `avecDiy = peutFaireSoiMeme(l, t) || self`. Un projet déjà enregistré avec `self: true` sur un poste devenu `pro` garde donc sa puce active (`Row.tsx:105-110`).
- Un seul `DIY_PARTIE`, exporté depuis `presets.ts:28`. Aujourd'hui il est recopié dans `pieces.ts:22` et `presets-neuf.ts:14`.
- Quand un poste de structure ou de clos-couvert passe en « Je le fais », la ligne affiche un avertissement : « Fait soi-même : hors garantie décennale. Vérifie avec ton assureur dommages-ouvrage. » Le guide public le dit déjà (`app/guides/[slug]/page.tsx:806`).

### Les postes qui restent « faire faire » uniquement (36)

| Raison | Postes |
|---|---|
| **Études, conception, géomètre** (13) | `etu-plan-topographique`, `etu-bornage-du-terrain` (bornage réservé au géomètre-expert), `etu-etude-de-sol-g1`, `etu-etude-de-sol-g2-avp`, `etu-etude-de-sol-g2-pro`, `etu-architecte-mission-permis` (architecte obligatoire au-delà de 150 m²), `etu-maitrise-d-oeuvre-complete` (le « soi-même » est la réponse « Qui pilote : moi »), `etu-etude-thermique-re2020`, `etu-etude-assainissement-individuel-spanc`, `etu-etude-beton-arme`, `etu-constat-affichage-commissaire`, `anx-implantation-par-geometre` (non réservée par la loi, mais assimilée au géomètre selon la règle de Dani), **`etu-dossier-permis-dessinateur` (à arbitrer, D3)** |
| **Concessionnaires** (6) | `rac-raccordement-electrique-enedis`, `rac-extension-reseau-electrique-part-fixe`, `rac-extension-reseau-electrique-au-metre`, `rac-mise-en-service-provisoire-enedis`, `rac-raccordement-eau-potable` (compteur), `rac-raccordement-au-tout-a-l-egout` (côté réseau public ; la partie privée existe en neuf : `vrd-canalisation-pvc-enterree`, `vrd-regard-de-visite`). Le catalogue neuf n'a aucun poste gaz. |
| **Contrôles et attestations** (5) | `rec-test-etancheite-intermediaire`, `rec-controles-re2020-fin-de-chantier`, `rec-attestation-argile-daact`, `rec-attestations-parasismiques`, `ele-consuel-attestation-de-conformite` |
| **Assurance et taxes** (6, ce sont des frais : jamais de bouton) | `ass-assurance-dommages-ouvrage`, `tax-taxe-amenagement-100-premiers-m2`, `tax-taxe-amenagement-au-dela-100-m2`, `tax-taxe-amenagement-stationnement`, `tax-pfac-participation-tout-a-l-egout`, `tax-redevances-spanc-controles` |
| **Fluides frigorigènes** (3 ; attestation de capacité obligatoire, C. env. art. R543-99 et suivants) | `cha-pompe-a-chaleur-air-eau`, `cha-climatisation-reversible-split`, `cha-climatisation-gainable-reversible` |
| **Réglementaire** (1, selon D2) | `ele-borne-de-recharge-voiture` : installateur qualifié IRVE obligatoire au-delà de 3,7 kW (décret 2017-26). C'est le poste de borne à 1 400 € ; une simple prise renforcée n'est pas concernée. |
| **Techniquement impossible** (2) | `ter-journee-terrassier-mini-pelle` (le faire soi-même revient à louer `loc-mini-pelle-1-5-2-5-t`), `cou-gouttiere-alu-continu` (profilée sur place par la machine du poseur) |

**17 postes sans objet** (aucun choix à faire) :
- 8 démarches gratuites : dépôt du permis, demandes de raccordement, ouverture de chantier, DT réseaux, réseaux sous dallage, procès-verbal de réception, DAACT, déclaration des éléments d'imposition ;
- 7 locations : les 4 `loc-*`, le WC de chantier et les 2 bennes ;
- le panneau de permis, dont la fourniture coûte le prix posé ;
- la provision `fon-surcout-sol-argileux`, qui est un ordre de grandeur et non un ouvrage.

Côté réno seulement (N5, D2) : `cha-chaudiere-gaz-a-condensation` (`catalog.json:1561`) passe en « réglementaire », comme les textes réno l'annoncent déjà (`dictionaries.ts:208`). `dem-retrait-amiante-plomb` (`catalog.json:340`) est déjà sans `sm` ; on lui ajoute la raison.

### Combien deviennent faisables soi-même

| Étape | Postes neuf avec « Je le fais » |
|---|---|
| Aujourd'hui | **74 / 202** |
| Après N1, code seul, aucun prix créé : +57 postes des lots `PRO_TOUJOURS`, + fosse toutes eaux, + micro-station | **133** (132 si D2 retire la borne) |
| Après N12 : 17 `sm` sourcés (6 postes de terrassement, radier, sous-sol, mur banché, toiture-terrasse, couvertine, tranchée réseaux, échafaudage, conduit de fumée, installation de chantier, coffret provisoire, escalier béton) | **150** (149 avec la borne en pro ; −1 de plus si `decisions.md` §1 n°6 retire la fourniture de la chape liquide, qui deviendrait « procédé ») |

Les 59 postes ouverts par le code seul couvrent :
- toute la maçonnerie : parpaing, brique, monomur, béton cellulaire, chaînages, linteaux, appuis, chapes, semelle ;
- les fondations ;
- la charpente et l'ossature ;
- la couverture et la zinguerie ;
- les menuiseries extérieures.

### Comment le prix « Je le fais » est calculé (déjà aligné sur la réno)

Les deux natures passent par le même calcul de ligne. En « Je le fais » (`core.ts:629-633`), le prix vaut **`sm` × coefficient de finition × coefficient régional des matériaux × quantité**, ou le prix matériaux saisi à la main (`pm`) s'il existe. La TVA est de **20 %** (règle en `core.ts:603`, dans `effRate`, `core.ts:600`). En « Fait faire », le prix vaut `sm·fc·R.mat + (fp−sm)·R.mo` (`core.ts:639`), ou `fp·R.mo` si le poste n'a pas de `sm` (`core.ts:640`). **Aucun prix n'est à créer pour les 59 postes.**

Points de vigilance :
1. **Créer un `sm` change aussi le prix « Fait faire »**, qui passe de la formule `:640` à la formule `:639`. Pour les lots indifférents à la finition (G0 : Terrassement, Fondations, Annexes), seule la région agit. Pour Maçonnerie, Couverture, Façade et Chauffage, poser `fixe: true` si le prix « Fait faire » doit rester identique quelle que soit la finition. Trois postes partagés (`anx-installation-de-chantier`, `rac-coffret-tableau-de-chantier-provisoire`, `mac-escalier-en-beton`) modifient aussi les prix réno : décision D5c.
2. **Engins : une seule méthode, celle de la réno.** La part qui reste à payer (mini-pelle, pompe à béton, banches, plaque vibrante, redevance de décharge) va **dans le `sm`** du poste, comme pour `dem-creuser-tranchees-saignees` (38/6). Il n'y a **pas** de règle automatique « mini-pelle si terrassement fait soi-même » : elle compterait l'engin deux fois. `conception.md:222` et `:531` sont à mettre à jour. L'échafaudage reste **un seul** poste, dont le `sm` correspond à la location seule. Le lot Location sert aux ajouts faits à la main : en N1, on y reprend par `ref` les 7 locations réno absentes du neuf (`loc-camion-benne-utilitaire`, `loc-decoupeur-scie-carrelage-beton`, `loc-groupe-electrogene`, `loc-deshumidificateur-chauffage-chantier`, `loc-ponceuse-parquet-placo`, `loc-aspirateur-de-chantier`, `loc-compresseur`).
3. **Avant N12, le « Je le fais » sur la structure vaut les matériaux seuls**, comme en réno aujourd'hui (`mac-monter-un-mur-en-parpaings` 75/25). Les totaux par défaut ne bougent pas. Seul quelqu'un qui passe lui-même toute la structure en « Je le fais » voit un total bas : 128 163 € sur A, sans engins. L'avertissement de ligne et N12 corrigent ce point.

---

## 4. La pré-page « Quel est ton projet ? »

**Parcours :**
1. `/projets/nouveau` affiche le titre « Quel est ton projet ? » et deux grandes cartes. Chaque carte est entièrement cliquable, avec `:hover` et `:focus-visible`, sur le modèle de `a.strip-neuf` (`app/page.tsx:152`).
   - **Rénovation** : « Un logement existant, maison ou appartement, du rafraîchissement à la rénovation lourde ».
   - **Construction neuve** : « Une maison individuelle à construire, du permis aux clés » (le neuf refuse l'appartement, `lib/i18n/neuf.ts:117`).
   - Indice dessous : « Un appartement ? Choisis Rénovation. Extension, surélévation : pas encore chiffrées. »
   - Icônes neutres. **Pas** le style `.ch-card.pro`, car ce n'est pas un choix payant.
2. Le clic mène à `/projets/nouveau?nature=reno` ou `?nature=neuf`, qui affiche l'écran actuel Rapide / Détaillée, **sans la pilule**. Le surtitre affiche la nature choisie, avec un lien « Changer » vers la pré-page. Le bandeau « Partir de mon plan » reste à cette étape, avec ses droits actuels (D68 : réno en Pro, neuf en gratuit).
3. Puis le rapide ou le détaillé, sans changement.

Depuis l'en-tête et le héros de l'accueil, il faut maintenant 3 clics jusqu'à la première question, contre 2 aujourd'hui. C'est le parcours demandé par Dani. On compense en faisant sauter la pré-page à tous les liens qui connaissent déjà la nature (tableau ci-dessous) et aux annonces Google Ads.

**URL : pas de nouvelle route**, car `/projets/nouveau/construction` est déjà le détaillé neuf. `app/projets/nouveau/page.tsx` gère trois états :
- **(a)** `FEATURES.neuf` éteint : l'écran réno, quel que soit `?nature`, comme aujourd'hui. On teste l'interrupteur **avant** de lire `nature`.
- **(b)** Interrupteur allumé, `nature` absente ou invalide (tableau, « autre ») : `<ChoixNature/>`, composant serveur qui n'appelle pas `getUser()`.
- **(c)** `?nature=reno` ou `?nature=neuf` : `<ChoixEstimation/>`.

On utilise la valeur `reno`, la même que `ProjetEstim.nature` (`projet.ts:19`). Un `Ctx` réno ne porte jamais `nature` (`core.ts:105`, absent = rénovation). Rien à changer dans `proxy.ts:65`, `robots.ts:28` ni `sitemap.ts:52`. Les liens `?nature=neuf` déjà diffusés restent valides.

**Ce que deviennent les liens existants :**

| Lien | Devient |
|---|---|
| `ResultatRapide.tsx:164` « Refaire », `app/estimation-travaux/page.tsx:95` « ← Choisir » | `?nature=reno` |
| Bloc final de l'accueil « Ta rénovation mérite mieux » (`app/page.tsx:308`, EN `:432`) | `?nature=reno`, **sans condition sur l'interrupteur** (toute valeur donne la réno quand il est éteint), pour garder `neuf-points-entree.test.ts:118` |
| En-tête `layout.tsx:202`, `MobileMenu.tsx:48`, `ListeProjets.tsx:350` et `:369`, `not-found.tsx:15`, `tarifs/page.tsx:200`, héros de l'accueil (`:193`, `:233`) | Inchangés : ils mènent à la pré-page |
| Pages SEO (`CtaEstimation.tsx:61` et 6 gabarits), bandeau neuf de l'accueil, pied de page, éditeur de plan, « Affiner » | Inchangés : ils mènent déjà au bon estimateur |
| « Affiner » d'un compte gratuit en neuf (`EstimateurRapideNeuf.tsx:307`) | `/tarifs?source=affiner-neuf`. La liste fermée `SOURCES_PLAN` (`tarifs/page.tsx:33`) est étendue. `BoutonAbo` transmet la nature à `/api/stripe/checkout`, qui la place dans `success_url` (`route.ts:42`) : `/bienvenue-pro?session_id=…&nature=neuf` (liste fermée) |
| `bienvenue-pro/page.tsx:115`, `tarifs/page.tsx:79` (« déjà Pro ») | Lus côté serveur : avec `nature=neuf` **et** `FEATURES.neuf` allumé, le lien mène à `/projets/nouveau/construction?reprise=1`. Sinon, `/projets/nouveau/detaille?new=1`. Pas d'îlot `sessionStorage` : il serait perdu dans un autre onglet et afficherait le mauvais lien avant l'hydratation |
| Détaillé neuf avec `?new=1` | Maison par défaut. On retire **seulement** le repli sur la graine (`EstimateurNeuf.tsx:111-113`) et on garde la lecture de l.109, qui transporte l'origine « plan » (`tests/neuf-plan-relie.test.ts:282`). La graine `avyora-neuf-v1` n'est relue que sur `?reprise=1` |

**Mesure :**
- Émettre `clic_nouveau_projet { nature: "reno" | "neuf" }` au clic sur une carte, par délégation sur un attribut `data-choix-nature`, sur le modèle de `SuiviClicsPlan` (`lib/plans/mesure.ts:35-40`). Ne pas utiliser `SuiviVue` : sa déduplication ignore les propriétés (`SuiviVue.tsx:25`).
- Ajouter `nature: "reno"` aux trois `estimation_terminee` de la réno (`EstimateurRapide.tsx:149`, `:207`, `:232`).
- `vue_tarifs` : ajouter les sources `affiner-reno`, `affiner-neuf`, `choix-reno` et `choix-neuf`, posées par `EstimateurRapide`, `EstimateurRapideNeuf.tsx:307`, `ChoixEstimation.tsx:105`, `ResultatRapide.tsx:113` et `ResultatRapideNeuf.tsx:75`.
- Google Ads : dédupliquer par nature (`av_conv_estimation_${nature}`, `lib/gtag.ts:38`). Dani crée dans la console Ads une 2ᵉ action « Estimation neuf », secondaire au départ. Vérifier les URL finales des annonces rénovation et les faire pointer sur `?nature=reno` ou `/estimation-travaux`.
- Entonnoir à suivre : vue de `/projets/nouveau` → `clic_nouveau_projet{nature}` → `estimation_terminee{nature}`.

**SEO :**
- Ajouter `META_NATURE` pour l'état (b) : titre neutre qui garde le mot « rénovation » en tête, « Estimer ta rénovation ou ta maison neuve — gratuit » (50 caractères) ; description qui cite les deux ; canonical `/projets/nouveau` ; `og()` propre, pour que `og:url` cesse d'être celle de l'accueil.
- `META_RENO` sert pour `?nature=reno` et quand l'interrupteur est éteint (`neuf-tarifs-pied.test.ts:89-105`) ; `META_NEUF` pour `?nature=neuf`. Les deux variantes restent canonicalisées vers `/projets/nouveau`, comme `?nature=neuf` aujourd'hui.
- Les pages qui se positionnent (`/estimation-travaux`, `/estimation-construction-maison`) ne bougent pas. Regarder les impressions de `/projets/nouveau` dans la Search Console avant et après.

**Si D1 (rangement par corps d'état) est retenue**, réécrire les textes « phase par phase » : `app/projets/nouveau/page.tsx:19`, `dictionaries.ts:108` et `:350`, `neuf.ts:24`, `:52`, `:94`, `:99`, `:150` et leurs équivalents EN (`:231`, `:259`, `:354`).

**Interrupteur `FEATURES.neuf`** : les liens vers le neuf, sur `bienvenue-pro`, sur `/tarifs` et dans les passerelles de N13, le testent. Plusieurs chantiers (N1 sur `Row`, N4 à N7, N13) modifient la réno quel que soit l'interrupteur. Il faut donc corriger le commentaire de `lib/features.ts:21-24` : l'éteindre n'est plus un retour au site d'avant, ce retour passe par un redéploiement.

**Réutilisation :** sortir le CSS `.av-choix` (`ChoixEstimation.tsx:176-213`) dans `components/choix-styles.ts`. Les textes vont dans `dictNeuf(locale).choix` (`neuf.ts:14-29`, `:221-235`), en chaînes simples, à cause du test `neuf-points-entree.test.ts:127`. Jamais dans le dictionnaire global (`neuf-poids.test.ts:20-22`).

---

## 5. Le neuf détaillé à la manière de la réno

### Questions sur le bien : de la réno au neuf

Une seule carte, « Parle-nous de ta maison », avec les intertitres de la réno, dans le même ordre.

| Rubrique réno (`Estimateur.tsx`) | Neuf aujourd'hui (`questions-neuf.ts`) | Neuf demain (N9) | Moteur (N8) |
|---|---|---|---|
| Périmètre (segment, l.287) | — | Sans objet. Sous-titre : « Chaque réponse coche et mesure les postes ; tu ajustes ensuite ». Le modèle du neuf est gardé : une maison neuve a tous ses lots | — |
| Type de bien (pastilles, l.326) | Niveaux en 3ᵉ question, forme en 4ᵉ | **Type de maison** : pastilles Plain-pied / À étage / Combles aménagés, puis Forme | — |
| Surfaces : habitable, au sol, hauteur, code postal (l.335-364) | Surface 30-400 sans aide ; code postal ; garage à part | Surface habitable (aide « tous niveaux, hors garage ») · **Garage accolé** en m² (0 = sans) · Code postal du terrain avec sa zone · Hauteur « 2,50 m (standard neuf) » en lecture seule | Une table de bornes exportée (modèle `GARAGE_MAX`, `neuf.ts:70-71`), lue par les questions, `maisonComplete` et `plan-neuf.ts:41-42` ; suppression de `t: "garage"` |
| Pièces et configuration (10 `Stepper`, l.368-379) | Chambres, « salles d'eau » et WC en pilule ; le reste est figé | **Même grille `.stpg`**, mêmes libellés. Chambres, SDB et WC gardent leur défaut actuel, **calculé selon la surface** (`neuf.ts:60` ; test `neuf-brouillon.test.ts:110-117`). Nouveaux compteurs : séjour 1, cuisine 1, couloir 1, suite 0, buanderie 0. Plus « Menuiseries ext. » prérempli | `MaisonNeuve` + `sejour`, `cuisines` (nombre), `couloir`, `suites`, `buanderie`, `menuiseries?`. Règles : SDB + suites ≥ 1, WC ≥ 1 |
| Interrupteur « dressing » (l.344-346) | « Cuisine équipée » Oui/Non | Interrupteur « Cuisine équipée comprise » sous la grille | `cuisine: boolean` **gardé tel quel** (aucune migration, retour arrière sans risque : `neuf.ts:99` ignore un type différent) |
| — | 20 questions techniques dépliées | **« Choix techniques · réglages courants préremplis »**, replié, avec une ligne de résumé (« Parpaing · dalle · 2 pans tuiles · enduit · PAC air/eau · tout-à-l'égout ») et un bouton « Modifier ». Une fois déplié : segment pour 2 choix, pastilles de 3 à 6, cartes pour le chauffage, champ pour la distance aux réseaux. Couverture, gouttière et façade passent sur les lignes de choix (N10). Les questions sans objet sont masquées | Champs `vue` et `section` dans `QuestionNeuf` |
| Niveau de finition (cartes, l.382-392) | 3 pastilles en fin de liste | `CartesFinition`, avec les textes de `dictNeuf.saisie.finitions` (`neuf.ts:72-76`) | — |
| — | `pilotage` en pastilles | Segment « Qui pilote le chantier » | — |
| Régime de TVA (segment + note, l.394-401) | — | Intertitre et simple note : « TVA 20 % sur tous les travaux » (`d.guideTva`) | — |
| — | `$qui`, qui écrase les lignes | Retiré (N3) | — |
| Budget et imprévus (l.403) | Identique, budget à 0 | Identique ; budget à 0 **des deux côtés** ; recommandation d'aléas selon la nature (D7) | — |
| Récap (l.408-430) | Pastilles « Le moteur en déduit » | `Recap` partagé : ligne « bien » et ligne « zone », alimentées par `geometrieNeuf` | — |

**Le compteur Menuiseries** (la réno n'en a qu'un, le neuf en calcule trois). Par défaut, il vaut `g.nFen + g.nPF + g.nBaie`. Si l'utilisateur le modifie, on garde les portes-fenêtres et les baies déduites et on ajuste les fenêtres : `nFen = max(0, menuiseries − nPF − nBaie)`. La surface vitrée est alors recalculée à partir des nombres (surfaces unitaires déjà utilisées par les quantités), au lieu de 0,18 × SH (`neuf.ts:163-171`, `:187-188`). Les m² de murs et de façade restent ainsi cohérents. Sans saisie, la formule actuelle s'applique : T5 ne bouge pas.

Avec ces valeurs par défaut, le contexte neuf donne `piecesEff = 6`, comme `defaultCtx()` en réno (mesuré par sonde) : aucun total par défaut ne bouge.

### Présentation des postes : avant / après

| Lignes visibles | Réno | Neuf aujourd'hui | Après N3 | Après N10 |
|---|---|---|---|---|
| En-têtes à l'ouverture | 22 (4 phases + 18 lots) | 55 (9 phases + 9 jalons + 37 blocs) | 9 | **28** (4 phases + 24 lots ; sous-titres de phase dans les lots répétés) |
| Questions visibles | ~11 rangées | 32 | 31 (sans objet masquées) | ~11 rangées + 1 ligne de résumé (N9) |
| Postes, tout déplié | 209 | 202 | 202 | **~154** (34 lignes absorbées par les lignes de choix ; 8 démarches et 6 frais sortis) |
| Texte, tout déplié | 9 409 caractères | 33 923 | idem | proche de la réno après N11 (libellés ≤ 45 caractères, notes repliées) |

La chronologie en 9 phases reste là où elle sert : « Mon devis » (`DevisNeuf.tsx:68-87`), la fiche (`EstimationResultat.tsx:608-613`) et le PDF (`RapportPDF.tsx:386-395`). Le regroupement par corps d'état se fait **à l'affichage**, en regroupant `BLOCS_NEUF` par `l.c`. Les clés `key(lot, nom)` ne changent pas : aucune migration des sélections.

### Composants à partager

- **`components/estimateur/intake.tsx`** (textes passés en paramètre) : `Pastilles` (avec `aria-pressed` et `role="group"`, comme le neuf), `Segment`, `CartesFinition` (`FINIS`, `Estimateur.tsx:533-537`), `ChampCodePostal`, `Interrupteur`, `Recap`. Le `Stepper` est déjà exporté (`partage.tsx:56`).
- **`EnteteLot`, `TitrePhase`, `ListeLots`** : le filtre « Seulement les cochés » et le bouton « Tout déplier » passent à la réno. Des props gèrent le badge, `puReel`, la ligne de choix et les sous-titres de phase.
- **`BarreLive`** (prix au m² facultatif) et **`VueDevis`** (frais, découpe, jalons).
- **Textes** : un module à part, `dictDetail(locale)`, sur le modèle de `dictNeuf`. **Pas** le dictionnaire global (23 Ko, chargé sur chaque page par `LangProvider.tsx:5`). Tutoiement partout.
- **CSS** : `EST_CSS` est déjà chargé sur la page neuf (`EstimateurNeuf.tsx:311`). Ajouter des cibles de 44 px (`.tpill`, `.segf button`, `.stp button` en 40 px) au `@media` 560 px (`estimateur-styles.ts:273`). Supprimer `.grp`, `.q` et `.pills` de `detail-styles.ts` une fois remplacés.

---

## 6. Plan en chantiers

**Témoins communs** (tout écart attendu est **listé avant** le chantier) :
- **T1, moteur réno** : 3 336 scénarios à **0 écart**. Il vit aujourd'hui dans le scratchpad de session (`scratchpad/neuf/baseline/photo-reno.mts` et `avant.json`). L'outil `neuf/outils/photo-reno.mts` a un import cassé. N0 le verse dans le dépôt.
- **T2, pages publiques** : `scratchpad/plans/temoin/photo-pages.cjs` (13 pages), plus les snapshots de `tests/plans-temoins.test.ts` (accueil, choix, tarifs, projets, fiches).
- **T3, snapshots vitest** lancés avec `CI=1` : aucune écriture implicite. Toute mise à jour passe par un `-u` volontaire, avec un diff relu et listé.
- **T4** : tous les tests existants restent verts.
- **T5, moteur neuf** et **T6, quantités automatiques** : créés en N0.
- **T7, projets réels** : export en lecture seule et anonymisé des `reponses`, avec l'accord de Dani. Il sert à mesurer l'effet d'un chantier sur les projets déjà enregistrés (D11).

### N0 — Témoins versionnés (préalable)
- **Objectif** : rendre durables les garde-fous avant tout changement.
- **Fichiers** (tests seulement) :
  - `tests/temoins/moteur-reno.test.ts` + référence compacte `tests/fixtures/moteur-reno.json` (totaux et HT par lot de chaque scénario, ou une empreinte des lignes, pour rester sous 1 Mo ; `avant.json` fait 5,5 Mo). Aucun test du dépôt ne fige aujourd'hui les montants réno : `estimateur-neuf-affichage.test.ts:23-41` ne compare que deux présentations d'un même devis.
  - `tests/temoins/moteur-neuf.test.ts` : `presetNeuf` sur surface [80, 100, 120, 160] × niveaux × finition × qui × CP [33620, 75011, 23000, ""] × garage × eaux usées [collectif, fosse, micro] ; `presetMaison` A, B et C ; tout coché, en fait-faire puis en « Je le fais ».
  - `tests/temoins/quantites.test.ts` : `autoQty` réno et `quantitesNeuf` sur une grille de compteurs (suites, SDB, WC, chambres) × variantes (double vasque, bac 150×90, italienne). T1 ne la voit pas, puisqu'il ne part que de `defaultCtx()`.
  - `scripts/temoins/photo-pages.cjs` : copie versionnée de T2.
- **Fin** : références générées et relues, T4 vert.

### N1 — « Je le fais » neuf : une règle par poste (point 3)
- **Objectif** : passer de 74 à 133 postes avec « Je le fais » dans le détaillé neuf, maçonnerie comprise, sans toucher à `catalog.json`.
- **Fichiers** :
  - `lib/estimateur/core.ts` : champ `pro?` dans l'interface `Tache`, fonction `peutFaireSoiMeme(l, t)` exportée.
  - `lib/estimateur/presets-neuf.ts` : suppression de `JAMAIS_SOI_MEME` (l.16, l.46) et de `PAC` (l.38-40) ; `PRO_TOUJOURS` (l.36-37) devient `PRO_PAR_DEFAUT_MAX` et reçoit « Raccordements aux réseaux » ; `soiMemeNeuf` (l.45-50) = `diyNeuf && mode`. Liste **temporaire** `PRO_PARTAGES_NEUF` (PAC, 2 clims, `rac-raccordement-au-tout-a-l-egout`, borne selon D2), retirée en N5.
  - `lib/estimateur/detaille-neuf.ts:143` : `diyNeuf = (l, t) => peutFaireSoiMeme(l, t) && !PRO_PARTAGES_NEUF.has(t.id)` (alias gardé).
  - `components/estimateur/Row.tsx` : props `proRaison` (étiquette à la place de la puce, l.105-110) et avertissement « hors décennale ». La réno ne passe ni `diy` ni `proRaison` : elle ne change pas dans ce chantier. `EstimateurNeuf.tsx:284` les passe.
  - `lib/estimateur/catalog-neuf.json` : `pro` sur les postes propres au neuf qui restent interdits (raison affichée), et les 7 locations reprises par `ref`. **Rien à ajouter** à `tests/postes-ids-neuf.txt` : `IDS_NEUF` ignore les `ref` (`catalogue-neuf.ts:63`).
  - Textes : `lib/i18n/neuf.ts:81` et `:287` (« … restent aux pros dans cette estimation ; dans le détaillé, tu peux les prendre toi-même poste par poste »), `:171` et son équivalent EN ; `decisions.md` §4 (séparation entre « possible » et « par défaut »).
- **Ne doit pas bouger** :
  - T1 à 0 ;
  - T5 identique sur **tous** les scénarios par défaut, fosse et micro-station comprises. Seuls les scénarios « tout coché » voient les 7 locations (écart listé) ;
  - inchangés : `estimateur-neuf.test.ts:166-176`, `:240-243` et `:284-295`, `neuf-detaille.test.ts:127-132`, et les snapshots « Row · props du neuf » (DO et maîtrise d'œuvre restent sans bouton).
- **Tests à ajouter** :
  - `tests/neuf-soi-meme.test.ts` :
    - la décision pour chacun des 202 postes, avec les interdits figés dans `tests/postes-pro-neuf.txt` ;
    - pour les 103 `ref`, la décision neuf est égale à celle de la réno, hors liste temporaire ;
    - `soiMemeNeuf(…, "max")` reste faux sur `PRO_PAR_DEFAUT_MAX` ;
    - fosse et micro-station : `diyNeuf` vrai, défaut « max » faux ;
  - `estimateur-briques.test.ts` : le parpaing contient « >Je le fais< » et l'avertissement ; Enedis montre l'étiquette « Pro obligatoire ».
- **Fin** : maçonnerie faisable soi-même dans le détaillé. A en mode « le maximum » reste à 189 110 €, et la fosse en mode « le maximum » à 195 743 €.

### N2 — Pré-page « Quel est ton projet ? » (point 1)
- **Objectif** : choisir la nature en premier ; ne plus perdre la nature après le paiement.
- **Fichiers** :
  - `app/projets/nouveau/page.tsx` (3 états + `META_NATURE`), nouveaux `components/ChoixNature.tsx` et `components/choix-styles.ts` ;
  - `ChoixEstimation.tsx` : retirer l.41-49 et `CSS_NATURE` ; ajouter le surtitre de nature et le lien « Changer » ;
  - `lib/i18n/neuf.ts` (choix FR et EN), `lib/track.ts:7` + écouteur délégué ;
  - les liens du §4 : `ResultatRapide.tsx:164`, `estimation-travaux/page.tsx:95`, `app/page.tsx:308` et `:432`, `EstimateurRapideNeuf.tsx:307`, `tarifs/page.tsx:33`, `:79`, `BoutonAbo`, `app/api/stripe/checkout/route.ts:42`, `bienvenue-pro/page.tsx:115` ;
  - `EstimateurNeuf.tsx:111-113` (repli sur la graine remplacé par `?reprise=1`) ;
  - `nature: "reno"` dans `EstimateurRapide.tsx` ; déduplication Ads par nature (`lib/gtag.ts:38`) ;
  - commentaire de `lib/features.ts:21-24`.
- **Ne doit pas bouger** : interrupteur éteint, le rendu de la **page** est identique pour `{}`, `reno` et `neuf`, sans pré-page. T1. T2, sauf `/projets/nouveau`, l'accueil et `/estimation-travaux`.
- **Tests** :
  - réécrire `neuf-points-entree.test.ts:68-77` : deux liens, le h1, rien quand l'interrupteur est éteint, lien « Changer » ;
  - ajuster `neuf-tarifs-pied.test.ts:107-116` : `{}` et « autre » donnent `META_NATURE`, `reno` donne la META d'avant ;
  - nouveaux témoins « pré-page fr » et « pré-page en » ;
  - régénérer volontairement 8 « choix », 4 fiches `renoRapide`, 2 « tarifs pro » et **2 « accueil »** (`plans-temoins.test.ts:182-210`) ;
  - nouveaux tests : `bienvenue-pro` (avec `nature=neuf` → construction ; interrupteur éteint → réno), adresse de retour Stripe (liste fermée), `?new=1` vierge contre `?reprise=1`.
- **Fin** : le visiteur choisit la nature en premier ; `clic_nouveau_projet{nature}` remonte dans Vercel ; un abonné venu du neuf retrouve sa maison.

### N3 — Neuf détaillé désencombré (point 2, effet immédiat)
- **Fichiers** :
  - `EstimateurNeuf.tsx:75`, `:379`, `:392-394` : état `ouvertes = {}` ; jalon affiché seulement dans une phase ouverte ; état gardé dans le brouillon ;
  - `:329` : `if (q.si && !q.si(m)) return null` ;
  - `:274` : icône `ICON[l.c]` ;
  - `$qui` retiré du questionnaire (`questions-neuf.ts:116-119`). Au-dessus des lots, il est remplacé par une ligne visible « Nouveaux postes cochés : Fait faire / Je le fais » (valeur `e.qui`, qui ne vaut que pour les cochages à venir, `detaille-neuf.ts:89`, `:99`) et par une action « Tout passer en… » avec confirmation. `changerQuiNeuf` n'est plus appelé que par cette action.
- **Ne doit pas bouger** : T5, T1, relecture des anciens brouillons (`neuf-brouillon`).
- **Tests** : rendu initial = 9 titres de phase, 0 bloc. Réécrire `neuf-detaille.test.ts:59-65` : une ligne basculée à la main survit au changement du réglage « nouveaux postes ».
- **Fin** : 9 lignes à l'ouverture au lieu de 55.

### N4 — Correctifs réno en ligne (bugs actuels)
- **Fichiers** :
  - `EstimateurRapide.tsx` : séparer **l'affichage** (`affiche = demarre || !!edit`) de **la conversion** (`estimationReelle` garde `demarre`, `:125`, `:144-152`), sur le modèle du neuf (`EstimateurRapideNeuf.tsx:133`, `:247`, `:254`). Sinon, rouvrir un projet enverrait une conversion Google Ads au bout de 1,8 s. Enregistrer `pieces` dans les réponses (l.237) et les restaurer. Passer les `statuts` et les remettre dans le PATCH. Afficher l'avertissement « détaillé rouvert » (modèle `avertDetaille`).
  - `Estimateur.tsx:245` : sur un 401, écrire le brouillon détaillé complet (sélection, lignes perso) avant de poser le drapeau ; `ClaimDraft.tsx:93-99` reprend les lignes perso (modèle `EstimateurNeuf.tsx:188-193`).
  - `ResultatRapide.tsx:85-96` et `:147-151` : parts factices pour un compte gratuit (modèle `ResultatRapideNeuf.tsx:68-73`) ; pas de cadenas pour un Pro.
- **Ne doit pas bouger** : T1. T2, sauf les fiches `renoRapide`.
- **Tests** :
  - règle de conversion extraite en fonction pure et testée (rouvrir ≠ convertir) ;
  - réouverture d'un projet « pièces » ;
  - le PATCH garde les statuts ;
  - réclamation après un 401 du détaillé ;
  - le HTML servi à un compte gratuit ne contient aucun vrai nom de lot ni aucun vrai montant.
- **Fin** : un projet réno rouvert en gratuit affiche son chiffre, sans conversion parasite.

### N5 — « Pro obligatoire » des deux côtés et textes publics (après D2 et D4)
- **Fichiers** :
  - `catalog.json` : champ `pro` sur la PAC (l.1552), les clims (l.1578, 1587), la borne (l.1142), la chaudière gaz (l.1561) et l'amiante (l.340). L'égout (l.237) seulement si D2 l'accepte, avec `decisions.md` §1 n°12 et un poste de canalisation privée ajouté en réno.
  - `Row.tsx:53` : `avecDiy = peutFaireSoiMeme(l, t) || self`, pour les deux natures. Suppression de la prop `diy` et de `PRO_PARTAGES_NEUF` ; `diyNeuf` reste un alias.
  - Une seule fonction `soiMemeParDefaut(c, t, qui)` dans `presets.ts`, utilisée par `presetRapide` (`:119`), `presetPieces` (`pieces.ts:166`) et le neuf. Règle du mode « max » en réno selon D4.
  - Textes : `dictionaries.ts:208` (EN `:448`) ; `Estimateur.tsx:434` ; guide `app/guides/[slug]/page.tsx:800-806` et `:863`, à nuancer : « possible, hors décennale, étude conseillée pour la structure » ; méthodologie `app/methodologie/page.tsx:14`, `:85-97`, `:151` (règle « pro » et catalogue neuf).
- **Ne doit pas bouger** : T1 à 0 si D4 = texte seul (le moteur ne lit pas `pro`, et les presets réno ne cochent ni PAC, ni égout, ni borne, ni chaudière). T5. Les projets enregistrés avec « Je le fais » sur la PAC gardent leur prix et leur puce.
- **Tests** : `neuf-soi-meme` (b) devient « neuf = réno pour les 103 `ref` » ; dans `estimateur-briques`, la PAC réno n'a plus de puce mais une étiquette ; une PAC enregistrée en « Je le fais » garde sa puce active. Snapshot de `Row` mis à jour volontairement.
- **Fin** : une même règle, un même texte, partout.

### N6 — Composants partagés ; réno visuellement identique
- **Préalable** : sortir la logique de `Estimateur.tsx` dans `lib/estimateur/detaille-reno.ts` (fonctions pures, comme `detaille-neuf.ts`). La tester, et figer les rendus de plusieurs états : suite, appartement, périmètre « pièce », lignes perso. Aucun test ne couvre aujourd'hui l'interface réno.
- **Fichiers** :
  - `components/estimateur/intake.tsx`, `EnteteLot.tsx`, `ListeLots.tsx`, `BarreLive.tsx`, `VueDevis.tsx` ;
  - `Estimateur.tsx` les utilise ; textes dans `dictDetail(locale)`, au tutoiement ;
  - textes en dur traduits : `Row.tsx` (l.63, 76-78, 90, 93, 116, 128, 177-178), `partage.tsx` (l.39, 41, 83-84, 88, 91, 101, 111, 113), `Stepper.tsx:63-64` ; en-tête `detaille/page.tsx:29-31` ;
  - 44 px dans `estimateur-styles.ts:273` ; `.phase-t` sans `cursor:pointer` quand le titre n'est pas cliquable.
- **Ne doit pas bouger** : T1. Rendu réno des états de référence identique, sauf passage de « vous » à « tu » et ajout d'attributs d'accessibilité (diff listé). Snapshot de `Row` mis à jour volontairement (« vos infos » → « tes infos »).
- **Tests** : le détaillé réno et le détaillé neuf en anglais ne contiennent aucune chaîne française ; `neuf-poids` vert.
- **Fin** : `Estimateur.tsx` n'a plus de questionnaire écrit en propre ; les deux détaillés existent entièrement en anglais.

### N7 — Un seul total, des chiffres d'écran cohérents (selon D8)
- **Fichiers** :
  - `totauxAvecPerso` pour les deux natures : `projet.ts:73`, `EstimationResultat.tsx:364` et `:403`, `BarreLive` et `VueDevis` ; suppression des copies dans `RapportPDF.tsx:165` et `DevisNeuf.tsx:29` ;
  - centre du camembert : « TTC hors aléas » (`EstimationResultat.tsx:550`, `RapportPDF.tsx:291`) ;
  - `puReel(ctx, sel, l, t, self)` dans `core.ts`, qui généralise `puReelNeuf`, utilisé par `Row` pour les deux natures et les deux puces (remplace `Row.tsx:32-46`) ;
  - segment « Frais & taxes » dans « Qui fait quoi » (`EstimationResultat.tsx:510-519`, et le PDF) ;
  - `eurM2FF` calculé avec `totals(catalogueDe(ctx), …)` (`:387-396`) ; `regionLabel = regionCoef(cp).zone` (`projet.ts:133-141`) ;
  - `tauxPerso(ctx)` pour le défaut et le sélecteur de TVA des lignes perso (`Estimateur.tsx:50`, `detaille-neuf.ts:173`, `partage.tsx:112`).
- **Ne doit pas bouger** : T1 à 0 (les scénarios n'ont pas de lignes perso).
- **Écarts listés** :
  - `neuf-projet-coherence.test.ts:113-118` est inversé volontairement ;
  - les 8 fiches détaillées (libellé du camembert) et les snapshots de `Row` (prix unitaires réno) sont régénérés ;
  - les projets réno qui ont des lignes perso changent de total (mesuré avec T7).
- **Fin** : un projet avec une ligne perso affiche le même total partout.

### N8 — Moteur neuf : les mêmes réponses que la réno
- **Fichiers** :
  - `lib/estimateur/neuf.ts` :
    - `MaisonNeuve` (+ `sejour`, `cuisines`, `couloir`, `suites`, `buanderie`, `menuiseries?`) ;
    - `maisonParDefaut` (l.56-66 ; chambres, SDB et WC inchangés) ;
    - `maisonComplete` (bornes uniques, SDB + suites ≥ 1) ;
    - `geometrieNeuf` : `ch = chambres + suites`, `sdbT = sdb + suites`, `piecesEff` = somme des compteurs ; formule actuelle des portes gardée, plus la buanderie ; menuiseries comme au §5 ;
    - `quantitesNeuf` (l.242, 315-338), `decisionsNeuf` (l.436) ;
  - `presets-neuf.ts:24-27` : `ctxNeuf` recopie les compteurs ;
  - `plan-neuf.ts:197-201` : suites séparées, menuiseries, emprise mesurée, finition ; bannière « plan modifié » aussi pour le neuf (`PlanRelie.tsx:33`, `app/projets/[id]/page.tsx:80`) ;
  - fonctions de quantité partagées dans **un module sans dépendance** (`lib/estimateur/quantites.ts`). `neuf.ts` ne doit rien importer du moteur à l'exécution (`neuf.ts:17-18`, `core.ts:22-24`, `:495`) ;
  - sens choisi formule par formule :
    - portes : la formule du neuf, plus juste, reste en neuf ; la réno est inchangée ;
    - robinets ×2 avec une double vasque : adopté en neuf ;
    - SPEC : 6,5 m² par SDB par défaut, et les suppléments de `specArea` (`core.ts:518-522`) seulement pour un bac plus grand ;
    - quantités automatiques pour spots, italienne, robinetterie de baignoire, moquette et béton ciré (des options jamais cochées par défaut) ;
    - chaque nature garde son arrondi ;
  - affichage chambres + suites : `EstimationResultat.tsx:499`, `BilanRapideNeuf.tsx:97`.
- **Ne doit pas bouger** : T1 et T6 réno à 0. T5 identique pour tous les défauts. Le cas de référence **246 762 €** (`neuf-brouillon.test.ts:27`, `neuf-detaille.test.ts:179`, `neuf-projet-coherence.test.ts:28`). Écarts listés seulement pour les variantes (double vasque, grand bac) et pour T7.
- **Tests** : un ancien projet avec `cuisine: false` reste sans cuisine équipée ; les suites comptent dans `sdbEff` ; un plan avec suite garde la suite ; `estimateur-plan-neuf.test.ts:79` adapté volontairement ; `neuf-bornes` et `neuf-brouillon` repris.
- **Fin** : chaque compteur de la réno a un effet sur le chiffrage neuf.

### N9 — Questionnaire neuf à la manière de la réno (interface)
- **Fichiers** :
  - `EstimateurNeuf.tsx:206-241` et `:326-362`, avec les composants de N6 ;
  - `questions-neuf.ts` : champs `vue` et `section`, choix techniques repliés ;
  - valeur chiffrée prise à la sortie du champ (`:210-211`), `signaler` et `aria-invalid` ;
  - budget par défaut à 0 en réno (`core.ts:316`) : il n'entre pas dans les totaux, vérifier que T1 ne le stocke pas ;
  - suppression de `.grp`, `.q` et `.pills`.
- **Ne doit pas bouger** : T5 (mêmes réponses, mêmes totaux), T1, relecture des brouillons.
- **Tests** : une seule carte, mêmes intertitres que la réno, choix techniques repliés ; taper « 180 » ne recalcule qu'une fois.
- **Fin** : environ 11 rangées visibles sur ordinateur, dans l'ordre du §5.

### N10 — Postes du neuf présentés comme la réno (selon D1)
- **Fichiers** :
  - `ListeLots` : regroupement de `BLOCS_NEUF` par `l.c`, 4 macro-phases, sous-titres de phase ;
  - « ligne de choix » pour les 17 groupes exclusifs (`GROUPES_EXCLUSIFS_NEUF`, `neuf.ts:470-488`), via `cocherNeufEtat` (`detaille-neuf.ts:98-104`) qui appelle `cocherPosteNeuf` (`presets-neuf.ts:101-108`) ;
  - au-delà de 150 m², l'option « dossier dessinateur » est désactivée (`neuf.ts:372-373`) ;
  - un ancien projet qui a deux options cochées dans un même groupe les affiche toutes deux, avec un avertissement ;
  - questions couverture, gouttière et façade retirées ;
  - liste « Démarches » construite depuis `INFO_PHASES.dem` (`etapes-neuf.ts:36-41`) ; carte « Taxes, assurance et frais » près du budget ; les compteurs ne comptent que les travaux ;
  - textes « phase par phase » du §4.
- **Ne doit pas bouger** : T5 et T1 (présentation seule, clés inchangées), fiche, PDF, `DevisNeuf`.
- **Tests** : 28 en-têtes ; un clic sur une alternative décoche l'autre et met la réponse à jour ; les deux cas limites ci-dessus ; démarches absentes du compteur.
- **Fin** : environ 154 lignes de travaux, réparties dans 24 lots.

### N11 — Libellés courts et notes repliées
- **Fichiers** :
  - `catalog-neuf.json` : champ `nc` (45 caractères au plus) sur les 99 postes propres au neuf, lu par `Row` avant `n`, et sa traduction (`catalog-i18n.ts`) ;
  - `Row.tsx:81` : note repliable derrière un ⓘ, pour les deux natures ; note de lot en infobulle ;
  - **notes partagées réécrites dans `catalog.json`** pour valoir dans les deux contextes : PAC (selon D6), bardage, ITI, lot Menuiseries. **Pas** de note surchargée sur une `ref` : elle copierait l'objet et casserait `estimateur-neuf.test.ts:43`.
- **Ne doit pas bouger** : les clés `n` (aucun renommage), T1, T5. Mis à jour volontairement : `neuf-traductions.test.ts:85` (note du lot Menuiseries), les traductions EN des notes modifiées, le snapshot de `Row`.
- **Fin** : texte tout déplié proche de celui de la réno.

### N12 — Catalogue : auto-construction juste et postes complets (selon D5 et D10)
- **Fichiers, dans cet ordre** :
  1. **Identité des postes neufs d'abord** : `identite.ts:29-45` construit sur `CATALOG ∪ CATALOG_NEUF`, une seule fonction `posteParId` (`core.ts:488` / `identite.ts:48`), `normaliserCles` appelé par la reprise du neuf (`detaille-neuf.ts:191`). Sans cela, fusionner des jumeaux ferait disparaître des lignes de projets enregistrés sans aucun signal (`core.ts:756-758`).
  2. Corrections de `decisions.md` §1 retenues (D10).
  3. 14 `sm` sourcés pour les postes propres au neuf, part d'engin comprise (méthode réno, §3), dans `docs/construction-neuve/sources` et `journal-corrections.md`. Les 3 `sm` partagés selon D5c.
  4. Échafaudage : poste partagé, option non cochée en réno, repris par `ref` en neuf (`postes-ids-neuf.txt` mis à jour).
  5. Environ 20 options réno et les portails ajoutés par `ref`.
  6. Jumeaux fusionnés avec alias : escalier bois, couverture métallique, gouttière.
  7. Finition réglée par id (`TASK_FIN` indexé par id) : G0 sur la structure en neuf ; en réno selon D5b.
  8. Bandes de plâtre selon D5a.
  9. `national: true` sur les barèmes Enedis et Consuel.
- **Ne doit pas bouger** : T1 à 0, sauf les écarts acceptés en D5 et D10, listés ligne par ligne. Les pages SEO de prix (`lib/seo-prix.ts:22-23`, `lib/seo-projets.ts:1011`, `lib/seo-postes.ts:72`) sont relues en conséquence. T5 et T7 : écarts listés.
- **Fin** : 150 postes faisables soi-même (149 avec la borne en pro), engins compris dans le « Je le fais ».

### N13 — Rapides alignés
- **Fichiers** :
  - **rapide neuf** :
    - Q1 commence par Plain-pied / À étage ;
    - même façon de compter que la réno (blocs numérotés de 1 à 4 des deux côtés, textes « N questions » harmonisés : `neuf.ts:20`, `:64`, `:227`, `:270`, `dictionaries.ts:47`, `:167`, `app/page.tsx:152`, `:154`, `:348`, `app/projets/nouveau/page.tsx:11`, `:19`, `estimation-construction-maison/page.tsx:21`) ;
    - libellés communs `rapide.finitions` et `rapide.quis` (le neuf ne remplace que la description) ;
    - bilan replié, fourchette en grand (`BilanRapideNeuf.tsx:89-90`) ;
    - garage et eaux usées dans le récap ;
  - **rapide réno** :
    - « Affiner » d'un compte gratuit mène directement à `/tarifs?source=affiner-reno`, avec une clé de retour relue au montage ;
    - libellés selon Pro et édition ;
    - intro selon Pro ;
    - accessibilité (`rapide-styles.ts`, `htmlFor`, `aria-pressed`, `aria-invalid`, focus sur l'erreur) ;
  - règle commune pour l'aperçu du résultat (D9) ;
  - passerelles « Tu fais construire ? » et « Un logement existant ? », derrière l'interrupteur ;
  - événement `projet_enregistre { nature, mode }` aux deux enregistrements de détaillé.
- **Ne doit pas bouger** : T1. T2, sauf les deux pages rapides, l'accueil et les fiches rapides (diff listé).
- **Fin** : les deux rapides utilisent les mêmes mots, le même ordre et la même façon de compter.

### N14 — Fiche, liste, PDF, langue, admin, e-mails
- **Fichiers** :
  - pastilles « Rénovation » / « Construction neuve » et « Rapide » / « Détaillée » (`app/projets/[id]/page.tsx:66-70`, `ListeProjets.tsx:217-263`) ;
  - admin : colonnes nature et mode (`app/admin/projets/page.tsx:26`, `:40`), fiche admin qui affiche le bon composant de résultat (`app/admin/projets/[id]/page.tsx:47`) ;
  - chaînes en dur (`EstimationResultat.tsx:451-463`, `EstimateurRapide.tsx:404`) ;
  - dictionnaire `rapport` FR/EN pour `RapportPDF.tsx`, au tutoiement ;
  - anglais américain partout (« ZIP code », « single-story », « aluminum » : `neuf.ts:228`, `:273-276`, `:302`, `:309`, `questions-neuf.ts:37`, `:39`, `:74`) ;
  - table d'affichage des lots accentués et « m² » ;
  - bouton réno « Neuf / −2 ans » renommé (`Estimateur.tsx:397`, `:400`) ;
  - onboarding avec des étapes du neuf (`OnboardingForm.tsx:28-33`) ;
  - pied d'e-mail (`lib/email.ts:58`) ;
  - `bienvenue-pro/page.tsx:56`.
- **Ne doit pas bouger** : T1, T5. Snapshots régénérés volontairement : 16 fiches et 4 « projets plein ».
- **Fin** : PDF et écrans entièrement en anglais américain pour un visiteur anglophone ; la nature et le mode sont visibles partout.

**Ordre conseillé** : N0 → **N1** (point 3) → **N2** (point 1) → **N3** (soulagement visible du point 2) → N4 → N5 → N6 → N7 → N8 → N9 → N10 → N11 → N12 → N13 → N14.
- N1 et N2 sont indépendants et peuvent être inversés.
- N4 corrige des bugs actuels ; il vient juste après N2 parce qu'il touche les mêmes fichiers (`ResultatRapide.tsx`, `EstimateurRapide.tsx`).
- N5 attend D2 et D4. S'ils ne sont pas tranchés, passer à N6 et revenir à N5 ensuite.
- N12 attend D5, D10 et un sourçage externe des prix.
- Ne jamais mener en parallèle N7 ou N13 avec N2, N4 ou N6 : ils modifient les mêmes fichiers (`Estimateur.tsx:111`, `:543` ; `ResultatRapide.tsx:164`).

---

## 7. Décisions pour Dani

| # | Question | Recommandation |
|---|---|---|
| **D1** | Dans le détaillé neuf, ranger les postes **par corps d'état**, comme la réno (Maçonnerie n'apparaît qu'une fois), plutôt que **par phase de chantier** (`conception.md:39`) ? | **Par corps d'état.** C'est la principale source de l'effet « brouillon ». La chronologie reste dans « Mon devis », la fiche et le PDF. Les textes « phase par phase » sont réécrits (§4). |
| **D2** | Rendre « Pro obligatoire » **des deux côtés** : la PAC et les 2 clims (fluides frigorigènes), la borne de recharge (IRVE au-delà de 3,7 kW) et la chaudière gaz (réno) ? Aujourd'hui, la réno les propose en « Je le fais ». Rendre faisables soi-même la fosse toutes eaux et la micro-station en neuf (installation privée, contrôlée par le SPANC) ? | **Oui aux deux.** Les projets déjà enregistrés gardent leur choix. Pour le **tout-à-l'égout** côté réno, ne le passer en « pro » qu'**avec** `decisions.md` §1 n°12 (partie publique seule) et un poste de canalisation privée ajouté en réno. Sinon, le rénovateur perd toute possibilité de faire lui-même sa partie privée. Poêle à granulés et conduit : faisables, avec la mention « DTU 24.1 ». |
| **D3** | Le dossier de permis (jusqu'à 150 m², architecte non obligatoire) peut-il être fait soi-même, avec l'éditeur de plan d'AVYORA ? | **Oui, mais plus tard** (prix de fourniture à sourcer : tirages, cerfa). Il reste « faire faire » en N1. |
| **D4** | « Je fais le maximum » : en neuf, structure, clos-couvert, raccordements et PAC restent aux pros **par défaut**, mais sont faisables ligne par ligne. En réno, ce mode met déjà en « Je le fais » l'électricité, le mur porteur et la charpente, alors que le texte du rapide et le guide public disent le contraire. Faut-il (a) corriger les textes, ou (b) aligner le comportement réno sur le neuf, ce qui ferait monter les prix réno « max », pages SEO comprises ? | **(a)** Textes corrigés (`dictionaries.ts:208`, guide nuancé : « possible, hors décennale »), plus un avertissement sur les lignes de structure. Aucun total ne bouge. |
| **D5** | Trois corrections métier qui **changent des prix réno publics** : (a) les bandes de plâtre sont-elles comprises dans le prix des plaques ? Si oui, les prix baissent : maison de 100 m² en rénovation complète 98 538 → 92 793 € (−5,8 %), T3 de 65 m² −6,0 %, rénovation lourde −3,9 à −4,7 %, ainsi que les pages SEO et `/prix-poste/platrerie-cloisons`. (b) Semelles, murs et charpente indépendants de la finition aussi en réno ? (c) Créer un prix de fourniture sur 3 postes partagés (installation de chantier, coffret provisoire, escalier béton) ? | (a) **Ne pas trancher sur la seule source** `journal-corrections.md:48` : faire sourcer 2 ou 3 devis ; d'ici là, rien ne bouge en réno. (b) **Oui**, après le neuf. (c) **Oui**. Chaque écart réno est listé et validé une fois. |
| **D6** | La PAC air/eau à 11 000 € comprend-elle l'eau chaude ? | **Non, chauffage seul** (périmètre sourcé du neuf). Corriger la note réno ; avertir si une PAC et un chauffe-eau sont cochés ensemble. |
| **D7** | Aléas par défaut en neuf : 7 % ou 10 % (`decisions.md` §3, encore ouvert) ? Avec 10 %, A passe de 246 760 € à 252 150 €. | **10 %** (recherche et jurys). La réno reste à 7 %, avec la recommandation affichée à côté du champ. |
| **D8** | Compter les lignes perso dans le total des projets réno partout (fiche, liste, barre live) ? Le total affiché des projets réno existants qui en ont va changer. | **Oui** : un seul total, comme en neuf. |
| **D9** | Aperçu du rapide : la répartition du budget (par corps d'état en réno, par phase en neuf) est-elle gratuite ou réservée au Pro ? Aujourd'hui, elle est payante en réno et gratuite en neuf. | **Même règle des deux côtés** : floutée avec des données factices pour un compte gratuit, réelle pour un Pro. Le bilan du neuf sort de la page du rapide. |
| **D10** | Les décisions déjà ouvertes dans `decisions.md` touchent des postes partagés : §1 (14 corrections de prix), §2 (Enedis en lotissement), §5 (extérieurs, dont les portails qui existent déjà en réno), §8 (postes non chiffrés). Quand les trancher ? | **En une fois, avant N12.** Retenir les lignes « haute fiabilité » du §1. À noter : le n°6 (chape liquide sans fourniture) retire « Je le fais » sur ce poste des deux côtés ; le n°12 conditionne D2. |
| **D11** | Les projets enregistrés sont recalculés à chaque affichage : N7, N8 et N12 feront bouger les totaux déjà affichés, en réno comme en neuf, sans action de l'utilisateur. Accepte-t-on ce comportement ? | **Oui** : le chiffre reste le prix du jour. Mesurer l'écart au préalable avec T7, et afficher sur la fiche « Chiffrage mis à jour selon le référentiel du JJ/MM » quand un chantier déplace un total de plus de 1 %. |