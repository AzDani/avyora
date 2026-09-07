"use client";

/**
 * Contrôle numérique unifié (surface / quantité) : pilule [ − valeur unité + ].
 * Gros boutons ±step, champ tapable au clavier, flèches natives masquées. Styles globaux `.av-step`
 * (globals.css) → même rendu partout (estimateur rapide ET détaillé). Variantes : `block` (pleine
 * largeur, champs libellés), `compact` (dense, quantités par tâche).
 */
export default function Stepper({
  value, onChange, min, max, step = 1, unit, block, compact, className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  block?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const dp = step < 1 ? 2 : 0; // décimales (ex. hauteur 0,1)
  const clamp = (n: number) => {
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return Number(n.toFixed(dp));
  };
  const bump = (d: number) => onChange(clamp(value + d));
  const cls = ["av-step", block ? "block" : "", compact ? "compact" : "", className].filter(Boolean).join(" ");

  return (
    <span className={cls}>
      <button type="button" onClick={() => bump(-step)} disabled={min != null && value <= min} aria-label="Diminuer">−</button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isNaN(v) ? (min ?? 0) : v);
        }}
      />
      {unit && <span className="u">{unit}</span>}
      <button type="button" onClick={() => bump(step)} disabled={max != null && value >= max} aria-label="Augmenter">+</button>
    </span>
  );
}
