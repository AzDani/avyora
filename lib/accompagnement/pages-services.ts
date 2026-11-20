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
};

export const PARCOURS_COURT =
  "BTS Bâtiment en alternance dans un grand groupe du BTP, 3 ans chef de chantier, 3 ans à la tête de ma propre entreprise de travaux, et mes propres chantiers : deux maisons rénovées entièrement et une maison neuve construite de A à Z.";

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
    { href: "/estimation-travaux", label: "Estimer tes travaux gratuitement" },
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
      { t: "Un point en visio ou sur WhatsApp", s: "L'après-midi, heure de Paris : on passe en revue la semaine écoulée et la suivante." },
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
