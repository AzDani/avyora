import { NextResponse } from "next/server";

/**
 * Réponses et lecture du corps des routes `/api/plans*`.
 *
 * Les erreurs sont des CODES (`{ code }`), jamais un message de Postgres ni de zod : les textes
 * vivent côté client, en français et en anglais. Aucune réponse n'est mise en cache (données
 * personnelles).
 */
export const CODES_PLANS = [
  "connexion_requise", // 401
  "introuvable", // 404 : absent OU d'un autre compte (on ne dit pas si le plan existe)
  "invalide", // 400
  "contrat_invalide", // 400 : contrat absent ou malformé
  "contrat_version", // 400 : contrat d'une autre version majeure de l'éditeur
  "contrat_workflow", // 400 : contrat d'un autre type de plan que la ligne
  "trop_volumineux", // 413
  "trop_de_requetes", // 429
  "limite_gratuite", // 402 : un gratuit a déjà son plan
  "plafond", // 409 : plafond anti-abus (200 plans), Pro compris
  "conflit", // 409 : révision périmée, avec `revision` (celle du serveur)
  "pro_requis", // 403 : l'estimation détaillée d'un plan de rénovation est réservée au Pro (C7)
  "contrat_absent", // 400 : le plan n'a pas encore de contrat de rénovation (l'éditeur ne l'a pas envoyé)
  "code_postal", // 400 : code postal absent du contrat, et absent ou malformé dans la requête
  "indisponible", // 503 : réservé (service momentanément indisponible)
  "erreur", // 500
] as const;
export type CodePlans = (typeof CODES_PLANS)[number];

const STATUTS: Record<CodePlans, number> = {
  connexion_requise: 401,
  introuvable: 404,
  invalide: 400,
  contrat_invalide: 400,
  contrat_version: 400,
  contrat_workflow: 400,
  trop_volumineux: 413,
  trop_de_requetes: 429,
  limite_gratuite: 402,
  plafond: 409,
  conflit: 409,
  pro_requis: 403,
  contrat_absent: 400,
  code_postal: 400,
  indisponible: 503,
  erreur: 500,
};

const SANS_CACHE = { "Cache-Control": "private, no-store" };

export function repondre(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: SANS_CACHE });
}

export function erreur(code: CodePlans, extra?: Record<string, unknown>): NextResponse {
  return repondre({ ...(extra ?? {}), code }, STATUTS[code]);
}

/** Interrupteur `FEATURES.plans` éteint : la route n'existe pas. */
export function eteinte(): Response {
  return new Response(null, { status: 404 });
}

/**
 * Lit un corps JSON en bornant sa taille AVANT `JSON.parse` : `content-length` d'abord, puis le
 * flux est compté (un client peut mentir sur l'en-tête ou l'omettre).
 */
export async function lireCorpsBorne(
  req: Request,
  max: number,
): Promise<{ ok: true; data: unknown } | { ok: false; res: NextResponse }> {
  const annonce = req.headers.get("content-length");
  if (annonce !== null && Number(annonce) > max) return { ok: false, res: erreur("trop_volumineux") };
  if (!req.body) return { ok: false, res: erreur("invalide") };

  const lecteur = req.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lecteur.cancel().catch(() => {});
      return { ok: false, res: erreur("trop_volumineux") };
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let o = 0;
  for (const m of morceaux) {
    tout.set(m, o);
    o += m.byteLength;
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(tout)) };
  } catch {
    return { ok: false, res: erreur("invalide") };
  }
}
