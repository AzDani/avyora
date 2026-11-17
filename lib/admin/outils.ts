import { normaliserPortable } from "@/lib/telephone";
import { LIBELLES_INTERNES } from "@/lib/accompagnement/contenu";

/**
 * Outils PURS du pilotage admin (refonte du 17/11/2026 : « il faut un truc pratique pour moi et facile »).
 * Rien ici ne lit la base : les pages et le tableau de bord s'en servent, les tests aussi.
 */

const JOUR = 864e5;

/** Lien d'appel (tel:) : chiffres et « + » seulement ; null si le numéro est trop court pour être appelé. */
export function lienAppel(tel: string | null | undefined): string | null {
  const c = String(tel ?? "").replace(/[^\d+]/g, "");
  return c.replace(/\D/g, "").length >= 6 ? `tel:${c}` : null;
}

/**
 * Lien WhatsApp (wa.me) vers un PORTABLE, avec un premier message déjà écrit. null pour un fixe français, un numéro
 * illisible ou vide : WhatsApp n'y répondrait pas.
 */
export function lienWhatsApp(tel: string | null | undefined, message?: string): string | null {
  const r = normaliserPortable(String(tel ?? ""));
  if (!r.ok) return null;
  const base = `https://wa.me/${r.tel.slice(1)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Combien de dates tombent dans les `jours` derniers jours. */
export function depuis(dates: string[], jours: number, maintenant: Date): number {
  const borne = maintenant.getTime() - jours * JOUR;
  return dates.filter((d) => {
    const t = new Date(d).getTime();
    return Number.isFinite(t) && t >= borne;
  }).length;
}

export type Semaine = { /** Lundi de la semaine, AAAA-MM-JJ (calendrier de Paris). */ debut: string; n: number };

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
/** Le jour du calendrier de Paris d'un instant, ramené à minuit UTC de ce jour (pour compter en jours entiers). */
const jourParis = (t: number) => Date.parse(`${JOUR_PARIS.format(new Date(t))}T00:00:00Z`);

/**
 * Le compte par semaine (du lundi au dimanche, à l'heure de Paris, comme les dates affichées) des `semaines` dernières
 * semaines, la semaine en cours en dernier.
 */
export function parSemaine(dates: string[], semaines: number, maintenant: Date): Semaine[] {
  const jour = jourParis(maintenant.getTime());
  const lundi = jour - ((new Date(jour).getUTCDay() + 6) % 7) * JOUR;
  const premier = lundi - (semaines - 1) * 7 * JOUR;
  const n = Array.from({ length: semaines }, () => 0);
  for (const d of dates) {
    const t = new Date(d).getTime();
    if (!Number.isFinite(t)) continue;
    const j = jourParis(t);
    if (j < premier) continue;
    const i = Math.floor((j - premier) / (7 * JOUR));
    if (i < semaines) n[i]++;
  }
  return n.map((v, i) => ({ debut: new Date(premier + i * 7 * JOUR).toISOString().slice(0, 10), n: v }));
}

/** Une demande de rappel de la page Accompagnement, telle que le journal (activity_log) la garde. */
export type DemandeAccompagnement = {
  id: string;
  recueLe: string;
  prenom: string;
  email: string;
  telephone: string | null;
  /** Libellé lisible du type de projet (Rénovation, Construction neuve…). */
  typeProjet: string;
  /** Libellés lisibles des besoins cochés. */
  besoins: string[];
  source: string | null;
  langue: "fr" | "en";
  /** L'e-mail de la demande est bien parti chez Daniel : sinon, l'admin est le seul endroit où elle se trouve. */
  emailRecu: boolean;
  /** Le message libre, gardé seulement quand l'e-mail n'est pas parti (sinon il est déjà dans la boîte). */
  message: string | null;
  /** Posé par « Marquer traitée » (lib/actions/admin.ts) ; null = à rappeler. */
  traiteeLe: string | null;
};

const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Lit une ligne du journal `secu:demande_accompagnement` (payload écrit par lib/actions/accompagnement.ts). */
export function lireDemande(r: { id: string; created_at: string; payload: unknown }): DemandeAccompagnement {
  const p = (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>;
  const types = LIBELLES_INTERNES.types as Record<string, string>;
  const besoins = LIBELLES_INTERNES.besoins as Record<string, string>;
  const type = texte(p.type_projet);
  return {
    id: r.id,
    recueLe: r.created_at,
    prenom: texte(p.prenom) || "Sans prénom",
    email: texte(p.email),
    telephone: texte(p.telephone) || null,
    typeProjet: types[type] ?? (type || "Non précisé"),
    besoins: (Array.isArray(p.besoins) ? p.besoins : []).map((b) => besoins[String(b)] ?? String(b)),
    source: texte(p.src) || null,
    langue: p.langue === "en" ? "en" : "fr",
    emailRecu: p.envoi_interne === "envoye",
    message: texte(p.message) || null,
    traiteeLe: texte(p.traitee_le) || null,
  };
}

/** « 17/11 à 14:32 » à l'heure de Paris (l'admin est en France, le serveur non). */
export function dateCourte(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", ...o });
  return `${f({ day: "2-digit", month: "2-digit" })} à ${f({ hour: "2-digit", minute: "2-digit" })}`;
}

/** Le premier message WhatsApp, prêt à envoyer : Daniel le relit et l'ajuste avant d'appuyer sur Envoyer. */
export const messageWhatsApp = {
  demande: (prenom: string) => `Bonjour ${prenom}, c'est Daniel d'AVYORA. Je reviens vers toi suite à ta demande sur le site.`,
  inscrit: () => "Bonjour, c'est Daniel d'AVYORA. Merci pour ton inscription ! As-tu un projet de travaux en cours ?",
};
