import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Schémas de validation des entrées API (défense contre injections/malformations/débordements).
 * `reponses` = objet libre du questionnaire : on borne sa taille sérialisée plutôt que chaque champ
 * (le moteur ignore les champs inconnus). Toutes les chaînes sont bornées.
 */
const reponses = z
  .record(z.string(), z.unknown())
  .refine((r) => JSON.stringify(r).length <= 40_000, "réponses trop volumineuses");

export const projetCreateSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  typeBien: z.string().max(40).optional(),
  surface: z.coerce.number().positive().max(1_000_000),
  codePostal: z.string().regex(/^\d{5}$/),
  reponses,
});

export const projetPatchSchema = z.union([
  z.object({ archived: z.boolean() }),
  z.object({
    nom: z.string().trim().min(1).max(120),
    typeBien: z.string().max(40).optional(),
    surface: z.coerce.number().positive().max(1_000_000),
    codePostal: z.string().regex(/^\d{5}$/),
    reponses,
  }),
  // Renommage seul (le nom auto « Rénovation — … » peut être remplacé par un libellé libre).
  z.object({ nom: z.string().trim().min(1).max(120) }).strict(),
]);

export const pieceSchema = z.object({
  pieceId: z.union([z.string(), z.number()]).optional(),
  nom: z.string().trim().min(1).max(80),
  typePiece: z.string().max(40).optional(),
  longueur: z.coerce.number().positive().max(1000),
  largeur: z.coerce.number().positive().max(1000),
  hauteur: z.coerce.number().positive().max(20).optional(),
  portes: z.coerce.number().int().min(0).max(100).optional(),
  fenetres: z.coerce.number().int().min(0).max(100).optional(),
  carrelageSol: z.boolean().optional(),
  faience: z.boolean().optional(),
});

export const depenseSchema = z.object({
  corpsEtat: z.string().trim().min(1).max(60),
  libelle: z.string().trim().min(1).max(200),
  montant: z.coerce.number().positive().max(100_000_000),
});

export const chantierStatutSchema = z.object({
  taskId: z.union([z.string(), z.number()]).transform(String),
  statut: z.enum(["a_faire", "en_cours", "fait"]),
});

export const artisanSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  corpsEtat: z.string().max(60).optional(),
  telephone: z.string().max(40).optional(),
  email: z.string().max(200).optional(),
  ville: z.string().max(120).optional(),
  note: z.string().max(2000).optional(),
});

/** Parse + valide. Renvoie {ok:true,data} ou {ok:false,res} (400 générique, sans fuite d'info). */
export function valider<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; res: NextResponse } {
  const r = schema.safeParse(body);
  if (!r.success) {
    return { ok: false, res: NextResponse.json({ error: "Données invalides." }, { status: 400 }) };
  }
  return { ok: true, data: r.data };
}

/** Lit le JSON du body sans jeter (retourne null si invalide → la validation échouera proprement). */
export async function jsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
