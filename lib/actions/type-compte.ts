"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { journaliser } from "@/lib/audit";
import { verifierLimite } from "@/lib/ratelimit";
import { siretCoherent, verifierSiret, type VerifSiret } from "@/lib/reseau/siret";
import { tuEsDe, typeCompte, texteCourt, validerParticulier, validerPro, type ErreursParticulier, type ErreursPro, type TypeCompte } from "@/lib/compte/type";

/**
 * Le type de compte et les questionnaires de bienvenue (26/11/2026). Le type (particulier / pro) est écrit dans
 * `app_metadata` par le serveur seul ; les réponses dans `user_metadata.profil` (et `user_metadata.pro` pour un pro),
 * avec les clés que l'admin lit déjà (`tuEs`, `objectif`, `maturite`, `region`, `canal`, `telephone`).
 */

const RESSAIE = "Réessaie dans un instant.";

async function ecrireApp(userId: string, app: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { app_metadata: app });
  return !error;
}

/**
 * « Tu es… » : particulier ou pro, une seule fois. Un compte qui a déjà un type ne le change pas ici (passer de
 * particulier à pro demande un SIRET : `passerEnComptePro`).
 */
export async function choisirTypeCompte(type: TypeCompte): Promise<{ ok: boolean; erreur?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (type !== "particulier" && type !== "pro") return { ok: false, erreur: "Choisis particulier ou professionnel." };
  if (typeCompte(user)) return { ok: true };
  if (!(await ecrireApp(user.id, { type_compte: type, type_compte_le: new Date().toISOString() }))) return { ok: false, erreur: RESSAIE };
  // Le profil admin suit tout de suite (le type principal du tableau de bord).
  const actuel = (user.user_metadata?.profil ?? {}) as Record<string, unknown>;
  const sb = await supabaseServer();
  await sb.auth.updateUser({ data: { profil: { ...actuel, tuEs: tuEsDe(type, String(actuel.objectif ?? "")) } } });
  await journaliser("action_admin", { userId: user.id, payload: { action: "type_compte", type } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Le questionnaire du particulier : prénom obligatoire, le reste facultatif. */
export async function enregistrerParticulier(brut: unknown): Promise<{ ok: true } | { ok: false; erreur?: string; erreurs?: ErreursParticulier }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (typeCompte(user) !== "particulier") return { ok: false, erreur: "Dis-nous d'abord si tu es particulier ou professionnel." };
  const v = validerParticulier((brut ?? {}) as Record<string, unknown>);
  if (!v.ok) return { ok: false, erreurs: v.erreurs };
  const p = v.p;
  const actuel = (user.user_metadata?.profil ?? {}) as Record<string, unknown>;
  const profil = {
    ...actuel,
    tuEs: tuEsDe("particulier", p.objectif), objectif: p.objectif, projet: p.projet, maturite: p.maturite, region: p.region, canal: p.canal,
    telephone: p.telephone ?? undefined,
  };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ data: { nom: p.prenom, profil, onboarding_fait: true, profil_le: new Date().toISOString() } });
  if (error) return { ok: false, erreur: RESSAIE };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** La vérification d'un SIRET (limitée à 20 par heure et par compte, comme la candidature). */
async function verifier(userId: string, siret: string): Promise<{ ok: true; verif: VerifSiret } | { ok: false; erreur: string }> {
  if (!siretCoherent(siret)) return { ok: false, erreur: "Ce SIRET n'existe pas : vérifie les 14 chiffres." };
  if (!(await verifierLimite("artisanSiret", userId))) return { ok: false, erreur: "Trop de vérifications : réessaie dans une heure." };
  return { ok: true, verif: await verifierSiret(siret) };
}

/**
 * Le questionnaire du pro : société, nom, portable, métier principal, région ; SIRET facultatif, vérifié s'il est
 * donné (un établissement fermé ou introuvable est refusé ; si l'annuaire ne répond pas, on garde le numéro).
 */
export async function enregistrerPro(brut: unknown): Promise<{ ok: true } | { ok: false; erreur?: string; erreurs?: ErreursPro }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (typeCompte(user) !== "pro") return { ok: false, erreur: "Dis-nous d'abord si tu es particulier ou professionnel." };
  const v = validerPro((brut ?? {}) as Record<string, unknown>);
  if (!v.ok) return { ok: false, erreurs: v.erreurs };
  const p = v.p;
  let verif: VerifSiret | null = null;
  if (p.siret) {
    const r = await verifier(user.id, p.siret);
    if (!r.ok) return { ok: false, erreurs: { siret: r.erreur } };
    if (r.verif.statut === "ferme") return { ok: false, erreurs: { siret: "Cet établissement est fermé dans le répertoire des entreprises." } };
    if (r.verif.statut === "introuvable") return { ok: false, erreurs: { siret: "Ce SIRET est introuvable dans le répertoire des entreprises." } };
    verif = r.verif;
  }
  const actuel = (user.user_metadata?.profil ?? {}) as Record<string, unknown>;
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({
    data: {
      nom: p.nom,
      profil: { ...actuel, tuEs: ["pro"], objectif: "client", region: p.region, telephone: p.telephone },
      pro: { societe: p.societe, metier: p.metier, region: p.region, siret: p.siret, siretVerif: verif },
      onboarding_fait: true, profil_le: new Date().toISOString(),
    },
  });
  if (error) return { ok: false, erreur: RESSAIE };
  // Un SIRET actif du bâtiment vaut preuve (le même contrôle que « passer en compte pro »).
  if (verif?.statut === "actif" && verif.batiment) {
    await ecrireApp(user.id, { pro_verifie: { siret: p.siret, nom: verif.nom ?? null, naf: verif.naf ?? null, le: new Date().toISOString() } });
  }
  await journaliser("action_admin", { userId: user.id, payload: { action: "profil_pro", siret: !!p.siret } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Un particulier passe en compte pro (depuis « Mon compte ») : seulement avec le SIRET d'un établissement ACTIF dont
 * l'activité est du bâtiment (NAF 41, 42, 43, ou 71.1 architecture et ingénierie), vérifié dans le répertoire officiel.
 * Si l'annuaire ne répond pas, rien ne change (réessayer plus tard). La candidature au réseau garde ses preuves.
 */
export async function passerEnComptePro(brut: { siret?: unknown; nom?: unknown }): Promise<{ ok: true; entreprise: string } | { ok: false; erreur: string }> {
  const user = await getUser();
  if (!user) return { ok: false, erreur: "Ta session a expiré : reconnecte-toi." };
  if (typeCompte(user) === "pro") return { ok: true, entreprise: "" };
  const siret = String(brut?.siret ?? "").replace(/\s+/g, "");
  const nom = texteCourt(brut?.nom, 120);
  if (!/^\d{14}$/.test(siret)) return { ok: false, erreur: "Un SIRET a 14 chiffres." };
  if (nom.length < 2) return { ok: false, erreur: "Indique ton prénom et ton nom." };
  const r = await verifier(user.id, siret);
  if (!r.ok) return r;
  const vf = r.verif;
  if (vf.statut === "indisponible") return { ok: false, erreur: "Le répertoire des entreprises ne répond pas : réessaie dans quelques minutes." };
  if (vf.statut === "introuvable") return { ok: false, erreur: "Ce SIRET est introuvable dans le répertoire des entreprises." };
  if (vf.statut === "ferme") return { ok: false, erreur: "Cet établissement est fermé : ton compte reste un compte particulier." };
  if (!vf.batiment) return { ok: false, erreur: "L'activité de cette entreprise n'est pas du bâtiment : ton compte reste un compte particulier." };
  const maintenant = new Date().toISOString();
  if (!(await ecrireApp(user.id, { type_compte: "pro", type_compte_le: maintenant, pro_verifie: { siret, nom: vf.nom ?? null, naf: vf.naf ?? null, le: maintenant } }))) {
    return { ok: false, erreur: RESSAIE };
  }
  const actuel = (user.user_metadata?.profil ?? {}) as Record<string, unknown>;
  const proActuel = (user.user_metadata?.pro ?? {}) as Record<string, unknown>;
  const sb = await supabaseServer();
  await sb.auth.updateUser({ data: { nom, profil: { ...actuel, tuEs: ["pro"] }, pro: { ...proActuel, societe: vf.nom ?? proActuel.societe ?? "", siret, siretVerif: vf } } });
  await journaliser("action_admin", { userId: user.id, payload: { action: "passage_pro", siret } });
  revalidatePath("/", "layout");
  return { ok: true, entreprise: vf.nom ?? "" };
}
