import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dict } from "@/lib/i18n/dictionaries";
import { FEATURES } from "@/lib/features";
import { dictPlans } from "@/lib/i18n/plans";
import { clicPlan } from "@/lib/plans/mesure";
import type { Locale } from "@/lib/i18n/config";
import PartirDePlan from "@/components/plans/PartirDePlan";
import { CHOIX_CSS } from "./choix-styles";
import { betaActive, libellesBeta, lienInscriptionBeta } from "@/lib/beta";

/**
 * Écran de choix au lancement d'une estimation : Rapide (gratuit) vs Détaillée (Pro).
 * `isPro` adapte la carte détaillée : accès direct pour les abonnés, upsell vers /tarifs sinon.
 * Point d'entrée du tunnel de vente : la carte Pro est visible par tous.
 *
 * Construction neuve (derrière `FEATURES.neuf`) : 2ᵉ étape, après la pré-page « Quel est ton projet ? »
 * (`ChoixNature`, N2). Le surtitre dit la nature choisie, avec un lien « Changer » vers la pré-page ; en
 * neuf, les mêmes cartes prennent les textes `neuf.choix` et mènent au rapide et au détaillé du neuf.
 * Les liens vers /tarifs portent la source (`choix-reno` ou `choix-neuf`), lue par la mesure et par le
 * lien « déjà Pro ». Flag éteint : ni surtitre ni source, HTML d'origine au caractère près.
 *
 * Bêta gratuite (lib/beta.ts) : la pastille « Pro » devient « Bêta » ; un connecté (Pro pendant la bêta) lit
 * « Inclus pendant la bêta », un anonyme « Créer mon compte gratuit », qui l'emmène à l'inscription puis, son
 * adresse confirmée, au détaillé qu'il voulait. Hors bêta, le HTML d'avant au caractère près.
 */
export default async function ChoixEstimation({ isPro, nature = "reno" }: { isPro: boolean; nature?: "reno" | "neuf" }) {
  const { t: tr, locale } = await getT();
  const neuf = FEATURES.neuf && nature === "neuf";
  const n = dictNeuf(locale).choix;
  // En neuf, seuls les textes propres à la construction changent ; le reste (tags, boutons, pieds) est commun.
  const t = neuf ? { ...tr.choix, ...n } : tr.choix;
  const lienRapide = neuf ? "/estimation-construction-maison" : "/estimation-travaux";
  const lienPro = neuf ? "/projets/nouveau/construction?new=1" : "/projets/nouveau/detaille?new=1";
  // Flag éteint : `/tarifs` nu, comme avant (la page de tarifs ne saurait pas d'où vient le visiteur).
  const lienTarifs = FEATURES.neuf ? `/tarifs?source=choix-${neuf ? "neuf" : "reno"}` : "/tarifs";
  const beta = betaActive();
  const b = tr.beta;
  // Pendant la bêta, un non-Pro est un anonyme : on l'envoie créer son compte, pas payer.
  const lienDetailFree = beta ? lienInscriptionBeta(lienPro, neuf ? "choix-neuf" : "choix-reno") : lienTarifs;

  return (
    <div className="av-choix">
      <style dangerouslySetInnerHTML={{ __html: (FEATURES.neuf ? CHOIX_CSS + CSS_SURTITRE : CHOIX_CSS) + (FEATURES.plans ? CSS_PLAN : "") }} />

      <header className="animate-rise">
        {/* Flag éteint : le surtitre d'origine, sans nature ni lien. */}
        {FEATURES.neuf ? (
          <div className="sur">
            <p className="eyebrow">{`${t.eyebrow} · ${neuf ? n.neuf : n.reno}`}</p>
            <Link href="/projets/nouveau" className="changer" aria-label={n.changerAria}>{n.changer}</Link>
          </div>
        ) : (
          <p className="eyebrow">{t.eyebrow}</p>
        )}
        <h1 className="ttl">{t.titre}</h1>
        <p className="sub">{t.sousTitre}</p>
      </header>

      <div className="grid">
        {/* RAPIDE — gratuit */}
        <section className="ch-card">
          <div className="row1">
            <span className="ico free" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" /></svg>
            </span>
            <span className="tag gratis">{t.rapideTag}</span>
          </div>
          <h2>{t.rapideTitre}</h2>
          <p className="lead">{t.rapideLead}</p>
          <ul>
            <Li tone="free">{t.rapideF1}</Li>
            <Li tone="free">{t.rapideF2}</Li>
            <Li tone="free">{t.rapideF3}</Li>
          </ul>
          <div className="spacer" />
          <Link href={lienRapide} className="btn btn-outline">{t.rapideCta}</Link>
          <p className="foot">{t.rapideFoot}</p>
        </section>

        {/* DÉTAILLÉE — Pro */}
        <section className="ch-card pro">
          <div className="row1">
            <span className="ico pro" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h10M4 12h16M4 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="17.5" cy="7" r="2.2" fill="currentColor" /><circle cx="13.5" cy="17" r="2.2" fill="currentColor" />
              </svg>
            </span>
            <span className="tag propill" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="currentColor" /></svg>
              {beta ? b.pastille : "Pro"}
            </span>
          </div>
          <h2>{t.detailTitre}</h2>
          <p className="lead">{t.detailLead}</p>
          <ul>
            <Li tone="pro">{t.detailF1}</Li>
            <Li tone="pro">{t.detailF2}</Li>
            <Li tone="pro">{t.detailF3}</Li>
          </ul>
          <div className="spacer" />

          {isPro ? (
            <>
              <Link href={lienPro} className="btn btn-pro">{t.detailCtaPro}</Link>
              <p className="foot">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="var(--color-accent-500)" /></svg>
                {beta ? b.choixFootConnecte(libellesBeta(locale).fin) : t.detailFootPro}
              </p>
            </>
          ) : beta ? (
            <>
              <Link href={lienDetailFree} className="btn btn-pro">{b.creerCompteFleche}</Link>
              <p className="foot">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4 .5-3 3 .8 4.3L8 11l-3.8 1.8L5 8.5 2 5.5 6 5l2-4Z" fill="var(--color-accent-500)" /></svg>
                {b.choixFootAnonyme}
              </p>
            </>
          ) : (
            <>
              <Link href={lienTarifs} className="btn btn-pro">{t.detailCtaFree}</Link>
              <p className="foot">
                <svg width="12" height="13" viewBox="0 0 14 16" fill="none"><path d="M3.5 7V5a3.5 3.5 0 1 1 7 0v2M2.5 7h9v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7Z" stroke="var(--color-faint)" strokeWidth="1.3" /></svg>
                {t.detailFootFree} <Link href={lienTarifs} className="lien">{t.detailFootLien}</Link>
              </p>
            </>
          )}
        </section>
      </div>

      {/* Éditeur de plan (C9) : un bandeau sous la grille, pas une 3ᵉ carte (la grille Gratuit / Pro ne bouge pas). */}
      {FEATURES.plans && <BandeauPlan neuf={neuf} isPro={isPro} locale={locale} beta={beta} />}

      <div className="hint">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" /><path d="M10 9v5M10 6.2v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span>{t.hintAvant}<b>{t.hintFort}</b>{t.hintApres}</span>
      </div>
    </div>
  );
}

/**
 * « Partir de mon plan » : neuf → un Plan final (`/plan?type=final`) ; rénovation en Pro → un Projet rénovation
 * (`/plan?type=renovation`) ; rénovation en gratuit → la même phrase, la pastille Pro et `/tarifs?source=choix-plan`
 * (D68 : le Projet rénovation est Pro). L'îlot `PartirDePlan` propose en plus le plan le plus récent du bon type.
 * Bêta gratuite : la pastille « Bêta » et « Créer mon compte gratuit », qui ramène à l'éditeur une fois le compte créé.
 */
function BandeauPlan({ neuf, isPro, locale, beta = false }: { neuf: boolean; isPro: boolean; locale: Locale; beta?: boolean }) {
  const t = dictPlans(locale).choix;
  const b = dict(locale).beta;
  const ouvert = neuf || isPro;
  return (
    <aside className="plan-band" aria-label={t.titre}>
      <span className="plan-ico" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 7.2 8 2.6l5.5 4.6V13a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V7.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6.3 13.8V9.6h3.4v4.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="plan-txt">
        <p className="plan-titre">
          {t.titre}
          {!ouvert && <span className="tag propill">{beta ? b.pastille : t.pro}</span>}
        </p>
        <p className="plan-d">{neuf ? t.neufTexte : t.renoTexte}</p>
        {ouvert && <PartirDePlan workflow={neuf ? "final_plan" : "renovation"} />}
        {ouvert && <p className="plan-tel">{dictPlans(locale).hub.dessinNote}</p>}
      </div>
      {/* Vers l'éditeur : une balise <a> (pas de préchargement de /plan, une autre application de 1,3 Mo) ; vers Tarifs : Link. */}
      {ouvert ? (
        <a href={neuf ? "/plan?type=final" : "/plan?type=renovation"} className="btn btn-outline plan-go" {...clicPlan("choix")}>
          {neuf ? t.neufLien : t.renoLien}
        </a>
      ) : beta ? (
        /* Bêta : le compte gratuit, puis l'éditeur (une balise <a>, comme tout lien qui mène à l'éditeur). */
        <a href={lienInscriptionBeta("/plan?type=renovation", "choix-plan")} className="btn btn-outline plan-go">
          {b.creerCompteFleche}
        </a>
      ) : (
        <Link href="/tarifs?source=choix-plan" className="btn btn-outline plan-go">
          {t.renoLienGratuit}
        </Link>
      )}
    </aside>
  );
}

function Li({ tone, children }: { tone: "free" | "pro"; children: React.ReactNode }) {
  return (
    <li>
      <svg className={tone === "pro" ? "ck-pro" : "ck-free"} width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="m4 10 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}


/* Bandeau « Partir de mon plan » (éditeur de plan, C9) : ajouté seulement quand FEATURES.plans est allumé. */
const CSS_PLAN = `
.av-choix .plan-band{margin-top:18px;display:flex;align-items:center;gap:16px;background:var(--color-surface);border:1px dashed var(--color-brand-200);border-radius:16px;padding:16px 18px}
.av-choix .plan-ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none;background:var(--color-brand-50);color:var(--color-brand-600)}
.av-choix .plan-txt{flex:1;min-width:0}
.av-choix .plan-titre{margin:0;font-size:15px;font-weight:600;color:var(--color-ink);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.av-choix .plan-d{margin:3px 0 0;font-size:13.5px;color:var(--color-muted);line-height:1.5}
.av-choix .plan-partir{margin:4px 0 0;min-height:1.25rem;font-size:13.5px}
.av-choix .plan-partir .lien{color:var(--color-brand-600);font-weight:500;text-decoration:none}
.av-choix .plan-partir .lien:hover{text-decoration:underline}
.av-choix .plan-band .plan-go{width:auto;flex:none;white-space:nowrap}
@media (max-width:720px){.av-choix .plan-band{flex-wrap:wrap}.av-choix .plan-ico{display:none}.av-choix .plan-band .plan-go{width:100%}}
.av-choix .plan-tel{display:none;margin:4px 0 0;font-size:12.5px;color:var(--color-faint)}
@media (max-width:600px){.av-choix .plan-tel{display:block}}
`;

/* Surtitre de nature et lien « Changer » (N2) : ajoutés seulement quand le flag est allumé. */
const CSS_SURTITRE = `
.av-choix .sur{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap}
.av-choix .changer{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--color-line);background:var(--color-surface);font-size:12.5px;font-weight:500;color:var(--color-brand-700);text-decoration:none;transition:background .15s,border-color .15s}
.av-choix .changer:hover{border-color:var(--color-brand-300);background:var(--color-brand-50)}
.av-choix .changer:focus-visible{outline:2px solid var(--color-brand-500);outline-offset:2px}
@media (pointer:coarse){.av-choix .changer{min-height:44px;padding:0 16px}}
`;
