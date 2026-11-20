/**
 * Réseau AVYORA, phase 2 (17/11/2026) : les demandes de devis. Règles pures (validation, métiers d'un projet, ordre
 * équitable), puis les garde-fous des actions avec une base factice : la demande part du compte connecté (Pro), ses
 * artisans sont revérifiés, l'estimation vient de SON projet, et les coordonnées du client ne vont qu'à l'artisan
 * qui accepte, lui-même seulement sur SA mise en relation.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { validerDemandeDevis, metiersDesLots, ordreEquitable } from "@/lib/reseau/demande";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const A1 = "11111111-1111-4111-8111-111111111111";
const A2 = "22222222-2222-4222-8222-222222222222";
const MISE = "33333333-3333-4333-8333-333333333333";
const PROJET = "44444444-4444-4444-8444-444444444444";

const minimal = { metiers: ["plomberie"], codePostal: "33000", prenom: "Léa", telephone: "06 12 34 56 78", consentement: true, artisans: [], projetId: "", delai: "", ville: "", description: "", quantites: "", joindreEstimation: false };

describe("validation de la demande", () => {
  it("le minimum suffit : un type de travaux, un code postal, de quoi joindre le client, son accord", () => {
    const r = validerDemandeDevis(minimal);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.d.telephone).toBe("+33612345678");
  });
  it("chaque défaut a son code", () => {
    const r = validerDemandeDevis({ ...minimal, metiers: [], codePostal: "98000", prenom: "http://x.fr", telephone: "01 45 00 00 00", consentement: false, artisans: [A1, A2, A1.replace("1111-4", "1112-4"), "44444444-4444-4444-8444-444444444445"], delai: "demain" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs).toMatchObject({ metiers: "requis", codePostal: "invalide", prenom: "invalide", telephone: "pasPortable", consentement: "requis", artisans: "trop", delai: "invalide" });
  });
});

describe("métiers d'un projet et ordre équitable", () => {
  it("les lots chiffrés donnent les métiers (les lots sans métier sont ignorés)", () => {
    expect(metiersDesLots([{ corps: "Plomberie" }, { corps: "Carrelage / Revetements" }, { corps: "Annexes de chantier" }])).toEqual(["plomberie", "carrelage"]);
  });
  it("d'abord ceux qui ont reçu le moins de demandes, puis un ordre stable propre au client", () => {
    const arts = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const recues = new Map([["a", 5], ["b", 0], ["c", 2]]);
    expect(ordreEquitable(arts, recues, "client-1").map((x) => x.id)).toEqual(["b", "c", "a"]);
    const egal = [{ id: "x" }, { id: "y" }, { id: "z" }, { id: "w" }];
    expect(ordreEquitable(egal, new Map(), "client-1")).toEqual(ordreEquitable(egal, new Map(), "client-1"));
  });
});

/* ─── Base factice ─────────────────────────────────────────────────────────── */

type Op = { table: string; op: string; valeur?: unknown; filtres: [string, string, unknown][] };
function base(reponses: Partial<Record<string, unknown>> = {}) {
  const ops: Op[] = [];
  const requete = (table: string, op: string, valeur?: unknown) => {
    const o: Op = { table, op, valeur, filtres: [] };
    ops.push(o);
    const r = () => {
      const v = reponses[`${table}:${op}`];
      return typeof v === "function" ? (v as (o: Op) => unknown)(o) : { data: v ?? (op === "insert" ? { id: "nouvelle" } : null), error: null };
    };
    const filtre = (k: string) => (c: string, v: unknown) => { o.filtres.push([k, c, v]); return q; };
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, limit: () => q,
      eq: filtre("eq"), neq: filtre("neq"), in: filtre("in"), contains: filtre("contains"), overlaps: filtre("overlaps"), gte: filtre("gte"),
      maybeSingle: async () => { const x = r() as { data: unknown }; return { ...x, data: Array.isArray(x.data) ? x.data[0] ?? null : x.data }; },
      single: async () => r(),
      then: (res: (v: unknown) => unknown) => Promise.resolve(r()).then(res),
    };
    return q;
  };
  const sb = {
    rpc: async (nom: string, args: unknown) => { ops.push({ table: `rpc:${nom}`, op: "rpc", valeur: args, filtres: [] }); return { data: reponses.rpc ?? [], error: null }; },
    from: (table: string) => ({ select: () => requete(table, "select"), insert: (v: unknown) => requete(table, "insert", v), update: (v: unknown) => requete(table, "update", v), delete: () => requete(table, "delete") }),
    storage: { from: () => ({
      createSignedUploadUrl: async (p: string) => ({ data: { path: p, token: "j" }, error: null }),
      list: async () => ({ data: (reponses.fichiers as string[] | undefined)?.map((name) => ({ name })) ?? [], error: null }),
      createSignedUrls: async (c: string[]) => ({ data: c.map((p) => ({ path: p, signedUrl: `https://s/${p}` })), error: null }),
      remove: async () => ({ data: null, error: null }),
    }) },
  };
  return { sb, ops };
}

const MOCKS = ["@/lib/auth", "@/lib/supabase/admin", "@/lib/audit", "@/lib/ratelimit", "next/cache", "@/lib/email"];
async function charger(user: Record<string, unknown> | null, b: ReturnType<typeof base>, pro = true) {
  const mails: { to: string; subject: string; html: string }[] = [];
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user, estPro: () => pro, getAdmin: async () => null }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return "envoye"; } }));
  return { m: await import("@/lib/actions/devis"), mails };
}
const CLIENT = { id: "u-client", email: "lea@x.fr", email_confirmed_at: "2026-01-01" };
const artisanLigne = (id: string, x: Record<string, unknown> = {}) => ({ id, user_id: `u-${id.slice(0, 4)}`, raison_sociale: `ENTREPRISE ${id.slice(0, 1)}`, nom_commercial: null, contact_nom: `Contact ${id.slice(0, 1)}`, email: `${id.slice(0, 1)}@art.fr`, ...x });

describe("envoyer une demande", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });

  it("sans session, ou sans AVYORA Pro : rien n'est écrit", async () => {
    const b1 = base();
    expect(await (await charger(null, b1)).m.envoyerDemandeDevis(minimal)).toEqual({ ok: false, erreur: "session" });
    const b2 = base();
    expect(await (await charger(CLIENT, b2, false)).m.envoyerDemandeDevis(minimal)).toEqual({ ok: false, erreur: "pro" });
    expect([...b1.ops, ...b2.ops]).toHaveLength(0);
  });

  it("deux artisans choisis : demande du compte connecté, mises en relation, e-mails sans les coordonnées du client", async () => {
    const b = base({ "reseau_artisans:select": [artisanLigne(A1), artisanLigne(A2)] });
    const { m, mails } = await charger(CLIENT, b);
    const r = await m.envoyerDemandeDevis({ ...minimal, artisans: [A1, A2], client_id: "pirate", email: "pirate@x.fr" });
    expect(r).toEqual({ ok: true, id: "nouvelle" });
    const dem = b.ops.find((o) => o.table === "reseau_demandes" && o.op === "insert")!;
    expect(dem.valeur).toMatchObject({ client_id: "u-client", email: "lea@x.fr", departement: "33", telephone: "+33612345678", estimation: null });
    const art = b.ops.find((o) => o.table === "reseau_artisans" && o.op === "select")!;
    expect(art.filtres).toEqual(expect.arrayContaining([["eq", "statut", "valide"], ["contains", "departements", ["33"]]]));
    expect((b.ops.find((o) => o.table === "reseau_mises_en_relation" && o.op === "insert")!.valeur as unknown[]).length).toBe(2);
    const aux = mails.filter((x) => x.to.endsWith("@art.fr"));
    expect(aux).toHaveLength(2);
    for (const x of aux) { expect(x.html).not.toContain("06 12"); expect(x.html).not.toContain("+33612345678"); expect(x.html).not.toContain("lea@x.fr"); }
    expect(mails.some((x) => x.to === "lea@x.fr")).toBe(true);
  });

  it("un artisan choisi n'est plus disponible (ou c'est le client lui-même) : refus, rien n'est écrit", async () => {
    const b = base({ "reseau_artisans:select": [artisanLigne(A1)] });
    const { m } = await charger(CLIENT, b);
    expect(await m.envoyerDemandeDevis({ ...minimal, artisans: [A1, A2] })).toEqual({ ok: false, erreurs: { artisans: "indisponible" } });
    const soi = base({ "reseau_artisans:select": [artisanLigne(A1, { user_id: "u-client" })] });
    expect(await (await charger(CLIENT, soi)).m.envoyerDemandeDevis({ ...minimal, artisans: [A1] })).toEqual({ ok: false, erreurs: { artisans: "indisponible" } });
    expect([...b.ops, ...soi.ops].some((o) => o.op === "insert")).toBe(false);
  });

  it("photos hors de SON dossier, ou absentes du stockage : refus", async () => {
    const b = base({ fichiers: ["6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f.jpg"] });
    const { m } = await charger(CLIENT, b);
    expect(await m.envoyerDemandeDevis({ ...minimal, photos: ["demandes/u-autre/6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f.jpg"] })).toEqual({ ok: false, erreurs: { photos: "invalide" } });
    expect(await m.envoyerDemandeDevis({ ...minimal, photos: ["demandes/u-client/7f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f.jpg"] })).toEqual({ ok: false, erreurs: { photos: "invalide" } });
  });

  it("l'estimation vient du projet DU COMPTE, recalculée côté serveur (jamais celle du navigateur)", async () => {
    const b = base({ "reseau_artisans:select": [artisanLigne(A1)], "projects:select": null });
    const { m } = await charger(CLIENT, b);
    await m.envoyerDemandeDevis({ ...minimal, artisans: [A1], projetId: PROJET, joindreEstimation: true, estimation: { ttc: 1 } });
    const proj = b.ops.find((o) => o.table === "projects")!;
    expect(proj.filtres).toEqual([["eq", "id", PROJET], ["eq", "owner_id", "u-client"]]);
    expect(b.ops.find((o) => o.table === "reseau_demandes" && o.op === "insert")!.valeur).toMatchObject({ projet_id: null, estimation: null });
  });

  it("aucun artisan dans la zone : demande gardée, Daniel prévenu ; aucun choisi alors qu'il y en a : refus", async () => {
    const vide = base({ "reseau_artisans:select": [] });
    const r1 = await charger(CLIENT, vide);
    expect(await r1.m.envoyerDemandeDevis(minimal)).toEqual({ ok: true, id: "nouvelle" });
    expect(r1.mails.some((x) => x.subject.startsWith("Demande de devis sans artisan"))).toBe(true);
    const plein = base({ "reseau_artisans:select": [{ ...artisanLigne(A1), metiers: ["plomberie"], presentation: null, rge: false, site_web: null, lien_avis: null }] });
    expect(await (await charger(CLIENT, plein)).m.envoyerDemandeDevis(minimal)).toEqual({ ok: false, erreurs: { artisans: "choisir" } });
  });
});

describe("la réponse de l'artisan", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });
  const candidature = (statut: string) => ({
    id: A1, user_id: "u-art", statut, siret: "55203253400703", raison_sociale: "PLOMBERIE DUPONT", nom_commercial: null, siret_verif: {}, contact_nom: "Jean", telephone: "+33612345678", email: "jean@art.fr",
    metiers: ["plomberie"], departements: ["33"], decennale_assureur: "X", decennale_police: "1", decennale_fin: "2030-01-01", soumise_le: "", rge: false,
  });

  it("artisan non validé : refusé, rien n'est écrit", async () => {
    const b = base({ "reseau_artisans:select": candidature("suspendu") });
    const { m } = await charger({ id: "u-art", email: "jean@art.fr" }, b);
    expect((await m.repondreDemande(MISE, "accepter")).ok).toBe(false);
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
  });

  it("accepter : seulement SA mise en relation encore en attente ; le client reçoit les coordonnées de l'artisan", async () => {
    const b = base({ "reseau_artisans:select": candidature("valide"), "reseau_mises_en_relation:update": [{ demande_id: "d1" }], "reseau_demandes:select": { prenom: "Léa", email: "lea@x.fr" } });
    const { m, mails } = await charger({ id: "u-art", email: "jean@art.fr" }, b);
    expect(await m.repondreDemande(MISE, "accepter")).toEqual({ ok: true });
    const maj = b.ops.find((o) => o.op === "update")!;
    expect(maj.filtres).toEqual([["eq", "id", MISE], ["eq", "artisan_id", A1], ["eq", "statut", "envoyee"]]);
    expect(mails[0].to).toBe("lea@x.fr");
    expect(mails[0].html).toContain("+33 6 12 34 56 78");
  });

  it("déjà répondu (ou pas la sienne) : refus explicite", async () => {
    const b = base({ "reseau_artisans:select": candidature("valide"), "reseau_mises_en_relation:update": [] });
    const { m, mails } = await charger({ id: "u-art", email: "jean@art.fr" }, b);
    expect(await m.repondreDemande(MISE, "accepter")).toEqual({ ok: false, erreur: "Cette demande a déjà reçu ta réponse." });
    expect(mails).toHaveLength(0);
  });
});

describe("les coordonnées du client ne vont qu'à l'artisan qui accepte", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/admin"); vi.resetModules(); });
  it("demandesRecues : client null tant que ce n'est pas accepté", async () => {
    const demande = { id: "d1", client_id: "c", projet_id: null, metiers: ["plomberie"], code_postal: "33000", departement: "33", ville: null, description: "x", quantites: null, delai: null, photos: [], estimation: null, prenom: "Léa", telephone: "+33612345678", email: "lea@x.fr", created_at: "" };
    const b = base({
      "reseau_mises_en_relation:select": [{ id: "m1", demande_id: "d1", artisan_id: A1, statut: "envoyee", envoyee_le: "", repondu_le: null }, { id: "m2", demande_id: "d1", artisan_id: A1, statut: "acceptee", envoyee_le: "", repondu_le: "" }],
      "reseau_demandes:select": [demande],
    });
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
    const { demandesRecues } = await import("@/lib/data/reseau");
    const r = await demandesRecues(A1);
    expect(r[0].client).toBeNull();
    expect(JSON.stringify(r[0])).not.toContain("lea@x.fr");
    expect(r[1].client).toEqual({ prenom: "Léa", telephone: "+33612345678", email: "lea@x.fr", adresse: null });
  });
});

describe("la liste des artisans proposés", () => {
  afterEach(() => { vi.doUnmock("@/lib/supabase/admin"); vi.resetModules(); });
  it("valides, de la zone, du métier (ou tous corps d'état), décennale en cours, jamais le client lui-même ; ordre équitable compté en SQL", async () => {
    const ligne = (id: string) => ({ id, user_id: `u-${id.slice(0, 1)}`, raison_sociale: `E${id.slice(0, 1)}`, nom_commercial: null, metiers: ["plomberie"], presentation: null, rge: false, site_web: null, lien_avis: null });
    const b = base({ "reseau_artisans:select": [ligne(A1), ligne(A2)], rpc: [{ artisan_id: A1, n: 4 }] });
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
    const { artisansDisponibles } = await import("@/lib/data/reseau");
    const r = await artisansDisponibles("33", ["plomberie"], "u-client");
    expect(r.map((a) => a.id)).toEqual([A2, A1]);
    expect(JSON.stringify(r)).not.toMatch(/telephone|email|contact/);
    const sel = b.ops.find((o) => o.table === "reseau_artisans")!;
    expect(sel.filtres).toEqual(expect.arrayContaining([["eq", "statut", "valide"], ["neq", "user_id", "u-client"], ["contains", "departements", ["33"]], ["overlaps", "metiers", ["plomberie", "tce"]]]));
    expect(sel.filtres.some(([k, c]) => k === "gte" && c === "decennale_fin")).toBe(true);
    expect(b.ops.some((o) => o.table === "rpc:reseau_compte_demandes")).toBe(true);
  });
});

describe("branchements", () => {
  it("migration 0008 : sans policy ni droit public, 3 artisans au plus tenu par la base", () => {
    const sql = lire("supabase/migrations/0008_reseau_demandes.sql");
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toContain("revoke all on public.reseau_demandes from anon, authenticated");
    expect(sql).toContain("revoke all on public.reseau_mises_en_relation from anon, authenticated");
    expect(sql).toMatch(/create trigger reseau_mer_plafond before insert/);
    expect(sql).toContain("unique (demande_id, artisan_id)");
    expect(sql).toContain("revoke all on function public.reseau_compte_demandes(uuid[]) from public, anon, authenticated");
  });
  it("le quota du jour ne se consomme qu'au moment d'enregistrer ; les photos sont nettoyées avant l'envoi", () => {
    const src = lire("lib/actions/devis.ts");
    const quota = src.indexOf('verifierLimite("devisDemande"');
    expect(quota).toBeGreaterThan(src.indexOf('erreurs: { artisans: "choisir" }'));
    expect(quota).toBeLessThan(src.indexOf(".from(TABLE_DEMANDES)\n    .insert"));
    for (const f of ["components/reseau/FormulaireDemandeDevis.tsx", "components/reseau/FormulaireCandidature.tsx"]) expect(lire(f)).toContain("await nettoyerImage(");
  });
  it("points d'entrée, admin et robots", () => {
    expect(lire("app/projets/[id]/page.tsx")).toContain('{locale === "fr" && <BandeauDevis projetId={String(projet.id)} />}');
    expect(lire("components/admin/AdminNav.tsx")).toContain('href: "/admin/devis"');
    expect(lire("app/robots.ts")).toContain('"/demandes-devis"');
    expect(lire("app/reseau-artisans/page.tsx")).toMatch(/reçu le moins de demandes/);
  });
});
