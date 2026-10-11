import "server-only";
import Link from "next/link";
import {
  buildDevis, catalogueDe, regionCoef, maisonComplete,
  type Ctx, type Selection, type Finition, type QuiRealise,
} from "@/lib/estimateur";
import { normaliserCles } from "@/lib/estimateur/identite";
import { catLigne } from "@/lib/estimateur/catalog-i18n";
import { getLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import BilanRapideNeuf from "./BilanRapideNeuf";

/**
 * Fiche d'un projet neuf enregistré en mode RAPIDE. Pendant de `ResultatRapide` (rénovation,
 * inchangé) : le bilan de la maquette en clair (total, phases, exclusions, alerte argile), puis
 * le détail poste par poste flouté en teaser Pro, comme la répartition du rapide rénovation.
 */
type Reponses = { ctx?: Ctx; sel?: Selection; codePostal?: string; qui?: QuiRealise };

const SEG = ["#4f46e5", "#7c3aed", "#a78bfa", "#c4b5fd", "#dcdeec"];

const CSS = `
.av-rn{--surface:#fff;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--accent:#7c3aed;--r:1.15rem;--r-lg:1.5rem;color:var(--ink)}
.av-rn .sec{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:26px 0 12px;display:flex;align-items:center;gap:8px}
.av-rn .pro-chip{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);background:#f3ecff;padding:3px 9px;border-radius:999px}
.av-rn .recap{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){.av-rn .recap{grid-template-columns:1fr}}
.av-rn .item{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px}
.av-rn .item .k{font-size:11.5px;color:var(--faint)}
.av-rn .item .v{font-size:14.5px;font-weight:600;margin-top:1px}
.av-rn .teaser{position:relative;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:var(--surface)}
.av-rn .teaser .inside{padding:22px;filter:blur(6px);user-select:none;pointer-events:none}
.av-rn .lrow{display:flex;align-items:center;gap:9px;font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--line)}
.av-rn .lrow:last-child{border-bottom:0}
.av-rn .dot{width:10px;height:10px;border-radius:3px;flex:none}
.av-rn .lrow .nm{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-rn .lrow .lv{margin-left:auto;font-family:var(--font-geist-mono),monospace;font-weight:600;white-space:nowrap}
.av-rn .lock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:11px;padding:20px;background:rgba(248,249,253,.55)}
.av-rn .lock .ico{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid var(--line-strong);display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:0 10px 24px -12px rgba(30,27,75,.3)}
.av-rn .lock h3{font-size:16.5px;font-weight:700}
.av-rn .lock p{font-size:13.5px;color:var(--muted);max-width:42ch}
.av-rn .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.av-rn .note{font-size:12px;color:var(--faint);margin-top:16px;line-height:1.6}
`;

export default async function ResultatRapideNeuf({
  reponses, projectId, isPro,
}: { reponses: Reponses; projectId: string; isPro: boolean }) {
  const locale = await getLocale();
  const d = dict(locale);
  const n = dictNeuf(locale);
  const t = n.rapide;
  const ctx = { ...(reponses.ctx ?? {}), codePostal: reponses.ctx?.codePostal ?? reponses.codePostal } as Ctx;
  const sel = normaliserCles((reponses.sel ?? {}) as Selection);
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const eur = (v: number) => Math.round(v || 0).toLocaleString(nf) + " €";

  const maison = maisonComplete(ctx.neuf);
  const cp = ctx.codePostal ?? "";
  const reg = regionCoef(cp);
  const zone = d.rapide.zones[reg.zone] ?? reg.zone;
  // Les libellés du rapide du NEUF (ceux que le particulier a cliqués), pas ceux de la rénovation.
  const finLabel = (ctx.finition && n.saisie.finitions[ctx.finition as Finition]?.label) || "—";
  const quiLabel = (reponses.qui && n.saisie.quis[reponses.qui]?.label) || "—";

  // Teaser flouté : les vrais postes les plus lourds, masqués.
  const dv = buildDevis(catalogueDe(ctx), ctx, sel);
  const top = [...dv.lignes].filter((li) => li.ttc > 0).sort((a, b) => b.ttc - a.ttc).slice(0, 5);

  const ctaHref = isPro ? `/projets/${projectId}/modifier` : "/tarifs";
  const ctaLabel = isPro ? t.affiner : t.passPro;

  return (
    <div className="av-rn">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <p className="text-[15px] text-muted -mt-2 mb-4">{t.sub}</p>

      <BilanRapideNeuf ctx={ctx} sel={sel} qui={reponses.qui} locale={locale} />

      <div className="sec">{t.resume}</div>
      <div className="recap">
        <div className="item"><div className="k">{t.maisonK}</div><div className="v">{n.maisonNeuve} · <span className="data">{maison.surface}</span> m² · {n.niveauxCourt[maison.niveaux] ?? n.niveauxCourt.pp}</div></div>
        <div className="item"><div className="k">{t.locK}</div><div className="v">{cp || "—"}{cp && reg.zone ? ` · ${zone}` : ""}</div></div>
        <div className="item"><div className="k">{t.finitionK}</div><div className="v">{finLabel}</div></div>
        <div className="item"><div className="k">{t.quiK}</div><div className="v">{quiLabel}</div></div>
      </div>

      <div className="sec">{t.detailK} <span className="pro-chip">Pro</span></div>
      <div className="teaser">
        <div className="inside" aria-hidden="true">
          {top.map((li, i) => (
            <div className="lrow" key={li.cle}>
              <span className="dot" style={{ background: SEG[i] ?? SEG[SEG.length - 1] }} />
              <span className="nm">{catLigne(locale, li.nom, li.cle)}</span>
              <span className="lv">{eur(li.ttc)}</span>
            </div>
          ))}
          <div className="lrow"><span className="dot" style={{ background: SEG[SEG.length - 1] }} />{t.autres} <span className="lv">…</span></div>
        </div>
        <div className="lock">
          <div className="ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <h3>{t.lockH}</h3>
          <p>{t.lockP}</p>
        </div>
      </div>

      <div className="actions">
        <Link href={ctaHref} className="btn btn-primary py-2.5">{ctaLabel}</Link>
        <Link href="/projets/nouveau?nature=neuf" className="btn btn-outline py-2.5">{t.refaire}</Link>
      </div>

      <p className="note">{t.margeInfo}</p>
    </div>
  );
}
