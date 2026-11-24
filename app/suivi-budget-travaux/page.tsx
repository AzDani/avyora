import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { SUIVI_BUDGET } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (24/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: SUIVI_BUDGET.titre, description: SUIVI_BUDGET.description, path: SUIVI_BUDGET.chemin, type: "website" });

export default function Page() {
  return <PageService c={SUIVI_BUDGET} />;
}
