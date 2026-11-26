"use client";

import { useEffect, useRef, useState } from "react";
import { ZOOM_MAX, bornerCadrage, echelleCadrage, zoneCadrage, type Cadrage } from "@/lib/compte/photo";

const CADRE = 280;

/**
 * L'outil de cadrage de la photo de profil (demande de Dani du 26/11/2026) : la photo choisie s'ouvre dans une fenêtre ;
 * on la déplace (souris, doigt, flèches du clavier) et on zoome (curseur, molette, + et −) ; le cercle montre ce qui sera
 * gardé. « Valider » rend la zone carrée en pixels de l'image d'origine. Échap ou « Annuler » ferment sans rien garder.
 */
export default function RecadragePhoto({ fichier, onValider, onAnnuler }: {
  fichier: File;
  onValider: (zone: { x: number; y: number; cote: number }) => void;
  onAnnuler: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [dim, setDim] = useState<{ l: number; h: number } | null>(null);
  const [c, setC] = useState<Cadrage>({ zoom: 1, dx: 0, dy: 0 });
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const valider = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(fichier);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [fichier]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") onAnnuler(); };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [onAnnuler]);

  const maj = (n: Cadrage) => { if (dim) setC(bornerCadrage(n, dim.l, dim.h, CADRE)); };

  // La molette zoome (sans faire défiler la page derrière).
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      setC((p) => (dim ? bornerCadrage({ ...p, zoom: p.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }, dim.l, dim.h, CADRE) : p));
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  }, [dim]);

  const s = dim ? echelleCadrage(dim.l, dim.h, CADRE, c.zoom) : 1;

  const clavier = (e: React.KeyboardEvent) => {
    const pas = e.shiftKey ? 30 : 8;
    const k: Record<string, Partial<Cadrage>> = {
      ArrowLeft: { dx: c.dx - pas }, ArrowRight: { dx: c.dx + pas }, ArrowUp: { dy: c.dy - pas }, ArrowDown: { dy: c.dy + pas },
      "+": { zoom: c.zoom * 1.1 }, "=": { zoom: c.zoom * 1.1 }, "-": { zoom: c.zoom / 1.1 },
    };
    if (k[e.key]) { e.preventDefault(); maj({ ...c, ...k[e.key] }); }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#15172b]/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onAnnuler(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-cadrage" className="w-full max-w-[360px] rounded-3xl bg-surface p-5 shadow-[0_30px_60px_-20px_rgba(30,27,75,.5)]" data-recadrage="">
        <h2 id="titre-cadrage" className="text-[17px] font-semibold text-ink">Cadrer ta photo</h2>
        <p className="mt-0.5 text-[13px] text-muted">Déplace la photo et zoome : le cercle montre ce qui sera gardé.</p>

        <div
          ref={zoneRef}
          tabIndex={0}
          role="application"
          aria-label="Zone de cadrage : flèches pour déplacer, plus et moins pour zoomer"
          onKeyDown={clavier}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); glisse.current = { x: e.clientX, y: e.clientY, dx: c.dx, dy: c.dy }; }}
          onPointerMove={(e) => { const g = glisse.current; if (g) maj({ ...c, dx: g.dx + e.clientX - g.x, dy: g.dy + e.clientY - g.y }); }}
          onPointerUp={() => { glisse.current = null; }}
          onPointerCancel={() => { glisse.current = null; }}
          className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-[#15172b] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:cursor-grabbing"
          style={{ width: CADRE, height: CADRE }}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element -- l'image locale choisie, jamais envoyée telle quelle
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => { const i = e.currentTarget; setDim({ l: i.naturalWidth, h: i.naturalHeight }); setC({ zoom: 1, dx: 0, dy: 0 }); valider.current?.focus(); }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={dim ? { width: dim.l * s, height: dim.h * s, transform: `translate(calc(-50% + ${c.dx}px), calc(-50% + ${c.dy}px))` } : { opacity: 0 }}
            />
          )}
          {/* Le cercle gardé, le reste assombri. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(21,23,43,0.55)] ring-2 ring-white/80" />
        </div>

        <label className="mt-4 flex items-center gap-3 text-[13px] text-muted">
          <span aria-hidden="true">−</span>
          <input
            type="range" min={1} max={ZOOM_MAX} step={0.01} value={c.zoom}
            onChange={(e) => maj({ ...c, zoom: Number(e.target.value) })}
            aria-label="Zoom"
            className="h-2 flex-1 accent-brand-600"
          />
          <span aria-hidden="true">+</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onAnnuler} className="btn btn-ghost min-h-11 px-4 text-[14px]">Annuler</button>
          <button
            ref={valider}
            type="button"
            disabled={!dim}
            onClick={() => dim && onValider(zoneCadrage(c, dim.l, dim.h, CADRE))}
            className="btn btn-primary min-h-11 px-5 text-[14px] disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
