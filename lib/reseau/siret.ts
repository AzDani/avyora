/**
 * Vérification du SIRET d'un artisan qui postule au Réseau AVYORA, par l'API publique et gratuite de l'État
 * (recherche-entreprises.api.gouv.fr : sans clé, 7 appels par seconde au plus). Elle dit si l'établissement existe, s'il
 * est actif, son nom, son activité (code NAF) et s'il a un label RGE. Le résultat est gardé avec la candidature
 * (`siret_verif`) : Daniel le voit dans l'admin et peut relancer la vérification.
 */

/** Les 14 chiffres d'un SIRET tapé avec ou sans espaces ; null si ce n'en est pas un. */
export function normaliserSiret(saisie: string): string | null {
  const c = String(saisie ?? "").replace(/[\s.\-]/g, "");
  return /^\d{14}$/.test(c) ? c : null;
}

/** La clé de contrôle (Luhn) d'un SIRET. Exception connue : les établissements de La Poste (SIREN 356000000). */
export function siretCoherent(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (siret.startsWith("356000000")) return siret.split("").reduce((a, c) => a + Number(c), 0) % 5 === 0;
  let somme = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(siret[13 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    somme += n;
  }
  return somme % 10 === 0;
}

export type VerifSiret = {
  /** actif ; ferme (établissement ou entreprise fermés) ; introuvable ; indisponible (l'API n'a pas répondu). */
  statut: "actif" | "ferme" | "introuvable" | "indisponible";
  nom?: string;
  /** Code NAF de l'établissement (43.22A…). */
  naf?: string;
  /** Activité du bâtiment (NAF 41, 42, 43, ou architecture et ingénierie 71.1). */
  batiment?: boolean;
  adresse?: string;
  codePostal?: string;
  dateCreation?: string;
  rge?: boolean;
  verifieLe: string;
};

const NAF_BATIMENT = /^(41|42|43)\.|^71\.1/;
const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Lit la réponse de l'API pour un SIRET précis (pure : testée sans réseau). */
export function lireReponseSiret(json: unknown, siret: string, maintenant = new Date()): VerifSiret {
  const verifieLe = maintenant.toISOString();
  const resultats = (json as { results?: unknown[] } | null)?.results;
  const r = Array.isArray(resultats) ? (resultats.find((x) => (x as { siren?: string })?.siren === siret.slice(0, 9)) as Record<string, unknown> | undefined) : undefined;
  if (!r) return { statut: "introuvable", verifieLe };
  const etabs = [...((r.matching_etablissements as Record<string, unknown>[] | undefined) ?? []), r.siege as Record<string, unknown> | undefined].filter(Boolean) as Record<string, unknown>[];
  const e = etabs.find((x) => x.siret === siret);
  if (!e) return { statut: "introuvable", verifieLe };
  const complements = (r.complements ?? {}) as Record<string, unknown>;
  const naf = texte(e.activite_principale) ?? texte(r.activite_principale);
  const nom = texte(r.nom_complet) ?? texte(r.nom_raison_sociale);
  return {
    statut: r.etat_administratif === "C" || e.etat_administratif === "F" ? "ferme" : "actif",
    nom: nom && !nom.includes("NON-DIFFUSIBLE") ? nom : undefined,
    naf,
    batiment: naf ? NAF_BATIMENT.test(naf) : undefined,
    adresse: texte(e.adresse),
    codePostal: texte(e.code_postal),
    dateCreation: texte(e.date_creation) ?? texte(r.date_creation),
    rge: complements.est_rge === true || (Array.isArray(e.liste_rge) && e.liste_rge.length > 0),
    verifieLe,
  };
}

/** Interroge l'API (5 s au plus). Une panne ne bloque personne : `indisponible`, et Daniel relance plus tard. */
export async function verifierSiret(siret: string): Promise<VerifSiret> {
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=5`;
    const rep = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!rep.ok) return { statut: "indisponible", verifieLe: new Date().toISOString() };
    return lireReponseSiret(await rep.json(), siret);
  } catch {
    return { statut: "indisponible", verifieLe: new Date().toISOString() };
  }
}
