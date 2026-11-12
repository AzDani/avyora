/**
 * Lot « sécurité de l'API » (revue du 12/11/2026), sans base ni Stripe réels :
 *  - POST /api/projects/[id]/statut : validation, limite de débit, borne de taille, erreurs génériques ;
 *  - écritures de projet : plafond de projets (409), exceptions → 500 JSON sans texte de Postgres ;
 *  - webhook Stripe : messages exacts, idempotence (stripe_events), état COURANT de l'abonnement, past_due ;
 *  - cron Chatel : refus si CRON_SECRET absent ;
 *  - pseudo : unicité sur toutes les pages de comptes ;
 *  - migration 0005 : search_path figé sur toutes les fonctions SECURITY DEFINER, bornes et plafonds en base.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SECRET_PG = 'violates check constraint "projects_reponses_taille" — détail interne';
const PROJET = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (url: string, b: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", body: typeof b === "string" ? b : JSON.stringify(b), headers: { "content-type": "application/json", ...headers } });

async function lire(r: Response) {
  const texte = await r.text();
  let json: Record<string, unknown> | null = null;
  try { json = texte ? JSON.parse(texte) : null; } catch { json = null; }
  return { status: r.status, json, texte };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/* ─── Statut d'une tâche ─────────────────────────────────────────────────── */

describe("POST /api/projects/[id]/statut", () => {
  const S = {
    user: { id: "u1" } as { id: string } | null,
    limite: true,
    reponses: {} as Record<string, unknown>,
    erreurUpdate: null as null | { message: string },
    ecrit: null as Record<string, unknown> | null,
    limites: [] as string[],
  };
  beforeEach(() => {
    S.user = { id: "u1" };
    S.limite = true;
    S.reponses = { ctx: { surface: 50 } };
    S.erreurUpdate = null;
    S.ecrit = null;
    S.limites = [];
  });

  async function route() {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({ getUser: async () => S.user }));
    vi.doMock("@/lib/ratelimit", () => ({
      verifierLimite: async (kind: string) => { S.limites.push(kind); return S.limite; },
      clientIp: async () => "127.0.0.1",
    }));
    vi.doMock("@/lib/data/projects", () => ({
      getProjet: async (id: string) => (id === PROJET ? { id, reponses: S.reponses } : null),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        from: () => ({
          update: (v: Record<string, unknown>) => ({
            eq: async () => { S.ecrit = v; return { error: S.erreurUpdate }; },
          }),
        }),
      }),
    }));
    return import("@/app/api/projects/[id]/statut/route");
  }
  const appel = async (b: unknown, id = PROJET) => lire(await (await route()).POST(post("http://x/api/projects/p/statut", b), ctx(id)));

  it("enregistre un statut valide sous la limite « statut »", async () => {
    const r = await appel({ key: "Plomberie|WC", state: 2 });
    expect(r.status).toBe(200);
    expect((S.ecrit?.reponses as { statuts: unknown }).statuts).toEqual({ "Plomberie|WC": 2 });
    expect(S.limites).toEqual(["statut"]);
  });

  it("refuse une clé trop longue, un état hors 0-2 ou un corps illisible (400)", async () => {
    expect((await appel({ key: "x".repeat(201), state: 1 })).status).toBe(400);
    expect((await appel({ key: "a", state: 3 })).status).toBe(400);
    expect((await appel({ key: "a", state: "1" })).status).toBe(400);
    expect((await appel("{pas du json")).status).toBe(400);
    expect(S.ecrit).toBeNull();
  });

  it("limite de débit dépassée : 429, rien n'est lu ni écrit", async () => {
    S.limite = false;
    expect((await appel({ key: "a", state: 1 })).status).toBe(429);
    expect(S.ecrit).toBeNull();
  });

  it("id qui n'est pas un uuid : 404", async () => {
    expect((await appel({ key: "a", state: 1 }, "pas-un-uuid")).status).toBe(404);
  });

  it("refuse ce qui ferait passer `reponses` au-delà de la borne (413) ; retirer un statut reste possible", async () => {
    S.reponses = { gros: "x".repeat(39_990) };
    expect((await appel({ key: "Lot|une tâche au nom assez long", state: 1 })).status).toBe(413);
    expect(S.ecrit).toBeNull();
    S.reponses = { gros: "x".repeat(39_990), statuts: { a: 1 } };
    expect((await appel({ key: "a", state: 0 })).status).toBe(200);
  });

  it("refuse un caractère que jsonb ne range pas (413), sans aller jusqu'à Postgres", async () => {
    expect((await appel({ key: "a\u0000b", state: 1 })).status).toBe(413);
    expect(S.ecrit).toBeNull();
  });

  it("erreur Postgres : 500 générique, le détail reste dans les journaux", async () => {
    S.erreurUpdate = { message: SECRET_PG };
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await appel({ key: "a", state: 1 });
    expect(r.status).toBe(500);
    expect(r.json).toEqual({ error: "Enregistrement impossible" });
    expect(r.texte).not.toContain("constraint");
    expect(err).toHaveBeenCalled();
  });
});

/* ─── Écritures de projet ────────────────────────────────────────────────── */

describe("création et modification de projet", () => {
  const S = { count: 0, erreurInsert: null as null | { message: string }, erreurUpdate: null as null | { message: string } };
  beforeEach(() => {
    S.count = 0;
    S.erreurInsert = null;
    S.erreurUpdate = null;
  });

  async function routes() {
    vi.resetModules();
    vi.doUnmock("@/lib/data/projects");
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u1" }) }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true, clientIp: async () => "127.0.0.1" }));
    const requete = {
      select: () => requete,
      eq: () => requete,
      maybeSingle: async () => ({ data: { id: PROJET, reponses: {} } }),
      single: async () => (S.erreurInsert ? { data: null, error: S.erreurInsert } : { data: { id: PROJET }, error: null }),
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ count: S.count, error: null }).then(ok),
    };
    vi.doMock("@/lib/supabase/server", () => ({
      supabaseServer: async () => ({
        from: () => ({
          select: () => requete,
          insert: () => requete,
          update: () => ({ eq: async () => ({ error: S.erreurUpdate }) }),
        }),
      }),
    }));
    return { liste: await import("@/app/api/projects/route"), un: await import("@/app/api/projects/[id]/route") };
  }
  const corps = { nom: "Ma maison", surface: 80, codePostal: "33000", reponses: { ctx: {} } };

  it("plafond de projets atteint (compté avant d'écrire) : 409 avec un message clair", async () => {
    S.count = 200;
    const { liste } = await routes();
    const r = await lire(await liste.POST(post("http://x/api/projects", corps)));
    expect(r.status).toBe(409);
    expect(String(r.json?.error)).toContain("200");
  });

  it("plafond tenu par le trigger (création simultanée) : 409, pas le texte de Postgres", async () => {
    S.erreurInsert = { message: "plafond_projets" };
    const { liste } = await routes();
    const r = await lire(await liste.POST(post("http://x/api/projects", corps)));
    expect(r.status).toBe(409);
    expect(r.texte).not.toContain("plafond_projets");
  });

  it("autre erreur de la base à la création : 500 JSON générique", async () => {
    S.erreurInsert = { message: SECRET_PG };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { liste } = await routes();
    const r = await lire(await liste.POST(post("http://x/api/projects", corps)));
    expect(r.status).toBe(500);
    expect(r.json).toEqual({ error: "Enregistrement impossible" });
  });

  it("PATCH : une exception de la base répond un 500 JSON (plus de page d'erreur sans corps)", async () => {
    S.erreurUpdate = { message: SECRET_PG };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { un } = await routes();
    for (const b of [{ archived: true }, { nom: "Nouveau nom" }, corps]) {
      const r = await lire(await un.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(b) }), ctx(PROJET)));
      expect(r.status).toBe(500);
      expect(r.json).toEqual({ error: "Enregistrement impossible" });
    }
  });

  it("caractère nul dans le nom ou les réponses : 400 avant d'écrire", async () => {
    const { liste } = await routes();
    expect((await liste.POST(post("http://x/api/projects", { ...corps, nom: "a\u0000b" }))).status).toBe(400);
    expect((await liste.POST(post("http://x/api/projects", { ...corps, reponses: { x: "\ud800" } }))).status).toBe(400);
  });
});

/* ─── Webhook Stripe ─────────────────────────────────────────────────────── */

describe("POST /api/stripe/webhook", () => {
  type Ev = { id: string; type: string; data: { object: Record<string, unknown> } };
  const S = {
    /* event.id → reçu le (ms) et traité le (ms ou null) : le registre `stripe_events` de la migration 0005. */
    registre: new Map<string, { recu: number; traite: number | null }>(),
    registreAbsent: false,
    abonnements: {} as Record<string, { id: string; status: string; customer: string; metadata: Record<string, string> }>,
    plans: [] as { userId: string; plan: string }[],
    emails: [] as string[],
    echecMaj: false,
  };
  beforeEach(() => {
    S.registre = new Map();
    S.registreAbsent = false;
    S.abonnements = { sub_1: { id: "sub_1", status: "active", customer: "cus_1", metadata: { supabase_user_id: "u1" } } };
    S.plans = [];
    S.emails = [];
    S.echecMaj = false;
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  });

  async function route() {
    vi.resetModules();
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({
        webhooks: { constructEvent: (body: string, sig: string) => { if (sig !== "ok") throw new Error("sig"); return JSON.parse(body); } },
        subscriptions: { retrieve: async (id: string) => S.abonnements[id] },
      }),
    }));
    vi.doMock("@/lib/email", () => ({
      emailConfirmation: () => ({ subject: "s", html: "h" }),
      envoyerEmail: async (to: string) => { S.emails.push(to); },
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      supabaseAdmin: () => ({
        from: () => ({
          insert: async ({ id }: { id: string }) => {
            if (S.registreAbsent) return { error: { code: "42P01" } };
            if (S.registre.has(id)) return { error: { code: "23505" } };
            S.registre.set(id, { recu: Date.now(), traite: null });
            return { error: null };
          },
          delete: () => ({ eq: async (_c: string, id: string) => { S.registre.delete(id); return { error: null }; } }),
          /* update(...).eq(id)[.is(traite_le, null).lt(recu_le, limite)][.select()] : seuls les filtres utilisés. */
          update: (patch: { recu_le?: string; traite_le?: string }) => {
            const f: { id?: string; nonTraite?: boolean; avant?: number } = {};
            const run = async () => {
              const l = f.id ? S.registre.get(f.id) : undefined;
              if (!l || (f.nonTraite && l.traite != null) || (f.avant != null && !(l.recu < f.avant))) return { data: [], error: null };
              if (patch.recu_le) l.recu = Date.parse(patch.recu_le);
              if (patch.traite_le) l.traite = Date.parse(patch.traite_le);
              return { data: [{ id: f.id }], error: null };
            };
            const q = {
              eq: (_c: string, id: string) => { f.id = id; return q; },
              is: () => { f.nonTraite = true; return q; },
              lt: (_c: string, iso: string) => { f.avant = Date.parse(iso); return q; },
              select: run,
              then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => run().then(ok, ko),
            };
            return q;
          },
          select: () => ({
            eq: (_c: string, id: string) => ({
              maybeSingle: async () => {
                const l = S.registre.get(id);
                return { data: l ? { traite_le: l.traite == null ? null : new Date(l.traite).toISOString() } : null, error: null };
              },
            }),
          }),
        }),
        auth: {
          admin: {
            getUserById: async (id: string) => ({ data: { user: { id, app_metadata: { role: "x" } } }, error: null }),
            updateUserById: async (id: string, { app_metadata }: { app_metadata: { plan: string } }) => {
              if (S.echecMaj) return { error: new Error("panne") };
              S.plans.push({ userId: id, plan: app_metadata.plan });
              return { error: null };
            },
          },
        },
      }),
    }));
    return import("@/app/api/stripe/webhook/route");
  }
  const envoyer = async (ev: Ev | string, sig: string | null = "ok") =>
    lire(await (await route()).POST(new Request("http://x/api/stripe/webhook", {
      method: "POST", body: typeof ev === "string" ? ev : JSON.stringify(ev), headers: sig ? { "stripe-signature": sig } : {},
    })));
  const evSub = (id: string, status: string): Ev => ({
    id, type: "customer.subscription.updated",
    data: { object: { id: "sub_1", status, customer: "cus_1", metadata: { supabase_user_id: "u1" } } },
  });
  const evCheckout = (id: string, payment_status: string): Ev => ({
    id, type: "checkout.session.completed",
    data: { object: { client_reference_id: "u1", subscription: "sub_1", customer: "cus_1", payment_status, customer_details: { email: "a@b.fr" }, amount_total: 1885, currency: "eur" } },
  });

  it("signature absente : 400 « Signature manquante » (le secret est configuré)", async () => {
    const r = await envoyer("{}", null);
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ error: "Signature manquante" });
  });

  it("secret absent : 500 générique, sans nommer la variable", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await envoyer("{}");
    expect(r.status).toBe(500);
    expect(r.texte).not.toContain("STRIPE_WEBHOOK_SECRET");
  });

  it("signature invalide : 400", async () => {
    expect((await envoyer(evSub("evt_0", "active"), "faux")).status).toBe(400);
  });

  it("événement relivré : traité une seule fois (un seul Pro, un seul e-mail)", async () => {
    expect((await envoyer(evCheckout("evt_1", "paid"))).status).toBe(200);
    const r = await envoyer(evCheckout("evt_1", "paid"));
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ deja: true });
    expect(S.plans).toEqual([{ userId: "u1", plan: "pro" }]);
    expect(S.emails).toEqual(["a@b.fr"]);
  });

  it("checkout à paiement différé (unpaid) : ni Pro ni e-mail ; accordés au paiement réussi", async () => {
    await envoyer(evCheckout("evt_2", "unpaid"));
    expect(S.plans).toEqual([]);
    expect(S.emails).toEqual([]);
    await envoyer({ ...evCheckout("evt_3", "paid"), type: "checkout.session.async_payment_succeeded" });
    expect(S.plans).toEqual([{ userId: "u1", plan: "pro" }]);
    expect(S.emails).toEqual(["a@b.fr"]);
  });

  it("past_due garde le Pro (période de relance) ; unpaid et canceled le retirent", async () => {
    S.abonnements.sub_1.status = "past_due";
    await envoyer(evSub("evt_4", "past_due"));
    S.abonnements.sub_1.status = "unpaid";
    await envoyer(evSub("evt_5", "unpaid"));
    S.abonnements.sub_1.status = "canceled";
    await envoyer({ ...evSub("evt_6", "canceled"), type: "customer.subscription.deleted" });
    expect(S.plans.map((p) => p.plan)).toEqual(["pro", "free", "free"]);
  });

  it("événement livré en retard : décide sur l'état COURANT de l'abonnement, pas sur celui de l'événement", async () => {
    S.abonnements.sub_1.status = "active";
    await envoyer(evSub("evt_7", "incomplete")); /* vieil événement : l'abonnement est actif aujourd'hui */
    expect(S.plans).toEqual([{ userId: "u1", plan: "pro" }]);
  });

  it("traitement en échec : 500 et l'id repart du registre (la relivraison de Stripe sera traitée)", async () => {
    S.echecMaj = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await envoyer(evSub("evt_8", "active"))).status).toBe(500);
    expect(S.registre.has("evt_8")).toBe(false);
    S.echecMaj = false;
    expect((await envoyer(evSub("evt_8", "active"))).status).toBe(200);
    expect(S.plans).toEqual([{ userId: "u1", plan: "pro" }]);
  });

  it("relivraison pendant que le premier passage tourne encore : 409 (Stripe relivrera), rien n'est fait deux fois", async () => {
    S.registre.set("evt_10", { recu: Date.now(), traite: null }); /* premier passage en cours */
    const r = await envoyer(evSub("evt_10", "active"));
    expect(r.status).toBe(409);
    expect(S.plans).toEqual([]);
  });

  it("traitement coupé net (jamais marqué, plus de 10 min) : la relivraison le reprend et le marque", async () => {
    S.registre.set("evt_11", { recu: Date.now() - 11 * 60_000, traite: null });
    expect((await envoyer(evSub("evt_11", "active"))).status).toBe(200);
    expect(S.plans).toEqual([{ userId: "u1", plan: "pro" }]);
    expect(S.registre.get("evt_11")?.traite).not.toBeNull();
    expect((await envoyer(evSub("evt_11", "active"))).json).toMatchObject({ deja: true });
    expect(S.plans).toHaveLength(1);
  });

  it("registre absent (migration 0005 pas encore appliquée) : l'événement est traité quand même", async () => {
    S.registreAbsent = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await envoyer(evSub("evt_9", "active"))).status).toBe(200);
    expect(S.plans).toHaveLength(1);
  });
});

/* ─── Cron Chatel ────────────────────────────────────────────────────────── */

describe("GET /api/cron/chatel", () => {
  async function route() {
    vi.resetModules();
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({ subscriptions: { list: async function* () {} } }),
    }));
    vi.doMock("@/lib/email", () => ({ envoyerEmail: async () => {}, emailChatel: () => ({ subject: "", html: "" }) }));
    return import("@/app/api/cron/chatel/route");
  }

  it("CRON_SECRET absent : refusé (401), même sans en-tête", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await route();
    expect((await GET(new Request("http://x/api/cron/chatel"))).status).toBe(401);
    expect((await GET(new Request("http://x/api/cron/chatel", { headers: { authorization: "Bearer " } }))).status).toBe(401);
  });

  it("CRON_SECRET présent : seul le bon jeton passe", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    const { GET } = await route();
    expect((await GET(new Request("http://x/api/cron/chatel", { headers: { authorization: "Bearer faux" } }))).status).toBe(401);
    expect((await GET(new Request("http://x/api/cron/chatel", { headers: { authorization: "Bearer s3cret" } }))).status).toBe(200);
  });
});

/* ─── Pseudo ─────────────────────────────────────────────────────────────── */

describe("unicité du pseudo", () => {
  it("parcourt toutes les pages de comptes (le doublon du 1 500ᵉ inscrit est vu)", async () => {
    const { pseudoPris } = await import("@/lib/pseudo");
    const comptes = Array.from({ length: 1500 }, (_, i) => ({ id: `u${i}`, user_metadata: { username: i === 1499 ? "Camille" : `p${i}` } }));
    const pages: number[] = [];
    const admin = {
      auth: {
        admin: {
          listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
            pages.push(page);
            return { data: { users: comptes.slice((page - 1) * perPage, page * perPage) }, error: null };
          },
        },
      },
    } as unknown as Parameters<typeof pseudoPris>[0];
    expect(await pseudoPris(admin, "u1", "camille")).toBe(true);
    expect(pages).toEqual([1, 2]);
    expect(await pseudoPris(admin, "u1499", "camille")).toBe(false); /* son propre pseudo */
    expect(await pseudoPris(admin, "u1", "libre")).toBe(false);
  });

  it("panne de l'API admin : on ne conclut pas (null)", async () => {
    const { pseudoPris } = await import("@/lib/pseudo");
    const admin = { auth: { admin: { listUsers: async () => ({ data: null, error: new Error("panne") }) } } } as unknown as Parameters<typeof pseudoPris>[0];
    expect(await pseudoPris(admin, "u1", "x")).toBeNull();
  });
});

/* ─── Abonnement : règles pures ──────────────────────────────────────────── */

describe("plan selon le statut Stripe", () => {
  it("active, trialing, past_due → pro ; le reste → free", async () => {
    const { planDuStatut, sessionPayee } = await import("@/lib/stripe-abonnement");
    for (const s of ["active", "trialing", "past_due"]) expect(planDuStatut(s)).toBe("pro");
    for (const s of ["unpaid", "canceled", "incomplete", "incomplete_expired", "paused", "", null, undefined]) expect(planDuStatut(s)).toBe("free");
    expect(sessionPayee("paid")).toBe(true);
    expect(sessionPayee("no_payment_required")).toBe(true);
    expect(sessionPayee("unpaid")).toBe(false);
  });
});

/* ─── Migrations ─────────────────────────────────────────────────────────── */

describe("migration 0005 (durcissement)", () => {
  const dir = path.join(__dirname, "..", "supabase", "migrations");
  const fichiers = readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.includes("retour")).sort();
  const sql = (f: string) => readFileSync(path.join(dir, f), "utf8");
  const m5 = sql("0005_durcissement_api.sql");

  it("toute fonction SECURITY DEFINER a un search_path figé (dans sa déclaration ou par 0005)", () => {
    const sansChemin: string[] = [];
    for (const f of fichiers) {
      const re = /create or replace function (public\.\w+)\(([^)]*)\)[\s\S]*?\$\$/gi;
      for (const m of sql(f).matchAll(re)) {
        const entete = m[0];
        if (!/security definer/i.test(entete)) continue;
        if (/set search_path = public, pg_temp/i.test(entete)) continue;
        if (new RegExp(`alter function ${m[1].replace(".", "\\.")}\\([^)]*\\)\\s+set search_path = public, pg_temp`, "i").test(m5)) continue;
        sansChemin.push(`${f}: ${m[1]}`);
      }
    }
    expect(sansChemin).toEqual([]);
  });

  it("bornes et plafonds alignés sur le code (500 dépenses, MAX_PROJETS projets)", async () => {
    const { MAX_DEPENSES } = await import("@/lib/data/depenses");
    vi.resetModules();
    vi.doUnmock("@/lib/data/projects");
    vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({}) }));
    vi.doMock("@/lib/auth", () => ({ getUser: async () => null }));
    const { MAX_PROJETS } = await import("@/lib/data/projects");
    expect(m5).toMatch(new RegExp(`v_n >= ${MAX_PROJETS} then raise exception 'plafond_projets'`));
    expect(m5).toMatch(new RegExp(`v_n >= ${MAX_DEPENSES} then raise exception 'plafond_depenses'`));
    expect(m5).toMatch(/octet_length\(reponses::text\) <= 400000/);
    expect(m5).toMatch(/create table if not exists public\.stripe_events/);
  });

  it("le référentiel hérité n'est plus lisible en anonyme, et aucun code ne le lit", () => {
    expect(m5).toMatch(/drop policy if exists %I on public\.%I', t \|\| '_read'/);
    expect(m5).toMatch(/revoke all on public\.%I from anon, authenticated/);
    const racine = path.join(__dirname, "..");
    const lecteurs: string[] = [];
    const parcourir = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) parcourir(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && /from\(["'`](kb_\w+|form_\w+|settings)["'`]\)|rest\/v1\/(kb_|form_|settings)/.test(readFileSync(p, "utf8"))) lecteurs.push(path.relative(racine, p));
      }
    };
    for (const d of ["app", "lib", "components", "scripts"]) parcourir(path.join(racine, d));
    expect(lecteurs).toEqual([]);
  });
});
