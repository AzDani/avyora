/** CSS des rappels de la ligne de poste (`Row`), pour les deux natures : poste réservé aux pros
 *  (« Pro obligatoire »), poste de structure pris soi-même (« hors garantie décennale », D4) et
 *  mention d'un poste faisable qui demande encore un pro à une étape (PAC, climatisation, borne :
 *  D2). Scopé sous `.av-estim` ; injecté par le détaillé rénovation et le détaillé neuf seulement,
 *  pour ne pas alourdir `EST_CSS`, que la fiche projet embarque aussi. */
export const ROW_SOI_CSS = `
.av-estim .pro-oblig{display:inline-flex;align-items:center;max-width:180px;font-size:10.5px;font-weight:600;line-height:1.3;color:var(--muted);background:var(--surface-2);border:1px dashed var(--line-strong);border-radius:8px;padding:4px 8px}
.av-estim .decennale{grid-column:1/-1;margin:6px 0 0 32px;padding:6px 10px;border-radius:8px;background:#fdf1e1;color:#8a5208;font-size:11.5px;line-height:1.45}
.av-estim .mention-soi{grid-column:1/-1;margin:6px 0 0 32px;padding:6px 10px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted);font-size:11.5px;line-height:1.45}
`;
