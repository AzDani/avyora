import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { typeCompte } from "@/lib/compte/type";
import { MAX_ARTISANS } from "@/lib/reseau/demande";
import { MemeCompte } from "@/components/compte/Communs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rejoins le Réseau AVYORA", robots: { index: false, follow: false } };

/**
 * Juste après le questionnaire du pro (26/11/2026) : ce qu'il gagne à rejoindre le Réseau AVYORA, puis sa candidature
 * (déjà préremplie). Les gains restent vérifiables : aucun volume de demandes promis, aucun chiffre inventé.
 */
const GAINS: [string, string, string][] = [
  ["💶", "Des clients qui ont un budget", "Chaque demande arrive avec l'estimation AVYORA du client : surfaces, postes, montant. Pas de curieux sans projet."],
  ["🎯", `${MAX_ARTISANS} artisans au plus par demande`, `Le client choisit jusqu'à ${MAX_ARTISANS} artisans de son département. Pas d'enchère à 10 devis.`],
  ["⭐", "Ta réputation mise en avant", "Ta fiche, ta galerie de chantiers et des avis vérifiés de vrais clients, auxquels tu peux répondre."],
  ["🤝", "Toi qui décides, sans commission", "Tu acceptes ou refuses chaque demande. Aucune commission sur tes chantiers, gratuit pendant le lancement."],
];

export default async function OnboardingReseau() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/onboarding/reseau");
  if (typeCompte(user) !== "pro") redirect("/onboarding");
  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2" lang="fr">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] to-[#2d2880] p-6 text-white sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.35),transparent_70%)]" />
        <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[#a78bfa]">Réseau AVYORA · pour les pros du bâtiment</p>
        <h1 className="mt-2 max-w-[24ch] text-[25px] font-semibold leading-tight tracking-tight [text-wrap:balance] sm:text-[30px]">Des clients prêts à lancer leurs travaux, qui viennent à toi avec leur budget</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[#d4d1fb]">
          Les clients d&apos;AVYORA ont déjà chiffré leur projet poste par poste avant de te contacter. Ils savent ce qu&apos;ils veulent et ce que ça coûte : tu passes ton temps sur des devis qui ont une chance d&apos;être signés.
        </p>
        <ul className="relative mt-5 grid gap-2.5 sm:grid-cols-2">
          {GAINS.map(([ic, t, d]) => (
            <li key={t} className="rounded-2xl border border-white/15 bg-white/[.07] p-4">
              <span aria-hidden="true" className="mb-2 inline-grid h-8 w-8 place-items-center rounded-[9px] bg-[#a78bfa]/25 text-[15px]">{ic}</span>
              <span className="block text-[14.5px] font-semibold">{t}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[#c9c6f5]">{d}</span>
            </li>
          ))}
        </ul>
        <p className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#c9c6f5]">
          {["SIRET actif", "Assurance décennale", "Photos de chantiers", "Un appel avec Daniel"].map((x) => <span key={x}><span className="font-bold text-[#a78bfa]">✓</span> {x}</span>)}
        </p>
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <Link href="/espace-artisan" className="btn min-h-11 bg-white px-5 text-[#1e1b4b] hover:bg-brand-50">Rejoindre le réseau · 10 minutes</Link>
          <Link href="/projets" className="text-[14px] font-semibold text-[#d4d1fb] underline">Plus tard</Link>
        </div>
      </section>
      <div className="rounded-3xl border border-line bg-surface p-5">
        <p className="text-[14.5px] font-semibold text-ink">Ta candidature est déjà commencée</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">Société, nom, portable, métier et SIRET sont repris de ton inscription. Il te reste : tes autres métiers, tes départements, ta décennale et 3 photos de chantiers.</p>
      </div>
      <MemeCompte pro />
    </div>
  );
}
