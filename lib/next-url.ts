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
 * Refuse aussi tout caractère de contrôle et tout espace : le navigateur RETIRE les tabulations
 * et les retours à la ligne d'une URL avant de la lire, si bien que « /<tab>/evil.com » devient
 * « //evil.com » une fois redirigé (un `next` légitime n'en contient jamais, ils seraient encodés).
 * Une chaîne vide ou externe retombe sur `defaut`.
 */
export function cheminInterne(next: string | undefined, defaut = "/projets"): string {
  // Un paramètre répété (`?next=/a&next=/b`) arrive en tableau : tout ce qui n'est pas une chaîne retombe sur `defaut`.
  if (typeof next !== "string" || !next || /[\s\u0000-\u001f\u007f-\u009f]/.test(next)) return defaut;
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : defaut;
}

/**
 * Un paramètre d'adresse tel que Next le donne à une page : une chaîne, un tableau quand il est répété
 * (`?next=/a&next=/b`), ou rien. On garde le premier ; sans cela, `next.startsWith` sur un tableau faisait tomber la
 * page en erreur 500.
 */
export function premierParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
