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
import { lignesAValider, type LigneInjectee, type RapportInjection } from "@/lib/estimateur/plan-injection";

const CSS = `
.av-estim .vp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.av-estim .vp-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 11px;font-size:12px;font-weight:600;color:var(--muted);background:var(--surface-2)}
.av-estim .vp-chip b{font-family:var(--font-geist-mono),monospace;color:var(--ink)}
.av-estim .vp-chip.alerte{border-color:#f5c2c7;background:#fff5f5;color:#b91c1c}
.av-estim .vp-chip.deduit{border-color:#fde68a;background:#fffbeb;color:#92400e}
.av-estim .vp-bloc{border:1px solid var(--line);border-radius:var(--radius-card);padding:14px 16px;margin-bottom:12px;background:var(--surface)}
.av-estim .vp-bloc.alerte{border-color:#f5c2c7;background:#fff8f8}
.av-estim .vp-bloc.deduit{border-color:#fde68a;background:#fffdf5}
.av-estim .vp-t{font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:2px}
.av-estim .vp-t small{display:block;font-weight:500;font-size:11.5px;color:var(--faint);margin-top:1px}
.av-estim .vp-q{display:flex;align-items:baseline;gap:10px;margin-top:8px;font-size:12.5px;color:var(--muted)}
.av-estim .vp-q .num{font-size:14px;font-weight:600;color:var(--ink)}
.av-estim .vp-q .barre{text-decoration:line-through;color:var(--faint);font-weight:500}
.av-estim .vp-why{font-size:12.5px;color:#92400e;margin-top:8px;line-height:1.45}
.av-estim .vp-why.conflit{color:#b91c1c}
.av-estim .vp-tab{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
.av-estim .vp-tab td{padding:6px 0;border-bottom:1px solid var(--line);vertical-align:baseline}
.av-estim .vp-tab td:last-child{text-align:right;white-space:nowrap;font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums}
.av-estim .vp-lot{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--faint);padding-top:14px!important}
.av-estim .vp-neuf{color:var(--brand);font-weight:600}
.av-estim .vp-cta{width:100%;font-family:var(--font-geist-sans);font-weight:600;font-size:14.5px;background:var(--brand);color:#fff;border:0;border-radius:var(--radius-field);padding:14px 18px;cursor:pointer;box-shadow:var(--shadow-lift);transition:transform .15s var(--ease)}
.av-estim .vp-cta:hover{transform:translateY(-1px)}
`;

const fmt = (n: number, u: string) => (u === "forfait" ? "au forfait" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${u === "m2" ? "m²" : u}`);

function Ligne({ l }: { l: LigneInjectee }) {
  const conflit = l.etat === "epinglee";
  return (
    <div className={"vp-bloc" + (conflit ? " alerte" : l.deduction ? " deduit" : "")}>
      <div className="vp-t">{l.nom}<small>{l.lot} · {l.raison}</small></div>
      <div className="vp-q">
        {conflit ? (
          <>
            <span>Tu as fixé <span className="num">{fmt(l.avant ?? 0, l.unite)}</span></span>
            <span>·</span>
            <span>le plan en mesure <span className="num">{fmt(l.quantite, l.unite)}</span></span>
          </>
        ) : (
          <>
            {l.avant != null && l.etat === "mise-a-jour" && <span className="barre">{fmt(l.avant, l.unite)}</span>}
            <span className="num">{fmt(l.quantite, l.unite)}</span>
            {l.etat === "ajoutee" && <span className="vp-neuf">nouveau</span>}
          </>
        )}
      </div>
      {conflit && <p className="vp-why conflit">Ta saisie est conservée : le plan ne l&apos;écrase pas. Si c&apos;est sa mesure qui est juste, corrige la quantité dans le détail ci-dessous.</p>}
      {!conflit && l.deduction && <p className="vp-why">{l.deduction}</p>}
    </div>
  );
}

export function ValidationPlan({ rapport, onValider }: { rapport: RapportInjection; onValider?: () => void }) {
  const lignes = lignesAValider(rapport);
  const aDecider = lignes.filter((l) => l.etat === "epinglee" || l.deduction);
  const reste = lignes.filter((l) => l.etat !== "epinglee" && !l.deduction && l.etat !== "inchangee");
  const { bilan } = rapport;

  const parLot = reste.reduce<Record<string, LigneInjectee[]>>((acc, l) => { (acc[l.lot] ??= []).push(l); return acc; }, {});

  return (
    <div className="av-estim">
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + CSS }} />
      <div className="card">
        <div className="eyebrow">Ton plan</div>
        <h2>Vérifie ce que le plan a rempli</h2>
        <div className="sub">
          Les quantités viennent de ce que tu as dessiné. Rien n&apos;est définitif : tout reste
          modifiable dans le détail, poste par poste.
        </div>
        <div className="vp-chips">
          {bilan.ajoutees > 0 && <span className="vp-chip"><b>{bilan.ajoutees}</b> ajoutés</span>}
          {bilan.misesAJour > 0 && <span className="vp-chip"><b>{bilan.misesAJour}</b> mis à jour</span>}
          {bilan.inchangees > 0 && <span className="vp-chip"><b>{bilan.inchangees}</b> inchangés</span>}
          {bilan.deductions > 0 && <span className="vp-chip deduit"><b>{bilan.deductions}</b> à confirmer</span>}
          {bilan.epinglees > 0 && <span className="vp-chip alerte"><b>{bilan.epinglees}</b> en désaccord</span>}
        </div>
      </div>

      {aDecider.length > 0 && (
        <div className="card">
          <h2>À regarder de près</h2>
          <div className="sub">
            {bilan.epinglees > 0 && "Une quantité que tu avais corrigée ne correspond pas à ce que mesure le plan. "}
            Sur ces lignes, le plan a choisi à ta place — vérifie que c&apos;est bien ce que tu veux.
          </div>
          {aDecider.map((l) => <Ligne key={l.cle} l={l} />)}
        </div>
      )}

      {reste.length > 0 && (
        <div className="card">
          <h2>Le reste, mesuré sur le plan</h2>
          <div className="sub">Rien à décider ici : ce sont des quantités relevées sur ton dessin.</div>
          <table className="vp-tab">
            <tbody>
              {Object.entries(parLot).map(([lot, ls]) => (
                <Fragment key={lot}>
                  <tr><td className="vp-lot" colSpan={2}>{lot}</td></tr>
                  {ls.map((l) => (
                    <tr key={l.cle}>
                      <td>{l.nom}{l.etat === "ajoutee" && <span className="vp-neuf"> · nouveau</span>}</td>
                      <td>{fmt(l.quantite, l.unite)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="vp-cta" onClick={() => onValider?.()}>
        J&apos;ai vérifié, continuer vers le détail
      </button>
    </div>
  );
}
