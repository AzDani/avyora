"use client";

import { useEffect, useRef } from "react";
import { suivre, type EvenementAvyora } from "@/lib/track";

/**
 * Émet un événement de funnel à l'affichage d'une page serveur.
 *
 * POURQUOI. Le tunnel n'était instrumenté qu'à ses deux extrémités : « estimation terminée » et
 * « clic s'abonner ». Entre les deux — arrivée sur la page de tarifs, création de compte — on ne
 * voyait rien. Impossible, donc, de savoir OÙ le parcours casse : seulement qu'il casse.
 * `compte_cree` était même déclaré dans lib/track.ts sans être émis nulle part.
 *
 * Deux gardes, pas un seul :
 *  - `emis` (ref) : `props` est un objet littéral recréé à chaque rendu, donc jamais stable en
 *    dépendance. Sans cette ref, un re-rendu du parent relancerait l'effet.
 *  - `sessionStorage` : un rechargement ou un retour arrière remonte un composant neuf — la ref
 *    repart à false, le stockage non. C'est lui qui évite de gonfler le compteur sur la session.
 */
export function SuiviVue({ evenement, props }: { evenement: EvenementAvyora; props?: Record<string, string | number | boolean> }) {
  const emis = useRef(false);
  useEffect(() => {
    if (emis.current) return;
    emis.current = true;
    const cle = `av_vue_${evenement}`;
    try {
      if (sessionStorage.getItem(cle)) return;
      sessionStorage.setItem(cle, "1");
    } catch {
      /* stockage indisponible : on émet quand même, la ref suffit pour ce montage */
    }
    suivre(evenement, props);
  }, [evenement, props]);
  return null;
}
