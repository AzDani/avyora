# Construction neuve — estimation

L'estimateur d'AVYORA chiffre désormais la construction d'une maison individuelle neuve, du permis de
construire à la déclaration d'achèvement (enduits compris), avec le **même moteur** que la rénovation.

## Ce qui est en place (moteur seulement — rien n'est encore branché dans les pages)

| Fichier | Rôle |
|---|---|
| `lib/estimateur/catalog-neuf.json` | Le chantier dans l'ordre : 9 phases, lots, 202 postes (99 propres au neuf, 103 repris de la rénovation par `{"ref": id}` — même objet, même prix). |
| `lib/estimateur/catalogue-neuf.ts` | Chargement, `CATALOG_NEUF`, `PHASES_NEUF`, `catalogueDe(ctx)`. |
| `lib/estimateur/neuf.ts` | La maison à construire (`MaisonNeuve`), sa géométrie, la quantité de chaque poste, ce que chaque réponse coche ou décoche. |
| `lib/estimateur/presets-neuf.ts` | `presetNeuf` (mode rapide, 5 questions) et `presetMaison` (mode détaillé), `appliquerMaison`. |
| `lib/estimateur/core.ts` | `ctx.nature = "neuf"` : TVA 20 % partout ; postes `frais` (taxes, assurance) sans TVA, aléas, région ni finition ; unité `pct` (dommages-ouvrage, maîtrise d'œuvre). |
| `tests/estimateur-neuf.test.ts` | Règles, identifiants figés (`tests/postes-ids-neuf.txt`), TVA, frais, pourcentages, calage sur l'enquête officielle EPTB 2024. |

Un projet existant n'a pas de `nature` : il reste chiffré sur le catalogue rénovation, au centime près
(contrôlé sur 3 336 scénarios avant/après).

## Repères de calage (standard, tout fait faire, construction seule, hors études/taxes/branchements)

Plain-pied 100 m² : ≈ 2 085 € TTC/m² — repère officiel « maison terminée » (SDES, EPTB 2024) : 2 006 €.

## Dossier

- `conception.md` — phases, questions, modèle géométrique, règle de chaque poste, conflits.
- `decisions.md` — ce qui reste à trancher (prix du catalogue rénovation, aléas, extérieurs, postes non chiffrés).
- `journal-corrections.md` — ce que la contre-vérification a changé, et pourquoi.
- `sources/` — les relevés de prix (URL, chiffre relevé, HT/TTC) : `prix-sources.json` et `verif-*.json`.

## Maquette

Page interactive (rapide, détaillé, étapes du chantier, prix et sources, décisions), construite sur le
vrai moteur : artefact « AVYORA · Construction neuve ». Sources dans `maquettes/neuf/` :

```
node maquettes/neuf/assembler.mjs <dossier>      # compile le moteur et produit la page
node maquettes/neuf/controle.cjs <dossier>       # 26 contrôles dans Chrome headless + captures
```

## Reste à faire (branchement)

Pages du site (choix « Rénovation / Construction neuve », questionnaire, résultat), éditeur de plan
(« Plan final » → chiffrage neuf), et tout ce qui affiche un projet en lisant `CATALOG` au lieu de
`catalogueDe(ctx)`. La revue de code a listé ces endroits (fiche projet et `EstimationResultat`,
`RapportPDF`, `ResultatRapide`, `EstimationRappel`, page « modifier », import de plan, traductions
`catalog-i18n`) : chacun doit passer par `catalogueDe(ctx)` et `PHASES_NEUF`, et grouper les lots par
phase, car un même lot revient dans plusieurs phases du neuf.
