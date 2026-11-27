"use client";

import type { ReactNode } from "react";
import { useBareme } from "@/lib/estimateur/bareme-client";
import { useLocale } from "@/components/i18n/LangProvider";

const TXT = {
  fr: { attente: "Chargement de l'estimation…", compte: "Ta session a expiré : reconnecte-toi pour voir ton estimation.", connexion: "Se connecter", erreur: "L'estimation n'a pas pu se charger.", reessayer: "Réessayer" },
  en: { attente: "Loading the estimate…", compte: "Your session expired: sign in again to see your estimate.", connexion: "Sign in", erreur: "The estimate could not load.", reessayer: "Try again" },
} as const;

/**
 * N'affiche son contenu qu'une fois le barème de prix installé dans le navigateur (`useBareme`, 27/11/2026) : il
 * n'est plus dans le JavaScript public, il arrive après connexion. Les écrans enfants calculent ensuite sur place,
 * exactement comme avant. Pendant le chargement (une fois par page ouverte), un encart de la hauteur voulue.
 */
export default function AvecBareme({ children, hauteur = 420 }: { children: ReactNode; hauteur?: number }) {
  const { etat, reessayer } = useBareme();
  const t = TXT[useLocale() === "en" ? "en" : "fr"];
  if (etat === "pret") return <>{children}</>;
  return (
    <div role="status" aria-live="polite" data-bareme={etat} style={{ minHeight: hauteur }}
      className="flex items-start justify-center rounded-card border border-line bg-surface p-6 text-[14px] text-muted">
      {etat === "attente" && <span className="animate-pulse">{t.attente}</span>}
      {etat === "compte" && (
        <span>{t.compte}{" "}
          <a className="font-medium text-brand-700 hover:underline"
            href={`/connexion?next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname + window.location.search)}`}>{t.connexion}</a>
        </span>
      )}
      {etat === "erreur" && (
        <span>{t.erreur}{" "}
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={reessayer}>{t.reessayer}</button>
        </span>
      )}
    </div>
  );
}
