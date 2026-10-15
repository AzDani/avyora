# Bêta gratuite (chantier B1)

Décision de Dani, le 13/10/2026 : **tout AVYORA est gratuit jusqu'au 31 décembre 2026**, à une condition, avoir un compte (on veut les adresses e-mail). L'inscription doit rester simple et servir la marque : les inscrits de la bêta deviennent **membres fondateurs** et gardent le tarif de lancement (18,85 €/mois) à vie quand AVYORA passera payant.

Source de vérité : `lib/beta.ts`. Tests : `tests/beta.test.ts`.

---

## 1. Ce qui change pendant la bêta

| Où | Pendant la bêta | Après la bêta (ou bêta coupée) |
|---|---|---|
| Droits (`estPro`, `lib/auth.ts`) | Tout utilisateur connecté est Pro (un compte n'existe qu'une fois son e-mail confirmé) | Seuls les abonnés (`estAbonne` : plan Stripe, `PRO_EMAILS`, admins) |
| Anonyme sur une fonction Pro (Détaillé, Affiner, multi-pièces, Enregistrer, plan de rénovation) | `/inscription?next=<son intention>&source=<d'où>`, « Gratuit pendant la bêta — crée ton compte » | `/tarifs` comme avant |
| Estimation rapide | Visible sans compte, conversions Google Ads inchangées | Inchangée |
| Pastilles « Pro », « Débloquer avec Pro » | « Bêta », « Créer mon compte gratuit », « Inclus pendant la bêta » | Comme avant |
| Accueil | Bandeau « Bêta gratuite », bloc prix remplacé (`lib/accueil-beta.ts`) | Comme avant |
| `/tarifs` | La bêta en tête, la promesse fondateur, les offres « à partir du 1er janvier 2027 », **aucun bouton de paiement** | Comme avant |
| Paiement (`/api/stripe/checkout`) | Refusé (409) : aucune vente pendant la bêta | Comme avant |
| Mon compte | « Bêta gratuite », rien à résilier ; un abonné payant garde la gestion de son abonnement | Comme avant |
| Membre fondateur (`/projets`, Mon compte) | Pastille pour tout compte créé avant la fin | La pastille **reste** (elle fonde le tarif de lancement) |
| Éditeur de plan (`/plan`) | Connecté : Pro (plans sans limite, projet rénovation, export sans filigrane). Anonyme : « Compte gratuit » à la place de « Passer Pro », et la phrase du prix dit « gratuit pendant la bêta » (données par `/api/plans/session`, l'amorçage les applique) | Comme avant |
| CGU / CGV | Art. 2 bis (CGU) et 1 bis (CGV) | Les articles **restent** (ils datent la bêta et fondent le statut de membre fondateur) |

Mesure : `vers_inscription { source }` à l'arrivée sur `/inscription` (une fois par session et par source ; liste fermée `SOURCES_BETA`), et `vue_tarifs` porte `beta: true`.

## 2. Les réglages (Vercel)

Les deux variables commencent par `NEXT_PUBLIC_` : elles sont lues **au build**. Après un changement, il faut **redéployer**.

- `NEXT_PUBLIC_BETA_FIN` : le dernier jour de la bêta, en date ISO (`2027-01-31`). La bêta finit à minuit, heure de Paris, à la fin de ce jour. Un instant complet avec fuseau est accepté (`2027-01-31T18:00:00+01:00`). Absente ou illisible : 31/12/2026. Les dates affichées (« jusqu'au 31 décembre 2026 », « à partir du 1er janvier 2027 ») suivent.
- `NEXT_PUBLIC_BETA=0` : coupe la bêta immédiatement, comme si elle n'avait jamais existé (le site d'avant B1, au caractère près, pastille fondateur et articles des CGU/CGV compris).

Le tarif fondateur est une constante, `TARIF_FONDATEUR_MOIS` (`lib/beta.ts`) : tous les textes qui le citent la lisent (accueil, Tarifs, inscription, Mon compte, CGU, CGV).

## 3. Le 1er janvier 2027

### Ce qui se fait tout seul

À minuit, heure de Paris, **sans redéploiement** :

- `estPro` revient à `estAbonne` ; les pages et les routes qui disent la bêta sont rendues à la requête (`/`, `/tarifs`, `/projets/nouveau`, `/projets/nouveau/detaille`, `/projets/nouveau/construction`, `/estimation-travaux`, `/estimation-construction-maison`, `/inscription`, `/logiciel-plan-maison`, `/projets/*`, `/mon-espace/compte`, les API) : elles redeviennent celles d'avant ;
- `/api/stripe/checkout` accepte de nouveau les paiements ;
- `/plan` est statique, mais la bêta y arrive par `/api/plans/session` (rendue à la requête) : rien à faire ;
- les seules pages **statiques** qui parlent de la bêta sont `/cgu` et `/cgv` : leurs articles 2 bis et 1 bis **restent** (ils datent la bêta et fondent le statut de membre fondateur) et ne dépendent pas de l'heure. Les pages SEO, guides et méthodologie n'en parlent pas. **Aucune revalidation n'est nécessaire.**

Ce que vit un inscrit non abonné ce jour-là : il redevient « gratuit ». Rien n'est effacé. Ses plans au-delà du premier restent lisibles et modifiables (la limite ne bloque que les créations), un projet de rénovation de plan reste modifiable, ses projets détaillés se rouvrent avec l'éditeur rapide, et le PDF comme le détaillé le renvoient vers `/tarifs`. La pastille « Membre fondateur » reste, au présent (« le tarif de lancement t'est garanti à vie »).

### Ce qu'il faut faire ce jour-là (5 minutes)

1. Ouvrir `/tarifs` sans être connecté : les offres et les boutons de paiement sont revenus, plus aucune mention de la bêta.
2. Ouvrir `/` : le bandeau « AVYORA Pro dès 18,85 €/mois » est revenu.
3. Avec un compte non abonné : `/projets/nouveau/detaille` mène à `/tarifs` ; Mon compte affiche « Gratuit » et la pastille « Membre fondateur ».
4. Si quelque chose dit encore la bêta : un redéploiement (sans changement) suffit.

Plus tard, si l'on veut retirer le code de la bêta : garder `estMembreFondateur`, `TARIF_FONDATEUR_MOIS`, la pastille et les articles des CGU/CGV ; le reste (`betaActive` et ses branches) peut partir d'un bloc.

## 4. Ce que Dani doit faire (lui seul le peut)

1. **Avant la fin de la bêta (décembre 2026) : prévenir les membres par e-mail** (promis dans les CGU, art. 2 bis). La liste : les comptes Supabase dont `created_at` est antérieur à la fin. L'envoi passe par Resend ; aucun envoi automatique n'a été codé.
2. **Le tarif fondateur dans Stripe** : aujourd'hui le plan mensuel coûte déjà 18,85 €, donc rien à faire tant qu'il ne bouge pas. **Avant toute hausse du prix public**, créer dans Stripe un prix dédié aux membres fondateurs (18,85 €/mois) et le brancher dans `/api/stripe/checkout` pour les comptes où `estMembreFondateur(user)` est vrai (la fonction existe).
3. **Garder la confirmation d'e-mail obligatoire dans Supabase** (Authentication → Email → Confirm email). La bêta s'appuie dessus : sans elle, un compte non confirmé aurait les droits Pro.
4. **Relire les articles 2 bis (CGU) et 1 bis (CGV)**, en particulier la promesse « à vie » du tarif de lancement, qui engage AVYORA.
5. Si la bêta doit durer plus longtemps : `NEXT_PUBLIC_BETA_FIN` dans Vercel, puis redéployer.
6. Facultatif, pour une inscription encore plus simple : activer Google (et Apple) dans Supabase (Authentication → Providers) ; le composant existe déjà (`components/auth/SocialAuth.tsx`) mais n'est branché sur aucune page : une fois le fournisseur activé, l'ajouter à `/inscription` et `/connexion` est un petit chantier. Ou la connexion par lien magique (sans mot de passe), que le code n'utilise pas encore.
7. Facultatif : adapter le modèle d'e-mail de confirmation de Supabase (Authentication → Email Templates) pour dire « Bienvenue dans la bêta d'AVYORA : confirme ton adresse et tout est gratuit jusqu'au 31 décembre 2026 ».

## 5. Limites connues

- Dans l'éditeur de plan, un visiteur sans compte lit « Compte gratuit » à la place de « Passer Pro » (l'amorçage remplace le libellé dans le texte qu'il exécute ; la source `maquettes/plan-editor.html` et la page statique ne changent pas). Les explications de l'éditeur gardent leurs mots (« Avec Pro : … »), suivies de « Pro gratuit pendant la bêta, jusqu'au 31 décembre 2026, avec un compte ». Les liens mènent à `/tarifs`, qui pendant la bêta propose « Créer mon compte gratuit » et ramène à l'éditeur. Si la session ne répond pas (panne, plus de 6 s), l'éditeur s'ouvre comme avant, avec « Passer Pro ».
- Pas d'analyse de devis pendant la bêta (`FEATURES.devis = false`, aucune route) : aucun plafond n'est prévu.
- Après la bêta, un inscrit qui n'est pas abonné ne voit plus que l'offre gratuite : c'est le comportement d'avant B1, voulu.
