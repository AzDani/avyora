/**
 * Banc d'essai des TESTS (vitest) — inerte sur le site : rien ne le modifie hors de `tests/setup-bareme.ts`.
 *
 * Depuis le 27/11/2026, le barème n'est plus dans le JavaScript public : les écrans chiffrés attendent son
 * installation (`AvecBareme`), et l'estimation rapide attend la réponse du serveur (`useCalculRapide`). Les tests
 * rendent ces écrans d'un seul coup (`renderToStaticMarkup`), sans navigateur ni serveur : le banc leur rend le
 * comportement d'avant, chiffres compris, avec le même moteur.
 *
 * - `renduServeurComplet` : `AvecBareme` rend son contenu dès le rendu serveur si le barème est installé ;
 * - `calculRapide` : `useCalculRapide` calcule sur place (mêmes fonctions que la route `POST /api/estimateur/rapide`).
 */
type Banc = {
  renduServeurComplet: boolean;
  calculRapide: ((entree: unknown, droits: { compte: boolean; pro: boolean }) => unknown) | null;
};
/* Sur l'objet global : un test qui recharge ses modules (`vi.resetModules`) garde le même banc. */
const g = globalThis as { __avyoraBanc?: Banc };
export const BANC: Banc = (g.__avyoraBanc ??= { renduServeurComplet: false, calculRapide: null });
