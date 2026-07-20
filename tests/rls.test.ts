import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Test d'INTÉGRATION de la tenancy (Row-Level Security) contre le vrai Supabase.
 * Prouve qu'un utilisateur ne peut ni voir ni modifier les projets d'un autre, et qu'un anonyme
 * ne voit aucun projet. Crée puis supprime ses propres comptes de test (auto-nettoyant).
 * Ignoré automatiquement si les clés Supabase ne sont pas disponibles.
 */
function chargerEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

const env = chargerEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const dispo = Boolean(URL && ANON && SERVICE);

describe.skipIf(!dispo)("RLS — étanchéité multi-tenant", () => {
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
  const suffixe = Date.now();
  const emailA = `zz-rls-a-${suffixe}@avyora.local`;
  const emailB = `zz-rls-b-${suffixe}@avyora.local`;
  const MDP = "TestRls-123456";
  let idA = "", idB = "", projetA = "";
  let clientB: SupabaseClient, anon: SupabaseClient;

  beforeAll(async () => {
    const a = await admin.auth.admin.createUser({ email: emailA, password: MDP, email_confirm: true });
    const b = await admin.auth.admin.createUser({ email: emailB, password: MDP, email_confirm: true });
    idA = a.data.user!.id;
    idB = b.data.user!.id;
    const p = await admin.from("projects").insert({
      owner_id: idA, nom: "RLS Secret A", type_bien: "maison", surface: 100, code_postal: "33000", reponses: {},
    }).select("id").single();
    projetA = p.data!.id as string;

    clientB = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await clientB.auth.signInWithPassword({ email: emailB, password: MDP });
    anon = createClient(URL!, ANON!, { auth: { persistSession: false } });
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
