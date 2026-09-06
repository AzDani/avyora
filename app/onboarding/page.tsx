import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import OnboardingForm from "@/components/OnboardingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bienvenue — AVYORA" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/onboarding");
  return (
    <div className="py-2">
      <OnboardingForm />
    </div>
  );
}
