/**
 * L'Agent Rappels (27/11/2026) : avant l'appel, il prépare la fiche du client ; après, il rédige le compte rendu à partir
 * de ce que Daniel colle (la transcription de l'enregistrement, ou ses notes). Daniel relit et corrige toujours avant
 * l'envoi (décision du 27/11 : relecture au début, envoi automatique plus tard).
 *
 * Fichier PUR : les consignes, les schémas de réponse, la mise en forme du contexte et du compte rendu. L'appel à Claude
 * est dans lib/agents/claude.ts, les écritures dans lib/actions/agents.ts. Rien ici ne lit la base.
 */

/* ─── Les règles d'AVYORA, communes aux deux tâches ────────────────────────── */

const REGLES = `Tu travailles pour AVYORA, un service français qui aide les particuliers et les investisseurs à estimer et à cadrer leurs travaux.
Daniel, son fondateur, est un ancien chef de chantier d'un grand groupe du BTP. Il fait des accompagnements payants par téléphone ou en visio :
« avis avant achat » (un bien à acheter, ses travaux), « relecture de devis » (des devis d'artisans à comparer), « point projet ».

Règles qui ne se discutent pas :
- C'est du CONSEIL, jamais de la maîtrise d'œuvre : Daniel ne dirige pas le chantier, ne choisit pas l'artisan à la place du client et ne garantit rien.
- Aucun délai n'est promis, aucun planning n'est donné.
- Aucun chiffre inventé : un montant, une surface ou une date n'apparaît que s'il est écrit dans les éléments fournis.
- Ne parle pas d'aides publiques (MaPrimeRénov' et autres) : AVYORA n'en parle plus.
- Ne cite jamais d'entreprise où Daniel a travaillé.
- Écris en français simple, sans jargon, avec des phrases courtes.`;

/* ─── La fiche avant l'appel ────────────────────────────────────────────────── */

export type Fiche = { resume: string; points: string[]; questions: string[]; vigilance: string[] };

export const SYSTEME_FICHE = `${REGLES}

Ta tâche : préparer la FICHE que Daniel lira juste avant d'appeler le client. Elle est pour lui seul, tu le tutoies.
- resume : 2 ou 3 phrases sur la situation du client et ce qu'il attend de l'appel.
- points : ce que Daniel doit vérifier ou garder en tête (au plus 5), tirés des éléments fournis.
- questions : les questions à poser au client pour bien comprendre (au plus 5), concrètes.
- vigilance : ce qui manque ou peut poser problème (au plus 3) ; liste vide s'il n'y a rien.
N'invente rien : si les éléments sont maigres, dis-le dans le résumé et pose les questions qui manquent.`;

export const SCHEMA_FICHE = {
  type: "object",
  additionalProperties: false,
  required: ["resume", "points", "questions", "vigilance"],
  properties: {
    resume: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    vigilance: { type: "array", items: { type: "string" } },
  },
} as const;

/* ─── Le compte rendu après l'appel ─────────────────────────────────────────── */

export type CompteRenduIA = { objet: string; resume: string; points: { titre: string; detail: string }[]; etapes: string[] };

export const SYSTEME_COMPTE_RENDU = `${REGLES}

Ta tâche : rédiger le COMPTE RENDU de l'appel, envoyé ensuite AU CLIENT par e-mail, après relecture par Daniel.
Tu tutoies le client (c'est le ton d'AVYORA) et tu écris au nom de Daniel, à la première personne.
- objet : l'objet de l'e-mail, court (ex. « Notre échange sur la maison de Pessac »).
- resume : 2 ou 3 phrases qui rappellent la situation et la conclusion de l'échange.
- points : les sujets abordés (au plus 6), chacun avec ce qui a été dit et conseillé.
- etapes : ce qu'il reste à faire au client, concrètement (au plus 5).
Reprends UNIQUEMENT ce qui a été dit dans la transcription ou les notes : rien d'ajouté, aucun chiffre qui n'y figure pas.
Si un passage est flou ou contradictoire, écris-le prudemment (« à confirmer ») plutôt que de trancher.`;

export const SCHEMA_COMPTE_RENDU = {
  type: "object",
  additionalProperties: false,
  required: ["objet", "resume", "points", "etapes"],
  properties: {
    objet: { type: "string" },
    resume: { type: "string" },
    points: { type: "array", items: { type: "object", additionalProperties: false, required: ["titre", "detail"], properties: { titre: { type: "string" }, detail: { type: "string" } } } },
    etapes: { type: "array", items: { type: "string" } },
  },
} as const;

/* ─── Contrôle de ce qui revient ────────────────────────────────────────────── */

const chaine = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => chaine(x, max)).filter(Boolean).slice(0, n) : []);

export function ficheValide(v: unknown): Fiche | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const f = { resume: chaine(o.resume, 1200), points: liste(o.points, 5, 400), questions: liste(o.questions, 5, 400), vigilance: liste(o.vigilance, 3, 400) };
  return f.resume ? f : null;
}
export function compteRenduValide(v: unknown): CompteRenduIA | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const points = (Array.isArray(o.points) ? o.points : []).map((p) => { const q = (p && typeof p === "object" ? p : {}) as Record<string, unknown>; return { titre: chaine(q.titre, 160), detail: chaine(q.detail, 1500) }; }).filter((p) => p.titre && p.detail).slice(0, 6);
  const c = { objet: chaine(o.objet, 140), resume: chaine(o.resume, 1500), points, etapes: liste(o.etapes, 5, 400) };
  return c.objet && c.resume ? c : null;
}

/** Le compte rendu en texte, tel que Daniel le relit et le corrige (puis tel qu'il part, mis en page). */
export function compteRenduEnTexte(c: CompteRenduIA, prenom: string): string {
  return [
    `Objet : ${c.objet}`,
    "",
    `Bonjour ${prenom},`,
    "",
    c.resume,
    ...c.points.flatMap((p) => ["", `${p.titre}`, p.detail]),
    ...(c.etapes.length ? ["", "Ce qu'il te reste à faire :", ...c.etapes.map((e) => `- ${e}`)] : []),
    "",
    "Si un point n'est pas clair, réponds simplement à cet e-mail.",
    "",
    "Daniel",
    "AVYORA",
  ].join("\n");
}

/** Le texte relu → objet et corps (la première ligne « Objet : … » donne l'objet, le reste est le corps). */
export function decouperCompteRendu(texte: string): { objet: string; corps: string } {
  const lignes = texte.replace(/\r/g, "").split("\n");
  const m = (lignes[0] ?? "").match(/^\s*objet\s*:\s*(.+)$/i);
  return m ? { objet: m[1].trim().slice(0, 140), corps: lignes.slice(1).join("\n").trim() } : { objet: "Notre échange", corps: texte.trim() };
}

/* ─── Le contexte envoyé à Claude ───────────────────────────────────────────── */

/** Ce que l'agent sait du client. Volontairement sans e-mail ni téléphone. */
export type ContexteClient = {
  prenom: string;
  rdv: { type: string; mode: string; quand: string; sujet: string | null };
  demande?: { typeProjet: string; besoins: string[]; message: string | null; recueLe: string } | null;
  projets?: { nom: string; nature: string; mode: string; typeBien: string; surface: number; codePostal: string; ttc: number | null; creeLe: string }[];
  plans?: number;
};

export function contexteEnTexte(c: ContexteClient): string {
  const l: string[] = [`Client : ${c.prenom}`, `Rendez-vous : ${c.rdv.type}, ${c.rdv.mode}, ${c.rdv.quand} (heure de France)`];
  if (c.rdv.sujet) l.push(`Sujet noté par Daniel : ${c.rdv.sujet}`);
  if (c.demande) {
    l.push("", `Sa demande de rappel (reçue le ${c.demande.recueLe.slice(0, 10)}) : ${c.demande.typeProjet}`);
    if (c.demande.besoins.length) l.push(`Ce qu'il demande : ${c.demande.besoins.join(", ")}`);
    if (c.demande.message) l.push(`Son message : « ${c.demande.message} »`);
  }
  if (c.projets && c.projets.length) {
    l.push("", "Ses estimations sur AVYORA :");
    for (const p of c.projets.slice(0, 8))
      l.push(`- ${p.nom} : ${p.nature === "neuf" ? "construction neuve" : "rénovation"} (${p.mode}), ${p.typeBien}, ${p.surface} m², ${p.codePostal}${p.ttc != null ? `, estimation ${Math.round(p.ttc).toLocaleString("fr-FR")} € TTC` : ""}, créée le ${p.creeLe.slice(0, 10)}`);
  } else l.push("", "Aucune estimation enregistrée sur AVYORA à son nom (ou compte introuvable).");
  if (c.plans) l.push(`Plans dessinés sur AVYORA : ${c.plans}`);
  return l.join("\n");
}
