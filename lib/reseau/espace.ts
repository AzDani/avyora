import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { candidatureDe } from "@/lib/data/reseau";
import type { Artisan } from "@/lib/reseau/artisan";

/**
 * L'espace dédié de l'artisan VALIDÉ (25/11/2026) : /espace-artisan (accueil), /demandes, /avis, /galerie, /dossier,
 * /aide. Mémorisé le temps d'une requête (le layout et la page lisent la même candidature). Les sous-pages renvoient à
 * /espace-artisan tant que l'artisan n'est pas validé (candidature, examen, suspension : la page d'accueil le dit).
 */
export const sessionArtisan = cache(async (): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getUser>>>; artisan: Artisan | null } | null> => {
  const user = await getUser();
  if (!user) return null;
  return { user, artisan: await candidatureDe(user.id) };
});

/** Pour une sous-page de l'espace : l'artisan validé de la session, sinon retour à l'accueil de l'espace. */
export async function artisanValideOuRetour(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getUser>>>; artisan: Artisan }> {
  let s: Awaited<ReturnType<typeof sessionArtisan>>;
  try {
    s = await sessionArtisan();
  } catch {
    redirect("/espace-artisan");
  }
  if (!s?.artisan || s.artisan.statut !== "valide") redirect("/espace-artisan");
  return { user: s.user, artisan: s.artisan };
}

/** La date limite de réponse à une demande (envoyée + `jours`), en toutes lettres : « 30 novembre ». */
export function dateLimite(envoyeeLe: string, jours: number): string {
  const d = new Date(Date.parse(envoyeeLe) + jours * 86_400_000);
  return d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
}

export const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
export const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
