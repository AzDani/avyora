import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import OnboardingForm from "@/components/OnboardingForm";


export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Welcome" : "Bienvenue",
    // Page gatée : redirection après début du streaming → 200 à coquille vide pour un crawler.
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/onboarding");
  // Facultatives et posées une fois : un membre qui revient par un lien d'accès sans intention (B2) va à ses
  // projets, pas une seconde fois aux questions.
  if ((user.user_metadata as { onboarding_fait?: boolean } | undefined)?.onboarding_fait) redirect("/projets");
  return (
    <div className="py-2">
      <OnboardingForm />
    </div>
  );
}
