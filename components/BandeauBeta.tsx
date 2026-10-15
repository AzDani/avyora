import { dict } from "@/lib/i18n/dictionaries";
import { betaActive, libellesBeta } from "@/lib/beta";
import type { Locale } from "@/lib/i18n/config";

/**
 * Bêta gratuite (lib/beta.ts) : l'encart de l'inscription. Ce que le compte donne (tout, jusqu'à la fin de la
 * bêta), ce qu'il ne coûte pas (aucune carte, aucun prélèvement), et ce qu'il promet (membre fondateur, tarif
 * de lancement à vie). Rendu seulement pendant la bêta : la page décide, ce composant ne lit pas l'heure.
 */
export function BandeauBeta({ locale }: { locale: Locale }) {
  const b = dict(locale).beta;
  const l = libellesBeta(locale);
  return (
    <div className="mb-5 rounded-field border border-brand-200 bg-brand-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-ink" data-bandeau-beta="">
      <p className="font-semibold">{b.bandeauTitre(l.fin)}</p>
      <p className="mt-1 text-muted">{b.bandeauTexte}</p>
      <p className="mt-2.5 flex items-start gap-2">
        <IconeFondateur className="mt-[3px] shrink-0 text-brand-600" />
        <span>{b.fondateur(l.tarif)}</span>
      </p>
    </div>
  );
}

/**
 * La pastille « Membre fondateur » (/projets, Mon compte) ; son infobulle dit ce qu'elle garantit, au futur pendant
 * la bêta (« quand AVYORA passera payant »), au présent après. Composant serveur : il lit l'heure à la requête.
 */
export function PastilleFondateur({ locale, sombre = false }: { locale: Locale; sombre?: boolean }) {
  const b = dict(locale).beta;
  const tarif = libellesBeta(locale).tarif;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
        (sombre ? "border border-white/15 bg-white/10 text-[#e9e5ff]" : "bg-brand-50 text-brand-700")
      }
      title={betaActive() ? b.membreFondateurTitre(tarif) : b.membreFondateurTitreApres(tarif)}
      data-membre-fondateur=""
    >
      <IconeFondateur className="shrink-0" />
      {b.membreFondateur}
    </span>
  );
}

function IconeFondateur({ className }: { className: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="currentColor" />
    </svg>
  );
}
