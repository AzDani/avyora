import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { UpdatePasswordForm } from "@/components/auth/forms";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Nouveau mot de passe — AVYORA" };

/**
 * Atterrissage après clic sur le lien de l'email (la route /auth/callback a échangé le code
 * contre une session de récupération). Sans session, on renvoie vers la demande de reset.
 */
export default async function DefinirMotDePassePage() {
  if (!(await getUser())) redirect("/reset");

  return (
    <AuthShell
      eyebrow="Presque fini"
      titre="Définis ton mot de passe"
      sousTitre="Choisis un nouveau mot de passe pour sécuriser ton compte."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
