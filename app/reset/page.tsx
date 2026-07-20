import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetRequestForm } from "@/components/auth/forms";

export const metadata = { title: "Mot de passe oublié — AVYORA" };

export default function ResetPage() {
  return (
    <AuthShell
      eyebrow="Réinitialisation"
      titre="Mot de passe oublié"
      sousTitre="Entre ton email : on t'envoie un lien pour définir un nouveau mot de passe."
      bas={
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          ← Retour à la connexion
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
