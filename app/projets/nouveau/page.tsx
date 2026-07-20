import ParcoursForm from "@/components/ParcoursForm";
import { getParcoursComplet } from "@/lib/parcours-db";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Formulaire DATA-DRIVEN (parcours en base, édité via /admin/parcours). La perso form-builder de
// Daniel a été migrée dans le parcours réno (questions custom, renommages, masquages, catégorie).
// Reste à recréer manuellement dans /admin/parcours : options ajoutées sur questions intégrées +
// options du configurateur SDB (voir mémoire projet). Ancien NouveauProjetForm conservé en secours.
export default async function NouveauProjet() {
  const [parcours, user] = await Promise.all([getParcoursComplet(), getUser()]);
  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="eyebrow">Nouvelle estimation</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Estimer un projet</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Quelques questions par corps d&apos;état — ton estimation s&apos;enregistre au fur et à mesure.
        </p>
      </header>
      <ParcoursForm parcours={parcours} isAuthenticated={!!user} />
    </div>
  );
}
