"use client";

import { useEffect, useRef, useState } from "react";

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * Nombre monétaire qui s'anime (compteur) de sa valeur précédente vers la nouvelle.
 * Sert deux usages : la « révélation » du résultat, et l'estimation live qui bouge à
 * chaque réponse. Respecte prefers-reduced-motion (affichage instantané).
 */
export default function AnimatedEuros({
  value,
  duration = 600,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  // Démarre légèrement en dessous à l'apparition (settle doux, pas un compteur « machine à sous »).
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(Math.round(value * 0.82));
  const premier = useRef(true);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = premier.current ? fromRef.current : fromRef.current;
    const to = value;
    premier.current = false;
    if (reduce || from === to) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const cur = from + (to - from) * eased;
      setDisplay(cur);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      fromRef.current = value; // point de départ de la prochaine transition
    };
  }, [value, duration]);

  return <span className={className}>{euros(display)}</span>;
}
