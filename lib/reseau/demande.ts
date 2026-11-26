import { z } from "zod";
import { CLES_METIERS, METIERS, type CleMetier } from "./metiers";
import { departementDuCodePostal } from "./departements";
import { normaliserPortable } from "@/lib/telephone";

/**
 * La demande de devis d'un client au Réseau AVYORA (phase 2, décisions de Dani du 17/11/2026). Module pur, partagé par
 * le formulaire et l'action serveur (lib/actions/devis.ts), qui revérifie tout.
 * - Seul le TYPE de travaux est obligatoire (plus le lieu et de quoi joindre le client) ; description, quantités,
 *   délai et photos sont facultatifs : si le client ne sait pas, l'artisan ira chercher les infos.
 * - Le client choisit lui-même jusqu'à 3 artisans validés de son département. Aucun dans sa zone : la demande est
 *   gardée et Daniel est prévenu.
 * - Réservé à AVYORA Pro (pendant la bêta, tout compte confirmé l'est).
 */

export const MAX_ARTISANS = 3;
/** Artisans contactés au plus par demande, remplacements compris (phase 3) : 3 en cours, 6 au total. */
export const MAX_CONTACTES = 6;
/** Phase 3 : rappel à l'artisan après 2 jours sans réponse, expiration après 5, avis demandé 14 jours après l'acceptation. */
export const RELANCE_JOURS = 2;
export const EXPIRATION_JOURS = 5;
export const SONDAGE_JOURS = 14;
export const MAX_PHOTOS_DEMANDE = 6;

export const DELAIS = [
  ["urgent", "Le plus vite possible"],
  ["trois_mois", "Dans les 3 mois"],
  ["six_mois", "Dans 3 à 6 mois"],
  ["plus_tard", "Plus tard"],
  ["nsp", "Je ne sais pas encore"],
] as const;
export type Delai = (typeof DELAIS)[number][0];
const LIB_DELAI = new Map<string, string>(DELAIS);
export const labelDelai = (d: string | null) => (d ? LIB_DELAI.get(d) ?? d : "Non précisé");

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/;
const ligne = (max: number) => z.string().trim().max(max, "trop_long").refine((s) => !CONTROLE.test(s) && !/[\r\n\t]/.test(s), "invalide");
const bloc = (max: number) => z.string().trim().max(max, "trop_long").refine((s) => !CONTROLE.test(s), "invalide");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const demandeDevisSchema = z.object({
  metiers: z.array(z.enum(CLES_METIERS as [string, ...string[]], "invalide")).min(1, "requis").max(CLES_METIERS.length, "invalide"),
  codePostal: z.string().trim().refine((s) => s !== "", "requis").refine((s) => departementDuCodePostal(s) !== null, "invalide"),
  ville: ligne(120),
  /** L'adresse du chantier (phase 3), facultative : montrée seulement à l'artisan qui accepte. */
  adresse: ligne(200),
  description: bloc(3000),
  quantites: bloc(1500),
  delai: z.union([z.literal(""), z.enum(DELAIS.map(([k]) => k) as [Delai, ...Delai[]])], "invalide"),
  artisans: z.array(z.string().regex(UUID, "invalide")).max(MAX_ARTISANS, "trop"),
  prenom: ligne(60).min(1, "requis").refine((s) => /^\p{L}[\p{L}\p{M} '’.-]*$/u.test(s), "invalide"),
  telephone: z.string().transform((s, ctx) => {
    const r = normaliserPortable(s);
    if (!r.ok) { ctx.addIssue({ code: "custom", message: r.erreur === "vide" ? "requis" : r.erreur }); return z.NEVER; }
    return r.tel;
  }),
  joindreEstimation: z.boolean(),
  projetId: z.union([z.literal(""), z.string().regex(UUID, "invalide")]),
  consentement: z.literal(true, "requis"),
});

export type DemandeDevis = z.output<typeof demandeDevisSchema>;
export type ChampDemande = keyof DemandeDevis;
export type ErreursDemande = Partial<Record<ChampDemande | "photos", string>>;

export function validerDemandeDevis(brut: unknown): { ok: true; d: DemandeDevis } | { ok: false; erreurs: ErreursDemande } {
  const b = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const liste = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : []);
  const chaine = (v: unknown) => (typeof v === "string" ? v : "");
  const r = demandeDevisSchema.safeParse({
    metiers: liste(b.metiers), codePostal: chaine(b.codePostal), ville: chaine(b.ville), adresse: chaine(b.adresse),
    description: chaine(b.description).replace(/\r\n?/g, "\n"), quantites: chaine(b.quantites).replace(/\r\n?/g, "\n"),
    delai: chaine(b.delai), artisans: liste(b.artisans), prenom: chaine(b.prenom), telephone: chaine(b.telephone),
    joindreEstimation: b.joindreEstimation === true, projetId: chaine(b.projetId), consentement: b.consentement === true,
  });
  if (r.success) return { ok: true, d: r.data };
  const erreurs: ErreursDemande = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0]) as ChampDemande;
    if (!erreurs[k]) erreurs[k] = i.message;
  }
  return { ok: false, erreurs };
}

export const MESSAGES_DEMANDE: Record<string, string> = {
  requis: "Ce champ est obligatoire.",
  invalide: "Ce n'est pas valide : vérifie ce que tu as écrit.",
  trop_long: "C'est trop long.",
  choisir: "Choisis au moins un artisan dans la liste.",
  trop: `Tu peux choisir ${MAX_ARTISANS} artisans au plus.`,
  format: "Ce numéro n'est pas lisible : écris-le comme 06 12 34 56 78.",
  pasPortable: "Il faut un numéro de portable (06 ou 07) : c'est celui que l'artisan appellera.",
  indisponible: "Un artisan choisi n'est plus disponible pour ces travaux : refais ton choix.",
};

/** Les métiers que les lots chiffrés d'un projet font intervenir (pour pré-cocher le formulaire). */
export function metiersDesLots(lots: { corps: string }[]): CleMetier[] {
  const corps = new Set(lots.map((l) => l.corps));
  return METIERS.filter((m) => m.lots.some((l) => corps.has(l))).map((m) => m.cle);
}

/** Ce qui est joint à la demande quand le client partage son estimation : le total et les postes par lot. */
export type EstimationJointe = { ttc: number; surface: number; typeBien: string; nature: "reno" | "neuf"; lots: { lot: string; ttc: number }[] };

/** Un artisan tel que le CLIENT le voit pour choisir (jamais ses coordonnées avant qu'il accepte). */
export type ArtisanPropose = {
  id: string;
  nom: string;
  metiers: string[];
  presentation: string | null;
  rge: boolean;
  siteWeb: string | null;
  lienAvis: string | null;
  photos: string[];
  /** Avis publiés (25/11/2026) : la moyenne (null sans avis), leur nombre, et le nombre de réalisations de sa galerie. */
  note: number | null;
  nbAvis: number;
  nbRealisations: number;
};

/**
 * L'ordre d'affichage des artisans au client : d'abord ceux qui ont reçu le MOINS de demandes (répartition
 * équitable, publiée dans les critères de référencement), puis un ordre propre à chaque client, stable d'une visite à
 * l'autre (pas toujours le même artisan en tête pour tout le monde). Aucun paiement n'entre en compte.
 */
export function ordreEquitable<T extends { id: string }>(artisans: T[], recues: Map<string, number>, graine: string): T[] {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  };
  return [...artisans].sort((a, b) => (recues.get(a.id) ?? 0) - (recues.get(b.id) ?? 0) || h(graine + a.id) - h(graine + b.id));
}

export type StatutMiseEnRelation = "envoyee" | "acceptee" | "refusee" | "expiree";
export const LIBELLES_MER: Record<StatutMiseEnRelation, string> = { envoyee: "En attente de réponse", acceptee: "Accepté", refusee: "Pas disponible", expiree: "Sans réponse" };

/** Ce que le client indique après l'acceptation (phase 3). */
export const ISSUES = [
  ["devis_recu", "Devis reçu"],
  ["signe", "Signé avec lui"],
  ["non_retenu", "Pas retenu"],
] as const;
export type Issue = (typeof ISSUES)[number][0];
export const estIssue = (v: unknown): v is Issue => ISSUES.some(([k]) => k === v);
export const labelIssue = (v: string | null) => (v ? ISSUES.find(([k]) => k === v)?.[1] ?? v : null);

/** Un avis du client : une note de 1 à 5 et un commentaire facultatif (1 000 caractères). null si invalide. */
export function lireAvis(note: unknown, commentaire: unknown): { note: number; commentaire: string | null } | null {
  const n = typeof note === "number" ? note : Number(note);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  const c = String(commentaire ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]/g, "").trim().slice(0, 1000);
  return { note: n, commentaire: c || null };
}

/** Combien d'artisans le client peut encore ajouter à une demande : 3 en cours au plus, 6 contactés au total. */
export function placesRestantes(statuts: StatutMiseEnRelation[]): number {
  const enCours = statuts.filter((s) => s === "envoyee" || s === "acceptee").length;
  return Math.max(0, Math.min(MAX_ARTISANS - enCours, MAX_CONTACTES - statuts.length));
}
