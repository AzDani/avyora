/**
 * CSS du rapide neuf, scopé `.av-neuf`. Il s'ajoute à `RAPIDE_CSS` (cartes finition `.fin`, cartes
 * « qui » `.qcard`, boutons `.seg`, barre live) et au CSS du bilan (`BILAN_NEUF_CSS`, barres de
 * phase, « Pas compris », alerte argile). Porté de `maquettes/neuf/page.html` ; aucun `@import`.
 */
export const NEUF_CSS = `
.av-neuf .sub-q{font-size:12.5px;color:var(--muted);line-height:1.5;margin:-2px 0 12px}
.av-neuf .grp{margin-top:14px}
.av-neuf .grp:first-child{margin-top:0}
/* Intitulés de question et note : --muted (6,25:1) au lieu de --faint (2,99:1), sans toucher RAPIDE_CSS. */
.av-neuf .glbl{color:var(--muted);font-size:11.5px}
.av-neuf .glbl .opt{font-weight:500;letter-spacing:.04em;text-transform:none;color:var(--muted);margin-left:6px}
.av-neuf .intro{color:var(--muted)}
.av-neuf .fields{margin-bottom:14px}
.av-neuf .avert{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#7a4b00;background:#fff7e6;border:1px solid #f6d999;border-radius:var(--radius-card);padding:11px 14px;margin-bottom:18px}
.av-neuf .avert svg{flex:0 0 16px;margin-top:2px}
.av-neuf .plan-ok{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--ink);background:var(--brand-50);border:1px solid var(--brand-200);border-radius:var(--radius-card);padding:11px 14px;margin-bottom:18px}
.av-neuf .plan-ok svg{flex:0 0 16px;margin-top:2px;color:var(--brand)}
.av-neuf .plan-ok ul{margin:6px 0 0;padding-left:16px;color:var(--muted)}
.av-neuf .repris{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;background:var(--brand-50);color:var(--brand);font-size:10.5px;font-weight:600;letter-spacing:0;text-transform:none;vertical-align:1px}
/* Le bilan replié (N13) : une ligne « Le bilan de ta maison », le bilan sombre dessous une fois déplié. */
.av-neuf .pli{margin:6px 0 4px;border:1px solid var(--line-strong);border-radius:var(--radius-panel);background:var(--surface)}
.av-neuf .pli summary{list-style:none;display:flex;align-items:center;gap:12px;min-height:44px;padding:13px 18px;cursor:pointer;border-radius:var(--radius-panel)}
.av-neuf .pli summary::-webkit-details-marker{display:none}
.av-neuf .pli summary:focus-visible{outline:3px solid var(--brand-200);outline-offset:2px}
.av-neuf .pli .pli-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.av-neuf .pli .pli-t b{font-size:14.5px;font-weight:600;color:var(--ink)}
.av-neuf .pli .pli-t span{font-size:12.5px;color:var(--muted);line-height:1.4}
.av-neuf .pli .chev{flex:none;color:var(--brand);transition:transform .15s var(--ease)}
.av-neuf .pli[open] .chev{transform:rotate(180deg)}
.av-neuf .pli .bilan{padding:0 8px 8px}
@media(max-width:560px){.av-neuf .fields{grid-template-columns:1fr}}
/* Surface ramenée aux bornes du rapide (n° 72), note sous les cartes de finition (n° 14, 66). */
.av-neuf .hors{font-size:12.5px;color:#7a4b00;line-height:1.45;margin:6px 0 0}
.av-neuf .hors:empty{display:none}
.av-neuf .fin-note{margin:12px 0 0}
/* Un champ qui prend le focus ne passe pas sous la barre collante (n° 71). */
.av-neuf input{scroll-margin-bottom:180px}
/* Barre live au téléphone (n° 71) : compacte, les deux boutons côte à côte ; sans chiffre, elle ne colle pas. */
@media(max-width:560px){
  .av-neuf-live.attente{position:static}
  .av-neuf-live .in{padding:10px 14px;gap:8px}
  .av-neuf-live .big{font-size:20px}
  .av-neuf-live .btns{width:100%;margin-left:0;flex-wrap:nowrap;gap:6px}
  .av-neuf-live .btns .ghost,.av-neuf-live .btns .cta{flex:1 1 0;min-width:0;padding:8px 10px;font-size:12.5px;line-height:1.25;white-space:normal;text-align:center}
}
`;
