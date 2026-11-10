import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { estAdmin } from "@/lib/auth";
import { estimationProjet, avancementProjet, natureProjet, modeProjet, type StatutChantier } from "@/lib/estimateur/projet";
import type { ApercuMur } from "@/lib/plans/apercu";

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
  /** Rénovation ou construction neuve. */
  nature: "reno" | "neuf";
  /** Estimation rapide ou détaillée. */
  mode: "rapide" | "detaille";
};

export type AdminInscrit = {
  id: string;
  email: string;
  username: string | null;
  createdAt: string;
  lastSignIn: string | null;
  onboardingFait: boolean;
  profil: Profil | null;
  plan: "admin" | "pro" | "free";
  projets: AdminProjet[];
};

// ── Libellés lisibles (les valeurs stockées sont des clés pour tuEs/objectif/maturité) ──
export const L_TUES: Record<string, string> = { particulier: "Particulier", investisseur: "Investisseur locatif", pro: "Professionnel" };
export const L_OBJECTIF: Record<string, string> = { residence: "Résidence principale", locatif: "Investissement locatif", revente: "Achat-revente", client: "Pour un client" };
export const L_MATURITE: Record<string, string> = {
  renseigne: "Je me renseigne", bien_en_vue: "A un bien en vue", proprietaire: "Déjà propriétaire", travaux: "Travaux en cours",
  // Étapes d'une construction neuve (onboarding, N14)
  terrain_en_vue: "A un terrain en vue", terrain: "A son terrain", permis: "Permis déposé ou obtenu",
};
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
    ttc: estim ? estim.ttc : null, statut: av.statut, pct: av.pct, nature: natureProjet(r.reponses), mode: modeProjet(r.reponses),
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
      const meta = (u.user_metadata ?? {}) as { profil?: Profil; onboarding_fait?: boolean; username?: string };
      const plan: "admin" | "pro" | "free" = estAdmin(u)
        ? "admin"
        : ((u.app_metadata as { plan?: string } | undefined)?.plan === "pro" ? "pro" : "free");
      return {
        id: u.id,
        email: u.email ?? "—",
        username: meta.username ?? null,
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
  /** Budget moyen des projets de RÉNOVATION (une maison neuve fausserait la moyenne). */
  budgetMoyen: number | null;
  /** Budget moyen des constructions neuves, null s'il n'y en a aucune. */
  budgetMoyenNeuf: number | null;
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
  const moyenne = (nature: "reno" | "neuf") => {
    const v = projets.filter((p) => p.nature === nature).map((p) => p.ttc).filter((n): n is number => n != null && n > 0);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
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
    budgetMoyen: moyenne("reno"),
    budgetMoyenNeuf: moyenne("neuf"),
  };
}

// ── Plans (« Mes plans », table floor_plans) ──
export type AdminPlan = {
  id: string;
  ownerId: string;
  email: string;
  nom: string;
  /** Plan final (construction) ou projet de rénovation. */
  workflow: "final_plan" | "renovation";
  m2: number | null;
  pieces: number | null;
  budget: number | null;
  apercu: ApercuMur[] | null;
  createdAt: string;
  updatedAt: string;
  /** Estimations nées de ce plan (liens project_plans). */
  estimations: string[];
};

type RowPlan = {
  id: string; owner_id: string; nom: string; workflow: string; resume: unknown; apercu: unknown;
  created_at: string; updated_at: string;
};

const nombreOuNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Les adresses des comptes, par id (une seule lecture d'Auth). */
async function emailsParId(): Promise<Map<string, string>> {
  const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  return new Map(data.users.map((u) => [u.id, u.email ?? "—"]));
}

/** Tous les plans enregistrés (bypass RLS), les plus récemment modifiés d'abord. Sans l'état complet : la liste n'en a pas besoin. */
export async function listPlansAdmin(): Promise<AdminPlan[]> {
  const sb = supabaseAdmin();
  const [{ data, error }, liens, emails] = await Promise.all([
    sb.from("floor_plans").select("id, owner_id, nom, workflow, resume, apercu, created_at, updated_at").order("updated_at", { ascending: false }),
    sb.from("project_plans").select("plan_id, project_id"),
    emailsParId(),
  ]);
  if (error) throw new Error(error.message);
  const parPlan = new Map<string, string[]>();
  for (const l of (liens.data ?? []) as { plan_id: string; project_id: string }[]) parPlan.set(l.plan_id, [...(parPlan.get(l.plan_id) ?? []), l.project_id]);
  return ((data ?? []) as RowPlan[]).map((r) => {
    const res = (r.resume && typeof r.resume === "object" ? r.resume : {}) as Record<string, unknown>;
    return {
      id: r.id, ownerId: r.owner_id, email: emails.get(r.owner_id) ?? "—", nom: r.nom,
      workflow: r.workflow === "final_plan" ? "final_plan" : "renovation",
      m2: nombreOuNull(res.m2), pieces: nombreOuNull(res.pieces), budget: nombreOuNull(res.budget),
      apercu: Array.isArray(r.apercu) ? (r.apercu as ApercuMur[]) : null,
      createdAt: r.created_at, updatedAt: r.updated_at,
      estimations: parPlan.get(r.id) ?? [],
    };
  });
}

/** Un plan quelconque AVEC son état (bypass RLS) — pour l'ouvrir en lecture seule dans l'éditeur. */
export async function getPlanAdmin(id: string): Promise<{
  id: string; ownerId: string; email: string; nom: string; workflow: "final_plan" | "renovation";
  etat: Record<string, unknown>; vue: unknown; updatedAt: string;
} | null> {
  const { data } = await supabaseAdmin()
    .from("floor_plans")
    .select("id, owner_id, nom, workflow, etat, vue, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; owner_id: string; nom: string; workflow: string; etat: unknown; vue: unknown; updated_at: string };
  const { data: u } = await supabaseAdmin().auth.admin.getUserById(r.owner_id);
  return {
    id: r.id, ownerId: r.owner_id, email: u.user?.email ?? "—", nom: r.nom,
    workflow: r.workflow === "final_plan" ? "final_plan" : "renovation",
    etat: (r.etat && typeof r.etat === "object" ? r.etat : {}) as Record<string, unknown>,
    vue: r.vue ?? null, updatedAt: r.updated_at,
  };
}
