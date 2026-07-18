import Link from "next/link";
import AnimationNeuf from "@/components/AnimationNeuf";
import AnimationReno from "@/components/AnimationReno";

export default function Accueil() {
  return (
    <div className="space-y-10">
      {/* Héros — construction neuve */}
      <section className="rounded-3xl bg-[#1E1B4B] text-white p-6 sm:p-10 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#A78BFA] font-semibold">
              Copilote travaux & investissement
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">
              Sache ce que ça coûte.
              <br />
              Avant de signer.
            </h1>
            <p className="mt-4 text-indigo-200/90 text-sm sm:text-base leading-relaxed">
              Estimation par corps d&apos;état au prix du marché français, analyse
              de devis, métré automatique, suivi de chantier et rentabilité —
              pour la rénovation comme la construction neuve.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/projets/nouveau"
                className="rounded-lg bg-[#4F46E5] px-5 py-2.5 font-medium text-white hover:bg-[#4338CA]"
              >
                Estimer mon projet
              </Link>
              <Link
                href="/projets"
                className="rounded-lg border border-indigo-300/40 px-5 py-2.5 font-medium text-indigo-100 hover:border-indigo-300"
              >
                Mes projets
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-indigo-200/70">
              <span>78 postes de prix France 2026</span>
              <span>±15 % en mode détaillé</span>
              <span>Gratuit pour commencer</span>
            </div>
          </div>
          <div>
            <AnimationNeuf />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-indigo-200/80">
                <span className="font-semibold text-white">Construction neuve</span>{" "}
                — du terrassement aux finitions, chiffrée pièce par pièce.
              </p>
              <Link
                href="/projets/nouveau"
                className="shrink-0 text-xs font-medium text-[#A78BFA] hover:text-[#C4B5FD]"
              >
                Estimer une construction →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section rénovation */}
      <section className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-10 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <AnimationReno />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[#4F46E5] font-semibold">
              Rénovation
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold leading-tight text-slate-900">
              De la maison fatiguée au bien qui rapporte.
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#4F46E5] font-bold">·</span>
                Questionnaire expert : terre battue, plâtre abîmé, humidité — on
                chiffre la vraie chaîne de travaux, pas une moyenne.
              </li>
              <li className="flex gap-2">
                <span className="text-[#4F46E5] font-bold">·</span>
                Métré automatique depuis tes pièces ou ton plan : murs, sols,
                plafonds, plinthes, faïence.
              </li>
              <li className="flex gap-2">
                <span className="text-[#4F46E5] font-bold">·</span>
                Analyse de devis : oublis détectés, prix comparés au marché,
                questions à poser avant de signer.
              </li>
            </ul>
            <Link
              href="/projets/nouveau"
              className="mt-6 inline-block rounded-lg bg-[#4F46E5] px-5 py-2.5 font-medium text-white hover:bg-[#4338CA]"
            >
              Estimer une rénovation
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section>
        <h2 className="font-semibold text-lg mb-1">La plateforme AVYORA</h2>
        <p className="text-sm text-slate-500 mb-3">
          L&apos;OS de l&apos;immobilier et de la rénovation — les modules
          arrivent dans l&apos;ordre où ils te servent.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {MODULES.map((m) => (
            <div
              key={m.num}
              className={`rounded-xl border p-3.5 ${
                m.statut === "actif"
                  ? "border-indigo-200 bg-white"
                  : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  <span className="text-slate-400 mr-1.5">M{m.num}</span>
                  {m.titre}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    m.statut === "actif"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {m.statut === "actif" ? "Actif" : "À venir"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>
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
