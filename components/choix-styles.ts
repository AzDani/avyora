/**
 * Styles de l'écran de choix (`/projets/nouveau`), partagés par ses deux étapes (N2) : la pré-page
 * « Quel est ton projet ? » (`ChoixNature`) et le choix Rapide / Détaillée (`ChoixEstimation`).
 * Tout est sous `.av-choix` : rien ne fuit vers le reste du site.
 */

/** La base : en-tête, grille des cartes, boutons, indice. Déplacée telle quelle depuis `ChoixEstimation`. */
export const CHOIX_CSS = `
.av-choix .ttl{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:6px 0 0}
.av-choix .sub{color:var(--color-muted);font-size:15px;margin:10px 0 0;max-width:52ch;line-height:1.6}
.av-choix .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}
@media (max-width:720px){.av-choix .grid{grid-template-columns:1fr}}
.av-choix .ch-card{position:relative;background:var(--color-surface);border:1px solid var(--color-line);border-radius:20px;
  padding:24px 22px;box-shadow:0 1px 2px rgba(21,23,43,.04),0 12px 30px -22px rgba(21,23,43,.30);display:flex;flex-direction:column}
.av-choix .ch-card.pro{border-color:var(--color-brand-200)}
.av-choix .ch-card.pro::before{content:"";position:absolute;inset:0;border-radius:20px;padding:1px;
  background:linear-gradient(140deg,var(--color-accent-400),var(--color-brand-600));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.5;pointer-events:none}
.av-choix .row1{display:flex;align-items:center;justify-content:space-between;gap:10px}
.av-choix .ico{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;flex:none}
.av-choix .ico.free{background:var(--color-brand-50);color:var(--color-brand-600)}
.av-choix .ico.pro{background:linear-gradient(140deg,#2b2568,var(--color-brand-900));color:var(--color-accent-300)}
.av-choix .tag{font-size:11px;font-weight:600;letter-spacing:.03em;padding:5px 11px;border-radius:999px;white-space:nowrap}
.av-choix .tag.gratis{background:var(--color-positive-soft);color:var(--color-positive)}
.av-choix .tag.propill{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;display:inline-flex;align-items:center;gap:5px}
.av-choix .ch-card h2{font-size:20px;font-weight:600;margin:18px 0 0;letter-spacing:-.01em;color:var(--color-ink)}
.av-choix .lead{color:var(--color-muted);font-size:14px;margin:7px 0 0;line-height:1.6}
.av-choix ul{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:11px}
.av-choix li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--color-ink);line-height:1.5}
.av-choix li svg{flex:none;margin-top:2px}
.av-choix .ck-free{color:var(--color-brand-600)}
.av-choix .ck-pro{color:var(--color-accent-600)}
.av-choix .spacer{flex:1;min-height:18px}
.av-choix .btn{width:100%}
.av-choix .btn-outline{background:var(--color-surface);color:var(--color-brand-700);border:1px solid var(--color-line-strong)}
.av-choix .btn-outline:hover{background:var(--color-surface-2)}
.av-choix .btn-pro{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;border:1px solid transparent}
.av-choix .btn-pro:hover{filter:brightness(1.06)}
.av-choix .foot{font-size:12.5px;color:var(--color-faint);margin-top:9px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.av-choix .foot .lien{color:var(--color-brand-600);text-decoration:none;font-weight:500}
.av-choix .foot .lien:hover{text-decoration:underline}
.av-choix .hint{margin-top:22px;background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:14px;padding:13px 16px;font-size:13px;color:var(--color-muted);display:flex;gap:10px;align-items:center;line-height:1.5}
.av-choix .hint svg{flex:none;color:var(--color-brand-500)}
.av-choix .hint b{color:var(--color-ink);font-weight:600}
`;

/**
 * La pré-page (N2) : deux grandes cartes entièrement cliquables (des liens), sur le modèle de
 * `a.strip-neuf` de l'accueil : survol, focus visible, mouvement réduit respecté. Icônes neutres et
 * mêmes couleurs pour les deux natures : ce n'est pas un choix payant (pas le style `.ch-card.pro`).
 */
export const PRE_PAGE_CSS = `
.av-choix .natures{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}
@media (max-width:720px){.av-choix .natures{grid-template-columns:1fr;gap:14px;margin-top:22px}}
.av-choix .nat{position:relative;display:flex;flex-direction:column;min-height:262px;padding:26px 24px 22px;border:1px solid var(--color-line);border-radius:20px;
  background:radial-gradient(120% 85% at 100% 0%,var(--color-brand-50),transparent 58%),var(--color-surface);
  box-shadow:0 1px 2px rgba(21,23,43,.04),0 12px 30px -22px rgba(21,23,43,.30);text-decoration:none;color:inherit;
  transition:transform .18s,box-shadow .18s,border-color .18s}
.av-choix .nat:hover{transform:translateY(-3px);border-color:var(--color-brand-300);box-shadow:0 2px 4px rgba(21,23,43,.05),0 22px 44px -24px rgba(79,70,229,.45)}
.av-choix .nat:focus-visible{outline:3px solid var(--color-brand-200);outline-offset:3px}
.av-choix .nat-ico{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;flex:none;background:var(--color-brand-50);color:var(--color-brand-600);border:1px solid var(--color-brand-100)}
.av-choix .nat h2{font-size:23px;font-weight:600;letter-spacing:-.015em;color:var(--color-ink);margin:20px 0 0}
.av-choix .nat p{font-size:15px;line-height:1.6;color:var(--color-muted);margin:8px 0 0;max-width:40ch}
.av-choix .nat .spacer{min-height:22px}
.av-choix .nat-go{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;
  background:var(--color-brand-50);color:var(--color-brand-700);font-size:14.5px;font-weight:600;transition:background .18s,color .18s}
.av-choix .nat:hover .nat-go,.av-choix .nat:focus-visible .nat-go{background:var(--color-brand-600);color:#fff}
@media (max-width:420px){.av-choix .nat{min-height:0;padding:22px 18px 18px}.av-choix .nat h2{font-size:21px;margin-top:16px}.av-choix .nat-ico{width:52px;height:52px}.av-choix .nat-go{align-self:stretch;justify-content:center}}
@media (prefers-reduced-motion:reduce){.av-choix .nat,.av-choix .nat-go{transition:none}.av-choix .nat:hover{transform:none}}
`;
