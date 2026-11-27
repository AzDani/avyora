import { describe, expect, it } from "vitest";
import { construireBureaux, type SourcesBureaux } from "@/lib/bureaux/donnees";
import type { AdminInscrit, AdminPlan, AdminProjet } from "@/lib/data/admin";
import type { ArtisanListe, DemandeAdmin } from "@/lib/data/reseau";
import type { DemandeAccompagnement } from "@/lib/admin/outils";

/** Les bureaux virtuels : le contenu des pièces se calcule à partir des listes de l'admin, sans rien inventer. */

const MAINTENANT = new Date("2026-11-27T15:00:00Z");
const ilYA = (jours: number) => new Date(MAINTENANT.getTime() - jours * 864e5 - 3600e3).toISOString();

const projet = (p: Partial<AdminProjet>): AdminProjet => ({ id: "p", ownerId: "u", nom: "Projet", typeBien: "maison", surface: 80, codePostal: "33000", createdAt: ilYA(1), ttc: 1000, statut: "estimation", pct: 0, nature: "reno", mode: "rapide", ...p });
const inscrit = (i: Partial<AdminInscrit>): AdminInscrit => ({ id: "u", email: "a@exemple.test", username: null, createdAt: ilYA(40), lastSignIn: null, onboardingFait: true, profil: { tuEs: ["particulier"], objectif: "", maturite: [], region: "", age: "", canal: "" }, plan: "free", projets: [], ...i });
const demande = (d: Partial<DemandeAccompagnement>): DemandeAccompagnement => ({ id: "d", recueLe: ilYA(0), prenom: "Julie", email: "j@exemple.test", telephone: null, typeProjet: "Rénovation", besoins: ["Avis avant achat"], source: null, langue: "fr", emailRecu: true, message: null, traiteeLe: null, ...d });
const artisan = (a: Partial<ArtisanListe>): ArtisanListe => ({ id: "a", userId: "ua", statut: "valide", siret: "", raisonSociale: "Maçonnerie Durand", nomCommercial: null, siretVerif: null, contactNom: "", telephone: "", email: "", metiers: ["maconnerie"], departements: ["33"], presentation: null, siteWeb: null, lienAvis: null, rge: false, decennaleAssureur: "", decennalePolice: "", decennaleFin: "2027-06-30", soumiseLe: ilYA(60), appelLe: ilYA(50), valideLe: ilYA(49), messageAdmin: null, notesAdmin: null, contactsEnvoyes: 0, majDemandee: null, masqueLe: null, photo: null, nbPhotos: 0, nbDecennales: 1, ...a });
const devisDe = (d: Partial<DemandeAdmin>): DemandeAdmin => ({ id: "dd", client_id: "c", projet_id: null, metiers: ["maconnerie"], code_postal: "33000", departement: "33", ville: "Bordeaux", description: null, quantites: null, delai: null, photos: [], estimation: null, prenom: "Marc", telephone: "", email: "", created_at: ilYA(4), adresse: null, reponses: [], ...d });
const plan = (p: Partial<AdminPlan>): AdminPlan => ({ id: "pl", ownerId: "u", email: "", nom: "Plan", workflow: "renovation", m2: null, pieces: null, budget: null, apercu: null, createdAt: ilYA(2), updatedAt: ilYA(1), estimations: [], ...p });

const sources = (s: Partial<SourcesBureaux> = {}): SourcesBureaux => ({ inscrits: [], plans: [], demandes: [], artisans: [], devis: [], avisAModerer: 0, enLigne: null, journee: null, maintenant: MAINTENANT, ...s });

describe("bureaux virtuels : le contenu des pièces", () => {
  it("un site sans rien en attente : tout est à jour, aucune priorité inventée", () => {
    const d = construireBureaux(sources());
    expect(d.pieces.accompagnement.etat).toBe("bon");
    expect(d.pieces.attente.etat).toBe("bon");
    expect(d.pieces.bureau.kpis).toEqual([["À faire", "0"], ["Qui rapportent", "0"], ["En retard", "0"]]);
    expect(d.priorites).toHaveLength(1);
    expect(d.priorites[0][0]).toBe("projets");
    expect(Object.keys(d.pieces)).toHaveLength(12);
  });

  it("un rappel qui attend depuis 3 jours passe l'accompagnement en critique, les plus anciens d'abord", () => {
    const d = construireBureaux(sources({ demandes: [demande({ id: "1", prenom: "Karim", recueLe: ilYA(0) }), demande({ id: "2", prenom: "Julie", recueLe: ilYA(3) }), demande({ id: "3", prenom: "Faite", traiteeLe: ilYA(1) })] }));
    const p = d.pieces.accompagnement;
    expect(p.etat).toBe("critique");
    expect(p.nb).toBe(2);
    expect(p.liste.map((l) => l[0])).toEqual(["Julie", "Karim"]);
    expect(p.liste[0][3]).toBe("en retard");
    expect(p.kpis[2]).toEqual(["Attente max", "3 j"]);
    expect(p.euro).toBeNull();
    expect(d.priorites[0]).toEqual(["accompagnement", "Rappeler 2 demandes d'accompagnement", "ce qui rapporte"]);
  });

  it("les candidatures : en attente, à compléter, et l'appel pas encore fait", () => {
    const d = construireBureaux(sources({ artisans: [artisan({ id: "1", statut: "en_attente", soumiseLe: ilYA(6), appelLe: null }), artisan({ id: "2", statut: "en_attente", raisonSociale: "Élec Martin", soumiseLe: ilYA(1) }), artisan({ id: "3", statut: "a_completer", raisonSociale: "Toitures Roy" })] }));
    const p = d.pieces.attente;
    expect(p.etat).toBe("critique");
    expect(p.kpis).toEqual([["À examiner", "2"], ["À compléter", "1"], ["Attente max", "6 j"]]);
    expect(p.liste[0]).toEqual(["Maçonnerie Durand", "dép. 33 · depuis 6 jours", "critique", "à appeler"]);
    expect(p.liste[2][3]).toBe("à compléter");
    expect(p.gens).toBe(3);
  });

  it("l'atelier : une décennale expirée est critique, un artisan masqué n'est plus compté parmi les validés visibles", () => {
    const d = construireBureaux(sources({ artisans: [artisan({ id: "1", decennaleFin: "2026-11-20" }), artisan({ id: "2", raisonSociale: "DLC TRAVAUX", masqueLe: ilYA(2) }), artisan({ id: "3", raisonSociale: "Carrelage Petit" })] }));
    const p = d.pieces.atelier;
    expect(p.etat).toBe("critique");
    expect(p.kpis).toEqual([["Validés", "2"], ["Masqués", "1"], ["Décennales à refaire", "1"]]);
    expect(p.liste[0][1]).toBe("Décennale expirée depuis 7 jours");
    expect(p.liste.at(-1)).toEqual(["1 autre artisan", "Dossier à jour", "bon", "ok"]);
  });

  it("les devis : une demande sans artisan et un avis à modérer", () => {
    const d = construireBureaux(sources({ avisAModerer: 1, devis: [devisDe({ id: "1" }), devisDe({ id: "2", ville: "Mérignac", reponses: [{ artisanId: "a", nom: "A", statut: "acceptee", issue: null, avisNote: null }] })] }));
    const p = d.pieces.devis;
    expect(p.etat).toBe("attention");
    expect(p.kpis).toEqual([["Demandes / 30 j", "2"], ["Sans réponse", "1"], ["Avis à modérer", "1"]]);
    expect(p.liste[0][0]).toBe("1 avis à modérer");
    expect(p.lien).toBe("/admin/avis");
  });

  it("projets et plans de la semaine, comptes sans « Tu es… »", () => {
    const d = construireBureaux(sources({
      inscrits: [inscrit({ id: "1", projets: [projet({ id: "a" }), projet({ id: "b", nature: "neuf", mode: "detaille" }), projet({ id: "c", createdAt: ilYA(20) })] }), inscrit({ id: "2", profil: null, createdAt: ilYA(0) }), inscrit({ id: "3", plan: "pro" })],
      plans: [plan({ id: "1" }), plan({ id: "2", estimations: ["e"] }), plan({ id: "3", createdAt: ilYA(30), updatedAt: ilYA(30) })],
    }));
    expect(d.pieces.projets.kpis).toEqual([["Inscrits", "3"], ["Estimations / 7 j", "2"], ["Sans « Tu es… »", "1"]]);
    expect(d.pieces.projets.liste[0][1]).toBe("1 estimation cette semaine");
    expect(d.pieces.plan.kpis).toEqual([["Plans dessinés", "3"], ["Cette semaine", "2"], ["Vers l'estimation", "1"]]);
    expect(d.pieces.caisse.kpis[0]).toEqual(["Abonnés Pro", "1"]);
    expect(d.pieces.archives.kpis[0]).toEqual(["Estimations", "3"]);
  });

  it("l'accueil suit le compteur en ligne, et le dit quand il est éteint", () => {
    expect(construireBureaux(sources()).pieces.accueil.etat).toBe("vide");
    const d = construireBureaux(sources({ enLigne: { total: 3, pages: [{ chemin: "/plan", n: 2 }, { chemin: "/", n: 1 }], visiteurs: [] }, journee: { total: 41, membres: 2, visiteurs: [] } }));
    expect(d.pieces.accueil.kpis.slice(0, 2)).toEqual([["En ce moment", "3"], ["Aujourd'hui", "41"]]);
    expect(d.pieces.accueil.liste[0]).toEqual(["Éditeur de plan", "2 visiteurs", "bon", "en direct"]);
    expect(d.pieces.accueil.gens).toBe(3);
  });

  it("une source illisible n'emporte que sa pièce, et rien n'est chiffré dans la comptabilité ni le planning", () => {
    const d = construireBureaux(sources({ artisans: null, plans: null, demandes: null, devis: null }));
    for (const id of ["attente", "atelier", "plan", "accompagnement", "devis"] as const) { expect(d.pieces[id].etat).toBe("vide"); expect(d.pieces[id].liste[0][3]).toBe("erreur"); }
    expect(d.pieces.projets.etat).not.toBe("vide");
    expect(JSON.stringify(d.pieces.caisse)).not.toMatch(/€/);
    expect(d.pieces.reunion.liste).toEqual([]);
  });
});
