/**
 * CSS de l'estimateur, scopé sous `.av-estim` (porté de la maquette avyora-estimateur).
 * Polices : Geist / Geist Mono déjà chargées par le site (next/font) → var(--font-geist-*),
 * PAS de @import Google Fonts (bloqué par la CSP du site). Palette alignée sur globals.css.
 */
export const EST_CSS = `
.av-estim{
  --canvas:#f5f6fb;--surface:#ffffff;--surface-2:#f8f9fd;--ink:#15172b;--muted:#565a75;--faint:#898ea8;
  --line:#e9eaf3;--line-strong:#dcdeec;
  --brand:#4f46e5;--brand-700:#4338ca;--brand-50:#eef1ff;--brand-100:#e0e4ff;--brand-200:#c7ccfe;--danger:#e0434b;
  --accent-300:#c4b5fd;--accent-400:#a78bfa;--accent-600:#7c3aed;
  --nuit:#1E1B4B;--nuit-2:#241f5e;--nuit-3:#191640;
  --ok:#0f9d6b;--ok-soft:#e6f6ef;
  --radius-field:.7rem;--radius-card:1.15rem;--radius-panel:1.5rem;
  --shadow-sm:0 1px 3px rgba(21,23,43,.06),0 1px 2px rgba(21,23,43,.04);
  --shadow-card:0 1px 3px rgba(30,27,75,.05),0 10px 26px -12px rgba(30,27,75,.14);
  --shadow-lift:0 16px 40px -14px rgba(79,70,229,.30);
  --shadow-hero:0 32px 74px -28px rgba(30,27,75,.58);
  --ease:cubic-bezier(.22,.72,.2,1);
  color:var(--ink);font-family:var(--font-geist-sans),system-ui,sans-serif;line-height:1.5;
}
.av-estim *{box-sizing:border-box}
.av-estim .num,.av-estim .data{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.av-estim h2,.av-estim h3{font-family:var(--font-geist-sans),system-ui,sans-serif;font-weight:600;margin:0;letter-spacing:-.021em}

.av-estim .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-card);padding:20px;box-shadow:var(--shadow-card);margin-bottom:16px}
.av-estim .card h2{font-size:15px;font-weight:600;margin-bottom:3px;color:var(--ink)}
.av-estim .eyebrow{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.15em;color:var(--brand);margin-bottom:6px}
.av-estim .sub{font-size:12.5px;color:var(--muted);margin-bottom:16px}
.av-estim .depart{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.av-estim .fld label{display:block;font-size:11.5px;color:var(--muted);margin-bottom:5px;font-weight:500}
.av-estim .fld input,.av-estim .fld select{width:100%;font-family:var(--font-geist-sans);font-size:14px;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:9px 11px;outline:none;transition:border-color .15s,box-shadow .15s}
.av-estim .fld input:focus,.av-estim .fld select:focus{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-estim .segf{display:flex;gap:5px}
.av-estim .segf button{flex:1;font-family:var(--font-geist-sans);font-size:12px;font-weight:600;border:1px solid var(--line-strong);background:var(--surface);color:var(--muted);padding:8px 4px;border-radius:var(--radius-field);cursor:pointer;transition:.15s var(--ease)}
.av-estim .segf button.on{background:var(--brand);border-color:var(--brand);color:#fff}
.av-estim .recap{margin-top:16px;background:linear-gradient(135deg,rgba(79,70,229,.06),rgba(167,139,250,.09));border:1px solid var(--line);border-radius:var(--radius-field);padding:11px 14px;font-size:12.5px;color:var(--ink);line-height:1.6}
.av-estim .recap b{color:var(--brand);font-weight:600}
.av-estim .intro{margin:0 2px 4px;font-size:12.5px;color:var(--muted)}
.av-estim .intro b{color:var(--ink);font-weight:600}

.av-estim .phase-t{display:flex;align-items:center;gap:8px;width:100%;font-family:inherit;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:600;margin:20px 0 4px;padding:8px 2px;background:none;border:0;border-bottom:1px solid var(--line);cursor:pointer;text-align:left}
.av-estim .phase-t .chev{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);color:var(--muted);transform:rotate(-90deg);transition:transform .2s var(--ease),background .15s,border-color .15s,color .15s}
.av-estim .phase-t.open .chev{transform:rotate(0deg);background:var(--surface);color:var(--muted)}
.av-estim .phase-t:not(.open) .chev{background:rgba(79,70,229,.1);border-color:rgba(79,70,229,.3);color:var(--brand)}
.av-estim .phase-t:hover .chev{border-color:var(--brand);color:var(--brand)}
.av-estim .phase-t .pt-lbl{flex:1;min-width:0}
.av-estim .phase-t .pt-meta{font-family:var(--font-geist-mono),monospace;letter-spacing:0;text-transform:none;color:var(--faint);font-weight:500;font-size:11px}
.av-estim .phase-t:hover .pt-lbl{text-decoration:underline}
.av-estim .acc{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-card);box-shadow:var(--shadow-sm);margin-bottom:10px;overflow:hidden;transition:border-color .2s var(--ease)}
.av-estim .acc.open{border-color:var(--brand-200)}
.av-estim .acc-h{display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;user-select:none}
.av-estim .acc-h .ic{font-size:16px}
.av-estim .acc-h .nm{font-weight:600;font-size:14px;flex:1}
.av-estim .acc-h .cnt{font-size:11.5px;color:var(--brand);font-weight:600;background:var(--brand-50);padding:2px 9px;border-radius:999px;margin-right:6px}
.av-estim .acc-h .amt{font-size:13px;font-weight:600;margin-right:8px}
.av-estim .acc-h .car{color:var(--faint);transition:.2s var(--ease)}
.av-estim .acc.open .car{transform:rotate(90deg);color:var(--brand)}
.av-estim .acc-b{padding:2px 18px 12px;border-top:1px solid var(--line)}
.av-estim .locnote{font-size:11.5px;color:var(--faint);padding:8px 0 2px}
.av-estim .trow{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
.av-estim .trow:last-child{border-bottom:0}
.av-estim .cbx{width:20px;height:20px;border:2px solid var(--line-strong);border-radius:6px;cursor:pointer;display:grid;place-items:center;transition:.12s var(--ease);background:none;padding:0}
.av-estim .cbx.on{background:var(--brand);border-color:var(--brand)}
.av-estim .cbx.on::after{content:"✓";color:#fff;font-size:12px;font-weight:700}
.av-estim .tn{font-size:13px}
.av-estim .tn .pu{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--faint);margin-top:2px}
.av-estim .puval{cursor:pointer;border-radius:5px;padding:1px 4px;border:1px dashed transparent;transition:.12s var(--ease)}
.av-estim .puval:hover{border-color:var(--line-strong);background:var(--surface-2)}
.av-estim .pu.edited .puval{color:var(--brand-700);font-weight:600;font-family:var(--font-geist-mono),monospace;border-color:transparent;background:none}
.av-estim .pubadge{font-size:9.5px;font-weight:600;color:var(--brand-700);background:var(--brand-50);border-radius:999px;padding:1px 6px}
.av-estim .pureset{border:0;background:none;cursor:pointer;color:var(--faint);font-size:12px;line-height:1;padding:1px 3px;border-radius:5px}
.av-estim .pureset:hover{color:var(--brand);background:var(--brand-50)}
.av-estim .puin{width:74px;font-family:var(--font-geist-mono),monospace;font-size:11px;border:1.5px solid var(--brand);border-radius:6px;padding:1px 5px;outline:none;background:var(--surface)}
.av-estim .punote{color:var(--faint)}
.av-estim .tctl{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.av-estim .qty{width:66px;font-family:var(--font-geist-mono);font-size:13px;text-align:right;background:var(--surface);border:1px solid var(--line-strong);border-radius:8px;padding:6px 8px;outline:none;color:var(--ink)}
.av-estim .qty:focus{border-color:var(--brand)}
.av-estim .qauto{width:66px;font-family:var(--font-geist-mono);font-size:13px;text-align:right;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
.av-estim .unit{font-size:11px;color:var(--muted);min-width:30px}
.av-estim .swiwrap{display:inline-flex;align-items:center;gap:6px}
.av-estim .swi{position:relative;width:34px;height:20px;border-radius:999px;background:var(--line-strong);cursor:pointer;transition:background .18s var(--ease);flex:0 0 auto;border:0;padding:0}
.av-estim .swi.on{background:var(--brand)}
.av-estim .swi .knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.28);transition:left .18s var(--ease)}
.av-estim .swi.on .knob{left:16px}
.av-estim .swilbl{font-size:10px;font-weight:600;color:var(--faint);min-width:36px;user-select:none}
.av-estim .swilbl.on{color:var(--brand)}
.av-estim .choice{display:flex;gap:6px}
.av-estim .ch{font-family:var(--font-geist-sans);font-size:10px;font-weight:600;border:1px solid var(--line-strong);border-radius:8px;padding:4px 8px;cursor:pointer;color:var(--muted);background:var(--surface);display:flex;flex-direction:column;align-items:center;line-height:1.3;min-width:64px;transition:.14s var(--ease)}
.av-estim .ch b{font-family:var(--font-geist-mono);font-size:11px;font-weight:700}
.av-estim .ch.onA{background:var(--brand);border-color:var(--brand);color:#fff}
.av-estim .ch.onS{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
.av-estim .ch.edited{box-shadow:0 0 0 1.5px var(--brand-200)}
.av-estim .chin{width:52px;font-family:var(--font-geist-mono),monospace;font-size:11px;font-weight:700;border:1.5px solid var(--brand);border-radius:5px;padding:0 3px;outline:none;text-align:center;margin-top:1px;background:var(--surface);color:var(--ink)}
.av-estim .chreset{cursor:pointer;color:var(--faint);font-size:11px;line-height:1;margin-top:2px}
.av-estim .chreset:hover{color:var(--brand)}
.av-estim .drtoggle{margin-top:10px;display:inline-flex;align-items:center;gap:8px;font-family:var(--font-geist-sans);font-size:12.5px;font-weight:600;color:var(--muted);background:var(--surface);border:1px solid var(--line-strong);border-radius:999px;padding:8px 14px;cursor:pointer}
.av-estim .drtoggle .dot{width:16px;height:16px;border-radius:5px;border:2px solid var(--line-strong)}
.av-estim .drtoggle.on{color:var(--brand-700);border-color:var(--brand-200);background:var(--brand-50)}
.av-estim .drtoggle.on .dot{background:var(--brand);border-color:var(--brand)}
.av-estim .suitetotal{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#1E1B4B;color:#fff;border-radius:12px;padding:12px 16px;font-size:13px}
.av-estim .suitetotal b{font-family:var(--font-geist-mono),monospace;font-size:18px;font-weight:700}
.av-estim .lineamt{font-family:var(--font-geist-mono);font-size:12.5px;font-weight:600;min-width:70px;text-align:right}
.av-estim .tvariants{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:7px 16px;padding:8px 0 2px 32px}
.av-estim .notebtn{border:0;background:none;cursor:pointer;font-size:14px;padding:2px 4px;opacity:.5;line-height:1}
.av-estim .notebtn:hover,.av-estim .notebtn.has{opacity:1}
.av-estim .tnote{grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:8px 0 2px 32px}
.av-estim .tnote .cl-note{flex:1;min-width:150px}
.av-estim .notechip{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;background:var(--brand-50);border:1px solid var(--brand-200);text-decoration:none;font-size:13px;line-height:1}
.av-estim .notechip:hover{background:var(--brand-100);border-color:var(--brand)}
.av-estim .notedone{border:0;background:var(--brand);color:#fff;font-weight:700;font-size:12px;border-radius:8px;width:30px;height:32px;cursor:pointer;flex:none}
.av-estim .notedone:hover{background:var(--brand-700)}
.av-estim .vg{display:inline-flex;align-items:center;gap:7px}
.av-estim .vlab{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--faint)}
.av-estim .vseg{display:inline-flex;gap:3px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:999px;padding:3px}
.av-estim .vseg button{border:0;background:none;cursor:pointer;font-family:var(--font-geist-sans);font-weight:600;font-size:11px;color:var(--muted);padding:4px 11px;border-radius:999px;transition:.14s var(--ease)}
.av-estim .vseg button:hover{color:var(--brand-700)}
.av-estim .vseg button.on{background:var(--brand);color:#fff}
/* Ligne personnalisée */
.av-estim .clwrap{margin-top:6px}
.av-estim .cl{border:1px dashed var(--brand-200);background:linear-gradient(180deg,var(--brand-50),transparent);border-radius:11px;padding:11px;margin:8px 0}
.av-estim .cl.off{opacity:.5}
.av-estim .clr{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.av-estim .clr+.clr{margin-top:8px}
.av-estim .clbadge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--brand-700);background:var(--brand-100);border-radius:999px;padding:3px 8px}
.av-estim .cl input,.av-estim .cl select{font-family:var(--font-geist-sans);font-size:12.5px;border:1px solid var(--line-strong);border-radius:8px;padding:7px 9px;background:var(--surface);color:var(--ink);outline:none}
.av-estim .cl input:focus,.av-estim .cl select:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-estim .cl input[type=number]{-moz-appearance:textfield}
.av-estim .cl input[type=number]::-webkit-outer-spin-button,.av-estim .cl input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.av-estim .cl-sep{font-size:12px;color:var(--faint);font-weight:600}
.av-estim .cl-nom{flex:1;min-width:130px}
.av-estim .cl-prix{width:76px;text-align:right;font-family:var(--font-geist-mono)}
.av-estim .cl-unite{width:92px}
.av-estim .cl-total{margin-left:auto;font-family:var(--font-geist-mono);font-weight:700;color:var(--brand-700);white-space:nowrap;font-size:13px}
.av-estim .cl-del{border:0;background:none;color:var(--faint);cursor:pointer;font-size:15px;padding:4px}
.av-estim .cl-del:hover{color:var(--danger)}
.av-estim .cl-lk{font-size:14px;color:var(--faint)}
.av-estim .cl-note{flex:1;min-width:150px}
.av-estim .cl-open{font-size:11px;font-weight:600;color:var(--brand-700);text-decoration:none;white-space:nowrap;border:1px solid var(--brand-200);border-radius:7px;padding:6px 9px;background:var(--surface)}
.av-estim .cl-tvalab{font-size:11px;color:var(--muted);font-weight:500;display:inline-flex;align-items:center;gap:5px}
.av-estim .cl-info{width:18px;height:18px;border-radius:50%;border:1px solid var(--brand-200);color:var(--brand-700);font-size:10px;font-weight:700;cursor:pointer;background:var(--surface);line-height:1}
.av-estim .cl-guide{font-size:11px;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.5}
.av-estim .cl-guide b{color:var(--ink)}
.av-estim .cl-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:8px;padding:10px;border:1.5px dashed var(--brand-200);background:var(--surface);color:var(--brand-700);border-radius:11px;font-family:var(--font-geist-sans);font-weight:600;font-size:13px;cursor:pointer;transition:.15s var(--ease)}
.av-estim .cl-add:hover{background:var(--brand-50);border-color:var(--brand)}
.av-estim .cl-actions{margin-top:10px;gap:8px;border-top:1px solid var(--line);padding-top:10px}
.av-estim .cl-valider{border:0;background:var(--brand);color:#fff;font-family:var(--font-geist-sans);font-weight:600;font-size:12.5px;border-radius:9px;padding:8px 14px;cursor:pointer;transition:.15s var(--ease)}
.av-estim .cl-valider:hover:not(:disabled){background:var(--brand-700)}
.av-estim .cl-valider:disabled{opacity:.45;cursor:not-allowed}
.av-estim .cl-cancel{border:0;background:none;color:var(--faint);font-family:var(--font-geist-sans);font-weight:600;font-size:12.5px;cursor:pointer;text-decoration:underline}
.av-estim .cl-icon{border:0;background:none;color:var(--faint);cursor:pointer;font-size:14px;padding:2px 4px;line-height:1}
.av-estim .cl-icon:hover{color:var(--brand)}
.av-estim .cl-delconfirm{border:1px solid var(--danger);background:var(--danger);color:#fff;font-family:var(--font-geist-sans);font-weight:700;font-size:11px;border-radius:8px;padding:5px 9px;cursor:pointer;white-space:nowrap}
.av-estim .resetbtn{background:none;border:0;color:var(--faint);font-size:12px;cursor:pointer;text-decoration:underline}

.av-estim .hero{border-radius:var(--radius-panel);padding:28px;color:#edebff;background:linear-gradient(140deg,var(--nuit),var(--nuit-2) 55%,var(--nuit-3));box-shadow:var(--shadow-hero);position:relative;overflow:hidden;margin-bottom:16px}
.av-estim .hero .glow{position:absolute;border-radius:50%;filter:blur(64px);pointer-events:none}
.av-estim .hero .g1{right:-96px;top:-96px;width:320px;height:320px;background:rgba(124,58,237,.25)}
.av-estim .hero .g2{left:-64px;bottom:-64px;width:256px;height:256px;background:rgba(79,70,229,.20)}
.av-estim .hero .eb{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-300);font-weight:600;position:relative;z-index:1;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);padding:6px 12px;border-radius:999px}
.av-estim .hero .eb .dot{width:6px;height:6px;border-radius:999px;background:var(--accent-400)}
.av-estim .hero .tt{font-family:var(--font-geist-mono);font-weight:600;font-size:clamp(34px,7vw,52px);margin:14px 0 2px;position:relative;z-index:1;letter-spacing:-.03em}
.av-estim .hero .tt small{font-size:.42em;color:var(--accent-300);margin-left:8px;letter-spacing:0}
.av-estim .hero .brk{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;position:relative;z-index:1}
.av-estim .hero .tvahint{position:relative;z-index:1;margin-top:12px;font-size:11.5px;line-height:1.5;color:rgba(237,235,255,.72);max-width:640px}
.av-estim .hero .pill{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:9px 13px}
.av-estim .hero .pill .k{font-size:10.5px;color:#a9a4d6}
.av-estim .hero .pill .v{font-weight:600;color:#fff;font-size:13px}

.av-estim .bilan{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:620px){.av-estim .bilan{grid-template-columns:1fr}}
.av-estim .btile{border:1px solid var(--line);border-radius:var(--radius-field);padding:14px;background:var(--surface-2)}
.av-estim .btile .k{font-size:11.5px;color:var(--muted);font-weight:500}
.av-estim .btile .v{font-family:var(--font-geist-mono);font-weight:600;font-size:20px;margin-top:4px}
.av-estim .btile.mat{border-color:rgba(79,70,229,.35)}
.av-estim .btile.mat .v{color:var(--brand)}
.av-estim .btile.pre{border-color:rgba(167,139,250,.45)}
.av-estim .btile.pre .v{color:var(--accent-600)}
.av-estim .btile.eco{border-color:rgba(15,157,107,.35)}
.av-estim .btile.eco .v{color:var(--ok)}
.av-estim .btile .sub2{font-size:11px;color:var(--muted);margin-top:4px;font-weight:500}
.av-estim .devlot{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}
.av-estim .devlot:last-child{border-bottom:0}
.av-estim .devlot .track{height:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:999px;overflow:hidden;width:100%}
.av-estim .devlot .fill{height:100%;background:linear-gradient(90deg,var(--brand),var(--accent-400))}
.av-estim .devlot .v{font-family:var(--font-geist-mono);font-weight:600;min-width:74px;text-align:right}
.av-estim .dtl{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--line);align-items:center}
.av-estim .dtl:last-child{border-bottom:0}
.av-estim .dtl .mode{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px}
.av-estim .dtl .mA{background:var(--brand-50);color:var(--brand)}
.av-estim .dtl .mS{background:var(--ok-soft);color:var(--ok)}
.av-estim .dtl .mL{background:rgba(137,142,168,.16);color:var(--muted)}
.av-estim .dtl .q{color:var(--muted);font-family:var(--font-geist-mono);text-align:right}
.av-estim .dtl .m{font-family:var(--font-geist-mono);font-weight:600;text-align:right;min-width:74px}
.av-estim .empty{color:var(--faint);font-size:13px;text-align:center;padding:20px}
.av-estim .foot{margin-top:20px;font-size:11.5px;color:var(--faint);text-align:center;line-height:1.7}

.av-estim .views{display:inline-flex;gap:4px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:4px;box-shadow:var(--shadow-sm)}
.av-estim .views button{font-family:var(--font-geist-sans);font-size:13px;font-weight:600;color:var(--muted);background:none;border:0;padding:8px 14px;border-radius:9px;cursor:pointer;transition:.15s var(--ease)}
.av-estim .views button.on{background:var(--brand);color:#fff}

/* barre live (sticky, nuit) */
.av-estim-live{position:sticky;bottom:16px;z-index:20;margin-top:18px;border-radius:var(--radius-panel);background:linear-gradient(140deg,#1E1B4B,#241f5e);color:#edebff;box-shadow:0 22px 54px -22px rgba(30,27,75,.7);border:1px solid rgba(255,255,255,.08)}
.av-estim-live .live-in{padding:14px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.av-estim-live .lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;font-weight:600}
.av-estim-live .big{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:600;font-size:26px;line-height:1;color:#fff}
.av-estim-live .big small{font-size:.5em;color:#c4b5fd;font-weight:600;margin-left:4px}
.av-estim-live .jauge{flex:1;min-width:160px}
.av-estim-live .jbar{height:8px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:6px}
.av-estim-live .jfill{height:100%;border-radius:999px;background:linear-gradient(90deg,#a78bfa,#4f46e5);transition:width .3s var(--ease)}
.av-estim-live .jfill.over{background:linear-gradient(90deg,#f59e0b,#e0434b)}
.av-estim-live .jtext{font-size:11.5px;color:#c9c5ee}
.av-estim-live .cta{font-family:var(--font-geist-sans);font-weight:600;font-size:14px;background:#fff;color:#1E1B4B;border:0;border-radius:999px;padding:12px 22px;cursor:pointer;box-shadow:0 8px 22px -8px rgba(0,0,0,.5);transition:transform .18s var(--ease),box-shadow .18s var(--ease)}
.av-estim-live .cta:hover{transform:translateY(-2px);box-shadow:0 12px 28px -8px rgba(0,0,0,.6)}
.av-estim-live .save{font-family:var(--font-geist-sans);font-weight:600;font-size:14px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:12px 20px;cursor:pointer;transition:.18s var(--ease)}
.av-estim-live .save:hover:not(:disabled){background:rgba(255,255,255,.2)}
.av-estim-live .save:disabled{opacity:.5;cursor:not-allowed}
.av-estim-live .err{width:100%;font-size:12.5px;font-weight:500;color:#ffb1b6}

@media(prefers-reduced-motion:reduce){.av-estim *,.av-estim-live *{transition:none!important}}

/* ── Intake « Parlez-nous du bien » : groupes, pastilles, unités, compteurs, cartes finition ── */
.av-estim .gl{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--faint);margin:20px 0 10px}
.av-estim .gl:first-of-type{margin-top:4px}
.av-estim .tpills{display:flex;flex-wrap:wrap;gap:7px}
.av-estim .tpill{font-family:var(--font-geist-sans);font-size:13px;font-weight:600;color:var(--muted);background:var(--surface);border:1px solid var(--line-strong);border-radius:999px;padding:8px 15px;cursor:pointer;transition:.14s var(--ease)}
.av-estim .tpill:hover{border-color:var(--brand-200)}
.av-estim .tpill.on{background:var(--brand);border-color:var(--brand);color:#fff}
.av-estim .uinp{display:flex;align-items:center;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:0 11px;transition:border-color .15s,box-shadow .15s}
.av-estim .uinp:focus-within{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-estim .uinp input{flex:1;min-width:0;font-family:var(--font-geist-mono);font-size:14px;color:var(--ink);background:transparent;border:0;outline:none;padding:9px 0}
.av-estim .uinp input:focus{box-shadow:none;border:0}
.av-estim .uinp .u{font-size:12px;color:var(--faint);font-weight:600;padding-left:8px;white-space:nowrap}
.av-estim .stpg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.av-estim .stp{display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius-field);padding:7px 9px 7px 13px}
.av-estim .stp .l{font-size:12.5px;font-weight:600;color:var(--ink)}
.av-estim .stp .l small{display:block;font-size:10px;color:var(--faint);font-weight:500;margin-top:1px}
.av-estim .stp .c{display:inline-flex;align-items:center;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface);overflow:hidden}
.av-estim .stp button{width:29px;height:30px;border-radius:0;border:0;background:transparent;color:var(--brand);font-size:16px;font-weight:700;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .12s}
.av-estim .stp button:hover{background:var(--brand-50)}
.av-estim .stp button:active{background:var(--brand-100)}
.av-estim .stp .v{font-family:var(--font-geist-mono);font-size:14px;font-weight:600;min-width:26px;text-align:center;color:var(--ink)}
.av-estim .finc{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.av-estim .finc .fc{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:13px 12px;cursor:pointer;transition:.16s var(--ease)}
.av-estim .finc .fc:hover{border-color:var(--brand-200)}
.av-estim .finc .fc.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-estim .finc .fh{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.av-estim .finc .g3{display:flex;align-items:flex-end;gap:3px;height:15px}
.av-estim .finc .g3 i{width:5px;border-radius:2px;background:var(--line-strong)}
.av-estim .finc .g3 i:nth-child(1){height:45%}.av-estim .finc .g3 i:nth-child(2){height:72%}.av-estim .finc .g3 i:nth-child(3){height:100%}
.av-estim .finc .g3 i.f{background:var(--accent-400)}
.av-estim .finc .fc.on .g3 i.f{background:var(--brand)}
.av-estim .finc .ck{width:19px;height:19px;border-radius:50%;border:2px solid var(--line-strong);position:relative}
.av-estim .finc .fc.on .ck{background:var(--brand);border-color:var(--brand)}
.av-estim .finc .fc.on .ck::after{content:"";position:absolute;left:5px;top:2px;width:5px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-estim .finc .fe{font-size:9px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-600)}
.av-estim .finc .ft{font-size:14px;font-weight:600;margin-top:2px}
.av-estim .finc .fd{font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.45;min-height:54px}
@media(max-width:560px){.av-estim .stpg{grid-template-columns:1fr}.av-estim .finc{grid-template-columns:1fr}.av-estim .finc .fd{min-height:0}}
`;
