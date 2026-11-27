import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readFileSync } from "node:fs";
import { CLE_API_EXPIRE, coutMicro, jaugesClaude, joursAvantExpiration, type ReleveClaude } from "@/lib/bureaux/claude";
import { construireBureaux, salleClaude, type SourcesBureaux } from "@/lib/bureaux/donnees";
import { demanderJson, type ClientClaude, type JournalAppel } from "@/lib/agents/claude";
import { ligneReleve } from "../scripts/releve-claude.mjs";

/** La salle Claude Code (27/11/2026) : limites relevées, crédits comptés appel par appel, clé qui expire. Aucun chiffre inventé. */
const MAINTENANT = new Date("2026-11-27T23:00:00Z");
const releve = (r: Partial<ReleveClaude> = {}): ReleveClaude => ({
  releveLe: "2026-11-27T22:48:00Z", cinqHeures: 5, cinqHeuresFin: "2026-11-28T00:04:00Z", semaine: 38, semaineFin: "2026-12-03T02:00:00Z", semaineFable: 67, semaineFableFin: "2026-12-03T02:00:00Z", ...r,
});
const sources = (s: Partial<SourcesBureaux> = {}): SourcesBureaux => ({ inscrits: [], plans: [], demandes: [], artisans: [], devis: [], avisAModerer: 0, enLigne: null, journee: null, maintenant: MAINTENANT, ...s });

describe("le coût d'un appel", () => {
  it("jetons réels × tarif officiel, en millionièmes de dollar ; modèle inconnu = pas de chiffre", () => {
    // Sonnet 5.5 : 2 $ / 10 $ par million de jetons → 3 000 jetons d'entrée et 1 000 de sortie = 0,006 + 0,010 = 0,016 $
    expect(coutMicro("claude-sonnet-5-5", { entree: 3000, sortie: 1000, cacheEcriture: 0, cacheLecture: 0 })).toBe(16000);
    expect(coutMicro("claude-opus-5-5", { entree: 1e6, sortie: 0, cacheEcriture: 0, cacheLecture: 1e6 })).toBe(4.2e6);
    expect(coutMicro("modele-inconnu", { entree: 1, sortie: 1, cacheEcriture: 0, cacheLecture: 0 })).toBeNull();
  });
  it("chaque appel des agents est compté avec sa tâche, son modèle et ses jetons", async () => {
    const vus: Parameters<JournalAppel>[0][] = [];
    const client: ClientClaude = { messages: { create: async () => ({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 3000, output_tokens: 1000, cache_creation_input_tokens: null, cache_read_input_tokens: null } }) as never } };
    await demanderJson({ systeme: "", contenu: "", schema: {}, client, tache: "compte_rendu", journal: async (l) => { vus.push(l); } });
    expect(vus).toEqual([{ tache: "compte_rendu", modele: "claude-sonnet-5-5", usage: { entree: 3000, sortie: 1000, cacheEcriture: 0, cacheLecture: 0 }, cout: 16000 }]);
  });
});

describe("les jauges de la salle", () => {
  it("un relevé récent : les trois limites en pourcentage, avec la remise à zéro", () => {
    const j = jaugesClaude({ releve: releve(), appels: { nb: 6, coutMicro: 420000, sansTarif: 0, parTache: { compte_rendu: 6 } }, cleClaude: true, maintenant: MAINTENANT });
    expect(j.map((x) => x.part)).toEqual([0.05, 0.38, 0.67, 0.0042]);
    expect(j[0].texte).toBe("5 % utilisés · se libère dans 1 h 04 · relevé il y a 12 min");
    expect(j[3].texte).toBe("0,42 $ sur 100 $ · 6 appels des agents");
  });
  it("une fenêtre dont la remise à zéro est passée n'est plus affichée pleine", () => {
    const j = jaugesClaude({ releve: releve({ cinqHeures: 92, cinqHeuresFin: "2026-11-27T22:00:00Z" }), appels: null, cleClaude: true, maintenant: MAINTENANT });
    expect(j[0].part).toBeNull();
    expect(j[0].mot).toBe("repartie");
  });
  it("sans relevé, sans migration, sans clé : rien d'inventé, et ça le dit", () => {
    const j = jaugesClaude({ releve: null, appels: null, cleClaude: false, maintenant: MAINTENANT, sansTables: true });
    expect(j.every((x) => x.part == null)).toBe(true);
    expect(j[0].texte).toBe("Migration 0018 à appliquer");
    expect(j[3].texte).toBe("Clé de l'API à poser dans Vercel");
  });
});

describe("la salle dans les bureaux", () => {
  it("Fable à 67 % : la salle est à surveiller, pas en tête des priorités", () => {
    const d = construireBureaux(sources({ releveClaude: releve(), appelsClaude: { nb: 0, coutMicro: 0, sansTarif: 0, parTache: {} }, cleClaude: true }));
    expect(d.pieces.claude.etat).toBe("attention");
    expect(d.pieces.claude.nb).toBe(67);
    expect(d.priorites.some((p) => p[0] === "claude")).toBe(false);
  });
  it("une limite à 90 % passe en tête des priorités : pas de débordement", () => {
    const d = construireBureaux(sources({ releveClaude: releve({ semaineFable: 90 }), cleClaude: true }));
    expect(d.pieces.claude.etat).toBe("critique");
    expect(d.priorites[0]).toEqual(["claude", "Claude Code : semaine · fable à 90 %", "pas de débordement"]);
  });
  it("un relevé de plus de 6 heures est signalé", () => {
    const p = salleClaude(releve({ releveLe: "2026-11-27T10:00:00Z", semaineFable: 10 }), null, true, false, MAINTENANT);
    expect(p.etat).toBe("attention");
    expect(p.conseil).toMatch(/plus de 6 heures/);
  });
  it("la clé : 4 décembre 2027, alerte 30 jours avant, priorité une fois expirée", () => {
    expect(joursAvantExpiration(MAINTENANT)).toBe(371);
    const avant = new Date(new Date(CLE_API_EXPIRE).getTime() - 20 * 864e5);
    expect(construireBureaux(sources({ maintenant: avant })).priorites[0]).toEqual(["claude", "La clé de l'API Claude expire dans 20 jours", "les agents tiennent"]);
    const apres = new Date(new Date(CLE_API_EXPIRE).getTime() + 864e5);
    expect(salleClaude(null, null, true, false, apres).etat).toBe("critique");
  });
});

describe("le relevé envoyé depuis le Mac", () => {
  it("ne garde que les pourcentages et les remises à zéro de la réponse de get_usage", () => {
    const l = ligneReleve({ plan: { status: "ok", plan: "Max", windows: [
      { label: "5-hour limit", percentUsed: 5, resetsAt: "2026-11-27T23:20:00.823Z", resetsIn: "1h 4m" },
      { label: "Weekly · all models", percentUsed: 38, resetsAt: "2026-12-03T02:00:00.823Z" },
      { label: "Weekly · Fable", percentUsed: 67, resetsAt: "2026-12-03T01:59:59.823Z" },
    ], extraUsage: { enabled: false, percentUsed: 0, spent: "0.00", monthlyLimit: "20.00", currency: "EUR" } }, context: { tokensUsed: 1 } });
    expect(l).toEqual({ cinq_heures: 5, cinq_heures_fin: "2026-11-27T23:20:00.823Z", semaine: 38, semaine_fin: "2026-12-03T02:00:00.823Z", semaine_fable: 67, semaine_fable_fin: "2026-12-03T01:59:59.823Z",
      extra_actif: false, extra_depense: 0, extra_limite: 20, extra_devise: "EUR" });
    expect(ligneReleve({}).cinq_heures).toBeNull();
  });
  it("la migration 0018 : deux tables fermées à tous sauf au serveur, et son retour", () => {
    const sql = readFileSync("supabase/migrations/0018_salle_claude.sql", "utf8");
    expect(sql.match(/enable row level security/g)).toHaveLength(2);
    expect(sql).not.toMatch(/create policy/i);
    expect(readFileSync("supabase/migrations/0018_salle_claude_retour.sql", "utf8")).toMatch(/drop table if exists public\.admin_agents_appels/);
  });
});
