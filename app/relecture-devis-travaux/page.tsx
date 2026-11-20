import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { RELECTURE_DEVIS } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (référencement du 20/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: RELECTURE_DEVIS.titre, description: RELECTURE_DEVIS.description, path: RELECTURE_DEVIS.chemin, type: "website" });

export default function Page() {
  return <PageService c={RELECTURE_DEVIS} />;
}
