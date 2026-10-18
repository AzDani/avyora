import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG, CATALOG_NEUF, presetRapide, presetNeuf, type CustomLine } from "@/lib/estimateur";
import { catT, aTraductionEN } from "@/lib/estimateur/catalog-i18n";
import { FR_AFFICHAGE } from "@/lib/estimateur/catalog-fr";
import { contributionsDuPlan, type PlanPourCorrespondance } from "@/lib/estimateur/plan-correspondance";
import { injecterPlan } from "@/lib/estimateur/plan-injection";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimationResultat from "@/components/EstimationResultat";
import { ValidationPlan } from "@/components/ValidationPlan";

vi.mock("server-only", () => ({}));
const LOCALE = vi.hoisted(() => ({ v: "fr" as "fr" | "en" }));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => LOCALE.v }));

/*
 * Accents des libellés affichés (16/10/2026). Six noms de corps d'état sont des CLÉS sans accents
 * (« Electricite », « Cloisons / Platrerie »…) : clés du moteur, des paniers et des projets enregistrés,
 * on ne les renomme pas. L'écran français les affiche accentués via catT (catalog-fr.ts) ; l'anglais
 * ne bouge pas.
 */

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const CORPS = [...new Set([...CATALOG, ...CATALOG_NEUF].map((l) => l.c))];
const corpsFR = FR_AFFICHAGE.corps ?? {};

describe("Accents · noms de corps d'état affichés en français", () => {
  it("les clés du moteur ne changent pas : chaque entrée corrige une clé réelle du catalogue", () => {
    expect(Object.keys(corpsFR).filter((k) => !CORPS.includes(k))).toEqual([]);
    for (const k of ["Electricite", "Cloisons / Platrerie", "Carrelage / Revetements", "Menuiseries exterieures", "Menuiseries interieures", "Etudes / Conception"]) {
      expect(CORPS).toContain(k);
    }
  });

  it("une entrée ne fait qu'ajouter des accents (même texte une fois les accents retirés)", () => {
    for (const [cle, libelle] of Object.entries(corpsFR)) {
      expect(libelle).not.toBe(cle);
      expect(sansAccents(libelle)).toBe(sansAccents(cle));
    }
  });

  it("les six libellés attendus", () => {
    expect(catT("fr", "corps", "Electricite")).toBe("Électricité");
    expect(catT("fr", "corps", "Cloisons / Platrerie")).toBe("Cloisons / Plâtrerie");
    expect(catT("fr", "corps", "Carrelage / Revetements")).toBe("Carrelage / Revêtements");
    expect(catT("fr", "corps", "Menuiseries exterieures")).toBe("Menuiseries extérieures");
    expect(catT("fr", "corps", "Menuiseries interieures")).toBe("Menuiseries intérieures");
    expect(catT("fr", "corps", "Etudes / Conception")).toBe("Études / Conception");
    /* Les autres corps sont déjà accentués : rendus tels quels. */
    expect(catT("fr", "corps", "Maçonnerie")).toBe("Maçonnerie");
    expect(catT("fr", "corps", "Autres corps d'état")).toBe("Autres corps d'état");
  });

  it("aucun corps d'état (rénovation comme neuf) ne s'affiche en français avec un mot courant privé de ses accents", () => {
    const MOTS = /\b(Electricite|Platrerie|Revetements?|exterieures?|interieures?|Etudes?|Reseaux|Beton|Facade|Maconnerie|Demolition|Materiel|Controles|Reception|Equipements?)\b/i;
    expect(CORPS.map((c) => catT("fr", "corps", c)).filter((x) => MOTS.test(x))).toEqual([]);
  });

  it("l'anglais ne bouge pas : chaque corps garde sa traduction, et un libellé accentué n'est jamais une clé", () => {
    for (const c of CORPS) expect(aTraductionEN("corps", c)).toBe(true);
    expect(catT("en", "corps", "Electricite")).toBe("Electrical");
    expect(catT("en", "corps", "Cloisons / Platrerie")).toBe("Partitions / Plastering");
    expect(catT("en", "corps", "Carrelage / Revetements")).toBe("Tiling / Flooring");
    expect(catT("en", "corps", "Etudes / Conception")).toBe("Studies / Design");
    for (const libelle of Object.values(corpsFR)) expect(CORPS).not.toContain(libelle);
  });
});

/*
 * Garde-fou dans le code. Une clé de corps d'état affichée telle quelle (« Electricite ») est une
 * expression qui rend `lot`, `corps` ou le champ `c` d'une ligne du catalogue sans passer par
 * `catT(locale, "corps", …)` : en enfant JSX (`{x.lot}`, `{l.c}`, `{lot}`, `{x.lot + " "}`, `{x.corps ?? "—"}`),
 * dans un attribut lu à l'écran (`title=`, `aria-label=`, `alt=`, `placeholder=`, `label=`), dans un
 * gabarit (`${x.lot}`), ou passée en minuscules (`x.lot.toLowerCase()`). `key={l.lot}` est permis :
 * une clé React ne s'affiche pas. Le rendu réel des écrans principaux est vérifié plus bas : ce
 * garde-fou-ci ne remplace pas ces tests, il signale les écrans qu'ils ne rendent pas.
 */
const CHAMP = String.raw`(?:\w+(?:\[\w+\])?\.)?(?:lot|corps)|\w+(?:\[\w+\])?\.c`;
const BRUT = new RegExp(
  [
    String.raw`(?<![=\w])\{\s*(?:${CHAMP})\s*(?:\}|\+|\?\?|\|\|)`,
    String.raw`\b(?:title|aria-label|alt|placeholder|label)=\{\s*(?:${CHAMP})\s*\}`,
    String.raw`\$\{\s*(?:${CHAMP})\s*\}`,
    String.raw`\.(?:lot|corps|c)\.toLowerCase\(\)`,
  ].join("|"),
);

describe("Accents · aucun écran n'affiche une clé de corps d'état brute (garde-fou du code)", () => {
  it("le garde-fou reconnaît les formes courantes, et laisse passer les formes sûres", () => {
    for (const l of [
      "<span>{x.lot}</span>", "<td>{l.c}</td>", "{ICON[l.c]} {l.c}", "<td>{lot}</td>", "<td>{corps}</td>",
      "<b title={l.lot}>", "<i aria-label={x.corps} />", "{x.lot + \" \"}", "{x.corps ?? \"—\"}", "`lot ${l.lot}`",
      "`${row.c} · ${n}`", "x.lot.toLowerCase()",
    ]) expect(BRUT.test(l), l).toBe(true);
    for (const l of [
      "<tr key={l.lot}>", "{catT(locale, \"corps\", x.lot)}", "{ICON[l.c] || \"\"}", "if (l.c === lot) return", "{x.lotId}",
      "<Fragment key={lot.corps}>",
    ]) expect(BRUT.test(l), l).toBe(false);
  });

  /* Textes qui ne sont PAS des clés du catalogue, ou qui ne sont pas lus par un visiteur. */
  const PERMIS = new Set([
    "app/methodologie/page.tsx:{f.lot}", // texte écrit à la main, déjà accentué (« Études, démolition, location… »)
    "components/auth/AuthShell.tsx:{p.corps}", // libellé du dictionnaire (« corps d'état »), pas une clé
    "lib/email.ts:${opts.corps}", // le corps (texte) d'un e-mail
    "lib/estimateur/identite.ts:${l.lot}", // message de diagnostic des tests (libellés orphelins)
    "lib/estimateur/catalogue-neuf.ts:${lot}", // ANOMALIES_NEUF : diagnostic de chargement du catalogue
    "lib/estimateur/catalogue-neuf.ts:${r.c}", // idem
  ]);
  const RACINE = fileURLToPath(new URL("..", import.meta.url));
  const fichiers = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(n) ? [p] : [];
    });

  it("app/, components/ et lib/", () => {
    const fautes: string[] = [];
    const vus = new Set<string>();
    for (const f of ["app", "components", "lib"].flatMap((d) => fichiers(path.join(RACINE, d)))) {
      const rel = path.relative(RACINE, f).split(path.sep).join("/");
      readFileSync(f, "utf8").split("\n").forEach((ligne, i) => {
        for (const m of ligne.matchAll(new RegExp(BRUT.source, "g"))) {
          const id = `${rel}:${m[0].replace(/^[\s\S]*?(\{[\w.[\]]+\}|\$\{[\w.[\]]+\})[\s\S]*$/, "$1")}`;
          if (PERMIS.has(id)) vus.add(id);
          else fautes.push(`${rel}:${i + 1} ${m[0]}`);
        }
      });
    }
    expect(fautes).toEqual([]);
    /* Une exception qui ne sert plus doit sortir de la liste. */
    expect([...PERMIS].filter((p) => !vus.has(p))).toEqual([]);
  });
});

/*
 * Rendu réel, en français, des écrans qui affichent les corps d'état : page projet (camembert, carte
 * « poste le plus lourd », liste, suivi), rapport PDF (camembert, tableau, lignes perso) et validation
 * du plan. Aucune des six clés sans accents ne doit apparaître dans le texte lu par le visiteur
 * (texte et attributs title / aria-label / alt / placeholder).
 */
const CLES_SANS_ACCENTS = Object.keys(corpsFR);
const LIBELLES = Object.values(corpsFR);
const lu = (html: string) => {
  const attrs = [...html.matchAll(/\b(?:title|aria-label|alt|placeholder)="([^"]*)"/g)].map((m) => m[1]).join(" ");
  return (html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ") + " " + attrs)
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/[\s\u00a0\u202f]+/g, " ");
};
const rendre = (el: ReactElement, locale: "fr" | "en" = "fr") => renderToStaticMarkup(createElement(LangProvider, { locale, children: el }));
const clesVisibles = (t: string) => CLES_SANS_ACCENTS.filter((k) => t.includes(k));

/* Une ligne perso dans chacun des six corps : elles apparaissent aussi au camembert, au tableau et au PDF. */
const PERSO: CustomLine[] = CLES_SANS_ACCENTS.map((lot, i) => ({ id: `a${i}`, lot, nom: `Ligne ${i}`, prix: 100 + i, unite: "u", qte: 1, tva: 10, on: true }));
const reno = presetRapide({ type: "Maison", surface: 94, codePostal: "33000", ampleur: "complete", finition: "standard", qui: "pros" });
const neuf = presetNeuf({ surface: 94, niveaux: "pp", codePostal: "33000", finition: "standard", qui: "pros" });
const reponses = (p: { ctx: unknown; sel: unknown }, custom: CustomLine[]) => ({ v: "estimateur", mode: "detaille", ctx: p.ctx, sel: p.sel, codePostal: "33000", qui: "pros", custom });

describe("Accents · rendu français des écrans qui affichent les corps d'état", () => {
  afterEach(() => { LOCALE.v = "fr"; });

  for (const [nom, p, custom] of [["rénovation", reno, PERSO], ["construction neuve", neuf, PERSO.map((x) => ({ ...x, tva: 20 }))]] as const) {
    it(`page projet (${nom}) : aucune clé sans accents, les libellés accentués sont là`, () => {
      const t = lu(rendre(createElement(EstimationResultat, { reponses: reponses(p, custom) as never, projectId: "p1" })));
      expect(clesVisibles(t)).toEqual([]);
      expect(LIBELLES.filter((l) => t.includes(l)).length).toBeGreaterThan(0);
      expect(t).toContain("Électricité");
    });

    it(`rapport PDF (${nom}) : aucune clé sans accents, en français`, async () => {
      const { RapportPDF } = await import("@/components/RapportPDF");
      const el = await RapportPDF({ reponses: reponses(p, custom) as never, nom: "Projet", refCode: "AVY-TEST" });
      const t = lu(renderToStaticMarkup(el!));
      expect(clesVisibles(t)).toEqual([]);
      expect(t).toContain("Électricité");
      /* Les lignes perso portent leur lot accentué. */
      expect(t).toMatch(/× 100 € · Études \/ Conception/);
    });
  }

  it("rapport PDF en anglais : le lot d'une ligne perso est traduit, comme le reste du rapport (N14)", async () => {
    LOCALE.v = "en";
    const { RapportPDF } = await import("@/components/RapportPDF");
    const el = await RapportPDF({ reponses: reponses(reno, PERSO) as never, nom: "Project", refCode: "AVY-TEST" });
    const t = lu(renderToStaticMarkup(el!));
    expect(t).toMatch(/× 100 € · Studies \/ Design/);
    expect(t).not.toContain("Etudes / Conception");
    expect(t).not.toContain("Électricité");
  });

  it("validation du plan : aucune clé sans accents", () => {
    const plan = JSON.parse(readFileSync(new URL("./fixtures/plan-contrat.json", import.meta.url), "utf8")) as PlanPourCorrespondance;
    const rapport = injecterPlan({}, contributionsDuPlan(plan).contributions);
    /* Le plan de référence touche bien des corps dont la clé est sans accents : le test a de quoi mordre. */
    expect(rapport.lignes.some((l) => CLES_SANS_ACCENTS.includes(l.lot))).toBe(true);
    const t = lu(rendre(createElement(ValidationPlan, { rapport })));
    expect(clesVisibles(t)).toEqual([]);
    expect(LIBELLES.filter((l) => t.includes(l)).length).toBeGreaterThan(0);
  });
});
