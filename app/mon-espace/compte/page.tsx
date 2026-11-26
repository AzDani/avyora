import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, aUnAbonnementStripe } from "@/lib/auth";
import { betaActive, estMembreFondateur, libellesBeta } from "@/lib/beta";
import { PastilleFondateur } from "@/components/BandeauBeta";
import CompteActions from "@/components/CompteActions";
import AbonnementSection from "@/components/AbonnementSection";
import UsernameForm from "@/components/UsernameForm";
import OnboardingForm from "@/components/OnboardingForm";
import ChoixTypeCompte from "@/components/compte/ChoixTypeCompte";
import PasserEnPro from "@/components/compte/PasserEnPro";
import PhotoProfil from "@/components/compte/PhotoProfil";
import { initialeDe, photoDuCompte } from "@/lib/compte/photo";
import { typeCompte } from "@/lib/compte/type";
import type { ProfilData } from "@/lib/actions/profil";
import { getLocale } from "@/lib/i18n/server";

const TR = {
  fr: {
    metaTitle: "Mon compte", // le gabarit du layout ajoute « · AVYORA »
    projets: "Mes projets",
    eyebrow: "Compte & confidentialité",
    titre: "Mon compte",
    sous: "Gère ton compte, télécharge ou supprime tes données.",
  },
  en: {
    metaTitle: "My account",
    projets: "My projects",
    eyebrow: "Account & privacy",
    titre: "My account",
    sous: "Manage your account, download or delete your data.",
  },
} as const;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: TR[locale].metaTitle, robots: { index: false, follow: false } };
}

export default async function ComptePage() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/mon-espace/compte");
  const profil = (user.user_metadata?.profil ?? undefined) as Partial<ProfilData> | undefined;
  const type = typeCompte(user);
  const pro = (user.user_metadata?.pro ?? null) as { societe?: string } | null;
  const username = (user.user_metadata?.username ?? "") as string;
  const locale = await getLocale();
  const s = TR[locale];
  // Bêta gratuite (lib/beta.ts) : la pastille de membre fondateur (sans avantage tarifaire), la date de fin de la bêta.
  const fondateur = estMembreFondateur(user);
  const libelles = libellesBeta(locale);
  // Abonnement résilié qui court encore : le webhook a noté la date de fin (lib/stripe-abonnement.ts › finPrevue).
  const finBrute = (user.app_metadata as { stripe_fin_le?: unknown } | undefined)?.stripe_fin_le;
  const finLe =
    typeof finBrute === "string" && !Number.isNaN(Date.parse(finBrute))
      ? new Date(finBrute).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Paris",
        })
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="animate-rise">
        <Link href="/projets" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {s.projets}
        </Link>
        <p className="eyebrow mt-3">{s.eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{s.titre}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{s.sous}</p>
        {fondateur && <p className="mt-3"><PastilleFondateur locale={locale} /></p>}
      </header>

      {/* La photo de profil (26/11/2026) : dans « Mon espace » et, pour un artisan, sur sa fiche du réseau. */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="photo-profil">
        <h2 id="photo-profil" className="mb-3 text-[17px] font-semibold text-ink">{locale === "en" ? "Profile photo" : "Photo de profil"}</h2>
        <PhotoProfil url={photoDuCompte(user)} initiale={initialeDe(String(user.user_metadata?.nom || user.email || "?"))} />
      </section>

      {/* L'abonnement, pas les droits : pendant la bêta, un inscrit est Pro sans rien avoir à gérer ni résilier. */}
      <AbonnementSection
        isPro={aUnAbonnementStripe(user)}
        {...(betaActive() ? { beta: { fin: libelles.fin } } : {})}
        fondateur={fondateur}
        finLe={finLe}
      />

      <UsernameForm initial={username} />

      {/* Particulier ou pro (26/11/2026) : un particulier passe en compte pro avec un SIRET du bâtiment vérifié. */}
      <section id="pro" className="scroll-mt-28 rounded-3xl border border-line bg-surface p-5 sm:p-6" lang="fr">
        <h2 className="text-[17px] font-semibold text-ink">Type de compte</h2>
        {type === "pro" ? (
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
            <b className="text-ink">Professionnel du bâtiment</b>
            {pro?.societe ? ` · ${pro.societe}` : ""}. Tu as tous les outils d&apos;AVYORA, et tu peux rejoindre le Réseau AVYORA :{" "}
            <Link href="/espace-artisan" className="font-semibold text-brand-700 hover:underline">ton espace artisan</Link>.
          </p>
        ) : type === "particulier" ? (
          <>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
              <b className="text-ink">Particulier</b>. Tu es un professionnel du bâtiment ? Passe en compte pro pour pouvoir rejoindre le Réseau AVYORA : tu gardes les mêmes outils.
            </p>
            <details className="mt-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-semibold text-brand-700">Passer en compte professionnel</summary>
              <div className="mt-3"><PasserEnPro nomInitial={typeof user.user_metadata?.nom === "string" ? user.user_metadata.nom : ""} /></div>
            </details>
          </>
        ) : (
          <div className="mt-3"><ChoixTypeCompte titre={false} /></div>
        )}
      </section>

      <OnboardingForm contexte="compte" initial={profil} />

      <CompteActions email={user.email ?? ""} />
    </div>
  );
}
