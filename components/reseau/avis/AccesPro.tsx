import Link from "next/link";
import { betaActive, lienInscriptionBeta } from "@/lib/beta";

/**
 * Les avis sur les artisans sont réservés aux membres AVYORA Pro (décision de Dani du 25/11/2026 ; pendant la bêta,
 * tout compte l'est). Sans compte : l'inscription ; avec un compte non Pro : la page des offres. Aucun prix affiché.
 */
export default function AccesPro({ connecte, retour }: { connecte: boolean; retour: string }) {
  return (
    <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 text-center">
      <p className="text-[17px] font-semibold text-brand-900">Les avis sur les artisans sont réservés aux membres AVYORA Pro</p>
      <p className="mx-auto mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
        Notes, avis vérifiés, photos des clients et réalisations des artisans du Réseau AVYORA.
        {betaActive() ? " Pendant la bêta, il suffit de créer un compte." : ""}
      </p>
      <Link
        href={connecte ? "/tarifs" : betaActive() ? lienInscriptionBeta(retour, "avis-artisans") : `/inscription?next=${encodeURIComponent(retour)}`}
        className="btn btn-primary mt-4 min-h-11 px-5"
      >
        {connecte ? "Découvrir AVYORA Pro" : "Créer mon compte"}
      </Link>
      {!connecte && (
        <p className="mt-2 text-[13px] text-muted">
          Déjà inscrit ? <Link href={`/connexion?next=${encodeURIComponent(retour)}`} className="font-semibold text-brand-700 hover:underline">Se connecter</Link>
        </p>
      )}
    </div>
  );
}
