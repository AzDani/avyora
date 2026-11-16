"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { normaliserPortable } from "@/lib/telephone";

export type ProfilData = {
  tuEs: string[];
  objectif: string;
  maturite: string[];
  region: string;
  age: string;
  canal: string;
  /** Portable (facultatif pour le serveur : « Passer » et Mon compte restent possibles ; le questionnaire de
   *  bienvenue l'exige pour « Continuer »). Normalisé (+33612345678) avant d'être enregistré. */
  telephone?: string;
};

/** Enregistre le profil d'onboarding dans les métadonnées utilisateur (user_metadata). */
export async function enregistrerProfil(data: ProfilData): Promise<{ ok: boolean; erreur?: "telephone" }> {
  // Le portable, revérifié ici (le formulaire n'est qu'une aide) : vide = pas de numéro, illisible = refus.
  const saisie = String(data.telephone ?? "").slice(0, 40);
  let telephone: string | undefined;
  if (saisie.trim()) {
    const r = normaliserPortable(saisie);
    if (!r.ok) return { ok: false, erreur: "telephone" };
    telephone = r.tel;
  }
  data = { ...data, telephone };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({
    data: { profil: data, onboarding_fait: true, profil_le: new Date().toISOString() },
  });
  return { ok: !error };
}

/** Marque l'onboarding comme passé (sans données). */
export async function sauterOnboarding(): Promise<{ ok: boolean }> {
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ data: { onboarding_fait: true } });
  return { ok: !error };
}

/**
 * Le rappel « Ajoute ton portable » (components/RappelPortable.tsx, décision de Dani du 16/11/2026) : les inscrits
 * d'avant le champ portable n'ont pas de numéro. On n'écrit QUE le portable, fusionné dans le profil existant (le
 * reste du questionnaire ne bouge pas, `onboarding_fait` non plus). Revérifié ici comme au questionnaire.
 */
export async function enregistrerPortable(saisie: string): Promise<{ ok: boolean; erreur?: "telephone" | "session" }> {
  const r = normaliserPortable(String(saisie ?? "").slice(0, 40));
  if (!r.ok) return { ok: false, erreur: "telephone" };
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data?.user;
  if (!user) return { ok: false, erreur: "session" };
  const actuel = user.user_metadata?.profil;
  const profil = { ...(actuel && typeof actuel === "object" ? (actuel as Record<string, unknown>) : {}), telephone: r.tel };
  const { error } = await sb.auth.updateUser({ data: { profil } });
  return { ok: !error };
}
