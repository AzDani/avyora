import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembler } from "../maquettes/bureaux/assembler.mjs";
import { COQUILLE } from "@/lib/bureaux/coquille";

/**
 * Les bureaux virtuels : les fichiers servis par le site sont écrits par maquettes/bureaux/assembler.mjs depuis les
 * modules de la scène. Ces tests gardent trois choses : qu'ils sont à jour, que la page ne contient aucune donnée,
 * et que la page comme ses données sont réservées à l'admin.
 */
const racine = join(__dirname, "..");
const lire = (f: string) => readFileSync(join(racine, f), "utf8");

describe("bureaux virtuels : la scène servie par le site", () => {
  const r = assembler() as { scene: string; css: string; module: string; artefact: string; fichiers: string };

  it("les fichiers versionnés sont à jour avec les modules (sinon : node maquettes/bureaux/assembler.mjs)", () => {
    expect(lire("lib/bureaux/scene-fichiers.ts")).toBe(r.fichiers);
    expect(lire("lib/bureaux/coquille.ts")).toBe(r.module);
  });

  it("la scène n'est plus téléchargeable par tout le monde : hors de public/, servie par deux routes gardées (27/11/2026)", () => {
    expect(existsSync(join(racine, "public/bureaux/scene.js"))).toBe(false);
    expect(existsSync(join(racine, "public/bureaux/scene.css"))).toBe(false);
    expect(COQUILLE).toMatch(/<script src="\/admin\/bureaux\/scene\.js\?v=[0-9a-f]{10}"><\/script>/);
    expect(COQUILLE).toMatch(/href="\/admin\/bureaux\/scene\.css\?v=[0-9a-f]{10}"/);
    for (const f of ["app/admin/bureaux/scene.js/route.ts", "app/admin/bureaux/scene.css/route.ts"]) {
      const route = lire(f);
      expect(route).toMatch(/if \(!\(await getAdmin\(\)\)\) return new Response\("Introuvable", \{ status: 404/);
      expect(route).toContain("private, max-age");
    }
  });

  it("la page du site ne charge rien d'extérieur et ne contient aucune donnée", () => {
    expect(COQUILLE).not.toMatch(/https?:\/\//);
    expect(COQUILLE).toContain('data-source="/api/admin/bureaux"');
    expect(COQUILLE).toContain('data-paquets="/bureaux/paquets/"');
    for (const f of ["build/three.min.js", "examples/js/loaders/GLTFLoader.js", "examples/js/loaders/RGBELoader.js", "examples/js/utils/SkeletonUtils.js"]) {
      expect(COQUILLE).toContain(`/vendor/three@0.128.0/${f}`);
      expect(() => lire(`public/vendor/three@0.128.0/${f}`)).not.toThrow();
    }
    expect(r.css).not.toMatch(/https?:\/\//);
    // les noms d'exemple de la maquette vivent dans le script (données d'exemple), jamais dans la page
    expect(COQUILLE).not.toMatch(/Julie|Durand|Karim/);
  });

  it("sur le site, ce qui vient des données est échappé et les exemples ne sont jamais montrés comme du vrai", () => {
    expect(r.scene).toContain("const net = (t) =>");
    expect(r.scene).toContain("RDVS.length = 0;");
    // si la lecture échoue à l'ouverture, les bureaux ne s'ouvrent pas (l'erreur remonte dans demarrer)
    expect(r.scene).toMatch(/await Promise\.all\(\[chargerModeles\([\s\S]{0,200}lireDonnees\(\)\]\)/);
  });

  it("les données du site n'écrasent jamais la liste des personnages d'une pièce (piece.gens), relue chaque minute", () => {
    // 27/11/2026 : le nombre de personnes à montrer était rangé dans p.gens, que les déplacements utilisent pour la LISTE des
    // personnes de la pièce : à la première relecture des données, « q.gens is not iterable » arrêtait la 3D.
    expect(r.scene).not.toMatch(/\bp\.gens\s*=(?!=)/);
    expect(r.scene).toContain("p.foule = ");
  });

  it("la maquette autonome garde ses données d'exemple et ses bibliothèques par CDN", () => {
    expect(r.artefact).toContain("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
    expect(r.artefact).not.toContain("data-source=");
  });

  it("la page et ses données sont gardées par le contrôle admin", () => {
    expect(lire("app/admin/bureaux/route.ts")).toMatch(/if \(!\(await getAdmin\(\)\)\) return NextResponse\.redirect/);
    expect(lire("app/api/admin/bureaux/route.ts")).toMatch(/const refus = await gardeAdmin\(\);\s+if \(refus\) return refus;/);
  });
});
