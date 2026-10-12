import { z } from "zod";

/**
 * Schémas d'entrée de l'API « Mes plans » (`/api/plans*`).
 *
 * L'état d'un plan est le `state` de l'éditeur : un gros objet qui évolue avec les versions de
 * schéma (`migrerEtat`). On le valide donc en deux temps :
 *   - FERMÉ sur tout ce qui finit en HTML ou en attribut (identifiants, coordonnées, type et statut
 *     des murs) : la vignette et les listes de l'éditeur les écrivent sans échappement complet ;
 *   - OUVERT (`.loose()`) sur le reste, pour qu'une version suivante de l'éditeur ne soit pas
 *     refusée pour une clé qu'elle ajoute.
 * Une garde profonde parcourt tout l'objet : profondeur, longueur des chaînes, clés dangereuses,
 * images en `data:` (les calques image restent sur l'appareil en v1).
 */

export const PLAN_ETAT_MAX_NIVEAUX = 6;
export const PLAN_PROFONDEUR_MAX = 12;
export const PLAN_CHAINE_MAX = 2000;
/** Corps d'une requête d'écriture : au-delà, 413 avant même `JSON.parse`. */
export const PLAN_CORPS_MAX = 1_200_000;
/** Mêmes bornes que les CHECK de `floor_plans` (0004) : on répond 400 plutôt qu'une erreur SQL. */
export const PLAN_ETAT_OCTETS_MAX = 1_000_000;
export const PLAN_VUE_OCTETS_MAX = 4000;
export const PLAN_RESUME_OCTETS_MAX = 4000;

const CLES_INTERDITES = new Set(["__proto__", "constructor", "prototype"]);

/** Taille sérialisée. Une valeur qu'on ne sait pas sérialiser (profondeur absurde) compte pour l'infini. */
function octets(v: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(v) ?? "", "utf8");
  } catch {
    return Infinity;
  }
}

/** Parcourt toute la valeur (itératif : une profondeur absurde ne fait pas déborder la pile). */
export function problemeProfond(racine: unknown): string | null {
  const pile: Array<[unknown, number]> = [[racine, 0]];
  while (pile.length) {
    const [v, d] = pile.pop()!;
    if (typeof v === "string") {
      if (v.length > PLAN_CHAINE_MAX) return "chaîne trop longue";
      if (/^\s*data:/i.test(v)) return "image intégrée refusée";
      continue;
    }
    if (v === null || typeof v !== "object") continue;
    if (d >= PLAN_PROFONDEUR_MAX) return "objet trop profond";
    if (Array.isArray(v)) {
      for (const x of v) pile.push([x, d + 1]);
      continue;
    }
    for (const k of Object.keys(v)) {
      if (CLES_INTERDITES.has(k)) return "clé interdite";
      pile.push([(v as Record<string, unknown>)[k], d + 1]);
    }
  }
  return null;
}

function gardeProfonde(v: unknown, ctx: z.RefinementCtx) {
  const p = problemeProfond(v);
  if (p) ctx.addIssue({ code: "custom", message: p });
}

const idEd = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
const coord = z.number().finite().min(-10000).max(10000);
const pt = z.object({ x: coord, y: coord }).loose();
const mur = z
  .object({
    id: idEd,
    a: pt,
    b: pt,
    type: z.string().regex(/^[a-z_]{1,20}$/).optional(),
    st: z.string().regex(/^[a-z_]{0,20}$/).optional(),
  })
  .loose();
const niveau = z
  .object({
    walls: z.array(mur).max(2000),
    openings: z.array(z.object({ id: idEd }).loose()).max(2000),
    items: z.array(z.object({ id: idEd }).loose()).max(5000).optional(),
  })
  .loose();

export const WORKFLOWS_PLAN = ["final_plan", "renovation"] as const;
export type WorkflowPlan = (typeof WORKFLOWS_PLAN)[number];

/** La garde passe sur l'entrée BRUTE : zod retire un `__proto__` en silence, la garde le verrait trop tard. */
function garde(maxOctets: number, message: string) {
  return z
    .unknown()
    .superRefine(gardeProfonde)
    .refine((v) => octets(v) <= maxOctets, { message, abort: true });
}

export const etatPlanSchema = garde(PLAN_ETAT_OCTETS_MAX, "état trop volumineux").pipe(
  z
    .object({
      name: z.string().max(120).optional(),
      workflow: z.enum(WORKFLOWS_PLAN),
      schema: z.number().int().min(0).max(1000),
      levels: z.array(niveau).min(1).max(PLAN_ETAT_MAX_NIVEAUX),
    })
    .loose(),
);
export type EtatPlan = z.infer<typeof etatPlanSchema>;

/** `view` de l'éditeur (zoom, centre) : quelques nombres. */
const vueSchema = garde(PLAN_VUE_OCTETS_MAX, "vue trop volumineuse").pipe(z.object({}).loose());

/**
 * `resumePlan()` : ce que la carte de « Mes plans » rappelle. FERMÉ : il finit à l'écran. Les clés
 * inconnues sont retirées (une version suivante de l'éditeur n'est pas refusée pour autant).
 */
const nombre = z.number().finite().min(-1e9).max(1e9);
export const resumeSchema = z
  .object({
    pf: z.boolean().optional(),
    m2: nombre.optional(),
    pieces: z.number().int().min(0).max(100000).optional(),
    budget: nombre.optional(),
    taches: z.number().int().min(0).max(100000).optional(),
    faites: z.number().int().min(0).max(100000).optional(),
    projet: nombre.optional(),
    prochain: z.string().max(200).regex(/^[^<>"`\\\u0000-\u001f]*$/).nullable().optional(),
  })
  .refine((r) => octets(r) <= PLAN_RESUME_OCTETS_MAX, { message: "résumé trop volumineux" });
export type ResumePlan = z.infer<typeof resumeSchema>;

const nomPlan = z.string().trim().min(1).max(120);
/** L'identifiant local de l'éditeur (`uid()`, base 36) : reprise d'un plan anonyme sans doublon. */
export const editeurIdSchema = z.string().regex(/^[a-z0-9]{1,24}$/);

export const planCreerSchema = z.object({
  nom: nomPlan,
  etat: etatPlanSchema,
  vue: vueSchema.optional(),
  /* resumePlan() rend null quand il échoue : accepté, on range alors un résumé vide. */
  resume: resumeSchema.nullable().optional(),
  editeurId: editeurIdSchema.optional(),
});
export type PlanCreer = z.infer<typeof planCreerSchema>;

export const planMajSchema = z.object({
  revision: z.number().int().min(1),
  force: z.boolean().optional(),
  nom: nomPlan.optional(),
  etat: etatPlanSchema.optional(),
  vue: vueSchema.optional(),
  resume: resumeSchema.nullable().optional(),
  contrat: z.unknown().optional() /* validé par planImportSchema dans la route */,
});
export type PlanMaj = z.infer<typeof planMajSchema>;

export const planIdSchema = z.uuid();
