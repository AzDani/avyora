import { REFERENTIEL } from "./referentiel";
import { corpsLabel } from "./estimation";

export type LigneDevis = {
  libelle: string;
  montant: number | null;
  corpsEtat: string | null;
};

export type AnalyseDevis = {
  mode: "ia" | "regles";
  note: number; // /100
  totalDetecte: number | null;
  lignes: LigneDevis[];
  pointsPositifs: string[];
  alertes: string[];
  questions: string[];
  resume: string;
};

const KEYWORDS: Record<string, string[]> = {
  electricite: ["élec", "elec", "tableau", "disjoncteur", "prise", "interrupteur", "câbl", "cabl", "luminaire", "consuel", "point lumineux", "points lumineux", "circuit", "mise à la terre", "terre et liaisons"],
  plomberie: ["plomb", "évacuation", "evacuation", "cuivre", "per ", "multicouche", "chauffe-eau", "robinet", "sanitaire", "wc"],
  chauffage_ventilation: ["radiateur", "chaudière", "chaudiere", "pompe à chaleur", "pac ", "vmc", "ventilation", "clim"],
  platrerie: ["placo", "cloison", "ba13", "ba 13", "doublage", "faux plafond", "plâtre", "platre", "isolation"],
  sols: ["carrelage", "faïence", "faience", "parquet", "stratifié", "stratifie", "ragréage", "ragreage", "chape", "sol pvc", "lino"],
  peinture: ["peinture", "enduit", "sous-couche", "toile de verre", "lessivage"],
  menuiseries_ext: ["fenêtre", "fenetre", "vitrage", "volet", "porte-fenêtre", "menuiserie ext"],
  menuiseries_int: ["porte intérieure", "porte interieure", "bloc-porte", "plinthe"],
  demolition_curage: ["démolition", "demolition", "dépose", "depose", "curage", "évacuation gravats", "gravats", "benne"],
  cuisine: ["cuisine", "évier", "evier", "crédence", "credence", "électroménager", "electromenager"],
  salle_de_bain: ["salle de bain", "sdb", "douche", "baignoire", "receveur", "paroi", "meuble vasque"],
};

export function detecterCorpsEtat(libelle: string): string | null {
  const l = libelle.toLowerCase();
  for (const [corps, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => l.includes(k))) return corps;
  }
  return null;
}

/** Extraction heuristique des lignes chiffrées d'un texte de devis. */
export function extraireLignes(texte: string): LigneDevis[] {
  const lignes: LigneDevis[] = [];
  for (const raw of texte.split(/\n+/)) {
    const line = raw.trim();
    if (line.length < 6 || line.length > 200) continue;
    // "Libellé .... 1 234,56 €" ou "Libellé 1234.56"
    const m = line.match(/^(.{4,120}?)[\s.:]{2,}(\d[\d\s .,]{1,14})\s*€?\s*(?:ht|ttc)?$/i)
      ?? line.match(/^(.{4,120}?)\s+(\d[\d\s .,]{1,14})\s*€\s*(?:ht|ttc)?$/i);
    if (!m) continue;
    const montant = parseMontant(m[2]);
    if (montant === null || montant < 10 || montant > 500000) continue;
    lignes.push({
      libelle: m[1].trim(),
      montant,
      corpsEtat: detecterCorpsEtat(m[1]),
    });
  }
  return lignes;
}

export function parseMontant(s: string): number | null {
  const cleaned = s.replace(/[\s ]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "");
  const normalized = cleaned.replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Analyse par règles (fonctionne sans clé API). */
export function analyseParRegles(texte: string): AnalyseDevis {
  const t = texte.toLowerCase();
  const lignes = extraireLignes(texte);
  const pointsPositifs: string[] = [];
  const alertes: string[] = [];
  const questions: string[] = [];
  let note = 50;

  const check = (
    present: boolean,
    positif: string,
    alerte: string,
    question: string | null,
    poids: number
  ) => {
    if (present) {
      pointsPositifs.push(positif);
      note += poids;
    } else {
      alertes.push(alerte);
      if (question) questions.push(question);
      note -= Math.round(poids / 2);
    }
  };

  check(/tva|t\.v\.a/.test(t), "La TVA est mentionnée", "TVA non mentionnée — un devis doit préciser le taux de TVA appliqué (10 % en rénovation de logement > 2 ans)", "Quel taux de TVA appliquez-vous, et le logement a-t-il plus de 2 ans ?", 8);
  check(/décennale|decennale|assurance/.test(t), "Une assurance (décennale) est mentionnée", "Aucune assurance décennale mentionnée — elle est obligatoire pour les travaux de construction/rénovation", "Pouvez-vous joindre votre attestation d'assurance décennale en cours de validité ?", 10);
  check(/siret|siren/.test(t), "Le SIRET est mentionné", "Pas de SIRET visible — mention obligatoire sur un devis professionnel", "Quel est votre numéro SIRET ?", 8);
  check(/délai|delai|durée|duree|semaines|planning/.test(t), "Un délai ou une durée est mentionné", "Aucun délai d'exécution mentionné", "Quelle est la date de début et la durée prévue des travaux ?", 7);
  check(/acompte/.test(t), "Les conditions d'acompte sont mentionnées", "Conditions de paiement/acompte non précisées", "Quel échéancier de paiement proposez-vous ? (un acompte > 30 % doit alerter)", 5);
  check(lignes.length >= 4, `${lignes.length} lignes chiffrées détectées — devis détaillé`, "Devis peu détaillé — moins de 4 lignes chiffrées détectées : exigez le détail poste par poste avec quantités", "Pouvez-vous détailler chaque poste avec quantité, unité et prix unitaire ?", 10);
  check(/évacuation|evacuation|gravats|benne|déchetterie|dechetterie|nettoyage/.test(t), "L'évacuation des gravats / nettoyage est prévue", "Évacuation des gravats non mentionnée — poste souvent facturé en supplément (300-1 500 €)", "L'évacuation des gravats et le nettoyage de fin de chantier sont-ils inclus ?", 6);

  const acompteMatch = t.match(/acompte[^\d]{0,30}(\d{2,3})\s*%/);
  if (acompteMatch && parseInt(acompteMatch[1]) > 40) {
    alertes.push(`Acompte demandé de ${acompteMatch[1]} % — au-delà de 30-40 %, c'est un signal de fragilité de l'entreprise`);
    note -= 10;
  }

  // Total : plus grand montant détecté
  const totalDetecte = lignes.length
    ? Math.max(...lignes.map((l) => l.montant ?? 0))
    : null;

  note = Math.max(5, Math.min(95, note));

  const corpsDetectes = [...new Set(lignes.map((l) => l.corpsEtat).filter(Boolean))];
  const resume = `Analyse par règles (sans IA) : ${lignes.length} lignes chiffrées, ${pointsPositifs.length} bonnes pratiques, ${alertes.length} point${alertes.length > 1 ? "s" : ""} de vigilance. Corps d'état détectés : ${corpsDetectes.length ? corpsDetectes.map((c) => corpsLabel(c as string).toLowerCase()).join(", ") : "non identifiés"}.`;

  return { mode: "regles", note, totalDetecte, lignes, pointsPositifs, alertes, questions, resume };
}

/** Analyse IA (si ANTHROPIC_API_KEY présent) — l'IA lit et explique, les fourchettes viennent du référentiel. */
export async function analyseIA(texte: string): Promise<AnalyseDevis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const referentiel = REFERENTIEL.postes
    .map((p) => `${p.corps_etat} | ${p.poste} | ${p.unite} | ${p.prix_bas}-${p.prix_haut} €`)
    .join("\n");

  const res = await client.messages.create({
    model: process.env.AVYORA_MODEL ?? "claude-sonnet-5",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Tu es un expert du bâtiment français qui analyse un devis pour protéger le client (un investisseur locatif). Voici le référentiel de prix marché France 2026 (fourchettes TTC fourniture+pose, province ; IDF +20 %) :

${referentiel}

Voici le texte brut du devis :
---
${texte.slice(0, 15000)}
---

Réponds UNIQUEMENT avec un JSON valide (aucun texte autour) au format :
{
  "note": <0-100>,
  "totalDetecte": <total TTC du devis ou null>,
  "lignes": [{"libelle": "...", "montant": <nombre ou null>, "corpsEtat": "<code du référentiel ou null>", "verdict": "<bas|marche|eleve|inconnu>", "commentaire": "<1 phrase max, seulement si utile>"}],
  "pointsPositifs": ["..."],
  "alertes": ["... (oublis probables, prix hors fourchette référentiel, mentions légales manquantes : TVA, SIRET, décennale, délai, acompte >30 %)"],
  "questions": ["questions précises à poser à l'artisan avant de signer"],
  "resume": "<3 phrases max, ton direct et bienveillant>"
}
Base tes verdicts de prix UNIQUEMENT sur le référentiel fourni ; si un poste n'y correspond pas, verdict "inconnu". Sois factuel, jamais alarmiste.`,
      },
    ],
  });

  const content = res.content.find((b) => b.type === "text");
  if (!content || content.type !== "text") return null;
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      mode: "ia",
      note: Math.max(0, Math.min(100, Number(parsed.note) || 50)),
      totalDetecte: parsed.totalDetecte ?? null,
      lignes: (parsed.lignes ?? []).map((l: Record<string, unknown>) => ({
        libelle: String(l.libelle ?? ""),
        montant: typeof l.montant === "number" ? l.montant : null,
        corpsEtat: (l.corpsEtat as string) ?? null,
        verdict: (l.verdict as string) ?? undefined,
        commentaire: (l.commentaire as string) ?? undefined,
      })),
      pointsPositifs: parsed.pointsPositifs ?? [],
      alertes: parsed.alertes ?? [],
      questions: parsed.questions ?? [],
      resume: String(parsed.resume ?? ""),
    };
  } catch {
    return null;
  }
}

export async function analyserDevis(texte: string): Promise<AnalyseDevis> {
  try {
    const ia = await analyseIA(texte);
    if (ia) return ia;
  } catch {
    // clé invalide / réseau : on retombe sur les règles
  }
  return analyseParRegles(texte);
}
