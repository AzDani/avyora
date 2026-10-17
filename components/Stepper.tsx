"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";

/* Libellés des deux boutons pour un lecteur d'écran (le rapide l'utilise aussi : deux mots ici plutôt
   qu'un dictionnaire de plus dans son paquet). */
const ARIA = { fr: { moins: "Diminuer", plus: "Augmenter" }, en: { moins: "Decrease", plus: "Increase" } } as const;

/**
 * Ce que le champ transmet pendant la frappe : le nombre tapé, sans bornes (`null` : rien). Avec
 * `aLaSortie`, rien : la valeur n'est prise qu'à la sortie du champ (`valeurSortie`), et un total qui
 * en dépend ne saute pas à chaque chiffre (taper « 180 » ne chiffre ni 1 ni 18 m²).
 */
export function valeurFrappe(texte: string, aLaSortie = false): number | null {
  if (aLaSortie || texte === "") return null;
  const v = parseFloat(texte);
  return Number.isNaN(v) ? null : v;
}

/** La valeur prise à la sortie du champ : bornée, arrondie au pas ; un champ vide vaut le minimum (ou 0). */
export function valeurSortie(texte: string, { min, max, step = 1 }: { min?: number; max?: number; step?: number }): number {
  const v = parseFloat(texte);
  let n = Number.isNaN(v) ? (min ?? 0) : v;
  if (min != null && n < min) n = min;
  if (max != null && n > max) n = max;
  return Number(n.toFixed(step < 1 ? 2 : 0));
}

/**
 * Contrôle numérique unifié (surface / quantité). Gros boutons ±step, champ tapable, flèches natives
 * masquées. Styles globaux `.av-step` (globals.css) → même rendu partout. Variantes :
 *  - `field`   : look champ de formulaire (valeur + unité à gauche, stepper −/+ discret à droite) →
 *                pour les champs libellés (surface, hauteur, budget, aléas…).
 *  - `compact` : pilule dense (quantités par tâche, surfaces de pièces).
 *  - défaut    : pilule − valeur unité +.
 *
 * Saisie : le champ peut rester VIDE pendant qu'on tape (pas de « snap » agressif au minimum) ;
 * la valeur n'est verrouillée (clamp min/max) qu'à la sortie du champ (blur). Par défaut, chaque
 * frappe est aussi transmise (sans bornes) ; avec `aLaSortie` (questionnaire du détaillé neuf, N9),
 * seule la sortie du champ (ou Entrée) la transmet, une fois. Les boutons −/+ la transmettent toujours.
 */
export default function Stepper({
  value, onChange, min, max, step = 1, unit, field, compact, block, className = "", id, aLaSortie,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  field?: boolean;
  compact?: boolean;
  block?: boolean;
  className?: string;
  /** Pour relier un `<label htmlFor>` au champ (facultatif : absent, le rendu ne change pas). */
  id?: string;
  /** La frappe n'est transmise qu'à la sortie du champ (ou sur Entrée), une seule fois, et seulement si
   *  la valeur a changé. Absent : chaque frappe est transmise, comme avant. */
  aLaSortie?: boolean;
}) {
  const aria = ARIA[useLocale()] ?? ARIA.fr;
  const dp = step < 1 ? 2 : 0;
  const clamp = (n: number) => {
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return Number(n.toFixed(dp));
  };

  // Texte affiché : local pendant la frappe, resynchronisé sur `value` quand le champ n'a pas le focus.
  const [raw, setRaw] = useState(String(value));
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setRaw(String(value)); }, [value]);

  const bump = (d: number) => { const n = clamp(value + d); setRaw(String(n)); onChange(n); };
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);                             // autorise le champ vide pendant la saisie
    const v = valeurFrappe(val, aLaSortie);
    if (v != null) onChange(v);              // propage sans clamp tant qu'on tape (sauf `aLaSortie`)
  };
  const onBlur = () => {
    editing.current = false;
    const n = valeurSortie(raw, { min, max, step });
    setRaw(String(n));
    if (!aLaSortie || n !== value) onChange(n);
  };
  const input = (
    <input id={id} type="number" inputMode="decimal" value={raw} min={min} max={max} step={step}
      onFocus={() => { editing.current = true; }} onChange={onInput} onBlur={onBlur}
      onKeyDown={aLaSortie ? (e) => { if (e.key === "Enter") e.currentTarget.blur(); } : undefined} />
  );
  const minus = <button type="button" onClick={() => bump(-step)} disabled={min != null && value <= min} aria-label={aria.moins}>−</button>;
  const plus = <button type="button" onClick={() => bump(step)} disabled={max != null && value >= max} aria-label={aria.plus}>+</button>;

  const cls = ["av-step", field ? "field" : "", compact ? "compact" : "", block ? "block" : "", className].filter(Boolean).join(" ");

  // Variante « champ » : valeur + unité à gauche, stepper groupé à droite.
  if (field) {
    return (
      <span className={cls}>
        {input}
        {unit && <span className="u">{unit}</span>}
        <span className="st">{minus}{plus}</span>
      </span>
    );
  }

  // Variantes pilule (compact / défaut) : − valeur unité +.
  return (
    <span className={cls}>
      {minus}
      {input}
      {unit && <span className="u">{unit}</span>}
      {plus}
    </span>
  );
}
