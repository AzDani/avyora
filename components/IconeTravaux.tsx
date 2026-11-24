/**
 * L'icône de chaque type de travaux (pages de prix, 24/11/2026) : un trait simple dans le violet du site, à la place
 * des émojis. Un type inconnu prend la maison.
 */
const TRACES: Record<string, string> = {
  "renovation-salle-de-bain": "M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M6 12V6a2 2 0 0 1 4 0 M7 19l-1 2 M17 19l1 2",
  "renovation-cuisine": "M4 10h16v10H4z M4 14h16 M8 5v2 M12 4v3 M16 5v2",
  "renovation-chambre": "M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6 M3 15h18 M6 9V6h5v3",
  "refaire-toiture": "M3 12 12 4l9 8 M5 10v10h14V10 M9 20v-5h6v5",
  "ravalement-facade": "M4 21V4h16v17 M8 8h2 M14 8h2 M8 12h2 M14 12h2 M10 21v-4h4v4",
  "isolation-combles": "M3 11 12 4l9 7 M6 13h12 M6 16h12 M6 19h12",
  "renovation-electrique": "M13 2 4 14h7l-1 8 9-12h-7z",
  "peinture-interieure": "M4 3h14v6H4z M18 6h2v5h-8v3 M11 14h2v7h-2z",
  "remplacer-baignoire-par-douche": "M5 21V7a4 4 0 0 1 7-2.6 M10 6h5 M11 10l-1 2 M14 10v2 M17 10l1 2 M11 15l-1 2 M14 15v2 M17 15l1 2",
  "douche-italienne": "M5 21V7a4 4 0 0 1 7-2.6 M10 6h5 M11 10l-1 2 M14 10v2 M17 10l1 2 M11 15l-1 2 M14 15v2 M17 15l1 2",
  "amenagement-combles": "M3 20 12 4l9 16z M10 14h4v6h-4z",
  "remplacement-fenetres": "M5 3h14v18H5z M12 3v18 M5 12h14",
  "pose-carrelage": "M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z",
  "pose-parquet": "M3 5h18 M3 10h18 M3 15h18 M3 20h18 M8 5v5 M15 10v5 M6 15v5 M17 15v5",
  "pompe-a-chaleur": "M3 6h18v12H3z M7 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M17 9v6",
  "poele-a-bois": "M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 1.5 1.5 2.5 3 2.5 0-2-1-4 0-7z",
};
const MAISON = "M3 11 12 4l9 7 M5 10v10h14V10";

export default function IconeTravaux({ slug, taille = 22 }: { slug: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRACES[slug] ?? MAISON} />
    </svg>
  );
}
