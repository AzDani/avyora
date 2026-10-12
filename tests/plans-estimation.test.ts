/**
 * « Mes plans », chantier C7 : l'estimation détaillée de RÉNOVATION née d'un plan (Pro).
 *
 *  - `POST /api/plans/[id]/estimation` : gardes (interrupteur, session, Pro, débit, uuid, code postal),
 *    création (projet + `project_plans` avec `plan_id`), mise à jour (D12 : une ligne épinglée reste),
 *    tout recalculé depuis la base, chaque écriture vérifiée (0 ligne → erreur), retour arrière si le
 *    lien ne peut pas être posé ;
 *  - `preparer` n'écrit rien ;
 *  - la page `/projets/depuis-plan/[planId]` : 404 éteinte, Tarifs en gratuit, l'écran de validation en Pro ;
 *  - les anciennes routes `/api/projects/[id]/plan` et `ImporterPlan` n'existent plus.
 *
 * Supabase est SIMULÉ en mémoire (RLS de 0001 et 0004 reproduite pour la session) : aucune base réelle
 * n'est touchée, aucun compte n'est créé, le service role n'est jamais appelé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { contributionsDuPlan, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { injecterPlan } from "@/lib/estimateur/plan-injection";

/* ─── Données ─────────────────────────────────────────────────────────────── */

const RACINE = path.join(__dirname, "..");
const CONTRAT = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "plan-contrat.json"), "utf8")) as Record<string, unknown>;
const CONTRAT_FINAL = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "plan-final-contrat.json"), "utf8")) as Record<string, unknown>;
const REFERENCE = injecterPlan({}, contributionsDuPlan(CONTRAT as PlanPourCorrespondance).contributions);

type User = { id: string; email: string; app_metadata: Record<string, unknown> };
const PRO: User = { id: "11111111-1111-4111-8111-111111111111", email: "camille@exemple.fr", app_metadata: { plan: "pro" } };
const GRATUIT: User = { id: "22222222-2222-4222-8222-222222222222", email: "lou@exemple.fr", app_metadata: {} };
const AUTRE: User = { id: "33333333-3333-4333-8333-333333333333", email: "sam@exemple.fr", app_metadata: { plan: "pro" } };

const PLAN_RENO = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const PLAN_FINAL = "bbbbbbbb-bbbb-4bbb-8bbb-000000000002";
const PLAN_AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-000000000003";
const PLAN_SANS_CONTRAT = "bbbbbbbb-bbbb-4bbb-8bbb-000000000004";
const PLAN_ABSENT = "bbbbbbbb-bbbb-4bbb-8bbb-0000000000ff";

/* ─── Supabase simulé ─────────────────────────────────────────────────────── */

type Ligne = Record<string, unknown>;
type Table = "floor_plans" | "project_plans" | "projects";
type Base = Record<Table, Ligne[]>;
type Op = "select" | "insert" | "upsert" | "update" | "delete";

const S = {
  base: { floor_plans: [], project_plans: [], projects: [] } as Base,
  user: null as User | null,
  appels: [] as { table: string; op: Op }[],
  /** `table:op` qui répondent une erreur Postgres. */
  erreurs: new Set<string>(),
  /** `table:op` refusés EN SILENCE par la RLS : 0 ligne, sans erreur. */
  muets: new Set<string>(),
  journal: [] as { type: string; userId?: string | null; payload?: Record<string, unknown> }[],
  locale: "fr" as "fr" | "en",
  seq: 0,
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function lireChemin(l: Ligne, expr: string): unknown {
  const parts = expr.split(/->>?/);
  let v: unknown = l[parts[0]];
  for (const k of parts.slice(1)) v = v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
  return v ?? null;
}

/** RLS de lecture : projects et floor_plans au propriétaire ; project_plans au propriétaire du projet. */
function visible(table: Table, l: Ligne): boolean {
  const uid = S.user?.id;
  if (!uid) return false;
  if (table === "project_plans") return S.base.projects.some((p) => p.id === l.project_id && p.owner_id === uid);
  return l.owner_id === uid;
}

/** `with check` des écritures de la session (0001, 0004). floor_plans : aucune écriture ici. */
function autorise(table: Table, l: Ligne): boolean {
  const uid = S.user?.id;
  if (!uid) return false;
  if (table === "projects") return l.owner_id === uid;
  if (table === "project_plans") {
    const projet = S.base.projects.some((p) => p.id === l.project_id && p.owner_id === uid);
    const plan = l.plan_id == null || S.base.floor_plans.some((f) => f.id === l.plan_id && f.owner_id === uid);
    return projet && plan;
  }
  return false;
}

type Res = { data: unknown; error: unknown };

class Requete implements PromiseLike<Res> {
  private op: Op = "select";
  private colonnes: string | null = null;
  private filtres: Array<(l: Ligne) => boolean> = [];
  private valeurs: Ligne[] = [];
  private patch: Ligne = {};
  private conflit: string | undefined;
  private unique: "maybe" | "single" | null = null;
  private max: number | null = null;
  private tri: { col: string; asc: boolean } | null = null;
  constructor(private table: Table) {}

  select(c = "*") { this.colonnes = c; return this; }
  insert(v: Ligne | Ligne[]) { this.op = "insert"; this.valeurs = Array.isArray(v) ? v : [v]; return this; }
  upsert(v: Ligne | Ligne[], o: { onConflict?: string } = {}) { this.op = "upsert"; this.valeurs = Array.isArray(v) ? v : [v]; this.conflit = o.onConflict; return this; }
  update(p: Ligne) { this.op = "update"; this.patch = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filtres.push((l) => lireChemin(l, c) === v); return this; }
  in(c: string, vs: unknown[]) { this.filtres.push((l) => vs.includes(l[c])); return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.tri = { col, asc: o.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.unique = "maybe"; return this; }
  single() { this.unique = "single"; return this; }

  private projeter(l: Ligne): Ligne {
    if (!this.colonnes || this.colonnes.trim() === "*") return clone(l);
    const o: Ligne = {};
    for (const brut of this.colonnes.split(",").map((c) => c.trim())) {
      const [alias, expr] = brut.includes(":") ? brut.split(":") : [brut, brut];
      o[alias] = clone(lireChemin(l, expr));
    }
    return o;
  }

  private executer(): Res {
    S.appels.push({ table: this.table, op: this.op });
    const cle = `${this.table}:${this.op}`;
    if (S.erreurs.has(cle)) return { data: null, error: { message: "panne", code: "XX000" } };
    let rangs: Ligne[] = [];
    const table = S.base[this.table];
    if (this.op === "select") {
      rangs = table.filter((l) => visible(this.table, l) && this.filtres.every((f) => f(l)));
      if (this.tri) {
        const { col, asc } = this.tri;
        rangs = [...rangs].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (this.max !== null) rangs = rangs.slice(0, this.max);
    } else if (this.op === "update" || this.op === "delete") {
      const cibles = S.muets.has(cle) ? [] : table.filter((l) => visible(this.table, l) && autorise(this.table, l) && this.filtres.every((f) => f(l)));
      for (const l of cibles) {
        if (this.op === "update") Object.assign(l, clone(this.patch));
        else table.splice(table.indexOf(l), 1);
      }
      rangs = cibles;
    } else if (!S.muets.has(cle)) {
      for (const v of this.valeurs) {
        const l: Ligne = { ...clone(v) };
        if (this.table === "projects") {
          l.id = `cccccccc-cccc-4ccc-8ccc-${String(++S.seq).padStart(12, "0")}`;
          l.created_at = `2026-10-12T10:00:${String(S.seq).padStart(2, "0")}.000Z`;
        }
        if (!autorise(this.table, l)) return { data: null, error: { message: "new row violates row-level security policy", code: "42501" } };
        const existant = this.conflit ? table.find((x) => x[this.conflit!] === l[this.conflit!]) : undefined;
        if (existant) {
          if (this.op === "insert") return { data: null, error: { message: "duplicate key", code: "23505" } };
          Object.assign(existant, l);
          rangs.push(existant);
          continue;
        }
        table.push(l);
        rangs.push(l);
      }
    }
    if (this.op !== "select" && this.colonnes === null) return { data: null, error: null };
    const data = rangs.map((l) => this.projeter(l));
    if (this.unique === "maybe") return { data: data[0] ?? null, error: null };
    if (this.unique === "single") return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { message: "single" } };
    return { data, error: null };
  }

  then<A = Res, B = never>(ok?: ((v: Res) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.executer()).then(ok, ko);
  }
}

const clientSession = { from: (t: Table) => new Requete(t) };
const clientAdmin = {
  from: (t: string) => { throw new Error("service role inattendu sur " + t); },
  rpc: (n: string) => { throw new Error("service role inattendu : " + n); },
};

const MOCKS = ["@/lib/features", "@/lib/auth", "@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/ratelimit", "@/lib/audit", "@/lib/i18n/server", "next/navigation"];
let limiteOk = true;

async function charger(plans = true) {
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
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => limiteOk, clientIp: async () => "127.0.0.1" }));
  vi.doMock("@/lib/audit", () => ({
    journaliser: async (type: string, o: { userId?: string | null; payload?: Record<string, unknown> } = {}) => {
      S.journal.push({ type, userId: o.userId, payload: o.payload });
    },
  }));
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => S.locale }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const rien = () => {};
    return { ...m, useRouter: () => ({ push: rien, replace: rien, refresh: rien, back: rien, forward: rien, prefetch: rien }) };
  });
  return {
    route: await import("@/app/api/plans/[id]/estimation/route"),
    estimation: await import("@/lib/plans/estimation"),
    page: (await import("@/app/projets/depuis-plan/[planId]/page")).default,
    LangProvider: (await import("@/components/i18n/LangProvider")).LangProvider,
  };
}

const poster = async (r: Awaited<ReturnType<typeof charger>>["route"], planId: string, corps: unknown = {}) => {
  const req = new Request(`http://localhost/api/plans/${planId}/estimation`, {
    method: "POST",
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
    headers: { "content-type": "application/json" },
  });
  const res = await r.POST(req, { params: Promise.resolve({ id: planId }) });
  const texte = await res.text();
  return { status: res.status, j: texte ? (JSON.parse(texte) as Record<string, unknown>) : null };
};

const ecritures = () => S.appels.filter((a) => a.op !== "select");
const avecCp = (cp: string) => ({ ...clone(CONTRAT), contexte: { ...(CONTRAT.contexte as object), codePostal: cp } });

/** Une estimation de rénovation déjà reliée au plan (créée par un passage précédent). */
function relier(sel: Record<string, unknown>, id = "cccccccc-cccc-4ccc-8ccc-0000000000a1", created_at = "2026-10-01T10:00:00.000Z") {
  S.base.projects.push({
    id, owner_id: PRO.id, nom: "Rénovation — « Maison » · 51 m²", code_postal: "33620", created_at,
    reponses: { v: "estimateur", mode: "detaille", ctx: { surface: 51, type: "Maison" }, sel, codePostal: "33620", custom: [{ id: "x", nom: "Ma ligne" }], statuts: { a: 1 } },
  });
  S.base.project_plans.push({ project_id: id, plan_id: PLAN_RENO, version: "1.18.0", contrat: null, nom: "Maison" });
  return id;
}

beforeEach(() => {
  S.base = {
    floor_plans: [
      { id: PLAN_RENO, owner_id: PRO.id, nom: "Maison de Gradignan", workflow: "renovation", contrat: clone(CONTRAT), revision: 4 },
      { id: PLAN_FINAL, owner_id: PRO.id, nom: "Plan final", workflow: "final_plan", contrat: null, revision: 1 },
      { id: PLAN_AUTRE, owner_id: AUTRE.id, nom: "Pas à toi", workflow: "renovation", contrat: clone(CONTRAT), revision: 1 },
      { id: PLAN_SANS_CONTRAT, owner_id: PRO.id, nom: "Brouillon", workflow: "renovation", contrat: null, revision: 1 },
    ],
    project_plans: [],
    projects: [],
  };
  S.user = PRO;
  S.appels = [];
  S.erreurs = new Set();
  S.muets = new Set();
  S.journal = [];
  S.locale = "fr";
  S.seq = 0;
  limiteOk = true;
});
afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.resetModules();
});

/* ─── Gardes ──────────────────────────────────────────────────────────────── */

describe("POST /api/plans/[id]/estimation · gardes", () => {
  it("interrupteur éteint : 404 sans corps, sans toucher à la base", async () => {
    const { route } = await charger(false);
    const r = await poster(route, PLAN_RENO, { codePostal: "33620" });
    expect(r).toEqual({ status: 404, j: null });
    expect(S.appels).toEqual([]);
  });

  it("sans session → 401 ; gratuit → 403 pro_requis ; rien n'est lu ni écrit", async () => {
    const { route } = await charger();
    S.user = null;
    expect(await poster(route, PLAN_RENO)).toEqual({ status: 401, j: { code: "connexion_requise" } });
    S.user = GRATUIT;
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 403, j: { code: "pro_requis" } });
    expect(S.appels).toEqual([]);
  });

  it("débit dépassé → 429 avant toute lecture", async () => {
    const { route } = await charger();
    limiteOk = false;
    expect((await poster(route, PLAN_RENO, { codePostal: "33620" })).status).toBe(429);
    expect(S.appels).toEqual([]);
  });

  it("plan d'un autre compte, absent ou id invalide → 404 (on ne dit pas s'il existe)", async () => {
    const { route } = await charger();
    for (const id of [PLAN_AUTRE, PLAN_ABSENT, "pas-un-uuid"]) {
      expect(await poster(route, id, { codePostal: "33620" }), id).toEqual({ status: 404, j: { code: "introuvable" } });
    }
    expect(ecritures()).toEqual([]);
  });

  it("Plan final → 400 contrat_workflow ; plan sans contrat → 400 contrat_absent ; contrat cassé → 400", async () => {
    const { route } = await charger();
    expect(await poster(route, PLAN_FINAL, { codePostal: "33620" })).toEqual({ status: 400, j: { code: "contrat_workflow" } });
    expect(await poster(route, PLAN_SANS_CONTRAT, { codePostal: "33620" })).toEqual({ status: 400, j: { code: "contrat_absent" } });
    /* Une ligne « renovation » qui porterait un contrat de Plan final (forgé) : refusée aussi. */
    S.base.floor_plans[0].contrat = clone(CONTRAT_FINAL);
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 400, j: { code: "contrat_workflow" } });
    S.base.floor_plans[0].contrat = { ...clone(CONTRAT), contrat: "2.0.0" };
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 400, j: { code: "contrat_version" } });
    S.base.floor_plans[0].contrat = { pas: "un contrat" };
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 400, j: { code: "contrat_invalide" } });
    expect(ecritures()).toEqual([]);
  });

  it("code postal : obligatoire si le contrat n'en porte pas, 5 chiffres ; corps inconnu → 400", async () => {
    const { route } = await charger();
    expect(await poster(route, PLAN_RENO, {})).toEqual({ status: 400, j: { code: "code_postal" } });
    expect(await poster(route, PLAN_RENO, { codePostal: "3362" })).toEqual({ status: 400, j: { code: "code_postal" } });
    expect(await poster(route, PLAN_RENO, { codePostal: 33620 })).toEqual({ status: 400, j: { code: "code_postal" } });
    expect(await poster(route, PLAN_RENO, "{cassé")).toEqual({ status: 400, j: { code: "invalide" } });
    /* Le client ne peut rien envoyer d'autre : ni contrat, ni sélection, ni contributions. */
    expect(await poster(route, PLAN_RENO, { codePostal: "33620", sel: {} })).toEqual({ status: 400, j: { code: "invalide" } });
    expect(await poster(route, PLAN_RENO, { codePostal: "33620", contrat: CONTRAT })).toEqual({ status: 413, j: { code: "trop_volumineux" } });
    expect(ecritures()).toEqual([]);
  });
});

/* ─── Création ────────────────────────────────────────────────────────────── */

describe("POST /api/plans/[id]/estimation · création", () => {
  it("projet détaillé créé avec le ctx du plan, puis relié (plan_id, cliché du contrat et du rapport)", async () => {
    const { route } = await charger();
    const r = await poster(route, PLAN_RENO, { codePostal: "33620" });
    expect(r.status).toBe(201);
    expect(r.j).toEqual({ projectId: expect.any(String), cree: true });

    expect(S.base.projects).toHaveLength(1);
    const p = S.base.projects[0];
    expect(p.id).toBe(r.j!.projectId);
    expect(p.owner_id).toBe(PRO.id);
    expect(p.nom).toBe("Rénovation — « Maison de Gradignan » · 51 m²");
    expect(p).toMatchObject({ type_bien: "Maison", surface: 51, code_postal: "33620" });
    const rep = p.reponses as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rep).toMatchObject({ v: "estimateur", mode: "detaille", codePostal: "33620" });
    expect(rep.ctx).toMatchObject({ perimetre: "entier", surface: 51, chambres: 2, sejour: 0, sdb: 1, wc: 1, codePostal: "33620" });
    expect(rep.sel).toEqual(REFERENCE.selection);
    expect(JSON.stringify(rep).length).toBeLessThanOrEqual(40_000);

    expect(S.base.project_plans).toHaveLength(1);
    const lien = S.base.project_plans[0];
    expect(lien).toMatchObject({ project_id: p.id, plan_id: PLAN_RENO, version: "1.18.0", nom: "Maison de Gradignan" });
    expect(lien.contrat).toEqual(CONTRAT);
    expect((lien.rapport as { bilan: unknown }).bilan).toEqual(REFERENCE.bilan);
  });

  it("le code postal du contrat suffit ; celui de la requête l'emporte s'il est donné", async () => {
    const { route } = await charger();
    S.base.floor_plans[0].contrat = avecCp("75011");
    expect((await poster(route, PLAN_RENO, {})).status).toBe(201);
    expect(S.base.projects[0].code_postal).toBe("75011");
    expect((await poster(route, PLAN_RENO, { codePostal: "33620", nouvelle: true })).status).toBe(201);
    expect(S.base.projects[1].code_postal).toBe("33620");
  });

  it("le nom suit la langue (clé EN) et reste sous 110 caractères, même pour un long nom de plan", async () => {
    const { route } = await charger();
    S.locale = "en";
    S.base.floor_plans[0].nom = "Très ".repeat(40) + "longue maison";
    expect((await poster(route, PLAN_RENO, { codePostal: "33620" })).status).toBe(201);
    const nom = String(S.base.projects[0].nom);
    expect(nom.startsWith("Renovation — “Très")).toBe(true);
    expect(nom.endsWith("…” · 51 m²")).toBe(true);
    expect(nom.length).toBeLessThanOrEqual(110);
  });

  it("le lien ne peut pas être posé → le projet créé est supprimé, 500 erreur, échec journalisé", async () => {
    const { route } = await charger();
    S.erreurs.add("project_plans:upsert");
    const r = await poster(route, PLAN_RENO, { codePostal: "33620" });
    expect(r).toEqual({ status: 500, j: { code: "erreur" } });
    expect(S.base.projects).toEqual([]);
    expect(S.base.project_plans).toEqual([]);
    expect(S.appels.filter((a) => a.table === "projects").map((a) => a.op)).toEqual(["insert", "delete"]);
    expect(S.journal).toEqual([{ type: "plan_lien_echoue", userId: PRO.id, payload: expect.objectContaining({ etape: "estimation-reno-creer", planId: PLAN_RENO, supprime: true }) }]);
  });

  it("le lien refusé EN SILENCE (0 ligne, sans erreur) est aussi un échec : projet supprimé", async () => {
    const { route } = await charger();
    S.muets.add("project_plans:upsert");
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 500, j: { code: "erreur" } });
    expect(S.base.projects).toEqual([]);
    expect(S.base.project_plans).toEqual([]);
  });

  it("création refusée par la base → 500 erreur, rien d'écrit dans project_plans", async () => {
    const { route } = await charger();
    S.erreurs.add("projects:insert");
    expect(await poster(route, PLAN_RENO, { codePostal: "33620" })).toEqual({ status: 500, j: { code: "erreur" } });
    expect(S.base.project_plans).toEqual([]);
  });

  it("jamais de service role, jamais de message de la base dans la réponse", async () => {
    const { route } = await charger();
    S.erreurs.add("floor_plans:select");
    const r = await poster(route, PLAN_RENO, { codePostal: "33620" });
    expect(r).toEqual({ status: 500, j: { code: "erreur" } });
    expect(JSON.stringify(r.j)).not.toMatch(/panne/);
  });
});

/* ─── Mise à jour ─────────────────────────────────────────────────────────── */

describe("POST /api/plans/[id]/estimation · mise à jour d'une estimation reliée", () => {
  it("D12 : une ligne corrigée à la main (épinglée) n'est pas écrasée ; le reste de reponses est gardé", async () => {
    const { route } = await charger();
    const l = REFERENCE.lignes.find((x) => !x.forfait)!;
    const epinglee = { on: true, qty: 999, manual: true };
    const id = relier({ [l.cle]: epinglee, "Divers|Ma ligne": { on: true, qty: 2 } });

    const r = await poster(route, PLAN_RENO, {});
    expect(r).toEqual({ status: 200, j: { projectId: id, cree: false } });
    expect(S.base.projects).toHaveLength(1);
    const rep = S.base.projects[0].reponses as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rep.sel[l.cle]).toEqual(epinglee);
    expect(rep.sel["Divers|Ma ligne"]).toEqual({ on: true, qty: 2 });
    expect(rep.custom).toEqual([{ id: "x", nom: "Ma ligne" }]);
    expect(rep.statuts).toEqual({ a: 1 });
    expect(rep.ctx).toEqual({ surface: 51, type: "Maison" }); /* le ctx n'est pas touché */
    const autre = REFERENCE.lignes.find((x) => x.cle !== l.cle)!;
    expect(rep.sel[autre.cle]).toEqual(REFERENCE.selection[autre.cle]);

    const lien = S.base.project_plans[0];
    expect(lien.plan_id).toBe(PLAN_RENO);
    expect(lien.contrat).toEqual(CONTRAT);
    expect((lien.rapport as { bilan: { epinglees: number } }).bilan.epinglees).toBe(1);
  });

  it("projetId choisit l'estimation ; sans lui, la plus récente ; un projet non relié à CE plan → 404", async () => {
    const { route } = await charger();
    const ancien = relier({}, "cccccccc-cccc-4ccc-8ccc-0000000000a1", "2026-10-01T10:00:00.000Z");
    const recent = relier({}, "cccccccc-cccc-4ccc-8ccc-0000000000a2", "2026-10-05T10:00:00.000Z");
    expect((await poster(route, PLAN_RENO, {})).j).toEqual({ projectId: recent, cree: false });
    expect((await poster(route, PLAN_RENO, { projetId: ancien })).j).toEqual({ projectId: ancien, cree: false });
    /* Un projet du compte, mais pas relié à ce plan. */
    S.base.projects.push({ id: "cccccccc-cccc-4ccc-8ccc-0000000000a3", owner_id: PRO.id, nom: "Autre", created_at: "2026-10-06", reponses: { sel: {} } });
    expect(await poster(route, PLAN_RENO, { projetId: "cccccccc-cccc-4ccc-8ccc-0000000000a3" })).toEqual({ status: 404, j: { code: "introuvable" } });
    expect(S.base.projects.find((p) => p.id === "cccccccc-cccc-4ccc-8ccc-0000000000a3")!.reponses).toEqual({ sel: {} });
  });

  it("nouvelle : une estimation de plus, reliée au même plan", async () => {
    const { route } = await charger();
    relier({});
    const r = await poster(route, PLAN_RENO, { codePostal: "33620", nouvelle: true });
    expect(r.status).toBe(201);
    expect(S.base.project_plans.filter((l) => l.plan_id === PLAN_RENO)).toHaveLength(2);
  });

  it("update à 0 ligne (refus RLS silencieux) → 500 erreur, jamais ok ; le lien n'est pas touché", async () => {
    const { route } = await charger();
    relier({});
    S.muets.add("projects:update");
    expect(await poster(route, PLAN_RENO, {})).toEqual({ status: 500, j: { code: "erreur" } });
    expect(S.appels.some((a) => a.table === "project_plans" && a.op === "upsert")).toBe(false);
    expect(S.base.project_plans[0].contrat).toBeNull();
  });

  it("lien en échec après la mise à jour → la sélection d'avant revient, 500 erreur", async () => {
    const { route } = await charger();
    const avant = { "Divers|Ma ligne": { on: true, qty: 2 } };
    relier(avant);
    S.erreurs.add("project_plans:upsert");
    expect(await poster(route, PLAN_RENO, {})).toEqual({ status: 500, j: { code: "erreur" } });
    expect((S.base.projects[0].reponses as { sel: unknown }).sel).toEqual(avant);
    expect(S.journal.map((j) => j.payload?.etape)).toEqual(["estimation-reno-maj"]);
  });
});

/* ─── preparer : rien n'est écrit ─────────────────────────────────────────── */

describe("preparer", () => {
  it("rend le rapport, le ctx proposé et le besoin d'un code postal, sans aucune écriture", async () => {
    const { estimation } = await charger();
    const sb = clientSession as never;
    const p = await estimation.preparer(sb, PLAN_RENO);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.plan).toEqual({ id: PLAN_RENO, nom: "Maison de Gradignan" });
    expect(p.bilan).toEqual(REFERENCE.bilan);
    expect(p.manqueCodePostal).toBe(true);
    expect(p.ctxPropose).toMatchObject({ surface: 51, perimetre: "entier" });
    expect(ecritures()).toEqual([]);

    S.base.floor_plans[0].contrat = avecCp("33620");
    const q = await estimation.preparer(sb, PLAN_RENO);
    expect(q.ok && q.manqueCodePostal).toBe(false);
  });

  it("sur une estimation reliée : l'injection est rejouée sur SA sélection (épinglée signalée)", async () => {
    const { estimation } = await charger();
    const l = REFERENCE.lignes.find((x) => !x.forfait)!;
    relier({ [l.cle]: { on: true, qty: 999, manual: true } });
    const sb = clientSession as never;
    const choix = await estimation.choisirProjet(sb, PLAN_RENO);
    expect(choix.ok && choix.projet?.id).toBe("cccccccc-cccc-4ccc-8ccc-0000000000a1");
    const p = await estimation.preparer(sb, PLAN_RENO, choix.ok ? choix.projet : null);
    expect(p.ok && p.bilan.epinglees).toBe(1);
    expect(p.ok && p.manqueCodePostal).toBe(false);
    expect(ecritures()).toEqual([]);
  });
});

/* ─── La page ─────────────────────────────────────────────────────────────── */

async function rendre(LangProvider: (p: { locale: "fr" | "en"; children: ReactNode }) => ReactNode, el: ReactNode, locale: "fr" | "en" = "fr") {
  const { prelude } = await prerender(createElement(LangProvider as never, { locale, children: el }));
  return await new Response(prelude).text();
}
const digest = async (f: () => Promise<unknown>) => {
  try {
    await f();
    return null;
  } catch (e) {
    return String((e as { digest?: string }).digest ?? e);
  }
};
const props = (planId: string, sp: Record<string, string> = {}) => ({ params: Promise.resolve({ planId }), searchParams: Promise.resolve(sp) });

describe("/projets/depuis-plan/[planId]", () => {
  it("interrupteur éteint → 404 ; sans session → connexion ; gratuit → Tarifs ; id invalide → 404", async () => {
    let m = await charger(false);
    expect(await digest(() => m.page(props(PLAN_RENO)))).toMatch(/NEXT_HTTP_ERROR_FALLBACK;404/);
    m = await charger(true);
    S.user = null;
    expect(await digest(() => m.page(props(PLAN_RENO)))).toMatch(/NEXT_REDIRECT;replace;\/connexion\?next=%2Fprojets%2Fdepuis-plan%2F/);
    S.user = GRATUIT;
    expect(await digest(() => m.page(props(PLAN_RENO)))).toMatch(/NEXT_REDIRECT;replace;\/tarifs\?source=editeur-plan;/);
    S.user = PRO;
    expect(await digest(() => m.page(props("nope")))).toMatch(/404/);
    expect(await digest(() => m.page(props(PLAN_AUTRE)))).toMatch(/404/);
    expect(ecritures()).toEqual([]);
  });

  it("Pro : le bien repris, le code postal demandé, l'écran de validation ; FR et EN ; rien d'écrit", async () => {
    const m = await charger();
    const fr = await rendre(m.LangProvider, await m.page(props(PLAN_RENO)));
    expect(fr).toContain("Crée l&#x27;estimation de ton plan");
    expect(fr).toContain("Le bien, repris de ton plan");
    expect(fr).toContain("Code postal du bien");
    expect(fr).toContain("Vérifie ce que le plan a rempli");
    expect(fr).toContain("J&#x27;ai vérifié, continuer vers le détail");
    expect(fr).toContain(`href="/plan?id=${PLAN_RENO}"`);
    expect(fr).not.toMatch(/\p{Extended_Pictographic}/u);

    S.locale = "en";
    const m2 = await charger();
    const en = await rendre(m2.LangProvider, await m2.page(props(PLAN_RENO)), "en");
    expect(en).toContain("Create your plan&#x27;s estimate");
    expect(en).toContain("Check what the plan filled in");
    expect(en).toContain("I&#x27;ve checked, continue to the detail");
    expect(en).not.toContain("Vérifie");
    expect(ecritures()).toEqual([]);
  });

  it("estimation reliée : titre de mise à jour, lien « nouvelle », pas de code postal demandé", async () => {
    const m = await charger();
    relier({});
    const html = await rendre(m.LangProvider, await m.page(props(PLAN_RENO)));
    expect(html).toContain("Mets à jour l&#x27;estimation de ton plan");
    expect(html).toContain(`/projets/depuis-plan/${PLAN_RENO}?nouvelle=1`);
    expect(html).not.toContain("Code postal du bien");
    const nouvelle = await rendre(m.LangProvider, await m.page(props(PLAN_RENO, { nouvelle: "1" })));
    expect(nouvelle).toContain("Crée l&#x27;estimation de ton plan");
  });

  it("plan sans contrat ou Plan final : le message et « Ouvrir le plan », sans écran de validation", async () => {
    const m = await charger();
    const sans = await rendre(m.LangProvider, await m.page(props(PLAN_SANS_CONTRAT)));
    expect(sans).toContain("pas encore été envoyé vers l&#x27;estimation");
    expect(sans).not.toContain("Vérifie ce que le plan a rempli");
    const final = await rendre(m.LangProvider, await m.page(props(PLAN_FINAL)));
    expect(final).toContain("Ce plan est un Plan final");
  });
});

/* ─── Les anciennes routes ────────────────────────────────────────────────── */

describe("anciennes routes et ancien composant", () => {
  it("/api/projects/[id]/plan, /appliquer et ImporterPlan n'existent plus ; plus aucune référence", () => {
    expect(existsSync(path.join(RACINE, "app/api/projects/[id]/plan/route.ts"))).toBe(false);
    expect(existsSync(path.join(RACINE, "app/api/projects/[id]/plan/appliquer/route.ts"))).toBe(false);
    expect(existsSync(path.join(RACINE, "components/ImporterPlan.tsx"))).toBe(false);
    const fiche = readFileSync(path.join(RACINE, "app/projets/[id]/page.tsx"), "utf8");
    expect(fiche).not.toMatch(/ImporterPlan/);
  });
});
