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

/** Les refus, dans la langue de la page (revue anglais, constat 86). Français par défaut. */
const MESSAGES = {
  fr: {
    court: "Le mot de passe doit faire au moins 12 caractères.",
    long: "Mot de passe trop long (200 caractères max).",
    lettre: "Ajoute au moins une lettre.",
    chiffre: "Ajoute au moins un chiffre.",
    courant: "Ce mot de passe est trop courant — choisis-en un autre.",
  },
  en: {
    court: "Your password must be at least 12 characters long.",
    long: "Password too long (200 characters max).",
    lettre: "Add at least one letter.",
    chiffre: "Add at least one number.",
    courant: "This password is too common — choose another one.",
  },
};

/**
 * ≥ 12 caractères, au moins une lettre et un chiffre, pas dans la liste des plus courants.
 * Renvoie un message d'erreur (en français, ou dans `locale`) ou null si OK.
 */
export function validerMotDePasse(pwd: string, locale: "fr" | "en" = "fr"): string | null {
  const m = MESSAGES[locale === "en" ? "en" : "fr"];
  if (pwd.length < 12) return m.court;
  if (pwd.length > 200) return m.long;
  if (!/[a-zA-Z]/.test(pwd)) return m.lettre;
  if (!/[0-9]/.test(pwd)) return m.chiffre;
  if (MDP_COURANTS.has(pwd.toLowerCase())) return m.courant;
  return null;
}
