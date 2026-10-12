/**
 * Témoin T6 — les QUANTITÉS AUTOMATIQUES de la rénovation et du neuf (chantier N0).
 *
 * T1 part toujours des compteurs par défaut (`defaultCtx()`, presets) : il ne voit pas ce que
 * deviennent les quantités quand on change le nombre de suites, de salles de bain, de WC ou de
 * chambres, ni quand on choisit un meuble double vasque ou une douche 150×90. Ce témoin fige ces
 * formules telles qu'elles sont aujourd'hui, y compris là où les deux moteurs divergent (portes,
 * robinets, étanchéité de douche : revue §2, ligne 26). Le chantier N8, qui les rapproche, liste
 * ses écarts avant de réécrire les références.
 *
 * Références : `tests/fixtures/quantites-reno.json` (`autoQty`, une colonne par poste rénovation à
 * quantité automatique) et `tests/fixtures/quantites-neuf.json` (`quantitesNeuf`, une colonne par
 * poste du neuf). La maison neuve n'a ni suite ni variante de sanitaire : sa grille croise les
 * seuls compteurs qu'elle connaît (`MaisonNeuve`), sur les deux formes de maison.
 *
 * Réécriture VOLONTAIRE :
 *   TEMOINS_MAJ=1 CI=1 npx vitest run tests/temoins/quantites.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  CATALOG, CATALOG_NEUF, autoQty, defaultCtx, key, maisonComplete, quantitesNeuf, type Niveaux, type Selection,
} from "@/lib/estimateur";
import { ecartsValeurs, resume, verifier } from "./photo";

/* ── Rénovation : `autoQty` ─────────────────────────────────────────────────── */

const RENO = new URL("../fixtures/quantites-reno.json", import.meta.url);
/** Postes à quantité automatique (la liste ne dépend pas des compteurs). */
const POSTES_RENO = CATALOG.flatMap((l) => l.t.filter((t) => autoQty(defaultCtx(), l.c, t.n, {}) != null).map((t) => ({ c: l.c, t })));

const VARIANTES: Record<string, Selection> = {
  "aucune": {},
  "double-vasque": { [key("Plomberie", "Meuble-vasque")]: { on: true, vsel: { config: "double" } } },
  "bac-150x90": { [key("Plomberie", "Bac de douche")]: { on: true, vsel: { dim: "150x90" } } },
  "italienne": { [key("Plomberie", "Douche à l'italienne")]: { on: true } },
};

function photoReno(): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {};
  for (const suites of [0, 1, 2]) for (const sdb of [0, 1, 2]) for (const wc of [1, 2]) for (const chambres of [0, 2, 4])
    for (const [v, sel] of Object.entries(VARIANTES)) {
      const ctx = { ...defaultCtx(), suites, sdb, wc, chambres };
      out[`suites${suites}/sdb${sdb}/wc${wc}/chambres${chambres}/${v}`] = POSTES_RENO.map(({ c, t }) => autoQty(ctx, c, t.n, sel));
    }
  return out;
}

/* ── Construction neuve : `quantitesNeuf` ───────────────────────────────────── */

const NEUF = new URL("../fixtures/quantites-neuf.json", import.meta.url);
const ORDRE_NEUF = CATALOG_NEUF.flatMap((l) => l.t.map((t) => t.id));

function photoNeuf(): { colonnes: string[]; scenarios: Record<string, (number | null)[]> } {
  const maisons: Record<string, Record<string, number>> = {};
  for (const niveaux of ["pp", "etage"] as Niveaux[]) for (const sdb of [1, 2, 3]) for (const wc of [1, 2]) for (const chambres of [0, 2, 4])
    maisons[`${niveaux}/sdb${sdb}/wc${wc}/chambres${chambres}`] = quantitesNeuf(maisonComplete({ surface: 120, niveaux, sdb, wc, chambres, codePostal: "45000" }));
  // Colonnes : les postes chiffrés par au moins une maison, dans l'ordre du catalogue.
  const ids = new Set(Object.values(maisons).flatMap((q) => Object.keys(q)));
  const colonnes = [...ORDRE_NEUF.filter((id) => ids.has(id)), ...[...ids].filter((id) => !ORDRE_NEUF.includes(id)).sort()];
  return { colonnes, scenarios: Object.fromEntries(Object.entries(maisons).map(([k, q]) => [k, colonnes.map((id) => q[id] ?? null)])) };
}

describe("T6 · quantités automatiques", () => {
  it("rénovation : autoQty sur compteurs × variantes de sanitaires, comme la référence", () => {
    const scenarios = photoReno();
    expect(Object.keys(scenarios).length).toBe(3 * 3 * 2 * 3 * 4);
    const photo = { temoin: "T6 — quantités rénovation (tests/temoins/quantites.test.ts)", colonnes: POSTES_RENO.map(({ t }) => t.id), scenarios };
    const ecarts = verifier(RENO, photo, ecartsValeurs);
    expect(ecarts.length, resume(ecarts, RENO)).toBe(0);
  });

  it("construction neuve : quantitesNeuf sur compteurs × niveaux, comme la référence", () => {
    const { colonnes, scenarios } = photoNeuf();
    expect(Object.keys(scenarios).length).toBe(2 * 3 * 2 * 3);
    const ecarts = verifier(NEUF, { temoin: "T6 — quantités neuf (tests/temoins/quantites.test.ts)", colonnes, scenarios }, ecartsValeurs);
    expect(ecarts.length, resume(ecarts, NEUF)).toBe(0);
  });

  it("les variantes de sanitaires changent bien des quantités en rénovation (le témoin les voit)", () => {
    const s = photoReno();
    const i = (id: string) => POSTES_RENO.findIndex(({ t }) => t.id === id);
    const base = s["suites0/sdb1/wc1/chambres2/aucune"];
    expect(s["suites0/sdb1/wc1/chambres2/double-vasque"][i("plo-robinetterie-lavabo")]).toBe(2 * (base[i("plo-robinetterie-lavabo")] ?? 0));
    expect(s["suites0/sdb1/wc1/chambres2/bac-150x90"][i("rev-etancheite-sous-carrelage-spec-douche")]).not.toBe(base[i("rev-etancheite-sous-carrelage-spec-douche")]);
    expect(s["suites1/sdb1/wc1/chambres2/aucune"][i("min-porte-interieure-battante")]).toBe((base[i("min-porte-interieure-battante")] ?? 0) + 1);
  });
});
