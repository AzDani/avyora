/**
 * Villes pour les pages SEO « Prix rénovation à [ville] ».
 * Le code postal (cp) sert au coefficient régional du moteur → chaque page a des prix réels et
 * distincts. Sélection couvrant toutes les zones tarifaires (Paris, zones tendues, grandes agglos,
 * national, Corse) pour un contenu unique par page.
 */
export type Ville = { slug: string; nom: string; cp: string };

export const VILLES: Ville[] = [
  { slug: "paris", nom: "Paris", cp: "75001" },
  { slug: "marseille", nom: "Marseille", cp: "13001" },
  { slug: "lyon", nom: "Lyon", cp: "69001" },
  { slug: "toulouse", nom: "Toulouse", cp: "31000" },
  { slug: "nice", nom: "Nice", cp: "06000" },
  { slug: "nantes", nom: "Nantes", cp: "44000" },
  { slug: "montpellier", nom: "Montpellier", cp: "34000" },
  { slug: "strasbourg", nom: "Strasbourg", cp: "67000" },
  { slug: "bordeaux", nom: "Bordeaux", cp: "33000" },
  { slug: "lille", nom: "Lille", cp: "59000" },
  { slug: "rennes", nom: "Rennes", cp: "35000" },
  { slug: "reims", nom: "Reims", cp: "51100" },
  { slug: "toulon", nom: "Toulon", cp: "83000" },
  { slug: "grenoble", nom: "Grenoble", cp: "38000" },
  { slug: "dijon", nom: "Dijon", cp: "21000" },
  { slug: "angers", nom: "Angers", cp: "49000" },
  { slug: "nimes", nom: "Nîmes", cp: "30000" },
  { slug: "aix-en-provence", nom: "Aix-en-Provence", cp: "13100" },
  { slug: "clermont-ferrand", nom: "Clermont-Ferrand", cp: "63000" },
  { slug: "le-havre", nom: "Le Havre", cp: "76600" },
  { slug: "rouen", nom: "Rouen", cp: "76000" },
  { slug: "nancy", nom: "Nancy", cp: "54000" },
  { slug: "annecy", nom: "Annecy", cp: "74000" },
  { slug: "versailles", nom: "Versailles", cp: "78000" },
  { slug: "ajaccio", nom: "Ajaccio", cp: "20000" },
];

export function villeBySlug(slug: string): Ville | undefined {
  return VILLES.find((v) => v.slug === slug);
}
