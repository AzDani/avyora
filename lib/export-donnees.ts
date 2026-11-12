/**
 * Export RGPD (droit d'accès, art. 15, et portabilité, art. 20) : toutes les données d'un compte en un fichier JSON,
 * téléchargé depuis « Mon compte » (GET /api/mon-compte/export).
 *
 * Tout passe par le client Supabase de la SESSION (clé anon + RLS) : la base elle-même borne l'export à ce que le
 * compte a le droit de lire. Les filtres explicites (owner_id, user_id, project_id des projets du compte) écartent en
 * plus les projets d'autres comptes auxquels ce compte serait invité : on exporte SES données, pas celles des autres.
 * Une table absente ou illisible ne fait pas échouer l'export : elle est citée dans `indisponibles`.
 *
 * Module sans dépendance à Next ni à @supabase : il prend un client minimal, ce qui le rend testable sans base.
 */

type Reponse = { data: unknown[] | null; error: unknown };
type Requete = PromiseLike<Reponse> & {
  eq(colonne: string, valeur: string): PromiseLike<Reponse>;
  in(colonne: string, valeurs: string[]): PromiseLike<Reponse>;
};
/** Le sous-ensemble du client Supabase utilisé ici. */
export type ClientLecture = { from(table: string): { select(colonnes: string): Requete } };

/** Le compte connecté (sous-ensemble de `User` de @supabase/supabase-js). */
export type CompteExporte = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

/** Les tables rattachées au compte directement (colonne = id du compte). */
export const TABLES_DU_COMPTE: { table: string; colonne: string }[] = [
  { table: "profiles", colonne: "id" },
  { table: "floor_plans", colonne: "owner_id" },
  { table: "artisans", colonne: "owner_id" },
  { table: "notifications", colonne: "user_id" },
];

/**
 * Les tables rattachées aux projets du compte (colonne project_id). Pas `project_members` ni `activity_log` : elles
 * portent les identifiants et les actions d'AUTRES comptes (invités), qui n'ont pas à sortir dans cet export.
 */
export const TABLES_DES_PROJETS = ["expenses", "rooms", "tasks", "scenarios", "quotes", "documents", "project_plans"] as const;

/** Le nom du fichier téléchargé, daté (jour UTC). */
export function nomFichierExport(maintenant: Date = new Date()): string {
  return `avyora-mes-donnees-${maintenant.toISOString().slice(0, 10)}.json`;
}

/** Rassemble les données du compte. Ne lève pas : une lecture qui échoue est notée dans `indisponibles`. */
export async function exporterDonnees(sb: ClientLecture, compte: CompteExporte, maintenant: Date = new Date()) {
  const indisponibles: string[] = [];
  const lire = async (table: string, q: PromiseLike<Reponse>): Promise<unknown[]> => {
    try {
      const { data, error } = await q;
      if (error) {
        indisponibles.push(table);
        return [];
      }
      return data ?? [];
    } catch {
      indisponibles.push(table);
      return [];
    }
  };

  const projets = (await lire("projects", sb.from("projects").select("*").eq("owner_id", compte.id))) as { id?: unknown }[];
  const idsProjets = projets.map((p) => p.id).filter((id): id is string => typeof id === "string");

  const donnees: Record<string, unknown[]> = { projects: projets };
  for (const { table, colonne } of TABLES_DU_COMPTE) {
    donnees[table] = await lire(table, sb.from(table).select("*").eq(colonne, compte.id));
  }
  for (const table of TABLES_DES_PROJETS) {
    donnees[table] = idsProjets.length ? await lire(table, sb.from(table).select("*").in("project_id", idsProjets)) : [];
  }

  return {
    format: "avyora-export-rgpd",
    version: 1,
    genere_le: maintenant.toISOString(),
    responsable: "AVYORA — contact@getavyora.fr",
    compte: {
      id: compte.id,
      email: compte.email ?? null,
      cree_le: compte.created_at ?? null,
      derniere_connexion: compte.last_sign_in_at ?? null,
      // Prénom, pseudo, profil, acceptation des CGU, consentement aux nouveautés, abonnement.
      metadonnees: compte.user_metadata ?? {},
      metadonnees_application: compte.app_metadata ?? {},
    },
    donnees,
    indisponibles,
  };
}
