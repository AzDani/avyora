"use client";

/**
 * Estimation RAPIDE d'une construction neuve : 5 questions (+ garage, eaux usées) → `presetNeuf`
 * → MÊME moteur que le détaillé (`buildDevis(catalogueDe(ctx), ctx, sel)`).
 *
 * Recopie la MÉCANIQUE d'`EstimateurRapide` (rénovation) sans en importer la logique : drapeau
 * « a répondu », estimation réelle (saisie valide + total > 0 + code postal), conversion différée
 * de 1,8 s, « Affiner » par le brouillon, 401 → brouillon puis drapeau puis /inscription. Le
 * brouillon a sa propre clé (`avyora-neuf-v1`) et le drapeau sa propre valeur (`"neuf"`) : la
 * rénovation ne relit jamais un brouillon neuf.
 *
 * Deux usages : la page publique `/estimation-construction-maison`, et l'édition gratuite d'un
 * projet neuf (`edit`, PATCH au lieu de POST). `base` est une maison déjà décrite : un projet
 * DÉTAILLÉ rouvert en gratuit (sa description est une vraie saisie) ou une maison venue d'un plan.
 * Un projet RAPIDE rouvert n'a PAS de base : sa maison se déduit de ses 5 réponses, sinon les
 * chambres et salles d'eau déduites de l'ancienne surface survivraient à un changement de surface.
 *
 * Lien d'un Plan final (C7) : sur la page publique, un fragment `#plan=<base64url>` est lu au
 * montage. L'URL est nettoyée D'ABORD (`history.replaceState`), puis le fragment est décodé, validé
 * et traduit dans `lib/estimateur/plan-neuf.ts` (chargé à la demande : zod n'entre dans le bundle
 * que si un plan arrive). Le fragment ne part jamais au serveur ni dans un événement : la mesure
 * `neuf_depuis_plan` ne porte que `ok`, `niveaux` et une tranche de surface. La maison du plan
 * devient la `base` ; chaque valeur reprise porte un badge tant qu'elle n'est pas changée.
 *
 * « Mes plans » (C6, interrupteur allumé) : le lien porte aussi `&pid=` (plan du compte) ou `&pl=`
 * (plan de l'appareil), lus par `contexteNeuf`. Ils n'entrent dans l'origine QUE si le plan du fragment
 * est appliqué, et seulement pour le plan lu au montage : un `pid` sans `#plan=` ne relie rien. L'URL
 * nettoyée les retire aussi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildDevis, catalogueDe, presetNeuf, regionCoef, maisonComplete,
  type Finition, type QuiRealise, type MaisonNeuve, type Niveaux,
} from "@/lib/estimateur";
import {
  brouillonRapideNeuf, corpsProjetNeuf, lireReponsesRapideNeuf, CLE_BROUILLON_NEUF, CLE_AFFINER_NEUF, CLE_RETOUR_NEUF,
  CLE_RECLAMATION_NEUF, type ReponsesRapideNeuf, type OrigineNeuf,
} from "@/lib/estimateur/brouillon-neuf";
import type { InitialNeuf } from "@/lib/neuf-contexte";
import type { MaisonDuPlan, RefusPlan } from "@/lib/estimateur/plan-neuf";
import { FEATURES } from "@/lib/features";
import { suivre } from "@/lib/track";
import { conversionEstimation } from "@/lib/gtag";
import { useT, useLocale } from "@/components/i18n/LangProvider";
import { dictNeuf } from "@/lib/i18n/neuf";
import Stepper from "@/components/Stepper";
import { CountUpNf as CountUp } from "@/components/estimateur/CountUp";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import BilanRapideNeuf from "./BilanRapideNeuf";
import { NEUF_CSS } from "./neuf-styles";
import { mesurerPlan, mesureEstimationNeuf } from "@/lib/plans/mesure";

const FINITIONS: { v: Finition; lvl: number }[] = [
  { v: "eco", lvl: 1 },
  { v: "standard", lvl: 2 },
  { v: "premium", lvl: 3 },
];
const QUIS: { v: QuiRealise; lvl: number }[] = [
  { v: "pros", lvl: 1 },
  { v: "partie", lvl: 2 },
  { v: "max", lvl: 3 },
];
const CP = /^\d{5}$/;

export type EditNeuf = { projectId: string };

/** La recherche de l'URL, sans `pid` ni `pl` quand « Mes plans » est allumé (sinon telle quelle). */
function rechercheNettoyee(): string {
  const q = window.location.search;
  if (!FEATURES.plans || !q) return q;
  const p = new URLSearchParams(q);
  if (!p.has("pid") && !p.has("pl")) return q;
  p.delete("pid");
  p.delete("pl");
  const r = p.toString();
  return r ? `?${r}` : "";
}

export default function EstimateurRapideNeuf({
  isPro = false,
  initial,
  edit,
  base,
  initialR,
  origine,
  avertDetaille = false,
  statuts,
}: {
  isPro?: boolean;
  /** Contexte venu de l'URL de la page publique (déjà validé côté serveur). */
  initial?: InitialNeuf;
  /** Édition d'un projet EXISTANT (PATCH). Ne se mélange pas avec `initial`. */
  edit?: EditNeuf;
  /** Maison déjà décrite (détaillé rouvert en gratuit, plan) : défauts des questions. */
  base?: Partial<MaisonNeuve>;
  /** Réponses d'un projet rouvert. */
  initialR?: Partial<ReponsesRapideNeuf>;
  origine?: OrigineNeuf;
  /** Projet détaillé rouvert en gratuit : on prévient que ses réglages poste par poste seront remplacés. */
  avertDetaille?: boolean;
  /** Suivi de chantier du projet rouvert : gardé à l'enregistrement (le PATCH remplace toutes les réponses). */
  statuts?: Record<string, number>;
}) {
  const router = useRouter();
  const T = useT();
  const locale = useLocale();
  const s = dictNeuf(locale).saisie;
  const nf = locale === "en" ? "en-US" : "fr-FR";

  const [R, setR] = useState<ReponsesRapideNeuf>(() => ({
    surface: initialR?.surface ?? (!edit ? initial?.surface : undefined) ?? 100,
    niveaux: initialR?.niveaux ?? (!edit ? initial?.niveaux : undefined) ?? "pp",
    codePostal: initialR?.codePostal ?? (!edit ? initial?.cp : undefined) ?? "",
    finition: initialR?.finition ?? "standard",
    qui: initialR?.qui ?? "pros",
    garage: initialR?.garage ?? false,
    // Sans réponse, `presetNeuf` garde l'assainissement de la base (une micro-station décrite).
    assainissement: initialR ? initialR.assainissement : "collectif",
  }));
  /**
   * Le visiteur a-t-il RÉPONDU quelque chose ? Même règle que le rapide rénovation : tant que non,
   * aucun chiffre pour une maison que personne n'a décrite, et surtout aucune conversion. Un
   * contexte venu de l'URL ne compte pas. Un projet rouvert en édition, lui, a déjà été décrit :
   * on l'affiche d'emblée, mais la conversion attend une vraie action.
   */
  const [agi, setAgi] = useState(false);
  /** Retour de /tarifs (gratuit qui a cliqué le détail Pro) : ses réponses reviennent, et le chiffre
   *  s'affiche, mais ce n'est pas une nouvelle action (aucune mesure, aucune conversion). */
  const [retour, setRetour] = useState<{ base?: Partial<MaisonNeuve> } | null>(null);
  const affiche = agi || !!edit || !!retour;
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Le champ en faute (« Enregistrer » sans code postal ou surface) : marqué et focalisé. */
  const [champErr, setChampErr] = useState<"cp" | "surface" | null>(null);
  const signaler = (champ: "cp" | "surface", msg: string) => {
    setErreur(msg); setChampErr(champ);
    const el = document.getElementById(champ === "cp" ? "neuf-cp" : "neuf-surface");
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); }
  };

  /* ── Lien d'un Plan final ── */
  const [plan, setPlan] = useState<MaisonDuPlan | null>(null);
  const [refusPlan, setRefusPlan] = useState<RefusPlan | null>(null);
  const planLu = useRef(false);
  const planRange = useRef(false);
  /** Un plan a été appliqué au formulaire (et n'a pas été retiré depuis). */
  const planApplique = useRef(false);
  /** Le plan (compte ou appareil) d'où vient le lien, pour l'estimation reliée (C6). */
  const [lienPlan, setLienPlan] = useState<Pick<OrigineNeuf, "planId" | "planLocal">>({});
  /** `pid` / `pl` ne valent que pour le fragment lu au montage, pas pour un lien collé ensuite. */
  const liensConsommes = useRef(false);
  useEffect(() => {
    if (edit) return;
    function lireFragment() {
      let h = "";
      try { h = window.location.hash; } catch { /* noop */ }
      if (!h.startsWith("#plan=")) return;
      // L'URL est nettoyée AVANT toute lecture : ni l'historique, ni un partage, ni une mesure ne la voient.
      try { window.history.replaceState(null, "", window.location.pathname + rechercheNettoyee()); } catch { /* noop */ }
      const fragment = h.slice(6);
      const liens: Pick<OrigineNeuf, "planId" | "planLocal"> = liensConsommes.current ? {} : {
        ...(initial?.planId ? { planId: initial.planId } : {}),
        ...(initial?.planLocal ? { planLocal: initial.planLocal } : {}),
      };
      liensConsommes.current = true;
      import("@/lib/estimateur/plan-neuf").then(({ lirePlanNeuf, trancheSurface }) => {
        const r = lirePlanNeuf(fragment);
        if (r.refus) {
          // Un lien refusé APRÈS un plan déjà appliqué (même onglet) : le message dit « décris ta
          // maison ici », le formulaire doit donc redevenir vierge. On remet les valeurs du montage
          // (surface, niveaux, garage, code postal), on retire la maison du plan (base) et son
          // brouillon, et on attend une nouvelle action avant d'afficher un chiffre.
          if (planApplique.current) {
            planApplique.current = false;
            setAgi(false);
            setR((p) => ({
              ...p,
              surface: initial?.surface ?? 100,
              niveaux: initial?.niveaux ?? "pp",
              garage: false,
              codePostal: initial?.cp ?? "",
            }));
            try { localStorage.removeItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
          }
          setPlan(null);
          setLienPlan({});
          setRefusPlan(r.refus);
          suivre("neuf_depuis_plan", { ok: false, niveaux: null, tranche_surface: null });
          return;
        }
        const m = r.maison;
        planRange.current = false;   // nouvelle maison : rangée au prochain rendu
        planApplique.current = true;
        setRefusPlan(null);
        setPlan(r);
        setLienPlan(liens);
        setAgi(true);
        setR((p) => ({
          ...p,
          surface: m.surface ?? p.surface,
          niveaux: m.niveaux ?? p.niveaux,
          garage: (m.garage ?? 0) > 0,
          codePostal: m.codePostal ?? p.codePostal,
        }));
        suivre("neuf_depuis_plan", { ok: true, niveaux: m.niveaux ?? null, tranche_surface: trancheSurface(m.surface ?? 0) });
      }).catch(() => setRefusPlan("illisible"));
    }
    // Une seule lecture au montage (le double montage du mode strict ne relit rien), puis à chaque
    // nouveau lien collé dans le même onglet (seul le fragment change : pas de rechargement).
    if (!planLu.current) {
      planLu.current = true;
      // Retour de /tarifs dans le même onglet : les réponses d'avant le clic, sauf si un nouveau plan arrive.
      try {
        const raw = sessionStorage.getItem(CLE_RETOUR_NEUF);
        if (raw) {
          sessionStorage.removeItem(CLE_RETOUR_NEUF);
          const d = JSON.parse(raw) as { R?: unknown; base?: Partial<MaisonNeuve> };
          const rr = lireReponsesRapideNeuf(d?.R);
          if (rr && !window.location.hash.startsWith("#plan=")) {
            setR(rr);
            setRetour({ base: d.base && typeof d.base === "object" ? d.base : undefined });
          }
        }
      } catch { /* stockage illisible : formulaire vierge */ }
      lireFragment();
    }
    window.addEventListener("hashchange", lireFragment);
    return () => window.removeEventListener("hashchange", lireFragment);
    // `initial` vient du serveur et ne change pas pendant la vie de la page.
  }, [edit]);
  const baseEff = base ?? plan?.maison ?? retour?.base;
  /** La maison du plan telle qu'elle est CHIFFRÉE (au moins une salle de bain et un WC) : le résumé dit vrai. */
  const planChiffre = useMemo(() => (plan ? maisonComplete(plan.maison) : null), [plan]);
  const origineEff: OrigineNeuf | undefined = origine ?? (plan ? { source: "plan", contrat: plan.contrat, ...lienPlan } : undefined);

  const maj = (patch: Partial<ReponsesRapideNeuf>) => {
    setAgi(true); setR((r) => ({ ...r, ...patch }));
    if (champErr && ((champErr === "cp" && "codePostal" in patch) || (champErr === "surface" && "surface" in patch))) { setChampErr(null); setErreur(null); }
  };

  const preset = useMemo(() => presetNeuf(R, baseEff), [R, baseEff]);
  const tot = useMemo(() => buildDevis(catalogueDe(preset.ctx), preset.ctx, preset.sel).totaux, [preset]);
  const surface = preset.ctx.surface || 0;
  const valid = affiche && R.surface >= 30;
  const lo = Math.round((tot.ttc * 0.85) / 100) * 100;
  const hi = Math.round((tot.ttc * 1.15) / 100) * 100;
  const m2 = valid && surface > 0 ? Math.round(tot.ttc / surface) : 0;
  const src = initial?.src ?? (plan ? "plan" : "direct");

  /** Estimation RÉELLE : une action, une saisie valide, un total non nul et un code postal. */
  const estimationReelle = agi && valid && tot.ttc > 0 && CP.test(R.codePostal);
  const convFired = useRef(false);
  useEffect(() => {
    if (convFired.current || !estimationReelle) return;
    const id = window.setTimeout(() => {
      convFired.current = true;
      suivre("estimation_terminee", { action: "affichee", type: "neuf", nature: "neuf", src });
      conversionEstimation();
    }, 1800);
    return () => window.clearTimeout(id);
  }, [estimationReelle, src]);

  // Aperçus €/m² des cartes : la même maison, une seule réponse changée, chiffrée par le moteur.
  const m2De = (o: Partial<ReponsesRapideNeuf>) => {
    const p = presetNeuf({ ...R, ...o }, baseEff);
    return p.ctx.surface > 0 ? Math.round(buildDevis(catalogueDe(p.ctx), p.ctx, p.sel).totaux.ttc / p.ctx.surface) : 0;
  };
  const m2ByFin = useMemo(() => Object.fromEntries(FINITIONS.map((f) => [f.v, m2De({ finition: f.v })])) as Record<Finition, number>,
    [R.surface, R.niveaux, R.codePostal, R.qui, R.garage, R.assainissement, baseEff]);
  const m2ByQui = useMemo(() => Object.fromEntries(QUIS.map((q) => [q.v, m2De({ qui: q.v })])) as Record<QuiRealise, number>,
    [R.surface, R.niveaux, R.codePostal, R.finition, R.garage, R.assainissement, baseEff]);
  // Surface du garage « oui » : celle de la maison décrite, sinon celle que le moteur met par défaut.
  const garageM2 = useMemo(() => presetNeuf({ ...R, garage: true }, baseEff).ctx.neuf?.garage ?? 0, [R, baseEff]);

  const reg = regionCoef(R.codePostal);
  const regDelta = Math.round((reg.mo - 1) * 100);
  const zoneLbl = T.rapide.zones[reg.zone] ?? reg.zone;
  const regLabel = R.codePostal.length >= 2 ? `${zoneLbl}${regDelta ? ` · ${regDelta > 0 ? "+" : ""}${regDelta} ${T.rapide.moSuffix}` : ""}` : "";

  const bilan = useMemo(
    () => (valid ? <BilanRapideNeuf ctx={preset.ctx} sel={preset.sel} qui={R.qui} locale={locale} /> : null),
    [valid, preset, R.qui, locale],
  );

  const niveauxOpts: Niveaux[] = ["pp", "etage", ...(baseEff?.niveaux === "combles" ? (["combles"] as Niveaux[]) : [])];
  const eauxOpts: ("collectif" | "fosse" | "micro")[] = ["collectif", "fosse", ...(baseEff?.assainissement === "micro" ? (["micro"] as const) : [])];
  const eauxActif = R.assainissement ?? (baseEff?.assainissement === "micro" ? "micro" : "collectif");

  const brouillon = () => brouillonRapideNeuf({ R, ctx: preset.ctx, sel: preset.sel, base: baseEff, origine: origineEff, statuts: edit ? statuts : undefined });
  function saveDraft() {
    try { localStorage.setItem(CLE_BROUILLON_NEUF, JSON.stringify(brouillon())); } catch { /* noop */ }
  }
  function affiner() {
    if (estimationReelle) {
      suivre("estimation_terminee", { action: "affiner", type: "neuf", nature: "neuf", src });
      conversionEstimation();
    }
    saveDraft();
    try { sessionStorage.setItem(CLE_AFFINER_NEUF, JSON.stringify({ R, base: baseEff })); } catch { /* noop */ }
    // Le détaillé du neuf est réservé au Pro : un gratuit va directement aux tarifs (la page du
    // détaillé l'y renverrait de toute façon). Le brouillon reste prêt pour après l'abonnement, et
    // ses réponses reviennent s'il revient en arrière.
    if (!isPro) { try { sessionStorage.setItem(CLE_RETOUR_NEUF, JSON.stringify({ R, base: baseEff })); } catch { /* noop */ } }
    router.push(isPro ? "/projets/nouveau/construction?new=1" : "/tarifs");
  }

  // Une maison venue d'un plan est rangée tout de suite (`avyora-neuf-v1`, avec son origine) : elle
  // survit à la connexion et sert de graine au détaillé, sans que l'URL la porte encore.
  useEffect(() => {
    if (!plan || planRange.current) return;
    planRange.current = true;
    saveDraft();
  });

  /** Badge « repris de ton plan » : la valeur vient du plan et n'a pas été changée. */
  const repris = (k: "surface" | "niveaux" | "garage" | "codePostal") => {
    if (!plan || !plan.repris.includes(k)) return false;
    const m = plan.maison;
    if (k === "garage") return R.garage === (m.garage ?? 0) > 0;
    return R[k] === m[k];
  };
  const badge = (k: Parameters<typeof repris>[0]) => (repris(k) ? <span className="repris">{s.reprisPlan}</span> : null);

  async function enregistrer() {
    setErreur(null); setChampErr(null);
    if (!CP.test(R.codePostal)) { signaler("cp", s.errCp); return; }
    if (!(R.surface >= 30)) { signaler("surface", s.errSurface); return; }
    setAgi(true);
    suivre("estimation_terminee", { action: "enregistrer", type: "neuf", nature: "neuf", src });
    conversionEstimation();
    setSaving(true);
    const d = brouillon();
    try {
      const res = await fetch(edit ? `/api/projects/${edit.projectId}` : "/api/projects", {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpsProjetNeuf(d, locale)),
      });
      if (res.status === 401) {
        // Le brouillon D'ABORD, le drapeau ensuite : un drapeau sans brouillon ne réclame rien.
        try { localStorage.setItem(CLE_BROUILLON_NEUF, JSON.stringify(d)); localStorage.setItem(CLE_RECLAMATION_NEUF, "1"); } catch { /* noop */ }
        router.push("/inscription");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || s.errSave); setSaving(false); return; }
      try { localStorage.removeItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
      if (!edit) mesurerPlan(mesureEstimationNeuf(d));   // C10 : interrupteur allumé, une maison venue d'un plan
      router.push(`/projets/${edit ? edit.projectId : data.id}`);
    } catch { setErreur(s.errReseau); setSaving(false); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RAPIDE_CSS + NEUF_CSS }} />
      <div className="av-rapide av-neuf">
        {avertDetaille && (
          <div className="avert" role="note">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1L8 1.8Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.2v3.6M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span>{s.avertDetaille}</span>
          </div>
        )}

        {refusPlan && (
          <div className="avert" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1L8 1.8Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6.2v3.6M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span>{s.planRefus[refusPlan] ?? s.planRefus.illisible}</span>
          </div>
        )}
        {plan && planChiffre && (
          <div className="plan-ok" role="status">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5h12v11H2z M2 7h6v6.5 M8 2.5V5 M11 7h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            <div>
              <b>{s.planOkTitre}</b>{" "}
              {s.planResume({
                surface: Math.round(planChiffre.surface).toLocaleString(nf),
                niveaux: s.niveaux[planChiffre.niveaux],
                chambres: planChiffre.chambres, sdb: planChiffre.sdb, wc: planChiffre.wc,
                garage: planChiffre.garage > 0 ? Math.round(planChiffre.garage).toLocaleString(nf) : null,
              })}
              {plan.avertissements.length > 0 && (
                <ul>{plan.avertissements.map((a) => <li key={a}>{s.planAvert[a]}</li>)}</ul>
              )}
            </div>
          </div>
        )}

        <div className="q">
          <div className="qlbl"><span className="n">1</span>{s.q1}</div>
          <p className="sub-q">{plan && !base ? s.defautsPlan : baseEff ? s.defautsBase : s.defauts}</p>
          <div className="fields">
            <div className="fld">
              <label htmlFor="neuf-surface">{s.surfaceLabel}{badge("surface")}</label>
              <Stepper block id="neuf-surface" value={R.surface} min={30} max={400} step={5} unit="m²" onChange={(n) => maj({ surface: n })} />
            </div>
            <div className="fld">
              <label htmlFor="neuf-cp">{s.cpLabel}{badge("codePostal")}</label>
              <input id="neuf-cp" aria-invalid={champErr === "cp" || undefined} aria-describedby={champErr === "cp" ? "neuf-err" : undefined} inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder={s.cpPlaceholder} value={R.codePostal}
                onChange={(e) => maj({ codePostal: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
            </div>
          </div>
          <div className="glbl">{s.niveauxLabel}{badge("niveaux")}</div>
          <div className="seg" role="group" aria-label={s.niveauxLabel}>
            {niveauxOpts.map((v) => {
              const on = affiche && R.niveaux === v;
              return <button type="button" key={v} className={on ? "on" : ""} aria-pressed={on} onClick={() => maj({ niveaux: v })}>{s.niveaux[v]}</button>;
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">2</span>{s.q2}</div>
          <div className="fins">
            {FINITIONS.map((f) => {
              const fi = s.finitions[f.v];
              return (
                <button type="button" key={f.v} className={"fin" + (R.finition === f.v ? " on" : "")} aria-pressed={R.finition === f.v} onClick={() => maj({ finition: f.v })}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{fi.eye}</span>
                  <span className="t">{fi.label}</span>
                  <span className="d">{fi.desc}</span>
                  <span className="amt">≈ <b>{(m2ByFin[f.v] || 0).toLocaleString(nf)} €</b> / m²</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">3</span>{s.q3}</div>
          <div className="quis">
            {QUIS.map((q) => {
              const qi = s.quis[q.v];
              const price = m2ByQui[q.v] || 0;
              const ref = m2ByQui.pros || 0;
              const pct = ref > 0 && price > 0 ? Math.round((1 - price / ref) * 100) : 0;
              return (
                <button type="button" key={q.v} className={"qcard" + (R.qui === q.v ? " on" : "")} aria-pressed={R.qui === q.v} onClick={() => maj({ qui: q.v })}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < q.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{qi.eye}</span>
                  <span className="t">{qi.label}</span>
                  <span className="d">{qi.desc}</span>
                  <span className="amt">
                    <span className="p">≈ <b>{price.toLocaleString(nf)} €</b> / m²</span>
                    {pct > 0 && <span className="save">−{pct} %</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">4</span>{s.q4}</div>
          <div className="grp">
            <div className="glbl">{s.garageLabel}<span className="opt">{s.facultatif}</span>{badge("garage")}</div>
            <div className="seg" role="group" aria-label={s.garageLabel}>
              {[false, true].map((v) => {
                // Pas de réponse « pleine » avant une première action : comme plain-pied / à étage.
                const on = affiche && !!R.garage === v;
                return (
                  <button type="button" key={String(v)} className={on ? "on" : ""} aria-pressed={on} onClick={() => maj({ garage: v })}>
                    {v ? s.garageOui(Math.round(garageM2).toLocaleString(nf)) : s.garageNon}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grp">
            <div className="glbl">{s.eauxLabel}<span className="opt">{s.facultatif}</span></div>
            <div className="seg" role="group" aria-label={s.eauxLabel}>
              {eauxOpts.map((v) => {
                const on = affiche && eauxActif === v;
                return (
                  <button type="button" key={v} className={on ? "on" : ""} aria-pressed={on}
                    onClick={() => maj({ assainissement: v === "micro" ? undefined : v })}>{s.eaux[v]}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bilan">
          {bilan ?? <div className="attente">{s.attente}</div>}
        </div>

        <p className="intro">{isPro ? s.intro : s.introGratuit}</p>
      </div>

      <div className="av-rapide-live av-neuf-live">
        <div className="in">
          <div>
            <div className="lbl">{s.liveLabel}</div>
            <div className="big">{valid ? <><CountUp value={lo} nf={nf} /> €<span style={{ opacity: .55 }}> – </span><CountUp value={hi} nf={nf} /> €</> : "—"}</div>
            <div className="sub">{valid ? <>≈ <CountUp value={m2} nf={nf} /> {s.parM2} · ±15 %{regLabel ? <> · {regLabel}</> : ""}</> : !affiche ? s.attente : s.errSurface}</div>
          </div>
          <div className="btns">
            <button type="button" className="ghost" onClick={affiner}>{isPro ? s.affiner : s.affinerPro}</button>
            <button type="button" className="cta" onClick={enregistrer} disabled={saving}>{saving ? s.enregistrement : isPro || edit ? s.enregistrer : s.enregistrerGratuit}</button>
          </div>
          {erreur && <div className="err" id="neuf-err" role="alert">{erreur}</div>}
        </div>
      </div>
    </>
  );
}
