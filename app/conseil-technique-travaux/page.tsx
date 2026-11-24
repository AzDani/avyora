import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { CHOIX_TECHNIQUES } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/** Page de service de l'accompagnement (24/11/2026). Contenu : lib/accompagnement/pages-services.ts. */
export const dynamic = "force-static";
export const metadata: Metadata = seoMeta({ title: CHOIX_TECHNIQUES.titre, description: CHOIX_TECHNIQUES.description, path: CHOIX_TECHNIQUES.chemin, type: "website" });

export default function Page() {
  return <PageService c={CHOIX_TECHNIQUES} />;
}
