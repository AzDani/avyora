/**
 * « Je le fais » : les textes disent ce que l'estimateur fait (décisions D2 et D4 a de Dani, 13/10/2026).
 *
 * - D4 (a) : en rénovation, « Je fais un max moi-même » met l'électricité, le mur porteur et la
 *   charpente en « Je le fais » (`presetRapide`). Les textes qui annonçaient « les pros seulement sur
 *   l'obligatoire (élec, gaz…) » ou des « lots à ne pas toucher » sont corrigés ; aucun prix ne bouge.
 * - D2 : la pompe à chaleur n'est plus « réservée aux pros » en neuf ; elle reste aux pros par défaut
 *   en « le maximum » (le total de la maison A ne bouge pas).
 *
 * Les pages sont lues telles que le compilateur de Next (SWC) les produit : un texte JSX sur
 * plusieurs lignes qui contient une entité (`&apos;`) y perd l'espace qui le suit un élément
 * (voir `tests/aleas-defaut.test.ts`). Chaque `<strong>` suivi de texte porte donc un `{" "}`.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { presetRapide } from "@/lib/estimateur";
import { dict } from "@/lib/i18n/dictionaries";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictDetail } from "@/lib/i18n/detail";

async function texteCompile(fichier: string): Promise<string> {
  const swc = await import("next/dist/build/swc/index.js");
  await swc.loadBindings();
  const { code } = await swc.transform(fs.readFileSync(fichier, "utf8"), {
    jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2022" },
  });
  return (code as string)
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

describe("D4 (a) · rénovation : « Je fais un max moi-même » dit ce qu'il fait", () => {
  it("le mode met bien l'électricité, le mur porteur et la charpente en « Je le fais »", () => {
    const { sel } = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "lourde", finition: "standard", qui: "max" });
    for (const k of ["Electricite|Rénovation électrique complète", "Maçonnerie|Ouvrir un mur porteur — petite (porte/fenêtre)",
      "Charpente, couverture & structure bois|Charpente traditionnelle (hors couverture)"]) expect(sel[k]?.self, k).toBe(true);
  });

  it("le texte du rapide ne promet plus « les pros seulement sur l'obligatoire »", () => {
    const fr = dict("fr").rapide.quis.max.desc, en = dict("en").rapide.quis.max.desc;
    expect(fr).toBe("Tout ce qui se fait soi-même, électricité et structure comprises (hors garantie décennale). Tu ajusteras chaque poste juste après.");
    expect(en).toBe("Everything you can do yourself, electrical and structural work included (not covered by the 10-year warranty). You'll adjust each item right after.");
    expect(fr).not.toMatch(/obligatoire|élec, gaz/);
    expect(en).not.toMatch(/mandatory|electrical, gas/);
  });

  it("le détaillé rénovation : « Je le fais » possible sur la structure, hors décennale, étude conseillée", () => {
    // Depuis N6, le texte vit dans `dictDetail` (gras : `**…**`) ; l'écran l'affiche avec `gras`.
    const intro = dictDetail("fr").liste.intro;
    expect(intro).toContain("Sur chaque travail faisable soi-même, électricité, mur porteur et charpente compris, choisis **« Fait faire »**");
    expect(intro).toContain("sort de la garantie décennale ; pour un mur porteur ou une charpente, une étude est conseillée.");
    expect(dictDetail("en").liste.intro).toContain("not covered by the 10-year structural warranty; for a load-bearing wall or roof framing, an engineering study is recommended.");
    expect(fs.readFileSync("components/Estimateur.tsx", "utf8")).toContain("{gras(dl.liste.intro)}");
  });

  it("le guide « faire soi-même ou artisan » : possible, hors décennale, étude conseillée pour la structure", async () => {
    const src = fs.readFileSync("app/guides/[slug]/page.tsx", "utf8");
    expect(src).not.toContain("Les lots à ne pas toucher");
    expect(src).toContain("<h2>Les lots qui engagent plus que votre budget</h2>");
    expect(src).toContain("L'électricité, le gaz, la structure porteuse et la charpente restent possibles");
    const c = await texteCompile("app/guides/[slug]/page.tsx");
    for (const debut of ["engagent votre sécurité", "(mur porteur, charpente, toiture)", "se pose soi-même ; dès qu'il"])
      expect(c, debut).toMatch(new RegExp(`\\}\\),\\s*" ",\\s*"${debut.replace(/[()]/g, "\\$&")}`));
    expect(c).toContain("une étude est conseillée avant d'ouvrir ou de modifier quoi que ce soit");
    expect(c).toContain("la ligne rappelle qu'il sort de la garantie décennale.");
  });

  it("la méthodologie décrit « Je le fais », la décennale, le fluide frigorigène et les postes « Pro obligatoire »", async () => {
    const c = await texteCompile("app/methodologie/page.tsx");
    expect(c).toContain("Faire soi-même : ce que l'estimation propose");
    for (const [titre, suite] of [["Hors garantie décennale.", "Un poste de maçonnerie"], ["Fluide frigorigène.", "Une pompe à chaleur"], ["Pro obligatoire.", "Quelques postes"]])
      expect(c, titre).toMatch(new RegExp(`children: "${titre.replace(".", "\\.")}"\\s*\\}\\),\\s*" ",\\s*"${suite}`));
    expect(c).toContain("« Je fais le maximum » laisse par défaut aux pros la structure");
  });
});

describe("D2 · construction neuve : la pompe à chaleur n'est plus « réservée aux pros »", () => {
  it("détaillé et rapide, en français et en anglais", () => {
    const fr = dictNeuf("fr"), en = dictNeuf("en");
    expect(fr.detail.intro).toContain("maçonnerie, charpente et pompe à chaleur comprises");
    expect(fr.detail.intro).toContain("(branchements au réseau, études, contrôles) l'indiquent");
    expect(en.detail.intro).toContain("masonry, framing and heat pump included");
    expect(en.detail.intro).toContain("(utility connections, studies, inspections) say so");
    expect(fr.saisie.quis.max.desc).toContain("tu peux les prendre toi-même poste par poste, sauf les raccordements faits par le gestionnaire du réseau");
    expect(en.saisie.quis.max.desc).toContain("you can take them on yourself item by item, except the connections made by the utility company");
    expect(fr.detail.nouveauxAide.max).toContain("la pompe à chaleur, la climatisation et la borne de recharge, à prendre toi-même ligne par ligne");
    expect(en.detail.nouveauxAide.max).toContain("heat pump, air conditioning and EV charger, which you can take on yourself line by line");
  });
});
