# Mes plans — l'éditeur de plan en ligne

L'éditeur de plan d'AVYORA (`maquettes/plan-editor.html`) passe dans le site : on dessine son plan
gratuitement, on le garde dans son compte, et une estimation peut naître du plan (Plan final vers la
construction neuve, plan de rénovation vers la rénovation, en Pro). Le plan est un objet à part : il
n'est relié à une estimation que si elle naît de lui.

Le travail avance par chantiers (C0 à C11). Chacun est livrable seul, interrupteur éteint.

## Interrupteur

`FEATURES.plans` (`lib/features.ts`), **éteint** jusqu'au lancement :

```ts
plans: process.env.NEXT_PUBLIC_FEATURE_PLANS === "1",
```

- Local ou préversion : `NEXT_PUBLIC_FEATURE_PLANS=1` (au build, la variable est lue à la compilation).
- Au lancement (C11), il passe à `!== "0"` comme `FEATURES.neuf`, pour garder une extinction d'urgence
  sans toucher au code.

Interrupteur éteint : toutes les nouvelles pages et routes répondent 404, aucun point d'entrée n'est
rendu, `POST /api/projects` ne lit ni `planId` ni `planLocal`, et la rénovation comme le neuf restent
identiques au caractère près.

## Témoins de non-régression (C0)

`tests/plans-temoins.test.ts` fige le HTML rendu, interrupteur éteint, de toutes les surfaces que les
chantiers vont toucher. Les références sont dans `tests/__snapshots__/plans-temoins.test.ts.snap`.

| Surface | Variantes |
|---|---|
| En-tête desktop et pied de page (layout racine) | FR, EN · anonyme, gratuit, Pro, admin |
| Menu mobile, ouvert | FR, EN · anonyme, gratuit, Pro, admin |
| Accueil | FR, EN |
| Écran de choix (`ChoixEstimation`) | FR, EN · rénovation, neuf · gratuit, Pro |
| Tarifs | FR, EN · anonyme, gratuit, Pro |
| Mes projets (`/projets`, dont `ListeProjets`) | FR, EN · gratuit, Pro · vide, plein (réno rapide et détaillée, neuf rapide et détaillé, archivé) |
| Fiche projet | FR, EN · gratuit, Pro · réno rapide, réno détaillée, neuf rapide, neuf détaillé |
| Sitemap | adresse, priorité, fréquence, date |

Le rendu passe par `prerender` (`react-dom/static`), qui attend les composants serveur asynchrones
imbriqués : les surfaces sont rendues en entier, sans bouchon. Seuls sont simulés la session
(`@/lib/auth`), les projets (`@/lib/data/projects`), la langue, le routeur client, les polices, la
balise Ads et la mesure d'audience. La date est figée au 12/10/2026.

Un écart sur ces instantanés, interrupteur éteint, est une régression : on corrige le code, **on ne
régénère pas** les références (`vitest -u` est réservé à un changement voulu de la rénovation ou du neuf,
hors de ce chantier).

## Contrôles de chaque chantier

```bash
npx tsc --noEmit -p .
npx vitest run                       # dont tests/plans-temoins.test.ts
npm run build
node maquettes/tools/coherence.mjs
```

Dès que `maquettes/plan-editor.html` est touché : la batterie complète de l'éditeur, outil par outil
(`maquettes/README.md`), comparée à la ligne de base relevée en C0 (tous les outils à `exit=0`).
