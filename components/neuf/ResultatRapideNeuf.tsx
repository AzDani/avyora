import "server-only";
import Link from "next/link";
import {
  buildDevis, catalogueDe, regionCoef, maisonComplete, tachesParCle,
  type Ctx, type Selection, type Finition, type QuiRealise,
} from "@/lib/estimateur";
import { normaliserCles } from "@/lib/estimateur/identite";
import { catLigneCourte } from "@/lib/estimateur/catalog-i18n";
import { getLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import BilanRapideNeuf from "./BilanRapideNeuf";
import { betaActive } from "@/lib/beta";

/**
 * Fiche d'un projet neuf enregistré en mode RAPIDE. Pendant de `ResultatRapide` (rénovation) : le
 * bilan de la maquette (fourchette en grand, repères, exclusions, alerte argile), le résumé (garage et
 * eaux usées compris), puis les postes les plus lourds.
 *
 * Règle commune de l'aperçu (D9, N13), la même qu'en rénovation : un compte qui a les droits (abonné,
 * ou inscrit pendant la bêta, `estPro`) voit la répartition par phase et les postes en clair, sans
 * cadenas ; sinon des données FACTICES, floutées sous un cadenas (le flou n'est que du CSS).
 *
 * F1 : les postes les plus lourds prennent leur libellé court (`nc`, N11), et la ligne « + autres postes »
 * dit son montant, comme « + autres corps d'état » en rénovation (le reste des lignes, TTC hors aléas).
 */
type Reponses = { ctx?: Ctx; sel?: Selection; codePostal?: string; qui?: QuiRealise };

const SEG = ["#4f46e5", "#7c3aed", "#a78bfa", "#c4b5fd", "#dcdeec"];

const CSS = `
.av-rn{--surface:#fff;--ink:#15172b;--muted:#565a75;--faint:#898ea8;--line:#e9eaf3;--line-strong:#dcdeec;--accent:#7c3aed;--r:1.15rem;--r-lg:1.5rem;color:var(--ink)}
.av-rn .sec{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:26px 0 12px;display:flex;align-items:center;gap:8px}
.av-rn .pro-chip{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);background:#f3ecff;padding:3px 9px;border-radius:999px}
.av-rn .recap{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){.av-rn .recap{grid-template-columns:1fr}}
.av-rn .item{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px;display:flex;align-items:center;gap:12px}
.av-rn .item .ic{width:34px;height:34px;border-radius:10px;background:#eef1ff;display:flex;align-items:center;justify-content:center;font-size:17px;flex:none}
.av-rn .repart{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);padding:16px 22px}
.av-rn .item .k{font-size:11.5px;color:var(--faint)}
.av-rn .item .v{font-size:14.5px;font-weight:600;margin-top:1px}
.av-rn .teaser{position:relative;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:var(--surface)}
.av-rn .teaser .inside{padding:22px;filter:blur(6px);user-select:none;pointer-events:none}
.av-rn .lrow{display:flex;align-items:center;gap:9px;font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--line)}
.av-rn .lrow:last-child{border-bottom:0}
.av-rn .dot{width:10px;height:10px;border-radius:3px;flex:none}
.av-rn .lrow .nm{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:520px){.av-rn .lrow .nm{white-space:normal;line-height:1.3}}
.av-rn .lrow .fake{display:block;height:10px;border-radius:99px;background:var(--line-strong)}
.av-rn .lrow .lv{margin-left:auto;font-family:var(--font-geist-mono),monospace;font-weight:600;white-space:nowrap}
.av-rn .lock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:11px;padding:20px;background:rgba(248,249,253,.55)}
.av-rn .lock .ico{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid var(--line-strong);display:flex;align-items:center;justify-content:center;color:var(--accent);box-shadow:0 10px 24px -12px rgba(30,27,75,.3)}
.av-rn .lock h3{font-size:16.5px;font-weight:700}
.av-rn .lock p{font-size:13.5px;color:var(--muted);max-width:42ch}
.av-rn .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.av-rn .note{font-size:12px;color:var(--faint);margin-top:16px;line-height:1.6}
`;

export default async function ResultatRapideNeuf({
  reponses, projectId, isPro, readOnly,
}: {
  reponses: Reponses; projectId: string; isPro: boolean;
  /** Vue admin en lecture seule (N14) : sans les boutons « Affiner » et « Refaire », qui mènent aux écrans du particulier. */
  readOnly?: boolean;
}) {
  const locale = await getLocale();
  const d = dict(locale);
  const n = dictNeuf(locale);
  // Bêta gratuite (lib/beta.ts) : la pastille « Pro » et le titre du cadenas disent la bêta.
  const beta = betaActive();
  const t = beta ? { ...n.rapide, lockH: d.beta.lockDetail } : n.rapide;
  const ctx = { ...(reponses.ctx ?? {}), codePostal: reponses.ctx?.codePostal ?? reponses.codePostal } as Ctx;
  const sel = normaliserCles((reponses.sel ?? {}) as Selection);
  const nf = locale === "en" ? "en-US" : "fr-FR";
  const eur = (v: number) => Math.round(v || 0).toLocaleString(nf) + " €";

  const maison = maisonComplete(ctx.neuf);
  const cp = ctx.codePostal ?? "";
  const reg = regionCoef(cp);
  const zone = d.rapide.zones[reg.zone] ?? reg.zone;
  // Les libellés que le particulier a cliqués : ceux des deux rapides, communs depuis N13.
  const finLabel = (ctx.finition && d.rapide.finitions[ctx.finition as Finition]?.label) || "—";
  const quiLabel = (reponses.qui && d.rapide.quis[reponses.qui]?.label) || "—";
  const s = n.saisie;
  const garageLabel = maison.garage > 0 ? s.garageOui(Math.round(maison.garage).toLocaleString(nf)) : s.garageNon;
  const eauxLabel = s.eaux[maison.assainissement] ?? s.eaux.collectif;

  // Un gratuit ne reçoit PAS le détail dans le HTML (le flou n'est que du CSS) : des lignes factices
  // (barres grises, « ••• € ») sous un cadenas. Un Pro voit les vrais postes les plus lourds, en clair.
  const dv = isPro ? buildDevis(catalogueDe(ctx), ctx, sel) : null;
  const taches = dv ? tachesParCle(ctx) : null;
  const tri = dv ? [...dv.lignes].filter((li) => li.ttc > 0).sort((a, b) => b.ttc - a.ttc) : [];
  const top = dv
    ? tri.slice(0, 5).map((li) => ({ k: li.cle, nom: catLigneCourte(locale, li.nom, li.cle, taches?.get(li.cle)), v: eur(li.ttc) }))
    : [62, 48, 55, 40, 50].map((w, i) => ({ k: "f" + i, nom: <span className="fake" style={{ width: w + "%" }} />, v: "••• €" }));
  const autresTtc = tri.slice(5).reduce((s, li) => s + li.ttc, 0);

  const lignes = (
    <>
      {top.map((li, i) => (
        <div className="lrow" key={li.k}>
          <span className="dot" style={{ background: SEG[i] ?? SEG[SEG.length - 1] }} />
          <span className="nm">{li.nom}</span>
          <span className="lv">{li.v}</span>
        </div>
      ))}
      <div className="lrow"><span className="dot" style={{ background: SEG[SEG.length - 1] }} /><span className="nm">{t.autres}</span> <span className="lv">{dv && autresTtc > 0 ? eur(autresTtc) : "…"}</span></div>
    </>
  );

  const ctaHref = isPro ? `/projets/${projectId}/modifier` : "/tarifs?source=affiner-neuf";
  const ctaLabel = isPro ? t.affiner : t.passPro;

  return (
    <div className="av-rn">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <p className="text-[15px] text-muted -mt-2 mb-4">{t.sub}</p>

      <BilanRapideNeuf ctx={ctx} sel={sel} qui={reponses.qui} locale={locale} reel={isPro} beta={beta} />

      <div className="sec">{t.resume}</div>
      <div className="recap">
        <div className="item"><span className="ic" aria-hidden="true">🏠</span><div><div className="k">{t.maisonK}</div><div className="v">{n.maisonNeuve} · <span className="data">{maison.surface}</span> m² · {n.niveauxCourt[maison.niveaux] ?? n.niveauxCourt.pp}</div></div></div>
        <div className="item"><span className="ic" aria-hidden="true">📍</span><div><div className="k">{t.locK}</div><div className="v">{cp || "—"}{cp && reg.zone ? ` · ${zone}` : ""}</div></div></div>
        <div className="item"><span className="ic" aria-hidden="true">✨</span><div><div className="k">{t.finitionK}</div><div className="v">{finLabel}</div></div></div>
        <div className="item"><span className="ic" aria-hidden="true">👷</span><div><div className="k">{t.quiK}</div><div className="v">{quiLabel}</div></div></div>
        <div className="item"><span className="ic" aria-hidden="true">🚗</span><div><div className="k">{t.garageK}</div><div className="v">{garageLabel}</div></div></div>
        <div className="item"><span className="ic" aria-hidden="true">💧</span><div><div className="k">{t.eauxK}</div><div className="v">{eauxLabel}</div></div></div>
      </div>

      <div className="sec">{isPro ? t.detailProK : t.detailK} <span className="pro-chip">{beta ? d.beta.pastille : "Pro"}</span></div>
      {isPro ? (
        // Un Pro : ses postes les plus lourds en clair, sans cadenas (comme la répartition de la rénovation).
        <div className="repart">{lignes}</div>
      ) : (
        <div className="teaser">
          <div className="inside" aria-hidden="true">{lignes}</div>
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
      )}

      {!readOnly && (
        <div className="actions">
          <Link href={ctaHref} className="btn btn-primary py-2.5">{ctaLabel}</Link>
          <Link href="/projets/nouveau?nature=neuf" className="btn btn-outline py-2.5">{t.refaire}</Link>
        </div>
      )}

      <p className="note">{t.margeInfo}</p>
    </div>
  );
}
