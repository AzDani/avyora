/**
 * Les limites des hébergeurs, pour la salle des serveurs des bureaux virtuels (27/11/2026). Fichier PUR.
 *
 * Le plan en cours se règle par variable d'environnement, sans toucher au code : SUPABASE_PLAN et VERCEL_PLAN
 * (« gratuit » par défaut, « pro » une fois passé en Pro). Les chiffres viennent des pages tarifs de Supabase et de
 * Vercel, relevés le 27/11/2026 ; ils changent de temps en temps : à revérifier en cas de doute.
 */

export type Plan = "gratuit" | "pro";
const Go = 1024 ** 3, Mo = 1024 ** 2;

export const LIMITES_SUPABASE: Record<Plan, { fichiers: number; base: number; actifs: number | null; envoi: number }> = {
  gratuit: { fichiers: 1 * Go, base: 500 * Mo, actifs: 50_000, envoi: 5 * Go },
  // Pro : 100 Go de fichiers, 8 Go de base, 250 Go envoyés. Le plafond de comptes actifs du Pro n'a pas été vérifié : non affiché.
  pro: { fichiers: 100 * Go, base: 8 * Go, actifs: null, envoi: 250 * Go },
};
export const LIMITES_VERCEL: Record<Plan, { envoi: number }> = { gratuit: { envoi: 100 * Go }, pro: { envoi: 1000 * Go } };

export const planDe = (v: string | undefined): Plan => (String(v ?? "").trim().toLowerCase() === "pro" ? "pro" : "gratuit");

/** Au-delà, une jauge passe en orange, puis en rouge. */
export const SEUIL_ATTENTION = 0.6, SEUIL_CRITIQUE = 0.85;

/** Un poids lisible : « 312 Mo », « 1,2 Go ». */
export function poids(octets: number): string {
  if (octets >= Go) return `${(octets / Go).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Go`;
  if (octets >= Mo) return `${Math.round(octets / Mo).toLocaleString("fr-FR")} Mo`;
  return `${Math.max(0, Math.round(octets / 1024)).toLocaleString("fr-FR")} Ko`;
}
