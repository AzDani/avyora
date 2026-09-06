import Link from "next/link";
import BoutonAbo from "@/components/BoutonAbo";
import BoutonCheckout from "@/components/BoutonCheckout";
import { getUser, estPro } from "@/lib/auth";

export const metadata = { title: "Passer Pro — AVYORA" };
export const dynamic = "force-dynamic";

const PRO_FEATURES = [
  "Estimateur détaillé — les 173 postes, au poste près",
  "Choix fait-faire / je fais sur chaque tâche",
  "Export du rapport PDF (banque, artisans)",
  "Sauvegarde de tous tes projets",
  "Suivi de chantier, poste par poste",
];

const PLANS = [
  { key: "mensuel", nom: "Mensuel", prix: "18,85 €", base: "29 €", off: "−35 %", unite: "/ mois", note: "Sans engagement", tag: "" },
  { key: "annuel-mois", nom: "Annuel, payé au mois", prix: "16,15 €", base: "19 €", off: "−15 %", unite: "/ mois", note: "Engagement 12 mois", tag: "" },
  { key: "annuel", nom: "Annuel, payé d'un coup", prix: "169 €", base: "199 €", off: "−15 %", unite: "/ an", note: "≈ 14,08 € / mois", tag: "Meilleur prix", featured: true },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function TarifsPage() {
  const user = await getUser();
  const dejaPro = estPro(user);

  return (
    <div className="animate-rise mx-auto max-w-4xl py-4 sm:py-8">
      <header className="text-center">
        <p className="eyebrow">AVYORA Pro</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Passe à l'estimation détaillée</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          L'estimation rapide reste <b className="text-ink">gratuite</b>. Pro débloque le détail au poste près,
          le rapport PDF, la sauvegarde et le suivi de chantier.
        </p>
      </header>

      <div className="mt-6 overflow-hidden rounded-panel bg-gradient-to-r from-[#4F46E5] via-[#6d5cf0] to-[#7C3AED] px-6 py-5 text-center text-white shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-100/90">Offre de lancement</div>
        <div className="mt-1 text-[20px] font-semibold tracking-tight">Jusqu'à −35 % pour les premiers abonnés</div>
        <div className="mt-1 text-[13.5px] text-indigo-100/85">Tarifs réduits, pour une durée limitée.</div>
      </div>

      {dejaPro && (
        <p className="mx-auto mt-6 max-w-md rounded-field border border-positive/25 bg-positive-soft px-4 py-3 text-center text-sm text-positive">
          Tu es déjà Pro — <Link href="/projets/nouveau/detaille" className="font-semibold underline">ouvrir l'estimateur détaillé</Link>.
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className={
              "relative flex flex-col rounded-panel border bg-surface p-6 " +
              (p.featured ? "border-brand-600 shadow-card ring-1 ring-brand-600/15" : "border-line")
            }
          >
            {p.tag && (
              <span
                className={
                  "absolute -top-2.5 right-5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide " +
                  (p.featured ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700")
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
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{p.off} lancement</span>
            </div>
            <div className="mt-1.5 text-xs text-faint">{p.note}</div>
            <div className="mt-5">
              {user ? (
                <BoutonCheckout plan={p.key} />
              ) : (
                <BoutonAbo plan={p.key} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl rounded-panel border border-line bg-surface p-6">
        <div className="eyebrow mb-3">Inclus dans Pro</div>
        <ul className="space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink">
              <Check />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        {user ? (
          <>Le paiement en ligne arrive très bientôt. En attendant, </>
        ) : (
          <>Déjà un compte ? <Link href="/connexion" className="font-medium text-brand-600 hover:underline">Se connecter</Link>. Ou </>
        )}
        <Link href="/projets/nouveau" className="font-medium text-brand-600 hover:underline">continuer avec l'estimation rapide gratuite</Link>.
      </p>
    </div>
  );
}
