/**
 * Le calcul de `finition.mts`, sans effet de bord : la table FINITION_PRIX que le moteur attend, et les écarts avec
 * celle de la maquette. `finition.mts` (en ligne de commande) et `tests/editeur-plan-prix.test.ts` (dans la suite)
 * l'importent tous deux : une seule règle.
 *
 * Valeur d'une entrée : [fourniture €, fourniture Éco, fourniture Standard, fourniture Premium, pose Éco, pose
 * Premium] — la pose du Standard vaut toujours 1 (vérifié ici).
 */
import fs from "node:fs";
import path from "node:path";
import { finCoefTask, finCoefMO, defaultCtx, type Lot, type Tache } from "../../lib/estimateur/core";

export type Entree = [number, number, number, number, number, number];
type F = "eco" | "standard" | "premium";
export const DEBUT_TABLE = "const FINITION_PRIX=";

/** La table que le moteur attend, pour chaque prix recopié du catalogue (la correspondance de coherence.mjs). */
export function tableAttendue(racine: string, maquettes: string): Record<string, Entree> {
  const lots = JSON.parse(fs.readFileSync(path.join(racine, "lib/estimateur/catalog.json"), "utf8")) as Lot[];
  const postes = new Map<string, { t: Tache; l: Lot }>();
  for (const l of lots) for (const t of l.t) postes.set(t.n, { t, l });
  /* La correspondance prix ↔ poste vit dans coherence.mjs : on la relit, on ne la recopie pas. */
  const coh = fs.readFileSync(path.join(maquettes, "tools/coherence.mjs"), "utf8");
  const i0 = coh.indexOf("const PRIX_MAP = ["), i1 = coh.indexOf("\n];", i0);
  const PRIX_MAP = new Function(`return ${coh.slice(coh.indexOf("[", i0), i1 + 2)}`)() as [string, string, string, number?][];
  const ctx = (finition: F) => ({ ...defaultCtx(), finition });
  const r4 = (x: number) => Math.round(x * 10000) / 10000;
  const attendu: Record<string, Entree> = {};
  for (const [tbl, cle, nom, coef] of PRIX_MAP) {
    const p = postes.get(nom);
    if (!p) continue;                                   /* coherence.mjs signale déjà un poste absent */
    const sm = p.t.sm;
    if (sm == null || sm <= 0) continue;                /* prestation pure : main-d'œuvre seule, aucune finition */
    const four = (f: F) => finCoefTask(ctx(f), p.l, p.t), mo = (f: F) => finCoefMO(ctx(f), p.l, p.t);
    if (mo("standard") !== 1) throw new Error(`« ${nom} » : la pose du Standard n'est plus le prix du catalogue (${mo("standard")})`);
    const e: Entree = [r4(sm * (coef ?? 1)), four("eco"), four("standard"), four("premium"), mo("eco"), mo("premium")];
    if (e.slice(1).every((x) => x === 1)) continue;     /* prix fixe ou lot sans écart : rien ne bouge */
    attendu[`${tbl}.${cle}`] = e;
  }
  return attendu;
}

/** La table telle qu'elle est écrite dans la maquette (null si elle est introuvable). */
export function tableMaquette(html: string): Record<string, number[]> | null {
  const j0 = html.indexOf(DEBUT_TABLE), j1 = html.indexOf(";", j0);
  return j0 < 0 ? null : (JSON.parse(html.slice(j0 + DEBUT_TABLE.length, j1)) as Record<string, number[]>);
}

/** Les écarts entre la table attendue et celle de la maquette, en phrases (vide = alignées). */
export function ecartsFinition(attendu: Record<string, Entree>, actuel: Record<string, number[]>): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(attendu), ...Object.keys(actuel)])) {
    const a = attendu[k], m = actuel[k];
    if (!a) out.push(`${k} : dans la maquette, plus dans le moteur`);
    else if (!m) out.push(`${k} : manque dans la maquette (fourniture ${a[0]} €, coefficients ${a.slice(1).join(" / ")})`);
    else if (m.length !== a.length || a.some((x, i) => Math.abs(x - m[i]) > 1e-6)) out.push(`${k} : maquette ${JSON.stringify(m)} · moteur ${JSON.stringify(a)}`);
  }
  return out;
}
