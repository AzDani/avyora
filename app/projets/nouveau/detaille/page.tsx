import { redirect } from "next/navigation";
import Estimateur from "@/components/Estimateur";
import { getUser, estPro } from "@/lib/auth";

// noindex : cette page est gatée (redirection vers /connexion ou /tarifs), mais la redirection
// intervient après le début du streaming — un crawler reçoit donc un 200 avec une coquille vide,
// ce que Google interprète comme un soft 404. Aucune demande de recherche ne la vise de toute façon.
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Estimation détaillée (poste par poste) — réservée aux abonnés Pro.
// Destination d'un visiteur qui clique « Détail poste par poste — Pro ».
//
// AVANT : un visiteur anonyme était envoyé sur /connexion, c'est-à-dire qu'on lui demandait de se
// connecter à un compte qu'il n'a pas — puis, une fois créé, il découvrait la page de tarifs.
// Deux murs d'affilée, sans prévenir, au point du parcours où l'on perd le plus de monde.
//
// MAINTENANT : un anonyme va directement sur /tarifs, qui explique l'offre ET propose à la fois de
// créer un compte et de se connecter. Un seul mur, et c'est le mur honnête — le bouton annonce
// désormais « Pro », donc personne n'y arrive par surprise.
export default async function NouveauProjetDetaille() {
  const user = await getUser();
  if (!user) redirect("/tarifs");
  if (!estPro(user)) redirect("/tarifs");

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="eyebrow">Estimation détaillée</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Ajuster poste par poste</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Coche les travaux, ajuste les quantités — ton devis se construit en direct.
        </p>
      </header>
      <Estimateur />
    </div>
  );
}
