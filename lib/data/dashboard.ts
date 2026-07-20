import { supabaseServer } from "@/lib/supabase/server";
import { getFormConfig } from "@/lib/customq-db";
import { estimer, type Reponses } from "@/lib/estimation";
import { calculerMetre, type PieceRow } from "@/lib/metre";
import { listProjets, type Projet } from "@/lib/data/projects";

/** Tableau de bord personnel : projets de l'utilisateur + avancement + KPIs. Scopé RLS. */
export type ProjetStatut = {
  projet: Projet;
  totalBas: number;
  totalHaut: number;
  totalMedian: number;
  nbDevis: number;
  avancement: { metre: boolean; chantier: boolean; devis: boolean; rentabilite: boolean };
  pctAvancement: number; // 0-100 sur 4 jalons
};

export type EspacePerso = {
  actifs: ProjetStatut[];
  nbArchives: number;
  kpi: { nbActifs: number; sumBas: number; sumHaut: number; sumSurface: number; nbDevisTotal: number };
};

export async function chargerEspacePerso(): Promise<EspacePerso> {
  const sb = await supabaseServer();
  const [config, actifs, archives] = await Promise.all([getFormConfig(), listProjets(false), listProjets(true)]);
  const ids = actifs.map((p) => p.id);

  // Comptage par projet en requêtes batch (une par table enfant, groupées en mémoire).
  const compter = async (table: string): Promise<Map<string, number>> => {
    const m = new Map<string, number>();
    if (!ids.length) return m;
    const { data } = await sb.from(table).select("project_id").in("project_id", ids);
    for (const r of data ?? []) m.set(r.project_id as string, (m.get(r.project_id as string) ?? 0) + 1);
    return m;
  };
  // rooms : on a besoin des lignes complètes (métré), pas seulement du compte.
  const roomsByProject = new Map<string, PieceRow[]>();
  if (ids.length) {
    const { data } = await sb.from("rooms").select("*").in("project_id", ids);
    for (const r of data ?? []) {
      const arr = roomsByProject.get(r.project_id) ?? [];
      arr.push({ ...r, carrelage_sol: r.carrelage_sol ? 1 : 0, faience: r.faience ? 1 : 0 } as unknown as PieceRow);
      roomsByProject.set(r.project_id, arr);
    }
  }
  const [tasks, quotes, scenarios] = await Promise.all([compter("tasks"), compter("quotes"), compter("scenarios")]);

  const statuts: ProjetStatut[] = actifs.map((p) => {
    const pieces = roomsByProject.get(p.id) ?? [];
    const metre = pieces.length ? calculerMetre(pieces) : null;
    const e = estimer(p.surface, p.code_postal, p.reponses as Reponses, metre, config);
    const nbDevis = quotes.get(p.id) ?? 0;
    const av = {
      metre: pieces.length > 0,
      chantier: (tasks.get(p.id) ?? 0) > 0,
      devis: nbDevis > 0,
      rentabilite: (scenarios.get(p.id) ?? 0) > 0,
    };
    const faits = Object.values(av).filter(Boolean).length;
    return { projet: p, totalBas: e.totalBas, totalHaut: e.totalHaut, totalMedian: e.totalMedian, nbDevis, avancement: av, pctAvancement: Math.round((faits / 4) * 100) };
  });

  return {
    actifs: statuts,
    nbArchives: archives.length,
    kpi: {
      nbActifs: statuts.length,
      sumBas: statuts.reduce((s, x) => s + x.totalBas, 0),
      sumHaut: statuts.reduce((s, x) => s + x.totalHaut, 0),
      sumSurface: actifs.reduce((s, p) => s + p.surface, 0),
      nbDevisTotal: statuts.reduce((s, x) => s + x.nbDevis, 0),
    },
  };
}
