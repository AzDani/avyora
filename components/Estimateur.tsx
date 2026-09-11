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
import {
  CATALOG, PHASES, finCoef, ICON, LOC, defaultCtx, key, isLoc, visible, visibleTask,
  nbFen, nbPieces, deriveSol, autoQty, isAuto, qtyOf, effRate, lineHT, lotHT, effPrices,
  totals, buildDevis, regionCoef, piecesEff, sdbEff, customLotHT, customTotals,
  type Ctx, type Selection, type TypeBien, type Finition, type Lot, type Tache, type CustomLine,
} from "@/lib/estimateur";

const DRAFT_KEY = "avyora-estim-v2";              // brouillon partagé (mode rapide) — sert de graine « infos du bien »
const DRAFT_KEY_DETAIL = "avyora-estim-detail-v1"; // brouillon PROPRE au détaillé : ne récupère PAS les postes cochés du rapide
const fmt = (n: number): string => Math.round(n).toLocaleString("fr-FR") + " €";

type Persisted = { v?: string; ctx?: Partial<Ctx>; sel?: Selection; open?: Record<string, boolean>; codePostal?: string; statuts?: Record<string, number>; custom?: CustomLine[] };

/** Compteur animé (count-up, easeOutCubic) — repart de 0 à chaque montage. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Math.round(value || 0);
    const start = prev.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hidden = typeof document !== "undefined" && document.hidden; // rAF gelé en arrière-plan → set direct
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduce || hidden || start === target) { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; return; }
    const dur = Math.min(900, 320 + Math.abs(target - start) / 180);
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * e).toLocaleString("fr-FR");
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span ref={ref}>0</span>;
}

export default function Estimateur({ initialState, projectId }: { initialState?: Record<string, unknown>; projectId?: string } = {}) {
  const router = useRouter();
  const edition = !!projectId;

  const [ctx, setCtx] = useState<Ctx>(defaultCtx);
  const [sel, setSel] = useState<Selection>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [codePostal, setCodePostal] = useState("");
  const [view, setView] = useState<"saisie" | "devis">("saisie");
  const [custom, setCustom] = useState<CustomLine[]>([]);
  const addCustom = (lot: string) => setCustom((p) => [...p, { id: (crypto.randomUUID?.() ?? String(Date.now() + Math.random())), lot, nom: "", prix: 0, unite: "u", qte: 1, note: "", tva: 10, on: true, draft: true }]);
  const updCustom = (id: string, patch: Partial<CustomLine>) => setCustom((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delCustom = (id: string) => setCustom((p) => p.filter((x) => x.id !== id));
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const hydrated = useRef(false);
  const statutsRef = useRef<Record<string, number> | undefined>(undefined); // suivi de chantier à préserver en modif

  // Hydratation initiale : édition (initialState) prioritaire, sinon brouillon local.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const load = (d: Persisted | null) => {
      if (!d) return false;
      if (d.ctx) setCtx({ ...defaultCtx(), ...d.ctx });
      if (d.sel) setSel(d.sel);
      if (d.open) setOpen(d.open);
      if (d.codePostal) setCodePostal(d.codePostal);
      if (d.custom) setCustom(d.custom);
      return true;
    };
    if (initialState && (initialState as Persisted).v === "estimateur") { statutsRef.current = (initialState as Persisted).statuts; load(initialState as Persisted); return; }
    // Détaillé : on reprend d'abord MA progression (brouillon propre) si elle existe…
    try { if (load(JSON.parse(localStorage.getItem(DRAFT_KEY_DETAIL) || "null"))) return; } catch { /* noop */ }
    // …sinon nouveau projet : on démarre VIERGE (rien coché) en récupérant seulement les infos du bien
    // depuis une éventuelle estimation rapide (ctx + code postal), jamais les postes cochés.
    try {
      const seed = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as Persisted | null;
      if (seed?.ctx) setCtx({ ...defaultCtx(), ...seed.ctx });
      if (seed?.codePostal) setCodePostal(seed.codePostal);
    } catch { /* noop */ }
  }, [initialState]);

  // Sauvegarde brouillon local.
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(DRAFT_KEY_DETAIL, JSON.stringify({ v: "estimateur", ctx, sel, open, codePostal, custom })); } catch { /* noop */ }
  }, [ctx, sel, open, codePostal, custom]);

  // ctx effectif = ctx + code postal → le moteur applique le coefficient régional (MO).
  const ctxR = useMemo(() => ({ ...ctx, codePostal }), [ctx, codePostal]);
  const tot = useMemo(() => totals(CATALOG, ctxR, sel), [ctxR, sel]);
  const reg = regionCoef(codePostal);

  // ── Mises à jour du contexte ──────────────────────────────────────────────
  function patchCtx(p: Partial<Ctx>) { setCtx((c) => ({ ...c, ...p })); }
  function onNum(field: keyof Ctx, raw: string) {
    const val = parseFloat(raw) || 0;
    setCtx((c) => {
      const next = { ...c, [field]: val } as Ctx;
      if ((field === "surface" || field === "niveaux") && !next.surfaceSolManual) next.surfaceSol = deriveSol(next);
      return next;
    });
  }
  function onSol(raw: string) { patchCtx({ surfaceSol: parseFloat(raw) || 0, surfaceSolManual: true }); }
  function onType(t: TypeBien) { patchCtx({ type: t, pieces: nbPieces(t), fenetres: nbFen(t) }); }
  // Compteur simple d'un champ de ctx (niveaux, sdb, wc, fenetres).
  function stepCtx(field: keyof Ctx, delta: number, min: number) { patchCtx({ [field]: Math.max(min, ((ctx[field] as number) || 0) + delta) } as Partial<Ctx>); }
  // Compteurs du détail des pièces : on matérialise tout le détail puis on applique le delta.
  const BD_KEYS = ["sejour", "cuisine", "chambres", "suites", "couloir", "buanderie"] as const;
  const BD_DEF: Record<string, number> = { sejour: 1, cuisine: 1, chambres: 3, suites: 0, couloir: 1, buanderie: 0 };
  const bd = (f: (typeof BD_KEYS)[number]) => (ctx[f] as number | undefined) ?? BD_DEF[f];
  function stepBd(f: (typeof BD_KEYS)[number], delta: number, min: number) {
    const cur: Record<string, number> = {};
    for (const k of BD_KEYS) cur[k] = (ctx[k] as number | undefined) ?? BD_DEF[k];
    cur[f] = Math.max(min, cur[f] + delta);
    patchCtx(cur as Partial<Ctx>);
  }

  // ── Mises à jour de la sélection ──────────────────────────────────────────
  function upd(c: string, n: string, patch: (s: Selection[string]) => Selection[string]) {
    setSel((prev) => { const k = key(c, n); return { ...prev, [k]: patch(prev[k] || {}) }; });
  }
  function toggleCheck(l: Lot, t: Tache) {
    upd(l.c, t.n, (s) => {
      const on = !s.on;
      const next = { ...s, on };
      if (on && isLoc(l.c) && next.qty == null) next.qty = 1;
      return next;
    });
  }
  function toggleAuto(l: Lot, t: Tache) {
    upd(l.c, t.n, (s) => {
      const manual = !s.manual;
      const next = { ...s, manual };
      if (manual && next.qty == null) next.qty = autoQty(ctx, l.c, t.n, sel) ?? 0;
      return next;
    });
  }
  function reset() {
    try { localStorage.removeItem(DRAFT_KEY_DETAIL); } catch { /* noop */ }
    setCtx(defaultCtx()); setSel({}); setOpen({}); setCodePostal(""); setCustom([]); setView("saisie");
  }

  // ── Sauvegarde projet ─────────────────────────────────────────────────────
  async function enregistrer() {
    setErreur(null);
    if (!/^\d{5}$/.test(codePostal)) { setErreur("Renseignez un code postal (5 chiffres) dans « Votre projet »."); setView("saisie"); return; }
    if (!(ctx.surface > 0)) { setErreur("Renseignez la surface habitable."); setView("saisie"); return; }
    setSaving(true);
    const nom = `Rénovation — ${ctx.type} ${ctx.surface} m²`.slice(0, 110);
    const reponses = { v: "estimateur", ctx: ctxR, sel, codePostal, custom, ...(statutsRef.current ? { statuts: statutsRef.current } : {}) };
    try {
      const res = await fetch(edition ? `/api/projects/${projectId}` : "/api/projects", {
        method: edition ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, typeBien: ctx.type, surface: ctx.surface, codePostal, reponses }),
      });
      if (res.status === 401) { try { localStorage.setItem("avyora-estim-claim", "1"); } catch { /* noop */ } router.push("/inscription"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || "Enregistrement impossible."); setSaving(false); return; }
      if (!edition) { try { localStorage.removeItem(DRAFT_KEY_DETAIL); localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } }
      router.push(edition ? `/projets/${projectId}` : `/projets/${data.id}`);
    } catch { setErreur("Réseau indisponible. Réessayez."); setSaving(false); }
  }

  // ── Récap du bien ─────────────────────────────────────────────────────────
  const appart = ctx.type !== "Maison";
  const pTot = piecesEff(ctx), sdbTot = sdbEff(ctx);
  const SS = ctx.surfaceSol || ctx.surface;
  const facade = Math.round(4 * Math.sqrt(SS) * ctx.hauteur * (ctx.niveaux || 1) * 1.25);
  const roof = Math.round(SS * 1.4);
  const etage = Math.max(0, ctx.surface - SS);

  const budget = ctx.budget;
  const over = budget > 0 && tot.ttc > budget;
  const pct = budget > 0 ? Math.min(100, (tot.ttc / budget) * 100) : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EST_CSS }} />
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
              <div className="gl">Type de bien</div>
              <div className="tpills">
                {(["Studio", "T2", "T3", "T4", "Maison"] as TypeBien[]).map((t) => (
                  <button key={t} type="button" className={"tpill" + (ctx.type === t ? " on" : "")} onClick={() => onType(t)}>{t}</button>
                ))}
              </div>

              <div className="gl">Surfaces</div>
              <div className="depart">
                <Field label="Surface habitable" hint="Tous les niveaux additionnés — là où tu vis. Si tu crées un étage, ajoute sa surface ici.">
                  <NumStepper field value={ctx.surface} min={1} unit="m²" onChange={(n) => onNum("surface", String(n))} />
                </Field>
                {!appart && (
                  <Field label="Surface au sol" hint="Empreinte du bâtiment au sol, calculée pour toi (habitable ÷ niveaux). Sert à la toiture et aux fondations — ajuste seulement si besoin.">
                    <NumStepper field value={ctx.surfaceSol} min={1} unit="m²" onChange={(n) => onSol(String(n))} />
                  </Field>
                )}
                <Field label="Hauteur sous plafond"><NumStepper field value={ctx.hauteur} min={2} step={0.1} unit="m" onChange={(n) => onNum("hauteur", String(n))} /></Field>
                <Field label="Code postal"><div className="uinp"><input inputMode="numeric" maxLength={5} placeholder="33000" value={codePostal} onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, "").slice(0, 5))} /></div></Field>
              </div>

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
                🏠 <b>{appart ? "Appartement" : "Maison"}</b> · {ctx.surface} m² habitables · <b>{ctx.niveaux} niveau{ctx.niveaux > 1 ? "x" : ""}</b> · emprise au sol ~{SS} m² · plafond {ctx.hauteur} m
                {!appart && <> → murs extérieurs ≈ <b>{facade} m²</b> · toiture ≈ <b>{roof} m²</b></>}
                {etage > 0 && <span style={{ color: "var(--faint)" }}> (dont ~{etage} m² à l’étage)</span>}
                <div style={{ marginTop: 6 }}>
                  → <b>{pTot} pièce{pTot > 1 ? "s" : ""}</b> au total · <b>{sdbTot} salle{sdbTot > 1 ? "s" : ""} de bain</b>
                  {(ctx.suites ?? 0) > 0 && <> (dont {ctx.suites} en suite)</>} · {ctx.fenetres} menuiseries ext.
                </div>
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
              Ouvrez les lots concernés, cochez les travaux, ajustez les quantités. Prix affichés <b>HT</b>. Pour chaque travail, choisissez <b>« Fait faire »</b> (artisan) ou <b>« Je le fais »</b> — les 2 prix s’affichent.
            </div>

            {PHASES.map((ph, i) => {
              const lots = CATALOG.filter((l) => l.p === ph && visible(ctx, l));
              if (!lots.length) return null;
              return (
                <div key={ph}>
                  <div className="phase-t">{i + 1} · {ph}</div>
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
                          <span className="nm">{l.c}</span>
                          {cnt > 0 && <span className="cnt">{cnt}</span>}
                          <span className="amt num">{cnt > 0 ? fmt(lotHT(ctx, sel, l) + customLotHT(custom, l.c)) + " HT" : ""}</span>
                          <span className="car">›</span>
                        </div>
                        {isOpen && (
                          <div className="acc-b">
                            {loc && <div className="locnote">Prix indicatifs <b>/jour</b> — à confirmer auprès du loueur. Indiquez le nombre de jours.</div>}
                            {l.t.filter((t) => visibleTask(ctx, t)).map((t) => (
                              <Row key={t.n} l={l} t={t} ctx={ctxR} sel={sel} coef={finCoef(ctx, l.c)} loc={loc}
                                onCheck={() => toggleCheck(l, t)}
                                onChoice={(self) => upd(l.c, t.n, (s) => ({ ...s, self }))}
                                onAuto={() => toggleAuto(l, t)}
                                onQty={(v) => upd(l.c, t.n, (s) => ({ ...s, qty: v, manual: isAuto(ctx, l.c, t.n) ? true : s.manual }))}
                                onMat={(m) => upd(l.c, t.n, (s) => ({ ...s, mat: m }))}
                                onVit={(v) => upd(l.c, t.n, (s) => ({ ...s, vit: v }))}
                                onMot={(m) => upd(l.c, t.n, (s) => ({ ...s, mot: m }))}
                                onTai={(z) => upd(l.c, t.n, (s) => ({ ...s, tai: z }))}
                                onVar={(g, o) => upd(l.c, t.n, (s) => ({ ...s, vsel: { ...(s.vsel || {}), [g]: o } }))}
                                onNote={(v) => upd(l.c, t.n, (s) => ({ ...s, note: v }))}
                                onPu={(v) => upd(l.c, t.n, (s) => { const n = { ...s }; if (v == null) delete n.pu; else n.pu = v; return n; })}
                                onPm={(v) => upd(l.c, t.n, (s) => { const n = { ...s }; if (v == null) delete n.pm; else { n.pm = v; delete n.pu; } return n; })}
                              />
                            ))}
                            {canCustom && (
                              <CustomLines lines={cLines} onAdd={() => addCustom(l.c)} onUpd={updCustom} onDel={delCustom} />
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
      <div className="av-estim-live">
        <div className="live-in">
          <div>
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

// ── Sous-composants ───────────────────────────────────────────────────────────
/** Prix « Fait faire » / « Je le fais » : clic = choisir le mode, double-clic sur le montant = éditer son prix, ↺ = reset. */
function ChoicePrice({ label, active, activeCls, amount, edited, onSelect, onEdit, onReset }: {
  label: string; active: boolean; activeCls: string; amount: number | null; edited: boolean;
  onSelect: () => void; onEdit: (v: number) => void; onReset: () => void;
}) {
  const [ed, setEd] = useState(false);
  return (
    <span
      className={"ch" + (active ? " " + activeCls : "") + (edited ? " edited" : "")}
      role="button" tabIndex={0}
      onClick={() => { if (!ed) onSelect(); }}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !ed) { e.preventDefault(); onSelect(); } }}
    >
      {label}
      {ed ? (
        <input
          className="chin" type="number" inputMode="decimal" autoFocus
          defaultValue={amount != null ? Math.round(amount) : 0}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => { const v = parseFloat(e.currentTarget.value); setEd(false); if (!Number.isNaN(v) && v > 0) onEdit(v); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEd(false); }}
        />
      ) : (
        <b onDoubleClick={(e) => { e.stopPropagation(); setEd(true); }} title="Double-clique pour mettre ton prix">{amount != null ? fmt(amount) : "—"}</b>
      )}
      {edited && !ed && <span className="chreset" role="button" title="Prix AVYORA par défaut" onClick={(e) => { e.stopPropagation(); onReset(); }}>↺</span>}
    </span>
  );
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fld">
      <label>{label}</label>
      {children}
      {hint && <div style={{ fontSize: "11.5px", color: "var(--faint)", lineHeight: 1.45, marginTop: "6px" }}>{hint}</div>}
    </div>
  );
}

// Cartes de finition (mêmes que le mode rapide) : objectif + description.
const FINIS: { v: Finition; lvl: number; eye: string; label: string; desc: string }[] = [
  { v: "eco", lvl: 1, eye: "Locatif · budget maîtrisé", label: "Éco", desc: "Entrée de gamme robuste : stratifié, carrelage standard, cuisine en kit." },
  { v: "standard", lvl: 2, eye: "Le plus courant", label: "Standard", desc: "Bon rapport qualité-prix, marques milieu de gamme, finitions soignées." },
  { v: "premium", lvl: 3, eye: "Haut de gamme", label: "Premium", desc: "Matériaux nobles : parquet, grand format, cuisine équipée haut de gamme." },
];

function Stepper({ label, hint, value, onStep }: { label: string; hint?: string; value: number; onStep: (d: number) => void }) {
  return (
    <div className="stp">
      <span className="l">{label}{hint && <small>{hint}</small>}</span>
      <span className="c">
        <button type="button" aria-label="moins" onClick={() => onStep(-1)}>−</button>
        <span className="v num">{value}</span>
        <button type="button" aria-label="plus" onClick={() => onStep(1)}>+</button>
      </span>
    </div>
  );
}

function Row({ l, t, ctx, sel, coef, loc, onCheck, onChoice, onAuto, onQty, onMat, onVit, onMot, onTai, onVar, onNote, onPu, onPm }: {
  l: Lot; t: Tache; ctx: Ctx; sel: Selection; coef: number; loc: boolean;
  onCheck: () => void; onChoice: (self: boolean) => void; onAuto: () => void; onQty: (v: number) => void;
  onMat: (m: "pvc" | "alu") => void; onVit: (v: "double" | "triple") => void; onMot: (m: "manuel" | "motorise") => void; onTai: (z: "petit" | "grand") => void; onVar: (g: string, o: string) => void; onNote: (v: string) => void; onPu: (v: number | null) => void; onPm: (v: number | null) => void;
}) {
  const s = sel[key(l.c, t.n)] || {};
  const on = !!s.on, self = !!s.self;
  const [noteOpen, setNoteOpen] = useState<boolean>(false);
  const [puEdit, setPuEdit] = useState<boolean>(false);
  const variant = !!(t.mat || t.vitrage || t.moto || t.taille || (t.vars && t.vars.length));
  const fcoef = (t.fixe || variant) ? 1 : coef;
  const ep = effPrices(t, s, ctx);
  const matSel = s.mat || t.matDef || (ctx.finition === "premium" ? "alu" : "pvc");
  const vitSel = s.vit || "double";
  const motSel = s.mot || "motorise";
  const taiSel = s.tai || "grand";
  // Finition sur MATÉRIAUX uniquement ; MO fixe. Prix unitaires indicatifs (hors coef régional).
  const puMatBase = ep.sm != null ? ep.sm * fcoef : null;                                 // matériaux × finition
  const puvBase = ep.fp != null ? (ep.sm != null ? ep.sm * fcoef + (ep.fp - ep.sm) : ep.fp) : null; // fait-faire = matériaux + MO
  const moUnit = ep.fp != null && ep.sm != null ? ep.fp - ep.sm : 0;                       // MO unitaire (pour l'affichage lié)
  const pmEdited = s.pm != null;
  const puMat = pmEdited ? s.pm! : puMatBase;                                              // « Je le fais » (matériaux)
  const puEdited = s.pu != null;
  const puv = puEdited ? s.pu!                                                             // total figé (devis)
    : pmEdited && puMatBase != null ? s.pm! + moUnit                                       // matériaux perso + MO
    : puvBase;                                                                             // calcul normal
  const uSuffix = " HT" + (t.u !== "forfait" && t.u !== "u" ? "/" + t.u : "");
  const au = isAuto(ctx, l.c, t.n);
  const autoVal = au ? autoQty(ctx, l.c, t.n, sel) ?? 0 : 0;

  return (
    <div className="trow">
      <button className={"cbx" + (on ? " on" : "")} onClick={onCheck} aria-label={on ? "Décocher" : "Cocher"} />
      <span className="tn">{t.n}
        <span className={"pu" + (puEdited ? " edited" : "")}>
          {puv == null ? "prix sur devis" : puEdit ? (
            <input
              className="puin" type="number" inputMode="decimal" autoFocus defaultValue={Math.round(puv)}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { const v = parseFloat(e.currentTarget.value); setPuEdit(false); if (!Number.isNaN(v) && v > 0) onPu(v); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setPuEdit(false); }}
            />
          ) : (
            <>
              <span className="puval" title="Double-clique pour ajuster à ton prix" onDoubleClick={() => setPuEdit(true)}>{fmt(puv) + uSuffix}</span>
              {puEdited && <span className="pubadge">perso</span>}
              {puEdited && <button type="button" className="pureset" title="Rétablir le prix AVYORA par défaut" onClick={() => onPu(null)}>↺</button>}
            </>
          )}
          {t.note && !puEdit && <span className="punote"> · {t.note}</span>}
        </span>
      </span>
      {on ? (
        <span className="tctl">
          {t.u !== "forfait" && (au ? (
            <>
              {s.manual
                ? <NumStepper compact value={s.qty != null ? s.qty : autoVal} min={0} onChange={onQty} />
                : <span className="qauto num" title="calculé automatiquement depuis vos infos de départ">{autoVal}</span>}
              <span className="unit">{t.u}</span>
              <span className="swiwrap">
                <button className={"swi" + (!s.manual ? " on" : "")} onClick={onAuto} title="Auto = quantité calculée. Désactivez pour saisir à la main."><span className="knob" /></button>
                <span className={"swilbl" + (!s.manual ? " on" : "")}>{!s.manual ? "auto" : "manuel"}</span>
              </span>
            </>
          ) : (
            <>
              <NumStepper compact value={s.qty != null ? s.qty : (loc ? 1 : 0)} min={0} onChange={onQty} />
              <span className="unit">{loc ? "j" : t.u}</span>
            </>
          ))}
          {!loc && (
            <span className="choice">
              <ChoicePrice label="Fait faire" active={!self} activeCls="onA" amount={puv} edited={puEdited}
                onSelect={() => onChoice(false)} onEdit={(v) => onPu(v)} onReset={() => onPu(null)} />
              {puMatBase != null && (
                <ChoicePrice label="Je le fais" active={self} activeCls="onS" amount={puMat} edited={pmEdited}
                  onSelect={() => onChoice(true)} onEdit={(v) => onPm(v)} onReset={() => onPm(null)} />
              )}
            </span>
          )}
          {s.note && !noteOpen && isUrl(s.note) && <a className="notechip" href={s.note} target="_blank" rel="noopener noreferrer" title={s.note}>🔗</a>}
          <button type="button" className={"notebtn" + (s.note ? " has" : "")} onClick={() => setNoteOpen((o) => !o)} title={s.note ? "Voir / modifier la note" : "Ajouter une note / un lien"}>📝</button>
          <span className="lineamt num">{fmt(lineHT(ctx, sel, l, t))}</span>
        </span>
      ) : (
        <span className="tctl"><span className="unit">{t.u === "forfait" ? "forfait" : loc ? "/jour" : t.u}</span></span>
      )}
      {on && variant && (
        <div className="tvariants">
          {t.mat && (
            <span className="vg"><span className="vlab">Matériau</span>
              <span className="vseg">
                <button type="button" className={matSel === "pvc" ? "on" : ""} onClick={() => onMat("pvc")}>PVC</button>
                <button type="button" className={matSel === "alu" ? "on" : ""} onClick={() => onMat("alu")}>Alu</button>
              </span>
            </span>
          )}
          {t.vitrage && (
            <span className="vg"><span className="vlab">Vitrage</span>
              <span className="vseg">
                <button type="button" className={vitSel === "double" ? "on" : ""} onClick={() => onVit("double")}>Double</button>
                <button type="button" className={vitSel === "triple" ? "on" : ""} onClick={() => onVit("triple")}>Triple</button>
              </span>
            </span>
          )}
          {t.moto && (
            <span className="vg"><span className="vlab">Motorisation</span>
              <span className="vseg">
                <button type="button" className={motSel === "manuel" ? "on" : ""} onClick={() => onMot("manuel")}>Manuel</button>
                <button type="button" className={motSel === "motorise" ? "on" : ""} onClick={() => onMot("motorise")}>Motorisé</button>
              </span>
            </span>
          )}
          {t.taille && (
            <span className="vg"><span className="vlab">Taille</span>
              <span className="vseg">
                <button type="button" className={taiSel === "petit" ? "on" : ""} onClick={() => onTai("petit")}>Petit</button>
                <button type="button" className={taiSel === "grand" ? "on" : ""} onClick={() => onTai("grand")}>Grand</button>
              </span>
            </span>
          )}
          {t.vars && t.vars.map((g) => {
            const cur = (s.vsel && s.vsel[g.k]) || g.opts[0].k;
            return (
              <span className="vg" key={g.k}><span className="vlab">{g.label}</span>
                <span className="vseg">
                  {g.opts.map((o) => (
                    <button type="button" key={o.k} className={cur === o.k ? "on" : ""} onClick={() => onVar(g.k, o.k)}>{o.label}</button>
                  ))}
                </span>
              </span>
            );
          })}
        </div>
      )}
      {on && noteOpen && (
        <div className="tnote">
          <span className="cl-lk">🔗</span>
          <input className="cl-note" autoFocus placeholder="Note ou lien matériau (https://…)" value={s.note || ""} onChange={(e) => onNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setNoteOpen(false); }} />
          {isUrl(s.note) && <a className="cl-open" href={s.note} target="_blank" rel="noopener noreferrer">Ouvrir ↗</a>}
          <button type="button" className="notedone" onClick={() => setNoteOpen(false)} title="OK">✓</button>
        </div>
      )}
    </div>
  );
}

const isUrl = (s?: string) => /^https?:\/\//i.test((s || "").trim());
const CL_UNITS = ["m²", "ml", "u", "forfait", "jour", "m³", "tonne"];
function CustomLines({ lines, onAdd, onUpd, onDel }: { lines: CustomLine[]; onAdd: () => void; onUpd: (id: string, patch: Partial<CustomLine>) => void; onDel: (id: string) => void }) {
  const [guide, setGuide] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const askDel = (id: string) => { setConfirmDel(id); setTimeout(() => setConfirmDel((c) => (c === id ? null : c)), 3000); };
  return (
    <div className="clwrap">
      {lines.map((l) => {
        const on = l.on !== false;
        // ── Tâche validée : rendu identique aux postes standards ──
        if (!l.draft) return (
          <div className="trow" key={l.id}>
            <button type="button" className={"cbx" + (on ? " on" : "")} onClick={() => onUpd(l.id, { on: !on })} aria-label={on ? "Décocher" : "Cocher"} />
            <span className="tn">{l.nom || "Ligne personnalisée"}<span className="pu">{fmt(l.prix || 0)} HT/{l.unite}{isUrl(l.note) ? " · " : ""}{isUrl(l.note) && <a className="cl-open" href={l.note} target="_blank" rel="noopener noreferrer">lien ↗</a>}</span></span>
            <span className="tctl">
              <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
              <span className="unit">{l.unite}</span>
              <button type="button" className="cl-icon" onClick={() => onUpd(l.id, { draft: true })} title="Modifier">✎</button>
              {confirmDel === l.id
                ? <button type="button" className="cl-delconfirm" onClick={() => { onDel(l.id); setConfirmDel(null); }}>Supprimer ?</button>
                : <button type="button" className="cl-icon" onClick={() => askDel(l.id)} title="Supprimer">🗑</button>}
              <span className="lineamt num">{fmt((l.prix || 0) * (l.qte || 0))}</span>
            </span>
          </div>
        );
        // ── Édition (nouvelle ligne ou modification) ──
        return (
        <div className="cl" key={l.id}>
          <div className="clr">
            <span className="clbadge">Ligne perso</span>
            <input className="cl-nom" placeholder="Nom de la tâche…" value={l.nom} onChange={(e) => onUpd(l.id, { nom: e.target.value })} />
            <input className="cl-prix num" type="number" inputMode="decimal" value={l.prix || ""} placeholder="0" onChange={(e) => onUpd(l.id, { prix: parseFloat(e.target.value) || 0 })} title="prix HT" />
            <span className="cl-sep">€ /</span>
            <select className="cl-unite" value={l.unite} onChange={(e) => onUpd(l.id, { unite: e.target.value })}>{CL_UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            <span className="cl-sep">×</span>
            <NumStepper compact value={l.qte} min={0} onChange={(v) => onUpd(l.id, { qte: v })} />
            <span className="cl-total num">= {fmt((l.prix || 0) * (l.qte || 0))}</span>
          </div>
          <div className="clr">
            <span className="cl-lk">🔗</span>
            <input className="cl-note" placeholder="Note ou lien matériau (https://…)" value={l.note || ""} onChange={(e) => onUpd(l.id, { note: e.target.value })} />
            <label className="cl-tvalab">TVA <select value={String(l.tva)} onChange={(e) => onUpd(l.id, { tva: parseFloat(e.target.value) })}><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></label>
            <button type="button" className="cl-info" onClick={() => setGuide(guide === l.id ? null : l.id)} title="Guide TVA">i</button>
          </div>
          {guide === l.id && <div className="cl-guide"><b>Quelle TVA ?</b> · <b>5,5 %</b> réno énergétique · <b>10 %</b> amélioration logement +2 ans (standard) · <b>20 %</b> neuf, −2 ans, local pro ou matériaux seuls.</div>}
          <div className="clr cl-actions">
            <button type="button" className="cl-valider" onClick={() => onUpd(l.id, { draft: false, on: true })} disabled={!l.nom.trim() || !(l.prix > 0)}>✓ Valider la tâche</button>
            <button type="button" className="cl-cancel" onClick={() => onDel(l.id)}>Annuler</button>
          </div>
        </div>
        );
      })}
      <button type="button" className="cl-add" onClick={onAdd}>＋ Ajouter une ligne personnalisée</button>
    </div>
  );
}

function DevisView({ ctx, sel, custom = [] }: { ctx: Ctx; sel: Selection; custom?: CustomLine[] }) {
  const dv = useMemo(() => buildDevis(CATALOG, ctx, sel), [ctx, sel]);
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  const cu = customTotals(custom);
  const t = { ht: t0.ht + cu.ht, tva: t0.tva + cu.tva, aleas: t0.aleas + cu.ht * ((ctx.aleas || 0) / 100), get ttc() { return this.ht + this.tva + this.aleas; } };
  const max = lots.length ? Math.max(...lots.map((x) => x.ttc)) : 1;

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
        {!lots.length ? <div className="empty">Aucun travaux sélectionné. Retournez à « Ma saisie ».</div> : (
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
