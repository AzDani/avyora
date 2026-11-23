/**
 * Textes de la page /accompagnement-travaux (FR et EN), de son formulaire et de ses e-mails.
 *
 * Règles (décisions du fondateur du 16/11/2026, rapport SEO du même jour) :
 * - tutoiement, comme tout le site ; la page parle à la première personne (Daniel) ;
 * - AUCUN prix, aucune réduction : le seul appel à l'action est « Demande à être rappelé, c'est gratuit » ;
 * - AUCUN chiffre inventé (années d'expérience, nombre de chantiers, avis, notes) : s'il en faut un un jour, il vient
 *   de Daniel (voir les TODO) ;
 * - conseil seulement : pas de maîtrise d'œuvre, dit clairement ;
 * - honnêteté sur France Rénov' et Mon Accompagnateur Rénov' (signal de confiance, et c'est vrai) ;
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

export type Service = { id: string; eyebrow: string; titre: string; texte: string; lien?: { href: string; label: string } };
export type Acteur = { nom: string; paie: string; perimetre: string; suivi: string; responsabilite: string; moi?: boolean };

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
      "Je m'appelle Daniel Leal. J'ai commencé par un BTS Bâtiment en alternance dans un grand groupe du BTP, où je suis ensuite resté 3 ans comme chef de chantier : gestion des équipes, planification des travaux, gestion des aléas. Ensuite, j'ai monté ma propre entreprise de travaux, que j'ai dirigée 3 ans de bout en bout : le besoin du client, le devis, la planification, puis les travaux, que je réalisais moi-même.",
      "En parallèle, j'ai rénové entièrement deux maisons girondines et fait construire une maison neuve de A à Z, pour mon compte. Huit ans à travailler presque tous les jours, avec de longues journées, sur des chantiers très différents : j'ai vu un chantier sous tous ses angles, celui de l'entreprise qui exécute, du chef de chantier qui coordonne et du propriétaire qui paie. C'est ce regard complet que je t'apporte, avec ce qui fait déraper un projet : un poste oublié dans un devis, des artisans qui s'enchaînent mal, une décision prise trop tard.",
      "J'ai créé AVYORA pour que chacun puisse chiffrer ses travaux avant de signer. L'accompagnement, c'est la suite logique : un regard de professionnel sur ton projet, au moment où tu en as besoin.",
      // TODO Dani : décider s'il dit « je travaille depuis les États-Unis » (conseil du rapport SEO : la transparence).
      "Je travaille à distance, en visio ou sur WhatsApp. Tu me montres, je regarde avec toi, et tu repars avec des réponses claires.",
    ],
    videoTitre: "Présentation de Daniel Leal, en vidéo",
    /* Le parcours, en frise (faits donnés par Dani le 16/11/2026 ; il ne veut pas nommer son ancien groupe). */
    parcoursTitre: "Mon parcours",
    parcours: [
      { duree: "2 ans", titre: "BTS Bâtiment en alternance", texte: "Dans un grand groupe du BTP : la méthode, les normes, la vie d'un gros chantier." },
      { duree: "3 ans", titre: "Chef de chantier", texte: "Dans le même groupe : gestion des équipes, planification des travaux, gestion des aléas." },
      { duree: "3 ans", titre: "Ma propre entreprise de travaux", texte: "Le besoin du client, le devis, la planification, puis les travaux, réalisés par moi-même." },
      { duree: "En parallèle", titre: "Mes propres projets", texte: "Deux maisons girondines rénovées entièrement et une maison neuve construite de A à Z." },
    ],
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
      },
      {
        id: "conseil",
        eyebrow: "Y voir clair",
        titre: "Conseil travaux : comment mener ton projet",
        texte:
          "L'ordre des travaux, les artisans à consulter, les pièges à éviter, les économies possibles sans risque. Utile aussi si tu veux organiser tes travaux sans maître d'œuvre.",
      },
      {
        id: "devis",
        eyebrow: "Avant de signer",
        titre: "Relecture et analyse de tes devis",
        texte:
          "Je relis tes devis poste par poste : les oublis, les postes flous, les prix hors marché comparés au référentiel AVYORA, et les questions à poser à l'artisan avant de signer.",
        lien: { href: "/relecture-devis-travaux", label: "La relecture de devis en détail" },
      },
      {
        id: "plan",
        eyebrow: "Partir du bon pied",
        titre: "Plan d'attaque du chantier",
        texte:
          "Ton chantier mis dans l'ordre : qui intervient quand, ce qui doit être prêt avant chaque étape, les points de contrôle et les risques de retard.",
        lien: { href: "/guides/ordre-travaux-renovation", label: "Dans quel ordre faire ses travaux" },
      },
      {
        id: "suivi",
        eyebrow: "Pendant le chantier",
        titre: "Suivi de chantier chaque semaine : tâches et budget",
        texte:
          "Un point régulier en visio : les tâches de la semaine dans ton suivi AVYORA, tes dépenses face au budget, un avis sur les devis et avenants qui arrivent en cours de route.",
        lien: { href: "/suivi-de-chantier", label: "Le suivi de chantier à distance en détail" },
      },
      {
        id: "reception",
        eyebrow: "À la fin",
        titre: "Préparer la réception des travaux",
        texte:
          "Une liste de contrôle et un appel vidéo pendant la visite de fin de chantier, pour noter les réserves au procès-verbal avant de signer. Un défaut visible non signalé ce jour-là est, en principe, réputé accepté.",
      },
      {
        id: "visite",
        eyebrow: "Pour les investisseurs",
        titre: "Visite en visio avant achat",
        texte:
          "Tu filmes le bien pendant la visite, je repère les travaux à prévoir et on chiffre une enveloppe avant que tu fasses ton offre.",
        lien: { href: "/estimation-travaux", label: "Estimer les travaux gratuitement" },
      },
    ] satisfies Service[],
  },
  difference: {
    h2: "France Rénov', maître d'œuvre ou conseil : quelle différence ?",
    intro: "Trois façons de se faire aider, qui ne font pas le même métier. Voici ce qui les distingue.",
    criteres: { paie: "Qui paie", perimetre: "Ce qu'il fait", suivi: "Suivi du chantier", responsabilite: "Responsabilité" },
    acteurs: [
      {
        nom: "Conseiller France Rénov'",
        paie: "Personne : c'est un service public gratuit.",
        perimetre: "La rénovation énergétique et les aides publiques.",
        suivi: "Information et avis, sans suivi semaine après semaine.",
        responsabilite: "Un conseil neutre, sans engagement sur ton chantier.",
      },
      {
        nom: "Maître d'œuvre",
        paie: "Toi, en général un pourcentage du montant des travaux.",
        perimetre: "Il conçoit et dirige le chantier, il donne les ordres aux artisans.",
        suivi: "Oui : c'est lui qui conduit le chantier.",
        responsabilite: "Il répond de la conduite des travaux et doit être assuré pour cela.",
      },
      {
        nom: "Mon accompagnement",
        moi: true,
        paie: "Toi : le prix est annoncé pendant l'appel gratuit, avant tout engagement.",
        perimetre: "Conseil tous corps d'état : rénovation, construction neuve, achat, relecture de devis.",
        suivi: "Si tu le veux, un point chaque semaine, tâches et budget dans AVYORA.",
        responsabilite: "Conseil seulement : tu décides, tu signes, les artisans restent responsables de leurs travaux.",
      },
    ] satisfies Acteur[],
  },
  etapes: {
    h2: "Comment ça se passe",
    liste: [
      { titre: "Tu remplis le formulaire", texte: "Une minute : ton prénom, ton e-mail, ton téléphone et ton projet en quelques mots." },
      { titre: "Je te rappelle sous 48 h ouvrées", texte: "Au téléphone, en visio ou sur WhatsApp. Si ton projet est déjà chiffré dans AVYORA, je le regarde avant." },
      { titre: "On voit ensemble ce qui t'est utile", texte: "Un avis ponctuel ou un suivi : le prix se discute pendant l'appel, avant tout engagement. Tu ne paies que ce qui te sert." },
    ],
  },
  perimetre: {
    h2: "Ce que je fais, ce que je ne fais pas",
    fais: {
      titre: "Ce que je fais",
      liste: [
        "Je te conseille et je réponds à tes questions.",
        "Je relis tes devis et je t'aide à les comparer.",
        "Je t'aide à décider, à tenir ton planning et ton budget.",
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
      conseil: "Conseil pour mener mon projet",
      devis: "Relecture de mes devis",
      plan: "Plan d'attaque du chantier",
      suivi: "Suivi de chantier chaque semaine",
      reception: "Préparer la réception des travaux",
      visite: "Visite en visio avant achat",
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
        a: "Trois options : un conseiller France Rénov' (gratuit, centré sur la rénovation énergétique et les aides), un maître d'œuvre (il dirige le chantier, payé en général en pourcentage des travaux), ou un conseil comme le mien : tu gardes la main sur ton chantier, j'éclaire tes décisions.",
      },
      {
        q: "Combien coûte un accompagnement travaux ?",
        a: "Le premier appel est gratuit. Ensuite, le tarif dépend de ce dont tu as besoin, un avis ponctuel ou un suivi chaque semaine : je te l'annonce pendant l'appel, avant tout engagement.",
      },
      {
        q: "Qui peut vérifier un devis de travaux avant de signer ?",
        a: "Je relis ton devis poste par poste : ce qui manque, ce qui est flou, les prix éloignés du référentiel AVYORA, et les questions à poser à l'artisan avant de signer. Le guide « vérifier un devis de travaux » donne aussi la méthode pour le faire toi-même.",
      },
      {
        q: "Quelle différence avec un conseiller France Rénov' gratuit ?",
        a: "Le conseiller France Rénov' est un service public gratuit, centré sur la rénovation énergétique et les aides. Il informe et oriente, il ne suit pas ton chantier semaine après semaine. Je fais du conseil privé tous corps d'état : relecture de devis, plan d'attaque, suivi du chantier, réception.",
      },
      {
        q: "Est-ce que tu diriges mon chantier ?",
        a: "Non. C'est du conseil, pas de la maîtrise d'œuvre : je ne donne pas d'ordres aux artisans et je ne signe rien à ta place. Tu restes le seul à décider.",
      },
      {
        q: "Peut-on se faire accompagner pour la réception des travaux ?",
        a: "Oui. Je te prépare une liste de contrôle et je suis avec toi en appel vidéo pendant la visite de fin de chantier, pour noter les réserves au procès-verbal avant de signer.",
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
      "I'm Daniel Leal. I started with a two-year building degree (BTS Bâtiment) as a work-study student in a major construction group, where I then stayed 3 years as a site manager: managing crews, scheduling the works, handling the unexpected. Then I ran my own building company for 3 years, end to end: the client's needs, the quote, the schedule, then the works, which I carried out myself.",
      "Alongside that, I fully renovated two traditional Gironde houses and had a new house built from start to finish, as the owner. Eight years of working almost every day, long days, on very different sites: I've seen a building site from every angle, that of the company doing the work, the site manager coordinating it and the owner paying for it. That complete view is what I bring you, along with what derails a project: an item missing from a quote, trades that don't follow each other properly, a decision made too late.",
      "I created AVYORA so anyone can price their work before signing. Advice is the natural next step: a professional's eye on your project, when you need it.",
      "I work remotely, by video call or WhatsApp. You show me, we look at it together, and you leave with clear answers.",
    ],
    videoTitre: "Daniel Leal's introduction video",
    parcoursTitre: "My background",
    parcours: [
      { duree: "2 years", titre: "Building degree, work-study", texte: "In a major construction group: method, standards, life on a large site." },
      { duree: "3 years", titre: "Site manager", texte: "In the same group: managing crews, scheduling the works, handling the unexpected." },
      { duree: "3 years", titre: "My own building company", texte: "The client's needs, the quote, the schedule, then the works, carried out myself." },
      { duree: "Alongside", titre: "My own projects", texte: "Two Gironde houses fully renovated and a new house built from start to finish." },
    ],
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
      },
      {
        id: "conseil",
        eyebrow: "Get clarity",
        titre: "Renovation advice: how to run your project",
        texte:
          "The order of the work, which contractors to consult, the traps to avoid, the savings you can make safely. Also useful if you want to organize your work without a project manager.",
      },
      {
        id: "devis",
        eyebrow: "Before you sign",
        titre: "Review and analysis of your quotes",
        texte:
          "I read your quotes line by line: what's missing, what's vague, prices out of line with the AVYORA reference, and the questions to ask the contractor before signing.",
        lien: { href: "/guides/verifier-devis-travaux", label: "How to check a quote (in French)" },
      },
      {
        id: "plan",
        eyebrow: "Start right",
        titre: "Site game plan",
        texte: "Your project put in order: who comes in when, what must be ready before each step, the checkpoints and the risks of delay.",
        lien: { href: "/guides/ordre-travaux-renovation", label: "In what order to do the work (in French)" },
      },
      {
        id: "suivi",
        eyebrow: "During the work",
        titre: "Weekly site follow-up: tasks and budget",
        texte:
          "A regular video check-in: the week's tasks in your AVYORA tracker, your spending against the budget, an opinion on the quotes and change orders that come up along the way.",
      },
      {
        id: "reception",
        eyebrow: "At the end",
        titre: "Preparing the final handover",
        texte:
          "A checklist and a video call during the final walkthrough, so you record the defects on the handover report before signing. A visible defect not reported that day is, as a rule, deemed accepted.",
      },
      {
        id: "visite",
        eyebrow: "For investors",
        titre: "Video walkthrough before you buy",
        texte: "You film the property during the visit, I spot the work to plan and we price a budget before you make your offer.",
        lien: { href: "/estimation-travaux", label: "Estimate the work for free" },
      },
    ],
  },
  difference: {
    h2: "France Rénov', project manager or advice: what's the difference?",
    intro: "Three ways to get help, three different jobs. Here's what sets them apart.",
    criteres: { paie: "Who pays", perimetre: "What they do", suivi: "Site follow-up", responsabilite: "Liability" },
    acteurs: [
      {
        nom: "France Rénov' advisor",
        paie: "Nobody: it's a free public service.",
        perimetre: "Energy renovation and public grants.",
        suivi: "Information and advice, no week-by-week follow-up.",
        responsabilite: "Neutral advice, with no commitment on your project.",
      },
      {
        nom: "Project manager (maître d'œuvre)",
        paie: "You, usually a percentage of the cost of the work.",
        perimetre: "Designs and runs the project, gives instructions to contractors.",
        suivi: "Yes: they run the site.",
        responsabilite: "Liable for running the work and must be insured for it.",
      },
      {
        nom: "My advice",
        moi: true,
        paie: "You: the price is given during the free call, before any commitment.",
        perimetre: "Advice across all trades: renovation, new build, purchase, quote review.",
        suivi: "If you want, a weekly check-in, tasks and budget in AVYORA.",
        responsabilite: "Advice only: you decide, you sign, contractors remain liable for their work.",
      },
    ],
  },
  etapes: {
    h2: "How it works",
    liste: [
      { titre: "You fill in the form", texte: "One minute: your first name, your email and your project in a few words." },
      { titre: "I call you back within 2 business days", texte: "By phone, video or WhatsApp. If your project is already priced in AVYORA, I look at it first." },
      { titre: "We see together what will help you", texte: "A one-off opinion or ongoing follow-up: the price is discussed during the call, before any commitment. You only pay for what you need." },
    ],
  },
  perimetre: {
    h2: "What I do, what I don't",
    fais: {
      titre: "What I do",
      liste: ["I advise you and answer your questions.", "I review your quotes and help you compare them.", "I help you decide and stick to your schedule and budget."],
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
      conseil: "Advice on running my project",
      devis: "A review of my quotes",
      plan: "A site game plan",
      suivi: "Weekly site follow-up",
      reception: "Preparing the final handover",
      visite: "Video walkthrough before buying",
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
        a: "Three options: a France Rénov' advisor (free, focused on energy renovation and grants), a project manager (runs the site, usually paid a percentage of the work), or advice like mine: you stay in charge of your project, I help you make the right calls.",
      },
      {
        q: "How much does renovation advice cost?",
        a: "The first call is free. After that, the price depends on what you need, a one-off opinion or a weekly follow-up: I give it to you during the call, before any commitment.",
      },
      {
        q: "Who can check a building quote before I sign?",
        a: "I read your quote line by line: what's missing, what's vague, prices far from the AVYORA reference, and the questions to ask the contractor before signing. The guide on checking a quote also shows you how to do it yourself.",
      },
      {
        q: "How is this different from a free France Rénov' advisor?",
        a: "A France Rénov' advisor is a free public service focused on energy renovation and grants. They inform and guide you, they don't follow your site week after week. I give private advice across all trades: quote review, game plan, site follow-up, handover.",
      },
      {
        q: "Do you run my building site?",
        a: "No. This is advice, not project management: I don't give instructions to contractors and I don't sign anything for you. You remain the only one who decides.",
      },
      {
        q: "Can I get help for the final handover?",
        a: "Yes. I prepare a checklist for you and join you on a video call during the final walkthrough, so you record the defects on the handover report before signing.",
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
export const LIBELLES_INTERNES = { types: fr.formulaire.types, besoins: fr.formulaire.listeBesoins };
