import { NextResponse } from "next/server";
import {
  ajouterEntite,
  majEntite,
  archiverEntite,
  supprimerEntite,
  deplacerEntite,
  type Entite,
} from "@/lib/parcours-db";

/**
 * Endpoint unique de mutation du form-builder (Palier 2).
 * body : { action, entity, id?, parentId?, patch?, sens? }
 *   action : create | update | archive | restore | delete | move
 */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    action: string;
    entity: Entite;
    id?: string;
    parentId?: string;
    patch?: Record<string, unknown>;
    sens?: "up" | "down";
  };
  const entites: Entite[] = ["step", "group", "question", "option"];
  if (!entites.includes(b.entity)) return NextResponse.json({ error: "entité invalide" }, { status: 400 });

  switch (b.action) {
    case "create":
      if (!b.parentId) return NextResponse.json({ error: "parentId requis" }, { status: 400 });
      return NextResponse.json({ ok: true, id: await ajouterEntite(b.entity, b.parentId) });
    case "update":
      if (!b.id || !b.patch) return NextResponse.json({ error: "id/patch requis" }, { status: 400 });
      await majEntite(b.entity, b.id, b.patch);
      return NextResponse.json({ ok: true });
    case "archive":
      if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      await archiverEntite(b.entity, b.id, true);
      return NextResponse.json({ ok: true });
    case "restore":
      if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      await archiverEntite(b.entity, b.id, false);
      return NextResponse.json({ ok: true });
    case "delete":
      if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
      await supprimerEntite(b.entity, b.id);
      return NextResponse.json({ ok: true });
    case "move":
      if (!b.id || !b.sens) return NextResponse.json({ error: "id/sens requis" }, { status: 400 });
      await deplacerEntite(b.entity, b.id, b.sens);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  }
}
