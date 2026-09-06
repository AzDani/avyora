/**
 * Catalogue de l'estimateur — source de vérité des tâches, unités et prix (HT).
 * Généré depuis `avyora-moteur/v2/taches-par-lot.json` (hors lot « Budget / chiffrage »).
 * 19 lots / 4 phases. Éditable ici en attendant l'édition admin (Supabase).
 */
import raw from "./catalog.json";
import type { Lot } from "./core";

export const CATALOG: Lot[] = raw as unknown as Lot[];
