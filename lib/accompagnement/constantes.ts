/**
 * Accompagnement travaux (décision du fondateur du 16/11/2026) : les listes FERMÉES du formulaire de demande de
 * rappel. Sans zod ni dépendance serveur : le formulaire (client) les lit pour ses cases, l'action serveur
 * (lib/actions/accompagnement.ts) les valide avec lib/accompagnement/schema.ts.
 *
 * Aucun prix nulle part : l'unique appel à l'action est « Demande à être rappelé, c'est gratuit », les tarifs se
 * discutent pendant l'appel. La prise de rendez-vous et le paiement automatiques viendront plus tard.
 */

/** Le chemin de la page publique. */
export const CHEMIN_ACCOMPAGNEMENT = "/accompagnement-travaux";

/** L'adresse qui reçoit les demandes, sauf variable d'environnement ACCOMPAGNEMENT_TO (lib/actions/accompagnement.ts). */
export const DESTINATAIRE_DEFAUT = "contact@getavyora.fr";

/** Le type de projet : une seule réponse. */
export const TYPES_PROJET = ["renovation", "neuf", "achat", "devis", "autre"] as const;
export type TypeProjet = (typeof TYPES_PROJET)[number];

/**
 * Les besoins : plusieurs cases possibles, parmi les accompagnements de la page (l'appel découverte n'y est pas :
 * c'est ce que la demande déclenche), plus « je ne sais pas encore ». Aucune case cochée = « je ne sais pas encore ».
 */
export const BESOINS = ["devis", "estimation", "visite", "technique", "plans", "suivi", "budget", "sur_mesure", "nsp"] as const;
export type Besoin = (typeof BESOINS)[number];

/**
 * D'où vient la demande (`?src=` sur le lien), pour savoir quel point d'entrée convertit. Liste FERMÉE, même logique
 * que lib/seo-source.ts : une valeur hors liste est ignorée. Seuls les liens des pages PRIVÉES (fiche projet, résultat
 * d'une estimation) en portent un : les liens des pages indexables (pied de page, guides, accueil) pointent vers l'URL
 * canonique, sans paramètre, pour ne pas disperser le maillage sur des variantes d'URL.
 */
export const SOURCES_ACCOMPAGNEMENT = ["rapide", "rapide-neuf", "suivi", "invest"] as const;
export type SourceAccompagnement = (typeof SOURCES_ACCOMPAGNEMENT)[number];

export function sourceAccompagnementValide(v: unknown): SourceAccompagnement | undefined {
  return typeof v === "string" && (SOURCES_ACCOMPAGNEMENT as readonly string[]).includes(v) ? (v as SourceAccompagnement) : undefined;
}

/** Le lien vers la page, avec sa source (pages privées seulement, voir SOURCES_ACCOMPAGNEMENT). */
export function lienAccompagnement(src?: SourceAccompagnement): string {
  return src ? `${CHEMIN_ACCOMPAGNEMENT}?src=${src}#demande` : CHEMIN_ACCOMPAGNEMENT;
}

/** Bornes des champs (formulaire et serveur). */
export const BORNES = { prenom: 40, email: 254, telephone: 30, message: 1000 } as const;

/** Délai minimal entre l'affichage du formulaire et son envoi : en dessous, c'est un robot (ou un double clic). */
export const DELAI_MIN_MS = 3_000;
/** Durée de validité du jeton du formulaire : au-delà, la page doit être rechargée. */
export const JETON_MAX_MS = 48 * 3_600_000;

/** Les noms des champs techniques (cachés). Le piège porte un nom qu'un robot a envie de remplir. */
export const CHAMP_PIEGE = "site_web";
export const CHAMP_JETON = "jeton";

/** Les champs que l'action peut refuser, dans l'ordre du formulaire (le focus va sur le premier en erreur). */
export const CHAMPS = ["prenom", "email", "telephone", "typeProjet", "besoins", "message"] as const;
export type Champ = (typeof CHAMPS)[number];

/** Ce que l'action renvoie au formulaire (useActionState). Des codes, pas des phrases : le client les traduit. */
export type CodeChamp = "requis" | "invalide" | "trop_long";
export type EtatDemande =
  | { statut: "ok"; prenom: string }
  | { statut: "erreur"; champs?: Partial<Record<Champ, CodeChamp>>; global?: "expire" | "trop_rapide" | "limite" | "envoi" }
  | undefined;
