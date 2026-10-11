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
    /* Seules exceptions : trois options de postes REPRIS de la rénovation (baie vitrée, porte
       coulissante), sans traduction avant C6. Les traduire changerait l'écran anglais de la
       rénovation : c'est une décision à part, pas celle de ce chantier. */
    expect([...new Set(manque.map(([k, s]) => `${k}:${s}`))]).toEqual(["vopts:Coulissante", "vopts:À galandage", "vopts:En applique"]);
    const reno = new Set(CATALOG.flatMap((l) => l.t.flatMap((t) => ((t as { vars?: Var[] }).vars ?? []).flatMap((g) => g.opts.map((o) => o.label)))));
    for (const [, s] of manque) expect(reno.has(s)).toBe(true);
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
    const suspects = neuf.map(([k, s]) => catT("en", k, s)).filter((e) => motsFR.test(e.replace(/«[^»]*»|\([^)]*\)/g, "")));
    expect([...new Set(suspects)]).toEqual([]);
  });

  it("le français ne bouge pas : en FR, catT rend la chaîne d'origine (hors unités pct/m3)", () => {
    for (const [k, s] of neuf) if (k !== "unites") expect(catT("fr", k, s)).toBe(s);
  });

  it("la rénovation n'est pas touchée : ses deux libellés sans traduction (antérieurs à C6) restent tels quels", () => {
    const reno = chaines(CATALOG).filter(([k]) => k === "corps" || k === "phases" || k === "postes");
    expect(reno.filter(([k, s]) => !aTraductionEN(k, s)).map(([, s]) => s)).toEqual([
      "Isolation par l'extérieur (ITE) sous bardage",
      "Caisson à galandage (châssis + habillage)",
    ]);
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
