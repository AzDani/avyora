import { NextResponse } from "next/server";
import { getKbCategories, getKbPostes, majPostePrix, seedKb, ecrireSnapshot, kbEstVide } from "@/lib/kb-db";
import { gardeAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ensureSeed() {
  if (await kbEstVide()) {
    await seedKb();
    await ecrireSnapshot();
  }
}

export async function GET() {
  const garde = await gardeAdmin();
  if (garde) return garde;
  await ensureSeed();
  const [categories, postes] = await Promise.all([getKbCategories(), getKbPostes()]);
  return NextResponse.json({ categories, postes });
}

export async function PATCH(req: Request) {
  const garde = await gardeAdmin();
  if (garde) return garde;
  const { id, prix_min, prix_moy, prix_max } = await req.json();
  if (!id || ![prix_min, prix_moy, prix_max].every((n) => typeof n === "number" && n >= 0)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  if (!(prix_min <= prix_moy && prix_moy <= prix_max)) {
    return NextResponse.json({ error: "Ordre des prix : min ≤ moyen ≤ max" }, { status: 400 });
  }
  await majPostePrix(id, prix_min, prix_moy, prix_max); // met à jour la KB + régénère le snapshot moteur
  return NextResponse.json({ ok: true });
}
