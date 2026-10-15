import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AccesParLien } from "@/components/auth/AccesLien";
import { FEATURES } from "@/lib/features";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { cheminInterne } from "@/lib/next-url";

export const metadata = { title: "Connexion", robots: { index: false, follow: true } };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  const [{ next: nextDemande, erreur }, { t: tr }, user] = await Promise.all([searchParams, getT(), getUser()]);
  // Déjà connecté (un second clic sur le lien, un onglet resté ouvert) : directement à l'intention.
  if (user) redirect(cheminInterne(nextDemande));
  const next = nextDemande ? cheminInterne(nextDemande, "") || undefined : undefined;
  const t = tr.auth;
  const suite = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthShell
      eyebrow={t.cxEyebrow}
      titre={t.cxTitre}
      sousTitre={t.cxSous}
      bas={
        <>
          {t.cxBasAvant}
          <Link href={`/inscription${suite}`} className="font-medium text-brand-600 hover:underline">
            {t.cxBasLien}
          </Link>
        </>
      }
    >
      {/* Retour de /auth/callback ou de /auth/confirmer : le lien a déjà servi, a expiré, a été remplacé, ou (PKCE) a été ouvert dans un autre navigateur. */}
      {erreur === "lien_invalide" && (
        <p role="alert" className="mb-5 rounded-field border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm leading-relaxed text-ink" data-lien-invalide="">
          {t.lien.lienInvalide}
        </p>
      )}
      <AccesParLien page="connexion" next={next} google={FEATURES.authGoogle} />
    </AuthShell>
  );
}
