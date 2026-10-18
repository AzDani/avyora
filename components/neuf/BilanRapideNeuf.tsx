import type { ReactNode } from "react";
import {
  buildDevis, catalogueDe, geometrieNeuf, maisonComplete, piecesNeuf, PHASES_NEUF, type Ctx, type Selection, type QuiRealise,
} from "@/lib/estimateur";
import { decoupe, parPhase, surcoutArgile, EXTERIEURS_HORS_PERIMETRE } from "@/lib/estimateur/etapes-neuf";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * Bilan d'une estimation RAPIDE de construction neuve (maquette validée `maquettes/neuf/app.js`,
 * `rendreRapide`) : fourchette, 3 repères (dont le total, valeur centrale), aléas, chambres, durée,
 * barres par phase, « Pas compris », alerte argile, note sur la finition.
 *
 * N13 : la fourchette en grand, comme la rénovation (le total exact n'est plus le gros chiffre). La
 * répartition par phase suit la règle commune de l'aperçu (D9, comme la répartition par corps d'état
 * de la rénovation) : réelle pour un compte qui a les droits (`reel`), sinon des barres FACTICES,
 * floutées sous un cadenas. Le flou n'est que du CSS : ni le nom ni le montant d'une phase n'entrent
 * alors dans le HTML.
 *
 * Sans hook ni directive : importable par un composant serveur (fiche projet) comme par un
 * composant client (estimateur rapide public). Aucun montant écrit ici : tout vient du moteur
 * (`buildDevis`, `decoupe`, `parPhase`, `surcoutArgile`) ou d'une constante sourcée de `lib/`.
 */
export const BILAN_NEUF_CSS = `
.av-bn{position:relative;overflow:hidden;border-radius:1.5rem;color:#fff;padding:24px;
  background:radial-gradient(520px 260px at 100% 0%,rgba(167,139,250,.32),transparent 60%),linear-gradient(150deg,#1E1B4B,#241f5e);
  box-shadow:0 22px 54px -26px rgba(30,27,75,.6)}
.av-bn .k{font-size:12px;color:#c9c5f3;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.av-bn .big{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;font-size:clamp(28px,6vw,40px);font-weight:600;letter-spacing:-.03em;line-height:1.1;margin:8px 0 6px}
.av-bn .big small{opacity:.5;font-weight:400}
.av-bn .big .data{white-space:nowrap}
.av-bn .range{color:#e1defc;font-size:13.5px;line-height:1.5}
.av-bn .range .data{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;white-space:nowrap;color:#fff;font-weight:600}
.av-bn .kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}
.av-bn .kpi{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px}
.av-bn .kpi .v{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;font-size:17px;font-weight:600;white-space:nowrap}
.av-bn .kpi .l{font-size:12px;color:#c9c5f3;margin-top:2px;line-height:1.3}
.av-bn .small{font-size:12.5px;color:#c9c5f3;margin-top:-6px;line-height:1.5}
.av-bn .hr{height:1px;background:rgba(255,255,255,.12);margin:18px 0}
.av-bn .bars{display:grid;gap:7px;margin-top:8px}
.av-bn .bar{display:grid;grid-template-columns:minmax(0,15em) minmax(0,1fr) 6.6em;align-items:center;gap:10px;font-size:13px}
.av-bn .bar .t{color:#e7e5ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-bn .bar .track{display:block;height:9px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.av-bn .bar .fill{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#a78bfa,#fff);min-width:3px}
.av-bn .bar .v{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;text-align:right;color:#fff}
.av-bn .k .chip{margin-left:8px;font-size:10px;letter-spacing:.04em;color:#1E1B4B;background:#c4b5fd;padding:2px 8px;border-radius:999px;vertical-align:1px}
.av-bn .verrou{position:relative;margin-top:8px}
.av-bn .verrou .bars{margin-top:0;filter:blur(5px);user-select:none;pointer-events:none}
.av-bn .bar .fake{display:block;height:9px;border-radius:99px;background:rgba(255,255,255,.28)}
.av-bn .lockn{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:12px;background:radial-gradient(ellipse at center,rgba(30,27,75,.78) 0%,rgba(30,27,75,.35) 62%,transparent 100%)}
.av-bn .lockn b{font-size:15px;font-weight:700;color:#fff}
.av-bn .lockn span{font-size:13px;color:#dedbfb;max-width:44ch;line-height:1.45}
.av-bn .lockn .cta-v{margin-top:6px;font-family:var(--font-geist-sans),system-ui,sans-serif;font-weight:600;font-size:13.5px;background:#fff;color:#1E1B4B;border:0;border-radius:999px;padding:11px 18px;min-height:44px;cursor:pointer}
.av-bn .excl{display:grid;gap:6px;margin:8px 0 0;padding:0;list-style:none;font-size:13px;color:#dedbfb}
.av-bn .excl li{display:flex;gap:8px;align-items:flex-start}
.av-bn .excl svg{flex:0 0 14px;margin-top:3px}
.av-bn .alert-n{margin-top:14px;padding:10px 12px;border-radius:14px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.35);font-size:13px;color:#fde68a}
.av-bn .alert-n b{font-family:var(--font-geist-mono),ui-monospace,monospace;font-weight:600;white-space:nowrap}
.av-bn .note-n{font-size:12.5px;color:#c9c5f3;margin-top:12px}
.av-bn .cta-n{margin-top:16px}
@media(max-width:560px){
  .av-bn{padding:20px 18px}
  .av-bn .kpis{grid-template-columns:minmax(0,1fr)}
  .av-bn .kpi{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
  .av-bn .kpi .l{margin:0;order:-1;min-width:0}
  .av-bn .bar{grid-template-columns:minmax(0,8.6em) minmax(0,1fr) 5.8em;gap:8px;font-size:12.5px}
  .av-bn .bar .t{white-space:normal;line-height:1.2}
}
`;

const IconeX = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".7" />
    <path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** Barres factices de la répartition verrouillée : 9 lignes (comme les phases), largeurs fixes, aucun montant. */
const FAUSSES_PHASES = [[64, 34], [52, 100], [70, 58], [46, 72], [60, 44], [56, 61], [68, 28], [50, 39], [58, 17]] as const;

export default function BilanRapideNeuf({
  ctx, sel, qui, locale, cta, reel, beta = false, ctaVerrou,
}: {
  ctx: Ctx; sel: Selection; qui?: QuiRealise; locale: Locale; cta?: ReactNode;
  /** La répartition par phase en clair (compte qui a les droits) ; sinon factice et floutée (D9). */
  reel: boolean;
  /** Bêta gratuite en cours (lib/beta.ts) : le cadenas dit « gratuit avec un compte », la pastille « Bêta ». */
  beta?: boolean;
  /** Bouton sous le texte du cadenas (rapide public) ; la fiche projet a le sien plus bas. */
  ctaVerrou?: ReactNode;
}) {
  const n = dictNeuf(locale);
  const t = n.rapide;
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const eur = (v: number) => Math.round(v || 0).toLocaleString(nf) + " €";
  const num = (v: number) => Math.round(v || 0).toLocaleString(nf);

  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const ttc = dv.totaux.ttc;
  const lo = Math.round((ttc * 0.85) / 100) * 100, hi = Math.round((ttc * 1.15) / 100) * 100;
  const surface = ctx.surface || 0;
  const maison = maisonComplete(ctx.neuf);
  const cut = decoupe(dv);
  // Rien de la répartition n'est calculé pour un aperçu verrouillé : elle ne peut pas fuiter dans le HTML.
  const ph = reel ? parPhase(dv) : null;
  const max = ph ? Math.max(0, ...PHASES_NEUF.map((p) => ph[p] ?? 0)) : 0;
  const mois = geometrieNeuf(maison).moisChantier;
  const chambres = piecesNeuf(maison).chambres;   // suites parentales comprises
  // Avertissement « sans étude de sol » : la même maison sur un sol argileux, chiffrée par le moteur.
  const argile = surcoutArgile(maison, { finition: ctx.finition, qui, codePostal: ctx.codePostal, aleas: ctx.aleas });
  const ext = EXTERIEURS_HORS_PERIMETRE;

  return (
    <div className="av-bn" aria-live="polite">
      <style dangerouslySetInnerHTML={{ __html: BILAN_NEUF_CSS }} />
      <div className="k">{t.budgetK}</div>
      <div className="big"><span className="data">{eur(lo)}</span> <small>–</small> <span className="data">{eur(hi)}</span></div>
      <div className="range">≈ <span className="data">{surface > 0 ? eur(ttc / surface) : "—"}</span> {t.parM2} ({num(surface)} m²) · {t.marge}</div>
      <div className="kpis">
        <div className="kpi"><div className="v data">{eur(ttc)}</div><div className="l">{t.centreK}</div></div>
        <div className="kpi"><div className="v data">{eur(cut.constr)}</div><div className="l">{t.constr}</div></div>
        <div className="kpi"><div className="v data">{eur(cut.annexes)}</div><div className="l">{n.annexes}</div></div>
      </div>
      <div className="small">
        + {t.aleas} <span className="data">{eur(cut.aleas)}</span> ({ctx.aleas} {n.pctTravaux}) · {chambres} {chambres > 1 ? n.chambres : n.chambre} · ≈ {mois} {n.moisChantier}
      </div>
      <div className="hr" />
      <div className="k" style={{ marginBottom: 6 }}>{t.phasesK}{!ph && <span className="chip">{beta ? dict(locale).beta.pastille : "Pro"}</span>}</div>
      {ph ? (
        <div className="bars">
          {PHASES_NEUF.map((p) => {
            const v = ph[p] ?? 0;
            const w = max > 0 ? (v / max) * 100 : 0;
            const lbl = catT(locale, "phases", p);
            return (
              <div className="bar" key={p}>
                <span className="t" title={lbl}>{lbl}</span>
                <span className="track"><span className="fill" style={{ width: w.toFixed(1) + "%" }} /></span>
                <span className="v data">{eur(v)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="verrou">
          <div className="bars" aria-hidden="true">
            {FAUSSES_PHASES.map(([nom, w], i) => (
              <div className="bar" key={i}>
                <span className="t"><span className="fake" style={{ width: nom + "%" }} /></span>
                <span className="track"><span className="fill" style={{ width: w + "%" }} /></span>
                <span className="v">••• €</span>
              </div>
            ))}
          </div>
          <div className="lockn">
            <b>{beta ? t.phasesLockBetaH : t.phasesLockH}</b>
            <span>{beta ? t.phasesLockBetaP : t.phasesLockP}</span>
            {ctaVerrou}
          </div>
        </div>
      )}
      <div className="hr" />
      <div className="k">{t.pasCompris}</div>
      <ul className="excl">
        <li><IconeX /><span>{t.exclTerrain}</span></li>
        <li><IconeX /><span>{t.exclExt} ({t.exclExtOrdre(eur(ext.min), eur(ext.max), num(ext.terrainMin), num(ext.terrainMax))})</span></li>
        <li><IconeX /><span>{t.exclAides}</span></li>
      </ul>
      {argile > 0 && (
        <div className="alert-n">{t.argileA}<b className="data">+{eur(argile)}</b>{t.argileB}</div>
      )}
      <p className="note-n">{t.noteFinition}</p>
      {cta ? <div className="cta-n">{cta}</div> : null}
    </div>
  );
}
