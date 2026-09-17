import "server-only";

/**
 * Pages « prix par corps d'état » (/prix-poste/[slug]).
 *
 * Complémentaires des pages /prix-travaux/[projet], qui chiffrent un PROJET type (une salle de bain
 * refaite) : ici on publie le détail d'un LOT du catalogue, poste par poste, avec le prix fourni-posé
 * et le prix fourniture seule. C'est ce que les devis mélangent et que le lecteur cherche à démêler.
 *
 * Aucun prix n'est écrit ici : chaque montant est lu à l'exécution depuis le catalogue via
 * posteRef(), donc une révision de prix se propage seule. Ce fichier ne porte que l'éditorial.
 */
export type GroupePostes = {
  titre: string;
  intro: string;
  /** Noms EXACTS de postes du catalogue (lib/estimateur/catalog.json). */
  postes: string[];
};

export type PostePage = {
  slug: string;
  /** Nom exact du lot dans le catalogue — sert à calculer la part de main-d'œuvre du lot. */
  lot: string;
  h1: string;
  title: string;
  description: string;
  resume: string;
  /** Chapô de la page. */
  lead: string;
  groupes: GroupePostes[];
  /** Sections rédactionnelles après les tableaux. */
  sections: { titre: string; corps: string[] }[];
  faq: { q: string; a: string }[];
  /** Pages à lier (chemins absolus internes). */
  liens: { href: string; texte: string }[];
};

export const POSTES_PAGES: PostePage[] = [
  {
    slug: "platrerie-cloisons",
    lot: "Cloisons / Platrerie",
    h1: "Prix du placo au m² : cloison, doublage et faux plafond",
    title: "Prix du placo au m² : cloison, doublage, plafond",
    description:
      "Combien coûte le placo au m² en 2026 ? Prix d'une cloison, d'un doublage, d'un faux plafond et des finitions, ouvrage par ouvrage.",
    resume: "Cloison, doublage, faux plafond et finitions : les prix que les devis regroupent sous « placo ».",
    lead:
      "« Placo » désigne cinq ouvrages différents, qui n'ont ni le même prix ni le même temps de pose. Un devis qui les regroupe sous une seule ligne est impossible à vérifier. Voici le détail, poste par poste.",
    groupes: [
      {
        titre: "Cloisons : séparer une pièce",
        intro:
          "Une cloison crée une séparation. Son prix dépend de ce qu'on lui demande en plus : résister à l'humidité dans une salle de bain, ou atténuer le bruit entre deux chambres.",
        postes: ["Monter une cloison", "Cloison pièce humide (hydrofuge)", "Cloison anti-bruit (phonique)"],
      },
      {
        titre: "Doublage : habiller un mur existant",
        intro:
          "Doubler un mur, ce n'est pas monter une cloison : on vient plaquer une contre-cloison sur un mur qui existe déjà, souvent pour y loger un isolant ou rattraper un support irrégulier. C'est moins cher au m².",
        postes: ["Doubler un mur"],
      },
      {
        titre: "Plafonds",
        intro:
          "Un faux plafond sert à masquer des réseaux, rattraper une hauteur ou poser des spots. Le plafond décoratif, avec retombées et éclairage intégré, relève d'un autre travail.",
        postes: ["Faux plafond", "Plafond décoratif (spots, retombées)"],
      },
      {
        titre: "Les finitions que les devis oublient",
        intro:
          "C'est le poste découvert en cours de chantier. Poser des plaques ne suffit pas : il faut traiter les joints, puis préparer la surface avant peinture. Un ratissage lourd sur un mur abîmé coûte deux fois plus qu'un ratissage léger.",
        postes: ["Finitions plâtrerie (bandes, enduit)", "Ratissage léger", "Ratissage lourd"],
      },
      {
        titre: "Petits ouvrages",
        intro: "Souvent oubliés au chiffrage, ils s'additionnent vite sur un chantier complet.",
        postes: ["Cacher tuyaux / gaines (coffrage)", "Trappe de visite", "Caisson à galandage (châssis + habillage)"],
      },
    ],
    sections: [
      {
        titre: "Calculer ses m² sans se tromper",
        corps: [
          "La surface à chiffrer est celle des faces posées, pas celle du sol. Une cloison de 3 m de long sous 2,50 m de plafond fait 7,5 m² — et si elle sépare deux pièces qu'on refait toutes les deux, les finitions comptent des deux côtés.",
          "Pour un doublage, on compte la surface du mur habillé. Pour un faux plafond, celle du sol de la pièce. Les ouvertures (porte, fenêtre) se déduisent, mais leurs tableaux se rajoutent en finitions.",
        ],
      },
      {
        titre: "Poser soi-même : ce que ça change",
        corps: [
          "La plâtrerie est l'un des lots où la main-d'œuvre pèse le plus, donc l'un des plus rentables à faire soi-même — si le résultat tient. Un mur mal ratissé se voit à la première lumière rasante, et une reprise coûte plus cher que la pose initiale.",
          "La colonne « fourniture seule » des tableaux ci-dessus donne le prix des matériaux si vous posez vous-même.",
        ],
      },
    ],
    faq: [
      {
        q: "Quel est le prix du placo au m² posé ?",
        a: "Cela dépend de l'ouvrage : monter une cloison, doubler un mur ou poser un faux plafond n'ont pas le même prix au m². Les tableaux ci-dessus donnent chaque poste séparément, en fourni-posé et en fourniture seule.",
      },
      {
        q: "Quelle différence entre une cloison et un doublage ?",
        a: "Une cloison sépare deux espaces et se monte de zéro. Un doublage vient plaquer une contre-cloison sur un mur existant, souvent pour y loger un isolant. Le doublage est moins cher au m² parce qu'il n'a qu'une face à traiter.",
      },
      {
        q: "Les finitions sont-elles comprises dans le prix du placo ?",
        a: "Pas toujours, et c'est la principale source de mauvaise surprise. Poser les plaques, traiter les joints et ratisser la surface avant peinture sont trois opérations distinctes. Vérifiez que votre devis les mentionne.",
      },
      {
        q: "Faut-il une cloison hydrofuge dans une salle de bain ?",
        a: "Oui pour les parois exposées à l'eau. La plaque hydrofuge résiste à l'humidité ambiante ; elle ne remplace pas l'étanchéité sous carrelage autour d'une douche, qui est un autre poste.",
      },
    ],
    liens: [
      { href: "/prix-travaux/peinture-interieure", texte: "prix de la peinture intérieure" },
      { href: "/prix-travaux/amenagement-combles", texte: "aménagement de combles" },
      { href: "/guides/faire-soi-meme-ou-artisan", texte: "faire soi-même ou faire faire" },
      { href: "/guides/verifier-devis-travaux", texte: "vérifier un devis de travaux" },
    ],
  },
  {
    slug: "plomberie",
    lot: "Plomberie",
    h1: "Prix de la plomberie : refaire une installation en 2026",
    title: "Prix plomberie 2026 : refaire toute l'installation",
    description:
      "Combien coûte la plomberie en rénovation ? Le réseau au m², les appareils à l'unité, et ce que recouvre vraiment une ligne de devis.",
    resume: "Le réseau au m² et les appareils à l'unité : les deux prix que les devis mélangent.",
    lead:
      "Un devis de plomberie mélange presque toujours deux choses qui n'ont rien à voir : le réseau, chiffré à la surface du logement, et les appareils, chiffrés à l'unité. Les séparer est le seul moyen de comparer deux devis.",
    groupes: [
      {
        titre: "Le réseau : les tuyaux qu'on ne voit pas",
        intro:
          "Refaire le réseau, c'est reprendre l'alimentation et les évacuations de tout le logement. Le prix se compte au m² habitable, indépendamment du nombre d'appareils installés ensuite.",
        postes: ["Refaire toute la plomberie (réseau, hors appareils)", "Créer / déplacer un point d'eau"],
      },
      {
        titre: "Salle de bain : douche",
        intro:
          "Le poste le plus variable de la salle de bain. Un bac posé et une douche à l'italienne n'ont ni le même prix ni les mêmes contraintes de support et d'étanchéité.",
        postes: ["Bac de douche", "Douche à l'italienne", "Paroi de douche", "Colonne de douche", "Cabine complète (parois + porte)"],
      },
      {
        titre: "Salle de bain : baignoire, vasques et WC",
        intro: "Les appareils courants, avec leur robinetterie. Le prix fourniture seule permet de chiffrer l'achat si vous posez vous-même.",
        postes: ["Installer une baignoire", "Robinetterie baignoire", "Meuble-vasque", "Vasque", "Robinetterie lavabo", "Miroir", "WC"],
      },
      {
        titre: "Produire l'eau chaude",
        intro:
          "Trois solutions, trois logiques : le cumulus stocke, l'instantané chauffe à la demande, le thermodynamique récupère les calories de l'air. Le coût d'usage diffère autant que le prix d'achat.",
        postes: ["Chauffe-eau électrique (cumulus)", "Chauffe-eau électrique instantané", "Chauffe-eau thermodynamique", "Installer un adoucisseur d'eau"],
      },
    ],
    sections: [
      {
        titre: "Ce qui fait grimper la facture : déplacer les évacuations",
        corps: [
          "Changer un appareil de place est rarement un problème côté alimentation : on tire un tuyau. L'évacuation, elle, doit conserver une pente suffisante jusqu'à la colonne. Déplacer un WC ou une douche de quelques mètres peut donc imposer de reprendre le sol, voire de surélever le receveur.",
          "C'est la raison pour laquelle deux salles de bain de même surface peuvent différer du simple au double : ce n'est pas le nombre d'appareils qui compte, c'est leur position par rapport à l'existant.",
        ],
      },
      {
        titre: "La pose seule si vous achetez les appareils",
        corps: [
          "La colonne « fourniture seule » donne le prix des appareils sans la pose. L'écart avec le fourni-posé correspond au travail du plombier.",
          "Attention à un piège fréquent : un appareil acheté par vos soins n'engage pas l'artisan qui le pose sur la qualité du produit, et une fuite due à l'appareil peut échapper à sa garantie. Mieux vaut en parler avant, pas après.",
        ],
      },
    ],
    faq: [
      {
        q: "Combien coûte la réfection complète de la plomberie ?",
        a: "Le réseau se chiffre au m² habitable, hors appareils. Le tableau ci-dessus donne le prix au m² ; les appareils sanitaires s'ajoutent ensuite à l'unité, selon ce que vous installez.",
      },
      {
        q: "Pourquoi séparer le réseau et les appareils dans un devis ?",
        a: "Parce que ce sont deux logiques de prix différentes : le réseau dépend de la surface et de l'état de l'existant, les appareils dépendent de ce que vous choisissez. Un devis qui les regroupe est impossible à comparer avec un autre.",
      },
      {
        q: "Une douche à l'italienne coûte-t-elle plus cher qu'un bac ?",
        a: "Oui, nettement. Elle demande une étanchéité sous carrelage, souvent une reprise du sol pour la pente et l'évacuation, là où un bac se pose sur le support existant. Les deux prix figurent dans le tableau ci-dessus.",
      },
      {
        q: "Quel chauffe-eau choisir entre cumulus et thermodynamique ?",
        a: "Le thermodynamique coûte nettement plus cher à l'achat mais consomme beaucoup moins. Le calcul dépend de votre consommation et de la durée pendant laquelle vous garderez le logement. Certains travaux d'amélioration énergétique relèvent d'un taux de TVA réduit sous conditions : renseignez-vous sur impots.gouv.fr ou auprès de votre installateur.",
      },
      {
        q: "Peut-on faire sa plomberie soi-même ?",
        a: "Une partie seulement. Remplacer un mitigeur ou poser un meuble-vasque reste accessible ; reprendre un réseau, modifier des évacuations ou intervenir sur le gaz ne s'improvisent pas. La plomberie est aussi le lot où la part de main-d'œuvre est plus faible qu'ailleurs : l'économie est donc moins forte qu'on ne l'imagine.",
      },
    ],
    liens: [
      { href: "/prix-travaux/renovation-salle-de-bain", texte: "prix d'une rénovation de salle de bain" },
      { href: "/prix-travaux/douche-italienne", texte: "prix d'une douche à l'italienne" },
      { href: "/prix-travaux/renovation-cuisine", texte: "prix d'une rénovation de cuisine" },
      { href: "/guides/verifier-devis-travaux", texte: "vérifier un devis de travaux" },
    ],
  },
];

export const postePageBySlug = (slug: string): PostePage | undefined =>
  POSTES_PAGES.find((p) => p.slug === slug);
