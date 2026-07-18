import fs from "fs";
import path from "path";
import { uploadsDir } from "./db";

/**
 * Analyse IA de documents (plans, photos) — nécessite ANTHROPIC_API_KEY.
 * L'IA EXTRAIT (pièces, dimensions, observations) ; le métré est ensuite
 * calculé par lib/metre.ts, jamais par l'IA.
 */

export type PieceExtraite = {
  nom: string;
  type_piece: string;
  longueur: number;
  largeur: number;
  hauteur: number;
  portes: number;
  fenetres: number;
  carrelage_sol: boolean;
  faience: boolean;
};

function mediaBlock(fichier: string): Record<string, unknown> | null {
  const p = path.join(uploadsDir, fichier);
  if (!fs.existsSync(p)) return null;
  const data = fs.readFileSync(p).toString("base64");
  const ext = fichier.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf")
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  if (!types[ext]) return null;
  return { type: "image", source: { type: "base64", media_type: types[ext], data } };
}

export function iaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Extrait les pièces d'un plan (PDF ou image). */
export async function extrairePiecesDuPlan(
  fichier: string
): Promise<PieceExtraite[] | { erreur: string }> {
  if (!iaDisponible())
    return { erreur: "Analyse IA indisponible : ajoute ANTHROPIC_API_KEY dans .env.local." };
  const block = mediaBlock(fichier);
  if (!block) return { erreur: "Format de fichier non pris en charge pour l'analyse (PDF, JPG, PNG, WEBP)." };

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const res = await client.messages.create({
    model: process.env.AVYORA_MODEL ?? "claude-sonnet-5",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: [
          block as never,
          {
            type: "text",
            text: `Ce document est un plan de logement (rénovation ou construction). Extrais chaque pièce avec ses dimensions en mètres (utilise les cotes du plan ; si une cote manque, estime-la d'après l'échelle et dis-le via "nom": "... (estimé)").

Réponds UNIQUEMENT avec un JSON valide :
{"pieces":[{"nom":"...","type_piece":"sejour|chambre|cuisine|salle_de_bain|wc|couloir|autre","longueur":<m>,"largeur":<m>,"hauteur":2.5,"portes":<nb>,"fenetres":<nb>,"carrelage_sol":<true si cuisine/sdb/wc/entrée>,"faience":<true si salle_de_bain ou wc>}]}
Si ce n'est pas un plan lisible, réponds {"pieces":[],"erreur":"raison"}.`,
          },
        ],
      },
    ],
  });
  const txt = res.content.find((b) => b.type === "text");
  if (!txt || txt.type !== "text") return { erreur: "Réponse IA vide." };
  const m = txt.text.match(/\{[\s\S]*\}/);
  if (!m) return { erreur: "Réponse IA illisible." };
  try {
    const parsed = JSON.parse(m[0]);
    if (parsed.erreur) return { erreur: String(parsed.erreur) };
    const pieces = (parsed.pieces ?? []) as PieceExtraite[];
    return pieces
      .filter((p) => p.longueur > 0.5 && p.largeur > 0.5 && p.longueur < 30 && p.largeur < 30)
      .map((p) => ({
        nom: String(p.nom ?? "Pièce"),
        type_piece: ["sejour", "chambre", "cuisine", "salle_de_bain", "wc", "couloir", "autre"].includes(p.type_piece)
          ? p.type_piece
          : "autre",
        longueur: Number(p.longueur),
        largeur: Number(p.largeur),
        hauteur: Number(p.hauteur) || 2.5,
        portes: Math.max(0, Math.round(Number(p.portes) || 1)),
        fenetres: Math.max(0, Math.round(Number(p.fenetres) || 0)),
        carrelage_sol: !!p.carrelage_sol,
        faience: !!p.faience,
      }));
  } catch {
    return { erreur: "JSON IA invalide." };
  }
}

/** Analyse une photo de chantier/bien : observations techniques utiles à l'estimation. */
export async function analyserPhoto(
  fichier: string
): Promise<string | { erreur: string }> {
  if (!iaDisponible())
    return { erreur: "Analyse IA indisponible : ajoute ANTHROPIC_API_KEY dans .env.local." };
  const block = mediaBlock(fichier);
  if (!block) return { erreur: "Format d'image non pris en charge (JPG, PNG, WEBP)." };

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const res = await client.messages.create({
    model: process.env.AVYORA_MODEL ?? "claude-sonnet-5",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: [
          block as never,
          {
            type: "text",
            text: `Tu es un expert du bâtiment. Observe cette photo d'un bien à rénover et liste en 3-6 puces courtes ce qui impacte le chiffrage des travaux : état du sol (et son support probable), état des murs/plafonds, traces d'humidité, électricité apparente, menuiseries, éléments à déposer. Termine par une ligne "Impact estimation :" avec les postes à prévoir ou vérifier. Sois factuel, pas alarmiste ; si la photo ne montre pas un intérieur/extérieur de bâtiment, dis-le simplement.`,
          },
        ],
      },
    ],
  });
  const txt = res.content.find((b) => b.type === "text");
  return txt && txt.type === "text" ? txt.text : { erreur: "Réponse IA vide." };
}
