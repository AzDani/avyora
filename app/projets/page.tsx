import Link from "next/link";
import { listProjets, type Projet } from "@/lib/data/projects";
import { estimationProjet, avancementProjet, natureProjet, modeProjet } from "@/lib/estimateur";
import ListeProjets, { type ProjetCarte, type PlansListe } from "@/components/ListeProjets";
import ClaimDraft from "@/components/ClaimDraft";
import ClaimPlan from "@/components/plans/ClaimPlan";
import ProUpsell from "@/components/ProUpsell";
import { getUser, estPro } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";
import { FEATURES } from "@/lib/features";
import { compterPlans, plansDesProjets, type LienPlan } from "@/lib/plans/data";
import { dictPlans } from "@/lib/i18n/plans";
import type { Locale } from "@/lib/i18n/config";
import { euros as eurosLocale, nombre } from "@/lib/i18n/nombres";
import { estMembreFondateur } from "@/lib/beta";
import { PastilleFondateur } from "@/components/BandeauBeta";

export const dynamic = "force-dynamic";

const TR = {
  fr: {
    portefeuille: "Portefeuille",
    deTravauxEstimes: "de travaux estimés",
    projetsActifs: "Projets actifs",
    valeurTravaux: "Valeur travaux",
    surfaceCumulee: "Surface cumulée",
    enChantier: "En chantier",
    projets: "Projets",
    intro: "Tes estimations de rénovation, retrouvées et modifiables à tout moment.",
    cap: (n: number, surface: string, nbChantier: number) =>
      `${n} projet${n > 1 ? "s" : ""} actif${n > 1 ? "s" : ""} · ${surface} m² cumulés` +
      (nbChantier > 0 ? ` · ${nbChantier} chantier${nbChantier > 1 ? "s" : ""} en cours` : ""),
  },
  en: {
    portefeuille: "Portfolio",
    deTravauxEstimes: "in estimated work",
    projetsActifs: "Active projects",
    valeurTravaux: "Work value",
    surfaceCumulee: "Total floor area",
    enChantier: "In progress",
    projets: "Projects",
    intro: "Your renovation estimates, saved and editable at any time.",
    cap: (n: number, surface: string, nbChantier: number) =>
      `${n} active project${n > 1 ? "s" : ""} · ${surface} m² total` +
      (nbChantier > 0 ? ` · ${nbChantier} in progress` : ""),
  },
} as const;

function versCarte(p: Projet, liens?: Map<string, LienPlan>): ProjetCarte {
  const est = estimationProjet(p.reponses);
  const av = avancementProjet(p.reponses);
  const lien = liens?.get(String(p.id));
  return {
    id: p.id,
    nom: p.nom,
    type_bien: p.type_bien,
    surface: p.surface,
    code_postal: p.code_postal,
    ttc: est?.ttc ?? 0,
    archived: p.archived,
    eurM2: est?.eurM2 ?? 0,
    statut: av.statut,
    donePct: av.pct,
    progPct: av.total > 0 ? Math.round((av.prog / av.total) * 100) : 0,
    nature: natureProjet(p.reponses),
    mode: modeProjet(p.reponses),
    ...(lien ? { plan: { id: lien.planId, nom: lien.nom } } : {}),
  };
}

/**
 * « Mes plans », C8 : le nombre de plans du compte et les liens projet → plan, pour la bande « Tes plans »
 * et la pastille « Depuis ton plan ». Interrupteur éteint : `null`, AUCUNE requête (ni `floor_plans` ni
 * `project_plans`). Une panne ne casse jamais la liste : sans lien ni bande, elle reste celle d'avant.
 */
async function plansDeLaListe(
  ids: string[],
  locale: Locale,
): Promise<{ liens: Map<string, LienPlan>; liste: PlansListe } | null> {
  if (!FEATURES.plans) return null;
  const [liens, total] = await Promise.all([
    plansDesProjets(ids).catch(() => new Map<string, LienPlan>()),
    compterPlans().catch(() => 0),
  ]);
  const t = dictPlans(locale).lien;
  return {
    liens,
    liste: {
      total,
      textes: { pastille: t.pastille, bande: t.bande, bandeSous: t.bandeSous, dessiner: t.dessiner },
    },
  };
}

/** Français : le format monétaire d'avant, au caractère près. Anglais : « 92,000 € », comme le rapide (N14). */
function euros(n: number, locale: Locale): string {
  if (locale === "en") return eurosLocale(locale, n);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function ProjetsPage() {
  const [user, actifs, archivesRows, locale] = await Promise.all([getUser(), listProjets(false), listProjets(true), getLocale()]);
  const s = TR[locale];
  const isPro = !!user && estPro(user);
  // Bêta gratuite (lib/beta.ts) : un compte créé avant la fin de la bêta porte la pastille « Membre fondateur ».
  const fondateur = estMembreFondateur(user);
  const plans = await plansDeLaListe([...actifs, ...archivesRows].map((p) => String(p.id)), locale);
  const projets = actifs.map((p) => versCarte(p, plans?.liens));
  const archives = archivesRows.map((p) => versCarte(p, plans?.liens));
  const sumTravaux = projets.reduce((s, p) => s + p.ttc, 0);
  const sumSurface = projets.reduce((s, p) => s + p.surface, 0);
  const nbEnChantier = projets.filter((p) => p.statut === "en_cours").length;
  // L'intro parle de rénovation : elle ne change que si l'utilisateur a au moins un projet neuf.
  const aDuNeuf = [...projets, ...archives].some((p) => p.nature === "neuf");

  return (
    <div className="space-y-8">
      {/* Le plan dessiné sans compte part AVANT l'estimation : il obtient son id du compte d'abord. */}
      {FEATURES.plans && <ClaimPlan pro={isPro} />}
      <ClaimDraft />

      {projets.length > 0 ? (
        <header className="av-hero animate-rise">
          <span className="glow" aria-hidden="true" />
          <span className="eb">
            <span className="dot" />
            {s.portefeuille}
          </span>
          {fondateur && <span className="relative z-[1] ml-2 align-middle"><PastilleFondateur locale={locale} sombre /></span>}
          <div className="big">
            <span className="data">{euros(sumTravaux, locale)}</span>
            <small>{s.deTravauxEstimes}</small>
          </div>
          <p className="cap">
            {s.cap(projets.length, nombre(locale, sumSurface), nbEnChantier)}
          </p>
          <div className="pills">
            <Pill k={s.projetsActifs} v={`${projets.length}`} />
            <Pill k={s.valeurTravaux} v={euros(sumTravaux, locale)} accent />
            <Pill k={s.surfaceCumulee} v={`${nombre(locale, sumSurface)} m²`} />
            <Pill k={s.enChantier} v={`${nbEnChantier}`} />
          </div>
        </header>
      ) : (
        <header className="animate-rise">
          <p className="eyebrow">{s.portefeuille}</p>
          {fondateur && <p className="mt-2"><PastilleFondateur locale={locale} /></p>}
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{s.projets}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {aDuNeuf ? dictNeufCommun(locale).introListe : s.intro}
          </p>
        </header>
      )}

      {!isPro && <ProUpsell />}

      <ListeProjets projets={projets} archives={archives} {...(plans ? { plans: plans.liste } : {})} />

      <style>{HERO_CSS}</style>
    </div>
  );
}

function Pill({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="pill">
      <div className="k">{k}</div>
      <div className={"v data" + (accent ? " acc" : "")}>{v}</div>
    </div>
  );
}

const HERO_CSS = `
.av-hero{position:relative;overflow:hidden;border-radius:20px;color:#fff;padding:26px 28px;
  background:linear-gradient(140deg,#1E1B4B,#241f5e 55%,#191640);
  box-shadow:0 24px 60px -26px rgba(30,27,75,.55)}
.av-hero .glow{position:absolute;width:340px;height:340px;border-radius:50%;background:rgba(124,58,237,.35);filter:blur(80px);top:-150px;right:-80px;pointer-events:none}
.av-hero .eb{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;font-weight:600;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);padding:5px 12px;border-radius:999px}
.av-hero .eb .dot{width:6px;height:6px;border-radius:50%;background:#a78bfa}
.av-hero .big{position:relative;z-index:1;font-size:clamp(28px,5vw,38px);font-weight:600;letter-spacing:-.02em;margin-top:14px;line-height:1}
.av-hero .big small{font-size:15px;opacity:.7;margin-left:9px;font-weight:500}
.av-hero .cap{position:relative;z-index:1;font-size:13px;color:#d7d4f2;margin-top:9px}
.av-hero .pills{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
.av-hero .pill{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px 14px;min-width:120px}
.av-hero .pill .k{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#b7b3e0}
.av-hero .pill .v{font-weight:600;font-size:16px;margin-top:4px}
.av-hero .pill .v.acc{color:#c4b5fd}
`;
