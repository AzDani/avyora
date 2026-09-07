"use client";

/**
 * Estimation rapide (< 3 min) : 4 questions → preset de lots → MÊME moteur que l'estimateur détaillé.
 * « Affiner » ouvre le détaillé pré-rempli (via le brouillon localStorage). « Enregistrer » crée le projet.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CATALOG, buildDevis, presetRapide, presetPieces, AMPLEURS, regionCoef,
  type Ampleur, type QuiRealise, type TypeBien, type Finition, type PieceKey, type PieceSel,
} from "@/lib/estimateur";
import { suivre } from "@/lib/track";
import { useT, useLocale } from "@/components/i18n/LangProvider";

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
// Descriptions d'ampleur adaptées au mode « pièce » (pas de toiture/façade).
const PIECES_AMP: Record<Ampleur, { label: string; desc: string }> = {
  rafraich: { label: "Rafraîchissement", desc: "Peinture, sols, petites reprises." },
  partielle: { label: "Réno partielle", desc: "Éléments principaux remplacés (sanitaires, meubles…)." },
  complete: { label: "Réno complète", desc: "Tout refait : revêtements, élec, plomberie." },
  lourde: { label: "Réno lourde", desc: "Mise à nu : dépose complète puis tout à neuf." },
};

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
.av-rapide .glbl{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 8px}
.av-rapide .rgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:520px){.av-rapide .rgrid{grid-template-columns:1fr}}
.av-rapide .rcard{display:flex;align-items:center;justify-content:space-between;gap:6px;background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:4px 6px 4px 4px;transition:.15s var(--ease)}
.av-rapide .rcard.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 12%,transparent)}
.av-rapide .rcard .rname{flex:1;min-width:0;display:flex;align-items:center;gap:7px;background:transparent;border:0;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;text-align:left;padding:8px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rapide .rcard.on .rname{color:var(--ink)}
.av-rapide .rcard .rname .rem{font-size:16px;line-height:1}
.av-rapide .rstep{display:inline-flex;align-items:center;flex:none;border:1px solid var(--line);border-radius:999px;background:#f8f9fd}
.av-rapide .rstep button{width:26px;height:26px;border:0;background:transparent;color:var(--brand);font-size:16px;font-weight:700;cursor:pointer;line-height:1;border-radius:999px}
.av-rapide .rstep button:disabled{color:var(--line-strong);cursor:default}
.av-rapide .rstep .rn{min-width:16px;text-align:center;font-family:var(--font-geist-mono),monospace;font-size:12px;font-weight:600;color:var(--ink)}
.av-rapide .plist{margin-top:12px;border:1px solid var(--line);border-radius:.9rem;overflow:hidden;background:#f8f9fd}
.av-rapide .prow{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.av-rapide .prow:last-of-type{border-bottom:0}
.av-rapide .prow .pname{flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rapide .stepper{display:inline-flex;align-items:center;border:1px solid var(--line-strong);border-radius:999px;background:var(--surface)}
.av-rapide .stepper button{width:28px;height:28px;border:0;background:transparent;color:var(--brand);font-size:16px;font-weight:700;cursor:pointer;line-height:1}
.av-rapide .stepper .num{min-width:22px;text-align:center;font-family:var(--font-geist-mono),monospace;font-size:13px;font-weight:600;color:var(--ink)}
.av-rapide .psurf{display:inline-flex;align-items:center;gap:5px}
.av-rapide .psurf input{width:56px;font-family:inherit;font-size:14px;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong);border-radius:.55rem;padding:7px 8px;text-align:right;outline:none}
.av-rapide .psurf input:focus{border-color:var(--brand)}
.av-rapide .psurf .u{font-size:11.5px;color:var(--faint)}
.av-rapide .prm{width:26px;height:26px;border:0;background:transparent;color:var(--faint);font-size:14px;cursor:pointer;border-radius:6px}
.av-rapide .prm:hover{background:var(--line);color:var(--ink)}
.av-rapide .psum{padding:9px 12px;font-size:12px;color:var(--muted);background:var(--surface)}
.av-rapide .psum .hintadd{color:var(--faint)}
.av-rapide .amt .lock{font-family:var(--font-geist-sans);font-weight:600;font-size:11px;color:var(--accent-600);background:var(--brand-50);padding:2px 9px;border-radius:999px;letter-spacing:.02em}
.av-rapide-live a.cta{text-decoration:none;display:inline-flex;align-items:center}
@media(max-width:520px){.av-rapide .prow{flex-wrap:wrap}.av-rapide .prow .pname{flex-basis:100%}}
@media (prefers-reduced-motion:reduce){.av-rapide *,.av-rapide-live *{transition:none!important}}
`;

function CountUp({ value, nf }: { value: number; nf: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const target = Math.round(value || 0), start = prev.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reduce || document.hidden || start === target) { el.textContent = target.toLocaleString(nf); prev.current = target; return; }
    const dur = Math.min(700, 260 + Math.abs(target - start) / 400); let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts; const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * e).toLocaleString(nf);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else { el.textContent = target.toLocaleString(nf); prev.current = target; raf.current = null; }
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span ref={ref} className="num">0</span>;
}

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

export default function EstimateurRapide({ isPro = false }: { isPro?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("bien");
  const [type, setType] = useState<TypeBien>("Maison");
  const [surface, setSurface] = useState(100);
  const [pieces, setPieces] = useState<PieceSel[]>([]);
  const [cp, setCp] = useState("");
  const [ampleur, setAmpleur] = useState<Ampleur>("complete");
  const [finition, setFinition] = useState<Finition>("standard");
  const [qui, setQui] = useState<QuiRealise>("pros");
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const T = useT();
  const t = T.rapide;
  const locale = useLocale();
  const nf = locale === "en" ? "en-US" : "fr-FR";
  // Libellé d'ampleur traduit ("Réno totale" pour la lourde en appartement).
  const ampL = (v: Ampleur) => (v === "lourde" && type !== "Maison" ? t.ampleurs.lourdeAppart : t.ampleurs[v]);
  const ampCard = (v: Ampleur) => (mode === "pieces" ? PIECES_AMP[v] : ampL(v));

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
  const valid = mode === "pieces" ? pieces.length > 0 && totalSurface > 0 : surface > 0;
  const lo = Math.round((tot.ttc * 0.85) / 100) * 100;
  const hi = Math.round((tot.ttc * 1.15) / 100) * 100;
  const m2 = valid && totalSurface > 0 ? Math.round(tot.ttc / totalSurface) : 0;
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
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: "estimateur", ctx: preset.ctx, sel: preset.sel, open: {}, codePostal: cp })); } catch { /* noop */ }
  }
  function affiner() { suivre("estimation_terminee", { action: "affiner", type: mode === "pieces" ? "pieces" : type, ampleur }); saveDraft(); router.push("/projets/nouveau/detaille"); }

  /** Libellé du projet (ex. « Rénovation — Chambre ×2 + Salle de bain » ou « Rénovation — Maison 100 m² »). */
  function nomProjet(): string {
    if (mode === "pieces") {
      const counts = new Map<PieceKey, number>();
      for (const r of pieces) counts.set(r.room, (counts.get(r.room) ?? 0) + 1);
      const parts = [...counts].map(([k, n]) => `${roomLabel(k).label}${n > 1 ? ` ×${n}` : ""}`);
      return `${t.projetNom} — ${parts.join(" + ")}`.slice(0, 110);
    }
    const nomType = type === "Maison" ? t.typeMaison : t.typeAppart;
    return `${t.projetNom} — ${nomType} ${surface} m²`.slice(0, 110);
  }

  async function enregistrer() {
    setErreur(null);
    if (!/^\d{5}$/.test(cp)) { setErreur(t.errCp); return; }
    if (mode === "pieces" && pieces.length === 0) { setErreur("Ajoute au moins une pièce."); return; }
    if (!valid) { setErreur(t.errSurface); return; }
    suivre("estimation_terminee", { action: "enregistrer", type: mode === "pieces" ? "pieces" : type, ampleur });
    setSaving(true);
    const nom = nomProjet();
    const typeBien = (mode === "pieces" ? "Appartement" : type) as TypeBien;
    const reponses = { v: "estimateur", ctx: preset.ctx, sel: preset.sel, codePostal: cp };
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, typeBien, surface: totalSurface, codePostal: cp, reponses }) });
      if (res.status === 401) { try { localStorage.setItem("avyora-estim-claim", "1"); } catch { /* noop */ } saveDraft(); router.push("/inscription"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data?.error || t.errSave); setSaving(false); return; }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      router.push(`/projets/${data.id}`);
    } catch { setErreur(t.errReseau); setSaving(false); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RAPIDE_CSS }} />
      <div className="av-rapide">
        <div className="q">
          <div className="qlbl"><span className="n">1</span>Qu&apos;est-ce que tu estimes&nbsp;?</div>

          <div className="glbl">Bien entier</div>
          <div className="seg" style={{ marginBottom: 14 }}>
            {(["Maison", "Appartement"] as TypeBien[]).map((tb) => (
              <button key={tb} className={mode === "bien" && type === tb ? "on" : ""} onClick={() => { setMode("bien"); setType(tb); }}>{tb === "Maison" ? t.maison : t.appart}</button>
            ))}
          </div>

          <div className="glbl">Une ou plusieurs pièces</div>
          <div className="rgrid">
            {ROOMS.map((r) => {
              const n = countByRoom(r.key);
              return (
                <div key={r.key} className={"rcard" + (mode === "pieces" && n > 0 ? " on" : "")}>
                  <button type="button" className="rname" onClick={() => ajouterPiece(r.key)}>
                    <span className="rem">{r.emoji}</span> {r.label}
                  </button>
                  <span className="rstep">
                    <button type="button" onClick={() => retirerUne(r.key)} disabled={n === 0} aria-label={`Retirer une ${r.label}`}>−</button>
                    <span className="rn">{n}</span>
                    <button type="button" onClick={() => ajouterPiece(r.key)} aria-label={`Ajouter une ${r.label}`}>+</button>
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
                      <span className="pname">{meta.emoji} {meta.label}{ord}</span>
                      <span className="psurf">
                        <input type="number" inputMode="numeric" min={2} value={r.surface} onChange={(e) => setPieceSurf(i, parseFloat(e.target.value) || 0)} />
                        <span className="u">m²</span>
                      </span>
                      <button className="prm" onClick={() => retirerPiece(i)} aria-label="Supprimer">✕</button>
                    </div>
                  );
                })}
                <div className="psum">{nbPieces} pièce{nbPieces > 1 ? "s" : ""} · {totalSurface.toLocaleString(nf)} m² au total · <span className="hintadd">ajuste la surface de chaque pièce</span></div>
              </div>
            );
          })()}

          <div className="fields">
            {mode === "bien" && (
              <div className="fld"><label>{t.surfaceLabel}</label><input type="number" inputMode="numeric" min={8} value={surface} onChange={(e) => setSurface(parseFloat(e.target.value) || 0)} /></div>
            )}
            <div className="fld" style={mode === "pieces" ? { gridColumn: "1 / -1" } : undefined}><label>{t.cpLabel}</label><input inputMode="numeric" maxLength={5} placeholder={t.cpPlaceholder} value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
          </div>
        </div>

        <div className="q">
          <div className="qlbl"><span className="n">2</span>{t.step2}</div>
          <div className="cards">
            {AMPLEURS.map((a, i) => {
              const al = ampCard(a.v);
              return (
                <button key={a.v} className={"amp" + (ampleur === a.v ? " on" : "")} onClick={() => setAmpleur(a.v)}>
                  <span className="head">
                    <span className="gauge">{[0, 1, 2, 3].map((k) => <i key={k} className={k <= i ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="t">{al.label}</span>
                  <span className="d">{al.desc}</span>
                  <span className="amt">{locked ? <span className="lock">🔒 Pro</span> : <>≈ <b>{(m2ByAmp[a.v] || 0).toLocaleString(nf)} €</b> / m²</>}</span>
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
              <button key={f.v} className={"fin" + (finition === f.v ? " on" : "")} onClick={() => setFinition(f.v)}>
                <span className="head">
                  <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < f.lvl ? "f" : ""} />)}</span>
                  <span className="chk" />
                </span>
                <span className="eye">{fi.eye}</span>
                <span className="t">{fi.label}</span>
                <span className="d">{fi.desc}</span>
                <span className="amt">{locked ? <span className="lock">🔒 Pro</span> : <>≈ <b>{(m2ByFin[f.v] || 0).toLocaleString(nf)} €</b> / m²</>}</span>
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
                <button key={q.v} className={"qcard" + (qui === q.v ? " on" : "")} onClick={() => setQui(q.v)}>
                  <span className="head">
                    <span className="g3">{[0, 1, 2].map((k) => <i key={k} className={k < q.lvl ? "f" : ""} />)}</span>
                    <span className="chk" />
                  </span>
                  <span className="eye">{qi.eye}</span>
                  <span className="t">{qi.label}</span>
                  <span className="d">{qi.desc}</span>
                  <span className="amt">
                    {locked ? <span className="lock">🔒 Pro</span> : <span className="p">≈ <b>{price.toLocaleString(nf)} €</b> / m²</span>}
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
                <div className="lbl">Multi-pièces · AVYORA Pro</div>
                <div className="big">🔒 {nbPieces} pièces à chiffrer</div>
                <div className="sub">Combine plusieurs pièces en un seul projet chiffré avec AVYORA&nbsp;Pro. Une pièce seule reste gratuite.</div>
              </div>
              <div className="btns">
                <Link className="cta" href="/tarifs">Débloquer avec Pro →</Link>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="lbl">{t.liveLabel}</div>
                <div className="big">{valid ? <><CountUp value={lo} nf={nf} /> €<span style={{ opacity: .55 }}> – </span><CountUp value={hi} nf={nf} /> €</> : "—"}</div>
                <div className="sub">{valid ? <>≈ <CountUp value={m2} nf={nf} /> €/m² · {ampName} · ±15 %{regLabel ? <> · {regLabel}</> : ""}</> : (mode === "pieces" ? "Ajoute une pièce" : t.renseigneSurface)}</div>
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
