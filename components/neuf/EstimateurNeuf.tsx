"use client";

/**
 * Estimation DÉTAILLÉE d'une construction neuve (Pro) : « Affiner ma maison ».
 *
 * Composant séparé de l'estimateur détaillé de la rénovation (`components/Estimateur.tsx`) : il en
 * partage les briques (`components/estimateur/*`, `EST_CSS`), mais pas le modèle. Ici l'état est la
 * DESCRIPTION de la maison ; le contexte du moteur s'en déduit, et chaque réponse réécrit les seuls postes qu'elle gouverne
 * (`lib/estimateur/detaille-neuf.ts`, testé sans rendu).
 *
 * Reprises, dans l'ordre : projet rouvert (`initialState`, « Modifier ») ; « Affiner » du rapide
 * (`sessionStorage`) ; `?reprise=1` (retour du paiement) → la graine du rapide (`avyora-neuf-v1`) ;
 * `?new=1` → la maison par défaut, page vierge comme en rénovation (`ouvertureDetailNeuf`, N2) ;
 * sinon le brouillon du détaillé (`avyora-neuf-detail-v1`). Clés propres au neuf : la rénovation ne
 * relit jamais un brouillon neuf.
 *
 * Liste : phases du chantier repliables, FERMÉES à l'ouverture (N3 : 9 lignes au lieu de 55 ; ce
 * qu'on ouvre est gardé dans le brouillon), et dans chaque phase ses blocs (un lot du catalogue à
 * sa place, avec son icône). Un lot revient parfois deux fois dans la même phase : clé React et
 * ouverture par INDEX de bloc. Au-dessus des lots, « Nouveaux postes cochés » règle le mode des
 * postes cochés ensuite, sans toucher une ligne ; « Tout passer en… », confirmé, les réécrit
 * toutes. Aucun montant écrit ici : tout vient du moteur.
 *
 * N6 : l'écran prend les briques partagées avec la rénovation (`ChoixVue`, `ListeLots`, `TitrePhase`,
 * `BlocLot`, `LignesLot`, `BarreLive` ; « Mon devis » : `VueDevis`), sans changer son rendu. Son
 * questionnaire reste le sien jusqu'à N9.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NumStepper from "@/components/Stepper";
import { EST_CSS } from "@/components/estimateur-styles";
import { fmt, Field, CustomLines } from "@/components/estimateur/partage";
import { ListeLots, TitrePhase, BlocLot, LignesLot } from "@/components/estimateur/ListeLots";
import { BarreLive } from "@/components/estimateur/BarreLive";
import { ChoixVue } from "@/components/estimateur/VueDevis";
import { dictDetail } from "@/lib/i18n/detail";
import { majLigne, basculerAuto } from "@/lib/estimateur/detaille-reno";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { dictNeuf } from "@/lib/i18n/neuf";
import { catT } from "@/lib/estimateur/catalog-i18n";
import {
  buildDevis, customLotHT, geometrieNeuf, isLoc, key, regionCoef, visibleTask, raisonProNeuf, tauxPersoPossibles, CATALOG_NEUF, PHASES_NEUF, ICON,
  BORNES_NEUF, GARAGE_MIN_SAISI,
  type CustomLine, type Selection, type LigneSel, type MaisonNeuve, type Lot, type Tache, type QuiRealise,
} from "@/lib/estimateur";
import { totauxAvecPerso } from "@/lib/estimateur/projet";
import { INFO_PHASES } from "@/lib/estimateur/etapes-neuf";
import { QUESTIONS_NEUF, type QuestionNeuf, type ValeurQuestionNeuf, type CleQuestionNeuf } from "@/lib/estimateur/questions-neuf";
import {
  CLE_BROUILLON_DETAIL_NEUF, BLOCS_NEUF, ctxDetailNeuf, etatParDefaut, changerReponseNeuf, cocherNeufEtat, badgeNeuf,
  lignesPersoDuBloc, lignePersoNeuf, repriseDepuisReponses, reglerNouveauxNeuf, toutPasserNeuf, postesQuiChangent,
  lireBrouillonDetailNeuf, enregistrementDetailNeuf, demarchesPhase, ouvertureDetailNeuf, type EtatNeuf, type BlocNeuf,
} from "@/lib/estimateur/detaille-neuf";
import { CLE_BROUILLON_NEUF, CLE_AFFINER_NEUF, CLE_RECLAMATION_NEUF, type OrigineNeuf } from "@/lib/estimateur/brouillon-neuf";
import { marquerReprisePlan } from "@/lib/plans/origine";
import { NEUF_DETAIL_CSS } from "./detail-styles";
import { ROW_SOI_CSS } from "@/components/estimateur/row-styles";
import DevisNeuf from "./DevisNeuf";
import { mesurerPlan, mesureEstimationNeuf } from "@/lib/plans/mesure";

const CP = /^\d{5}$/;

const Chevron = () => (
  <svg className="chev" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Drapeau = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 14.5V2.2M3.5 2.6h8.2l-1.8 3 1.8 3H3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export default function EstimateurNeuf({ initialState, projectId }: { initialState?: Record<string, unknown>; projectId?: string } = {}) {
  const router = useRouter();
  const locale = useLocale();
  const T = useT();
  const n = dictNeuf(locale);
  const d = n.detail;
  const dl = dictDetail(locale);
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const nb = (v: number, dec = 0) => (Math.round((v || 0) * 10 ** dec) / 10 ** dec).toLocaleString(nf);
  const edition = !!projectId;

  const [etat, setEtat] = useState<EtatNeuf>(etatParDefaut);
  const [custom, setCustom] = useState<CustomLine[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});         // blocs ouverts, par index de bloc
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({}); // phases ouvertes : aucune à l'ouverture
  const [passer, setPasser] = useState<"ferme" | "choix" | QuiRealise>("ferme"); // « Tout passer en… » : cible, puis confirmation
  const passerRef = useRef<HTMLButtonElement>(null);
  const [seulementCoches, setSeulementCoches] = useState(false);
  const [view, setView] = useState<"saisie" | "devis">("saisie");
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const hydrated = useRef(false);
  const statutsRef = useRef<Record<string, number> | undefined>(undefined); // suivi de chantier gardé en modification
  const origineRef = useRef<OrigineNeuf | undefined>(undefined);           // maison venue d'un plan

  // ── Reprise ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialState) {
      const r = repriseDepuisReponses(initialState);
      if (r) { setEtat(r.etat); setCustom(r.custom); statutsRef.current = r.statuts; origineRef.current = r.origine; }
      return;
    }
    let isNew = false, reprise = false, affiner: string | null = null, graine: string | null = null;
    try {
      const q = new URLSearchParams(window.location.search);
      isNew = q.get("new") === "1";
      reprise = q.get("reprise") === "1";
      affiner = sessionStorage.getItem(CLE_AFFINER_NEUF);
      if (affiner) sessionStorage.removeItem(CLE_AFFINER_NEUF);
      if (isNew || reprise) { // on retire ?new et ?reprise : un rafraîchissement reprend le travail en cours, pas un départ à neuf
        const url = new URL(window.location.href); url.searchParams.delete("new"); url.searchParams.delete("reprise");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    } catch { /* noop */ }
    try { graine = localStorage.getItem(CLE_BROUILLON_NEUF); } catch { /* noop */ }
    const ouverture = ouvertureDetailNeuf({ nouveau: isNew, reprise, affiner, graine });
    if (ouverture.frais) {
      try { localStorage.removeItem(CLE_BROUILLON_DETAIL_NEUF); } catch { /* noop */ }
      const r = ouverture.reprise;
      if (r) { setEtat(r.etat); setCustom(r.custom); origineRef.current = r.origine; }
      return; // sinon : la maison par défaut (état initial)
    }
    let b = null;
    try { b = lireBrouillonDetailNeuf(localStorage.getItem(CLE_BROUILLON_DETAIL_NEUF)); } catch { /* noop */ }
    if (b) { setEtat(b.etat); setCustom(b.custom); setOpen(b.open); setOuvertes(b.ouvertes); origineRef.current = b.origine; }
  }, [initialState]);

  // Brouillon local (pas en modification d'un projet : il est déjà enregistré).
  useEffect(() => {
    if (!hydrated.current || edition) return;
    try {
      localStorage.setItem(CLE_BROUILLON_DETAIL_NEUF, JSON.stringify({
        v: "neuf-detail", etat, custom, open, ouvertes, ...(origineRef.current ? { origine: origineRef.current } : {}),
      }));
    } catch { /* noop */ }
  }, [etat, custom, open, ouvertes, edition]);

  // ── Chiffrage ──────────────────────────────────────────────────────────────────────────────
  const { maison: maisonSaisie, finition, aleas, budget, qui, sel } = etat;
  const ctx = useMemo(
    () => ctxDetailNeuf({ maison: maisonSaisie, finition, aleas, budget, qui: "pros", sel: {}, facadeAuto: false }),
    [maisonSaisie, finition, aleas, budget],
  );
  const m = ctx.neuf as MaisonNeuve;
  const dv = useMemo(() => buildDevis(CATALOG_NEUF, ctx, sel), [ctx, sel]);
  const htParCle = useMemo(() => new Map(dv.lignes.map((li) => [li.cle, li.ht])), [dv]);
  // Lignes perso comprises : le même total que la vue devis, la fiche, la liste et le PDF.
  const tot = useMemo(() => totauxAvecPerso(dv.totaux, custom, ctx.aleas), [dv, custom, ctx.aleas]);
  const frais = dv.bilan.frais;
  const m2 = ctx.surface > 0 ? tot.ttc / ctx.surface : 0;
  const geo = useMemo(() => geometrieNeuf(m), [m]);
  const reg = regionCoef(m.codePostal);
  const regDelta = Math.round((reg.mo - 1) * 100);
  const zoneLbl = (T.rapide.zones as Record<string, string>)[reg.zone] ?? reg.zone;

  // ── Mises à jour ───────────────────────────────────────────────────────────────────────────
  const repondre = (k: CleQuestionNeuf, v: ValeurQuestionNeuf) => setEtat((e) => changerReponseNeuf(e, k, v));
  const majSel = (f: (s: Selection) => Selection) => setEtat((e) => ({ ...e, sel: f(e.sel) }));
  const upd = (c: string, nom: string, patch: (s: LigneSel) => LigneSel) => majSel((prev) => majLigne(prev, c, nom, patch));
  const toggleCheck = (l: Lot, t: Tache) => setEtat((e) => cocherNeufEtat(e, l, t));
  const toggleAuto = (l: Lot, t: Tache) => majSel((prev) => basculerAuto(ctx, prev, l, t));
  const addCustom = (lot: string, phase: string) =>
    setCustom((p) => [...p, lignePersoNeuf(lot, phase, crypto.randomUUID?.() ?? String(Date.now() + Math.random()))]);
  const updCustom = (id: string, patch: Partial<CustomLine>) => setCustom((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delCustom = (id: string) => setCustom((p) => p.filter((x) => x.id !== id));

  function reset() {
    try { localStorage.removeItem(CLE_BROUILLON_DETAIL_NEUF); } catch { /* noop */ }
    setEtat(etatParDefaut()); setCustom([]); setOpen({}); setOuvertes({}); setPasser("ferme"); setView("saisie");
  }

  // ── Enregistrement ─────────────────────────────────────────────────────────────────────────
  async function enregistrer() {
    setErreur(null);
    if (!CP.test(m.codePostal ?? "")) { setErreur(d.errCp); setView("saisie"); return; }
    if (!(m.surface > 0)) { setErreur(d.errSurface); setView("saisie"); return; }
    setSaving(true);
    const { brouillon, corps } = enregistrementDetailNeuf(etat, { custom, statuts: statutsRef.current, origine: origineRef.current, locale });
    try {
      const res = await fetch(edition ? `/api/projects/${projectId}` : "/api/projects", {
        method: edition ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      if (res.status === 401) {
        // Le brouillon D'ABORD, le drapeau ensuite : un drapeau sans brouillon ne réclame rien.
        try { localStorage.setItem(CLE_BROUILLON_NEUF, JSON.stringify(brouillon)); localStorage.setItem(CLE_RECLAMATION_NEUF, "1"); } catch { /* noop */ }
        // Née d'un plan de cet appareil : le plan est repris d'abord (ClaimPlan), l'estimation s'y relie ensuite.
        try { marquerReprisePlan(origineRef.current, localStorage); } catch { /* noop */ }
        router.push("/inscription");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || n.saisie.errSave); setSaving(false); return; }
      if (!edition) { try { localStorage.removeItem(CLE_BROUILLON_DETAIL_NEUF); localStorage.removeItem(CLE_BROUILLON_NEUF); } catch { /* noop */ } }
      if (!edition) mesurerPlan(mesureEstimationNeuf(brouillon));   // C10 : interrupteur allumé, une maison venue d'un plan
      router.push(edition ? `/projets/${projectId}` : `/projets/${data.id}`);
    } catch { setErreur(n.saisie.errReseau); setSaving(false); }
  }

  // ── Questionnaire ──────────────────────────────────────────────────────────────────────────
  const valeur = (k: CleQuestionNeuf): unknown => (k === "$finition" ? finition : m[k as keyof MaisonNeuve]);
  function controle(q: QuestionNeuf) {
    const lbl = q.l[locale];
    if (q.t === "num") {
      const k = q.k as keyof MaisonNeuve;
      const min = q.minDe ? q.minDe(m) : q.min;
      const borne = (v: number) => Math.min(q.max ?? v, Math.max(min ?? v, v));
      return <NumStepper value={Number(m[k]) || 0} min={min} max={q.max} step={q.step} unit={q.u} onChange={(v) => repondre(q.k, borne(v))} />;
    }
    if (q.t === "cp") {
      return (
        <div className="rowflex">
          <input className="cpin" inputMode="numeric" maxLength={5} autoComplete="postal-code" aria-label={lbl} placeholder={n.saisie.cpPlaceholder}
            value={m.codePostal ?? ""} onChange={(e) => repondre("codePostal", e.target.value.replace(/\D/g, "").slice(0, 5))} />
          {(m.codePostal ?? "").length >= 2 && <span className="zone">{zoneLbl}{regDelta ? ` · ${regDelta > 0 ? "+" : ""}${regDelta} ${T.rapide.moSuffix}` : ""}</span>}
        </div>
      );
    }
    if (q.t === "garage") {
      return (
        <div className="rowflex">
          <div className="pills" role="group" aria-label={lbl}>
            <button type="button" className="pill" aria-pressed={!m.garage} onClick={() => repondre("garage", 0)}>{d.non}</button>
            <button type="button" className="pill" aria-pressed={m.garage > 0} onClick={() => { if (!m.garage) repondre("garage", 20); }}>{d.oui}</button>
          </div>
          {m.garage > 0 && <NumStepper value={m.garage} min={GARAGE_MIN_SAISI} max={BORNES_NEUF.garage.max} step={5} unit="m²" onChange={(v) => repondre("garage", Math.min(BORNES_NEUF.garage.max, Math.max(GARAGE_MIN_SAISI, v)))} />}
        </div>
      );
    }
    const v = valeur(q.k);
    return (
      <div className="pills" role="group" aria-label={lbl}>
        {(q.o ?? []).map(([val, txt]) => (
          <button type="button" key={String(val)} className="pill" aria-pressed={v === val} onClick={() => repondre(q.k, val)}>{txt[locale]}</button>
        ))}
      </div>
    );
  }

  // ── Liste des phases ───────────────────────────────────────────────────────────────────────
  const htPhase = useMemo(() => {
    const r: Record<string, number> = {};
    for (const p of PHASES_NEUF) r[p] = 0;
    for (const li of dv.lignes) r[li.phase] = (r[li.phase] ?? 0) + li.ht;
    for (const b of BLOCS_NEUF) r[b.l.p] += customLotHT(lignesPersoDuBloc(custom, b), b.l.c);
    return r;
  }, [dv, custom]);
  const toutOuvert = BLOCS_NEUF.every((b) => open[b.i]) && PHASES_NEUF.every((p) => ouvertes[p]);
  function basculerTout() { // « Tout replier » revient à la vue d'ouverture : phases et blocs fermés
    if (toutOuvert) { setOpen({}); setOuvertes({}); return; }
    setOpen(Object.fromEntries(BLOCS_NEUF.map((b) => [b.i, true])));
    setOuvertes(Object.fromEntries(PHASES_NEUF.map((p) => [p, true])));
  }

  // ── Qui réalise : les nouveaux postes, et « Tout passer en… » ──────────────────────────────
  /* Deux choix seulement : « Fait faire » (`pros`) et « Je le fais » (`max`). Un `partie` (repris du
     rapide, ou d'un projet enregistré avant N3) n'en presse aucun : son texte d'aide le dit, jusqu'à
     ce qu'on choisisse. */
  const NOUVEAUX: [QuiRealise, string][] = [["pros", d.faitFaire], ["max", d.jeLeFais]];
  function fermerPasser() { setPasser("ferme"); passerRef.current?.focus(); }
  function confirmerPasser() {
    if (passer !== "pros" && passer !== "max") return;
    const cible = passer;
    setEtat((e) => toutPasserNeuf(e, cible));
    fermerPasser();
  }

  function bloc(b: BlocNeuf) {
    const l = b.l;
    const taches = l.t.filter((t) => visibleTask(ctx, t));
    const cLines = lignesPersoDuBloc(custom, b);
    const coche = (t: Tache) => !!sel[key(l.c, t.n)]?.on;
    const cnt = taches.filter(coche).length + cLines.filter((x) => x.on !== false && !x.draft).length;
    if (seulementCoches && cnt === 0) return null;
    const isOpen = !!open[b.i];
    const amt = taches.reduce((s, t) => s + (htParCle.get(key(l.c, t.n)) ?? 0), 0) + customLotHT(cLines, l.c);
    const lignes = seulementCoches ? taches.filter(coche) : taches;
    const loc = isLoc(l.c);
    const basculer = () => setOpen((o) => ({ ...o, [b.i]: !o[b.i] }));
    return (
      <BlocLot key={b.i} ouvert={isOpen} entete={{
        icone: ICON[l.c] || "•", nom: catT(locale, "corps", l.c), cnt, ouvert: isOpen, onBascule: basculer,
        montant: cnt > 0 ? fmt(amt) + " " + dl.liste.ht : "",
      }}>
        {l.note && <div className="lotnote">{catT(locale, "notes", l.note)}</div>}
        <LignesLot l={l} taches={lignes} ctx={ctx} sel={sel} loc={loc} maj={upd} onCocher={toggleCheck} onAuto={toggleAuto}
          options={(t) => ({ badge: badgeNeuf(ctx, sel, l, t), proRaison: raisonProNeuf(t) })} />
        <CustomLines lines={cLines} onAdd={() => addCustom(l.c, l.p)} onUpd={updCustom} onDel={delCustom} guideTva={d.guideTva} tvas={(courant) => tauxPersoPossibles(ctx, courant)} />
      </BlocLot>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + ROW_SOI_CSS + NEUF_DETAIL_CSS }} />
      <div className="av-estim av-neuf-d">
        <ChoixVue vue={view} onVue={setView} saisie={d.vueSaisie} devis={d.vueDevis} aria={dl.vues.aria} />

        {view === "saisie" && (
          <div>
            <div className="card">
              <div className="eyebrow">{d.eyebrow}</div>
              <h2>{d.titre}</h2>
              <div className="sub">{d.sous}</div>
              {QUESTIONS_NEUF.map((grp, gi) => (
                <details key={gi} className="grp" open>
                  <summary>{grp.g[locale]}<Chevron /></summary>
                  {grp.qs.map((q) => {
                    if (q.si && !q.si(m)) return null; // sans objet ici : masquée, comme en rénovation
                    const hint = q.hintDe?.(m) ?? q.hint;
                    return (
                      <div key={q.k} className="q">
                        <span className="ql">
                          {q.l[locale]}
                          {hint && <span className="hint">{hint[locale]}</span>}
                        </span>
                        {controle(q)}
                      </div>
                    );
                  })}
                </details>
              ))}
              <div className="deduit">
                <span>{d.deduitK}</span>
                <span>{d.emprise} <b>{nb(geo.Etot)} m²</b></span>
                <span>{d.plancher} <b>{nb(geo.SP)} m²</b></span>
                <span>{d.perimetre} <b>{nb(geo.P, 1)} m</b></span>
                <span>{d.toiture} <b>{nb(geo.toiture)} m²</b></span>
                <span>{d.ouvertures(geo.nFen, geo.nPF, geo.nBaie)}</span>
                <span><b>{d.chantier(geo.moisChantier)}</b></span>
              </div>

              <div className="gl">{d.budgetT}</div>
              <div className="depart">
                <Field label={<>{d.budgetMax} <span style={{ color: "var(--faint)" }}>· {d.facultatif}</span></>}>
                  <NumStepper field value={budget} min={0} step={1000} unit="€" onChange={(v) => setEtat((e) => ({ ...e, budget: Math.max(0, v || 0) }))} />
                </Field>
                <Field label={d.aleasL}>
                  <NumStepper field value={aleas} min={0} max={20} unit="%" onChange={(v) => setEtat((e) => ({ ...e, aleas: Math.min(20, Math.max(0, v || 0)) }))} />
                </Field>
              </div>
            </div>

            <div className="intro">{d.intro}</div>
            <div className="nv">
              <span className="nv-l" id="nv-l">{d.nouveauxL}</span>
              <span className="nv-seg" role="group" aria-labelledby="nv-l">
                {NOUVEAUX.map(([v, txt]) => (
                  <button type="button" key={v} aria-pressed={qui === v} onClick={() => setEtat((e) => reglerNouveauxNeuf(e, v))}>{txt}</button>
                ))}
              </span>
              <button type="button" ref={passerRef} className="linkbtn nv-tout" aria-expanded={passer !== "ferme"} aria-controls="nv-passer"
                onClick={() => (passer === "ferme" ? setPasser("choix") : fermerPasser())}>{d.toutPasser}</button>
              <p className="nv-aide">{d.nouveauxAide[qui] ?? d.nouveauxAide.pros}</p>
              {passer !== "ferme" && (
                <div className="nv-conf" id="nv-passer" role="group" aria-labelledby="nv-q" aria-live="polite">
                  <span className="nv-q" id="nv-q">{d.toutPasserQ}</span>
                  <span className="nv-seg">
                    {NOUVEAUX.map(([v, txt]) => (
                      <button type="button" key={v} aria-pressed={passer === v} onClick={() => setPasser(v)}>{txt}</button>
                    ))}
                  </span>
                  {(passer === "pros" || passer === "max") && <p className="nv-eff">{d.toutPasserConfirme(passer === "max", postesQuiChangent(sel, passer))}</p>}
                  <span className="nv-act">
                    {(passer === "pros" || passer === "max") && <button type="button" className="nv-ok" onClick={confirmerPasser}>{d.confirmer}</button>}
                    <button type="button" className="nv-non" onClick={fermerPasser}>{d.annuler}</button>
                  </span>
                </div>
              )}
            </div>
            <ListeLots
              outils={{
                seulement: seulementCoches, onSeulement: setSeulementCoches, texteSeulement: d.seulementCoches,
                toutOuvert, onTout: basculerTout, texteDeplier: d.toutDeplier, texteReplier: d.toutReplier,
              }}
              phases={PHASES_NEUF.map((ph, pi) => {
                const blocs = BLOCS_NEUF.filter((b) => b.l.p === ph);
                let nOn = 0;
                for (const b of blocs) for (const t of b.l.t) if (sel[key(b.l.c, t.n)]?.on) nOn++;
                const nDem = demarchesPhase(ctx, sel, ph);
                const ouverte = !!ouvertes[ph];
                const info = INFO_PHASES[ph];
                const rendus = ouverte ? blocs.map(bloc).filter(Boolean) : [];
                return {
                  cle: ph,
                  titre: <TitrePhase num={pi + 1} nom={catT(locale, "phases", ph)} meta={<>{d.postesCoches(nOn)} · {fmt(htPhase[ph] ?? 0)} {dl.liste.ht}</>}
                    ouvert={ouverte} onBascule={() => setOuvertes((o) => ({ ...o, [ph]: !o[ph] }))} />,
                  contenu: <>
                    {ouverte && info && (
                      <div className="pjal"><Drapeau /><span><b>{n.jalon}</b> · {info.jalon[locale]}{nDem > 0 ? ` · ${d.demarches(nDem)}` : ""}</span></div>
                    )}
                    {ouverte && (rendus.length ? rendus : <p className="pvide">{d.aucunPoste}</p>)}
                  </>,
                };
              })}
            />

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" className="resetbtn" onClick={reset}>↺ {d.reset}</button>
            </div>
          </div>
        )}

        {view === "devis" && <DevisNeuf ctx={ctx} sel={sel} custom={custom} />}
      </div>

      {/* Barre live sticky (la même que la rénovation), avec le prix au m² et les frais */}
      <BarreLive total={tot.ttc} budget={budget} vue={view} onVue={setView} onEnregistrer={enregistrer} saving={saving} edition={edition} erreur={erreur}
        className="av-neuf-live"
        m2={<div className="m2">≈ {fmt(m2)} {d.parM2}{frais > 0 ? <> · {d.dontFrais} {fmt(frais)}</> : null}</div>}
        t={{
          totalK: d.totalK, ttc: d.ttc, budget: d.budgetTxt, depasse: d.depasse, reste: d.reste, sansBudget: d.sansBudget,
          voirDevis: d.voirDevis, modifier: d.retourSaisie, enregistrer: d.enregistrer, enregistrerModifs: d.enregistrerModifs, enregistrement: d.enregistrement,
        }} />
    </>
  );
}
