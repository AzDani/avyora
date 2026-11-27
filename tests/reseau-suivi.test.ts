/**
 * Réseau AVYORA, phase 3 (20/11/2026) : relances et expirations (tâche quotidienne), remplacement d'un artisan,
 * suivi des devis, avis des clients, adresse du chantier. Chaque action ne touche que ce qui appartient à la session
 * (le client ses demandes, l'artisan ses mises en relation), et chaque évènement n'envoie qu'un e-mail.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
// L'Agent Agenda passe dans la même tournée (27/11/2026) : il a ses propres tests (agents-rappels, bureaux-donnees).
vi.mock("@/lib/agents/travail", () => ({ tourneeAgenda: async () => ({ rappels: 0, echecs: 0 }) }));
import { placesRestantes, lireAvis, estIssue, validerDemandeDevis } from "@/lib/reseau/demande";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const A1 = "11111111-1111-4111-8111-111111111111";
const A2 = "22222222-2222-4222-8222-222222222222";
const MISE = "33333333-3333-4333-8333-333333333333";
const DEM = "55555555-5555-4555-8555-555555555555";

describe("règles", () => {
  it("places : 3 en cours au plus, 6 contactés au total", () => {
    expect(placesRestantes([])).toBe(3);
    expect(placesRestantes(["envoyee", "acceptee"])).toBe(1);
    expect(placesRestantes(["refusee", "expiree", "acceptee"])).toBe(2);
    expect(placesRestantes(["refusee", "expiree", "refusee", "expiree", "acceptee"])).toBe(1);
    expect(placesRestantes(["refusee", "expiree", "refusee", "expiree", "refusee", "acceptee"])).toBe(0);
  });
  it("avis : note entière de 1 à 5, commentaire nettoyé et borné", () => {
    expect(lireAvis(4, "  Très bien \r\n reçu  ")).toEqual({ note: 4, commentaire: "Très bien \n reçu" });
    expect(lireAvis(5, "")).toEqual({ note: 5, commentaire: null });
    for (const n of [0, 6, 3.5, "x", null]) expect(lireAvis(n, "")).toBeNull();
    expect(lireAvis(3, "a".repeat(2000))!.commentaire).toHaveLength(1000);
    expect(estIssue("signe")).toBe(true);
    expect(estIssue("annule")).toBe(false);
  });
  it("l'adresse du chantier est facultative et bornée", () => {
    const base = { metiers: ["plomberie"], codePostal: "33000", prenom: "Léa", telephone: "0612345678", consentement: true };
    expect(validerDemandeDevis({ ...base, adresse: "12 rue des Lilas" }).ok).toBe(true);
    const r = validerDemandeDevis({ ...base, adresse: "x".repeat(201) });
    expect(r.ok).toBe(false);
  });
});

/* ─── Base factice ─────────────────────────────────────────────────────────── */

type Op = { table: string; op: string; valeur?: unknown; filtres: [string, ...unknown[]][] };
function base(rep: Record<string, unknown> = {}) {
  const ops: Op[] = [];
  const requete = (table: string, op: string, valeur?: unknown) => {
    const o: Op = { table, op, valeur, filtres: [] };
    ops.push(o);
    const r = () => {
      const v = rep[`${table}:${op}`];
      return typeof v === "function" ? (v as (o: Op) => unknown)(o) : { data: v ?? (op === "insert" ? { id: "x" } : null), error: null };
    };
    const f = (k: string) => (...a: unknown[]) => { o.filtres.push([k, ...a]); return q; };
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, limit: () => q,
      eq: f("eq"), neq: f("neq"), in: f("in"), is: f("is"), lt: f("lt"), not: f("not"), contains: f("contains"), overlaps: f("overlaps"), gte: f("gte"),
      maybeSingle: async () => { const x = r() as { data: unknown }; return { ...x, data: Array.isArray(x.data) ? x.data[0] ?? null : x.data }; },
      single: async () => r(),
      then: (res: (v: unknown) => unknown) => Promise.resolve(r()).then(res),
    };
    return q;
  };
  const sb = {
    rpc: async () => ({ data: [], error: null }),
    from: (t: string) => ({ select: () => requete(t, "select"), insert: (v: unknown) => requete(t, "insert", v), update: (v: unknown) => requete(t, "update", v), delete: () => requete(t, "delete") }),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }), list: async () => ({ data: [], error: null }) }) },
  };
  return { sb, ops };
}
const MOCKS = ["@/lib/auth", "@/lib/supabase/admin", "@/lib/audit", "@/lib/ratelimit", "next/cache", "@/lib/email"];
async function charger(user: Record<string, unknown> | null, b: ReturnType<typeof base>) {
  const mails: { to: string; subject: string; html: string }[] = [];
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user, estPro: () => true, getAdmin: async () => null }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return "envoye"; } }));
  return { m: await import("@/lib/actions/devis"), mails };
}
const CLIENT = { id: "u-client", email: "lea@x.fr" };
const candidature = (statut = "valide") => ({ id: A1, user_id: "u-art", statut, siret: "55203253400703", raison_sociale: "DUPONT", contact_nom: "Jean", telephone: "+33612345678", email: "jean@art.fr", metiers: [], departements: [], decennale_fin: "2030-01-01", soumise_le: "" });

describe("suivi et avis du client", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });

  it("pas SA demande : rien n'est écrit", async () => {
    const b = base({ "reseau_mises_en_relation:select": { id: MISE, demande_id: DEM, statut: "acceptee" }, "reseau_demandes:select": null });
    const { m } = await charger(CLIENT, b);
    expect(await m.suivreArtisan(MISE, "signe")).toEqual({ ok: false });
    expect(await m.laisserAvis(MISE, 5, "top")).toEqual({ ok: false });
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
    const dem = b.ops.find((o) => o.table === "reseau_demandes")!;
    expect(dem.filtres).toEqual([["eq", "id", DEM], ["eq", "client_id", "u-client"]]);
  });

  it("sa demande, artisan accepté : issue et avis enregistrés ; note invalide refusée", async () => {
    const b = base({ "reseau_mises_en_relation:select": { id: MISE, demande_id: DEM, statut: "acceptee" }, "reseau_demandes:select": { id: DEM } });
    const { m } = await charger(CLIENT, b);
    expect(await m.suivreArtisan(MISE, "signe")).toEqual({ ok: true });
    expect(await m.laisserAvis(MISE, 2, "Pas rappelé")).toEqual({ ok: true });
    expect(await m.laisserAvis(MISE, 9, "")).toEqual({ ok: false });
    expect(await m.suivreArtisan(MISE, "annule")).toEqual({ ok: false });
    const majs = b.ops.filter((o) => o.op === "update");
    expect(majs[0].valeur).toMatchObject({ issue: "signe" });
    expect(majs[1].valeur).toMatchObject({ avis_note: 2, avis_commentaire: "Pas rappelé" });
    expect(majs.length).toBe(2);
    const sel = b.ops.find((o) => o.table === "reseau_mises_en_relation" && o.op === "select")!;
    expect(sel.filtres).toContainEqual(["eq", "statut", "acceptee"]);
  });
});

describe("devis envoyé (artisan)", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });
  it("seulement SA mise en relation acceptée, une fois", async () => {
    const b = base({ "reseau_artisans:select": candidature(), "reseau_mises_en_relation:update": [{ id: MISE }] });
    const { m } = await charger({ id: "u-art" }, b);
    expect(await m.marquerDevisEnvoye(MISE)).toEqual({ ok: true });
    expect(b.ops.find((o) => o.op === "update")!.filtres).toEqual([["eq", "id", MISE], ["eq", "artisan_id", A1], ["eq", "statut", "acceptee"], ["is", "devis_envoye_le", null]]);
    const suspendu = base({ "reseau_artisans:select": candidature("suspendu") });
    expect((await (await charger({ id: "u-art" }, suspendu)).m.marquerDevisEnvoye(MISE)).ok).toBe(false);
    expect(suspendu.ops.some((o) => o.op === "update")).toBe(false);
  });
});

describe("remplacer un artisan", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });
  const demande = { id: DEM, metiers: ["plomberie"], departement: "33", code_postal: "33000", ville: null, delai: null, estimation: null, prenom: "Léa" };

  it("à la place d'un refus : artisan éligible ajouté, e-mail sans les coordonnées du client", async () => {
    const b = base({ "reseau_demandes:select": demande, "reseau_mises_en_relation:select": [{ artisan_id: A1, statut: "refusee" }], "reseau_artisans:select": [{ id: A2, contact_nom: "Paul", email: "paul@art.fr" }] });
    const { m, mails } = await charger(CLIENT, b);
    expect(await m.ajouterArtisans(DEM, [A2])).toEqual({ ok: true });
    expect(b.ops.find((o) => o.table === "reseau_demandes")!.filtres).toEqual([["eq", "id", DEM], ["eq", "client_id", "u-client"]]);
    expect(b.ops.find((o) => o.table === "reseau_artisans")!.filtres).toContainEqual(["neq", "user_id", "u-client"]);
    expect(b.ops.find((o) => o.op === "insert")!.valeur).toEqual([{ demande_id: DEM, artisan_id: A2 }]);
    expect(mails).toHaveLength(1);
    expect(mails[0].html).not.toContain("lea@x.fr");
  });

  it("déjà contacté, plus de place, ou pas SA demande : refus, rien n'est écrit", async () => {
    const deja = base({ "reseau_demandes:select": demande, "reseau_mises_en_relation:select": [{ artisan_id: A2, statut: "refusee" }] });
    expect((await (await charger(CLIENT, deja)).m.ajouterArtisans(DEM, [A2])).ok).toBe(false);
    const plein = base({ "reseau_demandes:select": demande, "reseau_mises_en_relation:select": [{ artisan_id: "a", statut: "envoyee" }, { artisan_id: "b", statut: "acceptee" }, { artisan_id: "c", statut: "envoyee" }] });
    expect((await (await charger(CLIENT, plein)).m.ajouterArtisans(DEM, [A2])).ok).toBe(false);
    const autrui = base({ "reseau_demandes:select": null });
    expect((await (await charger(CLIENT, autrui)).m.ajouterArtisans(DEM, [A2])).ok).toBe(false);
    expect([...deja.ops, ...plein.ops, ...autrui.ops].some((o) => o.op === "insert")).toBe(false);
  });
});

describe("la tournée quotidienne", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/admin"); vi.doUnmock("@/lib/email"); vi.unstubAllEnvs(); vi.resetModules(); });
  async function route(b: ReturnType<typeof base>) {
    const mails: { to: string; subject: string; html: string }[] = [];
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
    vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return "envoye"; } }));
    return { GET: (await import("@/app/api/cron/reseau/route")).GET, mails };
  }

  it("sans le secret : refus, rien n'est lu", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const b = base();
    const { GET } = await route(b);
    expect((await GET(new Request("https://x/api/cron/reseau", { headers: { authorization: "Bearer faux" } }))).status).toBe(401);
    expect(b.ops).toHaveLength(0);
  });

  // Les lectures de la tournée, selon leurs filtres : expirations, relances, avis, puis les statuts d'une demande.
  const selon = (lots: { exp: unknown[]; rel: unknown[]; avis: unknown[]; statuts?: unknown[] }) => (o: { filtres: unknown[][] }) => {
    const a = (k: string, c: string, v?: unknown) => o.filtres.some((f) => f[0] === k && f[1] === c && (v === undefined || f[2] === v));
    if (a("in", "demande_id")) return { data: lots.statuts ?? [], error: null };
    if (a("eq", "statut", "acceptee")) return { data: lots.avis, error: null };
    if (a("is", "relance_le")) return { data: lots.rel, error: null };
    return { data: lots.exp, error: null };
  };
  const ARTISAN = { id: "a1", statut: "valide", raison_sociale: "DUPONT", nom_commercial: null, contact_nom: "Jean", email: "jean@art.fr" };
  const DEMANDE = { id: "d1", prenom: "Léa", email: "lea@x.fr", metiers: ["plomberie"], departement: "33", code_postal: "33000", ville: null };

  it("expiration (UN e-mail au client par demande), relance (artisan validé), avis (client) : chaque mise à jour gardée par l'état lu", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const b = base({
      "reseau_mises_en_relation:select": selon({
        exp: [{ id: "m-exp1", demande_id: "d1", artisan_id: "a1" }, { id: "m-exp2", demande_id: "d1", artisan_id: "a2" }],
        rel: [{ id: "m-rel", demande_id: "d1", artisan_id: "a1" }],
        avis: [{ id: "m-avis", demande_id: "d1", artisan_id: "a1" }],
        statuts: [{ demande_id: "d1", statut: "expiree" }, { demande_id: "d1", statut: "expiree" }],
      }),
      "reseau_mises_en_relation:update": [{ id: "ok" }],
      "reseau_demandes:select": [DEMANDE],
      "reseau_artisans:select": [ARTISAN, { ...ARTISAN, id: "a2", raison_sociale: "MARTIN" }],
    });
    const { GET, mails } = await route(b);
    const r = await GET(new Request("https://x/api/cron/reseau", { headers: { authorization: "Bearer s3cret" } }));
    expect(await r.json()).toEqual({ ok: true, expirees: 2, relances: 1, avis: 1 , agenda: { rappels: 0, echecs: 0 } });
    const majs = b.ops.filter((o) => o.op === "update");
    expect(majs[0].valeur).toMatchObject({ statut: "expiree" });
    expect(majs[0].filtres).toContainEqual(["eq", "statut", "envoyee"]);
    expect(majs[2].filtres).toContainEqual(["is", "relance_le", null]);
    expect(majs[3].filtres).toContainEqual(["is", "sondage_le", null]);
    expect(mails.map((x) => x.to)).toEqual(["lea@x.fr", "jean@art.fr", "lea@x.fr"]);
    expect(mails[0].subject).toBe("Des artisans n'ont pas répondu à ta demande");
  });

  it("artisan suspendu : pas de relance ; plus de place sur la demande : le client n'est pas invité à remplacer", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const statuts = ["expiree", "refusee", "refusee", "expiree", "refusee", "expiree"].map((statut) => ({ demande_id: "d1", statut }));
    const b = base({
      "reseau_mises_en_relation:select": selon({ exp: [{ id: "m1", demande_id: "d1", artisan_id: "a1" }], rel: [{ id: "m2", demande_id: "d1", artisan_id: "a1" }], avis: [], statuts }),
      "reseau_mises_en_relation:update": [{ id: "ok" }],
      "reseau_demandes:select": [DEMANDE],
      "reseau_artisans:select": [{ ...ARTISAN, statut: "suspendu" }],
    });
    const { GET, mails } = await route(b);
    expect(await (await GET(new Request("https://x/api/cron/reseau", { headers: { authorization: "Bearer s3cret" } }))).json()).toEqual({ ok: true, expirees: 1, relances: 0, avis: 0 , agenda: { rappels: 0, echecs: 0 } });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("lea@x.fr");
    expect(mails[0].html).toContain("nombre maximum");
    expect(b.ops.filter((o) => o.op === "update")).toHaveLength(1);
  });

  it("déjà traité par une autre tournée : pas de second e-mail", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const m = [{ id: "m", demande_id: "d1", artisan_id: "a1" }];
    const b = base({
      "reseau_mises_en_relation:select": selon({ exp: m, rel: m, avis: m }),
      "reseau_mises_en_relation:update": [],
      "reseau_demandes:select": [DEMANDE],
      "reseau_artisans:select": [ARTISAN],
    });
    const { GET, mails } = await route(b);
    expect(await (await GET(new Request("https://x/api/cron/reseau", { headers: { authorization: "Bearer s3cret" } }))).json()).toEqual({ ok: true, expirees: 0, relances: 0, avis: 0 , agenda: { rappels: 0, echecs: 0 } });
    expect(mails).toHaveLength(0);
  });
});

describe("l'adresse du chantier ne va qu'à l'artisan qui accepte", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/admin"); vi.resetModules(); });
  it("demandesRecues", async () => {
    const d = { id: "d1", client_id: "c", projet_id: null, metiers: ["plomberie"], code_postal: "33000", departement: "33", ville: null, adresse: "12 rue des Lilas", description: null, quantites: null, delai: null, photos: [], estimation: null, prenom: "Léa", telephone: "+33612345678", email: "lea@x.fr", created_at: "" };
    const mer = (id: string, statut: string) => ({ id, demande_id: "d1", artisan_id: A1, statut, envoyee_le: "", repondu_le: null, devis_envoye_le: null, issue: "signe", avis_note: 1, avis_commentaire: "nul", avis_le: "" });
    const b = base({ "reseau_mises_en_relation:select": [mer("m1", "envoyee"), mer("m2", "acceptee")], "reseau_demandes:select": [d] });
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
    const { demandesRecues } = await import("@/lib/data/reseau");
    const r = await demandesRecues(A1);
    expect(JSON.stringify(r[0])).not.toContain("Lilas");
    expect(r[1].client?.adresse).toBe("12 rue des Lilas");
    // L'avis du client n'est jamais montré à l'artisan.
    expect(JSON.stringify(r)).not.toMatch(/avis|nul"/);
  });
});

describe("branchements", () => {
  it("migration 0009 additive, plafond 3 en cours / 6 au total, tâche planifiée déclarée", () => {
    const sql = lire("supabase/migrations/0009_reseau_suivi.sql");
    expect(sql).not.toMatch(/drop table|drop column|delete from/i);
    expect(sql).toContain("if en_cours >= 3");
    expect(sql).toContain("if total >= 6");
    expect(sql).toContain("'expiree'");
    const crons = JSON.parse(lire("vercel.json")).crons as { path: string }[];
    expect(crons.map((c) => c.path)).toContain("/api/cron/reseau");
  });
});
