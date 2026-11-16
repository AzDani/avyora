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
