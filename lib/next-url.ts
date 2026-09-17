/**
 * Garde anti open-redirect partagée.
 *
 * Elle vivait en privé dans lib/actions/auth.ts, qui porte « use server » : impossible de
 * l'exporter depuis là (un module d'actions serveur ne peut exporter que des fonctions async).
 * Les pages qui doivent valider un `next` avant de rediriger en avaient besoin aussi — elle
 * habite donc ici, en un seul exemplaire, plutôt que recopiée à trois endroits où les copies
 * auraient fini par diverger.
 */

/**
 * N'accepte qu'un chemin interne : commence par « / » mais ni par « // » ni par « /\ », qui
 * seraient interprétés par le navigateur comme une URL absolue vers un domaine externe.
 * Une chaîne vide ou externe retombe sur `defaut`.
 */
export function cheminInterne(next: string | undefined, defaut = "/projets"): string {
  if (!next) return defaut;
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : defaut;
}
