import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { AVIS_AVANT_ACHAT } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (24/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: AVIS_AVANT_ACHAT.titre, description: AVIS_AVANT_ACHAT.description, path: AVIS_AVANT_ACHAT.chemin, type: "website" });

export default function Page() {
  return <PageService c={AVIS_AVANT_ACHAT} />;
}
