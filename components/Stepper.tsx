"use client";

/**
 * Contrôle numérique unifié (surface / quantité). Gros boutons ±step, champ tapable, flèches natives
 * masquées. Styles globaux `.av-step` (globals.css) → même rendu partout. Variantes :
 *  - `field`   : look champ de formulaire (valeur + unité à gauche, stepper −/+ discret à droite) →
 *                pour les champs libellés (surface, hauteur, budget, aléas…).
 *  - `compact` : pilule dense (quantités par tâche, surfaces de pièces).
 *  - défaut    : pilule − valeur unité +.
 */
export default function Stepper({
  value, onChange, min, max, step = 1, unit, field, compact, block, className = "",
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
}) {
  const dp = step < 1 ? 2 : 0;
  const clamp = (n: number) => {
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return Number(n.toFixed(dp));
  };
  const bump = (d: number) => onChange(clamp(value + d));
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onChange(Number.isNaN(v) ? (min ?? 0) : v);
  };
  const input = (
    <input type="number" inputMode="decimal" value={value} min={min} max={max} step={step} onChange={onInput} />
  );
  const minus = <button type="button" onClick={() => bump(-step)} disabled={min != null && value <= min} aria-label="Diminuer">−</button>;
  const plus = <button type="button" onClick={() => bump(step)} disabled={max != null && value >= max} aria-label="Augmenter">+</button>;

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
