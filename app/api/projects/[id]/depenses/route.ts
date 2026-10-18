import { NextResponse } from "next/server";
import { getProjet } from "@/lib/data/projects";
import { ajouterDepense, compterDepenses, MAX_DEPENSES } from "@/lib/data/depenses";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite } from "@/lib/ratelimit";
import { valider, jsonBody, depenseSchema } from "@/lib/validation";
import { corpsDuProjet, CORPS_AUTRE } from "@/lib/estimateur/budget-reel";

/**
 * Ajoute une dépense réelle à un projet (module M5). Pro (pendant la bêta : tout compte confirmé),
 * propriétaire ou membre du projet (RLS). Le corps d'état doit être l'un de ceux de l'estimation, ou
 * « Autre » : la comparaison prévu / réel reste lisible.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  if (!estPro(user)) return NextResponse.json({ error: "Réservé à Pro" }, { status: 403 });
  if (!(await verifierLimite("api", user.id))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  const v = valider(depenseSchema, await jsonBody(req));
  if (!v.ok) return v.res;

  const projet = await getProjet(id);
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  const permis = new Set([...corpsDuProjet(projet.reponses), CORPS_AUTRE]);
  if (!permis.has(v.data.corpsEtat)) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  if ((await compterDepenses(id)) >= MAX_DEPENSES) return NextResponse.json({ error: "Nombre maximal de dépenses atteint" }, { status: 409 });

  const d = await ajouterDepense(id, { corps: v.data.corpsEtat, libelle: v.data.libelle, montant: v.data.montant });
  if (!d) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ depense: d });
}
