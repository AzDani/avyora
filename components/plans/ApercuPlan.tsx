import type { ApercuMur } from "@/lib/plans/apercu";

/**
 * La vignette d'un plan : ses murs au trait, comme `miniPlanSVG` de l'éditeur (cloisons plus fines,
 * murs créés en couleur, murs démolis en pointillé). Épaisseurs en pixels (`non-scaling-stroke`) : la
 * vignette du hub est plus grande que celle de l'éditeur, le trait reste fin. Les données viennent de `apercuDepuisEtat`
 * (nombres et codes d'une liste fermée) et passent par React : tout est échappé, rien ne finit en
 * attribut tel que le client l'a écrit. Couleurs : jetons du thème.
 */
export default function ApercuPlan({ murs, className }: { murs: ApercuMur[] | null | undefined; className?: string }) {
  const ws = (murs ?? []).filter(
    (m) => Array.isArray(m) && [m[0], m[1], m[2], m[3]].every((n) => typeof n === "number" && Number.isFinite(n)),
  );
  if (!ws.length) return <svg viewBox="0 0 10 10" className={className} aria-hidden="true" focusable="false" />;
  const xs = ws.flatMap((m) => [m[0], m[2]]);
  const ys = ws.flatMap((m) => [m[1], m[3]]);
  const x0 = Math.min(...xs) - 0.5;
  const y0 = Math.min(...ys) - 0.5;
  const bw = Math.max(...xs) - x0 + 0.5;
  const bh = Math.max(...ys) - y0 + 0.5;
  return (
    <svg
      viewBox={`${x0} ${y0} ${bw} ${bh}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ws.map((m, i) => (
        <line
          key={i}
          x1={m[0]}
          y1={m[1]}
          x2={m[2]}
          y2={m[3]}
          strokeWidth={m[4] === "cloison" ? 1.25 : m[4] === "porteur" ? 3 : 2.25}
          strokeLinecap="square"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={m[5] === "demolir" ? "4 3" : undefined}
          opacity={m[5] === "demolir" ? 0.55 : undefined}
          style={{ stroke: m[5] === "creer" ? "var(--color-danger)" : "var(--color-brand-900)" }}
        />
      ))}
    </svg>
  );
}
