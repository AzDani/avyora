import { listInscrits, typePrincipal, labelTues } from "@/lib/data/admin";
import { afficherPortable } from "@/lib/telephone";
import InscritsTable, { type InscritRow } from "@/components/admin/InscritsTable";
import EnTeteAdmin from "@/components/admin/EnTeteAdmin";

export const dynamic = "force-dynamic";

export default async function AdminInscrits({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const q = (await searchParams).q;
  const recherche = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 80);
  const inscrits = await listInscrits();
  const rows: InscritRow[] = inscrits.map((i) => {
    const type = typePrincipal(i.profil);
    return {
      id: i.id,
      email: i.email,
      username: i.username ?? "",
      createdAt: i.createdAt,
      type,
      typeLabel: type === "—" ? "—" : labelTues(type),
      age: i.profil?.age ?? "",
      region: i.profil?.region ?? "",
      canal: i.profil?.canal ?? "",
      telephone: i.profil?.telephone ? afficherPortable(i.profil.telephone) : "",
      plan: i.plan,
      nbProjets: i.projets.length,
    };
  });
  return (
    <>
      <EnTeteAdmin titre="Inscrits" texte="Tous les comptes. Clique sur une ligne pour ouvrir la fiche ; cherche par e-mail, pseudo, région ou portable." />
      <InscritsTable rows={rows} rechercheInitiale={recherche} />
    </>
  );
}
