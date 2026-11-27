/**
 * La salle Claude Code des bureaux virtuels (27/11/2026, demande de Daniel : « je veux tout suivre, je veux pas de
 * débordement »). Fichier PUR : les tarifs, le coût d'un appel, et les jauges de la salle. Les lectures sont dans
 * lib/data/claude.ts, l'enregistrement des appels dans lib/agents/claude.ts, le relevé des limites dans
 * scripts/releve-claude.mjs (lancé par une tâche planifiée sur le Mac de Daniel).
 *
 * Trois sources, trois natures :
 * - les limites de Claude Code (5 h, semaine, semaine Fable) ne se lisent QUE depuis une session Claude : elles arrivent
 *   par relevé, et la salle dit quand date le dernier ;
 * - les crédits de l'API : la clé du site ne voit pas le solde, donc le site compte lui-même ce que ses agents dépensent
 *   (jetons réels × tarif officiel) face aux 100 $ inclus chaque mois dans le forfait Max ;
 * - la clé de l'API : sa date d'expiration, choisie par Daniel à la création (4 décembre 2027).
 */

/** Tarifs officiels de l'API, en dollars par million de jetons (platform.claude.com/docs/en/about-claude/pricing, lus le 27/11/2026). */
export const TARIFS: Record<string, { entree: number; sortie: number; cacheEcriture: number; cacheLecture: number }> = {
  "claude-sonnet-5-5": { entree: 2, sortie: 10, cacheEcriture: 2.5, cacheLecture: 0.1 },
  "claude-opus-5-5": { entree: 4, sortie: 20, cacheEcriture: 5, cacheLecture: 0.2 },
  // Haiku 5.5 : palier des prompts jusqu'à 100 000 jetons (nos agents en envoient bien moins).
  "claude-haiku-5-5": { entree: 0.1, sortie: 0.5, cacheEcriture: 0.125, cacheLecture: 0.01 },
};

export type Usage = { entree: number; sortie: number; cacheEcriture: number; cacheLecture: number };

/** Le coût d'un appel, en millionièmes de dollar ; null si le modèle n'est pas dans la grille (on ne devine pas). */
export function coutMicro(modele: string, u: Usage): number | null {
  const t = TARIFS[modele];
  if (!t) return null;
  // jetons × ($ par million de jetons) = millionièmes de dollar
  return Math.round(u.entree * t.entree + u.sortie * t.sortie + u.cacheEcriture * t.cacheEcriture + u.cacheLecture * t.cacheLecture);
}

/** Les 100 $ de crédits API inclus chaque mois dans le forfait Max (message de la console Anthropic, 27/11/2026). */
export const CREDIT_MENSUEL_USD = 100;
/** L'expiration de la clé du site (« AVYORA SITE », créée le 27/11/2026) : 4 décembre 2027, 16:00 UTC−5. */
export const CLE_API_EXPIRE = "2027-12-04T21:00:00Z";
/** Un relevé plus vieux que ça est signalé (le Mac était en veille, ou l'app fermée). */
export const RELEVE_VIEUX_H = 6;

export type ReleveClaude = {
  releveLe: string;
  cinqHeures: number | null; cinqHeuresFin: string | null;
  semaine: number | null; semaineFin: string | null;
  semaineFable: number | null; semaineFableFin: string | null;
};
export type AppelsMois = { nb: number; coutMicro: number; sansTarif: number; parTache: Record<string, number> };

export type JaugeClaude = { cle: string; hote: "Claude Code" | "API Claude"; nom: string; part: number | null; texte: string; mot?: string };

const fmtJour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
/** « 1 h 04 », « 25 min », « 3 j » : une durée lisible. */
export function duree(ms: number): string {
  const mn = Math.max(0, Math.round(ms / 60000));
  if (mn < 60) return `${mn} min`;
  if (mn < 48 * 60) { const h = Math.floor(mn / 60), r = mn % 60; return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`; }
  return `${Math.round(mn / 1440)} j`;
}
export const dollars = (micro: number) => `${(micro / 1e6).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

/**
 * Les jauges de la salle. Ce qui n'est pas mesuré le dit (part null), sans chiffre inventé. Une fenêtre dont l'heure de
 * remise à zéro est passée depuis le relevé est annoncée comme repartie à zéro, pas comme encore pleine.
 */
export function jaugesClaude(o: { releve: ReleveClaude | null; appels: AppelsMois | null; cleClaude: boolean; maintenant: Date; sansTables?: boolean }): JaugeClaude[] {
  const { releve: r, appels, maintenant } = o, t = maintenant.getTime();
  const age = r ? t - new Date(r.releveLe).getTime() : null;
  const quand = age == null ? "" : ` · relevé il y a ${duree(age)}`;
  const fenetre = (cle: string, nom: string, part: number | null | undefined, fin: string | null | undefined): JaugeClaude => {
    if (!r || part == null) return { cle, hote: "Claude Code", nom, part: null, texte: o.sansTables ? "Migration 0018 à appliquer" : "En attente du premier relevé", mot: "à relever" };
    const finT = fin ? new Date(fin).getTime() : null;
    if (finT != null && finT <= t) return { cle, hote: "Claude Code", nom, part: null, texte: `Repartie à zéro le ${fmtJour.format(new Date(finT))}${quand}`, mot: "repartie" };
    const reprise = finT == null ? "" : cle === "cinq-heures" ? ` · se libère dans ${duree(finT - t)}` : ` · repart le ${fmtJour.format(new Date(finT))}`;
    return { cle, hote: "Claude Code", nom, part: Math.max(0, part) / 100, texte: `${Math.round(part)} % utilisés${reprise}${quand}` };
  };
  const cout = appels?.coutMicro ?? 0;
  const credits: JaugeClaude = !o.cleClaude
    ? { cle: "credits", hote: "API Claude", nom: "Crédits du mois", part: null, texte: "Clé de l'API à poser dans Vercel", mot: "à poser" }
    : !appels
      ? { cle: "credits", hote: "API Claude", nom: "Crédits du mois", part: null, texte: o.sansTables ? "Migration 0018 à appliquer" : "Compteur illisible pour l'instant", mot: "—" }
      : { cle: "credits", hote: "API Claude", nom: "Crédits du mois", part: cout / (CREDIT_MENSUEL_USD * 1e6),
          texte: `${dollars(cout)} sur ${CREDIT_MENSUEL_USD} $ · ${appels.nb} appel${appels.nb > 1 ? "s" : ""} des agents${appels.sansTarif ? ` (dont ${appels.sansTarif} sans tarif connu)` : ""}` };
  return [
    fenetre("cinq-heures", "Fenêtre de 5 h", r?.cinqHeures, r?.cinqHeuresFin),
    fenetre("semaine", "Semaine · tous modèles", r?.semaine, r?.semaineFin),
    fenetre("semaine-fable", "Semaine · Fable", r?.semaineFable, r?.semaineFableFin),
    credits,
  ];
}

/** La clé de l'API : combien de jours avant son expiration (négatif = expirée). */
export function joursAvantExpiration(maintenant: Date, expire = CLE_API_EXPIRE): number {
  return Math.floor((new Date(expire).getTime() - maintenant.getTime()) / 864e5);
}
export const dateExpiration = (expire = CLE_API_EXPIRE) => fmtDate.format(new Date(expire));
/** Le relevé est-il trop vieux pour qu'on s'y fie ? */
export const releveVieux = (r: ReleveClaude | null, maintenant: Date) => !!r && maintenant.getTime() - new Date(r.releveLe).getTime() > RELEVE_VIEUX_H * 36e5;
