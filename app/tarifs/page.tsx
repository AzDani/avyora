import Link from "next/link";
import BoutonAbo from "@/components/BoutonAbo";
import BoutonCheckout from "@/components/BoutonCheckout";
import { getUser, estPro } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Passer Pro — AVYORA" };
export const dynamic = "force-dynamic";

const PLAN_KEYS: { key: "mensuel" | "annuel-mois" | "annuel"; featured?: boolean }[] = [
  { key: "mensuel" },
  { key: "annuel", featured: true },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function TarifsPage() {
  const [user, { t: tr }] = await Promise.all([getUser(), getT()]);
  const t = tr.tarifs;
  const dejaPro = estPro(user);

  return (
    <div className="animate-rise mx-auto max-w-4xl py-4 sm:py-8">
      <header className="text-center">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">{t.titre}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {t.subAvant}<b className="text-ink">{t.subFort}</b>{t.subApres}
        </p>
      </header>

      <div className="mt-6 overflow-hidden rounded-panel bg-gradient-to-r from-[#4F46E5] via-[#6d5cf0] to-[#7C3AED] px-6 py-5 text-center text-white shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100/90">{t.lancTag}</div>
        <div className="mt-1 text-[20px] font-semibold tracking-tight">{t.lancTitre}</div>
        <div className="mt-1 text-[13.5px] text-indigo-100/85">{t.lancSous}</div>
      </div>

      {dejaPro && (
        <p className="mx-auto mt-6 max-w-md rounded-field border border-positive/25 bg-positive-soft px-4 py-3 text-center text-sm text-positive">
          {t.dejaProAvant}<Link href="/projets/nouveau/detaille" className="font-semibold underline">{t.dejaProLien}</Link>.
        </p>
      )}

      <div className="mx-auto mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
        {PLAN_KEYS.map(({ key, featured }) => {
          const p = t.plans[key];
          return (
            <div
              key={key}
              className={
                "relative flex flex-col rounded-panel border bg-surface p-6 " +
                (featured ? "border-brand-600 shadow-card ring-1 ring-brand-600/15" : "border-line")
              }
            >
              {p.tag && (
                <span
                  className={
                    "absolute -top-2.5 right-5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide " +
                    (featured ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700")
                  }
                >
                  {p.tag}
                </span>
              )}
              <div className="text-sm font-semibold text-ink">{p.nom}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="data text-3xl font-semibold text-ink">{p.prix}</span>
                <span className="text-sm text-muted">{p.unite}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[16px] font-semibold text-muted line-through decoration-[1.5px]">{p.base}</span>
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{p.off} {t.offSuffix}</span>
              </div>
              <div className="mt-1.5 text-xs text-faint">{p.note}</div>
              <div className="mt-5">{user ? <BoutonCheckout plan={key} /> : <BoutonAbo plan={key} />}</div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-xl rounded-panel border border-line bg-surface p-6">
        <div className="eyebrow mb-3">{t.inclus}</div>
        <ul className="space-y-2.5">
          {t.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
              <Check />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        {user ? (
          <>{t.paiementBientot}</>
        ) : (
          <>{t.dejaCompteAvant}<Link href="/connexion" className="font-medium text-brand-600 hover:underline">{t.seConnecter}</Link>{t.ou}</>
        )}
        <Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">{t.continuerGratuit}</Link>.
      </p>
    </div>
  );
}
