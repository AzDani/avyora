import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import OnboardingForm from "@/components/OnboardingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "Welcome — AVYORA" : "Bienvenue — AVYORA" };
}

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/onboarding");
  return (
    <div className="py-2">
      <OnboardingForm />
    </div>
  );
}
