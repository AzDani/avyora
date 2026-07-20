import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CONFIG_VIDE, type FormConfig } from "./customq";

const CLE = "form_customization";

/**
 * Config de personnalisation du questionnaire (serveur uniquement).
 * Stockée dans la table globale `settings` (blob JSON). Lecture via le client scopé
 * (RLS lecture publique), écriture via service_role (table globale, pas de policy write).
 */
export async function getFormConfig(): Promise<FormConfig> {
  const sb = await supabaseServer();
  const { data } = await sb.from("settings").select("valeur").eq("cle", CLE).maybeSingle();
  if (!data) return CONFIG_VIDE;
  try {
    const c = JSON.parse(data.valeur) as FormConfig;
    return {
      questions: c.questions ?? [],
      builtin: c.builtin ?? {},
      order: c.order ?? {},
      headings: c.headings ?? [],
      hiddenBlocs: c.hiddenBlocs ?? [],
      sdbQuestions: c.sdbQuestions ?? [],
    };
  } catch {
    return CONFIG_VIDE;
  }
}

export async function saveFormConfig(config: FormConfig): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("settings")
    .upsert({ cle: CLE, valeur: JSON.stringify(config) }, { onConflict: "cle" });
  if (error) throw new Error(error.message);
}
