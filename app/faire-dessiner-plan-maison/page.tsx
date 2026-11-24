import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { PLANS_2D } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (24/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: PLANS_2D.titre, description: PLANS_2D.description, path: PLANS_2D.chemin, type: "website" });

export default function Page() {
  return <PageService c={PLANS_2D} />;
}
