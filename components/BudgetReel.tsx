"use client";

/**
 * « Dépenses réelles » sur la fiche projet (module M5) : la saisie de ce qui est payé au fil du
 * chantier, comparé à l'estimation corps d'état par corps d'état, avec les alertes de dépassement et
 * la prévision finale. Calculs : lib/estimateur/budget-reel.ts ; écriture : /api/projects/[id]/depenses.
 * Rendu à l'intérieur d'EstimationResultat : reprend ses styles (.card, .sub, .prog, .phase-t, .st1/.st2
 * du suivi de chantier) ; le reste est scopé .av-bud.
 */
import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { bilanBudget, corpsDuProjet, CORPS_AUTRE, type Depense, type Alerte, type LigneBudget } from "@/lib/estimateur/budget-reel";
import { euros, pourcent, lireMontant } from "@/lib/i18n/nombres";

const TR = {
  fr: {
    titre: "Dépenses réelles",
    sub: "Note ce que tu paies au fil du chantier : AVYORA le compare à l'estimation, corps d'état par corps d'état, et te prévient avant que le budget dérape.",
    prevFinale: "prévision de fin de chantier",
    estimation: "Estimation", budgetMax: "budget max",
    verdictSur: (m: string, p: string) => `${m} au-dessus de l'estimation (${p})`,
    verdictSous: (m: string, p: string) => `${m} sous l'estimation (${p})`,
    verdictPile: "Pile dans l'estimation",
    paye: "Déjà payé", reste: "Reste à payer, aléas compris", repere: "Estimation",
    nbDep: (n: number) => `${n} dépense${n > 1 ? "s" : ""}`,
    parCorps: "Prévu et réel par corps d'état",
    hCorps: "Corps d'état", hPrevu: "Prévu", hReel: "Réel", hEcart: "Écart",
    stFait: "Terminé", stCours: "En cours", stAttente: "À démarrer", stHors: "Hors estimation",
    duPrevu: "du prévu", economie: "économie", depasse: "dépassement",
    voirTous: (n: number) => `Voir les ${n} autres corps d'état (rien de dépensé)`, masquer: "Masquer les corps d'état sans dépense",
    voirDetail: "Voir les dépenses de ", ajouterIci: "Ajouter une dépense ici",
    ajouter: "Ajouter une dépense", fermer: "Fermer",
    libCorps: "Corps d'état", libelle: "Libellé", libellePh: "ex. facture plombier, acompte 30 %",
    montant: "Montant TTC (€)", valider: "Ajouter", enCours: "…",
    autre: "Autre (hors estimation)",
    supprimer: "Supprimer", confirmer: "Supprimer cette dépense ?",
    vide: "Aucune dépense pour l'instant. Ajoute la première facture ou le premier acompte : la comparaison apparaît tout de suite.",
    erreur: "Enregistrement impossible. Vérifie le montant et réessaie.",
    alerte: {
      depasse: (c: string, m: string) => `${c} : ${m} au-dessus du prévu.`,
      attention: (c: string, p: string) => `${c} : ${p} du prévu déjà dépensés, alors que le lot n'est pas terminé.`,
      hors: (c: string, m: string) => `${c} : ${m} dépensés hors de l'estimation.`,
      prevBudget: (m: string) => `Au rythme actuel, le chantier dépasserait ton budget max de ${m}.`,
    },
  },
  en: {
    titre: "Actual spending",
    sub: "Log what you pay as the work goes: AVYORA compares it with the estimate, trade by trade, and warns you before the budget slips.",
    prevFinale: "forecast at completion",
    estimation: "Estimate", budgetMax: "max budget",
    verdictSur: (m: string, p: string) => `${m} over the estimate (${p})`,
    verdictSous: (m: string, p: string) => `${m} under the estimate (${p})`,
    verdictPile: "Right on the estimate",
    paye: "Paid so far", reste: "Still to pay, contingency included", repere: "Estimate",
    nbDep: (n: number) => `${n} expense${n > 1 ? "s" : ""}`,
    parCorps: "Planned vs actual by trade",
    hCorps: "Trade", hPrevu: "Planned", hReel: "Actual", hEcart: "Variance",
    stFait: "Done", stCours: "In progress", stAttente: "Not started", stHors: "Not in estimate",
    duPrevu: "of plan", economie: "saved", depasse: "overrun",
    voirTous: (n: number) => `Show the ${n} other trades (nothing spent)`, masquer: "Hide trades with no spending",
    voirDetail: "Show expenses for ", ajouterIci: "Add an expense here",
    ajouter: "Add an expense", fermer: "Close",
    libCorps: "Trade", libelle: "Label", libellePh: "e.g. plumber invoice, 30% deposit",
    montant: "Amount incl. VAT (€)", valider: "Add", enCours: "…",
    autre: "Other (not in estimate)",
    supprimer: "Delete", confirmer: "Delete this expense?",
    vide: "No expenses yet. Add your first invoice or deposit: the comparison shows up right away.",
    erreur: "Could not save. Check the amount and try again.",
    alerte: {
      depasse: (c: string, m: string) => `${c}: ${m} over plan.`,
      attention: (c: string, p: string) => `${c}: ${p} of the plan already spent, and the trade isn't finished.`,
      hors: (c: string, m: string) => `${c}: ${m} spent outside the estimate.`,
      prevBudget: (m: string) => `At this pace, the project would exceed your max budget by ${m}.`,
    },
  },
} as const;

// Couleurs du suivi de chantier : vert terminé (#0f9d6b), ambre en cours (#efb44d), indigo de la marque.
const CSS = `
.av-bud .mono{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.av-bud .ppct .nw{white-space:nowrap}
.av-bud .verdict{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px}
.av-bud .verdict.r{background:#fdecec;color:#b42318}
.av-bud .verdict.g{background:#e6f7f0;color:#0f9d6b}
.av-bud .verdict.n{background:var(--surface);color:var(--muted);border:1px solid var(--line)}
.av-bud .gtrack{position:relative;margin-top:14px;height:12px;border-radius:999px;background:var(--line)}
.av-bud .gtrack i,.av-bud .btrack i{position:absolute;top:0;bottom:0;transition:width .3s var(--ease),left .3s var(--ease)}
.av-bud .gtrack .paye{left:0;background:var(--brand);border-radius:999px 0 0 999px}
.av-bud .gtrack .reste{background:var(--brand-200)}
.av-bud .gtrack .over,.av-bud .btrack .over{background:repeating-linear-gradient(135deg,#e0434b 0 5px,#ef7a80 5px 9px)}
.av-bud .gtrack .over{border-radius:0 999px 999px 0}
.av-bud .mark{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--ink);border-radius:2px}
.av-bud .prog .chip .cd.paye{background:var(--brand)}
.av-bud .prog .chip .cd.reste{background:var(--brand-200)}
.av-bud .prog .chip .cd.mk{width:2px;height:12px;border-radius:1px;background:var(--ink)}
.av-bud .alerts{display:flex;flex-direction:column;gap:6px;margin:12px 0 0}
.av-bud .al{border-radius:12px;padding:9px 12px;font-size:12.5px;line-height:1.45;border:1px solid}
.av-bud .al.r{background:#fdecec;color:#912018;border-color:#f8c9cb}
.av-bud .al.o{background:#fdf1e1;color:#8a530b;border-color:#f0c98a}
.av-bud .bh,.av-bud .brow{display:grid;grid-template-columns:minmax(0,1fr) 96px 96px 112px;gap:12px;align-items:center}
.av-bud .bh{font-size:11px;color:var(--faint);padding:6px 0 4px}
.av-bud .bh span:not(:first-child),.av-bud .brow .c{text-align:right}
.av-bud .brow{width:100%;font:inherit;color:var(--ink);background:none;border:0;border-bottom:1px solid var(--line);padding:11px 2px;cursor:pointer;text-align:left;min-height:44px}
.av-bud .brow:hover{background:var(--surface-2)}
.av-bud .brow:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:8px}
.av-bud .nmb{display:block;min-width:0}
.av-bud .nm{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px;font-weight:600}
.av-bud .nm .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-bud .stp{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--line-strong);color:var(--muted);background:var(--surface)}
.av-bud .stp.hors{background:#fdecec;border-color:transparent;color:#b42318}
.av-bud .chv{flex:none;color:var(--faint);transition:transform .2s var(--ease);transform:rotate(-90deg)}
.av-bud .brow[aria-expanded="true"] .chv{transform:rotate(0deg);color:var(--brand)}
.av-bud .btrack{position:relative;display:block;margin-top:8px;height:8px;border-radius:999px;background:var(--line)}
.av-bud .btrack .f{left:0;border-radius:999px;background:var(--brand)}
.av-bud .btrack .f.g{background:#0f9d6b}.av-bud .btrack .f.o{background:#efb44d}
.av-bud .btrack .over{border-radius:0 999px 999px 0}
.av-bud .btrack .f.cut{border-radius:999px 0 0 999px}
.av-bud .c{font-size:13px}
.av-bud .c .lb{display:none}
.av-bud .c.vide{color:var(--faint)}
.av-bud .pill{display:inline-block;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}
.av-bud .pill.r{background:#fdecec;color:#b42318}
.av-bud .pill.g{background:#e6f7f0;color:#0f9d6b}
.av-bud .pill.o{background:#fdf1e1;color:#b06d10}
.av-bud .pill.n{background:var(--surface-2);color:var(--muted);border:1px solid var(--line)}
.av-bud .c small{display:block;font-family:var(--font-geist-sans);font-size:10.5px;color:var(--faint);margin-top:3px;letter-spacing:0}
.av-bud .det{background:var(--surface-2);border-bottom:1px solid var(--line);padding:4px 14px 6px}
.av-bud .hl{display:grid;grid-template-columns:64px minmax(0,1fr) auto 44px;gap:10px;align-items:center;padding:2px 0;border-bottom:1px dashed var(--line);font-size:12.5px}
.av-bud .hl .d{color:var(--faint);font-size:11.5px}
.av-bud .hl .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.av-bud .hl .m{font-weight:600}
.av-bud .hl button{width:44px;height:44px;border:0;background:none;color:var(--faint);cursor:pointer;border-radius:10px;font-size:15px}
.av-bud .hl button:hover{background:#fdecec;color:#b42318}
.av-bud .lien{border:0;background:none;color:var(--brand);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:8px 0;min-height:44px;text-align:left}
.av-bud .pied{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}
.av-bud button.add{height:44px;border-radius:12px;padding:0 18px;font:inherit;font-size:13.5px;font-weight:600;background:var(--brand);color:#fff;border:0;cursor:pointer;box-shadow:var(--shadow-sm)}
.av-bud button.add:hover{background:var(--brand-700)}
.av-bud button.add:disabled{opacity:.6;cursor:default}
.av-bud button.sec{height:44px;border-radius:12px;padding:0 16px;font:inherit;font-size:13px;font-weight:600;background:var(--surface);color:var(--muted);border:1px solid var(--line-strong);cursor:pointer}
.av-bud form{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.6fr) minmax(0,.8fr) auto;gap:8px;align-items:end;margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.av-bud label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);min-width:0}
.av-bud input,.av-bud select{height:44px;border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:0 10px;font:inherit;font-size:14px;background:var(--surface);color:var(--ink);min-width:0}
.av-bud input:focus,.av-bud select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-100)}
.av-bud .err{color:#b42318;font-size:12.5px;margin-top:6px}
.av-bud .vide-msg{color:var(--muted);font-size:13px;margin:4px 0 0}
@media (max-width:640px){
  .av-bud .prog .prow{flex-wrap:wrap}
  .av-bud .prog .ppct small{display:block;margin:2px 0 0}
  .av-bud .bh{display:none}
  .av-bud .brow{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:8px;align-items:start}
  .av-bud .brow .nmb{grid-column:1/-1}
  .av-bud .brow .c{text-align:left}
  .av-bud .c .lb{display:block;font-family:var(--font-geist-sans);font-size:10.5px;color:var(--faint);letter-spacing:0;margin-bottom:2px}
  .av-bud form{grid-template-columns:1fr 1fr}
  .av-bud form label.lib,.av-bud form label:first-child{grid-column:1/-1}
  .av-bud .hl{grid-template-columns:52px minmax(0,1fr) auto 44px}
}
@media (prefers-reduced-motion:reduce){.av-bud .gtrack i,.av-bud .btrack i,.av-bud .chv{transition:none}}
`;

type Props = { reponses: unknown; projectId: string; depenses: Depense[] };

/** Ordre de lecture : ce qui dépasse d'abord, puis ce qui approche du prévu, puis le reste. */
const rang = (l: LigneBudget): number =>
  l.etat === "depasse" || l.etat === "hors_estimation" ? 0 : l.etat === "attention" ? 1 : l.reel > 0 ? 2 : 3;

export default function BudgetReel({ reponses, projectId, depenses: initiales }: Props) {
  const locale = useLocale();
  const t = TR[locale];
  const fmt = (v: number): string => euros(locale, v);
  const plus = (v: number): string => "+" + fmt(v);
  const moins = (v: number): string => "−" + fmt(Math.abs(v));
  const pct = (v: number): string => pourcent(locale, v, 0);
  const nomCorps = (c: string): string => (c === CORPS_AUTRE ? t.autre : catT(locale, "corps", c));
  const dateCourte = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" });
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
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [saisie, setSaisie] = useState(initiales.length === 0);
  const refLibelle = useRef<HTMLInputElement>(null);

  if (!bilan) return null;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const m = lireMontant(montant);
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
      // On déplie le corps d'état concerné : la dépense ajoutée se voit tout de suite.
      setOuvert(choix);
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

  function saisirIci(c: string) {
    setChoix(c);
    setSaisie(true);
    setTimeout(() => refLibelle.current?.focus(), 0);
  }

  const texteAlerte = (a: Alerte): { cls: string; txt: string } | null => {
    switch (a.type) {
      case "depasse": return { cls: "r", txt: t.alerte.depasse(nomCorps(a.corps), fmt(a.montant)) };
      case "attention": return { cls: "o", txt: t.alerte.attention(nomCorps(a.corps), pct(a.part * 100)) };
      case "hors_estimation": return { cls: "o", txt: t.alerte.hors(nomCorps(a.corps), fmt(a.montant)) };
      // La prévision au-dessus de l'estimation est déjà dite par le verdict en tête.
      case "prevision_estimation": return null;
      case "prevision_budget": return { cls: "r", txt: t.alerte.prevBudget(fmt(a.montant)) };
    }
  };

  const aDesDepenses = depenses.length > 0;

  // Jauge du chantier : payé + reste à payer (prévision) face au repère de l'estimation.
  const echelle = Math.max(bilan.prevision, bilan.estimation, 1);
  const w = (v: number): string => `${Math.max(0, Math.min(100, (v / echelle) * 100))}%`;
  const ecart = bilan.ecartPrevision;
  const ecartPct = bilan.estimation > 0 ? (ecart / bilan.estimation) * 100 : 0;
  const verdict = ecart > 0.5
    ? { cls: "r", txt: t.verdictSur(plus(ecart), "+" + pct(ecartPct)) }
    : ecart < -0.5
      ? { cls: "g", txt: t.verdictSous(fmt(Math.abs(ecart)), "−" + pct(Math.abs(ecartPct))) }
      : { cls: "n", txt: t.verdictPile };
  const alertes = bilan.alertes.map(texteAlerte).filter((x): x is { cls: string; txt: string } => !!x);
  const reste = Math.max(0, bilan.prevision - bilan.reel);

  const lignesToutes = bilan.lignes
    .filter((l) => l.prevu > 0 || l.reel > 0)
    .sort((a, b) => rang(a) - rang(b) || (rang(a) === 0 ? b.ecart - a.ecart : rang(a) === 3 ? b.prevu - a.prevu : b.part - a.part));
  // D'abord les corps où l'on a dépensé ; les autres (0 €) restent repliés derrière un bouton.
  const actives = lignesToutes.filter((l) => l.reel > 0), sansDepense = lignesToutes.length - actives.length;
  const lignes = tous ? lignesToutes : actives;

  /** Colonne « Écart » : en € quand le chiffre est acquis (dépassement, lot terminé), en part du prévu
   *  tant que le lot est en cours (un écart négatif y ferait croire à une économie qui n'existe pas). */
  const celluleEcart = (l: LigneBudget) => {
    if (l.etat === "hors_estimation") return <><span className="pill r">{plus(l.reel)}</span><small>{t.stHors}</small></>;
    if (l.etat === "depasse") return <><span className="pill r">{plus(l.ecart)}</span><small>{l.prevu > 0 ? t.depasse + " +" + pct((l.ecart / l.prevu) * 100) : t.depasse}</small></>;
    if (l.reel <= 0) return <span>—</span>;
    if (l.termine) return <><span className="pill g">{moins(l.ecart)}</span><small>{t.economie}</small></>;
    return <><span className={"pill " + (l.etat === "attention" ? "o" : "n")}>{pct(l.part * 100)}</span><small>{t.duPrevu}</small></>;
  };

  const statut = (l: LigneBudget) =>
    l.etat === "hors_estimation" ? <span className="stp hors">{t.stHors}</span>
      : l.termine ? <span className="stp st2">{"✓ " + t.stFait}</span>
        : l.demarre || l.reel > 0 ? <span className="stp st1">{t.stCours}</span>
          : <span className="stp">{t.stAttente}</span>;

  const barre = (l: LigneBudget) => {
    const ech = Math.max(l.prevu, l.reel, 1);
    const p = (v: number): string => `${Math.max(0, Math.min(100, (v / ech) * 100))}%`;
    const dedans = Math.min(l.reel, l.prevu), dehors = Math.max(0, l.reel - l.prevu);
    const coul = l.termine && l.etat === "ok" ? " g" : l.etat === "attention" ? " o" : "";
    return (
      <span className="btrack" aria-hidden="true">
        {dedans > 0 && <i className={"f" + coul + (dehors > 0 ? " cut" : "")} style={{ width: p(dedans) }} />}
        {dehors > 0 && <i className="over" style={{ left: p(l.prevu), width: p(dehors) }} />}
        {l.prevu > 0 && <span className="mark" style={{ left: p(l.prevu) }} />}
      </span>
    );
  };

  return (
    <div className="card av-bud">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>{t.titre}</h2>
      <div className="sub">{t.sub}</div>

      {aDesDepenses && (
        <>
          <div className="prog">
            <div className="prow">
              <div className="ppct"><span className="nw">{fmt(bilan.prevision)}</span><small>{t.prevFinale}</small></div>
              <div className="plbl">
                <span>{t.estimation + " "}</span><span className="mono">{fmt(bilan.estimation)}</span>
                {bilan.budgetMax > 0 && <span>{" · " + t.budgetMax + " "}<span className="mono">{fmt(bilan.budgetMax)}</span></span>}
              </div>
            </div>
            <div className={"verdict " + verdict.cls}>{verdict.txt}</div>
            <div className="gtrack" aria-hidden="true">
              <i className="paye" style={{ width: w(bilan.reel) }} />
              <i className="reste" style={{ left: w(bilan.reel), width: w(reste) }} />
              {ecart > 0.5 && <i className="over" style={{ left: w(bilan.estimation), width: w(ecart) }} />}
              <span className="mark" style={{ left: w(bilan.estimation) }} />
            </div>
            <div className="chips">
              <span className="chip"><span className="cd paye" /><span>{t.paye}</span><b>{fmt(bilan.reel)}</b></span>
              <span className="chip"><span className="cd reste" /><span>{t.reste}</span><b>{fmt(reste)}</b></span>
              <span className="chip"><span className="cd mk" /><span>{t.repere}</span><b>{fmt(bilan.estimation)}</b></span>
            </div>
            {alertes.length > 0 && (
              <div className="alerts" role="status" aria-live="polite">
                {alertes.map((a, i) => <div key={i} className={`al ${a.cls}`}>{a.txt}</div>)}
              </div>
            )}
          </div>

          <div className="phase-t">
            <span className="pt-lbl">{t.parCorps}</span>
            <span className="pt-meta">{t.nbDep(depenses.length)}</span>
          </div>
          <div className="bh" aria-hidden="true"><span>{t.hCorps}</span><span>{t.hPrevu}</span><span>{t.hReel}</span><span>{t.hEcart}</span></div>
          {lignes.map((l) => {
            const ouv = ouvert === l.corps;
            const siennes = ouv ? depenses.filter((d) => d.corps === l.corps) : [];
            return (
              <div key={l.corps}>
                <button type="button" className="brow" aria-expanded={ouv} onClick={() => setOuvert(ouv ? null : l.corps)} title={t.voirDetail + nomCorps(l.corps)}>
                  <span className="nmb">
                    <span className="nm">
                      <svg className="chv" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="t">{nomCorps(l.corps)}</span>
                      {statut(l)}
                    </span>
                    {barre(l)}
                  </span>
                  <span className={"c mono" + (l.prevu > 0 ? "" : " vide")}><span className="lb">{t.hPrevu}</span>{l.prevu > 0 ? fmt(l.prevu) : "—"}</span>
                  <span className={"c mono" + (l.reel > 0 ? "" : " vide")}><span className="lb">{t.hReel}</span>{l.reel > 0 ? fmt(l.reel) : "—"}</span>
                  <span className="c mono"><span className="lb">{t.hEcart}</span>{celluleEcart(l)}</span>
                </button>
                {ouv && (
                  <div className="det">
                    {siennes.map((d) => (
                      <div key={d.id} className="hl">
                        <span className="d mono">{dateCourte(d.date)}</span>
                        <span className="tx" title={d.libelle}>{d.libelle}</span>
                        <span className="m mono">{fmt(d.montant)}</span>
                        <button type="button" onClick={() => supprimer(d)} aria-label={`${t.supprimer} ${d.libelle}`}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="lien" onClick={() => saisirIci(l.corps)}>{"+ " + t.ajouterIci}</button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {aDesDepenses ? (
        <div className="pied">
          {sansDepense > 0 ? (
            <button type="button" className="lien" onClick={() => setTous((v) => !v)} aria-expanded={tous}>
              {tous ? t.masquer : t.voirTous(sansDepense)}
            </button>
          ) : <span />}
          <button type="button" className={saisie ? "sec" : "add"} onClick={() => setSaisie((v) => !v)} aria-expanded={saisie}>
            {saisie ? t.fermer : "+ " + t.ajouter}
          </button>
        </div>
      ) : <p className="vide-msg">{t.vide}</p>}

      {saisie && (
        <form onSubmit={ajouter} aria-label={t.ajouter}>
          <label><span>{t.libCorps}</span>
            <select value={choix} onChange={(e) => setChoix(e.target.value)}>
              {corps.map((c) => <option key={c} value={c}>{nomCorps(c)}</option>)}
              <option value={CORPS_AUTRE}>{t.autre}</option>
            </select>
          </label>
          <label className="lib"><span>{t.libelle}</span>
            <input ref={refLibelle} value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={t.libellePh} maxLength={200} aria-invalid={err && !libelle.trim()} />
          </label>
          <label><span>{t.montant}</span>
            <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="decimal" placeholder="0" aria-invalid={err && !(lireMontant(montant) > 0)} />
          </label>
          <button type="submit" className="add" disabled={busy}>{busy ? t.enCours : t.valider}</button>
        </form>
      )}
      {err && <div className="err" role="alert">{t.erreur}</div>}
    </div>
  );
}
