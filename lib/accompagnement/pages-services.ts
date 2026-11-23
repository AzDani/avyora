/**
 * Les deux pages de service de l'accompagnement (référencement du 20/11/2026), chacune taillée pour une recherche à
 * forte intention : « faire vérifier un devis de travaux » et « suivi de chantier à distance ». Mêmes règles que la
 * page /accompagnement-travaux (lib/accompagnement/contenu.ts) : tutoiement, première personne (Daniel), AUCUN prix
 * (le tarif s'annonce pendant l'appel), aucun chiffre inventé, du conseil et non de la maîtrise d'œuvre, dit clairement.
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

export const PARCOURS_COURT =
  "BTS Bâtiment en alternance dans un grand groupe du BTP, puis 3 ans chef de chantier dans ce même groupe (équipes, planification, aléas), 3 ans à la tête de ma propre entreprise de travaux, du devis aux travaux réalisés moi-même, et mes propres chantiers : deux maisons rénovées entièrement et une maison neuve construite de A à Z.";

export const RELECTURE_DEVIS: PageService = {
  chemin: "/relecture-devis-travaux",
  titre: "Faire vérifier un devis de travaux avant de signer",
  description:
    "Un ancien chef de chantier relit ton devis poste par poste : oublis, postes flous, prix hors marché, questions à poser à l'artisan. Premier appel gratuit.",
  nomService: "Relecture de devis de travaux",
  serviceType: "Vérification de devis de travaux",
  h1: "Fais vérifier ton devis de travaux par un pro, avant de signer.",
  intro:
    "Un devis de travaux engage souvent des milliers d'euros, et il se lit mal quand on n'est pas du métier. Je le relis avec toi, poste par poste, pour que tu saches ce qu'il faut corriger ou négocier avant de signer.",
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
      a: "Le premier appel est gratuit. Le tarif de la relecture dépend du nombre de devis et de leur taille : je te l'annonce pendant l'appel, avant tout engagement.",
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
    "Tes devis sont signés, le chantier démarre, et tu ne peux pas être là tous les jours ? Je fais le point avec toi chaque semaine : ce qui avance, ce qui coince, ce que ça coûte, et ce qu'il faut décider maintenant.",
  pourQui: {
    titre: "Pour qui",
    items: [
      "Les investisseurs qui rénovent un bien loin de chez eux.",
      "Les particuliers qui coordonnent eux-mêmes plusieurs artisans, sans maître d'œuvre.",
      "Ceux qui travaillent pendant les heures du chantier et ne peuvent pas passer le voir.",
    ],
  },
  liste: {
    titre: "Chaque semaine",
    items: [
      { t: "Un point en visio ou sur WhatsApp", s: "On passe en revue la semaine écoulée et la suivante." },
      { t: "Les photos et vidéos du chantier", s: "Celles que toi ou l'artisan m'envoyez, surtout aux étapes qui seront ensuite cachées." },
      { t: "Les tâches et le budget à jour", s: "Dans ton suivi AVYORA : l'avancement, et tes dépenses réelles face au prévu." },
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
      "Un budget tenu à jour, et les dérapages repérés tôt.",
      "Une réception préparée, avec des réserves notées au bon moment.",
    ],
  },
  aSavoir: [
    "C'est du conseil, pas de la maîtrise d'œuvre : je ne dirige pas les artisans et je ne signe rien à ta place. Tu restes le maître d'ouvrage.",
    "Je ne suis pas sur place : je vois ce que montrent les photos et les vidéos. Si ton chantier demande quelqu'un sur site, je te le dis dès le premier appel.",
  ],
  liens: [
    { href: "/guides/ordre-travaux-renovation", label: "Dans quel ordre faire ses travaux" },
    { href: "/relecture-devis-travaux", label: "Faire vérifier un devis avant de signer" },
    { href: "/estimation-travaux", label: "Estimer tes travaux gratuitement" },
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
      a: "Le premier appel est gratuit. Le tarif dépend de la durée du chantier et du rythme du suivi : je te l'annonce pendant l'appel, avant tout engagement.",
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
