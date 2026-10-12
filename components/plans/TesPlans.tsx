"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LangProvider";
import ApercuPlan from "@/components/plans/ApercuPlan";
import ClaimPlan from "@/components/plans/ClaimPlan";
import { dictPlans, formatsPlans, type DictPlans } from "@/lib/i18n/plans";
import type { ApercuMur } from "@/lib/plans/apercu";
import {
  CLE_RECLAMATION_PLAN,
  ID_PLAN_LOCAL,
  apercuLocal,
  assurerIdTampon,
  lirePlansLocaux,
  stockageNavigateur,
  type PlanLocal,
} from "@/lib/plans/local";

/**
 * « Tes plans », l'îlot client en tête de la vitrine `/logiciel-plan-maison` (C5).
 *
 * La page serveur ne lit pas la session : son HTML (celui que Google indexe) est celui d'un visiteur
 * sans compte, c'est-à-dire l'appel « Créer mon plan ». Une fois chargé, l'îlot devient :
 *  - connecté (`GET /api/plans` → 200) : les cartes du compte (vignette dessinée par React depuis
 *    l'aperçu du serveur, type, surface, date, « Ouvrir », estimations nées du plan), puis « Nouveau
 *    plan » ou, en gratuit à la limite, « Avec Pro : des plans enregistrés sans limite ». Un plan local
 *    en attente de reprise (drapeau) part d'abord (`ClaimPlan`) ;
 *  - sans compte (401) avec des plans dans ce navigateur : « Reprendre « {nom} » » et « Garde-le dans
 *    ton compte » (drapeau, puis inscription : la reprise se fait au retour) ;
 *  - au téléphone (on n'y dessine pas) : le bouton principal devient « M'envoyer le lien » (partage du
 *    système, à défaut copie), « Ouvrir » reste possible pour consulter.
 * La hauteur est réservée (`min-h`) : le passage d'un état à l'autre ne décale pas la page.
 */

type Carte = {
  id: string;
  nom: string;
  workflow: "final_plan" | "renovation";
  resume: { m2?: number; pieces?: number } | null;
  apercu: ApercuMur[] | null;
  updated_at: string;
  estimations: number;
};
type Liste = { plans: Carte[]; limite: number | null; utilises: number };
type Vue =
  | { v: "chargement" }
  | { v: "invite" }
  | { v: "local"; plans: PlanLocal[] }
  | { v: "compte"; liste: Liste }
  | { v: "erreur" };

const VISIBLES = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lireListe(j: unknown): Liste | null {
  if (!j || typeof j !== "object") return null;
  const o = j as { plans?: unknown; limite?: unknown; utilises?: unknown };
  if (!Array.isArray(o.plans)) return null;
  const plans: Carte[] = [];
  for (const p of o.plans) {
    if (!p || typeof p !== "object") continue;
    const c = p as Record<string, unknown>;
    if (typeof c.id !== "string" || !UUID.test(c.id)) continue;
    const r = c.resume && typeof c.resume === "object" ? (c.resume as Record<string, unknown>) : null;
    plans.push({
      id: c.id,
      nom: typeof c.nom === "string" ? c.nom : "",
      workflow: c.workflow === "final_plan" ? "final_plan" : "renovation",
      resume: r ? { m2: Number(r.m2) || 0, pieces: Number(r.pieces) || 0 } : null,
      apercu: Array.isArray(c.apercu) ? (c.apercu as ApercuMur[]) : null,
      updated_at: typeof c.updated_at === "string" ? c.updated_at : "",
      estimations: Number(c.estimations) || 0,
    });
  }
  const limite = typeof o.limite === "number" ? o.limite : null;
  return { plans, limite, utilises: Number(o.utilises) || plans.length };
}

export default function TesPlans() {
  const locale = useLocale();
  const t = dictPlans(locale);
  const [vue, setVue] = useState<Vue>({ v: "chargement" });
  const [telephone, setTelephone] = useState(false);
  const [reprise, setReprise] = useState(false);

  const charger = useCallback(async (): Promise<void> => {
    let r: Response;
    try {
      r = await fetch("/api/plans", { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch {
      setVue({ v: "erreur" });
      return;
    }
    if (r.status === 401) {
      const s = stockageNavigateur();
      const locaux = s ? lirePlansLocaux(s) : [];
      setVue(locaux.length ? { v: "local", plans: locaux } : { v: "invite" });
      return;
    }
    if (!r.ok) {
      setVue({ v: "erreur" });
      return;
    }
    let liste: Liste | null = null;
    try {
      liste = lireListe(await r.json());
    } catch {
      liste = null;
    }
    if (!liste) {
      setVue({ v: "erreur" });
      return;
    }
    setVue({ v: "compte", liste });
    const s = stockageNavigateur();
    let drapeau: string | null = null;
    try {
      drapeau = s ? s.getItem(CLE_RECLAMATION_PLAN) : null;
    } catch {
      drapeau = null;
    }
    if (drapeau) setReprise(true);
  }, []);

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(max-width: 600px)");
      setTelephone(mq.matches);
    } catch {
      mq = null;
    }
    const suivre = (e: MediaQueryListEvent) => setTelephone(e.matches);
    mq?.addEventListener?.("change", suivre);
    void charger();
    return () => mq?.removeEventListener?.("change", suivre);
  }, [charger]);

  return (
    <section className="min-h-[19rem]" aria-live="polite" aria-busy={vue.v === "chargement"}>
      {vue.v === "compte" ? (
        <Compte
          t={t}
          liste={vue.liste}
          telephone={telephone}
          reprise={reprise ? <ClaimPlan pro={vue.liste.limite === null} onFini={() => void charger()} /> : null}
        />
      ) : vue.v === "local" ? (
        <Locaux t={t} plans={vue.plans} telephone={telephone} />
      ) : (
        <Appel t={t} telephone={telephone} erreur={vue.v === "erreur"} />
      )}
    </section>
  );
}

/* ─── Sans plan : l'appel (c'est aussi le HTML serveur) ─────────────────────── */

/** Un plan d'illustration pour l'appel (un rez-de-chaussée simple) : un dessin, pas une donnée. */
const ILLUSTRATION: ApercuMur[] = [
  [0, 0, 10, 0, "mur", ""], [10, 0, 10, 7, "mur", ""], [10, 7, 0, 7, "mur", ""], [0, 7, 0, 0, "mur", ""],
  [4, 0, 4, 4.2, "cloison", ""], [0, 4.2, 6.5, 4.2, "cloison", ""], [6.5, 4.2, 6.5, 7, "cloison", ""],
  [7, 0, 7, 2.6, "cloison", ""], [7, 2.6, 10, 2.6, "cloison", ""],
];

function Appel({ t, telephone, erreur }: { t: DictPlans; telephone: boolean; erreur: boolean }) {
  return (
    <div className="card grid min-h-[19rem] items-center gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:p-8">
      <div className="flex flex-col gap-4">
        <p className="max-w-xl text-[15px] leading-relaxed text-muted">{t.hub.creerSous}</p>
        <div className="flex flex-wrap items-center gap-3">
          {telephone ? (
            <EnvoyerLien t={t} />
          ) : (
            <Link href="/plan" className="btn btn-primary px-5 py-3 text-[15px]">
              {t.hub.creer}
            </Link>
          )}
        </div>
        <p className="text-[13px] text-faint">{t.hub.dessinNote}</p>
        {erreur && <p className="text-[13px] text-muted">{t.hub.erreurListe}</p>}
      </div>
      <div className="hidden h-44 rounded-field border border-line bg-surface-2 p-5 sm:block">
        <ApercuPlan murs={ILLUSTRATION} className="h-full w-full" />
      </div>
    </div>
  );
}

/* ─── Le lien vers l'éditeur, au téléphone ───────────────────────────────────── */

export function EnvoyerLien({ t, secondaire = false }: { t: DictPlans; secondaire?: boolean }) {
  const [partage, setPartage] = useState(false);
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    setPartage(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const envoyer = async () => {
    const url = `${window.location.origin}/plan`;
    if (partage) {
      try {
        await navigator.share({ title: t.hub.lienPartageTitre, text: t.hub.lienPartageTexte, url });
        return;
      } catch (e) {
        if ((e as { name?: string } | null)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void envoyer()}
        className={secondaire ? "btn btn-outline py-2.5" : "btn btn-primary px-5 py-3 text-[15px]"}
      >
        {partage ? t.hub.envoyerLien : t.hub.copierLien}
      </button>
      {copie && (
        <span className="text-[13px] text-muted" role="status">
          {t.hub.lienCopie}
        </span>
      )}
    </span>
  );
}

/* ─── Une carte de plan ──────────────────────────────────────────────────────── */

function CartePlan({
  t,
  nom,
  workflow,
  murs,
  m2,
  pieces,
  date,
  ouvert,
  children,
}: {
  t: DictPlans;
  nom: string;
  workflow: "final_plan" | "renovation";
  murs: ApercuMur[] | null;
  m2: number;
  pieces: number;
  date?: string;
  ouvert?: boolean;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const f = formatsPlans(locale);
  const ligne = [pieces > 0 && m2 > 0 ? t.commun.m2(f.m2(m2)) : "", pieces > 0 ? t.commun.pieces(pieces) : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="card flex min-w-0 flex-col overflow-hidden">
      <div className="flex h-28 items-center justify-center border-b border-line bg-surface-2 p-3">
        <ApercuPlan murs={murs} className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-ink" title={nom}>
            {nom}
          </span>
          {ouvert && <span className="text-[12px] text-faint">· {t.hub.ouvert}</span>}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span className={workflow === "final_plan" ? "badge-brand" : "chip"}>
            {workflow === "final_plan" ? t.commun.typeFinal : t.commun.typeReno}
          </span>
          {ligne && <span className="data">{ligne}</span>}
        </p>
        {date && <p className="text-[12px] text-faint">{t.commun.modifie(f.date(date))}</p>}
        {children && <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">{children}</div>}
      </div>
    </li>
  );
}

/* ─── Les estimations nées d'un plan (chargées à la demande) ─────────────────── */

type Estim = { id: string; nature: "neuf" | "renovation"; created_at: string };

function Estimations({ t, planId, n }: { t: DictPlans; planId: string; n: number }) {
  const locale = useLocale();
  const f = formatsPlans(locale);
  const [etat, setEtat] = useState<"ferme" | "charge" | "erreur" | Estim[]>("ferme");
  const ouvrir = async () => {
    if (Array.isArray(etat)) {
      setEtat("ferme");
      return;
    }
    setEtat("charge");
    try {
      const r = await fetch(`/api/plans/${encodeURIComponent(planId)}`, { headers: { Accept: "application/json" } });
      const j = r.ok ? ((await r.json()) as { estimations?: unknown }) : null;
      const l = Array.isArray(j?.estimations) ? (j!.estimations as Record<string, unknown>[]) : null;
      if (!l) throw new Error("estimations");
      setEtat(
        l
          .filter((e) => typeof e.id === "string" && UUID.test(e.id))
          .map((e) => ({
            id: e.id as string,
            nature: e.nature === "neuf" ? "neuf" : "renovation",
            created_at: typeof e.created_at === "string" ? e.created_at : "",
          })),
      );
    } catch {
      setEtat("erreur");
    }
  };
  return (
    <div className="w-full">
      <button
        type="button"
        className="text-[13px] font-medium text-brand-700 hover:underline"
        aria-expanded={Array.isArray(etat)}
        onClick={() => void ouvrir()}
      >
        {t.hub.estimations(n)}
      </button>
      {etat === "charge" && <p className="mt-1 text-[12px] text-faint">{t.hub.estimationsChargement}</p>}
      {etat === "erreur" && <p className="mt-1 text-[12px] text-muted">{t.hub.estimationsErreur}</p>}
      {Array.isArray(etat) && (
        <ul className="mt-1 space-y-1">
          {etat.map((e) => (
            <li key={e.id}>
              <Link href={`/projets/${encodeURIComponent(e.id)}`} className="text-[13px] text-ink hover:text-brand-700">
                {(e.nature === "neuf" ? t.hub.estimationNeuf : t.hub.estimationReno) +
                  (e.created_at ? ` · ${f.date(e.created_at)}` : "")}{" "}
                →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Connecté : les plans du compte ─────────────────────────────────────────── */

function Compte({
  t,
  liste,
  telephone,
  reprise,
}: {
  t: DictPlans;
  liste: Liste;
  telephone: boolean;
  reprise: React.ReactNode;
}) {
  const [tous, setTous] = useState(false);
  const gratuit = liste.limite !== null;
  const aLaLimite = gratuit && liste.utilises >= (liste.limite ?? 1);
  const visibles = tous ? liste.plans : liste.plans.slice(0, VISIBLES);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.hub.tesPlans}</h2>
        {gratuit && <p className="text-[13px] text-muted">{t.commun.gratuit}</p>}
      </div>
      {reprise}
      {liste.plans.length === 0 ? (
        <p className="card p-5 text-[14px] text-muted">{t.hub.aucunPlan}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((p) => {
            const nom = p.nom.trim() || t.commun.sansNom;
            return (
              <CartePlan
                key={p.id}
                t={t}
                nom={nom}
                workflow={p.workflow}
                murs={p.apercu}
                m2={p.resume?.m2 ?? 0}
                pieces={p.resume?.pieces ?? 0}
                date={p.updated_at}
              >
                <Link
                  href={`/plan?id=${encodeURIComponent(p.id)}`}
                  className="btn btn-outline py-2"
                  aria-label={t.hub.ouvrirAria(nom)}
                >
                  {t.hub.ouvrir}
                </Link>
                {p.estimations > 0 && <Estimations t={t} planId={p.id} n={p.estimations} />}
              </CartePlan>
            );
          })}
        </ul>
      )}
      {liste.plans.length > VISIBLES && (
        <button type="button" className="btn btn-ghost py-2" onClick={() => setTous((x) => !x)} aria-expanded={tous}>
          {tous ? t.hub.voirMoins : t.hub.voirTous(liste.plans.length)}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {telephone ? (
          <EnvoyerLien t={t} />
        ) : aLaLimite ? (
          <Link href="/tarifs?source=editeur-plan" className="btn btn-outline py-2.5">
            {t.hub.limitePro}
          </Link>
        ) : (
          <>
            <Link href="/plan?type=final" className="btn btn-primary py-2.5">
              {t.hub.nouveauPlan}
            </Link>
            {!gratuit && (
              <Link href="/plan?type=renovation" className="btn btn-outline py-2.5">
                {t.hub.nouveauReno}
              </Link>
            )}
          </>
        )}
      </div>
      {telephone && <p className="text-[13px] text-faint">{t.hub.dessinNote}</p>}
    </div>
  );
}

/* ─── Sans compte, avec des plans dans ce navigateur ─────────────────────────── */

function Locaux({ t, plans, telephone }: { t: DictPlans; plans: PlanLocal[]; telephone: boolean }) {
  const [tous, setTous] = useState(false);
  const principal = plans[0];
  const visibles = tous ? plans : plans.slice(0, VISIBLES);
  const garder = () => {
    const s = stockageNavigateur();
    if (!s) return;
    let id = principal.id;
    if (principal.ouvert && !ID_PLAN_LOCAL.test(id)) id = assurerIdTampon(s) ?? "";
    if (ID_PLAN_LOCAL.test(id)) {
      try {
        s.setItem(CLE_RECLAMATION_PLAN, id);
      } catch {
        /* sans stockage, la reprise se fera depuis l'éditeur (« Sur cet appareil ») */
      }
    }
    window.location.assign("/inscription?next=%2Fplan");
  };
  const note = principal.ouvert
    ? plans.length > 1
      ? t.hub.autresDansEditeur
      : null
    : plans.length > 1
      ? t.hub.tousDansEditeur
      : t.hub.unDansEditeur;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t.hub.surAppareil}</h2>
        <p className="mt-1 text-[13px] text-muted">{plans.length > 1 ? t.hub.surAppareilNotePl : t.hub.surAppareilNote}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((p, i) => (
          <CartePlan
            key={p.id || `ouvert-${i}`}
            t={t}
            nom={p.nom}
            workflow={p.workflow}
            murs={apercuLocal(p)}
            m2={Number(p.resume?.m2) || 0}
            pieces={Number(p.resume?.pieces) || 0}
            date={Number.isFinite(p.savedAt) && p.savedAt > 946684800000 ? new Date(p.savedAt).toISOString() : undefined}
            ouvert={p.ouvert}
          />
        ))}
      </ul>
      {plans.length > VISIBLES && (
        <button type="button" className="btn btn-ghost py-2" onClick={() => setTous((x) => !x)} aria-expanded={tous}>
          {tous ? t.hub.voirMoins : t.hub.voirTous(plans.length)}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {telephone && <EnvoyerLien t={t} />}
        <Link href="/plan" className={telephone ? "btn btn-outline py-2.5" : "btn btn-primary py-2.5"}>
          {principal.ouvert ? t.hub.reprendre(principal.nom) : t.reprise.ouvrirEditeur}
        </Link>
        <button type="button" className="btn btn-outline py-2.5" onClick={garder}>
          {t.hub.garder}
        </button>
      </div>
      <p className="text-[13px] text-muted">{t.hub.garderSous}</p>
      {note && <p className="text-[13px] text-faint">{note}</p>}
    </div>
  );
}
