import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser, estPro } from "@/lib/auth";
import { artisansDisponibles, demandesDuClient } from "@/lib/data/reseau";
import { placesRestantes } from "@/lib/reseau/demande";
import { labelMetier } from "@/lib/reseau/metiers";
import { nomDepartement } from "@/lib/reseau/departements";
import AjoutArtisans from "@/components/reseau/AjoutArtisans";

/**
 * Choisir un autre artisan pour une demande (phase 3) : à la place d'un refus ou d'un silence, dans la limite de
 * 3 en cours et 6 contactés. Seulement une demande DU COMPTE ; les artisans déjà contactés ne sont pas reproposés.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choisir un autre artisan · Réseau AVYORA", robots: { index: false, follow: false } };

export default async function AjouterArtisan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/demandes-devis/${id}/ajouter`)}`);
  if (!estPro(user)) redirect("/demandes-devis");
  const d = (await demandesDuClient(user.id).catch(() => [])).find((x) => x.id === id);
  if (!d) notFound();
  const places = placesRestantes(d.reponses.map((r) => r.statut));
  const dejaContactes = new Set(d.reponses.map((r) => r.artisan.id));
  const artisans = places > 0 ? (await artisansDisponibles(d.departement, d.metiers, user.id).catch(() => [])).filter((a) => !dejaContactes.has(a.id)) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2" lang="fr">
      <Link href="/demandes-devis" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand-700">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Mes demandes de devis
      </Link>
      <div>
        <p className="eyebrow">Réseau AVYORA</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Choisir un autre artisan</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">{d.metiers.map(labelMetier).join(", ")} · {nomDepartement(d.departement)} ({d.code_postal})</p>
      </div>
      {places === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-5 text-[14px] text-muted">
          Cette demande a déjà le nombre maximum d&apos;artisans (3 en cours, 6 contactés au total). Pour d&apos;autres travaux, fais une nouvelle demande.
        </p>
      ) : artisans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-[14px] text-muted">
          Pas d&apos;autre artisan du réseau disponible dans ton département pour ces travaux pour l&apos;instant. Daniel en cherche : on te prévient par e-mail.
        </p>
      ) : (
        <AjoutArtisans demandeId={d.id} artisans={artisans} places={places} metiersDemandes={d.metiers} />
      )}
    </div>
  );
}
