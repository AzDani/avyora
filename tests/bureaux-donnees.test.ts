import { describe, expect, it } from "vitest";
import { construireBureaux, type SourcesBureaux } from "@/lib/bureaux/donnees";
import type { AdminInscrit, AdminPlan, AdminProjet } from "@/lib/data/admin";
import type { ArtisanListe, DemandeAdmin } from "@/lib/data/reseau";
import type { DemandeAccompagnement } from "@/lib/admin/outils";
import type { MesureServeurs } from "@/lib/bureaux/serveurs";
import { planDe } from "@/lib/bureaux/limites";
import { lireDebut, type Charge, type RendezVous } from "@/lib/admin/gestion";

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
    expect(Object.keys(d.pieces)).toHaveLength(13);
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
    expect(d.pieces.reunion.liste[0][3]).toBe("erreur");
  });

  describe("la salle des serveurs", () => {
    const Mo = 1024 ** 2;
    const mesure = (m: Partial<MesureServeurs>): MesureServeurs => ({ planSupabase: "gratuit", planVercel: "gratuit", fichiers: { octets: 312 * Mo, nb: 40, partiel: false }, base: 120 * Mo, mesureLe: MAINTENANT.toISOString(), ...m });

    it("mesure les fichiers, la base et les comptes actifs face aux limites du plan gratuit", () => {
      const d = construireBureaux(sources({ serveurs: mesure({}), inscrits: [inscrit({ id: "1", lastSignIn: ilYA(2) }), inscrit({ id: "2", lastSignIn: ilYA(45) })] }));
      const p = d.pieces.serveurs;
      expect(p.etat).toBe("bon");
      expect(p.kpis).toEqual([["Photos et fichiers", "30 %"], ["Base de données", "24 %"], ["Comptes actifs ce mois", "< 1 %"]]);
      expect(p.jauges?.find((j) => j.cle === "fichiers")?.texte).toBe("312 Mo sur 1 Go · 40 fichiers");
      expect(p.jauges?.find((j) => j.cle === "actifs")?.texte).toMatch(/^1 sur 50/);
      expect(p.titre).toBe("Supabase gratuit · Vercel gratuit");
      expect(p.conseil).toMatch(/usage commercial/);
    });

    it("ce qui ne se mesure pas le dit, sans chiffre : base sans migration, données envoyées sans clé", () => {
      const p = construireBureaux(sources({ serveurs: mesure({ base: null }) })).pieces.serveurs;
      expect(p.jauges?.find((j) => j.cle === "base")).toMatchObject({ part: null, texte: "Migration 0015 à appliquer" });
      expect(p.liste.filter((l) => l[3] === "à brancher")).toHaveLength(2);
      // sans mesure du tout, les fichiers et la base le disent ; les comptes actifs, eux, se comptent toujours
      const sans = construireBureaux(sources()).pieces.serveurs;
      expect(sans.jauges?.slice(0, 2).map((j) => j.texte)).toEqual(["Mesure impossible pour l'instant", "Mesure impossible pour l'instant"]);
      expect(sans.kpis.map((k) => k[1])).toEqual(["—", "—", "0 %"]);
    });

    it("une limite à 85 % passe la salle en critique et en tête des priorités", () => {
      const d = construireBureaux(sources({ serveurs: mesure({ fichiers: { octets: 900 * Mo, nb: 500, partiel: true } }), demandes: [demande({})] }));
      expect(d.pieces.serveurs.etat).toBe("critique");
      expect(d.pieces.serveurs.jauges?.[0].texte).toMatch(/^au moins 900 Mo/);
      expect(d.priorites[0]).toEqual(["serveurs", "Supabase : photos et fichiers à 88 %", "le site tient"]);
      expect(d.pieces.bureau.kpis[2]).toEqual(["En retard", "1"]);
    });

    it("en Pro, les limites suivent le plan", () => {
      const p = construireBureaux(sources({ serveurs: mesure({ planSupabase: "pro", planVercel: "pro" }) })).pieces.serveurs;
      expect(p.kpis[0]).toEqual(["Photos et fichiers", "< 1 %"]);
      expect(p.titre).toBe("Supabase Pro · Vercel Pro");
      expect(p.conseil).not.toMatch(/usage commercial/);
      expect(planDe(" PRO ")).toBe("pro");
      expect(planDe(undefined)).toBe("gratuit");
    });
  });

  describe("compta et planning", () => {
    const charge = (o: Partial<Charge>): Charge => ({ id: "c", nom: "Abonnement", montantCentimes: 2000, devise: "EUR", frequence: "mois", echeance: null, actif: true, ...o });
    const e = (net: number) => ({ mois: { brut: net + 100, frais: 100, rembourse: 0, net, nb: 2 }, precedent: { brut: 0, frais: 0, rembourse: 0, net: 0, nb: 0 }, lu: MAINTENANT.toISOString() });

    it("la comptabilité : entrées Stripe, charges saisies, résultat en euros", () => {
      const p = construireBureaux(sources({ charges: [charge({}), charge({ id: "d", nom: "Domaine", montantCentimes: 1200, frequence: "an" }), charge({ id: "u", devise: "USD", montantCentimes: 10000 })], entrees: e(19800) })).pieces.caisse;
      expect(p.kpis).toEqual([["Entrées du mois", "198 €"], ["Charges fixes", "21 € + 100 $"], ["Résultat", "177 €"]]);
      expect(p.etat).toBe("bon");
      expect(p.liste[0][1]).toMatch(/^2 paiements/);
      expect(p.liste[2][1]).toBe("1 € par mois (12 € par an)");
      expect(p.lien).toBe("/admin/compta");
    });
    it("sans rien de lisible, rien n'est chiffré ; des charges qui dépassent les entrées passent en attention", () => {
      expect(construireBureaux(sources()).pieces.caisse.kpis.map((k) => k[1])).toEqual(["—", "—", "—"]);
      expect(construireBureaux(sources({ charges: [charge({ montantCentimes: 50000 })], entrees: e(19800) })).pieces.caisse.etat).toBe("attention");
    });
    it("la salle de réunion : les rendez-vous des deux semaines, les créneaux à confirmer en priorité", () => {
      const rdv = (o: Partial<RendezVous>): RendezVous => ({ id: "r", debut: lireDebut("2026-11-30T15:00")!.toISOString(), dureeMin: 45, client: "Léa D.", sujet: null, type: "avis_achat", mode: "telephone", statut: "confirme", compteRendu: "aucun", demandeId: null, ...o });
      const d = construireBureaux(sources({ rendezVous: [
        rdv({}),
        rdv({ id: "2", client: "Nadia P.", debut: lireDebut("2026-12-01T18:00")!.toISOString(), statut: "a_confirmer", mode: "visio" }),
        rdv({ id: "3", debut: lireDebut("2026-12-02T10:00")!.toISOString(), statut: "annule" }),
        rdv({ id: "4", debut: lireDebut("2026-11-24T10:00")!.toISOString(), compteRendu: "a_relire" }),
      ] }));
      // le 27/11/2026 est un vendredi : le lundi de référence est le 23/11
      expect(d.rdvs).toEqual([
        { j: 7, h: "15:00", qui: "Léa D.", quoi: "Avis avant achat", mode: "par téléphone", sujet: "", confirme: true, cr: null },
        { j: 8, h: "18:00", qui: "Nadia P.", quoi: "Avis avant achat", mode: "en visio", sujet: "", confirme: false, cr: null },
        { j: 1, h: "10:00", qui: "Léa D.", quoi: "Avis avant achat", mode: "par téléphone", sujet: "", confirme: true, cr: "a_relire" },
      ]);
      expect(d.pieces.reunion.kpis).toEqual([["Cette semaine", "1"], ["Semaine prochaine", "2"], ["À confirmer", "1"]]);
      expect(d.pieces.reunion.etat).toBe("attention");
      expect(d.priorites.map((r) => r[1])).toEqual(["Confirmer 1 rendez-vous", "Relire 1 compte rendu d'appel"]);
    });
  });
});
