import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";

/**
 * Écran d'authentification premium : formulaire à gauche, panneau de réassurance
 * de marque à droite (masqué sur mobile). Partagé par connexion et inscription.
 *
 * Pas de logo dans la carte : l'en-tête du site le montre déjà, à toutes les tailles. Le doublon repoussait le champ
 * e-mail et le bouton sous le pli d'un portable (1366 × 657). Le panneau est traduit (FR / EN) ; une page peut y mettre
 * son propre contenu (`panneau` : l'inscription pendant la bêta y montre la bêta, que la colonne du formulaire ne porte
 * alors que sur téléphone et tablette, où le panneau est masqué).
 */
export async function AuthShell({
  eyebrow,
  titre,
  sousTitre,
  children,
  bas,
  panneau,
}: {
  eyebrow: string;
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  bas?: ReactNode;
  panneau?: ReactNode;
}) {
  const p = (await getT()).t.auth.panneau;
  return (
    <div className="animate-rise py-4 sm:py-6">
      <div className="group/auth mx-auto grid w-full overflow-hidden rounded-panel border border-line bg-surface shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
        {/* ── Formulaire ── */}
        <div className="flex flex-col justify-center p-6 sm:px-10 sm:py-8">
          <div className="w-full max-w-sm">
            {/* L'écran « C'est envoyé » (data-lien-envoye) a son propre titre : celui de la page s'efface. */}
            <div className="group-has-[[data-lien-envoye]]/auth:hidden">
              <p className="eyebrow mb-2">{eyebrow}</p>
              <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[26px]">{titre}</h1>
              {sousTitre && <p className="mt-2 text-[15px] leading-relaxed text-muted">{sousTitre}</p>}
            </div>
            {/* Sur téléphone, tout remonte un peu : le champ e-mail de l'inscription doit apparaître sans défiler (B2). */}
            <div className="mt-5 sm:mt-6">{children}</div>
            {/* « Déjà un compte ? » / « Pas encore de compte ? » n'a plus d'objet une fois le lien envoyé. */}
            {bas && <div className="mt-7 border-t border-line pt-5 text-sm text-muted group-has-[[data-lien-envoye]]/auth:hidden">{bas}</div>}
          </div>
        </div>

        {/* ── Panneau de marque (desktop) ── */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#241f5e] to-[#191640] p-10 text-white lg:flex lg:flex-col lg:justify-center">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#7C3AED]/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-[#4F46E5]/20 blur-3xl" />
          <div className="relative max-w-sm">
            {panneau ?? (
            <>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              {p.badge}
            </span>
            <h2 className="mt-6 text-[28px] font-semibold leading-[1.15] tracking-tight">
              {p.titreA}
              <br />
              <span className="bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] bg-clip-text text-transparent">
                {p.titreB}
              </span>
            </h2>
            <ul className="mt-8 space-y-4">
              {p.parcours.map((e, i) => (
                <li key={e.verbe} className="flex items-start gap-3 text-[15px] leading-relaxed text-indigo-100/85">
                  <span className="data mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] bg-white/10 text-[11px] font-bold text-[#C4B5FD]">
                    {i + 1}
                  </span>
                  <span>
                    <b className="font-semibold text-white">{e.verbe}</b> {e.suite}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <dd className="data text-xl font-semibold text-white">200</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">{p.postes}</dt>
              </div>
              <div>
                <dd className="data text-xl font-semibold text-white">18</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">{p.corps}</dt>
              </div>
              <div>
                <dd className="data text-xl font-semibold text-white">{p.precisionValeur}</dd>
                <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">{p.precision}</dt>
              </div>
            </dl>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
