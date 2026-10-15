/**
 * Inscription facile (chantier B2, bêta gratuite, décision de Dani du 13/10/2026) : l'accès par LIEN E-MAIL.
 *
 * Sur /inscription comme sur /connexion, un seul champ, l'adresse e-mail. Supabase envoie un lien
 * (`signInWithOtp`, `shouldCreateUser: true`) : le clic confirme l'adresse ET ouvre la session, sans mot de
 * passe à inventer. Le lien repasse par /auth/callback, qui ramène à l'intention (`next`). Le mot de passe
 * reste possible, replié en second.
 *
 * Ce module ne contient que des fonctions pures (aucune session, aucune base, aucun stockage) : l'action
 * serveur (`envoyerLienAcces`, lib/actions/auth.ts), le formulaire (components/auth/AccesLien.tsx) et
 * /auth/callback les partagent. Testées dans tests/auth-lien.test.ts.
 */
import { cheminInterne } from "@/lib/next-url";
import { CLE_RECLAMATION_RENO } from "@/lib/estimateur/brouillon-reno";
import { CLE_RECLAMATION_NEUF } from "@/lib/estimateur/brouillon-neuf";
import { CLE_RECLAMATION_PLAN } from "@/lib/plans/origine";

/** La page d'où part la demande de lien. */
export type PageAcces = "inscription" | "connexion";

/** Une valeur de formulaire lue comme page : « connexion », sinon l'inscription. */
export function lirePageAcces(v: unknown): PageAcces {
  return v === "connexion" ? "connexion" : "inscription";
}

/**
 * Le délai avant de pouvoir redemander un lien, en secondes : celui que Supabase impose entre deux envois à la
 * même adresse (Authentication → Rate limits). Le bouton « Renvoyer » attend autant.
 */
export const DELAI_RENVOI_S = 60;

/* ─── L'adresse ─────────────────────────────────────────────────────────────── */

const FORME_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Une adresse (déjà nettoyée : sans espaces autour, en minuscules) assez bien formée pour tenter l'envoi. */
export function emailValide(email: string): boolean {
  return email.length <= 254 && FORME_EMAIL.test(email);
}

/* ─── Où le lien ramène ─────────────────────────────────────────────────────── */

/**
 * La destination du lien : l'intention (`next`), si c'est un chemin interne, sinon la page par défaut. Sans
 * intention, l'inscription mène aux questions de profil (/onboarding, facultatives, bouton « Passer »), la
 * connexion à ses projets. Refusés : tout ce qui n'est pas un chemin interne (`cheminInterne` : `//hôte`,
 * `/\hôte`, URL absolue), les caractères de contrôle, et un `next` démesuré (plus de 512 caractères).
 */
export function destinationLien(next: string | null | undefined, page: PageAcces): string {
  const defaut = page === "connexion" ? "/projets" : "/onboarding";
  const n = typeof next === "string" ? next.trim() : "";
  if (!n || n.length > 512 || /[\u0000-\u001f\u007f]/.test(n)) return defaut;
  return cheminInterne(n, defaut);
}

/**
 * Un anonyme a-t-il laissé quelque chose à ranger dans son futur compte (« Enregistrer » une estimation de
 * rénovation ou de construction, un plan de l'éditeur) ? Ce sont les drapeaux que `ClaimDraft` et `ClaimPlan`
 * lisent sur /projets. Sans intention explicite, le lien mène alors à /projets (où l'estimation est rangée)
 * plutôt qu'aux questions de profil. Lecteur du `localStorage` en paramètre.
 */
export function reclamationEnAttente(lire: (cle: string) => string | null): boolean {
  return !!lire(CLE_RECLAMATION_RENO) || lire(CLE_RECLAMATION_NEUF) === "1" || !!lire(CLE_RECLAMATION_PLAN);
}

/* ─── La réponse de Supabase ────────────────────────────────────────────────── */

/** Ce que le formulaire dit après la demande : envoyé, ou l'une des trois erreurs qu'il sait traduire. */
export type IssueEnvoi = "envoye" | "limite" | "email" | "envoi";

/**
 * Codes de Supabase qui dépendent de l'ADRESSE (compte banni, inscriptions fermées…). Les afficher dirait à qui
 * tape une adresse si elle a un compte : la réponse est donc celle d'un envoi réussi (pas d'énumération).
 */
const COMME_ENVOYE = new Set(["user_banned", "signup_disabled", "otp_disabled", "user_not_found", "email_not_confirmed"]);

/**
 * L'issue d'une demande de lien, à partir de l'erreur renvoyée par `signInWithOtp` (ou de son absence). Les
 * limites (429, la nôtre comme celle de Supabase) et une adresse refusée sont dites ; le reste qui ne dépend pas
 * de l'adresse (SMTP en panne, configuration) devient « l'e-mail n'a pas pu partir ».
 */
export function issueEnvoi(error: { code?: string; status?: number } | null | undefined): IssueEnvoi {
  if (!error) return "envoye";
  const code = error.code ?? "";
  if (COMME_ENVOYE.has(code)) return "envoye";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429) return "limite";
  if (code === "email_address_invalid" || code === "validation_failed") return "email";
  return "envoi";
}

/* ─── Les métadonnées du compte ─────────────────────────────────────────────── */

/** Comment le compte a été créé : le lien e-mail (B2), le formulaire à mot de passe, ou Google. */
export type MethodeInscription = "lien" | "mot_de_passe" | "google";

export type MetadonneesInscription = {
  /** Horodatage de l'acceptation des CGU et de la politique de confidentialité (ISO). */
  cgu_acceptees_le: string;
  inscription: MethodeInscription;
  /** La case « nouveautés d'AVYORA », NON cochée par défaut ; `newsletter_le` date le consentement (CNIL). */
  newsletter: boolean;
  newsletter_le?: string;
};

/**
 * Ce que l'inscription écrit dans `user_metadata` (options.data de Supabase, appliqué à la CRÉATION du compte
 * seulement : un compte existant garde les siennes). L'acceptation des CGU est datée ; le consentement aux
 * nouveautés aussi, et seulement s'il est donné.
 */
export function metadonneesInscription(o: { methode: MethodeInscription; newsletter: boolean; maintenant?: Date }): MetadonneesInscription {
  const le = (o.maintenant ?? new Date()).toISOString();
  return { cgu_acceptees_le: le, inscription: o.methode, newsletter: o.newsletter, ...(o.newsletter ? { newsletter_le: le } : {}) };
}

/** Un compte vu au retour du lien : ce que /auth/callback lit pour savoir s'il vient de naître. */
type CompteVu = {
  created_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

/** Fenêtre dans laquelle un premier passage par /auth/callback compte comme une création de compte. */
export const FENETRE_NOUVEAU_COMPTE_MS = 10 * 60_000;

/**
 * Le compte vient-il d'être créé, et comment ? `lien` : inscrit par le lien, adresse confirmée à l'instant (le
 * premier clic) ; `google` : compte Google créé à l'instant. Sinon (connexion d'un compte existant, inscription
 * au mot de passe, mesurée par son action), rien. Sert à `compte_cree`, émis une fois, là où le fait est établi.
 */
export function methodeNouveauCompte(user: CompteVu | null | undefined, maintenant: number = Date.now()): "lien" | "google" | null {
  if (!user) return null;
  const recent = (iso: string | null | undefined) => {
    const t = Date.parse(iso ?? "");
    return Number.isFinite(t) && t <= maintenant + 60_000 && maintenant - t < FENETRE_NOUVEAU_COMPTE_MS;
  };
  if (user.user_metadata?.inscription === "lien" && recent(user.email_confirmed_at)) return "lien";
  if (user.app_metadata?.provider === "google" && recent(user.created_at)) return "google";
  return null;
}

/* ─── « Ouvrir ma messagerie » ──────────────────────────────────────────────── */

const MESSAGERIES: { nom: string; url: string; domaines: string[] }[] = [
  { nom: "Gmail", url: "https://mail.google.com/mail/", domaines: ["gmail.com", "googlemail.com"] },
  {
    nom: "Outlook",
    url: "https://outlook.live.com/mail/",
    domaines: ["outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr", "live.com", "live.fr", "msn.com"],
  },
  { nom: "iCloud", url: "https://www.icloud.com/mail", domaines: ["icloud.com", "me.com", "mac.com"] },
  { nom: "Yahoo", url: "https://mail.yahoo.com/", domaines: ["yahoo.com", "yahoo.fr", "ymail.com"] },
  { nom: "Orange", url: "https://messagerie.orange.fr/", domaines: ["orange.fr", "wanadoo.fr"] },
];

/** La messagerie en ligne d'une adresse, si son domaine est connu ; sinon rien (le bouton n'est pas affiché). */
export function messagerieDe(email: string): { nom: string; url: string } | null {
  const domaine = email.trim().toLowerCase().split("@")[1] ?? "";
  const m = MESSAGERIES.find((x) => x.domaines.includes(domaine));
  return m ? { nom: m.nom, url: m.url } : null;
}
