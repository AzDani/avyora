"use client";

import { Fragment, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I18N_ENABLED, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { dict } from "@/lib/i18n/dictionaries";
import { useLocale } from "./LangProvider";

/*
 * La langue CHOISIE (cookie av-lang), lue dans le navigateur. Un petit magasin partagé : les deux sélecteurs (en-tête
 * et pied de page) se mettent à jour ensemble quand l'un écrit le cookie. Côté serveur et à l'hydratation : null.
 */
const abonnes = new Set<() => void>();
function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}
function lireChoix(): Locale | null {
  const v = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`))?.[1];
  return isLocale(v) ? v : null;
}
function ecrireChoix(l: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  abonnes.forEach((f) => f());
}

/** L'info-bulle du bouton EN d'une page en français seulement : dans les deux langues (la page, elle, est en français). */
export const FRANCAIS_SEULEMENT = `${dict("en").langue.francaisSeulement} · ${dict("fr").langue.francaisSeulement}`;

/**
 * La page est-elle « figée » dans sa langue ? Oui quand la langue choisie (cookie, lu au navigateur) n'est pas celle
 * du rendu, une fois le rafraîchissement terminé : la page n'existe que dans la langue de son rendu.
 */
export function pageFigee(rendu: Locale, choisie: Locale | null, enCours: boolean): boolean {
  return !enCours && choisie !== null && choisie !== rendu;
}

/**
 * Sélecteur de langue FR/EN, discret. Pose le cookie av-lang puis rafraîchit (re-render serveur
 * avec la nouvelle langue). `tone` adapte les couleurs au fond (clair = footer, sombre = menu nuit).
 *
 * Pages en français seulement (revue anglais, constat 120) : les pages pré-rendues au build (légales, guides, prix,
 * `force-static`) n'ont qu'une version, française, et ne suivent pas le cookie ; un clic sur EN y « ne faisait rien ».
 * Elles se reconnaissent au navigateur : la langue choisie (cookie) n'est pas celle du rendu, une fois le
 * rafraîchissement fini. Le bouton EN y est alors désactivé, avec l'info-bulle « Page disponible en français
 * uniquement » ; FR reste actif (la page EST en français) et le reprendre remet le cookie à « fr ».
 */
export default function LangSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const locale = useLocale();
  const choisie = useSyncExternalStore(abonner, lireChoix, () => null);
  const [enCours, startTransition] = useTransition();

  // i18n désactivée : on ne montre pas le sélecteur (le reste du code i18n reste en place).
  if (!I18N_ENABLED) return null;

  const figee = pageFigee(locale, choisie, enCours);

  function set(l: Locale) {
    if (l === locale) {
      // La page est déjà dans cette langue : seul le choix enregistré peut différer (page en français seulement).
      if (choisie !== null && choisie !== l) ecrireChoix(l);
      return;
    }
    if (figee) return; // la page n'existe pas dans cette langue
    ecrireChoix(l);
    startTransition(() => router.refresh());
  }

  const base = tone === "dark" ? "text-indigo-200/70" : "text-faint";
  const active = tone === "dark" ? "text-white" : "text-ink";
  const classe = (l: Locale) => {
    if (l === locale) return `${active} font-semibold`;
    return figee ? `${base} cursor-not-allowed opacity-50` : `${base} hover:${active}`;
  };

  return (
    <div className="inline-flex items-center gap-0 text-xs font-medium" role="group" aria-label="Language">
      {(["fr", "en"] as const).map((l, i) => {
        const indisponible = figee && l !== locale;
        return (
          <Fragment key={l}>
            {i > 0 && <span className={base} aria-hidden="true">·</span>}
            <button
              type="button"
              onClick={() => set(l)}
              aria-pressed={locale === l}
              aria-disabled={indisponible || undefined}
              title={indisponible ? FRANCAIS_SEULEMENT : undefined}
              className={`px-2 py-2 transition-colors ${classe(l)}`}
            >
              {l.toUpperCase()}
              {indisponible && <span className="sr-only"> ({FRANCAIS_SEULEMENT})</span>}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
