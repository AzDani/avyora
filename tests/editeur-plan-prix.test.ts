/**
 * Le compteur de l'éditeur de plan dit les prix de l'estimateur (22/11/2026).
 *
 * L'éditeur (`maquettes/plan-editor.html`) est un fichier autonome : pour son compteur en direct, il RECOPIE les prix
 * du catalogue et le barème de finition. Deux contrôles le comparent au moteur, mais ils ne tournaient qu'à la main :
 * le 21 et le 22/11/2026, sept prix corrigés et le nouveau barème de finition ont été mis en ligne sans être reportés
 * dans l'éditeur (porte de garage −39 %, raccords de toiture −32 %, carrelage −18 %…), et aucun test n'a bronché.
 * Ils tournent désormais avec la suite : un prix ou un barème changé sans l'éditeur fait échouer les tests.
 *
 * - `coherence.mjs` : chaque prix recopié = le fourni-posé de son poste au catalogue ; les coefficients de matériau et
 *   de vitrage = ceux du moteur ; le prix de Pro de l'éditeur = celui de la page Tarifs ;
 * - `finition.mts` : la table FINITION_PRIX (fourniture et pose, par finition) = celle que le moteur calcule.
 *
 * Le rapprochement compteur ↔ devis sur un plan entier (`couverture.mts`) ouvre un navigateur : il reste dans la
 * batterie des maquettes (`maquettes/README.md`).
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import { ecartsFinition, tableAttendue, tableMaquette } from "../maquettes/tools/finition-table";

const RACINE = path.join(__dirname, "..");
const lancer = (cmd: string, args: string[]): { code: number; sortie: string } => {
  try {
    return { code: 0, sortie: execFileSync(cmd, args, { cwd: RACINE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    const x = e as { status?: number; stdout?: string; stderr?: string };
    return { code: x.status ?? 1, sortie: `${x.stdout ?? ""}${x.stderr ?? ""}` };
  }
};

describe("éditeur de plan · le compteur suit l'estimateur", () => {
  it("prix recopiés, coefficients et prix de Pro alignés sur le moteur (coherence.mjs)", () => {
    const r = lancer(process.execPath, ["maquettes/tools/coherence.mjs"]);
    expect(r.sortie.split("\n").filter((l) => l.includes("✗")), r.sortie.slice(-1500)).toEqual([]);
    expect(r.code).toBe(0);
  }, 60_000);

  it("finition : fourniture et pose, comme lineHT (finition.mts)", () => {
    const actuel = tableMaquette(readFileSync(path.join(RACINE, "maquettes", "plan-editor.html"), "utf8"));
    expect(actuel).not.toBeNull();
    const attendu = tableAttendue(RACINE, path.join(RACINE, "maquettes"));
    expect(ecartsFinition(attendu, actuel!)).toEqual([]);
    expect(Object.keys(attendu).length).toBeGreaterThan(100);
    // Le carrelage au sol : le compteur en Premium pose 30 % plus cher, en Éco 12 % moins cher, comme l'estimateur.
    expect(actuel!["PRIX.revetement.Carrelage"]).toEqual([36, 0.507, 0.78, 1.404, 0.88, 1.3]);
  });
});
