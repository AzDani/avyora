import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { typeCompte } from "@/lib/compte/type";
import { afficherPortable } from "@/lib/telephone";
import ChoixTypeCompte from "@/components/compte/ChoixTypeCompte";
import QuestionnaireParticulier from "@/components/compte/QuestionnaireParticulier";
import QuestionnairePro from "@/components/compte/QuestionnairePro";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Welcome" : "Bienvenue",
    // Page gatée : redirection après début du streaming → 200 à coquille vide pour un crawler.
    robots: { index: false, follow: false },
  };
}

/**
 * La bienvenue (refonte du 26/11/2026) : 1) « Tu es… * » particulier ou pro (obligatoire, une fois, aussi pour les
 * comptes d'avant) ; 2) le questionnaire du particulier (prénom obligatoire) ou du pro (société, nom, portable, métier,
 * région) ; 3) un pro voit ensuite « Rejoins le Réseau AVYORA ». Un compte qui a déjà tout répondu va à ses projets.
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/onboarding");
  const meta = (user.user_metadata ?? {}) as { nom?: string; onboarding_fait?: boolean; profil?: { telephone?: string }; pro?: { societe?: string } };
  const type = typeCompte(user);
  const cadre = (enfant: React.ReactNode, etape: number) => (
    <div className="mx-auto max-w-2xl space-y-4 py-2" lang="fr">
      <div className="flex items-center gap-3 text-[12.5px] text-faint" aria-hidden="true">
        <span>Étape {etape} sur 2</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${etape * 50}%` }} /></span>
      </div>
      {enfant}
    </div>
  );

  if (!type) return cadre(<ChoixTypeCompte />, 1);
  if (type === "pro") {
    if (meta.pro?.societe) redirect("/projets");
    return cadre(<QuestionnairePro nomInitial={typeof meta.nom === "string" ? meta.nom : ""} telephoneInitial={meta.profil?.telephone ? afficherPortable(meta.profil.telephone) : ""} />, 2);
  }
  if (meta.onboarding_fait) redirect("/projets");
  return cadre(<QuestionnaireParticulier prenomInitial={typeof meta.nom === "string" ? meta.nom.split(" ")[0] : ""} />, 2);
}
