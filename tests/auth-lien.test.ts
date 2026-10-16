/**
 * Inscription facile (chantier B2, bêta gratuite) : l'accès par lien e-mail, sans mot de passe à inventer.
 *
 *  1. Les fonctions pures (lib/auth-lien.ts) : l'adresse, la destination assainie, l'issue de Supabase, les
 *     métadonnées datées, le compte qui vient de naître, la messagerie, la réclamation d'un brouillon.
 *  2. L'action `envoyerLienAcces` (Supabase simulé, aucun e-mail réel) : `signInWithOtp` et ses options, `next`
 *     assaini, les limites (par IP et par adresse), la réponse identique que l'adresse ait un compte ou non, les
 *     erreurs traduites. L'inscription au mot de passe date aussi les CGU et le consentement.
 *  3. /auth/callback, /auth/confirm et le bouton de /auth/confirmer : `compte_cree` une fois au premier retour (lien,
 *     Google), l'intention (déroulée de `{{ .RedirectTo }}`), le jeton consommé au clic seulement, le lien invalide.
 *  4. Le rendu de /inscription et /connexion (FR, EN ; bêta en cours ou non), l'écran « C'est envoyé »,
 *     l'interrupteur Google (éteint par défaut).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { dict } from "@/lib/i18n/dictionaries";
import { dateInsecable, libellesBeta } from "@/lib/beta";
import {
  COOKIE_DEMANDE, COOKIE_LIEN, COOKIE_VERIFIER, DELAI_RENVOI_S, DUREE_DEMANDE_S, DUREE_VERIFIER_S, FENETRE_CONTROLE_MDP_MS,
  FENETRE_NOUVEAU_COMPTE_MS, MARQUE_MDP, MARQUE_MDP_EMAIL, METADONNEES_D_UN_TIERS, ajouterDemande, consentementNouveautes, controleMdpAFaire,
  destinationLien, ecrireLienEnAttente, emailValide, intentionDuLien, issueEnvoi, issueReset, jetonValide, lireDemandes, lireLienEnAttente,
  lirePageAcces, lireTypeLien, messagerieDe, metadonneesEffacees, metadonneesInscription, methodeNouveauCompte, reclamationEnAttente,
  suiteVerification, trouverDemande, verificationEnAttente, type Demande,
} from "@/lib/auth-lien";
import { empreinteAdresse, secretEmpreinte } from "@/lib/empreinte";
import { createHash } from "node:crypto";

vi.mock("server-only", () => ({}));

const LOCALES = ["fr", "en"] as const;
type Locale = (typeof LOCALES)[number];
const vide = () => null;
/** Un texte tel que React l'écrit dans le HTML. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const compte = (h: string, x: string) => h.split(x).length - 1;

const MAINTENANT = new Date("2026-10-15T10:00:00.000Z");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/* ─── 1. Les fonctions pures ─────────────────────────────────────────────────── */

describe("lib/auth-lien : fonctions pures", () => {
  it("l'adresse : bien formée, 254 caractères au plus", () => {
    for (const ok of ["camille@exemple.fr", "a.b+tag@sous.domaine.co.uk"]) expect(emailValide(ok), ok).toBe(true);
    for (const ko of ["", "camille", "camille@", "@exemple.fr", "camille@exemple", "ca mille@exemple.fr", `${"a".repeat(250)}@x.fr`]) {
      expect(emailValide(ko), ko).toBe(false);
    }
  });

  it("la destination : un chemin interne, sinon /onboarding (inscription) ou /projets (connexion)", () => {
    expect(destinationLien("/projets/nouveau/detaille?affiner=1", "inscription")).toBe("/projets/nouveau/detaille?affiner=1");
    expect(destinationLien("  /plan  ", "connexion")).toBe("/plan");
    expect(destinationLien(undefined, "inscription")).toBe("/onboarding");
    expect(destinationLien("", "connexion")).toBe("/projets");
    for (const x of ["//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "projets", "/a\nb", "/a\u0000", "/\t/evil.com", "/\n/evil.com", `/${"x".repeat(600)}`]) {
      expect(destinationLien(x, "inscription"), JSON.stringify(x)).toBe("/onboarding");
      expect(destinationLien(x, "connexion"), JSON.stringify(x)).toBe("/projets");
    }
    expect(lirePageAcces("connexion")).toBe("connexion");
    for (const x of ["inscription", "", null, "admin"]) expect(lirePageAcces(x)).toBe("inscription");
  });

  it("l'issue de Supabase : ce qui dépend de l'adresse répond « envoyé » (pas d'énumération)", () => {
    expect(issueEnvoi(null)).toBe("envoye");
    for (const code of ["user_banned", "signup_disabled", "otp_disabled", "user_not_found"]) expect(issueEnvoi({ code, status: 422 }), code).toBe("envoye");
    expect(issueEnvoi({ code: "over_email_send_rate_limit", status: 429 })).toBe("limite");
    expect(issueEnvoi({ code: "over_request_rate_limit" })).toBe("limite");
    expect(issueEnvoi({ status: 429 })).toBe("limite");
    expect(issueEnvoi({ code: "email_address_invalid", status: 400 })).toBe("email");
    expect(issueEnvoi({ code: "validation_failed", status: 400 })).toBe("email");
    expect(issueEnvoi({ code: "unexpected_failure", status: 500 })).toBe("envoi");
    expect(issueEnvoi({ code: "email_address_not_authorized", status: 400 })).toBe("envoi");
  });

  it("les métadonnées : CGU datées dans user_metadata ; le consentement aux nouveautés, daté, à part (app_metadata, serveur seul)", () => {
    expect(metadonneesInscription({ methode: "lien", maintenant: MAINTENANT })).toEqual({ cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien" });
    expect(metadonneesInscription({ methode: "mot_de_passe", maintenant: MAINTENANT })).toEqual({ cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "mot_de_passe" });
    expect(consentementNouveautes(MAINTENANT)).toEqual({ newsletter: true, newsletter_le: "2026-10-15T10:00:00.000Z" });
    // Ce qu'un tiers a pu écrire d'avance (inscription directe auprès de Supabase) et que le site affiche ou lit : effacé (`null`).
    expect(metadonneesEffacees()).toEqual({ nom: null, username: null, profil: null, profil_le: null, onboarding_fait: null, newsletter: null, newsletter_le: null });
    expect(METADONNEES_D_UN_TIERS).not.toContain("cgu_acceptees_le");
  });

  it("mot de passe oublié : tout ce qui dépend de l'adresse répond comme un envoi (pas d'énumération) ; l'adresse mal formée et la limite par IP sont dites", () => {
    expect(issueReset(null)).toBe("envoye");
    // « attends 52 secondes » ne vient que d'une adresse qui a un compte (Supabase n'écrit pas aux autres).
    for (const e of [{ code: "over_email_send_rate_limit", status: 429 }, { status: 429 }, { code: "unexpected_failure", status: 500 }, { code: "user_banned", status: 400 }]) {
      expect(issueReset(e), JSON.stringify(e)).toBe("envoye");
    }
    expect(issueReset({ code: "over_request_rate_limit", status: 429 })).toBe("limite");
    expect(issueReset({ code: "email_address_invalid", status: 400 })).toBe("email");
    expect(issueReset({ code: "validation_failed", status: 400 })).toBe("email");
  });

  it("le compte qui vient de naître : lien (adresse confirmée à l'instant) ou Google (créé à l'instant)", () => {
    const t = MAINTENANT.getTime();
    const il = (ms: number) => new Date(t - ms).toISOString();
    expect(methodeNouveauCompte({ user_metadata: { inscription: "lien" }, email_confirmed_at: il(5_000) }, t)).toBe("lien");
    // Une connexion par lien, des semaines après l'inscription : rien.
    expect(methodeNouveauCompte({ user_metadata: { inscription: "lien" }, email_confirmed_at: il(30 * 86_400_000) }, t)).toBeNull();
    expect(methodeNouveauCompte({ user_metadata: { inscription: "lien" }, email_confirmed_at: il(FENETRE_NOUVEAU_COMPTE_MS) }, t)).toBeNull();
    // L'inscription au mot de passe est mesurée par son action : pas une seconde fois au retour du lien.
    expect(methodeNouveauCompte({ user_metadata: { inscription: "mot_de_passe" }, email_confirmed_at: il(5_000) }, t)).toBeNull();
    expect(methodeNouveauCompte({ user_metadata: {}, email_confirmed_at: il(5_000) }, t)).toBeNull();
    expect(methodeNouveauCompte({ app_metadata: { provider: "google" }, created_at: il(3_000) }, t)).toBe("google");
    expect(methodeNouveauCompte({ app_metadata: { provider: "google" }, created_at: il(FENETRE_NOUVEAU_COMPTE_MS) }, t)).toBeNull();
    // Adresse confirmée par un clic ouvert ailleurs (PKCE), connectée au lien suivant, deux heures plus tard : comptée.
    expect(methodeNouveauCompte({ user_metadata: { inscription: "lien" }, email_confirmed_at: il(2 * 3_600_000) }, t)).toBe("lien");
    // Une fois mesuré (marque posée), plus jamais : un deuxième lien dans la foulée ne crée pas un second compte.
    expect(methodeNouveauCompte({ user_metadata: { inscription: "lien", compte_cree_le: il(60_000) }, email_confirmed_at: il(90_000) }, t)).toBeNull();
    expect(methodeNouveauCompte({ user_metadata: { compte_cree_le: il(1_000) }, app_metadata: { provider: "google" }, created_at: il(3_000) }, t)).toBeNull();
    for (const u of [null, undefined, {}, { user_metadata: { inscription: "lien" }, email_confirmed_at: "pas une date" }]) {
      expect(methodeNouveauCompte(u, t)).toBeNull();
    }
  });

  it("« Ouvrir ma messagerie » : Gmail, Outlook, iCloud (et Yahoo, Orange) ; sinon rien", () => {
    expect(messagerieDe("camille@gmail.com")).toEqual({ nom: "Gmail", url: "https://mail.google.com/mail/" });
    expect(messagerieDe("  Dani@Live.FR ")?.nom).toBe("Outlook");
    expect(messagerieDe("x@hotmail.fr")?.nom).toBe("Outlook");
    expect(messagerieDe("x@icloud.com")?.nom).toBe("iCloud");
    expect(messagerieDe("x@me.com")?.url).toBe("https://www.icloud.com/mail");
    expect(messagerieDe("x@yahoo.fr")?.nom).toBe("Yahoo");
    expect(messagerieDe("x@orange.fr")?.nom).toBe("Orange");
    for (const x of ["camille@exemple.fr", "x@gmail.com.evil.fr", "pas-une-adresse", ""]) expect(messagerieDe(x), x).toBeNull();
  });

  it("un brouillon à ranger (Enregistrer une estimation, un plan) : les drapeaux de ClaimDraft et ClaimPlan", () => {
    const lecteur = (o: Record<string, string>) => (k: string) => o[k] ?? null;
    expect(reclamationEnAttente(lecteur({}))).toBe(false);
    expect(reclamationEnAttente(lecteur({ "avyora-estim-claim": "1" }))).toBe(true);
    expect(reclamationEnAttente(lecteur({ "avyora-estim-claim": "neuf" }))).toBe(true);
    expect(reclamationEnAttente(lecteur({ "avyora-neuf-claim": "1" }))).toBe(true);
    expect(reclamationEnAttente(lecteur({ "avyora-plan-claim": "abc" }))).toBe(true);
    expect(reclamationEnAttente(lecteur({ "avyora-estim-v2": "{}" }))).toBe(false); // un brouillon seul, sans « Enregistrer »
  });

  it("le délai du renvoi est celui de Supabase (60 s)", () => {
    expect(DELAI_RENVOI_S).toBe(60);
  });

  it("l'intention d'un lien token_hash : `next={{ .RedirectTo }}` (URL absolue du site, encodée ou non), déroulée", () => {
    const nos = ["https://getavyora.fr", "http://localhost:3021"];
    const cas: [string | null | undefined, string][] = [
      // Le modèle encode {{ .RedirectTo }} (html/template, contexte de requête) : URLSearchParams l'a déjà décodé une fois.
      ["https://getavyora.fr/auth/callback?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1", "/projets/nouveau/detaille?affiner=1"],
      ["https://getavyora.fr/auth/callback?next=%2Fplan", "/plan"],
      ["https://getavyora.fr/auth/callback?next=%2Fonboarding", "/onboarding"],
      // Non encodé : le `next` intérieur a été décodé avec l'extérieur, un `?` y reste lisible.
      ["https://getavyora.fr/auth/callback?next=/projets/nouveau/detaille?affiner=1", "/projets/nouveau/detaille?affiner=1"],
      ["http://localhost:3021/auth/callback?next=%2Fplan", "/plan"],
      ["https://getavyora.fr/auth/confirm?next=%2Fplan", "/plan"],
      ["https://getavyora.fr/plan?id=abc", "/plan?id=abc"],
      // Un chemin interne écrit en dur dans le modèle (mot de passe oublié).
      ["/reset/definir", "/reset/definir"],
      ["/auth/callback?next=%2Fplan", "/plan"],
      // Supabase retombe sur la Site URL quand l'adresse de retour n'est pas autorisée : pas d'intention.
      ["https://getavyora.fr", "/projets"],
      ["https://getavyora.fr/", "/projets"],
      // Tout ce qui n'est pas à nous, ou pas un chemin interne.
      ["https://evil.com/auth/callback?next=%2Fplan", "/projets"],
      ["https://getavyora.fr.evil.com/plan", "/projets"],
      ["https://getavyora.fr@evil.com/plan", "/projets"],
      ["//evil.com", "/projets"],
      ["/\\evil.com", "/projets"],
      ["javascript:alert(1)", "/projets"],
      ["https://getavyora.fr/\t/evil.com", "/projets"],
      ["https://getavyora.fr/auth/callback?next=%2F%2Fevil.com", "/projets"],
      ["https://getavyora.fr/auth/callback?next=https%3A%2F%2Fevil.com", "/projets"],
      ["https://getavyora.fr/auth/callback?next=%2F%09%2Fevil.com", "/projets"],
      // Des passages imbriqués sans fin : on s'arrête.
      ["/auth/confirm?next=%2Fauth%2Fconfirm%3Fnext%3D%252Fauth%252Fconfirm%253Fnext%253D%25252Fplan", "/projets"],
      ["", "/projets"],
      [null, "/projets"],
      [undefined, "/projets"],
      [`https://getavyora.fr/${"x".repeat(600)}`, "/projets"],
    ];
    for (const [next, attendu] of cas) expect(intentionDuLien(next, nos), JSON.stringify(next)).toBe(attendu);
    // Aucune origine « null » acceptée, même si on la passait.
    expect(intentionDuLien("javascript:alert(1)", ["null"])).toBe("/projets");
  });

  it("le lien en attente du bouton : jeton bien formé, type connu, chemin interne ; sinon rien", () => {
    expect(lireTypeLien("email")).toBe("email");
    expect(lireTypeLien("recovery")).toBe("recovery");
    for (const x of ["", "sms", "phone_change", null, 3]) expect(lireTypeLien(x)).toBeNull();
    const jeton = "pkce_" + "a1".repeat(28);
    expect(jetonValide(jeton)).toBe(true);
    for (const x of ["", "court", "a b c d e f g h", "x".repeat(300), "<script>", null]) expect(jetonValide(x), String(x)).toBe(false);
    const v = ecrireLienEnAttente({ jeton, type: "email", next: "/plan" });
    expect(lireLienEnAttente(v)).toEqual({ jeton, type: "email", next: "/plan" });
    // Un cookie trafiqué : l'intention retombe sur /projets, un jeton ou un type invalide annule tout.
    expect(lireLienEnAttente(JSON.stringify({ h: jeton, t: "email", n: "//evil.com" }))).toEqual({ jeton, type: "email", next: "/projets" });
    for (const x of [undefined, "", "{", JSON.stringify({ h: "x", t: "email", n: "/" }), JSON.stringify({ h: jeton, t: "sms", n: "/" })]) {
      expect(lireLienEnAttente(x), String(x)).toBeNull();
    }
  });
});

describe("lib/auth-lien : la trace des demandes de ce navigateur (av-demande) et le contrôle du mot de passe", () => {
  const T = MAINTENANT.getTime();
  const s = Math.floor(T / 1000);
  const E1 = "a".repeat(32), E2 = "b".repeat(32);

  it("l'empreinte d'une adresse : un HMAC du serveur (32 hexadécimaux), pas un SHA-256 sans sel ; nettoyée avant", () => {
    const e = empreinteAdresse("camille@exemple.fr");
    expect(e).toMatch(/^[0-9a-f]{32}$/);
    expect(empreinteAdresse("  Camille@Exemple.FR ")).toBe(e);
    expect(empreinteAdresse("zoe@exemple.fr")).not.toBe(e);
    expect(e).not.toBe(createHash("sha256").update("camille@exemple.fr").digest("hex").slice(0, 32));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "une-autre-cle");
    expect(empreinteAdresse("camille@exemple.fr")).not.toBe(e);
  });

  it("l'empreinte sans clé du serveur : en production, un secret aléatoire de l'instance (jamais une valeur connue) ; ailleurs, la clé de développement", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(secretEmpreinte()).toBe("avyora-empreinte:developpement");
    const dev = empreinteAdresse("camille@exemple.fr");
    vi.stubEnv("NODE_ENV", "production");
    const prod = secretEmpreinte();
    expect(prod).toMatch(/^avyora-empreinte:instance:[0-9a-f]{64}$/);
    expect(secretEmpreinte()).toBe(prod); // stable pour l'instance : une limite compte bien la même adresse
    expect(empreinteAdresse("camille@exemple.fr")).not.toBe(dev);
    expect(empreinteAdresse("camille@exemple.fr")).toMatch(/^[0-9a-f]{32}$/);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "cle-du-serveur");
    expect(secretEmpreinte()).toBe("avyora-empreinte:cle-du-serveur");
  });

  it("lire, ajouter, trouver : 24 h, 5 adresses au plus, une entrée par adresse, « mdp » acquis, la dernière case des nouveautés", () => {
    expect(DUREE_DEMANDE_S).toBe(86_400);
    let v = ajouterDemande(undefined, { e: E1, m: "lien", t: s, n: true }, T);
    expect(lireDemandes(v, T)).toEqual([{ e: E1, m: "lien", t: s, n: true }]);
    v = ajouterDemande(v, { e: E1, m: "mdp", t: s + 5 }, T);
    expect(trouverDemande(v, E1, T)).toEqual({ e: E1, m: "mdp", t: s + 5 });
    v = ajouterDemande(v, { e: E1, m: "lien", t: s + 9, n: true }, T);
    expect(trouverDemande(v, E1, T)).toEqual({ e: E1, m: "mdp", t: s + 9, n: true }); // le mot de passe a bien été choisi ici
    v = ajouterDemande(v, { e: E2, m: "reset", t: s }, T);
    expect(trouverDemande(v, E2, T)?.m).toBe("reset");
    expect(trouverDemande(v, "c".repeat(32), T)).toBeNull();
    // 24 h plus tard, plus rien.
    expect(lireDemandes(v, T + 86_400_000 + 10_000)).toEqual([]);
    // Au plus cinq adresses : les plus récentes.
    let w = "";
    for (let i = 0; i < 7; i++) w = ajouterDemande(w, { e: String(i).repeat(32), m: "lien", t: s + i }, T);
    expect(lireDemandes(w, T).map((d) => d.e[0])).toEqual(["2", "3", "4", "5", "6"]);
    // Un cookie trafiqué : ignoré, entrée par entrée.
    const trafique = JSON.stringify([{ e: "camille@exemple.fr", m: "lien", t: s }, { e: E1, m: "admin", t: s }, { e: E1, m: "lien", t: s + 999_999 }, { e: E2, m: "lien", t: s }]);
    expect(lireDemandes(trafique, T)).toEqual([{ e: E2, m: "lien", t: s }]);
    for (const x of [undefined, "", "{", "{}", "[1]", JSON.stringify({ e: E1 })]) expect(lireDemandes(x, T)).toEqual([]);
  });

  it("le contrôle du mot de passe : dans l'heure qui suit la confirmation, une fois (marque serveur) ; refait si l'adresse a changé", () => {
    const il = (ms: number) => new Date(T - ms).toISOString();
    const C = "camille@exemple.fr";
    expect(FENETRE_CONTROLE_MDP_MS).toBe(3_600_000);
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(1_000), app_metadata: {} }, T)).toBe("confirmation");
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(59 * 60_000), app_metadata: { provider: "email" } }, T)).toBe("confirmation");
    // Confirmé il y a plus d'une heure, jamais contrôlé (compte d'avant B2) : l'adresse est retenue, le mot de passe gardé.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(61 * 60_000), app_metadata: {} }, T)).toBe("noter");
    // Contrôlé, adresse retenue : rien.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(1_000), app_metadata: { [MARQUE_MDP]: il(500), [MARQUE_MDP_EMAIL]: C } }, T)).toBeNull();
    expect(controleMdpAFaire({ email: " Camille@Exemple.FR", email_confirmed_at: il(9e9), app_metadata: { [MARQUE_MDP]: il(9e9), [MARQUE_MDP_EMAIL]: C } }, T)).toBeNull();
    // Contrôlé avant que l'adresse soit retenue : on la retient, sans rien toucher.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(1_000), app_metadata: { [MARQUE_MDP]: il(500) } }, T)).toBe("noter");
    // Le compte d'un tiers passé à l'adresse de sa victime (changement d'adresse confirmé chez Supabase) : à refaire,
    // quelle que soit l'ancienneté de la confirmation.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(40 * 86_400_000), app_metadata: { [MARQUE_MDP]: il(9e9), [MARQUE_MDP_EMAIL]: "tiers@exemple.fr" } }, T)).toBe("changement");
    // Le même compte, jamais passé par le site (aucune marque), ou contrôlé sans adresse retenue : Supabase a envoyé une
    // demande de changement d'adresse.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(40 * 86_400_000), email_change_sent_at: il(600_000), app_metadata: {} }, T)).toBe("changement");
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(30 * 60_000), email_change_sent_at: il(600_000), app_metadata: {} }, T)).toBe("changement");
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(9e9), email_change_sent_at: il(600_000), app_metadata: { [MARQUE_MDP]: il(9e9) } }, T)).toBe("changement");
    // Une marque ou une adresse retenue posées par l'utilisateur (user_metadata) ne comptent pas.
    expect(controleMdpAFaire({ email: C, email_confirmed_at: il(1_000), app_metadata: {}, user_metadata: { [MARQUE_MDP]: il(1), [MARQUE_MDP_EMAIL]: C } } as never, T)).toBe("confirmation");
    for (const u of [null, undefined, {}, { email_confirmed_at: null }, { email: C, email_confirmed_at: "pas une date" }]) expect(controleMdpAFaire(u, T)).toBeNull();
  });

  it("après la vérification : un chemin interne hors de /auth, sinon /projets", () => {
    expect(suiteVerification("/plan")).toBe("/plan");
    expect(suiteVerification("/projets/nouveau/detaille?affiner=1")).toBe("/projets/nouveau/detaille?affiner=1");
    for (const x of ["/auth/verifier?next=%2Fplan", "/auth/confirmer", "/auth", "//evil.com", "https://evil.com", "/\t/evil.com", "", null, undefined]) {
      expect(suiteVerification(x), String(x)).toBe("/projets");
    }
  });
});

/* ─── 2. L'action (Supabase simulé) ──────────────────────────────────────────── */

type Otp = { email: string; options: { shouldCreateUser: boolean; emailRedirectTo: string; data: Record<string, unknown> } };
type ErreurSupabase = { code?: string; status?: number; message?: string } | null;

const S = {
  ip: "1.2.3.4",
  erreur: null as ErreurSupabase,
  otp: [] as Otp[],
  inscriptions: [] as { email: string; options: { data: Record<string, unknown>; emailRedirectTo: string } }[],
  journal: [] as [string, Record<string, unknown>][],
  mesures: [] as [string, Record<string, unknown>][],
  /** Les cookies du navigateur simulé (les actions lisent et posent `av-demande`). */
  cookies: new Map<string, string>(),
  poses: [] as [string, string, Record<string, unknown>][],
  majs: [] as unknown[],
  /** `created_at` du compte que signUp renvoie (un compte qui existait déjà, non confirmé, garde le sien). */
  creeLe: null as string | null,
  session: null as unknown,
  resets: [] as unknown[],
  connexions: [] as unknown[],
  /** Les écritures du serveur (clé service_role) : `app_metadata`. */
  admin: [] as [string, unknown][],
};

/** Le mot de passe que la connexion simulée refuse. */
const MDP_REFUSE = "mauvais-mot-de-passe-2026";

/** Le magasin de cookies de `next/headers`, simulé sur `S.cookies`. */
const magasin = () => ({
  get: (n: string) => (S.cookies.has(n) ? { name: n, value: S.cookies.get(n) as string } : undefined),
  getAll: () => [...S.cookies].map(([name, value]) => ({ name, value })),
  set: (n: string, v: string, o: Record<string, unknown> = {}) => {
    S.poses.push([n, v, o]);
    if (o.maxAge === 0) S.cookies.delete(n);
    else S.cookies.set(n, v);
  },
  delete: (n: string) => { S.cookies.delete(n); },
});

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

/** Le module des actions, avec Supabase, les en-têtes, le journal et la mesure simulés. `production` : limites en mémoire. */
async function actions(env: "production" | "local" = "local") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.stubEnv("VERCEL_ENV", env === "production" ? "production" : "development");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.doMock("next/headers", () => ({
    headers: async () => new Headers({ "x-forwarded-for": S.ip, host: "localhost:3021" }),
    cookies: async () => magasin(),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    supabaseServer: async () => ({
      auth: {
        signInWithOtp: async (o: Otp) => {
          S.otp.push(o);
          return { data: { user: null, session: null }, error: S.erreur };
        },
        signUp: async (o: (typeof S.inscriptions)[number]) => {
          S.inscriptions.push(o);
          return { data: { user: { id: "u-nouveau", created_at: S.creeLe ?? new Date().toISOString() }, session: S.session }, error: null };
        },
        resetPasswordForEmail: async (_e: string, o: unknown) => { S.resets.push(o); return { data: {}, error: S.erreur }; },
        signInWithPassword: async (o: { password?: string }) => {
          S.connexions.push(o);
          return o.password === MDP_REFUSE
            ? { data: { user: null }, error: { message: "Invalid login credentials" } }
            : { data: { user: { id: "u1" } }, error: null };
        },
        updateUser: async (p: unknown) => { S.majs.push(p); return { data: {}, error: null }; },
      },
    }),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    supabaseAdmin: () => ({ auth: { admin: { updateUserById: async (id: string, o: unknown) => { S.admin.push([id, o]); return { data: {}, error: null }; } } } }),
  }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, o: Record<string, unknown>) => { S.journal.push([type, o]); } }));
  vi.doMock("@/lib/track-server", () => ({ suivreServeur: async (nom: string, p: Record<string, unknown>) => { S.mesures.push([nom, p]); } }));
  return import("@/lib/actions/auth");
}

const ACTION_MOCKS = ["next/headers", "@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/audit", "@/lib/track-server"];

describe("envoyerLienAcces : le lien d'accès (aucun e-mail réel)", () => {
  beforeEach(() => {
    S.ip = "1.2.3.4";
    S.erreur = null;
    S.otp = [];
    S.inscriptions = [];
    S.journal = [];
    S.mesures = [];
    S.cookies = new Map();
    S.poses = [];
    S.majs = [];
    S.creeLe = null;
    S.session = null;
    S.resets = [];
    S.connexions = [];
    S.admin = [];
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(MAINTENANT);
  });
  const demandeIci = (email: string) => trouverDemande(S.cookies.get(COOKIE_DEMANDE), empreinteAdresse(email), MAINTENANT.getTime());
  const SEC = Math.floor(MAINTENANT.getTime() / 1000);
  afterEach(() => {
    for (const m of ACTION_MOCKS) vi.doUnmock(m);
  });

  it("inscription : signInWithOtp crée le compte, le lien ramène à l'intention, les CGU sont datées, la case reste décochée", async () => {
    const m = await actions();
    const r = await m.envoyerLienAcces(undefined, fd({ email: "  Camille@Exemple.FR ", page: "inscription", next: "/projets/nouveau/detaille?affiner=1" }));
    expect(r).toEqual({ envoye: true, email: "camille@exemple.fr", renvoi: false });
    expect(S.otp).toEqual([{
      email: "camille@exemple.fr",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://getavyora.fr/auth/callback?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1",
        data: { cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien" },
      },
    }]);
    // Le journal ne garde que l'empreinte de l'adresse (elle peut être celle d'un tiers).
    expect(S.journal).toEqual([["lien_acces_demande", { payload: { page: "inscription", issue: "envoye", empreinte: empreinteAdresse("camille@exemple.fr") } }]]);
    expect(JSON.stringify(S.journal)).not.toMatch(/camille|exemple/i);
    // La trace de ce navigateur : httpOnly, chemin / (relue par les actions de /inscription et /connexion), 24 h ; l'empreinte, jamais l'adresse.
    expect(demandeIci("camille@exemple.fr")).toEqual({ e: empreinteAdresse("camille@exemple.fr"), m: "lien", t: SEC });
    const pose = S.poses.find(([n]) => n === COOKIE_DEMANDE);
    expect(pose?.[2]).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 86_400 });
    expect(pose?.[1]).not.toMatch(/camille|exemple/i);
    // La création du compte n'est pas connue ici (pas d'énumération) : `compte_cree` part de /auth/callback.
    expect(S.mesures).toEqual([]);
  });

  it("la case des nouveautés cochée : RIEN à la création (n'importe qui peut taper l'adresse d'un autre), la trace de ce navigateur la garde ; « Renvoyer » le dit", async () => {
    const m = await actions();
    const r = await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription", newsletter: "on", renvoi: "1" }));
    expect(r).toEqual({ envoye: true, email: "camille@exemple.fr", renvoi: true });
    expect(S.otp[0].options.data).toEqual({ cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien" });
    expect(demandeIci("camille@exemple.fr")).toEqual({ e: empreinteAdresse("camille@exemple.fr"), m: "lien", t: SEC, n: true });
    expect(S.admin).toEqual([]);
    expect(S.otp[0].options.emailRedirectTo).toBe("https://getavyora.fr/auth/callback?next=%2Fonboarding");
  });

  it("connexion : sans intention, /projets ; la case des nouveautés n'y existe pas (ignorée si elle arrive)", async () => {
    const m = await actions();
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "connexion", newsletter: "on" }));
    expect(S.otp[0].options.shouldCreateUser).toBe(true);
    expect(S.otp[0].options.emailRedirectTo).toBe("https://getavyora.fr/auth/callback?next=%2Fprojets");
    expect(S.otp[0].options.data).not.toHaveProperty("newsletter");
    expect(S.otp[0].options.data).not.toHaveProperty("newsletter_le");
    expect(demandeIci("camille@exemple.fr")).not.toHaveProperty("n");
  });

  it("un envoi refusé (limite, adresse invalide, panne) ne laisse aucune trace de demande", async () => {
    S.erreur = { code: "over_email_send_rate_limit", status: 429 };
    const m = await actions();
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription" }));
    expect(S.cookies.has(COOKIE_DEMANDE)).toBe(false);
  });

  it("next assaini : tout ce qui n'est pas un chemin interne retombe sur la page par défaut", async () => {
    const m = await actions();
    for (const next of ["//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "/a\r\nSet-Cookie: x=1", `/${"x".repeat(600)}`]) {
      await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription", next }));
      expect(S.otp.at(-1)?.options.emailRedirectTo, JSON.stringify(next)).toBe("https://getavyora.fr/auth/callback?next=%2Fonboarding");
    }
  });

  it("une adresse mal formée : l'erreur « email », sans appel à Supabase", async () => {
    const m = await actions();
    for (const email of ["", "camille", "camille@exemple"]) {
      expect(await m.envoyerLienAcces(undefined, fd({ email, page: "inscription" }))).toEqual({ erreur: "email" });
    }
    expect(S.otp).toEqual([]);
  });

  it("réponse identique que l'adresse ait un compte ou non (banni, inscriptions fermées…) : pas d'énumération", async () => {
    const reponses = [];
    for (const erreur of [null, { code: "user_banned", status: 400 }, { code: "signup_disabled", status: 422 }, { code: "otp_disabled", status: 422 }]) {
      S.erreur = erreur;
      const m = await actions();
      reponses.push(await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "connexion" })));
    }
    for (const r of reponses) expect(r).toEqual(reponses[0]);
    expect(reponses[0]).toEqual({ envoye: true, email: "camille@exemple.fr", renvoi: false });
  });

  it("les erreurs de Supabase traduites en trois codes, chacun avec son texte FR et EN", async () => {
    for (const [erreur, code] of [
      [{ code: "over_email_send_rate_limit", status: 429, message: "For security purposes, you can only request this after 42 seconds." }, "limite"],
      [{ code: "email_address_invalid", status: 400, message: "Email address is invalid" }, "email"],
      [{ code: "unexpected_failure", status: 500, message: "Error sending magic link email" }, "envoi"],
    ] as const) {
      S.erreur = erreur;
      const m = await actions();
      const r = await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription" }));
      expect(r).toEqual({ erreur: code });
      for (const l of LOCALES) {
        const texte = dict(l).auth.lien.erreurs[code];
        expect(texte.length).toBeGreaterThan(20);
        expect(texte).not.toContain(erreur.message); // jamais le message brut de Supabase, en anglais
      }
    }
  });

  it("production sans Upstash : 6 demandes / min par IP, 20 / h par IP, puis 3 / h pour une même adresse depuis une même IP", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let m = await actions("production");
    for (let i = 0; i < 6; i++) {
      expect(await m.envoyerLienAcces(undefined, fd({ email: `x${i}@exemple.fr`, page: "inscription" }))).toMatchObject({ envoye: true });
    }
    expect(await m.envoyerLienAcces(undefined, fd({ email: "x9@exemple.fr", page: "inscription" }))).toEqual({ erreur: "limite" });
    expect(S.otp).toHaveLength(6);
    S.ip = "5.6.7.8";
    expect(await m.envoyerLienAcces(undefined, fd({ email: "x9@exemple.fr", page: "inscription" }))).toMatchObject({ envoye: true });

    // Une même adresse depuis une même IP : la quatrième demande de l'heure est refusée (un envoi et deux « Renvoyer »),
    // même à une minute d'intervalle.
    m = await actions("production");
    S.otp = [];
    S.ip = "10.0.0.1";
    for (let i = 0; i < 3; i++) {
      vi.setSystemTime(MAINTENANT.getTime() + i * 61_000);
      expect(await m.envoyerLienAcces(undefined, fd({ email: "cible@exemple.fr", page: "connexion" }))).toMatchObject({ envoye: true });
    }
    vi.setSystemTime(MAINTENANT.getTime() + 3 * 61_000);
    expect(await m.envoyerLienAcces(undefined, fd({ email: "cible@exemple.fr", page: "connexion" }))).toEqual({ erreur: "limite" });
    expect(S.otp).toHaveLength(3);
    // La même adresse depuis d'autres IP : pas de plafond toutes IP confondues (intervalle de 60 s de Supabase, CAPTCHA).
    for (let i = 0; i < 5; i++) {
      S.ip = `10.0.1.${i}`;
      expect(await m.envoyerLienAcces(undefined, fd({ email: "cible@exemple.fr", page: "connexion" })), String(i)).toMatchObject({ envoye: true });
    }
    vi.setSystemTime(MAINTENANT);

    // Une même IP qui fait défiler les adresses, une par minute : la vingt et unième de l'heure est refusée.
    m = await actions("production");
    S.otp = [];
    S.ip = "9.9.9.9";
    for (let i = 0; i < 20; i++) {
      vi.setSystemTime(MAINTENANT.getTime() + i * 61_000);
      expect(await m.envoyerLienAcces(undefined, fd({ email: `liste${i}@exemple.fr`, page: "inscription" })), String(i)).toMatchObject({ envoye: true });
    }
    vi.setSystemTime(MAINTENANT.getTime() + 21 * 61_000);
    expect(await m.envoyerLienAcces(undefined, fd({ email: "liste99@exemple.fr", page: "inscription" }))).toEqual({ erreur: "limite" });
    expect(S.otp).toHaveLength(20);
    vi.restoreAllMocks();
  });

  it("verrouillage ciblé (2e contre-examen, sonde A7) : un tiers qui demande trois liens par heure pour l'adresse d'une personne ne l'empêche ni de recevoir le sien, ni « mot de passe oublié »", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = await actions("production");
    S.ip = "6.6.6.6";
    for (let i = 0; i < 3; i++) {
      vi.setSystemTime(MAINTENANT.getTime() + i * 61_000);
      expect(await m.envoyerLienAcces(undefined, fd({ email: "victime@exemple.fr", page: "connexion" }))).toMatchObject({ envoye: true });
    }
    vi.setSystemTime(MAINTENANT.getTime() + 3 * 61_000);
    expect(await m.envoyerLienAcces(undefined, fd({ email: "victime@exemple.fr", page: "connexion" }))).toEqual({ erreur: "limite" });
    // La personne, depuis chez elle, dans la même heure.
    S.ip = "81.1.2.3";
    expect(await m.envoyerLienAcces(undefined, fd({ email: "victime@exemple.fr", page: "connexion" }))).toMatchObject({ envoye: true });
    expect(await m.requestReset(undefined, fd({ email: "victime@exemple.fr" }))).toMatchObject({ message: expect.any(String) });
    expect(S.otp).toHaveLength(4);
    expect(S.resets).toHaveLength(1);
    vi.setSystemTime(MAINTENANT);
    vi.restoreAllMocks();
  });

  it("les clés de limite ne portent jamais l'adresse en clair (Upstash, mémoire) : son empreinte", async () => {
    const cles: [string, string][] = [];
    vi.doMock("@/lib/ratelimit", () => ({
      clientIp: async () => S.ip,
      verifierLimite: async (k: string, id: string) => { cles.push([k, id]); return true; },
    }));
    try {
      const m = await actions();
      await m.envoyerLienAcces(undefined, fd({ email: "  Camille@Exemple.FR ", page: "inscription" }));
      await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "connexion" }));
      await m.envoyerLienAcces(undefined, fd({ email: "zoe@exemple.fr", page: "connexion" }));
    } finally {
      vi.doUnmock("@/lib/ratelimit");
    }
    expect(cles.filter(([, id]) => id === "1.2.3.4").map(([k]) => k)).toEqual(["auth", "lienIp", "auth", "lienIp", "auth", "lienIp"]);
    const adresses = cles.filter(([, id]) => id !== "1.2.3.4");
    expect(adresses.map(([k]) => k)).toEqual(["lienAdresse", "lienAdresse", "lienAdresse"]);
    for (const [, id] of adresses) {
      // L'adresse (en empreinte) depuis cette IP : jamais un compteur que d'autres IP rempliraient.
      expect(id).toMatch(/^[0-9a-f]{32}:1\.2\.3\.4$/);
      expect(id).not.toMatch(/camille|zoe|exemple/i);
    }
    expect(adresses[0][1]).toBe(`${empreinteAdresse("camille@exemple.fr")}:1.2.3.4`); // HMAC du serveur, pas un SHA-256 sans sel
    expect(adresses[0][1]).toBe(adresses[1][1]); // même adresse, même compteur
    expect(adresses[2][1]).not.toBe(adresses[0][1]);
  });

  it("l'inscription au mot de passe (repliée) date aussi les CGU ; la trace dit « mot de passe choisi ici » et la case ; compte_cree porte la méthode", async () => {
    const m = await actions();
    const r = await m.signup(undefined, fd({ nom: "Camille", email: "camille@exemple.fr", password: "chantier2026maison", accept: "on", newsletter: "on" }));
    expect(r).toMatchObject({ message: expect.any(String) });
    expect(S.inscriptions[0].options.data).toEqual({ nom: "Camille", cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "mot_de_passe" });
    expect(JSON.stringify(S.inscriptions[0].options.data)).not.toContain("newsletter");
    expect(demandeIci("camille@exemple.fr")).toEqual({ e: empreinteAdresse("camille@exemple.fr"), m: "mdp", t: SEC, n: true });
    expect(S.mesures).toEqual([["compte_cree", { confirme: false, destination: "/onboarding", methode: "mot_de_passe" }]]);
  });

  it("l'inscription au mot de passe sur un compte qui existait déjà, non confirmé (peut-être préparé par un tiers) : le mot de passe n'est PAS « choisi ici »", async () => {
    // Supabase ne modifie pas un compte non confirmé : il renvoie le compte d'avant, avec sa date de création.
    S.creeLe = "2026-10-14T08:00:00.000Z";
    const m = await actions();
    await m.signup(undefined, fd({ nom: "Camille", email: "camille@exemple.fr", password: "chantier2026maison" }));
    expect(demandeIci("camille@exemple.fr")?.m).toBe("lien");
  });

  it("un compte créé par un tiers une minute avant l'inscription n'est pas « né de cet appel » : sa date est comparée à l'heure lue juste avant", async () => {
    for (const [creeLe, attendu] of [
      [new Date(MAINTENANT.getTime() - 60_000).toISOString(), "lien"], // une minute avant : déjà là
      [new Date(MAINTENANT.getTime() - 110_000).toISOString(), "lien"], // dans les deux minutes de l'ancienne règle : déjà là
      [new Date(MAINTENANT.getTime() - 3_000).toISOString(), "mdp"], // décalage d'horloges (5 s au plus) : né de l'appel
      [MAINTENANT.toISOString(), "mdp"],
    ] as const) {
      S.creeLe = creeLe;
      S.cookies = new Map();
      const m = await actions();
      await m.signup(undefined, fd({ email: "camille@exemple.fr", password: "chantier2026maison" }));
      expect(demandeIci("camille@exemple.fr")?.m, creeLe).toBe(attendu);
    }
  });

  it("un mot de passe refusé (pas de chiffre, trop courant) ne consomme pas les envois de l'adresse : le lien reste possible", async () => {
    const m = await actions("production");
    for (let i = 0; i < 5; i++) {
      const r = await m.signup(undefined, fd({ email: "camille@exemple.fr", password: "chantierdemaison" }));
      expect(r?.error, String(i)).toMatch(/chiffre/);
    }
    expect(S.inscriptions).toEqual([]);
    expect(await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription" }))).toMatchObject({ envoye: true });
  });

  it("le journal ne garde pas en clair l'adresse tapée d'une inscription au mot de passe (non confirmée) ni d'une connexion échouée", async () => {
    const m = await actions();
    await m.signup(undefined, fd({ email: "Camille@Exemple.fr", password: "chantier2026maison" }));
    expect(S.journal).toEqual([["inscription", { userId: "u-nouveau", payload: { methode: "mot_de_passe", empreinte: empreinteAdresse("camille@exemple.fr") } }]]);
    S.journal = [];
    expect(await m.login(undefined, fd({ email: "zoe@exemple.fr", password: MDP_REFUSE }))).toEqual({ error: "Email ou mot de passe incorrect." });
    expect(S.journal).toEqual([["connexion_echouee", { payload: { empreinte: empreinteAdresse("zoe@exemple.fr") } }]]);
    expect(JSON.stringify(S.journal)).not.toMatch(/zoe|camille|exemple/i);
  });

  it("sans confirmation d'e-mail (réglage Supabase), la session s'ouvre ici même : le consentement est enregistré tout de suite", async () => {
    S.session = { access_token: "x" };
    const m = await actions();
    // La redirection de Next (NEXT_REDIRECT) porte l'adresse dans son `digest`.
    let url: string | undefined;
    try {
      await m.signup(undefined, fd({ email: "camille@exemple.fr", password: "chantier2026maison", newsletter: "on" }));
    } catch (e) {
      url = String((e as { digest?: string }).digest ?? "").split(";")[2];
    }
    expect(url).toBe("/onboarding");
    // Dans app_metadata, que seul le serveur écrit.
    expect(S.admin).toEqual([["u-nouveau", { app_metadata: { newsletter: true, newsletter_le: "2026-10-15T10:00:00.000Z" } }]]);
    expect(S.majs).toEqual([]);
  });

  it("une inscription qui ouvre la session, une connexion au mot de passe : une arrivée « à vérifier » d'avant est oubliée", async () => {
    S.session = { access_token: "x" };
    S.cookies = new Map([[COOKIE_VERIFIER, "u-tiers"]]);
    let m = await actions();
    await redirection(async () => { try { await m.signup(undefined, fd({ email: "camille@exemple.fr", password: "chantier2026maison" })); } catch { /* NEXT_REDIRECT */ } });
    expect(S.cookies.has(COOKIE_VERIFIER)).toBe(false);
    S.cookies = new Map([[COOKIE_VERIFIER, "u-tiers"]]);
    m = await actions();
    await redirection(async () => { try { await m.login(undefined, fd({ email: "camille@exemple.fr", password: "chantier2026maison" })); } catch { /* NEXT_REDIRECT */ } });
    expect(S.cookies.has(COOKIE_VERIFIER)).toBe(false);
  });

  it("CAPTCHA préparé (lib/captcha.ts) : le jeton du formulaire part vers Supabase (lien, inscription, connexion, mot de passe oublié) ; sans jeton, rien de plus", async () => {
    const m = await actions();
    const C = "cf-turnstile-response";
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription", [C]: "0.abc_DEF-123" }));
    expect(S.otp[0].options).toMatchObject({ captchaToken: "0.abc_DEF-123" });
    await m.signup(undefined, fd({ email: "zoe@exemple.fr", password: "chantier2026maison", [C]: "0.xyz" }));
    expect(S.inscriptions[0].options).toMatchObject({ captchaToken: "0.xyz" });
    await m.requestReset(undefined, fd({ email: "zoe@exemple.fr", [C]: "0.reset" }));
    expect(S.resets[0]).toMatchObject({ captchaToken: "0.reset" });
    await redirection(async () => { try { await m.login(undefined, fd({ email: "zoe@exemple.fr", password: "chantier2026maison", [C]: "0.cx" })); } catch { /* NEXT_REDIRECT */ } });
    expect(S.connexions[0]).toMatchObject({ options: { captchaToken: "0.cx" } });
    // Un jeton mal formé, ou absent : rien n'est ajouté (CAPTCHA éteint : le site d'avant).
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription", [C]: "a b" }));
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription" }));
    expect(S.otp[1].options).not.toHaveProperty("captchaToken");
    expect(S.otp[2].options).not.toHaveProperty("captchaToken");
  });

  it("mot de passe oublié : la trace « reset », les limites d'envoi, et le journal sans l'adresse", async () => {
    const m = await actions();
    const r = await m.requestReset(undefined, fd({ email: "Camille@Exemple.fr" }));
    expect(r).toMatchObject({ message: expect.any(String) });
    expect(demandeIci("camille@exemple.fr")?.m).toBe("reset");
    expect(S.journal).toEqual([["reset_demande", { payload: { empreinte: empreinteAdresse("camille@exemple.fr") } }]]);
  });

  it("mot de passe oublié (2e contre-examen, sonde A8) : la même réponse, la même trace, que l'adresse ait un compte ou non ; jamais le message brut de Supabase", async () => {
    const reponses: unknown[] = [];
    const traces: boolean[] = [];
    // Adresse inconnue (Supabase répond comme un envoi) ; adresse connue redemandée avant 60 s ; SMTP en panne.
    for (const erreur of [null, { code: "over_email_send_rate_limit", status: 429, message: "For security purposes, you can only request this after 52 seconds." }, { code: "unexpected_failure", status: 500, message: "Error sending recovery email" }]) {
      S.erreur = erreur;
      S.cookies = new Map();
      const m = await actions();
      reponses.push(await m.requestReset(undefined, fd({ email: "camille@exemple.fr" })));
      traces.push(!!demandeIci("camille@exemple.fr"));
    }
    for (const r of reponses) expect(r).toEqual(reponses[0]);
    expect(JSON.stringify(reponses)).not.toMatch(/security|seconds|recovery/i);
    expect(traces).toEqual([true, true, true]);
    // Le journal garde le code (l'empreinte seulement).
    expect(S.journal.at(-1)).toEqual(["reset_demande", { payload: { empreinte: empreinteAdresse("camille@exemple.fr"), issue: "envoye", code: "unexpected_failure" } }]);
    // Une adresse mal formée, sans appel ; la limite par IP de Supabase, dite.
    S.erreur = null;
    S.resets = [];
    let m = await actions();
    expect(await m.requestReset(undefined, fd({ email: "camille@" }))).toEqual({ error: expect.stringMatching(/pas valide/) });
    expect(S.resets).toEqual([]);
    S.erreur = { code: "over_request_rate_limit", status: 429 };
    m = await actions();
    expect(await m.requestReset(undefined, fd({ email: "camille@exemple.fr" }))).toEqual({ error: expect.stringMatching(/Trop de tentatives/) });
  });
});

/* ─── 3. Le retour du lien ───────────────────────────────────────────────────── */

describe("/auth/callback et /auth/confirm : le retour du lien", () => {
  const appelsMaj: unknown[] = [];
  const marques: [string, unknown][] = [];
  const sorties: unknown[] = [];
  const MOCKS = ["@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/audit", "@/lib/track-server", "next/headers"];
  afterEach(() => {
    for (const m of MOCKS) vi.doUnmock(m);
  });

  async function retour(route: "callback" | "confirm", url: string, user: Record<string, unknown> | null, erreur: unknown = null, cookies: Record<string, string> = {}) {
    vi.resetModules();
    S.journal = [];
    S.mesures = [];
    S.cookies = new Map(Object.entries(cookies));
    S.poses = [];
    appelsMaj.length = 0;
    marques.length = 0;
    sorties.length = 0;
    const reponse = async () => ({ data: { user, session: user ? {} : null }, error: erreur });
    vi.doMock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => magasin() }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        auth: {
          exchangeCodeForSession: reponse,
          verifyOtp: reponse,
          updateUser: async (o: unknown) => { appelsMaj.push(o); return { data: {}, error: null }; },
          signOut: async (o: unknown) => { sorties.push(o); return { error: null }; },
        },
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      supabaseAdmin: () => ({ auth: { admin: { updateUserById: async (id: string, o: unknown) => { marques.push([id, o]); return { data: {}, error: null }; } } } }),
    }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, o: Record<string, unknown>) => { S.journal.push([type, o]); } }));
    vi.doMock("@/lib/track-server", () => ({ suivreServeur: async (nom: string, p: Record<string, unknown>) => { S.mesures.push([nom, p]); } }));
    const { GET } = await import(route === "callback" ? "@/app/auth/callback/route" : "@/app/auth/confirm/route");
    const res = await GET(new Request(url) as never);
    return { status: res.status, location: res.headers.get("location") };
  }

  const il = (ms: number) => new Date(Date.now() - ms).toISOString();
  /** Un compte confirmé il y a longtemps, dont le mot de passe a déjà été contrôlé : seule la mesure compte ici. */
  const CONTROLE = { app_metadata: { provider: "email", [MARQUE_MDP]: "2026-10-01T00:00:00.000Z", [MARQUE_MDP_EMAIL]: "camille@exemple.fr" } };
  const NOUVEAU_LIEN = () => ({ id: "u1", email: "camille@exemple.fr", user_metadata: { inscription: "lien" }, app_metadata: { provider: "email" }, email_confirmed_at: il(4_000), created_at: il(120_000) });
  /** Les appels qui portent des métadonnées (la mesure, les nouveautés), sans ceux du mot de passe. */
  const donnees = () => appelsMaj.filter((o) => !(o as { password?: string }).password);
  /** La trace d'une demande faite DANS ce navigateur, pour cette adresse. */
  const trace = (email: string, d: Partial<Demande> = {}) =>
    ({ [COOKIE_DEMANDE]: ajouterDemande(undefined, { e: empreinteAdresse(email), m: "lien", t: Math.floor(Date.now() / 1000), ...d }) });

  it("premier clic d'un inscrit par lien : la session, compte_cree { methode: lien }, puis l'intention", async () => {
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1", NOUVEAU_LIEN(), null, trace("camille@exemple.fr"));
    expect(r).toEqual({ status: 307, location: "https://getavyora.fr/projets/nouveau/detaille?affiner=1" });
    expect(S.mesures).toEqual([["compte_cree", { confirme: true, destination: "/projets/nouveau/detaille?affiner=1", methode: "lien" }]]);
    expect(S.journal).toContainEqual(["inscription", { userId: "u1", email: "camille@exemple.fr", payload: { methode: "lien" } }]);
    // La marque « mesuré » : une seule mise à jour de métadonnées, la marque seule (les métadonnées de l'inscription sont déjà là).
    expect(donnees()).toEqual([{ data: { compte_cree_le: expect.any(String) } }]);
    // Une arrivée « à vérifier » d'avant ne concerne plus ce navigateur (le flux PKCE prouve qu'il a demandé le lien).
    expect(S.poses).toContainEqual([COOKIE_VERIFIER, "", expect.objectContaining({ maxAge: 0, path: "/" })]);
  });

  it("un deuxième lien dans la foulée (marque posée) : ni compte_cree ni « inscription » une seconde fois", async () => {
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...NOUVEAU_LIEN(), ...CONTROLE, user_metadata: { inscription: "lien", compte_cree_le: il(3 * 60_000) },
    });
    expect(S.mesures).toEqual([]);
    expect(S.journal).toEqual([]);
    expect(appelsMaj).toEqual([]);
  });

  it("Enregistrer sans intention : /projets, où ClaimDraft range l'estimation", async () => {
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", NOUVEAU_LIEN());
    expect(r.location).toBe("https://getavyora.fr/projets");
  });

  it("une connexion par lien d'un compte existant, ou une inscription au mot de passe : pas de compte_cree", async () => {
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", { ...NOUVEAU_LIEN(), email_confirmed_at: il(40 * 86_400_000) });
    expect(S.mesures).toEqual([]);
    expect(appelsMaj).toEqual([]); // confirmé il y a longtemps : ni mesure, ni contrôle du mot de passe
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fonboarding", { ...NOUVEAU_LIEN(), user_metadata: { inscription: "mot_de_passe" } }, null, trace("camille@exemple.fr", { m: "mdp" }));
    expect(S.mesures).toEqual([]);
  });

  it("un nouveau compte Google : CGU datées après coup, compte_cree { methode: google }", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(MAINTENANT);
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fplan", {
      id: "u2", email: "alex@gmail.com", user_metadata: { full_name: "Alex" }, app_metadata: { provider: "google" }, created_at: il(2_000),
    });
    expect(appelsMaj).toEqual([{ data: { cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "google", compte_cree_le: "2026-10-15T10:00:00.000Z" } }]);
    expect(S.mesures).toEqual([["compte_cree", { confirme: true, destination: "/plan", methode: "google" }]]);
  });

  it("next assaini au retour : //hôte, URL absolues et caractères de contrôle mènent à /projets", async () => {
    for (const n of ["%2F%2Fevil.com", "https%3A%2F%2Fevil.com", "%2F%5Cevil.com", "%2F%09%2Fevil.com", "%2F%0A%2Fevil.com"]) {
      const r = await retour("callback", `https://getavyora.fr/auth/callback?code=abc&next=${n}`, NOUVEAU_LIEN());
      expect(r.location, n).toBe("https://getavyora.fr/projets");
    }
    // Sans code (lien déjà servi) : le retour vers /connexion ne transporte pas l'intention piégée.
    for (const n of ["%2F%09%2Fevil.com", "%2F%0A%2Fevil.com"]) {
      const r = await retour("callback", `https://getavyora.fr/auth/callback?next=${n}`, null);
      expect(r.location, n).toBe("https://getavyora.fr/connexion?erreur=lien_invalide");
    }
  });

  it("lien invalide (déjà servi, expiré, autre navigateur) : /connexion le dit, et garde l'intention", async () => {
    let r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets%2Fnouveau%2Fdetaille", null, { code: "bad_code_verifier" });
    expect(r.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide&next=%2Fprojets%2Fnouveau%2Fdetaille");
    r = await retour("callback", "https://getavyora.fr/auth/callback?error=access_denied&error_code=otp_expired", null);
    expect(r.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide");
    expect(S.mesures).toEqual([]);
  });

  /* ─── Compte préparé à l'avance (contre-examen, B1) ─── */

  it("compte confirmé à l'instant, mot de passe PAS choisi dans ce navigateur : remplacé par un aléa, autres sessions fermées, marque serveur", async () => {
    // Le scénario : un tiers a inscrit camille@ avec SON mot de passe ; Camille clique son lien (aucune trace « mdp » ici).
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...NOUVEAU_LIEN(), user_metadata: { inscription: "mot_de_passe" },
    }, null, trace("camille@exemple.fr"));
    expect(r.location).toBe("https://getavyora.fr/projets");
    const mdp = appelsMaj.find((o) => (o as { password?: string }).password) as { password: string } | undefined;
    expect(mdp?.password).toMatch(/^[A-Za-z0-9_-]{43}-Aa1!$/);
    expect(sorties).toEqual([{ scope: "others" }]);
    // La marque : l'heure et l'adresse contrôlée ; ce que le tiers a pu écrire d'avance (nom, pseudo, profil) : effacé.
    expect(marques).toEqual([["u1", { app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" }, user_metadata: metadonneesEffacees() }]]);
    expect(S.journal).toContainEqual(["mot_de_passe_neutralise", { userId: "u1" }]);
    // Deux arrivées : deux aléas différents.
    const premier = mdp?.password;
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", NOUVEAU_LIEN());
    expect((appelsMaj.find((o) => (o as { password?: string }).password) as { password: string }).password).not.toBe(premier);
  });

  it("mot de passe choisi DANS ce navigateur (trace « mdp ») : gardé ; la marque est posée quand même (contrôle fait une fois)", async () => {
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fonboarding", {
      ...NOUVEAU_LIEN(), user_metadata: { inscription: "mot_de_passe" },
    }, null, trace("camille@exemple.fr", { m: "mdp" }));
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toEqual([]);
    expect(sorties).toEqual([]);
    // Né dans ce navigateur : le nom tapé ici reste.
    expect(marques).toEqual([["u1", { app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" } }]]);
    // La trace d'une AUTRE adresse ne compte pas.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fonboarding", {
      ...NOUVEAU_LIEN(), user_metadata: { inscription: "mot_de_passe" },
    }, null, trace("tiers@exemple.fr", { m: "mdp" }));
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toHaveLength(1);
  });

  it("déjà contrôlé (marque serveur), ou confirmé il y a plus d'une heure : rien ; une marque posée par l'utilisateur (user_metadata) ne compte pas", async () => {
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", { ...NOUVEAU_LIEN(), ...CONTROLE });
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toEqual([]);
    expect(marques).toEqual([]);
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", { ...NOUVEAU_LIEN(), email_confirmed_at: il(61 * 60_000) });
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toEqual([]);
    // Un compte d'avant (jamais contrôlé, confirmé depuis longtemps) : son adresse est retenue, rien d'autre.
    expect(marques).toEqual([["u1", { app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" } }]]);
    expect(sorties).toEqual([]);
    // Le tiers peut écrire dans user_metadata à l'inscription, pas dans app_metadata : sa « marque » est ignorée.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...NOUVEAU_LIEN(), user_metadata: { inscription: "lien", [MARQUE_MDP]: "2099-01-01T00:00:00.000Z" },
    });
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toHaveLength(1);
  });

  /* ─── Les nouveautés : seulement à l'arrivée confirmée, dans le navigateur qui a coché ─── */

  it("la case cochée dans ce navigateur : enregistrée à l'arrivée, datée du moment où elle a été cochée, dans app_metadata (serveur seul) ; sinon rien", async () => {
    const t = Math.floor(Date.now() / 1000) - 120;
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", NOUVEAU_LIEN(), null, trace("camille@exemple.fr", { n: true, t }));
    expect(marques).toContainEqual(["u1", { app_metadata: { newsletter: true, newsletter_le: new Date(t * 1000).toISOString() } }]);
    expect(donnees().filter((o) => JSON.stringify(o).includes("newsletter"))).toEqual([]); // jamais dans user_metadata
    // Ouvert dans un autre navigateur (aucune trace) : rien.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", NOUVEAU_LIEN());
    expect(marques.filter(([, o]) => JSON.stringify((o as { app_metadata?: unknown }).app_metadata ?? {}).includes("newsletter"))).toEqual([]);
    // Déjà abonné : pas de nouvelle date.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...NOUVEAU_LIEN(), app_metadata: { ...CONTROLE.app_metadata, newsletter: true }, user_metadata: { inscription: "lien", compte_cree_le: il(1_000) },
    }, null, trace("camille@exemple.fr", { n: true }));
    expect(appelsMaj).toEqual([]);
    expect(marques).toEqual([]);
  });

  it("2e contre-examen, sonde A6 : un compte préparé par un tiers avec newsletter, nom, pseudo, profil (appel direct à Supabase) ; la personne s'inscrit sans cocher : rien ne reste", async () => {
    const tiers = { newsletter: true, newsletter_le: "2026-10-14T08:00:00.000Z", nom: "Ton compte est suspendu, appelle le 08…", username: "support", profil: { role: "x" }, onboarding_fait: true };
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...NOUVEAU_LIEN(), user_metadata: { inscription: "lien", ...tiers },
    }, null, trace("camille@exemple.fr"));
    expect(marques).toEqual([["u1", { app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" }, user_metadata: metadonneesEffacees() }]]);
    for (const k of Object.keys(tiers)) expect(metadonneesEffacees(), k).toHaveProperty(k, null);
    // Le consentement de la doc se lit dans app_metadata : la case du tiers (user_metadata) n'y est jamais recopiée.
    expect(JSON.stringify(marques)).not.toMatch(/"newsletter":true/);
  });

  it("2e contre-examen, sonde A5 « GAP » : le compte d'un tiers passé à l'adresse de la personne (changement d'adresse) : mot de passe remplacé, sessions fermées, consentement de l'ancienne adresse retiré", async () => {
    // Le tiers a créé, confirmé et contrôlé SON compte (tiers@), puis l'a passé à camille@, qui a cliqué « Confirm Change of Email ».
    const passe = {
      ...NOUVEAU_LIEN(), email_confirmed_at: il(40 * 86_400_000), email_change_sent_at: il(3_600_000),
      user_metadata: { inscription: "mot_de_passe", nom: "Tiers" },
      app_metadata: { provider: "email", [MARQUE_MDP]: il(30 * 86_400_000), [MARQUE_MDP_EMAIL]: "tiers@exemple.fr", newsletter: true, newsletter_le: il(30 * 86_400_000) },
    };
    // Même avec la trace « mot de passe choisi ici » (une inscription au mot de passe sur un compte confirmé ne change rien chez Supabase).
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", passe, null, trace("camille@exemple.fr", { m: "mdp", n: true }));
    expect(r.location).toBe("https://getavyora.fr/projets");
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toHaveLength(1);
    expect(sorties).toEqual([{ scope: "others" }]);
    expect(S.journal).toContainEqual(["mot_de_passe_neutralise", { userId: "u1", payload: { raison: "changement_adresse" } }]);
    expect(marques[0]).toEqual(["u1", {
      app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr", newsletter: null, newsletter_le: null },
      user_metadata: metadonneesEffacees(),
    }]);
    // La case cochée ICI par la personne : enregistrée pour sa propre adresse.
    expect(marques[1]).toEqual(["u1", { app_metadata: { newsletter: true, newsletter_le: expect.any(String) } }]);
    // Jamais passé par le site (aucune marque), confirmé depuis longtemps : la demande de changement d'adresse suffit.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...passe, app_metadata: { provider: "email" },
    }, null, trace("camille@exemple.fr"));
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toHaveLength(1);
    expect(sorties).toEqual([{ scope: "others" }]);
    // Une fois contrôlé (adresse retenue = adresse du compte) : plus rien.
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", {
      ...passe, app_metadata: { provider: "email", [MARQUE_MDP]: il(1_000), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" },
    }, null, trace("camille@exemple.fr"));
    expect(appelsMaj.filter((o) => (o as { password?: string }).password)).toEqual([]);
    expect(marques).toEqual([]);
  });
});

describe("/auth/confirm puis le bouton de /auth/confirmer : le lien au format token_hash", () => {
  const JETON = "pkce_" + "0f".repeat(28);
  const MOCKS = ["@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/audit", "@/lib/track-server", "next/headers", "next/navigation"];
  afterEach(() => {
    for (const m of MOCKS) vi.doUnmock(m);
  });

  /** Le clic dans l'e-mail (ou le robot d'une messagerie) : GET /auth/confirm. */
  async function ouvrir(url: string) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
    const verifs: unknown[] = [];
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({ auth: { verifyOtp: async (o: unknown) => { verifs.push(o); return { data: { user: null, session: null }, error: null }; } } }),
    }));
    const { GET } = await import("@/app/auth/confirm/route");
    const res = await GET(new Request(url) as never);
    return { status: res.status, location: res.headers.get("location"), cookie: res.cookies.get(COOKIE_LIEN), verifs };
  }

  /**
   * Le bouton « Entrer dans AVYORA » : l'action `confirmerLien`, avec le cookie posé par /auth/confirm (ou sans), la trace
   * des demandes de ce navigateur (`demandes`) et la session déjà ouverte (`avant`, l'id de son compte).
   */
  async function cliquer(cookie: string | undefined, o: { user?: Record<string, unknown> | null; erreur?: unknown; demandes?: string; avant?: string | null } = {}) {
    vi.resetModules();
    S.journal = [];
    S.mesures = [];
    S.cookies = new Map();
    if (cookie !== undefined) S.cookies.set(COOKIE_LIEN, cookie);
    if (o.demandes !== undefined) S.cookies.set(COOKIE_DEMANDE, o.demandes);
    S.poses = [];
    const verifs: unknown[] = [];
    const maj: unknown[] = [];
    const sorties: unknown[] = [];
    const marques: unknown[] = [];
    let lectures = 0;
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3021" }), cookies: async () => magasin() }));
    vi.doMock("next/navigation", async (orig) => ({
      ...(await orig<typeof import("next/navigation")>()),
      redirect: (u: string) => { throw new Redirection(u); },
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        auth: {
          getUser: async () => { lectures++; return o.avant ? { data: { user: { id: o.avant } }, error: null } : { data: { user: null }, error: { name: "AuthSessionMissingError" } }; },
          verifyOtp: async (p: unknown) => {
            verifs.push(p);
            return { data: { user: o.user ?? null, session: o.user ? {} : null }, error: o.erreur ?? null };
          },
          updateUser: async (p: unknown) => { maj.push(p); return { data: {}, error: null }; },
          signOut: async (p: unknown) => { sorties.push(p); return { error: null }; },
        },
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      supabaseAdmin: () => ({ auth: { admin: { updateUserById: async (id: string, x: unknown) => { marques.push([id, x]); return { data: {}, error: null }; } } } }),
    }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, x: Record<string, unknown>) => { S.journal.push([type, x]); } }));
    vi.doMock("@/lib/track-server", () => ({ suivreServeur: async (nom: string, x: Record<string, unknown>) => { S.mesures.push([nom, x]); } }));
    const m = await import("@/lib/actions/auth");
    const url = await redirection(() => m.confirmerLien());
    return { url, verifs, maj, poses: S.poses, sorties, marques, lectures };
  }

  const il = (ms: number) => new Date(Date.now() - ms).toISOString();
  const NOUVEAU = () => ({ id: "u1", email: "camille@exemple.fr", user_metadata: { inscription: "lien" }, app_metadata: { provider: "email" }, email_confirmed_at: il(1_000), created_at: il(30 * 60_000) });
  /** La trace d'une demande faite dans CE navigateur. */
  const ici = (email = "camille@exemple.fr", d: Partial<Demande> = {}) =>
    ajouterDemande(undefined, { e: empreinteAdresse(email), m: "lien", t: Math.floor(Date.now() / 1000), ...d });
  const donnees = (maj: unknown[]) => maj.filter((x) => !(x as { password?: string }).password);

  it("le clic dans l'e-mail ne consomme RIEN (robots des messageries) : le lien part dans un cookie httpOnly, l'adresse perd le jeton", async () => {
    // {{ .RedirectTo }} tel que le modèle l'écrit : l'emailRedirectTo de l'envoi, encodé.
    const redirectTo = encodeURIComponent("https://getavyora.fr/auth/callback?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1");
    const r = await ouvrir(`https://getavyora.fr/auth/confirm?token_hash=${JETON}&type=email&next=${redirectTo}`);
    expect(r.status).toBe(303);
    expect(r.location).toBe("https://getavyora.fr/auth/confirmer");
    expect(r.verifs).toEqual([]);
    expect(r.cookie).toMatchObject({ name: COOKIE_LIEN, httpOnly: true, sameSite: "lax", secure: true, path: "/auth", maxAge: 3600 });
    expect(lireLienEnAttente(r.cookie?.value)).toEqual({ jeton: JETON, type: "email", next: "/projets/nouveau/detaille?affiner=1" });
    // Le mot de passe oublié : l'intention est écrite en dur dans le modèle.
    const reset = await ouvrir(`https://getavyora.fr/auth/confirm?token_hash=${JETON}&type=recovery&next=/reset/definir`);
    expect(lireLienEnAttente(reset.cookie?.value)).toEqual({ jeton: JETON, type: "recovery", next: "/reset/definir" });
    // Une intention qui n'est pas à nous : /projets.
    const evil = await ouvrir(`https://getavyora.fr/auth/confirm?token_hash=${JETON}&type=email&next=${encodeURIComponent("https://evil.com/plan")}`);
    expect(lireLienEnAttente(evil.cookie?.value)?.next).toBe("/projets");
  });

  it("un lien tronqué ou trafiqué (jeton absent, type inconnu) : /connexion le dit, rien n'est rangé", async () => {
    for (const q of ["type=email", `token_hash=${JETON}`, `token_hash=${JETON}&type=sms`, "token_hash=%3Cx%3E&type=email"]) {
      const r = await ouvrir(`https://getavyora.fr/auth/confirm?${q}&next=%2Fplan`);
      expect(r.location, q).toBe("https://getavyora.fr/connexion?erreur=lien_invalide&next=%2Fplan");
      expect(r.cookie, q).toBeUndefined();
    }
    const r = await ouvrir(`https://getavyora.fr/auth/confirm?next=%2F%2Fevil.com`);
    expect(r.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide");
  });

  it("le bouton : verifyOtp (sans PKCE : n'importe quel appareil), compte_cree une fois, puis l'intention ; le cookie est effacé", async () => {
    const r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets/nouveau/detaille?affiner=1" }), { user: NOUVEAU(), demandes: ici() });
    expect(r.verifs).toEqual([{ type: "email", token_hash: JETON }]);
    expect(r.url).toBe("/projets/nouveau/detaille?affiner=1");
    expect(S.mesures).toEqual([["compte_cree", { confirme: true, destination: "/projets/nouveau/detaille?affiner=1", methode: "lien" }]]);
    expect(S.journal).toContainEqual(["inscription", { userId: "u1", email: "camille@exemple.fr", payload: { methode: "lien" } }]);
    expect(donnees(r.maj)).toEqual([{ data: { compte_cree_le: expect.any(String) } }]);
    expect(r.poses[0]).toEqual([COOKIE_LIEN, "", expect.objectContaining({ path: "/auth", maxAge: 0 })]);
    // Arrivée attendue (lien demandé ici, aucune autre session) : pas de vérification, et une ancienne est oubliée.
    expect(r.poses).toContainEqual([COOKIE_VERIFIER, "", expect.objectContaining({ path: "/", maxAge: 0 })]);
    expect(r.poses.filter(([n, v]) => n === COOKIE_VERIFIER && v)).toEqual([]);
  });

  it("Enregistrer sans intention : /projets, où ClaimDraft range l'estimation ; un compte existant : pas de compte_cree", async () => {
    let r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), { user: NOUVEAU(), demandes: ici() });
    expect(r.url).toBe("/projets");
    r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), { user: { ...NOUVEAU(), email_confirmed_at: il(40 * 86_400_000) }, demandes: ici() });
    expect(r.url).toBe("/projets");
    expect(S.mesures).toEqual([]);
    expect(r.maj).toEqual([]);
    r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "recovery", next: "/reset/definir" }), { user: { ...NOUVEAU(), email_confirmed_at: il(40 * 86_400_000) }, demandes: ici("camille@exemple.fr", { m: "reset" }) });
    expect(r.verifs).toEqual([{ type: "recovery", token_hash: JETON }]);
    expect(r.url).toBe("/reset/definir");
  });

  it("lien déjà servi, expiré ou remplacé : /connexion le dit et garde l'intention ; sans cookie, aucun appel", async () => {
    let r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/plan" }), { erreur: { code: "otp_expired", status: 403 } });
    expect(r.url).toBe("/connexion?erreur=lien_invalide&next=%2Fplan");
    expect(S.mesures).toEqual([]);
    expect(r.poses).toHaveLength(1);
    r = await cliquer(undefined);
    expect(r.url).toBe("/connexion?erreur=lien_invalide");
    expect(r.verifs).toEqual([]);
    r = await cliquer(JSON.stringify({ h: JETON, t: "sms", n: "/plan" }));
    expect(r.url).toBe("/connexion?erreur=lien_invalide");
    expect(r.verifs).toEqual([]);
  });

  /* ─── Connexion forcée (contre-examen, sonde S4a) ─── */

  it("le lien d'un AUTRE ouvert ici (aucune demande pour cette adresse dans ce navigateur) : « à vérifier », /auth/verifier, rien n'est rangé avant", async () => {
    // L'attaquant demande un lien pour SA propre adresse et le relaie : ce navigateur n'a rien demandé pour elle.
    const attaquant = { ...NOUVEAU(), id: "u-tiers", email: "tiers@exemple.fr", email_confirmed_at: il(40 * 86_400_000), app_metadata: { provider: "email", [MARQUE_MDP]: il(1_000) } };
    const r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), { user: attaquant, demandes: ici("camille@exemple.fr") });
    expect(r.url).toBe("/auth/verifier?next=%2Fprojets");
    // La marque porte le compte ouvert et dure autant que la session (400 jours) : un choix laissé en suspens ne la fait pas
    // expirer avant elle.
    expect(r.poses).toContainEqual([COOKIE_VERIFIER, "u-tiers", expect.objectContaining({ httpOnly: true, path: "/", maxAge: DUREE_VERIFIER_S, sameSite: "lax" })]);
    expect(S.journal).toContainEqual(["arrivee_a_verifier", { userId: "u-tiers", payload: { type: "email", autreSession: false } }]);
    // Sans aucune trace du tout (lien demandé sur un autre appareil, le cas normal) : pareil, un clic de plus.
    const r2 = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/plan" }), { user: NOUVEAU() });
    expect(r2.url).toBe("/auth/verifier?next=%2Fplan");
  });

  it("une autre session était ouverte dans ce navigateur : « à vérifier », même si ce navigateur a demandé ce lien", async () => {
    const r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), { user: NOUVEAU(), demandes: ici(), avant: "u-autre" });
    expect(r.lectures).toBe(1);
    expect(r.url).toBe("/auth/verifier?next=%2Fprojets");
    expect(S.journal).toContainEqual(["arrivee_a_verifier", { userId: "u1", payload: { type: "email", autreSession: true } }]);
    // La même session (le compte déjà ouvert est celui du lien) : attendu.
    const r2 = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), { user: NOUVEAU(), demandes: ici(), avant: "u1" });
    expect(r2.url).toBe("/projets");
  });

  it("compte préparé à l'avance (sonde S4b) : confirmé au clic, mot de passe choisi ailleurs → aléa, autres sessions fermées, marque", async () => {
    const r = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), {
      user: { ...NOUVEAU(), user_metadata: { inscription: "mot_de_passe" } }, demandes: ici(),
    });
    expect(r.url).toBe("/projets");
    expect(r.maj.filter((x) => (x as { password?: string }).password)).toHaveLength(1);
    expect(r.sorties).toEqual([{ scope: "others" }]);
    expect(r.marques).toEqual([["u1", { app_metadata: { [MARQUE_MDP]: expect.any(String), [MARQUE_MDP_EMAIL]: "camille@exemple.fr" }, user_metadata: metadonneesEffacees() }]]);
    // Choisi ici (trace « mdp ») : gardé.
    const r2 = await cliquer(ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/projets" }), {
      user: { ...NOUVEAU(), user_metadata: { inscription: "mot_de_passe" } }, demandes: ici("camille@exemple.fr", { m: "mdp" }),
    });
    expect(r2.maj.filter((x) => (x as { password?: string }).password)).toEqual([]);
    expect(r2.sorties).toEqual([]);
  });
});

describe("/auth/verifier : « C'est bien ton compte ? »", () => {
  const MOCKS = ["@/lib/i18n/server", "@/lib/auth", "next/headers", "next/navigation", "@/lib/supabase/server", "@/lib/audit"];
  afterEach(() => {
    for (const m of MOCKS) vi.doUnmock(m);
  });

  async function preparer(locale: Locale, user: unknown, cookies: Record<string, string>) {
    vi.resetModules();
    S.cookies = new Map(Object.entries(cookies));
    S.poses = [];
    S.journal = [];
    const sorties: unknown[] = [];
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
    vi.doMock("@/lib/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/auth")>()), getUser: async () => user }));
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3021" }), cookies: async () => magasin() }));
    vi.doMock("next/navigation", async (orig) => ({
      ...(await orig<typeof import("next/navigation")>()),
      redirect: (u: string) => { throw new Redirection(u); },
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        auth: {
          getUser: async () => ({ data: { user }, error: null }),
          signOut: async (p: unknown) => { sorties.push(p); return { error: null }; },
        },
      }),
    }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, x: Record<string, unknown>) => { S.journal.push([type, x]); } }));
    const { LangProvider } = await import("@/components/i18n/LangProvider");
    const P = (await import("@/app/auth/verifier/page")).default;
    const actions = await import("@/lib/actions/auth");
    return {
      page: async (next?: string) => html(createElement(LangProvider, { locale, children: await P({ searchParams: Promise.resolve(next === undefined ? {} : { next }) }) })),
      actions,
      sorties,
    };
  }
  const CAMILLE = { id: "u1", email: "camille@exemple.fr", user_metadata: {}, app_metadata: {} };

  for (const locale of LOCALES) {
    it(`${locale} : l'adresse du compte ouvert EN ENTIER, « Oui, c'est mon compte » (vers l'intention), « Ce n'est pas moi »`, async () => {
      const t = dict(locale).auth.verifier;
      const r = await preparer(locale, CAMILLE, { [COOKIE_VERIFIER]: "u1" });
      const h = await r.page("/plan");
      for (const x of [t.eyebrow, t.titre, t.connecteAvec, t.pourquoi, t.continuer, t.pasMoi, t.pasMoiAide]) expect(h, x).toContain(esc(x));
      expect(h).toMatch(/data-verifier-adresse="">camille@exemple\.fr</);
      expect(h).toContain('<input type="hidden" name="next" value="/plan"/>');
      // Rien à ranger annoncé côté serveur : le client le dit seulement s'il y a un brouillon.
      expect(h).not.toContain("data-rangement-attente");
    });
  }

  it("sans arrivée à vérifier : droit à l'intention ; sans session : /connexion ; une intention vers /auth ou ailleurs : /projets", async () => {
    let r = await preparer("fr", CAMILLE, {});
    expect(await redirection(() => r.page("/plan"))).toBe("/plan");
    r = await preparer("fr", null, { [COOKIE_VERIFIER]: "u1" });
    expect(await redirection(() => r.page("/plan"))).toBe("/connexion");
    // La marque d'un AUTRE compte (une session ouverte ensuite, par la personne elle-même) : rien à vérifier.
    r = await preparer("fr", CAMILLE, { [COOKIE_VERIFIER]: "u-tiers" });
    expect(await redirection(() => r.page("/plan"))).toBe("/plan");
    r = await preparer("fr", CAMILLE, { [COOKIE_VERIFIER]: "u1" });
    for (const next of ["/auth/verifier?next=%2Fplan", "//evil.com", "https://evil.com"]) {
      expect(await r.page(next)).toContain('<input type="hidden" name="next" value="/projets"/>');
    }
  });

  it("« Oui, c'est mon compte » : la vérification est oubliée, l'intention (assainie) ; « Ce n'est pas moi » : déconnecté ici, journal, /connexion", async () => {
    let r = await preparer("fr", CAMILLE, { [COOKIE_VERIFIER]: "u1" });
    expect(await redirection(() => r.actions.continuerArrivee(fd({ next: "/plan" })))).toBe("/plan");
    expect(S.cookies.has(COOKIE_VERIFIER)).toBe(false);
    r = await preparer("fr", CAMILLE, { [COOKIE_VERIFIER]: "u1" });
    expect(await redirection(() => r.actions.continuerArrivee(fd({ next: "/auth/confirmer" })))).toBe("/projets");
    r = await preparer("fr", CAMILLE, { [COOKIE_VERIFIER]: "u1" });
    expect(await redirection(() => r.actions.refuserArrivee())).toBe("/connexion");
    expect(r.sorties).toEqual([{ scope: "local" }]);
    expect(S.cookies.has(COOKIE_VERIFIER)).toBe(false);
    expect(S.journal).toEqual([["arrivee_refusee", { userId: "u1" }]]);
  });

  it("les textes existent dans les deux langues, sans « vous » en français", () => {
    const fr = dict("fr").auth.verifier;
    expect(Object.keys(dict("en").auth.verifier).sort()).toEqual(Object.keys(fr).sort());
    for (const x of Object.values(fr)) expect(x, x).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
  });
});

describe("proxy : une arrivée « à vérifier » ramène toute page à /auth/verifier", () => {
  afterEach(() => {
    vi.doUnmock("@supabase/ssr");
  });
  async function passer(url: string, o: { user?: unknown; cookie?: string; methode?: string; entetes?: Record<string, string> } = {}) {
    vi.resetModules();
    vi.doMock("@supabase/ssr", () => ({
      createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: o.user ?? null } }) } }),
    }));
    const { NextRequest } = await import("next/server");
    const { proxy } = await import("@/proxy");
    const req = new NextRequest(url, { method: o.methode ?? "GET", headers: { ...(o.entetes ?? {}), ...(o.cookie ? { cookie: o.cookie } : {}) } });
    return proxy(req);
  }
  const ou = async (url: string, o: { user?: unknown; cookie?: string; methode?: string } = {}) => (await passer(url, o)).headers.get("location");
  const CAMILLE = { id: "u1", email: "camille@exemple.fr" };
  const MARQUE = `${COOKIE_VERIFIER}=u1`;

  it("connecté avec la marque de CE compte : toute page mène à la vérification, l'intention gardée ; /auth et les lectures /api passent", async () => {
    expect(await ou("https://getavyora.fr/projets", { user: CAMILLE, cookie: MARQUE })).toBe("https://getavyora.fr/auth/verifier?next=%2Fprojets");
    expect(await ou("https://getavyora.fr/mon-espace", { user: CAMILLE, cookie: MARQUE })).toBe("https://getavyora.fr/auth/verifier?next=%2Fmon-espace");
    expect(await ou("https://getavyora.fr/plan?id=abc", { user: CAMILLE, cookie: MARQUE })).toBe("https://getavyora.fr/auth/verifier?next=%2Fplan%3Fid%3Dabc");
    expect(await ou("https://getavyora.fr/", { user: CAMILLE, cookie: MARQUE })).toBe("https://getavyora.fr/auth/verifier?next=%2F");
    for (const u of ["https://getavyora.fr/auth/verifier?next=%2F", "https://getavyora.fr/api/projects", "https://getavyora.fr/api/plans/session"]) {
      const r = await passer(u, { user: CAMILLE, cookie: MARQUE });
      expect(r.headers.get("location"), u).toBeNull();
      expect(r.status, u).toBe(200);
    }
    // Les deux boutons de /auth/verifier (actions serveur, POST sur la page elle-même) passent.
    const bouton = await passer("https://getavyora.fr/auth/verifier?next=%2F", { user: CAMILLE, cookie: MARQUE, methode: "POST", entetes: { "next-action": "7f00" } });
    expect(bouton.status).toBe(200);
    expect(bouton.headers.get("location")).toBeNull();
  });

  it("2e contre-examen, sonde A4 : une action serveur d'un onglet resté ouvert (profil d'onboarding, pseudo) pendant la vérification : refusée, 403", async () => {
    for (const u of ["https://getavyora.fr/onboarding", "https://getavyora.fr/mon-espace/compte", "https://getavyora.fr/projets", "https://getavyora.fr/"]) {
      const r = await passer(u, { user: CAMILLE, cookie: MARQUE, methode: "POST", entetes: { "next-action": "7f00" } });
      expect(r.status, u).toBe(403);
      expect(await r.json()).toEqual({ error: "verification_requise" });
    }
    // Sans la marque : l'action passe jusqu'à sa page.
    expect((await passer("https://getavyora.fr/onboarding", { user: CAMILLE, methode: "POST", entetes: { "next-action": "7f00" } })).status).toBe(200);
  });

  it("la marque dure autant que la session : renouvelée (400 jours) à chaque page ramenée, jamais plus courte que les cookies de Supabase", async () => {
    const { DEFAULT_COOKIE_OPTIONS } = await import("@supabase/ssr/dist/main/utils/constants");
    expect(DUREE_VERIFIER_S).toBeGreaterThanOrEqual(DEFAULT_COOKIE_OPTIONS.maxAge as number);
    const r = await passer("https://getavyora.fr/projets", { user: CAMILLE, cookie: MARQUE });
    const pose = r.cookies.get(COOKIE_VERIFIER);
    expect(pose).toMatchObject({ value: "u1", path: "/", maxAge: DUREE_VERIFIER_S, httpOnly: true, sameSite: "lax", secure: true });
    expect(r.headers.get("set-cookie")).toMatch(/av-verifier=u1;.*Max-Age=34560000/);
  });

  it("une écriture /api pendant la vérification (onglet resté ouvert, ClaimDraft, éditeur de plan) : refusée, 403, rien n'est rangé", async () => {
    for (const [u, methode] of [
      ["https://getavyora.fr/api/projects", "POST"],
      ["https://getavyora.fr/api/plans", "POST"],
      ["https://getavyora.fr/api/plans/abc", "PUT"],
      ["https://getavyora.fr/api/projects/abc", "PATCH"],
      ["https://getavyora.fr/api/projects/abc", "DELETE"],
    ] as const) {
      const r = await passer(u, { user: CAMILLE, cookie: MARQUE, methode });
      expect(r.status, `${methode} ${u}`).toBe(403);
      expect(await r.json()).toEqual({ error: "verification_requise" });
    }
    // Sans la marque, ou sans session (le webhook de Stripe) : l'écriture passe jusqu'à sa route.
    expect((await passer("https://getavyora.fr/api/projects", { user: CAMILLE, methode: "POST" })).status).toBe(200);
    expect((await passer("https://getavyora.fr/api/stripe/webhook", { cookie: MARQUE, methode: "POST" })).status).toBe(200);
  });

  it("sans la marque, sans session, ou avec la marque d'un AUTRE compte : rien ne change", async () => {
    expect(await ou("https://getavyora.fr/projets", { user: CAMILLE })).toBeNull();
    expect(await ou("https://getavyora.fr/plan", { cookie: MARQUE })).toBeNull();
    expect(await ou("https://getavyora.fr/projets", { user: CAMILLE, cookie: `${COOKIE_VERIFIER}=u-tiers` })).toBeNull();
    expect((await passer("https://getavyora.fr/api/projects", { user: CAMILLE, cookie: `${COOKIE_VERIFIER}=u-tiers`, methode: "POST" })).status).toBe(200);
    expect(verificationEnAttente("u1", "u1")).toBe(true);
    for (const [m, u] of [["", "u1"], ["u1", ""], [undefined, "u1"], ["u1", null], ["1", "u1"]] as const) expect(verificationEnAttente(m, u), `${m} ${u}`).toBe(false);
  });
});

/* ─── 4. Le rendu ────────────────────────────────────────────────────────────── */

class Redirection extends Error {
  constructor(public url: string) { super("REDIRECT " + url); }
}

const PAGE_MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "next/navigation"];

/** Les pages d'accès rendues comme sur le site (client compris), langue, utilisateur, Google et bêta au choix. */
async function charger({ locale, user = null, google = false }: { locale: Locale; user?: unknown; google?: boolean }) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, plans: true, authGoogle: google } };
  });
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
  vi.doMock("@/lib/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/auth")>()), getUser: async () => user }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const routeur = { push: vide, replace: vide, refresh: vide, back: vide, forward: vide, prefetch: vide };
    return { ...m, useRouter: () => routeur, usePathname: () => "/", useSearchParams: () => new URLSearchParams(), redirect: (u: string) => { throw new Redirection(u); } };
  });
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  const rendre = async (el: ReactNode) => html(createElement(LangProvider, { locale, children: el }));
  return {
    rendre,
    inscription: async (sp: Record<string, string>) => {
      const P = (await import("@/app/inscription/page")).default;
      return rendre(await P({ searchParams: Promise.resolve(sp) }));
    },
    connexion: async (sp: Record<string, string>) => {
      const P = (await import("@/app/connexion/page")).default;
      return rendre(await P({ searchParams: Promise.resolve(sp) }));
    },
  };
}

async function html(el: ReactElement): Promise<string> {
  const { prelude } = await prerender(el);
  return await new Response(prelude).text();
}

async function redirection(f: () => Promise<unknown>): Promise<string | null> {
  try {
    await f();
    return null;
  } catch (e) {
    if (e instanceof Error && e.constructor.name === "Redirection") return (e as Redirection).url;
    throw e;
  }
}

/** La balise ouvrante d'un élément repéré par son id. */
const balise = (h: string, id: string) => {
  const i = h.indexOf(`id="${id}"`);
  expect(i, id).toBeGreaterThan(-1);
  return h.slice(h.lastIndexOf("<", i), h.indexOf(">", i) + 1);
};

describe("Rendu : /inscription et /connexion commencent par le lien d'accès", () => {
  afterEach(() => {
    for (const m of PAGE_MOCKS) vi.doUnmock(m);
  });

  it("2e contre-examen : un `next` répété (/connexion?next=/a&next=//evil.com) n'est plus une erreur 500 ; le premier compte, assaini", async () => {
    const p = await charger({ locale: "fr" });
    const tableau = (o: Record<string, string[]>) => o as unknown as Record<string, string>;
    const cx = await p.connexion(tableau({ next: ["/plan", "//evil.com"], erreur: ["lien_invalide", "x"] }));
    expect(cx).toContain('value="/plan"');
    expect(cx).toContain("data-lien-invalide");
    const ins = await p.inscription(tableau({ next: ["//evil.com", "/plan"], source: ["editeur-plan", "x"] }));
    expect(ins).not.toContain("evil.com");
    const q = await charger({ locale: "fr", user: { id: "u1", email: "camille@exemple.fr" } });
    expect(await redirection(() => q.connexion(tableau({ next: ["/plan", "//evil.com"] })))).toBe("/plan");
    expect(await redirection(() => q.inscription(tableau({ next: ["//evil.com", "/plan"] })))).toBe("/projets");
  });

  for (const locale of LOCALES) {
    const t = dict(locale).auth;
    const l = t.lien;

    it(`${locale} · /inscription pendant la bêta : en-tête, un champ, la case décochée, la mention, le mot de passe replié`, async () => {
      vi.stubEnv("NEXT_PUBLIC_BETA", "1");
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-12T10:00:00.000Z"));
      const r = await charger({ locale });
      const h = await r.inscription({ source: "enregistrer-reno", next: "/projets/nouveau/detaille?affiner=1" });
      const b = dict(locale).beta;
      const lb = libellesBeta(locale);
      // L'en-tête de la bêta, puis trois bénéfices ; le sous-titre d'avant laisse sa place.
      expect(h).toContain(esc(b.bandeauTitre(dateInsecable(lb.fin))));
      for (const x of b.benefices) expect(h).toContain(esc(x));
      expect(h).not.toContain(esc(t.inSous));
      expect(h.indexOf("data-bandeau-beta")).toBeLessThan(h.indexOf('id="lien-email"'));
      // Un seul champ, son libellé, son aide.
      expect(h).toContain(`<label for="lien-email" class="field-label">${esc(l.emailLabel)}</label>`);
      const champ = balise(h, "lien-email");
      expect(champ).toContain('type="email"');
      expect(champ).toContain('name="email"');
      expect(champ).toContain('autoComplete="email"');
      expect(champ).toContain('required=""');
      expect(champ).toContain('aria-describedby="lien-aide"');
      expect(h).toContain(esc(l.aideInscription));
      // La case des nouveautés : présente, facultative, NON cochée.
      const caseNews = balise(h, "lien-newsletter");
      expect(caseNews).toContain('type="checkbox"');
      expect(caseNews).not.toContain("checked");
      expect(caseNews).not.toContain("required");
      expect(h).toContain(esc(l.newsletter));
      // Le bouton, puis la mention sous le bouton, avec ses deux liens.
      const bouton = h.indexOf(esc(l.boutonInscription));
      expect(bouton).toBeGreaterThan(-1);
      const mention = h.indexOf(esc(l.mentionAvant));
      expect(mention).toBeGreaterThan(bouton);
      expect(h.slice(mention, mention + 400)).toMatch(/href="\/cgu"[\s\S]*href="\/confidentialite"/);
      // L'intention voyage avec le lien ET avec le formulaire replié ; « Déjà un compte » aussi.
      expect(compte(h, 'name="next" value="/projets/nouveau/detaille?affiner=1"')).toBe(2);
      expect(h).toContain('<input type="hidden" name="page" value="inscription"/>');
      expect(h).toContain('href="/connexion?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1"');
      // Le mot de passe, replié en second : le formulaire d'avant, fermé.
      expect(h).toMatch(/<details class="[^"]*"><summary[^>]*>/);
      expect(h).toContain(esc(l.plieInscription));
      expect(h.indexOf("<details")).toBeGreaterThan(mention);
      expect(h).toContain('autoComplete="new-password"');
      expect(balise(h, "mdp-newsletter")).not.toContain("checked");
      // Google éteint par défaut.
      expect(h).not.toContain("data-auth-google");
      expect(h).not.toContain(esc(l.google));
    });

    it(`${locale} · /inscription hors bêta : le titre et le sous-titre d'avant, le même formulaire, sans en-tête de la bêta`, async () => {
      const r = await charger({ locale });
      const h = await r.inscription({});
      expect(h).toContain(esc(t.inTitre));
      expect(h).toContain(esc(t.inSous));
      expect(h).not.toContain("data-bandeau-beta");
      expect(h).toContain(esc(l.boutonInscription));
      expect(h).not.toContain('name="next"');
      expect(h).toContain('href="/connexion"');
    });

    it(`${locale} · /connexion : « Recevoir un lien de connexion », le mot de passe replié, pas de case des nouveautés`, async () => {
      const r = await charger({ locale });
      const h = await r.connexion({ next: "/projets/abc" });
      expect(h).toContain(esc(l.boutonConnexion));
      expect(h).toContain(esc(l.aideConnexion));
      expect(h).toContain(esc(l.plieConnexion));
      expect(h).toContain('autoComplete="current-password"');
      expect(h).toContain('<input type="hidden" name="page" value="connexion"/>');
      expect(compte(h, 'name="next" value="/projets/abc"')).toBe(2);
      expect(h).not.toContain('id="lien-newsletter"');
      expect(h).toContain(esc(l.mentionAvant));
      expect(h).toContain('href="/inscription?next=%2Fprojets%2Fabc"');
      expect(h).not.toContain("data-lien-invalide");
    });

    it(`${locale} · /connexion?erreur=lien_invalide : le lien a déjà servi, expiré, ou autre navigateur`, async () => {
      const r = await charger({ locale });
      const h = await r.connexion({ erreur: "lien_invalide", next: "/plan" });
      expect(h).toContain(esc(l.lienInvalide));
      expect(h).toMatch(/<p role="alert"[^>]*data-lien-invalide="">/);
      expect(compte(h, 'name="next" value="/plan"')).toBe(2);
    });

    it(`${locale} · Google allumé (NEXT_PUBLIC_AUTH_GOOGLE=1) : « Continuer avec Google » sous le lien, au-dessus du mot de passe`, async () => {
      for (const page of ["inscription", "connexion"] as const) {
        const r = await charger({ locale, google: true });
        const h = await r[page]({});
        expect(h).toContain("data-auth-google");
        expect(h).toContain(esc(l.google));
        expect(h.indexOf("data-auth-google")).toBeGreaterThan(h.indexOf("data-lien-bouton"));
        expect(h.indexOf("data-auth-google")).toBeLessThan(h.indexOf("<details"));
      }
    });
  }

  it("une intention externe est ignorée dès la page ; un connecté va droit à l'intention (assainie)", async () => {
    let r = await charger({ locale: "fr" });
    const h = await r.inscription({ next: "//evil.com" });
    expect(h).not.toContain('name="next"');
    expect(h).not.toContain("evil.com");
    const membre = { id: "u1", email: "camille@exemple.fr", user_metadata: {}, app_metadata: {} };
    r = await charger({ locale: "fr", user: membre });
    expect(await redirection(() => r.inscription({ next: "/plan" }))).toBe("/plan");
    expect(await redirection(() => r.connexion({ next: "/projets/abc" }))).toBe("/projets/abc");
    expect(await redirection(() => r.connexion({ next: "https://evil.com" }))).toBe("/projets");
    expect(await redirection(() => r.connexion({}))).toBe("/projets");
    // « /<tab>/evil.com » : le navigateur retire la tabulation (ou le retour à la ligne) et lit « //evil.com ».
    for (const next of ["/\t/evil.com", "/\n/evil.com", "/\r\n/evil.com"]) {
      expect(await redirection(() => r.connexion({ next })), JSON.stringify(next)).toBe("/projets");
      expect(await redirection(() => r.inscription({ next })), JSON.stringify(next)).toBe("/projets");
    }
    r = await charger({ locale: "fr" });
    for (const next of ["/\t/evil.com", "/\n/evil.com"]) {
      for (const h of [await r.connexion({ next }), await r.inscription({ next })]) {
        expect(h).not.toContain('name="next"');
        expect(h).not.toContain("evil.com");
      }
    }
  });

  it("le CAPTCHA : éteint sans NEXT_PUBLIC_TURNSTILE_SITE_KEY (aucun widget, aucun script) ; allumé, un widget dans le formulaire", async () => {
    let r = await charger({ locale: "fr" });
    expect(await r.inscription({})).not.toContain("data-captcha");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    r = await charger({ locale: "fr" });
    const h = await r.inscription({});
    expect(h).toContain('<div data-captcha="">');
    expect(h.indexOf("data-captcha")).toBeLessThan(h.indexOf("data-lien-bouton"));
    expect(h).not.toContain("challenges.cloudflare.com"); // le script se charge au besoin, côté navigateur
    const { jetonCaptcha } = await import("@/lib/captcha");
    expect(jetonCaptcha("0.abc-DEF_123")).toBe("0.abc-DEF_123");
    for (const x of ["", " ", "a b", "x\ny", "x".repeat(5000), null, 3]) expect(jetonCaptcha(x), String(x)).toBeUndefined();
  });

  it("l'interrupteur Google : éteint sans variable, allumé seulement par NEXT_PUBLIC_AUTH_GOOGLE=1", async () => {
    for (const [v, attendu] of [[undefined, false], ["0", false], ["true", false], ["1", true]] as const) {
      vi.resetModules();
      if (v === undefined) delete process.env.NEXT_PUBLIC_AUTH_GOOGLE;
      else vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE", v);
      const { FEATURES } = await import("@/lib/features");
      expect(FEATURES.authGoogle, String(v)).toBe(attendu);
      vi.unstubAllEnvs();
    }
  });
});

describe("Rendu : /auth/confirmer, le bouton avant d'entrer", () => {
  const JETON = "pkce_" + "0f".repeat(28);
  afterEach(() => {
    for (const m of ["@/lib/i18n/server", "next/headers", "next/navigation"]) vi.doUnmock(m);
  });

  async function page(locale: Locale, cookie: string | undefined) {
    vi.resetModules();
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
    vi.doMock("next/headers", () => ({
      headers: async () => new Headers(),
      cookies: async () => ({ get: (n: string) => (n === COOKIE_LIEN && cookie !== undefined ? { name: n, value: cookie } : undefined), getAll: () => [] }),
    }));
    vi.doMock("next/navigation", async (orig) => ({
      ...(await orig<typeof import("next/navigation")>()),
      redirect: (u: string) => { throw new Redirection(u); },
    }));
    const { LangProvider } = await import("@/components/i18n/LangProvider");
    const P = (await import("@/app/auth/confirmer/page")).default;
    return html(createElement(LangProvider, { locale, children: await P() }));
  }

  for (const locale of LOCALES) {
    const c = dict(locale).auth.confirmer;
    it(`${locale} : « Plus qu'un clic », le bouton, pourquoi ce bouton ; le jeton n'est jamais dans la page`, async () => {
      const h = await page(locale, ecrireLienEnAttente({ jeton: JETON, type: "email", next: "/plan" }));
      for (const x of [c.eyebrow, c.titre, c.sousEntree, c.boutonEntree, c.pourquoi, c.pasToi]) expect(h, x).toContain(esc(x));
      expect(h).toMatch(/<button type="submit" class="btn btn-primary w-full py-3[^"]*" data-confirmer-bouton="">/);
      expect(h).not.toContain(JETON);
      expect(h).not.toContain("/plan");
      const reset = await page(locale, ecrireLienEnAttente({ jeton: JETON, type: "recovery", next: "/reset/definir" }));
      expect(reset).toContain(esc(c.boutonMotDePasse));
      expect(reset).toContain(esc(c.sousMotDePasse));
    });
  }

  it("sans lien en attente (cookie expiré, page rouverte) : /connexion propose un nouveau lien", async () => {
    expect(await redirection(() => page("fr", undefined))).toBe("/connexion?erreur=lien_invalide");
    expect(await redirection(() => page("fr", "{"))).toBe("/connexion?erreur=lien_invalide");
  });

  it("les textes du bouton existent dans les deux langues, sans « vous » en français", () => {
    const fr = dict("fr").auth.confirmer;
    expect(Object.keys(dict("en").auth.confirmer).sort()).toEqual(Object.keys(fr).sort());
    for (const x of Object.values(fr)) expect(x, x).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
  });
});

describe("Rendu : l'écran « C'est envoyé »", () => {
  async function ecran(locale: Locale, props: Partial<Parameters<typeof import("@/components/auth/AccesLien").EcranEnvoye>[0]>) {
    vi.resetModules();
    const { LangProvider } = await import("@/components/i18n/LangProvider");
    const { EcranEnvoye } = await import("@/components/auth/AccesLien");
    const base = {
      email: "camille@gmail.com", page: "inscription" as const, next: "/projets", newsletter: false, retour: true, restant: 42,
      pending: false, action: () => {}, renvoye: false, erreur: null, onChanger: () => {},
    };
    return html(createElement(LangProvider, { locale, children: createElement(EcranEnvoye, { ...base, ...props }) }));
  }

  for (const locale of LOCALES) {
    const l = dict(locale).auth.lien;

    it(`${locale} : l'adresse rappelée, « Ouvrir ma messagerie », même appareil, renvoi après 60 s, changer d'adresse`, async () => {
      const h = await ecran(locale, { newsletter: true });
      expect(h).toContain(esc(l.envoyeTitre));
      expect(h).toMatch(/<h2[^>]*tabindex="-1"/i);
      expect(h).toContain(`<b class="break-words font-semibold text-ink">camille@gmail.com</b>`);
      expect(h).toContain(esc(l.envoyeRetour));
      expect(h).toMatch(new RegExp(`<a href="https://mail\\.google\\.com/mail/" target="_blank" rel="noopener noreferrer"[^>]*>${esc(l.ouvrirMessagerie("Gmail")).replace(/[()]/g, "\\$&")}</a>`));
      expect(h).toContain(esc(l.memeAppareilTitre));
      expect(h).toContain(esc(l.memeAppareil));
      expect(h).toContain(esc(l.rienRecu));
      const renvoi = h.slice(h.lastIndexOf("<button", h.indexOf(esc(l.renvoyerDans(42)))), h.indexOf(esc(l.renvoyerDans(42))));
      expect(renvoi).toMatch(/^<button type="submit" disabled=""/);
      for (const x of ['name="email" value="camille@gmail.com"', 'name="page" value="inscription"', 'name="next" value="/projets"', 'name="newsletter" value="on"', 'name="renvoi" value="1"']) {
        expect(h).toContain(x);
      }
      expect(h).toContain(esc(l.changer));
      expect(h).toMatch(/role="status" aria-live="polite"/);
    });

    it(`${locale} : 60 s passées, « Renvoyer » s'active ; adresse inconnue, pas de bouton de messagerie ; « Nouveau lien envoyé »`, async () => {
      const h = await ecran(locale, { email: "camille@exemple.fr", restant: 0, retour: false, renvoye: true });
      const renvoi = h.slice(h.lastIndexOf("<button", h.indexOf(`>${esc(l.renvoyer)}</button>`)), h.indexOf(`>${esc(l.renvoyer)}</button>`));
      expect(renvoi).toMatch(/^<button type="submit" class="/);
      expect(renvoi).not.toContain('disabled=""');
      expect(h).not.toContain(esc(l.renvoyerDans(0)));
      expect(h).not.toContain("data-ouvrir-messagerie");
      expect(h).not.toContain(esc(l.envoyeRetour));
      expect(h).toContain(esc(l.renvoye));
    });
  }

  it("les textes de l'accès par lien existent dans les deux langues, sans « vous » en français", () => {
    const fr = dict("fr").auth.lien;
    const en = dict("en").auth.lien;
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    expect(Object.keys(en.erreurs).sort()).toEqual(["email", "envoi", "limite"]);
    const textes = Object.values(fr).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "function" ? [v("Gmail" as never)] : Object.values(v)));
    for (const x of textes) expect(x, x).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    expect(fr.boutonInscription).toBe("Recevoir mon lien d'accès");
    expect(fr.boutonConnexion).toBe("Recevoir un lien de connexion");
    expect(fr.newsletter).toBe("Je veux recevoir les nouveautés d'AVYORA (1 e-mail par mois au plus)");
    expect(fr.renvoyerDans(DELAI_RENVOI_S)).toBe("Renvoyer le lien (dans 60 s)");
  });
});
