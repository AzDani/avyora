import { NextResponse } from "next/server";
import { getUser, estPro } from "@/lib/auth";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { calculRapideNeuf, calculRapideReno, entreeRapideSchema } from "@/lib/estimateur/rapide-serveur";

/**
 * L'estimation RAPIDE (rénovation et neuf), calculée ici et non plus dans le navigateur (27/11/2026) : le formulaire
 * envoie ses réponses, il reçoit ce qu'il affiche. Publique (le formulaire l'est), mais sans compte la réponse ne
 * porte AUCUN montant (le résultat se voit avec un compte, décision de Dani du 26/11/2026) : seulement le preset à
 * ranger (postes et quantités, sans prix) et les % d'économie des cartes. Détail des droits : `rapide-serveur.ts`.
 *
 * Entrées validées (zod, bornes du formulaire) ; plafond `rapide` (240 / min) par compte, sinon par IP.
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!(await verifierLimite("rapide", user ? `u:${user.id}` : `ip:${await clientIp()}`))) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  }
  let brut: unknown;
  try {
    const texte = await req.text();
    if (texte.length > 40_000) return NextResponse.json({ error: "Requête trop grande" }, { status: 413 });
    brut = JSON.parse(texte);
  } catch {
    return NextResponse.json({ error: "JSON illisible" }, { status: 400 });
  }
  const e = entreeRapideSchema.safeParse(brut);
  if (!e.success) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  const droits = { compte: !!user, pro: !!user && estPro(user) };
  const sortie = e.data.nature === "reno" ? calculRapideReno(e.data, droits) : calculRapideNeuf(e.data, droits);
  return NextResponse.json(sortie, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
