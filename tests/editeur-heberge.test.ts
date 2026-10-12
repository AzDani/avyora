/**
 * L'éditeur de plan hébergé sur /plan (chantier C4) : la transformation de `maquettes/plan-editor.html`
 * faite au build, la route (404 interrupteur éteint), et les fichiers servis depuis public/vendor et
 * public/fonts (empreintes sha384 figées : un fichier changé doit l'être exprès).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { Script } from "node:vm";
import { dict } from "@/lib/i18n/dictionaries";

vi.mock("server-only", () => ({}));

const RACINE = path.resolve(__dirname, "..");
const SOURCE = readFileSync(path.join(RACINE, "maquettes/plan-editor.html"), "utf8");

async function module() {
  return await import("@/lib/editeur/heberger");
}

/* Les fichiers servis, avec l'empreinte de l'archive npm officielle (three@0.147.0, geist@1.7.2). Les deux
   fichiers de Three.js sont aussi identiques, octet pour octet, à ceux que l'artefact charge sur jsDelivr. */
const EMPREINTES: Record<string, string> = {
  "public/vendor/three@0.147.0/build/three.min.js": "sha384-vV17nr/rMaJqmeZkFUzXLpHdQ+ME5QHKdydaqqN+3Ga39RJlNrTatJxHwGV4ml2C",
  "public/vendor/three@0.147.0/examples/js/controls/OrbitControls.js": "sha384-I0DMsfimAPIqWT8lF+oA997gRgdUi3jhidoTq3fN0zmn35smXZukD01FLnsPRU9i",
  "public/fonts/geist/Geist-Variable.woff2": "sha384-A5ySEfg9NyEbLKjQhPQfEHVPKSFpeOQZ+rQiDggpNR4NUm2QTPnqukMat4Sh5JvE",
  "public/fonts/geist/GeistMono-Variable.woff2": "sha384-44tW/M5QW+6GJCPDzYh2AGnj1NUglXiihbVcH+XYgX9HJ4Ngc0bfCNkvt8BI7rqN",
};

const scripts = (html: string) =>
  [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], corps: m[2] }));

describe("Éditeur hébergé · transformation au build", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("chaque motif est trouvé le nombre de fois attendu dans la source", async () => {
    const { motifs, compter } = await module();
    const M = motifs();
    expect(M.map((m) => [m.quoi, m.nombre])).toEqual([
      ["@import Google Fonts", 1],
      ["Three.js (jsDelivr)", 1],
      ["adresses absolues du site", 3],
      ["meta viewport", 1],
      ["script principal", 1],
    ]);
    for (const m of M) expect(compter(SOURCE, m.motif), m.quoi).toBe(m.nombre);
  });

  it("un motif absent, en trop ou en moins fait échouer (le build s'arrête)", async () => {
    const { transformerEditeur } = await module();
    expect(() => transformerEditeur(SOURCE.replace("https://cdn.jsdelivr.net/npm/three@0.147.0/", "x"))).toThrow(/Three\.js/);
    expect(() => transformerEditeur(SOURCE + "https://getavyora.fr/")).toThrow(/4 fois au lieu de 3/);
    expect(() => transformerEditeur(SOURCE.replace("\n<script>\n", "\n<script >\n"))).toThrow(/script principal/);
    expect(() => transformerEditeur(SOURCE.replace(/@import url\('https:\/\/fonts[^;]*;/, ""))).toThrow(/Google Fonts/);
  });

  it("la sortie ne contient plus aucune origine externe, et la source n'est pas modifiée", async () => {
    const { editeurHeberge } = await module();
    const out = await editeurHeberge();
    expect(out).not.toContain("fonts.googleapis");
    expect(out).not.toContain("fonts.gstatic");
    expect(out).not.toContain("cdn.jsdelivr");
    expect(out).not.toContain("https://getavyora.fr/");
    expect(out).toContain("const V3_THREE='/vendor/three@0.147.0/';");
    expect(out).toContain("const TARIFS_URL='/tarifs?source=editeur-plan';");
    expect(out).toContain("const CONSTRUCTION_URL='/estimation-construction-maison?source=editeur-plan';");
    expect(out).toContain("url('/fonts/geist/Geist-Variable.woff2')");
    expect(out).toContain("url('/fonts/geist/GeistMono-Variable.woff2')");
    expect(out).toMatch(/<meta name="robots" content="noindex">\n<meta name="viewport"/);
    expect(readFileSync(path.join(RACINE, "maquettes/plan-editor.html"), "utf8")).toBe(SOURCE);
  });

  it("Pro à false AVANT le script différé, un seul script différé, qui porte tout l'éditeur", async () => {
    const { editeurHeberge } = await module();
    const out = await editeurHeberge();
    const iPro = out.indexOf("window.AVYORA_PRO=false;");
    const iDiff = out.indexOf('<script type="text/plain" id="avyora-editeur">');
    expect(iPro).toBeGreaterThan(0);
    expect(iDiff).toBeGreaterThan(iPro);
    expect(out.match(/type="text\/plain"/g)).toHaveLength(1);
    const S = scripts(out);
    expect(S.map((s) => s.attrs.trim())).toEqual(["", "", 'type="text/plain" id="avyora-editeur"']);
    /* le script différé est le script de la source, au caractère près */
    const src = scripts(SOURCE);
    expect(src).toHaveLength(1);
    const attendu = src[0].corps.replace("https://cdn.jsdelivr.net/npm/three@0.147.0/", "/vendor/three@0.147.0/").split("https://getavyora.fr/").join("/");
    expect(S[2].corps).toBe(attendu);
    /* le voile précède les scripts : il couvre l'éditeur dès l'affichage */
    expect(out.indexOf('id="avyora-voile"')).toBeLessThan(iPro);
  });

  it("config et amorçage : JS valide, sans « </script », sans double barre oblique en commentaire", async () => {
    const { editeurHeberge } = await module();
    const out = await editeurHeberge();
    const [config, amorce] = scripts(out);
    for (const s of [config, amorce]) {
      expect(() => new Script(s.corps)).not.toThrow();
      expect(s.corps.toLowerCase()).not.toContain("</script");
      expect(s.corps).not.toContain("<!--");
      for (const l of s.corps.split("\n")) expect(l.replace(/'[^']*'|"[^"]*"/g, ""), l).not.toMatch(/(^|[^:])\/\//);
    }
    /* aucune donnée utilisateur : que des constantes */
    expect(config.corps).not.toMatch(/@|user|email|session/i);
  });

  it("le prix injecté vient du dictionnaire (aucun prix écrit dans le code)", async () => {
    const { editeurHeberge, prixProEditeur } = await module();
    const out = await editeurHeberge();
    const prix = dict("fr").tarifs.plans.mensuel.prix;
    expect(prixProEditeur()).toContain(prix);
    const m = out.match(/window\.AVYORA_PRIX_PRO=("[^"]*");/);
    expect(m).not.toBeNull();
    expect(JSON.parse(m![1])).toBe(prixProEditeur());
    const src = readFileSync(path.join(RACINE, "lib/editeur/heberger.ts"), "utf8");
    expect(src).not.toMatch(/\d+,\d{2}\s*€|€\s*\d/);
  });

  it("le pont de mesure n'émet que la liste fermée, avec des valeurs simples", async () => {
    const { editeurHeberge, EVENEMENTS_EDITEUR } = await module();
    const out = await editeurHeberge();
    const [config] = scripts(out);
    const vaq: unknown[][] = [];
    const window: Record<string, unknown> = { vaq };
    new Script(config.corps).runInNewContext({ window });
    const track = window.AVYORA_TRACK as (n: string, d?: unknown) => void;
    expect(window.AVYORA_PRO).toBe(false);
    track("inconnu", { a: 1 });
    expect(vaq).toHaveLength(0);
    track("vue_3d", { pro: false, n: 2, s: "x", objet: { id: "secret" }, liste: [1], nul: null });
    expect(vaq).toEqual([["event", { name: "vue_3d", data: { pro: false, n: 2, s: "x", nul: null } }]]);
    expect([...EVENEMENTS_EDITEUR].sort()).toEqual([
      "clic_chiffrer_construction", "clic_passer_pro", "estimer_ouvert", "plan_ouvert", "premiere_decision",
      "premiere_piece", "visite_passee", "visite_terminee", "vue_3d",
    ]);
    /* chaque événement émis par la source est dans la liste */
    const emis = new Set([...SOURCE.matchAll(/suivre\('([a-z_0-9]+)'/g)].map((x) => x[1]));
    ["visite_terminee", "visite_passee", "vue_3d"].forEach((n) => expect(SOURCE).toContain(`'${n}'`));
    for (const n of emis) expect(EVENEMENTS_EDITEUR as readonly string[]).toContain(n);
  });

  it("Vercel Analytics : sur un déploiement Vercel seulement", async () => {
    vi.resetModules();
    vi.stubEnv("VERCEL", "");
    let out = await (await module()).editeurHeberge();
    expect(out).not.toContain("/_vercel/insights/script.js");
    vi.resetModules();
    vi.stubEnv("VERCEL", "1");
    out = await (await module()).editeurHeberge();
    expect(out).toContain('<script defer src="/_vercel/insights/script.js"></script>\n<script type="text/plain" id="avyora-editeur">');
  });
});

describe("Éditeur hébergé · la route /plan", () => {
  afterEach(() => vi.doUnmock("@/lib/features"));

  for (const plans of [false, true]) {
    it(`interrupteur ${plans ? "allumé : 200, HTML de l'éditeur" : "éteint : 404"}`, async () => {
      vi.resetModules();
      vi.doMock("@/lib/features", async (orig) => {
        const m = await orig<typeof import("@/lib/features")>();
        return { ...m, FEATURES: { ...m.FEATURES, plans } };
      });
      const route = await import("@/app/plan/route");
      expect(route.dynamic).toBe("force-static");
      const r = await route.GET();
      if (!plans) {
        expect(r.status).toBe(404);
        expect(await r.text()).not.toContain("AVYORA");
        return;
      }
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(r.headers.get("x-robots-tag")).toBe("noindex");
      expect(await r.text()).toContain('id="avyora-editeur"');
    });
  }
});

describe("Éditeur hébergé · fichiers servis (public/vendor, public/fonts)", () => {
  it("empreintes sha384 inchangées", () => {
    for (const [f, h] of Object.entries(EMPREINTES)) {
      const b = readFileSync(path.join(RACINE, f));
      expect(`sha384-${createHash("sha384").update(b).digest("base64")}`, f).toBe(h);
    }
  });

  it("licences jointes (MIT pour Three.js, OFL pour Geist)", () => {
    expect(readFileSync(path.join(RACINE, "public/vendor/three@0.147.0/LICENSE"), "utf8")).toMatch(/The MIT License/);
    expect(readFileSync(path.join(RACINE, "public/fonts/geist/LICENSE.txt"), "utf8")).toMatch(/SIL Open Font License/);
  });

  it("l'éditeur demande exactement ces fichiers (V3_FICHIERS et @font-face)", async () => {
    const fic = SOURCE.match(/const V3_FICHIERS=\[(.*?)\];/)![1];
    const demandes = [...fic.matchAll(/\['([^']+)'/g)].map((m) => m[1]);
    expect(demandes).toEqual(["build/three.min.js", "examples/js/controls/OrbitControls.js"]);
    for (const d of demandes) expect(existsSync(path.join(RACINE, "public/vendor/three@0.147.0", d)), d).toBe(true);
    const { POLICES } = await module();
    for (const p of Object.values(POLICES)) expect(existsSync(path.join(RACINE, "public", p)), p).toBe(true);
  });
});
