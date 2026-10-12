/**
 * Ce que Postgres rangera, mesuré AVANT d'écrire.
 *
 * Les CHECK de `floor_plans` (migration 0004) bornent `octet_length(colonne::text)`. Or le texte d'un
 * jsonb n'est pas le JSON compact de `JSON.stringify` :
 *   - une espace suit chaque « : » et chaque « , » (`{"a": 1, "b": [1, 2]}`) : +17 % mesuré sur un plan ;
 *   - un nombre en notation exponentielle est écrit en entier (`1e-7` → `0.0000001`,
 *     `3.552713678800501e-15`, bruit courant de la géométrie, prend 32 octets au lieu de 21).
 * Mesurer en `JSON.stringify` laisserait passer un état que le CHECK refuse ensuite (erreur 500).
 * `octetsJsonb` rend la longueur exacte de `valeur::jsonb::text` (vérifiée contre Postgres sur les états
 * réels et des cas extrêmes), et `Infinity` pour ce que Postgres refuse de ranger en jsonb : un caractère
 * nul (`\u0000`) ou une moitié de paire UTF-16 isolée, dans une valeur comme dans une clé.
 */

/** Ce que jsonb refuse : le caractère nul et les moitiés de paire UTF-16 isolées. */
const IRRECEVABLE = /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export function texteIrrecevable(s: string): boolean {
  return IRRECEVABLE.test(s);
}

/** Au-delà, on ne mesure pas (et Postgres refuserait l'imbrication bien avant la taille). */
const PROFONDEUR_MESUREE = 200;

/** Un nombre tel que `numeric_out` l'écrit : jamais d'exposant. Le JS n'en écrit qu'au-delà de 1e21 ou sous 1e-6. */
export function nombreJsonb(n: number): string {
  if (!Number.isFinite(n)) return "null"; /* JSON.stringify en fait null */
  const s = String(n); /* -0 → "0", comme Postgres */
  const m = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(s);
  if (!m) return s;
  const [, signe, entier, fraction = "", exposant] = m;
  const chiffres = entier + fraction;
  const virgule = entier.length + Number(exposant);
  if (virgule <= 0) return `${signe}0.${"0".repeat(-virgule)}${chiffres}`;
  if (virgule >= chiffres.length) return signe + chiffres + "0".repeat(virgule - chiffres.length);
  return `${signe}${chiffres.slice(0, virgule)}.${chiffres.slice(virgule)}`;
}

function chaine(s: string): number {
  if (IRRECEVABLE.test(s)) return Infinity;
  /* Mêmes échappements des deux côtés (", \, \b \f \n \r \t, \u00XX), le reste en UTF-8 brut. */
  return Buffer.byteLength(JSON.stringify(s), "utf8");
}

function mesurer(v: unknown, d: number): number {
  if (d > PROFONDEUR_MESUREE) return Infinity;
  if (v === null) return 4;
  switch (typeof v) {
    case "boolean":
      return v ? 4 : 5;
    case "number":
      return nombreJsonb(v).length;
    case "string":
      return chaine(v);
    case "object":
      break;
    default:
      return Infinity; /* undefined, fonction, bigint, symbole : rien de tel ne vient d'un JSON */
  }
  if (Array.isArray(v)) {
    if (!v.length) return 2;
    let n = 2 + 2 * (v.length - 1); /* [ ] et « , » entre éléments */
    for (const x of v) n += x === undefined ? 4 : mesurer(x, d + 1);
    return n;
  }
  let n = 2;
  let k = 0;
  for (const [cle, x] of Object.entries(v as Record<string, unknown>)) {
    if (x === undefined) continue; /* JSON.stringify l'omet */
    n += chaine(cle) + 2 + mesurer(x, d + 1); /* "clé": valeur */
    k++;
  }
  return n + (k > 1 ? 2 * (k - 1) : 0);
}

/** `octet_length(valeur::jsonb::text)`, ou `Infinity` si Postgres ne peut pas la ranger. */
export function octetsJsonb(v: unknown): number {
  try {
    return mesurer(v, 0);
  } catch {
    return Infinity;
  }
}
