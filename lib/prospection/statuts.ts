/**
 * L'Agent Prospection (28/11/2026) : les règles PURES, partagées par le site (page /admin/marketing, salle Marketing des
 * bureaux 3D, action qui change un statut). Rien ici ne lit la base. Les e-mails partent du Mac de Daniel
 * (scripts/prospection.mjs), jamais du site.
 *
 * scripts/prospection.mjs recopie les petites règles (statuts, transitions, e-mail, jours ouvrés) car Node ne peut pas
 * importer ce fichier TypeScript : tests/prospection.test.ts vérifie que les deux copies restent identiques.
 */

export const STATUTS = ["a_envoyer", "envoye", "relance", "repondu", "interesse", "rdv", "inscrit", "refus", "stop", "erreur"] as const;
export type Statut = (typeof STATUTS)[number];
export const CIBLES = ["artisan", "agence", "architecte", "societe"] as const;
export type Cible = (typeof CIBLES)[number];

/** Les mots affichés dans l'admin. */
export const NOMS_STATUTS: Record<Statut, string> = {
  a_envoyer: "À envoyer", envoye: "Envoyé", relance: "Relancé", repondu: "A répondu", interesse: "Intéressé",
  rdv: "Rendez-vous", inscrit: "Inscrit", refus: "Pas intéressé", stop: "STOP", erreur: "Erreur d'envoi",
};
export const NOMS_CIBLES: Record<Cible, string> = { artisan: "Artisan", agence: "Agence", architecte: "Architecte", societe: "Société" };

/** Les statuts qui veulent dire « la personne a répondu » : ils posent reponse_le. */
export const STATUTS_REPONSE: readonly Statut[] = ["repondu", "interesse", "rdv", "inscrit", "refus", "stop"];
/** Ceux qui attendent Daniel : quelqu'un a répondu, il faut le rappeler. */
export const STATUTS_A_TRAITER: readonly Statut[] = ["repondu", "interesse"];
/** Après un STOP, plus jamais d'e-mail : ces statuts (qui mènent à un envoi) sont interdits. */
export const INTERDITS_APRES_STOP: readonly Statut[] = ["a_envoyer", "envoye", "relance"];
/** Délai avant la relance, en jours ouvrés (lundi à vendredi, heure de Paris). */
export const RELANCE_JOURS_OUVRES = 5;

export const estStatut = (v: unknown): v is Statut => typeof v === "string" && (STATUTS as readonly string[]).includes(v);
export const estCible = (v: unknown): v is Cible => typeof v === "string" && (CIBLES as readonly string[]).includes(v);

/** « Jean.Dupont@Exemple.FR  » → « jean.dupont@exemple.fr » ; null si ce n'est pas une adresse e-mail. */
export function normaliserEmail(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const e = brut.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  return e;
}

/** Peut-on passer de `de` à `vers` ? Un statut inconnu est refusé ; après un STOP, plus rien qui mène à un envoi. */
export function transition(de: unknown, vers: unknown): { ok: true } | { ok: false; raison: string } {
  if (!estStatut(vers)) return { ok: false, raison: `Statut inconnu : ${String(vers)}` };
  if (!estStatut(de)) return { ok: false, raison: `Statut actuel inconnu : ${String(de)}` };
  if (de === "stop" && INTERDITS_APRES_STOP.includes(vers)) return { ok: false, raison: "Cette personne a répondu STOP : on ne lui écrit plus jamais." };
  return { ok: true };
}

/** Les dates à poser en passant à `statut`, seulement si elles sont encore vides. */
export function datesAPoser(statut: Statut, existant: { envoye_le?: string | null; relance_le?: string | null; reponse_le?: string | null }, maintenant: Date): Record<string, string> {
  const iso = maintenant.toISOString(), d: Record<string, string> = {};
  if (statut === "envoye" && !existant.envoye_le) d.envoye_le = iso;
  if (statut === "relance" && !existant.relance_le) d.relance_le = iso;
  if (STATUTS_REPONSE.includes(statut) && !existant.reponse_le) d.reponse_le = iso;
  return d;
}

const fmtJour = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
/** Le jour (heure de Paris) d'un instant, en millisecondes UTC à minuit de ce jour. */
function jourParis(t: Date): number {
  const [y, m, d] = fmtJour.format(t).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Combien de jours ouvrés (lundi à vendredi, heure de Paris) après le jour de `debut`, jusqu'au jour de `fin` compris. */
export function joursOuvres(debut: Date, fin: Date): number {
  const a = jourParis(debut), b = jourParis(fin);
  let n = 0;
  for (let t = a + 864e5; t <= b; t += 864e5) {
    const j = new Date(t).getUTCDay();
    if (j !== 0 && j !== 6) n++;
  }
  return n;
}

/** Un prospect tel que l'admin le lit. */
export type Prospect = {
  id: string; email: string; entreprise: string; contact: string | null; cible: Cible; metier: string | null; commune: string | null; ville: string | null;
  lot: string | null; envoyeLe: string | null; relanceLe: string | null; reponseLe: string | null; statut: Statut; note: string | null; majLe: string;
};

/** Faut-il le relancer ? Envoyé, jamais relancé, et le premier e-mail date d'au moins 5 jours ouvrés. */
export const estARelancer = (p: Pick<Prospect, "statut" | "envoyeLe" | "relanceLe">, maintenant: Date) =>
  p.statut === "envoye" && !p.relanceLe && !!p.envoyeLe && joursOuvres(new Date(p.envoyeLe), maintenant) >= RELANCE_JOURS_OUVRES;

export type ResumeProspection = {
  total: number;
  parStatut: Record<Statut, number>;
  parCible: Record<Cible, number>;
  /** E-mails envoyés en tout (un premier envoi par prospect). */
  envoyes: number;
  /** Premiers e-mails envoyés ces 7 derniers jours. */
  envoyes7: number;
  /** Les personnes qui ont répondu (tous statuts de réponse, STOP compris). */
  reponses: number;
  aTraiter: number;
  aRelancer: number;
  dernierLot: { lot: string; nb: number } | null;
  /** Les prospects, les derniers envoyés d'abord (la page admin et les noms de l'agent). */
  prospects: Prospect[];
};

const zero = <K extends string>(cles: readonly K[]) => Object.fromEntries(cles.map((k) => [k, 0])) as Record<K, number>;

/** Le résumé de la prospection, à partir de la liste des prospects. */
export function resumerProspection(prospects: Prospect[], maintenant: Date): ResumeProspection {
  const parStatut = zero(STATUTS), parCible = zero(CIBLES), lots = new Map<string, number>();
  let envoyes = 0, envoyes7 = 0, aRelancer = 0;
  for (const p of prospects) {
    parStatut[p.statut]++; parCible[p.cible]++;
    if (p.envoyeLe) { envoyes++; if (maintenant.getTime() - new Date(p.envoyeLe).getTime() <= 7 * 864e5) envoyes7++; }
    if (estARelancer(p, maintenant)) aRelancer++;
    if (p.lot) lots.set(p.lot, (lots.get(p.lot) ?? 0) + 1);
  }
  // Le dernier lot : les lots sont datés (« 2026-11-28 »), le plus grand est le plus récent.
  const lot = [...lots.keys()].sort().at(-1);
  return {
    total: prospects.length, parStatut, parCible, envoyes, envoyes7,
    reponses: STATUTS_REPONSE.reduce((t, k) => t + parStatut[k], 0),
    aTraiter: STATUTS_A_TRAITER.reduce((t, k) => t + parStatut[k], 0),
    aRelancer,
    dernierLot: lot ? { lot, nb: lots.get(lot) ?? 0 } : null,
    prospects,
  };
}

/** « 2026-11-28 » → « 28 novembre » ; un autre nom de lot reste tel quel. */
export function nomLot(lot: string): string {
  const m = lot.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }) : lot;
}
