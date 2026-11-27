import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { COQUILLE } from "@/lib/bureaux/coquille";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Les bureaux virtuels (27/11/2026) : l'étage en 3D où chaque pièce est une activité d'AVYORA, réservé à l'admin.
 * La page est une coquille SANS donnée (lib/bureaux/coquille.ts, écrite par maquettes/bureaux/assembler.mjs) : la scène
 * (/admin/bureaux/scene.js, réservée elle aussi : lib/bureaux/scene-fichiers.ts) lit ensuite /api/admin/bureaux, lui aussi réservé. Pleine page, hors du layout de l'admin
 * (une route n'en hérite pas) : la garde est donc refaite ici, avant d'envoyer quoi que ce soit.
 */
export async function GET(request: Request) {
  if (!(await getAdmin())) return NextResponse.redirect(new URL("/", request.url));
  return new Response(COQUILLE, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
  });
}
