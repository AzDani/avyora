import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AgentErreur, demanderJson, MODELE_DEFAUT, type ClientClaude } from "@/lib/agents/claude";
import {
  SCHEMA_COMPTE_RENDU, SYSTEME_COMPTE_RENDU, SYSTEME_FICHE, compteRenduEnTexte, compteRenduValide, SIGNATURE, contexteEnTexte, decouperCompteRendu, ficheValide,
} from "@/lib/agents/rappels";
import { emailCompteRendu, emailRappelRendezVous } from "@/lib/email";

/** Les agents IA Rappels et Agenda (27/11/2026) : ce qui est envoyé à Claude, ce qui en revient, ce qui part au client. Aucun vrai appel. */
const faux = (reponse: { stop_reason: string; texte: string }, vu: unknown[] = []): ClientClaude => ({
  messages: { create: async (p) => { vu.push(p); return { content: [{ type: "text", text: reponse.texte }], stop_reason: reponse.stop_reason } as never; } },
});

describe("l'appel à Claude", () => {
  it("demande un JSON imposé par le schéma, avec la réflexion adaptative et le modèle par défaut", async () => {
    const vu: Record<string, unknown>[] = [];
    const r = await demanderJson<{ a: number }>({ systeme: "S", contenu: "C", schema: { type: "object" }, client: faux({ stop_reason: "end_turn", texte: '{"a":1}' }, vu) });
    expect(r).toEqual({ a: 1 });
    expect(vu[0]).toMatchObject({ model: MODELE_DEFAUT, thinking: { type: "between_tools" }, output_config: { format: { type: "json_schema", schema: { type: "object" } } }, system: "S", messages: [{ role: "user", content: "C" }] });
  });
  it("refus, réponse coupée, JSON illisible, panne et clé absente : une erreur claire, jamais un faux résultat", async () => {
    const code = (p: Promise<unknown>) => p.then(() => "aucune", (e) => (e instanceof AgentErreur ? e.code : "autre"));
    expect(await code(demanderJson({ systeme: "", contenu: "", schema: {}, client: faux({ stop_reason: "refusal", texte: "" }) }))).toBe("refus");
    expect(await code(demanderJson({ systeme: "", contenu: "", schema: {}, client: faux({ stop_reason: "max_tokens", texte: '{"a"' }) }))).toBe("coupe");
    expect(await code(demanderJson({ systeme: "", contenu: "", schema: {}, client: faux({ stop_reason: "end_turn", texte: "pas du json" }) }))).toBe("illisible");
    expect(await code(demanderJson({ systeme: "", contenu: "", schema: {}, client: { messages: { create: async () => { throw new Error("réseau"); } } } }))).toBe("panne");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await code(demanderJson({ systeme: "", contenu: "", schema: {} }))).toBe("cle_absente");
    vi.unstubAllEnvs();
  });
});

describe("l'Agent Rappels", () => {
  it("les consignes portent les règles d'AVYORA (conseil, aucun délai, aucun chiffre inventé)", () => {
    for (const s of [SYSTEME_FICHE, SYSTEME_COMPTE_RENDU]) {
      expect(s).toMatch(/jamais de la maîtrise d'œuvre/);
      expect(s).toMatch(/Aucun délai n'est promis/);
      expect(s).toMatch(/Aucun chiffre inventé/);
      expect(s).not.toMatch(/Vinci/i);
    }
    expect(SCHEMA_COMPTE_RENDU.required).toEqual(["objet", "resume", "points", "etapes"]);
  });
  it("le contexte envoyé : prénom, rendez-vous, demande et estimations ; jamais d'e-mail ni de téléphone", () => {
    const t = contexteEnTexte({
      prenom: "Léa",
      rdv: { type: "Avis avant achat", mode: "par téléphone", quand: "30/11/2026 à 15:00", sujet: "Maison de Pessac" },
      demande: { typeProjet: "Rénovation", besoins: ["Avis avant achat"], message: "Toiture ?", recueLe: "2026-11-25T10:00:00Z" },
      projets: [{ nom: "Pessac", nature: "reno", mode: "rapide", typeBien: "maison", surface: 95, codePostal: "33600", ttc: 48250.4, creeLe: "2026-11-20T10:00:00Z" }],
      plans: 1,
    });
    expect(t).toContain("Client : Léa");
    expect(t).toContain("estimation 48");
    expect(t).toContain("« Toiture ? »");
    expect(t).not.toMatch(/@|\+33/);
  });
  it("ce qui revient est contrôlé : vide = refusé, listes bornées", () => {
    expect(ficheValide({ resume: "" })).toBeNull();
    expect(ficheValide({ resume: "R", points: Array(9).fill("p"), questions: ["q", 3], vigilance: [] })).toEqual({ resume: "R", points: Array(5).fill("p"), questions: ["q"], vigilance: [] });
    expect(compteRenduValide({ objet: "O" })).toBeNull();
  });
  it("le compte rendu : texte à relire, puis objet et corps de l'e-mail, échappé", () => {
    const cr = compteRenduValide({ objet: "Notre échange", resume: "On a regardé la toiture.", points: [{ titre: "Toiture", detail: "À faire vérifier." }], etapes: ["Demander deux devis"] })!;
    const texte = compteRenduEnTexte(cr, "Léa");
    expect(texte.split("\n")[0]).toBe("Objet : Notre échange");
    expect(texte).toContain("Bonjour Léa,");
    expect(texte).toContain("- Demander deux devis");
    const { objet, corps } = decouperCompteRendu(texte);
    expect(objet).toBe("Notre échange");
    expect(corps.startsWith("Bonjour Léa,")).toBe(true);
    expect(decouperCompteRendu("Sans objet")).toEqual({ objet: "Notre échange", corps: "Sans objet" });
    // Décision du 27/11 : poli, vouvoiement, « Bonjour Monsieur Dupont, », et les coordonnées de Daniel en bas.
    const poli = compteRenduEnTexte(cr, "Monsieur Dupont");
    expect(poli).toContain("Bonjour Monsieur Dupont,");
    expect(poli).toContain("Les prochaines étapes de votre côté :");
    expect(poli).toContain("Bien cordialement,");
    expect(poli.trimEnd().endsWith(SIGNATURE.join("\n"))).toBe(true);
    expect(SIGNATURE).toContain("contact@getavyora.fr");
    expect(poli).not.toMatch(/\b(tu|te|ton|ta|tes)\b/i);
    expect(SYSTEME_COMPTE_RENDU).toMatch(/VOUVOIES le client/);
    const mail = emailCompteRendu({ objet, corps: corps + "\n\n<script>x</script>" });
    expect(mail.subject).toBe("Notre échange");
    expect(mail.html).not.toContain("<script>x");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("Cet e-mail vous est envoyé dans le cadre de votre accompagnement");
    expect(mail.html).toContain("Accompagnement travaux · conseil indépendant");
    expect(mail.html).not.toContain("Estime tes travaux");
    // La copie pour Daniel : objet préfixé (rangement en dossier), à qui et quand, échappé.
    const copie = emailCompteRendu({ objet, corps, copie: { a: "l<b>@x.fr", le: "27 novembre 2026 à 22:10" } });
    expect(copie.subject).toBe("[Compte rendu envoyé] Notre échange");
    expect(copie.html).toContain("Copie : envoyé à <b>l&lt;b&gt;@x.fr</b> le 27 novembre 2026 à 22:10.");
    expect(mail.html).not.toContain("Copie :");
  });
  it("le rappel de la veille donne le jour et l'heure de France", () => {
    const m = emailRappelRendezVous({ prenom: "Léa", quoi: "Avis avant achat", mode: "par téléphone", jour: "lundi 30 novembre", heure: "15:00" });
    expect(m.subject).toBe("Rappel : notre rendez-vous lundi 30 novembre à 15:00");
    expect(m.html).toContain("(heure de France)");
    expect(m.html).toContain("pour votre avis avant achat");
    expect(m.html).not.toMatch(/\b(tu|ton|réponds)\b/);
  });
});
