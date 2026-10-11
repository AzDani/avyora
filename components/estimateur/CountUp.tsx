"use client";

/**
 * Compteurs animés, déplacés tels quels (C1). Deux versions, volontairement NON unifiées :
 *  - `CountUp` : détaillé (Estimateur.tsx), toujours formaté en fr-FR ;
 *  - `CountUpNf` : rapide (EstimateurRapide.tsx, importé sous le nom `CountUp`), format `nf`, classe `num`.
 * Les fusionner changerait le formatage et la durée d'animation du détaillé.
 */
import { useEffect, useRef } from "react";

/** Compteur animé (count-up, easeOutCubic) — repart de 0 à chaque montage. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Math.round(value || 0);
    const start = prev.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hidden = typeof document !== "undefined" && document.hidden; // rAF gelé en arrière-plan → set direct
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduce || hidden || start === target) { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; return; }
    const dur = Math.min(900, 320 + Math.abs(target - start) / 180);
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * e).toLocaleString("fr-FR");
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span ref={ref}>0</span>;
}

export function CountUpNf({ value, nf }: { value: number; nf: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const target = Math.round(value || 0), start = prev.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduce || document.hidden || start === target) { el.textContent = target.toLocaleString(nf); prev.current = target; return; }
    const dur = Math.min(700, 260 + Math.abs(target - start) / 400); let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts; const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * e).toLocaleString(nf);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { el.textContent = target.toLocaleString(nf); prev.current = target; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span ref={ref} className="num">0</span>;
}
