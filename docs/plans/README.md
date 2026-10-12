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
  `constructor` / `prototype`, ni vraie URL `data:` (`data:<type>/<sous-type>` puis `;` ou `,` : une note qui
  commence par « Data: » passe), ni caractère nul ou moitié de paire UTF-16 (jsonb les
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
| Liens | Construction : `&pid=<uuid>` ou `&pl=<id local>` devant `#plan=`. Rénovation (Pro) : `PATCH {revision, contrat}` puis `/projets/depuis-plan/<id>` (C7). Logo → `/logiciel-plan-maison`. |

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
- Le logo de l'éditeur mène à `/logiciel-plan-maison` (C5).

## « Mes plans » : la vitrine-hub, la reprise, la limite (C5)

| Fichier | Rôle |
|---|---|
| `app/logiciel-plan-maison/page.tsx` | La vitrine (indexée, cible de l'onglet en C9). `notFound()` interrupteur éteint. Page serveur **sans lecture de session** : son HTML est celui d'un visiteur sans compte. Haut de page (titre, sous-titre ; en EN, « The editor is in French for now. »), puis l'îlot `TesPlans`. Le reste du contenu (étapes, Gratuit / Pro, FAQ, JSON-LD) arrive en C9. |
| `components/plans/TesPlans.tsx` | L'îlot client, hauteur réservée (`min-h`, CLS mesuré à 0). Connecté (`GET /api/plans`) : cartes (vignette React depuis l'aperçu du serveur, « Plan final » / « Projet rénovation », surface et pièces, date, « Ouvrir » → `/plan?id=`, « n estimations » dépliables, chargées par `GET /api/plans/:id`), puis « Nouveau plan » (Pro : aussi « Nouveau projet rénovation »), ou à la limite gratuite « Avec Pro : des plans enregistrés sans limite » → `/tarifs?source=editeur-plan`. Sans compte, avec des plans dans ce navigateur : « Sur cet appareil », « Reprendre « {nom} » » → `/plan`, « Garde-le dans ton compte » (drapeau, puis `/inscription?next=%2Fplan`). Téléphone (`max-width: 600px`) : « M'envoyer le lien » (partage du système), à défaut « Copier le lien » ; « Ouvrir » reste possible. |
| `components/plans/ClaimPlan.tsx` | Jumeau de `ClaimDraft`. Ne fait rien sans le drapeau `avyora-plan-claim`. Avec : un `POST /api/plans` avec `editeurId` (une seconde reprise rend le même plan, `deja`). Monté sur `/projets` **avant** `ClaimDraft` (interrupteur allumé seulement) et dans `TesPlans` pour un connecté. |
| `components/plans/PlanRappel.tsx` | Sur `/inscription`, si `next=/plan` ou si le drapeau est posé : « Ton plan est prêt » · « « {nom} » · {surface} m² · {n} pièces » (surface et pièces quand le résumé est connu). |
| `components/plans/ApercuPlan.tsx` | La vignette (`[[ax,ay,bx,by,type,st]]` → `<svg>` par React, donc échappée ; trait en pixels). |
| `lib/plans/local.ts` | Les plans de ce navigateur (`avyora-plans`, tampon `avyora-plan-v2`), `planPorteTravail` et `empreinte` de l'éditeur au caractère près (un modèle intact n'est pas un plan), le choix du plan à reprendre, le corps de la reprise et le nettoyage (comme `siteAjouterLocal`). Sans DOM : stockage et `fetch` passés en paramètres. |
| `lib/i18n/plans.ts` | Tous les textes FR et EN de C5 (`dictPlans`, `formatsPlans`, `messageReprise`). Hors du dictionnaire global. |

**La reprise** (drapeau → compte) :
- plan visé : celui du drapeau, sinon le plan ouvert (tampon), sinon le plus récent ; jamais un plan du compte resté
  dans le tampon (id uuid), jamais un plan vide ou un modèle intact ;
- 201 : « « {nom} » est dans ton compte. » (et « Les autres restent sur cet appareil. » s'il en reste, plus
  « Avec Pro… » en gratuit) ; l'entrée locale est retirée et le tampon prend l'uuid (l'éditeur rouvre alors le plan
  du compte par son adresse) ;
- 402 : « Ton compte garde déjà « {autre} ». Ce plan reste sur cet appareil. Avec Pro : des plans enregistrés sans
  limite. » (`{autre}` lu par `GET /api/plans`) ; 409 `plafond` ; panne : le plan reste sur l'appareil ;
- le drapeau est retiré dans tous les cas, sauf 401 (pas encore connecté) ;
- l'éditeur connecté traite aussi le drapeau à l'ouverture (C3) : celui qui passe le premier le retire.

**Limite gratuite** : la fonction `floor_plans_creer` (C1) est la seule autorité ; l'éditeur l'affiche par
`PLAN_LIMIT_FREE` / `planPaywall` ; le hub et la reprise traduisent le 402.

**Ne change pas** : `ClaimDraft` (aucune ligne) ; `/projets` et `/inscription` gardent leur HTML serveur, interrupteur
éteint **et** allumé sans drapeau (vérifié dans `tests/plans-temoins.test.ts`) ; `proxy.ts` (la vitrine et `/plan`
restent publics).

### Contrôles

- `tests/plans-claim.test.ts` : drapeau absent → aucun appel ; drapeau → un `POST` avec `editeurId`, nettoyage ;
  seconde reprise → `deja`, aucun doublon ; 402 → message FR et EN ; 401 → drapeau gardé ; panne, plafond, réponse
  illisible ; choix du plan ; empreinte de l'éditeur sur quatre modèles réels ; `ClaimPlan` monté avant `ClaimDraft`
  sur `/projets`, absent interrupteur éteint.
- `tests/plans-traductions.test.ts` : même forme FR / EN (`plans.ts` et `dictionaries.ts`), aucun prix, aucun emoji,
  tutoiement, droits repris de `DROITS`, mots interdits du Plan final absents.
- `tests/plans-vitrine.test.ts` : 404 éteint ; allumé, HTML de l'anonyme sans lecture de session, FR et EN.
- Recette navigateur sur `next start` interrupteur allumé, l'API simulée par interception dès qu'il faut une session
  (aucun compte) : anonyme (CLS 0), plans locaux, « Garde-le » → inscription et rappel, reprise connectée, 402,
  téléphone 375 px, anglais. Le parcours réel (s'inscrire, confirmer dans un autre navigateur, revenir) se fera en
  préversion après l'application de 0004.

## Estimation reliée : Plan final vers la construction neuve (C6)

Le lien « Chiffrer cette maison » de l'éditeur hébergé porte, en plus du fragment `#plan=`, l'identifiant du plan
dans la **recherche** (un `&pid=` dans le fragment casserait le décodage base64) :
`/estimation-construction-maison?source=editeur-plan&pid=<uuid>#plan=…` (plan du compte) ou `&pl=<id local>`
(plan de l'appareil). L'éditeur le fait depuis C3 (`lienConstruction` enveloppé).

| Fichier | Rôle |
|---|---|
| `lib/neuf-contexte.ts` | `InitialNeuf.planId` (`planIdSchema`, uuid) et `planLocal` (`editeurIdSchema`), lus depuis `pid` et `pl` **seulement si `FEATURES.plans`**. Un invalide est ignoré. |
| `lib/estimateur/brouillon-neuf.ts` | `OrigineNeuf` gagne `planId?` et `planLocal?`. `lireBrouillonNeuf` passe l'origine par `nettoyerOrigine` : identifiants bien formés gardés, les autres retirés ; une origine qui n'est pas `source: "plan"` disparaît. |
| `lib/plans/origine.ts` | Pur (sans zod ni Supabase, il entre dans le bundle de `ClaimDraft`) : `nettoyerOrigine`, et `origineDuPlan(reponses)` côté serveur (projet **neuf**, `source === "plan"`, au moins un identifiant). |
| `components/neuf/EstimateurRapideNeuf.tsx` | `planId` / `planLocal` n'entrent dans l'origine que si le plan du fragment est **appliqué**, et seulement pour le fragment lu au montage (un lien collé ensuite dans le même onglet n'hérite pas du `pid`). Un `pid` sans `#plan=` ne relie rien. Interrupteur allumé, l'URL nettoyée retire aussi `pid` et `pl`. |
| `lib/plans/relier.ts` | `relierAuPlan(sb, userId, projectId, origine)` : résout le plan sous RLS (par uuid, sinon par `editeur_id`), puis `upsert project_plans {project_id, plan_id, version, contrat: null, nom}` en `onConflict: project_id` ignoré. `relierEstimationsOrphelines(sb, userId, planId, editeurId)` : les projets neufs de l'utilisateur dont `reponses.origine.planLocal = editeurId` et sans ligne `project_plans`. **Ne lèvent jamais** : un échec est journalisé (`plan_lien_echoue`, avec `user_id`, sans détail interne) et l'appelant continue. |
| `app/api/projects/route.ts` | Après `createProjet` : `if (FEATURES.plans && origineDuPlan(reponses)) relierAuPlan(…)`. Sans origine, ou interrupteur éteint : aucune requête `project_plans`. |
| `app/api/plans/route.ts` | Après une reprise avec `editeurId` : `relierEstimationsOrphelines` (l'ordre « estimation réclamée avant le plan »). La réponse ne change pas : l'ouverture de la session elle-même est sous `try`, la création reste une 201. |

**Couvert sans autre code** : « Affiner » (détaillé neuf, Pro) recrée un projet par `POST` en gardant l'origine, il est
donc relié aussi ; un brouillon anonyme réclamé par `ClaimDraft` est relié dès que le plan est dans le compte, ou à
la reprise du plan local. Le rapide neuf reste gratuit, le détaillé neuf reste Pro.

**Ne change pas** : le lien `#plan=` de l'éditeur, `planNeufSchema`, `extraitPlanNeuf`, `lirePlanNeuf`,
`FRAGMENT_PLAN_MAX` ; `PATCH /api/projects/[id]` ne relie jamais ; un projet sans origine de plan ne lit jamais
`project_plans`.

### Contrôles

- `tests/neuf-plan-relie.test.ts` (Supabase simulé, RLS de 0001 et 0004 reproduite) : `contexteNeuf` (valide,
  invalide, éteint) ; brouillon conservé et nettoyé ; « Affiner » garde l'origine ; `POST /api/projects` sans origine
  ou en rénovation → aucune requête de lien ; éteint → aucune ; plan du compte → relié ; plan local déjà repris →
  relié ; plan d'un autre compte → 0 ligne, projet créé, 200 ; panne → 200 et journal ; `relierEstimationsOrphelines`
  ne touche que des projets sans lien ; reprise par `POST /api/plans` → l'estimation réclamée avant est reliée.
- `tests/estimateur-plan-neuf.test.ts`, `neuf-*.test.ts`, `coherence.mjs` § 8 et `planfinal.mjs` (dont
  `plan-neuf-lien.mts`) : verts, sans modification.
- Recette navigateur sur `next start`, `POST /api/projects` intercepté (aucun compte) : éteint, l'origine n'a ni
  `planId` ni `planLocal` et l'URL garde `pid` comme avant ; allumé, `pid` arrive dans l'origine et quitte l'URL,
  l'anonyme (401) range un brouillon réclamable avec `planLocal`, un `pid` sans `#plan=` ou invalide ne relie rien.
  Le parcours réel (fiche « Vient de ton plan », C8) se fera en préversion après l'application de 0004.

## Estimation reliée : plan de rénovation vers la rénovation, Pro (C7)

L'éditeur (Pro, connecté) envoie son contrat (`PATCH /api/plans/[id] {revision, contrat}`, C3), puis ouvre
`/projets/depuis-plan/<id>`. L'écran montre ce que le plan remplirait, demande le code postal s'il manque, et la
validation part vers `POST /api/plans/<id>/estimation`, qui **recalcule tout depuis la base**. Le client continue
vers `/projets/{projectId}/modifier` (D1 : dernière relecture dans le détaillé).

| Fichier | Rôle |
|---|---|
| `lib/estimateur/plan-ctx.ts` | Pur. `ctxDepuisPlan(contrat)` part de `defaultCtx()` : périmètre logement entier (D3), surface = `area` arrondie, emprise du RDC saisie (`surfaceSolManual`), niveaux, hauteur, **les 8 compteurs toujours écrits** (`compteursDepuisPlan`, pièces construites comme `maisonDepuisPlan`, appareils à démolir exclus), fenêtres existantes après travaux, finition, code postal s'il est valide, `fiscal: "pro"` si le logement a moins de deux ans. Type : « Maison », ou pour un appartement Studio/T2/T3/T4 (chambres + 1, le moteur n'a pas de type « Appartement »). Chaque valeur du contrat est relue, typée et bornée. |
| `lib/plans/estimation.ts` | Serveur, session seule (aucun service role). `preparer(sb, planId, projetRelie?)` : relit `floor_plans.contrat`, `planImportSchema`, refuse un Plan final, `contributionsDuPlan` → `injecterPlan(sel du projet relié ?? {})` ; **n'écrit rien**. `valider(sb, user, planId, {codePostal?, projetId?, nouvelle?, locale})` : estimation reliée (`projetId`, sinon la plus récente) → injection rejouée sur la sélection du moment (D12), seule `reponses.sel` change, puis cliché du lien remplacé ; sinon création (`reponses = {v:"estimateur", mode:"detaille", ctx, sel, codePostal}`, nom « Rénovation — « {plan} » · {surface} m² », clé EN) puis `upsert project_plans {project_id, plan_id, contrat, contributions, rapport, version, nom}`. Chaque écriture vérifie le nombre de lignes (0 → erreur). Lien en échec : le projet créé est **supprimé** ; une estimation mise à jour reprend sa sélection d'avant. `reponses` ≤ 40 000 caractères (l'estimateur doit pouvoir le réenregistrer), sinon `trop_volumineux`. |
| `app/api/plans/[id]/estimation/route.ts` | `POST {codePostal?, projetId?, nouvelle?}` (schéma strict, corps ≤ 2 000 octets) → 201 `{projectId, cree:true}` ou 200 `{projectId, cree:false}`. Gardes : interrupteur (404 sans corps), session (401), `estPro` (403 `pro_requis`), débit `plan`, uuid, code postal à 5 chiffres obligatoire si le contrat n'en porte pas (400 `code_postal`). Codes : `introuvable`, `contrat_absent`, `contrat_invalide`, `contrat_version`, `contrat_workflow`, `trop_volumineux`, `erreur`. |
| `app/projets/depuis-plan/[planId]/page.tsx` | Privée (`proxy.ts`). Interrupteur éteint → 404 ; gratuit → `/tarifs?source=editeur-plan`. `?projet=<id>` : l'estimation reliée à mettre à jour ; sinon la plus récente ; sinon création. `?nouvelle=1` force la création (lien secondaire « Créer plutôt une nouvelle estimation »). Plan sans contrat ou Plan final : un message et « Ouvrir le plan ». |
| `components/plans/DepuisPlan.tsx` | Client : résumé du bien (création), code postal si besoin, `ValidationPlan`, envoi, erreurs par code (`lib/i18n/plans.ts`, `estimation.erreurs`). |
| `components/ValidationPlan.tsx` | Textes en clés FR/EN (`validation`), nombres et unités selon la langue, libellés du catalogue traduits (`catT`), couleurs par jetons du thème. Interface `{rapport, onValider}` inchangée (un `occupe` facultatif en plus). Les raisons et déductions viennent de la table de correspondance : elles restent en français. |

**Supprimés** : `app/api/projects/[id]/plan/route.ts`, `…/plan/appliquer/route.ts`, `components/ImporterPlan.tsx`, et le
commentaire de la fiche projet qui les décrivait.

**Ne change pas** : `plan-correspondance.ts`, `plan-injection.ts`, `plan-mapping.ts` ; l'estimateur détaillé ; les
projets de rénovation sans plan ; aucune migration (0004 suffit : `project_plans` a déjà `plan_id`, `contrat`,
`contributions`, `rapport`).

### Contrôles

- `tests/estimateur-plan-ctx.test.ts` (contrat `tests/fixtures/plan-contrat.json`) : 8 compteurs écrits, zéros
  compris ; surface = `area` ; logement entier ; emprise du RDC ; fenêtres après travaux ; code postal absent →
  aucun ; appartement → T2/T3/Studio ; valeurs hors bornes ramenées.
- `tests/plans-estimation.test.ts` (Supabase simulé, aucun service role) : éteint → 404 ; 401 ; gratuit → 403 ;
  429 ; plan d'un autre → 404 ; Plan final → 400 ; sans contrat → 400 ; code postal ; création (projet + lien
  avec `plan_id`, cliché) ; nom EN borné ; lien en erreur ou refusé en silence → projet supprimé ; mise à jour :
  une ligne épinglée (D12) n'est pas écrasée, `custom` et `statuts` gardés ; `update` à 0 ligne → erreur ; lien
  en échec → sélection d'avant ; `preparer` n'écrit rien ; la page (404, connexion, Tarifs, FR/EN, mise à jour,
  messages) ; anciennes routes absentes.
- `estimateur-plan-correspondance`, `-injection`, `-mapping` : verts, sans modification.
- Recette navigateur (`next start`, interrupteur allumé, page d'aperçu temporaire, `POST` intercepté, aucun
  compte) : résumé et code postal, refus sans code postal, corps envoyé = code postal seul (création) ou
  `projetId` seul (mise à jour), suite `/projets/{id}/modifier`, écran EN sans français hors raisons, 403 →
  message, 375 px sans défilement, contraste AA des alertes. Le parcours réel (dessiner, valider, détaillé,
  « Mettre à jour l'estimation ») se fera en préversion.

## Le lien dans les deux sens (C8)

Plan → estimations : l'éditeur (C3) et les cartes de « Tes plans » (C5). Estimation → plan : la fiche projet et
« Mes projets », ci-dessous. Interrupteur éteint : aucune requête `project_plans` ni `floor_plans`, HTML inchangé.

| Fichier | Rôle |
|---|---|
| `lib/plans/data.ts` | `planDuProjet(projectId)` et `plansDesProjets(ids)` : `select project_id, plan_id, updated_at, plan:floor_plans(nom, updated_at)` sous RLS (une requête par tranche de 100 projets, aucune sans projet). Lien sans `plan_id` (plan supprimé) ou plan absent de la jointure (plan d'un autre compte, invisible par RLS) → ignoré. `planAChange` : `floor_plans.updated_at > project_plans.updated_at`. |
| `components/plans/PlanRelie.tsx` | Serveur. « Vient de ton plan « {nom} » » · « Ouvrir le plan » (`/plan?id=`). Rénovation dont le plan a changé depuis le cliché : « Ton plan a changé depuis cette estimation » · « Mettre à jour » → l'éditeur `/plan?id=` (Pro), sinon `/tarifs?source=editeur-plan` avec la pastille Pro. **Pas** tout droit vers `/projets/depuis-plan/…` (écart au plan) : cet écran relit `floor_plans.contrat`, que seul l'éditeur calcule et n'envoie qu'au clic sur « Mettre à jour l'estimation » ; après un changement du dessin, il réappliquerait l'ancien plan. Le lien Pro porte l'estimation de la fiche (`/plan?id={plan}&projet={id}`) ; l'éditeur (`siteProjetVise`) la recopie, si c'est bien le plan de l'URL et un uuid, sur `/projets/depuis-plan/{plan}?projet={id}` : la mise à jour vise CETTE estimation, pas la plus récente des estimations reliées au même plan. Sans `?projet=` (éditeur ouvert depuis « Tes plans »), la validation prend la plus récente. |
| `app/projets/[id]/page.tsx` | La bannière entre l'en-tête et le résultat, seulement si l'interrupteur est allumé et qu'un plan est relié. Une panne de la base n'affiche rien. |
| `app/projets/page.tsx`, `components/ListeProjets.tsx` | `ProjetCarte.plan?: {id, nom}` → pastille « Depuis ton plan » (`span`, le nom du plan en `title` : la carte est déjà un lien, aucun `<a>` dans un `<a>`). Au moins un plan : bande « Tes plans (n) » → `/logiciel-plan-maison`. Liste vide et aucun plan : lien secondaire « ou commence par dessiner ton plan » (vitrine, qui accueille aussi les téléphones). Les textes arrivent en props (`PlansListe`) : le dictionnaire des plans reste hors du paquet client. |
| `lib/i18n/plans.ts` | Section `lien`, FR et EN. |

Le signal « a changé » est **large** : le trigger de `floor_plans` avance `updated_at` à **chaque** écriture,
pas seulement quand le dessin chiffré change. L'éditeur n'écrit que si son empreinte de travail a changé, mais
cette empreinte inclut des choses qui ne changent pas le chiffrage. Faux positifs connus (« Ton plan a changé »
alors que le dessin chiffré est le même) :

- renommer le plan (le nom entre dans l'empreinte, donc un PATCH `nom`) ;
- un envoi du contrat (« Mettre à jour l'estimation ») suivi d'un abandon de l'écran de validation ;
- une date « Prévu le » du suivi saisie dans l'éditeur.

L'envoi du contrat pour une **autre** estimation reliée au même plan l'affiche aussi « a changé », ce qui est vrai
(elle ne porte pas ce contrat). Les deux dates viennent de deux horloges : `now()` de Postgres pour
`floor_plans.updated_at`, `new Date()` du serveur Next (`ligneLien`) pour `project_plans.updated_at` ; un décalage
de quelques secondes ne pèse que sur une modification faite dans ces secondes-là. Le faux positif est sans
danger : « Mettre à jour » rouvre l'éditeur et la validation montre le bilan avant toute écriture.
Signal exact = évolution de schéma, donc une **nouvelle** migration 0005 (0004 est appliquée et ne bouge plus),
par exemple une colonne `dessin_at` que le trigger n'avance que si `etat` ou `workflow` change (en filtrant le
suivi), comparée à `project_plans.updated_at` ; à décider, puis à appliquer par le responsable. Rien de tel
aujourd'hui : aucune migration.

### Contrôles

- `tests/plans-lien-affichage.test.ts` (Supabase simulé) : données (lien lisible, plan supprimé ou invisible,
  tranches, panne → `ErreurPlans`, `planAChange`) ; éteint → aucune requête plans, même avec des liens en base ;
  allumé sans lien, plan supprimé ou invisible → fiche et liste identiques à éteint (FR, EN, gratuit, Pro) ; fiche :
  bannière, nom échappé, « Mettre à jour » Pro vers l'éditeur avec `&projet=` de la fiche (jamais tout droit vers la
  validation ; deux rénovations reliées au même plan visent chacune la sienne), gratuit vers Tarifs, rien
  pour une rénovation à jour ni pour une construction ; liste : pastille seulement sur les projets reliés (actifs
  et archivés), bande « (n) », lien de la liste vide ; profondeur des `<a>` = 1 ; EN ; `siteProjetVise` de
  l'éditeur, extrait de la source (plan de l'URL et uuid seulement).
- `tests/plans-temoins.test.ts` : session Supabase simulée, et « aucune requête » vérifiée sur la liste et la fiche
  interrupteur éteint. Le témoin C5 « /projets allumé = éteint » admet, liste vide, le seul lien « ou commence par
  dessiner ton plan » (ajout voulu de C8).

## La mise en avant (C9)

Tout est derrière `FEATURES.plans` ; éteint, chaque surface garde son HTML au caractère près (témoins C0).

| Où | Quoi | Fichiers |
|---|---|---|
| En-tête desktop | Onglet « Plan 3D » + pastille « Gratuit », premier lien, blanc plein, `aria-current` sur la vitrine | `components/plans/OngletPlan.tsx`, `app/layout.tsx` |
| Largeur de l'en-tête | Mesurée à 640, 768 et 1 024 px (anonyme, gratuit au prénom long, admin ; FR et EN). Allumé : navigation inline dès `md` (menu en dessous : l'en-tête d'un connecté débordait déjà à 640 et 768 px, interrupteur éteint), prénom en icône sous `xl`, « Admin » et « Déconnexion » en icône sous `lg`, langue au pied entre `md` et `lg` | `app/layout.tsx`, `components/auth/AuthNav.tsx` |
| Menu mobile | Ligne contrastée sous « Nouveau projet » (pas un 2ᵉ bouton plein) | `components/MobileMenu.tsx` |
| Accueil | `PLAN_BAND` / `PLAN_BAND_EN` juste après le hero, deux vraies captures, 5ᵉ puce de confiance ; 3ᵉ puce seulement si `FEATURES.neuf` | `app/page.tsx` |
| Écran de choix | Bandeau « Partir de mon plan » sous la grille (neuf → `/plan?type=final`, réno Pro → `?type=renovation`, réno gratuit → `/tarifs?source=choix-plan`) ; l'îlot `PartirDePlan` propose le plan le plus récent du bon type | `components/ChoixEstimation.tsx`, `components/plans/PartirDePlan.tsx` |
| Tarifs | Puce `featurePlan` après `featureNeuf`, ligne « Dessiner ton plan… reste gratuit », `?source=editeur-plan|choix-plan` passé à `vue_tarifs`, encart « Tu viens de l'éditeur de plan » | `app/tarifs/page.tsx`, `lib/i18n/dictionaries.ts` |
| Pied de page | « Plan de maison 3D » | `app/layout.tsx` |
| Page neuf | « Pas encore de plan ? Dessine ta maison… » → `/plan?type=final` | `app/estimation-construction-maison/page.tsx` |
| Vitrine | Captures, trois gestes, ce que tu peux faire, après le plan, Gratuit / Pro (mots de `DROITS`), FAQ, JSON-LD `WebApplication` (sans note ni avis) + `BreadcrumbList` + `FAQPage`, image de partage composée | `app/logiciel-plan-maison/page.tsx`, `lib/i18n/plans.ts`, `lib/plans/droits.ts` |
| Sitemap | `/logiciel-plan-maison` (0,9, mensuelle) ; `/plan` jamais | `app/sitemap.ts` |

**Captures** (`public/plans/`) : vraies, produites par `node maquettes/tools/captures-site.mjs "$(pwd)/maquettes" http://localhost:3014 public/plans`
sur un `next start` interrupteur allumé : `/plan` en gratuit, sans `?dev`, plan type « Maison · 94 m² » (Plan final), 1 440 × 900 à 2×,
réduites en webp 760 / 1040 et PNG 1040, plus `og-plan.png` (1 200 × 630). Sans adresse, l'outil sort en 0 (batterie).

**FAQ permis** : architecte obligatoire au-delà de 150 m² de **surface de plancher** (réponse ministérielle, JO du 18/12/2018, QE 6969 :
l'emprise au sol ne compte plus).

### Contrôles

- `tests/plans-points-entree.test.ts` : éteint, aucune trace ; allumé, chaque surface = celle d'avant + l'ajout (retiré, on retrouve le
  HTML éteint), grille de choix identique, section de l'accueil juste après le hero (FR, EN), puce après celle du neuf, sitemap, vitrine
  (contenu, JSON-LD, métadonnées), dimensions des captures.
- `coherence.mjs` § 9 : `lib/plans/droits.ts` ⊂ `DROITS` de l'éditeur ; colonnes de la vitrine, puce et encart de Tarifs mot pour mot ;
  le bloc « Plan final » de la vitrine sans aucun des `MOTS` de `planfinal.mjs`.

## Retouches des vérificateurs (lots 1 et 2)

- Éditeur : `siteNom` tronque par **point de code** (`Array.from`), à 120 unités UTF-16 au plus comme `nomPlan`,
  et retire les moitiés de paire isolées et le caractère nul : un long nom avec un emoji à la frontière ne fait
  plus refuser la sauvegarde (400). Testé sur la fonction de la source (`tests/plans-schema.test.ts`).
- `data:` : seules les vraies URL d'image intégrée sont refusées (`RE_IMAGE_INTEGREE`,
  `/^\s*data:[a-z]+\/[a-z0-9.+-]+[;,]/i`) ; une note « Data: relevé du géomètre… » est acceptée.
- `COLONNES_SESSION` vit dans `lib/plans/schema.ts` : `majPlan` construit l'écriture de la session avec, et le test
  de routes simule le droit par colonne avec la même liste (plus de copie).
- Amorçage de `/plan` : un `?id=` en majuscules est mis en minuscules (Postgres rend l'uuid en minuscules).
- Reprise refusée (402) sans nom connu du plan du compte : « Ton compte garde déjà un autre plan. », sans
  guillemets. En anglais, le rappel cite « “Mes plans” », le nom que l'éditeur (en français) affiche, comme le hub.
- `POST /api/plans` et `POST /api/projects` : le lien après création ne peut plus changer la réponse, même si la
  session ne se rouvre pas (journalisé). `plan_lien_echoue` porte le `user_id` du compte.

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
