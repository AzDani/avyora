/**
 * Textes de la page /accompagnement-travaux (FR et EN), de son formulaire et de ses e-mails.
 *
 * Règles (décisions du fondateur du 16/11/2026, rapport SEO du même jour) :
 * - tutoiement, comme tout le site ; la page parle à la première personne (Daniel) ;
 * - AUCUN prix, aucune réduction : le seul appel à l'action est « Demande à être rappelé, c'est gratuit » ;
 * - AUCUN chiffre inventé (années d'expérience, nombre de chantiers, avis, notes) : s'il en faut un un jour, il vient
 *   de Daniel (voir les TODO) ;
 * - conseil seulement : pas de maîtrise d'œuvre, dit clairement ;
 * - plus de comparaison avec France Rénov' ni de comparatif des métiers (retirés le 24/11/2026, demande de Dani) ;
 * - pas d'année écrite en dur (la date de fin de bêta passe par libellesBeta, si un jour elle est citée).
 *
 * La FAQ est UNE source : la page la rend ET en tire le FAQPage du JSON-LD (les questions doivent être visibles).
 */
import type { Locale } from "@/lib/i18n/config";
import type { Besoin, TypeProjet } from "./constantes";

/**
 * Vidéo de présentation de Daniel : rien tant qu'elle n'existe pas (la page affiche alors la carte aux initiales).
 * TODO Dani : déposer la vidéo (MP4 H.264, courte, sous-titrée) dans public/accompagnement/ et renseigner ici
 * `{ src: "/accompagnement/presentation.mp4", poster: "/accompagnement/presentation.jpg", sousTitres: "/accompagnement/presentation.fr.vtt" }`.
 */
export const VIDEO_PRESENTATION: { src: string; poster?: string; sousTitres?: string } | null = null;

/**
 * Photo de Daniel (fournie par Dani le 23/11/2026, « PHOTO_PRO_AVYORA_4K.jpg », métadonnées retirées) : la vignette
 * carrée de 80 px, cadrée large (accueil, carte de la page Accompagnement, pages de services) et le portrait de « Qui je suis » (tant qu'il
 * n'y a pas de vidéo). Jamais de photo de banque d'images.
 */
export const PHOTO_FONDATEUR: string | null = "/accompagnement/daniel-leal-carre-v2-320.webp";
export const PORTRAIT_FONDATEUR: { src: string; srcSet: string; largeur: number; hauteur: number } | null = {
  src: "/accompagnement/daniel-leal-portrait-720.webp",
  srcSet: "/accompagnement/daniel-leal-portrait-720.webp 720w, /accompagnement/daniel-leal-portrait-1080.webp 1080w",
  largeur: 720,
  hauteur: 900,
};

/** Le titre, la description et l'aperçu de partage (FR : robots ; EN : visiteur qui a choisi l'anglais). */
export const META_ACCOMPAGNEMENT = {
  fr: {
    /** Les formulations, de la plus complète à la plus courte (titreCourt, lib/seo-og.ts : 60 caractères suffixe compris). */
    titres: ["Accompagnement travaux : conseil et avis sur devis", "Accompagnement travaux pour particuliers"],
    description:
      "Conseil travaux par un ancien chef de chantier : avis sur tes devis, plan du chantier, suivi chaque semaine en visio. Rappel gratuit, sans engagement.",
    titreSocial: "Un ancien chef de chantier à tes côtés pour tes travaux",
  },
  en: {
    title: "Renovation advice from a former site manager",
    description:
      "Renovation advice from a former construction site manager: a second opinion on your quotes, a site plan, weekly check-ins by video. Free call-back.",
  },
} as const;

/** `prix` : prix MOYEN affiché (décision de Dani du 24/11/2026 : il varie selon la taille du projet, sauf l'avis avant
 * achat, à prix fixe) ; `detail` : la durée de l'appel et ce qui est remis. */
export type Service = { id: string; eyebrow: string; titre: string; texte: string; prix?: string; detail?: string; gain?: string; lien?: { href: string; label: string } };

const fr = {
  fil: "Accueil",
  nomPage: "Accompagnement travaux",
  hero: {
    eyebrow: "Conseil travaux · à distance",
    h1: "Accompagnement travaux : un ancien chef de chantier à tes côtés",
    chapo:
      "Rénovation, construction ou achat d'un bien : je t'aide à mener ton projet, à choisir les bons devis et à tenir ton budget. En visio ou sur WhatsApp. Le premier appel est gratuit.",
    cta: "Demande à être rappelé, c'est gratuit",
    rassurance: "Rappel sous 48 h ouvrées · visio ou WhatsApp · sans engagement",
  },
  carte: {
    nom: "Daniel Leal",
    role: "Fondateur d'AVYORA · 8 ans sur les chantiers, de chef de chantier à chef d'entreprise",
    points: [
      "J'ai vu un chantier de tous les côtés : l'entreprise, le chef de chantier et le propriétaire.",
      "Je m'appuie sur ton projet chiffré dans AVYORA, si tu en as un.",
      "Je ne vends pas de travaux : mon avis ne dépend d'aucun artisan.",
    ],
  },
  qui: {
    h2: "Qui je suis",
    paragraphes: [
      "Je m'appelle Daniel Leal. J'ai commencé par un BTS Bâtiment en alternance dans un grand groupe du BTP, où je suis ensuite resté 3 ans comme chef de chantier : gestion des équipes, planification des travaux, gestion des aléas. Ensuite, avec mon frère, on a monté notre propre entreprise de travaux, qu'on a dirigée 3 ans de bout en bout : le besoin du client, le devis, la planification, puis les travaux, qu'on réalisait nous-mêmes.",
      "À côté, toujours avec mon frère, on menait nos propres chantiers. Pendant mes années de chef de chantier, on a acheté deux maisons girondines et on a commencé à les rénover entièrement, de nos mains. On les a terminées du temps de notre société, puis revendues avec une plus-value. Toujours pendant la société, on a construit une maison neuve de A à Z, jusqu'à la dernière finition : quelques tâches sous-traitées, mais la quasi-totalité faite de nos mains.",
      "Huit ans à travailler presque tous les jours, avec de longues journées, sur des chantiers très différents : j'ai vu un chantier sous tous ses angles, celui de l'entreprise qui exécute, du chef de chantier qui coordonne, du propriétaire qui paie, et surtout de celui qui fait les travaux lui-même, qui les organise et les planifie. Des projets personnels nous ont amenés à fermer la société, et c'est pour ça que je me lance aujourd'hui : accompagner les gens dans leurs projets immobiliers.",
      "Ce que je t'apporte, c'est du concret. La technique : le bon choix de matériau ou de méthode, ce qu'il faut vérifier avant qu'un mur soit refermé. L'organisation : quel artisan passe avant l'autre, ce qui doit être prêt à chaque étape, et toujours ta prochaine tâche. Les erreurs qui coûtent cher sur un chantier sont presque toujours les mêmes : un poste oublié dans un devis, des artisans qui s'enchaînent mal, une décision prise trop tard. Je les connais pour les avoir vues, et corrigées, de l'autre côté. Repérée avant de signer, une erreur ne coûte rien ; découverte en plein chantier, elle se paie en reprises, en retard et en avenants.",
      "J'ai créé AVYORA pour que chacun puisse chiffrer ses travaux avant de signer ; l'accompagnement en est la suite logique. Je travaille à distance, en visio ou sur WhatsApp : tu me montres, je regarde avec toi, et tu repars avec des réponses claires.",
    ],
    videoTitre: "Présentation de Daniel Leal, en vidéo",
    /* Le parcours, en frise (faits donnés par Dani le 16/11/2026 ; il ne veut pas nommer son ancien groupe). */
    parcoursTitre: "Mon parcours",
    parcours: [
      { duree: "2 ans", titre: "BTS Bâtiment en alternance", texte: "Dans un grand groupe du BTP : la méthode, les normes, la vie d'un gros chantier." },
      { duree: "3 ans", titre: "Chef de chantier", texte: "Dans le même groupe : gestion des équipes, planification des travaux, gestion des aléas." },
      { duree: "3 ans", titre: "Notre entreprise de travaux", texte: "Avec mon frère : le besoin du client, le devis, la planification, puis les travaux, réalisés par nous-mêmes." },
      { duree: "En parallèle", titre: "Nos propres chantiers", texte: "Avec mon frère, pendant mes années de chef de chantier puis de notre société : deux maisons girondines rénovées entièrement et revendues avec une plus-value, puis une maison neuve construite de A à Z, presque entièrement de nos mains." },
    ],
    pourquoiTitre: "Pourquoi m'appeler avant de te lancer",
    pourquoi: [
      { t: "Tu évites les erreurs qui coûtent cher", s: "Celles que je vois revenir sur chaque chantier, repérées avant de signer plutôt qu'en plein chantier." },
      { t: "Tu gagnes du temps", s: "Tu sais toujours quelle est ta prochaine étape, et quoi demander à qui." },
      { t: "Tu négocies avec des arguments", s: "Tes devis lus poste par poste : ce qui manque, ce qui est cher, ce qui se discute." },
      { t: "Un avis qui ne dépend que de ton intérêt", s: "Je ne vends pas de travaux et je ne touche rien des artisans." },
    ],
    pourquoiCta: "Demande à être rappelé, c'est gratuit",
    pourquoiNote: "Premier appel gratuit et sans engagement : je te dis honnêtement si je peux t'être utile.",
  },
  aide: {
    h2: "Comment je peux t'aider sur ton projet",
    intro:
      "Tu ne sais pas par quoi commencer ? Commence par l'appel gratuit : on regarde ton projet ensemble et je te dis honnêtement ce qui t'est utile, et ce qui ne l'est pas.",
    services: [
      {
        id: "decouverte",
        eyebrow: "Pour commencer",
        titre: "Appel découverte gratuit",
        texte:
          "Tu m'expliques ton projet, ton budget et tes doutes. Je te dis comment je peux t'aider et on choisit ensemble la bonne suite. Sans engagement.",
        prix: "Gratuit",
        detail: "Appel de 20 min",
      },
      {
        id: "devis",
        eyebrow: "Avant de signer",
        titre: "Relecture de tes devis",
        texte:
          "On vérifie ensemble que tout ce que tu as demandé est bien compté : les postes oubliés, les lignes floues, les quantités, et les questions à poser à l'artisan avant de signer.",
        prix: "≈ 29 €",
        detail: "Appel de 20 min · selon la taille du devis",
        lien: { href: "/relecture-devis-travaux", label: "La relecture de devis en détail" },
        gain: "Un oubli repéré avant de signer ne te coûte rien.",
      },
      {
        id: "estimation",
        eyebrow: "Avant de te lancer",
        titre: "Estimation de ton budget travaux",
        texte:
          "Rénovation ou construction neuve : je pars de ton estimation AVYORA, de tes photos et de tes plans, et je corrige poste par poste. En neuf, j'ajoute ce qu'on oublie : raccordements, étude de sol, taxe d'aménagement, assurance dommages-ouvrage.",
        prix: "≈ 149 € en rénovation · ≈ 249 € en neuf",
        detail: "Appel de 1 h (1 h 30 en neuf) + budget écrit",
        gain: "Pas de chantier arrêté faute d'argent.",
        lien: { href: "/estimation-budget-travaux", label: "L'estimation de budget en détail" },
      },
      {
        id: "visite",
        eyebrow: "Avant d'acheter",
        titre: "Avis avant achat",
        texte:
          "Tu m'envoies avant l'appel les photos, l'annonce et la localisation du bien. Je regarde tout, puis on en parle : les travaux à prévoir, une enveloppe, les risques, et les arguments pour négocier le prix. J'ai moi-même acheté, rénové et revendu des maisons avec une plus-value.",
        prix: "99 € · prix fixe",
        detail: "Appel de 1 h, ton dossier regardé avant",
        lien: { href: "/avis-travaux-avant-achat", label: "L'avis avant achat en détail" },
        gain: "Tu ne paies pas un bien à rénover au prix d'un bien rénové.",
      },
      {
        id: "technique",
        eyebrow: "Pour bien faire",
        titre: "Choix techniques",
        texte:
          "Quel matériau, quelle méthode, dans quel ordre, et quoi vérifier avant de refermer : pour tes travaux, que tu les confies à des artisans ou que tu les fasses toi-même.",
        prix: "≈ 99 €",
        detail: "Appel de 1 h + résumé écrit",
        gain: "Tu ne fais pas les choses deux fois.",
        lien: { href: "/conseil-technique-travaux", label: "Le conseil technique en détail" },
      },
      {
        id: "plans",
        eyebrow: "Pour te projeter",
        titre: "Plans 2D de ton projet",
        texte:
          "Le plan de l'existant et celui de ton projet, dessinés avec l'éditeur AVYORA : cloisons, aménagement, cuisine, salle de bain. Pas de plans de structure (c'est le rôle d'un bureau d'études) ; au-delà de 150 m² de surface de plancher, un architecte est obligatoire pour le permis de construire.",
        prix: "≈ 89 € une pièce · ≈ 199 € jusqu'à 100 m² · ≈ 299 € au-delà",
        detail: "Plan de l'existant + plan du projet",
        gain: "Des devis enfin comparables, faits sur le même plan.",
        lien: { href: "/faire-dessiner-plan-maison", label: "Les plans 2D en détail" },
      },
      {
        id: "suivi",
        eyebrow: "Pendant le chantier",
        titre: "Organisation du chantier, chaque semaine",
        texte:
          "On démarre par ton carnet de tâches : quel artisan passe avant l'autre, ce qui doit être prêt à chaque étape, les points de contrôle. Puis un point chaque semaine, ta prochaine étape, et WhatsApp entre deux. Je ne m'engage sur aucun délai, ce n'est pas moi qui fais les travaux, mais je te préviens de ce qui fait prendre du retard.",
        prix: "≈ 149 € le lancement, puis ≈ 199 €/mois",
        detail: "Lancement 1 h 30 · puis 30 min par semaine · sans engagement",
        lien: { href: "/suivi-de-chantier", label: "Le suivi de chantier en détail" },
        gain: "Moins de temps perdu entre deux artisans.",
      },
      {
        id: "budget",
        eyebrow: "Pour tenir ton budget",
        titre: "Suivi de ton budget",
        texte:
          "Je suis tes dépenses face à ton budget, au fil des factures et des avenants : je te préviens dès qu'un poste dérape, et on voit ensemble comment rattraper.",
        prix: "≈ 200 €/mois",
        detail: "Sans engagement",
        gain: "Une dérive repérée tôt se rattrape.",
        lien: { href: "/suivi-budget-travaux", label: "Le suivi de budget en détail" },
      },
      {
        id: "sur_mesure",
        eyebrow: "Un autre besoin",
        titre: "Sur mesure",
        texte:
          "Un problème précis (une fissure, de l'humidité, un artisan qui dérape) ou un besoin qui n'est pas dans la liste : on en parle pendant l'appel gratuit.",
        prix: "Prix annoncé après l'appel",
      },
    ] satisfies Service[],
    notePrix:
      "Prix moyens : ils varient selon la taille de ton projet, sauf l'avis avant achat, à prix fixe. Je t'annonce toujours le prix exact avant tout engagement. TVA non applicable (franchise en base).",
  },
  etapes: {
    h2: "Comment ça se passe",
    liste: [
      { titre: "Tu remplis le formulaire", texte: "Une minute : ton prénom, ton e-mail, ton téléphone et ton projet en quelques mots." },
      { titre: "Je te rappelle sous 48 h ouvrées", texte: "Au téléphone, en visio ou sur WhatsApp. Si ton projet est déjà chiffré dans AVYORA, je le regarde avant." },
      { titre: "On voit ensemble ce qui t'est utile", texte: "Un avis ponctuel ou un suivi : je t'annonce le prix exact avant tout engagement. Tu ne paies que ce qui te sert." },
    ],
  },
  perimetre: {
    h2: "Ce que je fais, ce que je ne fais pas",
    fais: {
      titre: "Ce que je fais",
      liste: [
        "Je te conseille et je réponds à tes questions.",
        "Je relis tes devis et je t'aide à les comparer.",
        "Je t'aide à décider, à t'organiser et à tenir ton budget.",
      ],
    },
    faisPas: {
      titre: "Ce que je ne fais pas",
      liste: [
        "Je ne dirige pas ton chantier et je ne donne pas d'ordres aux artisans.",
        "Je ne signe rien à ta place : c'est toi qui décides et qui signes.",
        "Ce n'est pas une mission de maîtrise d'œuvre, ni une expertise judiciaire.",
      ],
    },
  },
  formulaire: {
    h2: "Comment puis-je t'aider ?",
    intro: "Demande à être rappelé, c'est gratuit. Je te recontacte sous 48 h ouvrées, au téléphone, en visio ou sur WhatsApp.",
    prenom: "Prénom",
    email: "E-mail",
    telephone: "Téléphone",
    facultatif: "facultatif",
    telephoneAide: "Pour te rappeler, au téléphone ou sur WhatsApp. Hors de France, ajoute l'indicatif (+33…).",
    typeProjet: "Ton projet",
    types: {
      renovation: "Rénovation",
      neuf: "Construction neuve",
      achat: "Achat d'un bien / investissement",
      devis: "Un devis à faire vérifier",
      autre: "Autre",
    } satisfies Record<TypeProjet, string>,
    besoins: "Ce dont tu as besoin",
    besoinsAide: "Plusieurs choix possibles.",
    listeBesoins: {
      devis: "Relecture de mes devis",
      estimation: "Estimation de mon budget travaux",
      visite: "Avis avant achat",
      technique: "Choix techniques",
      plans: "Plans 2D",
      suivi: "Organisation du chantier chaque semaine",
      budget: "Suivi de mon budget",
      sur_mesure: "Un autre besoin",
      nsp: "Je ne sais pas encore",
    } satisfies Record<Besoin, string>,
    message: "Ton projet en quelques mots",
    messageAide: "Où en es-tu, qu'est-ce qui te bloque ? {max} caractères au plus.",
    piege: "Ne pas remplir ce champ",
    envoyer: "Demande à être rappelé, c'est gratuit",
    envoi: "Envoi en cours…",
    rgpd:
      "AVYORA (Daniel Leal) utilise ces informations seulement pour te recontacter au sujet de ta demande, et les garde 1 an au plus si elle n'a pas de suite. Aucune prospection, aucune revente. Pour y accéder ou les faire effacer : contact@getavyora.fr.",
    rgpdLien: "Politique de confidentialité",
    erreurs: {
      prenom: { requis: "Indique ton prénom.", invalide: "Ton prénom ne doit contenir que des lettres.", trop_long: "Ton prénom est trop long." },
      email: { requis: "Indique ton e-mail.", invalide: "Cette adresse e-mail n'est pas valide. Vérifie-la.", trop_long: "Cette adresse e-mail est trop longue." },
      telephone: { requis: "Indique ton numéro : c'est là que je te rappelle.", invalide: "Ce numéro n'est pas valide : des chiffres, avec l'indicatif si besoin.", trop_long: "Ce numéro est trop long." },
      typeProjet: { requis: "Choisis le type de ton projet.", invalide: "Choisis le type de ton projet.", trop_long: "" },
      besoins: { requis: "", invalide: "Choisis parmi les besoins proposés.", trop_long: "" },
      message: { requis: "", invalide: "Ton message contient des caractères non acceptés.", trop_long: "Ton message est trop long." },
    },
    resumeErreurs: "Il y a une erreur dans le formulaire. Corrige le champ indiqué puis renvoie ta demande.",
    globales: {
      expire: "Cette page est ouverte depuis trop longtemps. Recharge-la, puis renvoie ta demande.",
      trop_rapide: "Un instant : vérifie tes réponses, puis renvoie ta demande.",
      limite: "Tu as déjà envoyé plusieurs demandes. Réessaie dans une heure, ou écris-moi directement.",
      envoi: "Ta demande n'a pas pu partir. Écris-moi directement, je te réponds au plus vite :",
    },
    succesTitre: "C'est envoyé, merci {prenom} !",
    succesTitreSansPrenom: "C'est envoyé, merci !",
    succesTexte:
      "Je te recontacte sous 48 h ouvrées, au téléphone, en visio ou sur WhatsApp. Un e-mail de confirmation est en route : pense à regarder dans tes indésirables.",
  },
  faq: {
    h2: "Questions fréquentes",
    items: [
      {
        q: "Qui peut m'aider à gérer mes travaux de rénovation ?",
        a: "Un maître d'œuvre dirige le chantier à ta place, payé en général en pourcentage des travaux. Mon accompagnement, c'est du conseil : tu gardes la main sur ton chantier, j'éclaire tes décisions, du devis à la fin des travaux.",
      },
      {
        q: "Combien coûte un accompagnement travaux ?",
        a: "Le premier appel est gratuit. Ensuite, chaque prestation a son prix moyen, affiché plus haut : la relecture d'un devis autour de 29 €, l'avis avant achat à 99 € (prix fixe), l'organisation du chantier autour de 199 € par mois. Le prix varie selon la taille du projet, et je te l'annonce toujours avant tout engagement.",
      },
      {
        q: "Qui peut vérifier un devis de travaux avant de signer ?",
        a: "Je relis ton devis poste par poste : ce qui manque, ce qui est flou, les prix éloignés du référentiel AVYORA, et les questions à poser à l'artisan avant de signer. Le guide « vérifier un devis de travaux » donne aussi la méthode pour le faire toi-même.",
      },
      {
        q: "Est-ce que tu diriges mon chantier ?",
        a: "Non. C'est du conseil, pas de la maîtrise d'œuvre : je ne donne pas d'ordres aux artisans et je ne signe rien à ta place. Tu restes le seul à décider.",
      },
      {
        q: "Peut-on se faire accompagner pour la réception des travaux ?",
        a: "Oui, dans le cadre de l'organisation du chantier : on la prépare ensemble pendant nos points, avec une liste de contrôle, pour que tu notes les réserves au procès-verbal avant de signer.",
      },
      {
        q: "Un accompagnement à distance, ça marche vraiment ?",
        a: "Oui, pour du conseil : on échange en visio ou sur WhatsApp, tu m'envoies photos et vidéos du chantier, et ton budget comme tes tâches sont partagés dans AVYORA.",
      },
      {
        q: "Faut-il un compte AVYORA pour être rappelé ?",
        a: "Non. Le formulaire suffit. Un compte sert ensuite si tu veux un suivi : c'est là qu'on partage ton budget et tes tâches.",
      },
    ],
  },
  preparer: {
    h2: "Avant l'appel : prépare ton projet",
    intro: "Pas obligatoire, mais l'appel n'en sera que plus utile :",
    liens: {
      estimation: "Estime ta rénovation gratuitement",
      construction: "Estime ta construction neuve",
      devis: "Comment lire et vérifier un devis",
      budget: "Calculer un budget travaux",
      plan: "Dessine ton plan de maison",
    },
  },
  referentiel: "Les devis sont comparés au référentiel de prix AVYORA (plus de 200 postes, 18 corps d'état), mis à jour le {date}.",
  note: "Conseils indicatifs, sans mission de maîtrise d'œuvre.",
  mentions: "Mentions légales",
  methodologie: "D'où viennent les prix AVYORA",
  contact: "Une question avant ? Écris à",
};

export type ContenuAccompagnement = typeof fr;
/** Les textes du formulaire : de simples chaînes (« {max} », « {prenom} » à remplacer), transmises au composant client. */
export type TextesFormulaire = ContenuAccompagnement["formulaire"];

const en: ContenuAccompagnement = {
  fil: "Home",
  nomPage: "Renovation advice",
  hero: {
    eyebrow: "Renovation advice · remote",
    h1: "Renovation advice: a former site manager by your side",
    chapo:
      "Renovating, building or buying a property: I help you run your project, pick the right quotes and keep to your budget. By video call or WhatsApp. The first call is free.",
    cta: "Request a free call-back",
    rassurance: "Call-back within 2 business days · video or WhatsApp · no commitment",
  },
  carte: {
    nom: "Daniel Leal",
    role: "Founder of AVYORA · 8 years on building sites, from site manager to business owner",
    points: [
      "I've seen building sites from every side: the contractor, the site manager and the owner.",
      "I work from your project as priced in AVYORA, if you have one.",
      "I don't sell building work: my advice doesn't depend on any contractor.",
    ],
  },
  qui: {
    h2: "Who I am",
    paragraphes: [
      "I'm Daniel Leal. I started with a two-year building degree (BTS Bâtiment) as a work-study student in a major construction group, where I then stayed 3 years as a site manager: managing crews, scheduling the works, handling the unexpected. Then, with my brother, we set up our own building company and ran it for 3 years, end to end: the client's needs, the quote, the schedule, then the works, which we carried out ourselves.",
      "Alongside that, still with my brother, we ran our own projects. During my years as a site manager, we bought two traditional Gironde houses and started renovating them completely, with our own hands. We finished them while we had our company, then sold them at a profit. Also during the company years, we built a new house from start to finish, down to the last detail: a few tasks subcontracted, but almost all of it done with our own hands.",
      "Eight years of working almost every day, long days, on very different sites: I've seen a building site from every angle, that of the company doing the work, the site manager coordinating it, the owner paying for it, and above all the person doing the work themselves, organising and planning it. Personal projects led us to close the company, and that's why I'm now launching this: helping people with their property projects.",
      "What I bring you is practical. The technical side: the right material or method, what to check before a wall is closed up. The organisation: which trade comes before which, what must be ready at each stage, and always your next task. The mistakes that cost money on a building site are almost always the same: an item missing from a quote, trades that don't follow each other properly, a decision made too late. I know them because I've seen them, and fixed them, from the other side. Spotted before you sign, a mistake costs nothing; found halfway through the works, you pay for it in rework, delays and extra charges.",
      "I created AVYORA so anyone can price their work before signing; advice is the natural next step. I work remotely, by video call or WhatsApp: you show me, we look at it together, and you leave with clear answers.",
    ],
    videoTitre: "Daniel Leal's introduction video",
    parcoursTitre: "My background",
    parcours: [
      { duree: "2 years", titre: "Building degree, work-study", texte: "In a major construction group: method, standards, life on a large site." },
      { duree: "3 years", titre: "Site manager", texte: "In the same group: managing crews, scheduling the works, handling the unexpected." },
      { duree: "3 years", titre: "Our building company", texte: "With my brother: the client's needs, the quote, the schedule, then the works, carried out ourselves." },
      { duree: "Alongside", titre: "Our own projects", texte: "With my brother, during my site-manager years and then our company years: two Gironde houses fully renovated and sold at a profit, then a new house built from start to finish, almost entirely with our own hands." },
    ],
    pourquoiTitre: "Why call me before you start",
    pourquoi: [
      { t: "You avoid costly mistakes", s: "The ones I see on every site, spotted before you sign rather than halfway through the works." },
      { t: "You save time", s: "You always know your next step, and what to ask of whom." },
      { t: "You negotiate with arguments", s: "Your quotes read item by item: what's missing, what's expensive, what's negotiable." },
      { t: "Advice that only serves your interest", s: "I don't sell building work and I take nothing from contractors." },
    ],
    pourquoiCta: "Request a call-back, it's free",
    pourquoiNote: "First call free, no commitment: I'll tell you honestly whether I can help.",
  },
  aide: {
    h2: "How I can help with your project",
    intro:
      "Not sure where to start? Start with the free call: we look at your project together and I tell you honestly what will help you, and what won't.",
    services: [
      {
        id: "decouverte",
        eyebrow: "To start",
        titre: "Free discovery call",
        texte: "You tell me about your project, your budget and your doubts. I tell you how I can help and we choose the right next step together. No commitment.",
        prix: "Free",
        detail: "20-min call",
      },
      {
        id: "devis",
        eyebrow: "Before you sign",
        titre: "Review of your quotes",
        texte:
          "We check together that everything you asked for is actually included: missing items, vague lines, quantities, and the questions to ask the contractor before signing.",
        prix: "≈ €29",
        detail: "20-min call · depends on the size of the quote",
        lien: { href: "/relecture-devis-travaux", label: "Quote review in detail (in French)" },
        gain: "A gap spotted before you sign costs you nothing.",
      },
      {
        id: "estimation",
        eyebrow: "Before you start",
        titre: "Estimate of your works budget",
        texte:
          "Renovation or new build: I start from your AVYORA estimate, your photos and your plans, and correct it line by line. For a new build, I add what people forget: utility connections, soil survey, development tax, builder's warranty insurance.",
        prix: "≈ €149 for a renovation · ≈ €249 for a new build",
        detail: "1-hour call (1 h 30 for a new build) + written budget",
        gain: "No site halted for lack of money.",
        lien: { href: "/estimation-budget-travaux", label: "Budget estimate in detail (in French)" },
      },
      {
        id: "visite",
        eyebrow: "Before you buy",
        titre: "Opinion before you buy",
        texte:
          "Before the call, you send me the photos, the listing and the location of the property. I look at everything, then we talk: the work to plan, a budget, the risks, and the arguments to negotiate the price. I've bought, renovated and sold houses at a profit myself.",
        prix: "€99 · fixed price",
        detail: "1-hour call, your file reviewed beforehand",
        lien: { href: "/avis-travaux-avant-achat", label: "Opinion before you buy in detail (in French)" },
        gain: "You don't pay renovated prices for a property that needs work.",
      },
      {
        id: "technique",
        eyebrow: "To do it right",
        titre: "Technical choices",
        texte:
          "Which material, which method, in what order, and what to check before closing up: for your works, whether you hire contractors or do it yourself.",
        prix: "≈ €99",
        detail: "1-hour call + written summary",
        gain: "You don't do things twice.",
        lien: { href: "/conseil-technique-travaux", label: "Technical advice in detail (in French)" },
      },
      {
        id: "plans",
        eyebrow: "To picture it",
        titre: "2D plans of your project",
        texte:
          "The plan of the existing space and of your project, drawn with the AVYORA editor: partitions, layout, kitchen, bathroom. No structural plans (that's a structural engineer's job); above 150 m² of floor area, an architect is mandatory for the building permit.",
        prix: "≈ €89 one room · ≈ €199 up to 100 m² · ≈ €299 above",
        detail: "Existing plan + project plan",
        gain: "Quotes you can finally compare, all on the same plan.",
        lien: { href: "/faire-dessiner-plan-maison", label: "2D plans in detail (in French)" },
      },
      {
        id: "suivi",
        eyebrow: "During the works",
        titre: "Organising your site, every week",
        texte:
          "We start with your task book: which trade comes before which, what must be ready at each stage, the checkpoints. Then a check-in every week, your next step, and WhatsApp in between. I don't commit to any timeline, since I'm not the one doing the work, but I warn you about what causes delays.",
        prix: "≈ €149 to start, then ≈ €199/month",
        detail: "1 h 30 kick-off · then 30 min a week · no commitment",
        gain: "Less time lost between two contractors.",
        lien: { href: "/suivi-de-chantier", label: "Site follow-up in detail (in French)" },
      },
      {
        id: "budget",
        eyebrow: "To stay on budget",
        titre: "Budget tracking",
        texte:
          "I track your spending against your budget, invoice by invoice and change order by change order: I warn you as soon as an item drifts, and we see together how to catch up.",
        prix: "≈ €200/month",
        detail: "No commitment",
        gain: "A drift spotted early can be fixed.",
        lien: { href: "/suivi-budget-travaux", label: "Budget tracking in detail (in French)" },
      },
      {
        id: "sur_mesure",
        eyebrow: "Something else",
        titre: "Tailored help",
        texte:
          "A specific problem (a crack, damp, a contractor going off track) or a need that isn't on the list: we talk about it during the free call.",
        prix: "Price given after the call",
      },
    ],
    notePrix:
      "Average prices: they vary with the size of your project, except the opinion before you buy, which is a fixed price. I always give you the exact price before any commitment. VAT not applicable (French small-business exemption).",
  },
  etapes: {
    h2: "How it works",
    liste: [
      { titre: "You fill in the form", texte: "One minute: your first name, your email and your project in a few words." },
      { titre: "I call you back within 2 business days", texte: "By phone, video or WhatsApp. If your project is already priced in AVYORA, I look at it first." },
      { titre: "We see together what will help you", texte: "A one-off opinion or ongoing follow-up: I give you the exact price before any commitment. You only pay for what you need." },
    ],
  },
  perimetre: {
    h2: "What I do, what I don't",
    fais: {
      titre: "What I do",
      liste: ["I advise you and answer your questions.", "I review your quotes and help you compare them.", "I help you decide, get organised and stay on budget."],
    },
    faisPas: {
      titre: "What I don't do",
      liste: [
        "I don't run your site and I don't give instructions to contractors.",
        "I don't sign anything for you: you decide and you sign.",
        "This is not a project management assignment, nor a court-appointed expert report.",
      ],
    },
  },
  formulaire: {
    h2: "How can I help you?",
    intro: "Request a call-back, it's free. I get back to you within 2 business days, by phone, video or WhatsApp.",
    prenom: "First name",
    email: "Email",
    telephone: "Phone",
    facultatif: "optional",
    telephoneAide: "So I can call you back, by phone or WhatsApp. Include your country code (+1…).",
    typeProjet: "Your project",
    types: {
      renovation: "Renovation",
      neuf: "New build",
      achat: "Buying a property / investment",
      devis: "A quote to check",
      autre: "Other",
    },
    besoins: "What you need",
    besoinsAide: "Select all that apply.",
    listeBesoins: {
      devis: "A review of my quotes",
      estimation: "An estimate of my works budget",
      visite: "An opinion before buying",
      technique: "Technical choices",
      plans: "2D plans",
      suivi: "Organising my site every week",
      budget: "Tracking my budget",
      sur_mesure: "Something else",
      nsp: "I don't know yet",
    },
    message: "Your project in a few words",
    messageAide: "Where are you at, what's holding you back? {max} characters max.",
    piege: "Leave this field empty",
    envoyer: "Request a free call-back",
    envoi: "Sending…",
    rgpd:
      "AVYORA (Daniel Leal) uses these details only to get back to you about your request, and keeps them for 1 year at most if nothing comes of it. No marketing, never sold. To access or delete them: contact@getavyora.fr.",
    rgpdLien: "Privacy policy (in French)",
    erreurs: {
      prenom: { requis: "Enter your first name.", invalide: "Your first name should only contain letters.", trop_long: "Your first name is too long." },
      email: { requis: "Enter your email.", invalide: "This email address isn't valid. Please check it.", trop_long: "This email address is too long." },
      telephone: { requis: "Enter your phone number: that's where I call you back.", invalide: "This number isn't valid: digits, with the country code if needed.", trop_long: "This number is too long." },
      typeProjet: { requis: "Choose your type of project.", invalide: "Choose your type of project.", trop_long: "" },
      besoins: { requis: "", invalide: "Choose among the needs offered.", trop_long: "" },
      message: { requis: "", invalide: "Your message contains characters that aren't accepted.", trop_long: "Your message is too long." },
    },
    resumeErreurs: "There's an error in the form. Fix the field shown, then send your request again.",
    globales: {
      expire: "This page has been open too long. Reload it, then send your request again.",
      trop_rapide: "One moment: check your answers, then send your request again.",
      limite: "You've already sent several requests. Try again in an hour, or email me directly.",
      envoi: "Your request couldn't be sent. Email me directly, I'll reply as soon as I can:",
    },
    succesTitre: "Sent, thank you {prenom}!",
    succesTitreSansPrenom: "Sent, thank you!",
    succesTexte:
      "I'll get back to you within 2 business days, by phone, video or WhatsApp. A confirmation email is on its way: check your spam folder.",
  },
  faq: {
    h2: "Frequently asked questions",
    items: [
      {
        q: "Who can help me manage my renovation?",
        a: "A project manager runs the site for you, usually paid a percentage of the work. My service is advice: you stay in charge of your project, I help you make the right calls, from the quote to the end of the works.",
      },
      {
        q: "How much does renovation advice cost?",
        a: "The first call is free. After that, each service has its average price, shown above: around €29 to review a quote, €99 for the opinion before you buy (fixed price), around €199 a month for organising your site. The price varies with the size of the project, and I always give it to you before any commitment.",
      },
      {
        q: "Who can check a building quote before I sign?",
        a: "I read your quote line by line: what's missing, what's vague, prices far from the AVYORA reference, and the questions to ask the contractor before signing. The guide on checking a quote also shows you how to do it yourself.",
      },
      {
        q: "Do you run my building site?",
        a: "No. This is advice, not project management: I don't give instructions to contractors and I don't sign anything for you. You remain the only one who decides.",
      },
      {
        q: "Can I get help for the final handover?",
        a: "Yes, as part of organising your site: we prepare it together during our check-ins, with a checklist, so you record the defects on the handover report before signing.",
      },
      {
        q: "Does remote advice really work?",
        a: "Yes, for advice: we talk by video or WhatsApp, you send me photos and videos of the site, and your budget and tasks are shared in AVYORA.",
      },
      {
        q: "Do I need an AVYORA account to be called back?",
        a: "No. The form is enough. An account is useful later if you want follow-up: that's where we share your budget and tasks.",
      },
    ],
  },
  preparer: {
    h2: "Before the call: prepare your project",
    intro: "Not required, but it makes the call even more useful:",
    liens: {
      estimation: "Estimate your renovation for free",
      construction: "Estimate your new build",
      devis: "How to read and check a quote (in French)",
      budget: "Working out a renovation budget (in French)",
      plan: "Draw your house plan",
    },
  },
  referentiel: "Quotes are compared with the AVYORA price reference (over 200 items, 18 trades), updated {date}.",
  note: "Advice only, with no project management assignment.",
  mentions: "Legal notice",
  methodologie: "Where AVYORA prices come from",
  contact: "A question first? Email",
};

export function contenuAccompagnement(locale: Locale): ContenuAccompagnement {
  return locale === "en" ? en : fr;
}

/** Les libellés FRANÇAIS du type de projet et des besoins, pour l'e-mail interne (Daniel lit en français). */
/** Les besoins d'avant le 24/11/2026, pour relire les anciennes demandes dans l'admin. */
const ANCIENS_BESOINS = { conseil: "Conseil pour mener mon projet", plan: "Plan d'attaque du chantier", reception: "Préparer la réception des travaux" };
export const LIBELLES_INTERNES = { types: fr.formulaire.types, besoins: { ...ANCIENS_BESOINS, ...fr.formulaire.listeBesoins } };
