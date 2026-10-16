import { describe, it, expect } from "vitest";
import { CATALOG, CATALOG_NEUF, PHASES_NEUF, buildDevis, presetMaison } from "@/lib/estimateur";
import { catT, catLigne, aTraductionEN, type CatKind } from "@/lib/estimateur/catalog-i18n";

/* C6 · le catalogue de la construction neuve s'affiche en anglais sans aucun repli sur le français. */

type Var = { label: string; opts: { label: string }[] };
const chaines = (lots: typeof CATALOG) => {
  const out: [CatKind, string][] = [];
  for (const l of lots) {
    out.push(["corps", l.c], ["phases", l.p]);
    if (l.note) out.push(["notes", l.note]);
    for (const t of l.t) {
      out.push(["postes", t.n], ["unites", t.u]);
      if (t.note) out.push(["notes", t.note]);
      for (const g of ((t as { vars?: Var[] }).vars ?? [])) {
        out.push(["vgroups", g.label]);
        for (const o of g.opts) out.push(["vopts", o.label]);
      }
    }
  }
  return out;
};

describe("C6 · traductions EN du catalogue neuf", () => {
  const neuf = chaines(CATALOG_NEUF);

  it("chaque lot, phase et poste du neuf a sa traduction anglaise", () => {
    const manque = neuf.filter(([k, s]) => (k === "corps" || k === "phases" || k === "postes") && !aTraductionEN(k, s));
    expect(manque).toEqual([]);
  });

  it("les unités, les variantes et les notes (du lot comme du poste) aussi", () => {
    const manque = neuf.filter(([k, s]) => k !== "corps" && k !== "phases" && k !== "postes" && !aTraductionEN(k, s));
    /* Les dernières exceptions (chaînes COMMUNES aux deux catalogues : poutre et poteau béton armé, clim
       gainable, baie et porte coulissantes) sont traduites depuis N6, qui met les deux détaillés
       entièrement en anglais. */
    expect([...new Set(manque.map(([k, s]) => `${k}:${s}`))]).toEqual([]);
    const reno = new Set(chaines(CATALOG).map(([k, s]) => `${k}:${s}`));
    for (const [k, s] of manque) expect(reno.has(`${k}:${s}`)).toBe(true);
  });

  it("les 9 phases du chantier se lisent en anglais (bilan rapide, détaillé, PDF)", () => {
    expect(PHASES_NEUF).toHaveLength(9);
    for (const p of PHASES_NEUF) expect(catT("en", "phases", p)).not.toBe(p);
    expect(catT("en", "phases", "Études & permis")).toBe("Studies & permit");
    expect(catT("en", "unites", "pct")).toBe("%");
    expect(catT("en", "unites", "m3")).toBe("m³");
  });

  it("une traduction anglaise ne garde pas de mot français courant", () => {
    const motsFR = /\b(le|la|les|des|du|une|avec|sans|pour|dans|maison|mur|toit|chantier|prix|poste|devis|compris)\b/i;
    const suspects = neuf.filter(([k, s]) => aTraductionEN(k, s)).map(([k, s]) => catT("en", k, s)).filter((e) => motsFR.test(e.replace(/«[^»]*»|\([^)]*\)/g, "")));
    expect([...new Set(suspects)]).toEqual([]);
  });

  it("le français ne bouge pas : en FR, catT rend la chaîne d'origine (hors unités pct/m3)", () => {
    for (const [k, s] of neuf) if (k !== "unites") expect(catT("fr", k, s)).toBe(s);
  });

  it("la rénovation aussi a toutes ses chaînes en anglais (N6), sans repli sur le français, tous types confondus", () => {
    /* Avant N6, 19 chaînes de la rénovation restaient sans anglais (liste figée ici : les traduire changeait
       l'écran anglais de la rénovation). N6 met le détaillé entièrement en anglais : la liste est vide, et
       une chaîne ajoutée au catalogue sans sa traduction fait échouer ce test. Le français ne bouge pas. */
    const sans = [...new Set(chaines(CATALOG).filter(([k, s]) => !aTraductionEN(k, s)).map(([k, s]) => `${k}:${s}`))];
    expect(sans).toEqual([]);
    for (const [k, s] of chaines(CATALOG)) if (k !== "unites") expect(catT("fr", k, s)).toBe(s);
  });

  it("une ligne de devis avec sa variante se lit en anglais (catLigne), et rien ne change en FR", () => {
    const p = presetMaison({ surface: 130, niveaux: "etage", garage: 20, argile: "fort" }, { qui: "pros", codePostal: "69001" });
    const lignes = buildDevis(CATALOG_NEUF, p.ctx, p.sel).lignes;
    for (const li of lignes) expect(catLigne("fr", li.nom, li.cle)).toBe(li.nom);
    const argile = lignes.find((li) => li.nom.startsWith("Surcoût des fondations en sol argileux"))!;
    expect(catLigne("en", argile.nom, argile.cle)).toBe("Extra foundation cost on clay soil (ballpark before the G2 study) (high)");
    const fen = lignes.find((li) => li.nom.startsWith("Fenêtres ("))!;
    expect(catLigne("en", fen.nom, fen.cle)).toMatch(/^Windows \((PVC|aluminium|wood), (double|triple) glazing\)$/);
    const fr = lignes.filter((li) => catLigne("en", li.nom, li.cle) === li.nom && /[a-z]/.test(li.nom)).map((li) => li.nom);
    expect(fr).toEqual([]);
  });
});
