"use client";

/**
 * « Dépenses réelles » sur la fiche projet (module M5) : la saisie de ce qui est payé au fil du
 * chantier, comparé à l'estimation corps d'état par corps d'état, avec les alertes de dépassement et
 * la prévision finale. Calculs : lib/estimateur/budget-reel.ts ; écriture : /api/projects/[id]/depenses.
 * Rendu à l'intérieur d'EstimationResultat (styles .card / .sub d'EST_CSS) ; le reste est scopé .av-bud.
 */
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { bilanBudget, corpsDuProjet, CORPS_AUTRE, type Depense, type Alerte } from "@/lib/estimateur/budget-reel";
import { euros, pourcent } from "@/lib/i18n/nombres";

const TR = {
  fr: {
    titre: "Dépenses réelles",
    sub: "Note ce que tu paies au fil du chantier : AVYORA le compare à l'estimation, corps d'état par corps d'état, et te prévient avant que le budget dérape.",
    estimation: "Estimation", estimationSub: "aléas compris",
    depense: "Dépensé", depenseSub: (n: number) => `${n} dépense${n > 1 ? "s" : ""}`,
    prevision: "Prévision finale", previsionSub: "réel + reste à payer + aléas",
    ecart: "Écart", ecartSous: "sous l'estimation", ecartSur: "au-dessus de l'estimation",
    budgetMax: "budget max",
    parCorps: "Prévu et réel par corps d'état",
    prevuDe: "prévu", termine: "terminé", horsEstim: "hors estimation",
    voirTous: (n: number) => `Voir les ${n} autres corps d'état (rien de dépensé)`, masquer: "Masquer les corps d'état sans dépense",
    ajouter: "Ajouter une dépense", libCorps: "Corps d'état", libelle: "Libellé", libellePh: "ex. facture plombier, acompte 30\u00a0%",
    montant: "Montant TTC (€)", valider: "Ajouter", enCours: "…",
    autre: "Autre (hors estimation)",
    historique: "Dernières dépenses", supprimer: "Supprimer", confirmer: "Supprimer cette dépense ?",
    vide: "Aucune dépense pour l'instant. Ajoute la première facture ou le premier acompte : la comparaison apparaît tout de suite.",
    erreur: "Enregistrement impossible. Vérifie le montant et réessaie.",
    alerte: {
      depasse: (c: string, m: string) => `${c} : ${m} au-dessus du prévu.`,
      attention: (c: string, p: string) => `${c} : ${p} du prévu déjà dépensés, alors que le lot n'est pas terminé.`,
      hors: (c: string, m: string) => `${c} : ${m} dépensés hors de l'estimation.`,
      prevEstim: (m: string) => `Au rythme actuel, le chantier finirait ${m} au-dessus de l'estimation.`,
      prevBudget: (m: string) => `Au rythme actuel, le chantier dépasserait ton budget max de ${m}.`,
    },
    toutVaBien: "Pour l'instant, tout reste dans l'estimation.",
  },
  en: {
    titre: "Actual spending",
    sub: "Log what you pay as the work goes: AVYORA compares it with the estimate, trade by trade, and warns you before the budget slips.",
    estimation: "Estimate", estimationSub: "contingency included",
    depense: "Spent", depenseSub: (n: number) => `${n} expense${n > 1 ? "s" : ""}`,
    prevision: "Final forecast", previsionSub: "actual + still to pay + contingency",
    ecart: "Variance", ecartSous: "under the estimate", ecartSur: "over the estimate",
    budgetMax: "max budget",
    parCorps: "Planned vs actual by trade",
    prevuDe: "planned", termine: "done", horsEstim: "not in estimate",
    voirTous: (n: number) => `Show the ${n} other trades (nothing spent)`, masquer: "Hide trades with no spending",
    ajouter: "Add an expense", libCorps: "Trade", libelle: "Label", libellePh: "e.g. plumber invoice, 30% deposit",
    montant: "Amount incl. VAT (€)", valider: "Add", enCours: "…",
    autre: "Other (not in estimate)",
    historique: "Latest expenses", supprimer: "Delete", confirmer: "Delete this expense?",
    vide: "No expenses yet. Add your first invoice or deposit: the comparison shows up right away.",
    erreur: "Could not save. Check the amount and try again.",
    alerte: {
      depasse: (c: string, m: string) => `${c}: ${m} over plan.`,
      attention: (c: string, p: string) => `${c}: ${p} of the plan already spent, and the trade isn't finished.`,
      hors: (c: string, m: string) => `${c}: ${m} spent outside the estimate.`,
      prevEstim: (m: string) => `At this pace, the project would end ${m} over the estimate.`,
      prevBudget: (m: string) => `At this pace, the project would exceed your max budget by ${m}.`,
    },
    toutVaBien: "So far, everything stays within the estimate.",
  },
} as const;

const CSS = `
.av-bud .tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
.av-bud .tile{border:1px solid var(--line,#e6e7ef);border-radius:12px;padding:10px 12px;min-width:0}
.av-bud .tile .k{font-size:12px;color:var(--muted,#6b6f86)}
.av-bud .tile .v{font-size:19px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}
.av-bud .tile .s{font-size:11.5px;color:var(--muted,#6b6f86);margin-top:2px}
.av-bud .tile.bad .v{color:#b42318}.av-bud .tile.good .v{color:#067647}
.av-bud .alerts{display:flex;flex-direction:column;gap:6px;margin:4px 0 14px}
.av-bud .al{border-radius:10px;padding:8px 12px;font-size:13.5px;line-height:1.4}
.av-bud .al.r{background:#fef3f2;color:#912018;border:1px solid #fecdca}
.av-bud .al.o{background:#fffaeb;color:#93370d;border:1px solid #fedf89}
.av-bud .al.g{background:#ecfdf3;color:#05603a;border:1px solid #abefc6}
.av-bud h3{font-size:14px;font-weight:600;margin:16px 0 8px}
.av-bud .rows{display:flex;flex-direction:column;gap:8px}
.av-bud .row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,2fr) 118px;gap:10px;align-items:center;font-size:13.5px}
.av-bud .row .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-bud .row .nm small{color:var(--muted,#6b6f86);margin-left:6px}
.av-bud .bar{position:relative;height:8px;border-radius:99px;background:var(--line,#eceef5);overflow:hidden}
.av-bud .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:#4f46e5}
.av-bud .bar i.o{background:#f79009}.av-bud .bar i.r{background:#d92d20}
.av-bud .row .am{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.av-bud .row .am small{display:block;color:var(--muted,#6b6f86);font-size:11.5px}
.av-bud form{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.6fr) minmax(0,.8fr) auto;gap:8px;align-items:end;margin-top:6px}
.av-bud label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted,#6b6f86);min-width:0}
.av-bud input,.av-bud select{height:44px;border:1px solid var(--line-strong,#d5d8e4);border-radius:10px;padding:0 10px;font:inherit;font-size:14px;background:var(--surface,#fff);color:var(--ink,#15172b);min-width:0}
.av-bud button.add{height:44px;border-radius:10px;padding:0 16px;font-weight:600;background:#4f46e5;color:#fff;border:0;cursor:pointer}
.av-bud button.add:disabled{opacity:.6;cursor:default}
.av-bud .err{color:#b42318;font-size:13px;margin-top:6px}
.av-bud .hist{display:flex;flex-direction:column;margin-top:4px}
.av-bud .hl{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line,#eceef5);font-size:13.5px}
.av-bud .hl .d{color:var(--muted,#6b6f86);font-size:12px;font-variant-numeric:tabular-nums}
.av-bud .hl .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-bud .hl .t small{color:var(--muted,#6b6f86);margin-left:6px}
.av-bud .hl .m{font-variant-numeric:tabular-nums;font-weight:600}
.av-bud .hl button{width:44px;height:44px;border:0;background:none;color:var(--muted,#6b6f86);cursor:pointer;border-radius:10px;font-size:16px}
.av-bud .hl button:hover{background:#fef3f2;color:#b42318}
.av-bud .plus{margin-top:8px;border:0;background:none;color:#4f46e5;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;padding:10px 0;min-height:44px}
.av-bud .vide{color:var(--muted,#6b6f86);font-size:13.5px;margin:10px 0 0}
@media (max-width:640px){
  .av-bud .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
  .av-bud form{grid-template-columns:1fr 1fr}
  .av-bud form label.lib{grid-column:1/-1}
  .av-bud .row{grid-template-columns:minmax(0,1fr) auto}
  .av-bud .row .bar{grid-column:1/-1;grid-row:2}
}
`;

type Props = { reponses: unknown; projectId: string; depenses: Depense[] };

export default function BudgetReel({ reponses, projectId, depenses: initiales }: Props) {
  const locale = useLocale();
  const t = TR[locale];
  const fmt = (v: number): string => euros(locale, v);
  const nomCorps = (c: string): string => (c === CORPS_AUTRE ? t.autre : catT(locale, "corps", c));
  const dateCourte = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" });
  };

  const [depenses, setDepenses] = useState<Depense[]>(initiales);
  const corps = useMemo(() => corpsDuProjet(reponses), [reponses]);
  const bilan = useMemo(() => bilanBudget(reponses, depenses), [reponses, depenses]);
  const [choix, setChoix] = useState<string>(corps[0] ?? CORPS_AUTRE);
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [tous, setTous] = useState(false);

  if (!bilan) return null;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(montant.replace(/\s/g, "").replace(",", "."));
    if (!libelle.trim() || !(m > 0)) { setErr(true); return; }
    setBusy(true); setErr(false);
    try {
      const r = await fetch(`/api/projects/${projectId}/depenses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corpsEtat: choix, libelle: libelle.trim(), montant: m }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.depense) { setErr(true); return; }
      setDepenses((l) => [j.depense as Depense, ...l]);
      setLibelle(""); setMontant("");
    } catch { setErr(true); } finally { setBusy(false); }
  }

  async function supprimer(d: Depense) {
    if (!window.confirm(t.confirmer)) return;
    const avant = depenses;
    setDepenses((l) => l.filter((x) => x.id !== d.id));
    const r = await fetch(`/api/projects/${projectId}/depenses/${d.id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) setDepenses(avant);
  }

  const texteAlerte = (a: Alerte): { cls: string; txt: string } => {
    switch (a.type) {
      case "depasse": return { cls: "r", txt: t.alerte.depasse(nomCorps(a.corps), fmt(a.montant)) };
      case "attention": return { cls: "o", txt: t.alerte.attention(nomCorps(a.corps), pourcent(locale, a.part * 100, 0)) };
      case "hors_estimation": return { cls: "o", txt: t.alerte.hors(nomCorps(a.corps), fmt(a.montant)) };
      case "prevision_estimation": return { cls: "r", txt: t.alerte.prevEstim(fmt(a.montant)) };
      case "prevision_budget": return { cls: "r", txt: t.alerte.prevBudget(fmt(a.montant)) };
    }
  };

  const aDesDepenses = depenses.length > 0;
  const lignesToutes = bilan.lignes.filter((l) => l.prevu > 0 || l.reel > 0).sort((a, b) => b.prevu - a.prevu || b.reel - a.reel);
  // D'abord les corps où l'on a dépensé ; les autres (0 €) restent repliés derrière un bouton.
  const actives = lignesToutes.filter((l) => l.reel > 0), sansDepense = lignesToutes.length - actives.length;
  const lignes = tous ? lignesToutes : actives;
  const sur = bilan.ecartPrevision > 0.5;

  return (
    <div className="card av-bud">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>{t.titre}</h2>
      <div className="sub">{t.sub}</div>

      {aDesDepenses && (
        <>
          <div className="tiles">
            <div className="tile"><div className="k">{t.estimation}</div><div className="v">{fmt(bilan.estimation)}</div><div className="s">{t.estimationSub}</div></div>
            <div className="tile"><div className="k">{t.depense}</div><div className="v">{fmt(bilan.reel)}</div><div className="s">{t.depenseSub(depenses.length)}</div></div>
            <div className={`tile${bilan.budgetMax > 0 && bilan.prevision > bilan.budgetMax ? " bad" : ""}`}>
              <div className="k">{t.prevision}</div><div className="v">{fmt(bilan.prevision)}</div>
              <div className="s">{bilan.budgetMax > 0 ? `${t.budgetMax} ${fmt(bilan.budgetMax)}` : t.previsionSub}</div>
            </div>
            <div className={`tile ${sur ? "bad" : "good"}`}>
              <div className="k">{t.ecart}</div><div className="v">{sur ? "+" : ""}{fmt(bilan.ecartPrevision)}</div>
              <div className="s">{sur ? t.ecartSur : t.ecartSous}</div>
            </div>
          </div>

          <div className="alerts" role="status" aria-live="polite">
            {bilan.alertes.length === 0
              ? <div className="al g">{t.toutVaBien}</div>
              : bilan.alertes.map((a, i) => { const x = texteAlerte(a); return <div key={i} className={`al ${x.cls}`}>{x.txt}</div>; })}
          </div>

          <h3>{t.parCorps}</h3>
          <div className="rows">
            {lignes.map((l) => {
              const w = l.prevu > 0 ? Math.min(100, (l.reel / l.prevu) * 100) : 100;
              const cls = l.etat === "depasse" || l.etat === "hors_estimation" ? "r" : l.etat === "attention" ? "o" : "";
              return (
                <div key={l.corps} className="row">
                  <span className="nm" title={nomCorps(l.corps)}>
                    {nomCorps(l.corps)}
                    {l.termine && <small>· {t.termine}</small>}
                    {l.etat === "hors_estimation" && l.corps !== CORPS_AUTRE && <small>· {t.horsEstim}</small>}
                  </span>
                  <span className="bar" aria-hidden="true"><i className={cls} style={{ width: `${w}%` }} /></span>
                  <span className="am">{fmt(l.reel)}<small>{t.prevuDe} {fmt(l.prevu)}</small></span>
                </div>
              );
            })}
          </div>
          {sansDepense > 0 && (
            <button type="button" className="plus" onClick={() => setTous((v) => !v)} aria-expanded={tous}>
              {tous ? t.masquer : t.voirTous(sansDepense)}
            </button>
          )}
        </>
      )}

      <h3>{t.ajouter}</h3>
      <form onSubmit={ajouter}>
        <label><span>{t.libCorps}</span>
          <select value={choix} onChange={(e) => setChoix(e.target.value)}>
            {corps.map((c) => <option key={c} value={c}>{nomCorps(c)}</option>)}
            <option value={CORPS_AUTRE}>{t.autre}</option>
          </select>
        </label>
        <label className="lib"><span>{t.libelle}</span>
          <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={t.libellePh} maxLength={200} aria-invalid={err && !libelle.trim()} />
        </label>
        <label><span>{t.montant}</span>
          <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="decimal" placeholder="0" aria-invalid={err && !(Number(montant.replace(/\s/g, "").replace(",", ".")) > 0)} />
        </label>
        <button type="submit" className="add" disabled={busy}>{busy ? t.enCours : t.valider}</button>
      </form>
      {err && <div className="err" role="alert">{t.erreur}</div>}

      {aDesDepenses ? (
        <>
          <h3>{t.historique}</h3>
          <div className="hist">
            {depenses.slice(0, 50).map((d) => (
              <div key={d.id} className="hl">
                <span className="d">{dateCourte(d.date)}</span>
                <span className="t" title={d.libelle}>{d.libelle}<small>· {nomCorps(d.corps)}</small></span>
                <span className="m">{fmt(d.montant)}</span>
                <button type="button" onClick={() => supprimer(d)} aria-label={`${t.supprimer} ${d.libelle}`}>✕</button>
              </div>
            ))}
          </div>
        </>
      ) : <p className="vide">{t.vide}</p>}
    </div>
  );
}
