import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readFileSync } from "node:fs";
import * as Ts from "@/lib/prospection/statuts";
import { STATUTS, datesAPoser, estARelancer, joursEcoules, nomLot, normaliserEmail, resumerProspection, transition, type Prospect } from "@/lib/prospection/statuts";
import { agentMarketing, construireBureaux, salleMarketing, type SourcesBureaux } from "@/lib/bureaux/donnees";
import * as Script from "../scripts/prospection.mjs";

/** L'Agent Prospection (28/11/2026) : statuts, STOP, une seule relance à 7 jours, salle Marketing, script du Mac. */
const MAINTENANT = new Date("2026-11-28T10:00:00Z"); // samedi 28 novembre 2026
const sources = (s: Partial<SourcesBureaux> = {}): SourcesBureaux => ({ inscrits: [], plans: [], demandes: [], artisans: [], devis: [], avisAModerer: 0, enLigne: null, journee: null, maintenant: MAINTENANT, ...s });
let n = 0;
const prospect = (p: Partial<Prospect> = {}): Prospect => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, email: `pro${n}@exemple.fr`, entreprise: `Entreprise ${n}`, contact: null, cible: "artisan", metier: "Plombier",
  commune: "Mérignac", ville: "Bordeaux", lot: "2026-11-27", envoyeLe: "2026-11-27T08:00:00Z", relanceLe: null, reponseLe: null, statut: "envoye", note: null, majLe: "2026-11-27T08:00:00Z", ...p,
});

describe("les règles des statuts", () => {
  it("normalise l'e-mail (espaces, majuscules) et refuse ce qui n'en est pas un", () => {
    expect(normaliserEmail("  Jean.Dupont@Exemple.FR ")).toBe("jean.dupont@exemple.fr");
    expect(normaliserEmail("pas-un-email")).toBeNull();
    expect(normaliserEmail("a b@c.fr")).toBeNull();
    expect(normaliserEmail("x@y")).toBeNull();
    expect(normaliserEmail(`${"a".repeat(60)}@${"b".repeat(200)}.fr`)).toBeNull();
    expect(normaliserEmail(42)).toBeNull();
  });
  it("après un STOP, plus jamais d'envoi ; un statut inconnu est refusé", () => {
    expect(transition("stop", "envoye")).toEqual({ ok: false, raison: "Cette personne a répondu STOP : on ne lui écrit plus jamais." });
    expect(transition("stop", "relance").ok).toBe(false);
    expect(transition("stop", "a_envoyer").ok).toBe(false);
    expect(transition("stop", "refus").ok).toBe(true);
    expect(transition("envoye", "repondu").ok).toBe(true);
    expect(transition("envoye", "spam").ok).toBe(false);
  });
  it("les dates se posent une seule fois, au bon statut", () => {
    expect(datesAPoser("envoye", {}, MAINTENANT)).toEqual({ envoye_le: MAINTENANT.toISOString() });
    expect(datesAPoser("relance", { envoye_le: "x" }, MAINTENANT)).toEqual({ relance_le: MAINTENANT.toISOString() });
    expect(datesAPoser("stop", {}, MAINTENANT)).toEqual({ reponse_le: MAINTENANT.toISOString() });
    expect(datesAPoser("interesse", { reponse_le: "2026-11-20T00:00:00Z" }, MAINTENANT)).toEqual({});
    expect(datesAPoser("erreur", {}, MAINTENANT)).toEqual({});
  });
  it("les jours écoulés : tous les jours comptent, week-end compris, heure de Paris", () => {
    const lundi = new Date("2026-11-23T09:00:00Z");
    expect(joursEcoules(lundi, new Date("2026-11-27T09:00:00Z"))).toBe(4);  // vendredi
    expect(joursEcoules(lundi, new Date("2026-11-29T09:00:00Z"))).toBe(6);  // le week-end compte
    expect(joursEcoules(lundi, new Date("2026-11-30T09:00:00Z"))).toBe(7);  // lundi suivant
    // vendredi 23 h 30 à Paris (22 h 30 UTC) puis lundi : 3 jours
    expect(joursEcoules(new Date("2026-11-27T22:30:00Z"), new Date("2026-11-30T08:00:00Z"))).toBe(3);
    // 23 h 30 UTC le jeudi = déjà vendredi à Paris
    expect(joursEcoules(new Date("2026-11-26T23:30:00Z"), new Date("2026-11-30T08:00:00Z"))).toBe(3);
    // passage à l'heure d'hiver (25 octobre 2026) : toujours des jours entiers
    expect(joursEcoules(new Date("2026-10-24T10:00:00Z"), new Date("2026-10-31T10:00:00Z"))).toBe(7);
  });
  it("à relancer : envoyé, jamais relancé, depuis au moins 7 jours ; une seule relance, ensuite plus rien", () => {
    const lundi = new Date("2026-11-30T09:00:00Z");
    expect(estARelancer({ statut: "envoye", envoyeLe: "2026-11-23T08:00:00Z", relanceLe: null }, lundi)).toBe(true);
    expect(estARelancer({ statut: "envoye", envoyeLe: "2026-11-24T08:00:00Z", relanceLe: null }, lundi)).toBe(false);
    // envoyé un samedi, relancé le samedi suivant (le week-end compte)
    expect(estARelancer({ statut: "envoye", envoyeLe: "2026-11-28T09:00:00Z", relanceLe: null }, new Date("2026-12-05T07:00:00Z"))).toBe(true);
    expect(estARelancer({ statut: "envoye", envoyeLe: "2026-11-28T09:00:00Z", relanceLe: null }, new Date("2026-12-04T07:00:00Z"))).toBe(false);
    expect(estARelancer({ statut: "relance", envoyeLe: "2026-11-02T08:00:00Z", relanceLe: "2026-11-09T08:00:00Z" }, lundi)).toBe(false);
    expect(estARelancer({ statut: "stop", envoyeLe: "2026-11-02T08:00:00Z", relanceLe: null }, lundi)).toBe(false);
  });
  it("le nom d'un lot daté", () => {
    expect(nomLot("2026-11-28")).toBe("28 novembre");
    expect(nomLot("essai")).toBe("essai");
  });
});

describe("le script du Mac reprend exactement les mêmes règles", () => {
  it("mêmes statuts, cibles, statuts de réponse, interdits après STOP, délai de relance", () => {
    expect(Script.STATUTS).toEqual([...Ts.STATUTS]);
    expect(Script.CIBLES).toEqual([...Ts.CIBLES]);
    expect(Script.STATUTS_REPONSE).toEqual([...Ts.STATUTS_REPONSE]);
    expect(Script.INTERDITS_APRES_STOP).toEqual([...Ts.INTERDITS_APRES_STOP]);
    expect(Script.RELANCE_JOURS).toBe(Ts.RELANCE_JOURS);
    expect(Ts.RELANCE_JOURS).toBe(7);
  });
  it("même table de transitions, mêmes dates posées", () => {
    for (const de of [...STATUTS, "inconnu"]) for (const vers of [...STATUTS, "inconnu"]) {
      expect(Script.transition(de, vers)).toEqual(transition(de, vers));
      if (Ts.estStatut(vers)) expect(Script.datesAPoser(vers, {}, MAINTENANT)).toEqual(datesAPoser(vers, {}, MAINTENANT));
    }
  });
  it("même e-mail normalisé, mêmes jours écoulés", () => {
    for (const e of ["  A@B.FR", "x@y", "a b@c.fr", "ok.pro@artisan-bordeaux.fr", null]) expect(Script.normaliserEmail(e)).toBe(normaliserEmail(e));
    for (let j = 0; j < 20; j++) {
      const a = new Date(Date.UTC(2026, 9, 20 + j, 21, 45)), b = new Date(Date.UTC(2026, 10, 3 + j, 6));
      expect(Script.joursEcoules(a, b)).toBe(joursEcoules(a, b));
    }
  });
});

describe("l'import du script", () => {
  it("normalise, valide, et dédoublonne dans le fichier", () => {
    const { lignes, rejetes } = Script.preparerImport([
      { email: " Contact@Plomberie-Garonne.FR ", entreprise: "Plomberie Garonne", cible: "artisan", siren: "123 456 789", ville: "Bordeaux", lot: "2026-11-28" },
      { email: "contact@plomberie-garonne.fr", entreprise: "Doublon", cible: "artisan" },
      { email: "pas-un-mail", entreprise: "X", cible: "artisan" },
      { email: "a@agence.fr", entreprise: "Agence", cible: "notaire" },
      { email: "b@archi.fr", entreprise: "Archi", cible: "architecte", siren: "12" },
      { email: "c@societe.fr", entreprise: "Société", cible: "societe", statut: "envoye", envoye_le: "2026-11-27T08:00:00Z" },
      { email: "d@societe.fr", entreprise: "Société D", cible: "societe", statut: "envoye" },
      { email: "e@societe.fr", entreprise: "Société E", cible: "societe", statut: "spam" },
    ], MAINTENANT);
    expect(lignes).toEqual([
      { email: "contact@plomberie-garonne.fr", entreprise: "Plomberie Garonne", cible: "artisan", ville: "Bordeaux", lot: "2026-11-28", siren: "123456789", statut: "a_envoyer" },
      { email: "c@societe.fr", entreprise: "Société", cible: "societe", statut: "envoye", envoye_le: "2026-11-27T08:00:00.000Z" },
      { email: "d@societe.fr", entreprise: "Société D", cible: "societe", statut: "envoye", envoye_le: MAINTENANT.toISOString() },
    ]);
    expect(rejetes.map((r: { email: string; raison: string }) => [r.email, r.raison])).toEqual([
      ["contact@plomberie-garonne.fr", "en double dans le fichier"],
      ["pas-un-mail", "adresse e-mail illisible"],
      ["a@agence.fr", "cible inconnue (artisan, agence, architecte, societe)"],
      ["b@archi.fr", "SIREN illisible (9 chiffres)"],
      ["e@societe.fr", "statut inconnu : spam"],
    ]);
  });
  it("refuse un fichier qui n'est pas un tableau", () => {
    expect(() => Script.preparerImport({})).toThrow(/tableau/);
  });
  it("a-relancer et stats, sur des lignes de la base", () => {
    const lignes = [
      { email: "a@x.fr", statut: "envoye", cible: "artisan", envoye_le: "2026-11-20T08:00:00Z", relance_le: null },
      { email: "b@x.fr", statut: "envoye", cible: "artisan", envoye_le: "2026-11-28T08:00:00Z", relance_le: null },
      { email: "c@x.fr", statut: "stop", cible: "agence", envoye_le: "2026-11-23T08:00:00Z", relance_le: null },
      { email: "d@x.fr", statut: "a_envoyer", cible: "architecte", envoye_le: null, relance_le: null },
    ];
    expect(Script.aRelancer(lignes, MAINTENANT).map((l: { email: string }) => l.email)).toEqual(["a@x.fr"]);
    expect(Script.stats(lignes, MAINTENANT)).toEqual({
      total: 4,
      par_statut: { a_envoyer: 1, envoye: 2, relance: 0, repondu: 0, interesse: 0, rdv: 0, inscrit: 0, refus: 0, stop: 1, erreur: 0 },
      par_cible: { artisan: 2, agence: 1, architecte: 1, societe: 0 },
      envoyes_aujourdhui: 1, envoyes_semaine: 2, a_relancer: 1,
    });
  });
});

describe("la salle Marketing des bureaux", () => {
  it("migration absente : la pièce le dit, sans planter, et l'agent reste à créer", () => {
    const p = salleMarketing(null, true);
    expect(p.liste[0]).toEqual(["Agent Prospection", "Migration 0019 à appliquer", "vide", "à brancher"]);
    expect(p.kpis.map((k) => k[1])).toEqual(["—", "—", "—"]);
    expect(p.lien).toBe("/admin/marketing");
    const d = construireBureaux(sources({ prospection: null, sansTableProspection: true }));
    expect(d.pieces.marketing.liste[0][1]).toBe("Migration 0019 à appliquer");
    expect(d.agents.marketing).toBeUndefined();
    expect(salleMarketing(null, false).liste[0][3]).toBe("erreur");
  });
  it("20 e-mails, aucune réponse : la ligne réelle, puis SEO (construit, Search Console à brancher) et Réseaux à créer", () => {
    const r = resumerProspection(Array.from({ length: 20 }, () => prospect()), MAINTENANT);
    const p = salleMarketing(r, false);
    expect(p.kpis).toEqual([["Agents actifs", "1"], ["E-mails envoyés", "20"], ["Réponses", "0"]]);
    expect(p.liste).toEqual([
      ["Agent Prospection", "20 e-mails envoyés · 0 réponse", "bon", "au travail"],
      ["Agent SEO", "Branche Search Console (mode d'emploi sur le Mac)", "vide", "à brancher"],
      ["Agent Réseaux", "Reels et publications", "vide", "à créer"],
    ]);
    expect(p.etat).toBe("bon");
    expect(agentMarketing(r)).toMatchObject({ etat: "travail", fait: "20 e-mails envoyés en 7 jours" });
  });
  it("des réponses à traiter : l'agent t'attend, avec les noms, et la tâche monte dans ton bureau", () => {
    const r = resumerProspection([
      prospect({ entreprise: "Plomberie Garonne", contact: "Paul", statut: "interesse", reponseLe: "2026-11-28T08:00:00Z" }),
      prospect({ entreprise: "Agence Les Chartrons", commune: null, statut: "repondu", reponseLe: "2026-11-28T08:00:00Z" }),
      prospect({ statut: "stop", reponseLe: "2026-11-27T12:00:00Z" }),
      prospect({ envoyeLe: "2026-11-16T08:00:00Z", lot: "2026-11-16" }),
      prospect({ statut: "a_envoyer", envoyeLe: null, lot: "2026-11-28" }),
    ], MAINTENANT);
    expect(r.reponses).toBe(3);
    expect(r.aTraiter).toBe(2);
    expect(r.aRelancer).toBe(1);
    const a = agentMarketing(r)!;
    expect(a.etat).toBe("attend");
    expect(a.fait).toBe("2 réponses à traiter");
    expect(a.taches).toEqual([
      ["Plomberie Garonne", "Paul · Intéressé · Mérignac", "attention", "t'attend"],
      ["Agence Les Chartrons", "A répondu · Bordeaux", "attention", "t'attend"],
      ["1 relance due", "Sans réponse depuis 7 jours", "attention", "à relancer"],
      ["1 STOP à respecter", "Plus jamais d'e-mail à ces adresses", "vide", "respecté"],
      ["Dernier lot · 28 novembre", "1 prospect dans ce lot", "vide", "fait"],
    ]);
    const d = construireBureaux(sources({ prospection: r }));
    expect(d.pieces.marketing.etat).toBe("attention");
    expect(d.pieces.marketing.conseil).toMatch(/^2 prospects ont répondu/);
    expect(d.agents.marketing?.etat).toBe("attend");
    expect(d.priorites[0]).toEqual(["marketing", "Rappeler 2 prospects intéressés", "réseau"]);
  });
  it("rien envoyé depuis 7 jours : au repos", () => {
    const r = resumerProspection([prospect({ envoyeLe: "2026-11-02T08:00:00Z", statut: "relance", relanceLe: "2026-11-09T08:00:00Z" })], MAINTENANT);
    expect(agentMarketing(r)?.etat).toBe("repos");
    expect(salleMarketing(r, false).liste[0][3]).toBe("au repos");
  });
});

describe("la migration 0019", () => {
  it("une table fermée à tous sauf au serveur, des statuts fermés, et son retour", () => {
    const sql = readFileSync("supabase/migrations/0019_prospection.sql", "utf8");
    expect(sql.match(/enable row level security/g)).toHaveLength(1);
    expect(sql).not.toMatch(/create policy/i);
    for (const k of STATUTS) expect(sql).toContain(`'${k}'`);
    expect(sql).toMatch(/email text not null unique/);
    expect(readFileSync("supabase/migrations/0019_prospection_retour.sql", "utf8")).toMatch(/drop table if exists public\.admin_prospects/);
  });
  it("le site n'envoie aucun e-mail de prospection : l'action ne fait que changer un statut", () => {
    const action = readFileSync("lib/actions/prospection.ts", "utf8");
    expect(action).not.toMatch(/resend|sendMail|nodemailer|envoyerEmail/i);
    expect(action).toMatch(/getAdmin\(\)/);
  });
});
