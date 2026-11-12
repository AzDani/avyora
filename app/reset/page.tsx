import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetRequestForm } from "@/components/auth/forms";
import { getT } from "@/lib/i18n/server";
import { metaSelonLangue } from "@/lib/i18n/meta";

/** Dans la langue de la page, comme /connexion (revue anglais, constats 86 et 121). */
export async function generateMetadata() {
  const { locale, t } = await getT();
  return metaSelonLangue(locale, { title: t.auth.reset.metaTitre, robots: { index: false, follow: true } }, { title: t.auth.reset.metaTitre });
}

export default async function ResetPage() {
  const t = (await getT()).t.auth.reset;
  return (
    <AuthShell
      eyebrow={t.eyebrow}
      titre={t.titre}
      sousTitre={t.sous}
      bas={
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          {t.retour}
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
