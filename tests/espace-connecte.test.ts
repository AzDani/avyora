/**
 * Espace connecté (revue du 12/11/2026) : « Modifier l'estimation » qui garde le nom choisi et
 * l'Investissement, statuts de chantier écrits clé par clé et dans l'ordre, liste = fiche (code postal
 * hors ctx), pluriels, messages d'erreur traduits, résiliation Stripe avant la suppression du compte.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defaultCtx, buildDevis, CATALOG, type Ctx, type Selection } from "@/lib/estimateur";
import { cocherReno, choisirPerimetre, ajouterExemplaire, basculerEspace, nomProjetReno } from "@/lib/estimateur/detaille-reno";
import { fusionnerReponses, nomsGeneres, nomApresModification } from "@/lib/estimateur/maj-projet";
import { nomProjetNeuf } from "@/lib/estimateur/brouillon-neuf";
import { estimationProjet, avancementProjet } from "@/lib/estimateur/projet";
import { clicStatut, statutsApres } from "@/lib/estimateur/statuts";
import { accord } from "@/lib/i18n/pluriel";
import { messageErreurApi, casErreurApi } from "@/lib/i18n/erreurs-api";
import { presetRapide } from "@/lib/estimateur/presets";
import { dict } from "@/lib/i18n/dictionaries";

vi.mock("server-only", () => ({}));

const lot = (c: string) => CATALOG.find((l) => l.c === c)!;
const tache = (c: string, n: string) => lot(c).t.find((t) => t.n === n)!;
const ctxT3 = (): Ctx => ({ ...defaultCtx(), type: "T3", surface: 65, codePostal: "45000" });

/* ─── « Modifier l'estimation » : nom et clés hors estimation ─────────────────────────────── */

describe("Modifier l'estimation : ce que le PATCH garde du projet enregistré", () => {
  it("la simulation Investissement et le suivi de chantier enregistrés restent ; l'estimation est celle de l'éditeur", () => {
    const avant = { v: "estimateur", mode: "detaille", ctx: ctxT3(), sel: { a: { on: true } }, invest: { actif: true, location: { prix: 180_000 } }, statuts: { "x|y": 2, "z|w": 1 } };
    const apres = { v: "estimateur", mode: "detaille", ctx: { ...ctxT3(), surface: 70 }, sel: { b: { on: true } }, codePostal: "45000", statuts: { "x|y": 2 } };
    const r = fusionnerReponses(avant, apres);
    expect(r.invest).toEqual(avant.invest);
    expect(r.statuts).toEqual(avant.statuts); // la version enregistrée, la plus récente
    expect(r.sel).toEqual(apres.sel);
    expect((r.ctx as Ctx).surface).toBe(70);
  });

  it("l'origine (le plan) reste quand l'éditeur ne la renvoie pas ; celle qu'il renvoie l'emporte ; rien d'autre ne revient", () => {
    const avant = { ctx: ctxT3(), origine: { source: "plan", planId: "p1" }, custom: [{ id: "c" }], pieces: [{ room: "sdb", surface: 5 }] };
    expect(fusionnerReponses(avant, { ctx: ctxT3() })).toEqual({ ctx: ctxT3(), origine: avant.origine });
    expect(fusionnerReponses(avant, { ctx: ctxT3(), origine: { source: "plan", planId: "p2" } }).origine).toEqual({ source: "plan", planId: "p2" });
    // Des lignes perso supprimées dans l'éditeur ne reviennent pas.
    expect(fusionnerReponses(avant, { ctx: ctxT3() }).custom).toBeUndefined();
  });

  it("sans réponses enregistrées (ou illisibles) : celles de l'éditeur telles quelles", () => {
    expect(fusionnerReponses(null, { a: 1 })).toEqual({ a: 1 });
    expect(fusionnerReponses("x", { a: 1 })).toEqual({ a: 1 });
  });

  it("un nom choisi à la main reste ; un nom généré suit l'estimation (détaillé FR et EN, ancien format compris)", () => {
    const rep = { v: "estimateur", mode: "detaille", ctx: ctxT3() };
    expect(nomApresModification("Appart rue Victor Hugo", rep, "Rénovation — T3 70 m²")).toBe("Appart rue Victor Hugo");
    expect(nomApresModification("Rénovation — T3 65 m²", rep, "Rénovation — T3 70 m²")).toBe("Rénovation — T3 70 m²");
    expect(nomApresModification("Renovation — 2-bedroom 65 m²", rep, "Renovation — 2-bedroom 70 m²")).toBe("Renovation — 2-bedroom 70 m²");
    // Pièces ciblées : le format d'avant (« 2 Chambre ») est toujours reconnu comme généré.
    const piece = ajouterExemplaire(basculerEspace(choisirPerimetre(defaultCtx(), "piece"), "sdb"), "chambre");
    const repPiece = { v: "estimateur", mode: "detaille", ctx: piece };
    expect(nomsGeneres(repPiece)).toContain(nomProjetReno(piece));
    expect(nomsGeneres(repPiece)).toContain(`Rénovation — 2 Chambre + Salle de bain · ${piece.surface} m²`);
    expect(nomApresModification(`Rénovation — 2 Chambre + Salle de bain · ${piece.surface} m²`, repPiece, "nouveau")).toBe("nouveau");
    // Nom vide ou absent : celui de l'éditeur.
    expect(nomApresModification("", rep, "Rénovation — T3 70 m²")).toBe("Rénovation — T3 70 m²");
  });

  it("rapide (bien entier, pièces) et neuf : leurs noms générés sont reconnus", () => {
    const t = dict("fr").rapide;
    const p = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
    expect(nomsGeneres({ v: "estimateur", mode: "rapide", ctx: p.ctx })).toContain(`${t.projetNom} — ${t.typeMaison} 100 m²`);
    const pieces = [{ room: "chambre", surface: 12 }, { room: "chambre", surface: 10 }, { room: "sdb", surface: 5 }];
    expect(nomsGeneres({ v: "estimateur", mode: "rapide", ctx: p.ctx, pieces })).toEqual([
      `${t.projetNom} — ${t.rooms.chambre} ×2 + ${t.rooms.sdb}`,
      `${dict("en").rapide.projetNom} — ${dict("en").rapide.rooms.chambre} ×2 + ${dict("en").rapide.rooms.sdb}`,
    ]);
    const maison = { niveaux: "pp", surface: 120 } as const;
    const neuf = { v: "estimateur", ctx: { ...defaultCtx(), nature: "neuf", surface: 120, neuf: maison } };
    expect(nomsGeneres(neuf)).toContain(nomProjetNeuf(maison, "fr"));
    expect(nomsGeneres(neuf)).toContain(nomProjetNeuf(maison, "en"));
    expect(nomApresModification("Ma maison à Tours", neuf, nomProjetNeuf({ ...maison, surface: 130 }))).toBe("Ma maison à Tours");
  });

  it("réponses inattendues : aucun nom reconnu, le nom actuel est gardé", () => {
    expect(nomsGeneres(null)).toEqual([]);
    expect(nomsGeneres({ ctx: null })).toEqual([]);
    expect(nomApresModification("Mon projet", { ctx: { surface: "x" } }, "Rénovation — T3 70 m²")).toBe("Mon projet");
  });
});

describe("route PATCH /api/projects/[id] : le nom et l'investissement survivent à « Modifier »", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const S = { projet: null as null | { id: string; nom: string; reponses: unknown }, maj: [] as unknown[], renomme: [] as unknown[] };
  const MOCKS = ["@/lib/auth", "@/lib/data/projects", "@/lib/supabase/admin"];
  beforeEach(() => {
    vi.resetModules();
    S.maj = []; S.renomme = [];
    S.projet = { id: ID, nom: "Appart rue Victor Hugo", reponses: { v: "estimateur", mode: "detaille", ctx: ctxT3(), sel: {}, invest: { actif: true }, statuts: { "a|b": 2 } } };
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u1" }) }));
    vi.doMock("@/lib/data/projects", () => ({
      getProjet: async () => S.projet,
      updateProjet: async (_id: string, p: unknown) => { S.maj.push(p); },
      renameProjet: async (_id: string, nom: string) => { S.renomme.push(nom); },
      setArchived: async () => {},
    }));
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); });

  const patch = async (body: unknown) => {
    const { PATCH } = await import("@/app/api/projects/[id]/route");
    return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: ID }) });
  };
  const corps = (nom: string) => ({
    nom, typeBien: "T3", surface: 70, codePostal: "45000",
    reponses: { v: "estimateur", mode: "detaille", ctx: { ...ctxT3(), surface: 70 }, sel: { x: { on: true } }, codePostal: "45000" },
  });

  it("nom personnalisé gardé, invest et statuts gardés, estimation remplacée", async () => {
    const r = await patch(corps("Rénovation — T3 70 m²"));
    expect(r.status).toBe(200);
    const m = S.maj[0] as { nom: string; reponses: Record<string, unknown> };
    expect(m.nom).toBe("Appart rue Victor Hugo");
    expect(m.reponses.invest).toEqual({ actif: true });
    expect(m.reponses.statuts).toEqual({ "a|b": 2 });
    expect(m.reponses.sel).toEqual({ x: { on: true } });
  });

  it("nom généré : il suit l'estimation", async () => {
    S.projet!.nom = "Rénovation — T3 65 m²";
    await patch(corps("Rénovation — T3 70 m²"));
    expect((S.maj[0] as { nom: string }).nom).toBe("Rénovation — T3 70 m²");
  });

  it("projet introuvable : 404, rien n'est écrit ; renommage seul : inchangé", async () => {
    S.projet = null;
    expect((await patch(corps("x"))).status).toBe(404);
    expect(S.maj).toEqual([]);
    S.projet = { id: ID, nom: "a", reponses: {} };
    expect((await patch({ nom: "Nouveau nom" })).status).toBe(200);
    expect(S.renomme).toEqual(["Nouveau nom"]);
  });
});

/* ─── Suivi de chantier ─────────────────────────────────────────────────────────────────────── */

describe("Suivi de chantier : un clic, son état et ses écritures dans l'ordre", () => {
  it("0 → 1 → 2 → 0 ; 0 retire la clé ; l'objet d'entrée n'est pas modifié", () => {
    const s0: Record<string, number> = {};
    const c1 = clicStatut(s0, "k");
    expect(c1.statuts).toEqual({ k: 1 });
    expect(c1.envois).toEqual([{ cle: "k", etat: 1 }]);
    const c2 = clicStatut(c1.statuts, "k");
    expect(c2.statuts).toEqual({ k: 2 });
    const c3 = clicStatut(c2.statuts, "k");
    expect(c3.statuts).toEqual({});
    expect(c3.envois).toEqual([{ cle: "k", etat: 0 }]);
    expect(s0).toEqual({});
  });

  it("ancienne clé (avec variante) : le statut part de sa valeur, s'écrit sous la clé actuelle, PUIS l'ancienne est retirée", () => {
    const c = clicStatut({ ancienne: 1 }, "k", "ancienne");
    expect(c.statuts).toEqual({ k: 2 });
    expect(c.envois).toEqual([{ cle: "k", etat: 2 }, { cle: "ancienne", etat: 0 }]);
    expect(clicStatut({ k: 1 }, "k", "k").envois).toEqual([{ cle: "k", etat: 2 }]);
  });

  it("statutsApres : les statuts relus d'ailleurs (null, tableau) repartent de zéro", () => {
    expect(statutsApres(null, "a", 2)).toEqual({ a: 2 });
    expect(statutsApres([1], "a", 1)).toEqual({ a: 1 });
    expect(statutsApres({ a: 1, b: 2 }, "a", 0)).toEqual({ b: 2 });
  });
});

describe("route POST /api/projects/[id]/statut : la seule clé, atomique quand la migration est appliquée", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const S = { sql: false, existe: true, rpcRetour: true, rpc: [] as unknown[], maj: [] as unknown[] };
  const MOCKS = ["@/lib/auth", "@/lib/data/projects", "@/lib/supabase/server"];
  beforeEach(() => {
    vi.resetModules();
    Object.assign(S, { sql: false, existe: true, rpcRetour: true, rpc: [], maj: [] });
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u1" }) }));
    vi.doMock("@/lib/data/projects", () => ({ getProjet: async () => (S.existe ? { id: ID, reponses: { invest: { actif: true }, statuts: { a: 1 } } } : null) }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        rpc: async (nom: string, args: unknown) => {
          if (!S.sql) return { data: null, error: { code: "PGRST202" } };
          S.rpc.push({ nom, args });
          return { data: S.rpcRetour, error: null };
        },
        from: () => ({ update: (x: unknown) => { S.maj.push(x); return { eq: () => ({ select: async () => ({ data: [{ id: ID }], error: null }) }) }; } }),
      }),
    }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); });
  const post = async (body: unknown) => {
    const { POST } = await import("@/app/api/projects/[id]/statut/route");
    return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: ID }) });
  };

  it("fonction SQL présente : un seul appel, avec la clé et l'état ; aucune réécriture de `reponses`", async () => {
    S.sql = true;
    expect((await post({ key: "b", state: 2 })).status).toBe(200);
    expect(S.rpc).toEqual([{ nom: "projet_statut_maj", args: { p_projet: ID, p_cle: "b", p_etat: 2 } }]);
    expect(S.maj).toEqual([]);
  });

  it("fonction SQL absente : repli sur l'ancienne écriture, qui garde l'investissement et les autres statuts", async () => {
    expect((await post({ key: "b", state: 2 })).status).toBe(200);
    expect(S.maj).toEqual([{ reponses: { invest: { actif: true }, statuts: { a: 1, b: 2 } } }]);
  });

  it("aucune ligne modifiée (pas le droit d'écrire) : 403 ; requête invalide : 400 ; projet absent : 404", async () => {
    S.sql = true; S.rpcRetour = false;
    expect((await post({ key: "b", state: 1 })).status).toBe(403);
    expect((await post({ key: "b", state: 5 })).status).toBe(400);
    S.existe = false;
    expect((await post({ key: "b", state: 1 })).status).toBe(404);
  });
});

/* ─── Liste = fiche ─────────────────────────────────────────────────────────────────────────── */

describe("Liste des projets : le même total que la fiche (code postal rangé hors ctx)", () => {
  it("un ancien projet (code postal hors ctx) a le coefficient régional, comme la fiche", () => {
    const ctx = { ...defaultCtx(), surface: 60 };
    const sel: Selection = cocherReno(ctx, {}, lot("Maçonnerie"), tache("Maçonnerie", "Chape traditionnelle"));
    const ancien = estimationProjet({ v: "estimateur", ctx, sel, codePostal: "75011" })!;
    const fiche = buildDevis(CATALOG, { ...ctx, codePostal: "75011" }, sel).totaux.ttc;
    const sansCp = buildDevis(CATALOG, ctx, sel).totaux.ttc;
    expect(fiche).not.toBe(sansCp); // Paris : main-d'œuvre majorée
    expect(ancien.ttc).toBeCloseTo(fiche, 6);
    // Le code postal de ctx l'emporte, comme sur la fiche.
    expect(estimationProjet({ v: "estimateur", ctx: { ...ctx, codePostal: "75011" }, sel, codePostal: "45000" })!.ttc).toBeCloseTo(fiche, 6);
    expect(avancementProjet({ v: "estimateur", ctx, sel, codePostal: "75011" }).total).toBe(1);
  });
});

/* ─── Textes ────────────────────────────────────────────────────────────────────────────────── */

describe("Pluriels et messages d'erreur", () => {
  it("français : singulier à 0 et 1 ; anglais : singulier à 1 seulement", () => {
    expect([0, 1, 2].map((n) => accord("fr", n, "poste", "postes"))).toEqual(["poste", "poste", "postes"]);
    expect([0, 1, 2].map((n) => accord("en", n, "line item", "line items"))).toEqual(["line items", "line item", "line items"]);
  });

  it("le message vient du statut, dans la langue de l'écran ; un statut muet garde le message de l'appelant", () => {
    expect(casErreurApi(0)).toBe("reseau");
    expect(casErreurApi(401)).toBe("session");
    expect(casErreurApi(409)).toBe("limite");
    expect(casErreurApi(500)).toBeNull();
    expect(messageErreurApi("en", 403, "x")).toMatch(/permission/);
    expect(messageErreurApi("fr", 404, "x")).toMatch(/introuvable/);
    expect(messageErreurApi("en", 500, "Couldn't save.")).toBe("Couldn't save.");
    for (const st of [401, 403, 404, 400, 409, 429, 0]) expect(messageErreurApi("en", st, "")).not.toMatch(/[éèàç]|projet|Réessaie/);
  });
});

/* ─── Suppression du compte : résiliation Stripe d'abord ───────────────────────────────────── */

describe("Résiliation des abonnements Stripe avant la suppression du compte", () => {
  const UID = "22222222-2222-4222-8222-222222222222";
  type Sub = { id: string; status: string };
  const fauxStripe = (o: { retrieve?: Sub; list?: Sub[]; search?: Sub[] | "panne"; cancelEchoue?: boolean }) => {
    const annules: string[] = [];
    const stripe = {
      subscriptions: {
        retrieve: async (id: string) => o.retrieve ?? { id, status: "canceled" },
        list: async () => ({ data: o.list ?? [] }),
        search: async () => { if (o.search === "panne") throw new Error("search"); return { data: o.search ?? [] }; },
        cancel: async (id: string) => { if (o.cancelEchoue) throw new Error("stripe"); annules.push(id); return { id, status: "canceled" }; },
      },
    };
    return { stripe, annules };
  };

  it("résilie l'abonnement connu, ceux du client et ceux retrouvés par la métadonnée, une fois chacun ; jamais un abonnement déjà terminé", async () => {
    const { resilierAbonnementsUtilisateur } = await import("@/lib/stripe");
    const f = fauxStripe({
      retrieve: { id: "sub_1", status: "active" },
      list: [{ id: "sub_1", status: "active" }, { id: "sub_2", status: "past_due" }, { id: "sub_3", status: "canceled" }],
      search: [{ id: "sub_4", status: "trialing" }],
    });
    const r = await resilierAbonnementsUtilisateur(f.stripe, { id: UID, app_metadata: { stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1" } });
    expect(r.sort()).toEqual(["sub_1", "sub_2", "sub_4"]);
    expect(f.annules.sort()).toEqual(["sub_1", "sub_2", "sub_4"]);
  });

  it("un échec de résiliation jette (le compte ne doit pas être supprimé)", async () => {
    const { resilierAbonnementsUtilisateur } = await import("@/lib/stripe");
    const f = fauxStripe({ retrieve: { id: "sub_1", status: "active" }, cancelEchoue: true });
    await expect(resilierAbonnementsUtilisateur(f.stripe, { id: UID, app_metadata: { stripe_subscription_id: "sub_1" } })).rejects.toThrow();
  });

  it("sans clé Stripe : rien à faire sans trace d'abonnement, refus avec une trace ; recherche en panne sans trace : rien à faire", async () => {
    const { resilierAbonnementsUtilisateur } = await import("@/lib/stripe");
    expect(await resilierAbonnementsUtilisateur(null, { id: UID, app_metadata: {} })).toEqual([]);
    await expect(resilierAbonnementsUtilisateur(null, { id: UID, app_metadata: { stripe_customer_id: "cus_1" } })).rejects.toThrow();
    const f = fauxStripe({ search: "panne" });
    expect(await resilierAbonnementsUtilisateur(f.stripe, { id: UID, app_metadata: null })).toEqual([]);
  });

  it("identifiants inconnus de Stripe (client supprimé, ancien mode test) : rien à résilier, la suppression n'est pas bloquée ; une autre erreur bloque", async () => {
    const { resilierAbonnementsUtilisateur } = await import("@/lib/stripe");
    const absent = Object.assign(new Error("No such customer"), { code: "resource_missing" });
    const annules: string[] = [];
    const stripe = {
      subscriptions: {
        retrieve: async () => { throw absent; },
        list: async () => { throw absent; },
        search: async () => ({ data: [{ id: "sub_9", status: "active" }] }),
        cancel: async (id: string) => { annules.push(id); return { id, status: "canceled" }; },
      },
    };
    const r = await resilierAbonnementsUtilisateur(stripe, { id: UID, app_metadata: { stripe_subscription_id: "sub_x", stripe_customer_id: "cus_x" } });
    expect(r).toEqual(["sub_9"]);
    const panne = { ...stripe, subscriptions: { ...stripe.subscriptions, list: async () => { throw new Error("réseau"); } } };
    await expect(resilierAbonnementsUtilisateur(panne, { id: UID, app_metadata: { stripe_customer_id: "cus_x" } })).rejects.toThrow();
  });
});
