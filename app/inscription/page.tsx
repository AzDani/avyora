import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/forms";
import { EstimationRappel } from "@/components/auth/EstimationRappel";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Créer un compte — AVYORA" };

export default async function InscriptionPage() {
  if (await getUser()) redirect("/projets");
  const { t: tr } = await getT();
  const t = tr.auth;

  return (
    <AuthShell
      eyebrow={t.inEyebrow}
      titre={t.inTitre}
      sousTitre={t.inSous}
      bas={
        <>
          {t.inBasAvant}
          <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
            {t.inBasLien}
          </Link>
        </>
      }
    >
      <EstimationRappel />
      <SignupForm />
    </AuthShell>
  );
}
