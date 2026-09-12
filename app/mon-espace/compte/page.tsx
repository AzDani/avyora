import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, estPro } from "@/lib/auth";
import CompteActions from "@/components/CompteActions";
import AbonnementSection from "@/components/AbonnementSection";
import OnboardingForm from "@/components/OnboardingForm";
import type { ProfilData } from "@/lib/actions/profil";
import { getLocale } from "@/lib/i18n/server";

const TR = {
  fr: {
    metaTitle: "Mon compte — AVYORA",
    projets: "Mes projets",
    eyebrow: "Compte & confidentialité",
    titre: "Mon compte",
    sous: "Gère ton compte et la suppression de tes données.",
  },
  en: {
    metaTitle: "My account — AVYORA",
    projets: "My projects",
    eyebrow: "Account & privacy",
    titre: "My account",
    sous: "Manage your account and the deletion of your data.",
  },
} as const;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: TR[locale].metaTitle };
}

export default async function ComptePage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/mon-espace/compte");
  const profil = (user.user_metadata?.profil ?? undefined) as Partial<ProfilData> | undefined;
  const locale = await getLocale();
  const s = TR[locale];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="animate-rise">
        <Link href="/projets" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {s.projets}
        </Link>
        <p className="eyebrow mt-3">{s.eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{s.titre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{s.sous}</p>
      </header>

      <AbonnementSection isPro={estPro(user)} />

      <OnboardingForm contexte="compte" initial={profil} />

      <CompteActions email={user.email ?? ""} />
    </div>
  );
}
