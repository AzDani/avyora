/**
 * Les messages des formulaires à mot de passe (connexion, inscription, nouveau mot de passe), en français et en
 * anglais : la table de correspondance entre les erreurs de Supabase et ce qu'on dit à la personne.
 *
 * Avant, le texte brut de Supabase s'affichait tel quel, en anglais (« Email not confirmed », « New password should
 * be different from the old password. », « Email rate limit exceeded »…). Ici, l'erreur est lue par son `code`
 * (stable), puis par son statut, et le message est une phrase claire, tutoyée. Ce qui n'est pas reconnu devient
 * « Une erreur est survenue » : jamais le texte de Supabase (l'action journalise le code).
 *
 * Module pur (aucune session, aucun cookie) : testé dans tests/auth-erreurs.test.ts. Le parcours principal, le lien
 * d'accès, a ses propres codes (`issueEnvoi`, lib/auth-lien.ts) traduits par le dictionnaire (`auth.lien.erreurs`).
 */
import type { Locale } from "@/lib/i18n/config";

export type CleMessageAuth =
  | "champsManquants"
  | "identifiants"
  | "nonConfirme"
  | "tropDeTentatives"
  | "saturation"
  | "captcha"
  | "memeMotDePasse"
  | "motDePasseFaible"
  | "emailInvalide"
  | "lienExpire"
  | "inscriptionsFermees"
  | "inconnue";

export const MESSAGES_AUTH: Record<Locale, Record<CleMessageAuth, string>> = {
  fr: {
    champsManquants: "Renseigne ton adresse e-mail et ton mot de passe.",
    // Un mot de passe désactivé par sécurité (adresse confirmée sur un autre appareil, lib/auth-arrivee.ts) répond
    // aussi « incorrect » : le lien de connexion, juste au-dessus, marche dans tous les cas.
    identifiants: "Adresse e-mail ou mot de passe incorrect. Mot de passe oublié ou désactivé ? Reçois plutôt un lien de connexion avec le champ du haut.",
    nonConfirme: "Ton adresse n'est pas encore confirmée : ouvre l'e-mail qu'on t'a envoyé, ou demande un lien de connexion avec le champ du haut.",
    tropDeTentatives: "Trop de tentatives. Patiente une minute avant de réessayer.",
    saturation: "Notre service d'e-mails est très sollicité en ce moment : réessaie dans quelques minutes.",
    captcha: "La vérification anti-robot a échoué. Recharge la page et réessaie.",
    memeMotDePasse: "Choisis un mot de passe différent de l'ancien.",
    motDePasseFaible: "Mot de passe trop faible : 12 caractères minimum, dont au moins une lettre et un chiffre.",
    emailInvalide: "Cette adresse e-mail n'est pas valide. Vérifie-la.",
    lienExpire: "Lien expiré ou invalide. Redemande un e-mail de réinitialisation.",
    inscriptionsFermees: "Les inscriptions sont fermées pour le moment.",
    inconnue: "Une erreur est survenue. Réessaie dans un instant.",
  },
  en: {
    champsManquants: "Enter your email address and your password.",
    identifiants: "Incorrect email address or password. Forgot it, or was it disabled? Get a sign-in link with the field above instead.",
    nonConfirme: "Your email address isn't confirmed yet: open the email we sent you, or request a sign-in link with the field above.",
    tropDeTentatives: "Too many attempts. Wait a minute before trying again.",
    saturation: "Our email service is very busy right now: try again in a few minutes.",
    captcha: "The anti-bot check failed. Reload the page and try again.",
    memeMotDePasse: "Choose a password different from your old one.",
    motDePasseFaible: "Password too weak: at least 12 characters, including at least one letter and one number.",
    emailInvalide: "This email address isn't valid. Please check it.",
    lienExpire: "Expired or invalid link. Request a new reset email.",
    inscriptionsFermees: "Sign-ups are closed for now.",
    inconnue: "Something went wrong. Try again in a moment.",
  },
};

/**
 * Le message de l'inscription au mot de passe quand l'adresse reste à confirmer. `abonnement` : le lien ramène à
 * l'abonnement (intention /tarifs), seulement HORS bêta : pendant la bêta, rien n'est vendu (lib/beta.ts).
 */
export function messageCompteCree(locale: Locale, abonnement: boolean): string {
  if (locale === "en") {
    return `Account created! Check your inbox to confirm your address. ${abonnement ? "The link will take you straight to your subscription." : "The link will sign you in directly."}`;
  }
  return `Compte créé ! Ouvre ta boîte mail pour confirmer ton adresse. ${abonnement ? "Le lien te ramènera directement à ton abonnement." : "Le lien te connectera directement."}`;
}

/** Une erreur de Supabase Auth, telle que ses fonctions la renvoient (`AuthError`). */
export type ErreurAuth = { code?: string; status?: number; message?: string } | null | undefined;

/**
 * L'intervalle que Supabase impose entre deux e-mails à la MÊME adresse (« For security purposes, you can only request
 * this after 52 seconds. ») porte le même code que la limite GLOBALE d'envoi du projet (`over_email_send_rate_limit`,
 * « Email rate limit exceeded ») : seul le texte les distingue. Le premier dépend de la personne (elle vient d'en
 * demander un), le second de tout le monde.
 */
export function intervalleParAdresse(error: ErreurAuth): boolean {
  return /after\s+\d+\s+seconds?/i.test(error?.message ?? "");
}

/**
 * La clé du message pour une erreur de Supabase. Par le code d'abord, puis le statut, puis, en dernier recours, le
 * texte des deux erreurs historiques qui n'ont pas toujours de code (« Invalid login credentials », session absente).
 */
export function cleErreurAuth(error: ErreurAuth): CleMessageAuth {
  if (!error) return "inconnue";
  const code = error.code ?? "";
  const texte = error.message ?? "";
  switch (code) {
    case "invalid_credentials":
      return "identifiants";
    case "email_not_confirmed":
      return "nonConfirme";
    case "over_email_send_rate_limit":
      return intervalleParAdresse(error) ? "tropDeTentatives" : "saturation";
    // Supabase compte les demandes par IP ; appelé depuis nos serveurs, cette IP est celle de Vercel : une limite
    // atteinte par tout le monde à la fois, pas par la personne.
    case "over_request_rate_limit":
      return "saturation";
    case "captcha_failed":
      return "captcha";
    case "same_password":
      return "memeMotDePasse";
    case "weak_password":
      return "motDePasseFaible";
    case "email_address_invalid":
    case "validation_failed":
      return "emailInvalide";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "flow_state_expired":
    case "otp_expired":
      return "lienExpire";
    case "signup_disabled":
    case "email_provider_disabled":
      return "inscriptionsFermees";
  }
  if (error.status === 429) return intervalleParAdresse(error) ? "tropDeTentatives" : "saturation";
  if (texte === "Invalid login credentials") return "identifiants";
  if (/session/i.test(texte)) return "lienExpire";
  return "inconnue";
}

/** Le message à afficher pour une erreur de Supabase, dans la langue de la personne. */
export function messageAuth(error: ErreurAuth, locale: Locale): string {
  return MESSAGES_AUTH[locale][cleErreurAuth(error)];
}
