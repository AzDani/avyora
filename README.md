# AVYORA

Estimateur de coût de rénovation, marché français. En production : **https://getavyora.fr**

Le produit répond à une seule question, mais correctement : *combien vont coûter ces travaux, et de quoi ce prix est-il fait ?* Là où les comparateurs affichent une fourchette, AVYORA chiffre poste par poste et publie sa méthode.

## Lancer

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest
npm run build   # build de production
```

Variables d'environnement : voir `.env.local.example`. Sans Supabase configuré, l'estimation
anonyme fonctionne ; la sauvegarde de projet et l'authentification non.

## Stack

Next.js 16.2.10 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) · Vercel.

> ⚠️ **Next 16 n'est pas le Next que vous connaissez.** Lire `AGENTS.md` : la consigne est de
> consulter `node_modules/next/dist/docs/` avant d'écrire du code qui touche aux API du framework.

## Ce que le produit fait aujourd'hui

`lib/features.ts` est la **source de vérité unique** de ce qui est actif. Au moment où ces lignes
sont écrites, seuls `estimateur` et `projets` sont à `true`.

- **Estimation rapide** — gratuite, sans inscription. Quatre questions, une fourchette ajustée au
  code postal. Route : `/estimation-travaux`.
- **Estimation détaillée (Pro)** — les 200 postes au poste près, choix « je le fais / je fais
  faire » par tâche, export PDF, sauvegarde, suivi de chantier. Payante.

Construits mais **masqués** derrière un flag à `false` : analyse de devis, rentabilité locative,
documents, artisans, chantier. Rien n'a été supprimé — repasser le flag à `true` suffit.
Ne pas les présenter comme livrés.

## Le moteur

`lib/estimateur/` — **18 corps d'état, 200 postes** dans `catalog.json`, dont 168 portent à la fois
un prix fourni-posé et un prix de fourniture seule (l'écart entre les deux, c'est la main-d'œuvre).

Le total appliqué : quantités déduites du bien (`autoQty`), coefficient de finition par lot,
coefficient régional sur la main-d'œuvre, TVA travaux par poste (5,5 / 10 / 20 %), puis une
provision d'aléas de 7 %. La méthode et ses limites sont publiées sur `/methodologie`.

### Deux règles à ne pas enfreindre

1. **Aucun prix écrit en dur dans une page.** Tout prix est lu à l'exécution via le moteur
   (`posteRef()`, `estim()`, `buildDevis()`, `estimProjet()`). Un chiffre figé rend fausses des
   dizaines de pages à la première révision du catalogue.
2. **`lib/prix-maj.ts` (`PRIX_MAJ`) se met à jour À LA MAIN** quand les prix du catalogue changent
   réellement. C'est la source unique de la date affichée, du `dateModified` JSON-LD et du
   `lastModified` du sitemap.

## Les pages publiques

509 pages générées, 192 déclarées au sitemap.

| Famille | Route |
|---|---|
| Guides | `/guides`, `/guides/[slug]` |
| Prix par type de travaux | `/prix-travaux`, `/prix-travaux/[projet]` |
| Prix par travaux et ville | `/prix-travaux/[projet]/[ville]` |
| Prix par ville | `/prix-renovation`, `/prix-renovation/[ville]` |
| Prix par corps d'état | `/prix-poste`, `/prix-poste/[slug]` |
| Méthode | `/methodologie` |

Les pages de matrice `/prix-travaux/[projet]/[ville]` sont majoritairement en `noindex, follow` :
elles ne produisent que 3 réponses distinctes par projet (une par zone de main-d'œuvre) et sont
identiques entre elles à plus de 95 %. Seules les villes indexables sont déclarées au sitemap.
Le motif, la règle et le critère de réouverture vivent au même endroit : `lib/seo-projets.ts`.

## Contrôles avant de pousser

```bash
npx tsc --noEmit && npm test && npm run build
```

Sur une modification qui touche les pages publiques, vérifier aussi sur le HTML **généré**
(`.next/server/app/**/*.html`, jamais le JSX) : un seul `<h1>` par page, descriptions ≤ 160
caractères, JSON-LD valide, et questions/réponses du `FAQPage` présentes telles quelles dans le
texte visible.

> ⚠️ Piège récurrent : les extracteurs de texte naïfs produisent de faux négatifs. React insère des
> séparateurs `<!-- -->` entre deux enfants et encode les apostrophes en `&#x27;`. Décoder les
> entités **avant** de conclure qu'un contenu manque.

> ⚠️ Ne jamais lancer `rm -rf .next` pendant que le serveur de dev tourne : il rend des 500 jusqu'au
> redémarrage.
