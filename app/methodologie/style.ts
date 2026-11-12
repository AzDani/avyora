/** Styles de /methodologie, partagés par la version française (page.tsx) et anglaise (contenu-en.tsx). */
export const CSS = `
.av-metho .fil{font-size:12.5px;color:var(--color-faint);margin-bottom:14px}
.av-metho .fil a{color:var(--color-muted);text-decoration:none}
.av-metho .fil a:hover{color:var(--color-brand-700)}
.av-metho h1{font-size:30px;font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin-top:6px}
.av-metho .lead{font-size:16px;line-height:1.65;color:var(--color-muted);margin-top:10px}
.av-metho .maj{font-size:12.5px;color:var(--color-faint);margin-top:10px}
.av-metho h2{font-size:20px;font-weight:600;color:var(--color-ink);margin:34px 0 10px;letter-spacing:-.01em}
.av-metho h3{font-size:15.5px;font-weight:600;color:var(--color-ink);margin:24px 0 6px}
.av-metho p{font-size:14.5px;line-height:1.7;color:var(--color-muted);margin:8px 0}
.av-metho .chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
.av-metho .chips span{font-size:12.5px;font-weight:500;color:var(--color-muted);background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:999px;padding:5px 11px}
.av-metho .tw{overflow-x:auto;margin:12px 0;border:1px solid var(--color-line);border-radius:12px}
.av-metho table{width:100%;border-collapse:collapse;font-size:13.5px}
.av-metho th{text-align:left;font-weight:600;color:var(--color-ink);background:var(--color-surface-2);padding:10px 12px;font-size:12.5px}
.av-metho td{padding:10px 12px;border-top:1px solid var(--color-line);color:var(--color-muted);vertical-align:top}
.av-metho td.n{font-family:var(--font-geist-mono),monospace;font-weight:600;color:var(--color-ink);white-space:nowrap}
.av-metho td small{display:block;color:var(--color-faint);font-size:11.5px;margin-top:3px;line-height:1.5}
.av-metho td.n small{font-family:var(--font-geist-sans),sans-serif;font-weight:400;white-space:normal}
/* Mobile : plus de largeur minimale de 520 px (le tableau des finitions n'y montrait que « Éco », sans
   aucun signe qu'on pouvait faire défiler) : les colonnes se resserrent et tout tient dans l'écran. */
@media(max-width:560px){
.av-metho th,.av-metho td{padding:8px 7px}
.av-metho table{font-size:13px}
}
.av-metho .franc{border:1px solid #f0d9a8;background:#fdf8ec;border-radius:12px;padding:13px 16px;margin:16px 0;font-size:13.5px;line-height:1.7;color:#6b5320}
.av-metho .nope{margin:10px 0;padding-left:20px}
.av-metho .nope li{font-size:14.5px;line-height:1.7;color:var(--color-muted);margin:7px 0}
.av-metho .nope strong{color:var(--color-ink)}
.av-metho .cta{margin:32px 0 10px;padding:20px;border:1px solid var(--color-line);border-radius:16px;background:var(--color-surface-2)}
.av-metho .cta p{margin:0 0 12px}
.av-metho .cta .btn{display:inline-flex;align-items:center;background:var(--color-brand-600,#4F46E5);color:#fff;font-weight:600;font-size:14px;border-radius:999px;padding:11px 20px;text-decoration:none}
.av-metho .voir{font-size:13px;color:var(--color-faint);margin-top:22px}
.av-metho .voir a{color:var(--color-brand-700);font-weight:500}
`;
