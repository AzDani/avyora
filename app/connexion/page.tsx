import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AccesParLien } from "@/components/auth/AccesLien";
import { FEATURES } from "@/lib/features";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { cheminInterne, premierParam } from "@/lib/next-url";
import { betaActive } from "@/lib/beta";

export async function generateMetadata() {
  return { title: (await getT()).t.auth.metaConnexion, robots: { index: false, follow: true } };
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; erreur?: string | string[] }>;
}) {
  const [sp, { t: tr }, user] = await Promise.all([searchParams, getT(), getUser()]);
  // Un paramètre répété arrive en tableau : le premier compte.
  const nextDemande = premierParam(sp.next);
  const erreur = premierParam(sp.erreur);
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
          {/* Pendant la bêta, le lien dit qu'il ne coûte rien (lib/beta.ts) ; après, « Créer un compte gratuit ». */}
          <Link href={`/inscription${suite}`} className="font-medium text-brand-600 hover:underline">
            {betaActive() ? tr.beta.cxBasLien : t.cxBasLien}
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
