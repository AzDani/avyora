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
| `floor_plans` | Le plan dessiné (état de l'éditeur, vue, résumé, vignette, contrat de rénovation). Propriétaire seul : lecture, modification, suppression. **Aucune politique INSERT.** Modification **par colonne** (C1b) : la session n'écrit que `nom`, `etat`, `vue` et `resume` ; `apercu`, `workflow`, `schema_etat`, `contrat` et `contrat_at` sont écrits par le serveur seul (service role). |
| `floor_plans_creer(...)` | La seule porte de création. Exécutable par le service role seulement. Verrou consultatif par compte, limite passée par la route (1 en gratuit, `null` en Pro), plafond 200, reprise sans doublon par `editeur_id`. Erreurs : `limite_gratuite`, `plafond_plans`. |
| `floor_plans_touch` (trigger) | `updated_at`, propriétaire et date de création figés. `revision` n'avance que si `etat`, `nom` ou `workflow` changent, et le client ne peut pas la forger. |
| `project_plans` | Le lien « cette estimation est née de ce plan » (`plan_id`, `on delete set null`) et le cliché de la rénovation. Reprend 0003 : `contrat` devient facultatif. Les membres du projet **lisent**, le propriétaire du projet **écrit**, et ne relie qu'un plan qui est le sien. |

`0003_project_plans.sql` n'a jamais été appliquée. Elle est rangée dans `supabase/migrations/_remplacees/` :
sa politique laissait écrire tout membre du projet.

### Procédure pour le responsable

1. Ouvrir Supabase › SQL editor, coller **tout** `supabase/migrations/0004_floor_plans.sql`, exécuter.
2. Lancer ces vérifications. On attend : deux lignes à `true`, cinq politiques, `false`, puis
   `false` et `{etat,nom,resume,vue}`.
   ```sql
   select relname, relrowsecurity from pg_class where relname in ('floor_plans','project_plans');
   select tablename, policyname, cmd from pg_policies where tablename in ('floor_plans','project_plans') order by 1,2;
   select has_function_privilege('authenticated',
     'public.floor_plans_creer(uuid,int,text,text,jsonb,jsonb,jsonb,jsonb,int,text)','execute');
   select has_table_privilege('authenticated', 'public.floor_plans', 'UPDATE') as table_entiere,
     array(select attname from pg_attribute where attrelid = 'public.floor_plans'::regclass and attnum > 0
       and not attisdropped and has_column_privilege('authenticated', 'public.floor_plans', attname, 'UPDATE')
       order by 1) as colonnes_session;
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
  role, limite, plafond, reprise sans doublon, CHECK, isolation, révision, droits par colonne, liens,
  cascades) et le retour arrière deux fois puis 0004 à nouveau (mêmes droits par colonne).
- Les tailles mesurées par l'API sont comparées à `octet_length(x::jsonb::text)` du même Postgres jetable :
  états réels, contrats, vignette extrême, nombres et chaînes extrêmes ; un état à la limite passe zod ET le
  CHECK, un nombre de plus est refusé par les deux.
- `tests/rls.test.ts` rejoue les mêmes règles sur un vrai Supabase **de test**. Il crée des comptes :
  il ne prend aucune clé dans `.env.local` et ne tourne que si `RLS_TEST_SUPABASE_URL`,
  `RLS_TEST_SUPABASE_ANON_KEY` et `RLS_TEST_SUPABASE_SERVICE_ROLE_KEY` désignent un projet distinct de la
  production. Sinon il est ignoré. Sa garde (`tests/rls-garde.ts`, testée par `tests/rls-garde.test.ts`)
  **lit elle-même** `.env.local` et les autres fichiers d'environnement du dépôt : vitest ne les charge pas,
  et comparer à l'environnement seul laisserait passer l'URL de production. Elle refuse l'hôte de
  production quelle que soit l'écriture de l'URL (casse, barre finale, chemin, port) et sa clé anon.

## API « Mes plans » (C2)

Trois routes, toutes en `runtime = "nodejs"`, toutes à **404 sans corps** quand l'interrupteur est éteint.
Les erreurs sont des **codes** (`{ code }`, liste dans `lib/plans/http.ts`), jamais un message de Postgres
ou de zod : les textes vivent côté client, en français et en anglais. Aucune réponse n'est mise en cache
(`Cache-Control: private, no-store`).

| Route | Réponse | Règles |
|---|---|---|
| `GET /api/plans/session` | `{ connecte, pro, limite: 1\|null, utilises }` | Sans session : `{connecte:false, pro:false, limite:1, utilises:0}` en 200. Sert à l'affichage : chaque écriture refait le contrôle. |
| `GET /api/plans` | `{ plans:[{id, nom, workflow, resume, apercu, revision, updated_at, estimations}], limite, utilises }` | 401 sans session. **Jamais l'état.** 100 cartes au plus, les plus récentes d'abord. |
| `POST /api/plans` | 201 `{ id, revision, deja }` | `planCreerSchema`. Débit `planCreation` (20 / h / compte). Vignette calculée par le serveur. `floor_plans_creer` avec `limite = estPro ? null : 1`. `limite_gratuite` → 402, `plafond_plans` → 409 `plafond`. Même `editeurId` → le même plan, `deja: true`. |
| `GET /api/plans/[id]` | `{ id, nom, workflow, etat, vue, resume, revision, updated_at, estimations:[{id, nom, nature, created_at}] }` | `id` hors uuid, absent ou d'un autre compte → 404 (on ne dit pas si le plan existe). |
| `PATCH /api/plans/[id]` | `{ revision }` | `planMajSchema`. Débit `plan` (90 / min / compte). `where revision = attendue` ; 0 ligne → 404 si absent, sinon 409 `{code:"conflit", revision}`. `force: true` écrit sans condition. `contrat` : `planImportSchema` (codes `contrat_invalide`, `contrat_version`), taille mesurée comme Postgres (≤ 1,5 Mo, sinon 413) et même type que le plan (`contrat_workflow`), puis `contrat_at`. Nom, vue ou résumé seuls : la session écrit. État ou contrat : la session vérifie d'abord qu'elle voit le plan (sinon 404, rien n'est écrit), puis le **service role** écrit tout en une requête, filtrée par `id`, `owner_id` et la révision. |
| `DELETE /api/plans/[id]` | 204 | Débit `plan`. RLS ; les liens `project_plans.plan_id` repassent à null. |

- **Corps** : lu borné à 1,2 Mo (`content-length`, puis comptage du flux) avant `JSON.parse` ; au-delà, 413.
- **Schémas** (`lib/plans/schema.ts`) : fermés sur ce qui finit en HTML ou en attribut (identifiants, coordonnées,
  type et statut des murs, résumé), ouverts (`.loose()`) sur le reste. Une garde parcourt l'entrée **brute**
  (zod retire `__proto__` en silence) : profondeur ≤ 12, chaîne ≤ 100 000 (les notes et textes libres de
  l'éditeur n'ont pas de maxlength : une longue note ne fait pas refuser le plan), ni `__proto__` /
  `constructor` / `prototype`, ni image `data:`, ni caractère nul ou moitié de paire UTF-16 (jsonb les
  refuse). État ≤ 1 Mo, 6 niveaux.
- **Tailles** (`lib/plans/jsonb.ts`) : mesurées comme les CHECK de 0004, sur le texte du jsonb
  (`octet_length(x::jsonb::text)`), pas sur le JSON compact : jsonb ajoute une espace après chaque « : » et
  « , » (+17 % sur un plan réel) et écrit les nombres sans exposant (`3.55e-15` prend 32 octets). Un état
  accepté par zod n'est donc jamais refusé ensuite par un CHECK (erreur 500).
- **Vignette** (`lib/plans/apercu.ts`) : `[[ax, ay, bx, by, type, st], …]` du niveau affiché, nombres finis bornés
  à ± 10 000 et arrondis au centimètre, `type` dans `cloison | mur | porteur`, `st` dans `'' | creer | demolir`,
  2 000 murs au plus (moins de 128 Ko dans le pire cas).
- **Données** (`lib/plans/data.ts`) : tout passe par la session (RLS), sauf la création (service role, RPC) et
  l'écriture des colonnes du serveur (vignette, type, version de schéma, contrat : service role, après la
  vérification par la session, `owner_id` dans la requête).

### Tests

- `tests/plans-schema.test.ts` : sept états réels de l'éditeur (`tests/fixtures/plans-etats/`, régénérés par
  `node maquettes/tools/exporter-etats.mjs "$(pwd)/maquettes" tests/fixtures/plans-etats`) passent sans rien
  perdre ; les injections (attribut, apostrophe, `__proto__`, `data:`, 7 niveaux, 3 000 caractères…) sont refusées.
- `tests/plans-apercu.test.ts` : nombres et codes fermés, idempotent, sous 128 Ko.
- `tests/plans-jsonb.test.ts` : `octetsJsonb` rend les valeurs relevées sur Postgres (états réels, contrats,
  cas extrêmes) ; à la limite, accepté ; un nombre de plus, refusé ; la vignette la plus lourde tient (126 000 octets).
- `tests/plans-routes.test.ts` : les routes contre un Supabase simulé en mémoire (RLS, droits UPDATE par
  colonne, service role sans RLS, fonction de création atomique, trigger de révision, cascade) : 404
  interrupteur éteint, 401, 402, 409, 413, 429, aucune fuite d'`error.message`, jamais d'`etat` dans la
  liste, aucune colonne du serveur écrite par la session, jamais le service role pour le plan d'un autre.
- Pas d'intégration contre une vraie base : il faudrait des comptes, et la base de dev est la production.
  `tests/rls.test.ts` couvre la fonction et la RLS dès qu'un projet Supabase de test existe.

## L'éditeur en « mode site » (C3)

La source reste `maquettes/plan-editor.html`, la même que l'artefact. Le site (C4) pose `window.AVYORA_SITE`
avant d'exécuter l'éditeur ; sans lui, rien ne change (carnet **D76**, `maquettes/carnet/DECISIONS.md`).

| Situation | Comportement |
|---|---|
| Artefact, outils de la batterie | `SITE === null` : le chemin d'avant, au caractère près (phrases, clés `localStorage`, aucune requête). |
| Anonyme sur le site | Le mode local de l'artefact. Après la première pièce, une fois par plan : « Garde ce plan dans ton compte ». |
| Connecté (`NUAGE`) | « Mes plans » = le compte. Un plan dessiné est rangé d'office (limite gratuite : 1). Sauvegarde `PATCH` regroupée à 2 s avec la révision ; 409 → fenêtre de conflit ; hors ligne → indicateur et nouvel essai ; 402 → fenêtre de la limite. |
| Plans dessinés avant la connexion | Proposés, jamais repris seuls (« Sur cet appareil », « Ajouter à mon compte »), sauf drapeau `avyora-plan-claim`. Reconnus par leur id : ni Annuler ni Rétablir ne les rangent. Un plan ouvert supprimé du compte reste ouvert, proposé. |
| Anonyme après une déconnexion | Un tampon `avyora-plan-v2` qui porte un plan du compte (id uuid) est ignoré par l'éditeur. La déconnexion (C4/C5) peut en plus effacer `avyora-plan-v2` et `avyora-plan-rev`. |
| Liens | Construction : `&pid=<uuid>` ou `&pl=<id local>` devant `#plan=`. Rénovation (Pro) : `PATCH {revision, contrat}` puis `/projets/depuis-plan/<id>`. Logo → `/logiciel-plan-maison`. |

Ce que l'amorçage doit poser (contrat, détaillé dans D76) :

```js
window.AVYORA_PRO = false;            /* toujours un booléen */
window.AVYORA_SITE = { v: 1, connecte, limite, plans /* GET /api/plans */, plan /* GET /api/plans/:id ou null */,
  type /* final | renovation | null */, urls: { accueil, editeur, api, inscription, tarifs }, lang: "fr", dev: false };
```

Clés `localStorage` propres au site : `avyora-plan-rev` (révision et empreinte de ce que le compte a reçu),
`avyora-plan-invite`, `avyora-plan-claim`.

Contrôle : `node maquettes/tools/site.mjs "$(pwd)/maquettes"` (le source, l'artefact intact, le site simulé par
interception Puppeteer, sans compte ni serveur réel), puis la batterie complète comparée à la ligne de base de C0.

## L'éditeur hébergé sur `/plan` (C4)

Page pleine, sans iframe, sur la même origine. `app/plan/route.ts` est un route handler **`force-static`** :
`next build` le marque `○ /plan` (statique) et le HTML est produit **au build** par `lib/editeur/heberger.ts`,
qui lit `maquettes/plan-editor.html` et lui applique des remplacements **exacts et comptés**. Un motif trouvé un
autre nombre de fois que prévu lève une erreur : le build échoue plutôt que de servir une page à moitié transformée.
La source n'est pas modifiée (la batterie continue de tester le fichier tel quel, l'artefact aussi).

| Motif | Nombre | Devient |
|---|---|---|
| `@import` Google Fonts (Geist, Geist Mono) | 1 | deux `@font-face` vers `/fonts/geist/*-Variable.woff2` (polices variables : toutes les graisses) |
| `https://cdn.jsdelivr.net/npm/three@0.147.0/` | 1 | `/vendor/three@0.147.0/` |
| `https://getavyora.fr/` | 3 | `/` (tarifs et construction relatifs : une préversion reste sur sa propre origine) |
| `<meta name="viewport"` | 1 | précédée de `<meta name="robots" content="noindex">` |
| `\n<script>\n` | 1 | le voile, la config constante, l'amorçage, puis `<script type="text/plain" id="avyora-editeur">` |

- **Config constante** (aucune donnée utilisateur, chaque valeur passée par `JSON.stringify` et `<` → `\u003c`) :
  `AVYORA_PRO=false`, `AVYORA_PRIX_PRO` (« dès {prix mensuel du dictionnaire} par mois, sans engagement », la phrase
  de l'éditeur), `AVYORA_URLS`, la file `window.va` de Vercel Analytics (même forme que `initQueue` de
  `@vercel/analytics` 2.0.1) et `AVYORA_TRACK`, qui ne laisse passer que les neuf événements de D48 et D75, avec des
  valeurs simples seulement.
- **Amorçage** (lignes courtes, aucun `//`) : lit `?id=` (uuid) et `?type=` (`final` ou `renovation`, sinon rien),
  appelle `GET /api/plans/session`, puis, connecté, `GET /api/plans` et `GET /api/plans/:id`. Il pose
  `AVYORA_PRO` et `AVYORA_SITE` (contrat de C3), exécute le script différé et retire le voile.
  - Plan introuvable (404) : l'éditeur s'ouvre sans lui et dit « Ce plan n'est pas dans ton compte. » (C3).
  - Session, liste ou plan en panne, ou plus de 6 s : mode local, gratuit, et « La connexion à ton compte n'a pas
    abouti : ton plan reste sur cet appareil. Recharge la page pour réessayer. »
  - Anonyme avec `?id=` : « Connecte-toi pour ouvrir ce plan : il est rangé dans ton compte. »
- **Vercel Analytics** : `<script defer src="/_vercel/insights/script.js">` seulement quand le build tourne sur
  Vercel (`VERCEL=1` : production et préversion, où il se vérifie), jamais en local. Pas de balise Ads.
- **CSP propre** : seconde entrée de `headers()` dans `next.config.ts` pour `source: "/plan"` (la dernière entrée
  l'emporte ; une CSP renvoyée par le handler serait ignorée). Plus stricte que celle du site : ni Ads, ni Supabase
  en direct (`connect-src 'self'` et la mesure Vercel), aucune origine tierce. Elle garde `'unsafe-inline'` (les
  attributs `on…=` de l'éditeur) : le futur passage du site aux nonces ne la touchera pas. Plus `X-Robots-Tag:
  noindex` ; pas de `Disallow` dans `robots.ts` (il empêcherait de lire le `noindex`). La première entrée
  (`/:path*`) est figée par un instantané (`tests/plans-temoins.test.ts`, production et développement).
- **Fichiers servis** :

  | Fichier | Source | Licence |
  |---|---|---|
  | `public/vendor/three@0.147.0/build/three.min.js`, `…/examples/js/controls/OrbitControls.js` | `npm pack three@0.147.0` (intégrité npm vérifiée), identiques octet pour octet aux fichiers jsDelivr de l'artefact | MIT, `public/vendor/three@0.147.0/LICENSE` |
  | `public/fonts/geist/Geist-Variable.woff2`, `GeistMono-Variable.woff2` | `npm pack geist@1.7.2` (`dist/fonts/…`, intégrité npm vérifiée) | OFL 1.1, `public/fonts/geist/LICENSE.txt` |

  Les empreintes sha384 sont figées dans `tests/editeur-heberge.test.ts`. Les polices sont les versions
  **variables** : le paquet n'a pas de Geist ExtraBold (800) statique, que l'éditeur demandait à Google.
- **Proxy** : le matcher exclut `vendor/` et `fonts/` (ces fichiers ne paient plus un `auth.getUser()` chacun). Il
  couvre toujours les pages, `/projets`, `/admin`, `/estimation-travaux`, `/api/projects`, `/api/plans` et `/plan`
  (instantané dans les témoins).
- Interrupteur éteint : `GET /plan` → 404 (statique lui aussi) ; la CSP de l'entrée `/plan` est inerte.

### Contrôles

- `tests/editeur-heberge.test.ts` : motifs comptés (et l'échec du build si l'un manque ou déborde), aucune origine
  externe en sortie, `AVYORA_PRO=false` avant le script différé, un seul `type="text/plain"` qui porte le script de
  la source au caractère près, config et amorçage valides sans `</script` ni `//`, prix égal au dictionnaire, pont de
  mesure fermé, Vercel Analytics sur Vercel seulement, route 404 / 200, empreintes et licences.
- `maquettes/tools/heberge.mjs`, sur `next start` interrupteur allumé (sans adresse, dans la batterie, il ne fait
  rien) : en-têtes, zéro erreur de page, **zéro violation CSP**, aucune requête hors de l'origine, polices depuis
  `/fonts`, 3D depuis `/vendor` (capture WebGL), Pro à false, `?dev` sans effet, « Passer Pro » et lien vers la
  construction relatifs, l'amorçage contre l'API simulée par interception (connecté, 404, panne, délai, anonyme
  avec `?id=`, `?type=`, paramètres hostiles), et 1 440, 768 et 375 px.
  ```bash
  NEXT_PUBLIC_FEATURE_PLANS=1 npm run build && NEXT_PUBLIC_FEATURE_PLANS=1 npx next start -p 3014
  node maquettes/tools/heberge.mjs "$(pwd)/maquettes" http://localhost:3014 [--captures <dossier>]
  ```
- Pas de recette avec un vrai compte : la base de dev est la production. Les parcours connectés passent par l'API
  simulée ; la recette réelle (dessiner, recharger, retrouver le plan) se fera après l'application de 0004, en
  préversion.
- Le logo de l'éditeur mène à `/logiciel-plan-maison`, qui n'existe qu'à partir de C5.

## Contrôles de chaque chantier

```bash
npx tsc --noEmit -p .
CI=1 npx vitest run                  # dont tests/plans-temoins.test.ts
npm run build
node maquettes/tools/coherence.mjs
```

**`CI=1`** : hors CI, vitest **écrit** un instantané absent au lieu d'échouer. Un témoin supprimé ou renommé
passerait alors au vert en se régénérant. Avec `CI=1`, un instantané absent ou différent fait échouer la
suite : les témoins de C0 ne peuvent ni disparaître ni se réécrire en silence.

Dès que `maquettes/plan-editor.html` est touché : la batterie complète de l'éditeur, outil par outil
(`maquettes/README.md`), comparée à la ligne de base relevée en C0 : tous les outils à `exit=0`, aucun ✓ en
moins, aucun KO en plus, et chaque total « N/M » (`planfinal`, `site`, `vue3d`, `coherence`…) plein et sans
contrôle perdu par rapport à la base.
