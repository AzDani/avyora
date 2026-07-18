# AVYORA — V1 locale

Copilote rénovation & investissement locatif. Version 100 % locale : aucune dépense, aucun compte cloud.

## Lancer l'app

```bash
cd renopilot/app
npm run dev
```

Puis ouvrir http://localhost:3000

## Ce que fait la V1

1. **Estimateur travaux** — questionnaire guidé (bien, état, finition) → estimation par corps d'état en fourchettes, basée sur le référentiel de prix France 2026 (`lib/referentiel-prix-v0.json`), avec coefficients régionaux (IDF +20 %, métropoles +10 %).
2. **Rentabilité locative** — prix d'achat + loyer visé → frais de notaire auto (8 %), mensualité de crédit, rendement brut/net, cash-flow.
3. **Analyseur de devis** — import PDF ou texte collé → extraction des lignes, détection des corps d'état, contrôle des mentions obligatoires (TVA, SIRET, décennale, délai, acompte), note /100, questions à poser à l'artisan.

## Mode IA (optionnel)

Sans clé API, l'analyse de devis fonctionne en mode « règles » (gratuit).
Pour activer l'analyse IA complète (postes normalisés, comparaison aux prix du marché, détection d'oublis) :

```bash
cp .env.local.example .env.local
# puis renseigner ANTHROPIC_API_KEY et relancer le serveur
```

## Données

- Base locale SQLite : `db/renopilot.db` (créée automatiquement, ignorée par git)
- Référentiel de prix : `lib/referentiel-prix-v0.json` — fourchettes agrégées depuis les guides de prix publics France 2026 (sources dans le fichier)

## Étape suivante (quand la V1 aura fait ses preuves)

Migration Supabase (auth + cloud), export PDF des rapports, freemium Stripe — voir `../CAHIER-DES-CHARGES.md`.
