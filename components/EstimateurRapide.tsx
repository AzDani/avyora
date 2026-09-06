"use client";

/**
 * Estimation rapide (< 3 min) : 4 questions → preset de lots → MÊME moteur que l'estimateur détaillé.
 * « Affiner » ouvre le détaillé pré-rempli (via le brouillon localStorage). « Enregistrer » crée le projet.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CATALOG, buildDevis, presetRapide, AMPLEURS, ampleurLabel, regionCoef,
  type Ampleur, type QuiRealise, type TypeBien, type Finition,
} from "@/lib/estimateur";
import { suivre } from "@/lib/track";

const DRAFT_KEY = "avyora-estim-v2";
const RAPIDE_CSS = `
.av-rapide{--canvas:#f5f6fb;--surface:#fff;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--brand:#4f46e5;--brand-50:#eef1ff;--brand-200:#c7ccfe;--accent-300:#c4b5fd;--accent-600:#7c3aed;--nuit:#1E1B4B;--nuit-2:#241f5e;--good:#0f9d6b;--good-bg:#e6f7f0;--radius-field:.7rem;--radius-card:1.15rem;--radius-panel:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);color:var(--ink);font-family:var(--font-geist-sans),system-ui,sans-serif}
.av-rapide *{box-sizing:border-box}
.av-rapide .num{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.av-rapide .q{margin-bottom:22px}
.av-rapide .qlbl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.13em;color:var(--brand);margin-bottom:10px}
.av-rapide .qlbl .n{display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--brand);color:#fff;font-size:11px;font-family:var(--font-geist-mono)}
.av-rapide .seg{display:flex;gap:8px;flex-wrap:wrap}
.av-rapide .seg button{flex:1;min-width:90px;font-family:var(--font-geist-sans);font-size:14px;font-weight:600;color:var(--muted);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:11px 8px;cursor:pointer;transition:.15s var(--ease)}
.av-rapide .seg button:hover{border-color:var(--brand-200)}
.av-rapide .seg button.on{background:var(--brand);border-color:var(--brand);color:#fff}
.av-rapide .fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.av-rapide .fld label{display:block;font-size:11.5px;color:var(--muted);margin-bottom:5px;font-weight:500}
.av-rapide .fld input{width:100%;font-family:var(--font-geist-sans);font-size:15px;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:11px 12px;outline:none;transition:.15s}
.av-rapide .fld input:focus{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.av-rapide .amp{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;transition:.16s var(--ease);position:relative}
.av-rapide .amp:hover{border-color:var(--brand-200)}
.av-rapide .amp.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .amp .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.av-rapide .amp .gauge{display:flex;align-items:flex-end;gap:3px;height:18px}
.av-rapide .amp .gauge i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .amp .gauge i:nth-child(1){height:35%}
.av-rapide .amp .gauge i:nth-child(2){height:57%}
.av-rapide .amp .gauge i:nth-child(3){height:79%}
.av-rapide .amp .gauge i:nth-child(4){height:100%}
.av-rapide .amp .gauge i.f{background:var(--accent-300)}
.av-rapide .amp.on .gauge i.f{background:var(--brand)}
.av-rapide .amp .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);transition:.15s;position:relative}
.av-rapide .amp.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .amp.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .amp .t{font-size:14.5px;font-weight:600;line-height:1.25}
.av-rapide .amp .d{font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.45;min-height:32px}
.av-rapide .amp .amt{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--faint)}
.av-rapide .amp .amt b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
.av-rapide .fins{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.av-rapide .fin{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;position:relative;transition:.16s var(--ease)}
.av-rapide .fin:hover{border-color:var(--brand-200)}
.av-rapide .fin.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .fin .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.av-rapide .fin .g3{display:flex;align-items:flex-end;gap:3px;height:16px}
.av-rapide .fin .g3 i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .fin .g3 i:nth-child(1){height:45%}
.av-rapide .fin .g3 i:nth-child(2){height:72%}
.av-rapide .fin .g3 i:nth-child(3){height:100%}
.av-rapide .fin .g3 i.f{background:var(--accent-300)}
.av-rapide .fin.on .g3 i.f{background:var(--brand)}
.av-rapide .fin .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);position:relative;transition:.15s}
.av-rapide .fin.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .fin.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .fin .eye{font-size:9.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-600)}
.av-rapide .fin .t{font-size:15px;font-weight:600;margin-top:2px}
.av-rapide .fin .d{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.45;min-height:58px}
.av-rapide .fin .amt{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);font-size:11.5px;color:var(--faint)}
.av-rapide .fin .amt b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
@media(max-width:560px){.av-rapide .fins{grid-template-columns:1fr}.av-rapide .fin .d{min-height:0}}
.av-rapide .quis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.av-rapide .qcard{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-card);padding:14px;cursor:pointer;position:relative;transition:.16s var(--ease)}
.av-rapide .qcard:hover{border-color:var(--brand-200)}
.av-rapide .qcard.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.av-rapide .qcard .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.av-rapide .qcard .g3{display:flex;align-items:flex-end;gap:3px;height:16px}
.av-rapide .qcard .g3 i{width:5px;border-radius:2px;background:var(--line-strong);transition:.16s}
.av-rapide .qcard .g3 i:nth-child(1){height:45%}
.av-rapide .qcard .g3 i:nth-child(2){height:72%}
.av-rapide .qcard .g3 i:nth-child(3){height:100%}
.av-rapide .qcard .g3 i.f{background:var(--accent-300)}
.av-rapide .qcard.on .g3 i.f{background:var(--brand)}
.av-rapide .qcard .chk{width:20px;height:20px;border-radius:50%;border:2px solid var(--line-strong);position:relative;transition:.15s}
.av-rapide .qcard.on .chk{background:var(--brand);border-color:var(--brand)}
.av-rapide .qcard.on .chk::after{content:"";position:absolute;left:5.5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.av-rapide .qcard .eye{font-size:9.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-600)}
.av-rapide .qcard .t{font-size:14px;font-weight:600;margin-top:2px;line-height:1.25}
.av-rapide .qcard .d{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.45;min-height:72px}
.av-rapide .qcard .amt{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);display:flex;align-items:baseline;justify-content:space-between;gap:6px}
.av-rapide .qcard .amt .p{font-size:11.5px;color:var(--faint)}
.av-rapide .qcard .amt .p b{font-family:var(--font-geist-mono),monospace;color:var(--brand);font-weight:600;font-size:13px}
.av-rapide .qcard .save{font-family:var(--font-geist-mono),monospace;font-size:10px;font-weight:600;color:var(--good);background:var(--good-bg);padding:2px 6px;border-radius:999px;white-space:nowrap}
@media(max-width:560px){.av-rapide .quis{grid-template-columns:1fr}.av-rapide .qcard .d{min-height:0}}
.av-rapide .intro{font-size:12.5px;color:var(--faint);text-align:center;margin-top:6px}
.av-rapide-live{--nuit:#1E1B4B;--nuit-2:#241f5e;--accent-300:#c4b5fd;--radius-panel:1.5rem;--ease:cubic-bezier(.22,.72,.2,1);position:sticky;bottom:16px;z-index:20;margin-top:20px;border-radius:var(--radius-panel);background:linear-gradient(140deg,var(--nuit),var(--nuit-2));box-shadow:0 22px 54px -22px rgba(30,27,75,.7);border:1px solid rgba(255,255,255,.08)}
.av-rapide-live .in{padding:14px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.av-rapide-live .lbl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-300);font-weight:600}
.av-rapide-live .big{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;font-weight:600;font-size:23px;line-height:1.15;color:#fff;margin-top:2px}
.av-rapide-live .sub{font-size:11.5px;color:#c9c5ee;margin-top:2px}
.av-rapide-live .btns{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.av-rapide-live .cta{font-family:var(--font-geist-sans);font-weight:600;font-size:13.5px;background:#fff;color:var(--nuit);border:0;border-radius:999px;padding:11px 18px;cursor:pointer;white-space:nowrap;transition:transform .18s var(--ease)}
.av-rapide-live .cta:hover{transform:translateY(-2px)}
.av-rapide-live .ghost{font-family:var(--font-geist-sans);font-weight:600;font-size:13.5px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:11px 16px;cursor:pointer;white-space:nowrap}
.av-rapide-live .ghost:disabled{opacity:.5;cursor:not-allowed}
.av-rapide-live .err{width:100%;font-size:12.5px;font-weight:500;color:#ffb1b6}
@media (prefers-reduced-motion:reduce){.av-rapide *,.av-rapide-live *{transition:none!important}}
`;

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const target = Math.round(value || 0), start = prev.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduce || document.hidden || start === target) { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; return; }
    const dur = Math.min(700, 260 + Math.abs(target - start) / 400); let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts; const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * e).toLocaleString("fr-FR");
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { el.textContent = target.toLocaleString("fr-FR"); prev.current = target; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span ref={ref} className="num">0</span>;
}

// Étape 3 : chaque niveau de finition rattaché à un objectif + description concrète (cartes).
const FINITIONS: { v: Finition; lvl: number; eye: string; label: string; desc: string }[] = [
  { v: "eco", lvl: 1, eye: "Locatif · budget maîtrisé", label: "Éco", desc: "Entrée de gamme robuste : sol stratifié, carrelage standard, cuisine en kit, robinetterie basique." },
  { v: "standard", lvl: 2, eye: "Le plus courant", label: "Standard", desc: "Bon rapport qualité-prix : marques milieu de gamme, finitions soignées. Idéal résidence principale." },
  { v: "premium", lvl: 3, eye: "Haut de gamme", label: "Premium", desc: "Matériaux nobles : parquet, carrelage grand format, cuisine équipée haut de gamme, prestations soignées." },
];

// Étape 4 : qui réalise. Jauge = implication ; description générique (le partage exact se fait dans le détaillé).
const QUIS: { v: QuiRealise; lvl: number; eye: string; label: string; desc: string }[] = [
  { v: "pros", lvl: 1, eye: "Clé en main", label: "Tout par des pros", desc: "Des artisans font tout : devis, garanties décennales, zéro effort de ta part." },
  { v: "partie", lvl: 2, eye: "Le bon compromis", label: "J'en bricole une partie", desc: "Un mix : tu fais une partie, les pros le reste. Estimation moyenne — tu répartiras chaque poste juste après." },
  { v: "max", lvl: 3, eye: "Budget mini", label: "Je fais un max moi-même", desc: "Tu fais tout ce qui est faisable toi-même ; les pros seulement sur l'obligatoire (élec, gaz…)." },
];

export default function EstimateurRapide() {
  const router = useRouter();
  const [type, setType] = useState<TypeBien>("Maison");
  const [surface, setSurface] = useState(100);
  const [cp, setCp] = useState("");
  const [ampleur, setAmpleur] = useState<Ampleur>("complete");
  const [finition, setFinition] = useState<Finition>("standard");
  const [qui, setQui] = useState<QuiRealise>("pros");
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const preset = useMemo(() => presetRapide({ type, surface, codePostal: cp, ampleur, finition, qui }), [type, surface, cp, ampleur, finition, qui]);
  const tot = useMemo(() => buildDevis(CATALOG, preset.ctx, preset.sel).totaux, [preset]);
  const valid = surface > 0;
  const lo = Math.round((tot.ttc * 0.85) / 100) * 100;
  const hi = Math.round((tot.ttc * 1.15) / 100) * 100;
  const m2 = valid ? Math.round(tot.ttc / surface) : 0;
  const ampName = ampleurLabel(ampleur, type).label.toLowerCase();
  // €/m² de chaque ampleur pour les réglages courants (pour l'afficher sur chaque carte).
  const m2ByAmp = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of AMPLEURS) {
      const p = presetRapide({ type, surface, codePostal: cp, ampleur: a.v, finition, qui });
      const tt = buildDevis(CATALOG, p.ctx, p.sel).totaux;
      out[a.v] = surface > 0 ? Math.round(tt.ttc / surface) : 0;
    }
    return out;
  }, [type, surface, cp, finition, qui]);
  // €/m² de chaque finition pour les réglages courants (affiché sur chaque carte de l'étape 3).
  const m2ByFin = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of ["eco", "standard", "premium"] as Finition[]) {
      const p = presetRapide({ type, surface, codePostal: cp, ampleur, finition: f, qui });
      const tt = buildDevis(CATALOG, p.ctx, p.sel).totaux;
      out[f] = surface > 0 ? Math.round(tt.ttc / surface) : 0;
    }
    return out;
  }, [type, surface, cp, ampleur, qui]);
  // €/m² de chaque option « qui réalise » pour les réglages courants (+ base pros pour l'économie).
  const m2ByQui = useMemo(() => {
    const out: Record<string, number> = {};
    for (const q of ["pros", "partie", "max"] as QuiRealise[]) {
      const p = presetRapide({ type, surface, codePostal: cp, ampleur, finition, qui: q });
      const tt = buildDevis(CATALOG, p.ctx, p.sel).totaux;
      out[q] = surface > 0 ? Math.round(tt.ttc / surface) : 0;
    }
    return out;
  }, [type, surface, cp, ampleur, finition]);
  const reg = regionCoef(cp);
  const regDelta = Math.round((reg.mo - 1) * 100);
  const regLabel = cp.length >= 2 ? `${reg.zone}${regDelta ? ` · ${regDelta > 0 ? "+" : ""}${regDelta} % MO` : ""}` : "";

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: "estimateur", ctx: preset.ctx, sel: preset.sel, open: {}, codePostal: cp })); } catch { /* noop */ }
  }
  function affiner() { suivre("estimation_terminee", { action: "affiner", type, ampleur }); saveDraft(); router.push("/projets/nouveau/detaille"); }

  async function enregistrer() {
    setErreur(null);
    if (!/^\d{5}$/.test(cp)) { setErreur("Renseignez un code postal (5 chiffres)."); return; }
    if (!valid) { setErreur("Renseignez la surface."); return; }
    suivre("estimation_terminee", { action: "enregistrer", type, ampleur });
    setSaving(true);
    const nom = `Rénovation — ${type} ${surface} m²`.slice(0, 110);
    const reponses = { v: "estimateur", ctx: preset.ctx, sel: preset.sel, codePostal: cp };
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, typeBien: type, surface, codePostal: cp, reponses }) });
      if (res.status === 401) { try { localStorage.setItem("avyora-estim-claim", "1"); } catch { /* noop */ } saveDraft(); router.push("/inscription"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || "Enregistrement impossible."); setSaving(false); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      router.push(`/projets/${data.id}`);
    } catch { setErreur("Réseau indisponible. Réessayez."); setSaving(false); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RAPIDE_CSS }} />
      <div className="av-rapide">
        <div className="q">
          <div className="qlbl"><span className="n">1</span>Ton bien</div>
          <div className="seg" style={{ marginBottom: 10 }}>
            {(["Maison", "Appartement"] as TypeBien[]).map((t) => (
              <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t === "Maison" ? "🏠 Maison" : "🏢 Appartement"}</button>
            ))}
          </div>
          <div className="fields">
            <div className="fld"><label>Surface habitable (m²)</label><input type="number" inputMode="numeric" min={8} value={surface} onChange={(e) => setSurface(parseFloat(e.target.value) || 0)} /></div>
            <div className="fld"><label>Code postal</label><input inputMode="numeric" maxLength={5} placeholder="ex. 33000" value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">2</span>Ampleur des travaux</div>
          <div className="cards">
            {AMPLEURS.map((a, i) => {
              const al = ampleurLabel(a.v, type);
              return (
                <button key={a.v} className={"amp" + (ampleur === a.v ? " on" : "")} onClick={() => setAmpleur(a.v)}>
                  <span className="head">
                    <span className="gauge">{[0, 1, 2, 3].map((k) => <i key={k} className={k <= i ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="t">{al.label}</span>
                  <span className="d">{al.desc}</span>
                  <span className="amt">≈ <b>{(m2ByAmp[a.v] || 0).toLocaleString("fr-FR")} €</b> / m²</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">3</span>Niveau de finition</div>
          <div className="fins">
            {FINITIONS.map((f) => (
              <button key={f.v} className={"fin" + (finition === f.v ? " on" : "")} onClick={() => setFinition(f.v)}>
                <span className="head">
                  <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span>
                  <span className="chk" />
                </span>
                <span className="eye">{f.eye}</span>
                <span className="t">{f.label}</span>
                <span className="d">{f.desc}</span>
                <span className="amt">≈ <b>{(m2ByFin[f.v] || 0).toLocaleString("fr-FR")} €</b> / m²</span>
              </button>
            ))}
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">4</span>Qui réalise les travaux ?</div>
          <div className="quis">
            {QUIS.map((q) => {
              const price = m2ByQui[q.v] || 0;
              const base = m2ByQui.pros || 0;
              const pct = base > 0 && price > 0 ? Math.round((1 - price / base) * 100) : 0;
              return (
                <button key={q.v} className={"qcard" + (qui === q.v ? " on" : "")} onClick={() => setQui(q.v)}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < q.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{q.eye}</span>
                  <span className="t">{q.label}</span>
                  <span className="d">{q.desc}</span>
                  <span className="amt">
                    <span className="p">≈ <b>{price.toLocaleString("fr-FR")} €</b> / m²</span>
                    {pct > 0 && <span className="save">−{pct} %</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="intro">Estimation indicative, marge ±15 %. « Affiner » ouvre le détail poste par poste.</p>
      </div>

      <div className="av-rapide-live">
        <div className="in">
          <div>
            <div className="lbl">Estimation rapide · TTC</div>
            <div className="big">{valid ? <><CountUp value={lo} /> €<span style={{ opacity: .55 }}> – </span><CountUp value={hi} /> €</> : "—"}</div>
            <div className="sub">{valid ? <>≈ <CountUp value={m2} /> €/m² · {ampName} · ±15 %{regLabel ? <> · {regLabel}</> : ""}</> : "Renseigne la surface"}</div>
          </div>
          <div className="btns">
            <button className="ghost" onClick={affiner}>Affiner</button>
            <button className="cta" onClick={enregistrer} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer →"}</button>
          </div>
          {erreur && <div className="err">{erreur}</div>}
        </div>
      </div>
    </>
  );
}
