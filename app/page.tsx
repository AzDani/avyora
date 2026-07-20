import Link from "next/link";
import AnimationNeuf from "@/components/AnimationNeuf";
import AnimationReno from "@/components/AnimationReno";

export default function Accueil() {
  return (
    <div className="space-y-12">
      {/* Héros — construction neuve */}
      <section className="animate-rise relative overflow-hidden rounded-panel bg-gradient-to-br from-[#1E1B4B] via-[#241f5e] to-[#191640] p-8 text-white shadow-hero sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#7C3AED]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[#4F46E5]/20 blur-3xl"
        />
        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              Copilote travaux &amp; investissement
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl">
              Sache ce que ça coûte.
              <br />
              <span className="text-white/55">Avant de signer.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-indigo-100/80">
              Estimation par corps d&apos;état au prix du marché français, analyse de devis, métré
              automatique, suivi de chantier et rentabilité — pour la rénovation comme la construction neuve.
            </p>
            <div className="mt-7">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/projets/nouveau" className="btn btn-primary px-6 py-3.5 text-[15px]">
                  Estimer mon projet
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/projets" className="text-sm font-medium text-indigo-200/80 transition-colors hover:text-white">
                  Voir mes projets →
                </Link>
              </div>
              <p className="mt-3.5 text-xs text-indigo-200/60">≈ 2 min · gratuit · sans compte</p>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <HeroStat value="78" label="postes de prix · 2026" />
              <HeroStat value="±15 %" label="précision détaillée" />
              <HeroStat value="Gratuit" label="pour commencer" />
            </dl>
          </div>
          <div>
            <div className="overflow-hidden rounded-card border border-white/10 bg-white/[0.03] p-2">
              <AnimationNeuf />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-indigo-200/80">
                <span className="font-semibold text-white">Construction neuve</span> — du terrassement aux
                finitions, chiffrée pièce par pièce.
              </p>
              <Link
                href="/projets/nouveau"
                className="shrink-0 text-xs font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"
              >
                Estimer →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section rénovation */}
      <section className="card overflow-hidden p-8 sm:p-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="overflow-hidden rounded-card bg-surface-2 p-2">
              <AnimationReno />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="eyebrow">Rénovation</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
              De la maison fatiguée au bien qui rapporte.
            </h2>
            <ul className="mt-5 space-y-3.5">
              {[
                "Questionnaire expert : terre battue, plâtre abîmé, humidité — on chiffre la vraie chaîne de travaux, pas une moyenne.",
                "Métré automatique depuis tes pièces ou ton plan : murs, sols, plafonds, plinthes, faïence.",
                "Analyse de devis : oublis détectés, prix comparés au marché, questions à poser avant de signer.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3 7.5 5.8 10 11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/projets/nouveau" className="btn btn-primary mt-7 px-5 py-3">
              Estimer une rénovation
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section>
        <p className="eyebrow">La plateforme</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">L&apos;OS de l&apos;immobilier</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          Tous les modules dont tu as besoin, dans l&apos;ordre où ils te servent.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODULES.map((m) => (
            <div
              key={m.num}
              className={`card p-4 ${m.statut === "actif" ? "card-interactive" : "opacity-75"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="data grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600">
                    {m.num}
                  </span>
                  <span className="text-sm font-semibold text-ink">{m.titre}</span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    m.statut === "actif"
                      ? "bg-positive-soft text-positive"
                      : "bg-surface-2 text-faint"
                  }`}
                >
                  {m.statut === "actif" ? "Actif" : "À venir"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="data text-2xl font-semibold text-white">{value}</dd>
      <dt className="mt-1 text-[11px] leading-tight text-indigo-200/60">{label}</dt>
    </div>
  );
}

const MODULES: { num: number; titre: string; desc: string; statut: "actif" | "a_venir" }[] = [
  { num: 4, titre: "Assistant rénovation & construction", desc: "Estimation par corps d'état (réno + neuf), métré automatique, questionnaire expert.", statut: "actif" },
  { num: 6, titre: "Analyse des devis", desc: "Lecture du devis, oublis détectés, prix comparés, note et questions à poser.", statut: "actif" },
  { num: 3, titre: "Business plan immobilier", desc: "Frais, financement, rentabilité, cash-flow, création de valeur, ROI.", statut: "actif" },
  { num: 5, titre: "Gestion intelligente du budget", desc: "Prévu vs réel par corps d'état, alertes de dépassement, prévision finale.", statut: "actif" },
  { num: 7, titre: "Conducteur de travaux", desc: "Plan de chantier ordonné, suivi des tâches, avancement.", statut: "actif" },
  { num: 2, titre: "Analyse avant achat", desc: "DPE, année de construction : risques réglementaires et diagnostics à prévoir.", statut: "actif" },
  { num: 9, titre: "Matériaux & fournitures", desc: "Liste de courses générée depuis ton estimation : quantités, chutes, consommables.", statut: "actif" },
  { num: 8, titre: "Carnet artisans", desc: "Ton réseau d'artisans par corps d'état, sous la main pour chaque chantier.", statut: "actif" },
  { num: 10, titre: "Après travaux", desc: "Valeur estimée du bien rénové, loyer visé, annonce prête à publier.", statut: "actif" },
  { num: 1, titre: "Recherche immobilière IA", desc: "Analyse d'annonces, prix réel, potentiel après rénovation.", statut: "a_venir" },
];
