import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/forms";
import { EstimationRappel } from "@/components/auth/EstimationRappel";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Créer un compte — AVYORA" };

export default async function InscriptionPage() {
  if (await getUser()) redirect("/projets");

  return (
    <AuthShell
      eyebrow="Bienvenue"
      titre="Créer un compte"
      sousTitre="Sauvegarde tes estimations et suis tes chantiers dans le temps."
      bas={
        <>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <EstimationRappel />
      <SignupForm />
    </AuthShell>
  );
}
