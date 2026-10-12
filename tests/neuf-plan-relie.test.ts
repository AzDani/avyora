/**
 * « Mes plans », chantier C6 : une estimation de construction neuve née d'un Plan final est reliée à
 * son plan (`project_plans.plan_id`).
 *
 *  - `contexteNeuf` lit `pid` / `pl` seulement interrupteur allumé, et ignore tout ce qui est mal formé ;
 *  - le brouillon garde les identifiants bien formés et retire les autres ;
 *  - `POST /api/projects` relie après la création, sous RLS, sans jamais faire échouer l'enregistrement ;
 *  - `relierEstimationsOrphelines` (reprise d'un plan local) ne touche que des projets sans lien.
 *
 * Supabase est SIMULÉ en mémoire (RLS de 0001 et 0004 reproduite pour la session) : aucune base réelle
 * n'est touchée, aucun compte n'est créé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { presetNeuf, type RapideNeufInput } from "@/lib/estimateur";
import { brouillonRapideNeuf, corpsProjetNeuf, lireBrouillonNeuf, type OrigineNeuf } from "@/lib/estimateur/brouillon-neuf";
import { repriseDepuisGraine, enregistrementDetailNeuf } from "@/lib/estimateur/detaille-neuf";
import { nettoyerOrigine, origineDuPlan } from "@/lib/plans/origine";

/* ─── Données ─────────────────────────────────────────────────────────────── */

const ETAT_FINAL = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "plans-etats", "plan-final-etage.json"), "utf8"));

type User = { id: string; email: string; app_metadata: Record<string, unknown> };
const MOI: User = { id: "11111111-1111-4111-8111-111111111111", email: "camille@exemple.fr", app_metadata: {} };
const AUTRE: User = { id: "33333333-3333-4333-8333-333333333333", email: "sam@exemple.fr", app_metadata: {} };

const PLAN_MOI = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const PLAN_AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-000000000002";
const LOCAL_MOI = "k3x9a1q";

const R: RapideNeufInput = { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" };
const P = presetNeuf(R);
/** Le corps exact que le rapide neuf (ou `ClaimDraft`) envoie à `POST /api/projects`. */
const corpsNeuf = (origine?: OrigineNeuf) => corpsProjetNeuf(brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel, origine }));
const corpsReno = (origine?: unknown) => ({
  nom: "Rénovation", typeBien: "Maison", surface: 80, codePostal: "45000",
  reponses: { v: "estimateur", mode: "rapide", ctx: { nature: "renovation", surface: 80 }, sel: {}, ...(origine ? { origine } : {}) },
});

/* ─── Supabase simulé ─────────────────────────────────────────────────────── */

type Ligne = Record<string, unknown>;
type Base = { floor_plans: Ligne[]; project_plans: Ligne[]; projects: Ligne[] };
type Appel = { table: string; op: string; filtres: string[] };

const S = {
  base: { floor_plans: [], project_plans: [], projects: [] } as Base,
  user: null as User | null,
  appels: [] as Appel[],
  /** Tables en panne (erreur Postgres sur toute requête). */
  panne: new Set<string>(),
  seq: 0,
  journal: [] as { type: string; payload?: Record<string, unknown> }[],
};
const nouvelId = (prefixe = "aaaaaaaa-aaaa-4aaa-8aaa-") => `${prefixe}${String(++S.seq).padStart(12, "0")}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function lireChemin(l: Ligne, expr: string): unknown {
  const parts = expr.split(/->>?/);
  let v: unknown = l[parts[0]];
  for (const k of parts.slice(1)) v = v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
  return v ?? null;
}

/** RLS de lecture (0001 : projects au propriétaire ; 0004 : floor_plans au propriétaire, project_plans au projet). */
function visible(table: keyof Base, l: Ligne): boolean {
  const uid = S.user?.id;
  if (!uid) return false;
  if (table === "project_plans") return S.base.projects.some((p) => p.id === l.project_id && p.owner_id === uid);
  return l.owner_id === uid;
}

/** `with check` des écritures de la session. */
function autorise(table: keyof Base, l: Ligne): boolean {
  const uid = S.user?.id;
  if (!uid) return false;
  if (table === "projects") return l.owner_id === uid;
  if (table === "project_plans") {
    const projet = S.base.projects.some((p) => p.id === l.project_id && p.owner_id === uid);
    const plan = l.plan_id == null || S.base.floor_plans.some((f) => f.id === l.plan_id && f.owner_id === uid);
    return projet && plan;
  }
  return false; /* floor_plans : aucune politique INSERT */
}

class Requete implements PromiseLike<{ data: unknown; error: unknown }> {
  private op: "select" | "insert" | "upsert" = "select";
  private colonnes: string | null = null;
  private filtres: Array<(l: Ligne) => boolean> = [];
  private noms: string[] = [];
  private valeurs: Ligne[] = [];
  private conflit: { col?: string; ignorer?: boolean } = {};
  private unique: "maybe" | "single" | null = null;
  private max: number | null = null;
  constructor(private table: keyof Base) {}

  select(c = "*") { this.colonnes = c; return this; }
  insert(v: Ligne | Ligne[]) { this.op = "insert"; this.valeurs = Array.isArray(v) ? v : [v]; return this; }
  upsert(v: Ligne | Ligne[], o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert"; this.valeurs = Array.isArray(v) ? v : [v]; this.conflit = { col: o.onConflict, ignorer: o.ignoreDuplicates }; return this;
  }
  eq(c: string, v: unknown) { this.filtres.push((l) => lireChemin(l, c) === v); this.noms.push(`${c}=${String(v)}`); return this; }
  in(c: string, vs: unknown[]) { this.filtres.push((l) => vs.includes(l[c])); this.noms.push(`${c} in`); return this; }
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

  private executer(): { data: unknown; error: unknown } {
    S.appels.push({ table: this.table, op: this.op, filtres: [...this.noms] });
    if (S.panne.has(this.table)) return { data: null, error: { message: "panne", code: "XX000" } };
    let rangs: Ligne[];
    if (this.op === "select") {
      rangs = S.base[this.table].filter((l) => visible(this.table, l) && this.filtres.every((f) => f(l)));
      if (this.max !== null) rangs = rangs.slice(0, this.max);
    } else {
      rangs = [];
      for (const v of this.valeurs) {
        const l: Ligne = { ...clone(v) };
        if (this.table === "projects") { l.id = nouvelId("cccccccc-cccc-4ccc-8ccc-"); l.archived = false; }
        if (!autorise(this.table, l)) return { data: null, error: { message: "new row violates row-level security policy", code: "42501" } };
        const col = this.conflit.col;
        const existant = col ? S.base[this.table].find((x) => x[col] === l[col]) : undefined;
        if (existant) {
          if (this.op === "insert" || !this.conflit.ignorer) return { data: null, error: { message: "duplicate key", code: "23505" } };
          continue; /* ON CONFLICT DO NOTHING : rien n'est rendu */
        }
        if (this.table === "project_plans" && S.base.project_plans.some((x) => x.project_id === l.project_id)) {
          return { data: null, error: { message: "duplicate key project_plans_project_key", code: "23505" } };
        }
        S.base[this.table].push(l);
        rangs.push(l);
      }
    }
    if (this.op !== "select" && this.colonnes === null) return { data: null, error: null };
    const data = rangs.map((l) => this.projeter(l));
    if (this.unique === "maybe") return { data: data[0] ?? null, error: null };
    if (this.unique === "single") return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { message: "single" } };
    return { data, error: null };
  }

  then<A = { data: unknown; error: unknown }, B = never>(
    ok?: ((v: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null,
    ko?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.executer()).then(ok, ko);
  }
}

const clientSession = { from: (t: keyof Base) => new Requete(t) };

/** `floor_plans_creer` (service role), réduite à ce dont la reprise a besoin : un plan par editeur_id. */
const clientAdmin = {
  rpc: async (nom: string, a: Record<string, unknown>) => {
    if (nom !== "floor_plans_creer") throw new Error("rpc inattendue " + nom);
    S.appels.push({ table: "rpc", op: nom, filtres: [] });
    const deja = S.base.floor_plans.find((f) => f.owner_id === a.p_owner && a.p_editeur_id != null && f.editeur_id === a.p_editeur_id);
    if (deja) return { data: [{ plan_id: deja.id, plan_revision: deja.revision, deja: true }], error: null };
    const l: Ligne = { id: nouvelId("bbbbbbbb-bbbb-4bbb-8bbb-"), owner_id: a.p_owner, nom: a.p_nom, workflow: a.p_workflow, editeur_id: a.p_editeur_id ?? null, revision: 1 };
    S.base.floor_plans.push(l);
    return { data: [{ plan_id: l.id, plan_revision: 1, deja: false }], error: null };
  },
  from: (t: string) => { throw new Error("service role inattendu sur " + t); },
};

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
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true, clientIp: async () => "127.0.0.1" }));
  vi.doMock("@/lib/audit", () => ({
    journaliser: async (type: string, o: { payload?: Record<string, unknown> } = {}) => { S.journal.push({ type, payload: o.payload }); },
  }));
  return {
    projets: await import("@/app/api/projects/route"),
    plans: await import("@/app/api/plans/route"),
    relier: await import("@/lib/plans/relier"),
    ctx: await import("@/lib/neuf-contexte"),
  };
}

const post = (url: string, b: unknown) => new Request(url, { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
const postProjet = (b: unknown) => post("http://localhost/api/projects", b);
const appelsLiens = () => S.appels.filter((a) => a.table === "project_plans" || a.table === "floor_plans");

beforeEach(() => {
  S.base = {
    floor_plans: [
      { id: PLAN_MOI, owner_id: MOI.id, nom: "Maison des Pins", workflow: "final_plan", editeur_id: null, revision: 3 },
      { id: PLAN_AUTRE, owner_id: AUTRE.id, nom: "Pas à toi", workflow: "final_plan", editeur_id: LOCAL_MOI, revision: 1 },
    ],
    project_plans: [],
    projects: [],
  };
  S.user = MOI;
  S.appels = [];
  S.panne = new Set();
  S.seq = 0;
  S.journal = [];
});
afterEach(() => {
  for (const m of ["@/lib/features", "@/lib/auth", "@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/ratelimit", "@/lib/audit"]) vi.doUnmock(m);
  vi.resetModules();
});

/* ─── contexteNeuf ───────────────────────────────────────────────────────── */

describe("contexteNeuf : pid et pl", () => {
  it("interrupteur allumé : pid valide → planId, pl valide → planLocal ; invalides → absents", async () => {
    const { ctx } = await charger(true);
    expect(ctx.contexteNeuf({ source: "editeur-plan", pid: PLAN_MOI })).toMatchObject({ src: "plan", planId: PLAN_MOI });
    expect(ctx.contexteNeuf({ pid: PLAN_MOI.toUpperCase() }).planId).toBe(PLAN_MOI);
    expect(ctx.contexteNeuf({ pl: LOCAL_MOI }).planLocal).toBe(LOCAL_MOI);
    for (const pid of ["pas-un-uuid", "", "bbbbbbbb-bbbb-4bbb-8bbb-00000000000", `${PLAN_MOI}'`]) {
      expect("planId" in ctx.contexteNeuf({ pid })).toBe(false);
    }
    for (const pl of ["ABC", "a-b", "x".repeat(25), "", "k3x9a1q<"]) {
      expect("planLocal" in ctx.contexteNeuf({ pl })).toBe(false);
    }
    expect(ctx.contexteNeuf({ pid: [PLAN_MOI, PLAN_AUTRE] }).planId).toBe(PLAN_MOI);
  });

  it("interrupteur éteint : jamais de planId ni de planLocal, le reste identique", async () => {
    const { ctx } = await charger(false);
    const c = ctx.contexteNeuf({ cp: "45000", surface: "120", niveaux: "etage", source: "editeur-plan", pid: PLAN_MOI, pl: LOCAL_MOI });
    expect(c).toEqual({ cp: "45000", surface: 120, niveaux: "etage", src: "plan" });
    expect(Object.keys(c).sort()).toEqual(["cp", "niveaux", "src", "surface"]);
  });
});

/* ─── Brouillon et origine ───────────────────────────────────────────────── */

describe("brouillon : origine conservée et nettoyée", () => {
  it("les identifiants bien formés survivent à l'aller-retour et partent dans le corps du POST", () => {
    const origine: OrigineNeuf = { source: "plan", contrat: "1.18.4", planId: PLAN_MOI, planLocal: LOCAL_MOI };
    const relu = lireBrouillonNeuf(JSON.stringify(brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel, origine })))!;
    expect(relu.origine).toEqual(origine);
    expect(corpsProjetNeuf(relu).reponses.origine).toEqual(origine);
  });

  it("les identifiants mal formés sont retirés ; une origine qui n'est pas « plan » disparaît", () => {
    const sale = { source: "plan", contrat: "1.18.4", planId: "x' or 1=1", planLocal: "<img>", autre: "?" };
    const relu = lireBrouillonNeuf(JSON.stringify({ ...brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel }), origine: sale }))!;
    expect(relu.origine).toEqual({ source: "plan", contrat: "1.18.4" });
    const autre = lireBrouillonNeuf(JSON.stringify({ ...brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel }), origine: { source: "pirate", planId: PLAN_MOI } }))!;
    expect(autre.origine).toBeUndefined();
    expect(nettoyerOrigine(null)).toBeUndefined();
    expect(nettoyerOrigine([{ source: "plan" }])).toBeUndefined();
    expect(nettoyerOrigine({ source: "plan", contrat: "x".repeat(17) })).toEqual({ source: "plan" });
  });

  it("« Affiner » (détaillé Pro) : la graine garde l'origine, le second projet sera relié aussi", () => {
    const origine: OrigineNeuf = { source: "plan", contrat: "1.18.4", planId: PLAN_MOI };
    const graine = JSON.stringify(brouillonRapideNeuf({ R, ctx: P.ctx, sel: P.sel, origine }));
    const reprise = repriseDepuisGraine(graine)!;
    const { corps } = enregistrementDetailNeuf(reprise.etat, { custom: reprise.custom, origine: reprise.origine, locale: "fr" });
    expect(corps.reponses.origine).toEqual(origine);
    expect(origineDuPlan(corps.reponses)).toEqual({ contrat: "1.18.4", planId: PLAN_MOI });
  });

  it("origineDuPlan : un projet neuf, source « plan », au moins un identifiant", () => {
    expect(origineDuPlan(corpsNeuf({ source: "plan", contrat: "1.18.4", planId: PLAN_MOI }).reponses)).toEqual({ contrat: "1.18.4", planId: PLAN_MOI });
    expect(origineDuPlan(corpsNeuf({ source: "plan", contrat: "1.18.4" }).reponses)).toBeNull();
    expect(origineDuPlan(corpsNeuf().reponses)).toBeNull();
    expect(origineDuPlan(corpsReno({ source: "plan", planId: PLAN_MOI }).reponses)).toBeNull();
    expect(origineDuPlan(corpsNeuf({ source: "plan", contrat: "pas une version", planLocal: LOCAL_MOI }).reponses)).toEqual({ planLocal: LOCAL_MOI });
    expect(origineDuPlan(null)).toBeNull();
  });
});

/* ─── POST /api/projects ─────────────────────────────────────────────────── */

describe("POST /api/projects : le lien au plan", () => {
  it("sans origine (ou rénovation) : projet créé, AUCUNE requête project_plans ni floor_plans", async () => {
    const { projets } = await charger(true);
    expect((await projets.POST(postProjet(corpsNeuf()))).status).toBe(200);
    expect((await projets.POST(postProjet(corpsNeuf({ source: "plan", contrat: "1.18.4" })))).status).toBe(200);
    expect((await projets.POST(postProjet(corpsReno({ source: "plan", planId: PLAN_MOI })))).status).toBe(200);
    expect(S.base.projects).toHaveLength(3);
    expect(appelsLiens()).toEqual([]);
  });

  it("interrupteur éteint : planId ignoré, aucune requête de lien", async () => {
    const { projets } = await charger(false);
    const rep = await projets.POST(postProjet(corpsNeuf({ source: "plan", planId: PLAN_MOI })));
    expect(rep.status).toBe(200);
    expect(appelsLiens()).toEqual([]);
    expect(S.base.project_plans).toEqual([]);
  });

  it("plan du compte (pid) : le projet est relié, avec la version du contrat et le nom du plan", async () => {
    const { projets } = await charger(true);
    const rep = await projets.POST(postProjet(corpsNeuf({ source: "plan", contrat: "1.18.4", planId: PLAN_MOI })));
    const { id } = (await rep.json()) as { id: string };
    expect(rep.status).toBe(200);
    expect(S.base.project_plans).toEqual([{ project_id: id, plan_id: PLAN_MOI, version: "1.18.4", contrat: null, nom: "Maison des Pins" }]);
  });

  it("plan de l'appareil (pl) déjà dans le compte : relié par editeur_id ; sans contrat, version par défaut", async () => {
    S.base.floor_plans[0].editeur_id = LOCAL_MOI;
    const { projets } = await charger(true);
    await projets.POST(postProjet(corpsNeuf({ source: "plan", planLocal: LOCAL_MOI })));
    expect(S.base.project_plans).toHaveLength(1);
    expect(S.base.project_plans[0]).toMatchObject({ plan_id: PLAN_MOI, version: "1.18.0" });
  });

  it("planId d'un autre compte : 0 ligne, projet créé quand même, 200", async () => {
    const { projets } = await charger(true);
    const rep = await projets.POST(postProjet(corpsNeuf({ source: "plan", planId: PLAN_AUTRE, planLocal: LOCAL_MOI })));
    expect(rep.status).toBe(200);
    expect(S.base.projects).toHaveLength(1);
    expect(S.base.project_plans).toEqual([]);
    /* Le plan d'autrui n'a pas été « vu » (RLS), ni par son uuid ni par son id local. */
    expect(S.appels.filter((a) => a.table === "project_plans")).toEqual([]);
    expect(S.journal).toEqual([]);
  });

  it("plan local pas encore repris : rien n'est relié (la reprise s'en chargera)", async () => {
    const { projets } = await charger(true);
    expect((await projets.POST(postProjet(corpsNeuf({ source: "plan", planLocal: "zz9" })))).status).toBe(200);
    expect(S.base.project_plans).toEqual([]);
  });

  it("panne de project_plans : le projet reste créé (200), l'échec est journalisé sans détail interne", async () => {
    S.panne.add("project_plans");
    const { projets } = await charger(true);
    const rep = await projets.POST(postProjet(corpsNeuf({ source: "plan", planId: PLAN_MOI })));
    expect(rep.status).toBe(200);
    expect(S.base.projects).toHaveLength(1);
    expect(S.journal).toHaveLength(1);
    expect(S.journal[0].type).toBe("plan_lien_echoue");
    expect(JSON.stringify(S.journal[0])).not.toContain("panne");
  });

  it("panne de floor_plans : idem, jamais d'exception", async () => {
    S.panne.add("floor_plans");
    const { projets } = await charger(true);
    expect((await projets.POST(postProjet(corpsNeuf({ source: "plan", planId: PLAN_MOI })))).status).toBe(200);
    expect(S.journal.map((j) => j.type)).toEqual(["plan_lien_echoue"]);
  });

  it("sans session : 401, rien n'est lu", async () => {
    S.user = null;
    const { projets } = await charger(true);
    expect((await projets.POST(postProjet(corpsNeuf({ source: "plan", planId: PLAN_MOI })))).status).toBe(401);
    expect(appelsLiens()).toEqual([]);
  });
});

/* ─── relierAuPlan / relierEstimationsOrphelines ─────────────────────────── */

describe("relierAuPlan", () => {
  it("un lien existant n'est jamais remplacé", async () => {
    const { relier } = await charger(true);
    S.base.floor_plans.push({ id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000009", owner_id: MOI.id, nom: "Autre plan", editeur_id: null });
    S.base.projects.push({ id: "cccccccc-cccc-4ccc-8ccc-000000000001", owner_id: MOI.id, reponses: {} });
    S.base.project_plans.push({ project_id: "cccccccc-cccc-4ccc-8ccc-000000000001", plan_id: PLAN_MOI, version: "1.18.0" });
    const ok = await relier.relierAuPlan(clientSession as never, "cccccccc-cccc-4ccc-8ccc-000000000001", { planId: "bbbbbbbb-bbbb-4bbb-8bbb-000000000009" });
    expect(ok).toBe(false);
    expect(S.base.project_plans).toEqual([{ project_id: "cccccccc-cccc-4ccc-8ccc-000000000001", plan_id: PLAN_MOI, version: "1.18.0" }]);
  });
});

describe("relierEstimationsOrphelines", () => {
  const projetNeuf = (id: string, owner: string, origine?: Record<string, unknown>) =>
    ({ id, owner_id: owner, reponses: { v: "estimateur", ctx: { nature: "neuf" }, ...(origine ? { origine } : {}) } });

  it("relie seulement les projets de l'utilisateur, nés de ce plan local, sans lien", async () => {
    const { relier } = await charger(true);
    S.base.projects.push(
      projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000001", MOI.id, { source: "plan", contrat: "1.18.4", planLocal: LOCAL_MOI }), /* orphelin → relié */
      projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000002", MOI.id, { source: "plan", planLocal: LOCAL_MOI }), /* déjà relié → intact */
      projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000003", MOI.id, { source: "plan", planLocal: "autre1" }), /* autre plan local */
      projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000004", MOI.id), /* sans origine */
      projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000005", AUTRE.id, { source: "plan", planLocal: LOCAL_MOI }), /* autre compte */
      { id: "cccccccc-cccc-4ccc-8ccc-000000000006", owner_id: MOI.id, reponses: { ctx: { nature: "renovation" }, origine: { source: "plan", planLocal: LOCAL_MOI } } },
    );
    const avant = { project_id: "cccccccc-cccc-4ccc-8ccc-000000000002", plan_id: null, version: "1.18.0" };
    S.base.project_plans.push(clone(avant));

    const n = await relier.relierEstimationsOrphelines(clientSession as never, MOI.id, PLAN_MOI, LOCAL_MOI);
    expect(n).toBe(1);
    expect(S.base.project_plans).toEqual([
      avant,
      { project_id: "cccccccc-cccc-4ccc-8ccc-000000000001", plan_id: PLAN_MOI, version: "1.18.4", contrat: null, nom: "Maison des Pins" },
    ]);
    /* Deuxième passage : plus rien à relier. */
    expect(await relier.relierEstimationsOrphelines(clientSession as never, MOI.id, PLAN_MOI, LOCAL_MOI)).toBe(0);
  });

  it("plan d'un autre compte ou id local invalide : 0, rien n'est écrit", async () => {
    const { relier } = await charger(true);
    S.base.projects.push(projetNeuf("cccccccc-cccc-4ccc-8ccc-000000000001", MOI.id, { source: "plan", planLocal: LOCAL_MOI }));
    expect(await relier.relierEstimationsOrphelines(clientSession as never, MOI.id, PLAN_AUTRE, LOCAL_MOI)).toBe(0);
    expect(await relier.relierEstimationsOrphelines(clientSession as never, MOI.id, PLAN_MOI, "A-B")).toBe(0);
    expect(S.base.project_plans).toEqual([]);
  });

  it("POST /api/plans avec editeurId : l'estimation réclamée AVANT le plan est reliée à la reprise", async () => {
    const { projets, plans } = await charger(true);
    /* 1. inscription : ClaimDraft envoie le brouillon neuf (plan local pas encore dans le compte). */
    const rep = await projets.POST(postProjet(corpsNeuf({ source: "plan", contrat: "1.18.4", planLocal: "p7q2" })));
    const { id } = (await rep.json()) as { id: string };
    expect(S.base.project_plans).toEqual([]);
    /* 2. la reprise du plan local. */
    const cree = await plans.POST(post("http://localhost/api/plans", { nom: "Ma maison", etat: ETAT_FINAL, editeurId: "p7q2" }));
    expect(cree.status).toBe(201);
    const { id: planId } = (await cree.json()) as { id: string };
    expect(S.base.project_plans).toEqual([{ project_id: id, plan_id: planId, version: "1.18.4", contrat: null, nom: "Ma maison" }]);
  });

  it("POST /api/plans sans editeurId : aucune requête project_plans", async () => {
    const { plans } = await charger(true);
    expect((await plans.POST(post("http://localhost/api/plans", { nom: "Neuf", etat: ETAT_FINAL }))).status).toBe(201);
    expect(S.appels.filter((a) => a.table === "project_plans" || a.table === "projects")).toEqual([]);
  });
});
