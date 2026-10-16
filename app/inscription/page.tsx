import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AccesParLien } from "@/components/auth/AccesLien";
import { EstimationRappel } from "@/components/auth/EstimationRappel";
import { PlanRappel } from "@/components/plans/PlanRappel";
import { FEATURES } from "@/lib/features";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { cheminInterne, premierParam } from "@/lib/next-url";
import { betaActive, lireSourceBeta } from "@/lib/beta";
import { BandeauBeta, PanneauBeta } from "@/components/BandeauBeta";
import { SuiviVue } from "@/components/SuiviVue";

export async function generateMetadata() {
  return { title: (await getT()).t.auth.metaInscription, robots: { index: false, follow: true } };
}

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; source?: string | string[] }>;
}) {
  // `next` porte l'intention avec laquelle le visiteur arrive ici — typiquement la fonction de la bêta qu'il
  // vient de toucher. Il doit survivre à TOUTES les sorties de cette page : le lien d'accès, le formulaire à
  // mot de passe, le lien « déjà un compte », et la redirection d'un utilisateur déjà connecté.
  const [sp, { t: tr, locale }, user] = await Promise.all([searchParams, getT(), getUser()]);
  // Un paramètre répété arrive en tableau : le premier compte.
  const nextDemande = premierParam(sp.next);
  const sourceDemandee = premierParam(sp.source);
  if (user) redirect(cheminInterne(nextDemande));
  // Une intention qui n'est pas un chemin interne est ignorée dès ici (l'action la revérifie de toute façon).
  const next = nextDemande ? cheminInterne(nextDemande, "") || undefined : undefined;
  const t = tr.auth;
  const suite = next ? `?next=${encodeURIComponent(next)}` : "";
  // Bêta gratuite (lib/beta.ts) : l'en-tête « gratuit jusqu'au… · deviens membre fondateur » et ses trois bénéfices, et
  // le même titre d'où que l'on vienne (« Bêta gratuite · Crée ton compte ») ; venu d'une fonction de la bêta (`source`,
  // liste fermée), l'arrivée est mesurée par source.
  const beta = betaActive();
  const source = beta ? lireSourceBeta(sourceDemandee) : undefined;

  return (
    <AuthShell
      eyebrow={beta ? tr.beta.inscriptionEyebrow : t.inEyebrow}
      titre={beta ? tr.beta.inscriptionTitre : t.inTitre}
      // Pendant la bêta, les bénéfices de l'en-tête disent déjà ce que le compte apporte : le champ e-mail remonte.
      sousTitre={beta ? undefined : t.inSous}
      // Sur ordinateur, la bêta est dans le panneau de marque, à côté du formulaire (le bouton reste au-dessus du pli).
      panneau={beta ? <PanneauBeta locale={locale} /> : undefined}
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
      {beta && <BandeauBeta locale={locale} className="lg:hidden" />}
      {source && <SuiviVue evenement="vers_inscription" props={{ source }} cle={source} />}
      <AccesParLien page="inscription" next={next} source={source} google={FEATURES.authGoogle} />
    </AuthShell>
  );
}
