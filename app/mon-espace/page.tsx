import { redirect } from "next/navigation";

/**
 * Ancien tableau de bord retiré : le portefeuille `/projets` (nouvelle maquette) le remplace
 * intégralement (hero, KPIs, cartes, ClaimDraft). On redirige pour ne pas laisser traîner
 * l'ancien modèle et garder une seule page « mes projets ». Le compte reste sur /mon-espace/compte.
 */
export default function MonEspaceRedirect() {
  redirect("/projets");
}
