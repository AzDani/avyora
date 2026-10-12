/**
 * CSS du détaillé neuf (Pro), scopé `.av-neuf-d`. Il s'ajoute à `EST_CSS` (l'estimateur détaillé de
 * la rénovation : cartes, lignes `Row`, lignes perso, barre live, phases repliables `.phase-t`) sans
 * le modifier. Questionnaire en `<details>`, pastilles, « Le moteur en déduit », jalons de phase,
 * badges « Démarche » et « % des travaux », étiquette « Pro obligatoire » et avertissement « hors
 * garantie décennale » des lignes, ligne « Nouveaux postes cochés » et confirmation de « Tout passer
 * en… » (`.nv`, N3). Porté de `maquettes/neuf/page.html` ; aucun `@import`.
 */
export const NEUF_DETAIL_CSS = `
.av-neuf-d .grp{border:1px solid var(--line);border-radius:var(--radius-field);background:var(--surface-2);padding:10px 14px;margin-top:10px}
.av-neuf-d .grp>summary{list-style:none;cursor:pointer;font-weight:600;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:36px}
.av-neuf-d .grp>summary::-webkit-details-marker{display:none}
.av-neuf-d .grp>summary .chev{flex:none;transition:transform .15s var(--ease);color:var(--faint)}
.av-neuf-d .grp[open]>summary .chev{transform:rotate(180deg)}
.av-neuf-d .q{padding:11px 0;border-top:1px solid var(--line)}
.av-neuf-d .q:first-of-type{border-top:0}
.av-neuf-d .ql{display:block;font-weight:500;font-size:13px;margin-bottom:8px;color:var(--ink)}
.av-neuf-d .ql .hint{font-weight:400;color:var(--faint);font-size:11.5px;margin-left:6px}
.av-neuf-d .pills{display:flex;flex-wrap:wrap;gap:6px}
.av-neuf-d .pill{font-family:var(--font-geist-sans),system-ui,sans-serif;border:1px solid var(--line-strong);background:var(--surface);border-radius:999px;padding:8px 13px;min-height:38px;cursor:pointer;font-size:13px;line-height:1.2;color:var(--ink);transition:background .12s,border-color .12s}
.av-neuf-d .pill:hover:not(:disabled){border-color:var(--brand)}
.av-neuf-d .pill[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
.av-neuf-d .pill:disabled{opacity:.4;cursor:not-allowed}
.av-neuf-d .pill:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px}
.av-neuf-d .rowflex{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.av-neuf-d .cpin{width:120px;font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:14px;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:9px 11px;min-height:40px;outline:none}
.av-neuf-d .cpin:focus{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-neuf-d .zone{font-size:12px;color:var(--faint)}
.av-neuf-d .deduit{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:14px;padding:12px 14px;border-radius:var(--radius-field);background:var(--brand-50);font-size:12.5px;color:var(--muted)}
.av-neuf-d .deduit b{color:var(--ink);font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:600}
.av-neuf-d .tools{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px 12px;margin:10px 2px 0}
.av-neuf-d .only{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);cursor:pointer;min-height:40px}
.av-neuf-d .only input{width:18px;height:18px;accent-color:var(--brand)}
.av-neuf-d .linkbtn{background:none;border:0;color:var(--brand-700);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;min-height:40px;padding:0 4px}
.av-neuf-d .nv{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:12px 0 0;padding:10px 14px;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--surface)}
.av-neuf-d .nv-l{font-size:13px;font-weight:600;color:var(--ink)}
.av-neuf-d .nv-seg{display:inline-flex;gap:3px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:999px;padding:3px}
.av-neuf-d .nv-seg button{border:0;background:none;cursor:pointer;font-family:var(--font-geist-sans),system-ui,sans-serif;font-weight:600;font-size:12.5px;color:var(--muted);padding:6px 13px;min-height:34px;border-radius:999px;transition:background .12s,color .12s}
.av-neuf-d .nv-seg button:hover{color:var(--brand-700)}
.av-neuf-d .nv-seg button[aria-pressed="true"]{background:var(--brand);color:#fff}
.av-neuf-d .nv button:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px}
.av-neuf-d .nv-tout{margin-left:auto}
.av-neuf-d .nv-aide{flex-basis:100%;margin:0;font-size:11.5px;color:var(--faint);line-height:1.45}
.av-neuf-d .nv-conf{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 12px;border-radius:8px;background:#fdf1e1;color:#8a5208;font-size:12.5px;line-height:1.45}
.av-neuf-d .nv-q{font-weight:600}
.av-neuf-d .nv-conf .nv-seg{background:var(--surface)}
.av-neuf-d .nv-eff{flex-basis:100%;margin:0}
.av-neuf-d .nv-act{display:flex;gap:8px;margin-left:auto}
.av-neuf-d .nv-act button{font-family:var(--font-geist-sans),system-ui,sans-serif;font-size:12.5px;font-weight:600;border-radius:999px;padding:6px 14px;min-height:34px;cursor:pointer}
.av-neuf-d .nv-ok{background:var(--brand);border:1px solid var(--brand);color:#fff}
.av-neuf-d .nv-non{background:var(--surface);border:1px solid var(--line-strong);color:var(--ink)}
.av-neuf-d .phase-t{min-height:44px}
.av-neuf-d .phase-t .pt-num{font-family:var(--font-geist-mono),ui-monospace,monospace;letter-spacing:0}
.av-neuf-d .pjal{display:flex;gap:7px;align-items:flex-start;font-size:11.5px;color:var(--muted);padding:2px 2px 10px 36px;line-height:1.45}
.av-neuf-d .pjal svg{flex:0 0 13px;margin-top:2px;color:var(--accent-600)}
.av-neuf-d .pjal b{color:var(--ink);font-weight:600}
.av-neuf-d .pvide{font-size:12.5px;color:var(--faint);padding:2px 2px 12px 36px}
.av-neuf-d .acc-h{min-height:48px}
.av-neuf-d .lotnote{font-size:11.5px;color:var(--faint);padding:8px 0 2px;line-height:1.45}
.av-neuf-d .badge-dem{display:inline-block;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:#fdf1e1;color:#b06d10;white-space:nowrap}
.av-neuf-d .badge-pct{display:inline-block;font-size:11px;font-weight:600;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}
.av-neuf-d .pro-oblig{display:inline-flex;align-items:center;max-width:180px;font-size:10.5px;font-weight:600;line-height:1.3;color:var(--muted);background:var(--surface-2);border:1px dashed var(--line-strong);border-radius:8px;padding:4px 8px}
.av-neuf-d .decennale{grid-column:1/-1;margin:6px 0 0 32px;padding:6px 10px;border-radius:8px;background:#fdf1e1;color:#8a5208;font-size:11.5px;line-height:1.45}
.av-neuf-d .split-n{position:relative;z-index:1;margin-top:10px;font-size:12px;color:#c9c5ee;line-height:1.5}
.av-neuf-d .split-n b{color:#fff;font-weight:600;font-family:var(--font-geist-mono),ui-monospace,monospace;white-space:nowrap}
.av-neuf-d .dtl .dem{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:#fdf1e1;color:#b06d10;white-space:nowrap}
.av-neuf-live .m2{font-size:11.5px;color:#c9c5ee;margin-top:5px;font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums}
@media(max-width:560px){
.av-neuf-d .pjal,.av-neuf-d .pvide{padding-left:4px}
.av-neuf-d .decennale{margin-left:0}
.av-neuf-d .pill{min-height:44px}
.av-neuf-d .nv-seg button,.av-neuf-d .nv-act button,.av-neuf-d .nv-tout{min-height:44px}
.av-neuf-d .nv-tout{margin-left:0}
/* les postes du neuf ont de longues notes : sur mobile, les commandes passent sous le libellé */
.av-neuf-d .trow{grid-template-columns:22px minmax(0,1fr)}
.av-neuf-d .trow .tctl{grid-column:2/-1;justify-content:flex-start}
.av-neuf-d .views button{min-height:44px}
.av-neuf-live .cta,.av-neuf-live .save{min-height:44px}
.av-neuf-live .totb{flex-wrap:wrap;row-gap:2px}
.av-neuf-live .m2{flex-basis:100%;margin-top:0}
}
`;
