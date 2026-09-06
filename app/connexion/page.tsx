import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Connexion — AVYORA" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  if (await getUser()) redirect("/projets");
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Ton espace"
      titre="Connexion"
      sousTitre="Retrouve tes projets, estimations et devis."
      bas={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
