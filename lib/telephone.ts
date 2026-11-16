/**
 * Numéro de portable demandé au questionnaire de bienvenue (décision de Dani du 16/11/2026 : « je veux le numéro de
 * portable, c'est important »). Accepte les écritures courantes (06 12 34 56 78, 06.12.34.56.78, +33 6 12 34 56 78,
 * 0033…) et les numéros étrangers au format international (+1 305…). Rend une forme normalisée (+33612345678), ou
 * une erreur : un fixe français (01 à 05, 09) n'est pas un portable.
 */
export type ResultatTel = { ok: true; tel: string } | { ok: false; erreur: "vide" | "format" | "pasPortable" };

export function normaliserPortable(saisie: string): ResultatTel {
  const brut = (saisie ?? "").trim();
  if (!brut) return { ok: false, erreur: "vide" };
  if (!/^[+\d][\d\s.\-()]*$/.test(brut)) return { ok: false, erreur: "format" };
  let n = brut.replace(/[\s.\-()]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (/^0\d{9}$/.test(n)) n = "+33" + n.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(n)) return { ok: false, erreur: "format" };
  if (n.startsWith("+33")) {
    if (n.length !== 12) return { ok: false, erreur: "format" };
    if (!/^\+33[67]/.test(n)) return { ok: false, erreur: "pasPortable" };
  }
  return { ok: true, tel: n };
}

/** Affichage lisible : +33 6 12 34 56 78 pour la France, la forme normalisée sinon. */
export function afficherPortable(tel: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(tel);
  return m ? `+33 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : tel;
}

/** « Plus tard » sur le rappel « Ajoute ton portable » (components/RappelPortable.tsx) : cookie de préférence de 14 jours,
 *  lu par « Mes projets » côté serveur. Ici et pas dans le composant client : une constante exportée d'un module
 *  "use client" n'arrive pas telle quelle dans un composant serveur. */
export const COOKIE_RAPPEL_PORTABLE = "avyora_rappel_portable";
