"use client";

/**
 * Estimation rapide (< 3 min) : 4 questions → preset de lots → MÊME moteur que l'estimateur détaillé.
 * « Affiner » ouvre le détaillé pré-rempli (via le brouillon localStorage). « Enregistrer » crée le projet.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PIECES,
  CATALOG,
  buildDevis,
  presetRapide,
  presetPieces,
  AMPLEURS,
  regionCoef,
  type Ampleur,
  type QuiRealise,
  type TypeBien,
  type Finition,
  type PieceKey,
  type PieceSel,
} from "@/lib/estimateur";
import { suivre } from "@/lib/track";
import { conversionEstimation } from "@/lib/gtag";
import { useT, useLocale } from "@/components/i18n/LangProvider";
import Stepper from "@/components/Stepper";
import { CountUpNf as CountUp } from "@/components/estimateur/CountUp";
import { RAPIDE_CSS } from "@/components/estimateur/rapide-styles";
import type { SourceSeo } from "@/lib/seo-source";

type Mode = "bien" | "pieces";
// Pièces disponibles (mode « une ou plusieurs pièces ») : emoji, libellé, surface par défaut.
const ROOMS: { key: PieceKey; emoji: string; label: string; surf: number }[] = [
  { key: "cuisine", emoji: "🍳", label: "Cuisine", surf: 10 },
  { key: "sdb", emoji: "🚿", label: "Salle de bain", surf: 5 },
  { key: "chambre", emoji: "🛏️", label: "Chambre", surf: 12 },
  { key: "salon", emoji: "🛋️", label: "Salon / séjour", surf: 22 },
  { key: "suite", emoji: "🛁", label: "Suite parentale", surf: 20 },
  { key: "buanderie", emoji: "🧺", label: "Buanderie", surf: 6 },
];
const roomLabel = (k: PieceKey) => ROOMS.find((r) => r.key === k)!;
// Descriptions d'ampleur adaptées au mode « pièce » (traduites : voir t.piecesAmp dans le dictionnaire).

const DRAFT_KEY = "avyora-estim-v2";
// Ordre + niveau de jauge (le texte des cartes vient du dictionnaire i18n).
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

export type RapideEdit = { projectId: string; type?: TypeBien; surface?: number; cp?: string; ampleur?: Ampleur; finition?: Finition; qui?: QuiRealise };

/**
 * Contexte d'amorçage venu d'une page SEO (déjà validé côté serveur, cf. la page `rapide`).
 * `edit` reste réservé à la reprise d'un projet EXISTANT — les deux ne se mélangent pas.
 */
export type RapideInitial = { cp?: string; piece?: PieceKey; surface?: number; src?: SourceSeo };

export default function EstimateurRapide({
  isPro = false,
  edit,
  initial,
}: {
  isPro?: boolean;
  edit?: RapideEdit;
  initial?: RapideInitial;
}) {
  const router = useRouter();
  // Une pièce transmise par l'URL ouvre directement le mode « pièces » avec cette pièce
  // présélectionnée : le visiteur venait de lire une page sur cette pièce précise.
  const [mode, setMode] = useState<Mode>(!edit && initial?.piece ? "pieces" : "bien");
  const [type, setType] = useState<TypeBien>(edit?.type ?? "Maison");
  const [surface, setSurface] = useState(edit?.surface ?? 100);
  const [pieces, setPieces] = useState<PieceSel[]>(
    !edit && initial?.piece
      ? [{ room: initial.piece, surface: initial.surface ?? PIECES.find((x) => x.key === initial.piece)!.surfaceDefaut }]
      : [],
  );
  const [cp, setCp] = useState(edit?.cp ?? (!edit ? (initial?.cp ?? "") : ""));
  const [ampleur, setAmpleur] = useState<Ampleur>(edit?.ampleur ?? "complete");
  const [finition, setFinition] = useState<Finition>(edit?.finition ?? "standard");
  const [qui, setQui] = useState<QuiRealise>(edit?.qui ?? "pros");
  /**
   * L'utilisateur a-t-il RÉPONDU quelque chose ? Tant que non, l'estimateur n'affiche aucun chiffre
   * et ne déclenche aucune conversion.
   *
   * ⚠️ POURQUOI CE DRAPEAU EXISTE. Le formulaire s'ouvrait sur des valeurs par défaut (Maison,
   * 100 m², réno complète) qui rendaient l'estimation « valide » AVANT toute action. Deux
   * conséquences : le visiteur voyait le budget d'une maison que personne n'avait décrite, et la
   * conversion Google Ads « Estimation terminée » partait 1,8 s après le simple chargement de la
   * page. Elle mesurait donc « n'a pas fermé l'onglet », pas une intention — et une stratégie
   * d'enchères branchée dessus apprenait à acheter n'importe quel clic.
   *
   * Il n'est PAS mis par `initial` (contexte venu d'une page SEO) : cliquer un lien n'est pas
   * décrire son projet.
   */
  const [demarre, setDemarre] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const T = useT();
  const t = T.rapide;
  const locale = useLocale();
  const nf = locale === "en" ? "en-US" : "fr-FR";
  // Libellé d'ampleur traduit ("Réno totale" pour la lourde en appartement).
  const ampL = (v: Ampleur) => (v === "lourde" && type !== "Maison" ? t.ampleurs.lourdeAppart : t.ampleurs[v]);
  const ampCard = (v: Ampleur) => (mode === "pieces" ? t.piecesAmp[v] : ampL(v));
  const roomName = (k: PieceKey) => t.rooms[k] ?? roomLabel(k).label;

  const totalSurface = mode === "pieces"
    ? pieces.reduce((s, r) => s + (r.surface || 0), 0)
    : surface;

  // {ctx, sel} pour le mode courant, réglages éventuellement remplacés (aperçus des cartes 2-3-4).
  function buildSel(o: { ampleur?: Ampleur; finition?: Finition; qui?: QuiRealise } = {}) {
    const a = o.ampleur ?? ampleur, f = o.finition ?? finition, q = o.qui ?? qui;
    return mode === "pieces"
      ? presetPieces(pieces, a, f, q, cp)
      : presetRapide({ type, surface, codePostal: cp, ampleur: a, finition: f, qui: q });
  }

  const preset = useMemo(() => buildSel(), [mode, type, surface, cp, ampleur, finition, qui, pieces]);
  const tot = useMemo(() => buildDevis(CATALOG, preset.ctx, preset.sel).totaux, [preset]);
  // `demarre` d'abord : sans lui, les valeurs par défaut rendaient l'estimation valide au
  // chargement, donc affichaient un prix que personne n'avait demandé.
  const valid = demarre && (mode === "pieces" ? pieces.length > 0 && totalSurface > 0 : surface > 0);
  const lo = Math.round((tot.ttc * 0.85) / 100) * 100;
  const hi = Math.round((tot.ttc * 1.15) / 100) * 100;
  const m2 = valid && totalSurface > 0 ? Math.round(tot.ttc / totalSurface) : 0;

  // Conversion « Estimation terminée » : l'estimateur rapide affiche le prix EN DIRECT (pas de bouton « calculer »),
  // donc le moment de valeur = une fourchette valide restée stable ~1,8 s. On déclenche alors la conversion Google Ads
  // (dédupliquée par session dans conversionEstimation) + l'event Vercel. Une seule fois par visite (convFired).
  // Affiner / Enregistrer restent des signaux d'intention plus profonds (plus bas), déjà dédupliqués côté Google.
  const convFired = useRef(false);
  /**
   * Ce qui fait une estimation RÉELLE : une saisie valide, un total non nul, et un code postal —
   * c'est lui qui rend le chiffre propre au visiteur (ajustement régional) et qui signale une
   * intention. Sans lui, on compterait une personne qui a juste cliqué deux cartes.
   *
   * Une seule définition, désormais partagée. Le déclenchement automatique l'appliquait ;
   * `affiner()` ne l'appliquait PAS et envoyait la conversion Google Ads sans rien vérifier.
   * Deux portes vers le même compteur, dont une sans serrure.
   */
  const estimationReelle = valid && tot.ttc > 0 && /^\d{5}$/.test(cp);
  useEffect(() => {
    if (convFired.current || !estimationReelle) return;
    const id = window.setTimeout(() => {
      convFired.current = true;
      suivre("estimation_terminee", { action: "affichee", type: mode === "pieces" ? "pieces" : type, ampleur, src: initial?.src ?? "direct" });
      conversionEstimation();
    }, 1800);
    return () => window.clearTimeout(id);
  }, [estimationReelle, mode, type, ampleur]);
  const ampName = ampCard(ampleur).label.toLowerCase();

  const m2ByAmp = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of AMPLEURS) { const p = buildSel({ ampleur: a.v }); out[a.v] = totalSurface > 0 ? Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc / totalSurface) : 0; }
    return out;
  }, [mode, type, surface, cp, finition, qui, pieces]);
  const m2ByFin = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of ["eco", "standard", "premium"] as Finition[]) { const p = buildSel({ finition: f }); out[f] = totalSurface > 0 ? Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc / totalSurface) : 0; }
    return out;
  }, [mode, type, surface, cp, ampleur, qui, pieces]);
  const m2ByQui = useMemo(() => {
    const out: Record<string, number> = {};
    for (const q of ["pros", "partie", "max"] as QuiRealise[]) { const p = buildSel({ qui: q }); out[q] = totalSurface > 0 ? Math.round(buildDevis(CATALOG, p.ctx, p.sel).totaux.ttc / totalSurface) : 0; }
    return out;
  }, [mode, type, surface, cp, ampleur, finition, pieces]);

  const reg = regionCoef(cp);
  const regDelta = Math.round((reg.mo - 1) * 100);
  const zoneLbl = t.zones[reg.zone] ?? reg.zone;
  const regLabel = cp.length >= 2 ? `${zoneLbl}${regDelta ? ` · ${regDelta > 0 ? "+" : ""}${regDelta} ${t.moSuffix}` : ""}` : "";

  // ── Gestion des pièces (mode multi) ── chaque ajout = une LIGNE (instance) avec sa propre surface.
  const nbPieces = pieces.length;
  const nbTypes = new Set(pieces.map((r) => r.room)).size;
  // Assembler des pièces de TYPES DIFFÉRENTS (2+) = réservé au Pro (paywall doux). Plusieurs pièces
  // du même type (ex. 2 chambres) restent gratuites.
  const locked = mode === "pieces" && nbTypes >= 2 && !isPro;
  function ajouterPiece(k: PieceKey) {
    setMode("pieces");
    setPieces((prev) => [...prev, { room: k, surface: roomLabel(k).surf }]);
  }
  function retirerUne(k: PieceKey) {
    setPieces((prev) => {
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) if (prev[i].room === k) { idx = i; break; }
      return idx < 0 ? prev : prev.filter((_, i) => i !== idx);
    });
  }
  const setPieceSurf = (i: number, s: number) =>
    setPieces((prev) => prev.map((r, idx) => (idx === i ? { ...r, surface: s } : r)));
  const retirerPiece = (i: number) => setPieces((prev) => prev.filter((_, idx) => idx !== i));
  // Compteur d'instances par type (badge sur les tuiles) + ordinal d'affichage pour les doublons.
  const countByRoom = (k: PieceKey) => pieces.filter((r) => r.room === k).length;

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: "estimateur", mode: "rapide", ampleur, qui, ctx: preset.ctx, sel: preset.sel, open: {}, codePostal: cp })); } catch { /* noop */ }
  }
  function affiner() {
    // Le clic mène toujours à l'estimateur détaillé — mais on ne déclare une estimation terminée,
    // et surtout pas une conversion payante, que s'il y en a réellement eu une.
    if (estimationReelle) {
      suivre("estimation_terminee", { action: "affiner", type: mode === "pieces" ? "pieces" : type, ampleur, src: initial?.src ?? "direct" });
      conversionEstimation();
    }
    saveDraft();
    try { sessionStorage.setItem("avyora-affiner", "1"); } catch { /* noop */ }
    router.push("/projets/nouveau/detaille");
  }

  /** Libellé du projet (ex. « Rénovation — Chambre ×2 + Salle de bain » ou « Rénovation — Maison 100 m² »). */
  function nomProjet(): string {
    if (mode === "pieces") {
      const counts = new Map<PieceKey, number>();
      for (const r of pieces) counts.set(r.room, (counts.get(r.room) ?? 0) + 1);
      const parts = [...counts].map(([k, n]) => `${t.rooms[k] ?? roomLabel(k).label}${n > 1 ? ` ×${n}` : ""}`);
      return `${t.projetNom} — ${parts.join(" + ")}`.slice(0, 110);
    }
    const nomType = type === "Maison" ? t.typeMaison : t.typeAppart;
    return `${t.projetNom} — ${nomType} ${surface} m²`.slice(0, 110);
  }

  async function enregistrer() {
    setErreur(null);
    if (!/^\d{5}$/.test(cp)) { setErreur(t.errCp); return; }
    if (mode === "pieces" && pieces.length === 0) { setErreur(t.auMoinsUnePiece); return; }
    if (!valid) { setErreur(t.errSurface); return; }
    suivre("estimation_terminee", { action: "enregistrer", type: mode === "pieces" ? "pieces" : type, ampleur, src: initial?.src ?? "direct" });
    conversionEstimation();
    setSaving(true);
    const nom = nomProjet();
    const typeBien = (mode === "pieces" ? "Appartement" : type) as TypeBien;
    const reponses = { v: "estimateur", mode: "rapide", ampleur, qui, ctx: preset.ctx, sel: preset.sel, codePostal: cp };
    try {
      const res = await fetch(edit ? `/api/projects/${edit.projectId}` : "/api/projects", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, typeBien, surface: totalSurface, codePostal: cp, reponses }) });
      if (res.status === 401) { try { localStorage.setItem("avyora-estim-claim", "1"); } catch { /* noop */ } saveDraft(); router.push("/inscription"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || t.errSave); setSaving(false); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      router.push(`/projets/${edit ? edit.projectId : data.id}`);
    } catch { setErreur(t.errReseau); setSaving(false); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RAPIDE_CSS }} />
      <div className="av-rapide">
        <div className="q">
          <div className="qlbl"><span className="n">1</span>{t.step1q}</div>

          <div className="glbl">{t.bienEntier}</div>
          <div className="seg" style={{ marginBottom: 14 }}>
            {(["Maison", "Appartement"] as TypeBien[]).map((tb) => (
              <button key={tb} className={demarre && mode === "bien" && type === tb ? "on" : ""} onClick={() => { setDemarre(true); setMode("bien"); setType(tb); }}>{tb === "Maison" ? t.maison : t.appart}</button>
            ))}
          </div>

          <div className="glbl">{t.uneOuPlusieurs}</div>
          <div className="rgrid">
            {ROOMS.map((r) => {
              const n = countByRoom(r.key);
              return (
                <div key={r.key} className={"rcard" + (mode === "pieces" && n > 0 ? " on" : "")}>
                  <button type="button" className="rname" onClick={() => { setDemarre(true); ajouterPiece(r.key); }}>
                    <span className="rem">{r.emoji}</span> {roomName(r.key)}
                  </button>
                  <span className="rstep">
                    <button type="button" onClick={() => { setDemarre(true); retirerUne(r.key); }} disabled={n === 0} aria-label={`${t.retirerUne} ${roomName(r.key)}`}>−</button>
                    <span className="rn">{n}</span>
                    <button type="button" onClick={() => { setDemarre(true); ajouterPiece(r.key); }} aria-label={`${t.ajouterUne} ${roomName(r.key)}`}>+</button>
                  </span>
                </div>
              );
            })}
          </div>

          {mode === "pieces" && pieces.length > 0 && (() => {
            const totalPer: Record<string, number> = {};
            pieces.forEach((r) => { totalPer[r.room] = (totalPer[r.room] ?? 0) + 1; });
            const seen: Record<string, number> = {};
            return (
              <div className="plist">
                {pieces.map((r, i) => {
                  const meta = roomLabel(r.room);
                  seen[r.room] = (seen[r.room] ?? 0) + 1;
                  const ord = totalPer[r.room] > 1 ? ` ${seen[r.room]}` : "";
                  return (
                    <div className="prow" key={i}>
                      <span className="pname">{meta.emoji} {roomName(r.room)}{ord}</span>
                      <Stepper compact value={r.surface} min={2} unit="m²" onChange={(n) => { setDemarre(true); setPieceSurf(i, n); }} />
                      <button className="prm" onClick={() => { setDemarre(true); retirerPiece(i); }} aria-label={t.supprimer}>✕</button>
                    </div>
                  );
                })}
                <div className="psum">{nbPieces} {nbPieces > 1 ? t.piecePlur : t.pieceSing} · {totalSurface.toLocaleString(nf)} m² {t.auTotal} · <span className="hintadd">{t.ajusteSurface}</span></div>
              </div>
            );
          })()}

          <div className="fields">
            {mode === "bien" && (
              <div className="fld">
                <label>{t.surfaceLabel}</label>
                <Stepper field value={surface} min={8} unit="m²" onChange={(n) => { setDemarre(true); setSurface(n); }} />
              </div>
            )}
            <div className="fld" style={mode === "pieces" ? { gridColumn: "1 / -1" } : undefined}><label>{t.cpLabel}</label><input inputMode="numeric" maxLength={5} placeholder={t.cpPlaceholder} value={cp} onChange={(e) => { setDemarre(true); setCp(e.target.value.replace(/\D/g, "").slice(0, 5)); }} /></div>
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">2</span>{t.step2}</div>
          <div className="cards">
            {AMPLEURS.map((a, i) => {
              const al = ampCard(a.v);
              return (
                <button key={a.v} className={"amp" + (ampleur === a.v ? " on" : "")} onClick={() => { setDemarre(true); setAmpleur(a.v); }}>
                  <span className="head">
                    <span className="gauge">{[0, 1, 2, 3].map((k) => <i key={k} className={k <= i ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="t">{al.label}</span>
                  <span className="d">{al.desc}</span>
                  <span className="amt">{locked ? <span className="lock">{t.proLock}</span> : <>≈ <b>{(m2ByAmp[a.v] || 0).toLocaleString(nf)} €</b> / m²</>}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">3</span>{t.step3}</div>
          <div className="fins">
            {FINITIONS.map((f) => {
              const fi = t.finitions[f.v];
              return (
              <button key={f.v} className={"fin" + (finition === f.v ? " on" : "")} onClick={() => { setDemarre(true); setFinition(f.v); }}>
                <span className="head">
                  <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span>
                  <span className="chk" />
                </span>
                <span className="eye">{fi.eye}</span>
                <span className="t">{fi.label}</span>
                <span className="d">{fi.desc}</span>
                <span className="amt">{locked ? <span className="lock">{t.proLock}</span> : <>≈ <b>{(m2ByFin[f.v] || 0).toLocaleString(nf)} €</b> / m²</>}</span>
              </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">4</span>{t.step4}</div>
          <div className="quis">
            {QUIS.map((q) => {
              const qi = t.quis[q.v];
              const price = m2ByQui[q.v] || 0;
              const base = m2ByQui.pros || 0;
              const pct = base > 0 && price > 0 ? Math.round((1 - price / base) * 100) : 0;
              return (
                <button key={q.v} className={"qcard" + (qui === q.v ? " on" : "")} onClick={() => { setDemarre(true); setQui(q.v); }}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < q.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{qi.eye}</span>
                  <span className="t">{qi.label}</span>
                  <span className="d">{qi.desc}</span>
                  <span className="amt">
                    {locked ? <span className="lock">{t.proLock}</span> : <span className="p">≈ <b>{price.toLocaleString(nf)} €</b> / m²</span>}
                    {!locked && pct > 0 && <span className="save">−{pct} %</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="intro">{t.intro}</p>
      </div>

      <div className={"av-rapide-live" + (locked ? " lk" : "")}>
        <div className="in">
          {locked ? (
            <>
              <div>
                <div className="lbl">{t.lockedLabel}</div>
                <div className="big">{t.lockedBig1}{nbPieces}{nbPieces > 1 ? t.lockedBig2Plur : t.lockedBig2Sing}</div>
                <div className="sub">{t.lockedSub}</div>
              </div>
              <div className="btns">
                <Link className="cta" href="/tarifs">{t.lockedCta}</Link>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="lbl">{t.liveLabel}</div>
                <div className="big">{valid ? <><CountUp value={lo} nf={nf} /> €<span style={{ opacity: .55 }}> – </span><CountUp value={hi} nf={nf} /> €</> : "—"}</div>
                <div className="sub">{valid ? <>≈ <CountUp value={m2} nf={nf} /> €/m² · {ampName} · ±15 %{regLabel ? <> · {regLabel}</> : ""}</> : !demarre ? t.step1q : (mode === "pieces" ? "Ajoute une pièce" : t.renseigneSurface)}</div>
              </div>
              <div className="btns">
                <button className="ghost" onClick={affiner}>{t.affiner}</button>
                <button className="cta" onClick={enregistrer} disabled={saving}>{saving ? t.enregistrement : t.enregistrer}</button>
              </div>
              {erreur && <div className="err">{erreur}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
