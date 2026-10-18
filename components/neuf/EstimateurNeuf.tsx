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
 * Liste (N10, décision D1) : rangée par corps d'état comme la rénovation (`ListeNeuf`, décidée par
 * `lib/estimateur/liste-neuf.ts`) : 4 grandes phases en intertitres, chaque lot UNE fois, fermé à
 * l'ouverture (ce qu'on ouvre est gardé dans le brouillon, par nom de lot) ; dans un lot présent à
 * plusieurs étapes du chantier, ses postes sous un sous-titre d'étape ; les postes qui s'excluent sur une
 * ligne de choix (un clic choisit, décoche l'autre et met la réponse à jour : `choisirNeuf`). Les taxes,
 * l'assurance et les frais ont leur carte sous le questionnaire, près du budget (`CarteFraisNeuf`) ; les
 * démarches gratuites leur liste en fin de page : les compteurs de postes ne comptent que les travaux.
 * Au-dessus des lots, « Nouveaux postes cochés » règle le mode des postes cochés ensuite, sans toucher
 * une ligne ; « Tout passer en… », confirmé, les réécrit toutes. Aucun montant écrit ici : tout vient du
 * moteur. La chronologie en 9 phases reste dans « Mon devis » (`DevisNeuf`), la fiche et le PDF.
 *
 * N6 : l'écran prend les briques partagées avec la rénovation (`ChoixVue`, `ListeLots`, `TitrePhase`,
 * `BlocLot`, `LignesLot`, `BarreLive` ; « Mon devis » : `VueDevis`), sans changer son rendu.
 *
 * N9 : le questionnaire est celui de la rénovation (`components/estimateur/intake.tsx`) : une carte
 * « Parle-nous de ta maison », ses intertitres dans le même ordre (type de maison, surfaces, la même
 * grille de compteurs, puis les choix techniques REPLIÉS derrière une ligne de résumé, la finition en
 * cartes, qui pilote, la TVA, le budget, le récapitulatif). Chaque question dit sa rubrique et son
 * contrôle (`section`, `vue` : `questions-neuf.ts`) ; un nombre tapé n'est pris qu'à la sortie du champ.
 * Un projet rouvert est posé dès le premier rendu, serveur compris (comme la rénovation depuis N6).
 *
 * A7 (contrôle de l'étape 1, les deux questionnaires côte à côte) : les surfaces dans l'ordre de la
 * rénovation (habitable, garage, hauteur, code postal, son exemple « 33000 », la zone dite au seul
 * récapitulatif) ; la grille de compteurs aux paires de la rénovation (« Niveaux » en lecture seule,
 * décidé par le type de maison), l'interrupteur « Cuisine équipée comprise » sous elle ; les cartes de
 * finition de la rénovation ; « Budget & imprévus » aussi compacts ; une barre live de la hauteur de la
 * rénovation sur mobile ; le champ en faute signalé par la brique partagée (`useChampEnFaute`).
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NumStepper from "@/components/Stepper";
import { EST_CSS } from "@/components/estimateur-styles";
import { fmt, gras, Field, Stepper } from "@/components/estimateur/partage";
import {
  Intertitre, Pastilles, Segment, CartesFinition, ChampCodePostal, Interrupteur, Recap, ZoneRecap, CompteurFixe, useChampEnFaute,
} from "@/components/estimateur/intake";
import { BarreLive } from "@/components/estimateur/BarreLive";
import { ChoixVue } from "@/components/estimateur/VueDevis";
import { dictDetail } from "@/lib/i18n/detail";
import { majLigne, basculerAuto } from "@/lib/estimateur/detaille-reno";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { dictNeuf } from "@/lib/i18n/neuf";
import {
  buildDevis, geometrieNeuf, regionCoef, CATALOG_NEUF, ALEAS_NEUF,
  type CustomLine, type Selection, type LigneSel, type MaisonNeuve, type Lot, type Tache, type QuiRealise, type Finition,
} from "@/lib/estimateur";
import { totauxAvecPerso } from "@/lib/estimateur/projet";
import {
  QUESTIONS_NEUF, questionsVisibles, resumeTechniqueNeuf, type QuestionNeuf, type ValeurQuestionNeuf, type CleQuestionNeuf,
} from "@/lib/estimateur/questions-neuf";
import {
  CLE_BROUILLON_DETAIL_NEUF, ctxDetailNeuf, etatParDefaut, changerReponseNeuf, cocherNeufEtat, choisirNeuf,
  lignePersoNeuf, repriseDepuisReponses, reglerNouveauxNeuf, toutPasserNeuf, postesQuiChangent,
  lireBrouillonDetailNeuf, enregistrementDetailNeuf, ouvertureDetailNeuf, pasCompteurNeuf, valeurCompteurNeuf,
  type EtatNeuf, type CompteurNeuf,
} from "@/lib/estimateur/detaille-neuf";
import { ouvrablesNeuf, premiereEtapeNeuf, type PosteListeNeuf } from "@/lib/estimateur/liste-neuf";
import { ListeNeuf, CarteFraisNeuf, type ActionsListeNeuf } from "./ListeNeuf";
import { CLE_BROUILLON_NEUF, CLE_AFFINER_NEUF, CLE_RECLAMATION_NEUF, type OrigineNeuf } from "@/lib/estimateur/brouillon-neuf";
import { marquerReprisePlan } from "@/lib/plans/origine";
import { NEUF_DETAIL_CSS } from "./detail-styles";
import { ROW_SOI_CSS } from "@/components/estimateur/row-styles";
import { INTAKE_CSS } from "@/components/estimateur/intake-styles";
import DevisNeuf from "./DevisNeuf";
import { mesurerPlan, mesureEstimationNeuf } from "@/lib/plans/mesure";
import { suivre } from "@/lib/track";

const CP = /^\d{5}$/;

/** Niveaux de finition : la jauge des cartes (1 à 3 barres), comme la rénovation. */
const NIVEAUX_FINITION: Record<Finition, number> = { eco: 1, standard: 2, premium: 3 };
/** Identifiants des champs : libellés (`htmlFor`), champ en faute (`aria-describedby`). */
const ID = (k: string) => `av-neuf-${k}`;
const ID_ERREUR = "av-neuf-err";

export default function EstimateurNeuf({ initialState, projectId }: { initialState?: Record<string, unknown>; projectId?: string } = {}) {
  const router = useRouter();
  const locale = useLocale();
  const T = useT();
  const n = dictNeuf(locale);
  const d = n.detail;
  const dl = dictDetail(locale), R = dl.recap;
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const nb = (v: number, dec = 0) => (Math.round((v || 0) * 10 ** dec) / 10 ** dec).toLocaleString(nf);
  const edition = !!projectId;

  // Projet rouvert (« Modifier ») : son état dès le premier rendu, celui du serveur compris.
  const [depart] = useState(() => (initialState ? repriseDepuisReponses(initialState) : null));
  const [etat, setEtat] = useState<EtatNeuf>(() => depart?.etat ?? etatParDefaut());
  const [custom, setCustom] = useState<CustomLine[]>(() => depart?.custom ?? []);
  const [open, setOpen] = useState<Record<string, boolean>>({});         // lots et cartes ouverts, par nom : aucun à l'ouverture
  const [passer, setPasser] = useState<"ferme" | "choix" | QuiRealise>("ferme"); // « Tout passer en… » : cible, puis confirmation
  const passerRef = useRef<HTMLButtonElement>(null);
  const [seulementCoches, setSeulementCoches] = useState(false);
  const [view, setView] = useState<"saisie" | "devis">("saisie");
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Le champ en faute (« Enregistrer » sans code postal) : marqué, puis focalisé, comme en rénovation. */
  const faute = useChampEnFaute<"codePostal" | "surface">();
  /** Choix techniques : repliés à l'ouverture, une ligne de résumé les dit. */
  const [techOuvert, setTechOuvert] = useState(false);
  const hydrated = useRef(false);
  const statutsRef = useRef<Record<string, number> | undefined>(depart?.statuts); // suivi de chantier gardé en modification
  const origineRef = useRef<OrigineNeuf | undefined>(depart?.origine);            // maison venue d'un plan

  // ── Reprise ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialState) return; // projet rouvert : déjà posé au premier rendu
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
    if (b) { setEtat(b.etat); setCustom(b.custom); setOpen(b.open); origineRef.current = b.origine; }
  }, [initialState]);

  // Brouillon local (pas en modification d'un projet : il est déjà enregistré).
  useEffect(() => {
    if (!hydrated.current || edition) return;
    try {
      localStorage.setItem(CLE_BROUILLON_DETAIL_NEUF, JSON.stringify({
        v: "neuf-detail", etat, custom, open, ...(origineRef.current ? { origine: origineRef.current } : {}),
      }));
    } catch { /* noop */ }
  }, [etat, custom, open, edition]);

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
  const zoneLbl = (T.rapide.zones as Record<string, string>)[reg.zone] ?? reg.zone;

  // ── Mises à jour ───────────────────────────────────────────────────────────────────────────
  const repondre = (k: CleQuestionNeuf, v: ValeurQuestionNeuf) => setEtat((e) => changerReponseNeuf(e, k, v));
  const majSel = (f: (s: Selection) => Selection) => setEtat((e) => ({ ...e, sel: f(e.sel) }));
  const upd = (c: string, nom: string, patch: (s: LigneSel) => LigneSel) => majSel((prev) => majLigne(prev, c, nom, patch));
  const toggleCheck = (l: Lot, t: Tache) => setEtat((e) => cocherNeufEtat(e, l, t));
  const choisirPoste = (p: PosteListeNeuf) => setEtat((e) => choisirNeuf(e, p.l, p.t));
  const toggleAuto = (l: Lot, t: Tache) => majSel((prev) => basculerAuto(ctx, prev, l, t));
  const addCustom = (lot: string) =>
    setCustom((p) => [...p, lignePersoNeuf(lot, premiereEtapeNeuf(lot), crypto.randomUUID?.() ?? String(Date.now() + Math.random()))]);
  const updCustom = (id: string, patch: Partial<CustomLine>) => setCustom((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delCustom = (id: string) => setCustom((p) => p.filter((x) => x.id !== id));

  function reset() {
    try { localStorage.removeItem(CLE_BROUILLON_DETAIL_NEUF); } catch { /* noop */ }
    setEtat(etatParDefaut()); setCustom([]); setOpen({}); setPasser("ferme"); setView("saisie");
  }

  // ── Enregistrement ─────────────────────────────────────────────────────────────────────────
  /** Le champ en faute : marqué (`aria-invalid`), la saisie réaffichée, puis le champ focalisé. */
  function signaler(champ: "codePostal" | "surface", msg: string) {
    setErreur(msg); setView("saisie"); faute.signaler(champ, ID(champ));
  }

  async function enregistrer() {
    setErreur(null); faute.effacer();
    if (!CP.test(m.codePostal ?? "")) { signaler("codePostal", d.errCp); return; }
    if (!(m.surface > 0)) { signaler("surface", d.errSurface); return; }
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
      suivre("projet_enregistre", { nature: "neuf", mode: "detaille", edition });
      router.push(edition ? `/projets/${projectId}` : `/projets/${data.id}`);
    } catch { setErreur(n.saisie.errReseau); setSaving(false); }
  }

  // ── Questionnaire « Parle-nous de ta maison » (N9) ─────────────────────────────────────────
  /* Une question choisit son contrôle (`vue`) ; les valeurs (texte, nombre, booléen) passent par leur
     texte dans les pastilles, segments et cartes, puis reviennent telles quelles dans la réponse. */
  const B = dl.bien;
  const valeur = (k: CleQuestionNeuf): unknown => (k === "$finition" ? finition : m[k as keyof MaisonNeuve]);
  const options = (q: QuestionNeuf) => (q.o ?? []).map(([v, txt]) => ({ v: String(v), label: txt[locale] }));
  const choisir = (q: QuestionNeuf) => (sv: string) => {
    const o = (q.o ?? []).find(([v]) => String(v) === sv);
    if (o) repondre(q.k, o[0]);
  };
  function choix(q: QuestionNeuf) {
    const lbl = q.l[locale], v = String(valeur(q.k));
    if (q.vue === "segment") return <Segment aria={lbl} valeur={v} onChoix={choisir(q)} options={options(q)} />;
    if (q.vue === "cartes") {
      const cartes = (q.o ?? []).map(([val, txt]) => {
        // Finition : les cartes de la rénovation (noms, accroches, descriptions : A7), sauf l'accroche de la
        // carte Éco, celle du rapide du neuf (« Budget maîtrisé », sans « Locatif » : décision de Dani du 18/10).
        const fin = q.k === "$finition" ? B.finitions[String(val)] : null;
        const c = fin ? { ...fin, eye: n.saisie.finitions[String(val)]?.eye ?? fin.eye } : null;
        const t = q.cartes?.[String(val)];
        return {
          v: String(val), label: c?.label ?? txt[locale], eye: c?.eye ?? t?.eye[locale] ?? "", desc: c?.desc ?? t?.desc[locale] ?? "",
          ...(q.k === "$finition" ? { lvl: NIVEAUX_FINITION[val as Finition] } : {}),
        };
      });
      return <CartesFinition aria={lbl} valeur={v} onChoix={choisir(q)} cartes={cartes} />;
    }
    return <Pastilles aria={lbl} actif={(x) => x === v} onChoix={choisir(q)} options={options(q)} />;
  }
  /** Un nombre (surface, garage, distance) : pris à la sortie du champ, borné par la question. */
  function champ(q: QuestionNeuf) {
    const k = q.k as keyof MaisonNeuve;
    const borne = (v: number) => Math.min(q.max ?? v, Math.max(q.min ?? v, v));
    return <NumStepper field aLaSortie id={ID(q.k)} value={Number(m[k]) || 0} min={q.min} max={q.max} step={q.step} unit={q.u} onChange={(v) => repondre(q.k, borne(v))} />;
  }
  const cp = m.codePostal ?? "";
  function majCp(v: string) {
    repondre("codePostal", v);
    if (faute.champ === "codePostal" && CP.test(v)) { faute.effacer(); setErreur(null); }
  }
  /** Un champ des surfaces : un nombre, ou le code postal (son exemple et sa zone : ceux de la rénovation). */
  const champSurface = (q: QuestionNeuf) => (
    <Field key={q.k} label={q.l[locale]} hint={q.hint?.[locale]} htmlFor={ID(q.k)}>
      {q.vue === "cp"
        ? <ChampCodePostal id={ID(q.k)} valeur={cp} onChange={majCp} placeholder={B.cpExemple} invalide={faute.champ === "codePostal"} erreurId={ID_ERREUR} />
        : champ(q)}
    </Field>
  );
  const surfaces = questionsVisibles(m, "surfaces");
  const pieces = questionsVisibles(m, "pieces");
  const sousTitre = (txt: string) => <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{txt}</span>;

  /** Les choix techniques, dépliés : un sous-titre par groupe, chaque question avec son libellé. */
  function technique() {
    return QUESTIONS_NEUF.map((g) => {
      const qs = g.qs.filter((q) => q.section === "technique" && (!q.si || q.si(m)));
      if (!qs.length) return null;
      return (
        <div key={g.g.fr} className="tg">
          <div className="tg-t">{g.g[locale]}</div>
          <div className="techg">
            {qs.map((q) => (q.vue === "champ"
              ? <div key={q.k} className="tq"><Field label={q.l[locale]} hint={q.hint?.[locale]} htmlFor={ID(q.k)}>{champ(q)}</Field></div>
              : (
                <div key={q.k} className={"tq" + (q.vue === "cartes" || (q.o?.length ?? 0) > 4 ? " large" : "")}>
                  <div className="tq-l">{q.l[locale]}{q.hint && <small>{q.hint[locale]}</small>}</div>
                  {choix(q)}
                </div>
              )))}
          </div>
        </div>
      );
    });
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

  // ── Liste par corps d'état (N10 : `ListeNeuf`) ─────────────────────────────────────────────
  const ouvrables = ouvrablesNeuf(ctx, sel, custom);
  const toutOuvert = ouvrables.every((k) => open[k]);
  function basculerTout() { // « Tout replier » revient à la vue d'ouverture : lots et cartes fermés
    setOpen(toutOuvert ? {} : Object.fromEntries(ouvrables.map((k) => [k, true])));
  }
  const basculer = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const actions: ActionsListeNeuf = {
    maj: upd, cocher: toggleCheck, auto: toggleAuto, choisir: choisirPoste, ajouterPerso: addCustom, majPerso: updCustom, supprimerPerso: delCustom,
  };
  const liste = { ctx, sel, maison: m, htParCle, open, onBascule: basculer, seulementCoches, actions };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + ROW_SOI_CSS + INTAKE_CSS + NEUF_DETAIL_CSS }} />
      <div className="av-estim av-neuf-d">
        <ChoixVue vue={view} onVue={setView} saisie={d.vueSaisie} devis={d.vueDevis} aria={dl.vues.aria} />

        {view === "saisie" && (
          <div>
            <div className="card">
              <div className="eyebrow">{d.eyebrow}</div>
              <h2>{d.titre}</h2>
              <div className="sub">{d.sous}</div>

              <Intertitre>{d.typeT}</Intertitre>
              <div className="typef">
                {questionsVisibles(m, "type").map((q) => (
                  <div key={q.k} className="typef-g">
                    {q.k !== "niveaux" && <span className="typef-l" aria-hidden="true">{q.l[locale]}</span>}
                    {choix(q)}
                  </div>
                ))}
              </div>

              {/* L'ordre de la rénovation : habitable, garage (à la place de la surface au sol), hauteur, code postal. */}
              <Intertitre>{B.surfacesT}</Intertitre>
              <div className="depart surf">
                {surfaces.filter((q) => q.vue !== "cp").map(champSurface)}
                <Field label={B.hauteur} hint={d.hauteurAide} htmlFor={ID("hauteur")}>
                  <output id={ID("hauteur")} className="ro"><span className="num">{d.hauteurValeur}</span><span className="u">m</span></output>
                </Field>
                {surfaces.filter((q) => q.vue === "cp").map(champSurface)}
              </div>

              <Intertitre>{B.piecesConfT} {sousTitre(B.piecesConfSous)}</Intertitre>
              {/* La grille de la rénovation, à ses paires : « Niveaux » ouvre la première rangée, en lecture
                  seule (le type de maison le décide) ; l'interrupteur « Cuisine équipée comprise » dessous,
                  comme celui du dressing. */}
              <div className="stpg">
                <CompteurFixe id={ID("niveaux-n")} label={B.compteurs.niveaux} hint={d.niveauxAide} valeur={ctx.niveaux} />
                {pieces.filter((q) => q.vue === "compteur").map((q) => (
                  <Stepper key={q.k} label={q.l[locale]} hint={q.hint?.[locale]} value={valeurCompteurNeuf(m, q.k as CompteurNeuf)}
                    onStep={(dt) => setEtat((e) => pasCompteurNeuf(e, q.k as CompteurNeuf, dt))} />))}
              </div>
              {pieces.filter((q) => q.vue === "interrupteur").map((q) => (
                <Interrupteur key={q.k} actif={!!valeur(q.k)} onBascule={() => repondre(q.k, !valeur(q.k))} texteActif={q.l[locale]} texteInactif={d.cuisineOff} />))}

              <Intertitre>{d.techT} {sousTitre(d.techSous)}</Intertitre>
              <div className={"tech" + (techOuvert ? " open" : "")}>
                <div className="tech-r">
                  <p className="tech-res">{resumeTechniqueNeuf(m, locale)}</p>
                  <button type="button" className="linkbtn tech-btn" aria-expanded={techOuvert} aria-controls={ID("tech")}
                    onClick={() => setTechOuvert((o) => !o)}>{techOuvert ? d.techReplier : d.techModifier}</button>
                </div>
                <div id={ID("tech")}>{techOuvert && technique()}</div>
              </div>

              {questionsVisibles(m, "finition").map((q) => (
                <Fragment key={q.k}><Intertitre>{B.finitionT}</Intertitre>{choix(q)}</Fragment>
              ))}

              {questionsVisibles(m, "pilotage").map((q) => (
                <Fragment key={q.k}><Intertitre>{q.l[locale]}</Intertitre>{choix(q)}</Fragment>
              ))}

              <Intertitre>{B.tvaT}</Intertitre>
              <div className="locnote">{gras(d.tvaNote)}</div>

              <Intertitre>{B.budgetT}</Intertitre>
              <div className="depart">
                <Field label={<>{B.budgetMax} <span style={{ color: "var(--faint)" }}>{B.facultatif}</span></>} htmlFor={ID("budget")}>
                  <NumStepper field aLaSortie id={ID("budget")} value={budget} min={0} step={1000} unit="€" onChange={(v) => setEtat((e) => ({ ...e, budget: Math.max(0, v || 0) }))} />
                </Field>
                <Field label={<>{B.aleas} <span style={{ color: "var(--faint)" }}>{B.aleasReco(ALEAS_NEUF)}</span></>} htmlFor={ID("aleas")}>
                  <NumStepper field aLaSortie id={ID("aleas")} value={aleas} min={0} max={20} unit="%" onChange={(v) => setEtat((e) => ({ ...e, aleas: Math.min(20, Math.max(0, v || 0)) }))} />
                </Field>
              </div>
              <Recap
                tete={<>🏠 <b>{n.maisonNiveaux[m.niveaux] ?? n.maisonNiveaux.pp}</b> · {R.habitables(Math.round(geo.SH))}
                  {geo.G > 0 && <> · {d.recapGarage(Math.round(geo.G))}</>} · {R.emprise(Math.round(geo.Etot))}
                  {" "}→ {R.murs} <b>{nb(geo.facadeNette) + "\u00a0m²"}</b> · {R.toiture} <b>{nb(geo.toiture) + "\u00a0m²"}</b></>}
                lignes={[
                  <>→ <b>{R.piecesTotal(geo.piecesEff)}</b> {R.auTotal} · <b>{R.sdb(m.sdb + m.suites)}</b>{m.suites > 0 && <>{R.dontSuite(m.suites)}</>}
                    {" "}· {R.menuiseries(geo.nFen + geo.nPF + geo.nBaie)} ({d.ouvertures(geo.nFen, geo.nPF, geo.nBaie)})</>,
                  <>→ {d.recapPlancher(nb(geo.SP))} · {d.recapPerimetre(nb(geo.P, 1))} · <b>{d.chantier(geo.moisChantier)}</b></>,
                ]}
                zone={cp.length >= 2 && <ZoneRecap reg={reg} zone={zoneLbl} mo={R.mo} mat={R.mat} />}
              />
            </div>

            <CarteFraisNeuf {...liste} />

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
            <ListeNeuf {...liste} custom={custom} outils={{
              seulement: seulementCoches, onSeulement: setSeulementCoches, texteSeulement: dl.liste.seulementCoches,
              toutOuvert, onTout: basculerTout, texteDeplier: dl.liste.toutDeplier, texteReplier: dl.liste.toutReplier,
            }} />

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" className="resetbtn" onClick={reset}>↺ {d.reset}</button>
            </div>
          </div>
        )}

        {view === "devis" && <DevisNeuf ctx={ctx} sel={sel} custom={custom} />}
      </div>

      {/* Barre live sticky (la même que la rénovation), avec le prix au m² et les frais */}
      <BarreLive total={tot.ttc} budget={budget} vue={view} onVue={setView} onEnregistrer={enregistrer} saving={saving} edition={edition} erreur={erreur}
        erreurId={ID_ERREUR} className="av-neuf-live"
        m2={<div className="m2"><span className="m2-v">≈ {fmt(m2, locale)}<span className="m2-l"> {d.parM2}</span><span className="m2-c">{d.parM2Court}</span>
          {frais > 0 ? <> <span className="m2-f">· {d.dontFrais} {fmt(frais, locale)}</span></> : null}</span></div>}
        t={{
          totalK: d.totalK, ttc: d.ttc, budget: d.budgetTxt, depasse: d.depasse, reste: d.reste, sansBudget: d.sansBudget,
          voirDevis: d.voirDevis, modifier: d.retourSaisie, enregistrer: d.enregistrer, enregistrerModifs: d.enregistrerModifs, enregistrement: d.enregistrement,
        }} />
    </>
  );
}
