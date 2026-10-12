import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Test d'INTÉGRATION de la tenancy (Row-Level Security) contre un Supabase de TEST.
 * Prouve qu'un utilisateur ne peut ni voir ni modifier les projets d'un autre, et qu'un anonyme
 * ne voit aucun projet. Crée puis supprime ses propres comptes de test (auto-nettoyant).
 *
 * Il crée des comptes : il ne tourne JAMAIS sur la base de production. Il ne lit donc pas
 * `.env.local` (qui porte les clés de production) et n'est lancé que si les trois variables
 * d'un projet Supabase de test sont posées dans l'environnement :
 *   RLS_TEST_SUPABASE_URL, RLS_TEST_SUPABASE_ANON_KEY, RLS_TEST_SUPABASE_SERVICE_ROLE_KEY
 * Sans elles, il est ignoré (cas de `npx vitest run` en local et en CI).
 */
const URL = process.env.RLS_TEST_SUPABASE_URL;
const ANON = process.env.RLS_TEST_SUPABASE_ANON_KEY;
const SERVICE = process.env.RLS_TEST_SUPABASE_SERVICE_ROLE_KEY;
const PROD = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dispo = Boolean(URL && ANON && SERVICE) && URL !== PROD;

/** Clients créés dans beforeAll : le corps d'un describe ignoré est quand même exécuté à la collecte. */
const client = (cle: string) => createClient(URL!, cle, { auth: { persistSession: false } });

describe.skipIf(!dispo)("RLS — étanchéité multi-tenant", () => {
  let admin: SupabaseClient;
  const suffixe = Date.now();
  const emailA = `zz-rls-a-${suffixe}@avyora.local`;
  const emailB = `zz-rls-b-${suffixe}@avyora.local`;
  const MDP = "TestRls-123456";
  let idA = "", idB = "", projetA = "";
  let clientB: SupabaseClient, anon: SupabaseClient;

  beforeAll(async () => {
    admin = client(SERVICE!);
    const a = await admin.auth.admin.createUser({ email: emailA, password: MDP, email_confirm: true });
    const b = await admin.auth.admin.createUser({ email: emailB, password: MDP, email_confirm: true });
    idA = a.data.user!.id;
    idB = b.data.user!.id;
    const p = await admin.from("projects").insert({
      owner_id: idA, nom: "RLS Secret A", type_bien: "maison", surface: 100, code_postal: "33000", reponses: {},
    }).select("id").single();
    projetA = p.data!.id as string;

    clientB = client(ANON!);
    await clientB.auth.signInWithPassword({ email: emailB, password: MDP });
    anon = client(ANON!);
  });

  afterAll(async () => {
    if (idA) await admin.auth.admin.deleteUser(idA); // cascade supprime le projet
    if (idB) await admin.auth.admin.deleteUser(idB);
  });

  it("l'utilisateur B ne voit PAS le projet de A", async () => {
    const { data } = await clientB.from("projects").select("id");
    expect((data ?? []).some((p) => p.id === projetA)).toBe(false);
  });

  it("l'utilisateur B ne peut pas lire le projet de A par son id", async () => {
    const { data } = await clientB.from("projects").select("*").eq("id", projetA).maybeSingle();
    expect(data).toBeNull();
  });

  it("l'utilisateur B ne peut pas modifier le projet de A", async () => {
    await clientB.from("projects").update({ nom: "PIRATÉ" }).eq("id", projetA);
    const { data } = await admin.from("projects").select("nom").eq("id", projetA).single();
    expect(data!.nom).toBe("RLS Secret A"); // inchangé
  });

  it("l'utilisateur B ne peut pas supprimer le projet de A", async () => {
    await clientB.from("projects").delete().eq("id", projetA);
    const { count } = await admin.from("projects").select("*", { count: "exact", head: true }).eq("id", projetA);
    expect(count).toBe(1); // toujours là
  });

  it("un visiteur anonyme ne voit aucun projet", async () => {
    const { data } = await anon.from("projects").select("id");
    expect((data ?? []).length).toBe(0);
  });

  it("le référentiel de prix (kb_postes) est lisible publiquement mais non modifiable par un anonyme", async () => {
    // Lecture publique OK + on capture le vrai prix via admin
    const lecture = await anon.from("kb_postes").select("id").limit(1);
    const posteId = (lecture.data ?? [])[0]?.id as string | undefined;
    expect(posteId, "au moins un poste lisible publiquement").toBeTruthy();
    const avant = await admin.from("kb_postes").select("prix_moy").eq("id", posteId!).single();

    // Tentative d'écriture anonyme
    await anon.from("kb_postes").update({ prix_moy: -999 }).eq("id", posteId!);

    // Vérif via admin : le prix N'A PAS changé (RLS a bloqué l'écriture)
    const apres = await admin.from("kb_postes").select("prix_moy").eq("id", posteId!).single();
    expect(apres.data!.prix_moy).toBe(avant.data!.prix_moy);
  });
});

/**
 * « Mes plans » (supabase/migrations/0004_floor_plans.sql) : le plan appartient à son auteur seul,
 * se crée uniquement par floor_plans_creer (service role, limite gratuite sous verrou), et le lien
 * project_plans ne relie que le projet ET le plan de la même personne. Les membres lisent le lien,
 * seul le propriétaire du projet l'écrit.
 */
describe.skipIf(!dispo)("RLS — Mes plans (floor_plans, project_plans)", () => {
  let admin: SupabaseClient, anon: SupabaseClient, sbA: SupabaseClient, sbB: SupabaseClient, sbM: SupabaseClient;
  const suffixe = Date.now();
  const MDP = "TestRls-123456";
  const ids: Record<"A" | "B" | "M", string> = { A: "", B: "", M: "" };
  let projetA = "", projetB = "", planA = "", planB = "";
  const ETAT = { schema: 47, workflow: "final_plan", levels: [{ walls: [], openings: [] }] };
  const creer = (owner: string, limite: number | null, editeur: string | null = null, etat: unknown = ETAT) =>
    admin.rpc("floor_plans_creer", {
      p_owner: owner, p_limite: limite, p_nom: "Ma maison", p_workflow: "final_plan", p_etat: etat,
      p_vue: null, p_resume: {}, p_apercu: null, p_schema: 47, p_editeur_id: editeur,
    });
  const ligne = async (id: string) =>
    (await admin.from("floor_plans").select("nom, revision, owner_id").eq("id", id).single()).data!;

  beforeAll(async () => {
    admin = client(SERVICE!);
    anon = client(ANON!);
    const sessions: Record<string, SupabaseClient> = {};
    for (const k of ["A", "B", "M"] as const) {
      const email = `zz-rls-plans-${k.toLowerCase()}-${suffixe}@avyora.local`;
      const u = await admin.auth.admin.createUser({ email, password: MDP, email_confirm: true });
      ids[k] = u.data.user!.id;
      sessions[k] = client(ANON!);
      await sessions[k].auth.signInWithPassword({ email, password: MDP });
    }
    sbA = sessions.A; sbB = sessions.B; sbM = sessions.M;
    const proj = async (owner: string) => (await admin.from("projects").insert({
      owner_id: owner, nom: "RLS plans", type_bien: "maison", surface: 100, code_postal: "33000", reponses: {},
    }).select("id").single()).data!.id as string;
    projetA = await proj(ids.A);
    projetB = await proj(ids.B);
    await admin.from("project_members").insert({ project_id: projetA, user_id: ids.M, role: "editor", status: "active" });
    planB = ((await creer(ids.B, 1)).data as { plan_id: string }[])[0].plan_id;
  });

  afterAll(async () => {
    for (const id of Object.values(ids)) if (id) await admin.auth.admin.deleteUser(id); // cascade : plans, projets
  });

  it("la création est refusée à anon et à la session de A (service role seulement)", async () => {
    const parAnon = await anon.rpc("floor_plans_creer", { p_owner: ids.A, p_limite: null, p_nom: "x", p_workflow: "final_plan",
      p_etat: ETAT, p_vue: null, p_resume: {}, p_apercu: null, p_schema: 47, p_editeur_id: null });
    const parA = await sbA.rpc("floor_plans_creer", { p_owner: ids.A, p_limite: null, p_nom: "x", p_workflow: "final_plan",
      p_etat: ETAT, p_vue: null, p_resume: {}, p_apercu: null, p_schema: 47, p_editeur_id: null });
    expect(parAnon.error).toBeTruthy();
    expect(parA.error).toBeTruthy();
  });

  it("insert direct dans floor_plans refusé à A", async () => {
    const r = await sbA.from("floor_plans").insert({ owner_id: ids.A, workflow: "final_plan", etat: ETAT });
    expect(r.error).toBeTruthy();
  });

  it("limite 1 : deux créations simultanées → une seule ligne, l'autre lève limite_gratuite", async () => {
    const [r1, r2] = await Promise.all([creer(ids.A, 1), creer(ids.A, 1)]);
    const erreurs = [r1, r2].filter((r) => r.error);
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0].error!.message).toContain("limite_gratuite");
    const { count } = await admin.from("floor_plans").select("*", { count: "exact", head: true }).eq("owner_id", ids.A);
    expect(count).toBe(1);
    planA = ((r1.data ?? r2.data) as { plan_id: string }[])[0].plan_id;
    const encore = await creer(ids.A, 1);
    expect(encore.error?.message).toContain("limite_gratuite");
  });

  it("même editeur_id deux fois → deja = true, une seule ligne", async () => {
    const r1 = await creer(ids.M, null, "abc123");
    const r2 = await creer(ids.M, null, "abc123");
    const [l1] = r1.data as { plan_id: string; deja: boolean }[];
    const [l2] = r2.data as { plan_id: string; deja: boolean }[];
    expect(l1.deja).toBe(false);
    expect(l2.deja).toBe(true);
    expect(l2.plan_id).toBe(l1.plan_id);
    const { count } = await admin.from("floor_plans").select("*", { count: "exact", head: true }).eq("owner_id", ids.M);
    expect(count).toBe(1);
  });

  it("un état de 1,1 Mo est refusé par le CHECK", async () => {
    const r = await creer(ids.M, null, null, { levels: [], gros: "x".repeat(1_100_000) });
    expect(r.error?.message).toContain("floor_plans_etat_taille");
  });

  it("B ne lit, ne modifie ni ne supprime le plan de A", async () => {
    const lu = await sbB.from("floor_plans").select("id").eq("id", planA).maybeSingle();
    expect(lu.data).toBeNull();
    await sbB.from("floor_plans").update({ nom: "PIRATÉ" }).eq("id", planA);
    await sbB.from("floor_plans").delete().eq("id", planA);
    expect((await ligne(planA)).nom).toBe("Ma maison");
  });

  it("la révision n'avance pas sur vue ou contrat seuls, avance sur etat, et ne se forge pas", async () => {
    const r0 = (await ligne(planA)).revision as number;
    await sbA.from("floor_plans").update({ vue: { z: 2 } }).eq("id", planA);
    await sbA.from("floor_plans").update({ contrat: { v: 1 }, contrat_at: new Date().toISOString() }).eq("id", planA);
    await sbA.from("floor_plans").update({ revision: 999 }).eq("id", planA);
    expect((await ligne(planA)).revision).toBe(r0);
    await sbA.from("floor_plans").update({ etat: { ...ETAT, levels: [{ walls: [], openings: [], items: [] }] } }).eq("id", planA);
    expect((await ligne(planA)).revision).toBe(r0 + 1);
    await sbA.from("floor_plans").update({ owner_id: ids.B }).eq("id", planA);
    expect((await ligne(planA)).owner_id).toBe(ids.A);
  });

  it("A ne relie pas son projet au plan de B, ni son plan au projet de B", async () => {
    const r1 = await sbA.from("project_plans").insert({ project_id: projetA, plan_id: planB, version: "1.18.0" });
    const r2 = await sbA.from("project_plans").insert({ project_id: projetB, plan_id: planA, version: "1.18.0" });
    expect(r1.error).toBeTruthy();
    expect(r2.error).toBeTruthy();
  });

  it("A relie son projet à son plan ; le membre lit le lien mais ne l'écrit pas", async () => {
    const r = await sbA.from("project_plans").insert({ project_id: projetA, plan_id: planA, version: "1.18.0" });
    expect(r.error).toBeNull();
    const lu = await sbM.from("project_plans").select("plan_id").eq("project_id", projetA).single();
    expect(lu.data?.plan_id).toBe(planA);
    await sbM.from("project_plans").update({ nom: "membre" }).eq("project_id", projetA);
    await sbM.from("project_plans").delete().eq("project_id", projetA);
    const apres = await admin.from("project_plans").select("nom").eq("project_id", projetA).single();
    expect(apres.data?.nom).toBeNull();
    const plan = await sbM.from("floor_plans").select("id").eq("id", planA).maybeSingle();
    expect(plan.data).toBeNull(); // le plan lui-même reste à son auteur
  });

  it("supprimer le plan → plan_id repasse à null ; supprimer le projet → la ligne disparaît", async () => {
    await sbA.from("floor_plans").delete().eq("id", planA);
    const lien = await admin.from("project_plans").select("plan_id").eq("project_id", projetA).single();
    expect(lien.data?.plan_id).toBeNull();
    await admin.from("projects").delete().eq("id", projetA);
    const { count } = await admin.from("project_plans").select("*", { count: "exact", head: true }).eq("project_id", projetA);
    expect(count).toBe(0);
  });
});
