/**
 * Le relevé des limites de Claude Code pour la salle Claude Code des bureaux virtuels (27/11/2026).
 *
 * Ces limites (fenêtre de 5 h, semaine tous modèles, semaine Fable) ne se lisent que depuis une session Claude (outil
 * get_usage de l'app). Une tâche planifiée sur le Mac de Daniel les lit, les écrit dans un fichier JSON, puis lance :
 *
 *   node scripts/releve-claude.mjs <fichier.json>
 *
 * Le fichier est la réponse de get_usage telle quelle ({ plan: { windows: [...], extraUsage: {...} } }) ; seuls les
 * pourcentages et les heures de remise à zéro sont gardés (rien d'autre n'est envoyé). Écrit une ligne dans
 * admin_claude_releves (migration 0018), avec la clé service_role lue dans .env.local et jamais affichée.
 * Rien n'est écrit si le fichier ne contient aucun pourcentage lisible.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** La réponse de get_usage → une ligne de la table (null pour ce qui manque). Exportée pour les tests. */
export function ligneReleve(u) {
  const plan = (u && u.plan) || u || {};
  const fenetres = Array.isArray(plan.windows) ? plan.windows : [];
  const trouve = (test) => fenetres.find((w) => w && typeof w.label === "string" && test(w.label.toLowerCase()));
  const part = (w) => (w && Number.isFinite(Number(w.percentUsed)) ? Math.min(100, Math.max(0, Number(w.percentUsed))) : null);
  const fin = (w) => (w && typeof w.resetsAt === "string" && !Number.isNaN(Date.parse(w.resetsAt)) ? new Date(w.resetsAt).toISOString() : null);
  const cinq = trouve((l) => l.includes("5-hour") || l.includes("5 h")), sem = trouve((l) => l.includes("weekly") && l.includes("all")), fable = trouve((l) => l.includes("weekly") && l.includes("fable"));
  const x = plan.extraUsage || {};
  const n = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    cinq_heures: part(cinq), cinq_heures_fin: fin(cinq),
    semaine: part(sem), semaine_fin: fin(sem),
    semaine_fable: part(fable), semaine_fable_fin: fin(fable),
    extra_actif: typeof x.enabled === "boolean" ? x.enabled : null, extra_depense: n(x.spent), extra_limite: n(x.monthlyLimit),
    extra_devise: typeof x.currency === "string" ? x.currency.slice(0, 8) : null,
  };
}

function lireEnv() {
  const env = {};
  for (const l of readFileSync(join(RACINE, ".env.local"), "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const fichier = process.argv[2];
  if (!fichier) { console.error("Usage : node scripts/releve-claude.mjs <fichier.json>"); process.exit(2); }
  const ligne = ligneReleve(JSON.parse(readFileSync(fichier, "utf8")));
  if (ligne.cinq_heures == null && ligne.semaine == null && ligne.semaine_fable == null) { console.error("Relevé vide : rien d'écrit."); process.exit(1); }
  const env = lireEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await sb.from("admin_claude_releves").insert(ligne);
  if (error) { console.error("Écriture impossible :", error.message); process.exit(1); }
  console.log(`Relevé écrit : 5 h ${ligne.cinq_heures ?? "—"} %, semaine ${ligne.semaine ?? "—"} %, Fable ${ligne.semaine_fable ?? "—"} %.`);
}
