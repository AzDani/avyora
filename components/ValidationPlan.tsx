"use client";

/**
 * L'écran de validation — le « double check » posé en D1.
 *
 * Dani : « il faut un double check de la part de l'utilisateur pour réduire au max les erreurs ».
 * Ce n'est utile qu'à une condition : montrer ce que le plan a CHANGÉ, pas les deux cents postes
 * du catalogue. Sinon personne ne relit et le bouton devient un « suivant ».
 *
 * L'écran est donc trié par ce qui demande une décision :
 *   1. les lignes épinglées — l'utilisateur avait corrigé une quantité, le plan en mesure une
 *      autre et ne l'a pas écrasée (D12). C'est le seul cas où deux chiffres s'opposent.
 *   2. les déductions — le plan a choisi à sa place : un parquet poncé plutôt que remplacé, une
 *      hauteur de faïence laissée au défaut. Il faut pouvoir décider autrement.
 *   3. le reste, groupé par corps d'état, pour être parcouru et pas lu.
 */
import { Fragment } from "react";
import { EST_CSS } from "./estimateur-styles";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictPlans, type DictPlans } from "@/lib/i18n/plans";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { lignesAValider, type LigneInjectee, type RapportInjection } from "@/lib/estimateur/plan-injection";

/* Couleurs : les jetons du thème (globals.css). Le texte d'alerte est assombri vers l'encre pour rester
   lisible sur le fond pâle de la même teinte. */
const CSS = `
.av-estim .vp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.av-estim .vp-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:600;color:var(--muted);background:var(--surface-2)}
.av-estim .vp-chip b{font-family:var(--font-geist-mono),monospace;color:var(--ink)}
.av-estim .vp-chip.alerte{border-color:var(--color-danger);background:var(--color-danger-soft);color:color-mix(in srgb,var(--color-danger) 70%,var(--ink))}
.av-estim .vp-chip.deduit{border-color:var(--color-warning);background:var(--color-warning-soft);color:color-mix(in srgb,var(--color-warning) 55%,var(--ink))}
.av-estim .vp-bloc{border:1px solid var(--line);border-radius:var(--radius-card);padding:14px 16px;margin-bottom:12px;background:var(--surface)}
.av-estim .vp-bloc.alerte{border-color:var(--color-danger);background:var(--color-danger-soft)}
.av-estim .vp-bloc.deduit{border-color:var(--color-warning);background:var(--color-warning-soft)}
.av-estim .vp-t{font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:2px}
.av-estim .vp-t small{display:block;font-weight:500;font-size:11.5px;color:var(--muted);margin-top:1px}
.av-estim .vp-q{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:12.5px;color:var(--muted)}
.av-estim .vp-q .num{font-size:14px;font-weight:600;color:var(--ink)}
.av-estim .vp-q .barre{text-decoration:line-through;color:var(--muted);font-weight:500}
.av-estim .vp-why{font-size:12.5px;color:color-mix(in srgb,var(--color-warning) 55%,var(--ink));margin-top:8px;line-height:1.45}
.av-estim .vp-why.conflit{color:color-mix(in srgb,var(--color-danger) 70%,var(--ink))}
.av-estim .vp-tab{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
.av-estim .vp-tab td{padding:6px 0;border-bottom:1px solid var(--line);vertical-align:baseline}
.av-estim .vp-tab td:last-child{text-align:right;white-space:nowrap;padding-left:12px;font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums}
.av-estim .vp-lot{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);padding-top:14px!important}
.av-estim .vp-neuf{color:var(--brand);font-weight:600}
.av-estim .vp-cta{width:100%;font-family:var(--font-geist-sans);font-weight:600;font-size:14.5px;background:var(--brand);color:var(--surface);border:0;border-radius:var(--radius-field);padding:14px 18px;cursor:pointer;box-shadow:var(--shadow-lift);transition:transform .15s var(--ease)}
.av-estim .vp-cta:hover{transform:translateY(-1px)}
.av-estim .vp-cta:disabled{opacity:.6;cursor:progress;transform:none}
`;

type T = DictPlans["validation"];

/** Une quantité : nombre à la mode de la langue, unité du catalogue (traduite en anglais). */
function formatQ(locale: string, t: T) {
  const nombre = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 2 });
  return (n: number, u: string) => (u === "forfait" ? t.auForfait : `${nombre.format(n)} ${u === "m2" ? "m²" : catT(locale, "unites", u)}`);
}

function Ligne({ l, t, locale, fmt }: { l: LigneInjectee; t: T; locale: string; fmt: (n: number, u: string) => string }) {
  const conflit = l.etat === "epinglee";
  return (
    <div className={"vp-bloc" + (conflit ? " alerte" : l.deduction ? " deduit" : "")}>
      <div className="vp-t">{catT(locale, "postes", l.nom)}<small>{catT(locale, "corps", l.lot)} · {l.raison}</small></div>
      <div className="vp-q">
        {conflit ? (
          <>
            <span>{t.tuAsFixe} <span className="num">{fmt(l.avant ?? 0, l.unite)}</span></span>
            <span aria-hidden="true">·</span>
            <span>{t.planMesure} <span className="num">{fmt(l.quantite, l.unite)}</span></span>
          </>
        ) : (
          <>
            {l.avant != null && l.etat === "mise-a-jour" && <span className="barre">{fmt(l.avant, l.unite)}</span>}
            <span className="num">{fmt(l.quantite, l.unite)}</span>
            {l.etat === "ajoutee" && <span className="vp-neuf">{t.nouveau}</span>}
          </>
        )}
      </div>
      {conflit && <p className="vp-why conflit">{t.conflit}</p>}
      {!conflit && l.deduction && <p className="vp-why">{l.deduction}</p>}
    </div>
  );
}

/**
 * `occupe` (facultatif) : la validation est partie, le bouton attend. L'interface d'origine
 * `{ rapport, onValider }` est inchangée. Les raisons et déductions viennent de la table de
 * correspondance du plan (en français, comme l'intérieur de l'éditeur) ; les libellés du catalogue et
 * tout le texte de l'écran suivent la langue.
 */
export function ValidationPlan({ rapport, onValider, occupe }: { rapport: RapportInjection; onValider?: () => void; occupe?: boolean }) {
  const locale = useLocale();
  const t = dictPlans(locale).validation;
  const fmt = formatQ(locale, t);
  const lignes = lignesAValider(rapport);
  const aDecider = lignes.filter((l) => l.etat === "epinglee" || l.deduction);
  const reste = lignes.filter((l) => l.etat !== "epinglee" && !l.deduction && l.etat !== "inchangee");
  const { bilan } = rapport;

  const parLot = reste.reduce<Record<string, LigneInjectee[]>>((acc, l) => { (acc[l.lot] ??= []).push(l); return acc; }, {});

  return (
    <div className="av-estim">
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + CSS }} />
      <div className="card">
        <div className="eyebrow">{t.eyebrow}</div>
        <h2>{t.titre}</h2>
        <div className="sub">{lignes.length ? t.sous : t.vide}</div>
        <div className="vp-chips">
          {bilan.ajoutees > 0 && <span className="vp-chip"><b>{bilan.ajoutees}</b> {t.ajoutes}</span>}
          {bilan.misesAJour > 0 && <span className="vp-chip"><b>{bilan.misesAJour}</b> {t.misAJour}</span>}
          {bilan.inchangees > 0 && <span className="vp-chip"><b>{bilan.inchangees}</b> {t.inchanges}</span>}
          {bilan.deductions > 0 && <span className="vp-chip deduit"><b>{bilan.deductions}</b> {t.aConfirmer}</span>}
          {bilan.epinglees > 0 && <span className="vp-chip alerte"><b>{bilan.epinglees}</b> {t.desaccord}</span>}
        </div>
      </div>

      {aDecider.length > 0 && (
        <div className="card">
          <h2>{t.aRegarder}</h2>
          <div className="sub">
            {bilan.epinglees > 0 && t.aRegarderEpinglee + " "}
            {t.aRegarderSous}
          </div>
          {aDecider.map((l) => <Ligne key={l.cle} l={l} t={t} locale={locale} fmt={fmt} />)}
        </div>
      )}

      {reste.length > 0 && (
        <div className="card">
          <h2>{t.reste}</h2>
          <div className="sub">{t.resteSous}</div>
          <table className="vp-tab">
            <tbody>
              {Object.entries(parLot).map(([lot, ls]) => (
                <Fragment key={lot}>
                  <tr><td className="vp-lot" colSpan={2}>{catT(locale, "corps", lot)}</td></tr>
                  {ls.map((l) => (
                    <tr key={l.cle}>
                      <td>{catT(locale, "postes", l.nom)}{l.etat === "ajoutee" && <span className="vp-neuf"> · {t.nouveau}</span>}</td>
                      <td>{fmt(l.quantite, l.unite)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="vp-cta" onClick={() => onValider?.()} disabled={occupe} aria-busy={occupe || undefined}>
        {t.continuer}
      </button>
    </div>
  );
}
