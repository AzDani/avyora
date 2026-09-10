import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { estimationProjet, avancementProjet, type StatutChantier } from "@/lib/estimateur/projet";

/**
 * Couche de données ADMIN — lecture cross-tenant via le client service-role (bypass RLS).
 * SERVEUR uniquement (import "server-only"). Réservée aux pages /admin, elles-mêmes gardées
 * par getAdmin() dans le layout : sans email dans ADMIN_EMAILS, personne n'accède (fail-safe).
 */

export type Profil = {
  tuEs: string[];
  objectif: string;
  maturite: string[];
  region: string;
  age: string;
  canal: string;
};

export type AdminProjet = {
  id: string;
  ownerId: string;
  nom: string;
  typeBien: string;
  surface: number;
  codePostal: string;
  createdAt: string;
  ttc: number | null;
  statut: StatutChantier;
  pct: number;
};

export type AdminInscrit = {
  id: string;
  email: string;
  createdAt: string;
  lastSignIn: string | null;
  onboardingFait: boolean;
  profil: Profil | null;
  plan: "pro" | "free";
  projets: AdminProjet[];
};

// ── Libellés lisibles (les valeurs stockées sont des clés pour tuEs/objectif/maturité) ──
export const L_TUES: Record<string, string> = { particulier: "Particulier", investisseur: "Investisseur locatif", pro: "Professionnel" };
export const L_OBJECTIF: Record<string, string> = { residence: "Résidence principale", locatif: "Investissement locatif", revente: "Achat-revente", client: "Pour un client" };
export const L_MATURITE: Record<string, string> = { renseigne: "Je me renseigne", bien_en_vue: "A un bien en vue", proprietaire: "Déjà propriétaire", travaux: "Travaux en cours" };
export const labelTues = (v: string) => L_TUES[v] ?? v;
export const labelObjectif = (v: string) => L_OBJECTIF[v] ?? v;
export const labelMaturite = (v: string) => L_MATURITE[v] ?? v;
/** Type principal d'un inscrit pour le tableau (1er choix de « tu es… »). */
export const typePrincipal = (p: Profil | null): "particulier" | "investisseur" | "pro" | "—" =>
  (p?.tuEs?.[0] as "particulier" | "investisseur" | "pro") ?? "—";

type Row = {
  id: string; owner_id: string; nom: string; type_bien: string;
  surface: number; code_postal: string; created_at: string; reponses: unknown;
};

function mapProjet(r: Row): AdminProjet {
  const estim = estimationProjet(r.reponses);
  const av = avancementProjet(r.reponses);
  return {
    id: r.id, ownerId: r.owner_id, nom: r.nom, typeBien: r.type_bien,
    surface: r.surface, codePostal: r.code_postal, createdAt: r.created_at,
    ttc: estim ? estim.ttc : null, statut: av.statut, pct: av.pct,
  };
}

/** Tous les projets (bypass RLS), groupés par propriétaire. */
async function projetsParOwner(): Promise<Map<string, AdminProjet[]>> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("projects")
    .select("id, owner_id, nom, type_bien, surface, code_postal, created_at, reponses")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const map = new Map<string, AdminProjet[]>();
  for (const r of (data ?? []) as Row[]) {
    const p = mapProjet(r);
    const arr = map.get(p.ownerId) ?? [];
    arr.push(p);
    map.set(p.ownerId, arr);
  }
  return map;
}

/** Liste des inscrits (Auth) enrichie de leur profil d'onboarding, plan et projets. */
export async function listInscrits(): Promise<AdminInscrit[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  const parOwner = await projetsParOwner();
  return data.users
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as { profil?: Profil; onboarding_fait?: boolean };
      const plan = ((u.app_metadata as { plan?: string } | undefined)?.plan === "pro") ? "pro" : "free";
      return {
        id: u.id,
        email: u.email ?? "—",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        onboardingFait: !!meta.onboarding_fait,
        profil: meta.profil ?? null,
        plan,
        projets: parOwner.get(u.id) ?? [],
      } as AdminInscrit;
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Un inscrit précis (par id Auth) avec ses projets. */
export async function getInscrit(id: string): Promise<AdminInscrit | null> {
  const inscrits = await listInscrits();
  return inscrits.find((i) => i.id === id) ?? null;
}

/** Un projet quelconque (bypass RLS) — pour la vue admin en lecture. */
export async function getProjetAdmin(id: string): Promise<{
  id: string; nom: string; typeBien: string; surface: number; codePostal: string;
  ownerId: string; reponses: Record<string, unknown>;
} | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("projects")
    .select("id, owner_id, nom, type_bien, surface, code_postal, reponses")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as Row;
  return {
    id: r.id, nom: r.nom, typeBien: r.type_bien, surface: r.surface,
    codePostal: r.code_postal, ownerId: r.owner_id,
    reponses: (r.reponses ?? {}) as Record<string, unknown>,
  };
}

// ── Statistiques agrégées pour la vue d'ensemble ──
export type Repartition = { label: string; n: number }[];
export type AdminStats = {
  totalInscrits: number;
  nouveaux30j: number;
  totalProjets: number;
  totalPro: number;
  onboardingPct: number;
  parType: Repartition;
  parCanal: Repartition;
  parAge: Repartition;
  parRegion: Repartition;
  budgetMoyen: number | null;
};

function compter(vals: string[], labelize: (v: string) => string = (v) => v): Repartition {
  const m = new Map<string, number>();
  for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([v, n]) => ({ label: labelize(v), n })).sort((a, b) => b.n - a.n);
}

export function statsGlobales(inscrits: AdminInscrit[]): AdminStats {
  const now = Date.now();
  const j30 = now - 30 * 864e5;
  const projets = inscrits.flatMap((i) => i.projets);
  const budgets = projets.map((p) => p.ttc).filter((n): n is number => n != null && n > 0);
  return {
    totalInscrits: inscrits.length,
    nouveaux30j: inscrits.filter((i) => +new Date(i.createdAt) >= j30).length,
    totalProjets: projets.length,
    totalPro: inscrits.filter((i) => i.plan === "pro").length,
    onboardingPct: inscrits.length ? Math.round((inscrits.filter((i) => i.onboardingFait).length / inscrits.length) * 100) : 0,
    parType: compter(inscrits.flatMap((i) => i.profil?.tuEs ?? []), labelTues),
    parCanal: compter(inscrits.map((i) => i.profil?.canal ?? "")),
    parAge: compter(inscrits.map((i) => i.profil?.age ?? "")),
    parRegion: compter(inscrits.map((i) => i.profil?.region ?? "")),
    budgetMoyen: budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : null,
  };
}
