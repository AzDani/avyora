import type { Metadata } from "next";
import { seoMeta } from "@/lib/seo-og";
import { betaActive, libellesBeta } from "@/lib/beta";
import { trouverArtisan } from "@/lib/accompagnement/pages-services";
import PageService from "@/components/accompagnement/PageService";

/**
 * La page des clients du Réseau AVYORA (référencement du 20/11/2026). Dynamique : l'accès (« gratuit pendant la bêta »
 * ou « avec AVYORA Pro ») suit la bêta, qui se termine sans redéploiement. Contenu : lib/accompagnement/pages-services.ts.
 */
export const dynamic = "force-dynamic";

const DESCRIPTION = trouverArtisan("").description;
export const metadata: Metadata = seoMeta({ title: "Trouver un artisan vérifié pour tes travaux", description: DESCRIPTION, path: "/trouver-un-artisan", type: "website" });

export default function Page() {
  const acces = betaActive()
    ? `Gratuit pendant la bêta, jusqu'au ${libellesBeta("fr").fin}, avec un compte.`
    : "Réservé à l'abonnement AVYORA Pro, sans engagement.";
  return <PageService c={trouverArtisan(acces)} />;
}
