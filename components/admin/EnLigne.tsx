"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Visiteurs en ligne en ce moment (22/11/2026), comme le compteur de Vercel : lu toutes les 15 s
 * (`/api/admin/en-ligne`), seulement quand l'onglet de l'admin est visible. « En ligne » = un onglet ouvert et
 * visible sur le site dans les 90 dernières secondes (lib/presence.ts) ; l'admin lui-même n'est pas compté.
 * Un clic sur le compteur ouvre la liste : ville et pays approximatifs, page vue et, pour un membre connecté, son
 * pseudo et son e-mail, avec un lien vers sa fiche (décision de Dani du 23/11/2026). Sous la liste, l'historique de la
 * journée (`/api/admin/journee`, heure de Paris) : qui est passé aujourd'hui, arrivée, dernière activité, pages vues ;
 * lu à l'ouverture puis toutes les 60 s tant que la liste est ouverte.
 */
type Visiteur = {
  cle: string;
  chemin: string;
  pays?: string;
  ville?: string;
  userId?: string;
  compte?: { email: string; username: string } | null;
  vuLe: number;
};
type VisiteJour = {
  cle: string;
  userId?: string;
  pays?: string;
  ville?: string;
  compte?: { email: string; username: string } | null;
  arrivee: number;
  dernier: number;
  pages: string[];
};
type EtatJour =
  | { phase: "chargement" }
  | { phase: "indisponible" }
  | { phase: "ok"; total: number; membres: number; visiteurs: VisiteJour[]; tronque: boolean };

const heureParis = (ms: number) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(ms);

type Etat =
  | { phase: "chargement" }
  | { phase: "indisponible" }
  | { phase: "ok"; total: number; pages: { chemin: string; n: number }[]; visiteurs: Visiteur[]; le: number };

let nomsPays: Intl.DisplayNames | null = null;
function nomPays(code?: string): string {
  if (!code) return "";
  try {
    nomsPays ??= new Intl.DisplayNames(["fr"], { type: "region" });
    return nomsPays.of(code) ?? code;
  } catch {
    return code;
  }
}

export function lieu(v: { ville?: string; pays?: string }): string {
  return [v.ville, nomPays(v.pays)].filter(Boolean).join(", ") || "Lieu inconnu";
}

function depuis(ms: number, maintenant: number): string {
  const s = Math.max(0, Math.round((maintenant - ms) / 1000));
  return s < 5 ? "à l'instant" : `il y a ${s} s`;
}

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
  const [ouvert, setOuvert] = useState(false);
  const [jour, setJour] = useState<EtatJour>({ phase: "chargement" });

  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    async function lire() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/admin/journee", { cache: "no-store" });
        const d = await r.json();
        if (!actif) return;
        setJour(
          d?.disponible
            ? { phase: "ok", total: d.total, membres: d.membres, visiteurs: d.visiteurs ?? [], tronque: !!d.tronque }
            : { phase: "indisponible" },
        );
      } catch {
        if (actif) setJour({ phase: "indisponible" });
      }
    }
    lire();
    const minuterie = setInterval(lire, 60_000);
    return () => {
      actif = false;
      clearInterval(minuterie);
    };
  }, [ouvert]);

  useEffect(() => {
    let actif = true;
    async function lire() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/admin/en-ligne", { cache: "no-store" });
        const d = await r.json();
        if (!actif) return;
        setEtat(
          d?.disponible
            ? { phase: "ok", total: d.total, pages: d.pages ?? [], visiteurs: d.visiteurs ?? [], le: Date.now() }
            : { phase: "indisponible" },
        );
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
  const membres = etat.phase === "ok" ? etat.visiteurs.filter((v) => v.userId).length : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface" data-en-ligne="">
    <div aria-live="polite" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        disabled={etat.phase !== "ok"}
        aria-expanded={ouvert}
        title={ouvert ? "Masquer la liste" : "Voir qui est en ligne et l'historique de la journée"}
        aria-controls="en-ligne-liste"
        className="-m-1.5 flex items-center gap-3 rounded-xl p-1.5 text-left transition-colors enabled:hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-default"
      >
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
          {membres > 0 && <span className="text-faint"> · dont {membres} connecté{membres > 1 ? "s" : ""}</span>}
        </span>
        {etat.phase === "ok" && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`text-faint transition-transform ${ouvert ? "rotate-180" : ""}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

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
    </div>

    {ouvert && (
    <div id="en-ligne-liste">
    {etat.phase === "ok" && etat.visiteurs.length > 0 && (
      <ul className="divide-y divide-line border-t border-line" data-en-ligne-liste="">
        {etat.visiteurs.map((v) => (
          <li key={v.cle} className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5">
            <span className="min-w-0 truncate">
              {v.userId ? (
                <Link href={`/admin/inscrits/${v.userId}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                  {v.compte?.username || v.compte?.email || "Membre connecté"}
                  {v.compte?.username && v.compte.email && <span className="ml-1.5 font-normal text-muted">{v.compte.email}</span>}
                </Link>
              ) : (
                <span className="text-muted">Visiteur sans compte</span>
              )}
            </span>
            <span className="min-w-0 truncate text-muted">{lieu(v)}</span>
            <span className="min-w-0 truncate font-medium text-ink" title={v.chemin}>{nomPage(v.chemin)}</span>
            <span className="num text-[12px] text-faint">{depuis(v.vuLe, etat.le)}</span>
          </li>
        ))}
      </ul>
    )}
    <Journee etat={jour} />
    </div>
    )}
    </section>
  );
}

function Journee({ etat }: { etat: EtatJour }) {
  return (
    <div className="border-t border-line bg-surface-2/60" data-journee="">
      <p className="flex flex-wrap items-baseline gap-x-2 px-4 pb-2 pt-3.5 text-[13px] sm:px-5">
        <span className="font-semibold text-ink">Aujourd&apos;hui</span>
        <span className="text-muted">
          {etat.phase === "chargement"
            ? "chargement…"
            : etat.phase === "indisponible"
              ? "historique indisponible pour l'instant"
              : `${etat.total} visiteur${etat.total > 1 ? "s" : ""}${etat.membres > 0 ? ` · dont ${etat.membres} connecté${etat.membres > 1 ? "s" : ""}` : ""}`}
        </span>
        <span className="ml-auto text-[11.5px] text-faint">Depuis minuit (heure de Paris) · mis à jour toutes les 60 s</span>
      </p>
      {etat.phase === "ok" && etat.visiteurs.length > 0 && (
        <ul className="divide-y divide-line border-t border-line" data-journee-liste="">
          {etat.visiteurs.map((v) => (
            <li key={v.cle} className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 text-[13px] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto_minmax(0,1.4fr)] sm:items-center sm:px-5">
              <span className="min-w-0 truncate">
                {v.userId ? (
                  <Link href={`/admin/inscrits/${v.userId}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">
                    {v.compte?.username || v.compte?.email || "Membre connecté"}
                    {v.compte?.username && v.compte.email && <span className="ml-1.5 font-normal text-muted">{v.compte.email}</span>}
                  </Link>
                ) : (
                  <span className="text-muted">Visiteur sans compte</span>
                )}
              </span>
              <span className="min-w-0 truncate text-muted">{lieu(v)}</span>
              <span className="num whitespace-nowrap text-[12px] text-faint">
                {heureParis(v.arrivee) === heureParis(v.dernier) ? heureParis(v.arrivee) : `${heureParis(v.arrivee)} → ${heureParis(v.dernier)}`}
              </span>
              <span className="min-w-0 truncate text-ink" title={v.pages.map(nomPage).join(" → ")}>
                {v.pages.slice(-3).map(nomPage).join(" → ")}
                {v.pages.length > 3 && <span className="text-faint"> (+{v.pages.length - 3})</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {etat.phase === "ok" && etat.tronque && (
        <p className="px-4 pb-3 text-[12px] text-faint sm:px-5">Seuls les 300 derniers visiteurs sont listés.</p>
      )}
    </div>
  );
}
