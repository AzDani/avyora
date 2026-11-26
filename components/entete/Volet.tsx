"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Un volet de l'en-tête v2 (26/11/2026) : un bouton qui ouvre un panneau sous lui (Estimer, Artisans, Mon espace).
 * Le contenu (liens) est rendu côté serveur et passé en `children`. Se ferme au clic dehors, avec Échap (le focus
 * revient au bouton), en suivant un lien du panneau, et à chaque changement de page.
 */
export default function Volet({
  bouton, children, etiquette, aligne = "gauche", largeur = "w-80", classeBouton, data,
}: {
  /** Le contenu du bouton (texte, avatar…). Le chevron est ajouté ici. */
  bouton: ReactNode;
  children: ReactNode;
  /** Le nom du bouton pour les lecteurs d'écran, quand son contenu n'est pas un texte simple. */
  etiquette?: string;
  aligne?: "gauche" | "droite";
  /** La largeur du panneau (classe Tailwind). */
  largeur?: string;
  classeBouton?: string;
  /** Un repère pour les tests et la mesure (data-volet="…"). */
  data: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const chemin = usePathname();

  // Un changement de page ferme le volet.
  useEffect(() => { setOuvert(false); }, [chemin]);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => { if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") { setOuvert(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", dehors); document.removeEventListener("keydown", touche); };
  }, [ouvert]);

  return (
    <div ref={racine} className="relative" data-volet={data}>
      <button
        ref={btn}
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label={etiquette}
        onClick={() => setOuvert((o) => !o)}
        className={
          (classeBouton ?? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white")
          + (ouvert ? " bg-white/10 text-white" : "")
        }
      >
        {bouton}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={"shrink-0 transition-transform " + (ouvert ? "rotate-180" : "")}>
          <path d="M2 3.5 5 6.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {ouvert && (
        <div
          id={id}
          // Suivre un lien du panneau le ferme (la page change aussi, mais un lien vers la page courante ne la change pas).
          onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOuvert(false); }}
          className={
            "absolute top-[calc(100%+14px)] z-50 rounded-2xl border border-line bg-surface p-2 text-ink shadow-[0_24px_50px_-18px_rgba(30,27,75,0.45)] "
            + largeur + (aligne === "droite" ? " right-0" : " left-0")
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
