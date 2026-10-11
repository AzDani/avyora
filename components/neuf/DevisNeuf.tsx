"use client";

/**
 * Vue « Mon devis » du détaillé neuf : la version construction neuve du `DevisView` de la
 * rénovation (qui n'est pas touché). Catalogue du neuf, TVA 20 %, frais hors TVA, découpe
 * construction / annexes, répartition par phase du chantier (un lot revient dans plusieurs phases :
 * clé `phase + corps`), démarches affichées comme telles. Aucun montant écrit : tout vient du moteur.
 */
import { useMemo } from "react";
import {
  buildDevis, customTotals, decoupe, tachesParCle, estJalon, CATALOG_NEUF, PHASES_NEUF,
  type Ctx, type Selection, type CustomLine,
} from "@/lib/estimateur";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { CountUp } from "@/components/estimateur/CountUp";
import { fmt } from "@/components/estimateur/partage";

export default function DevisNeuf({ ctx, sel, custom = [] }: { ctx: Ctx; sel: Selection; custom?: CustomLine[] }) {
  const locale = useLocale();
  const T = useT();
  const n = T.neuf;
  const d = n.detail;
  const dv = useMemo(() => buildDevis(CATALOG_NEUF, ctx, sel), [ctx, sel]);
  const taches = useMemo(() => tachesParCle(ctx), [ctx]);
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  // Lignes perso : comptées comme dans le devis de la rénovation (HT, leur TVA, les aléas).
  const cu = customTotals(custom);
  const t = { ht: t0.ht + cu.ht, tva: t0.tva + cu.tva, aleas: t0.aleas + cu.ht * ((ctx.aleas || 0) / 100) };
  const ttc = t.ht + t.tva + t.aleas;
  const cut = decoupe(dv);
  const max = lots.length ? Math.max(...lots.map((x) => x.ttc)) : 1;
  const persoTtc = cu.ht + cu.tva;
  const finLbl = n.saisie.finitions[ctx.finition]?.label ?? ctx.finition;
  const nf = locale === "en" ? "en-US" : "fr-FR";

  return (
    <div>
      <div className="hero">
        <span className="glow g1" /><span className="glow g2" />
        <div className="eb"><span className="dot" />{d.devisEb}</div>
        <div className="tt"><CountUp value={ttc} /><small>{d.ttc}</small></div>
        <div className="brk">
          <div className="pill"><span className="k">{d.travauxHt}</span><br /><span className="v num">{fmt(t.ht - b.frais)}</span></div>
          <div className="pill"><span className="k">{d.tva}</span><br /><span className="v num">{fmt(t.tva)}</span></div>
          {b.frais > 0 && <div className="pill"><span className="k">{n.fraisHorsTva}</span><br /><span className="v num">{fmt(b.frais)}</span></div>}
          <div className="pill"><span className="k">{d.aleas(ctx.aleas)}</span><br /><span className="v num">{fmt(t.aleas)}</span></div>
          <div className="pill"><span className="k">{d.budgetMax}</span><br /><span className="v num">{fmt(ctx.budget)}</span></div>
        </div>
        <p className="split-n">{n.dontConstr} <b>{fmt(cut.constr)}</b> · {n.annexes} <b>{fmt(cut.annexes)}</b></p>
        <div className="tvahint">{d.heroHint}</div>
      </div>

      <div className="card">
        <h2>{d.bilanT}</h2>
        <div className="sub">{d.bilanSous}</div>
        <div className="bilan">
          <div className="btile pre"><div className="k">{d.paye}</div><div className="v num">{fmt(b.paye)}</div><div className="sub2">{d.dontMat(fmt(b.matA), fmt(b.moA))}</div></div>
          <div className="btile mat"><div className="k">{d.achat}</div><div className="v num">{fmt(b.achat)}</div></div>
          <div className="btile eco"><div className="k">{d.eco}</div><div className="v num">{b.eco > 0 ? "+ " + fmt(b.eco) : fmt(0)}</div></div>
        </div>
      </div>

      <div className="card">
        <h2>{d.repT}</h2>
        <div className="sub">{d.repSous}</div>
        {!lots.length ? <div className="empty">{d.vide}</div> : (
          PHASES_NEUF.map((ph) => {
            // Un lot peut revenir deux fois dans la même phase : on additionne ses blocs.
            const parCorps = new Map<string, number>();
            for (const x of lots) if (x.phase === ph) parCorps.set(x.corps, (parCorps.get(x.corps) ?? 0) + x.ttc);
            const pl = [...parCorps].sort((a, c) => c[1] - a[1]);
            if (!pl.length) return null;
            return (
              <div key={ph}>
                <div className="phase-t">{catT(locale, "phases", ph)}</div>
                {pl.map(([corps, v]) => (
                  <div key={ph + "|" + corps} className="devlot">
                    <span>{catT(locale, "corps", corps)}</span>
                    <span className="track"><span className="fill" style={{ width: (v / max) * 100 + "%" }} /></span>
                    <span className="v">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
        {persoTtc > 0 && (
          <div className="devlot">
            <span>{d.perso}</span>
            <span className="track"><span className="fill" style={{ width: Math.min(100, (persoTtc / max) * 100) + "%" }} /></span>
            <span className="v">{fmt(persoTtc)}</span>
          </div>
        )}
      </div>

      {!!lignes.length && (
        <div className="card">
          <h2>{d.detailT}</h2>
          <div className="sub">{d.detailSous}</div>
          {lignes.map((li) => {
            const tk = taches.get(li.cle);
            const jalon = estJalon(tk) && li.ttc === 0;
            const pctPerso = sel[li.cle]?.pu != null;
            const q = li.unite === "forfait" ? "—"
              : li.unite === "pct" ? (tk?.fp != null && !pctPerso ? `${tk.fp.toLocaleString(nf)} ${tk.assiette === "projet" || (tk.frais && tk.assiette !== "travaux") ? n.pctProjet : n.pctTravaux}` : "—")
              : (Math.round(li.qty * 100) / 100).toLocaleString(nf) + " " + (li.mode === "location" ? (locale === "en" ? "d" : "j") : catT(locale, "unites", li.unite));
            return (
              <div key={li.cle} className="dtl">
                <span>{catLigne(locale, li.nom, li.cle)}</span>
                <span className="q">{jalon ? "—" : q}</span>
                {jalon ? <span className="dem">{n.demarche}</span> : (
                  <span className={"mode " + (li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA")}>
                    {li.mode === "location" ? d.modeLocation : li.mode === "je-fais" ? d.modeJeFais : d.modeFaitFaire}
                  </span>
                )}
                <span className="m">{jalon ? "" : fmt(li.ttc)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="foot">{d.pied(finLbl)}</div>
    </div>
  );
}
