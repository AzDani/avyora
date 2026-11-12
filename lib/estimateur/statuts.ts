/**
 * Suivi de chantier : les statuts d'avancement d'un projet (`reponses.statuts`, clé = « corps|nom »).
 * 0 = à démarrer (la clé est retirée : c'est le défaut), 1 = en cours, 2 = terminé.
 * Fonctions pures, partagées par la fiche (client) et la route d'écriture (serveur).
 */

/** Statuts après un changement : 0 retire la clé, 1 et 2 la posent. L'objet d'entrée n'est pas modifié. */
export function statutsApres(statuts: unknown, cle: string, etat: number): Record<string, number> {
  const s: Record<string, number> = statuts && typeof statuts === "object" && !Array.isArray(statuts)
    ? { ...(statuts as Record<string, number>) } : {};
  if (etat === 0) delete s[cle];
  else s[cle] = etat;
  return s;
}

/**
 * Un clic sur le statut d'une ligne : l'état suivant (0 → 1 → 2 → 0) et les écritures à envoyer, DANS
 * L'ORDRE. Une ligne d'un ancien projet peut encore porter son statut sous l'ancienne clé (`legacy`,
 * avec variante) : le nouveau statut s'écrit sous la clé actuelle, puis l'ancienne est retirée, sinon
 * elle reprendrait le dessus à l'affichage.
 */
export function clicStatut(statuts: Record<string, number>, cle: string, legacy?: string | null): {
  statuts: Record<string, number>; envois: Array<{ cle: string; etat: 0 | 1 | 2 }>;
} {
  const vu = statuts[cle] != null ? statuts[cle] : (legacy != null ? statuts[legacy] : undefined) || 0;
  const etat = ((vu + 1) % 3) as 0 | 1 | 2;
  let suivant = statutsApres(statuts, cle, etat);
  const envois: Array<{ cle: string; etat: 0 | 1 | 2 }> = [{ cle, etat }];
  if (legacy != null && legacy !== cle && suivant[legacy] != null) {
    suivant = statutsApres(suivant, legacy, 0);
    envois.push({ cle: legacy, etat: 0 });
  }
  return { statuts: suivant, envois };
}
