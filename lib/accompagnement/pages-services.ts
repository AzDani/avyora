/**
 * Les pages de service de l'accompagnement (référencement du 20/11/2026), chacune taillée pour une recherche à
 * forte intention : « faire vérifier un devis de travaux », « suivi de chantier à distance », et depuis le 23/11/2026
 * « achat-revente ». Mêmes règles que la
 * page /accompagnement-travaux (lib/accompagnement/contenu.ts) : tutoiement, première personne (Daniel), aucun chiffre
 * inventé, du conseil et non de la maîtrise d'œuvre, dit clairement. Depuis le 24/11/2026 (décision de Dani), chaque
 * prestation affiche son PRIX MOYEN (`tarif`), qui varie selon la taille du projet, sauf l'avis avant achat (prix fixe),
 * et un parcours de vente : « Ce que tu y gagnes » (`gains`), sans montant d'économie promis.
 * Les questions de la FAQ sont formulées autrement que celles de /accompagnement-travaux (pas de doublon d'une page à
 * l'autre) ; la page les rend ET en tire le FAQPage du JSON-LD.
 * Pages en français seulement : le service s'adresse aux chantiers en France.
 */
export type PageService = {
  chemin: string;
  titre: string;
  description: string;
  nomService: string;
  serviceType: string;
  h1: string;
  intro: string;
  pourQui?: { titre: string; items: string[] };
  liste: { titre: string; items: { t: string; s: string }[] };
  etapes: string[];
  obtiens: { titre: string; items: string[] };
  aSavoir: string[];
  liens: { href: string; label: string }[];
  faq: { q: string; a: string }[];
  /** Le prix affiché : moyen par défaut (« ≈ »), ou fixe. Absent = pas de prix (page « trouver un artisan »). */
  tarif?: { prix: string; detail: string; fixe?: boolean; montantFixe?: number };
  /** Le parcours de vente : pourquoi le client a tout à gagner (sans montant d'économie promis). */
  gains?: { titre: string; items: { t: string; s: string }[] };
  /** Variantes du gabarit (page « trouver un artisan ») ; absentes = page d'accompagnement de Daniel. */
  eyebrow?: string;
  cta?: { href: string; label: string; note: string };
  /** Le fil d'Ariane passe par cette page (sinon par /accompagnement-travaux). */
  parent?: { href: string; nom: string } | null;
  /** Pas de bloc « Qui je suis » (la page ne parle pas de l'accompagnement de Daniel). */
  sansBio?: boolean;
  titreFinal?: string;
  texteFinal?: string;
};

/** La mention sous chaque prix (Daniel est en franchise en base de TVA : mentions légales). */
export const NOTE_PRIX_MOYEN = "Prix moyen : il varie selon la taille de ton projet, et je te l'annonce avant tout engagement. TVA non applicable (franchise en base).";
export const NOTE_PRIX_FIXE = "Prix fixe, annoncé à l'avance. TVA non applicable (franchise en base).";

export const PARCOURS_COURT =
  "BTS Bâtiment en alternance dans un grand groupe du BTP, puis 3 ans chef de chantier dans ce même groupe (équipes, planification, aléas), 3 ans à la tête de notre entreprise de travaux avec mon frère, du devis aux travaux réalisés nous-mêmes, et nos propres projets : deux maisons achetées, rénovées entièrement de nos mains et revendues avec une plus-value, puis une maison neuve construite de A à Z, presque entièrement de nos mains.";

export const RELECTURE_DEVIS: PageService = {
  chemin: "/relecture-devis-travaux",
  titre: "Faire vérifier un devis de travaux avant de signer",
  description:
    "Un ancien chef de chantier vérifie avec toi que tout ce que tu as demandé est compté dans ton devis : oublis, quantités, postes flous. Appel de 20 min.",
  nomService: "Relecture de devis de travaux",
  serviceType: "Vérification de devis de travaux",
  h1: "Fais vérifier ton devis de travaux par un pro, avant de signer.",
  intro:
    "Un devis de travaux engage souvent des milliers d'euros, et il se lit mal quand on n'est pas du métier. En un appel de 20 minutes, on vérifie ensemble que tout ce que tu as demandé est bien compté, pour que tu signes en sachant exactement ce que tu paies.",
  tarif: { prix: "≈ 29 €", detail: "Appel de 20 min · le prix varie selon la taille du devis et le nombre de lignes" },
  gains: {
    titre: "Pourquoi ça vaut le coup",
    items: [
      { t: "Un oubli repéré avant de signer ne coûte rien", s: "Après la signature, il revient en supplément, au moment où tu ne peux plus faire jouer la concurrence." },
      { t: "Tu paies ce que tu as demandé", s: "Les bonnes quantités, la bonne gamme, et rien de ce que tu n'as pas demandé." },
      { t: "Tu négocies avec des arguments", s: "Un artisan entend mieux une question précise, poste par poste, qu'une demande de remise générale." },
      { t: "Quelques dizaines d'euros face à des milliers", s: "Le prix d'une relecture pèse peu face au montant d'un devis, et encore moins face à un supplément imprévu." },
    ],
  },
  liste: {
    titre: "Ce que je vérifie",
    items: [
      { t: "Les oublis", s: "Les postes qui manquent (protection, évacuation des gravats, raccordements, finitions) et qui reviennent en supplément pendant le chantier." },
      { t: "Les postes flous", s: "Les « forfaits » et « ensembles » sans détail, les quantités absentes, les matériaux sans marque ni référence." },
      { t: "Les prix", s: "Chaque poste mis en face du référentiel AVYORA (200 postes, prix de ta région), pour repérer ce qui sort du marché." },
      { t: "Les quantités", s: "Les surfaces et les métrés, cohérents ou non avec ton logement." },
      { t: "Les conditions", s: "L'acompte et l'échéancier, les délais, l'assurance décennale et les activités qu'elle couvre." },
      { t: "La faisabilité", s: "Ce que le devis suppose sur le chantier, et ce qui dépend des autres corps d'état." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies ton devis, ou tes devis, en PDF ou en photo.",
    "On en parle en visio : ce qui va, ce qui ne va pas, et quoi demander à l'artisan.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "La liste des points à corriger ou à négocier, poste par poste.",
      "Les questions précises à poser à l'artisan avant de signer.",
      "Si tu as plusieurs devis : ce qui les distingue vraiment, au-delà du prix total.",
    ],
  },
  aSavoir: [
    "Je ne vends pas de travaux et je ne touche rien des artisans : mon avis ne dépend que de ton intérêt.",
    "C'est un conseil, pas une expertise judiciaire : tu restes seul à décider de signer ou non.",
  ],
  liens: [
    { href: "/guides/verifier-devis-travaux", label: "La méthode pour vérifier un devis toi-même" },
    { href: "/trouver-un-artisan", label: "Demander des devis à des artisans vérifiés" },
    { href: "/suivi-de-chantier", label: "Le suivi de chantier à distance" },
    { href: "/accompagnement-achat-revente", label: "Acheter, rénover et revendre un bien" },
  ],
  faq: [
    {
      q: "Comment savoir si un devis de travaux est trop cher ?",
      a: "En comparant chaque poste, pas seulement le total : un prix au mètre carré ou à l'unité, mis en face d'un référentiel de marché de ta région. C'est ce que fait l'estimation AVYORA, gratuitement. Je t'aide ensuite à lire les écarts : un prix plus haut peut se justifier (accès difficile, matériaux, état du support), un autre non.",
    },
    {
      q: "Que faire si un poste manque dans mon devis ?",
      a: "Demande à l'artisan de l'ajouter, chiffré, avant de signer. Un poste oublié revient presque toujours en supplément pendant le chantier, au moment où tu ne peux plus comparer.",
    },
    {
      q: "Peut-on négocier un devis de travaux ?",
      a: "Oui, sur des points précis plutôt que sur le total : un poste au-dessus du marché, une quantité surévaluée, une prestation dont tu n'as pas besoin. Un artisan entend mieux une question argumentée qu'une demande de remise générale.",
    },
    {
      q: "Combien de devis faut-il demander pour des travaux ?",
      a: "Pour un chantier important, deux ou trois devis comparables, c'est-à-dire établis sur la même liste de postes. Ton estimation AVYORA leur donne cette base commune, et le Réseau AVYORA te permet d'en demander à des artisans vérifiés.",
    },
    {
      q: "Combien coûte la relecture d'un devis ?",
      a: "Environ 29 € pour un devis courant : un appel de 20 minutes où l'on vérifie ensemble que tout ce que tu as demandé est compté. Le prix varie selon la taille du devis et le nombre de lignes, et je te l'annonce avant. Le premier appel, lui, est gratuit.",
    },
  ],
};

export const SUIVI_CHANTIER: PageService = {
  chemin: "/suivi-de-chantier",
  titre: "Suivi de chantier à distance pour particuliers",
  description:
    "Tes travaux suivis chaque semaine en visio par un ancien chef de chantier : avancement, budget, réception. Idéal si tu n'es pas sur place. Rappel gratuit.",
  nomService: "Suivi de chantier à distance",
  serviceType: "Suivi de chantier à distance pour particuliers",
  h1: "Un suivi de chantier à distance, chaque semaine.",
  intro:
    "Tes devis sont signés, le chantier démarre, et tu ne peux pas être là tous les jours ? On commence par ton carnet de tâches, puis je fais le point avec toi chaque semaine : ce qui avance, ce qui coince, et ta prochaine étape.",
  tarif: { prix: "≈ 149 € le lancement, puis ≈ 199 €/mois", detail: "Lancement : appel de 1 h 30 et ton carnet de tâches · puis 30 min par semaine et WhatsApp entre deux · sans engagement" },
  gains: {
    titre: "Ce que tu y gagnes",
    items: [
      { t: "Moins de temps perdu entre deux artisans", s: "Chaque étape prête avant que le suivant arrive : c'est là que se perdent les journées, et l'argent." },
      { t: "Les erreurs repérées avant d'être cachées", s: "Une erreur vue avant de refermer un mur se corrige ; vue après, il faut démolir pour la reprendre." },
      { t: "Tu sais toujours quoi faire", s: "Ton carnet de tâches te donne ta prochaine étape : quoi décider, quoi commander, qui appeler." },
      { t: "Pour bien moins qu'un maître d'œuvre", s: "Un maître d'œuvre est en général payé en pourcentage du montant des travaux. Ici, un prix mensuel sans engagement, et c'est toi qui gardes la main." },
    ],
  },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Les investisseurs qui rénovent un bien pour le louer ou le revendre.",
      "Les particuliers qui coordonnent eux-mêmes plusieurs artisans, sans maître d'œuvre.",
      "Ceux qui travaillent pendant les heures du chantier et ne peuvent pas passer le voir.",
    ],
  },
  liste: {
    titre: "Chaque semaine",
    items: [
      { t: "Un point en visio ou sur WhatsApp", s: "On passe en revue la semaine écoulée et la suivante." },
      { t: "Les photos et vidéos du chantier", s: "Celles que toi ou l'artisan m'envoyez, surtout aux étapes qui seront ensuite cachées." },
      { t: "Ton carnet de tâches à jour", s: "Dans ton suivi AVYORA : ce qui est fait, ce qui vient ensuite, dans le bon ordre." },
      { t: "Les décisions à prendre", s: "Les choix qui ne peuvent pas attendre, et les questions à poser aux artisans." },
      { t: "Les alertes", s: "Un retard qui s'installe, un travail qui s'écarte du devis signé, un supplément qui arrive." },
      { t: "Jusqu'à la réception", s: "Une liste de contrôle, et moi en visio pendant la visite de fin de chantier, pour noter les réserves." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Premier appel : tu me présentes ton chantier, tes devis et ton planning.",
    "On fixe le rythme du suivi, et je te dis le tarif avant tout engagement.",
  ],
  obtiens: {
    titre: "Ce que tu y gagnes",
    items: [
      "Un regard de pro sur ton chantier, sans avoir à être sur place.",
      "Ta prochaine étape toujours claire, sans avoir à être du métier.",
      "Une réception préparée, avec des réserves notées au bon moment.",
    ],
  },
  aSavoir: [
    "C'est du conseil, pas de la maîtrise d'œuvre : je ne dirige pas les artisans et je ne signe rien à ta place. Tu restes le maître d'ouvrage.",
    "Je ne suis pas sur place : je vois ce que montrent les photos et les vidéos. Si ton chantier demande quelqu'un sur site, je te le dis dès le premier appel.",
    "Je ne m'engage sur aucun délai : ce n'est pas moi qui fais les travaux. Je te préviens en revanche de ce qui fait prendre du retard.",
  ],
  liens: [
    { href: "/guides/ordre-travaux-renovation", label: "Dans quel ordre faire ses travaux" },
    { href: "/relecture-devis-travaux", label: "Faire vérifier un devis avant de signer" },
    { href: "/suivi-budget-travaux", label: "Le suivi de ton budget travaux" },
    { href: "/accompagnement-achat-revente", label: "Acheter, rénover et revendre un bien" },
  ],
  faq: [
    {
      q: "Comment suivre un chantier à distance ?",
      a: "Avec un rythme fixe et des preuves : un point chaque semaine, des photos datées des étapes clés, et un budget tenu à jour. Le plus important est de voir ce qui sera ensuite caché, avant que ce ne soit fermé.",
    },
    {
      q: "Quelle différence entre un suivi de chantier et un maître d'œuvre ?",
      a: "Le maître d'œuvre dirige les travaux et coordonne les entreprises, avec une responsabilité sur le chantier, et il est en général payé en pourcentage du montant des travaux. Mon suivi est du conseil : je t'aide à voir clair et à décider, mais tu restes celui qui donne les instructions aux artisans.",
    },
    {
      q: "À quel moment faut-il vérifier un chantier ?",
      a: "Avant que les choses ne soient cachées : les réseaux électriques et la plomberie avant la fermeture des cloisons, l'isolation avant les plaques, l'étanchéité de la douche avant le carrelage. Puis à la réception, avant de signer le procès-verbal.",
    },
    {
      q: "Que vérifier à la réception des travaux ?",
      a: "Que tout ce qui figure au devis est fait, les finitions, le fonctionnement des équipements, et les documents remis. Ce qui ne va pas s'écrit en réserve sur le procès-verbal : l'artisan doit alors y remédier, dans le cadre de la garantie de parfait achèvement d'un an.",
    },
    {
      q: "Combien coûte un suivi de chantier à distance ?",
      a: "Environ 149 € pour le lancement (un appel de 1 h 30 et ton carnet de tâches), puis environ 199 € par mois pour le point de chaque semaine et WhatsApp, sans engagement. Le suivi de ton budget, environ 200 € par mois, peut s'y ajouter. Ce sont des prix moyens, qui varient selon la taille du chantier ; le premier appel est gratuit.",
    },
  ],
};

/**
 * Achat-revente (décision de Dani du 23/11/2026) : la page de service pour ceux qui achètent pour rénover et revendre.
 * Daniel l'a fait lui-même (deux maisons achetées, rénovées, revendues avec une plus-value) : AUCUN chiffre (ni montant,
 * ni pourcentage, ni promesse de gain). PAS DE PLANNING dans le temps (un particulier ne le tient pas) : un carnet de
 * tâches, « ta prochaine étape ». Pas de conseil fiscal : le statut de marchand de biens renvoie au notaire / comptable.
 */
export const ACHAT_REVENTE: PageService = {
  chemin: "/accompagnement-achat-revente",
  titre: "Achat-revente : rénover et revendre, accompagné",
  description:
    "Tu achètes pour rénover et revendre ? Un ancien chef de chantier qui l'a fait lui-même t'aide avant l'offre, sur les devis et pendant les travaux.",
  nomService: "Accompagnement achat-revente",
  serviceType: "Conseil travaux pour l'achat-revente immobilier",
  h1: "Acheter, rénover, revendre : je t'accompagne à chaque étape.",
  intro:
    "Dans un achat-revente, tout se joue sur deux choses : ne pas se tromper sur les travaux avant d'acheter, et ne pas laisser le chantier déraper ensuite. J'ai moi-même acheté, rénové et revendu des maisons avec une plus-value : je regarde ton projet avec l'œil de celui qui doit revendre.",
  tarif: { prix: "Dès 99 €", detail: "L'avis avant achat, à prix fixe · puis, selon ton projet, l'estimation du budget, la relecture des devis et l'organisation du chantier" },
  gains: {
    titre: "Pourquoi tu as tout à y gagner",
    items: [
      { t: "Tu achètes au bon prix", s: "Les travaux chiffrés avant l'offre, ce sont des arguments pour négocier, et l'assurance de ne pas payer un bien à rénover au prix d'un bien rénové." },
      { t: "Les travaux ne mangent pas ta marge", s: "Un budget juste dès le départ et des devis vérifiés : c'est là que se joue la plus-value." },
      { t: "Le budget va là où ça rapporte", s: "Ce qui aide vraiment à vendre, et ce qui coûte sans rien rapporter." },
      { t: "Moins de mauvaises surprises", s: "Les risques de retard et de dépassement repérés tôt, avant qu'ils ne coûtent." },
    ],
  },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Les particuliers qui achètent un bien à rénover pour le revendre.",
      "Ceux qui se lancent dans un premier achat-revente et veulent éviter les erreurs classiques.",
      "Ceux qui gèrent eux-mêmes leurs artisans sur le chantier et veulent un regard de pro à leurs côtés.",
    ],
  },
  liste: {
    titre: "Ce que je fais, étape par étape",
    items: [
      { t: "Avant l'offre : l'avis avant achat", s: "Tu m'envoies les photos, l'annonce et la localisation du bien. Je regarde tout, puis on en parle : les travaux à prévoir et ce qui peut cacher une mauvaise surprise (structure, humidité, toiture, réseaux)." },
      { t: "Le chiffrage des travaux", s: "On chiffre une enveloppe poste par poste avec AVYORA, pour savoir si l'opération tient avant de faire ton offre." },
      { t: "Les travaux qui comptent pour la revente", s: "Ce qui aide vraiment à vendre, et ce qui coûte sans rien rapporter : on met le budget au bon endroit." },
      { t: "La relecture des devis", s: "Les oublis, les postes flous, les prix hors marché, et les questions à poser aux artisans avant de signer." },
      { t: "Un carnet de tâches, pas un planning", s: "Pas de calendrier impossible à tenir : à chaque point, ta prochaine étape, ce que tu dois faire, commander ou décider, dans le bon ordre." },
      { t: "Le suivi jusqu'à la réception", s: "Un point régulier en visio ou sur WhatsApp : l'avancement, ton budget face au prévu, puis la visite de fin de chantier pour noter les réserves." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Premier appel : tu me présentes le bien (ou ta recherche), ton budget et ton projet de revente.",
    "On choisit ensemble ce qui t'est utile, et je te dis le tarif avant tout engagement.",
  ],
  obtiens: {
    titre: "Ce que tu y gagnes",
    items: [
      "Une offre d'achat faite en connaissant les travaux, pas en les découvrant après.",
      "Un budget travaux chiffré et suivi, les dérapages repérés tôt.",
      "Toujours ta prochaine étape claire, sans avoir à être du métier.",
    ],
  },
  aSavoir: [
    "C'est du conseil, pas de la maîtrise d'œuvre : je ne dirige pas les artisans et je ne signe rien à ta place. Tu décides, tu signes.",
    "Je ne promets aucune plus-value : elle dépend du prix d'achat, du marché et du prix de revente. Mon rôle, c'est que les travaux ne la mangent pas.",
    "Je ne m'engage sur aucun délai : ce n'est pas moi qui fais les travaux. Je te préviens en revanche des risques de retard, pour que tu en tiennes compte avant d'acheter.",
    "C'est toi qui es sur le chantier : je vois ce que montrent tes photos et tes vidéos. Si le bien demande un diagnostic sur place, je te le dis.",
  ],
  liens: [
    { href: "/avis-travaux-avant-achat", label: "L'avis travaux avant achat" },
    { href: "/estimation-travaux", label: "Estimer les travaux d'un bien gratuitement" },
    { href: "/relecture-devis-travaux", label: "Faire vérifier un devis avant de signer" },
    { href: "/suivi-de-chantier", label: "Le suivi de chantier à distance" },
  ],
  faq: [
    {
      q: "Comment estimer les travaux avant d'acheter un bien à rénover ?",
      a: "En visitant avec une liste précise : structure, toiture, humidité, électricité, plomberie, chauffage, menuiseries. Puis en chiffrant poste par poste plutôt qu'au mètre carré, et en gardant une marge pour les imprévus : dans l'ancien, il y en a presque toujours.",
    },
    {
      q: "Quels travaux privilégier pour revendre un bien rénové ?",
      a: "D'abord ce qui rassure l'acheteur : un bien sain, sans humidité, avec une électricité et une plomberie en bon état. Ensuite ce qu'il voit en premier : la cuisine, la salle de bain, des pièces claires. Les finitions très haut de gamme coûtent souvent plus qu'elles ne rapportent.",
    },
    {
      q: "Combien de temps durent les travaux d'un achat-revente ?",
      a: "Personne ne peut te le garantir, et je ne le fais pas : ce n'est pas moi qui réalise les travaux. Les retards viennent souvent des mêmes causes : un artisan qui n'est pas disponible, une livraison qui tarde, une mauvaise surprise à l'ouverture des murs, une décision prise trop tard. Je te préviens de ces risques pour que tu en tiennes compte avant d'acheter et dans ton projet de revente.",
    },
    {
      q: "Faut-il être marchand de biens pour faire de l'achat-revente ?",
      a: "Pas pour une opération ponctuelle. Mais si tu enchaînes les achats-reventes, l'administration peut considérer que c'est une activité professionnelle, avec une fiscalité différente : vois-le avec un notaire ou un expert-comptable avant de te lancer. Moi, je t'accompagne sur les travaux.",
    },
    {
      q: "Combien coûte l'accompagnement achat-revente ?",
      a: "L'avis avant achat coûte 99 €, prix fixe : tu m'envoies les photos, l'annonce et la localisation du bien, je regarde tout, puis on en parle pendant une heure. Ensuite, selon ton projet : l'estimation de ton budget travaux (environ 149 €), la relecture des devis (environ 29 €), l'organisation du chantier (environ 149 € puis 199 € par mois). Ce sont des prix moyens, sauf l'avis avant achat ; le premier appel est gratuit.",
    },
  ],
};

/** Estimation du budget travaux, rénovation ou neuf (24/11/2026) : l'estimation AVYORA reprise par Daniel, poste par poste. */
export const ESTIMATION_BUDGET: PageService = {
  chemin: "/estimation-budget-travaux",
  titre: "Estimation de budget travaux par un pro du chantier",
  description:
    "Rénovation ou construction neuve : un ancien chef de chantier vérifie ton budget travaux poste par poste, avec ce qu'on oublie. Appel de 1 h et budget écrit.",
  nomService: "Estimation de budget travaux",
  serviceType: "Estimation de budget de travaux de rénovation et de construction",
  h1: "Ton budget travaux vérifié par un pro, poste par poste.",
  intro:
    "Un budget sous-estimé, c'est le chantier qui s'arrête faute d'argent, ou un nouvel emprunt en cours de route. Je pars de ton estimation AVYORA, de tes photos et de tes plans, et je corrige chaque poste avec l'œil de quelqu'un qui a fait ces travaux de ses mains.",
  tarif: { prix: "≈ 149 € en rénovation · ≈ 249 € en neuf", detail: "Appel de 1 h (1 h 30 en construction neuve) + ton budget écrit, poste par poste" },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Ceux qui veulent savoir si leur projet tient avant de demander des devis ou un prêt.",
      "Ceux qui font construire et veulent connaître le coût complet, au-delà du contrat du constructeur.",
      "Ceux qui ont une estimation AVYORA et veulent l'avis d'un pro avant de s'engager.",
    ],
  },
  gains: {
    titre: "Ce que tu y gagnes",
    items: [
      { t: "Tu sais si ton projet tient", s: "Avant de signer quoi que ce soit, tu connais un budget réaliste, imprévus compris." },
      { t: "Pas de chantier arrêté faute d'argent", s: "Un budget juste dès le départ t'évite d'emprunter en urgence ou de renoncer à une partie des travaux." },
      { t: "Une base pour comparer tes devis", s: "Poste par poste, tu vois tout de suite le devis qui oublie quelque chose ou qui sort du marché." },
      { t: "Rien d'oublié en construction neuve", s: "Les coûts hors contrat sont dans ton budget : raccordements, étude de sol, taxe d'aménagement, assurance dommages-ouvrage." },
    ],
  },
  liste: {
    titre: "Ce que je fais",
    items: [
      { t: "Je reprends ton estimation", s: "Ton estimation AVYORA, tes photos et tes plans : je corrige les quantités, les gammes et les postes qui manquent." },
      { t: "J'ajoute ce qu'on oublie", s: "Protection, évacuation, reprises de support, raccordements, et en neuf les frais hors contrat." },
      { t: "Je prévois les imprévus", s: "Une marge adaptée à ton bien : dans l'ancien, il y a presque toujours une surprise derrière les murs." },
      { t: "Je te remets ton budget écrit", s: "Poste par poste, pour comparer tes devis et suivre tes dépenses ensuite." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies ton estimation AVYORA, tes photos et tes plans si tu en as.",
    "On en parle pendant une heure (une heure et demie en neuf), puis je te remets ton budget écrit.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "Un budget écrit, poste par poste, imprévus compris.",
      "La liste de ce qui manque à ton estimation de départ.",
      "Les postes à surveiller de près quand les devis arriveront.",
    ],
  },
  aSavoir: [
    "C'est une estimation de pro, pas un devis : les prix définitifs sont ceux des artisans que tu choisiras.",
    "Je travaille à partir de ce que tu m'envoies : plus tes photos et tes mesures sont précises, plus le budget l'est.",
  ],
  liens: [
    { href: "/estimation-travaux", label: "Faire ta première estimation AVYORA" },
    { href: "/guides/calculer-budget-travaux", label: "Comment calculer un budget travaux" },
    { href: "/relecture-devis-travaux", label: "Faire vérifier un devis ensuite" },
  ],
  faq: [
    {
      q: "Quelle différence avec l'estimation AVYORA ?",
      a: "L'estimation AVYORA chiffre ton projet à partir d'un référentiel de prix. Moi, je la reprends avec tes photos et tes plans : je corrige ce qu'un outil ne peut pas voir, comme l'état réel du support, un accès difficile ou un poste oublié.",
    },
    {
      q: "Quelle marge prévoir pour les imprévus ?",
      a: "Elle dépend de l'âge et de l'état du bien. Un logement récent en réserve peu ; une maison ancienne jamais rénovée, beaucoup plus. Je te dis laquelle prévoir pour ton bien, et pourquoi.",
    },
    {
      q: "Quels coûts oublie-t-on dans une construction neuve ?",
      a: "Ceux qui ne sont pas dans le contrat du constructeur : la viabilisation et les raccordements, l'étude de sol, la taxe d'aménagement, l'assurance dommages-ouvrage, les clôtures et les aménagements extérieurs.",
    },
    {
      q: "Mon budget peut-il m'aider à présenter mon projet à ma banque ?",
      a: "Un budget détaillé poste par poste aide à présenter un projet sérieux. La décision de financement reste celle de la banque, sur la base des devis des artisans.",
    },
    {
      q: "Combien coûte une estimation de budget travaux ?",
      a: "Environ 149 € pour une rénovation (un appel de 1 h et ton budget écrit) et environ 249 € pour une construction neuve (1 h 30). Ce sont des prix moyens, qui varient selon la taille du projet ; je te les annonce avant tout engagement, et le premier appel est gratuit.",
    },
  ],
};

/** L'avis avant achat (24/11/2026) : prix FIXE de 99 €, dossier envoyé avant l'appel (photos, annonce, localisation). */
export const AVIS_AVANT_ACHAT: PageService = {
  chemin: "/avis-travaux-avant-achat",
  titre: "Avis travaux avant achat : un pro regarde le bien",
  description:
    "Avant ton offre, un ancien chef de chantier regarde le bien : travaux à prévoir, enveloppe, risques et arguments pour négocier. 99 €, prix fixe, appel de 1 h.",
  nomService: "Avis travaux avant achat",
  serviceType: "Avis sur les travaux d'un bien immobilier avant achat",
  h1: "Avant de faire ton offre, un pro regarde les travaux.",
  intro:
    "Un bien à rénover se paie deux fois : à l'achat, puis en travaux. Avant de faire ton offre, tu m'envoies les photos, l'annonce et la localisation. Je regarde tout, puis on en parle pendant une heure : ce qu'il y a à faire, combien prévoir, et ce qui doit t'inquiéter.",
  tarif: { prix: "99 €", detail: "Appel de 1 h · ton dossier regardé avant l'appel", fixe: true, montantFixe: 99 },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Ceux qui achètent leur résidence et veulent savoir dans quoi ils s'engagent.",
      "Les investisseurs qui achètent pour louer ou pour revendre.",
      "Ceux qui hésitent entre plusieurs biens et veulent comparer les travaux de chacun.",
    ],
  },
  gains: {
    titre: "Pourquoi ça vaut le coup",
    items: [
      { t: "Tu ne paies pas trop cher", s: "Un bien à rénover ne se paie pas le prix d'un bien rénové : les travaux chiffrés le montrent noir sur blanc." },
      { t: "Des arguments pour négocier", s: "Des travaux identifiés et estimés pèsent bien plus dans une négociation qu'une impression de visite." },
      { t: "Tu évites le mauvais achat", s: "Ce qui peut faire basculer une opération (structure, humidité, toiture, réseaux) repéré avant de t'engager." },
      { t: "Ton financement au bon montant", s: "Tu sais combien prévoir en plus du prix d'achat, avant de voir ta banque." },
    ],
  },
  liste: {
    titre: "Ce que je regarde",
    items: [
      { t: "La structure", s: "Fissures, affaissements, charpente : ce qui coûte le plus cher quand on le découvre après." },
      { t: "L'humidité", s: "Traces, odeurs, remontées dans les murs, ventilation : ce que les photos laissent deviner." },
      { t: "Le clos et le couvert", s: "Toiture, menuiseries, façade : l'état et ce qu'il faudra reprendre." },
      { t: "Les réseaux", s: "Électricité, plomberie, chauffage : ce qui peut se garder et ce qui est à refaire." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies les photos, l'annonce, la localisation et, si tu les as, les diagnostics.",
    "Je regarde tout avant l'appel, puis on en parle pendant une heure.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "La liste des travaux à prévoir, des plus urgents aux plus confortables.",
      "Une enveloppe de travaux pour ton offre et ton financement.",
      "Les points à vérifier ou à faire vérifier avant de signer le compromis.",
    ],
  },
  aSavoir: [
    "Je vois ce que montrent tes photos et tes documents : un défaut caché peut m'échapper, comme à n'importe qui sans sondage sur place. Si un point demande un professionnel sur place, je te le dis.",
    "Mon avis ne remplace pas les diagnostics obligatoires fournis par le vendeur, ni l'avis d'un notaire sur la vente.",
    "Je ne promets aucune plus-value : elle dépend du prix d'achat, du marché et du prix de revente.",
  ],
  liens: [
    { href: "/accompagnement-achat-revente", label: "L'accompagnement achat-revente" },
    { href: "/estimation-budget-travaux", label: "Estimer ton budget travaux en détail" },
    { href: "/guides/prix-renovation-maison", label: "Le prix d'une rénovation de maison" },
  ],
  faq: [
    {
      q: "Comment savoir quels travaux prévoir avant d'acheter ?",
      a: "En regardant dans l'ordre ce qui coûte le plus cher : la structure, l'humidité, la toiture, puis les réseaux (électricité, plomberie, chauffage). Les diagnostics du vendeur donnent des indices, mais ne chiffrent pas les travaux.",
    },
    {
      q: "Peut-on négocier le prix d'un bien grâce aux travaux ?",
      a: "Oui, à condition d'arriver avec des travaux identifiés et estimés, pas avec une impression. Un vendeur et son agent entendent mieux une liste chiffrée qu'une demande de baisse générale.",
    },
    {
      q: "Que dois-je t'envoyer avant l'appel ?",
      a: "Les photos de chaque pièce et de l'extérieur, l'annonce, l'adresse ou la localisation, et les diagnostics si tu les as. Une vidéo de la visite aide aussi : plus j'en vois, plus mon avis est précis.",
    },
    {
      q: "L'avis remplace-t-il les diagnostics immobiliers ?",
      a: "Non. Les diagnostics obligatoires sont fournis par le vendeur et réalisés par des diagnostiqueurs certifiés. Mon avis porte sur les travaux à prévoir et leur coût.",
    },
    {
      q: "Combien coûte l'avis avant achat ?",
      a: "99 €, prix fixe, quel que soit le bien : je regarde ton dossier avant l'appel, puis on en parle pendant une heure. Le premier appel pour en discuter est gratuit.",
    },
  ],
};

/** Les choix techniques (24/11/2026) : la bonne méthode et le bon matériau, pour les artisans comme pour ceux qui font eux-mêmes. */
export const CHOIX_TECHNIQUES: PageService = {
  chemin: "/conseil-technique-travaux",
  titre: "Conseil technique travaux : les bons choix",
  description:
    "Quel matériau, quelle méthode, quoi vérifier avant de refermer : un ancien chef de chantier t'aide à faire les bons choix techniques, artisans ou fait maison.",
  nomService: "Conseil technique travaux",
  serviceType: "Conseil technique pour des travaux de rénovation et de construction",
  h1: "Le bon matériau, la bonne méthode, avant de commencer.",
  intro:
    "Un mauvais choix technique ne se voit pas tout de suite : il se paie quelques mois plus tard, quand il faut tout reprendre. Que tu confies tes travaux à des artisans ou que tu les fasses toi-même, on regarde ensemble la bonne solution pour ton bien, et pourquoi.",
  tarif: { prix: "≈ 99 €", detail: "Appel de 1 h + un résumé écrit des solutions retenues" },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Ceux qui font leurs travaux eux-mêmes et veulent les faire juste du premier coup.",
      "Ceux à qui deux artisans proposent deux solutions différentes.",
      "Ceux qui hésitent entre plusieurs matériaux ou plusieurs gammes.",
    ],
  },
  gains: {
    titre: "Ce que tu y gagnes",
    items: [
      { t: "Tu ne fais pas les choses deux fois", s: "Une erreur de méthode, c'est démolir et refaire : le matériau, la main-d'œuvre et le temps, payés deux fois." },
      { t: "Le juste niveau de gamme", s: "Ce qui mérite une meilleure qualité, et ce qui n'apporte rien de plus pour ton usage." },
      { t: "Tu sais quoi vérifier", s: "Les contrôles à faire avant de refermer un mur, de carreler ou de poser un sol." },
      { t: "Si tu fais toi-même", s: "L'ordre des tâches, l'outillage et les pièges du métier : du temps et du matériel gagnés." },
    ],
  },
  liste: {
    titre: "Ce qu'on peut voir ensemble",
    items: [
      { t: "Salle de bain", s: "Douche à l'italienne, étanchéité sous carrelage, pentes, ventilation." },
      { t: "Isolation", s: "Le bon isolant selon le support, la gestion de l'humidité, les ponts thermiques." },
      { t: "Sols et murs", s: "Préparation du support, chape ou ragréage, cloisons, enduits." },
      { t: "Gros œuvre et extérieur", s: "Ouvertures, maçonnerie, dalles, terrasses : ce qui demande un pro, et ce qui se fait soi-même." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies des photos de ton chantier et ta question, ou les solutions qu'on te propose.",
    "On en parle pendant une heure, puis je te remets un résumé écrit des solutions retenues.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "La solution adaptée à ton bien, avec ses raisons.",
      "Les points de contrôle à chaque étape.",
      "Un résumé écrit, à garder sous la main pendant le chantier.",
    ],
  },
  aSavoir: [
    "C'est du conseil : les artisans restent responsables de leurs travaux, et toi de ce que tu réalises toi-même.",
    "Pour ce qui touche à la structure (murs porteurs, planchers, charpente), un bureau d'études reste indispensable : je te dis quand c'est le cas.",
  ],
  liens: [
    { href: "/guides/faire-soi-meme-ou-artisan", label: "Faire soi-même ou faire faire" },
    { href: "/guides/ordre-travaux-renovation", label: "Dans quel ordre faire ses travaux" },
    { href: "/prix-poste", label: "Le prix de chaque corps d'état" },
  ],
  faq: [
    {
      q: "Comment choisir entre deux solutions proposées par des artisans ?",
      a: "En comparant ce qu'elles font vraiment, pas seulement leur prix : la durée de vie, l'entretien, ce qu'elles demandent comme support et ce qu'elles pardonnent en cas d'erreur. Souvent, l'écart de prix s'explique ; parfois, non.",
    },
    {
      q: "Que vérifier avant de refermer une cloison ?",
      a: "Que les gaines électriques et les arrivées d'eau sont au bon endroit et testées, que l'isolant est continu, et que les renforts sont posés là où tu accrocheras des meubles ou un téléviseur. Une fois les plaques posées, chaque oubli devient une saignée.",
    },
    {
      q: "Peut-on faire soi-même une douche à l'italienne ?",
      a: "Oui, si l'on respecte deux points qui ne pardonnent pas : la pente vers l'évacuation et l'étanchéité sous le carrelage. C'est typiquement le genre de chantier où un appel avant de commencer évite de tout refaire.",
    },
    {
      q: "Quels travaux ne faut-il pas faire soi-même ?",
      a: "Ceux qui touchent à la structure, au gaz, et ceux qui engagent ta sécurité ou ton assurance. Pour l'électricité, faire contrôler l'installation par un professionnel reste prudent. Le reste se discute selon ton niveau.",
    },
    {
      q: "Combien coûte un conseil technique ?",
      a: "Environ 99 € pour un appel d'une heure et un résumé écrit des solutions retenues. C'est un prix moyen, qui varie selon la taille du projet ; je te l'annonce avant tout engagement, et le premier appel est gratuit.",
    },
  ],
};

/** Les plans 2D (24/11/2026) : dessinés par Daniel dans l'éditeur AVYORA, à partir des mesures du client. 2D seulement. */
export const PLANS_2D: PageService = {
  chemin: "/faire-dessiner-plan-maison",
  titre: "Faire dessiner le plan 2D de ta maison",
  description:
    "Le plan de l'existant et de ton projet, dessiné en 2D par un ancien chef de chantier : cloisons, cuisine, salle de bain. Pour te projeter et comparer tes devis.",
  nomService: "Plans 2D de ton projet",
  serviceType: "Réalisation de plans 2D d'aménagement",
  h1: "Ton plan 2D dessiné par un pro du chantier.",
  intro:
    "Avant de casser une cloison ou de commander une cuisine, il faut voir ton projet à plat, aux bonnes cotes. Tu me donnes tes mesures et tes idées, je dessine le plan de l'existant et celui de ton projet avec l'éditeur AVYORA.",
  tarif: { prix: "≈ 89 € une pièce · ≈ 199 € jusqu'à 100 m² · ≈ 299 € au-delà", detail: "Plan de l'existant + plan du projet, en 2D" },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Ceux qui réaménagent un logement : cloisons, cuisine, salle de bain.",
      "Ceux qui veulent des devis comparables, faits sur le même plan.",
      "Ceux qui n'ont pas le temps de dessiner eux-mêmes dans l'éditeur.",
    ],
  },
  gains: {
    titre: "Ce que tu y gagnes",
    items: [
      { t: "Tu vois avant de casser", s: "Un plan aux bonnes cotes évite le meuble qui ne rentre pas ou la porte qui bute." },
      { t: "Des devis comparables", s: "Tous les artisans chiffrent le même plan : les écarts de prix deviennent lisibles." },
      { t: "Des quantités justes", s: "Surfaces et longueurs tirées du plan, pour ton budget et pour contrôler les devis." },
      { t: "Un plan qui te reste", s: "Tu peux le reprendre et le modifier toi-même dans l'éditeur AVYORA." },
    ],
  },
  liste: {
    titre: "Ce que je dessine",
    items: [
      { t: "Le plan de l'existant", s: "Tes pièces, tes murs, tes ouvertures, à partir de tes mesures." },
      { t: "Le plan du projet", s: "Les cloisons déplacées, la nouvelle cuisine, la salle de bain, l'aménagement." },
      { t: "Les cotes", s: "Les dimensions utiles aux artisans et à tes commandes." },
      { t: "Les surfaces", s: "Pièce par pièce, pour ton budget et tes devis." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies tes mesures, tes photos et tes idées (un croquis à main levée suffit).",
    "Je dessine l'existant et le projet, puis on ajuste ensemble.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "Le plan 2D de l'existant et celui de ton projet.",
      "Les surfaces pièce par pièce.",
      "Un plan modifiable dans l'éditeur AVYORA.",
    ],
  },
  aSavoir: [
    "Je ne viens pas mesurer : le plan est aussi juste que les mesures que tu me donnes. Je te dis lesquelles prendre, et comment.",
    "Ce sont des plans d'aménagement, pas des plans de structure : pour un mur porteur, une trémie ou un plancher, il faut un bureau d'études.",
    "Pour un permis de construire, un architecte est obligatoire au-delà de 150 m² de surface de plancher.",
  ],
  liens: [
    { href: "/logiciel-plan-maison", label: "Dessiner ton plan toi-même, gratuitement" },
    { href: "/estimation-budget-travaux", label: "Estimer ton budget à partir du plan" },
    { href: "/relecture-devis-travaux", label: "Faire vérifier tes devis" },
  ],
  faq: [
    {
      q: "Comment faire dessiner le plan de sa maison ?",
      a: "En fournissant des mesures fiables : la longueur de chaque mur, la position et la largeur des portes et fenêtres, la hauteur sous plafond. Un croquis à main levée avec ces cotes suffit pour dessiner un plan propre.",
    },
    {
      q: "Quelles mesures dois-je prendre ?",
      a: "Les murs pièce par pièce, les ouvertures (largeur, hauteur, position), l'épaisseur des cloisons quand tu peux la voir, et la hauteur sous plafond. Je te donne la liste exacte avant de commencer.",
    },
    {
      q: "Ce plan peut-il servir pour une déclaration préalable ou un permis ?",
      a: "Il peut servir de base. Les pièces exigées dépendent de ton dossier, et au-delà de 150 m² de surface de plancher, un permis de construire doit passer par un architecte.",
    },
    {
      q: "Puis-je dessiner mon plan moi-même ?",
      a: "Oui : l'éditeur de plan AVYORA est fait pour ça. Je dessine pour toi si tu n'as pas le temps, ou si tu veux un plan juste du premier coup.",
    },
    {
      q: "Combien coûte un plan 2D ?",
      a: "Environ 89 € pour une pièce, environ 199 € pour un logement jusqu'à 100 m² et environ 299 € au-delà, plan de l'existant et plan du projet compris. Ce sont des prix moyens, qui varient selon la taille du projet ; le premier appel est gratuit.",
    },
  ],
};

/** Le suivi du budget (24/11/2026) : les dépenses face au budget, facture par facture, avenant par avenant. */
export const SUIVI_BUDGET: PageService = {
  chemin: "/suivi-budget-travaux",
  titre: "Suivi de budget travaux : dépenses sous contrôle",
  description:
    "Tes dépenses de travaux suivies face à ton budget, facture par facture et avenant par avenant, par un ancien chef de chantier. Les dérives repérées tôt.",
  nomService: "Suivi de budget travaux",
  serviceType: "Suivi du budget de travaux pour particuliers",
  h1: "Ton budget travaux suivi, facture par facture.",
  intro:
    "Un budget de travaux dérape rarement d'un coup : il glisse, un supplément après l'autre, jusqu'au jour où il manque de l'argent pour finir. Je suis tes dépenses face à ton budget et je te préviens dès qu'un poste s'écarte, tant qu'il est encore temps de rattraper.",
  tarif: { prix: "≈ 200 €/mois", detail: "Suivi des factures, acomptes et avenants · sans engagement" },
  pourQui: {
    titre: "Pour qui",
    items: [
      "Ceux qui coordonnent plusieurs artisans et voient les factures s'empiler.",
      "Ceux qui ont un budget serré, ou un prêt au montant fixe.",
      "Ceux qui ont un maître d'œuvre mais veulent garder un œil sur l'argent.",
    ],
  },
  gains: {
    titre: "Ce que tu y gagnes",
    items: [
      { t: "Une dérive repérée tôt se rattrape", s: "Tant qu'il reste des postes à venir, on peut arbitrer ; à la fin du chantier, il est trop tard." },
      { t: "Tu ne paies pas deux fois", s: "Chaque facture rapprochée du devis signé, des acomptes déjà versés et des avenants." },
      { t: "Des avenants vérifiés", s: "Un supplément justifié se paie ; un supplément qui faisait déjà partie du devis, non." },
      { t: "Tu sais toujours ce qu'il reste", s: "Ce qui est payé, ce qui reste à payer, et ce qui reste à faire." },
    ],
  },
  liste: {
    titre: "Ce que je suis",
    items: [
      { t: "Les factures et les acomptes", s: "Rapprochés du devis signé, poste par poste." },
      { t: "Les avenants", s: "Justifiés ou non, au bon prix ou non, avant que tu les signes." },
      { t: "Le reste à payer", s: "Ce qui reste face à ce qui reste à faire." },
      { t: "Les alertes", s: "Un poste qui s'écarte, un acompte en avance sur l'avancement, un supplément qui se prépare." },
    ],
  },
  etapes: [
    "Tu demandes à être rappelé : c'est gratuit et ça prend une minute.",
    "Tu m'envoies ton budget, tes devis signés et tes premières factures.",
    "Je tiens ton suivi à jour et je te préviens dès qu'un poste s'écarte.",
  ],
  obtiens: {
    titre: "Ce que tu obtiens",
    items: [
      "Ton budget à jour, dans ton suivi AVYORA.",
      "Un avis sur chaque avenant avant de le signer.",
      "Une alerte dès qu'un poste dérape, avec les options pour rattraper.",
    ],
  },
  aSavoir: [
    "C'est du conseil : je ne paie rien à ta place et je ne négocie pas avec les artisans en ton nom.",
    "Le suivi peut s'ajouter à l'organisation du chantier chaque semaine, ou se prendre seul.",
  ],
  liens: [
    { href: "/suivi-de-chantier", label: "L'organisation du chantier chaque semaine" },
    { href: "/estimation-budget-travaux", label: "Faire vérifier ton budget de départ" },
    { href: "/guides/calculer-budget-travaux", label: "Comment calculer un budget travaux" },
  ],
  faq: [
    {
      q: "Comment suivre le budget de ses travaux ?",
      a: "En rapprochant chaque facture du devis signé, poste par poste, et en notant à chaque fois ce qui reste à payer face à ce qui reste à faire. Les écarts se voient alors tout de suite, pas à la fin.",
    },
    {
      q: "Qu'est-ce qu'un avenant, et comment le vérifier ?",
      a: "C'est une modification du devis signé : un travail en plus, en moins, ou différent. Avant de le signer, vérifie qu'il ne facture pas un poste déjà compris dans le devis, et que son prix est cohérent avec les autres postes.",
    },
    {
      q: "Pourquoi un budget de travaux dérape-t-il ?",
      a: "Le plus souvent à cause d'un poste oublié dans un devis, d'une mauvaise surprise à l'ouverture des murs, ou d'une décision prise trop tard. Aucune n'est grave si on la voit tôt.",
    },
    {
      q: "Faut-il un maître d'œuvre pour tenir son budget ?",
      a: "Non. Un maître d'œuvre dirige le chantier ; le suivi de budget te permet de garder la main sur l'argent, que tu aies un maître d'œuvre ou non.",
    },
    {
      q: "Combien coûte le suivi du budget ?",
      a: "Environ 200 € par mois, sans engagement. C'est un prix moyen, qui varie selon la taille du chantier et le nombre d'artisans ; je te l'annonce avant tout engagement, et le premier appel est gratuit.",
    },
  ],
};

/**
 * La page des CLIENTS du Réseau AVYORA (référencement du 20/11/2026 : « trouver un artisan », « artisan de confiance »,
 * « vérifier décennale / SIRET »). /reseau-artisans parle aux artisans ; celle-ci parle à ceux qui cherchent un artisan.
 * L'accès dépend de la bêta : la page le reçoit (`acces`). Honnête sur le démarrage du réseau (zones encore vides).
 * Chemin hors du préfixe /artisans (privé dans le proxy et fermé dans robots.txt).
 */
export function trouverArtisan(acces: string): PageService {
  return {
    chemin: "/trouver-un-artisan",
    titre: "Trouver un artisan vérifié pour tes travaux",
    description:
      "Jusqu'à 3 artisans de ton département, vérifiés un par un : SIRET actif, assurance décennale, chantiers, entretien. Tu choisis, ils te répondent sous 5 jours.",
    nomService: "Trouver un artisan vérifié",
    serviceType: "Mise en relation avec des artisans du bâtiment vérifiés",
    eyebrow: "Réseau AVYORA · artisans vérifiés",
    h1: "Trouve un artisan vérifié pour tes travaux.",
    intro:
      "Le Réseau AVYORA réunit des artisans vérifiés un par un par Daniel, ancien chef de chantier. Tu choisis jusqu'à 3 artisans de ton département ; ceux qui acceptent ta demande te contactent pour établir leur devis.",
    liste: {
      titre: "Ce que nous vérifions",
      items: [
        { t: "Un SIRET actif", s: "L'entreprise existe et n'est pas fermée, d'après le répertoire officiel des entreprises." },
        { t: "L'assurance décennale", s: "Obligatoire pour entrer : l'attestation est contrôlée, et sa date de fin suivie." },
        { t: "Des chantiers réalisés", s: "Des photos de travaux faits par l'artisan ou son équipe." },
        { t: "Un entretien avec Daniel", s: "Chaque artisan est appelé avant d'entrer dans le réseau : sa façon de travailler, ses délais, sa zone." },
        { t: "Des réponses rapides", s: "L'artisan répond à chaque demande sous 5 jours ; sinon, tu peux en choisir un autre." },
        { t: "L'avis des clients", s: "Après chaque mise en relation, ton avis est lu par Daniel : un artisan mal noté peut être suspendu." },
      ],
    },
    etapes: [
      "Tu décris tes travaux : seul le type de travaux est obligatoire, ton estimation AVYORA peut être jointe.",
      "Tu choisis jusqu'à 3 artisans vérifiés de ton département.",
      "Ils acceptent ou refusent sous 5 jours. Tes coordonnées ne vont qu'à ceux qui acceptent.",
      "Tu reçois leurs devis, établis sur la même base : ils se comparent enfin.",
    ],
    obtiens: {
      titre: "Pourquoi c'est différent",
      items: [
        "Ta demande n'est jamais envoyée à dix entreprises : c'est toi qui choisis, 3 au plus.",
        "Aucun artisan ne paie pour être mieux placé : le premier affiché est celui qui a reçu le moins de demandes.",
        "Ton estimation sert de base commune : les devis parlent des mêmes postes.",
      ],
    },
    aSavoir: [
      acces,
      "Le réseau démarre : dans certains départements, il n'y a pas encore d'artisan pour tous les travaux. Ta demande est alors gardée, et on te prévient dès qu'un artisan vérifié peut te répondre.",
      "AVYORA met en relation : il n'est pas partie au contrat entre toi et l'artisan, et ne garantit pas les travaux. Tu restes libre de signer ou non.",
    ],
    liens: [
      { href: "/reseau-artisans#criteres", label: "Nos critères de référencement" },
      { href: "/relecture-devis-travaux", label: "Faire vérifier un devis reçu" },
      { href: "/reseau-artisans", label: "Tu es artisan ? Rejoins le réseau" },
    ],
    faq: [
      {
        q: "Comment trouver un artisan de confiance pour ses travaux ?",
        a: "Vérifie trois choses avant tout : que l'entreprise est active (son SIRET), qu'elle est assurée en décennale pour les travaux demandés, et qu'elle a déjà réalisé des chantiers comparables. Dans le Réseau AVYORA, ces vérifications sont faites avant qu'un artisan puisse recevoir des demandes.",
      },
      {
        q: "Comment vérifier l'assurance décennale d'un artisan ?",
        a: "Demande son attestation avant de signer. Vérifie le nom de l'assureur, les dates de validité et surtout la liste des activités couvertes : un carreleur assuré pour la pose de carrelage ne l'est pas forcément pour la plomberie.",
      },
      {
        q: "Comment vérifier le SIRET d'une entreprise ?",
        a: "Sur l'annuaire officiel des entreprises de l'État (annuaire-entreprises.data.gouv.fr), gratuit : tu vois si l'établissement est actif, son activité et sa date de création.",
      },
      {
        q: "Pourquoi 3 artisans au plus par demande ?",
        a: "Pour que chaque artisan sache qu'il a une vraie chance, et prenne le temps de bien répondre. Une demande envoyée à dix entreprises reçoit des réponses rapides et peu travaillées.",
      },
      {
        q: "Et s'il n'y a pas d'artisan dans mon département ?",
        a: "Ta demande est gardée. Daniel cherche des artisans dans ta zone, et tu es prévenu par e-mail dès qu'un artisan vérifié peut te répondre.",
      },
    ],
    cta: { href: "/demandes-devis/nouvelle", label: "Demander des devis →", note: acces },
    parent: null,
    sansBio: true,
    titreFinal: "Des devis d'artisans vérifiés, pour ton projet.",
    texteFinal: "Décris tes travaux en quelques minutes et choisis jusqu'à 3 artisans de ton département.",
  };
}
