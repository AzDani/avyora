import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { ESTIMATION_BUDGET } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (24/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: ESTIMATION_BUDGET.titre, description: ESTIMATION_BUDGET.description, path: ESTIMATION_BUDGET.chemin, type: "website" });

export default function Page() {
  return <PageService c={ESTIMATION_BUDGET} />;
}
