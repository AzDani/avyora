import type { supabaseServer } from "@/lib/supabase/server";
import { planImportSchema, MAJEURE_CONTRAT_PLAN } from "@/lib/validation";
import { contributionsDuPlan, type Contribution, type Ignore, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { injecterPlan, type LigneInjectee, type RapportInjection } from "@/lib/estimateur/plan-injection";
import { codePostalDuContrat, ctxDepuisPlan } from "@/lib/estimateur/plan-ctx";
import { defaultCtx, type Ctx, type Selection } from "@/lib/estimateur/core";
import { ErreurPlans } from "@/lib/plans/data";
import { octetsJsonb } from "@/lib/plans/jsonb";
import { lienEchoue, VERSION_CONTRAT_DEFAUT } from "@/lib/plans/relier";
import { RE_CONTRAT } from "@/lib/plans/origine";
import { dictPlans } from "@/lib/i18n/plans";
import type { Locale } from "@/lib/i18n/config";

/**
 * « Mes plans », chantier C7 : l'estimation détaillée de RÉNOVATION née d'un plan (Pro).
 *
 * Remplace les anciennes routes `PUT /api/projects/[id]/plan` et `POST …/plan/appliquer` (jamais
 * montées), en les rendant sûres :
 *  - le contrat est TOUJOURS relu en base (`floor_plans.contrat`, écrit par le serveur seul après le
 *    contrôle de `PATCH /api/plans/[id]`), jamais reçu du client ici ;
 *  - tout est RECALCULÉ à chaque appel (contributions, injection, ctx) : `preparer` pour l'écran de
 *    validation (D1), `valider` pour l'écriture, qui ne fait confiance à rien de ce que l'écran a montré ;
 *  - chaque écriture vérifie le nombre de lignes : 0 → erreur (une écriture refusée en silence par la
 *    RLS n'est jamais un « ok ») ;
 *  - un projet CRÉÉ dont le lien `project_plans` ne peut pas être posé est SUPPRIMÉ : aucune estimation
 *    ne doit se croire reliée sans l'être. Une estimation MISE À JOUR reprend sa sélection d'avant.
 *
 * Tout passe par la SESSION (RLS 0001 et 0004) : les plans, projets et liens du compte seulement. Aucun
 * service role ici.
 */
type Sb = Awaited<ReturnType<typeof supabaseServer>>;
type Obj = Record<string, unknown>;

/** Borne de `reponses` d'un projet de rénovation (`projetCreateSchema`) : l'estimateur doit pouvoir le réenregistrer. */
export const REPONSES_RENO_MAX = 40_000;
/** Bornes des colonnes de `project_plans` (CHECK project_plans_tailles, 0004). */
const CONTRIBUTIONS_OCTETS_MAX = 500_000;
const RAPPORT_OCTETS_MAX = 1_000_000;
/** Longueur du nom de projet (l'estimateur coupe ses noms à 110). */
const NOM_PROJET_MAX = 110;
/** Estimations reliées lues pour un plan (un compte en a une ou deux). */
const RELIEES_MAX = 50;

export type CodeEstimation =
  | "introuvable"
  | "contrat_absent"
  | "contrat_invalide"
  | "contrat_version"
  | "contrat_workflow"
  | "code_postal"
  | "trop_volumineux";

export type Echec = { ok: false; code: CodeEstimation };

/** Une estimation de rénovation reliée au plan, telle que la session la lit. */
export type ProjetRelie = { id: string; nom: string; created_at: string; code_postal: string | null; reponses: Obj };

type PlanLu = { id: string; nom: string; contrat: Obj; version: string };

export type Preparation = {
  ok: true;
  plan: { id: string; nom: string };
  bilan: RapportInjection["bilan"];
  lignes: LigneInjectee[];
  ignores: Ignore[];
  /**
   * Le ctx qu'écrirait la validation : celui du plan pour une CRÉATION ; pour une MISE À JOUR, celui de l'estimation
   * avec les champs venus du plan recalculés (`ctxMisAJour`), ceux corrigés à la main dans le détaillé gardés.
   */
  ctxPropose: Ctx;
  /** Mise à jour seulement : le ctx de l'estimation AVANT (l'écran montre « 58 → 73 m² »). */
  ctxAvant: Ctx | null;
  /** Création sans code postal valide dans le contrat : l'écran le demande. */
  manqueCodePostal: boolean;
};

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});

/** Le plan et son contrat, relus en base sous RLS, puis revalidés comme à l'import. */
async function lirePlanEtContrat(sb: Sb, planId: string): Promise<PlanLu | Echec> {
  const { data, error } = await sb.from("floor_plans").select("id, nom, workflow, contrat").eq("id", planId).maybeSingle();
  if (error) throw new ErreurPlans("estimation-plan");
  if (!data) return { ok: false, code: "introuvable" };
  const ligne = data as { id: string; nom: string | null; workflow: string; contrat: unknown };
  if (ligne.workflow === "final_plan") return { ok: false, code: "contrat_workflow" };
  if (ligne.contrat == null) return { ok: false, code: "contrat_absent" };

  const v = planImportSchema.safeParse(ligne.contrat);
  if (!v.success) {
    const c = obj(ligne.contrat).contrat;
    const autreMajeure = typeof c === "string" && /^\d+\.\d+\.\d+$/.test(c) && Number(c.split(".")[0]) !== MAJEURE_CONTRAT_PLAN;
    return { ok: false, code: autreMajeure ? "contrat_version" : "contrat_invalide" };
  }
  const contrat = obj(ligne.contrat);
  /* Un contrat sans `workflow` (avant 1.18) est lu comme une rénovation, comme le fait la correspondance. */
  if (contrat.workflow !== undefined && contrat.workflow !== "renovation") return { ok: false, code: "contrat_workflow" };
  const version = typeof contrat.contrat === "string" && RE_CONTRAT.test(contrat.contrat) ? contrat.contrat : VERSION_CONTRAT_DEFAUT;
  return { id: ligne.id, nom: (ligne.nom ?? "").trim() || "Plan", contrat, version };
}

function contributions(contrat: Obj): { contributions: Contribution[]; ignores: Ignore[] } | Echec {
  try {
    return contributionsDuPlan(contrat as PlanPourCorrespondance);
  } catch {
    return { ok: false, code: "contrat_invalide" };
  }
}

/**
 * Les estimations de RÉNOVATION reliées à ce plan, les plus récentes d'abord (sous RLS : celles du compte).
 * Un projet neuf relié au même plan (impossible aujourd'hui : un plan a un seul type) est écarté.
 */
export async function estimationsRenoDuPlan(sb: Sb, planId: string): Promise<ProjetRelie[]> {
  /* trié AVANT la borne : au-delà de 50 liens, ce sont les plus anciens qui tombent, jamais le plus récent */
  const { data: liens, error } = await sb
    .from("project_plans")
    .select("project_id")
    .eq("plan_id", planId)
    .order("updated_at", { ascending: false })
    .limit(RELIEES_MAX);
  if (error) throw new ErreurPlans("estimation-liens");
  const ids = [...new Set(((liens ?? []) as { project_id: string }[]).map((l) => l.project_id))];
  if (!ids.length) return [];
  const { data, error: e2 } = await sb
    .from("projects")
    .select("id, nom, created_at, code_postal, reponses")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (e2) throw new ErreurPlans("estimation-projets");
  return ((data ?? []) as ProjetRelie[]).filter((p) => obj(obj(p.reponses).ctx).nature !== "neuf");
}

/**
 * L'estimation à mettre à jour : `projetId` (qui doit être reliée à CE plan), sinon la plus récente,
 * sinon aucune (création). `nouvelle` force la création.
 */
export async function choisirProjet(
  sb: Sb,
  planId: string,
  o: { projetId?: string | null; nouvelle?: boolean } = {},
): Promise<{ ok: true; projet: ProjetRelie | null; relies: number } | Echec> {
  const relies = await estimationsRenoDuPlan(sb, planId);
  if (o.nouvelle) return { ok: true, projet: null, relies: relies.length };
  const voulu = o.projetId ? o.projetId.toLowerCase() : null;
  if (voulu) {
    const p = relies.find((x) => x.id === voulu);
    return p ? { ok: true, projet: p, relies: relies.length } : { ok: false, code: "introuvable" };
  }
  return { ok: true, projet: relies[0] ?? null, relies: relies.length };
}

/**
 * Les champs du ctx qui viennent du PLAN (`ctxDepuisPlan`) : surface, emprise, niveaux, hauteur, les huit compteurs,
 * le nombre de pièces et de fenêtres. Le reste (finition, code postal, fiscalité, aléas…) est à l'utilisateur.
 */
export const CTX_DU_PLAN = [
  "perimetre", "type", "surface", "surfaceSol", "surfaceSolManual", "niveaux", "hauteur",
  "sejour", "cuisine", "chambres", "suites", "couloir", "buanderie", "sdb", "wc", "pieces", "fenetres",
] as const;

/**
 * Le ctx d'une estimation MISE À JOUR depuis le plan (jury) : ce ctx « pilote les postes non mesurés (électricité,
 * ventilation…) », il doit suivre le plan (une extension change la surface). Chaque champ venu du plan prend la
 * valeur du plan d'aujourd'hui, SAUF s'il a été corrigé à la main dans le détaillé : il diffère alors de ce que
 * le plan d'avant (le cliché du lien) avait donné, et il est gardé. Sans cliché, le plan décide.
 */
export function ctxMisAJour(avant: Obj, nouveau: Ctx, ancien: Ctx | null): Obj {
  const ctx: Obj = { ...avant };
  for (const k of CTX_DU_PLAN) {
    const corrige = ancien != null && avant[k] !== undefined && avant[k] !== ancien[k];
    if (!corrige) ctx[k] = nouveau[k];
  }
  return ctx;
}

/** Le cliché du lien d'une estimation (contrat et nom du plan au dernier chiffrage), sous RLS. */
async function clicheDuLien(sb: Sb, projectId: string): Promise<{ contrat: Obj | null; nom: string | null }> {
  const { data, error } = await sb.from("project_plans").select("contrat, nom").eq("project_id", projectId).maybeSingle();
  if (error) throw new ErreurPlans("estimation-cliche");
  const l = (data ?? null) as { contrat?: unknown; nom?: unknown } | null;
  const c = l?.contrat && typeof l.contrat === "object" && !Array.isArray(l.contrat) ? (l.contrat as Obj) : null;
  return { contrat: c, nom: typeof l?.nom === "string" ? l.nom : null };
}

/** Le ctx que la mise à jour écrirait, et celui d'avant (complétés des défauts, pour l'affichage). */
async function ctxDeLaMiseAJour(sb: Sb, projet: ProjetRelie, contrat: Obj) {
  const cliche = await clicheDuLien(sb, projet.id);
  const avant = obj(obj(projet.reponses).ctx);
  const ctx = ctxMisAJour(avant, ctxDepuisPlan(contrat), cliche.contrat ? ctxDepuisPlan(cliche.contrat) : null);
  return { ctx, avant, cliche };
}

/**
 * Ce que l'écran de validation montre. N'ÉCRIT RIEN. `projetRelie` : l'injection est rejouée sur SA
 * sélection du moment (une ligne corrigée à la main y reste épinglée, D12) ; sinon sur une sélection vide.
 */
export async function preparer(sb: Sb, planId: string, projetRelie?: ProjetRelie | null): Promise<Preparation | Echec> {
  const plan = await lirePlanEtContrat(sb, planId);
  if ("ok" in plan) return plan;
  const c = contributions(plan.contrat);
  if ("ok" in c) return c;
  const sel = (obj(projetRelie?.reponses).sel ?? {}) as Selection;
  const rapport = injecterPlan(projetRelie ? sel : {}, c.contributions);
  const maj = projetRelie ? await ctxDeLaMiseAJour(sb, projetRelie, plan.contrat) : null;
  return {
    ok: true,
    plan: { id: plan.id, nom: plan.nom },
    bilan: rapport.bilan,
    lignes: rapport.lignes,
    ignores: c.ignores,
    ctxPropose: maj ? ({ ...defaultCtx(), ...maj.ctx } as Ctx) : ctxDepuisPlan(plan.contrat),
    ctxAvant: maj ? ({ ...defaultCtx(), ...maj.avant } as Ctx) : null,
    manqueCodePostal: !projetRelie && !codePostalDuContrat(plan.contrat),
  };
}

/** Le cliché figé de ce qui a été chiffré (D1), et le lien vers le plan. */
function ligneLien(projectId: string, plan: PlanLu, c: { contributions: Contribution[]; ignores: Ignore[] }, r: RapportInjection) {
  return {
    project_id: projectId,
    plan_id: plan.id,
    contrat: plan.contrat,
    contributions: c.contributions,
    rapport: { lignes: r.lignes, bilan: r.bilan, ignores: c.ignores },
    version: plan.version,
    nom: plan.nom.slice(0, 200),
    updated_at: new Date().toISOString(),
  };
}

/** Pose (ou remplace) le lien du projet. `true` seulement si la ligne est écrite. */
async function poserLien(sb: Sb, ligne: ReturnType<typeof ligneLien>): Promise<boolean> {
  const { data, error } = await sb.from("project_plans").upsert(ligne, { onConflict: "project_id" }).select("project_id");
  return !error && ((data ?? []) as unknown[]).length === 1;
}

export type Validation = { ok: true; projectId: string; cree: boolean } | Echec;

/**
 * L'utilisateur a relu et valide. TOUT est recalculé depuis la base :
 *  - estimation reliée (`projetId`, ou la plus récente) : l'injection est rejouée sur sa sélection DU
 *    MOMENT (D12) ; le ctx suit le plan (`ctxMisAJour` : les champs corrigés à la main restent), la surface
 *    et le nom généré du projet aussi ; puis le cliché du lien est remplacé ;
 *  - sinon (ou `nouvelle`) : un projet détaillé est créé avec le ctx du plan, puis relié. Si le lien ne
 *    peut pas être posé, le projet est supprimé.
 * Les erreurs inattendues de la base lèvent `ErreurPlans` (la route répond `{ code: "erreur" }`).
 */
export async function valider(
  sb: Sb,
  user: { id: string },
  planId: string,
  o: { codePostal?: string | null; projetId?: string | null; nouvelle?: boolean; locale: Locale },
): Promise<Validation> {
  const plan = await lirePlanEtContrat(sb, planId);
  if ("ok" in plan) return plan;
  const c = contributions(plan.contrat);
  if ("ok" in c) return c;
  const choix = await choisirProjet(sb, planId, { projetId: o.projetId, nouvelle: o.nouvelle });
  if (!choix.ok) return choix;

  /* ── Mise à jour d'une estimation reliée ── */
  if (choix.projet) {
    const projet = choix.projet;
    const avant = obj(projet.reponses);
    const rapport = injecterPlan((avant.sel ?? {}) as Selection, c.contributions);
    const maj = await ctxDeLaMiseAJour(sb, projet, plan.contrat);
    const reponses = { ...avant, ctx: maj.ctx, sel: rapport.selection };
    const lien = ligneLien(projet.id, plan, c, rapport);
    if (trop(reponses, lien)) return { ok: false, code: "trop_volumineux" };

    const surface = Number(maj.ctx.surface);
    const surfaceAvant = Number(maj.avant.surface);
    const patch: Obj = { reponses, derniere_activite_at: new Date().toISOString() };
    if (Number.isFinite(surface) && surface > 0) patch.surface = surface;
    /* le nom généré (« Rénovation — « plan » · 58 m² ») suit la surface ; un nom choisi à la main reste */
    if (maj.cliche.nom != null && projet.nom === nomProjet(o.locale, maj.cliche.nom, surfaceAvant)) {
      patch.nom = nomProjet(o.locale, plan.nom, surface);
    }
    const { data, error } = await sb.from("projects").update(patch).eq("id", projet.id).select("id");
    if (error || ((data ?? []) as unknown[]).length !== 1) throw new ErreurPlans("estimation-maj");

    if (!(await poserLien(sb, lien))) {
      /* La sélection d'avant revient : le cliché du lien doit décrire ce qui est chiffré. */
      const retour: Obj = { reponses: avant };
      if ("surface" in patch && Number.isFinite(surfaceAvant) && surfaceAvant > 0) retour.surface = surfaceAvant;
      if ("nom" in patch) retour.nom = projet.nom;
      await sb.from("projects").update(retour).eq("id", projet.id).select("id");
      await lienEchoue("estimation-reno-maj", user.id, { projectId: projet.id, planId: plan.id });
      throw new ErreurPlans("estimation-lien");
    }
    return { ok: true, projectId: projet.id, cree: false };
  }

  /* ── Création ── */
  const cp = o.codePostal && /^\d{5}$/.test(o.codePostal) ? o.codePostal : codePostalDuContrat(plan.contrat);
  if (!cp) return { ok: false, code: "code_postal" };
  const ctx: Ctx = { ...ctxDepuisPlan(plan.contrat), codePostal: cp };
  const rapport = injecterPlan({}, c.contributions);
  const reponses = { v: "estimateur", mode: "detaille", ctx, sel: rapport.selection, codePostal: cp };
  const nom = nomProjet(o.locale, plan.nom, ctx.surface);

  /* Le lien est mesuré AVANT de créer quoi que ce soit (son project_id est un uuid de 36 caractères). */
  const mesure = ligneLien("00000000-0000-0000-0000-000000000000", plan, c, rapport);
  if (trop(reponses, mesure)) return { ok: false, code: "trop_volumineux" };

  const { data, error } = await sb
    .from("projects")
    .insert({ owner_id: user.id, nom, type_bien: ctx.type, surface: ctx.surface, code_postal: cp, reponses })
    .select("id")
    .single();
  const projectId = (data as { id?: string } | null)?.id;
  if (error || !projectId) throw new ErreurPlans("estimation-creer");

  if (!(await poserLien(sb, { ...mesure, project_id: projectId }))) {
    /* Jamais d'estimation qui se croit reliée sans l'être : le projet créé repart. */
    const { data: sup } = await sb.from("projects").delete().eq("id", projectId).select("id");
    await lienEchoue("estimation-reno-creer", user.id, {
      projectId,
      planId: plan.id,
      supprime: ((sup ?? []) as unknown[]).length === 1,
    });
    throw new ErreurPlans("estimation-lien");
  }
  return { ok: true, projectId, cree: true };
}

/** « Rénovation — « {nom du plan} » · {surface} m² », coupé sans casser un caractère. */
export function nomProjet(locale: Locale, nomPlan: string, surface: number): string {
  const t = dictPlans(locale).estimation;
  const fixe = t.nomProjet("", surface).length;
  const place = Math.max(1, NOM_PROJET_MAX - fixe);
  const car = Array.from(nomPlan);
  const nom = car.length > place ? car.slice(0, Math.max(1, place - 1)).join("") + "…" : nomPlan;
  return t.nomProjet(nom, surface);
}

function trop(reponses: unknown, lien: ReturnType<typeof ligneLien>): boolean {
  return (
    JSON.stringify(reponses).length > REPONSES_RENO_MAX ||
    octetsJsonb(lien.contributions) > CONTRIBUTIONS_OCTETS_MAX ||
    octetsJsonb(lien.rapport) > RAPPORT_OCTETS_MAX
  );
}
