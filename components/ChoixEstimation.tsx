import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { dictNeuf } from "@/lib/i18n/neuf";
import { FEATURES } from "@/lib/features";
import { dictPlans } from "@/lib/i18n/plans";
import { clicPlan } from "@/lib/plans/mesure";
import type { Locale } from "@/lib/i18n/config";
import PartirDePlan from "@/components/plans/PartirDePlan";

/**
 * Écran de choix au lancement d'une estimation : Rapide (gratuit) vs Détaillée (Pro).
 * `isPro` adapte la carte détaillée : accès direct pour les abonnés, upsell vers /tarifs sinon.
 * Point d'entrée du tunnel de vente : la carte Pro est visible par tous.
 *
 * Construction neuve (derrière `FEATURES.neuf`) : une bascule « Rénovation | Construction neuve »
 * (deux liens, `?nature=neuf`) ; en neuf, les mêmes cartes prennent les textes `neuf.choix` et
 * mènent au rapide et au détaillé du neuf. Flag éteint : aucune bascule, HTML d'origine.
 */
export default async function ChoixEstimation({ isPro, nature = "reno" }: { isPro: boolean; nature?: "reno" | "neuf" }) {
  const { t: tr, locale } = await getT();
  const neuf = FEATURES.neuf && nature === "neuf";
  const n = dictNeuf(locale).choix;
  // En neuf, seuls les textes propres à la construction changent ; le reste (tags, boutons, pieds) est commun.
  const t = neuf ? { ...tr.choix, ...n } : tr.choix;
  const lienRapide = neuf ? "/estimation-construction-maison" : "/estimation-travaux";
  const lienPro = neuf ? "/projets/nouveau/construction?new=1" : "/projets/nouveau/detaille?new=1";

  const entete = (
    <header className="animate-rise">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="ttl">{t.titre}</h1>
      <p className="sub">{t.sousTitre}</p>
    </header>
  );

  return (
    <div className="av-choix">
      <style dangerouslySetInnerHTML={{ __html: (FEATURES.neuf ? CSS + CSS_NATURE : CSS) + (FEATURES.plans ? CSS_PLAN : "") }} />

      {/* Flag éteint : l'en-tête seul, à sa place d'origine (ni bascule ni trou dans l'arbre rendu). */}
      {FEATURES.neuf ? (
        <>
          {entete}
          <nav className="nature" aria-label={n.natureAria}>
            <Link href="/projets/nouveau" aria-current={neuf ? undefined : "page"}>{n.reno}</Link>
            <Link href="/projets/nouveau?nature=neuf" aria-current={neuf ? "page" : undefined}>{n.neuf}</Link>
          </nav>
        </>
      ) : entete}

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
              Pro
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
                {t.detailFootPro}
              </p>
            </>
          ) : (
            <>
              <Link href="/tarifs" className="btn btn-pro">{t.detailCtaFree}</Link>
              <p className="foot">
                <svg width="12" height="13" viewBox="0 0 14 16" fill="none"><path d="M3.5 7V5a3.5 3.5 0 1 1 7 0v2M2.5 7h9v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7Z" stroke="var(--color-faint)" strokeWidth="1.3" /></svg>
                {t.detailFootFree} <Link href="/tarifs" className="lien">{t.detailFootLien}</Link>
              </p>
            </>
          )}
        </section>
      </div>

      {/* Éditeur de plan (C9) : un bandeau sous la grille, pas une 3ᵉ carte (la grille Gratuit / Pro ne bouge pas). */}
      {FEATURES.plans && <BandeauPlan neuf={neuf} isPro={isPro} locale={locale} />}

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
 */
function BandeauPlan({ neuf, isPro, locale }: { neuf: boolean; isPro: boolean; locale: Locale }) {
  const t = dictPlans(locale).choix;
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
          {!ouvert && <span className="tag propill">{t.pro}</span>}
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

const CSS = `
.av-choix .ttl{font-size:clamp(24px,4vw,32px);font-weight:600;letter-spacing:-.02em;color:var(--color-ink);margin:6px 0 0}
.av-choix .sub{color:var(--color-muted);font-size:15px;margin:10px 0 0;max-width:52ch;line-height:1.6}
.av-choix .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}
@media (max-width:720px){.av-choix .grid{grid-template-columns:1fr}}
.av-choix .ch-card{position:relative;background:var(--color-surface);border:1px solid var(--color-line);border-radius:20px;
  padding:24px 22px;box-shadow:0 1px 2px rgba(21,23,43,.04),0 12px 30px -22px rgba(21,23,43,.30);display:flex;flex-direction:column}
.av-choix .ch-card.pro{border-color:var(--color-brand-200)}
.av-choix .ch-card.pro::before{content:"";position:absolute;inset:0;border-radius:20px;padding:1px;
  background:linear-gradient(140deg,var(--color-accent-400),var(--color-brand-600));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.5;pointer-events:none}
.av-choix .row1{display:flex;align-items:center;justify-content:space-between;gap:10px}
.av-choix .ico{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;flex:none}
.av-choix .ico.free{background:var(--color-brand-50);color:var(--color-brand-600)}
.av-choix .ico.pro{background:linear-gradient(140deg,#2b2568,var(--color-brand-900));color:var(--color-accent-300)}
.av-choix .tag{font-size:11px;font-weight:600;letter-spacing:.03em;padding:5px 11px;border-radius:999px;white-space:nowrap}
.av-choix .tag.gratis{background:var(--color-positive-soft);color:var(--color-positive)}
.av-choix .tag.propill{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;display:inline-flex;align-items:center;gap:5px}
.av-choix .ch-card h2{font-size:20px;font-weight:600;margin:18px 0 0;letter-spacing:-.01em;color:var(--color-ink)}
.av-choix .lead{color:var(--color-muted);font-size:14px;margin:7px 0 0;line-height:1.6}
.av-choix ul{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:11px}
.av-choix li{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--color-ink);line-height:1.5}
.av-choix li svg{flex:none;margin-top:2px}
.av-choix .ck-free{color:var(--color-brand-600)}
.av-choix .ck-pro{color:var(--color-accent-600)}
.av-choix .spacer{flex:1;min-height:18px}
.av-choix .btn{width:100%}
.av-choix .btn-outline{background:var(--color-surface);color:var(--color-brand-700);border:1px solid var(--color-line-strong)}
.av-choix .btn-outline:hover{background:var(--color-surface-2)}
.av-choix .btn-pro{background:linear-gradient(120deg,var(--color-accent-600),var(--color-brand-600));color:#fff;border:1px solid transparent}
.av-choix .btn-pro:hover{filter:brightness(1.06)}
.av-choix .foot{font-size:12.5px;color:var(--color-faint);margin-top:9px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}
.av-choix .foot .lien{color:var(--color-brand-600);text-decoration:none;font-weight:500}
.av-choix .foot .lien:hover{text-decoration:underline}
.av-choix .hint{margin-top:22px;background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:14px;padding:13px 16px;font-size:13px;color:var(--color-muted);display:flex;gap:10px;align-items:center;line-height:1.5}
.av-choix .hint svg{flex:none;color:var(--color-brand-500)}
.av-choix .hint b{color:var(--color-ink);font-weight:600}
`;

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

/* Bascule de nature (construction neuve) : ajoutée seulement quand le flag est allumé. */
const CSS_NATURE = `
.av-choix .nature{display:inline-flex;gap:4px;margin-top:20px;padding:4px;background:var(--color-surface-2);border:1px solid var(--color-line);border-radius:999px;max-width:100%}
.av-choix .nature a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 18px;border-radius:999px;font-size:14px;font-weight:500;color:var(--color-muted);text-decoration:none;white-space:nowrap;transition:background .15s,color .15s}
.av-choix .nature a:hover{color:var(--color-ink)}
.av-choix .nature a[aria-current="page"]{background:var(--color-surface);color:var(--color-brand-700);font-weight:600;box-shadow:0 1px 2px rgba(21,23,43,.08),0 2px 8px -4px rgba(21,23,43,.18)}
.av-choix .nature a:focus-visible{outline:2px solid var(--color-brand-500);outline-offset:2px}
@media (max-width:420px){.av-choix .nature{display:flex}.av-choix .nature a{flex:1;padding:0 10px;font-size:13.5px}}
@media (pointer:coarse){.av-choix .nature a{min-height:44px}}
`;
