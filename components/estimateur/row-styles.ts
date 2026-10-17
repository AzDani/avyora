/** CSS des rappels de la ligne de poste (`Row`), pour les deux natures : poste réservé aux pros
 *  (« Pro obligatoire »), poste de structure pris soi-même (« hors garantie décennale », D4) et
 *  mention d'un poste faisable qui demande encore un pro à une étape (PAC, climatisation, borne :
 *  D2) ; l'icône d'information et la note qu'elle déplie (`.ibtn`, `.tinfo` : N11, aussi sur les
 *  sous-titres d'étape et les notes de lot du neuf). Scopé sous `.av-estim` ; injecté par le détaillé
 *  rénovation et le détaillé neuf seulement, pour ne pas alourdir `EST_CSS`, que la fiche projet embarque aussi. */
export const ROW_SOI_CSS = `
.av-estim .pro-oblig{display:inline-flex;align-items:center;max-width:180px;font-size:10.5px;font-weight:600;line-height:1.3;color:var(--muted);background:var(--surface-2);border:1px dashed var(--line-strong);border-radius:8px;padding:4px 8px}
.av-estim .decennale{grid-column:1/-1;margin:6px 0 0 32px;padding:6px 10px;border-radius:8px;background:#fdf1e1;color:#8a5208;font-size:11.5px;line-height:1.45}
.av-estim .mention-soi{grid-column:1/-1;margin:6px 0 0 32px;padding:6px 10px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted);font-size:11.5px;line-height:1.45}
.av-estim .ibtn{display:inline-grid;place-items:center;flex:none;width:22px;height:22px;margin:-3px 0;padding:0;border:0;border-radius:999px;background:none;color:var(--faint);cursor:pointer;vertical-align:middle;transition:color .12s var(--ease),background .12s var(--ease)}
.av-estim .ibtn:hover,.av-estim .ibtn.on{color:var(--brand);background:var(--brand-50)}
.av-estim .ibtn:focus-visible{outline:2px solid var(--accent-600);outline-offset:1px}
.av-estim .tinfo{grid-column:1/-1;margin:4px 0 2px 32px;padding:8px 11px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted);font-size:11.5px;line-height:1.5}
.av-estim .tinfo p{margin:0}
.av-estim .tinfo p+p{margin-top:6px}
/* sur mobile, une cible de 40 px (comme les boutons des compteurs) : la zone de clic déborde de l'icône sans
   pousser la ligne ni couvrir le texte voisin */
@media(max-width:560px){.av-estim .ibtn{position:relative}.av-estim .ibtn::after{content:"";position:absolute;inset:-9px;border-radius:999px}}
`;
