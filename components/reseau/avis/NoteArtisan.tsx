import { Etoiles } from "@/components/reseau/avis/Affichage";
import { noteFr } from "@/lib/reseau/avis";

/**
 * La note d'un artisan au moment où le client le choisit (25/11/2026) : étoiles, moyenne et nombre d'avis publiés,
 * nombre de réalisations, et sa fiche dans un nouvel onglet (le formulaire en cours reste intact). L'ordre de la liste,
 * lui, ne dépend pas de la note (répartition équitable : un nouvel artisan sans avis reçoit aussi des demandes).
 */
export default function NoteArtisan({ id, note, nbAvis, nbRealisations }: { id: string; note: number | null; nbAvis: number; nbRealisations: number }) {
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      {nbAvis > 0 && note != null ? (
        <span className="inline-flex items-center gap-1.5">
          <Etoiles note={note} />
          <b className="num text-ink">{noteFr(note)}</b>
          <span className="text-muted">{nbAvis} avis</span>
        </span>
      ) : (
        <span className="text-muted">Nouveau dans le réseau, pas encore d&apos;avis</span>
      )}
      {nbRealisations > 0 && <span className="text-muted">{nbRealisations} réalisation{nbRealisations > 1 ? "s" : ""}</span>}
      <a href={`/avis-artisans/${id}`} target="_blank" rel="noopener" className="font-semibold text-brand-700 underline">
        Voir sa fiche et ses avis<span className="sr-only"> (nouvel onglet)</span>
      </a>
    </span>
  );
}
