import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { coutMicro, type Usage } from "@/lib/bureaux/claude";

/**
 * L'appel à Claude des agents IA d'AVYORA (27/11/2026). Un seul endroit : le modèle, la clé, les erreurs.
 *
 * - La clé est ANTHROPIC_API_KEY, posée par Daniel lui-même dans Vercel (et dans .env.local pour essayer en local).
 *   Sans elle, rien ne part : l'agent répond « clé à poser ».
 * - Le modèle se règle par AVYORA_MODELE_AGENTS ; par défaut Sonnet 5.5, sans réflexion : les agents RÉDIGENT (mettre en
 *   forme des notes, un compte rendu), Opus n'apporterait rien et coûterait plus cher (décision de Daniel, 27/11/2026).
 * - La réponse est un JSON imposé par un schéma (sortie structurée) : jamais de texte à deviner.
 * - On n'envoie que ce dont l'agent a besoin : prénom, projet, échanges ; jamais l'e-mail ni le téléphone du client.
 */
export const MODELE_DEFAUT = "claude-sonnet-5-5";
export type ErreurAgent = "cle_absente" | "refus" | "coupe" | "illisible" | "panne";
export class AgentErreur extends Error {
  constructor(public code: ErreurAgent, message: string) { super(message); }
}
export const MESSAGES_ERREUR: Record<ErreurAgent, string> = {
  cle_absente: "La clé de l'API Claude n'est pas encore posée (ANTHROPIC_API_KEY dans Vercel).",
  refus: "Claude a refusé de rédiger ce texte. Écris-le toi-même cette fois.",
  coupe: "La réponse a été coupée avant la fin. Réessaie.",
  illisible: "La réponse de Claude était illisible. Réessaie.",
  panne: "Claude ne répond pas pour l'instant. Réessaie dans une minute.",
};

/** Ce que l'appel utilise de l'API (le vrai client, ou un faux dans les tests). */
export type ClientClaude = { messages: { create: (p: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message> } };
let client: ClientClaude | null = null;
export function clientClaude(): ClientClaude {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) throw new AgentErreur("cle_absente", MESSAGES_ERREUR.cle_absente);
  if (!client) client = new Anthropic({ apiKey: cle });
  return client;
}

/**
 * Chaque appel est compté (salle Claude Code des bureaux, migration 0018) : jetons réels renvoyés par l'API et coût au
 * tarif officiel. Le compteur ne bloque jamais l'agent : s'il échoue (table absente…), l'appel est simplement non compté.
 * Avec un faux client (tests), rien n'est compté sauf si `journal` est fourni.
 */
export type JournalAppel = (l: { tache: string; modele: string; usage: Usage; cout: number | null }) => Promise<void>;
export const journalBase: JournalAppel = async (l) => {
  try {
    await supabaseAdmin().from("admin_agents_appels").insert({ tache: l.tache, modele: l.modele, entree: l.usage.entree, sortie: l.usage.sortie, cache_ecriture: l.usage.cacheEcriture, cache_lecture: l.usage.cacheLecture, cout_micro: l.cout });
  } catch { /* non compté */ }
};

export async function demanderJson<T>(o: { systeme: string; contenu: string; schema: Record<string, unknown>; maxTokens?: number; client?: ClientClaude; tache?: string; journal?: JournalAppel }): Promise<T> {
  const c = o.client ?? clientClaude();
  const modele = process.env.AVYORA_MODELE_AGENTS || MODELE_DEFAUT;
  let r: Anthropic.Message;
  try {
    r = await c.messages.create({
      model: modele,
      max_tokens: o.maxTokens ?? 8000,
      // Sans réflexion : sur Sonnet 5.5, l'API refuse « disabled » et demande « between_tools » (pas de réflexion avant de
      // répondre ; nos agents n'ont pas d'outils). Le SDK 0.112 ne connaît pas encore cette valeur, d'où la conversion.
      thinking: { type: "between_tools" } as unknown as Anthropic.ThinkingConfigParam,
      output_config: { format: { type: "json_schema", schema: o.schema } },
      system: o.systeme,
      messages: [{ role: "user", content: o.contenu }],
    });
  } catch (e) {
    if (e instanceof AgentErreur) throw e;
    console.error("[agents] appel Claude impossible :", e instanceof Error ? e.message : e);
    throw new AgentErreur("panne", MESSAGES_ERREUR.panne);
  }
  const journal = o.journal ?? (o.client ? null : journalBase);
  if (journal && r.usage) {
    const u = r.usage, usage: Usage = { entree: u.input_tokens ?? 0, sortie: u.output_tokens ?? 0, cacheEcriture: u.cache_creation_input_tokens ?? 0, cacheLecture: u.cache_read_input_tokens ?? 0 };
    await journal({ tache: (o.tache ?? "autre").slice(0, 40), modele, usage, cout: coutMicro(modele, usage) });
  }
  if (r.stop_reason === "refusal") throw new AgentErreur("refus", MESSAGES_ERREUR.refus);
  if (r.stop_reason === "max_tokens") throw new AgentErreur("coupe", MESSAGES_ERREUR.coupe);
  const texte = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  try { return JSON.parse(texte) as T; } catch { throw new AgentErreur("illisible", MESSAGES_ERREUR.illisible); }
}
