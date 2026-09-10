import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import AdminTabs from "@/components/admin/AdminTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * Layout de l'espace admin. Garde d'accès dès la première ligne : sans email dans ADMIN_EMAILS,
 * getAdmin() renvoie null → redirection. Fail-safe : personne n'accède tant que la liste est vide.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Espace admin</p>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">Pilotage AVYORA</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0f9d6b]" />
          {admin.email}
        </span>
      </div>
      <AdminTabs />
      <div>{children}</div>
    </div>
  );
}
