/**
 * CSS du détaillé neuf (Pro), scopé `.av-neuf-d`. Il s'ajoute à `EST_CSS` (l'estimateur détaillé de
 * la rénovation : cartes, questionnaire « Parle-nous du bien », lignes `Row`, lignes perso, barre
 * live, phases repliables `.phase-t`) sans le modifier. Le questionnaire est celui de la rénovation
 * (N9) : ici, ce qui n'appartient qu'au neuf — le type et la forme sur une rangée (`.typef`), la
 * hauteur en lecture seule (`.ro`), les choix techniques repliés derrière leur ligne de résumé
 * (`.tech`). Le champ en faute (`aria-invalid`) et la case « Niveaux » en lecture seule sont ceux de
 * la rénovation (`INTAKE_CSS`, A7). Puis jalons de phase, badges « Démarche » et « % des travaux »,
 * étiquette « Pro obligatoire » et avertissement « hors garantie décennale » des lignes, ligne
 * « Nouveaux postes cochés » et confirmation de « Tout passer en… » (`.nv`, N3). Porté de
 * `maquettes/neuf/page.html` ; aucun `@import`. Les outils de la liste (`.tools`), les vues et les
 * boutons de la barre live en 44 px sont dans `EST_CSS` (N6, partagés).
 */
export const NEUF_DETAIL_CSS = `
.av-neuf-d .typef{display:flex;flex-wrap:wrap;align-items:center;gap:10px 26px}
.av-neuf-d .typef-g{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px}
.av-neuf-d .typef-l{font-size:11.5px;font-weight:500;color:var(--muted)}
/* les surfaces (et la distance aux réseaux) remplissent leur colonne, comme celles de la rénovation ; « Budget
   & imprévus » garde la largeur du champ, comme en rénovation (A7) */
.av-neuf-d .surf .fld>.av-step.field,.av-neuf-d .tq .fld>.av-step.field{display:flex}
.av-neuf-d .gl+.locnote{padding-top:0}
.av-neuf-d .ro{display:flex;align-items:center;height:38px;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--surface-2);padding:0 11px;color:var(--muted)}
.av-neuf-d .ro .num{flex:1;font-size:14px;font-weight:600}
.av-neuf-d .ro .u{font-size:12px;color:var(--faint);font-weight:600;padding-left:8px}
.av-neuf-d .tech{border:1px solid var(--line);border-radius:var(--radius-field);background:var(--surface-2);padding:4px 6px 4px 14px}
.av-neuf-d .tech.open{background:var(--surface);border-color:var(--brand-200);padding-bottom:14px}
.av-neuf-d .tech-r{display:flex;align-items:center;gap:6px 12px}
.av-neuf-d .tech-res{flex:1;margin:0;padding:6px 0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.av-neuf-d .tech-btn{flex:none;align-self:center}
.av-neuf-d .tech-btn:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px;border-radius:6px}
.av-neuf-d .tg{margin-top:12px;padding-right:8px}
.av-neuf-d .tg-t{font-size:12px;font-weight:600;color:var(--ink);padding:8px 0 10px;border-top:1px solid var(--line)}
.av-neuf-d .techg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));grid-auto-flow:row dense;gap:14px 22px}
.av-neuf-d .tq{min-width:0}
.av-neuf-d .tq.large{grid-column:1/-1}
.av-neuf-d .tq-l{font-size:11.5px;color:var(--muted);margin-bottom:6px;font-weight:500}
.av-neuf-d .tq-l small{display:block;font-size:10.5px;color:var(--faint);font-weight:400;margin-top:1px}
.av-neuf-d .tq .segf button{line-height:1.25}
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
.av-neuf-d .split-n{position:relative;z-index:1;margin-top:10px;font-size:12px;color:#c9c5ee;line-height:1.5}
.av-neuf-d .split-n b{color:#fff;font-weight:600;font-family:var(--font-geist-mono),ui-monospace,monospace;white-space:nowrap}
.av-neuf-d .dtl .dem{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:#fdf1e1;color:#b06d10;white-space:nowrap}
.av-neuf-live .m2{font-size:11.5px;color:#c9c5ee;margin-top:5px;font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums}
.av-neuf-live .m2-c{display:none}
/* le prix au m² passe sur deux lignes plutôt que de pousser les boutons sous le total (anglais, A7) */
.av-neuf-live .totb{max-width:400px}
.av-neuf-live .m2-f{white-space:nowrap}
@media(max-width:560px){
.av-neuf-d .pjal,.av-neuf-d .pvide{padding-left:4px}
.av-neuf-d .decennale,.av-neuf-d .mention-soi{margin-left:0}
.av-neuf-d .tech{padding-left:12px}
.av-neuf-d .tech-r{flex-wrap:wrap}
.av-neuf-d .tech-btn{min-height:44px}
.av-neuf-d .nv-seg button,.av-neuf-d .nv-act button,.av-neuf-d .nv-tout{min-height:44px}
.av-neuf-d .nv-tout{margin-left:0}
/* les postes du neuf ont de longues notes : sur mobile, les commandes passent sous le libellé */
.av-neuf-d .trow{grid-template-columns:22px minmax(0,1fr)}
.av-neuf-d .trow .tctl{grid-column:2/-1;justify-content:flex-start}
/* barre live : la hauteur de la rénovation (A7). Le prix au m², court, au bout de la ligne du total s'il y
   tient ; sinon il passe à la ligne suivante, masquée (22 px : la ligne du total de la rénovation). Les
   frais hors TVA restent sur ordinateur et dans « Mon devis » */
.av-neuf-live .totb{max-width:none;flex-wrap:wrap;max-height:22px;overflow:hidden}
.av-neuf-live .m2{margin:0 0 0 auto;font-size:10.5px;line-height:15px;white-space:nowrap}
.av-neuf-live .m2-l,.av-neuf-live .m2-f{display:none}
.av-neuf-live .m2-c{display:inline}
}
`;
