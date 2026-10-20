/**
 * Prix du marché pour la section « Investissement » (module M3), côté serveur : communes d'un code postal
 * (geo.api.gouv.fr), ventes DVF de la commune (fichiers geo-dvf d'Etalab) et loyers de la carte ANIL. Les ventes
 * téléchargées sont gardées en mémoire 24 h par instance : une grande ville pèse plusieurs Mo par année.
 */
import { HORS_DVF, lireVentes, statsVentes, type StatsVentes, type TypeVente, type Vente } from "./dvf";
import { indicateurLoyer, serieLoyer, MAJORATION_MEUBLE, MILLESIME_LOYERS, type IndicateurLoyer } from "./loyers";
import { loyersEncadres } from "./encadrement";

export type Commune = { code: string; nom: string };

export type Marche = {
  communes: Commune[];
  commune: Commune | null;
  ventes: StatsVentes | null;
  /** Pourquoi il n'y a pas de ventes : département sans DVF, trop peu de ventes, ou source indisponible. */
  ventesAbsentes?: "hors_dvf" | "peu_de_ventes" | "indisponible";
  loyer: (IndicateurLoyer & { millesime: string; majorationMeuble: number }) | null;
  encadrement: boolean;
};

const PLM = new Set(["75056", "69123", "13055"]);

/** Communes d'un code postal, la plus peuplée d'abord ; à Paris, Lyon et Marseille, l'arrondissement remplace la ville. */
export async function communesDuCodePostal(cp: string): Promise<Commune[]> {
  const r = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${cp}&type=commune-actuelle,arrondissement-municipal&fields=code,nom,population`, {
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 86_400 * 30 },
  });
  if (!r.ok) return [];
  const liste = (await r.json()) as { code: string; nom: string; population?: number }[];
  const arr = liste.some((c) => !PLM.has(c.code) && /^(751|6938|132)/.test(c.code));
  return liste
    .filter((c) => !(arr && PLM.has(c.code)))
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .map((c) => ({ code: c.code, nom: c.nom }));
}

const memoire = new Map<string, { at: number; ventes: Vente[] }>();
const DUREE = 24 * 3_600_000;

/** Ventes DVF de la commune sur les 3 derniers millésimes publiés (l'année en cours n'existe pas encore : 404 ignoré). */
async function ventesCommune(insee: string): Promise<Vente[] | null> {
  const m = memoire.get(insee);
  if (m && Date.now() - m.at < DUREE) return m.ventes;
  const dep = insee.startsWith("97") ? insee.slice(0, 3) : insee.slice(0, 2);
  const an = new Date().getFullYear();
  const reps = await Promise.all([an, an - 1, an - 2].map(async (y) => {
    try {
      const r = await fetch(`https://files.data.gouv.fr/geo-dvf/latest/csv/${y}/communes/${dep}/${insee}.csv`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (r.status === 404) return [];
      if (!r.ok) return null;
      return lireVentes(await r.text());
    } catch {
      return null;
    }
  }));
  if (reps.every((x) => x === null)) return null;
  const ventes = reps.flatMap((x) => x ?? []);
  if (memoire.size > 200) memoire.delete(memoire.keys().next().value as string);
  memoire.set(insee, { at: Date.now(), ventes });
  return ventes;
}

export async function prixDuMarche(p: { cp: string; insee?: string; typeBien?: string; surface: number }): Promise<Marche> {
  const communes = await communesDuCodePostal(p.cp);
  const commune = communes.find((c) => c.code === p.insee) ?? communes[0] ?? null;
  if (!commune) return { communes, commune: null, ventes: null, loyer: null, encadrement: false };
  const type: TypeVente = p.typeBien === "Maison" ? "maison" : "appartement";
  const dep = commune.code.startsWith("97") ? commune.code.slice(0, 3) : commune.code.slice(0, 2);

  let ventes: StatsVentes | null = null;
  let ventesAbsentes: Marche["ventesAbsentes"];
  if (HORS_DVF.has(dep)) ventesAbsentes = "hors_dvf";
  else {
    const liste = await ventesCommune(commune.code);
    if (!liste) ventesAbsentes = "indisponible";
    else {
      ventes = statsVentes(liste, type, p.surface);
      if (!ventes) ventesAbsentes = "peu_de_ventes";
    }
  }
  const ind = indicateurLoyer(commune.code, serieLoyer(p.typeBien));
  return {
    communes, commune, ventes, ...(ventesAbsentes ? { ventesAbsentes } : {}),
    loyer: ind ? { ...ind, millesime: MILLESIME_LOYERS, majorationMeuble: MAJORATION_MEUBLE } : null,
    encadrement: loyersEncadres(commune.code),
  };
}
