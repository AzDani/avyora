"use client";

/**
 * Estimateur AVYORA — UI (métré saisi) branchée sur le cœur pur `lib/estimateur`.
 * Port React de la maquette : carte projet + pré-remplissage auto, lots par phase
 * (case + quantité + switch auto/manuel + Fait faire/Je le fais), barre live (total animé
 * + jauge budget), et vue devis (hero, bilan, répartition, détail). CSS scopé `.av-estim`.
 * Sauvegarde : reponses = { v:"estimateur", ctx, sel, codePostal } → POST /api/projects
 * (PATCH en édition) ; 401 → funnel /inscription.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NumStepper from "@/components/Stepper";
import { EST_CSS } from "./estimateur-styles";
import { ROW_SOI_CSS } from "./estimateur/row-styles";
import { CountUp } from "./estimateur/CountUp";
import { Row } from "./estimateur/Row";
import { fmt, Field, Stepper, CustomLines } from "./estimateur/partage";
import {
  CATALOG, PHASES, ICON, key, isLoc, visible, visibleTask, lotHT,
  totals, buildDevis, regionCoef, customLotHT, customTotals, totauxAvecPerso, tauxPerso, tauxPersoPossibles, ESPACES,
  type Ctx, type Selection, type TypeBien, type Finition, type Lot, type Tache, type CustomLine,
} from "@/lib/estimateur";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { CLE_BROUILLON_RENO, CLE_BROUILLON_DETAIL_RENO, CLE_RECLAMATION_RENO, brouillonDetailleReno } from "@/lib/estimateur/brouillon-reno";
import {
  etatDepuis, etatVierge, projetReno, ouvertureDetailReno, majNombre, majSol, majType, pasCtx, compteurPiece, pasPiece,
  choisirPerimetre, basculerEspace, ajouterExemplaire, retirerExemplaire, surfaceExemplaire, majZone, basculerDressing, recapReno,
  majLigne, cocherReno, basculerAuto, ligneQuantite, lignePrix, ligneMateriaux, manqueReno, nomProjetReno, corpsProjetReno,
  type EtatReno, type PieceDetail,
} from "@/lib/estimateur/detaille-reno";

// Noms des espaces (mode périmètre) traduits pour l'affichage (le FR reste la donnée).
const ESPACE_EN: Record<string, string> = {
  "Salle de bain": "Bathroom", "Suite parentale": "Master suite", "Cuisine": "Kitchen",
  "Séjour": "Living room", "Chambre": "Bedroom", "Combles": "Loft", "Autre espace": "Other space",
};
const espaceNom = (locale: string, nom: string) => (locale === "en" ? ESPACE_EN[nom] ?? nom : nom);

const DRAFT_KEY = CLE_BROUILLON_RENO;               // brouillon partagé (mode rapide) — sert de graine « infos du bien »
const DRAFT_KEY_DETAIL = CLE_BROUILLON_DETAIL_RENO; // brouillon PROPRE au détaillé : ne récupère PAS les postes cochés du rapide

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

  // ── Mises à jour du contexte (règles : `lib/estimateur/detaille-reno.ts`) ─────────────────
  function patchCtx(p: Partial<Ctx>) { setCtx((c) => ({ ...c, ...p })); }
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
    if (manque) { setErreur(manque === "cp" ? "Renseignez un code postal (5 chiffres) dans « Votre projet »." : "Renseignez la surface habitable."); setView("saisie"); return; }
    setSaving(true);
    const nom = nomProjetReno(ctx);
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
      if (!res.ok) { setErreur(data?.error || "Enregistrement impossible."); setSaving(false); return; }
      if (!edition) { try { localStorage.removeItem(DRAFT_KEY_DETAIL); localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } }
      router.push(edition ? `/projets/${projectId}` : `/projets/${data.id}`);
    } catch { setErreur("Réseau indisponible. Réessayez."); setSaving(false); }
  }

  // ── Récap du bien ─────────────────────────────────────────────────────────
  const r = recapReno(ctx);
  const { appart, piece, suite } = r;
  const espSel = r.espaces;
  const espKeys = new Set(espSel.map((e) => e.k));
  const espTotal = r.espacesSurface;
  const pTot = r.pieces, sdbTot = r.sdb;
  const SS = r.emprise, facade = r.facade, roof = r.toiture, etage = r.etage;

  const budget = ctx.budget;
  const over = budget > 0 && tot.ttc > budget;
  const pct = budget > 0 ? Math.min(100, (tot.ttc / budget) * 100) : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EST_CSS + ROW_SOI_CSS }} />
      <div className="av-estim">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div className="views">
            <button className={view === "saisie" ? "on" : ""} onClick={() => setView("saisie")}>Ma saisie</button>
            <button className={view === "devis" ? "on" : ""} onClick={() => setView("devis")}>Mon devis</button>
          </div>
        </div>

        {view === "saisie" && (
          <div>
            <div className="card">
              <div className="eyebrow">Votre projet</div>
              <h2>Parlez-nous du bien</h2>
              <div className="sub">Renseignez ces infos, on pré-remplit les quantités — vous ajustez ensuite.</div>
              <div className="gl">Périmètre du projet</div>
              <div className="segf">
                <button type="button" className={!piece ? "on" : ""} onClick={() => onPerimetre("entier")}>🏠 Logement entier</button>
                <button type="button" className={piece ? "on" : ""} onClick={() => onPerimetre("piece")}>🎯 Une ou plusieurs pièces</button>
              </div>

              {piece ? (
                <>
                  <div className="gl">Quelles pièces rénover ?</div>
                  <div className="tpills">
                    {Object.entries(ESPACES).map(([k, e]) => (
                      <button key={k} type="button" className={"tpill" + (espKeys.has(k) ? " on" : "")} onClick={() => toggleEspace(k)}>{e.emoji} {espaceNom(locale, e.nom)}</button>
                    ))}
                  </div>
                  <div className="locnote" style={{ marginTop: 10 }}>Coche toutes les pièces concernées (ex. 2 chambres + 1 SDB). On additionne les quantités et on n'affiche que les lots utiles.</div>
                  {!suite && (
                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      {espSel.map(({ k, surfaces }) => (
                        <div key={k} style={{ border: "1px solid var(--line, #e7e6f0)", borderRadius: 12, padding: "10px 12px", background: "#fcfcff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontWeight: 700 }}>{ESPACES[k].emoji} {espaceNom(locale, ESPACES[k].nom)}</span>
                            <span style={{ color: "var(--faint)", fontSize: 12.5 }}>{surfaces.length} exemplaire{surfaces.length > 1 ? "s" : ""}</span>
                          </div>
                          {surfaces.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "6px 0" }}>
                              <span style={{ minWidth: 120, color: "var(--faint)", fontSize: 13, fontWeight: 600 }}>{espaceNom(locale, ESPACES[k].nom)} n°{i + 1}</span>
                              <Field label="Surface"><NumStepper field value={s} min={1} unit="m²" onChange={(v) => setInstanceS(k, i, v)} /></Field>
                              {surfaces.length > 1 && <button type="button" onClick={() => removeInstance(k, i)} style={{ marginLeft: "auto", border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>✕ retirer</button>}
                            </div>
                          ))}
                          <button type="button" onClick={() => addInstance(k)} style={{ marginTop: 6, width: "100%", border: "1px dashed var(--brand-line, #d7d9fb)", background: "#fff", color: "var(--brand, #4f46e5)", borderRadius: 10, padding: "8px 12px", fontWeight: 600, cursor: "pointer" }}>+ Ajouter une {espaceNom(locale, ESPACES[k].nom).toLowerCase()}</button>
                        </div>
                      ))}
                      <div className="suitetotal">Surface totale du projet<b className="num">{espTotal} m²</b></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="gl">Type de bien</div>
                  <div className="tpills">
                    {(["Studio", "T2", "T3", "T4", "Maison"] as TypeBien[]).map((t) => (
                      <button key={t} type="button" className={"tpill" + (ctx.type === t ? " on" : "")} onClick={() => onType(t)}>{t}</button>
                    ))}
                  </div>
                </>
              )}

              <div className="gl">{piece ? "Hauteur & localisation" : "Surfaces"}</div>

              {suite && (
                <div className="suitezones">
                  <div className="stpg">
                    <Stepper label="🛏️ Chambre (m²)" value={ctx.zChambre ?? 14} onStep={(d) => setZone("zChambre", d)} />
                    <Stepper label="🛁 Salle de bain (m²)" hint="carrelage, faïence, étanchéité" value={ctx.zSdb ?? 6} onStep={(d) => setZone("zSdb", d)} />
                    {ctx.avecDressing && <Stepper label="🚪 Dressing (m²)" value={ctx.zDressing ?? 5} onStep={(d) => setZone("zDressing", d)} />}
                  </div>
                  <button type="button" className={"drtoggle" + (ctx.avecDressing ? " on" : "")} onClick={toggleDressing}>
                    <span className="dot" />{ctx.avecDressing ? "Avec dressing" : "Ajouter un dressing"}
                  </button>
                  <div className="suitetotal">Surface totale de la suite<b className="num">{ctx.surface} m²</b></div>
                </div>
              )}

              <div className="depart">
                {!piece && (
                  <Field label="Surface habitable" hint="Tous les niveaux additionnés — là où tu vis. Si tu crées un étage, ajoute sa surface ici.">
                    <NumStepper field value={ctx.surface} min={1} unit="m²" onChange={(n) => onNum("surface", String(n))} />
                  </Field>
                )}
                {!appart && !piece && (
                  <Field label="Surface au sol" hint="Empreinte du bâtiment au sol, calculée pour toi (habitable ÷ niveaux). Sert à la toiture et aux fondations — ajuste seulement si besoin.">
                    <NumStepper field value={ctx.surfaceSol} min={1} unit="m²" onChange={(n) => onSol(String(n))} />
                  </Field>
                )}
                <Field label="Hauteur sous plafond"><NumStepper field value={ctx.hauteur} min={2} step={0.1} unit="m" onChange={(n) => onNum("hauteur", String(n))} /></Field>
                <Field label="Code postal"><div className="uinp"><input inputMode="numeric" maxLength={5} placeholder="33000" value={codePostal} onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, "").slice(0, 5))} /></div></Field>
              </div>

              {!piece && (<>
              <div className="gl">Pièces &amp; configuration <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>· chaque pièce compte dans le chiffrage</span></div>
              <div className="stpg">
                <Stepper label="Niveaux" hint="RDC = 1" value={ctx.niveaux} onStep={(d) => stepCtx("niveaux", d, 1)} />
                <Stepper label="Séjour / salon" value={bd("sejour")} onStep={(d) => stepBd("sejour", d, 0)} />
                <Stepper label="Cuisine" value={bd("cuisine")} onStep={(d) => stepBd("cuisine", d, 0)} />
                <Stepper label="Chambres" value={bd("chambres")} onStep={(d) => stepBd("chambres", d, 0)} />
                <Stepper label="Suite parentale" hint="chambre + SDB" value={bd("suites")} onStep={(d) => stepBd("suites", d, 0)} />
                <Stepper label="Salles de bain" hint="hors suite" value={ctx.sdb} onStep={(d) => stepCtx("sdb", d, 0)} />
                <Stepper label="WC" value={ctx.wc} onStep={(d) => stepCtx("wc", d, 0)} />
                <Stepper label="Couloir / dégagement" value={bd("couloir")} onStep={(d) => stepBd("couloir", d, 0)} />
                <Stepper label="Buanderie / cellier" value={bd("buanderie")} onStep={(d) => stepBd("buanderie", d, 0)} />
                <Stepper label="Menuiseries ext." hint="fenêtres, baies" value={ctx.fenetres} onStep={(d) => stepCtx("fenetres", d, 0)} />
              </div>
              </>)}

              <div className="gl">Niveau de finition</div>
              <div className="finc">
                {FINIS.map((f) => (
                  <button key={f.v} type="button" className={"fc" + (ctx.finition === f.v ? " on" : "")} onClick={() => patchCtx({ finition: f.v })}>
                    <span className="fh"><span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span><span className="ck" /></span>
                    <span className="fe">{f.eye}</span>
                    <span className="ft">{f.label}</span>
                    <span className="fd">{f.desc}</span>
                  </button>
                ))}
              </div>

              <div className="gl">Régime de TVA</div>
              <div className="segf">
                <button type="button" className={ctx.fiscal !== "pro" ? "on" : ""} onClick={() => patchCtx({ fiscal: "habitation" })}>Logement +2 ans</button>
                <button type="button" className={ctx.fiscal === "pro" ? "on" : ""} onClick={() => patchCtx({ fiscal: "pro" })}>Neuf / −2 ans / local pro</button>
              </div>
              <div className="locnote">
                <b>Logement +2 ans</b> : TVA réduite <b>10 %</b> (et <b>5,5 %</b> sur la rénovation énergétique — isolation, chauffage performant…). <b>Neuf / −2 ans / local pro</b> : tout à <b>20 %</b>. Les matériaux que vous achetez seul (« Je le fais ») restent à <b>20 %</b> dans tous les cas.
              </div>

              <div className="gl">Budget &amp; imprévus</div>
              <div className="depart">
                <Field label={<>Budget max <span style={{ color: "var(--faint)" }}>· facultatif</span></>}><NumStepper field value={ctx.budget} min={0} step={1000} unit="€" onChange={(n) => onNum("budget", String(n))} /></Field>
                <Field label={<>Provision aléas <span style={{ color: "var(--faint)" }}>· reco ≥ 5</span></>}><NumStepper field value={ctx.aleas} min={0} max={20} unit="%" onChange={(n) => onNum("aleas", String(n))} /></Field>
              </div>
              <div className="recap">
                {piece ? (
                  <>🎯 <b>Pièces ciblées</b> · {ctx.surface} m² · plafond {ctx.hauteur} m
                    <div style={{ marginTop: 6 }}>→ {espSel.map(({ k, surfaces }) => `${surfaces.length} ${espaceNom(locale, ESPACES[k]?.nom ?? k)}`).join(" · ")}</div>
                  </>
                ) : (
                  <>🏠 <b>{appart ? "Appartement" : "Maison"}</b> · {ctx.surface} m² habitables · <b>{ctx.niveaux} niveau{ctx.niveaux > 1 ? "x" : ""}</b> · emprise au sol ~{SS} m² · plafond {ctx.hauteur} m
                    {!appart && <> → murs extérieurs ≈ <b>{facade} m²</b> · toiture ≈ <b>{roof} m²</b></>}
                    {etage > 0 && <span style={{ color: "var(--faint)" }}> (dont ~{etage} m² à l’étage)</span>}
                    <div style={{ marginTop: 6 }}>
                      → <b>{pTot} pièce{pTot > 1 ? "s" : ""}</b> au total · <b>{sdbTot} salle{sdbTot > 1 ? "s" : ""} de bain</b>
                      {(ctx.suites ?? 0) > 0 && <> (dont {ctx.suites} en suite)</>} · {ctx.fenetres} menuiseries ext.
                    </div>
                  </>
                )}
                {codePostal.length >= 2 && (
                  <div style={{ marginTop: 6 }}>
                    📍 <b>{reg.zone}</b>
                    {reg.mo !== 1 && <> · main-d’œuvre {reg.mo > 1 ? "+" : ""}{Math.round((reg.mo - 1) * 100)} %</>}
                    {reg.mat !== 1 && <> · matériaux +{Math.round((reg.mat - 1) * 100)} %</>}
                  </div>
                )}
              </div>
            </div>

            <div className="intro">
              Ouvre les lots concernés, coche les travaux, ajuste les quantités. Prix affichés <b>HT</b>. Sur chaque travail faisable soi-même, électricité, mur porteur et charpente compris, choisis <b>« Fait faire »</b> (artisan) ou <b>« Je le fais »</b> — les 2 prix s’affichent. Pris soi-même, un poste de maçonnerie, de charpente, de couverture ou de menuiseries extérieures sort de la garantie décennale ; pour un mur porteur ou une charpente, une étude est conseillée.
            </div>

            {PHASES.map((ph, i) => {
              const lots = CATALOG.filter((l) => l.p === ph && visible(ctx, l));
              if (!lots.length) return null;
              return (
                <div key={ph}>
                  <div className="phase-t">{i + 1} · {catT(locale, "phases", ph)}</div>
                  {lots.map((l) => {
                    const cLines = custom.filter((x) => x.lot === l.c);
                    const cnt = l.t.filter((t) => visibleTask(ctx, t) && sel[key(l.c, t.n)]?.on).length + cLines.filter((x) => x.on !== false && !x.draft).length;
                    const isOpen = !!open[l.c];
                    const loc = isLoc(l.c);
                    const canCustom = true; // ligne perso disponible sur tous les lots
                    return (
                      <div key={l.c} className={"acc" + (isOpen ? " open" : "")}>
                        <div className="acc-h" onClick={() => setOpen((o) => ({ ...o, [l.c]: !o[l.c] }))}>
                          <span className="ic">{ICON[l.c] || "•"}</span>
                          <span className="nm">{catT(locale, "corps", l.c)}</span>
                          {cnt > 0 && <span className="cnt">{cnt}</span>}
                          <span className="amt num">{cnt > 0 ? fmt(lotHT(ctx, sel, l) + customLotHT(custom, l.c)) + " HT" : ""}</span>
                          <span className="car">›</span>
                        </div>
                        {isOpen && (
                          <div className="acc-b">
                            {loc && <div className="locnote">Prix indicatifs <b>/jour</b> — à confirmer auprès du loueur. Indiquez le nombre de jours.</div>}
                            {l.t.filter((t) => visibleTask(ctx, t)).map((t) => (
                              <Row key={t.n} l={l} t={t} ctx={ctxR} sel={sel} loc={loc}
                                onCheck={() => toggleCheck(l, t)}
                                onChoice={(self) => upd(l.c, t.n, (s) => ({ ...s, self }))}
                                onAuto={() => toggleAuto(l, t)}
                                /* D12 : corriger une quantité à la main épingle la ligne — le plan cesse de l'alimenter. */
                                onQty={(v) => upd(l.c, t.n, ligneQuantite(ctx, l, t, v))}
                                onMat={(m) => upd(l.c, t.n, (s) => ({ ...s, mat: m }))}
                                onVit={(v) => upd(l.c, t.n, (s) => ({ ...s, vit: v }))}
                                onMot={(m) => upd(l.c, t.n, (s) => ({ ...s, mot: m }))}
                                onTai={(z) => upd(l.c, t.n, (s) => ({ ...s, tai: z }))}
                                /* Une option qui désigne un poste (`induit`) en ajoute le prix à
                                   CETTE ligne — rien à cocher ailleurs. La première version posait
                                   une ligne séparée dans son vrai lot ; comptablement exact, mais
                                   choisir « à galandage » ne changeait alors rien au prix de la
                                   baie, donc rien de visible là où on clique. */
                                onVar={(g, o) => upd(l.c, t.n, (s) => ({ ...s, vsel: { ...(s.vsel || {}), [g]: o } }))}
                                onNote={(v) => upd(l.c, t.n, (s) => ({ ...s, note: v }))}
                                onPu={(v) => upd(l.c, t.n, lignePrix(v))}
                                onPm={(v) => upd(l.c, t.n, ligneMateriaux(v))}
                              />
                            ))}
                            {canCustom && (
                              <CustomLines lines={cLines} onAdd={() => addCustom(l.c)} onUpd={updCustom} onDel={delCustom} tvas={(courant) => tauxPersoPossibles(ctx, courant)} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button className="resetbtn" onClick={reset}>↺ Tout réinitialiser</button>
            </div>
          </div>
        )}

        {view === "devis" && <DevisView ctx={ctxR} sel={sel} custom={custom} />}
      </div>

      {/* Barre live sticky */}
      <div className={"av-estim-live" + (budget > 0 ? "" : " nobudget")}>
        <div className="live-in">
          <div className="totb">
            <div className="lbl">Total estimé</div>
            <div className="big"><CountUp value={tot.ttc} /><small>€ TTC</small></div>
          </div>
          <div className="jauge">
            <div className="jtext">
              {budget > 0
                ? <>Budget max {fmt(budget)} · {over ? <b style={{ color: "#fca5a5" }}>dépassé de {fmt(tot.ttc - budget)}</b> : <>reste {fmt(budget - tot.ttc)}</>}</>
                : "Budget max non défini"}
            </div>
            <div className="jbar"><div className={"jfill" + (over ? " over" : "")} style={{ width: pct + "%" }} /></div>
          </div>
          <button className="cta" onClick={() => { setView(view === "devis" ? "saisie" : "devis"); window.scrollTo(0, 0); }}>
            {view === "devis" ? "← Modifier" : "Voir mon devis →"}
          </button>
          <button className="save" onClick={enregistrer} disabled={saving}>
            {saving ? "Enregistrement…" : edition ? "Enregistrer les modifs" : "Enregistrer le projet"}
          </button>
          {erreur && <div className="err">{erreur}</div>}
        </div>
      </div>
    </>
  );
}

// Cartes de finition (mêmes que le mode rapide) : objectif + description.
const FINIS: { v: Finition; lvl: number; eye: string; label: string; desc: string }[] = [
  { v: "eco", lvl: 1, eye: "Locatif · budget maîtrisé", label: "Éco", desc: "Entrée de gamme robuste : stratifié, carrelage standard, cuisine en kit." },
  { v: "standard", lvl: 2, eye: "Le plus courant", label: "Standard", desc: "Bon rapport qualité-prix, marques milieu de gamme, finitions soignées." },
  { v: "premium", lvl: 3, eye: "Haut de gamme", label: "Premium", desc: "Matériaux nobles : parquet, grand format, cuisine équipée haut de gamme." },
];

export function DevisView({ ctx, sel, custom = [] }: { ctx: Ctx; sel: Selection; custom?: CustomLine[] }) {
  const dv = useMemo(() => buildDevis(CATALOG, ctx, sel), [ctx, sel]);
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  // Le total du projet, lignes perso comprises : le même calcul partout (`totauxAvecPerso`, D8).
  const t = totauxAvecPerso(t0, custom, ctx.aleas);
  const cu = customTotals(custom);
  const persoTtc = cu.ht + cu.tva;
  const max = Math.max(1, ...lots.map((x) => x.ttc), persoTtc);

  return (
    <div>
      <div className="hero">
        <span className="glow g1" /><span className="glow g2" />
        <div className="eb"><span className="dot" />Votre estimation · rénovation</div>
        <div className="tt"><CountUp value={t.ttc} /><small>€ TTC</small></div>
        <div className="brk">
          <div className="pill"><span className="k">Travaux HT</span><br /><span className="v num">{fmt(t.ht)}</span></div>
          <div className="pill"><span className="k">TVA {ctx.fiscal === "pro" ? "20 %" : "10 / 5,5 %"}</span><br /><span className="v num">{fmt(t.tva)}</span></div>
          <div className="pill"><span className="k">Aléas {ctx.aleas} %</span><br /><span className="v num">{fmt(t.aleas)}</span></div>
          <div className="pill"><span className="k">Budget max</span><br /><span className="v num">{fmt(ctx.budget)}</span></div>
        </div>
        <div className="tvahint">{ctx.fiscal === "pro"
          ? "TVA 20 % — neuf, logement de −2 ans ou local professionnel."
          : "TVA réduite 10 % (5,5 % sur la rénovation énergétique) — logement de +2 ans. Matériaux achetés seul (« Je le fais ») à 20 %."}</div>
      </div>

      <div className="card">
        <h2>Le bilan de vos choix <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>(HT)</span></h2>
        <div className="sub">Ce que vous payez, et ce que vous économisez en faisant vous-même</div>
        <div className="bilan">
          <div className="btile pre"><div className="k">👷 Payé aux artisans (fourni-posé)</div><div className="v num">{fmt(b.paye)}</div><div className="sub2">dont matériaux {fmt(b.matA)} · pose {fmt(b.moA)}</div></div>
          <div className="btile mat"><div className="k">🛒 Acheté / loué par vous</div><div className="v num">{fmt(b.achat)}</div></div>
          <div className="btile eco"><div className="k">💪 Économie en faisant vous-même</div><div className="v num">{b.eco > 0 ? "+ " + fmt(b.eco) : "0 €"}</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Répartition par phase & lot</h2>
        <div className="sub">Montants TTC — où part votre budget</div>
        {!lots.length && !persoTtc ? <div className="empty">Aucun travaux sélectionné. Retournez à « Ma saisie ».</div> : (
          PHASES.map((ph) => {
            const pl = lots.filter((x) => x.phase === ph).sort((a, c) => c.ttc - a.ttc);
            if (!pl.length) return null;
            return (
              <div key={ph}>
                <div className="phase-t">{ph}</div>
                {pl.map((x) => (
                  <div key={x.corps} className="devlot">
                    <span>{ICON[x.corps] || ""} {x.corps}</span>
                    <span className="track"><span className="fill" style={{ width: (x.ttc / max) * 100 + "%" }} /></span>
                    <span className="v">{fmt(x.ttc)}</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
        {persoTtc > 0 && (
          <div className="devlot">
            <span>Lignes personnalisées</span>
            <span className="track"><span className="fill" style={{ width: (persoTtc / max) * 100 + "%" }} /></span>
            <span className="v">{fmt(persoTtc)}</span>
          </div>
        )}
      </div>

      {!!lignes.length && (
        <div className="card">
          <h2>Détail des travaux</h2>
          <div className="sub">Votre sélection, ligne par ligne</div>
          {lignes.map((li, idx) => (
            <div key={idx} className="dtl">
              <span>{li.nom}</span>
              <span className="q">{li.unite === "forfait" ? "—" : li.qty + " " + (li.mode === "location" ? "j" : li.unite)}</span>
              <span className={"mode " + (li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA")}>
                {li.mode === "location" ? "location" : li.mode === "je-fais" ? "je fais" : "fait faire"}
              </span>
              <span className="m">{fmt(li.ttc)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="foot">
        Estimation indicative AVYORA — prix moyens marché 2026, finition {ctx.finition}. TVA réelle par poste
        (énergie 5,5 %, travaux fourni-posé 10 %, études & achats « Je le fais » 20 %). Hors aides. Demandez 2-3 devis pour affiner.
      </div>
    </div>
  );
}
