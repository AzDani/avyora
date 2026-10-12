/**
 * La vignette d'un plan, calculée PAR LE SERVEUR depuis son état.
 *
 * Elle est rangée dans `floor_plans.apercu` et redessinée par « Mes plans » (hub et éditeur). Elle ne
 * contient que des NOMBRES et des codes d'une liste fermée : rien de ce que le client a écrit n'en
 * sort tel quel, donc rien ne peut finir en HTML ou en attribut.
 *
 * Forme : `[[ax, ay, bx, by, type, st], …]` pour les murs du niveau affiché (`etat.cur`, borné),
 * séparations (`virtuel`) exclues. Fonction pure.
 */

export const APERCU_TYPES = ["cloison", "mur", "porteur"] as const;
export const APERCU_STATUTS = ["", "creer", "demolir"] as const;
export type ApercuType = (typeof APERCU_TYPES)[number];
export type ApercuStatut = (typeof APERCU_STATUTS)[number];
export type ApercuMur = [number, number, number, number, ApercuType, ApercuStatut];

export const APERCU_MURS_MAX = 2000;
const BORNE = 10000;

/** Un nombre fini, borné à ± 10 000 et arrondi au centimètre (la vignette n'a pas besoin de plus). */
function coord(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const b = Math.min(BORNE, Math.max(-BORNE, n));
  return Math.round(b * 100) / 100 + 0; /* + 0 : pas de -0 */
}

function point(p: unknown): [number, number] | null {
  if (!p || typeof p !== "object") return null;
  const o = p as { x?: unknown; y?: unknown };
  const x = coord(o.x), y = coord(o.y);
  return x === null || y === null ? null : [x, y];
}

export function apercuDepuisEtat(etat: unknown): ApercuMur[] {
  if (!etat || typeof etat !== "object") return [];
  const e = etat as { levels?: unknown; cur?: unknown };
  const niveaux = Array.isArray(e.levels) ? e.levels : [];
  if (!niveaux.length) return [];
  const c = Number(e.cur);
  const i = Number.isInteger(c) ? Math.min(Math.max(c, 0), niveaux.length - 1) : 0;
  const niveau = niveaux[i] as { walls?: unknown } | null;
  const murs = niveau && Array.isArray(niveau.walls) ? niveau.walls : [];

  const sortie: ApercuMur[] = [];
  for (const w of murs) {
    if (sortie.length >= APERCU_MURS_MAX) break;
    if (!w || typeof w !== "object") continue;
    const m = w as { a?: unknown; b?: unknown; type?: unknown; st?: unknown };
    if (m.type === "virtuel") continue;
    const a = point(m.a), b = point(m.b);
    if (!a || !b) continue;
    /* Un type inconnu se dessine comme un mur (c'est l'épaisseur par défaut de l'éditeur, `wallT`). */
    const type = (APERCU_TYPES as readonly unknown[]).includes(m.type) ? (m.type as ApercuType) : "mur";
    const st = m.st === "creer" || m.st === "demolir" ? m.st : "";
    sortie.push([a[0], a[1], b[0], b[1], type, st]);
  }
  return sortie;
}
