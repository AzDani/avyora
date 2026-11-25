import { NextResponse } from "next/server";
import { supprimerDepense, modifierDepense } from "@/lib/data/depenses";
import { getProjet } from "@/lib/data/projects";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody, depenseSchema } from "@/lib/validation";
import { corpsDuProjet, natureEtTva, CORPS_AUTRE } from "@/lib/estimateur/budget-reel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Supprime une dépense réelle d'un projet (module M5). La RLS refuse celle d'un projet d'un autre. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; depenseId: string }> }) {
  const { id, depenseId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  if (!UUID.test(id) || !UUID.test(depenseId)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!(await supprimerDepense(id, depenseId))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

/** Modifie une dépense réelle d'un projet (25/11/2026, demande de Dani : « on doit pouvoir modifier une dépense ») :
 *  les mêmes champs et les mêmes règles que l'ajout (corps d'état du projet, nature, TVA). La RLS refuse celle d'un
 *  projet d'un autre. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; depenseId: string }> }) {
  const { id, depenseId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  if (!UUID.test(id) || !UUID.test(depenseId)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const v = valider(depenseSchema, await jsonBody(req));
  if (!v.ok) return v.res;

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  const permis = new Set([...corpsDuProjet(projet.reponses), CORPS_AUTRE]);
  if (!permis.has(v.data.corpsEtat)) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const nt = natureEtTva(v.data);
  if (!nt) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  const d = await modifierDepense(id, depenseId, { corps: v.data.corpsEtat, libelle: v.data.libelle, montant: v.data.montant, ...nt });
  if (!d) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ depense: d });
}
