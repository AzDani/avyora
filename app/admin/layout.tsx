import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { listDemandesAccompagnement } from "@/lib/data/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Ce qui attend Daniel, pour les pastilles du menu. Une panne de lecture n'empêche pas d'ouvrir l'admin. */
async function aTraiter(): Promise<number | null> {
  try {
    return (await listDemandesAccompagnement()).filter((d) => !d.traiteeLe).length;
  } catch {
    return null;
  }
}

/**
 * Layout de l'espace admin. Garde d'accès dès la première ligne : sans email dans ADMIN_EMAILS,
 * getAdmin() renvoie null → redirection. Fail-safe : personne n'accède tant que la liste est vide.
 *
 * Refonte du 17/11/2026 : menu à gauche (components/admin/AdminNav.tsx) et zone élargie au-delà de la colonne du site
 * (max-w-5xl), jusqu'à 80rem, pour que les tableaux respirent. Les marges négatives se calculent sur la largeur de la
 * fenêtre : à moins de 82rem de large, il reste 1rem de chaque côté ; sur téléphone, elles valent zéro.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");
  const accompagnement = await aTraiter();

  return (
    <div data-admin-cadre="" style={{ marginInline: "calc(50% - min(50vw - 1rem, 40rem))" }}>
      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <AdminNav email={admin.email ?? ""} badges={{ accompagnement }} />
        <div className="min-w-0 pt-6 lg:pt-0">{children}</div>
      </div>
    </div>
  );
}
