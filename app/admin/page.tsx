import { listInscrits, statsGlobales, compterPlans, listDemandesAccompagnement, typePrincipal, labelTues } from "@/lib/data/admin";
import { depuis, parSemaine } from "@/lib/admin/outils";
import { listArtisansAdmin } from "@/lib/data/reseau";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { joursAvantFinDecennale } from "@/lib/reseau/artisan";
import { labelMetier } from "@/lib/reseau/metiers";
import { resumeDepartements } from "@/lib/reseau/departements";
import { afficherPortable } from "@/lib/telephone";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";
import TableauDeBord, { type DonneesTableau } from "@/components/admin/TableauDeBord";

export const dynamic = "force-dynamic";

/** Tableau de bord de l'admin : ce qui attend Daniel, puis l'acquisition. L'affichage est dans components/admin/TableauDeBord.tsx. */
export default async function AdminTableauDeBord() {
  // Les inscrits sont le cœur du tableau ; les plans et les demandes, s'ils ne se lisent pas, sont signalés à part
  // au lieu de faire tomber toute la page.
  const [inscrits, plans, demandesLues, artisans] = await Promise.all([
    listInscrits(),
    compterPlans().catch(() => null),
    listDemandesAccompagnement().catch(() => null),
    listArtisansAdmin().catch(() => null),
  ]);
  const jour = aujourdhuiParis();
  const aExaminer = (artisans ?? []).filter((a) => a.statut === "en_attente").sort((x, y) => +new Date(x.soumiseLe) - +new Date(y.soumiseLe));
  const demandes = demandesLues ?? [];
  const maintenant = new Date();
  const s = statsGlobales(inscrits);
  const projets = inscrits.flatMap((i) => i.projets);
  const aTraiter = demandes.filter((x) => !x.traiteeLe);
  const recents = inscrits.filter((i) => depuis([i.createdAt], 7, maintenant) === 1);

  const d: DonneesTableau = {
    chiffres: {
      inscrits: inscrits.length,
      inscrits7j: recents.length,
      inscrits30j: s.nouveaux30j,
      projets: projets.length,
      projets7j: depuis(projets.map((p) => p.createdAt), 7, maintenant),
      plans,
      demandes30j: depuis(demandes.map((x) => x.recueLe), 30, maintenant),
      aTraiter: aTraiter.length,
    },
    demandes: aTraiter.slice(0, 5),
    demandesIndisponibles: demandesLues === null,
    // Les plus anciennes d'abord : elles attendent depuis le plus longtemps.
    artisans: artisans && {
      aExaminer: aExaminer.slice(0, 3).map((a) => ({
        id: a.id,
        nom: a.raisonSociale,
        detail: `${a.metiers.slice(0, 2).map(labelMetier).join(", ")} · ${resumeDepartements(a.departements, 2)}`,
        appelFait: !!a.appelLe,
        soumiseLe: a.soumiseLe,
      })),
      nbAExaminer: aExaminer.length,
      decennalesARenouveler: artisans.filter((a) => a.statut === "valide" && joursAvantFinDecennale(a.decennaleFin, jour) <= 30).length,
    },
    nouveaux: recents.slice(0, 8).map((i) => {
      const type = typePrincipal(i.profil);
      return {
        id: i.id,
        email: i.email,
        username: i.username ?? "",
        typeLabel: type === "—" ? "—" : labelTues(type),
        region: i.profil?.region ?? "",
        telephone: i.profil?.telephone ? afficherPortable(i.profil.telephone) : "",
        nbProjets: i.projets.length,
        createdAt: i.createdAt,
      };
    }),
    nouveauxEnPlus: Math.max(0, recents.length - 8),
    semaines: parSemaine(inscrits.map((i) => i.createdAt), 12, maintenant),
    repartitions: [
      { titre: "Canal d'acquisition", aide: "D'où ils viennent : là où pousser le marketing", data: s.parCanal, couleur: "#e05299" },
      { titre: "Type d'inscrit", aide: "« Tu es… » rempli à l'inscription", data: s.parType, couleur: "#7c3aed" },
      { titre: "Top régions", aide: "Répartition géographique", data: s.parRegion, couleur: "#0ea5a4" },
      { titre: "Tranche d'âge", aide: "Profil démographique", data: s.parAge, couleur: "#4f46e5" },
    ],
  };

  return (
    <>
      <EnTeteAdmin titre="Tableau de bord" texte="Ce qui attend une action en premier, puis les chiffres d'acquisition." />
      <TableauDeBord d={d} />
    </>
  );
}
