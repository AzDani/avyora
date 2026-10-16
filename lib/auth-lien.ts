/**
 * Inscription facile (chantier B2, bêta gratuite, décision de Dani du 13/10/2026) : l'accès par LIEN E-MAIL.
 *
 * Sur /inscription comme sur /connexion, un seul champ, l'adresse e-mail. Supabase envoie un lien
 * (`signInWithOtp`, `shouldCreateUser: true`) : le clic confirme l'adresse ET ouvre la session, sans mot de
 * passe à inventer, puis ramène à l'intention (`next`). Le mot de passe reste possible, replié en second.
 *
 * Deux formes de lien, selon les modèles d'e-mail réglés dans Supabase (docs/beta.md §6) :
 *  - `{{ .ConfirmationURL }}` (modèle par défaut) → /auth/callback?code=… : flux PKCE, le lien ne connecte que dans
 *    le navigateur qui l'a demandé, et, pour une adresse NOUVELLE, dans les 5 minutes qui suivent la demande ;
 *  - le format token_hash → /auth/confirm, puis le bouton de /auth/confirmer : valable sur n'importe quel appareil,
 *    pendant la durée réglée dans Supabase (1 h), et à l'abri des robots qui ouvrent les liens.
 *
 * Ce module ne contient que des fonctions pures (aucune session, aucune base, aucun stockage) : l'action
 * serveur (`envoyerLienAcces`, lib/actions/auth.ts), le formulaire (components/auth/AccesLien.tsx),
 * /auth/callback et /auth/confirm les partagent. Testées dans tests/auth-lien.test.ts.
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
 * `/\hôte`, URL absolue, caractères de contrôle et espaces), et un `next` démesuré (plus de 512 caractères).
 */
export function destinationLien(next: string | null | undefined, page: PageAcces): string {
  const defaut = page === "connexion" ? "/projets" : "/onboarding";
  const n = typeof next === "string" ? next.trim() : "";
  if (n.length > 512) return defaut;
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

/* ─── Le lien au format token_hash (/auth/confirm, puis /auth/confirmer) ───── */

/**
 * Les types de lien que /auth/confirm accepte : ceux de `verifyOtp` pour un e-mail. Les modèles d'AVYORA envoient
 * `email` (inscription comme connexion : Supabase cherche le jeton dans les deux colonnes) et `recovery` (mot de
 * passe oublié) ; les autres restent acceptés pour un modèle qui les nommerait.
 */
export const TYPES_LIEN = ["email", "signup", "magiclink", "invite", "recovery", "email_change"] as const;
export type TypeLien = (typeof TYPES_LIEN)[number];

/** Une valeur lue comme type de lien, sinon rien (le lien est alors invalide). */
export function lireTypeLien(v: unknown): TypeLien | null {
  return typeof v === "string" && (TYPES_LIEN as readonly string[]).includes(v) ? (v as TypeLien) : null;
}

/** La forme d'un `token_hash` de Supabase (`pkce_` puis l'empreinte en hexadécimal, ou l'empreinte seule). */
const FORME_JETON = /^[A-Za-z0-9_-]{8,256}$/;

/**
 * L'intention portée par un lien au format token_hash. Les modèles d'e-mail la passent par `next={{ .RedirectTo }}` :
 * c'est l'`emailRedirectTo` de l'envoi, une URL ABSOLUE du site (`https://getavyora.fr/auth/callback?next=%2Fplan`),
 * encodée par le modèle. Acceptés : un chemin interne, ou une URL de l'une de NOS origines ; un passage par
 * /auth/callback ou /auth/confirm est déroulé (on prend le `next` qu'il transporte). Tout le reste mène à `defaut`,
 * comme la racine du site, où Supabase retombe quand l'adresse de retour n'est pas autorisée.
 */
export function intentionDuLien(next: string | null | undefined, origines: readonly string[], defaut = "/projets"): string {
  const nos = origines.filter((o) => /^https?:\/\//.test(o));
  let n = typeof next === "string" ? next.trim() : "";
  for (let tour = 0; tour < 3; tour++) {
    if (!n || n.length > 2048) return defaut;
    let chemin = n;
    if (!n.startsWith("/")) {
      let u: URL;
      try {
        u = new URL(n);
      } catch {
        return defaut;
      }
      if (!nos.includes(u.origin)) return defaut;
      chemin = u.pathname + u.search + u.hash;
      if (chemin === "/") return defaut;
    }
    const interne = cheminInterne(chemin, "");
    if (!interne) return defaut;
    const q = interne.indexOf("?");
    const base = q < 0 ? interne : interne.slice(0, q);
    if (base === "/auth/callback" || base === "/auth/confirm") {
      n = new URLSearchParams(q < 0 ? "" : interne.slice(q + 1)).get("next")?.trim() ?? "";
      continue;
    }
    return interne.length > 512 ? defaut : interne;
  }
  return defaut;
}

/**
 * Le lien en attente du bouton « Entrer dans AVYORA » : /auth/confirm le range dans un cookie httpOnly et renvoie vers
 * /auth/confirmer, une adresse SANS le jeton (ni les mesures de la page ni un en-tête Referer ne le voient). Le jeton
 * n'est consommé qu'au clic sur le bouton : les robots des messageries qui ouvrent les liens pour les vérifier
 * (Outlook, antivirus d'entreprise) ne le brûlent pas.
 */
export const COOKIE_LIEN = "av-lien";
/** Durée de vie du cookie : celle du lien lui-même (« Email OTP Expiration », 1 h conseillée, docs/beta.md §6). */
export const DUREE_COOKIE_LIEN_S = 3600;

export type LienEnAttente = { jeton: string; type: TypeLien; next: string };

/** Le contenu du cookie, écrit par /auth/confirm. */
export function ecrireLienEnAttente(l: LienEnAttente): string {
  return JSON.stringify({ h: l.jeton, t: l.type, n: l.next });
}

/** Le cookie relu (et revérifié : jeton bien formé, type connu, chemin interne), sinon rien. */
export function lireLienEnAttente(v: string | null | undefined): LienEnAttente | null {
  if (!v) return null;
  try {
    const o = JSON.parse(v) as { h?: unknown; t?: unknown; n?: unknown };
    const type = lireTypeLien(o.t);
    if (typeof o.h !== "string" || !FORME_JETON.test(o.h) || !type) return null;
    return { jeton: o.h, type, next: cheminInterne(typeof o.n === "string" ? o.n : undefined) };
  } catch {
    return null;
  }
}

/** Un `token_hash` reçu dans l'adresse a-t-il la forme d'un jeton de Supabase ? */
export function jetonValide(v: unknown): v is string {
  return typeof v === "string" && FORME_JETON.test(v);
}

/* ─── Ce navigateur a-t-il demandé ce lien ? (cookie `av-demande`) ──────────── */

/**
 * Chaque demande faite DEPUIS CE NAVIGATEUR (lien d'accès, inscription au mot de passe, mot de passe oublié) y laisse
 * une trace : un cookie httpOnly (`av-demande`, chemin `/auth`, 24 h) qui porte, par adresse, son EMPREINTE (HMAC du
 * serveur, jamais l'adresse), la façon dont elle a été demandée et le choix des nouveautés. Au retour du lien, il dit :
 *  - si ce navigateur avait demandé un lien pour cette adresse (sinon, l'arrivée est « à vérifier » : un lien relayé
 *    par quelqu'un d'autre ouvrirait SA session ici, et l'estimation de ce navigateur partirait dans son compte) ;
 *  - si le mot de passe du compte a été choisi ici (`mdp`) : sinon il est remplacé par un aléa à la confirmation de
 *    l'adresse (un compte préparé par un tiers avec son mot de passe ne lui reste pas ouvert) ;
 *  - si la case des nouveautés a été cochée ici : le consentement n'est enregistré qu'à l'arrivée confirmée.
 */
export const COOKIE_DEMANDE = "av-demande";
/** Durée de vie de la trace : 24 h (un lien vaut 1 h ; une inscription au mot de passe se confirme souvent plus tard). */
export const DUREE_DEMANDE_S = 24 * 3600;
/** Au plus tant d'adresses gardées (les plus récentes). */
const DEMANDES_MAX = 5;

/** Comment l'adresse a été demandée ici : lien d'accès, inscription au mot de passe (choisi ici), mot de passe oublié. */
export type MethodeDemande = "lien" | "mdp" | "reset";
/** Une demande : `e` l'empreinte de l'adresse, `m` la méthode, `t` l'heure (secondes), `n` la case des nouveautés cochée. */
export type Demande = { e: string; m: MethodeDemande; t: number; n?: true };

const FORME_EMPREINTE = /^[0-9a-f]{32}$/;
const METHODES_DEMANDE: readonly MethodeDemande[] = ["lien", "mdp", "reset"];

/** Les demandes du cookie, encore valables (moins de 24 h), sinon une liste vide. Tout ce qui est mal formé est ignoré. */
export function lireDemandes(v: string | null | undefined, maintenant: number = Date.now()): Demande[] {
  if (!v) return [];
  try {
    const o: unknown = JSON.parse(v);
    if (!Array.isArray(o)) return [];
    const s = Math.floor(maintenant / 1000);
    return o.flatMap((d): Demande[] => {
      if (!d || typeof d !== "object") return [];
      const { e, m, t, n } = d as Record<string, unknown>;
      if (typeof e !== "string" || !FORME_EMPREINTE.test(e)) return [];
      if (typeof m !== "string" || !(METHODES_DEMANDE as readonly string[]).includes(m)) return [];
      if (typeof t !== "number" || !Number.isFinite(t) || t > s + 60 || s - t >= DUREE_DEMANDE_S) return [];
      return [{ e, m: m as MethodeDemande, t, ...(n === true ? { n: true as const } : {}) }];
    }).slice(-DEMANDES_MAX);
  } catch {
    return [];
  }
}

/**
 * Le cookie après une nouvelle demande. Une même adresse n'a qu'une entrée : la plus récente pour l'heure et la case des
 * nouveautés (le dernier choix compte), mais `mdp` reste acquis (le mot de passe du compte a bien été choisi ici).
 */
export function ajouterDemande(v: string | null | undefined, d: Demande, maintenant: number = Date.now()): string {
  const avant = lireDemandes(v, maintenant);
  const meme = avant.find((x) => x.e === d.e);
  const m: MethodeDemande = meme?.m === "mdp" || d.m === "mdp" ? "mdp" : d.m;
  const nouvelle: Demande = { e: d.e, m, t: d.t, ...(d.n ? { n: true as const } : {}) };
  return JSON.stringify([...avant.filter((x) => x.e !== d.e), nouvelle].slice(-DEMANDES_MAX));
}

/** La demande de cette empreinte d'adresse, si ce navigateur en a fait une dans les dernières 24 h. */
export function trouverDemande(v: string | null | undefined, empreinte: string, maintenant: number = Date.now()): Demande | null {
  return lireDemandes(v, maintenant).find((d) => d.e === empreinte) ?? null;
}

/** L'arrivée « à vérifier » : lib/auth-verifier.ts (le proxy l'importe seul). */
export { COOKIE_VERIFIER, DUREE_VERIFIER_S, optionsMarque, verificationEnAttente } from "@/lib/auth-verifier";

/** La destination après la vérification : un chemin interne hors de /auth (sinon /projets). */
export function suiteVerification(next: string | null | undefined): string {
  const n = cheminInterne(typeof next === "string" ? next.trim() : undefined, "/projets");
  return n === "/auth" || n.startsWith("/auth/") || n.startsWith("/auth?") ? "/projets" : n;
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

/** Un compte vu au retour du lien : ce que /auth/callback et /auth/confirmer lisent pour savoir s'il vient de naître. */
type CompteVu = {
  created_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

/**
 * Fenêtre dans laquelle une première arrivée compte comme une création de compte. Large exprès (24 h) : avec les
 * liens PKCE, une adresse confirmée par un clic ouvert dans un autre navigateur n'arrive connectée qu'au lien
 * suivant. Le double compte est évité par la marque `compte_cree_le`, pas par la fenêtre.
 */
export const FENETRE_NOUVEAU_COMPTE_MS = 24 * 3_600_000;

/**
 * Le contrôle du mot de passe à la confirmation de l'adresse (lib/auth-arrivee.ts) : il a lieu à la première arrivée par
 * lien (ou Google) qui suit la confirmation, dans l'heure, une seule fois par compte (marque `MARQUE_MDP` dans
 * `app_metadata`, que seul le serveur écrit : un tiers ne peut pas la poser d'avance).
 */
export const FENETRE_CONTROLE_MDP_MS = 3_600_000;
export const MARQUE_MDP = "mdp_controle_le";

type CompteControle = { email_confirmed_at?: string | null; app_metadata?: Record<string, unknown> | null };

/** Le compte vient-il d'être confirmé (dans l'heure), sans que son mot de passe ait déjà été contrôlé ? */
export function controleMdpAFaire(user: CompteControle | null | undefined, maintenant: number = Date.now()): boolean {
  if (!user || user.app_metadata?.[MARQUE_MDP]) return false;
  const t = Date.parse(user.email_confirmed_at ?? "");
  return Number.isFinite(t) && t <= maintenant + 60_000 && maintenant - t < FENETRE_CONTROLE_MDP_MS;
}

/** La marque posée dans `user_metadata` quand `compte_cree` est émis : une seule fois par compte. */
export const MARQUE_COMPTE_CREE = "compte_cree_le";

/**
 * Le compte vient-il d'être créé, et comment ? `lien` : inscrit par le lien, adresse confirmée il y a peu ;
 * `google` : compte Google créé il y a peu. Jamais deux fois (marque `compte_cree_le`, posée à la première arrivée).
 * Sinon (connexion d'un compte existant, inscription au mot de passe, mesurée par son action), rien. Sert à
 * `compte_cree`, émis une fois, là où le fait est établi.
 */
export function methodeNouveauCompte(user: CompteVu | null | undefined, maintenant: number = Date.now()): "lien" | "google" | null {
  if (!user || user.user_metadata?.[MARQUE_COMPTE_CREE]) return null;
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
