import { listInscrits, typePrincipal, labelTues } from "@/lib/data/admin";
import { afficherPortable } from "@/lib/telephone";
import InscritsTable, { type InscritRow } from "@/components/admin/InscritsTable";

export const dynamic = "force-dynamic";

export default async function AdminInscrits() {
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
  return <InscritsTable rows={rows} />;
}
