import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { SUIVI_CHANTIER } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (référencement du 20/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: SUIVI_CHANTIER.titre, description: SUIVI_CHANTIER.description, path: SUIVI_CHANTIER.chemin, type: "website" });

export default function Page() {
  return <PageService c={SUIVI_CHANTIER} />;
}
