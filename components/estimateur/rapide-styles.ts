/** CSS scopé `.av-rapide` de l'estimation rapide, déplacé tel quel depuis `components/EstimateurRapide.tsx` (C1). */
export const RAPIDE_CSS = `
.av-rapide{--canvas:#f5f6fb;--surface:#fff;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-50:#eef1ff;--brand-200:#c7ccfe;--accent-300:#c4b5fd;--accent-600:#7c3aed;--nuit:#1E1B4B;--nuit-2:#241f5e;--good:#0f9d6b;--good-bg:#e6f7f0;--radius-field:.7rem;--radius-card:1.15rem;--radius-panel:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);color:var(--ink);font-family:var(--font-geist-sans),system-ui,sans-serif}
.av-rapide *{box-sizing:border-box}
.av-rapide .num{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.av-rapide .q{margin-bottom:22px}
.av-rapide .qlbl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.13em;color:var(--brand);margin-bottom:10px}
.av-rapide .qlbl .n{display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--brand);color:#fff;font-size:11px;font-family:var(--font-geist-mono)}
.av-rapide .seg{display:flex;gap:8px;flex-wrap:wrap}
.av-rapide .seg button{flex:1;min-width:90px;font-family:var(--font-geist-sans);font-size:14px;font-weight:600;color:var(--muted);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:11px 8px;cursor:pointer;transition:.15s var(--ease)}
.av-rapide .seg button:hover{border-color:var(--brand-200)}
.av-rapide .seg button.on{background:var(--brand);border-color:var(--brand);color:#fff}
.av-rapide .fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.av-rapide .fld label{display:block;font-size:11.5px;color:var(--muted);margin-bottom:5px;font-weight:500}
.av-rapide .fld input{width:100%;font-family:var(--font-geist-sans);font-size:16px;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:11px 12px;outline:none;transition:.15s}
.av-rapide .fld input:focus{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.av-rapide .amp{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;transition:.16s var(--ease);position:relative}
.av-rapide .amp:hover{border-color:var(--brand-200)}
.av-rapide .amp.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .amp .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.av-rapide .amp .gauge{display:flex;align-items:flex-end;gap:3px;height:18px}
.av-rapide .amp .gauge i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .amp .gauge i:nth-child(1){height:35%}
.av-rapide .amp .gauge i:nth-child(2){height:57%}
.av-rapide .amp .gauge i:nth-child(3){height:79%}
.av-rapide .amp .gauge i:nth-child(4){height:100%}
.av-rapide .amp .gauge i.f{background:var(--accent-300)}
.av-rapide .amp.on .gauge i.f{background:var(--brand)}
.av-rapide .amp .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);transition:.15s;position:relative}
.av-rapide .amp.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .amp.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .amp .t{font-size:14.5px;font-weight:600;line-height:1.25}
.av-rapide .amp .d{font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.45;min-height:32px}
.av-rapide .amp .amt{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--faint)}
.av-rapide .amp .amt b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
.av-rapide .fins{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.av-rapide .fin{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;position:relative;transition:.16s var(--ease)}
.av-rapide .fin:hover{border-color:var(--brand-200)}
.av-rapide .fin.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .fin .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.av-rapide .fin .g3{display:flex;align-items:flex-end;gap:3px;height:16px}
.av-rapide .fin .g3 i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .fin .g3 i:nth-child(1){height:45%}
.av-rapide .fin .g3 i:nth-child(2){height:72%}
.av-rapide .fin .g3 i:nth-child(3){height:100%}
.av-rapide .fin .g3 i.f{background:var(--accent-300)}
.av-rapide .fin.on .g3 i.f{background:var(--brand)}
.av-rapide .fin .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);position:relative;transition:.15s}
.av-rapide .fin.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .fin.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .fin .eye{font-size:9.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-600)}
.av-rapide .fin .t{font-size:15px;font-weight:600;margin-top:2px}
.av-rapide .fin .d{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.45;min-height:58px}
.av-rapide .fin .amt{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);font-size:11.5px;color:var(--faint)}
.av-rapide .fin .amt b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
@media(max-width:560px){.av-rapide .fins{grid-template-columns:1fr}.av-rapide .fin .d{min-height:0}}
.av-rapide .quis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.av-rapide .qcard{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;position:relative;transition:.16s var(--ease)}
.av-rapide .qcard:hover{border-color:var(--brand-200)}
.av-rapide .qcard.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .qcard .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.av-rapide .qcard .g3{display:flex;align-items:flex-end;gap:3px;height:16px}
.av-rapide .qcard .g3 i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .qcard .g3 i:nth-child(1){height:45%}
.av-rapide .qcard .g3 i:nth-child(2){height:72%}
.av-rapide .qcard .g3 i:nth-child(3){height:100%}
.av-rapide .qcard .g3 i.f{background:var(--accent-300)}
.av-rapide .qcard.on .g3 i.f{background:var(--brand)}
.av-rapide .qcard .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);position:relative;transition:.15s}
.av-rapide .qcard.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .qcard.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .qcard .eye{font-size:9.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-600)}
.av-rapide .qcard .t{font-size:14px;font-weight:600;margin-top:2px;line-height:1.25}
.av-rapide .qcard .d{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.45;min-height:72px}
.av-rapide .qcard .amt{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);display:flex;align-items:baseline;justify-content:space-between;gap:6px}
.av-rapide .qcard .amt .p{font-size:11.5px;color:var(--faint)}
.av-rapide .qcard .amt .p b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
.av-rapide .qcard .save{font-family:var(--font-geist-mono),monospace;font-size:10px;font-weight:600;color:var(--good);background:var(--good-bg);padding:2px 6px;border-radius:999px;white-space:nowrap}
@media(max-width:560px){.av-rapide .quis{grid-template-columns:1fr}.av-rapide .qcard .d{min-height:0}}
.av-rapide .intro{font-size:12.5px;color:var(--faint);text-align:center;margin-top:6px}
.av-rapide :is(input,select,textarea,button){scroll-margin-bottom:128px}
.av-rapide-live{--nuit:#1E1B4B;--nuit-2:#241f5e;--accent-300:#c4b5fd;--radius-panel:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);position:sticky;bottom:16px;z-index:20;margin-top:20px;border-radius:var(--radius-panel);background:linear-gradient(140deg,var(--nuit),var(--nuit-2));box-shadow:0 22px 54px -22px rgba(30,27,75,.7);border:1px solid rgba(255,255,255,.08)}
.av-rapide-live .in{padding:14px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.av-rapide-live .lbl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-300);font-weight:600}
.av-rapide-live .big{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;font-weight:600;font-size:23px;line-height:1.15;color:#fff;margin-top:2px}
.av-rapide-live .sub{font-size:11.5px;color:#c9c5ee;margin-top:2px}
.av-rapide-live .btns{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.av-rapide-live .cta{font-family:var(--font-geist-sans);font-weight:600;font-size:13.5px;background:#fff;color:var(--nuit);border:0;border-radius:999px;padding:11px 18px;cursor:pointer;white-space:nowrap;transition:transform .18s var(--ease)}
.av-rapide-live .cta:hover{transform:translateY(-2px)}
.av-rapide-live .ghost{font-family:var(--font-geist-sans);font-weight:600;font-size:13.5px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:11px 16px;cursor:pointer;white-space:nowrap}
.av-rapide-live .ghost:disabled{opacity:.5;cursor:not-allowed}
.av-rapide-live .err{width:100%;font-size:12.5px;font-weight:500;color:#ffb1b6}
.av-rapide .glbl{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 8px}
.av-rapide .rgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:520px){.av-rapide .rgrid{grid-template-columns:1fr}}
.av-rapide .rcard{display:flex;align-items:center;justify-content:space-between;gap:6px;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:4px 6px 4px 4px;transition:.15s var(--ease)}
.av-rapide .rcard.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 12%,transparent)}
.av-rapide .rcard .rname{flex:1;min-width:0;display:flex;align-items:center;gap:7px;background:transparent;border:0;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;text-align:left;padding:8px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rapide .rcard.on .rname{color:var(--ink)}
.av-rapide .rcard .rname .rem{font-size:16px;line-height:1}
.av-rapide .rstep{display:inline-flex;align-items:center;flex:none;border:1px solid var(--line);border-radius:999px;background:#f8f9fd}
.av-rapide .rstep button{width:26px;height:26px;border:0;background:transparent;color:var(--brand);font-size:16px;font-weight:700;cursor:pointer;line-height:1;border-radius:999px}
.av-rapide .rstep button:disabled{color:var(--line-strong);cursor:default}
.av-rapide .rstep .rn{min-width:16px;text-align:center;font-family:var(--font-geist-mono),monospace;font-size:12px;font-weight:600;color:var(--ink)}
.av-rapide .plist{margin-top:12px;border:1px solid var(--line);border-radius:.9rem;overflow:hidden;background:#f8f9fd}
.av-rapide .prow{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.av-rapide .prow:last-of-type{border-bottom:0}
.av-rapide .prow .pname{flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rapide .stepper{display:inline-flex;align-items:center;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface)}
.av-rapide .stepper button{width:28px;height:28px;border:0;background:transparent;color:var(--brand);font-size:16px;font-weight:700;cursor:pointer;line-height:1}
.av-rapide .stepper .num{min-width:22px;text-align:center;font-family:var(--font-geist-mono),monospace;font-size:13px;font-weight:600;color:var(--ink)}
.av-rapide .prm{width:26px;height:26px;border:0;background:transparent;color:var(--faint);font-size:14px;cursor:pointer;border-radius:6px}
.av-rapide .prm:hover{background:var(--line);color:var(--ink)}
.av-rapide .psum{padding:9px 12px;font-size:12px;color:var(--muted);background:var(--surface)}
.av-rapide .psum .hintadd{color:var(--faint)}
.av-rapide .amt .lock{font-family:var(--font-geist-sans);font-weight:600;font-size:11px;color:var(--accent-600);background:var(--brand-50);padding:2px 9px;border-radius:999px;letter-spacing:.02em}
.av-rapide-live a.cta{text-decoration:none;display:inline-flex;align-items:center}
@media(max-width:520px){.av-rapide .prow{flex-wrap:wrap}.av-rapide .prow .pname{flex-basis:100%}
/* mobile : cibles tactiles ≥ 36px sur les −/+ et « retirer » (26–28px au doigt, c'est trop petit) */
.av-rapide .rstep button,.av-rapide .stepper button,.av-rapide .prm{width:36px;height:36px}.av-rapide .rstep .rn{min-width:20px;font-size:13px}.av-rapide .prow input{min-height:36px;font-size:16px}}
@media (prefers-reduced-motion:reduce){.av-rapide *,.av-rapide-live *{transition:none!important}}
`;
