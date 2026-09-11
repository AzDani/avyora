import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, estPro } from "@/lib/auth";
import CompteActions from "@/components/CompteActions";
import AbonnementSection from "@/components/AbonnementSection";
import OnboardingForm from "@/components/OnboardingForm";
import type { ProfilData } from "@/lib/actions/profil";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte — AVYORA" };

export default async function ComptePage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/mon-espace/compte");
  const profil = (user.user_metadata?.profil ?? undefined) as Partial<ProfilData> | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="animate-rise">
        <Link href="/projets" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mes projets
        </Link>
        <p className="eyebrow mt-3">Compte &amp; confidentialité</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Mon compte</h1>
        <p className="mt-1.5 text-[15px] text-muted">Gère ton compte et la suppression de tes données.</p>
      </header>

      <AbonnementSection isPro={estPro(user)} />

      <OnboardingForm contexte="compte" initial={profil} />

      <CompteActions email={user.email ?? ""} />
    </div>
  );
}
