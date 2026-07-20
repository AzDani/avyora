import type { Estimation } from "./estimation";
import { corpsLabel } from "./estimation";

export type ExpenseRow = {
  id: number | string;
  corps_etat: string;
  libelle: string;
  montant: number;
  created_at: string;
};

export type TaskRow = {
  id: number | string;
  corps_etat: string;
  titre: string;
  statut: "a_faire" | "en_cours" | "fait";
  ordre: number;
};

export type LigneBudget = {
  corpsEtat: string;
  label: string;
  prevu: number; // médian de l'estimation
  reel: number;
  ratio: number; // réel / prévu (0 si pas de prévu)
  statut: "ok" | "attention" | "depasse";
};

export type Budget = {
  lignes: LigneBudget[];
  totalPrevu: number;
  totalReel: number;
  previsionFinale: number;
  alertes: string[];
};

/** Module 5 — budget prévu vs réel par corps d'état, alertes proactives. */
export function construireBudget(
  estimation: Estimation,
  depenses: ExpenseRow[]
): Budget {
  const prevuParCorps = new Map<string, number>();
  for (const l of estimation.lignes) {
    const median = Math.round((l.bas + l.haut) / 2);
    prevuParCorps.set(l.corpsEtat, (prevuParCorps.get(l.corpsEtat) ?? 0) + median);
  }
  const reelParCorps = new Map<string, number>();
  for (const d of depenses) {
    reelParCorps.set(d.corps_etat, (reelParCorps.get(d.corps_etat) ?? 0) + d.montant);
  }

  const corps = new Set<string>([...prevuParCorps.keys(), ...reelParCorps.keys()]);
  const lignes: LigneBudget[] = [];
  const alertes: string[] = [];

  for (const c of corps) {
    const prevu = prevuParCorps.get(c) ?? 0;
    const reel = Math.round(reelParCorps.get(c) ?? 0);
    const ratio = prevu > 0 ? reel / prevu : reel > 0 ? 2 : 0;
    const statut: LigneBudget["statut"] =
      ratio > 1 ? "depasse" : ratio > 0.9 ? "attention" : "ok";
    const label = corpsLabel(c);
    if (statut === "depasse" && prevu > 0)
      alertes.push(
        `Budget ${label.toLowerCase()} dépassé : ${fmt(reel)} dépensés pour ${fmt(prevu)} prévus (+${Math.round((ratio - 1) * 100)} %).`
      );
    else if (statut === "attention")
      alertes.push(
        `Ton budget ${label.toLowerCase()} risque de dépasser : ${Math.round(ratio * 100)} % déjà consommés.`
      );
    if (prevu === 0 && reel > 0)
      alertes.push(
        `Dépense ${label.toLowerCase()} hors estimation initiale (${fmt(reel)}) — pense à mettre à jour ton plan.`
      );
    lignes.push({ corpsEtat: c, label, prevu, reel, ratio, statut });
  }

  lignes.sort((a, b) => b.prevu - a.prevu);

  const totalPrevu = [...prevuParCorps.values()].reduce((s, v) => s + v, 0);
  const totalReel = Math.round([...reelParCorps.values()].reduce((s, v) => s + v, 0));
  // Prévision finale : pour chaque corps d'état, le max(prévu, réel)
  const previsionFinale = lignes.reduce((s, l) => s + Math.max(l.prevu, l.reel), 0);
  if (previsionFinale > totalPrevu && totalPrevu > 0)
    alertes.unshift(
      `Prévision finale du chantier : ${fmt(previsionFinale)} — soit ${fmt(previsionFinale - totalPrevu)} au-dessus du budget initial.`
    );

  return { lignes, totalPrevu, totalReel, previsionFinale, alertes };
}

/** Module 7 — avancement chantier à partir des tâches. */
export function avancementChantier(taches: TaskRow[]): number {
  if (taches.length === 0) return 0;
  const points = taches.reduce(
    (s, t) => s + (t.statut === "fait" ? 1 : t.statut === "en_cours" ? 0.5 : 0),
    0
  );
  return Math.round((points / taches.length) * 100);
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
