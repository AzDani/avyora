"use client";

import { useEffect, useState } from "react";

/**
 * Visiteurs en ligne en ce moment (22/11/2026), comme le compteur de Vercel : lu toutes les 15 s
 * (`/api/admin/en-ligne`), seulement quand l'onglet de l'admin est visible. « En ligne » = un onglet ouvert et
 * visible sur le site dans les 90 dernières secondes (lib/presence.ts) ; l'admin lui-même n'est pas compté.
 */
type Etat =
  | { phase: "chargement" }
  | { phase: "indisponible" }
  | { phase: "ok"; total: number; pages: { chemin: string; n: number }[]; le: number };

const NOMS: Record<string, string> = {
  "/": "Accueil",
  "/plan": "Éditeur de plan",
  "/tarifs": "Tarifs",
  "/inscription": "Inscription",
  "/connexion": "Connexion",
  "/projets": "Mes projets",
  "/projets/nouveau": "Estimation rapide",
  "/projets/nouveau/detaille": "Estimation détaillée",
  "/projets/nouveau/construction": "Construction neuve",
  "/estimation-travaux": "Estimation travaux",
  "/estimation-construction-maison": "Estimation construction",
  "/logiciel-plan-maison": "Logiciel plan maison",
  "/mon-espace/compte": "Mon compte",
  "/accompagnement-travaux": "Accompagnement",
};

export function nomPage(chemin: string): string {
  return NOMS[chemin] ?? chemin;
}

export default function EnLigne() {
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });

  useEffect(() => {
    let actif = true;
    async function lire() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/admin/en-ligne", { cache: "no-store" });
        const d = await r.json();
        if (!actif) return;
        setEtat(d?.disponible ? { phase: "ok", total: d.total, pages: d.pages ?? [], le: Date.now() } : { phase: "indisponible" });
      } catch {
        if (actif) setEtat({ phase: "indisponible" });
      }
    }
    lire();
    const minuterie = setInterval(lire, 15_000);
    document.addEventListener("visibilitychange", lire);
    return () => {
      actif = false;
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", lire);
    };
  }, []);

  const total = etat.phase === "ok" ? etat.total : null;
  const vivant = total != null && total > 0;

  return (
    <section
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3.5 sm:px-5"
      data-en-ligne=""
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          {vivant && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${vivant ? "bg-emerald-500" : "bg-line"}`} />
        </span>
        <span className="num text-[26px] font-bold leading-none tracking-tight text-ink">{total == null ? "—" : total}</span>
        <span className="text-[13.5px] font-medium text-muted">
          {etat.phase === "indisponible"
            ? "en ligne : compteur indisponible pour l'instant"
            : total === 1
              ? "visiteur en ligne"
              : "visiteurs en ligne"}
        </span>
      </div>

      {etat.phase === "ok" && etat.pages.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-1.5">
          {etat.pages.slice(0, 6).map((p) => (
            <li key={p.chemin} className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted" title={p.chemin}>
              {nomPage(p.chemin)} <span className="num font-semibold text-ink">{p.n}</span>
            </li>
          ))}
          {etat.pages.length > 6 && (
            <li className="px-1 py-1 text-[12px] text-faint">+{etat.pages.length - 6} pages</li>
          )}
        </ul>
      )}

      <span className="ml-auto text-[11.5px] text-faint">Actifs dans les 90 dernières secondes · mis à jour toutes les 15 s</span>
    </section>
  );
}
