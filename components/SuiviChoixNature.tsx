"use client";

import { useEffect } from "react";
import { suivre } from "@/lib/track";
import { natureDepuisCible } from "@/lib/nature-projet";

/**
 * `clic_nouveau_projet { nature }` (N2) : UNE écoute par délégation, montée par la pré-page « Quel est ton
 * projet ? » (`ChoixNature`), sur le modèle de `SuiviClicsPlan`. Les cartes portent `data-choix-nature`
 * (« reno » ou « neuf ») ; une valeur hors de la liste fermée est ignorée. En capture : le clic est compté
 * avant que la navigation ne parte. Le clic du milieu (nouvel onglet) compte aussi. Pas de `SuiviVue` : sa
 * déduplication par session ignore les propriétés, un second clic sur l'autre carte serait perdu. Ne rend rien.
 */
export default function SuiviChoixNature() {
  useEffect(() => {
    const ecouter = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const nature = natureDepuisCible(e.target);
      if (nature) suivre("clic_nouveau_projet", { nature });
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
