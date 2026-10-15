import { dict } from "@/lib/i18n/dictionaries";
import { betaActive, libellesBeta } from "@/lib/beta";
import type { Locale } from "@/lib/i18n/config";

/**
 * Bêta gratuite (lib/beta.ts) : l'en-tête de l'inscription (B2). La bêta en une ligne (« Gratuit jusqu'au 31 décembre
 * 2026 · deviens membre fondateur »), puis trois bénéfices courts : ce que le compte donne, ce qu'il ne coûte pas
 * (aucune carte), ce qu'il promet (le tarif de lancement à vie). Court exprès : sur un téléphone, le champ e-mail
 * doit rester visible sans défiler. Rendu seulement pendant la bêta : la page décide, ce composant ne lit pas l'heure.
 */
export function BandeauBeta({ locale }: { locale: Locale }) {
  const b = dict(locale).beta;
  const l = libellesBeta(locale);
  return (
    <div className="mb-6 rounded-field border border-brand-200 bg-brand-50 px-4 py-3" data-bandeau-beta="">
      <p className="flex items-start gap-2 text-[13.5px] font-semibold leading-snug text-brand-700">
        <IconeFondateur className="mt-[2px] shrink-0" />
        <span>{b.bandeauTitre(l.fin)}</span>
      </p>
      <ul className="mt-2 space-y-1 text-[13px] leading-snug text-ink">
        {b.benefices(l.tarif).map((x) => (
          <li key={x} className="flex items-start gap-2">
            <IconeCoche />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconeCoche() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-[2px] shrink-0 text-positive">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
