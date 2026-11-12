/**
 * Le rendu d'un estimateur SANS la visite guidée (`components/visite/VisiteGuidee.tsx`) : la rangée du bouton
 * « ? Visite guidée » et les attributs `data-visite` (les cibles des bulles) retirés. Les témoins et les tests de
 * forme des estimateurs restent ainsi ceux d'avant la visite : elle n'ajoute rien d'autre au formulaire, ce que
 * `tests/visite-guidee.test.ts` vérifie de son côté (pas de fichier de test : n'est importé que par les tests).
 */
export const sansVisite = (html: string) =>
  html.replace(/<div class="av-visite-barre">[\s\S]*?<\/button><\/div>/g, "").replace(/ data-visite="[^"]*"/g, "");
