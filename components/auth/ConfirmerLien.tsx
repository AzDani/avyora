"use client";

import { useFormStatus } from "react-dom";

/**
 * Le bouton de /auth/confirmer (« Entrer dans AVYORA ») : désactivé pendant la vérification du lien, pour qu'un double
 * clic ne consomme pas le jeton deux fois (le second échouerait et mènerait à « lien invalide »).
 */
export function BoutonConfirmer({ libelle, enCours }: { libelle: string; enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 disabled:opacity-60" data-confirmer-bouton="">
      {pending ? enCours : libelle}
    </button>
  );
}
