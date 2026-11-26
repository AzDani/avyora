import Link from "next/link";
import { sessionArtisan } from "@/lib/reseau/espace";
import { avisRecus, realisationsDe } from "@/lib/data/reseau";
import { demandesRecues } from "@/lib/data/reseau";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { ALERTE_DECENNALE_JOURS, joursAvant, noteFr, resumeNotes } from "@/lib/reseau/avis";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import MenuArtisan, { type CompteursMenu } from "@/components/reseau/espace/MenuArtisan";

/**
 * L'espace dédié de l'artisan (25/11/2026). Validé : la carte de son entreprise et le menu à gauche (onglets sur
 * téléphone) autour de chaque page. Sinon (pas de compte, candidature, examen, refus, suspension) : la page seule,
 * qui dit où il en est. Une panne de lecture n'empêche pas d'afficher la page (sans menu). Masqué du réseau (0013) :
 * un bandeau sur chaque page, et plus de lien vers la fiche publique.
 */
export default async function EspaceArtisanLayout({ children }: { children: React.ReactNode }) {
  let s: Awaited<ReturnType<typeof sessionArtisan>> = null;
  try {
    s = await sessionArtisan();
  } catch {
    s = null;
  }
  const a = s?.artisan;
  if (!a || a.statut !== "valide") return <>{children}</>;

  const [demandes, avis, reals] = await Promise.all([
    demandesRecues(a.id).catch(() => []),
    avisRecus(a.id).catch(() => ({ publies: [], enAttente: 0 })),
    realisationsDe(a.id).catch(() => []),
  ]);
  const resume = resumeNotes(avis.publies.map((x) => x.note));
  const compteurs: CompteursMenu = {
    aRepondre: demandes.filter((d) => d.statut === "envoyee").length,
    note: resume.n ? noteFr(resume.moyenne) : null,
    realisations: reals.length,
    alerteDossier: joursAvant(a.decennaleFin, aujourdhuiParis()) <= ALERTE_DECENNALE_JOURS,
  };
  const nom = a.nomCommercial || a.raisonSociale;

  return (
    <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start lg:gap-7" lang="fr">
      <aside className="mb-4 space-y-3 lg:sticky lg:top-[96px] lg:mb-0">
        <div className="hidden rounded-2xl border border-line bg-surface p-4 lg:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">Réseau AVYORA</p>
          <p className="mt-1 text-[15px] font-bold text-ink">{nom}</p>
          {a.masqueLe ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-muted ring-1 ring-line">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Masqué du réseau
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#e3f5ed] px-2.5 py-0.5 text-[12px] font-semibold text-[#0b7a53]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Membre validé
            </span>
          )}
          <p className="mt-2 text-[12.5px] leading-snug text-muted">
            {resumeDepartements(a.departements, 3)}
            <br />
            {a.metiers.map(labelMetier).join(" · ")}
          </p>
          {/* Masqué (0013) : sa fiche publique n'existe plus pour les membres Pro, le lien mènerait à une page introuvable. */}
          {!a.masqueLe && <Link href={`/avis-artisans/${a.id}`} className="mt-2 inline-block text-[13px] font-semibold text-brand-700 hover:underline">Voir ma fiche publique →</Link>}
        </div>
        <MenuArtisan c={compteurs} />
        <p className="hidden px-1.5 text-[12px] leading-relaxed text-faint lg:block">Une question ? contact@getavyora.fr</p>
      </aside>
      <div className="min-w-0">
        {/* Masqué du réseau par Daniel (26/11/2026, migration 0013) : dit sur chaque page de l'espace. */}
        {a.masqueLe && (
          <p role="status" data-masque="" className="mb-4 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-muted">
            <b className="text-ink">Ta fiche est masquée du réseau.</b> Tu ne reçois plus de nouvelles demandes et les membres AVYORA Pro ne te
            voient plus. Tes demandes en cours, tes avis et ta galerie restent ici. Une question ? contact@getavyora.fr
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
