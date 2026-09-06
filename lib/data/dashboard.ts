import { listProjets, type Projet } from "@/lib/data/projects";
import { estimationProjet } from "@/lib/estimateur";

/** Espace perso : projets de l'utilisateur + total estimé par projet. Scopé RLS. */
export type ProjetStatut = { projet: Projet; ttc: number };
export type EspacePerso = {
  actifs: ProjetStatut[];
  nbArchives: number;
  kpi: { nbActifs: number; sumTravaux: number; sumSurface: number };
};

export async function chargerEspacePerso(): Promise<EspacePerso> {
  const [actifs, archives] = await Promise.all([listProjets(false), listProjets(true)]);
  const statuts: ProjetStatut[] = actifs.map((p) => ({ projet: p, ttc: estimationProjet(p.reponses)?.ttc ?? 0 }));
  return {
    actifs: statuts,
    nbArchives: archives.length,
    kpi: {
      nbActifs: statuts.length,
      sumTravaux: statuts.reduce((s, x) => s + x.ttc, 0),
      sumSurface: actifs.reduce((s, p) => s + p.surface, 0),
    },
  };
}
