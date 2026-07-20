/**
 * Politique de mots de passe (module pur, réutilisable côté serveur ET client).
 * Séparé de lib/actions/auth ("use server") où seules des fonctions async peuvent être exportées.
 */

// Quelques-uns des mots de passe les plus courants/fuités (blocage minimal côté app).
// La vraie protection « mot de passe compromis » (HaveIBeenPwned) est à activer dans Supabase
// (Auth → Policies → Leaked password protection).
const MDP_COURANTS = new Set([
  "password", "motdepasse", "azerty", "azertyuiop", "123456", "12345678", "123456789", "1234567890",
  "qwerty", "qwertyuiop", "111111", "000000", "iloveyou", "admin", "welcome", "abc123", "password1",
  "motdepasse1", "azerty123", "soleil", "bonjour", "loulou", "doudou",
]);

/**
 * ≥ 12 caractères, au moins une lettre et un chiffre, pas dans la liste des plus courants.
 * Renvoie un message d'erreur ou null si OK.
 */
export function validerMotDePasse(pwd: string): string | null {
  if (pwd.length < 12) return "Le mot de passe doit faire au moins 12 caractères.";
  if (pwd.length > 200) return "Mot de passe trop long (200 caractères max).";
  if (!/[a-zA-Z]/.test(pwd)) return "Ajoute au moins une lettre.";
  if (!/[0-9]/.test(pwd)) return "Ajoute au moins un chiffre.";
  if (MDP_COURANTS.has(pwd.toLowerCase())) return "Ce mot de passe est trop courant — choisis-en un autre.";
  return null;
}
