import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { choixNature } from "@/lib/nature-projet";
import SuiviChoixNature from "./SuiviChoixNature";
import { CHOIX_CSS, PRE_PAGE_CSS } from "./choix-styles";

/**
 * Pré-page « Quel est ton projet ? » (N2), 1ʳᵉ étape de `/projets/nouveau` quand `FEATURES.neuf` est allumé
 * et que l'adresse ne dit pas encore la nature. Deux grandes cartes, chacune un lien entier vers la 2ᵉ étape
 * (`?nature=reno` ou `?nature=neuf`, l'écran Rapide / Détaillée). Les liens qui connaissent déjà la nature
 * (pages SEO, « Refaire », bloc final de l'accueil…) sautent cette page.
 *
 * Composant serveur qui ne lit pas la session (`getUser`) : la page est la même pour tous. La seule partie
 * client est la mesure `clic_nouveau_projet { nature }`, par délégation sur `data-choix-nature`.
 * Textes : `dictNeuf(locale).choix`, hors du dictionnaire global (son poids ne bouge pas).
 */
export default async function ChoixNature() {
  const { t: tr, locale } = await getT();
  const n = dictNeuf(locale).choix;

  return (
    <div className="av-choix">
      <style dangerouslySetInnerHTML={{ __html: CHOIX_CSS + PRE_PAGE_CSS }} />
      <SuiviChoixNature />

      <header className="animate-rise">
        <p className="eyebrow">{tr.choix.eyebrow}</p>
        <h1 className="ttl">{n.preTitre}</h1>
        <p className="sub">{n.preSous}</p>
      </header>

      <nav className="natures" aria-label={n.natureAria}>
        {/* Le nom accessible du lien : le titre, puis la description (pas le texte du bouton dessiné). */}
        <Link href="/projets/nouveau?nature=reno" className="nat" aria-labelledby="nat-reno-t" aria-describedby="nat-reno-d" {...choixNature("reno")}>
          <span className="nat-ico" aria-hidden="true">
            {/* Rouleau de peinture */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3.5" width="14" height="5.5" rx="1.6" />
              <path d="M17 6.2h2.2a1.3 1.3 0 0 1 1.3 1.3v2.4a1.3 1.3 0 0 1-1.3 1.3H11v2.6" />
              <rect x="9.4" y="13.8" width="3.2" height="6.7" rx="1.1" />
            </svg>
          </span>
          <h2 id="nat-reno-t">{n.reno}</h2>
          <p id="nat-reno-d">{n.renoDesc}</p>
          <span className="spacer" />
          <span className="nat-go" aria-hidden="true">{n.renoGo}</span>
        </Link>

        <Link href="/projets/nouveau?nature=neuf" className="nat" aria-labelledby="nat-neuf-t" aria-describedby="nat-neuf-d" {...choixNature("neuf")}>
          <span className="nat-ico" aria-hidden="true">
            {/* Grue au-dessus d'une maison */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 21V3.5M3 6h17.5M6 3.5 9.5 6M17 6v3.2" />
              <path d="M11 21v-5.6l4.5-3.6 4.5 3.6V21" />
              <path d="M2.5 21h19" />
            </svg>
          </span>
          <h2 id="nat-neuf-t">{n.neuf}</h2>
          <p id="nat-neuf-d">{n.neufDesc}</p>
          <span className="spacer" />
          <span className="nat-go" aria-hidden="true">{n.neufGo}</span>
        </Link>
      </nav>

      <div className="hint">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" /><path d="M10 9v5M10 6.2v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span>{n.preHint}</span>
      </div>
    </div>
  );
}
