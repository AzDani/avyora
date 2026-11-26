/**
 * Masquer un artisan du réseau (26/11/2026, migration 0013) : il reste validé et garde son espace, mais n'est plus
 * proposé aux clients ni affiché aux membres Pro. Chaque requête qui PROPOSE un artisan filtre `masque_le`.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COLONNES_ARTISAN, lireArtisan } from "@/lib/reseau/artisan";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("masquer un artisan du réseau", () => {
  it("la migration ajoute la colonne, et le retour la retire", () => {
    expect(lire("supabase/migrations/0013_reseau_masquer.sql")).toMatch(/add column if not exists masque_le timestamptz/);
    expect(lire("supabase/migrations/0013_reseau_masquer_retour.sql")).toMatch(/drop column if exists masque_le/);
  });
  it("la lecture d'un artisan porte la date de masquage", () => {
    expect(COLONNES_ARTISAN).toContain("masque_le");
    expect(lireArtisan({ id: "a", masque_le: "2026-11-26T20:00:00Z" }).masqueLe).toBe("2026-11-26T20:00:00Z");
    expect(lireArtisan({ id: "a" }).masqueLe).toBeNull();
  });
  it("chaque proposition d'artisans (liste, fiche Pro, création et ajout à une demande) écarte les masqués", () => {
    const data = lire("lib/data/reseau.ts");
    for (const fn of ["export async function artisansDisponibles", "export async function artisansPublics", "export async function ficheArtisan"]) {
      const i = data.indexOf(fn);
      expect(data.slice(i, data.indexOf("\n}\n", i)), fn).toContain('.is("masque_le", null)');
    }
    const devis = lire("lib/actions/devis.ts");
    expect(devis.match(/\.eq\("statut", "valide"\)\n\s*\.is\("masque_le", null\)/g)).toHaveLength(2);
  });
  it("l'action admin ne touche qu'un artisan validé ; l'admin et l'espace l'affichent", () => {
    const act = lire("lib/actions/admin.ts");
    const bloc = act.slice(act.indexOf("export async function masquerArtisan"));
    expect(bloc).toMatch(/const admin = await getAdmin\(\);/);
    expect(bloc).toMatch(/\.eq\("statut", "valide"\)/);
    expect(lire("app/admin/artisans/[id]/page.tsx")).toContain("<BoutonMasquer id={a.id} masque={!!a.masqueLe} />");
    const espace = lire("app/espace-artisan/layout.tsx");
    expect(espace).toContain("Ta fiche est masquée du réseau.");
    expect(espace).toContain("{!a.masqueLe && <Link href={`/avis-artisans/${a.id}`}");
    // L'accueil et les demandes ne disent plus « les clients peuvent te choisir » à un artisan masqué.
    expect(lire("app/espace-artisan/page.tsx")).toContain("Ta fiche est masquée pour le moment : les clients ne peuvent pas te choisir.");
    expect(lire("app/espace-artisan/demandes/page.tsx")).toContain("masque={!!artisan.masqueLe}");
  });
});
