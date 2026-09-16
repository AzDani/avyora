import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AVYORA — copilote rénovation & investissement",
    short_name: "AVYORA",
    description:
      "Estime le coût de tes travaux de rénovation au prix du marché français, poste par poste et ajusté à ta région.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#1E1B4B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
