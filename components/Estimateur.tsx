"use client";

/**
 * Estimateur AVYORA — rénovation, mode détaillé (métré saisi), branché sur le cœur pur `lib/estimateur`.
 * Questionnaire « Parle-nous du bien » (pré-remplissage auto), lots par phase (case + quantité + switch
 * auto/manuel + Fait faire/Je le fais), barre live (total animé + jauge budget) et vue devis. CSS scopé
 * `.av-estim`. Sauvegarde : reponses = { v:"estimateur", ctx, sel, codePostal } → POST /api/projects
 * (PATCH en édition) ; 401 → funnel /inscription.
 *
 * N6 (revue rénovation / neuf) : la logique est dans `lib/estimateur/detaille-reno.ts` (fonctions pures),
 * l'écran est fait des briques partagées avec le neuf (`components/estimateur/intake.tsx`, `ListeLots`,
 * `BarreLive`, `VueDevis`) et ses textes sont dans `dictDetail` (français au tutoiement, anglais). Rendu
 * figé par `tests/detaille-rendu-temoins.test.ts`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NumStepper from "@/components/Stepper";
import { EST_CSS } from "./estimateur-styles";
import { ROW_SOI_CSS } from "./estimateur/row-styles";
import { fmt, gras, Field, Stepper, CustomLines } from "./estimateur/partage";
import { Intertitre, Pastilles, Segment, CartesFinition, ChampCodePostal, Interrupteur, Recap, ZoneRecap } from "./estimateur/intake";
import { ListeLots, TitrePhase, BlocLot, LignesLot } from "./estimateur/ListeLots";
import { BarreLive } from "./estimateur/BarreLive";
import { VueDevis, ChoixVue, type DonneesDevis } from "./estimateur/VueDevis";
import {
  CATALOG, PHASES, ICON, key, isLoc, visible, visibleTask, lotHT,
  totals, buildDevis, regionCoef, customLotHT, customTotals, totauxAvecPerso, tauxPerso, tauxPersoPossibles, ESPACES, ALEAS_RENO,
  type Ctx, type Selection, type TypeBien, type Finition, type Lot, type Tache, type CustomLine,
} from "@/lib/estimateur";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import { dictDetail } from "@/lib/i18n/detail";
import { CLE_BROUILLON_RENO, CLE_BROUILLON_DETAIL_RENO, CLE_RECLAMATION_RENO, brouillonDetailleReno } from "@/lib/estimateur/brouillon-reno";
import {
  etatDepuis, etatVierge, projetReno, ouvertureDetailReno, majNombre, majSol, majType, pasCtx, compteurPiece, pasPiece,
  choisirPerimetre, basculerEspace, ajouterExemplaire, retirerExemplaire, surfaceExemplaire, majZone, basculerDressing, recapReno,
  majLigne, cocherReno, basculerAuto, manqueReno, nomProjetReno, corpsProjetReno,
  type EtatReno, type PieceDetail,
} from "@/lib/estimateur/detaille-reno";

const DRAFT_KEY = CLE_BROUILLON_RENO;               // brouillon partagé (mode rapide) — sert de graine « infos du bien »
const DRAFT_KEY_DETAIL = CLE_BROUILLON_DETAIL_RENO; // brouillon PROPRE au détaillé : ne récupère PAS les postes cochés du rapide

const TYPES: TypeBien[] = ["Studio", "T2", "T3", "T4", "Maison"];
const NIVEAUX_FINITION: Record<Finition, number> = { eco: 1, standard: 2, premium: 3 };

export default function Estimateur({ initialState, projectId }: { initialState?: Record<string, unknown>; projectId?: string } = {}) {
  const router = useRouter();
  const edition = !!projectId;

  // Projet rouvert (« Modifier ») : son état dès le premier rendu, celui du serveur compris.
  const [depart] = useState<EtatReno>(() => etatDepuis(projetReno(initialState)) ?? etatVierge());
  const [ctx, setCtx] = useState<Ctx>(depart.ctx);
  const [sel, setSel] = useState<Selection>(depart.sel);
  const [open, setOpen] = useState<Record<string, boolean>>(depart.open);
  const [codePostal, setCodePostal] = useState(depart.codePostal);
  const [view, setView] = useState<"saisie" | "devis">("saisie");
  const [custom, setCustom] = useState<CustomLine[]>(depart.custom);
  // TVA par défaut selon le régime du projet (`tauxPerso`) : 20 % en « Neuf / −2 ans / local pro », 10 % sinon.
  const addCustom = (lot: string) => setCustom((p) => [...p, { id: (crypto.randomUUID?.() ?? String(Date.now() + Math.random())), lot, nom: "", prix: 0, unite: "u", qte: 1, note: "", tva: tauxPerso(ctx), on: true, draft: true }]);
  const updCustom = (id: string, patch: Partial<CustomLine>) => setCustom((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delCustom = (id: string) => setCustom((p) => p.filter((x) => x.id !== id));
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const hydrated = useRef(false);
  const statutsRef = useRef<Record<string, number> | undefined>(undefined); // suivi de chantier à préserver en modif

  /* Hydratation : un projet rouvert est déjà posé (premier rendu) ; sinon « Nouveau projet », « Affiner »
     ou le brouillon du détaillé (`ouvertureDetailReno`). */
  function poser(e: EtatReno) { setCtx(e.ctx); setSel(e.sel); setOpen(e.open); setCodePostal(e.codePostal); setCustom(e.custom); }
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const projet = projetReno(initialState);
    if (projet) { statutsRef.current = projet.statuts; return; }

    // Signaux de « démarrage frais » : lien Nouveau projet (?new=1) ou retour d'« Affiner » (rapide → détaillé).
    // « Affiner » se dit par sessionStorage dans le même onglet, ou par ?affiner=1 quand le visiteur est passé
    // par l'inscription (bêta gratuite) : le lien de l'e-mail ouvre un nouvel onglet, sans le sessionStorage.
    let isNew = false, fromAffiner = false;
    try {
      const q = new URLSearchParams(window.location.search);
      isNew = q.get("new") === "1";
      const affinerUrl = q.get("affiner") === "1";
      fromAffiner = sessionStorage.getItem("avyora-affiner") === "1" || affinerUrl;
      if (fromAffiner) sessionStorage.removeItem("avyora-affiner");
      if (isNew || affinerUrl) { // on retire ?new et ?affiner de l'URL → un rafraîchissement reprend le travail en cours, pas un reset
        const url = new URL(window.location.href); url.searchParams.delete("new"); url.searchParams.delete("affiner");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    } catch { /* noop */ }

    // Nouveau projet → page VIERGE (rien coché, aucun résidu). « Affiner » récupère UNIQUEMENT les infos du bien.
    // Sinon : reprise d'un travail en cours (rafraîchissement / retour navigateur) sur le même projet ; sans brouillon,
    // page vierge (on ne sème plus une estimation rapide périmée hors « Affiner »).
    let graine: string | null = null, brouillon: string | null = null;
    try { graine = localStorage.getItem(DRAFT_KEY); brouillon = localStorage.getItem(DRAFT_KEY_DETAIL); } catch { /* noop */ }
    const o = ouvertureDetailReno({ nouveau: isNew, affiner: fromAffiner, graine, brouillon });
    if (o.effacer) { try { localStorage.removeItem(DRAFT_KEY_DETAIL); } catch { /* noop */ } }
    if (o.etat) poser(o.etat);
  }, [initialState]);

  // Sauvegarde brouillon local.
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(DRAFT_KEY_DETAIL, JSON.stringify({ v: "estimateur", ctx, sel, open, codePostal, custom })); } catch { /* noop */ }
  }, [ctx, sel, open, codePostal, custom]);

  // ctx effectif = ctx + code postal → le moteur applique le coefficient régional (MO).
  const ctxR = useMemo(() => ({ ...ctx, codePostal }), [ctx, codePostal]);
  // Lignes perso comprises (D8) : le même total que la vue devis, la fiche, la liste et le PDF.
  const tot = useMemo(() => totauxAvecPerso(totals(CATALOG, ctxR, sel), custom, ctxR.aleas), [ctxR, sel, custom]);
  const reg = regionCoef(codePostal);
  const locale = useLocale();
  const T = useT();
  const dl = dictDetail(locale), B = dl.bien, R = dl.recap;
  // Noms des espaces (mode périmètre) et type de bien dans la langue de l'écran (le français reste la donnée).
  const espaceNom = (nom: string) => B.espaces[nom] ?? nom;

  // ── Mises à jour du contexte (règles : `lib/estimateur/detaille-reno.ts`) ─────────────────
  const patchCtx = (p: Partial<Ctx>) => setCtx((c) => ({ ...c, ...p }));
  const onNum = (field: keyof Ctx, raw: string) => setCtx((c) => majNombre(c, field, raw));
  const onSol = (raw: string) => setCtx((c) => majSol(c, raw));
  const onType = (t: TypeBien) => setCtx((c) => majType(c, t));
  // Mode « pièces ciblées » : plusieurs pièces, chacune ×N à S m² ; une suite parentale seule a ses zones.
  const onPerimetre = (m: "entier" | "piece") => setCtx((c) => choisirPerimetre(c, m));
  const toggleEspace = (k: string) => setCtx((c) => basculerEspace(c, k));
  const addInstance = (k: string) => setCtx((c) => ajouterExemplaire(c, k));
  const removeInstance = (k: string, i: number) => setCtx((c) => retirerExemplaire(c, k, i));
  const setInstanceS = (k: string, i: number, val: number) => setCtx((c) => surfaceExemplaire(c, k, i, val));
  const setZone = (z: "zChambre" | "zSdb" | "zDressing", delta: number) => setCtx((c) => majZone(c, z, delta));
  const toggleDressing = () => setCtx(basculerDressing);
  // Compteurs : un champ du contexte (niveaux, sdb, wc, fenetres) ou une pièce du détail.
  const stepCtx = (field: keyof Ctx, delta: number, min: number) => setCtx((c) => pasCtx(c, field, delta, min));
  const bd = (f: PieceDetail) => compteurPiece(ctx, f);
  const stepBd = (f: PieceDetail, delta: number, min: number) => setCtx((c) => pasPiece(c, f, delta, min));

  // ── Mises à jour de la sélection ──────────────────────────────────────────
  const upd = (c: string, n: string, patch: (s: Selection[string]) => Selection[string]) => setSel((prev) => majLigne(prev, c, n, patch));
  const toggleCheck = (l: Lot, t: Tache) => setSel((prev) => cocherReno(ctx, prev, l, t));
  const toggleAuto = (l: Lot, t: Tache) => setSel((prev) => basculerAuto(ctx, prev, l, t));
  function reset() {
    try { localStorage.removeItem(DRAFT_KEY_DETAIL); } catch { /* noop */ }
    poser(etatVierge()); setView("saisie");
  }

  // ── Sauvegarde projet ─────────────────────────────────────────────────────
  async function enregistrer() {
    setErreur(null);
    const manque = manqueReno(ctx, codePostal);
    if (manque) { setErreur(dl.erreurs[manque]); setView("saisie"); return; }
    setSaving(true);
    const nom = nomProjetReno(ctx, { projet: dl.projet, type: (t) => B.types[t] ?? t, espace: espaceNom });
    try {
      const res = await fetch(edition ? `/api/projects/${projectId}` : "/api/projects", {
        method: edition ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpsProjetReno({ nom, ctx: ctxR, sel, codePostal, custom, statuts: statutsRef.current })),
      });
      if (res.status === 401) {
        // Le brouillon COMPLET d'abord (postes, lignes perso, nom), le drapeau ensuite : sans lui,
        // `ClaimDraft` créait le projet à partir de l'ancien brouillon du rapide (N4).
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(brouillonDetailleReno({ nom, ctx: ctxR, sel, codePostal, custom })));
          localStorage.setItem(CLE_RECLAMATION_RENO, "1");
        } catch { /* noop */ }
        router.push("/inscription");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || dl.erreurs.save); setSaving(false); return; }
      if (!edition) { try { localStorage.removeItem(DRAFT_KEY_DETAIL); localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } }
      router.push(edition ? `/projets/${projectId}` : `/projets/${data.id}`);
    } catch { setErreur(dl.erreurs.reseau); setSaving(false); }
  }

  // ── Récap du bien ─────────────────────────────────────────────────────────
  const r = recapReno(ctx);
  const { appart, piece, suite } = r;
  const espSel = r.espaces;
  const espKeys = new Set(espSel.map((e) => e.k));
  const SS = r.emprise;
  const budget = ctx.budget;

  // ── Un lot : en-tête, lignes du catalogue, lignes perso ────────────────────
  function bloc(l: Lot) {
    const cLines = custom.filter((x) => x.lot === l.c);
    const cnt = l.t.filter((t) => visibleTask(ctx, t) && sel[key(l.c, t.n)]?.on).length + cLines.filter((x) => x.on !== false && !x.draft).length;
    const isOpen = !!open[l.c];
    const loc = isLoc(l.c);
    return (
      <BlocLot key={l.c} ouvert={isOpen} entete={{
        icone: ICON[l.c] || "•", nom: catT(locale, "corps", l.c), cnt, ouvert: isOpen,
        montant: cnt > 0 ? fmt(lotHT(ctx, sel, l) + customLotHT(custom, l.c)) + " " + dl.liste.ht : "",
        onBascule: () => setOpen((o) => ({ ...o, [l.c]: !o[l.c] })),
      }}>
        {loc && <div className="locnote">{gras(dl.liste.locNote)}</div>}
        <LignesLot l={l} taches={l.t.filter((t) => visibleTask(ctx, t))} ctx={ctxR} sel={sel} loc={loc} maj={upd} onCocher={toggleCheck} onAuto={toggleAuto} />
        {/* ligne perso disponible sur tous les lots */}
        <CustomLines lines={cLines} onAdd={() => addCustom(l.c)} onUpd={updCustom} onDel={delCustom} tvas={(courant) => tauxPersoPossibles(ctx, courant)} />
      </BlocLot>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + ROW_SOI_CSS }} />
      <div className="av-estim">
        <ChoixVue vue={view} onVue={setView} saisie={dl.vues.saisie} devis={dl.vues.devis} aria={dl.vues.aria} />

        {view === "saisie" && (
          <div>
            <div className="card">
              <div className="eyebrow">{B.eyebrow}</div>
              <h2>{B.titre}</h2>
              <div className="sub">{B.sous}</div>
              <Intertitre>{B.perimetreT}</Intertitre>
              <Segment aria={B.perimetreT} valeur={piece ? "piece" : "entier"} onChoix={onPerimetre}
                options={[{ v: "entier", label: B.entier }, { v: "piece", label: B.pieces }]} />

              {piece ? (
                <>
                  <Intertitre>{B.piecesQ}</Intertitre>
                  <Pastilles aria={B.piecesQ} actif={(k) => espKeys.has(k)} onChoix={toggleEspace}
                    options={Object.entries(ESPACES).map(([k, e]) => ({ v: k, label: <>{e.emoji} {espaceNom(e.nom)}</> }))} />
                  <div className="locnote" style={{ marginTop: 10 }}>{B.piecesAide}</div>
                  {!suite && (
                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      {espSel.map(({ k, surfaces }) => (
                        <div key={k} style={{ border: "1px solid var(--line, #e7e6f0)", borderRadius: 12, padding: "10px 12px", background: "#fcfcff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontWeight: 700 }}>{ESPACES[k].emoji} {espaceNom(ESPACES[k].nom)}</span>
                            <span style={{ color: "var(--faint)", fontSize: 12.5 }}>{B.exemplaires(surfaces.length)}</span>
                          </div>
                          {surfaces.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "6px 0" }}>
                              <span style={{ minWidth: 120, color: "var(--faint)", fontSize: 13, fontWeight: 600 }}>{B.numero(espaceNom(ESPACES[k].nom), i + 1)}</span>
                              <Field label={B.surface} htmlFor={`av-reno-${k}-${i}`}><NumStepper field id={`av-reno-${k}-${i}`} value={s} min={1} unit="m²" onChange={(v) => setInstanceS(k, i, v)} /></Field>
                              {surfaces.length > 1 && <button type="button" onClick={() => removeInstance(k, i)} style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>{B.retirer}</button>}
                            </div>
                          ))}
                          <button type="button" onClick={() => addInstance(k)} style={{ marginTop: 6, width: "100%", border: "1px dashed var(--brand-line, #d7d9fb)", background: "#fff", color: "var(--brand, #4f46e5)", borderRadius: 10, padding: "8px 12px", fontWeight: 600, cursor: "pointer" }}>{B.ajouter(espaceNom(ESPACES[k].nom))}</button>
                        </div>
                      ))}
                      <div className="suitetotal">{B.totalProjet}<b className="num">{r.espacesSurface} m²</b></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Intertitre>{B.typeT}</Intertitre>
                  <Pastilles aria={B.typeT} actif={(t) => ctx.type === t} onChoix={onType} options={TYPES.map((t) => ({ v: t, label: B.types[t] ?? t }))} />
                </>
              )}

              <Intertitre>{piece ? B.hauteurLocT : B.surfacesT}</Intertitre>

              {suite && (
                <div className="suitezones">
                  <div className="stpg">
                    <Stepper label={B.zoneChambre} value={ctx.zChambre ?? 14} onStep={(d) => setZone("zChambre", d)} />
                    <Stepper label={B.zoneSdb} hint={B.zoneSdbAide} value={ctx.zSdb ?? 6} onStep={(d) => setZone("zSdb", d)} />
                    {ctx.avecDressing && <Stepper label={B.zoneDressing} value={ctx.zDressing ?? 5} onStep={(d) => setZone("zDressing", d)} />}
                  </div>
                  <Interrupteur actif={!!ctx.avecDressing} onBascule={toggleDressing} texteActif={B.avecDressing} texteInactif={B.ajouterDressing} />
                  <div className="suitetotal">{B.totalSuite}<b className="num">{ctx.surface} m²</b></div>
                </div>
              )}

              <div className="depart">
                {!piece && (
                  <Field label={B.surfaceHab} hint={B.surfaceHabAide} htmlFor="av-reno-surface">
                    <NumStepper field id="av-reno-surface" value={ctx.surface} min={1} unit="m²" onChange={(n) => onNum("surface", String(n))} />
                  </Field>
                )}
                {!appart && !piece && (
                  <Field label={B.surfaceSol} hint={B.surfaceSolAide} htmlFor="av-reno-sol">
                    <NumStepper field id="av-reno-sol" value={ctx.surfaceSol} min={1} unit="m²" onChange={(n) => onSol(String(n))} />
                  </Field>
                )}
                <Field label={B.hauteur} htmlFor="av-reno-hauteur"><NumStepper field id="av-reno-hauteur" value={ctx.hauteur} min={2} step={0.1} unit="m" onChange={(n) => onNum("hauteur", String(n))} /></Field>
                <Field label={B.cp} htmlFor="av-reno-cp"><ChampCodePostal id="av-reno-cp" valeur={codePostal} onChange={setCodePostal} placeholder={B.cpExemple} /></Field>
              </div>

              {!piece && (<>
              <Intertitre>{B.piecesConfT} <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{B.piecesConfSous}</span></Intertitre>
              <div className="stpg">
                <Stepper label={B.compteurs.niveaux} hint={B.compteurs.niveauxAide} value={ctx.niveaux} onStep={(d) => stepCtx("niveaux", d, 1)} />
                <Stepper label={B.compteurs.sejour} value={bd("sejour")} onStep={(d) => stepBd("sejour", d, 0)} />
                <Stepper label={B.compteurs.cuisine} value={bd("cuisine")} onStep={(d) => stepBd("cuisine", d, 0)} />
                <Stepper label={B.compteurs.chambres} value={bd("chambres")} onStep={(d) => stepBd("chambres", d, 0)} />
                <Stepper label={B.compteurs.suites} hint={B.compteurs.suitesAide} value={bd("suites")} onStep={(d) => stepBd("suites", d, 0)} />
                <Stepper label={B.compteurs.sdb} hint={B.compteurs.sdbAide} value={ctx.sdb} onStep={(d) => stepCtx("sdb", d, 0)} />
                <Stepper label={B.compteurs.wc} value={ctx.wc} onStep={(d) => stepCtx("wc", d, 0)} />
                <Stepper label={B.compteurs.couloir} value={bd("couloir")} onStep={(d) => stepBd("couloir", d, 0)} />
                <Stepper label={B.compteurs.buanderie} value={bd("buanderie")} onStep={(d) => stepBd("buanderie", d, 0)} />
                <Stepper label={B.compteurs.fenetres} hint={B.compteurs.fenetresAide} value={ctx.fenetres} onStep={(d) => stepCtx("fenetres", d, 0)} />
              </div>
              </>)}

              <Intertitre>{B.finitionT}</Intertitre>
              <CartesFinition aria={B.finitionT} valeur={ctx.finition} onChoix={(f) => patchCtx({ finition: f })}
                cartes={(["eco", "standard", "premium"] as Finition[]).map((v) => ({ v, lvl: NIVEAUX_FINITION[v], ...B.finitions[v] }))} />

              <Intertitre>{B.tvaT}</Intertitre>
              <Segment aria={B.tvaT} valeur={ctx.fiscal === "pro" ? "pro" : "habitation"} onChoix={(f) => patchCtx({ fiscal: f })}
                options={[{ v: "habitation", label: B.tvaHabitation }, { v: "pro", label: B.tvaPro }]} />
              <div className="locnote">{gras(B.tvaNote)}</div>

              <Intertitre>{B.budgetT}</Intertitre>
              <div className="depart">
                <Field label={<>{B.budgetMax} <span style={{ color: "var(--faint)" }}>{B.facultatif}</span></>} htmlFor="av-reno-budget"><NumStepper field id="av-reno-budget" value={ctx.budget} min={0} step={1000} unit="€" onChange={(n) => onNum("budget", String(n))} /></Field>
                <Field label={<>{B.aleas} <span style={{ color: "var(--faint)" }}>{B.aleasReco(ALEAS_RENO)}</span></>} htmlFor="av-reno-aleas"><NumStepper field id="av-reno-aleas" value={ctx.aleas} min={0} max={20} unit="%" onChange={(n) => onNum("aleas", String(n))} /></Field>
              </div>
              <Recap
                tete={piece
                  ? <>🎯 <b>{R.pieces}</b> · {ctx.surface} m² · {R.plafond(ctx.hauteur)}</>
                  : <>🏠 <b>{appart ? R.appart : R.maison}</b> · {R.habitables(ctx.surface)} · <b>{R.niveaux(ctx.niveaux)}</b> · {R.emprise(SS)} · {R.plafond(ctx.hauteur)}
                    {!appart && <> → {R.murs} <b>{r.facade} m²</b> · {R.toiture} <b>{r.toiture} m²</b></>}
                    {r.etage > 0 && <span style={{ color: "var(--faint)" }}>{R.etage(r.etage)}</span>}</>}
                lignes={piece
                  ? [<>→ {espSel.map(({ k, surfaces }) => R.piece(surfaces.length, espaceNom(ESPACES[k]?.nom ?? k))).join(" · ")}</>]
                  : [<>→ <b>{R.piecesTotal(r.pieces)}</b> {R.auTotal} · <b>{R.sdb(r.sdb)}</b>
                    {(ctx.suites ?? 0) > 0 && <>{R.dontSuite(ctx.suites ?? 0)}</>} · {R.menuiseries(ctx.fenetres)}</>]}
                zone={codePostal.length >= 2 && <ZoneRecap reg={reg} zone={(T.rapide.zones as Record<string, string>)[reg.zone] ?? reg.zone} mo={R.mo} mat={R.mat} />}
              />
            </div>

            <div className="intro">{gras(dl.liste.intro)}</div>

            <ListeLots phases={PHASES.flatMap((ph, i) => {
              const lots = CATALOG.filter((l) => l.p === ph && visible(ctx, l));
              return lots.length ? [{ cle: ph, titre: <TitrePhase num={i + 1} nom={catT(locale, "phases", ph)} />, contenu: lots.map(bloc) }] : [];
            })} />

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" className="resetbtn" onClick={reset}>↺ {dl.liste.reset}</button>
            </div>
          </div>
        )}

        {view === "devis" && <DevisView ctx={ctxR} sel={sel} custom={custom} />}
      </div>

      <BarreLive total={tot.ttc} budget={budget} vue={view} onVue={setView} onEnregistrer={enregistrer} saving={saving} edition={edition} erreur={erreur} t={dl.live} />
    </>
  );
}

/** « Mon devis » de la rénovation : les données de `VueDevis` (catalogue, TVA du régime, lignes perso). */
export function DevisView({ ctx, sel, custom = [] }: { ctx: Ctx; sel: Selection; custom?: CustomLine[] }) {
  const locale = useLocale();
  const D = dictDetail(locale).devis;
  const dv = useMemo(() => buildDevis(CATALOG, ctx, sel), [ctx, sel]);
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  // Le total du projet, lignes perso comprises : le même calcul partout (`totauxAvecPerso`, D8).
  const t = totauxAvecPerso(t0, custom, ctx.aleas);
  const cu = customTotals(custom);
  const persoTtc = cu.ht + cu.tva;
  const max = Math.max(1, ...lots.map((x) => x.ttc), persoTtc);
  const pro = ctx.fiscal === "pro";

  const d: DonneesDevis = {
    eb: D.eb, ttc: t.ttc, ttcUnite: dictDetail(locale).live.ttc,
    pilules: [
      { k: D.travauxHt, v: t.ht }, { k: D.tva(pro), v: t.tva }, { k: D.aleas(ctx.aleas), v: t.aleas }, { k: D.budgetMax, v: ctx.budget },
    ],
    hint: pro ? D.hintPro : D.hintHabitation,
    bilan: {
      titre: D.bilanT, titreNote: D.bilanHt, sous: D.bilanSous,
      paye: D.paye, payeV: b.paye, payeSous: D.dontMat(fmt(b.matA), fmt(b.moA)),
      achat: D.achat, achatV: b.achat, eco: D.eco, ecoV: b.eco,
    },
    repartition: {
      titre: D.repT, sous: D.repSous,
      vide: !lots.length && !persoTtc ? D.vide : null,
      phases: PHASES.flatMap((ph) => {
        const pl = lots.filter((x) => x.phase === ph).sort((a, c) => c.ttc - a.ttc);
        return pl.length ? [{
          cle: ph, nom: catT(locale, "phases", ph),
          lots: pl.map((x) => ({ cle: x.corps, nom: `${ICON[x.corps] || ""} ${catT(locale, "corps", x.corps)}`, v: x.ttc, pct: (x.ttc / max) * 100 })),
        }] : [];
      }),
      perso: persoTtc > 0 ? { cle: "perso", nom: D.perso, v: persoTtc, pct: (persoTtc / max) * 100 } : null,
    },
    detail: {
      titre: D.detailT, sous: D.detailSous,
      lignes: lignes.map((li) => ({
        cle: li.cle, nom: catLigne(locale, li.nom, li.cle),
        // Unité écrite (« m² », « m³ ») en français comme en anglais ; la clé reste « m2 ».
        q: li.unite === "forfait" ? "—" : D.qte(li.qty, catT(locale, "unites", li.unite), li.mode === "location"),
        mode: li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA",
        modeTxt: li.mode === "location" ? D.modes.location : li.mode === "je-fais" ? D.modes.jeFais : D.modes.faitFaire,
        m: fmt(li.ttc),
      })),
    },
    pied: D.pied(D.finitionPied(ctx.finition)),
  };
  return <VueDevis d={d} />;
}
