"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type ProfilData = {
  tuEs: string[];
  objectif: string;
  maturite: string[];
  region: string;
  age: string;
  canal: string;
};

/** Enregistre le profil d'onboarding dans les métadonnées utilisateur (user_metadata). */
export async function enregistrerProfil(data: ProfilData): Promise<{ ok: boolean }> {
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
