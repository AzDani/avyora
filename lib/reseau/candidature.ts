import { z } from "zod";
import { CLES_METIERS } from "./metiers";
import { CODES_DEPARTEMENTS } from "./departements";
import { normaliserSiret, siretCoherent } from "./siret";
import { normaliserPortable } from "@/lib/telephone";

/**
 * La candidature d'un artisan au Réseau AVYORA : validation partagée par le formulaire (messages au fil de la saisie)
 * et par l'action serveur (lib/actions/reseau.ts, qui revérifie TOUT). Décisions de Dani du 17/11/2026 : SIRET actif,
 * assurance décennale OBLIGATOIRE (attestation déposée, encore valable), photos de chantiers, appel avec Daniel ensuite.
 */

/** Minimums de documents pour envoyer une candidature, et plafonds de dépôt par type. */
export const DOCS = {
  decennale: { min: 1, max: 3, label: "Attestation d'assurance décennale", titre: "Attestation d'assurance décennale" },
  rc_pro: { min: 0, max: 3, label: "Attestation RC pro", titre: "Attestation RC pro" },
  photo: { min: 3, max: 12, label: "Photo de chantier", titre: "Photos de chantiers" },
} as const;
export type TypeDocument = keyof typeof DOCS;
export const TYPES_DOCUMENTS = Object.keys(DOCS) as TypeDocument[];
export const MIMES_ACCEPTES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const TAILLE_MAX = 10 * 1024 * 1024;
/** Le stockage privé des documents (migration 0007) : l'envoi s'y fait depuis le navigateur, par une URL signée. */
export const BUCKET_ARTISANS = "reseau-artisans";
/** Les photos de chantier : des images seulement (une attestation peut être un PDF ou une photo). */
export const mimeAccepte = (type: TypeDocument, mime: string) =>
  mime in MIMES_ACCEPTES && (type !== "photo" || mime !== "application/pdf");

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/;
const ligne = (max: number) => z.string().trim().max(max, "trop_long").refine((s) => !CONTROLE.test(s) && !/[\r\n\t]/.test(s), "invalide");
const requis = (max: number) => ligne(max).min(1, "requis");
/** Un lien facultatif : http(s) seulement (il est affiché à l'admin, cliquable). */
const lien = ligne(300).refine((s) => s === "" || (/^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i.test(s) && !/^https?:\/\/[^/]*@/i.test(s)), "invalide");

/** Aujourd'hui à Paris, AAAA-MM-JJ (une attestation qui expire aujourd'hui couvre encore la journée). */
export function aujourdhuiParis(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}

export function candidatureSchema(maintenant = new Date()) {
  const jour = aujourdhuiParis(maintenant);
  return z.object({
    siret: z.string().transform((s, ctx) => {
      const n = normaliserSiret(s);
      if (!n) { ctx.addIssue({ code: "custom", message: s.trim() ? "invalide" : "requis" }); return z.NEVER; }
      if (!siretCoherent(n)) { ctx.addIssue({ code: "custom", message: "cle" }); return z.NEVER; }
      return n;
    }),
    nomCommercial: ligne(200),
    contactNom: requis(120),
    telephone: z.string().transform((s, ctx) => {
      const r = normaliserPortable(s);
      if (!r.ok) { ctx.addIssue({ code: "custom", message: r.erreur === "vide" ? "requis" : r.erreur }); return z.NEVER; }
      return r.tel;
    }),
    metiers: z.array(z.enum(CLES_METIERS as [string, ...string[]], "invalide")).min(1, "requis").max(CLES_METIERS.length, "invalide"),
    departements: z.array(z.enum(CODES_DEPARTEMENTS as [string, ...string[]], "invalide")).min(1, "requis").max(CODES_DEPARTEMENTS.length, "invalide"),
    presentation: z.string().trim().max(2000, "trop_long").refine((s) => !CONTROLE.test(s), "invalide"),
    siteWeb: lien,
    lienAvis: lien,
    decennaleAssureur: requis(120),
    decennalePolice: requis(80),
    decennaleFin: z.string().refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), "requis").refine((s) => s >= jour, "expiree"),
    conditions: z.literal(true, "requis"),
  });
}

export type Candidature = z.output<ReturnType<typeof candidatureSchema>>;
export type ChampCandidature = keyof Candidature;
export type ErreursCandidature = Partial<Record<ChampCandidature | "documents", string>>;

/** Valide une candidature (dédoublonne métiers et départements) ; les erreurs, une par champ, sont des codes. */
export function validerCandidature(brut: unknown, maintenant = new Date()): { ok: true; c: Candidature } | { ok: false; erreurs: ErreursCandidature } {
  const b = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const liste = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : []);
  const chaine = (v: unknown) => (typeof v === "string" ? v : "");
  const r = candidatureSchema(maintenant).safeParse({
    siret: chaine(b.siret), nomCommercial: chaine(b.nomCommercial), contactNom: chaine(b.contactNom), telephone: chaine(b.telephone),
    metiers: liste(b.metiers), departements: liste(b.departements), presentation: chaine(b.presentation).replace(/\r\n?/g, "\n"),
    siteWeb: chaine(b.siteWeb), lienAvis: chaine(b.lienAvis),
    decennaleAssureur: chaine(b.decennaleAssureur), decennalePolice: chaine(b.decennalePolice), decennaleFin: chaine(b.decennaleFin),
    conditions: b.conditions === true,
  });
  if (r.success) return { ok: true, c: r.data };
  const erreurs: ErreursCandidature = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0]) as ChampCandidature;
    if (!erreurs[k]) erreurs[k] = i.message;
  }
  return { ok: false, erreurs };
}

/** Il manque des documents ? Un code par type manquant, ou null. */
export function documentsManquants(compte: Partial<Record<TypeDocument, number>>): string | null {
  const manque = TYPES_DOCUMENTS.filter((t) => (compte[t] ?? 0) < DOCS[t].min);
  return manque.length ? manque.join(",") : null;
}

/** Les messages des codes d'erreur, en français (le réseau est en France). */
export const MESSAGES_ERREURS: Record<string, string> = {
  requis: "Ce champ est obligatoire.",
  invalide: "Ce n'est pas valide : vérifie ce que tu as écrit.",
  trop_long: "C'est trop long.",
  cle: "Ce SIRET contient une erreur de frappe (sa clé de contrôle ne correspond pas).",
  ferme: "Cet établissement est fermé d'après le répertoire des entreprises : indique le SIRET d'un établissement actif.",
  format: "Ce numéro n'est pas lisible : écris-le comme 06 12 34 56 78.",
  pasPortable: "Il faut un numéro de portable (06 ou 07), pour qu'on puisse t'écrire sur WhatsApp.",
  expiree: "Cette attestation n'est plus valable : il faut une assurance décennale en cours.",
};
