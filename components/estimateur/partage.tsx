"use client";

/**
 * Briques partagées des estimateurs (détaillé rénovation, puis construction neuve) :
 * déplacées telles quelles depuis `components/Estimateur.tsx` (chantier C1 du branchement du neuf).
 * Le HTML rendu est figé par `tests/estimateur-briques.test.ts`. Textes : `dictDetail` (N6), au
 * tutoiement, en français et en anglais.
 */
import { useState, type ReactNode } from "react";
import NumStepper from "@/components/Stepper";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictDetail } from "@/lib/i18n/detail";
import type { CustomLine } from "@/lib/estimateur";

export const fmt = (n: number): string => Math.round(n).toLocaleString("fr-FR") + " €";

/** Un texte du dictionnaire avec ses passages en gras (`**…**`) : `<b>` autour de chacun. */
export function gras(s: string): ReactNode {
  const parts = s.split("**");
  if (parts.length === 1) return s;
  return parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p)).filter((x) => x !== "");
}

// ── Sous-composants ───────────────────────────────────────────────────────────
/** Prix « Fait faire » / « Je le fais » : clic = choisir le mode, double-clic sur le montant = éditer son prix, ↺ = reset. */
export function ChoicePrice({ label, active, activeCls, amount, edited, onSelect, onEdit, onReset }: {
  label: string; active: boolean; activeCls: string; amount: number | null; edited: boolean;
  onSelect: () => void; onEdit: (v: number) => void; onReset: () => void;
}) {
  const [ed, setEd] = useState(false);
  const t = dictDetail(useLocale()).ligne;
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
        <b onDoubleClick={(e) => { e.stopPropagation(); setEd(true); }} title={t.choixPrixTitre}>{amount != null ? fmt(amount) : "—"}</b>
      )}
      {edited && !ed && <span className="chreset" role="button" title={t.choixPrixReset} onClick={(e) => { e.stopPropagation(); onReset(); }}>↺</span>}
    </span>
  );
}

/** `htmlFor` (facultatif) relie le libellé au champ (l'`id` passé au champ). */
export function Field({ label, hint, children, htmlFor }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="fld">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: "11.5px", color: "var(--faint)", lineHeight: 1.45, marginTop: "6px" }}>{hint}</div>}
    </div>
  );
}

export function Stepper({ label, hint, value, onStep }: { label: string; hint?: string; value: number; onStep: (d: number) => void }) {
  const t = dictDetail(useLocale()).compteur;
  return (
    <div className="stp">
      <span className="l">{label}{hint && <small>{hint}</small>}</span>
      <span className="c">
        <button type="button" aria-label={t.moins} onClick={() => onStep(-1)}>−</button>
        <span className="v num">{value}</span>
        <button type="button" aria-label={t.plus} onClick={() => onStep(1)}>+</button>
      </span>
    </div>
  );
}

export const isUrl = (s?: string) => /^https?:\/\//i.test((s || "").trim());
export const CL_UNITS = ["m²", "ml", "u", "forfait", "jour", "m³", "tonne"];
const TVAS_DEFAUT = [5.5, 10, 20];
/** `guideTva` (facultatif, construction neuve) remplace le texte du guide « Quelle TVA ? » de la rénovation.
 *  `tvas` (facultatif) : les taux que le sélecteur propose pour une ligne, selon le régime du projet
 *  (`tauxPersoPossibles`) et le taux déjà enregistré de la ligne. Absent : 5,5 / 10 / 20 %. */
export function CustomLines({ lines, onAdd, onUpd, onDel, guideTva, tvas }: { lines: CustomLine[]; onAdd: () => void; onUpd: (id: string, patch: Partial<CustomLine>) => void; onDel: (id: string) => void; guideTva?: React.ReactNode; tvas?: (courant: number) => number[] }) {
  const locale = useLocale();
  const t = dictDetail(locale).perso;
  const ht = dictDetail(locale).liste.ht;
  /* L'unité enregistrée reste la valeur française ; seul l'affichage change (en français : identique). */
  const unite = (u: string) => t.unites[u] ?? u;
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
            <button type="button" className={"cbx" + (on ? " on" : "")} onClick={() => onUpd(l.id, { on: !on })} aria-label={on ? dictDetail(locale).ligne.decocher : dictDetail(locale).ligne.cocher} />
            <span className="tn">{l.nom || t.sansNom}<span className="pu">{fmt(l.prix || 0)} {ht}/{unite(l.unite)}{isUrl(l.note) ? " · " : ""}{isUrl(l.note) && <a className="cl-open" href={l.note} target="_blank" rel="noopener noreferrer">{t.lien}</a>}</span></span>
            <span className="tctl">
              <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
              <span className="unit">{unite(l.unite)}</span>
              <button type="button" className="cl-icon" onClick={() => onUpd(l.id, { draft: true })} title={t.modifier}>✎</button>
              {confirmDel === l.id
                ? <button type="button" className="cl-delconfirm" onClick={() => { onDel(l.id); setConfirmDel(null); }}>{t.supprimerQ}</button>
                : <button type="button" className="cl-icon" onClick={() => askDel(l.id)} title={t.supprimer}>🗑</button>}
              <span className="lineamt num">{fmt((l.prix || 0) * (l.qte || 0))}</span>
            </span>
          </div>
        );
        // ── Édition (nouvelle ligne ou modification) ──
        return (
        <div className="cl" key={l.id}>
          <div className="clr">
            <span className="clbadge">{t.badge}</span>
            <input className="cl-nom" placeholder={t.nomPlaceholder} value={l.nom} onChange={(e) => onUpd(l.id, { nom: e.target.value })} />
            <input className="cl-prix num" type="number" inputMode="decimal" value={l.prix || ""} placeholder="0" onChange={(e) => onUpd(l.id, { prix: parseFloat(e.target.value) || 0 })} title={t.prixTitre} />
            <span className="cl-sep">€ /</span>
            <select className="cl-unite" value={l.unite} onChange={(e) => onUpd(l.id, { unite: e.target.value })}>{CL_UNITS.map((u) => <option key={u} value={unite(u) !== u ? u : undefined}>{unite(u)}</option>)}</select>
            <span className="cl-sep">×</span>
            <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
            <span className="cl-total num">= {fmt((l.prix || 0) * (l.qte || 0))}</span>
          </div>
          <div className="clr">
            <span className="cl-lk">🔗</span>
            <input className="cl-note" placeholder={dictDetail(locale).ligne.notePlaceholder} value={l.note || ""} onChange={(e) => onUpd(l.id, { note: e.target.value })} />
            <label className="cl-tvalab">{t.tva} <select value={String(l.tva)} onChange={(e) => onUpd(l.id, { tva: parseFloat(e.target.value) })}>{(tvas ? tvas(l.tva) : TVAS_DEFAUT).map((v) => <option key={v} value={String(v)}>{t.taux(v)}</option>)}</select></label>
            <button type="button" className="cl-info" onClick={() => setGuide(guide === l.id ? null : l.id)} title={t.guideTitre}>i</button>
          </div>
          {guide === l.id && <div className="cl-guide">{guideTva ?? gras(t.guide)}</div>}
          <div className="clr cl-actions">
            <button type="button" className="cl-valider" onClick={() => onUpd(l.id, { draft: false, on: true })} disabled={!l.nom.trim() || !(l.prix > 0)}>{t.valider}</button>
            <button type="button" className="cl-cancel" onClick={() => onDel(l.id)}>{t.annuler}</button>
          </div>
        </div>
        );
      })}
      <button type="button" className="cl-add" onClick={onAdd}>{t.ajouter}</button>
    </div>
  );
}
