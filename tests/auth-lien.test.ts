/**
 * Inscription facile (chantier B2, bêta gratuite) : l'accès par lien e-mail, sans mot de passe à inventer.
 *
 *  1. Les fonctions pures (lib/auth-lien.ts) : l'adresse, la destination assainie, l'issue de Supabase, les
 *     métadonnées datées, le compte qui vient de naître, la messagerie, la réclamation d'un brouillon.
 *  2. L'action `envoyerLienAcces` (Supabase simulé, aucun e-mail réel) : `signInWithOtp` et ses options, `next`
 *     assaini, les limites (par IP et par adresse), la réponse identique que l'adresse ait un compte ou non, les
 *     erreurs traduites. L'inscription au mot de passe date aussi les CGU et le consentement.
 *  3. /auth/callback et /auth/confirm : `compte_cree` au premier retour (lien, Google), l'intention, le lien invalide.
 *  4. Le rendu de /inscription et /connexion (FR, EN ; bêta en cours ou non), l'écran « C'est envoyé »,
 *     l'interrupteur Google (éteint par défaut).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { dict } from "@/lib/i18n/dictionaries";
import { libellesBeta } from "@/lib/beta";
import {
  DELAI_RENVOI_S, FENETRE_NOUVEAU_COMPTE_MS, destinationLien, emailValide, issueEnvoi, lirePageAcces, messagerieDe,
  metadonneesInscription, methodeNouveauCompte, reclamationEnAttente,
} from "@/lib/auth-lien";

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
    for (const x of ["//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "projets", "/a\nb", "/a\u0000", `/${"x".repeat(600)}`]) {
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

  it("les métadonnées : CGU datées, case des nouveautés non cochée par défaut, consentement daté s'il est donné", () => {
    expect(metadonneesInscription({ methode: "lien", newsletter: false, maintenant: MAINTENANT }))
      .toEqual({ cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien", newsletter: false });
    expect(metadonneesInscription({ methode: "mot_de_passe", newsletter: true, maintenant: MAINTENANT })).toEqual({
      cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "mot_de_passe", newsletter: true, newsletter_le: "2026-10-15T10:00:00.000Z",
    });
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
    expect(methodeNouveauCompte({ app_metadata: { provider: "google" }, created_at: il(86_400_000) }, t)).toBeNull();
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
};

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
    cookies: async () => ({ getAll: () => [], set: () => {}, delete: () => {} }),
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
          return { data: { user: { id: "u-nouveau" }, session: null }, error: null };
        },
      },
    }),
  }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, o: Record<string, unknown>) => { S.journal.push([type, o]); } }));
  vi.doMock("@/lib/track-server", () => ({ suivreServeur: async (nom: string, p: Record<string, unknown>) => { S.mesures.push([nom, p]); } }));
  return import("@/lib/actions/auth");
}

const ACTION_MOCKS = ["next/headers", "@/lib/supabase/server", "@/lib/audit", "@/lib/track-server"];

describe("envoyerLienAcces : le lien d'accès (aucun e-mail réel)", () => {
  beforeEach(() => {
    S.ip = "1.2.3.4";
    S.erreur = null;
    S.otp = [];
    S.inscriptions = [];
    S.journal = [];
    S.mesures = [];
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(MAINTENANT);
  });
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
        data: { cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien", newsletter: false },
      },
    }]);
    expect(S.journal).toEqual([["lien_acces_demande", { email: "camille@exemple.fr", payload: { page: "inscription", issue: "envoye" } }]]);
    // La création du compte n'est pas connue ici (pas d'énumération) : `compte_cree` part de /auth/callback.
    expect(S.mesures).toEqual([]);
  });

  it("la case des nouveautés cochée : consentement daté ; « Renvoyer » le dit", async () => {
    const m = await actions();
    const r = await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "inscription", newsletter: "on", renvoi: "1" }));
    expect(r).toEqual({ envoye: true, email: "camille@exemple.fr", renvoi: true });
    expect(S.otp[0].options.data).toEqual({
      cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "lien", newsletter: true, newsletter_le: "2026-10-15T10:00:00.000Z",
    });
    expect(S.otp[0].options.emailRedirectTo).toBe("https://getavyora.fr/auth/callback?next=%2Fonboarding");
  });

  it("connexion : sans intention, /projets ; la case des nouveautés n'y existe pas (ignorée si elle arrive)", async () => {
    const m = await actions();
    await m.envoyerLienAcces(undefined, fd({ email: "camille@exemple.fr", page: "connexion", newsletter: "on" }));
    expect(S.otp[0].options.shouldCreateUser).toBe(true);
    expect(S.otp[0].options.emailRedirectTo).toBe("https://getavyora.fr/auth/callback?next=%2Fprojets");
    expect(S.otp[0].options.data.newsletter).toBe(false);
    expect(S.otp[0].options.data).not.toHaveProperty("newsletter_le");
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

  it("production sans Upstash : 6 demandes / min par IP, puis 6 par adresse quelle que soit l'IP", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let m = await actions("production");
    for (let i = 0; i < 6; i++) {
      expect(await m.envoyerLienAcces(undefined, fd({ email: `x${i}@exemple.fr`, page: "inscription" }))).toMatchObject({ envoye: true });
    }
    expect(await m.envoyerLienAcces(undefined, fd({ email: "x9@exemple.fr", page: "inscription" }))).toEqual({ erreur: "limite" });
    expect(S.otp).toHaveLength(6);
    S.ip = "5.6.7.8";
    expect(await m.envoyerLienAcces(undefined, fd({ email: "x9@exemple.fr", page: "inscription" }))).toMatchObject({ envoye: true });

    // Une même adresse, depuis six IP différentes : la septième demande est refusée.
    m = await actions("production");
    S.otp = [];
    for (let i = 0; i < 6; i++) {
      S.ip = `10.0.0.${i}`;
      expect(await m.envoyerLienAcces(undefined, fd({ email: "cible@exemple.fr", page: "connexion" }))).toMatchObject({ envoye: true });
    }
    S.ip = "10.0.0.99";
    expect(await m.envoyerLienAcces(undefined, fd({ email: "cible@exemple.fr", page: "connexion" }))).toEqual({ erreur: "limite" });
    expect(S.otp).toHaveLength(6);
    vi.restoreAllMocks();
  });

  it("l'inscription au mot de passe (repliée) date aussi les CGU et le consentement ; compte_cree porte la méthode", async () => {
    const m = await actions();
    const r = await m.signup(undefined, fd({ nom: "Camille", email: "camille@exemple.fr", password: "chantier2026maison", accept: "on", newsletter: "on" }));
    expect(r).toMatchObject({ message: expect.any(String) });
    expect(S.inscriptions[0].options.data).toEqual({
      nom: "Camille", cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "mot_de_passe", newsletter: true, newsletter_le: "2026-10-15T10:00:00.000Z",
    });
    expect(S.mesures).toEqual([["compte_cree", { confirme: false, destination: "/onboarding", methode: "mot_de_passe" }]]);
  });
});

/* ─── 3. Le retour du lien ───────────────────────────────────────────────────── */

describe("/auth/callback et /auth/confirm : le retour du lien", () => {
  const appelsMaj: unknown[] = [];
  afterEach(() => {
    for (const m of ["@/lib/supabase/server", "@/lib/audit", "@/lib/track-server"]) vi.doUnmock(m);
  });

  async function retour(route: "callback" | "confirm", url: string, user: Record<string, unknown> | null, erreur: unknown = null) {
    vi.resetModules();
    S.journal = [];
    S.mesures = [];
    appelsMaj.length = 0;
    const reponse = async () => ({ data: { user, session: user ? {} : null }, error: erreur });
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        auth: {
          exchangeCodeForSession: reponse,
          verifyOtp: reponse,
          updateUser: async (o: unknown) => { appelsMaj.push(o); return { data: {}, error: null }; },
        },
      }),
    }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async (type: string, o: Record<string, unknown>) => { S.journal.push([type, o]); } }));
    vi.doMock("@/lib/track-server", () => ({ suivreServeur: async (nom: string, p: Record<string, unknown>) => { S.mesures.push([nom, p]); } }));
    const { GET } = await import(route === "callback" ? "@/app/auth/callback/route" : "@/app/auth/confirm/route");
    const res = await GET(new Request(url) as never);
    return { status: res.status, location: res.headers.get("location") };
  }

  const il = (ms: number) => new Date(Date.now() - ms).toISOString();
  const NOUVEAU_LIEN = () => ({ id: "u1", email: "camille@exemple.fr", user_metadata: { inscription: "lien" }, app_metadata: { provider: "email" }, email_confirmed_at: il(4_000), created_at: il(120_000) });

  it("premier clic d'un inscrit par lien : la session, compte_cree { methode: lien }, puis l'intention", async () => {
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1", NOUVEAU_LIEN());
    expect(r).toEqual({ status: 307, location: "https://getavyora.fr/projets/nouveau/detaille?affiner=1" });
    expect(S.mesures).toEqual([["compte_cree", { confirme: true, destination: "/projets/nouveau/detaille?affiner=1", methode: "lien" }]]);
    expect(S.journal).toEqual([["inscription", { userId: "u1", email: "camille@exemple.fr", payload: { methode: "lien" } }]]);
    expect(appelsMaj).toEqual([]);
  });

  it("Enregistrer sans intention : /projets, où ClaimDraft range l'estimation", async () => {
    const r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", NOUVEAU_LIEN());
    expect(r.location).toBe("https://getavyora.fr/projets");
  });

  it("une connexion par lien d'un compte existant, ou une inscription au mot de passe : pas de compte_cree", async () => {
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets", { ...NOUVEAU_LIEN(), email_confirmed_at: il(40 * 86_400_000) });
    expect(S.mesures).toEqual([]);
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fonboarding", { ...NOUVEAU_LIEN(), user_metadata: { inscription: "mot_de_passe" } });
    expect(S.mesures).toEqual([]);
  });

  it("un nouveau compte Google : CGU datées après coup, compte_cree { methode: google }", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(MAINTENANT);
    await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fplan", {
      id: "u2", email: "alex@gmail.com", user_metadata: { full_name: "Alex" }, app_metadata: { provider: "google" }, created_at: il(2_000),
    });
    expect(appelsMaj).toEqual([{ data: { cgu_acceptees_le: "2026-10-15T10:00:00.000Z", inscription: "google", newsletter: false } }]);
    expect(S.mesures).toEqual([["compte_cree", { confirme: true, destination: "/plan", methode: "google" }]]);
  });

  it("next assaini au retour : //hôte et URL absolues mènent à /projets", async () => {
    for (const n of ["%2F%2Fevil.com", "https%3A%2F%2Fevil.com", "%2F%5Cevil.com"]) {
      const r = await retour("callback", `https://getavyora.fr/auth/callback?code=abc&next=${n}`, NOUVEAU_LIEN());
      expect(r.location, n).toBe("https://getavyora.fr/projets");
    }
  });

  it("lien invalide (déjà servi, expiré, autre navigateur) : /connexion le dit, et garde l'intention", async () => {
    let r = await retour("callback", "https://getavyora.fr/auth/callback?code=abc&next=%2Fprojets%2Fnouveau%2Fdetaille", null, { code: "bad_code_verifier" });
    expect(r.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide&next=%2Fprojets%2Fnouveau%2Fdetaille");
    r = await retour("callback", "https://getavyora.fr/auth/callback?error=access_denied&error_code=otp_expired", null);
    expect(r.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide");
    expect(S.mesures).toEqual([]);
  });

  it("/auth/confirm (format token_hash) : même retour, même mesure", async () => {
    const r = await retour("confirm", "https://getavyora.fr/auth/confirm?token_hash=t&type=email&next=%2Fplan", NOUVEAU_LIEN());
    expect(r.location).toBe("https://getavyora.fr/plan");
    expect(S.mesures[0]?.[1]).toMatchObject({ methode: "lien", destination: "/plan" });
    const ko = await retour("confirm", "https://getavyora.fr/auth/confirm?token_hash=t&type=email&next=%2F%2Fevil.com", null, { code: "otp_expired" });
    expect(ko.location).toBe("https://getavyora.fr/connexion?erreur=lien_invalide");
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
      expect(h).toContain(esc(b.bandeauTitre(lb.fin)));
      for (const x of b.benefices(lb.tarif)) expect(h).toContain(esc(x));
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
