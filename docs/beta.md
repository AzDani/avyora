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
6. L'inscription par lien e-mail (B2) est faite ; ses réglages Supabase, à faire par Dani, sont au §6 (modèles d'e-mail, Google, limites d'envoi).
7. Facultatif : voir §6, point 1 (les deux modèles d'e-mail à mettre aux couleurs de la bêta).

## 5. Limites connues

- Dans l'éditeur de plan, un visiteur sans compte lit « Compte gratuit » à la place de « Passer Pro » (l'amorçage remplace le libellé dans le texte qu'il exécute ; la source `maquettes/plan-editor.html` et la page statique ne changent pas). Les explications de l'éditeur gardent leurs mots (« Avec Pro : … »), suivies de « Pro gratuit pendant la bêta, jusqu'au 31 décembre 2026, avec un compte ». Les liens mènent à `/tarifs`, qui pendant la bêta propose « Créer mon compte gratuit » et ramène à l'éditeur. Si la session ne répond pas (panne, plus de 6 s), l'éditeur s'ouvre comme avant, avec « Passer Pro ».
- Pas d'analyse de devis pendant la bêta (`FEATURES.devis = false`, aucune route) : aucun plafond n'est prévu.
- Après la bêta, un inscrit qui n'est pas abonné ne voit plus que l'offre gratuite : c'est le comportement d'avant B1, voulu.

## 6. L'inscription facile (chantier B2)

**Ce qui change.** `/inscription` et `/connexion` commencent par **un seul champ, l'adresse e-mail**, et un bouton (« Recevoir mon lien d'accès », « Recevoir un lien de connexion »). Supabase envoie un lien (`signInWithOtp`, `shouldCreateUser: true`) : le clic **confirme l'adresse et ouvre la session**, sans mot de passe à inventer, puis `/auth/callback` ramène à l'intention (`next`, chemin interne seulement). Une adresse inconnue reçoit un lien qui crée le compte, une adresse connue un lien de connexion : la réponse affichée est la même dans les deux cas (pas d'énumération). Le formulaire à mot de passe d'avant reste, replié en second (« Je préfère choisir un mot de passe », « Je préfère utiliser mon mot de passe ») ; l'appareil se souvient du choix.

- **Écran « C'est envoyé »** : l'adresse rappelée, « Ouvrir ma messagerie » (Gmail, Outlook, iCloud, Yahoo, Orange), le conseil d'ouvrir le lien **sur le même appareil et le même navigateur** (flux PKCE : la clé de l'échange est un cookie de ce navigateur), « Renvoyer le lien » après 60 s, « Changer d'adresse ». Un lien qui ne marche plus (déjà servi, expiré, autre navigateur) mène à `/connexion?erreur=lien_invalide`, qui l'explique et garde l'intention.
- **En-tête de l'inscription** pendant la bêta : « Gratuit jusqu'au 31 décembre 2026 · deviens membre fondateur », puis trois bénéfices courts (`components/BandeauBeta.tsx`). Sur téléphone, le logo en double disparaît : le champ e-mail et le bouton tiennent sur l'écran d'un iPhone (375 × 812).
- **Consentements** (`user_metadata`, écrits à la création du compte seulement) : `cgu_acceptees_le` (mention « En continuant, tu acceptes les CGU et la politique de confidentialité » sous le bouton ; un compte Google est daté au retour), `inscription` (`lien`, `mot_de_passe`, `google`), `newsletter` (case **non cochée** et facultative, « 1 e-mail par mois au plus ») et `newsletter_le` quand elle est cochée (preuve du consentement). Pour envoyer les nouveautés, filtrer les comptes où `newsletter` vaut `true`.
- **Retour à l'intention** : Affiner, Détaillé, Construction, éditeur de plan → l'intention ; « Enregistrer » sans intention → `/projets`, où `ClaimDraft` / `ClaimPlan` rangent l'estimation ou le plan. Les questions de profil (`/onboarding`) ne sont posées qu'à une inscription sans intention, et plus jamais à qui les a déjà vues.
- **Sécurité** : limites `auth` par IP **et** par adresse (`lib/ratelimit.ts` ; sans Upstash en production, elles sont tenues en mémoire, par instance), erreurs de Supabase traduites en trois messages (adresse invalide, trop de demandes, envoi impossible).
- **Mesure** : `lien_acces_envoye { source, renvoi }` (la source de la bêta, sinon la page) ; `compte_cree { methode: "lien" | "google" }` part de `/auth/callback` au premier retour, `compte_cree { methode: "mot_de_passe" }` de l'action d'inscription, comme avant.

Code : `lib/auth-lien.ts` (fonctions pures), `lib/actions/auth.ts` (`envoyerLienAcces`), `components/auth/AccesLien.tsx`, `lib/auth-arrivee.ts`, `app/auth/callback` et `app/auth/confirm`. Tests : `tests/auth-lien.test.ts`.

**Ce que Dani doit régler dans Supabase (lui seul le peut)** :

1. **Les modèles d'e-mail** (Authentication → Email Templates). Une adresse **nouvelle** reçoit le modèle « Confirm signup », une adresse **connue** le modèle « Magic Link ». Les deux doivent garder `{{ .ConfirmationURL }}` (c'est lui qui repasse par `/auth/callback`). À traduire et mettre aux couleurs : par exemple, objet « Ton lien d'accès à AVYORA », texte « Clique pour confirmer ton adresse et entrer dans AVYORA. Gratuit jusqu'au 31 décembre 2026 : tu deviens membre fondateur. Ouvre ce lien sur l'appareil où tu l'as demandé. »
2. **Les adresses de retour** (Authentication → URL Configuration → Redirect URLs) : `https://getavyora.fr/auth/callback**` doit y figurer (avec ses paramètres `?next=…`), comme pour l'inscription d'avant. Sans elle, Supabase renvoie vers la Site URL et l'intention est perdue.
3. **L'envoi des e-mails** : un SMTP personnalisé (Resend) doit être branché (Authentication → Emails → SMTP Settings) ; le SMTP par défaut de Supabase n'écrit qu'aux membres de l'équipe et presque pas. Puis relever la limite d'envoi (Authentication → Rate Limits → « Rate limit for sending emails »), sinon une journée chargée de la bêta la consomme. Laisser l'intervalle entre deux envois à la même adresse à 60 s (le bouton « Renvoyer » attend autant) et la durée de validité du lien à 1 heure ou plus.
4. **Les inscriptions par e-mail ouvertes** (Authentication → Providers → Email : « Enable Email provider » et l'inscription autorisés) et la confirmation d'e-mail **gardée** (§4, point 3).
5. **Google, facultatif** : activer le fournisseur Google (Authentication → Providers → Google, avec un client OAuth créé dans Google Cloud), puis mettre `NEXT_PUBLIC_AUTH_GOOGLE=1` dans Vercel et **redéployer** : le bouton « Continuer avec Google » apparaît sous le lien. Éteint par défaut ; l'allumer avant d'avoir activé Google mènerait à une erreur.
6. **Upstash, recommandé** : avec `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` dans Vercel, les limites d'envoi sont partagées entre toutes les instances (sans elles, chaque instance compte de son côté).

Limite connue : le lien ne connecte que dans le navigateur qui l'a demandé (PKCE). Ouvert ailleurs, l'adresse est quand même confirmée et `/connexion` propose un nouveau lien. Pour qu'il marche d'un appareil à l'autre, il faudrait des modèles d'e-mail au format `token_hash` vers `/auth/confirm` (la route existe), un réglage à décider plus tard.
