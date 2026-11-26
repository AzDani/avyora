/**
 * Réseau AVYORA, avis publics et galerie (25/11/2026). Règles pures (validation de l'avis et d'une réalisation, nom
 * affiché, moyenne, mois), puis les garde-fous des actions avec une base factice : l'avis part du client mis en
 * relation (artisan qui a ACCEPTÉ), il est figé une fois publié, seul l'admin le publie ou le refuse (avec un motif de
 * la liste), et la base refuse elle aussi de modifier un avis publié (migration 0012).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
import {
  auteurAffiche, avisModifiable, labelMois, lireMois, lireReponse, moisRecents, resumeNotes, validerAvis, validerRealisation, cheminPhotoValide,
  prefixePhotosAvis, prefixeGalerie, joursAvant, MOTIFS_REFUS, labelMotif, lireMaj,
} from "@/lib/reseau/avis";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const MISE = "33333333-3333-4333-8333-333333333333";
const ART = "11111111-1111-4111-8111-111111111111";
const NOV = new Date("2026-11-25T10:00:00Z");
const PHOTO = (u: string, n = 1) => `${prefixePhotosAvis(u)}${"a".repeat(8)}-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}.jpg`;

describe("validation de l'avis", () => {
  it("note, texte (20 caractères), mois des travaux ; photos comptées", () => {
    const r = validerAvis({ note: 4, texte: "  Chantier propre, devis tenu, je recommande.  ", mois: "2026-10", photos: ["a", "a", "b"] }, NOV);
    expect(r).toEqual({ ok: true, a: { note: 4, texte: "Chantier propre, devis tenu, je recommande.", mois: "2026-10-01", photos: ["a", "b"] } });
  });
  it("chaque défaut a son message", () => {
    const r = validerAvis({ note: 6, texte: "trop court", mois: "2026-12", photos: ["1", "2", "3", "4", "5", "6", "7"] }, NOV);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(["mois", "note", "photos", "texte"]);
  });
  it("le mois : ni futur, ni plus de 10 ans, au premier du mois", () => {
    expect(lireMois("2026-11", NOV)).toBe("2026-11-01");
    expect(lireMois("2026-12", NOV)).toBeNull();
    expect(lireMois("2016-10", NOV)).toBeNull();
    expect(lireMois("2026-13", NOV)).toBeNull();
    expect(labelMois("2026-10-01")).toBe("octobre 2026");
    expect(moisRecents(NOV, 3).map((m) => m.v)).toEqual(["2026-11", "2026-10", "2026-09"]);
  });
  it("le texte perd ses caractères de contrôle, garde ses retours à la ligne", () => {
    const r = validerAvis({ note: 5, texte: "Très bien\u0007 travaillé,\r\n\n\n\nmerci à toute l'équipe !", mois: "2026-11" }, NOV);
    expect(r.ok && r.a.texte).toBe("Très bien travaillé,\n\nmerci à toute l'équipe !");
  });
});

describe("nom affiché, moyenne, réponse, réalisation", () => {
  it("prénom et initiale du nom ; sinon le prénom de la demande ; jamais l'e-mail", () => {
    expect(auteurAffiche("Julie", "julie martin")).toBe("Julie M.");
    expect(auteurAffiche("Karim", "karim ben ali")).toBe("Karim A.");
    expect(auteurAffiche("Léa", "lea@x.fr")).toBe("Léa");
    expect(auteurAffiche("sophie", null)).toBe("Sophie");
  });
  it("moyenne au dixième, répartition 5 → 1", () => {
    expect(resumeNotes([5, 4, 5, 2])).toEqual({ moyenne: 4, n: 4, repartition: [2, 1, 0, 1, 0] });
    expect(resumeNotes([5, 5, 4])).toMatchObject({ moyenne: 4.7, n: 3 });
    expect(resumeNotes([])).toEqual({ moyenne: null, n: 0, repartition: [0, 0, 0, 0, 0] });
  });
  it("un avis publié ou retiré n'est plus modifiable ; en attente ou refusé, si", () => {
    expect(avisModifiable(null)).toBe(true);
    expect(avisModifiable("en_attente")).toBe(true);
    expect(avisModifiable("refuse")).toBe(true);
    expect(avisModifiable("publie")).toBe(false);
    expect(avisModifiable("retire")).toBe(false);
    expect(lireReponse(" ")).toBeNull();
    expect(lireReponse("Merci !")).toBe("Merci !");
  });
  it("une réalisation : titre, description, 1 à 10 photos ; ville et mois facultatifs", () => {
    expect(validerRealisation({ titre: "Mur porteur", description: "Ouverture de 4 m avec IPN.", photos: ["p"] }, NOV)).toEqual({
      ok: true, r: { titre: "Mur porteur", description: "Ouverture de 4 m avec IPN.", ville: null, mois: null, photos: ["p"] },
    });
    const r = validerRealisation({ titre: "x", description: "court", photos: [], mois: "2027-01" }, NOV);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(["description", "mois", "photos", "titre"]);
  });
  it("chemins de photos : seulement dans le dossier du compte", () => {
    expect(cheminPhotoValide(PHOTO("u1"), prefixePhotosAvis("u1"))).toBe(true);
    expect(cheminPhotoValide(PHOTO("u2"), prefixePhotosAvis("u1"))).toBe(false);
    expect(cheminPhotoValide(`${prefixeGalerie("u1")}../x.jpg`, prefixeGalerie("u1"))).toBe(false);
  });
  it("décennale : jours restants ; mise à jour demandée relue", () => {
    expect(joursAvant("2026-12-25", "2026-11-25")).toBe(30);
    expect(joursAvant("2026-11-20", "2026-11-25")).toBe(-5);
    expect(lireMaj({ type: "decennale", assureur: "AXA", police: "P1", fin: "2027-12-31", le: "x" })).toMatchObject({ type: "decennale", fin: "2027-12-31" });
    expect(lireMaj({ type: "autre" })).toBeNull();
  });
  it("les motifs de refus sont fermés et ont un libellé", () => {
    expect(MOTIFS_REFUS.map(([k]) => k)).toEqual(["injurieux", "donnees", "hors_sujet", "non_authentique", "photo"]);
    expect(labelMotif("donnees")).toMatch(/Données personnelles/);
  });
});

/* ─── Base factice ─────────────────────────────────────────────────────────── */

type Op = { table: string; op: string; valeur?: unknown; filtres: [string, ...unknown[]][] };
function base(reponses: Partial<Record<string, unknown>> = {}) {
  const ops: Op[] = [];
  const requete = (table: string, op: string, valeur?: unknown) => {
    const o: Op = { table, op, valeur, filtres: [] };
    ops.push(o);
    const r = () => {
      const v = reponses[`${table}:${op}`];
      return typeof v === "function" ? (v as (o: Op) => unknown)(o) : { data: v ?? null, error: null };
    };
    const filtre = (k: string) => (...args: unknown[]) => { o.filtres.push([k, ...args]); return q; };
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, limit: () => q,
      eq: filtre("eq"), neq: filtre("neq"), in: filtre("in"), is: filtre("is"), not: filtre("not"), or: filtre("or"), contains: filtre("contains"), gte: filtre("gte"),
      maybeSingle: async () => { const x = r() as { data: unknown }; return { ...x, data: Array.isArray(x.data) ? x.data[0] ?? null : x.data }; },
      single: async () => r(),
      then: (res: (v: unknown) => unknown) => Promise.resolve(r()).then(res),
    };
    return q;
  };
  const sb = {
    from: (table: string) => ({ select: () => requete(table, "select"), insert: (v: unknown) => requete(table, "insert", v), update: (v: unknown) => requete(table, "update", v), delete: () => requete(table, "delete") }),
    storage: { from: () => ({
      createSignedUploadUrl: async (p: string) => ({ data: { path: p, token: "j" }, error: null }),
      list: async () => ({ data: ((reponses.fichiers as string[] | undefined) ?? []).map((name) => ({ name, metadata: { mimetype: "image/jpeg" } })), error: null }),
      createSignedUrls: async (c: string[]) => ({ data: c.map((p) => ({ path: p, signedUrl: `https://s/${p}` })), error: null }),
      remove: async (c: string[]) => { ops.push({ table: "storage", op: "remove", valeur: c, filtres: [] }); return { data: null, error: null }; },
    }) },
  };
  return { sb, ops };
}

const MOCKS = ["@/lib/auth", "@/lib/supabase/admin", "@/lib/audit", "@/lib/ratelimit", "next/cache", "@/lib/email"];
async function charger(user: Record<string, unknown> | null, b: ReturnType<typeof base>, admin = false) {
  const mails: { to: string; subject: string; html: string }[] = [];
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user, estPro: () => true, getAdmin: async () => (admin ? { id: "admin", email: "a@x.fr" } : null) }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => b.sb }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/email", async (orig) => ({ ...(await orig<typeof import("@/lib/email")>()), envoyerEmailSuivi: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return "envoye"; } }));
  return { m: await import("@/lib/actions/avis"), mails };
}
const CLIENT = { id: "u-client", email: "lea@x.fr", user_metadata: { nom: "Léa Martin" } };
const mise = (statut: string | null) => ({ id: MISE, demande_id: "d1", artisan_id: ART, statut: "acceptee", avis_statut: statut, avis_photos: [] });
const avisOk = { note: 2, texte: "Deux semaines de retard sur la date annoncée, mais travail propre.", mois: "2026-10", photos: [] };

describe("le client envoie son avis", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });

  it("sans session : rien n'est lu ni écrit", async () => {
    const b = base();
    const { m } = await charger(null, b);
    expect((await m.envoyerAvis(MISE, avisOk)).ok).toBe(false);
    expect(b.ops).toHaveLength(0);
  });

  it("artisan qui n'a pas accepté (ou demande d'un autre client) : refus, aucune écriture", async () => {
    const b = base({ "reseau_mises_en_relation:select": null });
    const { m } = await charger(CLIENT, b);
    const r = await m.envoyerAvis(MISE, avisOk);
    expect(r.ok).toBe(false);
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
    const sel = b.ops.find((o) => o.table === "reseau_mises_en_relation")!;
    expect(sel.filtres).toContainEqual(["eq", "statut", "acceptee"]);
  });

  it("avis déjà publié : figé, aucune écriture", async () => {
    const b = base({ "reseau_mises_en_relation:select": mise("publie"), "reseau_demandes:select": { prenom: "Léa", email: "lea@x.fr", ville: "Bordeaux", code_postal: "33000" } });
    const { m } = await charger(CLIENT, b);
    expect(await m.envoyerAvis(MISE, avisOk)).toEqual({ ok: false, erreur: "Ton avis est publié : il ne peut plus être modifié." });
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
  });

  it("avis négatif correct : part en attente chez Daniel, avec le nom affiché, sans toucher un avis publié", async () => {
    const b = base({
      "reseau_mises_en_relation:select": mise("refuse"),
      "reseau_demandes:select": (o: Op) => ({ data: o.filtres.some((f) => f[1] === "client_id" && f[2] === "u-client") ? { prenom: "Léa", email: "lea@x.fr", ville: "Bordeaux", code_postal: "33000" } : null, error: null }),
      "reseau_mises_en_relation:update": [{ id: MISE }],
      "reseau_artisans:select": { raison_sociale: "DLC TRAVAUX", nom_commercial: null },
    });
    const { m, mails } = await charger(CLIENT, b);
    const r = await m.envoyerAvis(MISE, { ...avisOk, avis_statut: "publie" });
    expect(r).toEqual({ ok: true });
    const up = b.ops.find((o) => o.op === "update")!;
    expect(up.valeur).toMatchObject({ avis_note: 2, avis_statut: "en_attente", avis_auteur: "Léa M.", avis_mois: "2026-10-01", avis_motif: null });
    expect(up.filtres).toContainEqual(["or", "avis_statut.is.null,avis_statut.eq.en_attente,avis_statut.eq.refuse"]);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Avis à valider : DLC TRAVAUX \(2\/5\)/);
  });

  it("une photo hors de son dossier : refus", async () => {
    const b = base({ "reseau_mises_en_relation:select": mise(null), "reseau_demandes:select": { prenom: "Léa", email: "lea@x.fr", ville: null, code_postal: "33000" } });
    const { m } = await charger(CLIENT, b);
    const r = await m.envoyerAvis(MISE, { ...avisOk, photos: [PHOTO("autre-compte")] });
    expect(r).toMatchObject({ ok: false, erreurs: { photos: expect.any(String) } });
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
  });
});

describe("Daniel publie ou refuse ; l'artisan répond", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });

  it("sans être admin : rien ne bouge", async () => {
    const b = base();
    const { m } = await charger(CLIENT, b, false);
    expect((await m.modererAvis(MISE, "publier")).ok).toBe(false);
    expect((await m.modererReponse(MISE, "publier")).ok).toBe(false);
    expect((await m.retirerRealisation(MISE, "x")).ok).toBe(false);
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
  });

  it("refuser exige un motif de la liste", async () => {
    const b = base();
    const { m } = await charger(CLIENT, b, true);
    expect(await m.modererAvis(MISE, "refuser", "il est méchant")).toEqual({ ok: false, erreur: "Choisis un motif." });
    expect(b.ops).toHaveLength(0);
  });

  it("publier : seulement un avis en attente ; le client et l'artisan sont prévenus", async () => {
    const b = base({
      "reseau_mises_en_relation:update": [{ id: MISE, demande_id: "d1", artisan_id: ART, avis_note: 5 }],
      "reseau_demandes:select": { prenom: "Léa", email: "lea@x.fr" },
      "reseau_artisans:select": { id: ART, raison_sociale: "DLC TRAVAUX", nom_commercial: null, contact_nom: "Daniel", email: "dlc@art.fr" },
    });
    const { m, mails } = await charger(CLIENT, b, true);
    expect(await m.modererAvis(MISE, "publier")).toEqual({ ok: true });
    const up = b.ops.find((o) => o.op === "update")!;
    expect(up.valeur).toMatchObject({ avis_statut: "publie" });
    expect(up.filtres).toContainEqual(["eq", "avis_statut", "en_attente"]);
    expect(mails.map((x) => x.to).sort()).toEqual(["dlc@art.fr", "lea@x.fr"]);
    expect(mails.find((x) => x.to === "lea@x.fr")!.html).toMatch(/ne peut plus être modifié/);
  });

  it("refuser avec un motif : le libellé part au client", async () => {
    const b = base({ "reseau_mises_en_relation:update": [{ id: MISE, demande_id: "d1", artisan_id: ART, avis_note: 1 }], "reseau_demandes:select": { prenom: "Marc", email: "marc@x.fr" }, "reseau_artisans:select": { id: ART, raison_sociale: "BOIS", nom_commercial: null, contact_nom: "P", email: "p@art.fr" } });
    const { m, mails } = await charger(CLIENT, b, true);
    expect(await m.modererAvis(MISE, "refuser", "donnees")).toEqual({ ok: true });
    expect(b.ops.find((o) => o.op === "update")!.valeur).toMatchObject({ avis_statut: "refuse", avis_motif: labelMotif("donnees") });
    expect(mails).toHaveLength(1);
    expect(mails[0].html).toContain("Données personnelles");
  });

  it("retirer : seulement un avis publié, et il est effacé", async () => {
    const b2 = base({ "reseau_mises_en_relation:update": [{ id: MISE, avis_photos: [PHOTO("u-client")] }] });
    const { m: m2 } = await charger(CLIENT, b2, true);
    expect(await m2.modererAvis(MISE, "retirer")).toEqual({ ok: true });
    const [up, efface] = b2.ops.filter((o) => o.op === "update");
    expect(up.valeur).toMatchObject({ avis_statut: "retire" });
    expect(up.filtres).toContainEqual(["eq", "avis_statut", "publie"]);
    // Retirer = effacer : texte, note, photos (stockage compris) et réponse de l'artisan.
    expect(efface.valeur).toMatchObject({ avis_note: null, avis_commentaire: null, avis_photos: [], avis_auteur: null, reponse_texte: null });
    expect(efface.filtres).toContainEqual(["eq", "avis_statut", "retire"]);
    expect(b2.ops.find((o) => o.op === "remove")!.valeur).toEqual([PHOTO("u-client")]);
  });

  it("répondre : seulement un artisan VALIDÉ", async () => {
    const b = base({ "reseau_artisans:select": { id: ART, user_id: "u-art", statut: "en_attente", siret: "1", raison_sociale: "X", metiers: [], departements: [] } });
    const { m } = await charger({ id: "u-art", email: "a@x.fr" }, b);
    expect((await m.repondreAvis(MISE, "Merci beaucoup !")).ok).toBe(false);
    expect(b.ops.some((o) => o.op === "update")).toBe(false);
  });
});

describe("la base, les pages et les textes", () => {
  const sql = lire("supabase/migrations/0012_reseau_avis_galerie.sql");
  it("la migration fige un avis publié et garde les tables fermées", () => {
    expect(sql).toMatch(/avis publié : il ne peut plus être modifié/);
    expect(sql).toMatch(/new\.avis_note is distinct from old\.avis_note/);
    // Le contrôle du contenu ne vaut que pour un avis PUBLIÉ : retiré, il peut être effacé.
    expect(sql.slice(sql.indexOf("if old.avis_statut = 'publie'"), sql.indexOf("if old.avis_statut = 'retire'"))).toMatch(/avis publié : il ne peut plus être modifié/);
    expect(sql).toMatch(/revoke all on public\.reseau_realisations from anon, authenticated/);
    expect(sql).toMatch(/cardinality\(avis_photos\) <= 6/);
    expect(lire("supabase/migrations/0012_reseau_avis_galerie_retour.sql")).toMatch(/drop trigger if exists trg_reseau_avis_fige/);
  });
  it("le client voit le verrou ; les pages d'avis affichent les règles (L111-7-2)", () => {
    expect(lire("components/reseau/SuiviArtisan.tsx")).toMatch(/Un avis publié ne peut plus être modifié/);
    const aff = lire("components/reseau/avis/Affichage.tsx");
    expect(aff).toMatch(/Comment les avis sont contrôlés/);
    expect(aff).toMatch(/du plus récent au plus ancien/);
    expect(lire("app/avis-artisans/page.tsx")).toMatch(/id="regles"/);
    expect(lire("app/(legal)/conditions-reseau/page.tsx")).toMatch(/Un avis publié n&apos;est plus modifiable/);
    expect(lire("app/(legal)/confidentialite/page.tsx")).not.toMatch(/lus par l&apos;éditeur seul, non publiés/);
  });
  it("les avis et fiches sont réservés aux membres Pro ; aucun prix affiché", () => {
    for (const f of ["app/avis-artisans/page.tsx", "app/avis-artisans/[id]/page.tsx"]) expect(lire(f)).toMatch(/estPro\(user\)/);
    expect(lire("components/reseau/avis/AccesPro.tsx")).not.toMatch(/€|\d+,\d{2}/);
  });
  it("l'ordre des artisans proposés ne dépend pas de la note", () => {
    const d = lire("lib/data/reseau.ts");
    const corps = d.slice(d.indexOf("export async function artisansDisponibles"), d.indexOf("type LigneDemande"));
    expect(corps).toMatch(/ordreEquitable\(lignes, recues, clientId\)/);
    expect(corps).not.toMatch(/sort\(/);
  });
});

describe("les motifs de refus d'une réponse d'artisan (26/11/2026)", () => {
  it("une liste à part, qui parle de la réponse ; l'admin et l'action l'utilisent", async () => {
    const { MOTIFS_REFUS_REPONSE, estMotifReponse, labelMotifReponse } = await import("@/lib/reseau/avis");
    expect(MOTIFS_REFUS_REPONSE.map(([k]) => k)).toEqual(["injurieux", "donnees", "hors_sujet", "publicite"]);
    expect(labelMotifReponse("hors_sujet")).toMatch(/la réponse ne parle pas/);
    expect(estMotifReponse("photo")).toBe(false);
    expect(estMotifReponse("publicite")).toBe(true);
    const fs = await import("node:fs");
    const act = fs.readFileSync("lib/actions/avis.ts", "utf8");
    const bloc = act.slice(act.indexOf("export async function modererReponse"), act.indexOf("revalidatePath(\"/avis-artisans\"", act.indexOf("export async function modererReponse")));
    expect(bloc).toContain("!estMotifReponse(motif)");
    expect(bloc).not.toMatch(/labelMotif\(motif\)/);
    expect(fs.readFileSync("components/admin/reseau/ModerationAvis.tsx", "utf8")).toContain("motifs={MOTIFS_REFUS_REPONSE}");
  });
});
