"use client";

import { useEffect } from "react";
import { mesureDepuisCible, mesurerPlan } from "@/lib/plans/mesure";

/**
 * `clic_plan` (C10) : UNE écoute par délégation, montée par le layout derrière `FEATURES.plans`, au lieu d'un
 * gestionnaire par lien. Les liens vers la vitrine ou l'éditeur portent `data-clic-plan="<origine>"` (y compris
 * dans le HTML brut de l'accueil) ; une origine hors de la liste fermée est ignorée. En capture : le clic est
 * compté avant que la navigation ne parte. Le clic du milieu (nouvel onglet) compte aussi. Ne rend rien.
 */
export default function SuiviClicsPlan() {
  useEffect(() => {
    const ecouter = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      mesurerPlan(mesureDepuisCible(e.target));
    };
    document.addEventListener("click", ecouter, true);
    document.addEventListener("auxclick", ecouter, true);
    return () => {
      document.removeEventListener("click", ecouter, true);
      document.removeEventListener("auxclick", ecouter, true);
    };
  }, []);
  return null;
}
