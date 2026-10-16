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
 * poste du neuf). Depuis N8, la maison neuve a les compteurs de la rénovation : sa grille croise
 * salles de bain, WC et chambres sur les deux formes de maison (les 36 scénarios d'origine), puis
 * les suites, les autres pièces, les menuiseries saisies, l'emprise mesurée et les variantes de
 * sanitaires (double vasque, bac 150×90, italienne). N8 a rapproché les deux moteurs : les écarts
 * sont listés dans son compte rendu (5 colonnes nouvelles, des scénarios nouveaux, aucun scénario
 * d'origine changé sur les colonnes d'avant).
 *
 * Réécriture VOLONTAIRE :
 *   TEMOINS_MAJ=1 CI=1 npx vitest run tests/temoins/quantites.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  CATALOG, CATALOG_NEUF, autoQty, defaultCtx, key, maisonComplete, quantitesNeuf, type MaisonNeuve, type Niveaux, type Selection,
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

/** Variantes de sanitaires du neuf : celles de la rénovation, plus une italienne 150×90. */
const VARIANTES_NEUF: Record<string, Selection> = {
  ...VARIANTES,
  "italienne-150x90": { [key("Plomberie", "Douche à l'italienne")]: { on: true, vsel: { dim: "150x90" } } },
};

function photoNeuf(): { colonnes: string[]; scenarios: Record<string, (number | null)[]> } {
  const maisons: Record<string, Record<string, number>> = {};
  const m = (o: Partial<MaisonNeuve>) => maisonComplete({ surface: 120, codePostal: "45000", ...o });
  for (const niveaux of ["pp", "etage"] as Niveaux[]) for (const sdb of [1, 2, 3]) for (const wc of [1, 2]) for (const chambres of [0, 2, 4])
    maisons[`${niveaux}/sdb${sdb}/wc${wc}/chambres${chambres}`] = quantitesNeuf(m({ niveaux, sdb, wc, chambres }));
  // N8 : les compteurs de la rénovation.
  for (const niveaux of ["pp", "etage"] as Niveaux[]) for (const suites of [1, 2]) for (const sdb of [0, 1])
    maisons[`${niveaux}/suites${suites}/sdb${sdb}/wc1/chambres2`] = quantitesNeuf(m({ niveaux, suites, sdb, wc: 1, chambres: 2 }));
  for (const [k, v] of [["sejour", 2], ["cuisines", 0], ["couloir", 2], ["buanderie", 1]] as const)
    maisons[`pp/pieces/${k}${v}`] = quantitesNeuf(m({ niveaux: "pp", [k]: v }));
  for (const n of [2, 6, 12]) maisons[`pp/menuiseries${n}`] = quantitesNeuf(m({ niveaux: "pp", menuiseries: n }));
  maisons["pp/emprise130"] = quantitesNeuf(m({ niveaux: "pp", emprise: 130 }));
  for (const sdb of [1, 2]) for (const [v, sel] of Object.entries(VARIANTES_NEUF))
    maisons[`pp/sdb${sdb}/variante/${v}`] = quantitesNeuf(m({ niveaux: "pp", sdb }), sel);
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
    expect(Object.keys(scenarios).length).toBe(2 * 3 * 2 * 3 + 2 * 2 * 2 + 4 + 3 + 1 + 2 * 5);
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

  it("N8 · le neuf voit la double vasque et le grand bac, pas la douche standard", () => {
    const { colonnes, scenarios: s } = photoNeuf();
    const i = (id: string) => colonnes.indexOf(id);
    const base = s["pp/sdb2/variante/aucune"];
    expect(s["pp/sdb2/variante/double-vasque"][i("plo-robinetterie-lavabo")]).toBe(2 * (base[i("plo-robinetterie-lavabo")] ?? 0));
    expect(s["pp/sdb2/variante/bac-150x90"][i("rev-etancheite-sous-carrelage-spec-douche")]).toBeGreaterThan(base[i("rev-etancheite-sous-carrelage-spec-douche")] ?? 0);
    expect(s["pp/sdb2/variante/italienne-150x90"][i("rev-etancheite-sous-carrelage-spec-douche")]).toBe(s["pp/sdb2/variante/bac-150x90"][i("rev-etancheite-sous-carrelage-spec-douche")]);
    expect(s["pp/sdb2/variante/italienne"][i("rev-etancheite-sous-carrelage-spec-douche")]).toBe(base[i("rev-etancheite-sous-carrelage-spec-douche")]);
    expect(base[i("rev-etancheite-sous-carrelage-spec-douche")]).toBe(13);
  });
});
