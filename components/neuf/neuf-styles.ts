/**
 * CSS du rapide neuf, scopé `.av-neuf`. Il s'ajoute à `RAPIDE_CSS` (cartes finition `.fin`, cartes
 * « qui » `.qcard`, boutons `.seg`, barre live) et au CSS du bilan (`BILAN_NEUF_CSS`, barres de
 * phase, « Pas compris », alerte argile). Porté de `maquettes/neuf/page.html` ; aucun `@import`.
 */
export const NEUF_CSS = `
.av-neuf .sub-q{font-size:12.5px;color:var(--muted);line-height:1.5;margin:-2px 0 12px}
.av-neuf .grp{margin-top:14px}
.av-neuf .grp:first-child{margin-top:0}
.av-neuf .glbl .opt{font-weight:500;letter-spacing:.04em;text-transform:none;color:var(--faint);margin-left:6px}
.av-neuf .seg button{min-height:44px}
.av-neuf .fields{margin-bottom:14px}
.av-neuf .fld input{min-height:44px}
.av-neuf .av-step.block{height:46px}
.av-neuf .avert{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#7a4b00;background:#fff7e6;border:1px solid #f6d999;border-radius:var(--radius-card);padding:11px 14px;margin-bottom:18px}
.av-neuf .avert svg{flex:0 0 16px;margin-top:2px}
.av-neuf .bilan{margin:6px 0 4px}
.av-neuf .attente{border:1px dashed var(--line-strong);border-radius:var(--radius-panel);padding:22px;text-align:center;font-size:13.5px;color:var(--faint);background:var(--surface)}
@media(max-width:560px){.av-neuf .fields{grid-template-columns:1fr}}
.av-neuf-live .cta,.av-neuf-live .ghost{min-height:44px}
`;
