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
.av-estim .trow.retouche{box-shadow:inset 3px 0 0 #a78bfa;padding-left:8px;margin-left:-8px}
.av-estim .tvachip{display:inline-flex;align-items:center;gap:4px;flex:none;font:inherit;font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong,#cfd2e3);border-radius:999px;padding:3px 8px;cursor:pointer}
.av-estim .tvachip .tvaauto{font-weight:500;color:var(--faint)}
.av-estim .tvachip.force{border-color:#a78bfa;background:#f2efff;color:#3730a3}
.av-estim .tvachip.force .tvaauto{color:#3730a3}
.av-estim .tvachip:focus-visible,.av-estim .ttva button:focus-visible{outline:2px solid var(--accent-600);outline-offset:1px}
.av-estim .ttva{grid-column:1/-1;margin:6px 0 2px 32px;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px dashed var(--line-strong,#cfd2e3);display:grid;gap:8px;font-size:12px;color:var(--muted)}
.av-estim .ttva .tt-l{font-size:11.5px;font-weight:600;color:var(--ink)}
.av-estim .ttva .tt-taux{display:flex;flex-wrap:wrap;gap:6px}
.av-estim .ttva .tt-taux button,.av-estim .ttva .tt-seg button{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line-strong,#cfd2e3);background:var(--surface);color:var(--ink);border-radius:8px;padding:5px 9px;cursor:pointer}
.av-estim .ttva .tt-taux button[aria-pressed="true"],.av-estim .ttva .tt-seg button[aria-pressed="true"]{border-color:var(--brand);background:var(--brand-50);color:var(--brand)}
.av-estim .ttva .tt-aide{margin:0;line-height:1.45}
.av-estim .ttva .tt-alerte{margin:0;padding:7px 10px;border-radius:8px;background:#fdf1e1;color:#8a5208;line-height:1.45}
.av-estim .ttva .tt-alerte.ok{background:#e6f7f0;color:#0b7a52}
.av-estim .ttva .tt-prix{display:grid;gap:6px}
.av-estim .ttva .tt-p{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:var(--ink)}
.av-estim .ttva .tt-seg{display:inline-flex;gap:3px}
.av-estim .ttva .tt-seg button{padding:3px 8px;font-size:11px}
.av-estim .ttva .tt-pied{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 12px}
.av-estim .ttva .tt-act{display:flex;gap:12px}
.av-estim .ttva .tt-lien{font:inherit;font-size:12px;font-weight:600;border:0;background:none;padding:2px 0;color:var(--brand);cursor:pointer}
@media (max-width:640px){.av-estim .ttva{margin-left:0}}
`;
