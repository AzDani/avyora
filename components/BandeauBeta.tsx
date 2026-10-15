import { dict } from "@/lib/i18n/dictionaries";
import { betaActive, dateInsecable, libellesBeta } from "@/lib/beta";
import type { Locale } from "@/lib/i18n/config";

/**
 * Bêta gratuite (lib/beta.ts) : l'en-tête de l'inscription (B2). La bêta en une ligne (« Gratuit jusqu'au 31 décembre
 * 2026 · deviens membre fondateur »), puis trois bénéfices courts : ce que le compte donne, ce qu'il ne coûte pas
 * (aucune carte), ce qu'il promet (un tarif préférentiel à vie, SANS CHIFFRE pendant la bêta : il sera annoncé avant
 * sa fin). La date ne se coupe pas en fin de ligne (`dateInsecable`). Court exprès : sur un téléphone, le champ e-mail
 * doit rester visible sans défiler. Rendu seulement pendant la bêta : la page décide, ce composant ne lit pas l'heure.
 * Masqué sur l'écran « C'est envoyé » (`AuthShell`, groupe `auth`).
 */
export function BandeauBeta({ locale, className = "" }: { locale: Locale; className?: string }) {
  const b = dict(locale).beta;
  const l = libellesBeta(locale);
  return (
    <div className={`mb-4 rounded-field border border-brand-200 bg-brand-50 px-3.5 py-2.5 group-has-[[data-lien-envoye]]/auth:hidden sm:mb-6 sm:px-4 sm:py-3${className ? ` ${className}` : ""}`} data-bandeau-beta="">
      <p className="flex items-start gap-2 text-[13.5px] font-semibold leading-snug text-brand-700">
        <IconeFondateur className="mt-[2px] shrink-0" />
        <span>{b.bandeauTitre(dateInsecable(l.fin))}</span>
      </p>
      <ul className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-ink sm:mt-2 sm:space-y-1">
        {b.benefices.map((x) => (
          <li key={x} className="flex items-start gap-2">
            <IconeCoche />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * La bêta dans le panneau de marque de l'inscription (`AuthShell`, ordinateur) : la même promesse que `BandeauBeta`,
 * à côté du formulaire et non au-dessus. Sur un portable (1366 × 657), l'en-tête au-dessus du champ repoussait le
 * bouton « Recevoir mon lien d'accès » sous le pli ; à partir de `lg`, la colonne du formulaire n'a plus que le titre,
 * le rappel éventuel et le champ.
 */
export function PanneauBeta({ locale }: { locale: Locale }) {
  const b = dict(locale).beta;
  const l = libellesBeta(locale);
  return (
    <div data-panneau-beta="">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
        <IconeFondateur className="shrink-0" />
        {b.inscriptionEyebrow}
      </span>
      <h2 className="mt-6 text-[28px] font-semibold leading-[1.15] tracking-tight">
        {b.panneauTitre(dateInsecable(l.fin))}
        <br />
        <span className="bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] bg-clip-text text-transparent">{b.panneauFondateur}</span>
      </h2>
      <ul className="mt-8 space-y-4">
        {b.benefices.map((x) => (
          <li key={x} className="flex items-start gap-3 text-[15px] leading-relaxed text-indigo-100/85">
            <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] bg-white/10 text-[#C4B5FD]">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
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
 * La pastille « Membre fondateur » (/projets, Mon compte) ; son infobulle dit ce qu'elle garantit (un tarif
 * préférentiel à vie, sans chiffre) : annoncé avant la fin pendant la bêta, au présent après. Composant serveur : il
 * lit l'heure à la requête.
 */
export function PastilleFondateur({ locale, sombre = false }: { locale: Locale; sombre?: boolean }) {
  const b = dict(locale).beta;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
        (sombre ? "border border-white/15 bg-white/10 text-[#e9e5ff]" : "bg-brand-50 text-brand-700")
      }
      title={betaActive() ? b.membreFondateurTitre : b.membreFondateurTitreApres}
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
