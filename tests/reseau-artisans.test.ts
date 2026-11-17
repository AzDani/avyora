/**
 * Réseau AVYORA, phase 1 (17/11/2026) : candidature des artisans et décisions de l'admin.
 * Les règles pures (SIRET, départements, validation), puis les garde-fous des actions serveur avec une base factice :
 * un artisan n'écrit que dans SA ligne et SON dossier, ne réécrit pas une candidature déjà décidée, et seul l'admin
 * décide (avec l'appel, une décennale en cours et une attestation déposée pour valider).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { siretCoherent, normaliserSiret, lireReponseSiret } from "@/lib/reseau/siret";
import { departementDuCodePostal, DEPARTEMENTS, resumeDepartements } from "@/lib/reseau/departements";
import { validerCandidature, documentsManquants, mimeAccepte, aujourdhuiParis } from "@/lib/reseau/candidature";
import { bloquantsValidation, candidatureModifiable, lireArtisan, joursAvantFinDecennale } from "@/lib/reseau/artisan";
import { METIERS } from "@/lib/reseau/metiers";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const MAINTENANT = new Date("2026-11-17T10:00:00Z");

describe("SIRET", () => {
  it("normalisation et clé de contrôle", () => {
    expect(normaliserSiret("552 032 534 00703")).toBe("55203253400703");
    expect(normaliserSiret("5520325340070")).toBeNull();
    expect(siretCoherent("55203253400703")).toBe(true);
    expect(siretCoherent("55203253400704")).toBe(false);
  });

  const reponse = (etab: Record<string, unknown>, unite: Record<string, unknown> = {}) => ({
    results: [{ siren: "552032534", nom_complet: "PLOMBERIE DUPONT", etat_administratif: "A", activite_principale: "43.22A", complements: { est_rge: false }, siege: { siret: "55203253400001", etat_administratif: "A" }, matching_etablissements: [{ siret: "55203253400703", etat_administratif: "A", activite_principale: "43.22A", adresse: "1 RUE X 33000 BORDEAUX", code_postal: "33000", date_creation: "2020-01-01", ...etab }], ...unite }],
  });
  it("établissement actif du bâtiment", () => {
    expect(lireReponseSiret(reponse({}), "55203253400703", MAINTENANT)).toMatchObject({ statut: "actif", nom: "PLOMBERIE DUPONT", naf: "43.22A", batiment: true, codePostal: "33000", rge: false });
  });
  it("établissement fermé, entreprise cessée, SIRET d'un autre établissement, RGE, activité hors bâtiment", () => {
    expect(lireReponseSiret(reponse({ etat_administratif: "F" }), "55203253400703").statut).toBe("ferme");
    expect(lireReponseSiret(reponse({}, { etat_administratif: "C" }), "55203253400703").statut).toBe("ferme");
    expect(lireReponseSiret(reponse({}), "55203253400999").statut).toBe("introuvable");
    expect(lireReponseSiret({ results: [] }, "55203253400703").statut).toBe("introuvable");
    expect(lireReponseSiret(reponse({ liste_rge: ["8611M10D109"] }), "55203253400703").rge).toBe(true);
    expect(lireReponseSiret(reponse({ activite_principale: "70.10Z" }), "55203253400703").batiment).toBe(false);
    expect(lireReponseSiret(reponse({}, { nom_complet: "[NON-DIFFUSIBLE]" }), "55203253400703").nom).toBeUndefined();
  });
});

describe("départements", () => {
  it("101 départements, codes postaux → département", () => {
    expect(DEPARTEMENTS).toHaveLength(101);
    expect(departementDuCodePostal("75008")).toBe("75");
    expect(departementDuCodePostal("01000")).toBe("01");
    expect(departementDuCodePostal("20000")).toBe("2A");
    expect(departementDuCodePostal("20200")).toBe("2B");
    expect(departementDuCodePostal("97400")).toBe("974");
    expect(departementDuCodePostal("98000")).toBeNull();
    expect(departementDuCodePostal("abc")).toBeNull();
  });
  it("résumé lisible, France entière en un mot", () => {
    expect(resumeDepartements(["33", "40"])).toBe("Gironde (33), Landes (40)");
    expect(resumeDepartements(DEPARTEMENTS.map(([c]) => c))).toBe("France entière");
    expect(resumeDepartements(["01", "02", "03", "04", "05"], 2)).toBe("Ain (01), Aisne (02) et 3 autres");
  });
});

describe("validation de la candidature", () => {
  const ok = {
    siret: "552 032 534 00703", nomCommercial: "", contactNom: "Jean Dupont", telephone: "06 12 34 56 78",
    metiers: ["plomberie", "plomberie", "chauffage"], departements: ["33", "40"], presentation: "", siteWeb: "https://dupont.fr", lienAvis: "",
    decennaleAssureur: "SMABTP", decennalePolice: "12345", decennaleFin: "2027-06-30", conditions: true,
  };
  it("une candidature complète passe, normalisée (SIRET, portable, doublons)", () => {
    const r = validerCandidature(ok, MAINTENANT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.c).toMatchObject({ siret: "55203253400703", telephone: "+33612345678", metiers: ["plomberie", "chauffage"] });
  });
  it("chaque défaut a son code", () => {
    const r = validerCandidature({ ...ok, siret: "55203253400704", telephone: "05 56 00 00 00", metiers: ["astronaute"], departements: [], decennaleFin: "2026-11-16", siteWeb: "javascript:alert(1)", lienAvis: "https://user@evil.com", conditions: false, contactNom: "" }, MAINTENANT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs).toMatchObject({ siret: "cle", telephone: "pasPortable", metiers: "invalide", departements: "requis", decennaleFin: "expiree", siteWeb: "invalide", lienAvis: "invalide", conditions: "requis", contactNom: "requis" });
  });
  it("une décennale qui finit aujourd'hui (à Paris) est encore valable", () => {
    expect(aujourdhuiParis(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17");
    expect(validerCandidature({ ...ok, decennaleFin: "2026-11-17" }, MAINTENANT).ok).toBe(true);
  });
  it("documents minimums et types acceptés", () => {
    expect(documentsManquants({ decennale: 1, photo: 3 })).toBeNull();
    expect(documentsManquants({ photo: 2 })).toBe("decennale,photo");
    expect(mimeAccepte("photo", "application/pdf")).toBe(false);
    expect(mimeAccepte("decennale", "application/pdf")).toBe(true);
    expect(mimeAccepte("photo", "image/svg+xml")).toBe(false);
  });
  it("les métiers recouvrent les lots de l'estimateur", () => {
    const lots = new Set<string>(METIERS.flatMap((m) => [...m.lots]));
    const catalogues = ["lib/estimateur/catalog.json", "lib/estimateur/catalog-neuf.json"].flatMap((f) => (JSON.parse(lire(f)) as { c: string }[]).map((x) => x.c));
    for (const metierLot of lots) expect(catalogues, metierLot).toContain(metierLot);
  });
});

const ligneArtisan = (x: Record<string, unknown> = {}) => ({
  id: "6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f", user_id: "u-art", statut: "en_attente", siret: "55203253400703", raison_sociale: "PLOMBERIE DUPONT",
  nom_commercial: null, siret_verif: { statut: "actif", verifieLe: "2026-11-17T10:00:00Z" }, contact_nom: "Jean", telephone: "+33612345678", email: "jean@x.fr",
  metiers: ["plomberie"], departements: ["33"], presentation: null, site_web: null, lien_avis: null, rge: false,
  decennale_assureur: "SMABTP", decennale_police: "1", decennale_fin: "2027-06-30", soumise_le: "2026-11-17T09:00:00Z",
  appel_le: null, valide_le: null, message_admin: null, notes_admin: null, contacts_envoyes: 0, ...x,
});

describe("règles de la candidature", () => {
  it("modifiable seulement sans candidature ou après un complément demandé", () => {
    expect(candidatureModifiable(null)).toBe(true);
    expect(candidatureModifiable({ statut: "a_completer" })).toBe(true);
    for (const s of ["en_attente", "valide", "refuse", "suspendu"] as const) expect(candidatureModifiable({ statut: s })).toBe(false);
  });
  it("valider exige l'appel, une décennale en cours, une attestation, un établissement non fermé", () => {
    const a = lireArtisan(ligneArtisan());
    expect(bloquantsValidation(a, 1, "2026-11-17")).toHaveLength(1); // l'appel
    expect(bloquantsValidation({ ...a, appelLe: "2026-11-17T10:00:00Z" }, 1, "2026-11-17")).toEqual([]);
    expect(bloquantsValidation({ ...a, appelLe: "x", decennaleFin: "2026-11-16" }, 0, "2026-11-17")).toHaveLength(2);
    expect(bloquantsValidation({ ...a, appelLe: "x", siretVerif: { statut: "ferme", verifieLe: "" } }, 1, "2026-11-17")).toHaveLength(1);
    expect(joursAvantFinDecennale("2026-12-17", "2026-11-17")).toBe(30);
  });
});

/* ─── Base factice ─────────────────────────────────────────────────────────── */

type Op = { table: string; op: string; valeur?: unknown; filtres: [string, unknown][] };
function fausseBase(reponses: { artisan?: Record<string, unknown> | null; lectureEchoue?: boolean; documents?: { type: string }[]; objet?: { size: number; mimetype: string } | null } = {}) {
  const ops: Op[] = [];
  const storage: string[] = [];
  const requete = (table: string, op: string, valeur?: unknown) => {
    const o: Op = { table, op, valeur, filtres: [] };
    ops.push(o);
    const resultat = () => {
      if (table === "reseau_artisans" && op === "select") return reponses.lectureEchoue ? { data: null, error: { message: "panne" } } : { data: reponses.artisan ?? null, error: null };
      if (table === "reseau_documents" && op === "select") return { data: (reponses.documents ?? []).map((d, i) => ({ id: `d${i}`, chemin: `c${i}`, nom: "f", taille: 1, mime: "image/jpeg", created_at: "", ...d })), error: null };
      if (op === "insert") return { data: { id: "nouveau", type: "photo", chemin: "x", nom: "f", taille: 1, mime: "image/jpeg", created_at: "" }, error: null };
      if (op === "update") return { data: [{ id: "x" }], error: null };
      return { data: null, error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, limit: () => q,
      eq: (c: string, v: unknown) => { o.filtres.push([c, v]); return q; },
      maybeSingle: async () => { const r = resultat(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      single: async () => resultat(),
      then: (res: (v: unknown) => unknown) => Promise.resolve(resultat()).then(res),
    };
    return q;
  };
  const sb = {
    from: (table: string) => ({
      select: () => requete(table, "select"),
      insert: (v: unknown) => requete(table, "insert", v),
      update: (v: unknown) => requete(table, "update", v),
      delete: () => requete(table, "delete"),
    }),
    storage: {
      from: () => ({
        createSignedUploadUrl: async (p: string) => ({ data: { path: p, token: "jeton" }, error: null }),
        list: async () => ({ data: reponses.objet === null ? [] : [{ name: "OBJET", metadata: reponses.objet ?? { size: 1000, mimetype: "image/jpeg" } }], error: null }),
        remove: async (p: string[]) => { storage.push(...p); return { data: null, error: null }; },
        createSignedUrls: async () => ({ data: [], error: null }),
      }),
    },
  };
  return { sb, ops, storage };
}

async function chargerReseau(user: { id: string; email?: string } | null, base: ReturnType<typeof fausseBase>, siret: "actif" | "ferme" = "actif") {
  const mails: unknown[] = [];
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user, getAdmin: async () => null }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => base.sb }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: unknown) => { mails.push(m); return "envoye"; } }));
  vi.doMock("@/lib/reseau/siret", async (orig) => ({ ...(await orig<typeof import("@/lib/reseau/siret")>()), verifierSiret: async () => ({ statut: siret, nom: "PLOMBERIE DUPONT", verifieLe: "" }) }));
  const m = await import("@/lib/actions/reseau");
  return { m, mails };
}

const MOCKS = ["@/lib/auth", "@/lib/supabase/admin", "@/lib/audit", "@/lib/ratelimit", "next/cache", "@/lib/email", "@/lib/reseau/siret"];

describe("actions de l'artisan", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });
  const formulaire = {
    siret: "55203253400703", nomCommercial: "", contactNom: "Jean Dupont", telephone: "0612345678", metiers: ["plomberie"], departements: ["33"],
    presentation: "", siteWeb: "", lienAvis: "", decennaleAssureur: "SMABTP", decennalePolice: "1", decennaleFin: "2030-01-01", conditions: true,
    // Tentatives d'écrire ce qui ne vient pas du formulaire : ignorées.
    statut: "valide", user_id: "autre", email: "pirate@x.fr",
  };
  const docsOk = [{ type: "decennale" }, { type: "photo" }, { type: "photo" }, { type: "photo" }];

  it("sans session : rien", async () => {
    const base = fausseBase();
    const { m } = await chargerReseau(null, base);
    expect(await m.soumettreCandidature(formulaire)).toEqual({ ok: false, erreur: "session" });
    expect(base.ops).toHaveLength(0);
  });

  it("première candidature : insertion « à examiner », compte et e-mail de la SESSION, deux e-mails", async () => {
    const base = fausseBase({ artisan: null, documents: docsOk });
    const { m, mails } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.soumettreCandidature(formulaire)).toEqual({ ok: true });
    const ins = base.ops.find((o) => o.table === "reseau_artisans" && o.op === "insert")!;
    expect(ins.valeur).toMatchObject({ user_id: "u-art", email: "jean@x.fr", statut: "en_attente", siret: "55203253400703", telephone: "+33612345678", raison_sociale: "PLOMBERIE DUPONT" });
    expect(mails).toHaveLength(2);
  });

  it("candidature déjà décidée (validée) : verrouillée, aucune écriture", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ statut: "valide" }), documents: docsOk });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.soumettreCandidature(formulaire)).toEqual({ ok: false, erreur: "verrouille" });
    expect(base.ops.some((o) => o.op !== "select")).toBe(false);
  });

  it("lecture en panne : refus, jamais traité comme un nouveau venu", async () => {
    const base = fausseBase({ lectureEchoue: true, documents: docsOk });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.soumettreCandidature(formulaire)).toEqual({ ok: false, erreur: "serveur" });
    expect(base.ops.some((o) => o.op === "insert" || o.op === "update")).toBe(false);
  });

  it("complément demandé : mise à jour gardée par le statut « à compléter »", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ statut: "a_completer" }), documents: docsOk });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.soumettreCandidature(formulaire)).toEqual({ ok: true });
    const maj = base.ops.find((o) => o.op === "update")!;
    expect(maj.filtres).toEqual([["user_id", "u-art"], ["statut", "a_completer"]]);
    // Le dossier a pu changer : l'appel est à refaire avant de valider.
    expect(maj.valeur).toMatchObject({ appel_le: null, statut: "en_attente" });
  });

  it("documents manquants, établissement fermé : refus avec la raison", async () => {
    const sans = fausseBase({ artisan: null, documents: [{ type: "photo" }] });
    const r1 = await (await chargerReseau({ id: "u-art", email: "jean@x.fr" }, sans)).m.soumettreCandidature(formulaire);
    expect(r1).toMatchObject({ ok: false, erreurs: { documents: "decennale,photo" } });
    const ferme = fausseBase({ artisan: null, documents: docsOk });
    const r2 = await (await chargerReseau({ id: "u-art", email: "jean@x.fr" }, ferme, "ferme")).m.soumettreCandidature(formulaire);
    expect(r2).toEqual({ ok: false, erreurs: { siret: "ferme" } });
    expect(ferme.ops.some((o) => o.op === "insert")).toBe(false);
  });

  it("fichiers : URL d'envoi dans le dossier du compte ; type, taille et dossier d'autrui refusés", async () => {
    const base = fausseBase({ artisan: null });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    const p = await m.preparerEnvoiDocument({ type: "photo", taille: 1000, mime: "image/jpeg" });
    expect(p.ok && p.chemin).toMatch(/^u-art\/photo\/[0-9a-f-]{36}\.jpg$/);
    expect(await m.preparerEnvoiDocument({ type: "photo", taille: 1000, mime: "application/pdf" })).toEqual({ ok: false, erreur: "type" });
    expect(await m.preparerEnvoiDocument({ type: "photo", taille: 11 * 1024 * 1024, mime: "image/jpeg" })).toEqual({ ok: false, erreur: "taille" });
    expect(await m.preparerEnvoiDocument({ type: "../x", taille: 1, mime: "image/jpeg" })).toEqual({ ok: false, erreur: "type" });
    expect(await m.enregistrerDocument({ type: "photo", chemin: "u-autre/photo/6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f.jpg", nom: "x" })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await m.enregistrerDocument({ type: "photo", chemin: "u-art/photo/../../u-autre/x.jpg", nom: "x" })).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("fichier arrivé d'un autre type que déclaré : retiré du stockage, pas enregistré", async () => {
    const chemin = "u-art/photo/6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f.jpg";
    const base = fausseBase({ artisan: null, objet: { size: 1000, mimetype: "text/html" } });
    // Le stockage factice nomme l'objet « OBJET » : on lui donne le nom attendu.
    base.sb.storage.from = () => ({
      createSignedUploadUrl: async (p: string) => ({ data: { path: p, token: "j" }, error: null }),
      list: async () => ({ data: [{ name: chemin.split("/").pop()!, metadata: { size: 1000, mimetype: "text/html" } }], error: null }),
      remove: async (p: string[]) => { base.storage.push(...p); return { data: null, error: null }; },
      createSignedUrls: async () => ({ data: [], error: null }),
    });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.enregistrerDocument({ type: "photo", chemin, nom: "x" })).toEqual({ ok: false, erreur: "type" });
    expect(base.storage).toEqual([chemin]);
    expect(base.ops.some((o) => o.op === "insert")).toBe(false);
  });

  it("candidature envoyée : plus aucun fichier ne s'ajoute ni ne se retire", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ statut: "en_attente" }) });
    const { m } = await chargerReseau({ id: "u-art", email: "jean@x.fr" }, base);
    expect(await m.preparerEnvoiDocument({ type: "photo", taille: 1000, mime: "image/jpeg" })).toEqual({ ok: false, erreur: "verrouille" });
    expect(await m.supprimerDocument("6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f")).toEqual({ ok: false, erreur: "verrouille" });
  });
});

describe("décisions de l'admin", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });
  const ID = "6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f";
  async function charger(admin: boolean, base: ReturnType<typeof fausseBase>) {
    const mails: { to: string; subject: string; html: string }[] = [];
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ getAdmin: async () => (admin ? { id: "adm" } : null), getUser: async () => ({ id: "u", email: "u@x.fr" }) }));
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => base.sb }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return "envoye"; } }));
    return { m: await import("@/lib/actions/admin"), mails };
  }

  it("non admin : refusé, rien n'est lu", async () => {
    const base = fausseBase({ artisan: ligneArtisan() });
    const { m } = await charger(false, base);
    expect((await m.deciderArtisan(ID, "valider")).ok).toBe(false);
    expect(base.ops).toHaveLength(0);
  });

  it("valider sans appel : refusé avec la raison", async () => {
    const base = fausseBase({ artisan: ligneArtisan(), documents: [{ type: "decennale" }] });
    const { m } = await charger(true, base);
    const r = await m.deciderArtisan(ID, "valider");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/appel/);
    expect(base.ops.some((o) => o.op === "update")).toBe(false);
  });

  it("valider avec l'appel : statut gardé par l'état lu, e-mail de bienvenue avec le message échappé", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ appel_le: "2026-11-17T09:00:00Z" }), documents: [{ type: "decennale" }] });
    const { m, mails } = await charger(true, base);
    expect(await m.deciderArtisan(ID, "valider", "Bienvenue <b>!</b>")).toEqual({ ok: true });
    const maj = base.ops.find((o) => o.op === "update")!;
    expect(maj.valeur).toMatchObject({ statut: "valide", message_admin: "Bienvenue <b>!</b>" });
    expect(maj.filtres).toEqual([["id", ID], ["statut", "en_attente"]]);
    expect(mails[0].to).toBe("jean@x.fr");
    expect(mails[0].html).toContain("Bienvenue &lt;b&gt;!&lt;/b&gt;");
  });

  it("suspendu (décennale expirée) : un complément peut être demandé, sinon il ne reviendrait jamais", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ statut: "suspendu", appel_le: "2026-11-01T09:00:00Z", decennale_fin: "2026-11-01" }) });
    const { m } = await charger(true, base);
    expect((await m.deciderArtisan(ID, "reactiver")).ok).toBe(false);
    expect(await m.deciderArtisan(ID, "completer", "Envoie ta nouvelle attestation décennale.")).toEqual({ ok: true });
    expect(base.ops.find((o) => o.op === "update")!.valeur).toMatchObject({ statut: "a_completer" });
  });

  it("complément sans message, action impossible depuis l'état : refusés", async () => {
    const base = fausseBase({ artisan: ligneArtisan({ statut: "refuse" }) });
    const { m } = await charger(true, base);
    expect((await m.deciderArtisan(ID, "completer", "  ")).ok).toBe(false);
    expect((await m.deciderArtisan(ID, "suspendre")).ok).toBe(false);
    expect((await m.deciderArtisan(ID, "nimporte" as never)).ok).toBe(false);
    expect(base.ops.some((o) => o.op === "update")).toBe(false);
  });
});

describe("branchements", () => {
  it("tables du réseau à part du carnet personnel `artisans`, sans aucune policy ni droit public", () => {
    const sql = lire("supabase/migrations/0007_reseau_artisans.sql");
    expect(sql).toContain("create table if not exists public.reseau_artisans");
    expect(sql).not.toMatch(/create table if not exists public\.artisans\b/);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toContain("revoke all on public.reseau_artisans from anon, authenticated");
    expect(sql).toMatch(/'reseau-artisans', 'reseau-artisans', false, 10485760/);
    // Le plafond de fichiers tenu aussi par la base (envois simultanés).
    expect(sql).toMatch(/create trigger reseau_documents_plafond before insert on public\.reseau_documents/);
    expect(sql).toContain("pg_advisory_xact_lock");
  });
  it("la suppression du compte vide d'abord le dossier de fichiers du réseau", () => {
    const src = lire("lib/actions/compte.ts");
    expect(src.indexOf("supprimerFichiersArtisan(user.id)")).toBeGreaterThan(0);
    expect(src.indexOf("supprimerFichiersArtisan(user.id)")).toBeLessThan(src.indexOf("deleteUser(user.id)"));
  });
  it("le menu admin, le pied de page, le sitemap et robots connaissent le réseau", () => {
    expect(lire("components/admin/AdminNav.tsx")).toContain('href: "/admin/artisans"');
    expect(lire("app/layout.tsx")).toContain('href="/reseau-artisans"');
    expect(lire("app/sitemap.ts")).toContain("/reseau-artisans");
    expect(lire("app/robots.ts")).toContain('"/espace-artisan"');
  });
  it("la page publique publie ses critères de référencement", () => {
    const src = lire("app/reseau-artisans/page.tsx");
    expect(src).toContain('id="criteres"');
    expect(src).toMatch(/Aucun artisan ne paie pour être mieux placé/);
  });
});
