/**
 * Outils communs des témoins versionnés (chantier N0 de la revue rénovation / neuf).
 *
 * Un témoin est une PHOTO : pour chaque scénario d'une grille, les montants que le moteur sort
 * aujourd'hui. La photo de référence vit dans `tests/fixtures/` ; le test refait la photo et
 * liste chaque écart, scénario par scénario, champ par champ, lot par lot.
 *
 * Une photo de devis tient sur une ligne JSON :
 *   [ttc, ht, tva, aleas, paye, matA, moA, achat, eco, frais, empreinte, [HT de chaque lot]]
 * Les montants sont arrondis au centime. L'empreinte résume TOUTES les lignes du devis (clé,
 * quantité, HT, TVA, mode « fait faire / je le fais / location ») : un montant qui bouge sur une
 * seule ligne la change, même quand deux lignes d'un même lot se compensent. Le HT par lot ne
 * sert qu'à dire OÙ l'écart se trouve.
 *
 * Mise à jour : jamais implicite. `-u` ne touche pas ces références (elles ne sont pas des
 * snapshots vitest) ; seule la variable `TEMOINS_MAJ=1` les réécrit, et le diff git de la
 * référence se relit ensuite ligne par ligne (un scénario par ligne).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import type { Devis, DevisLigne } from "@/lib/estimateur";

/** Réécriture VOLONTAIRE des références : `TEMOINS_MAJ=1 CI=1 npx vitest run tests/temoins`. */
export const MAJ = process.env.TEMOINS_MAJ === "1";

export const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Les dix montants d'une photo, dans l'ordre. */
export const CHAMPS = ["ttc", "ht", "tva", "aleas", "paye", "matA", "moA", "achat", "eco", "frais"] as const;

/** Photo d'un devis : les dix montants, l'empreinte des lignes, le HT de chaque lot (ordre de `lots`). */
export type Photo = [...number[], string, number[]];

export interface Reference<V = Photo> {
  temoin: string;
  /** Ordre des colonnes : lots (photo de devis) ou postes (quantités). */
  colonnes: string[];
  scenarios: Record<string, V>;
}

/** Même format de ligne que l'outil de session `photo-reno.mts` (contrôle croisé avec `avant.json`). */
export function empreinte(lignes: DevisLigne[]): string {
  const texte = lignes.map((l) => `${l.cle}|${l.qty}|${r2(l.ht)}|${r2(l.tva)}|${l.mode}`).join("\n");
  return createHash("sha256").update(texte).digest("hex").slice(0, 16);
}

export function photoDevis(dv: Devis, lots: string[]): Photo {
  const parLot = new Map<string, number>();
  for (const li of dv.lignes) parLot.set(li.corps, (parLot.get(li.corps) ?? 0) + li.ht);
  const { ttc, ht, tva, aleas } = dv.totaux;
  const { paye, matA, moA, achat, eco, frais } = dv.bilan;
  return [...[ttc, ht, tva, aleas, paye, matA, moA, achat, eco, frais].map(r2), empreinte(dv.lignes), lots.map((c) => r2(parLot.get(c) ?? 0))];
}

/** Écarts d'un scénario de devis : chaque montant, l'empreinte, puis le HT de chaque lot (par nom). */
export function ecartsDevis(cle: string, a: Photo, b: Photo, lotsA: string[], lotsB: string[]): string[] {
  const out: string[] = [];
  CHAMPS.forEach((f, i) => { if (a[i] !== b[i]) out.push(`${cle} · ${f} : ${a[i]} → ${b[i]}`); });
  if (a[10] !== b[10]) out.push(`${cle} · lignes (empreinte) : ${a[10]} → ${b[10]}`);
  const va = a[11] as number[], vb = b[11] as number[];
  const avant = new Map(lotsA.map((c, i) => [c, va[i] ?? 0]));
  const apres = new Map(lotsB.map((c, i) => [c, vb[i] ?? 0]));
  for (const c of new Set([...lotsA, ...lotsB])) {
    const x = avant.get(c) ?? 0, y = apres.get(c) ?? 0;
    if (x !== y) out.push(`${cle} · lot « ${c} » HT : ${x} → ${y}`);
  }
  return out;
}

/** Écarts d'un scénario de quantités : poste par poste (par nom de colonne). */
export function ecartsValeurs(cle: string, a: (number | null)[], b: (number | null)[], colA: string[], colB: string[]): string[] {
  const avant = new Map(colA.map((c, i) => [c, a[i] ?? null]));
  const apres = new Map(colB.map((c, i) => [c, b[i] ?? null]));
  const out: string[] = [];
  for (const c of new Set([...colA, ...colB])) {
    const x = avant.get(c) ?? null, y = apres.get(c) ?? null;
    if (x !== y) out.push(`${cle} · « ${c} » : ${x} → ${y}`);
  }
  return out;
}

/** Compare une photo complète à sa référence : scénarios disparus, nouveaux, et chaque écart. */
export function comparer<V>(
  ref: Reference<V>, photo: Reference<V>,
  ecarts: (cle: string, a: V, b: V, colA: string[], colB: string[]) => string[],
): string[] {
  const out: string[] = [];
  for (const [cle, a] of Object.entries(ref.scenarios)) {
    const b = photo.scenarios[cle];
    if (b === undefined) { out.push(`${cle} : scénario disparu de la grille`); continue; }
    out.push(...ecarts(cle, a, b, ref.colonnes, photo.colonnes));
  }
  for (const cle of Object.keys(photo.scenarios)) if (!(cle in ref.scenarios)) out.push(`${cle} : scénario nouveau, absent de la référence`);
  return out;
}

/** Message d'échec lisible : le nombre d'écarts et les 40 premiers. */
export function resume(ecarts: string[], fichier: URL): string {
  const nom = fichier.pathname.split("/").slice(-2).join("/");
  return `${ecarts.length} écart(s) avec ${nom}\n${ecarts.slice(0, 40).join("\n")}${ecarts.length > 40 ? "\n…" : ""}\n`
    + "Un écart attendu se liste dans le compte rendu du chantier, puis la référence se réécrit avec TEMOINS_MAJ=1.";
}

export function lireReference<V = Photo>(fichier: URL): Reference<V> {
  return JSON.parse(readFileSync(fichier, "utf8")) as Reference<V>;
}

/** Écrit une référence, un scénario par ligne : le diff git montre exactement les scénarios qui ont bougé. */
export function ecrireReference<V>(fichier: URL, ref: Reference<V>): void {
  const lignes = Object.entries(ref.scenarios).map(([cle, v]) => `  ${JSON.stringify(cle)}: ${JSON.stringify(v)}`);
  writeFileSync(fichier, `{\n "temoin": ${JSON.stringify(ref.temoin)},\n "colonnes": ${JSON.stringify(ref.colonnes)},\n "scenarios": {\n${lignes.join(",\n")}\n }\n}\n`);
}

/** Compare la photo à la référence — ou, avec `TEMOINS_MAJ=1`, réécrit la référence. */
export function verifier<V>(
  fichier: URL, photo: Reference<V>,
  ecarts: (cle: string, a: V, b: V, colA: string[], colB: string[]) => string[],
): string[] {
  if (MAJ) { ecrireReference(fichier, photo); return []; }
  return comparer(lireReference<V>(fichier), photo, ecarts);
}
