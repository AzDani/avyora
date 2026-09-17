import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/forms";
import { EstimationRappel } from "@/components/auth/EstimationRappel";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { cheminInterne } from "@/lib/next-url";

export const metadata = { title: "Créer un compte", robots: { index: false, follow: true } };

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // `next` porte l'intention avec laquelle le visiteur arrive ici — typiquement le plan qu'il
  // vient de choisir sur /tarifs. Il doit survivre à TOUTES les sorties de cette page : le
  // formulaire, le lien « déjà un compte », et la redirection d'un utilisateur déjà connecté.
  const [{ next }, { t: tr }, user] = await Promise.all([searchParams, getT(), getUser()]);
  if (user) redirect(cheminInterne(next));
  const t = tr.auth;
  const suite = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthShell
      eyebrow={t.inEyebrow}
      titre={t.inTitre}
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
      <EstimationRappel />
      <SignupForm next={next} />
    </AuthShell>
  );
}
