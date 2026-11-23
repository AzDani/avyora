import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { ACHAT_REVENTE } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement : l'achat-revente (23/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: ACHAT_REVENTE.titre, description: ACHAT_REVENTE.description, path: ACHAT_REVENTE.chemin, type: "website" });

export default function Page() {
  return <PageService c={ACHAT_REVENTE} />;
}
