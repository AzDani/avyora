/** CSS des briques du questionnaire propres aux deux détaillés (A7) : le champ en faute à
 *  l'enregistrement (« Enregistrer » sans code postal, `useChampEnFaute`) et la case de la grille qui se
 *  lit sans se régler (`CompteurFixe` : les niveaux du neuf). Scopé sous `.av-estim` ; injecté par le
 *  détaillé rénovation et le détaillé neuf seulement, pour ne pas alourdir `EST_CSS`, que la fiche
 *  projet embarque aussi (comme `ROW_SOI_CSS`). */
export const INTAKE_CSS = `
.av-estim .uinp:has(input[aria-invalid="true"]){border-color:var(--danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 15%,transparent)}
.av-estim .stp.fixe .c{justify-content:center;width:86px;height:32px;background:transparent;border-color:var(--line)}
.av-estim .stp.fixe .v{color:var(--muted)}
@media(max-width:560px){.av-estim .stp.fixe .c{width:108px;height:42px}}
`;
