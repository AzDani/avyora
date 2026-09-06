import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Connexion — AVYORA" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  if (await getUser()) redirect("/projets");
  const [{ next }, { t: tr }] = await Promise.all([searchParams, getT()]);
  const t = tr.auth;

  return (
    <AuthShell
      eyebrow={t.cxEyebrow}
      titre={t.cxTitre}
      sousTitre={t.cxSous}
      bas={
        <>
          {t.cxBasAvant}
          <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
            {t.cxBasLien}
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
