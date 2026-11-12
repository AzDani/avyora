import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { UpdatePasswordForm } from "@/components/auth/forms";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { metaSelonLangue } from "@/lib/i18n/meta";

/** Dans la langue de la page, comme /reset (revue anglais, constats 86 et 121). */
export async function generateMetadata() {
  const { locale, t } = await getT();
  return metaSelonLangue(locale, { title: t.auth.reset.definirMetaTitre, robots: { index: false, follow: true } }, { title: t.auth.reset.definirMetaTitre });
}

/**
 * Atterrissage après clic sur le lien de l'email (la route /auth/callback a échangé le code
 * contre une session de récupération). Sans session, on renvoie vers la demande de reset.
 */
export default async function DefinirMotDePassePage() {
  if (!(await getUser())) redirect("/reset");
  const t = (await getT()).t.auth.reset;

  return (
    <AuthShell eyebrow={t.definirEyebrow} titre={t.definirTitre} sousTitre={t.definirSous}>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
