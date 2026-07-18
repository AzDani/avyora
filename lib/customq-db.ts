import { db } from "./db";
import { CONFIG_VIDE, type FormConfig } from "./customq";

const CLE = "form_customization";

/** Lit la config de personnalisation (serveur uniquement). */
export function getFormConfig(): FormConfig {
  const row = db.prepare("SELECT valeur FROM settings WHERE cle = ?").get(CLE) as
    | { valeur: string }
    | undefined;
  if (!row) return CONFIG_VIDE;
  try {
    const c = JSON.parse(row.valeur) as FormConfig;
    return { questions: c.questions ?? [], builtin: c.builtin ?? {} };
  } catch {
    return CONFIG_VIDE;
  }
}

export function saveFormConfig(config: FormConfig) {
  db.prepare(
    "INSERT INTO settings (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur"
  ).run(CLE, JSON.stringify(config));
}
