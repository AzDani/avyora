/**
 * Retrouver ses demandes de devis (26/11/2026) : avant, seule une ligne grise de « Mes projets » y menait. Le client a
 * maintenant un lien « Mes devis » dans l'en-tête (et le menu mobile) avec ce qui l'attend, une carte sur « Mes projets »,
 * et « Voir ma demande » sur la fiche d'un projet déjà envoyé. L'en-tête de l'ordinateur range Mon compte, Avis
 * artisans, Admin et Déconnexion dans le menu du compte (il débordait de 73 px pour un artisan).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resumeDevisClient, SONDAGE_JOURS, AVIS_FENETRE_JOURS, type LigneSuiviClient } from "@/lib/reseau/demande";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const MAINTENANT = Date.parse("2026-11-26T12:00:00Z");
const ilYa = (j: number) => new Date(MAINTENANT - j * 86_400_000).toISOString();
const l = (o: Partial<LigneSuiviClient>): LigneSuiviClient => ({ demandeId: "d1", statut: "acceptee", reponduLe: ilYa(1), avisStatut: null, avisNote: null, ...o });

describe("ce qui attend le client dans ses demandes de devis", () => {
  it("avis à donner : accepté depuis 14 jours (comme l'e-mail) et 90 au plus, sans avis", () => {
    const d = [{ id: "d1", projetId: null }];
    expect(resumeDevisClient(d, [l({ reponduLe: ilYa(3) })], MAINTENANT).avisADonner).toBe(0);
    expect(resumeDevisClient(d, [l({ reponduLe: ilYa(SONDAGE_JOURS) })], MAINTENANT).avisADonner).toBe(1);
    expect(resumeDevisClient(d, [l({ reponduLe: ilYa(AVIS_FENETRE_JOURS + 1) })], MAINTENANT).avisADonner).toBe(0);
    expect(resumeDevisClient(d, [l({ reponduLe: ilYa(20), avisStatut: "en_attente", avisNote: 4 })], MAINTENANT).avisADonner).toBe(0);
    expect(resumeDevisClient(d, [l({ reponduLe: ilYa(20), avisStatut: "retire" })], MAINTENANT).avisADonner).toBe(0);
    expect(resumeDevisClient(d, [l({ statut: "envoyee", reponduLe: null })], MAINTENANT).avisADonner).toBe(0);
  });
  it("un avis refusé est à corriger ; la pastille compte avis à donner + à corriger, pas les remplacements", () => {
    const d = [{ id: "d1", projetId: null }, { id: "d2", projetId: null }];
    const r = resumeDevisClient(d, [
      l({ avisStatut: "refuse", avisNote: 2 }),
      l({ reponduLe: ilYa(20) }),
      l({ demandeId: "d2", statut: "refusee" }),
    ], MAINTENANT);
    expect(r).toMatchObject({ demandes: 2, acceptes: 2, avisARevoir: 1, avisADonner: 1, aRemplacer: 1, aFaire: 2 });
  });
  it("les projets déjà envoyés pointent vers leur demande la plus récente", () => {
    const r = resumeDevisClient([{ id: "recente", projetId: "p1" }, { id: "ancienne", projetId: "p1" }, { id: "x", projetId: null }], [], MAINTENANT);
    expect(r.projets).toEqual({ p1: "recente" });
  });
});

describe("les chemins vers « Mes demandes de devis »", () => {
  it("l'en-tête : « Mes devis » avec pastille pour qui a une demande ; le reste dans le menu du compte", () => {
    const nav = lire("components/auth/AuthNav.tsx");
    expect(nav).toMatch(/\{devis && \(\s*<Link\s+href="\/demandes-devis"/);
    expect(nav).toContain("<MenuCompte");
    expect(nav).not.toContain('href="/avis-artisans"');
    const menu = lire("components/auth/MenuCompte.tsx");
    for (const lien of ['href="/mon-espace/compte"', 'href="/avis-artisans"', 'href="/admin"', "action={logout}"]) expect(menu).toContain(lien);
    expect(menu).toMatch(/e\.key === "Escape"/);
  });
  it("le menu mobile, « Mes projets », la fiche projet et l'ancre de chaque demande", () => {
    expect(lire("components/MobileMenu.tsx")).toMatch(/\{devis && \(\s*<Link href="\/demandes-devis"/);
    expect(lire("app/projets/page.tsx")).toContain("<BandeauDevis compact resume={devis} />");
    const bandeau = lire("components/reseau/BandeauDevis.tsx");
    expect(bandeau).toContain("Mes demandes de devis");
    expect(bandeau).toContain("/demandes-devis#demande-${dejaEnvoyee}");
    expect(bandeau).toContain("Voir ma demande");
    expect(lire("app/demandes-devis/page.tsx")).toContain("id={`demande-${d.id}`}");
  });
});
