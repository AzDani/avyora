"use client";

/**
 * Briques partagées des estimateurs (détaillé rénovation, puis construction neuve) :
 * déplacées telles quelles depuis `components/Estimateur.tsx` (chantier C1 du branchement du neuf).
 * Le HTML rendu est figé par `tests/estimateur-briques.test.ts`.
 */
import { useState } from "react";
import NumStepper from "@/components/Stepper";
import type { CustomLine } from "@/lib/estimateur";

export const fmt = (n: number): string => Math.round(n).toLocaleString("fr-FR") + " €";

// ── Sous-composants ───────────────────────────────────────────────────────────
/** Prix « Fait faire » / « Je le fais » : clic = choisir le mode, double-clic sur le montant = éditer son prix, ↺ = reset. */
export function ChoicePrice({ label, active, activeCls, amount, edited, onSelect, onEdit, onReset }: {
  label: string; active: boolean; activeCls: string; amount: number | null; edited: boolean;
  onSelect: () => void; onEdit: (v: number) => void; onReset: () => void;
}) {
  const [ed, setEd] = useState(false);
  return (
    <span
      className={"ch" + (active ? " " + activeCls : "") + (edited ? " edited" : "")}
      role="button" tabIndex={0}
      onClick={() => { if (!ed) onSelect(); }}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !ed) { e.preventDefault(); onSelect(); } }}
    >
      {label}
      {ed ? (
        <input
          className="chin" type="number" inputMode="decimal" autoFocus
          defaultValue={amount != null ? Math.round(amount) : 0}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => { const v = parseFloat(e.currentTarget.value); setEd(false); if (!Number.isNaN(v) && v > 0 && v !== (amount != null ? Math.round(amount) : null)) onEdit(v); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEd(false); }}
        />
      ) : (
        <b onDoubleClick={(e) => { e.stopPropagation(); setEd(true); }} title="Double-clique pour mettre ton prix">{amount != null ? fmt(amount) : "—"}</b>
      )}
      {edited && !ed && <span className="chreset" role="button" title="Prix AVYORA par défaut" onClick={(e) => { e.stopPropagation(); onReset(); }}>↺</span>}
    </span>
  );
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fld">
      <label>{label}</label>
      {children}
      {hint && <div style={{ fontSize: "11.5px", color: "var(--faint)", lineHeight: 1.45, marginTop: "6px" }}>{hint}</div>}
    </div>
  );
}

export function Stepper({ label, hint, value, onStep }: { label: string; hint?: string; value: number; onStep: (d: number) => void }) {
  return (
    <div className="stp">
      <span className="l">{label}{hint && <small>{hint}</small>}</span>
      <span className="c">
        <button type="button" aria-label="moins" onClick={() => onStep(-1)}>−</button>
        <span className="v num">{value}</span>
        <button type="button" aria-label="plus" onClick={() => onStep(1)}>+</button>
      </span>
    </div>
  );
}

export const isUrl = (s?: string) => /^https?:\/\//i.test((s || "").trim());
export const CL_UNITS = ["m²", "ml", "u", "forfait", "jour", "m³", "tonne"];
export function CustomLines({ lines, onAdd, onUpd, onDel }: { lines: CustomLine[]; onAdd: () => void; onUpd: (id: string, patch: Partial<CustomLine>) => void; onDel: (id: string) => void }) {
  const [guide, setGuide] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const askDel = (id: string) => { setConfirmDel(id); setTimeout(() => setConfirmDel((c) => (c === id ? null : c)), 3000); };
  return (
    <div className="clwrap">
      {lines.map((l) => {
        const on = l.on !== false;
        // ── Tâche validée : rendu identique aux postes standards ──
        if (!l.draft) return (
          <div className="trow" key={l.id}>
            <button type="button" className={"cbx" + (on ? " on" : "")} onClick={() => onUpd(l.id, { on: !on })} aria-label={on ? "Décocher" : "Cocher"} />
            <span className="tn">{l.nom || "Ligne personnalisée"}<span className="pu">{fmt(l.prix || 0)} HT/{l.unite}{isUrl(l.note) ? " · " : ""}{isUrl(l.note) && <a className="cl-open" href={l.note} target="_blank" rel="noopener noreferrer">lien ↗</a>}</span></span>
            <span className="tctl">
              <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
              <span className="unit">{l.unite}</span>
              <button type="button" className="cl-icon" onClick={() => onUpd(l.id, { draft: true })} title="Modifier">✎</button>
              {confirmDel === l.id
                ? <button type="button" className="cl-delconfirm" onClick={() => { onDel(l.id); setConfirmDel(null); }}>Supprimer ?</button>
                : <button type="button" className="cl-icon" onClick={() => askDel(l.id)} title="Supprimer">🗑</button>}
              <span className="lineamt num">{fmt((l.prix || 0) * (l.qte || 0))}</span>
            </span>
          </div>
        );
        // ── Édition (nouvelle ligne ou modification) ──
        return (
        <div className="cl" key={l.id}>
          <div className="clr">
            <span className="clbadge">Ligne perso</span>
            <input className="cl-nom" placeholder="Nom de la tâche…" value={l.nom} onChange={(e) => onUpd(l.id, { nom: e.target.value })} />
            <input className="cl-prix num" type="number" inputMode="decimal" value={l.prix || ""} placeholder="0" onChange={(e) => onUpd(l.id, { prix: parseFloat(e.target.value) || 0 })} title="prix HT" />
            <span className="cl-sep">€ /</span>
            <select className="cl-unite" value={l.unite} onChange={(e) => onUpd(l.id, { unite: e.target.value })}>{CL_UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            <span className="cl-sep">×</span>
            <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
            <span className="cl-total num">= {fmt((l.prix || 0) * (l.qte || 0))}</span>
          </div>
          <div className="clr">
            <span className="cl-lk">🔗</span>
            <input className="cl-note" placeholder="Note ou lien matériau (https://…)" value={l.note || ""} onChange={(e) => onUpd(l.id, { note: e.target.value })} />
            <label className="cl-tvalab">TVA <select value={String(l.tva)} onChange={(e) => onUpd(l.id, { tva: parseFloat(e.target.value) })}><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></label>
            <button type="button" className="cl-info" onClick={() => setGuide(guide === l.id ? null : l.id)} title="Guide TVA">i</button>
          </div>
          {guide === l.id && <div className="cl-guide"><b>Quelle TVA ?</b> · <b>5,5 %</b> réno énergétique · <b>10 %</b> amélioration logement +2 ans (standard) · <b>20 %</b> neuf, −2 ans, local pro ou matériaux seuls.</div>}
          <div className="clr cl-actions">
            <button type="button" className="cl-valider" onClick={() => onUpd(l.id, { draft: false, on: true })} disabled={!l.nom.trim() || !(l.prix > 0)}>✓ Valider la tâche</button>
            <button type="button" className="cl-cancel" onClick={() => onDel(l.id)}>Annuler</button>
          </div>
        </div>
        );
      })}
      <button type="button" className="cl-add" onClick={onAdd}>＋ Ajouter une ligne personnalisée</button>
    </div>
  );
}
