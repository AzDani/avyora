/**
 * Couche d'accès à la base de connaissances métier (tables kb_*) — Supabase (serveur uniquement).
 * Le moteur pur ne dépend jamais de ce fichier : il lit le SNAPSHOT JSON
 * (`referentiel-prix.generated.json`) que l'on génère ici depuis les tables kb_*.
 * Flux : édition admin → maj kb_postes → ecrireSnapshot() → le moteur utilise les nouveaux prix.
 * Lectures via le client scopé (kb_* = lecture publique RLS), écritures via service_role (tables globales).
 */
import fs from "node:fs";
import path from "node:path";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import refV0 from "./referentiel-prix-v0.json";
import { CORPS_ORDRE, CORPS_LABEL } from "./customq";
import type { KbCategorie, KbPoste, ReferentielSnapshot } from "./kb-types";

type RefPosteRaw = {
  corps_etat: string; poste: string; unite: string;
  prix_bas: number; prix_median: number; prix_haut: number;
  inclut?: string; confiance?: string; part_mo?: number;
};
const REF = refV0 as unknown as { meta: Record<string, unknown>; postes: RefPosteRaw[] };

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48) || "poste";
}

export async function kbEstVide(): Promise<boolean> {
  const { count } = await supabaseAdmin().from("kb_postes").select("*", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

/** Seed initial : importe le référentiel JSON v0 dans les tables kb_* (idempotent). */
export async function seedKb(force = false): Promise<{ skipped: boolean; postes?: number }> {
  if (!force && !(await kbEstVide())) return { skipped: true };
  const admin = supabaseAdmin();
  await admin.from("kb_postes").delete().neq("id", "");
  await admin.from("kb_categories").delete().neq("id", "");
  await admin.from("kb_coefficients").delete().neq("id", "");

  // Catégories = corps d'état, ordonnés selon le planning (ORDRE_TRAVAUX)
  const cats = [...new Set(REF.postes.map((p) => p.corps_etat))].map((c) => {
    const ordre = CORPS_ORDRE.indexOf(c);
    return { id: c, nom: CORPS_LABEL[c] ?? c, ordre: ordre < 0 ? 999 : ordre, actif: true };
  });
  await admin.from("kb_categories").insert(cats);

  // Postes = 1:1 du référentiel, id stable, ORDRE PRÉSERVÉ (lookup déterministe)
  const vus = new Set<string>();
  const postes = REF.postes.map((p, i) => {
    let id = `${p.corps_etat}::${slug(p.poste)}`;
    if (vus.has(id)) id = `${id}_${i}`;
    vus.add(id);
    return {
      id, categorie_id: p.corps_etat, nom: p.poste, description: p.inclut ?? null, unite: p.unite,
      prix_min: p.prix_bas, prix_moy: p.prix_median, prix_max: p.prix_haut, part_mo: p.part_mo ?? null,
      duree_unitaire: null, difficulte: 3, finition_min: "eco", confiance: p.confiance ?? null, ordre: i, actif: true, archived: false,
    };
  });
  await admin.from("kb_postes").insert(postes);

  const coefs: Record<string, unknown>[] = [];
  for (const [cle, v] of Object.entries({ locatif: 0.95, standard: 1, premium: 1.2, luxe: 1.45 }))
    coefs.push({ id: `fin_${cle}`, type: "finition", cle, scope_niveau: "national", cible: null, valeur: v, label: `Finition ${cle}`, actif: true });
  for (const [cle, v] of Object.entries({ avant_1949: 1.12, "1949_1974": 1.08, "1975_1997": 1.03, apres_1997: 1.0, inconnue: 1.04 }))
    coefs.push({ id: `age_${cle}`, type: "anciennete", cle, scope_niveau: "national", cible: null, valeur: v, label: `Ancienneté ${cle}`, actif: true });
  for (const d of ["75", "77", "78", "91", "92", "93", "94", "95"]) coefs.push({ id: `loc_${d}`, type: "localisation", cle: d, scope_niveau: "departement", cible: null, valeur: 1.2, label: "Île-de-France", actif: true });
  for (const d of ["06", "13", "31", "33", "34", "35", "44", "59", "67", "69"]) coefs.push({ id: `loc_${d}`, type: "localisation", cle: d, scope_niveau: "departement", cible: null, valeur: 1.1, label: "Grande métropole", actif: true });
  await admin.from("kb_coefficients").insert(coefs);

  return { skipped: false, postes: postes.length };
}

/** Construit le snapshot (forme attendue par le moteur) DEPUIS la base de connaissances. */
export async function genererSnapshot(): Promise<ReferentielSnapshot> {
  const { data } = await supabaseAdmin().from("kb_postes").select("*").eq("archived", false).order("ordre");
  const postes = (data ?? []) as KbPoste[];
  return {
    meta: { ...(REF.meta as object), genere_le: new Date().toISOString().slice(0, 10), source: "kb" },
    postes: postes.map((p) => {
      const o: ReferentielSnapshot["postes"][number] = {
        corps_etat: p.categorie_id, poste: p.nom, unite: p.unite,
        prix_bas: p.prix_min, prix_median: p.prix_moy, prix_haut: p.prix_max, kb_id: p.id,
      };
      if (p.description) o.inclut = p.description;
      if (p.confiance) o.confiance = p.confiance;
      if (p.part_mo != null) o.part_mo = p.part_mo;
      return o;
    }),
  };
}

/** Écrit le snapshot dans le fichier importé par le moteur. À appeler après seed / édition admin. */
export async function ecrireSnapshot(): Promise<number> {
  const snap = await genererSnapshot();
  fs.writeFileSync(path.join(process.cwd(), "lib", "referentiel-prix.generated.json"), JSON.stringify(snap, null, 2) + "\n");
  return snap.postes.length;
}

export async function getKbCategories(): Promise<KbCategorie[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("kb_categories").select("*").eq("actif", true).order("ordre");
  return (data ?? []) as KbCategorie[];
}
export async function getKbPostes(categorieId?: string): Promise<KbPoste[]> {
  const sb = await supabaseServer();
  let q = sb.from("kb_postes").select("*").eq("archived", false);
  if (categorieId) q = q.eq("categorie_id", categorieId);
  const { data } = await q.order("ordre");
  return (data ?? []) as KbPoste[];
}
export async function majPostePrix(id: string, min: number, moy: number, max: number): Promise<void> {
  await supabaseAdmin().from("kb_postes").update({ prix_min: min, prix_moy: moy, prix_max: max }).eq("id", id);
  await ecrireSnapshot(); // régénère le snapshot moteur
}
