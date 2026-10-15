import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/forms";
import { EstimationRappel } from "@/components/auth/EstimationRappel";
import { PlanRappel } from "@/components/plans/PlanRappel";
import { FEATURES } from "@/lib/features";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { cheminInterne } from "@/lib/next-url";
import { betaActive, lireSourceBeta } from "@/lib/beta";
import { BandeauBeta } from "@/components/BandeauBeta";
import { SuiviVue } from "@/components/SuiviVue";

export const metadata = { title: "Créer un compte", robots: { index: false, follow: true } };

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; source?: string }>;
}) {
  // `next` porte l'intention avec laquelle le visiteur arrive ici — typiquement le plan qu'il
  // vient de choisir sur /tarifs. Il doit survivre à TOUTES les sorties de cette page : le
  // formulaire, le lien « déjà un compte », et la redirection d'un utilisateur déjà connecté.
  const [{ next, source: sourceDemandee }, { t: tr, locale }, user] = await Promise.all([searchParams, getT(), getUser()]);
  if (user) redirect(cheminInterne(next));
  const t = tr.auth;
  const suite = next ? `?next=${encodeURIComponent(next)}` : "";
  // Bêta gratuite (lib/beta.ts) : l'encart « tout est gratuit, il suffit d'un compte » ; venu d'une fonction
  // de la bêta (`source`, liste fermée), le titre le dit d'emblée et l'arrivée est mesurée par source.
  const beta = betaActive();
  const source = beta ? lireSourceBeta(sourceDemandee) : undefined;

  return (
    <AuthShell
      eyebrow={source ? tr.beta.inscriptionEyebrow : t.inEyebrow}
      titre={source ? tr.beta.inscriptionTitre : t.inTitre}
      sousTitre={t.inSous}
      bas={
        <>
          {t.inBasAvant}
          <Link href={`/connexion${suite}`} className="font-medium text-brand-600 hover:underline">
            {t.inBasLien}
          </Link>
        </>
      }
    >
      {/* Arrivée depuis l'éditeur (drapeau ou next=/plan) : le rappel du plan. Sinon il ne rend rien. */}
      {FEATURES.plans && <PlanRappel next={next} />}
      <EstimationRappel />
      {beta && <BandeauBeta locale={locale} />}
      {source && <SuiviVue evenement="vers_inscription" props={{ source }} cle={source} />}
      <SignupForm next={next} />
    </AuthShell>
  );
}
