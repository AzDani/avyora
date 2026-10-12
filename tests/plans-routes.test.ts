/**
 * Routes « Mes plans » (chantier C2) contre un Supabase SIMULÉ en mémoire.
 *
 * La simulation reproduit ce que la migration 0004 garantit et dont les routes dépendent :
 *  - RLS : un compte ne voit, ne modifie et ne supprime que ses plans ;
 *  - aucune insertion directe : la création passe par `floor_plans_creer` (service role), qui tient
 *    la limite (`limite_gratuite`), le plafond (`plafond_plans`) et la reprise sans doublon
 *    (`editeur_id`), de façon atomique (le verrou consultatif) ;
 *  - le trigger : `revision` n'avance que si `etat`, `nom` ou `workflow` changent ;
 *  - la suppression remet `project_plans.plan_id` à null ;
 *  - les droits UPDATE par colonne : la session n'écrit que `nom`, `etat`, `vue`, `resume` ; le service
 *    role écrit tout, SANS RLS (la simulation ne filtre pour lui que ce que la requête filtre).
 * Aucune base réelle n'est touchée, aucun compte n'est créé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
/* `grant update (nom, etat, vue, resume) on floor_plans to authenticated` (0004) : la liste de la production. */
import { COLONNES_SESSION } from "@/lib/plans/schema";

/* ─── Données ─────────────────────────────────────────────────────────────── */

const fixture = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "fixtures", f), "utf8"));
const ETAT_RENO = fixture("plans-etats/maison.json");
const ETAT_FINAL = fixture("plans-etats/plan-final-etage.json");
const CONTRAT_RENO = fixture("plan-contrat.json");
const CONTRAT_FINAL = fixture("plan-final-contrat.json");

type User = { id: string; email: string; app_metadata: Record<string, unknown> };
const GRATUIT: User = { id: "11111111-1111-4111-8111-111111111111", email: "camille@exemple.fr", app_metadata: {} };
const PRO: User = { id: "22222222-2222-4222-8222-222222222222", email: "alex@exemple.fr", app_metadata: { plan: "pro" } };
const AUTRE: User = { id: "33333333-3333-4333-8333-333333333333", email: "sam@exemple.fr", app_metadata: {} };
const SECRET = 'relation "public.floor_plans" — détail interne à ne jamais renvoyer';

/* ─── Supabase simulé ─────────────────────────────────────────────────────── */

type Ligne = Record<string, unknown>;
type Base = { floor_plans: Ligne[]; project_plans: Ligne[]; projects: Ligne[] };
type Client = "session" | "admin";
type Appel = { client: Client; table?: string; op: string; colonnes?: string; args?: unknown; filtres?: string[] };

const S = {
  base: { floor_plans: [], project_plans: [], projects: [] } as Base,
  user: null as User | null,
  panne: false,
  appels: [] as Appel[],
  limiteAutorisee: true,
  seq: 0,
};

const nouvelId = () => {
  S.seq++;
  return `aaaaaaaa-aaaa-4aaa-8aaa-${String(S.seq).padStart(12, "0")}`;
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** RLS des trois tables, telle que 0004 (et 0001 pour projects) la pose, pour le compte de la session. */
function visible(client: Client, table: keyof Base, l: Ligne): boolean {
  if (client === "admin") return true; /* service role : bypassrls */
  const uid = S.user?.id;
  if (!uid) return false;
  if (table === "floor_plans") return l.owner_id === uid;
  if (table === "projects") return l.owner_id === uid;
  const p = S.base.projects.find((x) => x.id === l.project_id);
  return !!p && p.owner_id === uid;
}

function lireChemin(l: Ligne, expr: string): unknown {
  /* « reponses->ctx->>nature » : la seule forme dont les routes ont besoin. */
  const parts = expr.split(/->>?/);
  let v: unknown = l[parts[0]];
  for (const k of parts.slice(1)) v = v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
  return v ?? null;
}

function projeter(l: Ligne, colonnes: string): Ligne {
  if (colonnes.trim() === "*") return clone(l);
  const o: Ligne = {};
  for (const brut of colonnes.split(",").map((c) => c.trim())) {
    const [alias, expr] = brut.includes(":") ? brut.split(":") : [brut.split(/->>?/).pop()!, brut];
    o[alias] = clone(lireChemin(l, expr) ?? null);
  }
  return o;
}

class Requete implements PromiseLike<{ data: unknown; error: unknown; count?: number | null }> {
  private op: "select" | "update" | "delete" | "insert" = "select";
  private colonnes: string | null = null;
  private opts: { count?: string; head?: boolean } = {};
  private filtres: Array<(l: Ligne) => boolean> = [];
  private tri: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private unique = false;
  private valeurs: Ligne | null = null;
  private noms: string[] = [];
  constructor(private table: keyof Base, private client: Client = "session") {}

  select(colonnes = "*", opts: { count?: string; head?: boolean } = {}) {
    if (this.op === "select") this.opts = opts;
    this.colonnes = colonnes;
    return this;
  }
  update(v: Ligne) { this.op = "update"; this.valeurs = v; return this; }
  delete() { this.op = "delete"; return this; }
  insert(v: Ligne) { this.op = "insert"; this.valeurs = v; return this; }
  eq(c: string, v: unknown) { this.filtres.push((l) => l[c] === v); this.noms.push(`${c}=${String(v)}`); return this; }
  in(c: string, vs: unknown[]) { this.filtres.push((l) => vs.includes(l[c])); this.noms.push(`${c} in`); return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.tri = { col, asc: o.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.unique = true; return this; }

  private executer(): { data: unknown; error: unknown; count?: number | null } {
    S.appels.push({ client: this.client, table: this.table, op: this.op, colonnes: this.colonnes ?? undefined, args: this.valeurs ?? undefined, filtres: [...this.noms] });
    if (S.panne) return { data: null, error: { message: SECRET, code: "42P01" } };
    if (this.client === "session" && this.op === "update" && this.table === "floor_plans") {
      const interdites = Object.keys(this.valeurs!).filter((k) => !(COLONNES_SESSION as readonly string[]).includes(k));
      if (interdites.length) return { data: null, error: { message: "permission denied for table floor_plans", code: "42501" } };
    }
    const lignes = S.base[this.table];
    const cibles = lignes.filter((l) => visible(this.client, this.table, l) && this.filtres.every((f) => f(l)));

    if (this.op === "insert") {
      /* 0004 : aucune politique INSERT sur floor_plans, revoke insert pour authenticated. */
      return { data: null, error: { message: "new row violates row-level security policy", code: "42501" } };
    }
    if (this.op === "update") {
      for (const l of cibles) {
        const avant = clone(l);
        Object.assign(l, clone(this.valeurs!));
        /* trigger floor_plans_touch */
        l.owner_id = avant.owner_id;
        l.created_at = avant.created_at;
        l.updated_at = new Date().toISOString();
        const change = ["etat", "nom", "workflow"].some((k) => JSON.stringify(l[k]) !== JSON.stringify(avant[k]));
        l.revision = change ? (avant.revision as number) + 1 : avant.revision;
      }
    }
    if (this.op === "delete") {
      S.base[this.table] = lignes.filter((l) => !cibles.includes(l));
      if (this.table === "floor_plans") {
        for (const pp of S.base.project_plans) if (cibles.some((c) => c.id === pp.plan_id)) pp.plan_id = null;
      }
    }
    let rangs = [...cibles];
    if (this.tri) {
      const { col, asc } = this.tri;
      rangs.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
    }
    const total = rangs.length;
    if (this.max !== null) rangs = rangs.slice(0, this.max);
    const count = this.opts.count ? total : null;
    if (this.op !== "select" && this.colonnes === null) return { data: null, error: null };
    if (this.opts.head) return { data: null, error: null, count };
    const data = rangs.map((l) => projeter(l, this.colonnes ?? "*"));
    if (this.unique) return { data: data[0] ?? null, error: null };
    return { data, error: null, count };
  }

  then<A = { data: unknown; error: unknown; count?: number | null }, B = never>(
    ok?: ((v: { data: unknown; error: unknown; count?: number | null }) => A | PromiseLike<A>) | null,
    ko?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.executer()).then(ok, ko);
  }
}

const clientSession = { from: (t: keyof Base) => new Requete(t, "session") };

/** floor_plans_creer (0004), exécutée d'un bloc : c'est ce que garantit le verrou consultatif. */
function rpcCreer(a: Record<string, unknown>) {
  S.appels.push({ client: "admin", op: "rpc", args: a });
  if (S.panne) return { data: null, error: { message: SECRET } };
  const miens = S.base.floor_plans.filter((f) => f.owner_id === a.p_owner);
  if (a.p_editeur_id != null) {
    const deja = miens.find((f) => f.editeur_id === a.p_editeur_id);
    if (deja) return { data: [{ plan_id: deja.id, plan_revision: deja.revision, deja: true }], error: null };
  }
  if (miens.length >= 200) return { data: null, error: { message: "plafond_plans", code: "P0001" } };
  if (a.p_limite !== null && miens.length >= (a.p_limite as number)) {
    return { data: null, error: { message: "limite_gratuite", code: "P0001" } };
  }
  const maintenant = new Date(Date.UTC(2026, 9, 12, 10, 0, S.seq)).toISOString();
  const l: Ligne = {
    id: nouvelId(), owner_id: a.p_owner, nom: String(a.p_nom || "").trim() || "Plan sans nom", workflow: a.p_workflow,
    etat: clone(a.p_etat), vue: clone(a.p_vue ?? null), resume: clone(a.p_resume ?? {}), apercu: clone(a.p_apercu ?? null),
    schema_etat: a.p_schema ?? 0, editeur_id: a.p_editeur_id ?? null, contrat: null, contrat_at: null,
    revision: 1, created_at: maintenant, updated_at: maintenant,
  };
  S.base.floor_plans.push(l);
  return { data: [{ plan_id: l.id, plan_revision: 1, deja: false }], error: null };
}

const clientAdmin = {
  rpc: async (nom: string, a: Record<string, unknown>) => {
    if (nom !== "floor_plans_creer") throw new Error("rpc inattendue " + nom);
    return rpcCreer(a);
  },
  /* Le service role n'écrit QUE floor_plans (colonnes du serveur), jamais une autre table. */
  from: (t: keyof Base) => {
    if (t !== "floor_plans") throw new Error("service role inattendu sur " + t);
    return new Requete(t, "admin");
  },
};

/* ─── Chargement des routes ──────────────────────────────────────────────── */

async function routes(plans = true) {
  vi.resetModules();
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, plans } };
  });
  vi.doMock("@/lib/auth", () => ({
    getUser: async () => S.user,
    estPro: (u: User | null) => !!u && u.app_metadata?.plan === "pro",
  }));
  vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => clientSession }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => clientAdmin }));
  vi.doMock("@/lib/ratelimit", () => ({
    verifierLimite: vi.fn(async (kind: string, id: string) => {
      S.appels.push({ client: "session", op: "limite", args: { kind, id } });
      return S.limiteAutorisee;
    }),
    clientIp: async () => "127.0.0.1",
  }));
  return {
    session: await import("@/app/api/plans/session/route"),
    liste: await import("@/app/api/plans/route"),
    un: await import("@/app/api/plans/[id]/route"),
  };
}

const URL_BASE = "http://localhost/api/plans";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const corps = (b: unknown, init: RequestInit = {}) =>
  new Request(URL_BASE, { method: "POST", body: typeof b === "string" ? b : JSON.stringify(b), headers: { "content-type": "application/json" }, ...init });
const patch = (b: unknown) => new Request(URL_BASE + "/x", { method: "PATCH", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
const rien = () => new Request(URL_BASE);

async function lire(r: Response): Promise<{ status: number; json: Record<string, unknown> | null; texte: string }> {
  const texte = await r.text();
  let json: Record<string, unknown> | null = null;
  try { json = texte ? JSON.parse(texte) : null; } catch { json = null; }
  return { status: r.status, json, texte };
}

/* Par défaut : un Projet rénovation pour un Pro, un Plan final pour un gratuit (D68, tenu par le serveur). */
const creer = (extra: Record<string, unknown> = {}, etat?: unknown) =>
  corps({ nom: "Ma maison", etat: etat ?? (S.user?.app_metadata?.plan === "pro" ? ETAT_RENO : ETAT_FINAL), ...extra });

beforeEach(() => {
  S.base = { floor_plans: [], project_plans: [], projects: [] };
  S.user = null;
  S.panne = false;
  S.appels = [];
  S.limiteAutorisee = true;
  S.seq = 0;
});
afterEach(() => {
  vi.doUnmock("@/lib/features");
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("@/lib/supabase/admin");
  vi.doUnmock("@/lib/ratelimit");
  vi.resetModules();
});

/* ─── Interrupteur et session ────────────────────────────────────────────── */

describe("interrupteur éteint", () => {
  it("toutes les routes répondent 404, sans corps, sans toucher à la base", async () => {
    const r = await routes(false);
    S.user = PRO;
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
    const reponses = [
      await r.session.GET(),
      await r.liste.GET(),
      await r.liste.POST(creer()),
      await r.un.GET(rien(), ctx(id)),
      await r.un.PATCH(patch({ revision: 1, nom: "x" }), ctx(id)),
      await r.un.DELETE(rien(), ctx(id)),
    ];
    for (const rep of reponses) {
      const l = await lire(rep);
      expect(l.status).toBe(404);
      expect(l.texte).toBe("");
    }
    expect(S.appels).toEqual([]);
  });
});

describe("GET /api/plans/session", () => {
  it("sans session : 200, anonyme, limite 1, rien d'utilisé, jamais en cache", async () => {
    const r = await routes();
    const rep = await r.session.GET();
    expect(rep.headers.get("cache-control")).toBe("private, no-store");
    expect((await lire(rep)).json).toEqual({ connecte: false, pro: false, limite: 1, utilises: 0 });
  });
  it("gratuit : limite 1 et le nombre de ses plans ; Pro : pas de limite", async () => {
    const r = await routes();
    S.user = GRATUIT;
    await r.liste.POST(creer());
    S.user = AUTRE;
    await r.liste.POST(creer());
    S.user = GRATUIT;
    expect((await lire(await r.session.GET())).json).toEqual({ connecte: true, pro: false, limite: 1, utilises: 1 });
    S.user = PRO;
    expect((await lire(await r.session.GET())).json).toEqual({ connecte: true, pro: true, limite: null, utilises: 0 });
  });
});

describe("401 sans session", () => {
  it("liste, création, lecture, modification, suppression", async () => {
    const r = await routes();
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
    for (const rep of [
      await r.liste.GET(),
      await r.liste.POST(creer()),
      await r.un.GET(rien(), ctx(id)),
      await r.un.PATCH(patch({ revision: 1, nom: "x" }), ctx(id)),
      await r.un.DELETE(rien(), ctx(id)),
    ]) {
      expect(await lire(rep)).toMatchObject({ status: 401, json: { code: "connexion_requise" } });
    }
    expect(S.appels.filter((a) => a.op !== "limite")).toEqual([]);
  });
});

/* ─── Limites de débit absentes en production (jury) ─────────────────────── */

describe("production sans Upstash", () => {
  const env = { ...process.env };
  afterEach(() => {
    for (const k of ["VERCEL_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
  });
  it("les écritures répondent 503 indisponible, sans rien écrire ; la lecture reste possible", async () => {
    const r = await routes();
    S.user = PRO;
    process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(await lire(await r.liste.POST(creer()))).toMatchObject({ status: 503, json: { code: "indisponible" } });
    expect(S.base.floor_plans).toHaveLength(0);
    expect((await r.liste.GET()).status).toBe(200);
    /* préversion : sans effet */
    process.env.VERCEL_ENV = "preview";
    expect((await r.liste.POST(creer())).status).toBe(201);
  });
});

/* ─── Création ───────────────────────────────────────────────────────────── */

describe("POST /api/plans", () => {
  it("gratuit : le premier plan passe (201), le second est refusé en 402 limite_gratuite", async () => {
    const r = await routes();
    S.user = GRATUIT;
    const a = await lire(await r.liste.POST(creer({ editeurId: "k3x9a1q", resume: { m2: 94, pieces: 6 } })));
    expect(a.status).toBe(201);
    expect(a.json).toEqual({ id: expect.any(String), revision: 1, deja: false });
    const b = await lire(await r.liste.POST(creer({ nom: "Autre" })));
    expect(b).toMatchObject({ status: 402, json: { code: "limite_gratuite" } });
    expect(S.base.floor_plans).toHaveLength(1);
    /* La limite vient de estPro côté serveur, jamais du client. */
    expect(S.appels.filter((x) => x.op === "rpc").map((x) => (x.args as { p_limite: unknown }).p_limite)).toEqual([1, 1]);
  });

  it("gratuit : deux créations simultanées → une 201, une 402, une seule ligne", async () => {
    const r = await routes();
    S.user = GRATUIT;
    const [a, b] = await Promise.all([r.liste.POST(creer()), r.liste.POST(creer({ nom: "Deux" }))]);
    expect([a.status, b.status].sort()).toEqual([201, 402]);
    expect(S.base.floor_plans).toHaveLength(1);
  });

  it("D68 côté serveur : un gratuit ne crée pas de Projet rénovation (403 pro_requis), ni n'y passe un plan, ni n'envoie de contrat", async () => {
    const r = await routes();
    S.user = GRATUIT;
    expect(await lire(await r.liste.POST(creer({}, ETAT_RENO)))).toMatchObject({ status: 403, json: { code: "pro_requis" } });
    expect(S.base.floor_plans).toHaveLength(0);
    const a = await lire(await r.liste.POST(creer({}, ETAT_FINAL)));
    expect(a.status).toBe(201);
    const id = a.json!.id as string;
    expect(await lire(await r.un.PATCH(patch({ revision: 1, etat: ETAT_RENO }), ctx(id)))).toMatchObject({ status: 403, json: { code: "pro_requis" } });
    expect(await lire(await r.un.PATCH(patch({ revision: 1, contrat: CONTRAT_FINAL }), ctx(id)))).toMatchObject({ status: 403, json: { code: "pro_requis" } });
    /* un Projet rénovation déjà rangé (Pro redevenu gratuit) reste modifiable : rien n'est retiré */
    S.base.floor_plans[0].workflow = "renovation";
    expect((await lire(await r.un.PATCH(patch({ revision: 1, etat: ETAT_RENO }), ctx(id)))).status).toBe(200);
  });

  it("Pro : pas de limite (null), plafond anti-abus → 409 plafond", async () => {
    const r = await routes();
    S.user = PRO;
    expect((await r.liste.POST(creer())).status).toBe(201);
    expect((await r.liste.POST(creer({ nom: "Deux" }))).status).toBe(201);
    expect(S.appels.filter((x) => x.op === "rpc").map((x) => (x.args as { p_limite: unknown }).p_limite)).toEqual([null, null]);
    for (let i = 0; i < 198; i++) S.base.floor_plans.push({ id: nouvelId(), owner_id: PRO.id, revision: 1 });
    expect(await lire(await r.liste.POST(creer({ nom: "201e" })))).toMatchObject({ status: 409, json: { code: "plafond" } });
  });

  it("reprise d'un plan local : même editeurId deux fois → le même plan, deja, sans doublon ni 402", async () => {
    const r = await routes();
    S.user = GRATUIT;
    const a = await lire(await r.liste.POST(creer({ editeurId: "k3x9a1q" })));
    const b = await lire(await r.liste.POST(creer({ editeurId: "k3x9a1q" })));
    expect(b.status).toBe(201);
    expect(b.json).toEqual({ id: a.json!.id, revision: 1, deja: true });
    expect(S.base.floor_plans).toHaveLength(1);
  });

  it("ce qui est rangé : type depuis l'état, vignette calculée par le serveur, apercu du client ignoré", async () => {
    const r = await routes();
    S.user = PRO;
    await r.liste.POST(creer({ apercu: [["<script>", 0, 0, 0, "x", "y"]], vue: { zoom: 42 } }, ETAT_FINAL));
    const l = S.base.floor_plans[0];
    expect(l.workflow).toBe("final_plan");
    expect(l.schema_etat).toBe(47);
    expect(l.owner_id).toBe(PRO.id);
    expect(JSON.stringify(l.apercu)).not.toContain("script");
    expect((l.apercu as unknown[]).length).toBeGreaterThan(0);
    expect(l.vue).toEqual({ zoom: 42 });
    expect(l.resume).toEqual({});
  });

  it("limitation de débit sur user.id → 429, avant toute écriture", async () => {
    const r = await routes();
    S.user = GRATUIT;
    S.limiteAutorisee = false;
    expect(await lire(await r.liste.POST(creer()))).toMatchObject({ status: 429, json: { code: "trop_de_requetes" } });
    expect(S.appels).toEqual([{ client: "session", op: "limite", args: { kind: "planCreation", id: GRATUIT.id } }]);
  });

  it("400 sur un JSON cassé ou un état invalide", async () => {
    const r = await routes();
    S.user = PRO;
    expect(await lire(await r.liste.POST(corps("{pas du json")))).toMatchObject({ status: 400, json: { code: "invalide" } });
    const mauvais = clone(ETAT_RENO);
    mauvais.levels[0].walls[0].id = "a'b";
    expect(await lire(await r.liste.POST(creer({}, mauvais)))).toMatchObject({ status: 400, json: { code: "invalide" } });
    expect(S.base.floor_plans).toHaveLength(0);
  });

  it("413 : corps annoncé trop gros, ou flux trop long sans content-length", async () => {
    const r = await routes();
    S.user = PRO;
    const gros = new Request(URL_BASE, { method: "POST", body: "{}", headers: { "content-length": "1300000" } });
    expect(await lire(await r.liste.POST(gros))).toMatchObject({ status: 413, json: { code: "trop_volumineux" } });

    const morceau = new TextEncoder().encode("x".repeat(100_000));
    let n = 0;
    const flux = new ReadableStream<Uint8Array>({
      pull(c) { if (n++ < 20) c.enqueue(morceau); else c.close(); },
    });
    const sansTaille = new Request(URL_BASE, { method: "POST", body: flux, duplex: "half" } as RequestInit);
    expect(sansTaille.headers.get("content-length")).toBe(null);
    expect(await lire(await r.liste.POST(sansTaille))).toMatchObject({ status: 413, json: { code: "trop_volumineux" } });
    expect(n).toBeLessThan(20); /* la lecture s'arrête dès la borne franchie */
    expect(S.appels.filter((x) => x.op === "rpc")).toEqual([]);
  });

  it("le pire cas mesuré (168 Ko) passe", async () => {
    const r = await routes();
    S.user = PRO;
    expect((await r.liste.POST(creer({}, fixture("plans-etats/pire-cas.json")))).status).toBe(201);
  });
});

/* ─── Liste et lecture ───────────────────────────────────────────────────── */

describe("GET /api/plans", () => {
  it("les cartes du compte, sans jamais l'état, les plus récentes d'abord, avec le nombre d'estimations", async () => {
    const r = await routes();
    S.user = PRO;
    const a = (await lire(await r.liste.POST(creer({ nom: "Ancien" })))).json!.id as string;
    const b = (await lire(await r.liste.POST(creer({ nom: "Récent" }, ETAT_FINAL)))).json!.id as string;
    S.user = AUTRE;
    await r.liste.POST(creer({ nom: "Pas à moi" }));
    S.base.projects.push({ id: "p1", owner_id: PRO.id, nom: "Neuf", created_at: "2026-10-12T11:00:00Z", reponses: { ctx: { nature: "neuf" } } });
    S.base.projects.push({ id: "p2", owner_id: PRO.id, nom: "Neuf affiné", created_at: "2026-10-12T12:00:00Z", reponses: { ctx: { nature: "neuf" } } });
    S.base.project_plans.push({ project_id: "p1", plan_id: b }, { project_id: "p2", plan_id: b });

    S.user = PRO;
    const rep = await r.liste.GET();
    expect(rep.headers.get("cache-control")).toBe("private, no-store");
    const { json } = await lire(rep);
    const plans = json!.plans as Record<string, unknown>[];
    expect(plans.map((p) => p.nom)).toEqual(["Récent", "Ancien"]);
    expect(plans.map((p) => p.id)).toEqual([b, a]);
    expect(plans.map((p) => p.estimations)).toEqual([2, 0]);
    expect(json).toMatchObject({ limite: null, utilises: 2 });
    for (const p of plans) {
      expect(Object.keys(p).sort()).toEqual(["apercu", "estimations", "id", "nom", "resume", "revision", "updated_at", "workflow"]);
    }
    expect(JSON.stringify(json)).not.toContain('"etat"');
    expect(JSON.stringify(json)).not.toContain('"levels"');
    const sel = S.appels.find((x) => x.table === "floor_plans" && x.op === "select")!;
    expect(sel.colonnes).not.toContain("etat");
  });

  it("gratuit : limite 1", async () => {
    const r = await routes();
    S.user = GRATUIT;
    expect((await lire(await r.liste.GET())).json).toEqual({ plans: [], limite: 1, utilises: 0 });
  });
});

describe("GET /api/plans/[id]", () => {
  it("le plan complet et ses estimations ; un id invalide ou d'un autre compte → 404", async () => {
    const r = await routes();
    S.user = PRO;
    const id = (await lire(await r.liste.POST(creer({ vue: { zoom: 30 } })))).json!.id as string;
    S.base.projects.push({ id: "p1", owner_id: PRO.id, nom: "Réno", created_at: "2026-10-12T11:00:00Z", reponses: { ctx: { type: "Maison" } } });
    S.base.project_plans.push({ project_id: "p1", plan_id: id });

    const { status, json } = await lire(await r.un.GET(rien(), ctx(id)));
    expect(status).toBe(200);
    expect(json).toMatchObject({ id, nom: "Ma maison", workflow: "renovation", vue: { zoom: 30 }, revision: 1 });
    expect(json!.etat).toEqual(ETAT_RENO);
    expect(json!.estimations).toEqual([{ id: "p1", nom: "Réno", nature: "renovation", created_at: "2026-10-12T11:00:00Z" }]);

    expect(await lire(await r.un.GET(rien(), ctx("pas-un-uuid")))).toMatchObject({ status: 404, json: { code: "introuvable" } });
    S.user = AUTRE;
    expect(await lire(await r.un.GET(rien(), ctx(id)))).toMatchObject({ status: 404, json: { code: "introuvable" } });
  });
});

/* ─── Modification ───────────────────────────────────────────────────────── */

describe("PATCH /api/plans/[id]", () => {
  async function unPlan(etat = ETAT_RENO) {
    const r = await routes();
    S.user = PRO;
    const id = (await lire(await r.liste.POST(creer({}, etat)))).json!.id as string;
    return { r, id };
  }
  const p = (r: Awaited<ReturnType<typeof routes>>, id: string, b: unknown) => r.un.PATCH(patch(b), ctx(id));

  it("la révision avance avec le dessin ; une révision périmée → 409 conflit avec celle du serveur", async () => {
    const { r, id } = await unPlan();
    const etat2 = clone(ETAT_RENO);
    etat2.levels[0].walls[0].b.x = 8;
    expect(await lire(await p(r, id, { revision: 1, etat: etat2 }))).toMatchObject({ status: 200, json: { revision: 2 } });
    /* l'autre appareil en est resté à 1 */
    expect(await lire(await p(r, id, { revision: 1, nom: "Autre appareil" }))).toEqual({
      status: 409, json: { code: "conflit", revision: 2 }, texte: expect.any(String),
    });
    expect(S.base.floor_plans[0].nom).toBe("Ma maison");
    expect((S.base.floor_plans[0].apercu as number[][])[0][2]).toBe(8);
  });

  it("zoom ou résumé seuls : la révision ne bouge pas", async () => {
    const { r, id } = await unPlan();
    expect((await lire(await p(r, id, { revision: 1, vue: { zoom: 55 }, resume: { m2: 94 } }))).json).toEqual({ revision: 1 });
    expect(S.base.floor_plans[0].vue).toEqual({ zoom: 55 });
  });

  it("force : écrit malgré une révision périmée", async () => {
    const { r, id } = await unPlan();
    await p(r, id, { revision: 1, nom: "Deux" });
    expect(await lire(await p(r, id, { revision: 1, nom: "Trois", force: true }))).toMatchObject({ status: 200, json: { revision: 3 } });
  });

  it("plan d'un autre compte ou absent → 404, jamais 409 (on ne dit pas s'il existe)", async () => {
    const { r, id } = await unPlan();
    S.user = AUTRE;
    expect(await lire(await p(r, id, { revision: 1, nom: "Volé" }))).toMatchObject({ status: 404, json: { code: "introuvable" } });
    expect(await lire(await p(r, id, { revision: 9, nom: "Volé", force: true }))).toMatchObject({ status: 404 });
    expect(S.base.floor_plans[0].nom).toBe("Ma maison");
    S.user = PRO;
    expect(await lire(await p(r, "aaaaaaaa-aaaa-4aaa-8aaa-999999999999", { revision: 1, nom: "x" }))).toMatchObject({ status: 404 });
  });

  it("contrat : même contrôle que l'import, même type de plan, contrat_at posé", async () => {
    const { r, id } = await unPlan();
    expect(await lire(await p(r, id, { revision: 1, contrat: CONTRAT_RENO }))).toMatchObject({ status: 200, json: { revision: 1 } });
    expect(S.base.floor_plans[0].contrat).toEqual(CONTRAT_RENO);
    expect(typeof S.base.floor_plans[0].contrat_at).toBe("string");
    expect(await lire(await p(r, id, { revision: 1, contrat: CONTRAT_FINAL }))).toMatchObject({ status: 400, json: { code: "contrat_workflow" } });
    expect(await lire(await p(r, id, { revision: 1, contrat: { ...CONTRAT_RENO, contrat: "2.0.0" } }))).toMatchObject({ status: 400, json: { code: "contrat_version" } });
    expect(await lire(await p(r, id, { revision: 1, contrat: { workflow: "renovation" } }))).toMatchObject({ status: 400, json: { code: "contrat_invalide" } });
    /* l'état envoyé avec le contrat fait foi pour le type */
    expect(await lire(await p(r, id, { revision: 1, etat: ETAT_FINAL, contrat: CONTRAT_FINAL }))).toMatchObject({ status: 200, json: { revision: 2 } });
    expect(S.base.floor_plans[0].workflow).toBe("final_plan");
  });

  it("nom, vue ou résumé seuls : la session écrit (ses colonnes), le service role n'est pas appelé", async () => {
    const { r, id } = await unPlan();
    S.appels = [];
    expect(await lire(await p(r, id, { revision: 1, nom: "Renommé", vue: { zoom: 3 }, resume: { m2: 90 } }))).toMatchObject({ status: 200, json: { revision: 2 } });
    expect(S.appels.filter((x) => x.client === "admin")).toEqual([]);
    const maj = S.appels.find((x) => x.op === "update")!;
    expect(maj.client).toBe("session");
    expect(Object.keys(maj.args as object).sort()).toEqual(["nom", "resume", "vue"]);
  });

  it("état ou contrat : la session vérifie d'abord, puis le service role écrit tout d'un coup (propriétaire et révision)", async () => {
    const { r, id } = await unPlan();
    S.appels = [];
    expect(await lire(await p(r, id, { revision: 1, etat: ETAT_RENO, vue: { zoom: 7 } }))).toMatchObject({ status: 200, json: { revision: 1 } });
    const ops = S.appels.filter((x) => x.op !== "limite").map((x) => `${x.client}:${x.op}`);
    expect(ops).toEqual(["session:select", "admin:update"]);
    const maj = S.appels.find((x) => x.op === "update")!;
    expect(maj.filtres).toEqual([`id=${id}`, `owner_id=${PRO.id}`, "revision=1"]);
    expect(Object.keys(maj.args as object).sort()).toEqual(["apercu", "etat", "schema_etat", "vue", "workflow"]);
    /* aucune colonne du serveur n'a été écrite par la session */
    for (const x of S.appels.filter((y) => y.client === "session" && y.op === "update")) {
      expect(Object.keys(x.args as object).every((k) => ["nom", "etat", "vue", "resume"].includes(k))).toBe(true);
    }

    S.appels = [];
    expect((await lire(await p(r, id, { revision: 1, contrat: CONTRAT_RENO }))).status).toBe(200);
    const c = S.appels.find((x) => x.op === "update")!;
    expect(c.client).toBe("admin");
    expect(Object.keys(c.args as object).sort()).toEqual(["contrat", "contrat_at"]);
    expect(c.filtres).toContain(`owner_id=${PRO.id}`);
  });

  it("contrat : la garde profonde de l'état s'applique (clé __proto__ propre, chaîne absurde) → 400 contrat_invalide (jury)", async () => {
    const { r, id } = await unPlan();
    const proto = JSON.parse(JSON.stringify(CONTRAT_RENO).replace(/^\{/, '{"__proto__":{"x":1},'));
    expect(Object.prototype.hasOwnProperty.call(proto, "__proto__")).toBe(true);
    expect(await lire(await p(r, id, { revision: 1, contrat: proto }))).toMatchObject({ status: 400, json: { code: "contrat_invalide" } });
    const long = { ...clone(CONTRAT_RENO), notes: "x".repeat(100_001) };
    expect(await lire(await p(r, id, { revision: 1, contrat: long }))).toMatchObject({ status: 400, json: { code: "contrat_invalide" } });
    expect(S.base.floor_plans[0].contrat).toBeNull();
  });

  it("le plan d'un autre compte : 404 sans aucun appel au service role, même en force", async () => {
    const { r, id } = await unPlan();
    S.user = AUTRE;
    S.appels = [];
    expect(await lire(await p(r, id, { revision: 1, etat: ETAT_RENO }))).toMatchObject({ status: 404, json: { code: "introuvable" } });
    expect(await lire(await p(r, id, { revision: 1, etat: ETAT_RENO, force: true }))).toMatchObject({ status: 404 });
    expect(await lire(await p(r, id, { revision: 1, contrat: CONTRAT_RENO }))).toMatchObject({ status: 404 });
    expect(S.appels.filter((x) => x.client === "admin")).toEqual([]);
    expect(S.base.floor_plans[0].contrat).toBeNull();
  });

  it("révision périmée avec un état : 409 sans écrire ; si un autre appareil écrit entre la vérification et l'écriture, 409 aussi", async () => {
    const { r, id } = await unPlan();
    await p(r, id, { revision: 1, nom: "Deux" });
    S.appels = [];
    expect(await lire(await p(r, id, { revision: 1, etat: ETAT_RENO }))).toMatchObject({ status: 409, json: { code: "conflit", revision: 2 } });
    expect(S.appels.filter((x) => x.client === "admin")).toEqual([]);
    /* course : la ligne change juste après la vérification */
    const ligne = S.base.floor_plans[0];
    const entete = Object.getOwnPropertyDescriptor(ligne, "revision")!;
    let lectures = 0;
    Object.defineProperty(ligne, "revision", {
      configurable: true, enumerable: true,
      get: () => (++lectures > 1 ? 3 : 2),
      set: (v) => Object.defineProperty(ligne, "revision", { ...entete, value: v, writable: true }),
    });
    expect(await lire(await p(r, id, { revision: 2, etat: ETAT_RENO }))).toMatchObject({ status: 409, json: { code: "conflit", revision: 3 } });
  });

  it("contrat : la taille est mesurée comme Postgres (413), un caractère nul est refusé (400)", async () => {
    const { r, id } = await unPlan();
    /* 35 Ko en JSON, plus de 1,5 Mo dans Postgres (chaque 1e-300 s'écrit avec 300 zéros). */
    const gonfle = { ...CONTRAT_RENO, bruit: Array.from({ length: 5000 }, () => 1e-300) };
    expect(JSON.stringify(gonfle).length).toBeLessThan(100_000);
    expect(await lire(await p(r, id, { revision: 1, contrat: gonfle }))).toMatchObject({ status: 413, json: { code: "trop_volumineux" } });
    expect(await lire(await p(r, id, { revision: 1, contrat: { ...CONTRAT_RENO, note: "a\u0000b" } }))).toMatchObject({ status: 400, json: { code: "contrat_invalide" } });
    expect(S.base.floor_plans[0].contrat).toBeNull();
  });

  it("400 : rien à écrire, révision absente, état invalide ; 429 sur user.id", async () => {
    const { r, id } = await unPlan();
    expect(await lire(await p(r, id, { revision: 1 }))).toMatchObject({ status: 400, json: { code: "invalide" } });
    expect(await lire(await p(r, id, { nom: "x" }))).toMatchObject({ status: 400 });
    expect(await lire(await p(r, id, { revision: 1, etat: { ...ETAT_RENO, levels: [] } }))).toMatchObject({ status: 400 });
    S.limiteAutorisee = false;
    S.appels = [];
    expect(await lire(await p(r, id, { revision: 1, nom: "x" }))).toMatchObject({ status: 429, json: { code: "trop_de_requetes" } });
    expect(S.appels).toEqual([{ client: "session", op: "limite", args: { kind: "plan", id: PRO.id } }]);
  });
});

/* ─── Suppression ────────────────────────────────────────────────────────── */

describe("DELETE /api/plans/[id]", () => {
  it("204, et les estimations reliées perdent le lien ; un autre compte → 404", async () => {
    const r = await routes();
    S.user = PRO;
    const id = (await lire(await r.liste.POST(creer()))).json!.id as string;
    S.base.projects.push({ id: "p1", owner_id: PRO.id, nom: "Réno", created_at: "2026-10-12T11:00:00Z", reponses: {} });
    S.base.project_plans.push({ project_id: "p1", plan_id: id });

    S.user = AUTRE;
    expect(await lire(await r.un.DELETE(rien(), ctx(id)))).toMatchObject({ status: 404, json: { code: "introuvable" } });
    expect(S.base.floor_plans).toHaveLength(1);

    S.user = PRO;
    const rep = await r.un.DELETE(rien(), ctx(id));
    expect(rep.status).toBe(204);
    expect(await rep.text()).toBe("");
    expect(S.base.floor_plans).toHaveLength(0);
    expect(S.base.project_plans).toEqual([{ project_id: "p1", plan_id: null }]);
    expect(S.base.projects).toHaveLength(1);
  });
});

/* ─── Aucune fuite d'erreur ──────────────────────────────────────────────── */

describe("aucun error.message dans une réponse", () => {
  it("base en panne : chaque route répond { code: 'erreur' } en 500, sans le détail", async () => {
    const r = await routes();
    S.user = PRO;
    const id = (await lire(await r.liste.POST(creer()))).json!.id as string;
    S.panne = true;
    for (const rep of [
      await r.session.GET(),
      await r.liste.GET(),
      await r.liste.POST(creer({ nom: "Deux" })),
      await r.un.GET(rien(), ctx(id)),
      await r.un.PATCH(patch({ revision: 1, nom: "x" }), ctx(id)),
      await r.un.PATCH(patch({ revision: 1, etat: ETAT_RENO }), ctx(id)),
      await r.un.DELETE(rien(), ctx(id)),
    ]) {
      const l = await lire(rep);
      expect(l.status).toBe(500);
      expect(l.json).toEqual({ code: "erreur" });
      expect(l.texte).not.toContain("floor_plans");
    }
  });

  it("toutes les erreurs sont des codes : ni « error », ni « message »", async () => {
    const r = await routes();
    S.user = GRATUIT;
    await r.liste.POST(creer());
    const id = S.base.floor_plans[0].id as string;
    const erreurs = [
      await r.liste.POST(creer({ nom: "Deux" })),
      await r.liste.POST(corps("{")),
      await r.un.GET(rien(), ctx("x")),
      await r.un.PATCH(patch({ revision: 7, nom: "x" }), ctx(id)),
      await r.un.PATCH(patch({ revision: 1, contrat: { contrat: "9.0.0" } }), ctx(id)),
    ];
    for (const rep of erreurs) {
      const l = await lire(rep);
      expect(l.status).toBeGreaterThanOrEqual(400);
      expect(typeof l.json!.code).toBe("string");
      expect(l.json).not.toHaveProperty("error");
      expect(l.json).not.toHaveProperty("message");
    }
  });
});
