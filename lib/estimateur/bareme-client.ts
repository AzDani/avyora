"use client";

/**
 * Le barème de prix dans le NAVIGATEUR (27/11/2026, option A validée par Dani) : il n'est plus dans le JavaScript
 * public. Les écrans qui calculent sur place (estimateurs détaillés, fiche projet, budget réel, estimation née d'un
 * plan) le demandent une fois, après connexion, à `GET /api/estimateur/bareme` (compte exigé, journalisé, plafonné),
 * puis l'installent dans le moteur (`installerCatalogues`) : le calcul reste instantané, dans le navigateur.
 *
 * Une seule demande par page chargée : les écrans suivants (navigation dans l'application) le trouvent installé.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { catalogueInstalle, ecouterCatalogue, installerCatalogues } from "./catalogue-neuf";
import { BANC } from "./banc-essai";

export type EtatBareme = "pret" | "attente" | "compte" | "erreur";

let enCours: Promise<void> | null = null;

/** Charge et installe le barème. Rejette avec « compte » sans session, « erreur » sinon (réessayable). */
export function chargerBareme(): Promise<void> {
  if (catalogueInstalle()) return Promise.resolve();
  if (!enCours) {
    enCours = fetch("/api/estimateur/bareme", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) throw new Error("compte");
        if (!r.ok) throw new Error("erreur");
        const d = (await r.json()) as { reno?: unknown; neuf?: unknown };
        installerCatalogues(d.reno, d.neuf);
      })
      .catch((e: unknown) => {
        enCours = null;
        throw new Error(e instanceof Error && e.message === "compte" ? "compte" : "erreur");
      });
  }
  return enCours;
}

/**
 * L'état du barème pour un écran. Pendant le rendu serveur et l'hydratation : « attente » (le serveur ne rend jamais
 * un écran chiffré par ce chemin, le HTML reste identique d'un côté à l'autre) ; puis « pret » dès qu'il est installé.
 */
export function useBareme(): { etat: EtatBareme; reessayer: () => void } {
  const pret = useSyncExternalStore(ecouterCatalogue, catalogueInstalle, () => BANC.renduServeurComplet && catalogueInstalle());
  const [echec, setEchec] = useState<"compte" | "erreur" | null>(null);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    if (pret) return;
    let vivant = true;
    chargerBareme().catch((e: Error) => { if (vivant) setEchec(e.message === "compte" ? "compte" : "erreur"); });
    return () => { vivant = false; };
  }, [pret, essai]);
  return {
    etat: pret ? "pret" : echec ?? "attente",
    reessayer: () => { setEchec(null); setEssai((n) => n + 1); },
  };
}
