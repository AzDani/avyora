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

## Base de données (C1)

Une seule migration, **`supabase/migrations/0004_floor_plans.sql`**, idempotente et additive. Elle ne
touche pas à `projects` ni aux tables de 0001 et 0002.

| Objet | Rôle |
|---|---|
| `floor_plans` | Le plan dessiné (état de l'éditeur, vue, résumé, vignette, contrat de rénovation). Propriétaire seul : lecture, modification, suppression. **Aucune politique INSERT.** |
| `floor_plans_creer(...)` | La seule porte de création. Exécutable par le service role seulement. Verrou consultatif par compte, limite passée par la route (1 en gratuit, `null` en Pro), plafond 200, reprise sans doublon par `editeur_id`. Erreurs : `limite_gratuite`, `plafond_plans`. |
| `floor_plans_touch` (trigger) | `updated_at`, propriétaire et date de création figés. `revision` n'avance que si `etat`, `nom` ou `workflow` changent, et le client ne peut pas la forger. |
| `project_plans` | Le lien « cette estimation est née de ce plan » (`plan_id`, `on delete set null`) et le cliché de la rénovation. Reprend 0003 : `contrat` devient facultatif. Les membres du projet **lisent**, le propriétaire du projet **écrit**, et ne relie qu'un plan qui est le sien. |

`0003_project_plans.sql` n'a jamais été appliquée. Elle est rangée dans `supabase/migrations/_remplacees/` :
sa politique laissait écrire tout membre du projet.

### Procédure pour le responsable

1. Ouvrir Supabase › SQL editor, coller **tout** `supabase/migrations/0004_floor_plans.sql`, exécuter.
2. Lancer ces vérifications. On attend : deux lignes à `true`, cinq politiques, puis `false`.
   ```sql
   select relname, relrowsecurity from pg_class where relname in ('floor_plans','project_plans');
   select tablename, policyname, cmd from pg_policies where tablename in ('floor_plans','project_plans') order by 1,2;
   select has_function_privilege('authenticated',
     'public.floor_plans_creer(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,int,text)','execute');
   ```
   Les cinq politiques : `floor_plans_delete`, `floor_plans_select`, `floor_plans_update`,
   `project_plans_ecriture`, `project_plans_lecture`.
3. Ne **jamais** exécuter `supabase/migrations/_remplacees/0003_project_plans.sql`.

Rejouer 0004 ne change rien (ni erreur, ni donnée touchée).

### Retour arrière

`supabase/migrations/0004_floor_plans_retour.sql`, seulement si on abandonne la fonction : il **efface
tous les plans enregistrés**. Il retire `floor_plans`, sa fonction de création, son trigger et la colonne
`project_plans.plan_id` (la politique d'écriture est d'abord reposée sans le plan, sinon Postgres refuse).
`project_plans` reste en place, avec les politiques de 0004.

### Vérifications

- Hors ligne, sur un Postgres jetable en mémoire (PGlite, socle Supabase simulé : rôles `anon`,
  `authenticated`, `service_role`, `auth.uid()`, droits par défaut), jamais sur Supabase : 0001 puis
  0004 trois fois, avec et sans 0003 déjà appliquée, puis le comportement (création réservée au service
  role, limite, plafond, reprise sans doublon, CHECK, isolation, révision, liens, cascades) et le retour
  arrière deux fois puis 0004 à nouveau.
- `tests/rls.test.ts` rejoue les mêmes règles sur un vrai Supabase **de test**. Il crée des comptes :
  il ne lit pas `.env.local` et ne tourne que si `RLS_TEST_SUPABASE_URL`, `RLS_TEST_SUPABASE_ANON_KEY` et
  `RLS_TEST_SUPABASE_SERVICE_ROLE_KEY` désignent un projet distinct de la production. Sinon il est ignoré.

## Contrôles de chaque chantier

```bash
npx tsc --noEmit -p .
npx vitest run                       # dont tests/plans-temoins.test.ts
npm run build
node maquettes/tools/coherence.mjs
```

Dès que `maquettes/plan-editor.html` est touché : la batterie complète de l'éditeur, outil par outil
(`maquettes/README.md`), comparée à la ligne de base relevée en C0 (tous les outils à `exit=0`).
