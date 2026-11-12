/**
 * Revue de l'éditeur de plan (lot « editeur-plan ») : les garde-fous des corrections qui ne se voient
 * qu'au navigateur. Le parcours réel est rejoué par la batterie des maquettes (review, site, ux…) ; ici,
 * on fige la forme de la source et la configuration, sans navigateur.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SOURCE = readFileSync(path.join(__dirname, "..", "maquettes", "plan-editor.html"), "utf8");

describe("éditeur de plan · revue", () => {
  it("le filigrane de l'aperçu d'export est caché aux lecteurs d'écran (80 « AVYORA » sinon lus)", () => {
    expect(SOURCE).toContain(`'<div class="wm" aria-hidden="true">'+WM+'</div>'`);
    expect(SOURCE).not.toContain(`'<div class="wm">'+WM`);
  });

  it("« Garde ce plan dans ton compte » : dans la zone du plan, en bas à droite, cachée en 3D", () => {
    expect(SOURCE).not.toContain("position:fixed;left:16px;bottom:56px");
    expect(SOURCE).toMatch(/position:absolute;right:var\(--sp-3\);bottom:calc\(var\(--etat-h\) \+ var\(--sp-3\)\)/);
    expect(SOURCE).toContain("body.v3on #siteInvite{display:none}");
    expect(SOURCE).toMatch(/function siteFermerInvite\(\)\{[^\n]*document\.body\.classList\.remove\('siteinvite'\);\}/);
  });

  it("un plan neuf efface le message du plan d'avant", () => {
    const nouveau = SOURCE.slice(SOURCE.indexOf("function newPlan("), SOURCE.indexOf("function newPlan(") + 1500);
    expect(nouveau).toContain("effacerToast();");
    expect(SOURCE).toMatch(/function effacerToast\(\)\{[^\n]*clearTimeout\(toastT\);t\.classList\.remove\('show','act'\)/);
  });

  it("téléphone : un plan type à regarder sur la carte du plan vide, et la 3D vide ne propose pas de tracer", () => {
    expect(SOURCE).toMatch(/<div class="eact ephone">[^\n]*onclick="openTemplates\(\)">Voir un plan type<\/button>/);
    expect(SOURCE).toMatch(/vide:isMobile\(\)\?`[^`]*Voir un plan type[^`]*`/);
    expect(SOURCE).toMatch(/toast\(T\.name\+' chargé'\+\(isMobile\(\)\?' : touche une pièce pour voir ses détails'/);
  });

  it("« Menuiserie » n'est plus un intertitre orphelin", () => {
    expect(SOURCE).toContain("${(menu=>menu.trim()?`<div class=\"ph mt\">Menuiserie");
  });

  it("/vendor (versionné) en cache immuable, /fonts une semaine ; l'en-tête de sécurité reste en tête", async () => {
    vi.resetModules();
    const { default: config } = await import("../next.config");
    const entrees = await config.headers!();
    expect(entrees[0].source).toBe("/:path*");
    const cc = (src: string) => entrees.find((e) => e.source === src)?.headers.find((h) => h.key === "Cache-Control")?.value;
    expect(cc("/vendor/:path*")).toBe("public, max-age=31536000, immutable");
    expect(cc("/fonts/:path*")).toMatch(/^public, max-age=604800\b/);
  });
});
