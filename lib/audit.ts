import { supabaseAdmin } from "@/lib/supabase/admin";
import { headers } from "next/headers";

/**
 * Journalisation des événements de sécurité dans activity_log (écriture via service_role ;
 * la table n'a pas de policy d'insert). NE JAMAIS journaliser de données sensibles inutiles
 * (mots de passe, tokens, contenu de documents). L'email est conservé pour la traçabilité auth.
 */
export type EvenementSecurite =
  | "connexion_reussie"
  | "connexion_echouee"
  | "inscription"
  | "deconnexion"
  | "reset_demande"
  /** Un lien d'accès demandé (inscription ou connexion sans mot de passe, B2). Payload : `page`, `issue`, `code` de Supabase. */
  | "lien_acces_demande"
  | "mot_de_passe_change"
  | "compte_supprime"
  | "export_donnees"
  | "action_admin"
  | "acces_refuse"
  /** Une estimation née d'un plan n'a pas pu être reliée (« Mes plans », C6) : le projet reste créé. */
  | "plan_lien_echoue";

export async function journaliser(
  type: EvenementSecurite,
  opts: { userId?: string | null; email?: string | null; payload?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    let ip = "unknown";
    let ua = "";
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
      ua = (h.get("user-agent") ?? "").slice(0, 200);
    } catch {}
    await supabaseAdmin()
      .from("activity_log")
      .insert({
        user_id: opts.userId ?? null,
        type: `secu:${type}`,
        payload: { ip, ua, email: opts.email ?? undefined, ...(opts.payload ?? {}) },
      });
  } catch {
    // La journalisation ne doit jamais casser le flux applicatif (best-effort).
  }
}
